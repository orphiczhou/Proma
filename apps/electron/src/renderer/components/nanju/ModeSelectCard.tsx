/**
 * ModeSelectCard — 模式选择页单卡片（两道门之一）
 *
 * 每张卡片承载 commander brief 的"两道门"：
 *   1. 通俗说明（subtitle）：用大白话讲这个模式是干嘛的
 *   2. 场景举例（scenarios）：具体能做什么的例子
 * 对齐 sprint-plan.md S1-T2.1（图标+标题+副标题+场景举例+悬停动效）。
 */

import * as React from 'react'
import type { LucideIcon } from 'lucide-react'

export interface ModeSelectCardProps {
  /** 卡片图标（lucide-react 图标组件） */
  icon: LucideIcon
  /** 卡片标题（如"快速做一个工具"） */
  title: string
  /** 通俗说明（第一道门：大白话讲模式价值） */
  subtitle: string
  /** 场景举例（第二道门：具体可做的事） */
  scenarios: string[]
  /** 是否选中 */
  selected: boolean
  /** 选中回调 */
  onSelect: () => void
}

export function ModeSelectCard({
  icon: Icon,
  title,
  subtitle,
  scenarios,
  selected,
  onSelect,
}: ModeSelectCardProps): React.ReactElement {
  // 键盘可达性：Enter / Space 触发选择，与点击等价
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${title}：${subtitle}`}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={[
        'group flex flex-col gap-4 p-6 rounded-2xl border-2 cursor-pointer',
        'transition-all duration-150 outline-none',
        'hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/60',
        'focus-visible:ring-2 focus-visible:ring-primary/50',
        selected
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-border bg-card hover:bg-accent/30',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <div
          className={[
            'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
            selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:text-foreground',
          ].join(' ')}
        >
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>

      {/* 第一道门：通俗说明 */}
      <p className="text-sm text-muted-foreground leading-relaxed">{subtitle}</p>

      {/* 第二道门：场景举例 */}
      <div className="mt-auto">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
          你可以做
        </p>
        <ul className="flex flex-col gap-1.5">
          {scenarios.map((s) => (
            <li key={s} className="flex items-center gap-2 text-sm text-foreground/80">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
              {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
