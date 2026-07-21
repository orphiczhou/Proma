/**
 * PreviewPanel — 快消型工作区右侧预览区（Sprint 1 占位）
 *
 * commander brief 明确 Sprint 1"预览暂占位"：不接真实 iframe 沙箱 / data-ai-id 点选纠错链路
 * （该链路属 sprint-plan S1-T7）。本组件根据 previewStateAtom 展示三种态：占位 / 生成中 / 就绪。
 * shape 锁定 atom 契约，S1-T7 接入时只需替换占位为 iframe。
 */

import * as React from 'react'
import { useAtomValue } from 'jotai'
import { Eye, Loader2 } from 'lucide-react'
import { previewStateAtom } from '@/atoms/nanju'

export function PreviewPanel(): React.ReactElement {
  const preview = useAtomValue(previewStateAtom)

  return (
    <div className="flex h-full flex-col bg-muted/30 border-l border-border">
      {/* 顶栏 */}
      <div className="flex items-center gap-2 px-4 h-10 border-b border-border bg-background/50">
        <Eye className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">预览</span>
      </div>

      {/* 主体：三态 */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-6">
        {preview.generating ? (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">AI 正在生成原型…</p>
          </div>
        ) : preview.ready ? (
          // S1-T7 接入点：替换为 iframe sandbox + srcDoc=preview.html
          <div className="text-sm text-muted-foreground">[预览接入点] 原型将在此处展示</div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
            <Eye className="h-8 w-8 opacity-40" />
            <p className="text-sm">预览区（占位）</p>
            <p className="text-xs max-w-xs leading-relaxed">
              告诉 AI 你想做什么，原型会在这里实时展示，支持点击修改。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
