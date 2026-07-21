/**
 * Nanju 快照列表 Atom
 *
 * 对应 sprint-plan.md S1-T1.1 清单中的：snapshotListAtom。
 * 字段类型对齐 data-model.md §3（Snapshot 实体）。
 * 快照创建/回滚的硬链接实现属 Sprint 2（B4-Snapshot），本 atom 仅持有列表 shape。
 */

import { atom } from 'jotai'
import type { Snapshot } from './types'

// ===== Atoms =====

/**
 * 当前项目的快照列表（按 snapshotId 升序，线性追加，无分支）。
 * 真实数据从项目 `_meta.json#snapshots` 读取（data-model §8），骨架阶段为空数组。
 */
export const snapshotListAtom = atom<Snapshot[]>([])

// ===== 派生 Atoms =====

/**
 * 当前活跃快照（isCurrent=true 的唯一项，无则 null）。
 * data-model.md §9 数据完整性约束：同一 projectId 最多一个 isCurrent=true。
 */
export const currentSnapshotAtom = atom<Snapshot | null>((get) => {
  const list = get(snapshotListAtom)
  return list.find((s) => s.isCurrent) ?? null
})
