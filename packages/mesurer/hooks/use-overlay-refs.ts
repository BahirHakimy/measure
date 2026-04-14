import { useRef } from "react"

export const useOverlayRefs = () => {
  const overlayRef = useRef<HTMLDivElement>(null)
  const selectedElementRef = useRef<HTMLElement | null>(null)
  const hoverElementRef = useRef<HTMLElement | null>(null)
  return { overlayRef, selectedElementRef, hoverElementRef }
}
