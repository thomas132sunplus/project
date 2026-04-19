// useNotifications Hook
// 提供通知相關的狀態和操作方法

import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  subscribeToNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
  requestNotificationPermission,
  sendDesktopNotification,
  NOTIFICATION_TYPES,
} from "../firebase/notifications";

export const useNotifications = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] =
    useState(localStorage.getItem("desktopNotificationsEnabled") === "true");

  // 監聽通知
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToNotifications(
      currentUser.uid,
      (newNotifications) => {
        setNotifications(newNotifications);
        const unread = newNotifications.filter((n) => !n.isRead).length;
        setUnreadCount(unread);
        setLoading(false);

        // 如果有新的未讀通知且啟用了桌面通知，則發送桌面通知
        if (desktopNotificationsEnabled && newNotifications.length > 0) {
          const latestNotification = newNotifications[0];
          if (!latestNotification.isRead) {
            sendDesktopNotification(
              latestNotification.title,
              latestNotification.message,
              null,
              () => {
                if (
                  latestNotification.linkTo &&
                  latestNotification.linkTo.startsWith("/")
                ) {
                  window.location.href = latestNotification.linkTo;
                }
              },
            );
          }
        }
      },
    );

    return () => unsubscribe();
  }, [currentUser, desktopNotificationsEnabled]);

  // 標記為已讀
  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      console.error("標記為已讀失敗:", error);
    }
  };

  // 標記所有為已讀
  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    try {
      await markAllAsRead(currentUser.uid);
    } catch (error) {
      console.error("標記所有為已讀失敗:", error);
    }
  };

  // 刪除通知
  const handleDeleteNotification = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
    } catch (error) {
      console.error("刪除通知失敗:", error);
    }
  };

  // 清除所有已讀通知
  const handleClearReadNotifications = async () => {
    if (!currentUser) return;
    try {
      await clearReadNotifications(currentUser.uid);
    } catch (error) {
      console.error("清除已讀通知失敗:", error);
    }
  };

  // 啟用/禁用桌面通知
  const toggleDesktopNotifications = async () => {
    if (!desktopNotificationsEnabled) {
      const permission = await requestNotificationPermission();
      if (permission === "granted") {
        setDesktopNotificationsEnabled(true);
        localStorage.setItem("desktopNotificationsEnabled", "true");
      } else {
        alert("請在瀏覽器設定中允許通知權限");
      }
    } else {
      setDesktopNotificationsEnabled(false);
      localStorage.setItem("desktopNotificationsEnabled", "false");
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    desktopNotificationsEnabled,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotification: handleDeleteNotification,
    clearReadNotifications: handleClearReadNotifications,
    toggleDesktopNotifications,
  };
};
