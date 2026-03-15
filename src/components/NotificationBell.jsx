// 通知鈴鐺組件
// 顯示在導航欄，點擊展開通知面板

import { useState, useRef, useEffect } from "react";
import { useNotifications } from "../hooks/useNotifications";
import NotificationPanel from "./NotificationPanel";

export default function NotificationBell() {
  const { unreadCount } = useNotifications();
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  // 點擊外部關閉面板
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowPanel(false);
      }
    };

    if (showPanel) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPanel]);

  return (
    <div className="relative">
      {/* 通知鈴鐺按鈕 */}
      <button
        ref={buttonRef}
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 hover:bg-blue-700 rounded-lg transition"
        aria-label="通知"
      >
        {/* 鈴鐺圖標 */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* 未讀數量小紅點 */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full transform translate-x-1/4 -translate-y-1/4">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* 通知面板 */}
      {showPanel && (
        <div ref={panelRef}>
          <NotificationPanel onClose={() => setShowPanel(false)} />
        </div>
      )}
    </div>
  );
}
