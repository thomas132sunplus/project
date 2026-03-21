// scripts/fixInvitationEndTime.js
// 用於批次修復 Firestore invitations 的 endTime 欄位
// 需先安裝 firebase-admin：npm install firebase-admin

const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json"); // 請放你的 serviceAccountKey.json

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function fixInvitationsEndTime() {
  const invitationsRef = db.collection("invitations");
  const invitationsSnap = await invitationsRef.get();
  let updateCount = 0;

  for (const doc of invitationsSnap.docs) {
    const invitation = doc.data();
    if (invitation.endTime) continue; // 已有 endTime 不處理
    if (!invitation.practiceTime || !invitation.fromTeam) continue;

    // 查詢對應的 team_events
    const eventsSnap = await db
      .collection("team_events")
      .where("teamId", "==", invitation.fromTeam)
      .where("startTime", "==", invitation.practiceTime)
      .get();
    if (eventsSnap.empty) continue;
    const event = eventsSnap.docs[0].data();
    if (!event.endTime) continue;

    // 補寫 endTime
    await doc.ref.update({ endTime: event.endTime });
    updateCount++;
    console.log(`Updated invitation ${doc.id} with endTime:`, event.endTime);
  }
  console.log(`\n修復完成，共補齊 ${updateCount} 筆 invitations 的 endTime！`);
}

fixInvitationsEndTime().catch(console.error);
