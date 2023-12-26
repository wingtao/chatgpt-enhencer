import { useEffect, useState } from "react"

import "./popup.css"

import {
  CHANGE_WIDTH_KEY,
  CUSTOM_WIDTH_IS_OPEN_KEY,
  CUSTOM_WIDTH_LS_KEY
} from "./contants"

export default function IndexPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [customWidth, setCustomWidth] = useState(50)

  const onToggleWidth: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const curIsOpen = e.target.checked
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { message: CHANGE_WIDTH_KEY, isOpen: curIsOpen, width: customWidth },
        function (response) {
          if (response) {
            setIsOpen(curIsOpen)
          }
        }
      )
    })
  }

  const onWidthChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = +e.target.value
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { message: CHANGE_WIDTH_KEY, isOpen, width: value },
        function (response) {
          // 这里处理来自content script的响应
          setCustomWidth(value)
        }
      )
    })
  }

  useEffect(() => {
    chrome.storage.local.get(CUSTOM_WIDTH_LS_KEY).then((result) => {
      const customWidth = +result[CUSTOM_WIDTH_LS_KEY]
      if (customWidth) {
        setCustomWidth(customWidth)
        setIsOpen(true)
      } else {
        setIsOpen(false)
      }
    })
  }, [])

  return (
    <div className="container">
      <div className="section">
        <div className="section-title">Custom Width</div>
        <div className="section-content">
          <div className="section-content-item">
            <span>enable</span>
            <span>width(%)</span>
          </div>
          <div className="section-content-item">
            <input type="checkbox" checked={isOpen} onChange={onToggleWidth} />
            <input
              type="number"
              value={customWidth}
              disabled={!isOpen}
              min={10}
              max={100}
              onChange={onWidthChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
