// 測試資料產生器
// 這個腳本可以幫你快速建立一些範例活動資料
// 使用方式：在瀏覽器的 Console 中貼上並執行

// 注意：執行前請確保 Firebase 已經正確設定

const testActivities = [
  {
    title: "辯士盃辯論賽 初賽",
    type: "比賽",
    date: "2026-02-15",
    time: "09:00",
    format: "議會制",
    description:
      "辯士盃辯論賽初賽，採用亞洲議會制。請參賽隊伍提前 30 分鐘到場報到。",
    links: {
      line: "https://line.me/R/ti/g/example1",
      discord: "https://discord.gg/example1",
      meeting: "https://teams.microsoft.com/example1",
    },
  },
  {
    title: "週五練習賽",
    type: "練習賽",
    date: "2026-02-07",
    time: "19:00",
    format: "政策性辯論",
    description:
      "本週練習賽主題：「政府應該開放大麻合法化」。歡迎所有社員參加。",
    links: {
      line: "https://line.me/R/ti/g/example2",
      discord: "",
      meeting: "https://meet.google.com/example2",
    },
  },
  {
    title: "社內討論：辯論技巧分享",
    type: "社內討論",
    date: "2026-02-10",
    time: "18:30",
    format: "",
    description:
      "本次社課將由學長姐分享辯論技巧，包括反駁技巧、時間管理、論點建構等。",
    links: {
      line: "https://line.me/R/ti/g/example3",
      discord: "https://discord.gg/example3",
      meeting: "",
    },
  },
  {
    title: "論辯學校聯合辯論賽",
    type: "跨校",
    date: "2026-02-22",
    time: "10:00",
    format: "議會制",
    description:
      "與辯士學校、論辯學校、思辯學校聯合舉辦的辯論賽。歡迎所有對辯論有興趣的同學參加。",
    links: {
      line: "https://line.me/R/ti/g/example4",
      discord: "https://discord.gg/example4",
      meeting: "https://zoom.us/j/example4",
    },
  },
  {
    title: "新生訓練營",
    type: "社內討論",
    date: "2026-02-12",
    time: "14:00",
    format: "",
    description:
      "針對新加入社團的同學，介紹辯論基本概念、賽制、以及社團運作方式。",
    links: {
      line: "",
      discord: "https://discord.gg/example5",
      meeting: "https://teams.microsoft.com/example5",
    },
  },
];

// 將測試資料加入 Firestore 的函式
async function addTestActivities() {
  // 動態載入 Firebase 函式（假設你已經在 main.jsx 中初始化 Firebase）
  const { createActivity } = await import("./src/firebase/activities.js");

  console.log("開始建立測試活動資料...");

  for (let i = 0; i < testActivities.length; i++) {
    try {
      const id = await createActivity(testActivities[i]);
      console.log(
        `✅ 成功建立活動 ${i + 1}: ${testActivities[i].title} (ID: ${id})`,
      );
    } catch (error) {
      console.error(`❌ 建立活動 ${i + 1} 失敗:`, error);
    }
  }

  console.log("測試資料建立完成！重新整理頁面查看結果。");
}

// 使用說明：
// 1. 確保 Firebase 已正確設定
// 2. 啟動開發伺服器 (npm run dev)
// 3. 開啟瀏覽器的開發者工具 (F12)
// 4. 切換到 Console 標籤
// 5. 複製此檔案的內容並貼上
// 6. 執行 addTestActivities()
// 7. 重新整理頁面查看新增的活動

console.log("測試資料已載入，執行 addTestActivities() 來建立範例活動");
