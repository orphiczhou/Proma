/**
 * Nanju 向导角色 Atom
 *
 * 对应 sprint-plan.md S1-T1.1 清单中的：agentRoleAtom。
 * 角色枚举对齐 data-model.md §5.3 + architecture.md §5.1（串行 4 角色）。
 */

import { atom } from 'jotai'
import type { GuideAgentRole } from './types'

// ===== 常量 =====

/**
 * 向导 Agent 串行切换序列（architecture.md §5.1）。
 * 路由层（B2-Route）按阶段驱动角色切换时遵循此顺序。
 */
export const GUIDE_ROLE_SEQUENCE: readonly GuideAgentRole[] = [
  'requirement-analyst',
  'ux-advisor',
  'architect',
  'engineering-manager',
]

/** 角色中文显示名（UI 展示用，避免组件里散落映射）。 */
const GUIDE_ROLE_DISPLAY_NAME: Record<GuideAgentRole, string> = {
  'requirement-analyst': '需求分析师',
  'ux-advisor': 'UI/UX 顾问',
  architect: '架构设计师',
  'engineering-manager': '工程经理',
}

// ===== Atoms =====

/**
 * 当前激活的向导角色。
 * 初始 `requirement-analyst`（串行第 1 角色，architecture.md §5.1）。
 * 切换由 route.switchTo（api-spec §3.1）驱动，骨架阶段仅占位。
 */
export const agentRoleAtom = atom<GuideAgentRole>('requirement-analyst')

// ===== 派生 Atoms =====

/** 当前角色的中文显示名（UI 标题/消息来源标注用）。 */
export const currentRoleDisplayNameAtom = atom<string>((get) => {
  const role = get(agentRoleAtom)
  return GUIDE_ROLE_DISPLAY_NAME[role]
})
