# 邀請碼管理指南

## 🔐 邀請碼系統說明

本系統已啟用邀請碼驗證機制，只有持有有效邀請碼的用戶才能訪問平台。

---

## 📋 當前有效邀請碼

以下是目前系統中的有效邀請碼（不區分大小寫）：

1. `DEBATE2026` - 主要測試邀請碼
2. `EDGEWALKER` - 專案名稱邀請碼
3. `TAIWAN-DEBATE` - 台灣辯論邀請碼
4. `TEST-ACCESS` - 測試存取邀請碼
5. `ADMIN-2026` - 管理員邀請碼

> **注意**：用戶輸入邀請碼時會自動轉換為大寫，邀請碼兩側的空格會被移除。

---

## 🛠️ 如何管理邀請碼

### 方式 1：修改代碼（目前方式）

編輯檔案：`src/components/InviteCodeGate.jsx`

找到 `VALID_INVITE_CODES` 陣列：

```javascript
const VALID_INVITE_CODES = [
  "DEBATE2026",
  "EDGEWALKER",
  "TAIWAN-DEBATE",
  "TEST-ACCESS",
  "ADMIN-2026",
];
```

**新增邀請碼**：

```javascript
const VALID_INVITE_CODES = [
  "DEBATE2026",
  "EDGEWALKER",
  "NEW-CODE-HERE", // 新增的邀請碼
  "ANOTHER-CODE", // 再新增一個
];
```

**移除邀請碼**：
直接刪除不需要的行即可。

修改完成後記得：

```bash
npm run build
firebase deploy
```

### 方式 2：使用 Firestore（進階，需要額外開發）

未來可以考慮將邀請碼存放在 Firestore 中，這樣可以：

- 透過 Firebase Console 直接管理
- 不需要重新部署即可更新
- 追蹤每個邀請碼的使用情況
- 設定使用次數限制
- 設定過期時間

---

## 🎯 用戶使用流程

1. **首次訪問**：用戶打開網站會看到邀請碼輸入頁面
2. **輸入邀請碼**：輸入任一有效邀請碼
3. **驗證成功**：驗證通過後進入平台
4. **自動記憶**：驗證狀態存在 localStorage，下次訪問不需重新輸入
5. **登出測試**：點擊右下角「🔒 登出測試」按鈕可清除驗證狀態

---

## 🔧 技術細節

### 儲存位置

驗證資訊存放在瀏覽器的 localStorage：

- `invite_verified`: 驗證狀態（'true' 表示已驗證）
- `invite_code_used`: 使用的邀請碼
- `verified_at`: 驗證時間

### 清除驗證

用戶可以透過以下方式清除驗證：

1. 點擊頁面右下角的「登出測試」按鈕
2. 清除瀏覽器 localStorage
3. 使用隱私模式/無痕模式瀏覽

### 安全性說明

- 邀請碼存在前端代碼中，技術人員可以查看
- 適合內部測試使用，不適合作為正式的訪問控制
- 正式環境建議搭配 Firebase Authentication 使用

---

## 📊 使用統計（手動追蹤）

建議記錄發放的邀請碼及使用者：

| 邀請碼     | 發放對象 | 發放日期   | 用途       |
| ---------- | -------- | ---------- | ---------- |
| DEBATE2026 | 測試團隊 | 2026-03-01 | 通用測試碼 |
| -          | -        | -          | -          |

---

## 🚀 正式上線時

當準備正式公開時，有幾個選擇：

### 選項 1：移除邀請碼系統

編輯 `src/App.jsx`，移除 `InviteCodeGate`：

```javascript
// 移除這行
import InviteCodeGate from "./components/InviteCodeGate";

// 移除 <InviteCodeGate> 標籤
function App() {
  return (
    // <InviteCodeGate>  ← 移除
    <BrowserRouter>...</BrowserRouter>
    // </InviteCodeGate>  ← 移除
  );
}
```

### 選項 2：改用 Firebase Authentication

實作真正的用戶登入系統：

- Email/Password 登入
- Google 登入
- 完整的用戶管理

### 選項 3：保留但隱藏測試碼提示

編輯 `src/components/InviteCodeGate.jsx`，移除底部的測試碼提示區塊。

---

## 💡 常見問題

### Q: 邀請碼頁面沒有顯示？

A: 檢查 localStorage 是否已有 `invite_verified` 的值，清除後重新載入。

### Q: 如何批量生成邀請碼？

A: 可以使用線上工具生成隨機字串，格式建議：大寫字母+數字+連字號。

### Q: 可以設定邀請碼過期時間嗎？

A: 目前版本不支援，需要額外開發。建議存入 Firestore 並加入過期邏輯。

### Q: 如何追蹤邀請碼使用情況？

A: 目前存在用戶的 localStorage，無法集中追蹤。建議整合 Firestore 記錄使用日誌。

---

## 📞 聯絡資訊

如需更多邀請碼功能或有其他問題，請聯繫系統管理員。
