"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { MEASURE_TRANSITION_MS } from "./constants";
import { Toolbar } from "./components/toolbar";
import { useDragState } from "./hooks/use-drag-state";
import { useGuideDragHold } from "./hooks/use-guide-drag-hold";
import { useGuideState } from "./hooks/use-guide-state";
import { useHotkeys } from "./hooks/use-hotkeys";
import { useLiveElementTracking } from "./hooks/use-live-element-tracking";
import { useMeasureToggles } from "./hooks/use-measure-toggles";
import { useMeasurementState } from "./hooks/use-measurement-state";
import { useMeasurerDerived } from "./hooks/use-measurer-derived";
import { useMeasurerHistory } from "./hooks/use-measurer-history";
import { useMeasurerLocalState } from "./hooks/use-measurer-local-state";
import { useMeasurerPointer } from "./hooks/use-measurer-pointer";
import { useOverlayRefs } from "./hooks/use-overlay-refs";
import { useResizeSync } from "./hooks/use-resize-sync";
import { readPersistedValues, writePersistedValue } from "./persistence";
import { MeasurerOverlay } from "./render/measurer-overlay";
import { ensureMeasurerStyles } from "./style-inject";
import { MESURER_STYLES } from "./styles.generated";
import type {
  DistanceOverlay,
  Guide,
  Measurement,
  Rect,
  TapeMeasurement,
  ToolMode,
} from "./types";

type MeasurerProps = {
  highlightColor?: string;
  guideColor?: string;
  hoverHighlightEnabled?: boolean;
  persistOnReload?: boolean;
  portalContainer?: Element | DocumentFragment | null;
  styleTarget?: Document | ShadowRoot | null;
};

type PersistedMeasurerState = {
  version: number;
  enabled: boolean;
  toolMode: ToolMode;
  guideOrientation: "vertical" | "horizontal";
  guides: Guide[];
  selectedGuideIds: string[];
  measurements: Measurement[];
  activeMeasurement: Measurement | null;
  heldDistances: DistanceOverlay[];
};

type ToolbarPosition = {
  x: number;
  y: number;
};

type PersistedSnapshot = {
  state: PersistedMeasurerState | null;
  toolbarActive: boolean;
  toolbarPosition: ToolbarPosition | null;
};

type MeasurerRuntimeProps = {
  highlightColor: string;
  guideColor: string;
  hoverHighlightEnabled: boolean;
  persistOnReload: boolean;
  portalContainer: Element | DocumentFragment;
  styleTarget: Document | ShadowRoot;
};

type MeasurerInnerProps = MeasurerRuntimeProps & {
  initialSnapshot: PersistedSnapshot;
};

const PERSISTED_STATE_STORAGE_KEY = "mesurer-state";
const TOOLBAR_VISIBILITY_STORAGE_KEY = "mesurer-toolbar-visibility";
const TOOLBAR_POSITION_STORAGE_KEY = "mesurer-toolbar-position";
const DEFAULT_PERSISTED_SNAPSHOT: PersistedSnapshot = {
  state: null,
  toolbarActive: true,
  toolbarPosition: null,
};

function eventIncludesNode(event: Event, node: Node | null) {
  if (!node) return false;
  return event.composedPath().includes(node);
}

const subscribeHydration = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );

const stripMeasurement = (measurement: Measurement): Measurement => ({
  ...measurement,
  elementRef: undefined,
});

const stripDistance = (distance: DistanceOverlay): DistanceOverlay => ({
  ...distance,
  elementRefA: undefined,
  elementRefB: undefined,
});

function parsePersistedState(
  value: string | null,
): PersistedMeasurerState | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as PersistedMeasurerState;
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseToolbarVisibility(value: string | null) {
  if (!value) return true;

  try {
    const parsed = JSON.parse(value) as { visible?: boolean };
    return typeof parsed.visible === "boolean" ? parsed.visible : true;
  } catch {
    return true;
  }
}

function parseToolbarPosition(value: string | null): ToolbarPosition | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as { x?: number; y?: number };
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") {
      return null;
    }
    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
}

async function loadPersistedSnapshot(persistOnReload: boolean) {
  if (!persistOnReload) return DEFAULT_PERSISTED_SNAPSHOT;

  const stored = await readPersistedValues([
    PERSISTED_STATE_STORAGE_KEY,
    TOOLBAR_VISIBILITY_STORAGE_KEY,
    TOOLBAR_POSITION_STORAGE_KEY,
  ]);

  const state = parsePersistedState(stored[PERSISTED_STATE_STORAGE_KEY]);
  const toolbarActive =
    state?.toolMode && state.toolMode !== "none"
      ? true
      : parseToolbarVisibility(stored[TOOLBAR_VISIBILITY_STORAGE_KEY]);

  return {
    state,
    toolbarActive,
    toolbarPosition: parseToolbarPosition(stored[TOOLBAR_POSITION_STORAGE_KEY]),
  } satisfies PersistedSnapshot;
}

function MeasurerInner({
  highlightColor,
  guideColor,
  hoverHighlightEnabled,
  persistOnReload,
  portalContainer,
  initialSnapshot,
}: MeasurerInnerProps) {
  const selectionRectRef = useRef<Rect | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const selectionAnimationCleanupTimeoutRef = useRef<number | null>(null);
  const suppressToolbarAutoHideUntilRef = useRef(0);
  const persistedState = initialSnapshot.state;

  const { overlayRef, selectedElementRef, hoverElementRef } = useOverlayRefs();
  const {
    selectionOriginRect,
    setSelectionOriginRect,
    hoverPointer,
    setHoverPointer,
    hoverElement,
    setHoverElement,
    selectedElement,
    setSelectedElement,
    clearSelectionRect,
  } = useMeasurerLocalState({
    selectedElementRef,
    hoverElementRef,
    selectionRectRef,
  });

  const {
    enabled,
    setEnabled,
    holdEnabled,
    snapEnabled,
    altPressed,
    setAltPressed,
    toolMode,
    setToolMode,
    guidesEnabled,
    multiMeasureEnabled,
    snapGuidesEnabled,
  } = useMeasureToggles({
    initialEnabled: persistedState?.enabled,
    initialToolMode: persistedState?.toolMode,
  });
  const { start, setStart, end, setEnd, isDragging, setIsDragging } =
    useDragState();
  const {
    activeMeasurement,
    setActiveMeasurement,
    measurements,
    setMeasurements,
    selectedMeasurement,
    setSelectedMeasurement,
    selectedMeasurements,
    setSelectedMeasurements,
    hoverRect,
    setHoverRect,
    heldDistances,
    setHeldDistances,
  } = useMeasurementState({
    initialActiveMeasurement: persistedState?.activeMeasurement ?? null,
    initialMeasurements: persistedState?.measurements ?? [],
    initialHeldDistances: persistedState?.heldDistances ?? [],
  });
  const {
    guides,
    setGuides,
    draggingGuideId,
    setDraggingGuideId,
    selectedGuideIds,
    setSelectedGuideIds,
  } = useGuideState({
    initialGuides: persistedState?.guides ?? [],
    initialSelectedGuideIds: persistedState?.selectedGuideIds ?? [],
  });
  const [toolbarActive, setToolbarActive] = useState(initialSnapshot.toolbarActive);
  const { clearGuideDragHold, scheduleGuideDragHold } = useGuideDragHold();
  const [guidePreview, setGuidePreview] = useState<{
    orientation: "vertical" | "horizontal";
    position: number;
  } | null>(null);
  const [guideOrientation, setGuideOrientation] = useState<
    "vertical" | "horizontal"
  >(persistedState?.guideOrientation ?? "vertical");
  const [tapeMeasurement, setTapeMeasurement] = useState<TapeMeasurement | null>(
    null,
  );
  const [rulerCursor, setRulerCursor] = useState<{ x: number; y: number } | null>(
    null,
  );

  const persistPayload = useMemo(() => {
    if (!persistOnReload) return null;
    return JSON.stringify({
      version: 1,
      enabled,
      toolMode,
      guideOrientation,
      guides,
      selectedGuideIds,
      measurements: measurements.map(stripMeasurement),
      activeMeasurement: activeMeasurement
        ? stripMeasurement(activeMeasurement)
        : null,
      heldDistances: heldDistances.map(stripDistance),
    });
  }, [
    activeMeasurement,
    enabled,
    guideOrientation,
    guides,
    heldDistances,
    measurements,
    persistOnReload,
    selectedGuideIds,
    toolMode,
  ]);

  useEffect(() => {
    if (!persistOnReload) return;
    if (!persistPayload) return;
    void writePersistedValue(PERSISTED_STATE_STORAGE_KEY, persistPayload);

    const handlePageHide = () => {
      void writePersistedValue(PERSISTED_STATE_STORAGE_KEY, persistPayload);
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [persistOnReload, persistPayload]);

  useEffect(() => {
    if (!persistOnReload) return;
    void writePersistedValue(
      TOOLBAR_VISIBILITY_STORAGE_KEY,
      JSON.stringify({ visible: toolbarActive }),
    );
  }, [persistOnReload, toolbarActive]);

  const {
    recordSnapshot,
    createActionCommit,
    setToolModeWithHistory,
    setGuideOrientationWithHistory,
    setEnabledWithHistory,
  } = useMeasurerHistory({
    toggles: {
      enabled,
      setEnabled,
      toolMode,
      setToolMode,
      guideOrientation,
      setGuideOrientation,
    },
    measurements: {
      measurements,
      setMeasurements,
      activeMeasurement,
      setActiveMeasurement,
      selectedMeasurements,
      setSelectedMeasurements,
      selectedMeasurement,
      setSelectedMeasurement,
      heldDistances,
      setHeldDistances,
    },
    guides: {
      guides,
      setGuides,
      selectedGuideIds,
      setSelectedGuideIds,
      draggingGuideId,
      setDraggingGuideId,
    },
    transient: {
      setStart,
      setEnd,
      setIsDragging,
      setGuidePreview,
      setHoverRect,
      setHoverElement,
      setSelectedElement,
      clearSelectionRect,
    },
  });

  const clearAll = useCallback(() => {
    recordSnapshot();
    clearGuideDragHold();
    setStart(null);
    setEnd(null);
    setIsDragging(false);
    setActiveMeasurement(null);
    setMeasurements([]);
    setSelectedMeasurement(null);
    setSelectedMeasurements([]);
    clearSelectionRect();
    setSelectedElement(null);
    setHoverRect(null);
    setHoverElement(null);
    setGuides([]);
    setSelectedGuideIds([]);
    setHeldDistances([]);
    setTapeMeasurement(null);
    setRulerCursor(null);
  }, [
    clearGuideDragHold,
    clearSelectionRect,
    recordSnapshot,
    setActiveMeasurement,
    setEnd,
    setGuides,
    setHeldDistances,
    setHoverElement,
    setHoverRect,
    setIsDragging,
    setMeasurements,
    setSelectedElement,
    setSelectedGuideIds,
    setSelectedMeasurement,
    setSelectedMeasurements,
    setStart,
    setTapeMeasurement,
    setRulerCursor,
  ]);

  const removeSelectedGuides = useCallback(() => {
    if (selectedGuideIds.length === 0) return false;
    recordSnapshot();
    setGuides((prev) =>
      prev.filter((guide) => !selectedGuideIds.includes(guide.id)),
    );
    setSelectedGuideIds([]);
    return true;
  }, [recordSnapshot, selectedGuideIds, setGuides, setSelectedGuideIds]);

  const activateToolbar = useCallback(() => {
    setToolbarActive(true);
  }, []);

  const showToolbar = useCallback(() => {
    suppressToolbarAutoHideUntilRef.current = performance.now() + 300;
    setToolbarActive(true);
  }, []);

  useHotkeys({
    clearAll,
    removeSelectedGuides,
    setEnabled: setEnabledWithHistory,
    setToolMode: setToolModeWithHistory,
    setAltPressed,
    isOverlayActive: () => enabled && (toolMode !== "none" || toolbarActive),
    setGuideOrientation: setGuideOrientationWithHistory,
    onInteract: activateToolbar,
  });

  useResizeSync({
    setMeasurements,
    setActiveMeasurement,
    setHeldDistances,
    setSelectedMeasurement,
    setGuides,
    selectedElementRef,
  });

  useLiveElementTracking({
    enabled,
    selectedElementRef,
    hoverElementRef,
    setSelectedMeasurement,
    setSelectedMeasurements,
    setHoverRect,
    setMeasurements,
    setActiveMeasurement,
    setHeldDistances,
  });

  useEffect(() => {
    if (!toolbarActive || toolMode !== "none") return;

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      if (performance.now() < suppressToolbarAutoHideUntilRef.current) return;
      if (eventIncludesNode(event, toolbarRef.current)) return;
      setToolbarActive(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [toolbarActive, toolMode]);

  useEffect(() => {
    if (hoverHighlightEnabled) return;
    setHoverRect(null);
  }, [hoverHighlightEnabled, setHoverRect]);

  useEffect(() => {
    const hasSelectionAnimationState =
      !!selectionOriginRect ||
      !!selectedMeasurement?.originRect ||
      selectedMeasurements.some((measurement) => !!measurement.originRect);

    if (!hasSelectionAnimationState) {
      if (selectionAnimationCleanupTimeoutRef.current !== null) {
        window.clearTimeout(selectionAnimationCleanupTimeoutRef.current);
        selectionAnimationCleanupTimeoutRef.current = null;
      }
      return;
    }

    if (selectionAnimationCleanupTimeoutRef.current !== null) return;

    selectionAnimationCleanupTimeoutRef.current = window.setTimeout(() => {
      selectionAnimationCleanupTimeoutRef.current = null;

      setSelectionOriginRect((prev) => (prev ? null : prev));

      setSelectedMeasurement((prev) => {
        if (!prev?.originRect) return prev;
        const { originRect: _originRect, ...next } = prev;
        return next;
      });

      setSelectedMeasurements((prev) => {
        let changed = false;
        const next = prev.map((measurement) => {
          if (!measurement.originRect) return measurement;
          changed = true;
          const { originRect: _originRect, ...rest } = measurement;
          return rest;
        });
        return changed ? next : prev;
      });
    }, MEASURE_TRANSITION_MS);
  }, [
    selectionOriginRect,
    selectedMeasurement,
    selectedMeasurements,
    setSelectedMeasurement,
    setSelectedMeasurements,
    setSelectionOriginRect,
  ]);

  useEffect(() => {
    return () => {
      if (selectionAnimationCleanupTimeoutRef.current !== null) {
        window.clearTimeout(selectionAnimationCleanupTimeoutRef.current);
      }
    };
  }, []);

  const displayedMeasurements = holdEnabled
    ? measurements
    : multiMeasureEnabled && measurements.length > 0
      ? measurements
      : activeMeasurement
        ? [activeMeasurement]
        : [];

  const {
    activeRect,
    activeWidth,
    activeHeight,
    displayedSelectedMeasurements,
    hoverGuide,
    optionPairOverlay,
    optionContainerLines,
    guideDistanceOverlay,
    outlineColor,
    fillColor,
    guideColorActive,
    guideColorHover,
    guideColorDefault,
    guideColorPreview,
    hoverRectToShow,
    selectedEdgeVisibility,
    hoverEdgeVisibility,
    measurementEdgeVisibility,
  } = useMeasurerDerived({
    start,
    end,
    selectedMeasurements,
    selectedMeasurement,
    selectionOriginRect,
    guides,
    selectedGuideIds,
    hoverPointer,
    hoverRect,
    hoverElement,
    selectedElement,
    altPressed,
    guidesEnabled,
    guidePreview,
    displayedMeasurements,
    hoverHighlightEnabled,
    highlightColor,
    guideColor,
  });

  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
  } = useMeasurerPointer({
    toolbarRef,
    overlayRef,
    selectionRectRef,
    createActionCommit,
    clearGuideDragHold,
    scheduleGuideDragHold,
    enabled,
    toolMode,
    guidesEnabled,
    snapEnabled,
    snapGuidesEnabled,
    altPressed,
    guideOrientation,
    hoverHighlightEnabled,
    start,
    end,
    isDragging,
    selectedMeasurements,
    selectedMeasurement,
    selectedGuideIds,
    guides,
    draggingGuideId,
    optionPairOverlay,
    setAltPressed,
    setGuidePreview,
    setSelectedGuideIds,
    setGuides,
    setStart,
    setEnd,
    setIsDragging,
    setHeldDistances,
    setDraggingGuideId,
    setActiveMeasurement,
    setMeasurements,
    setSelectedMeasurements,
    setSelectedMeasurement,
    setSelectionOriginRect,
    setSelectedElement,
    setHoverRect,
    setHoverElement,
    setHoverPointer,
    setRulerCursor,
    setTapeMeasurement,
    clearSelectionRect,
  });

  const removeHeldDistance = useCallback(
    (id: string) => {
      recordSnapshot();
      setHeldDistances((prev) => prev.filter((distance) => distance.id !== id));
    },
    [recordSnapshot, setHeldDistances],
  );

  const handleGuidePointerDown = useCallback(
    (guide: Guide, event: ReactPointerEvent<HTMLDivElement>) => {
      const commit = createActionCommit();
      if (!enabled) return;
      event.stopPropagation();
      if (event.shiftKey) {
        commit();
        setSelectedGuideIds((prev) =>
          prev.includes(guide.id)
            ? prev.filter((id) => id !== guide.id)
            : [...prev, guide.id],
        );
        return;
      }

      commit();
      setSelectedGuideIds([guide.id]);
      scheduleGuideDragHold(guide.id, setDraggingGuideId);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [
      createActionCommit,
      enabled,
      scheduleGuideDragHold,
      setDraggingGuideId,
      setSelectedGuideIds,
    ],
  );

  const handleGuidePointerUp = useCallback(
    (guide: Guide, event: ReactPointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      clearGuideDragHold();
      setDraggingGuideId((prev) => (prev === guide.id ? null : prev));
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [clearGuideDragHold, setDraggingGuideId],
  );

  return createPortal(
    <div ref={overlayRef} className="pointer-events-none fixed inset-0 z-50">
      <MeasurerOverlay
        enabled={enabled}
        toolMode={toolMode}
        guidesEnabled={guidesEnabled}
        altPressed={altPressed}
        isDragging={isDragging}
        displayedMeasurements={displayedMeasurements}
        measurementEdgeVisibility={measurementEdgeVisibility}
        activeRect={activeRect}
        activeWidth={activeWidth}
        activeHeight={activeHeight}
        fillColor={fillColor}
        outlineColor={outlineColor}
        hoverRectToShow={hoverRectToShow}
        hoverEdgeVisibility={hoverEdgeVisibility}
        guidePreview={guidePreview}
        guideColorPreview={guideColorPreview}
        displayedSelectedMeasurements={displayedSelectedMeasurements}
        selectedEdgeVisibility={selectedEdgeVisibility}
        heldDistances={heldDistances}
        optionPairOverlay={optionPairOverlay}
        guideDistanceOverlay={guideDistanceOverlay}
        optionContainerLines={optionContainerLines}
        rulerCursor={rulerCursor}
        tapeMeasurement={tapeMeasurement}
        guides={guides}
        hoverGuide={hoverGuide}
        draggingGuideId={draggingGuideId}
        selectedGuideIds={selectedGuideIds}
        guideColorActive={guideColorActive}
        guideColorHover={guideColorHover}
        guideColorDefault={guideColorDefault}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onRemoveHeldDistance={removeHeldDistance}
        onGuidePointerDown={handleGuidePointerDown}
        onGuidePointerUp={handleGuidePointerUp}
        onGuidePointerCancel={handleGuidePointerUp}
      />

      <Toolbar
        ref={toolbarRef}
        toolMode={toolMode}
        visible={toolbarActive}
        initialPosition={initialSnapshot.toolbarPosition}
        persistKey={persistOnReload ? TOOLBAR_POSITION_STORAGE_KEY : null}
        setEnabled={setEnabledWithHistory}
        setToolMode={setToolModeWithHistory}
        guideOrientation={guideOrientation}
        setGuideOrientation={setGuideOrientationWithHistory}
        onInteract={activateToolbar}
        onHide={() => setToolbarActive(false)}
        onShow={showToolbar}
      />
    </div>,
    portalContainer,
  );
}

function MeasurerClient({
  highlightColor,
  guideColor,
  hoverHighlightEnabled,
  persistOnReload,
  portalContainer,
  styleTarget,
}: MeasurerRuntimeProps) {
  const [initialSnapshot, setInitialSnapshot] = useState<PersistedSnapshot | null>(
    () => (persistOnReload ? null : DEFAULT_PERSISTED_SNAPSHOT),
  );

  useEffect(() => {
    let cancelled = false;

    if (!persistOnReload) {
      setInitialSnapshot(DEFAULT_PERSISTED_SNAPSHOT);
      return () => {
        cancelled = true;
      };
    }

    void loadPersistedSnapshot(persistOnReload).then((snapshot) => {
      if (cancelled) return;
      setInitialSnapshot(snapshot);
    });

    return () => {
      cancelled = true;
    };
  }, [persistOnReload]);

  if (!initialSnapshot) return null;

  return (
    <MeasurerInner
      highlightColor={highlightColor}
      guideColor={guideColor}
      hoverHighlightEnabled={hoverHighlightEnabled}
      persistOnReload={persistOnReload}
      portalContainer={portalContainer}
      styleTarget={styleTarget}
      initialSnapshot={initialSnapshot}
    />
  );
}

export default function Measurer({
  highlightColor = "oklch(0.62 0.18 255)",
  guideColor = "oklch(0.63 0.26 29.23)",
  hoverHighlightEnabled = true,
  persistOnReload = false,
  portalContainer = document.body,
  styleTarget = document,
}: MeasurerProps) {
  const hydrated = useHydrated();
  const resolvedStyleTarget = styleTarget ?? (typeof document !== "undefined" ? document : null);
  const resolvedPortalContainer =
    portalContainer ?? (typeof document !== "undefined" ? document.body : null);

  useEffect(() => {
    if (!resolvedStyleTarget) return;
    ensureMeasurerStyles(MESURER_STYLES, resolvedStyleTarget);
  }, [resolvedStyleTarget]);

  if (!hydrated || !resolvedPortalContainer) return null;
  return (
    <MeasurerClient
      highlightColor={highlightColor}
      guideColor={guideColor}
      hoverHighlightEnabled={hoverHighlightEnabled}
      persistOnReload={persistOnReload}
      portalContainer={resolvedPortalContainer}
      styleTarget={resolvedStyleTarget ?? document}
    />
  );
}
