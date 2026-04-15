"use client"

import { memo, useEffect, useState } from "react"
import type { EdgeVisibility } from "../edge-visibility"
import { MeasureTag } from "./measure-tag"

type Rect = {
  left: number
  top: number
  width: number
  height: number
}

type SelectedMeasurement = {
  rect: Rect
  paddingRect: Rect
  marginRect: Rect
  originRect?: Rect
}

type SelectedMeasurementBoxProps = {
  measurement: SelectedMeasurement
  transitionMs: number
  labelOffset: number
  edgeVisibility?: EdgeVisibility
}

const formatValue = (value: number) => Math.round(value)

export const SelectedMeasurementBox = memo(function SelectedMeasurementBox({
  measurement,
  transitionMs,
  labelOffset,
  edgeVisibility,
}: SelectedMeasurementBoxProps) {
  const [rect, setRect] = useState<Rect>(
    measurement.originRect ?? measurement.rect
  )

  useEffect(() => {
    if (!measurement.originRect) return

    const frame = requestAnimationFrame(() => {
      setRect(measurement.rect)
    })

    return () => cancelAnimationFrame(frame)
  }, [measurement])

  const edges =
    edgeVisibility ??
    ({ top: true, right: true, bottom: true, left: true } as EdgeVisibility)
  const displayRect = measurement.originRect ? rect : measurement.rect
  const outlineColor =
    "color-mix(in oklch, oklch(0.62 0.18 255) 80%, transparent)"
  const fillColor = "color-mix(in oklch, oklch(0.62 0.18 255) 8%, transparent)"

  return (
    <div className="pointer-events-none">
      <div
        className="absolute"
        style={{
          left: displayRect.left,
          top: displayRect.top,
          width: displayRect.width,
          height: displayRect.height,
          backgroundColor: fillColor,
          transition: measurement.originRect
            ? `left ${transitionMs}ms ease, top ${transitionMs}ms ease, width ${transitionMs}ms ease, height ${transitionMs}ms ease`
            : undefined,
        }}
      >
        {edges.top ? (
          <div
            className="absolute left-0 top-0 h-px w-full"
            style={{ backgroundColor: outlineColor }}
          />
        ) : null}
        {edges.right ? (
          <div
            className="absolute right-0 top-0 h-full w-px"
            style={{ backgroundColor: outlineColor }}
          />
        ) : null}
        {edges.bottom ? (
          <div
            className="absolute bottom-0 left-0 h-px w-full"
            style={{ backgroundColor: outlineColor }}
          />
        ) : null}
        {edges.left ? (
          <div
            className="absolute left-0 top-0 h-full w-px"
            style={{ backgroundColor: outlineColor }}
          />
        ) : null}
      </div>
      <MeasureTag
        className="-translate-x-1/2 bg-[#0f172af2]"
        style={{
          left: displayRect.left + displayRect.width / 2,
          top: displayRect.top + displayRect.height + labelOffset,
          transition: measurement.originRect
            ? `left ${transitionMs}ms ease, top ${transitionMs}ms ease`
            : undefined,
        }}
      >
        {formatValue(displayRect.width)} x {formatValue(displayRect.height)}
      </MeasureTag>
    </div>
  )
})
