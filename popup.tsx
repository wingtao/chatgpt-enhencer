import { useEffect, useState } from "react"

import "./popup.css"

import { CHANGE_WIDTH_KEY, CUSTOM_WIDTH_LS_KEY } from "./contants"

export default function IndexPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [customWidth, setCustomWidth] = useState(50)

  // 同步宽度状态到 content script
  const syncWidthToContent = (newIsOpen: boolean, newWidth: number) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs[0]?.id) return
      chrome.tabs.sendMessage(
        tabs[0].id,
        { message: CHANGE_WIDTH_KEY, isOpen: newIsOpen, width: newWidth },
        function (response) {
          // 可以在这里处理响应，或者 optimistic update
        }
      )
    })
  }

  const onToggleWidth: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const curIsOpen = e.target.checked
    setIsOpen(curIsOpen)
    syncWidthToContent(curIsOpen, customWidth)
  }

  const onWidthChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = +e.target.value
    setCustomWidth(value)
    // 只有在开启状态下才实时同步
    if (isOpen) {
      syncWidthToContent(isOpen, value)
    }
  }

  useEffect(() => {
    // 获取宽度设置
    chrome.storage.local.get(CUSTOM_WIDTH_LS_KEY).then((result) => {
      const savedWidth = +result[CUSTOM_WIDTH_LS_KEY]
      if (savedWidth) {
        setCustomWidth(savedWidth)
        setIsOpen(true)
      } else {
        setIsOpen(false)
        setCustomWidth(50) // 默认值
      }
    })
  }, [])

  return (
    <div className="popup-container">
      <header className="header">
        <h1>BearGPT</h1>
        <p>Enhancer</p>
      </header>

      <main className="content">
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <span className="icon">📏</span>
              <span className="card-title">Custom Width</span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={isOpen}
                onChange={onToggleWidth}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className={`card-body ${!isOpen ? "disabled" : ""}`}>
            <div className="control-group">
              <input
                type="range"
                className="range-input"
                min={10}
                max={100}
                value={customWidth}
                disabled={!isOpen}
                onChange={onWidthChange}
              />
              <span className="range-value">{customWidth}%</span>
            </div>
            <p className="hint">
              Adjust the conversation content width.
            </p>
          </div>
        </div>
      </main>
      
      <footer className="footer">
         <a href="https://github.com/wingtao/chatgpt-enhencer" target="_blank" rel="noreferrer">Open Source</a>
      </footer>
    </div>
  )
}
