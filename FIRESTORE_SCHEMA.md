# Firestore 資料結構設計

## Collections 總覽

```
firestore/
├── tournaments/        # 盃賽資訊
├── teams/             # 隊伍資訊
├── users/             # 用戶資訊
├── practice_matches/  # 練習賽
├── team_messages/     # 隊伍聊天訊息
├── match_rooms/       # 練習賽房間
├── invitations/       # 練習賽邀請
└── calendar_events/   # 日曆事件
```

---

## 1. tournaments（盃賽）

```javascript
{
  id: "tournament_001",                    // 自動生成 ID
  name: "2024 春季盃",                      // 盃賽名稱
  date: "2024-03-15",                      // 比賽日期
  location: "論辯市辯士學校",               // 比賽地點
  registrationFee: 500,                    // 報名費
  deposit: 1000,                           // 保證金
  totalAmount: 1500,                       // 加總金額
  bankAccount: {                           // 匯款帳號
    bank: "國泰世華",
    account: "123-456-789",
    note: "請註明學校隊伍名稱"
  },
  alternativeTopics: ["AI發展", "教育改革"], // 備選辯題
  officialTopics: ["氣候變遷"],             // 正式辯題
  teamCount: 16,                           // 隊伍數量
  prospectusLink: "https://...",           // 簡章連結
  firstLeadTime: "2024-03-01 10:00",      // 一領時間
  secondLeadTime: "2024-03-08 10:00",     // 二領時間
  bracketImage: "https://...",             // 參賽隊伍循環圖
  bracketLink: "https://...",              // 循環圖連結
  otherInfo: "備註資訊",                    // 其他資訊
  participatingTeams: ["team_001", "team_002"], // 參賽隊伍 IDs
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: "user_id"                     // 建立者
}
```

---

## 2. teams（隊伍）

```javascript
{
  id: "team_001",
  name: "辯士學校辯論隊 A",              // 隊伍名稱
  school: "辯士學校",                // 學校
  members: ["user_001", "user_002", "user_003", "user_004"], // 隊員 IDs
  captain: "user_001",               // 隊長
  tournaments: ["tournament_001"],   // 參加的盃賽
  teamColor: "#3B82F6",             // 隊伍代表色（用於日曆）
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## 3. users（用戶）

```javascript
{
  id: "user_001",                    // 與 Firebase Auth UID 相同
  email: "student@school.edu.tw",
  displayName: "王小明",
  school: "建國中學",
  grade: "高二",
  role: "debater",                   // debater, coach, admin
  teams: ["team_001", "team_002"],   // 所屬隊伍
  profilePhoto: "https://...",
  phoneNumber: "0912345678",
  isPublic: true,                    // 個人頁面是否公開
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## 4. practice_matches（練習賽）

```javascript
{
  id: "match_001",
  tournamentId: "tournament_001",        // 所屬盃賽
  affirmativeTeam: "team_001",          // 正方隊伍
  negativeTeam: "team_002",             // 反方隊伍
  scheduledTime: timestamp,              // 確定的比賽時間
  matchType: "cross-school",            // cross-school, internal
  format: {                              // 賽程設定
    type: "both",                        // affirmative, negative, both
    sequence: ["aff-neg", "neg-aff"]    // 先正後反
  },
  status: "scheduled",                   // pending, scheduled, completed, cancelled
  roomId: "room_001",                   // 對應的比賽房間
  createdAt: timestamp,
  confirmedAt: timestamp,
  createdBy: "user_001"
}
```

---

## 5. invitations（練習賽邀請）

```javascript
{
  id: "invitation_001",
  fromTeam: "team_001",                 // 邀請方隊伍
  toTeam: "team_002",                   // 被邀請隊伍
  tournamentId: "tournament_001",       // 相關盃賽
  status: "pending",                    // pending, accepted, declined, confirmed
  message: "想約練習賽",                 // 邀請訊息
  chatRoomId: "chat_001",              // 接受後創建的聊天室
  matchId: "match_001",                // 確定後創建的比賽
  createdAt: timestamp,
  respondedAt: timestamp
}
```

---

## 6. team_messages（隊伍聊天訊息）

```javascript
{
  id: "message_001",
  teamId: "team_001",                   // 隊伍 ID（或聊天室 ID）
  type: "team_chat",                    // team_chat, match_chat
  senderId: "user_001",                 // 發送者
  senderName: "王小明",
  content: "大家明天有空嗎？",
  messageType: "text",                  // text, file, audio, video
  fileUrl: "https://...",              // 檔案連結（如果是檔案）
  fileName: "資料.pdf",
  createdAt: timestamp
}
```

---

## 7. calendar_events（日曆事件）

```javascript
{
  id: "event_001",
  userId: "user_001",                   // 用戶 ID（個人日曆）
  teamId: "team_001",                   // 隊伍 ID（隊伍日曆）
  type: "personal",                     // personal, team
  eventType: "discussion",              // discussion, practice, match
  title: "隊伍討論",
  startTime: timestamp,
  endTime: timestamp,
  availableMembers: ["user_001", "user_002"], // 可出席的成員
  confirmedMembers: ["user_001"],      // 已確認的成員
  status: "tentative",                 // tentative, confirmed, past
  color: "#10B981",                    // 事件顏色
  createdAt: timestamp,
  confirmedAt: timestamp
}
```

---

## 8. match_rooms（練習賽房間）

```javascript
{
  id: "room_001",
  matchId: "match_001",                 // 對應的練習賽
  tournamentId: "tournament_001",
  affirmativeTeam: "team_001",
  negativeTeam: "team_002",
  format: "oregon-3-3-3",              // oregon-3-3-3, oregon-4-4-4, singapore, custom
  customFormat: {                       // 自訂賽制
    constructive: 4,
    rebuttal: 4,
    summary: 4
  },
  currentPhase: "not-started",         // not-started, in-progress, completed
  timer: {
    currentSpeaker: "aff-1",
    timeRemaining: 180,
    isRunning: false
  },
  participants: [                       // 參與者視窗排列
    { userId: "user_001", position: 1 },
    { userId: "user_002", position: 2 }
  ],
  recordings: [                         // 錄音檔案
    {
      id: "rec_001",
      url: "https://...",
      transcript: "逐字稿內容",
      createdAt: timestamp
    }
  ],
  files: [                              // 資料存放區
    { name: "立論稿.pdf", url: "https://...", uploadedBy: "user_001" }
  ],
  judgeForms: [                         // 裁單存放區
    { name: "裁判講評.pdf", url: "https://...", uploadedBy: "judge_001" }
  ],
  createdAt: timestamp,
  endedAt: timestamp
}
```

---

## 索引建議

### tournaments

- `date` (升序) - 按日期查詢
- `createdAt` (降序) - 最新盃賽

### teams

- `school` (升序) - 按學校查詢
- `members` (array-contains) - 查詢用戶的隊伍

### calendar_events

- 複合索引: `teamId` (升序) + `startTime` (升序)
- 複合索引: `userId` (升序) + `startTime` (升序)
- 複合索引: `status` (升序) + `startTime` (升序)

### practice_matches

- 複合索引: `tournamentId` (升序) + `status` (升序)
- 複合索引: `affirmativeTeam` (升序) + `scheduledTime` (升序)

### team_messages

- 複合索引: `teamId` (升序) + `createdAt` (降序)
- 複合索引: `type` (升序) + `teamId` (升序) + `createdAt` (降序)

---

## 安全規則建議

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 用戶必須登入
    function isAuthenticated() {
      return request.auth != null;
    }

    // 檢查是否為隊伍成員
    function isTeamMember(teamId) {
      return isAuthenticated() &&
             request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.members;
    }

    // tournaments - 所有人可讀，只有建立者可寫
    match /tournaments/{tournamentId} {
      allow read: if true;
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() &&
                               resource.data.createdBy == request.auth.uid;
    }

    // teams - 隊員可讀寫
    match /teams/{teamId} {
      allow read: if true;
      allow write: if isTeamMember(teamId);
    }

    // users - 用戶可讀寫自己的資料
    match /users/{userId} {
      allow read: if true;
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }

    // team_messages - 只有隊員可讀寫
    match /team_messages/{messageId} {
      allow read: if isAuthenticated() && isTeamMember(resource.data.teamId);
      allow create: if isAuthenticated();
    }

    // calendar_events - 相關人員可讀寫
    match /calendar_events/{eventId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() &&
                     (request.auth.uid == resource.data.userId ||
                      isTeamMember(resource.data.teamId));
    }
  }
}
```
