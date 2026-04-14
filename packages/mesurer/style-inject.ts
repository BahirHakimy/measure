const MESURER_STYLE_ID = "mesurer-styles";

export function ensureMeasurerStyles(cssText: string) {
  if (typeof document === "undefined") return;
  if (!cssText) return;
  if (document.getElementById(MESURER_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = MESURER_STYLE_ID;
  style.textContent = cssText;
  document.head.appendChild(style);
}
