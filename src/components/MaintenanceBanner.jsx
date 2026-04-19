// 升級中橫幅元件
import React from "react";

export function MaintenanceBanner() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(255, 221, 51, 0.98)",
        color: "#222",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "2.5rem",
        fontWeight: "bold",
        pointerEvents: "auto",
        userSelect: "none",
      }}
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
    >
      網站升級中，暫停開放
    </div>
  );
}
