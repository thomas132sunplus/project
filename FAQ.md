# 常見問題 FAQ

## 🔧 安裝與設定

### Q1: 執行 `npm install` 時出現錯誤？

**A:** 請確認以下事項：
- Node.js 版本至少 16 以上（執行 `node --version` 檢查）
- npm 版本至少 8 以上（執行 `npm --version` 檢查）
- 網路連線正常
- 如果在公司或學校網路，可能需要設定 proxy

更新 Node.js：前往 https://nodejs.org/ 下載最新的 LTS 版本

---

### Q2: Firebase 配置後仍然無法連線？

**A:** 檢查清單：
1. ✅ 確認 `src/firebase/config.js` 中的配置正確無誤
2. ✅ 確認已在 Firebase Console 建立 Firestore 資料庫
3. ✅ 確認 Firestore 規則設定為測試模式或允許讀寫
4. ✅ 開啟瀏覽器開發者工具（F12）查看 Console 錯誤訊息
5. ✅ 確認 Firebase 專案的計費狀態（免費方案有配額限制）

---

### Q3: 畫面顯示但樣式很亂？

**A:** 可能的原因：
- Tailwind CSS 沒有正確載入
- 解決方式：
  1. 確認 `src/index.css` 有引入 Tailwind directives
  2. 重新執行 `npm install`
  3. 清除快取：`npm run dev -- --force`
  4. 重新啟動開發伺服器

---

## 🐛 功能問題

### Q4: 建立活動後看不到資料？

**A:** 請依序檢查：

1. **檢查 Console 錯誤**
   - 開啟開發者工具（F12）
   - 查看 Console 標籤
   - 如果有紅色錯誤訊息，請閱讀錯誤內容

2. **檢查 Firestore**
   - 前往 Firebase Console
   - 點選 Firestore Database
   - 查看是否有 `activities` collection
   - 確認文件是否存在

3. **檢查網路請求**
   - 開發者工具 → Network 標籤
   - 篩選 Fetch/XHR
   - 查看是否有失敗的請求

---

### Q5: 點擊活動卡片後頁面變空白？

**A:** 這通常是路由問題：
- 確認你使用的是 `npm run dev` 啟動的開發伺服器
- 檢查 Console 是否有錯誤
- 確認活動 ID 正確
- 在 Firestore 中確認該活動存在

---

### Q6: 日期或時間格式怎麼調整？

**A:** 修改 `ActivityCard.jsx` 和 `ActivityDetail.jsx` 中的日期顯示：

```javascript
// 將日期轉換為更友善的格式
const formattedDate = new Date(activity.date).toLocaleDateString('zh-TW', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});
```

---

## 🎨 客製化

### Q7: 如何更改顏色主題？

**A:** 在 `tailwind.config.js` 中自訂顏色：

```javascript
theme: {
  extend: {
    colors: {
      primary: '#your-color',
      secondary: '#your-color',
    }
  }
}
```

然後在元件中使用 `bg-primary` 等 class。

---

### Q8: 如何新增活動類型？

**A:** 三個步驟：

1. **更新表單選項**（`ActivityForm.jsx`）
```javascript
<option value="新類型">新類型</option>
```

2. **更新顏色對應**（`ActivityCard.jsx` 和 `ActivityDetail.jsx`）
```javascript
const typeColors = {
  // ...existing types
  '新類型': 'bg-orange-100 text-orange-800'
};
```

3. 完成！不需要修改資料庫結構

---

### Q9: 如何新增更多欄位？

**A:** 例如新增「地點」欄位：

1. **更新表單**（`ActivityForm.jsx`）
```javascript
// 在 formData state 中加入
location: ''

// 在表單中加入輸入欄位
<input
  type="text"
  name="location"
  value={formData.location}
  onChange={handleChange}
  placeholder="活動地點"
/>
```

2. **更新詳細頁**（`ActivityDetail.jsx`）
```javascript
{activity.location && (
  <div>地點：{activity.location}</div>
)}
```

3. 完成！Firestore 會自動儲存新欄位

---

## 🚀 部署

### Q10: 如何部署到網路上？

**A:** 推薦使用 Firebase Hosting：

```bash
# 安裝 Firebase CLI
npm install -g firebase-tools

# 登入 Firebase
firebase login

# 初始化專案
firebase init hosting

# 建置專案
npm run build

# 部署
firebase deploy
```

或使用 Vercel/Netlify 等平台（更簡單）。

---

### Q11: 部署後出現 404 錯誤？

**A:** 單頁應用程式需要設定重定向：

**Firebase Hosting** - 在 `firebase.json` 中：
```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

**Vercel** - 會自動處理

**Netlify** - 建立 `_redirects` 檔案：
```
/*    /index.html   200
```

---

## 🔐 安全性

### Q12: 資料庫規則應該如何設定？

**A:** 開發階段使用測試模式：

```javascript
allow read, write: if true;
```

正式上線改為需要認證：

```javascript
allow read: if true;
allow create, update, delete: if request.auth != null;
```

詳見 `firestore.rules` 檔案。

---

### Q13: 如何新增使用者登入功能？

**A:** 這需要整合 Firebase Authentication：

1. 在 Firebase Console 啟用 Authentication
2. 選擇登入方式（Email、Google 等）
3. 在 React 中使用 `firebase/auth`
4. 建立登入/註冊元件
5. 使用 Context 或狀態管理工具管理使用者狀態

這是進階功能，建議先熟悉基本操作後再實作。

---

## 💡 其他

### Q14: 專案可以商業使用嗎？

**A:** 可以！此專案為教育目的建立，你可以：
- ✅ 用於學校社團
- ✅ 修改和擴充
- ✅ 分享給其他人
- ✅ 商業使用（但請注意 Firebase 的使用條款）

---

### Q15: 我想貢獻程式碼或回報問題

**A:** 太好了！你可以：
- 在專案中建立新分支進行修改
- 記錄你遇到的問題和解決方式
- 分享給其他有需要的人
- 持續改進和優化功能

---

## 📞 還有其他問題？

- 查看 `README.md` 獲取詳細文件
- 查看 `PROJECT_STRUCTURE.md` 了解專案結構
- 查看程式碼中的註解（每個檔案都有詳細說明）
- 使用瀏覽器開發者工具（F12）查看錯誤訊息

記住：遇到問題時，Console 中的錯誤訊息是最好的線索！🔍
