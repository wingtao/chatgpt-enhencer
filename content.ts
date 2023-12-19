import type { PlasmoCSConfig } from "plasmo"

import "content.css"

import { escape } from "./escape"

export const config: PlasmoCSConfig = {
  matches: ["https://chat.openai.com/*"]
}

const ID_KEY = "data-message-id"

let container: HTMLDivElement | null

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

const onDocLoad = () => {
  const questionEles = document.querySelectorAll(
    `[${ID_KEY}][data-message-author-role="user"]`
  )
  const questionIds = Array.from(questionEles).map((ele: HTMLElement) => ({
    id: ele.getAttribute(ID_KEY),
    name: ele.innerText
  }))
  paintFixedPanel(questionIds)
}

const checkIsLoad = () => {
  if (document.querySelector("main")) {
    setTimeout(onDocLoad, 3000)
  } else {
    setTimeout(() => {
      checkIsLoad()
    }, 1000)
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "TabUpdated") {
    // 执行相关操作
    checkIsLoad()
  }
})
