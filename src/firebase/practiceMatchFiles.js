// practiceMatchFiles.js - 練習賽資料文件管理

import {
  collection,
  addDoc,
  query,
  orderBy,
  where,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "./config";
import {
  notifyFileUpload,
  getMatchParticipantIds,
} from "./notificationHelpers";

const FILES_COLLECTION = "practice_match_files";

/**
 * 上傳文件到 Firebase Storage 並記錄到 Firestore
 */
export async function uploadFile(matchId, file, uploaderData) {
  try {
    // 1. 上傳文件到 Storage
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const storageRef = ref(
      storage,
      `practice_matches/${matchId}/files/${fileName}`,
    );

    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    // 2. 記錄文件資訊到 Firestore
    const docRef = await addDoc(collection(db, FILES_COLLECTION), {
      matchId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      storagePath: snapshot.ref.fullPath,
      downloadURL,
      uploaderId: uploaderData.userId,
      uploaderName: uploaderData.userName,
      uploaderEmail: uploaderData.userEmail,
      createdAt: serverTimestamp(),
    });

    // 發送通知給所有練習賽參與者
    try {
      const participantIds = await getMatchParticipantIds(matchId);
      if (participantIds.length > 0) {
        await notifyFileUpload(
          docRef.id,
          file.name,
          uploaderData.userId,
          uploaderData.userName,
          participantIds,
          matchId,
          "match",
        );
        console.log("✅ 已發送練習賽文件上傳通知");
      }
    } catch (notifError) {
      console.error("❌ 發送文件通知失敗:", notifError);
    }

    return {
      id: docRef.id,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      downloadURL,
      uploaderId: uploaderData.userId,
      uploaderName: uploaderData.userName,
    };
  } catch (error) {
    console.error("上傳文件失敗:", error);
    throw error;
  }
}

/**
 * 取得練習賽所有文件
 */
export async function getFiles(matchId) {
  try {
    const q = query(
      collection(db, FILES_COLLECTION),
      where("matchId", "==", matchId),
      orderBy("createdAt", "desc"),
    );

    const snapshot = await getDocs(q);
    const files = [];
    snapshot.forEach((doc) => {
      files.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    return files;
  } catch (error) {
    console.error("取得文件失敗:", error);
    throw error;
  }
}

/**
 * 新增連結分享（Google Docs、雲端硬碟等）
 */
export async function addLink(matchId, linkData, uploaderData) {
  try {
    const docRef = await addDoc(collection(db, FILES_COLLECTION), {
      matchId,
      fileName: linkData.title,
      fileType: "link",
      linkURL: linkData.url,
      fileSize: 0,
      storagePath: null,
      downloadURL: linkData.url,
      uploaderId: uploaderData.userId,
      uploaderName: uploaderData.userName,
      uploaderEmail: uploaderData.userEmail,
      createdAt: serverTimestamp(),
    });

    // 發送通知
    try {
      const participantIds = await getMatchParticipantIds(matchId);
      if (participantIds.length > 0) {
        await notifyFileUpload(
          docRef.id,
          linkData.title,
          uploaderData.userId,
          uploaderData.userName,
          participantIds,
          matchId,
          "match",
        );
      }
    } catch (notifError) {
      console.error("❌ 發送連結通知失敗:", notifError);
    }

    return { id: docRef.id, fileName: linkData.title, linkURL: linkData.url };
  } catch (error) {
    console.error("分享連結失敗:", error);
    throw error;
  }
}

/**
 * 刪除文件（從 Storage 和 Firestore）
 */
export async function deleteFile(fileId, storagePath) {
  try {
    // 連結類型沒有 storagePath，只刪除 Firestore 記錄
    if (storagePath) {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    }

    await deleteDoc(doc(db, FILES_COLLECTION, fileId));
    return true;
  } catch (error) {
    console.error("刪除文件失敗:", error);
    throw error;
  }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
