# 邊境之外0.0 - 部署指南

## 🚀 快速部署步驟

### 前置準備（已完成✅）

- ✅ 安裝 Firebase CLI
- ✅ 構建生產版本
- ✅ 配置 Firebase Hosting

### 部署流程

#### 1. 登入 Firebase（首次部署需要）

```powershell
firebase login
```

- 會開啟瀏覽器進行 Google 授權
- 選擇您的 Google 帳號
- 允許 Firebase CLI 存取

#### 2. 部署到 Firebase Hosting

```powershell
firebase deploy
```

部署完成後會顯示您的網站網址。

#### 3. 訪問您的網站

部署成功後，您的網站將在以下網址上線：

- **正式網域**: https://edgewalker-6c6ac.web.app
- **備用網域**: https://edgewalker-6c6ac.firebaseapp.com

---

## 📝 日常更新流程

當您修改程式碼後，只需執行兩個命令：

```powershell
# 1. 重新構建
npm run build

# 2. 部署更新
firebase deploy
```

---

## 🔧 其他有用命令

### 預覽構建結果（部署前測試）

```powershell
npm run preview
```

會在本地啟動一個伺服器預覽生產版本。

### 查看部署歷史

```powershell
firebase hosting:releases:list
```

### 回滾到上一個版本

```powershell
firebase hosting:rollback
```

---

## 🌐 自訂網域（可選）

如果您想使用自己的網域（例如 debate.tw）：

1. 到 Firebase Console: https://console.firebase.google.com
2. 選擇專案「edgewalker-6c6ac」
3. 進入 Hosting 頁面
4. 點擊「新增自訂網域」
5. 按照指示設定 DNS 記錄

---

## 📊 監控與分析

### 查看網站流量

Firebase Console > Analytics

### 查看 Firestore 資料

Firebase Console > Firestore Database

### 查看使用量

Firebase Console > 使用量與計費

---

## 🔐 安全性設定

### Firestore 安全規則

安全規則已在 `firestore.rules` 檔案中定義。

更新安全規則後部署：

```powershell
firebase deploy --only firestore:rules
```

---

## 💡 常見問題

### Q: 部署後看不到更新？

A: 清除瀏覽器快取，或按 Ctrl+Shift+R 強制重新載入。

### Q: 如何撤銷部署？

A: 使用 `firebase hosting:rollback` 回滾到上一版本。

### Q: 網站載入很慢？

A: 可能需要優化打包大小，考慮使用程式碼分割（code splitting）。

### Q: 如何查看錯誤日誌？

A:

1. 瀏覽器開發者工具的 Console
2. Firebase Console > Firestore 查看資料庫錯誤

---

## 📞 需要幫助？

- Firebase 文件: https://firebase.google.com/docs/hosting
- React 文件: https://react.dev
- Vite 文件: https://vitejs.dev

---

**網站狀態**: ✅ 已上線  
**專案 ID**: edgewalker-6c6ac  
**網址**: https://edgewalker-6c6ac.web.app
