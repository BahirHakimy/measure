const MESURER_STYLE_ID = "mesurer-styles";

export function ensureMeasurerStyles(
  cssText: string,
  target?: Document | ShadowRoot,
) {
  if (typeof document === "undefined") return;
  if (!cssText) return;

  const resolvedTarget = target ?? document;

  const existingStyle =
    resolvedTarget instanceof ShadowRoot
      ? resolvedTarget.getElementById(MESURER_STYLE_ID)
      : resolvedTarget.getElementById(MESURER_STYLE_ID);

  if (existingStyle) return;

  const style = document.createElement("style");
  style.id = MESURER_STYLE_ID;
  style.textContent = cssText;

  if (resolvedTarget instanceof ShadowRoot) {
    resolvedTarget.appendChild(style);
    return;
  }

  resolvedTarget.head.appendChild(style);
}
