// scripts/fixInvitationsMissingEndTime.js
// 針對缺少 endTime 的 invitations，自動補齊對應 team_events 的 endTime
// 用法：node scripts/fixInvitationsMissingEndTime.js

const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function fixInvitations() {
  const invitationsRef = db.collection("invitations");
  const invitationsSnap = await invitationsRef.get();
  let updateCount = 0;

  for (const doc of invitationsSnap.docs) {
    const invitation = doc.data();
    if (invitation.endTime) continue;
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

fixInvitations().catch(console.error);
