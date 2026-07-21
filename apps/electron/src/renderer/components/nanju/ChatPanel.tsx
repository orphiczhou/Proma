/**
 * ChatPanel — 快消型工作区左侧聊天区（骨架）
 *
 * 对齐 sprint-plan.md S1-T3.1（消息列表 + 输入框 + 发送按钮）：
 *   - 回车发送、Shift+回车换行
 *   - 发送的消息 append 到 chatMessagesAtom
 * Sprint 1 不接真实 Agent（B2-Route / B3-Guide 接入后由服务层驱动 assistant 回复），
 * 当前发送仅落入本地消息列表，用于 UI 骨架演示。
 */

import * as React from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { SendHorizontal } from 'lucide-react'
import { chatInputAtom, chatMessagesAtom, currentRoleDisplayNameAtom } from '@/atoms/nanju'
import type { NanjuChatMessage } from '@/atoms/nanju'

/**
 * 模块级递增计数器，便于测试断言。
 * 已知技术债：模块级状态跨 ChatPanel 实例 / 跨测试用例共享；
 * Sprint 2 接入真实 SDK 消息后由服务层用 UUID v4 生成，届时移除。
 */
let localIdSeq = 0
function generateLocalId(): string {
  return `local-${Date.now()}-${localIdSeq++}`
}

export function ChatPanel(): React.ReactElement {
  const messages = useAtomValue(chatMessagesAtom)
  const [input, setInput] = useAtom(chatInputAtom)
  const roleDisplayName = useAtomValue(currentRoleDisplayNameAtom)
  const setMessages = useSetAtom(chatMessagesAtom)

  const scrollRef = React.useRef<HTMLDivElement>(null)

  // 新消息时滚到底部
  React.useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const submit = () => {
    const text = input.trim()
    if (!text) return
    const msg: NanjuChatMessage = {
      id: generateLocalId(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      agentRole: null,
    }
    setMessages((prev) => [...prev, msg])
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 回车发送、Shift+回车换行（sprint-plan S1-T3 验收）
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* 消息列表 */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center px-6">
            <div className="space-y-1 text-muted-foreground">
              <p className="text-sm font-medium">{roleDisplayName}已就绪</p>
              <p className="text-xs">说说你想做什么，例如"做一个记账小工具"。</p>
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} message={m} roleDisplayName={roleDisplayName} />
          ))
        )}
      </div>

      {/* 输入区 */}
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-primary/40">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的想法…（Enter 发送，Shift+Enter 换行）"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 max-h-32"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!input.trim()}
            aria-label="发送"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-40 hover:opacity-90"
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

/** 单条消息气泡 */
function MessageBubble({
  message,
  roleDisplayName,
}: {
  message: NanjuChatMessage
  roleDisplayName: string
}): React.ReactElement {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm',
        ].join(' ')}
      >
        {!isUser && message.agentRole && (
          <div className="mb-0.5 text-[11px] font-medium text-muted-foreground">{roleDisplayName}</div>
        )}
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
      </div>
    </div>
  )
}
