// teamCalls.js - 隊伍通話/視訊記錄相關函數

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./config";

const CALLS_COLLECTION = "team_calls";

/**
 * 創建通話記錄
 * @param {string} teamId - 隊伍 ID
 * @param {Object} callData - 通話資料 {type, initiatorInfo}
 * @returns {Promise<string>} 通話記錄 ID
 */
export async function createTeamCall(teamId, callData) {
  console.log("創建隊伍通話記錄:", callData);

  const recordData = {
    teamId,
    type: callData.type, // 'voice' 或 'video'
    status: "started", // started, ongoing, ended
    initiatorId: callData.initiatorInfo.userId,
    initiatorName:
      callData.initiatorInfo.userName || callData.initiatorInfo.userEmail,
    initiatorEmail: callData.initiatorInfo.userEmail,
    participants: [
      {
        userId: callData.initiatorInfo.userId,
        userName:
          callData.initiatorInfo.userName || callData.initiatorInfo.userEmail,
        joinedAt: new Date(),
      },
    ],
    startTime: serverTimestamp(),
    endTime: null,
    duration: 0, // 通話時長（秒）
    notes: "", // 通話記錄備註
    recordingUrl: "", // 如果有錄製，存放錄製文件的 URL
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, CALLS_COLLECTION), recordData);
  console.log("通話記錄已創建，ID:", docRef.id);
  return docRef.id;
}

/**
 * 更新通話記錄
 * @param {string} callId - 通話記錄 ID
 * @param {Object} updates - 更新內容
 * @returns {Promise<void>}
 */
export async function updateTeamCall(callId, updates) {
  await updateDoc(doc(db, CALLS_COLLECTION, callId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
  console.log("通話記錄已更新");
}

/**
 * 結束通話
 * @param {string} callId - 通話記錄 ID
 * @param {number} duration - 通話時長（秒）
 * @returns {Promise<void>}
 */
export async function endTeamCall(callId, duration) {
  await updateDoc(doc(db, CALLS_COLLECTION, callId), {
    status: "ended",
    endTime: serverTimestamp(),
    duration,
    updatedAt: serverTimestamp(),
  });
  console.log("通話已結束");
}

/**
 * 添加通話參與者
 * @param {string} callId - 通話記錄 ID
 * @param {Object} participant - 參與者資訊 {userId, userName}
 * @returns {Promise<void>}
 */
export async function addCallParticipant(callId, participant) {
  const callDoc = await getDocs(
    query(collection(db, CALLS_COLLECTION), where("__name__", "==", callId)),
  );

  if (!callDoc.empty) {
    const currentData = callDoc.docs[0].data();
    const participants = currentData.participants || [];

    // 檢查是否已經在參與者列表中
    if (!participants.some((p) => p.userId === participant.userId)) {
      participants.push({
        ...participant,
        joinedAt: new Date(),
      });

      await updateDoc(doc(db, CALLS_COLLECTION, callId), {
        participants,
        updatedAt: serverTimestamp(),
      });
      console.log("參與者已添加");
    }
  }
}

/**
 * 獲取隊伍所有通話記錄
 * @param {string} teamId - 隊伍 ID
 * @returns {Promise<Array>} 通話記錄陣列
 */
export async function getTeamCalls(teamId) {
  const q = query(
    collection(db, CALLS_COLLECTION),
    where("teamId", "==", teamId),
    orderBy("createdAt", "desc"),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * 訂閱隊伍通話記錄更新
 * @param {string} teamId - 隊伍 ID
 * @param {Function} callback - 回調函數
 * @returns {Function} 取消訂閱函數
 */
export function subscribeToTeamCalls(teamId, callback) {
  const q = query(
    collection(db, CALLS_COLLECTION),
    where("teamId", "==", teamId),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(q, (snapshot) => {
    const calls = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(calls);
  });
}

/**
 * 刪除通話記錄
 * @param {string} callId - 通話記錄 ID
 * @returns {Promise<void>}
 */
export async function deleteTeamCall(callId) {
  await deleteDoc(doc(db, CALLS_COLLECTION, callId));
  console.log("通話記錄已刪除");
}

/**
 * 添加通話備註
 * @param {string} callId - 通話記錄 ID
 * @param {string} notes - 備註內容
 * @returns {Promise<void>}
 */
export async function addCallNotes(callId, notes) {
  await updateDoc(doc(db, CALLS_COLLECTION, callId), {
    notes,
    updatedAt: serverTimestamp(),
  });
  console.log("通話備註已更新");
}
