// teamFiles.js - 隊伍文件管理相關函數

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
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
import { notifyFileUpload, getTeamMemberIds } from "./notificationHelpers";

const FILES_COLLECTION = "team_files";

/**
 * 上傳隊伍文件
 * @param {string} teamId - 隊伍 ID
 * @param {File} file - 文件對象
 * @param {Object} userInfo - 用戶資訊 {userId, userName, userEmail}
 * @returns {Promise<Object>} 文件記錄
 */
export async function uploadTeamFile(teamId, file, userInfo) {
  console.log("開始上傳隊伍文件:", file.name);

  // 上傳到 Storage
  const timestamp = Date.now();
  const filename = `${timestamp}_${file.name}`;
  const storageRef = ref(storage, `team_files/${teamId}/${filename}`);

  const snapshot = await uploadBytes(storageRef, file);
  console.log("文件上傳到 Storage 成功");

  // 獲取下載 URL
  const downloadURL = await getDownloadURL(snapshot.ref);

  // 在 Firestore 中記錄文件資訊
  const fileData = {
    teamId,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    storagePath: snapshot.ref.fullPath,
    downloadURL,
    uploadedBy: userInfo.userId,
    uploaderName: userInfo.userName || userInfo.userEmail,
    uploaderEmail: userInfo.userEmail,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, FILES_COLLECTION), fileData);
  console.log("文件記錄已保存，ID:", docRef.id);

  // 發送通知給隊員
  try {
    const memberIds = await getTeamMemberIds(teamId);
    if (memberIds.length > 0) {
      await notifyFileUpload(
        docRef.id,
        file.name,
        userInfo.userId,
        userInfo.userName || userInfo.userEmail,
        memberIds,
        teamId,
        "team",
      );
      console.log("✅ 已發送文件上傳通知");
    }
  } catch (notifError) {
    console.error("❌ 發送文件通知失敗:", notifError);
  }

  return {
    id: docRef.id,
    ...fileData,
  };
}

/**
 * 新增連結分享（Google Docs、雲端硬碟等）
 */
export async function addTeamLink(teamId, linkData, userInfo) {
  const fileData = {
    teamId,
    fileName: linkData.title,
    fileType: "link",
    linkURL: linkData.url,
    fileSize: 0,
    storagePath: null,
    downloadURL: linkData.url,
    uploadedBy: userInfo.userId,
    uploaderName: userInfo.userName || userInfo.userEmail,
    uploaderEmail: userInfo.userEmail,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, FILES_COLLECTION), fileData);

  // 發送通知
  try {
    const memberIds = await getTeamMemberIds(teamId);
    if (memberIds.length > 0) {
      await notifyFileUpload(
        docRef.id,
        linkData.title,
        userInfo.userId,
        userInfo.userName || userInfo.userEmail,
        memberIds,
        teamId,
        "team",
      );
    }
  } catch (notifError) {
    console.error("❌ 發送連結通知失敗:", notifError);
  }

  return { id: docRef.id, ...fileData };
}

/**
 * 獲取隊伍所有文件
 * @param {string} teamId - 隊伍 ID
 * @returns {Promise<Array>} 文件陣列
 */
export async function getTeamFiles(teamId) {
  const q = query(
    collection(db, FILES_COLLECTION),
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
 * 訂閱隊伍文件更新
 * @param {string} teamId - 隊伍 ID
 * @param {Function} callback - 回調函數
 * @returns {Function} 取消訂閱函數
 */
export function subscribeToTeamFiles(teamId, callback) {
  const q = query(
    collection(db, FILES_COLLECTION),
    where("teamId", "==", teamId),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(q, (snapshot) => {
    const files = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(files);
  });
}

/**
 * 刪除隊伍文件
 * @param {string} fileId - 文件 ID
 * @param {string} storagePath - Storage 路徑
 * @returns {Promise<void>}
 */
export async function deleteTeamFile(fileId, storagePath) {
  // 連結類型沒有 storagePath，只刪除 Firestore 記錄
  if (storagePath) {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
    console.log("Storage 文件已刪除");
  }

  await deleteDoc(doc(db, FILES_COLLECTION, fileId));
  console.log("文件記錄已刪除");
}
