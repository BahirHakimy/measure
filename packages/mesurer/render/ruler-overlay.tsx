import { MeasureTag } from "../components/measure-tag"
import type { Point } from "../types"
import { formatValue } from "../utils"

const RULER_SIZE = 24
const TICK_SPACING = 8
const MAJOR_TICK_EVERY = 10

type RulerOverlayProps = {
  cursor: Point | null
}

export function RulerOverlay({ cursor }: RulerOverlayProps) {
  const viewportWidth = typeof window === "undefined" ? 0 : window.innerWidth
  const viewportHeight = typeof window === "undefined" ? 0 : window.innerHeight
  const horizontalTicks = Array.from(
    { length: Math.ceil(Math.max(0, viewportWidth - RULER_SIZE) / TICK_SPACING) + 1 },
    (_, index) => index
  )
  const verticalTicks = Array.from(
    { length: Math.ceil(Math.max(0, viewportHeight - RULER_SIZE) / TICK_SPACING) + 1 },
    (_, index) => index
  )

  return (
    <>
      <div
        className="pointer-events-none absolute left-0 top-0 border-b border-r"
        style={{
          width: RULER_SIZE,
          height: RULER_SIZE,
          borderColor: "#cbd5e1",
          backgroundColor: "#ffffff",
        }}
      />

      <div
        className="pointer-events-none absolute left-0 top-0 border-b"
        style={{
          left: RULER_SIZE,
          right: 0,
          height: RULER_SIZE,
          borderColor: "#cbd5e1",
          backgroundColor: "#ffffff",
        }}
      >
        {horizontalTicks.map((tick) => {
          const x = tick * TICK_SPACING
          const major = tick % MAJOR_TICK_EVERY === 0
          return (
            <div key={`x-${tick}`}>
              <div
                className="absolute top-full -translate-y-full"
                style={{
                  left: x,
                  width: 1,
                  height: major ? 12 : 6,
                  backgroundColor: major ? "#475569" : "#94a3b8",
                }}
              />
              {major ? (
                <div
                  className="absolute top-1 text-[10px] font-medium"
                  style={{ left: x + 2, color: "#334155" }}
                >
                  {x}
                </div>
              ) : null}
            </div>
          )
        })}
        {cursor ? (
          <div
            className="absolute bottom-0 w-px bg-[#0d99ff]"
            style={{ left: Math.max(0, cursor.x - RULER_SIZE), height: RULER_SIZE }}
          />
        ) : null}
      </div>

      <div
        className="pointer-events-none absolute left-0 top-0 border-r"
        style={{
          top: RULER_SIZE,
          bottom: 0,
          width: RULER_SIZE,
          borderColor: "#cbd5e1",
          backgroundColor: "#ffffff",
        }}
      >
        {verticalTicks.map((tick) => {
          const y = tick * TICK_SPACING
          const major = tick % MAJOR_TICK_EVERY === 0
          return (
            <div key={`y-${tick}`}>
              <div
                className="absolute left-full -translate-x-full"
                style={{
                  top: y,
                  width: major ? 12 : 6,
                  height: 1,
                  backgroundColor: major ? "#475569" : "#94a3b8",
                }}
              />
            </div>
          )
        })}
        {cursor ? (
          <div
            className="absolute right-0 h-px bg-[#0d99ff]"
            style={{ top: Math.max(0, cursor.y - RULER_SIZE), width: RULER_SIZE }}
          />
        ) : null}
      </div>

      {cursor ? (
        <>
          <div
            className="pointer-events-none absolute bg-[#0d99ff]/70"
            style={{
              left: cursor.x,
              top: RULER_SIZE,
              width: 1,
              height: Math.max(0, viewportHeight - RULER_SIZE),
            }}
          />
          <div
            className="pointer-events-none absolute bg-[#0d99ff]/70"
            style={{
              left: RULER_SIZE,
              top: cursor.y,
              width: Math.max(0, viewportWidth - RULER_SIZE),
              height: 1,
            }}
          />
          <MeasureTag
            className="-translate-x-1/2 bg-[#0f172af2]"
            style={{
              left: cursor.x,
              top: RULER_SIZE + 2,
            }}
          >
            {formatValue(cursor.x)}px
          </MeasureTag>
          <MeasureTag
            className="-translate-y-1/2 bg-[#0f172af2]"
            style={{
              left: RULER_SIZE + 2,
              top: cursor.y,
            }}
          >
            {formatValue(cursor.y)}px
          </MeasureTag>
        </>
      ) : null}
    </>
  )
}
