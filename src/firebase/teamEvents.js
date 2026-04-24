// teamEvents.js - 隊伍時間整理/日曆事件相關函數

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
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "./config";
import { notifyCalendarEvent, getTeamMemberIds } from "./notificationHelpers";

const EVENTS_COLLECTION = "team_events";

/**
 * 創建隊伍事件
 * @param {string} teamId - 隊伍 ID
 * @param {Object} eventData - 事件資料
 * @returns {Promise<string>} 事件 ID
 */
export async function createTeamEvent(teamId, eventData) {
  console.log("創建隊伍事件:", eventData);

  const recordData = {
    teamId,
    title: eventData.title,
    description: eventData.description || "",
    type: eventData.type || "meeting", // meeting, practice, tournament, deadline, other
    startTime: eventData.startTime, // Date 對象或 Timestamp
    endTime: eventData.endTime,
    location: eventData.location || "",
    isAllDay: eventData.isAllDay || false,
    creatorId: eventData.creatorInfo.userId,
    creatorName:
      eventData.creatorInfo.userName || eventData.creatorInfo.userEmail,
    creatorEmail: eventData.creatorInfo.userEmail,
    attendees: [
      {
        userId: eventData.creatorInfo.userId,
        userName:
          eventData.creatorInfo.userName || eventData.creatorInfo.userEmail,
        status: "confirmed", // confirmed, tentative, declined
      },
    ],
    reminder: eventData.reminder || null, // {type: 'email'|'notification', minutesBefore: 15}
    notes: eventData.notes || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, EVENTS_COLLECTION), recordData);
  console.log("事件已創建，ID:", docRef.id);

  // 發送通知給所有隊員
  try {
    const memberIds = await getTeamMemberIds(teamId);
    if (memberIds.length > 0) {
      await notifyCalendarEvent(
        docRef.id,
        eventData.title,
        eventData.startTime,
        memberIds,
        teamId,
      );
      console.log("✅ 已發送日曆事件通知");
    }
  } catch (notifError) {
    console.error("❌ 發送事件通知失敗:", notifError);
  }

  return docRef.id;
}

/**
 * 獲取隊伍所有事件
 * @param {string} teamId - 隊伍 ID
 * @param {Date} startDate - 開始日期（可選）
 * @param {Date} endDate - 結束日期（可選）
 * @returns {Promise<Array>} 事件陣列
 */
export async function getTeamEvents(teamId, startDate = null, endDate = null) {
  const q = query(
    collection(db, EVENTS_COLLECTION),
    where("teamId", "==", teamId),
  );

  const snapshot = await getDocs(q);
  let results = snapshot.docs.map((doc) => {
    const data = doc.data();
    return { id: doc.id, ...data, teamId: data.teamId || teamId };
  });

  if (startDate)
    results = results.filter(
      (e) => (e.startTime?.toDate?.() || new Date(e.startTime)) >= startDate,
    );
  if (endDate)
    results = results.filter(
      (e) => (e.startTime?.toDate?.() || new Date(e.startTime)) <= endDate,
    );

  results.sort((a, b) => {
    const ta = (a.startTime?.toDate?.() || new Date(a.startTime)).getTime();
    const tb = (b.startTime?.toDate?.() || new Date(b.startTime)).getTime();
    return ta - tb;
  });

  return results;
}

/**
 * 訂閱隊伍事件更新
 * @param {string} teamId - 隊伍 ID
 * @param {Function} callback - 回調函數
 * @returns {Function} 取消訂閱函數
 */
export function subscribeToTeamEvents(teamId, callback) {
  const q = query(
    collection(db, EVENTS_COLLECTION),
    where("teamId", "==", teamId),
  );

  const sortAndCallback = (docs) => {
    const events = docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const ta = (a.startTime?.toDate?.() || new Date(a.startTime)).getTime();
        const tb = (b.startTime?.toDate?.() || new Date(b.startTime)).getTime();
        return ta - tb;
      });
    callback(events);
  };

  return onSnapshot(
    q,
    (snapshot) => sortAndCallback(snapshot.docs),
    (err) => {
      console.error("subscribeToTeamEvents 失敗:", err);
      getDocs(q)
        .then((snapshot) => sortAndCallback(snapshot.docs))
        .catch(console.error);
    },
  );
}

/**
 * 更新事件
 * @param {string} eventId - 事件 ID
 * @param {Object} updates - 更新內容
 * @returns {Promise<void>}
 */
export async function updateTeamEvent(eventId, updates) {
  await updateDoc(doc(db, EVENTS_COLLECTION, eventId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
  console.log("事件已更新");
}

/**
 * 刪除事件
 * @param {string} eventId - 事件 ID
 * @returns {Promise<void>}
 */
export async function deleteTeamEvent(eventId) {
  await deleteDoc(doc(db, EVENTS_COLLECTION, eventId));
  console.log("事件已刪除");
}

/**
 * 回應事件邀請
 * @param {string} eventId - 事件 ID
 * @param {string} userId - 用戶 ID
 * @param {string} status - 狀態 (confirmed, tentative, declined)
 * @returns {Promise<void>}
 */
export async function respondToEventInvitation(eventId, userId, status) {
  const eventRef = doc(db, EVENTS_COLLECTION, eventId);
  const eventSnap = await getDocs(
    query(collection(db, EVENTS_COLLECTION), where("__name__", "==", eventId)),
  );

  if (!eventSnap.empty) {
    const currentData = eventSnap.docs[0].data();
    const attendees = currentData.attendees || [];

    // 更新參與者狀態
    const updatedAttendees = attendees.map((attendee) =>
      attendee.userId === userId ? { ...attendee, status } : attendee,
    );

    await updateDoc(eventRef, {
      attendees: updatedAttendees,
      updatedAt: serverTimestamp(),
    });
    console.log("事件回應已更新");
  }
}

/**
 * 添加事件參與者
 * @param {string} eventId - 事件 ID
 * @param {Object} attendee - 參與者資訊 {userId, userName, status}
 * @returns {Promise<void>}
 */
export async function addEventAttendee(eventId, attendee) {
  await updateDoc(doc(db, EVENTS_COLLECTION, eventId), {
    attendees: arrayUnion({
      ...attendee,
      status: attendee.status || "tentative",
    }),
    updatedAt: serverTimestamp(),
  });
  console.log("參與者已添加");
}

/**
 * 移除事件參與者
 * @param {string} eventId - 事件 ID
 * @param {string} userId - 用戶 ID
 * @returns {Promise<void>}
 */
export async function removeEventAttendee(eventId, userId) {
  const eventSnap = await getDocs(
    query(collection(db, EVENTS_COLLECTION), where("__name__", "==", eventId)),
  );

  if (!eventSnap.empty) {
    const currentData = eventSnap.docs[0].data();
    const attendees = currentData.attendees || [];

    const updatedAttendees = attendees.filter((a) => a.userId !== userId);

    await updateDoc(doc(db, EVENTS_COLLECTION, eventId), {
      attendees: updatedAttendees,
      updatedAt: serverTimestamp(),
    });
    console.log("參與者已移除");
  }
}

/**
 * 標記用戶可用時間
 * @param {string} teamId - 隊伍 ID
 * @param {string} userId - 用戶 ID
 * @param {Array} availableSlots - 可用時間段（字串陣列如 ["2024-12-16T09:00"]）
 * @param {string} color - 用戶代表色（可選）
 * @returns {Promise<void>}
 */
export async function markUserAvailability(
  teamId,
  userId,
  availableSlots,
  color,
) {
  const availabilityData = {
    teamId,
    userId,
    availableSlots,
    ...(color ? { color } : {}),
    updatedAt: serverTimestamp(),
  };

  // 使用 team_availability collection 存儲用戶可用時間
  const q = query(
    collection(db, "team_availability"),
    where("teamId", "==", teamId),
    where("userId", "==", userId),
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    await addDoc(collection(db, "team_availability"), availabilityData);
  } else {
    await updateDoc(snapshot.docs[0].ref, availabilityData);
  }

  console.log("用戶可用時間已更新");
}

/**
 * 獲取隊伍成員的可用時間
 * @param {string} teamId - 隊伍 ID
 * @returns {Promise<Array>} 所有成員的可用時間
 */
export async function getTeamAvailability(teamId) {
  const q = query(
    collection(db, "team_availability"),
    where("teamId", "==", teamId),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * 訂閱隊伍成員的可用時間（即時更新）
 * @param {string} teamId - 隊伍 ID
 * @param {Function} callback - 回調函數
 * @returns {Function} 取消訂閱函數
 */
export function subscribeToTeamAvailability(teamId, callback) {
  const q = query(
    collection(db, "team_availability"),
    where("teamId", "==", teamId),
  );

  return onSnapshot(q, (snapshot) => {
    const availability = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(availability);
  });
}
