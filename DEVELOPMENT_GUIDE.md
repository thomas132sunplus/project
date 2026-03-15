# 開發指南

給想要擴充功能或客製化專案的開發者。

## 📚 技術堆疊

- **前端框架**: React 18.2
- **建置工具**: Vite 5.0
- **程式語言**: JavaScript (ES6+)
- **路由**: React Router DOM 6.20
- **樣式**: Tailwind CSS 3.3
- **後端服務**: Firebase 10.7
  - Firestore (資料庫)
  - Authentication (未來功能)

## 🏗️ 專案架構說明

### 元件層級結構

```
App (路由根節點)
│
├─ Navbar (共用導航列)
│
├─ Route: / 
│  └─ ActivityList
│     └─ ActivityCard (多個)
│
├─ Route: /activity/:id
│  └─ ActivityDetail
│
└─ Route: /create
   └─ ActivityForm
```

### 資料流向

```
使用者操作
    ↓
React 元件 (UI)
    ↓
Firebase 操作函式 (activities.js)
    ↓
Firestore SDK
    ↓
Firebase Cloud (雲端資料庫)
```

## 🔧 開發環境設定

### 推薦的 VS Code 擴充功能

專案已包含 `.vscode/extensions.json`，開啟專案時 VS Code 會推薦安裝：

1. **ESLint** - 程式碼品質檢查
2. **Prettier** - 程式碼格式化
3. **Tailwind CSS IntelliSense** - Tailwind 自動完成
4. **ES7+ React/Redux/React-Native snippets** - React 程式碼片段
5. **Auto Rename Tag** - 自動重新命名配對標籤

### 檔案監視與熱重載

Vite 預設已啟用 HMR (Hot Module Replacement)：
- 修改 `.jsx` 檔案會自動重新載入
- 修改 `.css` 檔案會即時更新樣式
- 不需要手動重新整理瀏覽器

## 📝 程式碼風格指南

### 命名規範

- **元件檔案**: PascalCase (例: `ActivityCard.jsx`)
- **函式**: camelCase (例: `getAllActivities`)
- **常數**: UPPER_SNAKE_CASE (例: `ACTIVITIES_COLLECTION`)
- **變數**: camelCase (例: `activityData`)

### 元件結構範例

```javascript
// 1. Import 區塊
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. 元件定義
export default function MyComponent() {
  // 3. Hooks (useState, useEffect 等)
  const [data, setData] = useState(null);
  const navigate = useNavigate();
  
  // 4. useEffect
  useEffect(() => {
    // 初始化邏輯
  }, []);
  
  // 5. 事件處理函式
  const handleClick = () => {
    // 處理邏輯
  };
  
  // 6. 條件渲染 (如果需要)
  if (loading) return <div>載入中...</div>;
  
  // 7. JSX 回傳
  return (
    <div className="container">
      {/* 元件內容 */}
    </div>
  );
}
```

### Tailwind CSS 使用建議

```javascript
// ✅ 推薦：使用完整的 class 名稱
<div className="bg-blue-600 text-white px-4 py-2 rounded-lg">

// ❌ 避免：動態組合 class（Tailwind 無法識別）
<div className={`bg-${color}-600`}>

// ✅ 如需動態顏色，使用物件：
const colors = {
  blue: 'bg-blue-600',
  red: 'bg-red-600'
};
<div className={colors[colorName]}>
```

## 🎯 常見開發任務

### 任務 1: 新增活動欄位

需要修改 3 個檔案：

1. **ActivityForm.jsx** - 新增表單輸入欄位
```javascript
// 在 formData state 中新增欄位
const [formData, setFormData] = useState({
  // ...existing fields
  newField: ''
});

// 在表單中新增輸入欄位
<input
  type="text"
  name="newField"
  value={formData.newField}
  onChange={handleChange}
  placeholder="請輸入..."
/>
```

2. **ActivityDetail.jsx** - 顯示新欄位
```javascript
{activity.newField && (
  <div className="mb-4">
    <h3 className="font-semibold">新欄位標題</h3>
    <p>{activity.newField}</p>
  </div>
)}
```

3. **ActivityCard.jsx** (選用) - 在列表卡片中顯示
```javascript
<div className="text-sm text-gray-600">
  {activity.newField}
</div>
```

### 任務 2: 新增活動類型

修改 2 個檔案：

1. **ActivityForm.jsx**
```javascript
<select name="type" value={formData.type} onChange={handleChange}>
  {/* ...existing options */}
  <option value="新類型">新類型</option>
</select>
```

2. **ActivityCard.jsx 和 ActivityDetail.jsx**
```javascript
const typeColors = {
  // ...existing types
  '新類型': 'bg-yellow-100 text-yellow-800'
};
```

### 任務 3: 新增頁面

1. **建立新元件** `src/components/NewPage.jsx`
```javascript
export default function NewPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1>新頁面</h1>
    </div>
  );
}
```

2. **在 App.jsx 中註冊路由**
```javascript
import NewPage from './components/NewPage';

// 在 Routes 中新增
<Route path="/new-page" element={<NewPage />} />
```

3. **在 Navbar.jsx 中新增連結**
```javascript
<Link to="/new-page" className="hover:text-blue-200">
  新頁面
</Link>
```

### 任務 4: 實作編輯功能

1. **建立編輯元件** (可複製 ActivityForm.jsx)
2. **使用 updateActivity** 函式（已在 activities.js 中實作）
```javascript
import { updateActivity } from '../firebase/activities';

const handleUpdate = async (activityId, updatedData) => {
  await updateActivity(activityId, updatedData);
};
```

3. **在 ActivityDetail 中新增編輯按鈕**

### 任務 5: 實作刪除功能

```javascript
import { deleteActivity } from '../firebase/activities';

const handleDelete = async (activityId) => {
  if (confirm('確定要刪除此活動？')) {
    await deleteActivity(activityId);
    navigate('/'); // 返回列表頁
  }
};

// 在 UI 中新增刪除按鈕
<button onClick={() => handleDelete(activity.id)}>
  刪除活動
</button>
```

## 🔐 Firebase 進階功能

### 新增 Authentication

1. **在 Firebase Console 啟用 Auth**
2. **建立登入元件**
```javascript
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';

const login = async (email, password) => {
  await signInWithEmailAndPassword(auth, email, password);
};
```

3. **建立 Auth Context** (管理使用者狀態)
4. **更新 Firestore 規則**（限制寫入權限）

### 查詢與篩選

在 `activities.js` 中新增查詢函式：

```javascript
import { query, where, getDocs } from 'firebase/firestore';

export const getActivitiesByType = async (type) => {
  const q = query(
    collection(db, 'activities'),
    where('type', '==', type)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};
```

## 🎨 樣式客製化

### 修改主題顏色

編輯 `tailwind.config.js`：

```javascript
theme: {
  extend: {
    colors: {
      // 自訂顏色
      brand: {
        50: '#f0f9ff',
        100: '#e0f2fe',
        // ... 更多色階
        900: '#0c4a6e',
      }
    }
  }
}
```

### 新增自訂 CSS

在 `src/index.css` 中：

```css
@layer components {
  .btn-primary {
    @apply bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition;
  }
}
```

使用：
```javascript
<button className="btn-primary">點我</button>
```

## 🧪 測試建議

### 手動測試

建立測試案例清單：
- [ ] 建立活動（有/無選填欄位）
- [ ] 查看活動列表
- [ ] 查看活動詳細
- [ ] 點擊外部連結
- [ ] 測試錯誤處理（斷網、錯誤 ID）

### 使用測試資料

執行 `test-data.js` 快速建立範例資料。

## 📦 建置與部署

### 建置生產版本

```bash
npm run build
```

產生的檔案在 `dist/` 資料夾。

### 部署到 Firebase Hosting

```bash
# 安裝 Firebase CLI
npm install -g firebase-tools

# 登入
firebase login

# 初始化
firebase init hosting

# 建置
npm run build

# 部署
firebase deploy
```

### 環境變數

建立 `.env` 檔案（不要上傳到 Git）：

```
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
# ... 其他配置
```

在程式中使用：
```javascript
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
```

## 🐛 除錯技巧

### 使用 Console.log

```javascript
console.log('Debug:', { data, loading, error });
```

### React DevTools

安裝 React DevTools 瀏覽器擴充功能：
- 檢查元件狀態
- 查看 props 傳遞
- 追蹤重新渲染

### Firebase Emulator (進階)

本地測試 Firestore：
```bash
firebase emulators:start
```

## 📚 學習資源

- [React 官方文件](https://react.dev/)
- [Vite 文件](https://vitejs.dev/)
- [Tailwind CSS 文件](https://tailwindcss.com/)
- [Firebase 文件](https://firebase.google.com/docs)
- [React Router 文件](https://reactrouter.com/)

## 💡 最佳實踐

1. **保持元件小而專注** - 一個元件只做一件事
2. **使用有意義的變數名稱** - 讓程式碼自我說明
3. **適當的註解** - 解釋「為什麼」而不是「做什麼」
4. **錯誤處理** - 總是處理 Promise 的錯誤
5. **效能考量** - 避免不必要的重新渲染

## 🤝 貢獻指南

想要改進這個專案？

1. 建立分支進行開發
2. 遵循現有的程式碼風格
3. 新增功能時更新文件
4. 測試後再提交變更
5. 撰寫清楚的 commit 訊息

---

祝開發順利！如有問題，請參考 FAQ.md 或檢查程式碼中的註解。🚀
