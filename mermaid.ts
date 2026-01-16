/**
 * Mermaid Preview Module
 * 自动检测并渲染网页上的 Mermaid 代码块
 */

// mermaid 实例，动态加载
let mermaidInstance: any = null

// 初始化标志
let isInitialized = false
let isEnabled = false

// 用于生成唯一 ID
let mermaidIdCounter = 0

// 已处理的代码块集合，避免重复处理
const processedElements = new WeakSet<Element>()

// Mermaid 代码块选择器（基于 class 的）
const MERMAID_SELECTORS = [
  "code.language-mermaid",
  "code.hljs.language-mermaid",
  'pre code[class*="language-mermaid"]',
  'pre code[class*="mermaid"]'
]

// Mermaid 图表类型关键字（用于内容检测）
const MERMAID_KEYWORDS = [
  "graph TD",
  "graph LR",
  "graph TB",
  "graph BT",
  "graph RL",
  "flowchart TD",
  "flowchart LR",
  "flowchart TB",
  "flowchart BT",
  "flowchart RL",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram",
  "stateDiagram-v2",
  "erDiagram",
  "gantt",
  "pie title",
  "journey",
  "gitGraph",
  "C4Context",
  "mindmap",
  "timeline",
  "quadrantChart",
  "requirementDiagram",
  "zenuml"
]

/**
 * 动态加载并初始化 mermaid
 */
async function initMermaid(): Promise<boolean> {
  if (isInitialized && mermaidInstance) return true

  try {
    // 动态导入 mermaid
    const mermaidModule = await import("mermaid")
    mermaidInstance = mermaidModule.default || mermaidModule
    
    console.log("[BearGPT Mermaid] Module loaded:", mermaidInstance)
    
    mermaidInstance.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "loose",
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true
      }
    })

    isInitialized = true
    console.log("[BearGPT Mermaid] Initialized")
    return true
  } catch (error) {
    console.error("[BearGPT Mermaid] Failed to load mermaid:", error)
    return false
  }
}

/**
 * 检测代码内容是否为 Mermaid 代码
 */
function isMermaidCode(text: string): boolean {
  if (!text || text.length < 5) return false

  const trimmedText = text.trim()

  return MERMAID_KEYWORDS.some(
    (keyword) =>
      trimmedText.startsWith(keyword) ||
      trimmedText.includes("\n" + keyword) ||
      trimmedText.includes(" " + keyword)
  )
}

/**
 * 清理 ChatGPT 特有的引用标记和其他干扰内容
 */
function cleanMermaidCode(code: string): string {
  return code
    .replace(/:contentReference\[oaicite:\d+\]\{index=\d+\}/g, "")
    .replace(/\[oaicite:\d+\]/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/**
 * 查找所有 mermaid 代码块
 */
function findMermaidBlocks(): Element[] {
  const blocks: Element[] = []

  // 1. 先查找有明确 mermaid class 的代码块
  const selector = MERMAID_SELECTORS.join(", ")
  const explicitBlocks = document.querySelectorAll(selector)
  blocks.push(...Array.from(explicitBlocks))

  // 2. 查找所有 code 元素，通过内容检测是否为 Mermaid
  const allCodeBlocks = document.querySelectorAll("pre > code, code")
  allCodeBlocks.forEach((code) => {
    if (blocks.includes(code)) return

    const text = code.textContent || ""
    if (isMermaidCode(text)) {
      blocks.push(code)
    }
  })

  return blocks
}

/**
 * 创建工具栏
 */
function createToolbar(diagramWrapper: HTMLDivElement): {
  toolbar: HTMLDivElement
  toggleBtn: HTMLButtonElement
} {
  const toolbar = document.createElement("div")
  toolbar.className = "mermaid-toolbar"

  // 当前缩放比例和位移
  let scale = 1
  let translateX = 0
  let translateY = 0
  const SCALE_STEP = 0.2
  const MIN_SCALE = 0.2
  const MAX_SCALE = 3

  // 拖拽状态
  let isDragging = false
  let startX = 0
  let startY = 0

  // 切换按钮（代码/图表）
  const toggleBtn = document.createElement("button")
  toggleBtn.className = "mermaid-btn mermaid-toggle-btn"
  toggleBtn.innerHTML =
    '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>'
  toggleBtn.title = "查看代码"
  toggleBtn.setAttribute("data-showing", "diagram")

  // 放大按钮
  const zoomInBtn = document.createElement("button")
  zoomInBtn.className = "mermaid-btn"
  zoomInBtn.innerHTML =
    '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm.5-7H9v2H7v1h2v2h1v-2h2V9h-2V7z"/></svg>'
  zoomInBtn.title = "放大"

  // 缩小按钮
  const zoomOutBtn = document.createElement("button")
  zoomOutBtn.className = "mermaid-btn"
  zoomOutBtn.innerHTML =
    '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7V9z"/></svg>'
  zoomOutBtn.title = "缩小"

  // 重置按钮
  const resetBtn = document.createElement("button")
  resetBtn.className = "mermaid-btn"
  resetBtn.innerHTML =
    '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>'
  resetBtn.title = "重置大小"

  // 全屏按钮
  const fullscreenBtn = document.createElement("button")
  fullscreenBtn.className = "mermaid-btn"
  fullscreenBtn.innerHTML =
    '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>'
  fullscreenBtn.title = "全屏"

  // 更新变换（缩放和位移）
  function updateTransform() {
    const svg = diagramWrapper.querySelector("svg")
    if (svg) {
      ;(svg as HTMLElement).style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`
      ;(svg as HTMLElement).style.transformOrigin = "center center"
      diagramWrapper.style.cursor = scale > 1 ? "grab" : "default"
    }
  }

  // 更新缩放
  function updateScale(newScale: number) {
    const oldScale = scale
    scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale))

    if (scale <= 1) {
      translateX = 0
      translateY = 0
    } else {
      const ratio = scale / oldScale
      translateX *= ratio
      translateY *= ratio
    }

    updateTransform()
  }

  // 重置所有变换
  function resetTransform() {
    scale = 1
    translateX = 0
    translateY = 0
    updateTransform()
  }

  // 拖拽开始
  function onDragStart(e: MouseEvent | TouchEvent) {
    if (scale <= 1) return

    isDragging = true
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    startX = clientX - translateX
    startY = clientY - translateY
    diagramWrapper.style.cursor = "grabbing"
    e.preventDefault()
  }

  // 拖拽移动
  function onDragMove(e: MouseEvent | TouchEvent) {
    if (!isDragging) return

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

    translateX = clientX - startX
    translateY = clientY - startY

    updateTransform()
    e.preventDefault()
  }

  // 拖拽结束
  function onDragEnd() {
    if (!isDragging) return

    isDragging = false
    diagramWrapper.style.cursor = scale > 1 ? "grab" : "default"
  }

  // 绑定拖拽事件
  diagramWrapper.addEventListener("mousedown", onDragStart)
  diagramWrapper.addEventListener("mousemove", onDragMove)
  diagramWrapper.addEventListener("mouseup", onDragEnd)
  diagramWrapper.addEventListener("mouseleave", onDragEnd)

  // 触摸设备支持
  diagramWrapper.addEventListener("touchstart", onDragStart, { passive: false })
  diagramWrapper.addEventListener("touchmove", onDragMove, { passive: false })
  diagramWrapper.addEventListener("touchend", onDragEnd)

  // 鼠标滚轮缩放
  diagramWrapper.addEventListener(
    "wheel",
    (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP
        updateScale(scale + delta)
      }
    },
    { passive: false }
  )

  // 切换按钮事件
  toggleBtn.addEventListener("click", function () {
    const container = this.closest(".mermaid-container")
    if (!container) return

    const diagram = container.querySelector(
      ".mermaid-diagram-wrapper"
    ) as HTMLElement
    const code = container.querySelector(
      ".mermaid-code-wrapper"
    ) as HTMLElement
    const isShowingDiagram = this.getAttribute("data-showing") === "diagram"

    if (isShowingDiagram) {
      diagram.style.display = "none"
      code.style.display = "block"
      this.title = "查看图表"
      this.setAttribute("data-showing", "code")
    } else {
      diagram.style.display = "flex"
      code.style.display = "none"
      this.title = "查看代码"
      this.setAttribute("data-showing", "diagram")
    }
  })

  // 放大事件
  zoomInBtn.addEventListener("click", () => updateScale(scale + SCALE_STEP))

  // 缩小事件
  zoomOutBtn.addEventListener("click", () => updateScale(scale - SCALE_STEP))

  // 重置事件
  resetBtn.addEventListener("click", resetTransform)

  // 全屏事件
  fullscreenBtn.addEventListener("click", function () {
    const container = this.closest(".mermaid-container")
    if (!container) return

    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      container.requestFullscreen().catch((err) => {
        console.error("[BearGPT Mermaid] Fullscreen error:", err)
      })
    }
  })

  // 组装工具栏
  toolbar.appendChild(toggleBtn)
  toolbar.appendChild(zoomInBtn)
  toolbar.appendChild(zoomOutBtn)
  toolbar.appendChild(resetBtn)
  toolbar.appendChild(fullscreenBtn)

  return { toolbar, toggleBtn }
}

/**
 * 渲染单个 mermaid 代码块
 */
async function renderMermaidBlock(codeElement: Element): Promise<void> {
  // 检查是否已处理
  if (processedElements.has(codeElement)) {
    return
  }

  // 获取 pre 元素（代码块的父容器）
  const preElement = codeElement.closest("pre")
  if (!preElement) {
    return
  }

  // 检查 pre 是否已被处理
  if (preElement.closest(".mermaid-container")) {
    return
  }

  // 标记为已处理
  processedElements.add(codeElement)

  // 获取并清理 mermaid 代码
  const rawCode = (codeElement.textContent || "").trim()
  if (!rawCode) {
    return
  }
  const code = cleanMermaidCode(rawCode)
  if (!code) {
    return
  }

  // 生成唯一 ID
  const id = `mermaid-diagram-${mermaidIdCounter++}`

  try {
    // 确保 mermaid 已初始化
    if (!mermaidInstance) {
      console.error("[BearGPT Mermaid] mermaid not initialized")
      return
    }
    
    // 使用 mermaid.render() 渲染
    const { svg } = await mermaidInstance.render(id, code)

    // 创建容器
    const container = document.createElement("div")
    container.className = "mermaid-container"

    // 创建图表容器
    const diagramWrapper = document.createElement("div")
    diagramWrapper.className = "mermaid-diagram-wrapper"
    diagramWrapper.innerHTML = svg

    // 创建代码容器（克隆原始代码块）
    const codeWrapper = document.createElement("div")
    codeWrapper.className = "mermaid-code-wrapper"
    codeWrapper.style.display = "none"

    // 创建工具栏
    const { toolbar } = createToolbar(diagramWrapper)

    // 组装容器
    container.appendChild(toolbar)
    container.appendChild(diagramWrapper)
    container.appendChild(codeWrapper)

    // 将原始 pre 元素移动到代码容器中
    preElement.parentNode?.insertBefore(container, preElement)
    codeWrapper.appendChild(preElement)

    console.log("[BearGPT Mermaid] Rendered:", id)
  } catch (error) {
    console.error("[BearGPT Mermaid] Render error:", error)
    // 渲染失败时取消标记，允许后续重试
    processedElements.delete(codeElement)
  }
}

/**
 * 扫描并渲染所有 mermaid 代码块
 */
function scanAndRender() {
  if (!isEnabled) return

  const blocks = findMermaidBlocks()
  blocks.forEach((block) => {
    renderMermaidBlock(block)
  })
}

// Observer 实例
let mermaidObserver: MutationObserver | null = null

/**
 * 设置 MutationObserver 监听 DOM 变化
 */
function setupObserver() {
  if (mermaidObserver) {
    mermaidObserver.disconnect()
  }

  mermaidObserver = new MutationObserver((mutations) => {
    if (!isEnabled) return

    let shouldScan = false

    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element
            // 检查新增节点是否包含 mermaid 代码
            if (
              (element.matches && element.matches(MERMAID_SELECTORS.join(", "))) ||
              (element.querySelector &&
                element.querySelector(MERMAID_SELECTORS.join(", ")))
            ) {
              shouldScan = true
              break
            }
          }
        }
      }
      if (shouldScan) break
    }

    if (shouldScan) {
      requestAnimationFrame(() => {
        scanAndRender()
      })
    }
  })

  mermaidObserver.observe(document.body, {
    childList: true,
    subtree: true
  })

  console.log("[BearGPT Mermaid] Observer started")
}

/**
 * 移除所有已渲染的 Mermaid 容器，恢复原始代码块
 */
function removeAllMermaidContainers() {
  const containers = document.querySelectorAll(".mermaid-container")
  console.log("[BearGPT Mermaid] Removing containers:", containers.length)
  
  containers.forEach((container) => {
    const codeWrapper = container.querySelector(".mermaid-code-wrapper")
    const preElement = codeWrapper?.querySelector("pre")

    if (preElement && container.parentNode) {
      // 恢复原始 pre 元素
      container.parentNode.insertBefore(preElement, container)
      container.parentNode.removeChild(container)

      // 从已处理集合中移除
      const codeElement = preElement.querySelector("code")
      if (codeElement) {
        processedElements.delete(codeElement)
      }
      console.log("[BearGPT Mermaid] Container removed and code restored")
    } else {
      // 如果没有原始代码块，直接移除容器
      container.parentNode?.removeChild(container)
      console.log("[BearGPT Mermaid] Container removed (no code to restore)")
    }
  })
}

/**
 * 启用 Mermaid 预览
 */
export async function enableMermaidPreview() {
  if (isEnabled) return

  const success = await initMermaid()
  if (!success) {
    console.error("[BearGPT Mermaid] Failed to initialize, aborting enable")
    return
  }
  
  isEnabled = true

  // 初始扫描
  scanAndRender()

  // 设置观察者监听动态内容
  setupObserver()

  console.log("[BearGPT Mermaid] Enabled")
}

/**
 * 禁用 Mermaid 预览
 */
export function disableMermaidPreview() {
  console.log("[BearGPT Mermaid] disableMermaidPreview called, isEnabled:", isEnabled)
  
  // 无论当前状态如何，都执行清理
  isEnabled = false

  // 停止观察
  if (mermaidObserver) {
    mermaidObserver.disconnect()
    mermaidObserver = null
    console.log("[BearGPT Mermaid] Observer disconnected")
  }

  // 移除已渲染的容器
  removeAllMermaidContainers()

  console.log("[BearGPT Mermaid] Disabled")
}

/**
 * 设置 Mermaid 预览状态
 */
export async function setMermaidPreviewEnabled(enabled: boolean) {
  console.log("[BearGPT Mermaid] setMermaidPreviewEnabled:", enabled)
  if (enabled) {
    await enableMermaidPreview()
  } else {
    disableMermaidPreview()
  }
}

/**
 * 获取当前启用状态
 */
export function isMermaidPreviewEnabled(): boolean {
  return isEnabled
}
