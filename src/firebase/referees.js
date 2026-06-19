// referees.js - 裁判公開註冊表
// 因 users 集合不可被一般使用者列出（list 僅 admin），另建立可公開讀取的 referees 集合，
// 讓裁判區可以列出所有註冊為裁判的人。doc id = 使用者 uid。

import { db } from "./config";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

const COLLECTION_NAME = "referees";

/**
 * 新增或更新裁判註冊資料
 * @param {string} userId
 * @param {{name:string, gender?:string, notes?:string}} profile
 */
export async function upsertRefereeRegistry(userId, profile) {
  if (!userId) return;
  await setDoc(
    doc(db, COLLECTION_NAME, userId),
    {
      userId,
      name: profile?.name || "",
      gender: profile?.gender || "",
      notes: profile?.notes || "",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * 移除裁判註冊資料（取消裁判身分時）
 * @param {string} userId
 */
export async function removeRefereeRegistry(userId) {
  if (!userId) return;
  await deleteDoc(doc(db, COLLECTION_NAME, userId));
}

/**
 * 取得所有註冊為裁判的人
 * @returns {Promise<Array<{userId:string, name:string, gender:string, notes:string}>>}
 */
export async function getAllReferees() {
  const snapshot = await getDocs(collection(db, COLLECTION_NAME));
  return snapshot.docs
    .map((d) => ({ userId: d.id, ...d.data() }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}
