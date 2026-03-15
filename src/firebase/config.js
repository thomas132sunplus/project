// Firebase 配置檔案
// 使用前請先到 Firebase Console 建立專案並取得配置資訊
// https://console.firebase.google.com/

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// 你的 Firebase 配置
// 請到 Firebase Console > 專案設定 > 一般 > 你的應用程式 > SDK 設定和配置
// 複製配置並替換以下內容
const firebaseConfig = {
  apiKey: "AIzaSyBTlm59ttdCFiyvuGsrvukel8XhfxpOGg0",
  authDomain: "edgewalker-beyond.firebaseapp.com",
  projectId: "edgewalker-beyond",
  storageBucket: "edgewalker-beyond.firebasestorage.app",
  messagingSenderId: "162691315113",
  appId: "1:162691315113:web:63a2d2583b1c006e6500b8",
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 初始化 Firestore 資料庫
export const db = getFirestore(app);

// 初始化 Firebase Authentication
export const auth = getAuth(app);

// 初始化 Firebase Storage（用於文件和錄音上傳）
export const storage = getStorage(app);

export default app;
