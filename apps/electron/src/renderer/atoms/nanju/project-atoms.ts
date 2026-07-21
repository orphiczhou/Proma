/**
 * Nanju 项目领域 Atoms
 *
 * 对应 sprint-plan.md S1-T1.1 清单中的：projectModeAtom / currentStageAtom / projectListAtom。
 * 字段类型对齐 data-model.md §2（Project 实体）。
 */

import { atom } from 'jotai'
import type { NanjuPhase, Project, ProjectMode, Stage } from './types'

// ===== Atoms =====

/**
 * 用户在模式选择页选中的项目模式（quick / iterative / null=未选择）。
 * 对应 sprint-plan S1-T2.3（projectModeAtom 选中状态管理）。
 * 骨架阶段为内存态；真实持久化在 Project.mode（data-model §2.1）。
 */
export const projectModeAtom = atom<ProjectMode | null>(null)

/**
 * 当前项目阶段。初始 `mode-select`（data-model.md §2.2 状态机入口）。
 * 阶段流转由对话路由层（B2-Route）驱动，骨架阶段仅占位。
 */
export const currentStageAtom = atom<Stage>('mode-select')

/**
 * 项目列表（"我的项目"页数据源，sprint-plan S1-T8）。
 * 真实数据从 `_system/projects-index.json` 加载（data-model §1.2），骨架阶段为空数组。
 */
export const projectListAtom = atom<Project[]>([])

/**
 * Nanju 前端顶层视图阶段（模式选择页 ↔ 工作区）。
 * 控制模式选择页可见性，骨架替代真实路由（S1-T2.4 检查活跃项目）。
 */
export const nanjuPhaseAtom = atom<NanjuPhase>('mode-select')

// ===== 派生 Atoms =====

/**
 * 当前活跃项目（projectListAtom 中 status='active' 的第一项，无则 null）。
 * 用于"启动时若有活跃项目则跳过模式选择"判定（S1-T2.4）。
 */
export const activeProjectAtom = atom<Project | null>((get) => {
  const list = get(projectListAtom)
  return list.find((p) => p.status === 'active') ?? null
})

/** 是否已选择项目模式（便捷派生，模式选择页"进入工作区"按钮可用条件之一）。 */
export const hasSelectedModeAtom = atom<boolean>((get) => get(projectModeAtom) !== null)
