// users.js - 用戶相關的 Firestore 操作

import { db } from "./config";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

const COLLECTION_NAME = "users";

/**
 * 建立或更新用戶資料
 * @param {string} userId - 用戶 ID (通常是 Firebase Auth UID)
 * @param {Object} userData - 用戶資料
 * @returns {Promise<void>}
 */
export async function createOrUpdateUser(userId, userData) {
  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      // 用戶已存在，更新資料
      await updateDoc(docRef, {
        ...userData,
        updatedAt: serverTimestamp(),
      });
    } else {
      // 新用戶，建立資料
      await setDoc(docRef, {
        email: userData.email || "",
        displayName: userData.displayName || "",
        school: userData.school || "",
        grade: userData.grade || "",
        role: userData.role || "debater",
        teams: userData.teams || [],
        profilePhoto: userData.profilePhoto || "",
        phoneNumber: userData.phoneNumber || "",
        isPublic: userData.isPublic !== undefined ? userData.isPublic : true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("建立/更新用戶失敗:", error);
    throw error;
  }
}

/**
 * 取得用戶資料
 * @param {string} userId - 用戶 ID
 * @returns {Promise<Object>} 用戶資料
 */
export async function getUser(userId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("取得用戶資料失敗:", error);
    throw error;
  }
}

/**
 * 更新用戶資料
 * @param {string} userId - 用戶 ID
 * @param {Object} updates - 要更新的資料
 * @returns {Promise<void>}
 */
export async function updateUser(userId, updates) {
  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("更新用戶資料失敗:", error);
    throw error;
  }
}

/**
 * 新增隊伍到用戶
 * @param {string} userId - 用戶 ID
 * @param {string} teamId - 隊伍 ID
 * @returns {Promise<void>}
 */
export async function addTeamToUser(userId, teamId) {
  try {
    const user = await getUser(userId);
    if (!user) {
      throw new Error("找不到該用戶");
    }
    const updatedTeams = [...(user.teams || []), teamId];
    await updateUser(userId, { teams: updatedTeams });
  } catch (error) {
    console.error("新增隊伍到用戶失敗:", error);
    throw error;
  }
}

/**
 * 從用戶移除隊伍
 * @param {string} userId - 用戶 ID
 * @param {string} teamId - 隊伍 ID
 * @returns {Promise<void>}
 */
export async function removeTeamFromUser(userId, teamId) {
  try {
    const user = await getUser(userId);
    if (!user) {
      throw new Error("找不到該用戶");
    }
    const updatedTeams = (user.teams || []).filter((id) => id !== teamId);
    await updateUser(userId, { teams: updatedTeams });
  } catch (error) {
    console.error("從用戶移除隊伍失敗:", error);
    throw error;
  }
}

/**
 * 透過 email 查找用戶
 * @param {string} email - 用戶 email
 * @returns {Promise<Object|null>} 用戶資料或 null
 */
export async function getUserByEmail(email) {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("email", "==", email.toLowerCase().trim()),
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    console.error("查找用戶失敗:", error);
    throw error;
  }
}
