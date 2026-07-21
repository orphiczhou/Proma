/**
 * Nanju 平台共享类型定义
 *
 * 新平台（向导Agent + 编程Agent 多智能体协同开发平台）的状态层共享类型。
 * 全部字段与命名严格对齐：
 *   - 03_ARCHITECTURE/data-model.md v0.5（§2 Project / §3 Snapshot / §4 TelemetryEvent）
 *   - 04_API_SPEC/api-spec.md v0.3（附录 A 共享枚举）
 *   - 03_ARCHITECTURE/architecture.md §4.2 扩展点（~8 atoms 清单）
 *
 * 这些类型仅用于 nanju 子目录下的 atoms/components，不污染 Proma 既有命名空间。
 * 放在 `atoms/nanju/` 子目录是为了降低 Proma upstream 升级时的合并冲突
 * （architecture.md §11 风险 R3：atoms/components 独立目录）。
 */

// ===== 项目枚举（data-model.md §2.2）=====

/**
 * 项目模式。
 * - `quick`：快消型（几分钟把想法变成能用的工具）
 * - `iterative`：长期迭代型（从需求到代码全流程陪跑，交付可维护工程）
 *
 * 对应 api-spec.md 附录 A：`type ProjectMode = 'quick' | 'iterative'`。
 */
export type ProjectMode = 'quick' | 'iterative'

/**
 * 工程模板（向导Agent 从用户描述推断，对用户透明）。
 * 快消型统一使用 `desktop-tool`（最小集）。
 * 见 architecture.md §10、data-model.md §2.2。
 */
export type ProjectTemplate =
  | 'web-fullstack'
  | 'mobile-app'
  | 'desktop-tool'
  | 'cli-script'
  | 'hardware'
  | 'ai-app'

/**
 * 项目状态。见 data-model.md §2.2。
 */
export type ProjectStatus = 'active' | 'completed' | 'abandoned'

/**
 * 项目阶段（currentStage）。
 * 状态转移规则见 data-model.md §2.2（mode-select → requirements → ... → delivered）。
 * 快消型在 architecture → coding 之间跳过 planning。
 */
export type Stage =
  | 'mode-select'
  | 'requirements'
  | 'prototype'
  | 'architecture'
  | 'planning'
  | 'coding'
  | 'testing'
  | 'delivered'

// ===== Agent 角色（data-model.md §5.3 + architecture.md §8）=====

/**
 * 向导 Agent 的 4 个串行角色（Session Restart + Context Backfill）。
 * 见 architecture.md §5.1、data-model.md §5.3。
 * 编程 Agent 域角色（全栈开发/测试/裁判等）属 Sprint 2，不在本枚举。
 */
export type GuideAgentRole =
  | 'requirement-analyst'
  | 'ux-advisor'
  | 'architect'
  | 'engineering-manager'

// ===== Project 实体（data-model.md §2.1）=====

/**
 * 项目元数据。字段与 data-model.md §2.1 一一对应。
 * 物理存储于 `_system/projects-index.json` + 项目目录下 `_meta.json#project`。
 */
export interface Project {
  /** 项目唯一标识（UUID v4，创建时分配） */
  projectId: string
  /** 用户可见的项目名称（≤100） */
  name: string
  /** ASCII 安全短名，用于生成目录名（≤30） */
  shortName: string
  /** 项目模式 */
  mode: ProjectMode
  /** 工程模板 */
  template: ProjectTemplate
  /** 项目状态 */
  status: ProjectStatus
  /** 当前阶段 */
  currentStage: Stage
  /** 创建时间（ISO8601） */
  createdAt: string
  /** 最后活动时间（ISO8601，每次对话自动更新） */
  updatedAt: string
  /** 完成时间（ISO8601，status=completed 时写入，否则 null） */
  completedAt: string | null
  /** 累计 Token 消耗 */
  totalTokenUsed: number
  /** 项目目录绝对路径：workspace-files/{projectId}-{shortName}/ */
  directoryPath: string
}

// ===== Snapshot 实体（data-model.md §3）=====

/**
 * 快照触发类型。见 data-model.md §3.2/§3.3。
 * 线性回滚，不支持分支；由系统自动触发，用户不可手动创建。
 */
export type SnapshotTriggerType =
  | 'init'
  | 'pre-modify'
  | 'confirm'
  | 'mode-switch'
  | 'pre-error'

/**
 * 快照元数据。字段与 data-model.md §3.2 一一对应。
 * 实现细节（fs.linkSync 硬链接 + 两阶段提交）属 Sprint 2（B4-Snapshot），
 * 本类型仅定义 shape 供 atom 持有。
 */
export interface Snapshot {
  /** 项目内自增序号（从 1 开始） */
  snapshotId: number
  /** 所属项目 ID（外键 → Project.projectId） */
  projectId: string
  /** 快照创建时间（ISO8601） */
  timestamp: string
  /** 自然语言描述，如"确认原型后"（≤200） */
  description: string
  /** 触发类型 */
  triggerType: SnapshotTriggerType
  /** 快照物理路径：snapshots/{projectId}/snap-{timestamp}-{snapshotId}/ */
  filePath: string
  /** 是否为当前活跃快照（同一时间只有一个为 true） */
  isCurrent: boolean
  /** 快照是否健康（回滚后保留的快照为 true） */
  isHealthy: boolean
}

// ===== TelemetryEvent 实体（data-model.md §4）=====

/**
 * 埋点事件类型（13 种，与 PRD §12.4 一致）。见 data-model.md §4.3。
 * Sprint 1 仅采集前端事件子集（project.created / dialog.submitted / role.switched），
 * 其余枚举值预先定义以锁定契约（b-layer-sprint1 B5-Telemetry）。
 */
export type TelemetryEventType =
  | 'project.created'
  | 'dialog.submitted'
  | 'role.switched'
  | 'prd.confirmed'
  | 'prototype.confirmed'
  | 'user.undo'
  | 'click.fix'
  | 'mode.switch'
  | 'coding.executed'
  | 'autofix.triggered'
  | 'judge.verdict'
  | 'user.satisfaction'
  | 'project.finished'

/**
 * 埋点事件。字段与 data-model.md §4.2 一一对应。
 * 物理存储于 `_system/telemetry/events-{YYYY-MM}.jsonl`（按月分片，每行一个 JSON）。
 * atom 层仅做内存缓冲（telemetryBufferAtom），落盘由 B5-Telemetry 服务实现。
 */
export interface TelemetryEvent {
  /** 事件唯一标识（UUID v4） */
  eventId: string
  /** 用户会话 ID（应用启动时创建） */
  sessionId: string
  /** 关联项目 ID（全局事件可为 null） */
  projectId: string | null
  /** 脱敏后的用户标识 hash(username+deviceId) */
  userId: string
  /** 事件类型 */
  eventType: TelemetryEventType
  /** 事件发生时间（ISO8601，客户端时钟） */
  timestamp: string
  /** 事件发生时所在阶段（可空） */
  stage: Stage | null
  /** 事件发生时的项目模式（可空） */
  mode: ProjectMode | null
  /** 事件耗时 ms（可空） */
  duration: number | null
  /** 事件特定数据（结构随 eventType 变化，见 data-model.md §4.3） */
  payload: Record<string, unknown>
}

// ===== 预览状态（architecture.md §4.2 预览状态atom / §7 点选纠错）=====

/**
 * 快消型工作区右侧预览区的状态。
 * Sprint 1 仅骨架：预览暂占位（commander brief 明确"预览暂占位"），
 * 真实 iframe 沙箱 + data-ai-id 点选纠错链路在 S1-T7 实现。
 * shape 预留以锁定 atom 契约。
 */
export interface PreviewState {
  /** 预览是否就绪（有可展示的原型 HTML） */
  ready: boolean
  /** 当前预览的原型 HTML 内容（srcdoc 或 filePath，骨架阶段为 null） */
  html: string | null
  /** 当前预览文件路径（占位） */
  filePath: string | null
  /** 是否正在生成原型 */
  generating: boolean
  /**
   * iframe sandbox flags（S1-T7 接入点预留）。
   * 默认应为 `['allow-scripts']`，**不含** `allow-same-origin`（同时允许 scripts + same-origin
   * 会让沙箱脚本逃逸访问父窗口，XSS 风险，见 architecture.md §6 沙箱方案）。骨架阶段为 undefined。
   */
  sandbox?: string[]
}

// ===== 聊天消息（骨架，对齐 Proma ChatMessage 语义但独立定义）=====

/**
 * Nanju 工作区聊天区的单条消息（骨架）。
 * Sprint 1 不接真实 Agent，仅维护本地消息列表用于 UI 骨架演示。
 * 真实对话路由（B2-Route）+ 向导引擎（B3-Guide）接入后替换为 SDK 消息。
 */
export interface NanjuChatMessage {
  /** 消息唯一标识 */
  id: string
  /** 发送方角色 */
  role: 'user' | 'assistant'
  /** 消息文本内容 */
  content: string
  /** 发送时间（ISO8601） */
  timestamp: string
  /** 当前激活的向导角色（assistant 消息标注来源角色，可空） */
  agentRole: GuideAgentRole | null
}

// ===== Nanju 应用阶段（视图路由，骨架）=====

/**
 * Nanju 前端的顶层视图阶段。
 * - `mode-select`：模式选择页（两道门，启动首页 / Portal）
 * - `workspace`：已选模式，进入快消型工作区
 *
 * 真实路由（检查活跃项目 → 跳过模式选择）属 S1-T2.4，骨架阶段用此 atom 控制可见性。
 */
export type NanjuPhase = 'mode-select' | 'workspace'
