"use client"

import type { CSSProperties, ReactNode } from "react"
import { cn } from "../utils"

type MeasureTagProps = {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function MeasureTag({
  children,
  className = "",
  style,
}: MeasureTagProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute rounded px-1 py-0.5 text-[10px] text-ink-50 tabular-nums select-none",
        className
      )}
      style={style}
    >
      {children}
    </div>
  )
}
