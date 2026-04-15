import React from "react";
import ReactDOM from "react-dom/client";
import { Measurer } from "mesurer";
import {
  MEASURER_STORAGE_KEYS,
  getExtensionEnabled,
  subscribeToExtensionEnabled,
} from "./extension-state";

const ROOT_ID = "mesurer-extension-root";
const EXTENSION_ENABLED_KEY = "mesurer:extension-enabled";

type StorageChange = { oldValue?: unknown; newValue?: unknown };
type ChromeStorageApi = {
  local?: {
    get: (keys: string[] | string) => Promise<Record<string, unknown>>;
    set: (items: Record<string, unknown>) => Promise<void>;
  };
  onChanged?: {
    addListener: (
      listener: (
        changes: Record<string, StorageChange>,
        areaName: string,
      ) => void,
    ) => void;
    removeListener: (
      listener: (
        changes: Record<string, StorageChange>,
        areaName: string,
      ) => void,
    ) => void;
  };
};

const chromeStorage = (
  globalThis as typeof globalThis & {
    chrome?: {
      storage?: ChromeStorageApi;
    };
  }
).chrome?.storage;

let root: ReactDOM.Root | null = null;
let initialized = false;

function mountMeasurer() {
  if (document.getElementById(ROOT_ID)) return;

  const host = document.body ?? document.documentElement;
  if (!host) return;

  const rootElement = document.createElement("div");
  rootElement.id = ROOT_ID;
  rootElement.style.cssText = [
    "all: initial",
    "position: fixed",
    "inset: 0",
    "width: 100vw",
    "height: 100vh",
    "pointer-events: none",
    "background: transparent",
    "border: 0",
    "margin: 0",
    "padding: 0",
    "z-index: 2147483647",
    "contain: layout style size",
  ].join("; ");

  const shadowRoot = rootElement.attachShadow({ mode: "open" });
  const mountPoint = document.createElement("div");
  mountPoint.id = `${ROOT_ID}-mount`;
  shadowRoot.appendChild(mountPoint);
  host.appendChild(rootElement);

  root = ReactDOM.createRoot(mountPoint);
  root.render(
    <React.StrictMode>
      <Measurer
        persistOnReload
        portalContainer={shadowRoot}
        styleTarget={shadowRoot}
      />
    </React.StrictMode>,
  );
}

function unmountMeasurer() {
  root?.unmount();
  root = null;
  document.getElementById(ROOT_ID)?.remove();
}

async function isExtensionEnabled() {
  try {
    const stored = await chromeStorage?.local?.get(EXTENSION_ENABLED_KEY);
    const value = stored?.[EXTENSION_ENABLED_KEY];
    return typeof value === "boolean" ? value : true;
  } catch {
    return true;
  }
}

async function syncMountedState() {
  const enabled = await isExtensionEnabled();
  if (enabled) {
    mountMeasurer();
    return;
  }
  unmountMeasurer();
}

function setupStorageListener() {
  const handleChange = (
    changes: Record<string, StorageChange>,
    areaName: string,
  ) => {
    if (areaName !== "local") return;
    if (!(EXTENSION_ENABLED_KEY in changes)) return;
    void syncMountedState();
  };

  chromeStorage?.onChanged?.addListener(handleChange);
}

function afterHydrationWindow(callback: () => void) {
  const run = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(callback);
    });
  };

  if (document.readyState === "complete") {
    run();
    return;
  }

  window.addEventListener("load", run, { once: true });
}

function init() {
  if (initialized) return;
  initialized = true;
  setupStorageListener();
  afterHydrationWindow(() => {
    void syncMountedState();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}

void syncExtensionState();
const unsubscribe = subscribeToExtensionEnabled((enabled) => {
  if (!enabled) {
    unmountMeasurer();
    return;
  }

  void syncExtensionState();
});

window.addEventListener(
  "pagehide",
  () => {
    unsubscribe();
  },
  { once: true },
);
