// scripts/checkInvitationsMissingEndTime.js
// 檢查 Firestore invitations 缺少 endTime 或 endTime 型別異常的紀錄
// 預設忽略 status=deleted 的歷史資料；若要一併檢查請加上 --include-deleted
// 用法：node scripts/checkInvitationsMissingEndTime.js [--include-deleted]

import { getAdminDb } from "./adminApp.js";

const db = getAdminDb();
const includeDeleted = process.argv.includes("--include-deleted");

function shouldIgnoreInvitation(data) {
  return !includeDeleted && data.status === "deleted";
}

async function checkInvitations() {
  const invitationsRef = db.collection("invitations");
  const invitationsSnap = await invitationsRef.get();
  let missing = [];
  let typeError = [];
  let ignoredDeletedMissing = 0;

  for (const doc of invitationsSnap.docs) {
    const data = doc.data();
    if (shouldIgnoreInvitation(data)) {
      if (!data.endTime) {
        ignoredDeletedMissing++;
      }
      continue;
    }

    // 檢查 endTime 缺失
    if (!data.endTime) {
      missing.push({
        id: doc.id,
        status: data.status,
        practiceTime: data.practiceTime,
        endTime: data.endTime,
      });
      continue;
    }
    // 檢查 endTime 型別
    if (
      typeof data.endTime !== "object" &&
      typeof data.endTime !== "string" &&
      typeof data.endTime !== "number"
    ) {
      typeError.push({
        id: doc.id,
        endTime: data.endTime,
        type: typeof data.endTime,
      });
    }
  }

  console.log(
    `\n=== 缺少 endTime 的 invitations（共 ${missing.length} 筆） ===`,
  );
  missing.forEach((item) => console.log(item));

  if (!includeDeleted) {
    console.log(
      `\n已略過 deleted 歷史邀請中缺少 endTime 的 ${ignoredDeletedMissing} 筆資料。若要連 deleted 一起檢查，請改用 --include-deleted。`,
    );
  }

  console.log(
    `\n=== endTime 型別異常的 invitations（共 ${typeError.length} 筆） ===`,
  );
  typeError.forEach((item) => console.log(item));
  console.log("\n檢查完成！");
}

checkInvitations().catch(console.error);
