// practiceMatchCalls.js - 練習賽通話/視訊管理

import {
  collection,
  addDoc,
  query,
  orderBy,
  where,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

const CALLS_COLLECTION = "practice_match_calls";

/**
 * 新增視訊通話連結
 */
export async function addCallLink(matchId, callData, creatorData) {
  try {
    const docRef = await addDoc(collection(db, CALLS_COLLECTION), {
      matchId,
      platform: callData.platform, // "google-meet", "zoom", "teams", "other"
      link: callData.link,
      title: callData.title,
      scheduledDate: callData.scheduledDate || null,
      scheduledTime: callData.scheduledTime || null,
      description: callData.description || "",
      creatorId: creatorData.userId,
      creatorName: creatorData.userName,
      creatorEmail: creatorData.userEmail,
      status: "scheduled", // "scheduled", "completed", "cancelled"
      createdAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      ...callData,
      creatorId: creatorData.userId,
      creatorName: creatorData.userName,
      status: "scheduled",
    };
  } catch (error) {
    console.error("新增通話連結失敗:", error);
    throw error;
  }
}

/**
 * 取得練習賽所有通話記錄
 */
export async function getCalls(matchId) {
  try {
    const q = query(
      collection(db, CALLS_COLLECTION),
      where("matchId", "==", matchId),
      orderBy("createdAt", "desc"),
    );

    const snapshot = await getDocs(q);
    const calls = [];
    snapshot.forEach((doc) => {
      calls.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    return calls;
  } catch (error) {
    console.error("取得通話記錄失敗:", error);
    throw error;
  }
}

/**
 * 更新通話狀態
 */
export async function updateCallStatus(callId, status) {
  try {
    await updateDoc(doc(db, CALLS_COLLECTION, callId), {
      status,
    });
    return true;
  } catch (error) {
    console.error("更新通話狀態失敗:", error);
    throw error;
  }
}

/**
 * 刪除通話記錄
 */
export async function deleteCall(callId) {
  try {
    await deleteDoc(doc(db, CALLS_COLLECTION, callId));
    return true;
  } catch (error) {
    console.error("刪除通話記錄失敗:", error);
    throw error;
  }
}
