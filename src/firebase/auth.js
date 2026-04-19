// auth.js - Firebase Authentication 相關操作

import { auth, db } from "./config";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged,
  deleteUser,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { createOrUpdateUser } from "./users";

/**
 * 註冊新用戶
 * @param {string} email - Email
 * @param {string} password - 密碼
 * @param {string} displayName - 顯示名稱
 * @param {Object} additionalData - 額外資料（學校、年級等）
 * @returns {Promise<Object>} 用戶資料
 */
export async function registerUser(
  email,
  password,
  displayName,
  additionalData = {},
) {
  try {
    // 創建 Firebase Auth 帳號
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    // 更新顯示名稱
    await updateProfile(user, {
      displayName: displayName,
    });

    // 在 Firestore 建立用戶資料
    await createOrUpdateUser(user.uid, {
      email: email,
      displayName: displayName,
      role: "debater",
      isPublic: true,
      ...additionalData,
    });

    return {
      uid: user.uid,
      email: user.email,
      displayName: displayName,
    };
  } catch (error) {
    console.error("註冊失敗:", error);
    throw error;
  }
}

/**
 * 用戶登入
 * @param {string} email - Email
 * @param {string} password - 密碼
 * @returns {Promise<Object>} 用戶資料
 */
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: userCredential.user.displayName,
    };
  } catch (error) {
    console.error("登入失敗:", error);
    throw error;
  }
}

/**
 * 用戶登出
 * @returns {Promise<void>}
 */
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("登出失敗:", error);
    throw error;
  }
}

/**
 * 重設密碼
 * @param {string} email - Email
 * @returns {Promise<void>}
 */
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("發送重設密碼郵件失敗:", error);
    throw error;
  }
}

/**
 * 監聽認證狀態變化
 * @param {Function} callback - 回調函數
 * @returns {Function} 取消監聽的函數
 */
export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * 刪除帳號（Firebase Auth + Firestore 用戶資料）
 */
export async function deleteAccount(userId) {
  try {
    const { deleteDoc, doc } = await import("firebase/firestore");
    await deleteDoc(doc(db, "users", userId));
    await deleteUser(auth.currentUser);
  } catch (error) {
    console.error("刪除帳號失敗:", error);
    throw error;
  }
}

/**
 * 取得當前用戶
 * @returns {Object|null} 當前用戶
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * 取得當前用戶 ID
 * @returns {string|null} 用戶 ID
 */
export function getCurrentUserId() {
  return auth.currentUser?.uid || null;
}
