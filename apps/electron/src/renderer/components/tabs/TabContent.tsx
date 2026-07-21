/**
 * TabContent — 标签内容渲染器
 *
 * 根据标签类型渲染参数化的 ChatView 或 AgentView。
 * 直接传递 sessionId/conversationId prop，无需桥接全局 atoms。
 */

import * as React from 'react'
import { useAtomValue } from 'jotai'
import { tabsAtom } from '@/atoms/tab-atoms'
import { markdownTocOpenAtom } from '@/atoms/markdown-toc'
import { ChatView } from '@/components/chat'
import { AgentView } from '@/components/agent'
import { PreviewTabContent } from '@/components/diff/PreviewTabContent'
import { MarkdownRichEditor } from '@/components/diff/MarkdownRichEditor'
import { MarkdownToc } from '@/components/diff/MarkdownToc'
import { ScratchPadView } from '@/components/scratch-pad/ScratchPadView'
import { QuickWorkspace } from '@/components/nanju'
import { TabErrorBoundary } from './TabErrorBoundary'

export interface TabContentProps {
  tabId: string
}

/**
 * Nanju 占位 Tab 的提示文案。
 * Sprint 1 仅 'quick-workspace' 真实渲染（QuickWorkspace 组件），
 * 其余三类（长期迭代型工作区 / 我的项目 / 分析看板）预留占位分支，后续 Sprint 接入。
 * 对应 sprint-plan S1-T1.6（渲染分支占位）。
 */
const NANJU_TAB_PLACEHOLDER_LABEL: Record<'long-workspace' | 'project-list' | 'analytics', string> = {
  'long-workspace': '长期迭代型工作区（建设中 · S1-T3.5）',
  'project-list': '我的项目（建设中 · S1-T8）',
  analytics: '分析看板（建设中 · S2-T8）',
}

export function TabContent({ tabId }: TabContentProps): React.ReactElement {
  const tabs = useAtomValue(tabsAtom)
  const tab = tabs.find((t) => t.id === tabId)

  // [FLASH-DEBUG] 监控 tab 查找失败（说明 tabId 指向了不存在的标签）
  React.useEffect(() => {
    if (!tab) {
      console.warn(`[FLASH-DEBUG] TabContent: tab not found for tabId="${tabId}"`, { tabIds: tabs.map(t => t.id) })
    }
  }, [tab, tabId, tabs])

  if (!tab) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        标签页不存在
      </div>
    )
  }

  if (tab.type === 'scratch') {
    return <ScratchPadView />
  }

  if (tab.type === 'tutorial') {
    return <TutorialTabContent />
  }

  if (tab.type === 'chat') {
    return (
      <TabErrorBoundary key={tab.sessionId} sessionId={tab.sessionId}>
        <ChatView conversationId={tab.sessionId} />
      </TabErrorBoundary>
    )
  }

  if (tab.type === 'preview') {
    return (
      <TabErrorBoundary key={tab.id} sessionId={tab.sessionId}>
        <PreviewTabContent sessionId={tab.sessionId} />
      </TabErrorBoundary>
    )
  }

  // ===== Nanju 平台扩展分支（architecture.md §4.1，sprint-plan S1-T1.6）=====

  // 快消型工作区：左聊天 + 右预览占位（Sprint 1 真实骨架）
  if (tab.type === 'quick-workspace') {
    return <QuickWorkspace />
  }

  // 占位：长期迭代型工作区 / 我的项目 / 分析看板（后续 Sprint 实现真实组件）
  if (
    tab.type === 'long-workspace' ||
    tab.type === 'project-list' ||
    tab.type === 'analytics'
  ) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        {NANJU_TAB_PLACEHOLDER_LABEL[tab.type]}
      </div>
    )
  }

  return (
    <TabErrorBoundary key={tab.sessionId} sessionId={tab.sessionId}>
      <AgentView sessionId={tab.sessionId} />
    </TabErrorBoundary>
  )
}

function TutorialTabContent(): React.ReactElement {
  const [content, setContent] = React.useState('')
  const [loadState, setLoadState] = React.useState<'loading' | 'ready' | 'error'>('loading')
  const tocOpen = useAtomValue(markdownTocOpenAtom)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    window.electronAPI.getTutorialContent()
      .then((result) => {
        if (result === null) {
          setLoadState('error')
          return
        }
        setContent(result)
        setLoadState('ready')
      })
      .catch((error) => {
        console.error(error)
        setLoadState('error')
      })
  }, [])

  if (loadState === 'loading') {
    return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">加载中...</div>
  }

  if (loadState === 'error') {
    return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">教程加载失败</div>
  }

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden">
      <MarkdownToc containerRef={scrollRef as React.RefObject<HTMLElement>} contentKey={content.slice(0, 100)} enabled={tocOpen} />
      <div ref={scrollRef} className="flex-1 min-w-0 overflow-y-auto p-8">
        <MarkdownRichEditor
          value={content}
          editing={false}
          onChange={() => {}}
          onSave={() => {}}
          onCancel={() => {}}
        />
      </div>
    </div>
  )
}
