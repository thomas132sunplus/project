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
  getDoc,
  writeBatch,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "./config";

// 正式站網址（所有 email 開頭都會附上）
export const SITE_URL = "https://edgewalker-6c6ac.web.app";

/**
 * 取得使用者 email（從 Firestore users/{uid} 讀取，找不到時回傳 null）
 * 結果會快取於記憶體中以避免重複查詢。
 */
const _userEmailCache = new Map();
async function getUserEmail(userId) {
  if (!userId) return null;
  if (_userEmailCache.has(userId)) return _userEmailCache.get(userId);
  try {
    const snap = await getDoc(doc(db, "users", userId));
    const email = snap.exists() ? snap.data().email || null : null;
    _userEmailCache.set(userId, email);
    return email;
  } catch (err) {
    console.warn("⚠️ 取得使用者 email 失敗:", userId, err?.message);
    return null;
  }
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 將通知寫入 `mail` collection，由 Firebase「Trigger Email」extension 發送。
 * 信件開頭必附正式站網址。
 */
async function enqueueEmailForNotification({
  toEmail,
  type,
  title,
  message,
  emailMessage,
  linkTo,
}) {
  if (!toEmail) return;
  // email 內文優先使用 emailMessage（完整內容），否則退回站內通知的 message
  const body = emailMessage || message || "";
  const fullLink = linkTo
    ? `${SITE_URL}${linkTo.startsWith("/") ? linkTo : `/${linkTo}`}`
    : SITE_URL;
  const subject = `[邊境之外] ${title || "新通知"}`;
  const text = `${SITE_URL}\n\n${title || ""}\n${body}\n\n前往查看：${fullLink}`;
  const html = `
    <div style="font-family:Arial,'Microsoft JhengHei',sans-serif;line-height:1.6;color:#222;">
      <p style="margin:0 0 12px;"><a href="${SITE_URL}" style="color:#2563eb;">${SITE_URL}</a></p>
      <h2 style="margin:0 0 8px;font-size:18px;">${escapeHtml(title || "")}</h2>
      <p style="margin:0 0 16px;white-space:pre-wrap;">${escapeHtml(body)}</p>
      <p style="margin:0;"><a href="${fullLink}" style="color:#fff;background:#2563eb;padding:8px 14px;border-radius:6px;text-decoration:none;display:inline-block;">前往查看</a></p>
      <p style="margin:16px 0 0;color:#888;font-size:12px;">此信為「邊境之外」系統自動寄送（通知類型：${escapeHtml(type || "")}）</p>
    </div>`;
  try {
    await addDoc(collection(db, "mail"), {
      to: toEmail,
      message: { subject, text, html },
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("⚠️ 寄送通知 email 失敗:", err?.message);
  }
}

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
  REFEREE_INVITATION: "referee_invitation",
  REFEREE_INVITATION_RESPONSE: "referee_invitation_response",
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
  [NOTIFICATION_TYPES.REFEREE_INVITATION]: {
    icon: "⚖️",
    color: "indigo",
    label: "邀裁邀請",
  },
  [NOTIFICATION_TYPES.REFEREE_INVITATION_RESPONSE]: {
    icon: "⚖️",
    color: "pink",
    label: "邀裁回應",
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
  emailMessage = null,
) => {
  try {
    const notificationsRef = collection(db, "notifications");
    const enrichedMetadata = {
      ...metadata,
      senderId: auth.currentUser?.uid || "",
    };
    await addDoc(notificationsRef, {
      userId,
      type,
      title,
      message,
      relatedId,
      linkTo,
      metadata: enrichedMetadata,
      isRead: false,
      createdAt: serverTimestamp(),
    });

    // 同步寄送 email
    try {
      const toEmail = await getUserEmail(userId);
      await enqueueEmailForNotification({
        toEmail,
        type,
        title,
        message,
        emailMessage,
        linkTo,
      });
    } catch (mailErr) {
      console.warn("⚠️ 通知 email 入列失敗:", mailErr?.message);
    }
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
  emailMessage = null,
) => {
  try {
    const notificationsRef = collection(db, "notifications");
    const enrichedMetadata = {
      ...metadata,
      senderId: auth.currentUser?.uid || "",
    };
    const BATCH_LIMIT = 499;

    for (let i = 0; i < userIds.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      const chunk = userIds.slice(i, i + BATCH_LIMIT);
      chunk.forEach((userId) => {
        const newNotificationRef = doc(notificationsRef);
        batch.set(newNotificationRef, {
          userId,
          type,
          title,
          message,
          relatedId,
          linkTo,
          metadata: enrichedMetadata,
          isRead: false,
          createdAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }

    // 同步寄送 email 給每位接收者
    try {
      const emails = await Promise.all(userIds.map((uid) => getUserEmail(uid)));
      await Promise.all(
        emails.map((toEmail) =>
          enqueueEmailForNotification({
            toEmail,
            type,
            title,
            message,
            emailMessage,
            linkTo,
          }),
        ),
      );
    } catch (mailErr) {
      console.warn("⚠️ 批量通知 email 入列失敗:", mailErr?.message);
    }
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
 * 刪除與特定資源 ID 相關的所有通知（如刪除事件時清除提醒）
 * @param {string} relatedId - 相關資源 ID（如事件 ID）
 */
export const deleteNotificationsByRelatedId = async (relatedId) => {
  try {
    const notificationsRef = collection(db, "notifications");
    const q = query(notificationsRef, where("relatedId", "==", relatedId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    const BATCH_LIMIT = 499;
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      docs.slice(i, i + BATCH_LIMIT).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    console.log(`✅ 已刪除 ${docs.length} 筆與事件 ${relatedId} 相關的通知`);
  } catch (error) {
    console.error("❌ 刪除相關通知失敗:", error);
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
