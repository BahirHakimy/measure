import React from "react";
import ReactDOM from "react-dom/client";
import { Measurer } from "mesurer";
import {
  MEASURER_STORAGE_KEYS,
  getExtensionEnabled,
  subscribeToExtensionEnabled,
} from "./extension-state";

const ROOT_ID = "mesurer-extension-root";
const STYLE_ID = "mesurer-styles";

let root: ReactDOM.Root | null = null;
let domReadyListenerAttached = false;

function cleanupPageState() {
  try {
    for (const key of MEASURER_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore storage errors
  }
}

function unmountMeasurer() {
  root?.unmount();
  root = null;

  const rootElement = document.getElementById(ROOT_ID);
  rootElement?.remove();

  const styleElement = document.getElementById(STYLE_ID);
  styleElement?.remove();

  cleanupPageState();
}

function mountMeasurer() {
  if (document.getElementById(ROOT_ID)) return;

  const host = document.body ?? document.documentElement;
  if (!host) return;

  const rootElement = document.createElement("div");
  rootElement.id = ROOT_ID;
  host.appendChild(rootElement);

  root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <Measurer persistOnReload />
    </React.StrictMode>,
  );
}

async function syncExtensionState() {
  const enabled = await getExtensionEnabled();

  if (!enabled) {
    unmountMeasurer();
    return;
  }

  if (document.readyState === "loading") {
    if (domReadyListenerAttached) return;

    domReadyListenerAttached = true;
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        domReadyListenerAttached = false;
        void syncExtensionState();
      },
      { once: true },
    );
    return;
  }

  mountMeasurer();
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
