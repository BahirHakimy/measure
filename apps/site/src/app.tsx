import { useEffect, useState } from "react";
import { getPackageVersion } from "./utils/get-package-version";

const version = getPackageVersion();
const extensionName = "Pixelgrade";
const EXTENSION_ENABLED_KEY = "mesurer:extension-enabled";
const STORAGE_NAMESPACE = "mesurer";
const PERSISTED_KEYS = [
  "mesurer-state",
  "mesurer-toolbar-visibility",
  "mesurer-toolbar-position",
];
const shortcutRows = [
  { key: "M", label: "Toggle the overlay" },
  { key: "S", label: "Select mode" },
  { key: "G", label: "Guides mode" },
  { key: "T", label: "Tape measure mode" },
  { key: "R", label: "Rulers mode" },
  { key: "H", label: "Horizontal guide orientation" },
  { key: "V", label: "Vertical guide orientation" },
  { key: "Alt", label: "Hold spacing overlays" },
  { key: "Esc", label: "Clear measurements and guides" },
];

type StorageChange = { oldValue?: unknown; newValue?: unknown };
type ChromeStorageApi = {
  local?: {
    get: (keys: string[] | string) => Promise<Record<string, unknown>>;
    set: (items: Record<string, unknown>) => Promise<void>;
    remove?: (keys: string[] | string) => Promise<void>;
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

type ChromeTabsApi = {
  query: (queryInfo: {
    active: boolean;
    currentWindow: boolean;
  }) => Promise<Array<{ id?: number; url?: string }>>;
  reload: (tabId?: number) => Promise<void>;
};

type ChromeScriptingApi = {
  executeScript: (injection: {
    target: { tabId: number };
    func: (...args: string[]) => void;
    args?: string[];
  }) => Promise<unknown>;
};

const chromeApi = (
  globalThis as typeof globalThis & {
    chrome?: {
      storage?: ChromeStorageApi;
      tabs?: ChromeTabsApi;
      scripting?: ChromeScriptingApi;
    };
  }
).chrome;

function getScopedKey(origin: string, key: string) {
  return `${STORAGE_NAMESPACE}:${origin}:${key}`;
}

async function clearCurrentTabState() {
  const [activeTab] =
    (await chromeApi?.tabs?.query({
      active: true,
      currentWindow: true,
    })) ?? [];

  if (!activeTab?.id) return;

  let origin: string | null = null;
  try {
    origin = activeTab.url ? new URL(activeTab.url).origin : null;
  } catch {
    origin = null;
  }

  if (origin) {
    await chromeApi?.storage?.local?.remove?.(
      PERSISTED_KEYS.map((key) => getScopedKey(origin as string, key)),
    );
  }

  const supportsInjection =
    activeTab.url?.startsWith("http://") || activeTab.url?.startsWith("https://");

  if (supportsInjection) {
    try {
      await chromeApi?.scripting?.executeScript({
        target: { tabId: activeTab.id },
        func: (...keys: string[]) => {
          keys.forEach((key) => {
            try {
              window.localStorage.removeItem(key);
            } catch {
              // ignore page storage errors
            }
          });
        },
        args: PERSISTED_KEYS,
      });
    } catch {
      // ignore scripting failures on restricted pages
    }
  }

  try {
    await chromeApi?.tabs?.reload(activeTab.id);
  } catch {
    // ignore reload failures after state has already been updated
  }
}

export function App() {
  const [extensionEnabled, setExtensionEnabled] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      try {
        const stored = await chromeApi?.storage?.local?.get(
          EXTENSION_ENABLED_KEY,
        );
        const value = stored?.[EXTENSION_ENABLED_KEY];
        if (cancelled) return;
        setExtensionEnabled(typeof value === "boolean" ? value : true);
      } catch {
        if (cancelled) return;
        setExtensionEnabled(true);
      }
    };

    const handleChange = (
      changes: Record<string, StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== "local") return;
      if (!(EXTENSION_ENABLED_KEY in changes)) return;
      const value = changes[EXTENSION_ENABLED_KEY]?.newValue;
      setExtensionEnabled(typeof value === "boolean" ? value : true);
    };

    void sync();
    chromeApi?.storage?.onChanged?.addListener(handleChange);

    return () => {
      cancelled = true;
      chromeApi?.storage?.onChanged?.removeListener(handleChange);
    };
  }, []);

  const toggleExtension = async () => {
    if (isToggling) return;
    const next = !extensionEnabled;

    setIsToggling(true);
    try {
      await chromeApi?.storage?.local?.set({ [EXTENSION_ENABLED_KEY]: next });
      setExtensionEnabled(next);
    } catch {
      setIsToggling(false);
      return;
    }

    try {
      await clearCurrentTabState();
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col gap-5 px-4 py-4">
      <div className="flex items-start gap-3">
        <img
          src="/favicon-32x32.png"
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 rounded-[8px]"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-end gap-2">
            <h1 className="text-base font-semibold leading-none text-strong">
              {extensionName}
            </h1>
            <span className="text-xs text-muted">v{version}</span>
          </div>
          <p className="text-sm leading-6 text-muted">
            Inspect spacing, rulers, and guides on any page.
          </p>
        </div>
      </div>

      <section className="flex items-center justify-between gap-4 rounded-[8px] border border-border bg-white px-3 py-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-medium text-strong">Extension</p>
          <p className="text-sm leading-5 text-muted">
            {extensionEnabled
              ? "Enabled on supported tabs."
              : "Disabled on all tabs."}
          </p>
        </div>
        <button
          type="button"
          aria-pressed={extensionEnabled}
          aria-label={extensionEnabled ? "Disable extension" : "Enable extension"}
          disabled={isToggling}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${
            extensionEnabled ? "bg-black" : "bg-black/15"
          } ${isToggling ? "opacity-60" : ""}`}
          onClick={toggleExtension}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
              extensionEnabled ? "left-6" : "left-1"
            }`}
          />
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">
          Behavior
        </p>
        <p className="text-sm leading-6 text-muted">
          Pixelgrade loads automatically on supported pages, keeps overlay state
          in <code className="code">browser storage</code>, and reloads the
          active tab when you change the extension setting so stale overlay data
          is cleared immediately.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">
          Shortcuts
        </p>
        <div className="flex flex-col overflow-hidden rounded-[8px] border border-border bg-white">
          {shortcutRows.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between gap-6 border-b border-border px-3 py-2 last:border-b-0"
            >
              <code className="code shrink-0">{shortcut.key}</code>
              <span className="text-right text-sm text-muted">
                {shortcut.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs leading-5 text-muted">
        Built on <code className="code">mesurer</code> by Julien Thibeaut,
        included under the MIT License.
      </p>
    </main>
  );
}
