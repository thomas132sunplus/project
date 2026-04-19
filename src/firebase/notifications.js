// 通知服務
// 處理通知的創建、讀取、刪除等操作

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { db } from "./config";

// 通知類型常量
export const NOTIFICATION_TYPES = {
  CHAT_MESSAGE: "chat_message",
  TOURNAMENT_UPDATE: "tournament_update",
  MEETING_START: "meeting_start",
  MEETING_REMINDER: "meeting_reminder",
  PRACTICE_INVITATION: "practice_invitation",
  INVITATION_RESPONSE: "invitation_response",
  CALENDAR_EVENT: "calendar_event",
  FILE_UPLOAD: "file_upload",
  RECORDING_UPLOAD: "recording_upload",
  FEEDBACK: "feedback",
  MATCH_CANCEL_REQUEST: "match_cancel_request",
  MATCH_CANCELLED: "match_cancelled",
  TEAM_MEMBER_ADDED: "team_member_added",
  ANNOUNCEMENT: "announcement",
};

// 通知類型的顯示配置
export const NOTIFICATION_CONFIG = {
  [NOTIFICATION_TYPES.CHAT_MESSAGE]: {
    icon: "💬",
    color: "blue",
    label: "新訊息",
  },
  [NOTIFICATION_TYPES.TOURNAMENT_UPDATE]: {
    icon: "🏆",
    color: "yellow",
    label: "盃賽更新",
  },
  [NOTIFICATION_TYPES.MEETING_START]: {
    icon: "📞",
    color: "green",
    label: "會議發起",
  },
  [NOTIFICATION_TYPES.MEETING_REMINDER]: {
    icon: "⏰",
    color: "purple",
    label: "會議提醒",
  },
  [NOTIFICATION_TYPES.PRACTICE_INVITATION]: {
    icon: "📬",
    color: "indigo",
    label: "練習賽邀請",
  },
  [NOTIFICATION_TYPES.INVITATION_RESPONSE]: {
    icon: "✉️",
    color: "pink",
    label: "邀請回應",
  },
  [NOTIFICATION_TYPES.CALENDAR_EVENT]: {
    icon: "📅",
    color: "red",
    label: "日曆事件",
  },
  [NOTIFICATION_TYPES.FILE_UPLOAD]: {
    icon: "📁",
    color: "gray",
    label: "新檔案",
  },
  [NOTIFICATION_TYPES.RECORDING_UPLOAD]: {
    icon: "🎙️",
    color: "orange",
    label: "新錄音",
  },
  [NOTIFICATION_TYPES.FEEDBACK]: {
    icon: "📝",
    color: "teal",
    label: "新反饋",
  },
  [NOTIFICATION_TYPES.TEAM_MEMBER_ADDED]: {
    icon: "👋",
    color: "green",
    label: "加入隊伍",
  },
  [NOTIFICATION_TYPES.MATCH_CANCEL_REQUEST]: {
    icon: "⚠️",
    color: "orange",
    label: "取消請求",
  },
  [NOTIFICATION_TYPES.MATCH_CANCELLED]: {
    icon: "❌",
    color: "red",
    label: "練習賽取消",
  },
  [NOTIFICATION_TYPES.ANNOUNCEMENT]: {
    icon: "📢",
    color: "blue",
    label: "新公告",
  },
};

/**
 * 創建通知
 * @param {string} userId - 接收通知的用戶 ID
 * @param {string} type - 通知類型
 * @param {string} title - 通知標題
 * @param {string} message - 通知內容
 * @param {string} relatedId - 相關資源 ID（如隊伍 ID、盃賽 ID 等）
 * @param {string} linkTo - 點擊通知後跳轉的路徑
 * @param {object} metadata - 額外的元數據
 */
export const createNotification = async (
  userId,
  type,
  title,
  message,
  relatedId = null,
  linkTo = null,
  metadata = {},
) => {
  try {
    const notificationsRef = collection(db, "notifications");
    await addDoc(notificationsRef, {
      userId,
      type,
      title,
      message,
      relatedId,
      linkTo,
      metadata,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("❌ 創建通知失敗:", error);
    throw error;
  }
};

/**
 * 批量創建通知（發給多個用戶）
 * @param {Array<string>} userIds - 接收通知的用戶 ID 列表
 * @param {string} type - 通知類型
 * @param {string} title - 通知標題
 * @param {string} message - 通知內容
 * @param {string} relatedId - 相關資源 ID
 * @param {string} linkTo - 點擊通知後跳轉的路徑
 * @param {object} metadata - 額外的元數據
 */
export const createBatchNotifications = async (
  userIds,
  type,
  title,
  message,
  relatedId = null,
  linkTo = null,
  metadata = {},
) => {
  try {
    const batch = writeBatch(db);
    const notificationsRef = collection(db, "notifications");

    userIds.forEach((userId) => {
      const newNotificationRef = doc(notificationsRef);
      batch.set(newNotificationRef, {
        userId,
        type,
        title,
        message,
        relatedId,
        linkTo,
        metadata,
        isRead: false,
        createdAt: serverTimestamp(),
      });
    });

    await batch.commit();
  } catch (error) {
    console.error("❌ 批量創建通知失敗:", error);
    throw error;
  }
};

/**
 * 監聽用戶的通知
 * @param {string} userId - 用戶 ID
 * @param {Function} callback - 回調函數，接收通知列表
 * @returns {Function} 取消監聽的函數
 */
export const subscribeToNotifications = (userId, callback) => {
  const notificationsRef = collection(db, "notifications");
  const q = query(
    notificationsRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      console.log(
        "[subscribeToNotifications] onSnapshot 成功, 文件數:",
        snapshot.docs.length,
      );
      const notifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(notifications);
    },
    (error) => {
      console.error("❌ 監聽通知失敗:", error.code, error.message);
      callback([]);
    },
  );
};

/**
 * 標記通知為已讀
 * @param {string} notificationId - 通知 ID
 */
export const markAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, "notifications", notificationId);
    await updateDoc(notificationRef, {
      isRead: true,
    });
  } catch (error) {
    console.error("❌ 標記為已讀失敗:", error);
    throw error;
  }
};

/**
 * 標記所有通知為已讀
 * @param {string} userId - 用戶 ID
 */
export const markAllAsRead = async (userId) => {
  try {
    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("userId", "==", userId),
      where("isRead", "==", false),
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach((document) => {
      batch.update(document.ref, { isRead: true });
    });

    await batch.commit();
    console.log("✅ 已標記所有通知為已讀");
  } catch (error) {
    console.error("❌ 標記所有為已讀失敗:", error);
    throw error;
  }
};

/**
 * 刪除通知
 * @param {string} notificationId - 通知 ID
 */
export const deleteNotification = async (notificationId) => {
  try {
    const notificationRef = doc(db, "notifications", notificationId);
    await deleteDoc(notificationRef);
  } catch (error) {
    console.error("❌ 刪除通知失敗:", error);
    throw error;
  }
};

/**
 * 清除所有已讀通知
 * @param {string} userId - 用戶 ID
 */
export const clearReadNotifications = async (userId) => {
  try {
    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("userId", "==", userId),
      where("isRead", "==", true),
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach((document) => {
      batch.delete(document.ref);
    });

    await batch.commit();
    console.log("✅ 已清除所有已讀通知");
  } catch (error) {
    console.error("❌ 清除已讀通知失敗:", error);
    throw error;
  }
};

/**
 * 請求桌面通知權限
 * @returns {Promise<string>} 權限狀態
 */
export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.warn("⚠️ 此瀏覽器不支援桌面通知");
    return "unsupported";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
};

/**
 * 發送桌面通知
 * @param {string} title - 通知標題
 * @param {string} body - 通知內容
 * @param {string} icon - 通知圖標（可選）
 * @param {Function} onClick - 點擊通知的回調（可選）
 */
export const sendDesktopNotification = (
  title,
  body,
  icon = null,
  onClick = null,
) => {
  if (!("Notification" in window)) {
    console.warn("⚠️ 此瀏覽器不支援桌面通知");
    return;
  }

  if (Notification.permission === "granted") {
    const notification = new Notification(title, {
      body,
      icon: icon || "/logo.png", // 可以替換為你的 logo
      badge: "/logo.png",
      tag: "edgewalker-notification",
      requireInteraction: false,
    });

    if (onClick) {
      notification.onclick = onClick;
    }

    // 自動關閉通知（5秒後）
    setTimeout(() => notification.close(), 5000);
  }
};
