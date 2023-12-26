import type { PlasmoCSConfig } from "plasmo"

import "content.css"

import {
  CHANGE_WIDTH_KEY,
  CUSTOM_WIDTH_LS_KEY,
  QUESTION_CATALOG_PANEL_VISIBLE_KEY
} from "./contants"
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

const initPanelVisible = () => {
  // 本地获取
  const visible = localStorage.getItem(QUESTION_CATALOG_PANEL_VISIBLE_KEY)
  if (visible === "closed") {
    document.body.classList.add("closed")
    return
  }
  document.body.classList.add("opening")
}

const paintSwitcher = () => {
  switcherContainer = document.createElement("div")
  switcherContainer.className = "switcher"

  const upper = document.createElement("div")
  const downer = document.createElement("div")
  upper.className = "switcher-up"
  downer.className = "switcher-down"
  switcherContainer.onclick = () => {
    if (document.body.className.indexOf("opening") > -1) {
      document.body.className = document.body.className.replace(
        "opening",
        "closed"
      )
      localStorage.setItem(QUESTION_CATALOG_PANEL_VISIBLE_KEY, "closed")
    } else {
      document.body.className = document.body.className.replace(
        "closed",
        "opening"
      )
      localStorage.setItem(QUESTION_CATALOG_PANEL_VISIBLE_KEY, "opening")
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
    container.className = "locator-container"
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

/** 设置自定义宽度 */
const setContentCustomWidth = (isOpen: boolean, width: number) => {
  document
    .querySelectorAll(".text-base.group")
    .forEach((ele: HTMLDivElement) => {
      ele.style.cssText = isOpen ? `${width}%` : ""
    })
  if (isOpen) {
    document.documentElement.style.setProperty("--dynamic-width", `${width}%`)
    document.body.classList.add("chatgpt-enhancer-custom")
    chrome.storage.local.set({ [CUSTOM_WIDTH_LS_KEY]: width })
  } else {
    document.documentElement.style.removeProperty("--dynamic-width")
    document.body.classList.remove("chatgpt-enhancer-custom")
    chrome.storage.local.remove(CUSTOM_WIDTH_LS_KEY)
  }
}

let hasLoadAndSetCustomWidth = false
/** 本地获取自定义宽度 */
const onCustomWidthChange = () => {
  if (hasLoadAndSetCustomWidth) return
  hasLoadAndSetCustomWidth = true
  chrome.storage.local.get(CUSTOM_WIDTH_LS_KEY).then((result) => {
    const customWidth = +result[CUSTOM_WIDTH_LS_KEY]
    if (!customWidth || customWidth > 100 || customWidth < 0) return
    setContentCustomWidth(!!customWidth, customWidth)
  })
}

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
    initPanelVisible()
    paintSwitcher()
    listenContentChange()
    onCustomWidthChange()
  } else {
    setTimeout(() => {
      checkIsLoad()
    }, 1000)
  }
}
checkIsLoad()

/** 自定义宽度，监听 popup 消息 */
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.message === CHANGE_WIDTH_KEY && request.width) {
    setContentCustomWidth(request.isOpen, request.width)
    sendResponse(true)
  }
})
