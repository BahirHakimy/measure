"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ToolMode } from "../types";
import { cn } from "../utils";
import {
  CaretDownIcon,
  CheckIcon,
  CursorIcon,
  MinusIcon,
  RulerIcon,
} from "./icons";

type Point = {
  x: number;
  y: number;
};

type ToolbarProps = {
  toolMode: ToolMode;
  visible: boolean;
  persistKey?: string | null;
  setEnabled: Dispatch<SetStateAction<boolean>>;
  setToolMode: Dispatch<SetStateAction<ToolMode>>;
  guideOrientation: "vertical" | "horizontal";
  setGuideOrientation: Dispatch<SetStateAction<"vertical" | "horizontal">>;
  onInteract: () => void;
  onHide: () => void;
  onShow: () => void;
};

const TOOLBAR_TOOLTIP_DELAY_MS = 800;
const TOOLBAR_DRAG_SLOP = 6;
const DEFAULT_TOOLBAR_POSITION: Point = { x: 16, y: 16 };

type ToolbarButtonProps = {
  id: string;
  active: boolean;
  label: string;
  shortcut?: string;
  onClick: () => void;
  tooltipVisible: boolean;
  tooltipSide: "top" | "bottom";
  onTooltipEnter: (id: string) => void;
  onTooltipLeave: (id: string) => void;
  children: ReactNode;
};

function ToolbarButton({
  id,
  active,
  label,
  shortcut,
  onClick,
  tooltipVisible,
  tooltipSide,
  onTooltipEnter,
  onTooltipLeave,
  children,
}: ToolbarButtonProps) {
  return (
    <div
      className="relative"
      onMouseEnter={() => onTooltipEnter(id)}
      onMouseLeave={() => onTooltipLeave(id)}
    >
      <button
        type="button"
        aria-label={shortcut ? `${label} (${shortcut})` : label}
        title={shortcut ? `${label} (${shortcut})` : label}
        className={cn(
          "flex size-8 items-center justify-center rounded-[8px] outline-none",
          active
            ? "bg-[#0d99ff] text-white"
            : "bg-transparent text-black hover:bg-black/4",
        )}
        onClick={onClick}
      >
        {children}
      </button>
      <span
        className={cn(
          "pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-[11px] text-white transition-opacity duration-150 select-none",
          tooltipSide === "top" ? "bottom-full mb-2" : "top-full mt-2",
          tooltipVisible ? "opacity-100" : "opacity-0",
        )}
      >
        {label}
        {shortcut ? <kbd className="text-white/60"> {shortcut}</kbd> : null}
      </span>
    </div>
  );
}

function useToolbarTooltip() {
  const [visibleTooltipId, setVisibleTooltipId] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const instantRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const onTooltipEnter = useCallback(
    (id: string) => {
      clearTimer();
      if (instantRef.current) {
        setVisibleTooltipId(id);
        return;
      }

      timerRef.current = window.setTimeout(() => {
        setVisibleTooltipId(id);
        instantRef.current = true;
        timerRef.current = null;
      }, TOOLBAR_TOOLTIP_DELAY_MS);
    },
    [clearTimer],
  );

  const onTooltipLeave = useCallback(
    (id: string) => {
      clearTimer();
      setVisibleTooltipId((prev) => (prev === id ? null : prev));
    },
    [clearTimer],
  );

  const onToolbarLeave = useCallback(() => {
    clearTimer();
    setVisibleTooltipId(null);
    instantRef.current = false;
  }, [clearTimer]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return { visibleTooltipId, onTooltipEnter, onTooltipLeave, onToolbarLeave };
}

function readStoredPosition(
  initialPosition: Point,
  persistKey?: string | null,
): Point {
  if (!persistKey || typeof window === "undefined") return initialPosition;

  try {
    const stored = window.localStorage.getItem(persistKey);
    if (!stored) return initialPosition;

    const parsed = JSON.parse(stored) as { x?: number; y?: number };
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") {
      return initialPosition;
    }

    return { x: parsed.x, y: parsed.y };
  } catch {
    return initialPosition;
  }
}

function useToolbarDrag(initialPosition: Point, persistKey?: string | null) {
  const [position, setPosition] = useState(() =>
    readStoredPosition(initialPosition, persistKey),
  );
  const suppressClickRef = useRef(false);
  const detachListenersRef = useRef<(() => void) | null>(null);
  const dragRef = useRef({
    active: false,
    didDrag: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    width: 0,
    height: 0,
  });

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;

      if (detachListenersRef.current) {
        detachListenersRef.current();
        detachListenersRef.current = null;
      }

      const state = dragRef.current;
      state.active = false;
      state.didDrag = false;
      state.pointerId = event.pointerId;
      state.startX = event.clientX;
      state.startY = event.clientY;
      state.originX = position.x;
      state.originY = position.y;
      const rect = event.currentTarget.getBoundingClientRect();
      state.width = rect.width;
      state.height = rect.height;

      const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
        const current = dragRef.current;
        if (current.pointerId !== moveEvent.pointerId) return;

        const dx = moveEvent.clientX - current.startX;
        const dy = moveEvent.clientY - current.startY;

        if (!current.active) {
          current.active =
            Math.abs(dx) > TOOLBAR_DRAG_SLOP ||
            Math.abs(dy) > TOOLBAR_DRAG_SLOP;
        }

        if (!current.active) return;

        current.didDrag = true;
        const maxX = Math.max(8, window.innerWidth - current.width - 8);
        const maxY = Math.max(8, window.innerHeight - current.height - 8);
        setPosition({
          x: Math.min(maxX, Math.max(8, current.originX + dx)),
          y: Math.min(maxY, Math.max(8, current.originY + dy)),
        });
      };

      const handlePointerEnd = (endEvent: globalThis.PointerEvent) => {
        const current = dragRef.current;
        if (
          current.pointerId !== endEvent.pointerId &&
          current.pointerId !== -1
        )
          return;
        suppressClickRef.current = current.didDrag;
        current.active = false;
        current.didDrag = false;
        current.pointerId = -1;

        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerEnd);
        window.removeEventListener("pointercancel", handlePointerEnd);
        detachListenersRef.current = null;
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerEnd);
      window.addEventListener("pointercancel", handlePointerEnd);
      detachListenersRef.current = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerEnd);
        window.removeEventListener("pointercancel", handlePointerEnd);
      };
    },
    [position.x, position.y],
  );

  const onClickCapture = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!suppressClickRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClickRef.current = false;
    },
    [],
  );

  const resetPosition = useCallback(() => {
    setPosition(initialPosition);
  }, [initialPosition]);

  useEffect(() => {
    if (!persistKey || typeof window === "undefined") return;

    try {
      window.localStorage.setItem(persistKey, JSON.stringify(position));
    } catch {
      // ignore storage errors
    }
  }, [persistKey, position]);

  return { position, onPointerDown, onClickCapture, resetPosition };
}

function ToolbarComponent(
  {
    toolMode,
    visible,
    persistKey,
    setEnabled,
    setToolMode,
    guideOrientation,
    setGuideOrientation,
    onInteract,
    onHide,
    onShow,
  }: ToolbarProps,
  ref: React.Ref<HTMLDivElement>,
) {
  const { position, onPointerDown, onClickCapture, resetPosition } =
    useToolbarDrag(DEFAULT_TOOLBAR_POSITION, persistKey);
  const { visibleTooltipId, onTooltipEnter, onTooltipLeave, onToolbarLeave } =
    useToolbarTooltip();
  const [guideMenuOpen, setGuideMenuOpen] = useState(false);
  const guideMenuRef = useRef<HTMLDivElement | null>(null);
  const guideMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const [activeMenuIndex, setActiveMenuIndex] = useState(0);
  const [menuAlign, setMenuAlign] = useState<"left" | "right">("right");

  const viewportHeight =
    typeof window === "undefined" ? 0 : window.innerHeight || 0;
  const nearTop = position.y < 56;
  const nearBottom = viewportHeight > 0 && position.y > viewportHeight - 56;
  const tooltipSide: "top" | "bottom" =
    nearTop && !nearBottom ? "bottom" : "top";
  const menuSide: "top" | "bottom" = nearBottom ? "top" : "bottom";

  const selectMode = useCallback(() => {
    setEnabled(true);
    setToolMode((prev) => (prev === "select" ? "none" : "select"));
    onInteract();
  }, [onInteract, setEnabled, setToolMode]);

  const guidesMode = useCallback(() => {
    setEnabled(true);
    setToolMode((prev) => (prev === "guides" ? "none" : "guides"));
    onInteract();
  }, [onInteract, setEnabled, setToolMode]);

  const selectGuideOrientation = useCallback(
    (orientation: "vertical" | "horizontal") => {
      setEnabled(true);
      setToolMode("guides");
      setGuideOrientation(orientation);
      onInteract();
      setGuideMenuOpen(false);
    },
    [onInteract, setEnabled, setGuideOrientation, setToolMode],
  );

  useLayoutEffect(() => {
    if (!guideMenuOpen) return;

    const frame = requestAnimationFrame(() => {
      guideMenuRef.current
        ?.querySelector<HTMLElement>("[role='menu']")
        ?.focus();
      const panel = guideMenuPanelRef.current;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      if (rect.left < 8) {
        setMenuAlign("left");
        return;
      }
      if (rect.right > window.innerWidth - 8) {
        setMenuAlign("right");
      }
    });

    const handlePointerDown = (event: PointerEvent) => {
      if (!guideMenuRef.current) return;
      if (guideMenuRef.current.contains(event.target as Node)) return;
      setGuideMenuOpen(false);
    };

    const handleResize = () => {
      const panel = guideMenuPanelRef.current;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      if (rect.left < 8) {
        setMenuAlign("left");
        return;
      }
      if (rect.right > window.innerWidth - 8) {
        setMenuAlign("right");
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [guideMenuOpen, guideOrientation]);

  if (!visible) {
    return (
      <div
        ref={ref}
        className="pointer-events-auto absolute z-[90]"
        style={{ left: position.x, top: position.y }}
        onPointerDown={onPointerDown}
        onClickCapture={onClickCapture}
        onMouseLeave={onToolbarLeave}
        onDoubleClick={resetPosition}
      >
        <ToolbarButton
          id="show-toolbar"
          active={false}
          label="Show controls"
          onClick={onShow}
          tooltipVisible={visibleTooltipId === "show-toolbar"}
          tooltipSide={tooltipSide}
          onTooltipEnter={onTooltipEnter}
          onTooltipLeave={onTooltipLeave}
        >
          <RulerIcon size={18} className="text-[#0d99ff]" />
        </ToolbarButton>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="pointer-events-auto absolute z-[90] flex items-center gap-1 rounded-[12px] bg-[#fff] p-1 outline outline-transparent shadow-[0px_0px_.5px_rgba(0,0,0,.18),0px_3px_8px_rgba(0,0,0,.1),0px_1px_3px_rgba(0,0,0,.1)]"
      style={{ left: position.x, top: position.y }}
      onPointerDown={(event) => {
        onInteract();
        onPointerDown(event);
      }}
      onClickCapture={onClickCapture}
      onMouseLeave={onToolbarLeave}
      onDoubleClick={() => {
        onInteract();
        setGuideMenuOpen(false);
        resetPosition();
      }}
    >
      <div className="flex size-8 items-center justify-center rounded-[8px] bg-black/4">
        <RulerIcon size={18} className="text-[#0d99ff]" />
      </div>
      <ToolbarButton
        id="select"
        active={toolMode === "select"}
        label="Select"
        shortcut="S"
        onClick={selectMode}
        tooltipVisible={visibleTooltipId === "select"}
        tooltipSide={tooltipSide}
        onTooltipEnter={onTooltipEnter}
        onTooltipLeave={onTooltipLeave}
      >
        <CursorIcon size={20} />
      </ToolbarButton>
      <ToolbarButton
        id="guides"
        active={toolMode === "guides"}
        label="Guides"
        shortcut="G"
        onClick={guidesMode}
        tooltipVisible={visibleTooltipId === "guides"}
        tooltipSide={tooltipSide}
        onTooltipEnter={onTooltipEnter}
        onTooltipLeave={onTooltipLeave}
      >
        <RulerIcon
          size={20}
          className={cn(
            guideOrientation === "vertical"
              ? "rotate-[135deg]"
              : "rotate-[45deg]",
          )}
        />
      </ToolbarButton>
      <div
        className="group relative -ml-1 flex items-stretch"
        ref={guideMenuRef}
        onMouseEnter={() => onTooltipEnter("guide-menu")}
        onMouseLeave={() => onTooltipLeave("guide-menu")}
      >
        <button
          type="button"
          aria-label="Guide orientation menu"
          title="Guide orientation"
          className={cn(
            "flex h-8 w-4 items-center justify-center rounded-[6px] outline-none hover:bg-black/10",
            guideMenuOpen ? "bg-black/10 text-black" : "text-black",
          )}
          onClick={() => {
            onInteract();
            setGuideMenuOpen((prev) => {
              if (!prev) {
                setActiveMenuIndex(guideOrientation === "horizontal" ? 0 : 1);
              }
              return !prev;
            });
          }}
        >
          <CaretDownIcon size={8} />
        </button>
        <span
          className={cn(
            "pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-[11px] text-white transition-opacity duration-150 select-none",
            tooltipSide === "top" ? "bottom-full mb-2" : "top-full mt-2",
            visibleTooltipId === "guide-menu" && !guideMenuOpen
              ? "opacity-100"
              : "opacity-0",
          )}
        >
          Orientation Guide
        </span>
        {guideMenuOpen ? (
          <div
            className={cn(
              "absolute z-[70] w-44 rounded-lg border border-ink-200 bg-white p-1 shadow-[0px_10px_30px_rgba(0,0,0,0.08)] outline-none focus:outline-none",
              "flex flex-col gap-px",
              menuSide === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
              menuAlign === "left" ? "left-0" : "right-0",
            )}
            ref={guideMenuPanelRef}
            role="menu"
            tabIndex={0}
            onKeyDown={(event) => {
              const key = event.key.toLowerCase();
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveMenuIndex((prev) => (prev + 1) % 2);
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveMenuIndex((prev) => (prev + 1) % 2);
              }
              if (event.key === "Enter") {
                event.preventDefault();
                selectGuideOrientation(
                  activeMenuIndex === 0 ? "horizontal" : "vertical",
                );
              }
              if (key === "h") {
                event.preventDefault();
                selectGuideOrientation("horizontal");
              }
              if (key === "v") {
                event.preventDefault();
                selectGuideOrientation("vertical");
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setGuideMenuOpen(false);
              }
            }}
          >
            <button
              type="button"
              className={cn(
                "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px]",
                activeMenuIndex === 0 || guideOrientation === "horizontal"
                  ? "bg-[#0d99ff] text-white"
                  : "text-ink-700 hover:bg-[#0d99ff] hover:text-white",
              )}
              onClick={() => selectGuideOrientation("horizontal")}
            >
              <CheckIcon
                size={12}
                className={cn(
                  guideOrientation === "horizontal"
                    ? "opacity-100"
                    : "opacity-0",
                )}
              />
              <MinusIcon size={12} />
              <span className="flex-1">Horizontal</span>
              <span>H</span>
            </button>
            <button
              type="button"
              className={cn(
                "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px]",
                activeMenuIndex === 1 || guideOrientation === "vertical"
                  ? "bg-[#0d99ff] text-white"
                  : "text-ink-700 hover:bg-[#0d99ff] hover:text-white",
              )}
              onClick={() => selectGuideOrientation("vertical")}
            >
              <CheckIcon
                size={12}
                className={cn(
                  guideOrientation === "vertical" ? "opacity-100" : "opacity-0",
                )}
              />
              <MinusIcon size={12} className="rotate-90" />
              <span className="flex-1">Vertical</span>
              <span>V</span>
            </button>
          </div>
        ) : null}
      </div>
      <ToolbarButton
        id="hide-toolbar"
        active={false}
        label="Hide controls"
        onClick={() => {
          setGuideMenuOpen(false);
          onHide();
        }}
        tooltipVisible={visibleTooltipId === "hide-toolbar"}
        tooltipSide={tooltipSide}
        onTooltipEnter={onTooltipEnter}
        onTooltipLeave={onTooltipLeave}
      >
        <MinusIcon size={12} />
      </ToolbarButton>
    </div>
  );
}

export const Toolbar = memo(forwardRef(ToolbarComponent));
