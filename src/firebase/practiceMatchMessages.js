// practiceMatchMessages.js - 練習賽聊天訊息管理

import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "./config";
import {
  notifyChatMessage,
  getMatchParticipantIds,
} from "./notificationHelpers";

const MESSAGES_COLLECTION = "practice_match_messages";

/**
 * 發送聊天訊息
 */
export async function sendMessage(matchId, messageData) {
  try {
    const docRef = await addDoc(collection(db, MESSAGES_COLLECTION), {
      matchId,
      text: messageData.text,
      userId: messageData.userId,
      userName: messageData.userName,
      userEmail: messageData.userEmail,
      createdAt: serverTimestamp(),
    });

    // 發送通知給其他參與者
    try {
      const participantIds = await getMatchParticipantIds(matchId);
      if (participantIds.length > 1) {
        await notifyChatMessage(
          matchId,
          messageData.userId,
          messageData.userName,
          messageData.text.trim(),
          participantIds,
          "match",
        );
        console.log("✅ 已發送練習賽訊息通知");
      }
    } catch (notifError) {
      console.error("❌ 發送訊息通知失敗:", notifError);
    }

    return docRef.id;
  } catch (error) {
    console.error("發送訊息失敗:", error);
    throw error;
  }
}

/**
 * 訂閱練習賽聊天訊息（實時更新）
 */
export function subscribeToMessages(matchId, callback) {
  const q = query(
    collection(db, MESSAGES_COLLECTION),
    where("matchId", "==", matchId),
    orderBy("createdAt", "asc"),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = [];
      snapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      callback(messages);
    },
    (error) => {
      console.error("訂閱訊息失敗:", error);
      callback([]);
    },
  );
}

/**
 * 取得練習賽所有訊息（一次性）
 */
export async function getMessages(matchId) {
  try {
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where("matchId", "==", matchId),
      orderBy("createdAt", "asc"),
    );

    const snapshot = await getDocs(q);
    const messages = [];
    snapshot.forEach((doc) => {
      messages.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    return messages;
  } catch (error) {
    console.error("取得訊息失敗:", error);
    throw error;
  }
}
