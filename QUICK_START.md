# 邊境之外0.0 - 快速開始指南

## 步驟 1：安裝套件

在專案資料夾中開啟終端機（Terminal / PowerShell），執行：

```bash
npm install
```

等待所有套件安裝完成。

## 步驟 2：設定 Firebase

### 建立 Firebase 專案

1. 開啟 [Firebase Console](https://console.firebase.google.com/)
2. 點擊「新增專案」或「Add project」
3. 輸入專案名稱（例如：debate-hub 或 邊境之外0.0）
4. 不需要 Google Analytics（可以關閉）
5. 點擊「建立專案」

### 建立 Firestore 資料庫

1. 在左側選單找到「Firestore Database」
2. 點擊「建立資料庫」
3. 選擇「以測試模式啟動」（Start in test mode）
4. 選擇位置：**asia-east1 (Taiwan)** 或 **asia-northeast1 (Tokyo)**
5. 點擊「啟用」

### 取得你的 Firebase 配置

1. 點擊專案總覽旁的齒輪圖示 ⚙️
2. 選擇「專案設定」
3. 往下捲動到「你的應用程式」
4. 點擊 **</>** 圖示（網頁應用程式）
5. 輸入應用程式名稱（例如：邊境之外0.0）
6. **不需要**勾選 Firebase Hosting
7. 點擊「註冊應用程式」
8. **複製** `firebaseConfig` 的內容

### 更新專案配置

1. 開啟 `src/firebase/config.js`
2. 找到這段程式碼：

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

3. 用你剛才複製的配置取代這段程式碼
4. 儲存檔案

## 步驟 3：啟動專案

在終端機中執行：

```bash
npm run dev
```

你會看到類似這樣的訊息：

```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## 步驟 4：開啟瀏覽器

1. 開啟瀏覽器
2. 前往 `http://localhost:5173`
3. 你應該會看到「邊境之外0.0」的首頁

## 步驟 5：建立第一個活動

1. 點擊右上角的「+ 建立活動」按鈕
2. 填寫活動資訊：
   - 活動名稱：例如「週五練習賽」
   - 活動類型：選擇「練習賽」
   - 日期：選擇日期
   - 時間：例如 19:00
   - 賽制：例如「議會制」
   - 活動說明：輸入一些說明文字
3. 可以選填外部連結（LINE、Discord、視訊會議）
4. 點擊「建立活動」
5. 成功！你會被導向到活動詳細頁

## 常見問題

### Q: 安裝套件時出現錯誤？

A: 確認你已經安裝了 Node.js（建議版本 18 以上）。可以執行 `node --version` 檢查。

### Q: Firebase 配置後還是看到錯誤？

A:

1. 檢查 `config.js` 中的配置是否正確貼上
2. 檢查 Firestore 是否已建立
3. 檢查 Firestore 規則是否設定為測試模式

### Q: 建立活動後看不到資料？

A:

1. 開啟瀏覽器的開發者工具（F12）
2. 查看 Console 標籤是否有錯誤訊息
3. 前往 Firebase Console > Firestore，確認 `activities` collection 是否有資料

### Q: 頁面樣式跑版？

A: 執行 `npm install` 確認所有套件都已安裝完成

## 下一步

- 建立更多活動，測試系統功能
- 自訂 Tailwind CSS 顏色主題
- 加入更多欄位到活動資料
- 學習如何部署到 Firebase Hosting

## 需要幫助？

查看 `README.md` 獲取更詳細的文件說明。

---

祝你使用愉快！🎉
