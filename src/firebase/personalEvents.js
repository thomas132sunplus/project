// personalEvents.js - 個人日曆事件管理

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./config";

const COLLECTION = "personal_events";

/**
 * 建立個人事件
 */
export async function createPersonalEvent(userId, eventData) {
  const docRef = await addDoc(collection(db, COLLECTION), {
    userId,
    title: eventData.title,
    description: eventData.description || "",
    type: eventData.type || "personal", // personal, deadline, reminder
    startTime: eventData.startTime,
    endTime: eventData.endTime || null,
    allDay: eventData.allDay || false,
    color: eventData.color || "#3B82F6",
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id };
}

/**
 * 取得用戶所有個人事件
 */
export async function getPersonalEvents(userId) {
  const q = query(
    collection(db, COLLECTION),
    where("userId", "==", userId),
    orderBy("startTime", "asc"),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * 即時訂閱用戶個人事件
 */
export function subscribeToPersonalEvents(userId, callback) {
  const q = query(
    collection(db, COLLECTION),
    where("userId", "==", userId),
    orderBy("startTime", "asc"),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const events = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(events);
    },
    (error) => {
      console.error("訂閱個人事件失敗:", error);
    },
  );
}

/**
 * 更新個人事件
 */
export async function updatePersonalEvent(eventId, updates) {
  await updateDoc(doc(db, COLLECTION, eventId), updates);
}

/**
 * 刪除個人事件
 */
export async function deletePersonalEvent(eventId) {
  await deleteDoc(doc(db, COLLECTION, eventId));
}
