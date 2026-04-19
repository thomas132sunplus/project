# Admin 腳本憑證

需要執行 scripts 目錄中的 Firebase Admin 腳本時，請不要把 service account 私鑰放進版本庫。

Windows PowerShell 範例：

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
node scripts/fixMissingInviteCodes.admin.js
```

也可改用 `FIREBASE_SERVICE_ACCOUNT_PATH` 指向同一份 JSON 憑證檔。

# 邊境之外0.0 - 辯論活動媒合平台

一個專為台灣高中辯論社設計的完整辯論活動平台，整合盃賽資訊、隊伍協作、練習賽媒合與線上比賽工具。

## 📋 專案簡介

「邊境之外0.0」是一個 MVP 等級的辯論活動媒合平台，由台灣高中辯論社長設計。整合辯論比賽資訊、隊伍討論、跨校練習賽媒合、練習賽進行工具與個人資料管理，成為一個完整的辯論活動媒合平台。

## ✨ 核心功能

### 1. 盃賽資訊區（首頁）

- 📋 **盃賽列表**：查看所有辯論盃賽的卡片式展示
- 📝 **完整資訊**：盃賽名稱、日期、地點、報名費、保證金、辯題、參賽隊伍等
- ✏️ **彈性編輯**：可先建立空白盃賽，後續補充資料
- 🏆 **循環圖展示**：支援圖片或連結形式的參賽隊伍循環圖

### 2. 隊伍討論區

- 💬 **聊天區**：隊伍即時訊息交流（建議整合外部服務）
- 📁 **資料區**：檔案上傳與管理
- 📅 **時間整理系統**：
  - 個人日曆：標記可參加時間
  - 隊伍日曆：即時顯示可行時間與出席名單
  - 顏色區分不同活動類型與狀態
- 📨 **練習賽邀請區**：管理收到與發出的練習賽邀請
- 🎙️ **錄音與逐字稿**：存放隊伍的錄音檔案
- 📞 **通話/視訊**：整合通話功能（建議使用 WebRTC 服務）

### 3. 跨校練習賽媒合

- 🎯 **選擇盃賽**：從盃賽列表選擇目標盃賽
- 👥 **查看隊伍**：瀏覽該盃賽的參賽隊伍
- 📬 **發送邀請**：邀請其他隊伍進行練習賽
- 💬 **練習賽聊天室**：邀請接受後建立專屬聊天室協調時間
- 📋 **賽帖生成**：確定時間與賽程設定

### 4. 練習賽房間（線上比賽工具）

- ⏱️ **辯論計時器**：
  - 支援奧瑞岡 3-3-3、4-4-4、新加坡賽制
  - 自訂賽制功能
  - 階段導航與計時控制
- 🎥 **參與者視窗**：顯示所有參與者（建議整合 WebRTC）
- 🎙️ **錄音功能**：比賽過程錄音與逐字稿生成
- 📁 **資料存放區**：上傳與分享辯論資料
- 📝 **裁單存放區**：裁判講評存放

### 5. 個人主頁

- 👤 **個人資料**：姓名、學校、年級、聯絡方式
- 🔒 **隱私設定**：公開或私密個人頁面
- 👥 **所屬隊伍**：快速進入隊伍討論區
- 🎙️ **個人錄音/錄影**：管理個人的錄音與錄影檔案
- 📅 **個人日曆**：標記可參加的時間

## 🛠️ 技術架構

- **前端框架**：React 18 + Vite
- **程式語言**：JavaScript（非 TypeScript）
- **樣式框架**：Tailwind CSS
- **路由管理**：React Router DOM
- **後端服務**：Firebase
  - **Firestore**：資料庫
  - **Auth**：使用者認證（待整合）
  - **Storage**：檔案儲存（待整合）

## 📁 專案結構

```
邊境之外0.0/
├── src/
│   ├── components/              # React 元件
│   │   ├── Navbar.jsx           # 導航列
│   │   ├── TournamentList.jsx   # 盃賽列表
│   │   ├── TournamentDetail.jsx # 盃賽詳細頁
│   │   ├── TournamentForm.jsx   # 建立盃賽表單
│   │   ├── TournamentCard.jsx   # 盃賽卡片
│   │   ├── MyTeams.jsx          # 我的隊伍列表
│   │   ├── TeamDiscussion.jsx   # 隊伍討論區
│   │   ├── PracticeMatching.jsx # 練習賽媒合
│   │   ├── MatchRoom.jsx        # 練習賽房間
│   │   ├── DebateTimer.jsx      # 辯論計時器
│   │   ├── UserProfile.jsx      # 個人主頁
│   │   └── Activity*.jsx        # 舊版活動頁面（向後兼容）
│   ├── firebase/                # Firebase 相關設定
│   │   ├── config.js            # Firebase 配置
│   │   ├── tournaments.js       # 盃賽操作
│   │   ├── teams.js             # 隊伍操作
│   │   ├── users.js             # 用戶操作
│   │   ├── practiceMatches.js   # 練習賽操作
│   │   ├── invitations.js       # 邀請操作
│   │   └── activities.js        # 舊版活動操作
│   ├── App.jsx                  # 主應用程式
│   ├── main.jsx                 # 應用程式入口
│   └── index.css                # 全域樣式
├── FIRESTORE_SCHEMA.md          # Firestore 資料結構設計
├── package.json                 # 專案依賴
└── README.md                    # 本文件
```

## 🚀 開始使用

### 1. 安裝依賴套件

首先，在專案目錄中安裝所需的 npm 套件：

```bash
npm install
```

### 2. 設定 Firebase

#### 2.1 建立 Firebase 專案

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 點擊「新增專案」
3. 輸入專案名稱（例如：邊境之外0.0）
4. 依照指示完成專案建立

#### 2.2 建立 Firestore 資料庫

1. 在 Firebase Console 左側選單，點擊「Firestore Database」
2. 點擊「建立資料庫」
3. 選擇「以測試模式啟動」（開發階段使用）
4. 選擇資料中心位置（建議選擇 asia-east1 台灣）

#### 2.3 取得 Firebase 配置

1. 在 Firebase Console 中，點擊專案設定（齒輪圖示）
2. 選擇「一般」標籤
3. 向下捲動到「你的應用程式」區塊
4. 點擊「</>」（Web）圖示
5. 註冊應用程式
6. 複製 `firebaseConfig` 設定

#### 2.4 更新專案中的 Firebase 配置

開啟 `src/firebase/config.js`，將你的 Firebase 配置貼上：

```javascript
const firebaseConfig = {
  apiKey: "你的 API Key",
  authDomain: "你的 Auth Domain",
  projectId: "你的 Project ID",
  storageBucket: "你的 Storage Bucket",
  messagingSenderId: "你的 Messaging Sender ID",
  appId: "你的 App ID",
};
```

### 3. 啟動開發伺服器

```bash
npm run dev
```

專案會在 `http://localhost:5173` 啟動

### 4. 建立第一個盃賽

1. 開啟瀏覽器訪問 `http://localhost:5173`
2. 點擊右上角「+ 建立盃賽」
3. 填寫盃賽資訊（可先只填名稱，其他資訊之後補充）
4. 點擊「建立盃賽」
5. 你會被導向到盃賽詳細頁

## 📊 Firestore 資料結構

詳細的資料結構設計請參考 [FIRESTORE_SCHEMA.md](FIRESTORE_SCHEMA.md)

### 主要 Collections

- **tournaments**：盃賽資訊
- **teams**：隊伍資訊
- **users**：用戶資料
- **practice_matches**：練習賽記錄
- **invitations**：練習賽邀請
- **team_messages**：隊伍聊天訊息
- **match_rooms**：練習賽房間
- **calendar_events**：日曆事件

## 🎯 路由結構

- `/` - 盃賽資訊區（首頁）
- `/tournament/:id` - 盃賽詳細頁
- `/tournament/create` - 建立新盃賽
- `/teams` - 我的隊伍列表
- `/team/:id` - 隊伍討論區
- `/practice-matching` - 練習賽媒合
- `/match-room/:id` - 練習賽房間
- `/profile` - 個人主頁

## 🎨 Tailwind CSS 顏色系統

- **藍色**：主要按鈕、正方、連結
- **紅色**：反方、錯誤訊息、刪除
- **綠色**：成功、確認、可用時間
- **黃色**：警告、暫停
- **灰色**：中性、已過時間

## 📝 程式碼說明

### 主要元件

#### TournamentList.jsx & TournamentDetail.jsx

- 盃賽列表與詳細頁
- 支援所有盃賽欄位（可為空）
- 顯示循環圖、簡章連結等

#### TeamDiscussion.jsx

- 隊伍討論區主頁面
- Tab 切換不同功能區塊
- 聊天、資料、日曆、邀請等功能

#### PracticeMatching.jsx

- 選擇盃賽 → 查看隊伍 → 發送邀請
- 支援循環圖展示

#### MatchRoom.jsx & DebateTimer.jsx

- 線上辯論工具
- 計時器支援多種賽制
- 階段導航與控制

#### UserProfile.jsx

- 個人資料管理
- 隊伍列表快速連結
- 錄音/錄影管理

### Firebase 操作函式

#### tournaments.js

- `createTournament(data, userId)` - 建立盃賽
- `getAllTournaments()` - 取得所有盃賽
- `getTournament(id)` - 取得單一盃賽
- `updateTournament(id, updates)` - 更新盃賽
- `deleteTournament(id)` - 刪除盃賽

#### teams.js

- `createTeam(data)` - 建立隊伍
- `getTeam(id)` - 取得隊伍資訊
- `getUserTeams(userId)` - 取得用戶的所有隊伍
- `getTournamentTeams(tournamentId)` - 取得盃賽的所有隊伍

#### users.js

- `createOrUpdateUser(userId, data)` - 建立/更新用戶
- `getUser(userId)` - 取得用戶資料
- `updateUser(userId, updates)` - 更新用戶資料

#### practiceMatches.js

- `createPracticeMatch(data, userId)` - 建立練習賽
- `getTeamMatches(teamId)` - 取得隊伍的練習賽
- `confirmPracticeMatch(matchId)` - 確認練習賽

#### invitations.js

- `createInvitation(data)` - 建立邀請
- `getTeamInvitations(teamId)` - 取得收到的邀請
- `acceptInvitation(invitationId, chatRoomId)` - 接受邀請

## 🔧 建置專案

```bash
npm run build
```

建置完成的檔案會在 `dist/` 資料夾中

## ⚠️ 注意事項

1. **Firebase 規則**：目前使用測試模式，正式上線前需要設定適當的安全規則（參考 FIRESTORE_SCHEMA.md）
2. **環境變數**：建議將 Firebase 配置移到環境變數（使用 `.env` 檔案）
3. **使用者認證**：目前使用假的用戶 ID（`demo_user`），需要整合 Firebase Auth
4. **檔案上傳**：需要整合 Firebase Storage 實現檔案上傳功能
5. **即時功能**：聊天、通話、視訊建議使用外部服務整合

## 🔐 Firebase 安全規則建議

詳細的安全規則請參考 [FIRESTORE_SCHEMA.md](FIRESTORE_SCHEMA.md)

基本規則範例：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // tournaments - 所有人可讀，需登入才能寫
    match /tournaments/{tournamentId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
                               resource.data.createdBy == request.auth.uid;
    }

    // teams - 只有隊員可寫
    match /teams/{teamId} {
      allow read: if true;
      allow write: if request.auth != null &&
                     request.auth.uid in resource.data.members;
    }

    // users - 用戶只能讀寫自己的資料
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🚀 待整合功能

### 高優先級

- [ ] **Firebase Auth**：使用者登入/註冊系統
- [ ] **Firebase Storage**：檔案上傳與管理
- [ ] **即時聊天**：使用 Firebase Realtime Database 或整合外部服務
- [ ] **日曆功能**：整合 FullCalendar 或 React Big Calendar

### 中優先級

- [ ] **WebRTC 視訊**：整合 Agora、Twilio 或 Jitsi Meet
- [ ] **錄音功能**：使用 MediaRecorder API
- [ ] **語音轉文字**：整合 Google Speech-to-Text
- [ ] **通知系統**：Firebase Cloud Messaging

### 低優先級

- [ ] 活動搜尋與篩選
- [ ] 裁判評分系統
- [ ] 資料統計與分析
- [ ] 匯出功能（PDF、Excel）

## 🎯 未來可擴充功能

- [ ] 使用者權限管理（管理員、隊長、隊員）
- [ ] 隊伍建立與加入申請系統
- [ ] 盃賽報名系統
- [ ] 賽程自動排程
- [ ] 積分排行榜
- [ ] 裁判配對系統
- [ ] 行動版 App（React Native）

## 🤝 適合的學習者

這個專案特別適合：

- 正在學習 React 的初學者
- 想要實作 Firebase 整合的開發者
- 需要建立辯論管理系統的學校社團
- 想要了解完整前端專案架構的學生
- 對辯論活動管理有興趣的開發者

## 📚 學習資源

- [React 官方文件](https://react.dev/)
- [Firebase 官方文件](https://firebase.google.com/docs)
- [Tailwind CSS 文件](https://tailwindcss.com/docs)
- [React Router 文件](https://reactrouter.com/)
- [Firestore 入門指南](https://firebase.google.com/docs/firestore/quickstart)

## 💡 使用提示

### 盃賽管理

- 可以先建立空白盃賽，之後再補充資訊
- 所有欄位都可以為空（除了盃賽名稱）
- 辯題可以用「、」分隔多個題目

### 隊伍協作

- 建議將 LINE、Discord 等外部連結加入隊伍聊天區
- 使用日曆功能統整所有隊員的可用時間
- 練習賽邀請接受後會建立獨立聊天室

### 練習賽房間

- 計時器支援多種賽制，可自訂時間
- 建議使用外部視訊服務（Google Meet、Zoom 等）
- 錄音功能需要整合後才能使用

## 📄 授權

此專案為教育用途，可自由使用與修改。

---

**建立者**：為台灣高中辯論社設計
**最後更新**：2026 年 2 月 21 日
