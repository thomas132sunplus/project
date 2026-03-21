// scripts/checkInvitationsMissingEndTime.js
// 檢查 Firestore invitations 缺少 endTime 或 endTime 型別異常的紀錄
// 用法：node scripts/checkInvitationsMissingEndTime.js

const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function checkInvitations() {
  const invitationsRef = db.collection("invitations");
  const invitationsSnap = await invitationsRef.get();
  let missing = [];
  let typeError = [];

  for (const doc of invitationsSnap.docs) {
    const data = doc.data();
    // 檢查 endTime 缺失
    if (!data.endTime) {
      missing.push({
        id: doc.id,
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
  console.log(
    `\n=== endTime 型別異常的 invitations（共 ${typeError.length} 筆） ===`,
  );
  typeError.forEach((item) => console.log(item));
  console.log("\n檢查完成！");
}

checkInvitations().catch(console.error);
