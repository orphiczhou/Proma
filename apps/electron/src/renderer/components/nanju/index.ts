/**
 * Nanju 前端组件统一导出
 *
 * 新平台 UI 组件，与 Proma 既有 components 隔离（独立子目录，architecture §11 R3）。
 * 由 TabContent.tsx 的 quick-workspace 分支 / 模式选择页路由挂载。
 */

export { ModeSelectCard } from './ModeSelectCard'
export type { ModeSelectCardProps } from './ModeSelectCard'
export { ModeSelectPage } from './ModeSelectPage'
export { ChatPanel } from './ChatPanel'
export { PreviewPanel } from './PreviewPanel'
export { QuickWorkspace } from './QuickWorkspace'