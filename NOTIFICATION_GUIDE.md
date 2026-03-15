# 通知系統使用指南

## 📋 功能概述

通知系統提供完整的即時通知功能，包含：

- ✅ 瀏覽器內通知面板（含未讀小紅點）
- ✅ 桌面通知（可選）
- ✅ 多種通知類型支持
- ✅ 即時同步（基於 Firestore）

## 🎯 已整合的功能

### 1. 聊天訊息通知

**觸發時機**: 當用戶在隊伍聊天區發送訊息時
**通知對象**: 該隊伍的所有成員（排除發送者）
**文件位置**: `src/firebase/teamMessages.js`

### 2. 會議開始通知

**觸發時機**: 當第一個用戶加入語音會議室時
**通知對象**: 該隊伍的所有成員（排除發起者）
**文件位置**: `src/components/VoiceCallWithTimer.jsx`

## 📦 核心文件結構

```
src/
├── firebase/
│   ├── notifications.js              # 通知服務（創建、讀取、刪除）
│   └── notificationHelpers.js        # 通知觸發幫助函數
├── hooks/
│   └── useNotifications.js           # 通知 Hook
└── components/
    ├── NotificationBell.jsx          # 通知鈴鐺（導航欄）
    ├── NotificationPanel.jsx         # 通知面板（下拉列表）
    ├── NotificationItem.jsx          # 單個通知項目
    └── Navbar.jsx                    # 已整合通知鈴鐺
```

## 🔔 支持的通知類型

| 類型                  | 圖標 | 說明       |
| --------------------- | ---- | ---------- |
| `CHAT_MESSAGE`        | 💬   | 聊天訊息   |
| `TOURNAMENT_UPDATE`   | 🏆   | 盃賽更新   |
| `MEETING_START`       | 📞   | 會議發起   |
| `MEETING_REMINDER`    | ⏰   | 會議提醒   |
| `PRACTICE_INVITATION` | 📬   | 練習賽邀請 |
| `INVITATION_RESPONSE` | ✉️   | 邀請回應   |
| `CALENDAR_EVENT`      | 📅   | 日曆事件   |
| `FILE_UPLOAD`         | 📁   | 新檔案上傳 |
| `RECORDING_UPLOAD`    | 🎙️   | 新錄音上傳 |
| `FEEDBACK`            | 📝   | 新反饋     |

## 🚀 如何在其他功能中整合通知

### 範例 1: 練習賽邀請通知

在 `src/firebase/invitations.js` 中：

```javascript
import { notifyPracticeInvitation } from "./notificationHelpers";

export async function sendPracticeInvitation(invitationData) {
  // ... 創建邀請的邏輯 ...

  const invitationRef = await addDoc(
    collection(db, "invitations"),
    invitationData,
  );

  // 發送通知
  const toTeamDoc = await getDoc(doc(db, "teams", invitationData.toTeam));
  const recipientIds = toTeamDoc.data().members;

  await notifyPracticeInvitation(
    invitationRef.id,
    invitationData.fromTeamName,
    invitationData.toTeamName,
    recipientIds,
    invitationData.tournamentName,
  );

  return invitationRef.id;
}
```

### 範例 2: 檔案上傳通知

在 `src/firebase/teamFiles.js` 中：

```javascript
import { notifyFileUpload, getTeamMemberIds } from "./notificationHelpers";

export async function uploadTeamFile(teamId, file, userInfo) {
  // ... 上傳檔案的邏輯 ...

  const fileRef = await addDoc(collection(db, "team_files"), fileData);

  // 發送通知
  const memberIds = await getTeamMemberIds(teamId);
  await notifyFileUpload(
    fileRef.id,
    file.name,
    userInfo.userId,
    userInfo.userName,
    memberIds,
    teamId,
    "team",
  );

  return fileRef.id;
}
```

### 範例 3: 盃賽更新通知

在 `src/firebase/tournaments.js` 中：

```javascript
import { notifyTournamentUpdate } from "./notificationHelpers";

export async function updateTournament(tournamentId, updateData) {
  // ... 更新盃賽的邏輯 ...

  await updateDoc(doc(db, "tournaments", tournamentId), updateData);

  // 發送通知給所有參賽隊伍的成員
  const tournamentDoc = await getDoc(doc(db, "tournaments", tournamentId));
  const tournamentData = tournamentDoc.data();

  // 收集所有參賽隊伍的成員 ID
  const allMemberIds = [];
  for (const teamId of tournamentData.participatingTeams) {
    const teamDoc = await getDoc(doc(db, "teams", teamId));
    if (teamDoc.exists()) {
      allMemberIds.push(...teamDoc.data().members);
    }
  }

  // 去重
  const uniqueMemberIds = [...new Set(allMemberIds)];

  await notifyTournamentUpdate(
    tournamentId,
    tournamentData.name,
    "辯題已更新", // 或其他更新類型
    uniqueMemberIds,
  );
}
```

## 🎨 UI 使用說明

### 用戶端操作

1. **查看通知**: 點擊導航欄右側的通知鈴鐺圖標
2. **查看未讀數量**: 通知鈴鐺上的小紅點顯示未讀通知數量
3. **標記為已讀**: 點擊通知即自動標記為已讀
4. **全部標記為已讀**: 點擊通知面板頂部的「全部已讀」按鈕
5. **清除已讀通知**: 點擊通知面板頂部的「清除已讀」按鈕
6. **刪除單個通知**: 點擊通知項目右下角的「刪除」按鈕
7. **跳轉到相關頁面**: 點擊通知會自動跳轉到相關頁面

### 桌面通知

1. **啟用桌面通知**: 在通知面板頂部切換「桌面通知」開關
2. **權限請求**: 首次啟用會請求瀏覽器通知權限
3. **通知設定**: 桌面通知會在收到新通知時自動彈出（5秒後自動關閉）

## 🔧 Firestore 規則

已在 `firestore.rules` 中添加通知規則：

```javascript
match /notifications/{notificationId} {
  // 用戶只能讀取自己的通知
  allow read: if request.auth != null && request.auth.uid == resource.data.userId;
  // 任何已登入用戶都可以創建通知（發送給其他人）
  allow create: if request.auth != null;
  // 用戶只能更新和刪除自己的通知
  allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
}
```

**重要**: 需要在 Firebase Console 中部署這些規則。

## 📊 Firestore 數據結構

### notifications 集合

```javascript
{
  userId: string,           // 接收通知的用戶 ID
  type: string,            // 通知類型（見上表）
  title: string,           // 通知標題
  message: string,         // 通知內容
  relatedId: string,       // 相關資源 ID（可選）
  linkTo: string,          // 點擊通知後跳轉的路徑（可選）
  metadata: object,        // 額外的元數據（可選）
  isRead: boolean,         // 是否已讀
  createdAt: timestamp     // 創建時間
}
```

## 🎯 已整合的功能 ✅

以下功能已經成功整合通知系統：

### 1. 練習賽邀請 ✅

- **發送邀請時**: 通知被邀請隊伍的所有成員 ✅
- **接受/拒絕邀請時**: 通知邀請方隊伍的所有成員 ✅
- **文件**: `src/firebase/invitations.js` ✅
- **使用函數**: `notifyPracticeInvitation`, `notifyInvitationResponse`

### 2. 檔案上傳 ✅

- **隊伍檔案上傳**: 通知隊伍其他成員 ✅
- **練習賽檔案上傳**: 通知雙方隊伍成員 ✅
- **文件**: `src/firebase/teamFiles.js` ✅, `src/firebase/practiceMatchFiles.js` ✅
- **使用函數**: `notifyFileUpload`

### 3. 錄音上傳 ✅

- **隊伍錄音**: 通知隊伍其他成員 ✅
- **練習賽錄音**: 通知雙方隊伍成員 ✅
- **文件**: `src/firebase/teamRecordings.js` ✅, `src/firebase/practiceMatchRecordings.js` ✅
- **使用函數**: `notifyRecordingUpload`

### 4. 日曆事件 ✅

- **建立活動**: 通知所有參與者 ✅
- **活動更新**: 通知所有參與者 （可在 `updateTeamEvent` 函數中添加）
- **活動提醒**: 在活動開始前 X 分鐘自動提醒 ⏰ （需要 Cloud Functions 或定時任務）
- **文件**: `src/firebase/teamEvents.js` ✅
- **使用函數**: `notifyCalendarEvent`, `notifyMeetingReminder`

### 5. 盃賽更新 ✅

- **辯題公布**: 通知所有參賽隊伍 ✅
- **循環圖更新**: 通知所有參賽隊伍 ✅
- **重要公告**: 通知所有參賽隊伍 ✅
- **文件**: `src/firebase/tournaments.js` ✅
- **使用函數**: `notifyTournamentUpdate`

### 6. 反饋系統 ✅

- **收到新反饋**: 通知管理員（需配置 adminIds） ✅
- **文件**: `src/firebase/feedback.js` ✅
- **使用函數**: `notifyFeedback`

### 7. 練習賽討論區訊息 ✅

- **新訊息**: 通知雙方隊伍成員（排除發送者） ✅
- **文件**: `src/firebase/practiceMatchMessages.js` ✅
- **使用函數**: `notifyChatMessage`（type: "match"）

### 8. 聊天訊息 ✅

- **隊伍訊息**: 通知隊伍其他成員 ✅
- **文件**: `src/firebase/teamMessages.js` ✅
- **使用函數**: `notifyChatMessage`（type: "team"）

### 9. 會議開始 ✅

- **語音會議開始**: 通知隊伍其他成員 ✅
- **文件**: `src/components/VoiceCallWithTimer.jsx` ✅
- **使用函數**: `notifyMeetingStart`

## 🔨 客製化建議

### 1. 通知過濾

可以讓用戶選擇接收哪些類型的通知：

```javascript
// 在用戶設定中添加
const [notificationPreferences, setNotificationPreferences] = useState({
  CHAT_MESSAGE: true,
  MEETING_START: true,
  TOURNAMENT_UPDATE: false,
  // ...
});

// 在 useNotifications Hook 中過濾
const filteredNotifications = notifications.filter(
  (n) => notificationPreferences[n.type],
);
```

### 2. 通知聲音

添加通知音效：

```javascript
const playNotificationSound = () => {
  const audio = new Audio('/notification-sound.mp3');
  audio.play();
};

// 在 useNotifications 中使用
if (desktopNotificationsEnabled && newNotifications.length > 0) {
  playNotificationSound();
  sendDesktopNotification(...);
}
```

### 3. 通知分組

按日期或類型分組顯示通知：

```javascript
const groupedNotifications = notifications.reduce((groups, notification) => {
  const date = new Date(notification.createdAt.toDate()).toLocaleDateString();
  if (!groups[date]) groups[date] = [];
  groups[date].push(notification);
  return groups;
}, {});
```

## 📝 測試檢查清單

- [ ] 通知鈴鐺顯示在導航欄
- [ ] 有新通知時顯示小紅點和數量
- [ ] 點擊鈴鐺可以展開通知面板
- [ ] 點擊通知自動標記為已讀
- [ ] 點擊通知跳轉到正確的頁面
- [ ] 全部標記為已讀功能正常
- [ ] 清除已讀通知功能正常
- [ ] 刪除單個通知功能正常
- [ ] 桌面通知權限請求正常
- [ ] 桌面通知彈出正常（啟用後）
- [ ] 聊天訊息會觸發通知
- [ ] 會議開始會觸發通知
- [ ] 通知顯示正確的時間（"X 分鐘前"）
- [ ] 通知顯示正確的圖標和顏色

## 🚨 常見問題

### Q: 為什麼沒有收到通知？

A: 檢查以下項目：

1. Firestore 規則是否已部署
2. 用戶是否已登入
3. 通知發送邏輯是否正確執行（查看控制台日誌）
4. 瀏覽器控制台是否有錯誤

### Q: 桌面通知不顯示？

A: 檢查：

1. 瀏覽器通知權限是否已允許
2. 桌面通知開關是否已啟用
3. 操作系統通知設定是否允許瀏覽器通知

### Q: 通知數量不正確？

A: 確保：

1. Firestore 查詢條件正確（userId 匹配）
2. `isRead` 欄位更新正確
3. 沒有重複創建通知

### Q: 如何防止通知過多？

A: 可以實現：

1. 通知合併（同一類型的多個通知合併為一個）
2. 通知快取（避免重複通知）
3. 通知過期自動清理（定期刪除舊通知）

## 📚 相關資源

- [Firestore 文檔](https://firebase.google.com/docs/firestore)
- [Web Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [date-fns 時間格式化](https://date-fns.org/)

---

**作者**: AI Assistant  
**日期**: 2026-03-12  
**版本**: 1.0
