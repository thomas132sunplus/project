// scripts/fixInvitationsMissingEndTime.js
// 針對缺少 endTime 的 invitations，自動補齊對應 team_events 的 endTime
// 預設忽略 status=deleted 的歷史資料；若要一併修復請加上 --include-deleted
// 用法：node scripts/fixInvitationsMissingEndTime.js [--include-deleted]

import { getAdminDb } from "./adminApp.js";

const db = getAdminDb();
const includeDeleted = process.argv.includes("--include-deleted");

async function fixInvitations() {
  const invitationsRef = db.collection("invitations");
  const invitationsSnap = await invitationsRef.get();
  let updateCount = 0;
  let ignoredDeletedMissing = 0;

  for (const doc of invitationsSnap.docs) {
    const invitation = doc.data();

    if (!includeDeleted && invitation.status === "deleted") {
      if (!invitation.endTime) {
        ignoredDeletedMissing++;
      }
      continue;
    }

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

  if (!includeDeleted) {
    console.log(
      `\n已略過 deleted 歷史邀請中缺少 endTime 的 ${ignoredDeletedMissing} 筆資料。若要連 deleted 一起修復，請改用 --include-deleted。`,
    );
  }

  console.log(`\n修復完成，共補齊 ${updateCount} 筆 invitations 的 endTime！`);
}

fixInvitations().catch(console.error);
