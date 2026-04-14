export const EXTENSION_ENABLED_STORAGE_KEY = "mesurer-extension-enabled";

export const MEASURER_STORAGE_KEYS = [
  "mesurer-state",
  "mesurer-toolbar-visibility",
  "mesurer-toolbar-position",
] as const;

type ChromeStorageArea = {
  get: (
    keys: string | string[] | Record<string, unknown> | null,
    callback?: (items: Record<string, unknown>) => void,
  ) => Promise<Record<string, unknown>> | void;
  set: (
    items: Record<string, unknown>,
    callback?: () => void,
  ) => Promise<void> | void;
};

type ChromeStorageChange = {
  newValue?: unknown;
  oldValue?: unknown;
};

type ChromeStorage = {
  local: ChromeStorageArea;
  onChanged: {
    addListener: (
      callback: (
        changes: Record<string, ChromeStorageChange>,
        areaName: string,
      ) => void,
    ) => void;
    removeListener: (
      callback: (
        changes: Record<string, ChromeStorageChange>,
        areaName: string,
      ) => void,
    ) => void;
  };
};

type ChromeLike = {
  storage?: ChromeStorage;
};

function getChromeStorage() {
  return (globalThis as typeof globalThis & { chrome?: ChromeLike }).chrome
    ?.storage;
}

export async function getExtensionEnabled() {
  const storage = getChromeStorage();
  if (!storage) return true;

  const result = await storage.local.get(EXTENSION_ENABLED_STORAGE_KEY);
  const value = result[EXTENSION_ENABLED_STORAGE_KEY];
  return typeof value === "boolean" ? value : true;
}

export async function setExtensionEnabled(enabled: boolean) {
  const storage = getChromeStorage();
  if (!storage) return;

  await storage.local.set({ [EXTENSION_ENABLED_STORAGE_KEY]: enabled });
}

export function subscribeToExtensionEnabled(
  callback: (enabled: boolean) => void,
) {
  const storage = getChromeStorage();
  if (!storage) return () => {};

  const listener = (
    changes: Record<string, ChromeStorageChange>,
    areaName: string,
  ) => {
    if (areaName !== "local") return;
    const change = changes[EXTENSION_ENABLED_STORAGE_KEY];
    if (!change) return;
    callback(change.newValue !== false);
  };

  storage.onChanged.addListener(listener);
  return () => {
    storage.onChanged.removeListener(listener);
  };
}
