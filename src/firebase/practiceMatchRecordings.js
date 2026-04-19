// practiceMatchRecordings.js - 練習賽錄音管理

import {
  collection,
  addDoc,
  query,
  orderBy,
  where,
  getDocs,
  deleteDoc,
  updateDoc,
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
  notifyRecordingUpload,
  getMatchParticipantIds,
} from "./notificationHelpers";

const RECORDINGS_COLLECTION = "practice_match_recordings";

/**
 * 上傳錄音文件
 */
export async function uploadRecording(
  matchId,
  file,
  uploaderData,
  metadata = {},
) {
  try {
    // 客戶端預檢：檔案大小和類型
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("錄音檔案大小不得超過 10MB");
    }
    if (!/^(audio|video)\//.test(file.type)) {
      throw new Error("不支援的錄音檔案類型");
    }

    // 1. 上傳錄音到 Storage
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const storageRef = ref(
      storage,
      `practice_matches/${matchId}/recordings/${fileName}`,
    );

    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    // 2. 記錄錄音資訊到 Firestore
    const docRef = await addDoc(collection(db, RECORDINGS_COLLECTION), {
      matchId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      storagePath: snapshot.ref.fullPath,
      downloadURL,
      uploaderId: uploaderData.userId,
      uploaderName: uploaderData.userName,
      uploaderEmail: uploaderData.userEmail,
      title: metadata.title || file.name,
      description: metadata.description || "",
      duration: metadata.duration || null,
      createdAt: serverTimestamp(),
    });

    // 發送通知給所有練習賽參與者
    try {
      const participantIds = await getMatchParticipantIds(matchId);
      if (participantIds.length > 0) {
        await notifyRecordingUpload(
          docRef.id,
          metadata.title || file.name,
          uploaderData.userId,
          uploaderData.userName,
          participantIds,
          matchId,
          "match",
        );
        console.log("✅ 已發送練習賽錄音上傳通知");
      }
    } catch (notifError) {
      console.error("❌ 發送錄音通知失敗:", notifError);
    }

    return {
      id: docRef.id,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      downloadURL,
      uploaderId: uploaderData.userId,
      uploaderName: uploaderData.userName,
      title: metadata.title || file.name,
      description: metadata.description || "",
    };
  } catch (error) {
    console.error("上傳錄音失敗:", error);
    throw error;
  }
}

/**
 * 取得練習賽所有錄音
 */
export async function getRecordings(matchId) {
  try {
    const q = query(
      collection(db, RECORDINGS_COLLECTION),
      where("matchId", "==", matchId),
      orderBy("createdAt", "desc"),
    );

    const snapshot = await getDocs(q);
    const recordings = [];
    snapshot.forEach((doc) => {
      recordings.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    return recordings;
  } catch (error) {
    console.error("取得錄音失敗:", error);
    throw error;
  }
}

/**
 * 刪除錄音
 */
export async function deleteRecording(recordingId, storagePath) {
  try {
    // 1. 從 Storage 刪除文件
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);

    // 2. 從 Firestore 刪除記錄
    await deleteDoc(doc(db, RECORDINGS_COLLECTION, recordingId));

    return true;
  } catch (error) {
    console.error("刪除錄音失敗:", error);
    throw error;
  }
}

/**
 * 更新練習賽錄音的逐字稿
 */
export async function updatePracticeMatchRecordingTranscript(
  recordingId,
  transcript,
) {
  try {
    const recordingRef = doc(db, RECORDINGS_COLLECTION, recordingId);
    await updateDoc(recordingRef, {
      transcript,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("更新逐字稿失敗:", error);
    throw error;
  }
}
