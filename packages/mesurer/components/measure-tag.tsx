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
        "pointer-events-none absolute rounded px-1 py-0.5 text-[10px] font-medium text-white tabular-nums select-none shadow-[0_1px_2px_rgba(0,0,0,0.28)]",
        className
      )}
      style={style}
    >
      {children}
    </div>
  )
}
