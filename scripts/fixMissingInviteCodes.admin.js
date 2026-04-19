// fixMissingInviteCodes.admin.js
// 用 Firebase Admin SDK 為所有缺少 inviteCode 的隊伍補發唯一代碼
// 透過 GOOGLE_APPLICATION_CREDENTIALS 或 FIREBASE_SERVICE_ACCOUNT_PATH 提供憑證

import { getAdminDb } from "./adminApp.js";

const db = getAdminDb();

async function generateUniqueInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  let exists = true;
  while (exists) {
    code = Array.from(
      { length: 6 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
    const q = db.collection("teams").where("inviteCode", "==", code);
    const snapshot = await q.get();
    exists = !snapshot.empty;
  }
  return code;
}

async function fixMissingInviteCodes() {
  const teamsSnapshot = await db.collection("teams").get();
  let fixedCount = 0;
  for (const docSnap of teamsSnapshot.docs) {
    const team = docSnap.data();
    if (!team.inviteCode) {
      const inviteCode = await generateUniqueInviteCode();
      await db.collection("teams").doc(docSnap.id).update({ inviteCode });
      console.log(`隊伍 ${team.name || docSnap.id} 已補發代碼：${inviteCode}`);
      fixedCount++;
    }
  }
  if (fixedCount === 0) {
    console.log("所有隊伍皆已有 inviteCode");
  } else {
    console.log(`共補發 ${fixedCount} 組隊伍代碼`);
  }
}

fixMissingInviteCodes();
