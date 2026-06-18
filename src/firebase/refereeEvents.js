// refereeEvents.js - 裁判日曆事件管理（可邀裁 / 裁比賽）
// 與 personal_events 分開儲存，因為「可邀裁」事件需要被所有登入者讀取（裁判區邀裁日曆）

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

const COLLECTION = "referee_events";

// 裁判事件類型
export const REFEREE_EVENT_TYPES = {
  AVAILABLE: "可邀裁",
  JUDGING: "裁比賽",
};

export const REFEREE_TYPE_COLORS = {
  [REFEREE_EVENT_TYPES.AVAILABLE]: "#14B8A6", // teal
  [REFEREE_EVENT_TYPES.JUDGING]: "#DB2777", // pink
};

/**
 * 建立裁判事件
 */
export async function createRefereeEvent(userId, refereeName, eventData) {
  const docRef = await addDoc(collection(db, COLLECTION), {
    refereeId: userId,
    refereeName: refereeName || "",
    title: eventData.title,
    description: eventData.description || "",
    type: eventData.type || REFEREE_EVENT_TYPES.AVAILABLE,
    startTime: eventData.startTime,
    endTime: eventData.endTime || null,
    allDay: eventData.allDay || false,
    color:
      eventData.color ||
      REFEREE_TYPE_COLORS[eventData.type] ||
      REFEREE_TYPE_COLORS[REFEREE_EVENT_TYPES.AVAILABLE],
    tags: Array.isArray(eventData.tags) ? eventData.tags : [],
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id };
}

/**
 * 即時訂閱某裁判自己的所有裁判事件
 */
export function subscribeToRefereeEvents(userId, callback) {
  const q = query(collection(db, COLLECTION), where("refereeId", "==", userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const events = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(events);
    },
    (error) => {
      console.error("訂閱裁判事件失敗:", error);
    },
  );
}

/**
 * 即時訂閱所有裁判的「可邀裁」事件（裁判區邀裁日曆使用）
 */
export function subscribeToAllAvailability(callback) {
  const q = query(
    collection(db, COLLECTION),
    where("type", "==", REFEREE_EVENT_TYPES.AVAILABLE),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const events = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(events);
    },
    (error) => {
      console.error("訂閱可邀裁事件失敗:", error);
    },
  );
}

/**
 * 取得所有裁判的「可邀裁」事件（單次讀取）
 */
export async function getAllAvailability() {
  const q = query(
    collection(db, COLLECTION),
    where("type", "==", REFEREE_EVENT_TYPES.AVAILABLE),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * 更新裁判事件
 */
export async function updateRefereeEvent(eventId, updates) {
  await updateDoc(doc(db, COLLECTION, eventId), updates);
}

/**
 * 刪除裁判事件
 */
export async function deleteRefereeEvent(eventId) {
  await deleteDoc(doc(db, COLLECTION, eventId));
}
