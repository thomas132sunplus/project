# 專案結構說明

## 📂 完整檔案結構

```
邊境之外0.0/
│
├── 📁 src/                          # 原始碼資料夾
│   │
│   ├── 📁 components/               # React 元件資料夾
│   │   ├── Navbar.jsx              # 導航列元件
│   │   ├── ActivityCard.jsx        # 活動卡片元件（顯示在列表中）
│   │   ├── ActivityList.jsx        # 活動列表頁元件
│   │   ├── ActivityDetail.jsx      # 活動詳細頁元件
│   │   └── ActivityForm.jsx        # 建立活動表單元件
│   │
│   ├── 📁 firebase/                 # Firebase 設定資料夾
│   │   ├── config.js               # Firebase 初始化配置
│   │   ├── config.example.js       # 配置範例檔案
│   │   └── activities.js           # Firestore 資料庫操作函式
│   │
│   ├── App.jsx                     # 主應用程式（路由設定）
│   ├── main.jsx                    # 應用程式入口點
│   └── index.css                   # 全域 CSS 樣式（包含 Tailwind）
│
├── 📁 public/                       # 靜態資源資料夾（目前空的）
│
├── index.html                      # HTML 模板
├── package.json                    # NPM 套件設定
├── package-lock.json               # NPM 套件鎖定檔案
├── vite.config.js                  # Vite 建置工具設定
├── tailwind.config.js              # Tailwind CSS 設定
├── postcss.config.js               # PostCSS 設定
├── .gitignore                      # Git 忽略檔案設定
├── .env.example                    # 環境變數範例
├── README.md                       # 專案說明文件
└── QUICK_START.md                  # 快速開始指南
```

## 📄 檔案說明

### 配置檔案

| 檔案                 | 說明                                |
| -------------------- | ----------------------------------- |
| `package.json`       | 定義專案依賴套件和執行腳本          |
| `vite.config.js`     | Vite 開發伺服器和建置設定           |
| `tailwind.config.js` | Tailwind CSS 客製化設定             |
| `postcss.config.js`  | PostCSS 處理器設定（Tailwind 需要） |
| `.gitignore`         | Git 版本控制忽略檔案清單            |

### HTML 模板

| 檔案         | 說明                   |
| ------------ | ---------------------- |
| `index.html` | 應用程式的 HTML 入口點 |

### 原始碼

#### 主要檔案

| 檔案            | 說明                                  |
| --------------- | ------------------------------------- |
| `src/main.jsx`  | React 應用程式的入口點，渲染 App 元件 |
| `src/App.jsx`   | 主應用程式元件，設定路由              |
| `src/index.css` | 全域樣式，引入 Tailwind CSS           |

#### 元件

| 元件                 | 功能                 | 使用的頁面                 |
| -------------------- | -------------------- | -------------------------- |
| `Navbar.jsx`         | 頂部導航列           | 所有頁面                   |
| `ActivityCard.jsx`   | 活動摘要卡片         | 活動列表頁                 |
| `ActivityList.jsx`   | 顯示所有活動         | 首頁 (/)                   |
| `ActivityDetail.jsx` | 顯示單一活動詳細資訊 | 活動詳細頁 (/activity/:id) |
| `ActivityForm.jsx`   | 建立新活動的表單     | 建立活動頁 (/create)       |

#### Firebase

| 檔案            | 功能                             |
| --------------- | -------------------------------- |
| `config.js`     | Firebase 初始化，匯出 db 和 auth |
| `activities.js` | 活動相關的 Firestore CRUD 操作   |

## 🔄 資料流程

### 1. 查看活動列表

```
使用者訪問首頁 (/)
    ↓
App.jsx 載入 ActivityList 元件
    ↓
ActivityList.jsx 使用 useEffect 呼叫 getAllActivities()
    ↓
activities.js 中的 getAllActivities() 從 Firestore 取得資料
    ↓
資料回傳給 ActivityList，更新 state
    ↓
ActivityList 渲染多個 ActivityCard 元件
    ↓
使用者看到活動列表
```

### 2. 查看活動詳細資訊

```
使用者點擊活動卡片
    ↓
React Router 導航到 /activity/:id
    ↓
App.jsx 載入 ActivityDetail 元件
    ↓
ActivityDetail 從 URL 取得活動 ID
    ↓
呼叫 getActivityById(id) 從 Firestore 取得資料
    ↓
資料回傳並渲染活動詳細頁面
```

### 3. 建立新活動

```
使用者點擊「+ 建立活動」
    ↓
React Router 導航到 /create
    ↓
App.jsx 載入 ActivityForm 元件
    ↓
使用者填寫表單
    ↓
使用者點擊「建立活動」
    ↓
ActivityForm 呼叫 createActivity(formData)
    ↓
activities.js 中的 createActivity() 將資料寫入 Firestore
    ↓
Firestore 回傳新建立的活動 ID
    ↓
使用 navigate() 導航到新活動的詳細頁
```

## 🎨 元件架構

```
App
├── Navbar（所有頁面共用）
│
├── Route: /
│   └── ActivityList
│       └── ActivityCard (多個)
│
├── Route: /activity/:id
│   └── ActivityDetail
│
└── Route: /create
    └── ActivityForm
```

## 📊 State 管理

本專案使用 React 的 `useState` 和 `useEffect` 進行簡單的狀態管理：

### ActivityList 狀態

- `activities`: 活動陣列
- `loading`: 載入中標記
- `error`: 錯誤訊息

### ActivityDetail 狀態

- `activity`: 單一活動物件
- `loading`: 載入中標記
- `error`: 錯誤訊息

### ActivityForm 狀態

- `formData`: 表單資料物件
- `loading`: 送出中標記
- `error`: 錯誤訊息

## 🔌 Firebase 整合

### Firestore Collection: activities

每個活動文件的結構：

```javascript
{
  id: "auto-generated-id",
  title: "活動名稱",
  type: "比賽 | 練習賽 | 社內討論 | 跨校",
  date: "2026-02-10",
  time: "19:00",
  format: "議會制",
  description: "活動說明...",
  links: {
    line: "https://line.me/...",
    discord: "https://discord.gg/...",
    meeting: "https://teams.microsoft.com/..."
  },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## 🎯 路由設定

| 路徑            | 元件           | 說明                        |
| --------------- | -------------- | --------------------------- |
| `/`             | ActivityList   | 活動列表首頁                |
| `/activity/:id` | ActivityDetail | 活動詳細頁（:id 為活動 ID） |
| `/create`       | ActivityForm   | 建立新活動表單              |

## 🛠️ NPM 指令

| 指令              | 說明             |
| ----------------- | ---------------- |
| `npm install`     | 安裝所有依賴套件 |
| `npm run dev`     | 啟動開發伺服器   |
| `npm run build`   | 建置生產環境版本 |
| `npm run preview` | 預覽建置後的版本 |

---

這個架構設計簡潔明瞭，適合初學者學習和擴充！
