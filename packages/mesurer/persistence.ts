"use client";

type ExtensionStorageArea = {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
};

const STORAGE_NAMESPACE = "mesurer";

function getExtensionStorage(): ExtensionStorageArea | null {
  const globalWithChrome = globalThis as typeof globalThis & {
    chrome?: {
      storage?: {
        local?: ExtensionStorageArea;
      };
    };
  };

  return globalWithChrome.chrome?.storage?.local ?? null;
}

function getScopePrefix() {
  if (typeof window === "undefined") return STORAGE_NAMESPACE;
  return `${STORAGE_NAMESPACE}:${window.location.origin}`;
}

function getScopedKey(key: string) {
  return `${getScopePrefix()}:${key}`;
}

export async function readPersistedValues(keys: string[]) {
  const extensionStorage = getExtensionStorage();
  if (extensionStorage) {
    try {
      const scopedKeys = keys.map(getScopedKey);
      const stored = await extensionStorage.get(scopedKeys);
      return Object.fromEntries(
        keys.map((key, index) => {
          const value = stored[scopedKeys[index]];
          return [key, typeof value === "string" ? value : null];
        }),
      ) as Record<string, string | null>;
    } catch {
      // fall back to localStorage
    }
  }

  if (typeof window === "undefined") {
    return Object.fromEntries(keys.map((key) => [key, null])) as Record<
      string,
      string | null
    >;
  }

  return Object.fromEntries(
    keys.map((key) => [key, window.localStorage.getItem(key)]),
  ) as Record<string, string | null>;
}

export async function writePersistedValue(key: string, value: string) {
  const extensionStorage = getExtensionStorage();
  if (extensionStorage) {
    try {
      await extensionStorage.set({ [getScopedKey(key)]: value });
      return;
    } catch {
      // fall back to localStorage
    }
  }

  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage errors
  }
}
