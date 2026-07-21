/**
 * QuickWorkspace — 快消型工作区骨架（左聊天 + 右预览占位）
 *
 * 对齐 sprint-plan.md S1-T3.4（双区布局 + 可拖拽分隔线）+ architecture.md §4.1（QUICK_WORKSPACE Tab）。
 * 左侧 ChatPanel（聊天区）+ 右侧 PreviewPanel（预览占位），中间可拖拽分隔线调整比例。
 *
 * 注意：不依赖 Proma MainArea 的预览分屏（MainArea 预览绑定 activeTab.type==='agent'），
 * 本组件内部自实现左右分屏。
 */

import * as React from 'react'
import { ChatPanel } from './ChatPanel'
import { PreviewPanel } from './PreviewPanel'

/** 分隔线拖拽比例范围（左侧占比） */
const MIN_RATIO = 0.3
const MAX_RATIO = 0.8
const DEFAULT_RATIO = 0.6

export function QuickWorkspace(): React.ReactElement {
  const [ratio, setRatio] = React.useState(DEFAULT_RATIO)
  const dragging = React.useRef(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  // 当前拖拽会话的清理函数；unmount 时若仍在拖拽则兜底清理（防事件泄漏 + body 样式锁死）
  const cleanupRef = React.useRef<(() => void) | null>(null)

  React.useEffect(() => {
    // 组件卸载兜底：拖拽过程中切 Tab 导致 unmount 时，主动清理 document 监听与 body 样式
    return () => cleanupRef.current?.()
  }, [])

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    const startX = e.clientX
    const startRatio = ratio
    const containerEl = containerRef.current
    const containerWidth = containerEl?.clientWidth ?? 1
    let rafId = 0

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      // rAF 节流，避免高频 mousemove 触发重渲染（对齐 Proma MainArea 拖拽实现）
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        rafId = 0
        const delta = ev.clientX - startX
        const next = Math.max(
          MIN_RATIO,
          Math.min(MAX_RATIO, startRatio + delta / containerWidth),
        )
        setRatio(next)
      })
    }
    const cleanup = () => {
      if (rafId) cancelAnimationFrame(rafId)
      dragging.current = false
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      cleanupRef.current = null
    }
    const onMouseUp = () => cleanup()
    cleanupRef.current = cleanup
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0"
      data-split-container
    >
      {/* 左侧：聊天区。
          宽度算术：左 calc(ratio% − 3px) + 分隔线 6px + 右 flex-1（自动让 3px），
          三者之和恰为 100%，无溢出（右侧是 flex-1 自适应，非固定宽度）。 */}
      <div
        className="flex min-w-0 flex-col"
        style={{ flex: `0 0 calc(${ratio * 100}% - 3px)` }}
      >
        <ChatPanel />
      </div>

      {/* 分隔线 */}
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={handleDragStart}
        className="w-[6px] cursor-col-resize bg-border/50 transition-colors hover:bg-primary/40 active:bg-primary/60"
      />

      {/* 右侧：预览区（占位） */}
      <div className="flex min-w-0 flex-1">
        <PreviewPanel />
      </div>
    </div>
  )
}
