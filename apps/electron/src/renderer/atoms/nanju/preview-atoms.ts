/**
 * Nanju 预览状态 Atom（快消型工作区右侧预览区）
 *
 * 对应 sprint-plan.md S1-T1.1 清单中的：previewStateAtom。
 * 与 Proma 既有 `atoms/preview-atoms.ts`（Diff/文件预览）是不同概念：
 *   - Proma preview-atoms：Agent 会话的文件 diff 预览
 *   - Nanju preview-atoms：HTML 原型预览 + data-ai-id 点选纠错（architecture.md §7）
 * 放在 nanju 子目录避免命名冲突。
 *
 * commander brief 明确 Sprint 1"预览暂占位"：ready=false，真实 iframe 沙箱链路在 S1-T7。
 */

import { atom } from 'jotai'
import type { PreviewState } from './types'

// ===== 常量 =====

/** 预览区初始状态：未就绪、无内容、未在生成。 */
const INITIAL_PREVIEW_STATE: PreviewState = {
  ready: false,
  html: null,
  filePath: null,
  generating: false,
}

// ===== Atoms =====

/**
 * 快消型工作区右侧预览区状态。
 * UI 占位组件读取 ready/generating 决定展示"占位"还是"生成中"还是"原型"。
 */
export const previewStateAtom = atom<PreviewState>(INITIAL_PREVIEW_STATE)
