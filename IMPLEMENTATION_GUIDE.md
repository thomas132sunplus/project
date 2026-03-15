# 邊境之外0.0 - 實作指南

本文件提供各功能模組的實作細節與整合建議。

## 📋 目錄

1. [Firebase Auth 整合](#firebase-auth-整合)
2. [檔案上傳功能](#檔案上傳功能)
3. [即時聊天功能](#即時聊天功能)
4. [日曆系統整合](#日曆系統整合)
5. [視訊通話整合](#視訊通話整合)
6. [錄音與逐字稿](#錄音與逐字稿)

---

## Firebase Auth 整合

### 1. 啟用 Firebase Authentication

在 Firebase Console 中：

1. 選擇「Authentication」
2. 點擊「開始使用」
3. 啟用「電子郵件/密碼」登入方式

### 2. 安裝依賴

```bash
# Firebase SDK 已包含 Auth，無需額外安裝
```

### 3. 建立 Auth Context

建議建立 `src/contexts/AuthContext.jsx`：

```jsx
import { createContext, useContext, useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../firebase/config";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
```

### 4. 更新 Firebase Config

在 `src/firebase/config.js` 中匯出 auth：

```jsx
import { getAuth } from "firebase/auth";

// ... 現有的 config 和 db
export const auth = getAuth(app);
```

### 5. 建立登入/註冊元件

建議建立 `src/components/Login.jsx` 和 `src/components/Signup.jsx`。

---

## 檔案上傳功能

### 1. 啟用 Firebase Storage

在 Firebase Console 中：

1. 選擇「Storage」
2. 點擊「開始使用」
3. 選擇測試模式啟動

### 2. 建立上傳函式

在 `src/firebase/storage.js` 中：

```jsx
import { storage } from "./config";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

/**
 * 上傳檔案到 Firebase Storage
 * @param {File} file - 要上傳的檔案
 * @param {string} path - 儲存路徑（例：'teams/team_001/file.pdf'）
 * @returns {Promise<string>} 下載 URL
 */
export async function uploadFile(file, path) {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("上傳檔案失敗:", error);
    throw error;
  }
}

/**
 * 刪除檔案
 * @param {string} path - 檔案路徑
 */
export async function deleteFile(path) {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("刪除檔案失敗:", error);
    throw error;
  }
}
```

### 3. 在元件中使用

```jsx
import { uploadFile } from "../firebase/storage";

function FileUpload() {
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const path = `teams/${teamId}/${file.name}`;
      const url = await uploadFile(file, path);

      // 將 URL 存到 Firestore
      // ...

      alert("上傳成功！");
    } catch (error) {
      alert("上傳失敗");
    }
  };

  return <input type="file" onChange={handleFileUpload} />;
}
```

---

## 即時聊天功能

### 選項 1：使用 Firebase Realtime Database

#### 1. 啟用 Realtime Database

在 Firebase Console 中啟用 Realtime Database。

#### 2. 建立聊天函式

```jsx
import { database } from "./config";
import { ref, push, onValue, off } from "firebase/database";

// 發送訊息
export function sendMessage(teamId, message) {
  const messagesRef = ref(database, `messages/${teamId}`);
  return push(messagesRef, {
    ...message,
    timestamp: Date.now(),
  });
}

// 監聽訊息
export function listenToMessages(teamId, callback) {
  const messagesRef = ref(database, `messages/${teamId}`);
  onValue(messagesRef, (snapshot) => {
    const messages = [];
    snapshot.forEach((child) => {
      messages.push({ id: child.key, ...child.val() });
    });
    callback(messages);
  });

  // 返回取消監聽函式
  return () => off(messagesRef);
}
```

### 選項 2：整合外部服務

建議使用以下服務的嵌入式聊天：

- **Discord**：建立 Discord Server，使用 iframe 嵌入
- **LINE OpenChat**：提供連結讓使用者加入
- **Slack**：適合較正式的團隊溝通

---

## 日曆系統整合

### 建議使用 FullCalendar

#### 1. 安裝套件

```bash
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction
```

#### 2. 建立日曆元件

```jsx
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

export default function TeamCalendar({ teamId }) {
  const [events, setEvents] = useState([]);

  // 從 Firestore 載入事件
  useEffect(() => {
    // loadCalendarEvents(teamId).then(setEvents);
  }, [teamId]);

  const handleDateClick = (info) => {
    // 建立新事件
    const title = prompt("新增事件：");
    if (title) {
      // createCalendarEvent({ date: info.dateStr, title });
    }
  };

  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      locale="zh-tw"
      events={events}
      dateClick={handleDateClick}
      editable={true}
      selectable={true}
    />
  );
}
```

#### 3. Firestore 操作

建立 `src/firebase/calendar.js`：

```jsx
export async function createCalendarEvent(eventData) {
  return await addDoc(collection(db, "calendar_events"), {
    ...eventData,
    createdAt: serverTimestamp(),
  });
}

export async function getTeamEvents(teamId) {
  const q = query(
    collection(db, "calendar_events"),
    where("teamId", "==", teamId),
    orderBy("startTime", "asc"),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
```

---

## 視訊通話整合

### 選項 1：Jitsi Meet（免費、開源）

#### 1. 安裝套件

```bash
npm install @jitsi/react-sdk
```

#### 2. 使用範例

```jsx
import { JitsiMeeting } from "@jitsi/react-sdk";

export default function VideoCall({ roomName }) {
  return (
    <JitsiMeeting
      domain="meet.jit.si"
      roomName={roomName}
      configOverwrite={{
        startWithAudioMuted: true,
        disableModeratorIndicator: true,
        startScreenSharing: true,
        enableEmailInStats: false,
      }}
      interfaceConfigOverwrite={{
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
      }}
      userInfo={{
        displayName: "USER_NAME",
      }}
      getIFrameRef={(iframeRef) => {
        iframeRef.style.height = "600px";
      }}
    />
  );
}
```

### 選項 2：Agora（商業、更穩定）

#### 1. 註冊 Agora 帳號

前往 [Agora.io](https://www.agora.io/) 註冊並建立專案。

#### 2. 安裝 SDK

```bash
npm install agora-rtc-react
```

#### 3. 基本使用

```jsx
import AgoraRTC from "agora-rtc-sdk-ng";
import { useRTCClient } from "agora-rtc-react";

export default function AgoraVideoCall() {
  const client = useRTCClient(
    AgoraRTC.createClient({ codec: "vp8", mode: "rtc" }),
  );

  // ... 實作細節請參考 Agora 文件
}
```

### 選項 3：使用外部連結

最簡單的方式：提供 Google Meet、Zoom 等連結。

```jsx
export default function VideoCallLink({ meetingLink }) {
  return (
    <div>
      <a
        href={meetingLink}
        target="_blank"
        rel="noopener noreferrer"
        className="px-6 py-3 bg-blue-600 text-white rounded"
      >
        加入視訊會議
      </a>
    </div>
  );
}
```

---

## 錄音與逐字稿

### 1. 使用 MediaRecorder API 錄音

```jsx
import { useState, useRef } from "react";

export default function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        audioChunks.current = [];

        // 上傳到 Firebase Storage
        // const url = await uploadFile(audioBlob, `recordings/${Date.now()}.webm`);

        // 可選：發送到語音轉文字服務
        // await transcribeAudio(audioBlob);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("錄音失敗:", error);
      alert("無法存取麥克風");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div>
      {isRecording ? (
        <button onClick={stopRecording}>⏹ 停止錄音</button>
      ) : (
        <button onClick={startRecording}>🎙️ 開始錄音</button>
      )}
    </div>
  );
}
```

### 2. 整合 Google Speech-to-Text

#### 後端 API（需要後端服務）

```javascript
// 這需要在後端執行（Node.js）
const speech = require("@google-cloud/speech");
const client = new speech.SpeechClient();

async function transcribeAudio(audioBuffer) {
  const audio = {
    content: audioBuffer.toString("base64"),
  };

  const config = {
    encoding: "WEBM_OPUS",
    sampleRateHertz: 48000,
    languageCode: "zh-TW",
  };

  const request = {
    audio: audio,
    config: config,
  };

  const [response] = await client.recognize(request);
  const transcription = response.results
    .map((result) => result.alternatives[0].transcript)
    .join("\n");

  return transcription;
}
```

#### 替代方案：使用 Web Speech API（瀏覽器內建）

```jsx
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.lang = "zh-TW";
recognition.continuous = true;

recognition.onresult = (event) => {
  const transcript = Array.from(event.results)
    .map((result) => result[0].transcript)
    .join("");
  console.log("逐字稿:", transcript);
};

recognition.start(); // 開始辨識
recognition.stop(); // 停止辨識
```

---

## 📚 相關資源

- [Firebase Auth 文件](https://firebase.google.com/docs/auth)
- [Firebase Storage 文件](https://firebase.google.com/docs/storage)
- [FullCalendar 文件](https://fullcalendar.io/docs)
- [Jitsi Meet 文件](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-react-sdk)
- [Agora 文件](https://docs.agora.io/en/)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

---

**最後更新**：2026 年 2 月 21 日
