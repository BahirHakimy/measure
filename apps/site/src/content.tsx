import React from "react";
import ReactDOM from "react-dom/client";
import { Measurer } from "mesurer";

const ROOT_ID = "mesurer-extension-root";

function mountMeasurer() {
  if (document.getElementById(ROOT_ID)) return;

  const host = document.body ?? document.documentElement;
  if (!host) return;

  const rootElement = document.createElement("div");
  rootElement.id = ROOT_ID;
  host.appendChild(rootElement);

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Measurer persistOnReload />
    </React.StrictMode>,
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountMeasurer, { once: true });
} else {
  mountMeasurer();
}
