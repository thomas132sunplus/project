// teamRecordings.js - 隊伍錄音/逐字稿相關函數

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
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "./config";
import { notifyRecordingUpload, getTeamMemberIds } from "./notificationHelpers";

const RECORDINGS_COLLECTION = "team_recordings";

/**
 * 上傳隊伍錄音
 * @param {string} teamId - 隊伍 ID
 * @param {File} audioFile - 音頻文件
 * @param {Object} metadata - 元數據 {title, description, userInfo}
 * @returns {Promise<Object>} 錄音記錄
 */
export async function uploadTeamRecording(teamId, audioFile, metadata) {
  console.log("開始上傳隊伍錄音:", audioFile.name);

  // 上傳到 Storage
  const timestamp = Date.now();
  const filename = `${timestamp}_${audioFile.name}`;
  const storageRef = ref(storage, `team_recordings/${teamId}/${filename}`);

  const snapshot = await uploadBytes(storageRef, audioFile);
  console.log("錄音上傳到 Storage 成功");

  // 獲取下載 URL
  const downloadURL = await getDownloadURL(snapshot.ref);

  // 在 Firestore 中記錄錄音資訊
  const recordingData = {
    teamId,
    title: metadata.title || audioFile.name,
    description: metadata.description || "",
    fileName: audioFile.name,
    fileSize: audioFile.size,
    fileType: audioFile.type,
    duration: metadata.duration || 0, // 音頻時長（秒）
    storagePath: snapshot.ref.fullPath,
    downloadURL,
    transcript: "", // 逐字稿（初始為空）
    uploadedBy: metadata.userInfo.userId,
    uploaderName: metadata.userInfo.userName || metadata.userInfo.userEmail,
    uploaderEmail: metadata.userInfo.userEmail,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, RECORDINGS_COLLECTION),
    recordingData,
  );
  console.log("錄音記錄已保存，ID:", docRef.id);

  // 發送通知給隊員
  try {
    const memberIds = await getTeamMemberIds(teamId);
    if (memberIds.length > 0) {
      await notifyRecordingUpload(
        docRef.id,
        metadata.title || audioFile.name,
        metadata.userInfo.userId,
        metadata.userInfo.userName || metadata.userInfo.userEmail,
        memberIds,
        teamId,
        "team",
      );
      console.log("✅ 已發送錄音上傳通知");
    }
  } catch (notifError) {
    console.error("❌ 發送錄音通知失敗:", notifError);
  }

  return {
    id: docRef.id,
    ...recordingData,
  };
}

/**
 * 獲取隊伍所有錄音
 * @param {string} teamId - 隊伍 ID
 * @returns {Promise<Array>} 錄音陣列
 */
export async function getTeamRecordings(teamId) {
  const q = query(
    collection(db, RECORDINGS_COLLECTION),
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
 * 訂閱隊伍錄音更新
 * @param {string} teamId - 隊伍 ID
 * @param {Function} callback - 回調函數
 * @returns {Function} 取消訂閱函數
 */
export function subscribeToTeamRecordings(teamId, callback) {
  const q = query(
    collection(db, RECORDINGS_COLLECTION),
    where("teamId", "==", teamId),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(q, (snapshot) => {
    const recordings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(recordings);
  });
}

/**
 * 更新錄音逐字稿
 * @param {string} recordingId - 錄音 ID
 * @param {string} transcript - 逐字稿內容
 * @returns {Promise<void>}
 */
export async function updateTeamRecordingTranscript(recordingId, transcript) {
  await updateDoc(doc(db, RECORDINGS_COLLECTION, recordingId), {
    transcript,
    updatedAt: serverTimestamp(),
  });
  console.log("逐字稿已更新");
}

/**
 * 刪除隊伍錄音
 * @param {string} recordingId - 錄音 ID
 * @param {string} storagePath - Storage 路徑
 * @returns {Promise<void>}
 */
export async function deleteTeamRecording(recordingId, storagePath) {
  // 刪除 Storage 中的文件
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
  console.log("Storage 錄音已刪除");

  // 刪除 Firestore 記錄
  await deleteDoc(doc(db, RECORDINGS_COLLECTION, recordingId));
  console.log("錄音記錄已刪除");
}
