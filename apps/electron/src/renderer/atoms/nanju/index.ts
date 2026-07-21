/**
 * Nanju 平台 Atoms 统一导出
 *
 * 集中导出新平台（向导Agent + 编程Agent 协同开发平台）的 Jotai 原子状态。
 * 与 Proma 既有 atoms 隔离（独立子目录，降低 upstream 合并冲突，architecture §11 R3）。
 *
 * 8 个核心 atom（对齐 sprint-plan.md S1-T1.1）：
 *   projectModeAtom / currentStageAtom / projectListAtom   ← project-atoms.ts
 *   agentRoleAtom                                          ← role-atoms.ts
 *   snapshotListAtom                                       ← snapshot-atoms.ts
 *   telemetryBufferAtom                                    ← telemetry-atoms.ts
 *   previewStateAtom                                       ← preview-atoms.ts
 *   chatMessagesAtom                                       ← chat-atoms.ts
 */

export * from './types'
export * from './project-atoms'
export * from './role-atoms'
export * from './snapshot-atoms'
export * from './telemetry-atoms'
export * from './preview-atoms'
export * from './chat-atoms'
