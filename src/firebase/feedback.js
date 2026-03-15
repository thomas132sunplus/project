// feedback.js - 反饋相關的 Firestore 操作

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";
import { notifyFeedback } from "./notificationHelpers";

const COLLECTION_NAME = "feedback";

/**
 * 提交反饋
 * @param {Object} feedbackData - 反饋資料
 * @returns {Promise<string>} 新反饋的 ID
 */
export async function submitFeedback(feedbackData) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...feedbackData,
      status: "pending", // pending, in-progress, resolved
      createdAt: serverTimestamp(),
    });

    // 發送通知給管理員
    try {
      // 從 Firestore 查詢 role 為 "admin" 的用戶
      const adminQuery = query(
        collection(db, "users"),
        where("role", "==", "admin"),
      );
      const adminSnapshot = await getDocs(adminQuery);
      const adminIds = adminSnapshot.docs.map((doc) => doc.id);

      if (adminIds.length > 0) {
        await notifyFeedback(
          docRef.id,
          feedbackData.userName || feedbackData.userEmail || "匿名用戶",
          feedbackData.type || "一般反饋",
          feedbackData.content?.substring(0, 50) || "",
          adminIds,
        );
        console.log(`✅ 已發送反饋通知給 ${adminIds.length} 位管理員`);
      } else {
        console.log("⚠️ 無管理員可接收反饋通知（請將用戶 role 設為 admin）");
      }
    } catch (notifError) {
      console.error("❌ 發送反饋通知失敗:", notifError);
    }

    return docRef.id;
  } catch (error) {
    console.error("提交反饋失敗:", error);
    throw error;
  }
}

/**
 * 獲取所有反饋（管理員用）
 * @returns {Promise<Array>} 反饋列表
 */
export async function getAllFeedback() {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy("createdAt", "desc"),
    );
    const snapshot = await getDocs(q);

    const feedbacks = [];
    snapshot.forEach((doc) => {
      feedbacks.push({ id: doc.id, ...doc.data() });
    });

    return feedbacks;
  } catch (error) {
    console.error("獲取反饋失敗:", error);
    throw error;
  }
}
