// Firebase 配置檔案
// 從 .env 環境變數讀取，不要將敏感資訊寫死在程式碼中
// 請參考 .env.example 建立 .env 檔案

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// 從環境變數讀取 Firebase 配置
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 初始化 Firestore 資料庫
export const db = getFirestore(app);

// 初始化 Firebase Authentication
export const auth = getAuth(app);

// 初始化 Firebase Storage（用於文件和錄音上傳）
export const storage = getStorage(app);
