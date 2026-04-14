import CodeBlock from "./components/code-block";
import { getPackageVersion } from "./utils/get-package-version";

const version = getPackageVersion();
const extensionName = "Measure Local";
const shortcutRows = [
  { key: "M", label: "Toggle the overlay" },
  { key: "S", label: "Select mode" },
  { key: "G", label: "Guides mode" },
  { key: "H", label: "Horizontal guide orientation" },
  { key: "V", label: "Vertical guide orientation" },
  { key: "Alt", label: "Hold spacing overlays" },
  { key: "Esc", label: "Clear measurements and guides" },
];

export function App() {
  return (
    <main className="flex min-h-screen flex-col gap-5 px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-black text-white">
          <span className="text-[11px] font-semibold">ML</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-end gap-2">
            <h1 className="text-base font-semibold leading-none text-strong">
              {extensionName}
            </h1>
            <span className="text-xs text-muted">v{version}</span>
          </div>
          <p className="text-sm leading-6 text-muted">
            Measure spacing and alignment on localhost without changing your
            app code.
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">
          Runs On
        </p>
        <CodeBlock as="pre">{`http://localhost/*
http://127.0.0.1/*
http://0.0.0.0/*
https://localhost/*`}</CodeBlock>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">
          Behavior
        </p>
        <p className="text-sm leading-6 text-muted">
          The content script mounts automatically on supported pages and keeps
          your measurements in <code className="code">localStorage</code> so
          guides survive a reload.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">
          Practical Additions
        </p>
        <div className="flex flex-col overflow-hidden rounded-[8px] border border-border bg-white">
          <div className="border-b border-border px-3 py-2 text-sm text-muted">
            Floating controls remember their position and collapsed state across
            reloads.
          </div>
          <div className="px-3 py-2 text-sm text-muted">
            Double-click the floating control to reset it back to the default
            corner.
          </div>
        </div>
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

      <section className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">
          Attribution
        </p>
        <p className="text-sm leading-6 text-muted">
          Based on the open-source <code className="code">mesurer</code>{" "}
          package by Julien Thibeaut (ibelick), used under the MIT License.
        </p>
      </section>
    </main>
  );
}
