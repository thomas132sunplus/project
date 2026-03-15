// 通知項目組件
// 顯示單個通知的內容和操作

import { useNotifications } from "../hooks/useNotifications";
import { NOTIFICATION_CONFIG } from "../firebase/notifications";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";

export default function NotificationItem({ notification, onClick }) {
  const { markAsRead, deleteNotification } = useNotifications();

  const config = NOTIFICATION_CONFIG[notification.type] || {
    icon: "🔔",
    color: "gray",
    label: "通知",
  };

  const handleClick = () => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    if (onClick) {
      onClick();
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm("確定要刪除此通知嗎？")) {
      deleteNotification(notification.id);
    }
  };

  // 格式化時間
  const getTimeAgo = () => {
    if (!notification.createdAt) return "剛剛";
    try {
      const date = notification.createdAt.toDate();
      return formatDistanceToNow(date, { addSuffix: true, locale: zhTW });
    } catch (error) {
      return "剛剛";
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition ${
        !notification.isRead ? "bg-blue-50" : ""
      }`}
    >
      <div className="flex gap-3">
        {/* 圖標 */}
        <div className="flex-shrink-0 text-2xl">{config.icon}</div>

        {/* 內容 */}
        <div className="flex-1 min-w-0">
          {/* 標題和時間 */}
          <div className="flex justify-between items-start gap-2 mb-1">
            <h4 className="text-sm font-semibold text-gray-800 truncate">
              {notification.title}
            </h4>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {getTimeAgo()}
            </span>
          </div>

          {/* 訊息內容 */}
          <p className="text-sm text-gray-600 line-clamp-2">
            {notification.message}
          </p>

          {/* 類型標籤和操作 */}
          <div className="flex justify-between items-center mt-2">
            <span
              className={`text-xs px-2 py-1 rounded-full bg-${config.color}-100 text-${config.color}-700`}
            >
              {config.label}
            </span>

            {/* 刪除按鈕 */}
            <button
              onClick={handleDelete}
              className="text-xs text-gray-400 hover:text-red-600 transition"
            >
              刪除
            </button>
          </div>
        </div>

        {/* 未讀標記 */}
        {!notification.isRead && (
          <div className="flex-shrink-0">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          </div>
        )}
      </div>
    </div>
  );
}
