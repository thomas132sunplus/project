// Firebase 配置範例檔案
// 這是一個範例檔案，顯示如何正確配置 Firebase
// 請複製此檔案並重新命名為 config.js，然後填入你的 Firebase 配置

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase 配置物件
// 請到 Firebase Console 取得你的配置資訊
const firebaseConfig = {
  // 你的 API Key（在 Firebase Console > 專案設定中找到）
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",

  // 你的 Auth Domain（通常是 your-project-id.firebaseapp.com）
  authDomain: "your-project-id.firebaseapp.com",

  // 你的 Project ID
  projectId: "your-project-id",

  // 你的 Storage Bucket
  storageBucket: "your-project-id.appspot.com",

  // 你的 Messaging Sender ID
  messagingSenderId: "123456789012",

  // 你的 App ID
  appId: "1:123456789012:web:abcdef1234567890abcdef",
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 初始化 Firestore 資料庫
export const db = getFirestore(app);

// 初始化 Firebase Authentication
export const auth = getAuth(app);
