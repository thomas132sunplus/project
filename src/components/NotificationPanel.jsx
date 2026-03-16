// 通知面板組件
// 顯示通知列表和操作按鈕

import { useNavigate } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";
import { NotificationItem } from "./NotificationItem";

export function NotificationPanel({ onClose }) {
  const navigate = useNavigate();
  const {
    notifications,
    loading,
    markAllAsRead,
    clearReadNotifications,
    desktopNotificationsEnabled,
    toggleDesktopNotifications,
  } = useNotifications();

  const handleNotificationClick = (notification) => {
    if (notification.linkTo) {
      navigate(notification.linkTo);
      onClose();
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-[calc(100vw-1rem)] sm:w-96 max-w-[24rem] bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[80vh] flex flex-col">
      {/* 標題欄 */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">通知</h3>
          <div className="flex gap-2">
            {/* 全部已讀按鈕 */}
            {notifications.some((n) => !n.isRead) && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                全部已讀
              </button>
            )}
            {/* 清除已讀按鈕 */}
            {notifications.some((n) => n.isRead) && (
              <button
                onClick={clearReadNotifications}
                className="text-xs text-gray-600 hover:text-gray-800 font-medium"
              >
                清除已讀
              </button>
            )}
          </div>
        </div>

        {/* 桌面通知開關 */}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-gray-600">桌面通知</span>
          <button
            onClick={toggleDesktopNotifications}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              desktopNotificationsEnabled ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                desktopNotificationsEnabled ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* 通知列表 */}
      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="p-8 text-center text-gray-500">載入中...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">🔔</div>
            <p>目前沒有通知</p>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
