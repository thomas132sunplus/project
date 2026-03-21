# 邊境之外0.0 - 功能總覽與快速開始

## 🎯 專案概況

「邊境之外0.0」是一個完整的辯論活動媒合平台，目前已實作 5 大核心模組：

✅ **盃賽資訊區** - 管理所有辯論盃賽
✅ **隊伍討論區** - 隊伍協作與時間管理  
✅ **練習賽媒合** - 跨校練習賽邀請系統
✅ **練習賽房間** - 線上辯論工具與計時器
✅ **個人主頁** - 使用者資料與檔案管理

## 📊 目前狀態

### ✅ 已完成功能

#### 1. 盃賽管理系統

- [x] 盃賽列表展示（卡片式）
- [x] 盃賽詳細頁面
- [x] 建立/編輯/刪除盃賽
- [x] 支援所有欄位（可為空）
- [x] 循環圖展示

#### 2. 隊伍討論區

- [x] 我的隊伍列表
- [x] 隊伍討論區主頁面
- [x] Tab 切換介面
- [x] 聊天區佔位
- [x] 資料區佔位
- [x] 日曆區佔位
- [x] 練習賽邀請區
- [x] 錄音區佔位
- [x] 通話/視訊區佔位

#### 3. 練習賽媒合

- [x] 選擇盃賽
- [x] 查看參賽隊伍
- [x] 發送練習賽邀請
- [x] 循環圖顯示

#### 4. 練習賽房間

- [x] 辯論計時器（完整功能）
- [x] 支援多種賽制
- [x] 階段導航
- [x] 參與者視窗佔位
- [x] 錄音區佔位
- [x] 資料存放區佔位
- [x] 裁單存放區佔位

#### 5. 個人主頁

- [x] 個人資料顯示/編輯
- [x] 所屬隊伍列表
- [x] 錄音/錄影列表佔位
- [x] 個人日曆佔位

#### 6. Firebase 整合

- [x] Firestore 完整資料結構設計
- [x] tournaments 操作函式
- [x] teams 操作函式
- [x] users 操作函式
- [x] practiceMatches 操作函式
- [x] invitations 操作函式

### ⏳ 待整合功能

這些功能已有佔位設計，但需要實際整合外部服務：

#### 高優先級

- [ ] **Firebase Auth** - 使用者登入/註冊
- [ ] **Firebase Storage** - 檔案上傳
- [ ] **日曆功能** - 整合 FullCalendar
- [ ] **即時聊天** - Firebase Realtime Database 或外部服務

#### 中優先級

- [ ] **視訊通話** - Jitsi Meet / Agora
- [ ] **錄音功能** - MediaRecorder API
- [ ] **逐字稿** - Google Speech-to-Text
- [ ] **通知系統** - Firebase Cloud Messaging

## 🚀 快速開始

### 1. 安裝專案

```bash
# 克隆專案（或下載）
cd 邊境之外0.0

# 安裝依賴
npm install
```

### 2. 設定 Firebase

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 建立新專案
3. 啟用 Firestore（測試模式）
4. 複製 Firebase 配置
5. 更新 `src/firebase/config.js`

### 3. 啟動開發伺服器

```bash
npm run dev
```

瀏覽器開啟 `http://localhost:5173`

### 4. 測試功能

#### 建立第一個盃賽

1. 點擊右上角「+ 建立盃賽」
2. 填寫盃賽名稱（必填）
3. 其他欄位可選填
4. 點擊「建立盃賽」

#### 查看隊伍（需要先有資料）

1. 點擊導航列「我的隊伍」
2. 目前會顯示空列表
3. 需要先在 Firestore 手動建立隊伍資料

#### 練習賽媒合

1. 點擊「練習賽媒合」
2. 選擇一個盃賽
3. 查看參賽隊伍（需要先建立隊伍並加入盃賽）

#### 練習賽房間

1. 直接訪問 `/match-room/test`
2. 測試辯論計時器功能
3. 切換不同賽制
4. 操作計時器控制

## 📂 專案結構概覽

```
邊境之外0.0/
├── src/
│   ├── components/          # 17+ 個 React 元件
│   │   ├── Tournament*.jsx  # 盃賽相關（4個）
│   │   ├── Team*.jsx        # 隊伍相關（2個）
│   │   ├── Practice*.jsx    # 練習賽相關（1個）
│   │   ├── Match*.jsx       # 比賽房間相關（2個）
│   │   ├── User*.jsx        # 用戶相關（1個）
│   │   └── ...              # 其他元件
│   ├── firebase/            # Firebase 操作（6個檔案）
│   │   ├── config.js        # Firebase 配置
│   │   ├── tournaments.js   # 盃賽 CRUD
│   │   ├── teams.js         # 隊伍 CRUD
│   │   ├── users.js         # 用戶 CRUD
│   │   ├── practiceMatches.js
│   │   └── invitations.js
│   ├── App.jsx              # 路由設定
│   └── main.jsx             # 入口
├── FIRESTORE_SCHEMA.md      # 資料結構設計
├── IMPLEMENTATION_GUIDE.md  # 實作指南
└── README.md                # 專案說明
```

## 🎨 元件清單

### 盃賽相關（4個元件）

- `TournamentList.jsx` - 盃賽列表頁
- `TournamentDetail.jsx` - 盃賽詳細頁
- `TournamentForm.jsx` - 建立盃賽表單
- `TournamentCard.jsx` - 盃賽卡片元件

### 隊伍相關（2個元件）

- `MyTeams.jsx` - 我的隊伍列表
- `TeamDiscussion.jsx` - 隊伍討論區（含 6 個子區塊）

### 練習賽相關（3個元件）

- `PracticeMatching.jsx` - 練習賽媒合頁面
- `MatchRoom.jsx` - 練習賽房間（含 5 個子區塊）
- `DebateTimer.jsx` - 辯論計時器元件

### 用戶相關（1個元件）

- `UserProfile.jsx` - 個人主頁（含 3 個子區塊）

### 共用元件（1個元件）

- `Navbar.jsx` - 導航列

### 舊版元件（向後兼容，4個元件）

- `ActivityList.jsx`
- `ActivityDetail.jsx`
- `ActivityForm.jsx`
- `ActivityCard.jsx`

## 🔥 核心功能演示

### 1. 辯論計時器

辯論計時器是最完整的功能：

- ✅ 支援 3 種賽制 + 自訂
- ✅ 10 個辯論階段完整流程
- ✅ 開始/暫停/重置
- ✅ 階段導航
- ✅ 時間警示（最後 30 秒）
- ✅ 顏色區分正方/反方

訪問 `/match-room/test` 即可測試！

### 2. 盃賽管理

- ✅ 支援 15+ 個欄位
- ✅ 所有欄位可選填
- ✅ 匯款資訊結構化
- ✅ 辯題支援多個（用、分隔）
- ✅ 循環圖支援圖片或連結

### 3. Firebase CRUD

所有 Firebase 操作都已封裝成易用的函式：

```javascript
// 盃賽操作
import { createTournament, getAllTournaments } from "./firebase/tournaments";

// 隊伍操作
import { createTeam, getUserTeams } from "./firebase/teams";

// 用戶操作
import { getUser, updateUser } from "./firebase/users";
```

## 📝 下一步建議

### 立即可做

1. **整合 Firebase Auth**（優先）
   - 參考 `IMPLEMENTATION_GUIDE.md`
   - 更新所有使用 `demo_user` 的地方

2. **建立隊伍管理介面**
   - 建立隊伍表單
   - 加入/離開隊伍功能

3. **整合日曆套件**
   - 安裝 FullCalendar
   - 實作 calendar_events 操作

### 需要後端支援

- 語音轉文字（Google Speech-to-Text）
- 檔案處理（需要 Cloud Functions）

### 需要外部服務

- 視訊通話（Jitsi / Agora / Zoom）
- 即時聊天（可考慮外部平台）

## 💡 使用建議

### 開發時

- 使用 Firestore 測試模式
- 手動在 Firestore Console 建立測試資料
- 查看瀏覽器 Console 的錯誤訊息

### 部署前

- 設定 Firebase Security Rules（參考 `FIRESTORE_SCHEMA.md`）
- 整合 Firebase Auth
- 更新環境變數
- 建置並測試 Production 版本

## 📚 文件說明

- **README.md** - 專案總覽、安裝指南、功能介紹
- **FIRESTORE_SCHEMA.md** - 完整的資料結構設計與安全規則
- **IMPLEMENTATION_GUIDE.md** - 各功能模組的實作細節
- **FEATURES_OVERVIEW.md** - 本文件，功能總覽與快速開始

## ❓ 常見問題

### Q: 為什麼隊伍列表是空的？

A: 需要先在 Firestore Console 手動建立隊伍資料，或實作「建立隊伍」功能。

### Q: 如何測試練習賽媒合？

A: 需要先建立盃賽，然後建立隊伍並將隊伍加入盃賽（在 Firestore 中）。

### Q: 計時器可以自訂賽制嗎？

A: 可以！在 `DebateTimer.jsx` 中的 `FORMATS` 物件新增自訂賽制。

### Q: 如何整合真實的視訊功能？

A: 參考 `IMPLEMENTATION_GUIDE.md` 中的「視訊通話整合」章節。

## 🎉 總結

這個專案已經實作了「邊境之外0.0」的核心架構和主要功能：

- ✅ 5 大核心頁面完整實作
- ✅ 17+ 個 React 元件
- ✅ Firestore 完整資料結構設計
- ✅ 6 個 Firebase 操作模組
- ✅ 辯論計時器核心功能
- ✅ 響應式設計（Tailwind CSS）
- ✅ 清晰的程式碼結構

下一步只需要：

1. 整合 Firebase Auth
2. 實作檔案上傳
3. 整合日曆套件
4. 選擇並整合視訊/聊天服務

即可成為一個完整可用的辦論活動管理平台！

---

**最後更新**：2026 年 2 月 21 日
**開發狀態**：MVP 已完成，待整合外部服務
