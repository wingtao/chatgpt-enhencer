chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log(tabId, changeInfo, tab.url, changeInfo.status, 33)
  if (
    tab.url?.indexOf("chat.openai.com") > -1 &&
    changeInfo.status === "complete"
  ) {
    chrome.tabs.sendMessage(tabId, { message: "TabUpdated" })
  }
})

export {}
