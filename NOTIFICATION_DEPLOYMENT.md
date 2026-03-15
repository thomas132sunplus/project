# 通知系統部署檢查清單

## ✅ 必須完成的步驟

### 1. 安裝依賴包 📦

```bash
npm install date-fns
```

### 2. 部署 Firestore 規則 🔒

在 Firebase Console 中：

1. 前往 **Firestore Database** → **規則**
2. 複製 `firestore.rules` 文件內容
3. 點擊「發布」

**重要**: 確保已添加 notifications 規則：

```javascript
match /notifications/{notificationId} {
  allow read: if request.auth != null && request.auth.uid == resource.data.userId;
  allow create: if request.auth != null;
  allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
}
```

### 3. 建置並部署 🚀

```bash
npm run build
firebase deploy --only hosting
```

## 🧪 測試步驟

### 測試 1: 基本通知功能

1. 登入兩個不同的帳號（可以用兩個瀏覽器或無痕模式）
2. 確認導航欄顯示通知鈴鐺圖標
3. 點擊鈴鐺，確認通知面板可以展開

### 測試 2: 聊天訊息通知

1. 用戶 A 進入某個隊伍的討論區
2. 用戶 A 在聊天區發送訊息
3. 用戶 B（同隊伍成員）應該看到：
   - 通知鈴鐺上的小紅點
   - 點擊鈴鐺看到新訊息通知

### 測試 3: 會議開始通知

1. 用戶 A 加入語音會議室（第一個加入）
2. 用戶 B（同隊伍成員）應該看到：
   - 通知鈴鐺上的小紅點
   - 點擊鈴鐺看到會議開始通知

### 測試 4: 通知操作

1. 點擊通知 → 應該跳轉到相關頁面
2. 已讀通知背景變白，未讀通知背景淺藍色
3. 點擊「全部已讀」→ 所有通知標記為已讀
4. 點擊「清除已讀」→ 所有已讀通知消失
5. 點擊個別通知的「刪除」→ 該通知消失

### 測試 5: 桌面通知

1. 點擊通知面板頂部的桌面通知開關
2. 允許瀏覽器通知權限
3. 發送一條訊息（或發起會議）
4. 應該看到桌面彈出通知

## ⚠️ 常見部署問題

### 問題 1: 編譯錯誤 "date-fns is not defined"

**解決**:

```bash
npm install date-fns
npm run build
```

### 問題 2: Firestore 權限錯誤

**解決**:

1. 檢查 Firebase Console 中的 Firestore 規則是否已發布
2. 確認 notifications 規則已添加
3. 重新部署規則

### 問題 3: 通知不顯示

**解決**:

1. 打開瀏覽器控制台（F12）查看錯誤
2. 確認用戶已登入
3. 確認 Firestore 規則已正確配置
4. 檢查網絡連接

### 問題 4: 桌面通知不彈出

**解決**:

1. 檢查瀏覽器通知權限（設定 → 網站設定 → 通知）
2. 確認桌面通知開關已開啟
3. 檢查操作系統通知設定

## 📋 快速檢查清單

- [ ] `npm install date-fns` 已執行
- [ ] Firestore 規則已更新並發布
- [ ] `npm run build` 成功（無錯誤）
- [ ] `firebase deploy --only hosting` 成功
- [ ] 網站可以正常訪問
- [ ] 通知鈴鐺顯示在導航欄
- [ ] 可以發送和接收聊天訊息通知
- [ ] 可以發送和接收會議開始通知
- [ ] 通知面板操作正常（已讀、刪除、清除）
- [ ] 桌面通知功能正常（可選）

## 🎯 下一步（可選）

如需整合更多通知類型，請參考 `NOTIFICATION_GUIDE.md`：

- 練習賽邀請通知
- 檔案/錄音上傳通知
- 盃賽更新通知
- 日曆事件通知
- 反饋通知

## 🐛 調試技巧

### 查看通知創建日誌

打開瀏覽器控制台，應該看到：

```
✅ 通知已創建: { userId, type, title }
✅ 已發送聊天通知給隊員
✅ 已發送會議開始通知
```

### 查看 Firestore 數據

在 Firebase Console：

1. Firestore Database
2. 查看 `notifications` 集合
3. 確認通知文檔已創建

### 查看網絡請求

1. 打開瀏覽器開發者工具（F12）
2. 切換到 Network 標籤
3. 篩選 Firestore 請求
4. 檢查請求和回應

---

**部署完成後記得測試所有功能！** 🎉
