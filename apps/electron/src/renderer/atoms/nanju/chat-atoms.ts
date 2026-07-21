/**
 * Nanju 聊天消息 Atom（快消型工作区左侧聊天区）
 *
 * 对应 sprint-plan.md S1-T1.1 清单中的：chatMessagesAtom。
 * 与 Proma 既有 `atoms/chat-atoms.ts`（基于 conversationId 的 SDK 对话）不同：
 * Nanju 工作区聊天在 Sprint 1 是骨架，不接真实 Agent，仅维护本地消息列表用于 UI 演示。
 * 真实对话路由（B2-Route）+ 向导引擎（B3-Guide）接入后由服务层驱动。
 * 放在 nanju 子目录避免命名冲突。
 */

import { atom } from 'jotai'
import type { NanjuChatMessage } from './types'

// ===== Atoms =====

/**
 * 工作区聊天区的消息列表（骨架，本地态）。
 * 用户发送的消息 append 为 role='user'；assistant 回复由服务层填入。
 */
export const chatMessagesAtom = atom<NanjuChatMessage[]>([])

/** 聊天输入框当前文本（受控输入绑定）。 */
export const chatInputAtom = atom<string>('')
