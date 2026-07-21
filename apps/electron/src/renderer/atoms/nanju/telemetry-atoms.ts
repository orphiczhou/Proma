/**
 * Nanju 埋点缓冲 Atom
 *
 * 对应 sprint-plan.md S1-T1.1 清单中的：telemetryBufferAtom。
 * 字段类型对齐 data-model.md §4（TelemetryEvent 实体）。
 * 落盘（JSONL 追加 + flush）属 B5-Telemetry 服务，本 atom 仅做内存缓冲。
 * flush 阈值与 sprint-plan S2-T7.5 一致（100 条 / 30s / 退出前）。
 */

import { atom } from 'jotai'
import type { TelemetryEvent } from './types'

// ===== 常量 =====

/**
 * 缓冲区 flush 阈值（条数）。
 * 超过即触发强制 flush（api-spec E-TELE-280 缓冲溢出）。
 */
export const TELEMETRY_BUFFER_FLUSH_THRESHOLD = 100

// ===== Atoms =====

/**
 * 埋点事件内存缓冲（采集层 collect → 缓冲 → 定时/满额 flush 到 JSONL）。
 * 全量采集、异步非阻塞（data-model.md §4.1）。
 */
export const telemetryBufferAtom = atom<TelemetryEvent[]>([])

// ===== 派生 Atoms =====

/** 缓冲区是否已达 flush 阈值（供采集层决定是否提前 flush）。 */
export const isTelemetryBufferFullAtom = atom<boolean>(
  (get) => get(telemetryBufferAtom).length >= TELEMETRY_BUFFER_FLUSH_THRESHOLD,
)
