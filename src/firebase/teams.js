/**
 * 以隊伍邀請代碼查詢隊伍
 * @param {string} inviteCode - 隊伍邀請代碼
 * @returns {Promise<Object|null>} 查到則回傳隊伍資料，否則回傳 null
 */
export async function getTeamByInviteCode(inviteCode) {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("inviteCode", "==", inviteCode),
  );
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
  return null;
}
// teams.js - 隊伍相關的 Firestore 操作

import { db } from "./config";
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

const COLLECTION_NAME = "teams";

/**
 * 建立新隊伍
 * @param {Object} teamData - 隊伍資料
 * @returns {Promise<string>} 新隊伍的 ID
 */
// 產生唯一隊伍代碼
async function generateUniqueInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 避免易混淆字元
  let code;
  let exists = true;
  while (exists) {
    code = Array.from(
      { length: 6 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
    // 查詢 Firestore 是否已存在該 inviteCode
    const q = query(
      collection(db, COLLECTION_NAME),
      where("inviteCode", "==", code),
    );
    const snapshot = await getDocs(q);
    exists = !snapshot.empty;
  }
  return code;
}

export async function createTeam(teamData) {
  try {
    // 產生唯一邀請代碼
    const inviteCode = await generateUniqueInviteCode();
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...teamData,
      inviteCode,
      members: teamData.members || [],
      tournaments: teamData.tournaments || [],
      teamColor: teamData.teamColor || "#3B82F6",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("建立隊伍失敗:", error);
    throw error;
  }
}

/**
 * 取得所有隊伍
 * @returns {Promise<Array>} 隊伍列表
 */
export async function getAllTeams() {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("取得隊伍列表失敗:", error);
    throw error;
  }
}

/**
 * 取得單一隊伍詳細資訊
 * @param {string} teamId - 隊伍 ID
 * @returns {Promise<Object>} 隊伍資料
 */
export async function getTeam(teamId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, teamId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    } else {
      throw new Error("找不到該隊伍");
    }
  } catch (error) {
    console.error("取得隊伍失敗:", error);
    throw error;
  }
}

/**
 * 取得用戶所屬的所有隊伍
 * @param {string} userId - 用戶 ID
 * @returns {Promise<Array>} 隊伍列表
 */
export async function getUserTeams(userId) {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("members", "array-contains", userId),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("取得用戶隊伍失敗:", error);
    throw error;
  }
}

/**
 * 取得參加特定盃賽的所有隊伍
 * @param {string} tournamentId - 盃賽 ID
 * @returns {Promise<Array>} 隊伍列表
 */
export async function getTournamentTeams(tournamentId) {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("tournaments", "array-contains", tournamentId),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("取得盃賽隊伍失敗:", error);
    throw error;
  }
}

/**
 * 更新隊伍資訊
 * @param {string} teamId - 隊伍 ID
 * @param {Object} updates - 要更新的資料
 * @returns {Promise<void>}
 */
export async function updateTeam(teamId, updates) {
  try {
    const docRef = doc(db, COLLECTION_NAME, teamId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("更新隊伍失敗:", error);
    throw error;
  }
}

/**
 * 新增成員到隊伍
 * @param {string} teamId - 隊伍 ID
 * @param {string} userId - 用戶 ID
 * @returns {Promise<void>}
 */
export async function addMemberToTeam(teamId, userId) {
  try {
    const teamRef = doc(db, COLLECTION_NAME, teamId);
    await updateDoc(teamRef, { members: arrayUnion(userId) });
  } catch (error) {
    console.error("新增隊員失敗:", error);
    throw error;
  }
}

/**
 * 從隊伍移除成員
 * @param {string} teamId - 隊伍 ID
 * @param {string} userId - 用戶 ID
 * @returns {Promise<void>}
 */
export async function removeMemberFromTeam(teamId, userId) {
  try {
    const teamRef = doc(db, COLLECTION_NAME, teamId);
    await updateDoc(teamRef, { members: arrayRemove(userId) });
  } catch (error) {
    console.error("移除隊員失敗:", error);
    throw error;
  }
}

/**
 * 刪除隊伍
 * @param {string} teamId - 隊伍 ID
 * @returns {Promise<void>}
 */
export async function deleteTeam(teamId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, teamId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("刪除隊伍失敗:", error);
    throw error;
  }
}
