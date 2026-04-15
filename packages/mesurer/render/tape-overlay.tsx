import { MEASURE_LABEL_OFFSET } from "../constants"
import type { TapeMeasurement } from "../types"
import { formatRemValue, formatValue } from "../utils"
import { MeasureTag } from "../components/measure-tag"

type TapeOverlayProps = {
  measurement: TapeMeasurement
}

export function TapeOverlay({ measurement }: TapeOverlayProps) {
  const angle = (Math.atan2(measurement.deltaY, measurement.deltaX) * 180) / Math.PI
  const midX = (measurement.start.x + measurement.end.x) / 2
  const midY = (measurement.start.y + measurement.end.y) / 2

  return (
    <>
      <div
        className="pointer-events-none absolute h-0.5 bg-[#0d99ff]"
        style={{
          left: measurement.start.x,
          top: measurement.start.y,
          width: measurement.length,
          transform: `translateY(-50%) rotate(${angle}deg)`,
          transformOrigin: "0 50%",
        }}
      />
      <div
        className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-[#0d99ff]"
        style={{
          left: measurement.start.x,
          top: measurement.start.y,
        }}
      />
      <div
        className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-[#0d99ff]"
        style={{
          left: measurement.end.x,
          top: measurement.end.y,
        }}
      />
      <MeasureTag
        className="-translate-x-1/2 -translate-y-full bg-ink-900/90"
        style={{
          left: midX,
          top: midY - MEASURE_LABEL_OFFSET - 6,
        }}
      >
        {formatValue(measurement.length)}px / {formatRemValue(measurement.length)}
      </MeasureTag>
    </>
  )
}
