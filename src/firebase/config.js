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
  apiKey: "AIzaSyDOV34NoOB0CF30qMtsqrbKViW8hK8gk90",
  authDomain: "edgewalker-6c6ac.firebaseapp.com",
  projectId: "edgewalker-6c6ac",
  storageBucket: "edgewalker-6c6ac.appspot.com",
  messagingSenderId: "604632381184",
  appId: "1:604632381184:web:2b48a559958cedf18565e5",
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 初始化 Firestore 資料庫
export const db = getFirestore(app);

// 初始化 Firebase Authentication
export const auth = getAuth(app);

// 初始化 Firebase Storage（用於文件和錄音上傳）
export const storage = getStorage(app);
