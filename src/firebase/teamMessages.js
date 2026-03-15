// teamMessages.js - 隊伍聊天訊息相關函數

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "./config";
import { notifyChatMessage, getTeamMemberIds } from "./notificationHelpers";

const MESSAGES_COLLECTION = "team_messages";

/**
 * 訂閱隊伍聊天訊息
 * @param {string} teamId - 隊伍 ID
 * @param {Function} callback - 回調函數，接收訊息陣列
 * @returns {Function} 取消訂閱函數
 */
export function subscribeToTeamMessages(teamId, callback) {
  console.log("訂閱隊伍訊息，teamId:", teamId);

  const q = query(
    collection(db, MESSAGES_COLLECTION),
    where("teamId", "==", teamId),
    orderBy("createdAt", "asc"),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log("收到隊伍訊息更新:", messages.length, "條");
      callback(messages);
    },
    (error) => {
      console.error("訂閱隊伍訊息失敗:", error);
      callback([]);
    },
  );
}

/**
 * 發送隊伍聊天訊息
 * @param {string} teamId - 隊伍 ID
 * @param {string} content - 訊息內容
 * @param {Object} userInfo - 用戶資訊 {userId, userName, userEmail}
 * @returns {Promise<string>} 訊息 ID
 */
export async function sendTeamMessage(teamId, content, userInfo) {
  console.log("發送隊伍訊息:", { teamId, content, userInfo });

  const messageData = {
    teamId,
    content: content.trim(),
    userId: userInfo.userId,
    userName: userInfo.userName || userInfo.userEmail,
    userEmail: userInfo.userEmail,
    createdAt: serverTimestamp(),
    type: "text", // text, image, file
  };

  const docRef = await addDoc(collection(db, MESSAGES_COLLECTION), messageData);
  console.log("訊息發送成功，ID:", docRef.id);

  // 發送通知給其他隊員
  try {
    const memberIds = await getTeamMemberIds(teamId);
    console.log(
      "[ChatNotify] 隊伍成員 IDs:",
      memberIds,
      "當前用戶:",
      userInfo.userId,
    );
    if (memberIds.length > 1) {
      await notifyChatMessage(
        teamId,
        userInfo.userId,
        userInfo.userName || userInfo.userEmail,
        content.trim(),
        memberIds,
        "team",
      );
      console.log("✅ 已發送聊天通知給隊員");
    } else {
      console.log("[ChatNotify] 隊伍成員不足 2 人，跳過通知");
    }
  } catch (error) {
    console.error("❌ 發送聊天通知失敗:", error);
    // 不影響主要流程，只記錄錯誤
  }

  return docRef.id;
}

/**
 * 獲取隊伍所有訊息
 * @param {string} teamId - 隊伍 ID
 * @returns {Promise<Array>} 訊息陣列
 */
export async function getTeamMessages(teamId) {
  const q = query(
    collection(db, MESSAGES_COLLECTION),
    where("teamId", "==", teamId),
    orderBy("createdAt", "asc"),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * 刪除訊息
 * @param {string} messageId - 訊息 ID
 * @returns {Promise<void>}
 */
export async function deleteTeamMessage(messageId) {
  await deleteDoc(doc(db, MESSAGES_COLLECTION, messageId));
  console.log("訊息已刪除:", messageId);
}
