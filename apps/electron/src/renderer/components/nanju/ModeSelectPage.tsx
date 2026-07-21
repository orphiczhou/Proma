/**
 * ModeSelectPage — 模式选择页（两道门：通俗说明 + 场景举例）
 *
 * 对齐 sprint-plan.md S1-T2.2（双卡片布局，居中展示）+ US-U01。
 * 启动首页 / Portal 覆盖层（architecture.md §4.1）；骨架阶段由 nanjuPhaseAtom 控制可见性。
 * 用户选模式 → 点"进入工作区" → nanjuPhaseAtom 置 'workspace'（真实路由属 S1-T2.4）。
 */

import * as React from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { Zap, Building2, ArrowRight } from 'lucide-react'
import { ModeSelectCard } from './ModeSelectCard'
import {
  projectModeAtom,
  nanjuPhaseAtom,
  hasSelectedModeAtom,
  activeProjectAtom,
} from '@/atoms/nanju'
import type { ProjectMode } from '@/atoms/nanju'

/** 快消型卡片配置 */
const QUICK_CARD = {
  icon: Zap,
  title: '快速做一个工具',
  subtitle: '几分钟内把一个想法变成能用的网页小工具。不用想太多，做完就用，随时能改。',
  scenarios: ['个人记账本', '二维码生成器', '快速整理表格', '临时计算器'],
}

/** 长期迭代型卡片配置 */
const ITERATIVE_CARD = {
  icon: Building2,
  title: '做一个长期维护的项目',
  subtitle: '从需求梳理到代码落地，AI 全流程陪跑，交付结构清晰、可长期维护的工程。',
  scenarios: ['团队博客平台', '客户管理系统', 'SaaS 后台', '小程序商城'],
}

export function ModeSelectPage(): React.ReactElement {
  const [mode, setMode] = useAtom(projectModeAtom)
  const setPhase = useSetAtom(nanjuPhaseAtom)
  const hasSelected = useAtomValue(hasSelectedModeAtom)
  const activeProject = useAtomValue(activeProjectAtom)

  const selectMode = (m: ProjectMode) => setMode(m)
  const enterWorkspace = () => {
    if (!hasSelected) return
    setPhase('workspace')
  }

  return (
    <div className="flex h-full flex-col items-center justify-center overflow-y-auto bg-content-area px-6 py-10">
      <div className="w-full max-w-3xl">
        {/* 标题区 */}
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">你想做什么？</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            选一个开始方式，后面随时可以调整。
          </p>
        </header>

        {/* 双卡片（两道门） */}
        <div className="grid gap-4 sm:grid-cols-2">
          <ModeSelectCard
            {...QUICK_CARD}
            selected={mode === 'quick'}
            onSelect={() => selectMode('quick')}
          />
          <ModeSelectCard
            {...ITERATIVE_CARD}
            selected={mode === 'iterative'}
            onSelect={() => selectMode('iterative')}
          />
        </div>

        {/* 进入工作区 */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={enterWorkspace}
            disabled={!hasSelected}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-40 hover:opacity-90"
          >
            进入工作区
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="text-xs text-muted-foreground/70">
            {activeProject
              ? '检测到有未完成的项目，进入后可继续。'
              : hasSelected
                ? '点击开始，AI 会引导你说清需求。'
                : '请先选择一种模式。'}
          </p>
        </div>
      </div>
    </div>
  )
}
