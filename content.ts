import type { PlasmoCSConfig } from "plasmo"

import "content.css"

import {
  CHANGE_WIDTH_KEY,
  CUSTOM_WIDTH_LS_KEY,
  PROMPT_INPUT_KEY,
  QUESTION_CATALOG_PANEL_VISIBLE_KEY
} from "./contants"
import { stickyPromptIconToInput } from "./contentPrompt"
import { escape } from "./escape"
import { enableMermaidPreview } from "./mermaid"

export const config: PlasmoCSConfig = {
  matches: ["https://chat.openai.com/*", "https://chatgpt.com/*"]
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
  switcherContainer.className = "bear-gpt-switcher"
  switcherContainer.title = "Toggle Table of Questions"

  // 使用 SVG 图标代替纯 CSS 绘制的箭头
  switcherContainer.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `

  switcherContainer.onclick = () => {
    const isOpening = document.body.classList.contains("opening")
    if (isOpening) {
      document.body.classList.replace("opening", "closed")
      localStorage.setItem(QUESTION_CATALOG_PANEL_VISIBLE_KEY, "closed")
    } else {
      document.body.classList.replace("closed", "opening")
      localStorage.setItem(QUESTION_CATALOG_PANEL_VISIBLE_KEY, "opening")
    }
  }
  document.body.appendChild(switcherContainer)
}

const paintFixedPanel = (param: { id: string; name: string }[]) => {
  if (!param?.length) {
    if (container) container.style.display = "none"
    return
  }
  
  if (container) {
    container.innerHTML = ""
    container.style.display = "block"
  } else {
    container = document.createElement("div")
    container.className = "bear-gpt-panel"
  }

  // Header
  const header = document.createElement("div")
  header.className = "bear-gpt-header"
  
  const title = document.createElement("h3")
  title.innerText = "Questions"
  
  const count = document.createElement("span")
  count.className = "bear-gpt-count"
  count.innerText = `${param.length}`

  header.appendChild(title)
  header.appendChild(count)

  // List
  const panel = document.createElement("ul")
  panel.className = "bear-gpt-list"
  
  panel.onclick = (e: MouseEvent) => {
    // 处理事件委托，确保点击 li 内部元素也能触发
    const target = (e.target as HTMLElement).closest(".bear-gpt-item") as HTMLElement
    if (!target) return
    
    const id = target.getAttribute("data-question-id")
    if (id) {
      document.querySelector(`main [${ID_KEY}="${id}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      })
      
      // 移除其他项的高亮
      panel.querySelectorAll(".bear-gpt-item").forEach(item => item.classList.remove("active"))
      target.classList.add("active")
    }
  }

  const fragment = document.createDocumentFragment()
  param.forEach(({ id, name }, index) => {
    const li = document.createElement("li")
    li.className = "bear-gpt-item"
    li.setAttribute("data-question-id", id)
    li.title = name
    
    // 序号
    const num = document.createElement("span")
    num.className = "bear-gpt-item-num"
    num.innerText = `${index + 1}.`
    
    // 文本
    const text = document.createElement("span")
    text.className = "bear-gpt-item-text"
    text.innerText = escape(name)?.replace(/\n/g, " ") || "Untitled Question"

    li.appendChild(num)
    li.appendChild(text)
    fragment.appendChild(li)
  })

  panel.appendChild(fragment)
  container.appendChild(header)
  container.appendChild(panel)
  
  // 如果尚未添加到 body
  if (!document.body.contains(container)) {
    document.body.appendChild(container)
  }
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
  // document.querySelectorAll("[data-testid").forEach((ele: HTMLDivElement) => {
  //   ele.style.cssText = isOpen ? `${width}%` : ""
  // })
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

let loadTimer: number | null = null
const checkIsLoad = () => {
  if (document.querySelector("main")) {
    clearTimeout(loadTimer)
    initPanelVisible()
    paintSwitcher()
    listenContentChange()
    onCustomWidthChange()
    // 默认启用 Mermaid 预览
    enableMermaidPreview()
    // stickyPromptIconToInput()
  } else {
    loadTimer = window.setTimeout(() => {
      checkIsLoad()
    }, 1000)
  }
}
checkIsLoad()

/** 监听 popup 消息 */
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // 自定义宽度
  if (request.message === CHANGE_WIDTH_KEY && request.width) {
    setContentCustomWidth(request.isOpen, request.width)
    sendResponse(true)
  }
})
