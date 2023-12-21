import type { PlasmoCSConfig } from "plasmo"

import "content.css"

import { escape } from "./escape"

export const config: PlasmoCSConfig = {
  matches: ["https://chat.openai.com/*"]
}

const debounce = (fn: (...arg: any) => void, timeout: number) => {
  let timer = null
  return (...arg: any) => {
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => fn(arg), timeout)
  }
}

const ID_KEY = "data-message-id"

let container: HTMLDivElement | null
let switcherContainer: HTMLDivElement | null
const destroy = () => {
  if (container) {
    document.body.removeChild(container)
    container = null
  }
}

const paintSwitcher = () => {
  switcherContainer = document.createElement("div")
  switcherContainer.className = "switcher opening"
  const upper = document.createElement("div")
  const downer = document.createElement("div")
  upper.className = "switcher-up"
  downer.className = "switcher-down"
  switcherContainer.onclick = () => {
    if (container.className.indexOf("opening") > -1) {
      container.className = container.className.replace("opening", "closed")
      switcherContainer.className = switcherContainer.className.replace(
        "opening",
        "closed"
      )
    } else {
      container.className = container.className.replace("closed", "opening")
      switcherContainer.className = switcherContainer.className.replace(
        "closed",
        "opening"
      )
    }
  }
  switcherContainer.appendChild(upper)
  switcherContainer.appendChild(downer)
  document.body.appendChild(switcherContainer)
}

const paintFixedPanel = (param: { id: string; name: string }[]) => {
  if (!param?.length) {
    return
  }
  if (container) {
    container.innerHTML = ""
  } else {
    container = document.createElement("div")
    container.className = "locator-container opening"
  }
  const header = document.createElement("h2")
  header.innerText = "Question locator"
  header.style.cssText = "margin-bottom: 16px"
  const panel = document.createElement("ul")
  panel.className = "locator-nav"
  panel.onclick = (e: MouseEvent) => {
    const target = e.target as HTMLDivElement
    const id = target.getAttribute("question-id")
    if (id) {
      document.querySelector(`main [${ID_KEY}="${id}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      })
    }
  }
  const fragment = document.createDocumentFragment()
  param.forEach(({ id, name }) => {
    const aLink = document.createElement("li")
    aLink.setAttribute("question-id", id)
    aLink.innerText = escape(name)?.replace(/\n/g, " ")
    aLink.className = "locator-nav-item"
    aLink.title = name
    fragment.appendChild(aLink)
  })
  panel.appendChild(fragment)
  container.appendChild(header)
  container.appendChild(panel)
  document.body.appendChild(container)
}

const onDocLoad = debounce(() => {
  const questionEles = document.querySelectorAll(
    `[${ID_KEY}][data-message-author-role="user"]`
  )
  if (!questionEles.length) {
    destroy()
    return
  }
  const questionIds = Array.from(questionEles).map((ele: HTMLElement) => ({
    id: ele.getAttribute(ID_KEY),
    name: ele.innerText
  }))
  paintFixedPanel(questionIds)
}, 1000)

let observer: MutationObserver | null = null
const listenContentChange = () => {
  // 停止观察旧的
  if (observer) {
    observer.disconnect()
  }
  const targetNode = document.querySelector("main")

  // 观察器的配置（需要观察什么变动）
  const config = { attributes: false, childList: true, subtree: true }
  // 当观察到变动时执行的回调函数
  const callback = function (mutationsList, observer) {
    // Use traditional 'for loops' for IE 11
    onDocLoad()
  }

  // 创建一个观察器实例并传入回调函数
  observer = new MutationObserver(callback)
  // 以上述配置开始观察目标节点
  observer.observe(targetNode, config)
}

const checkIsLoad = () => {
  if (document.querySelector("main")) {
    paintSwitcher()
    listenContentChange()
  } else {
    setTimeout(() => {
      checkIsLoad()
    }, 1000)
  }
}
checkIsLoad()
