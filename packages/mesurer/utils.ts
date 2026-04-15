import type { Point, TapeMeasurement } from "./types"

export const formatValue = (value: number) => Math.round(value)

export const formatDecimal = (value: number, digits = 2) => {
  const factor = 10 ** digits
  const rounded = Math.round(value * factor) / factor
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(digits)
}

export const getRootFontSize = () => {
  if (typeof window === "undefined") return 16
  const parsed = Number.parseFloat(
    window.getComputedStyle(document.documentElement).fontSize
  )
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 16
}

export const formatRemValue = (value: number) =>
  `${formatDecimal(value / getRootFontSize())}rem`

export const createTapeMeasurement = (
  start: Point,
  end: Point
): TapeMeasurement => {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y

  return {
    start,
    end,
    deltaX,
    deltaY,
    length: Math.hypot(deltaX, deltaY),
  }
}

export const cn = (...inputs: Array<string | false | null | undefined>) =>
  inputs.filter(Boolean).join(" ")

export const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`
