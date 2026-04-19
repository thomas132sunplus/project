// announcements.js - 公告相關的 Firestore 操作

import { db } from "./config";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

const COLLECTION_NAME = "announcements";

/**
 * 取得所有公告（依時間倒序）
 */
export async function getAnnouncements() {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("取得公告失敗:", error);
    throw error;
  }
}

/**
 * 新增公告（不儲存發文者帳號）
 */
export async function createAnnouncement({ title, content }) {
  try {
    await addDoc(collection(db, COLLECTION_NAME), {
      title: title.trim(),
      content: content.trim(),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("新增公告失敗:", error);
    throw error;
  }
}

/**
 * 刪除公告
 */
export async function deleteAnnouncement(id) {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error("刪除公告失敗:", error);
    throw error;
  }
}
