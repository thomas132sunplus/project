// refereeInvitations.js - 裁判邀請（邀裁）相關的 Firestore 操作
// 媒合方式同隊伍練習賽：一鍵發送多邀請，先同意者配對成功，其餘自動取消

import { db } from "./config";
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { createNotification, NOTIFICATION_TYPES } from "./notifications";

const COLLECTION_NAME = "referee_invitations";

function toDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === "object" && typeof val.toDate === "function")
    return val.toDate();
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    return isNaN(d) ? null : d;
  }
  return null;
}

/**
 * 一鍵發送多筆邀裁邀請（同一場練習賽、同一 batchId）
 * @param {Object} params
 * @param {string} params.matchId - 練習賽 ID
 * @param {string} params.tournamentId - 盃賽 ID
 * @param {string} params.tournamentName - 盃賽名稱
 * @param {string} params.fromUserId - 發送者（選手）ID
 * @param {string} params.fromUserName - 發送者名稱
 * @param {string} params.fromTeam - 練習賽其中一隊 ID
 * @param {string} params.toTeam - 練習賽另一隊 ID
 * @param {string} params.fromTeamName
 * @param {string} params.toTeamName
 * @param {Date|string} params.practiceTime - 練習賽時間
 * @param {Date|string} params.endTime - 練習賽結束時間
 * @param {Array<{id:string,name:string}>} params.referees - 受邀裁判
 * @returns {Promise<string>} batchId
 */
export async function createRefereeInvitationsBatch(params) {
  const {
    matchId,
    tournamentId,
    tournamentName,
    fromUserId,
    fromUserName,
    fromTeam,
    toTeam,
    fromTeamName,
    toTeamName,
    practiceTime,
    endTime,
    referees,
  } = params;

  if (!referees || referees.length === 0) {
    throw new Error("請至少選擇一位裁判");
  }

  const batchId = `${matchId}_${Date.now()}`;
  const pTime = toDate(practiceTime);
  const eTime = toDate(endTime);

  for (const ref of referees) {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      matchId,
      tournamentId: tournamentId || null,
      tournamentName: tournamentName || "",
      batchId,
      fromUserId,
      fromUserName: fromUserName || "",
      fromTeam: fromTeam || null,
      toTeam: toTeam || null,
      fromTeamName: fromTeamName || "",
      toTeamName: toTeamName || "",
      refereeId: ref.id,
      refereeName: ref.name || "",
      practiceTime: pTime,
      endTime: eTime,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    // 通知裁判
    try {
      const timeStr = pTime ? pTime.toLocaleString("zh-TW") : "";
      await createNotification(
        ref.id,
        NOTIFICATION_TYPES.REFEREE_INVITATION,
        `${fromUserName || "某位選手"} 邀請您擔任裁判`,
        `${tournamentName || "練習賽"}：${fromTeamName || "A隊"} vs ${toTeamName || "B隊"}${timeStr ? `（${timeStr}）` : ""}`,
        docRef.id,
        "/profile?tab=referee",
        { fromUserId, matchId, type: "referee_invitation" },
      );
    } catch (e) {
      console.warn("發送邀裁通知失敗:", e?.message);
    }
  }

  return batchId;
}

/**
 * 取得某裁判收到的所有邀請
 */
export async function getRefereeReceivedInvitations(refereeId) {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("refereeId", "==", refereeId),
  );
  const snapshot = await getDocs(q);
  const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  return list.sort(
    (a, b) =>
      (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0),
  );
}

/**
 * 取得某選手發出的所有邀請（用於裁判區顯示狀態）
 */
export async function getSentRefereeInvitations(fromUserId) {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("fromUserId", "==", fromUserId),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * 取得某場練習賽已配對成功（accepted）的裁判邀請
 */
export async function getAcceptedRefereesByMatch(matchId) {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("matchId", "==", matchId),
    where("status", "==", "accepted"),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * 檢查某場練習賽是否已有裁判接受
 */
async function matchHasAcceptedReferee(matchId) {
  const accepted = await getAcceptedRefereesByMatch(matchId);
  return accepted.length > 0;
}

/**
 * 接受邀裁邀請（先同意者配對成功，自動取消同場其他邀請）
 */
export async function acceptRefereeInvitation(invitationId) {
  const docRef = doc(db, COLLECTION_NAME, invitationId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error("找不到該邀請");
  const inv = { id: snap.id, ...snap.data() };

  // 防呆：若該場已有裁判接受，則拒絕
  if (await matchHasAcceptedReferee(inv.matchId)) {
    throw new Error("此場練習賽已有其他裁判接受邀請");
  }

  await updateDoc(docRef, {
    status: "accepted",
    respondedAt: serverTimestamp(),
  });

  // 自動取消同場其他 pending 邀請
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("matchId", "==", inv.matchId),
      where("status", "==", "pending"),
    );
    const others = await getDocs(q);
    await Promise.all(
      others.docs
        .filter((d) => d.id !== invitationId)
        .map((d) =>
          updateDoc(doc(db, COLLECTION_NAME, d.id), {
            status: "cancelled",
            respondedAt: serverTimestamp(),
          }).catch((e) => console.warn("取消其他邀裁邀請失敗:", d.id, e)),
        ),
    );
  } catch (e) {
    console.warn("自動取消其他邀裁邀請失敗:", e?.message);
  }

  // 通知發送者
  try {
    await createNotification(
      inv.fromUserId,
      NOTIFICATION_TYPES.REFEREE_INVITATION_RESPONSE,
      `${inv.refereeName || "裁判"} 接受了您的邀裁邀請`,
      `${inv.tournamentName || "練習賽"}：${inv.fromTeamName || "A隊"} vs ${inv.toTeamName || "B隊"} 已成功配對裁判`,
      invitationId,
      inv.matchId
        ? `/practice-match-discussion/${inv.matchId}`
        : "/referee-zone",
      { refereeId: inv.refereeId, matchId: inv.matchId, response: "accepted" },
    );
  } catch (e) {
    console.warn("發送邀裁回應通知失敗:", e?.message);
  }

  return inv;
}

/**
 * 拒絕邀裁邀請
 */
export async function declineRefereeInvitation(invitationId) {
  const docRef = doc(db, COLLECTION_NAME, invitationId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error("找不到該邀請");
  const inv = { id: snap.id, ...snap.data() };

  await updateDoc(docRef, {
    status: "declined",
    respondedAt: serverTimestamp(),
  });

  try {
    await createNotification(
      inv.fromUserId,
      NOTIFICATION_TYPES.REFEREE_INVITATION_RESPONSE,
      `${inv.refereeName || "裁判"} 婉拒了您的邀裁邀請`,
      `${inv.tournamentName || "練習賽"}：${inv.fromTeamName || "A隊"} vs ${inv.toTeamName || "B隊"}`,
      invitationId,
      "/referee-zone",
      { refereeId: inv.refereeId, matchId: inv.matchId, response: "declined" },
    );
  } catch (e) {
    console.warn("發送邀裁回應通知失敗:", e?.message);
  }

  return inv;
}

/**
 * 練習賽取消時，連帶取消該場的裁判配對，並以 email 通知裁判。
 * - 已配對成功（accepted）的裁判：取消配對並寄送通知 email
 * - 尚未回覆（pending）的邀請：一併標記取消（不另行通知）
 * @param {string} matchId - 練習賽 ID
 * @returns {Promise<number>} 受影響的邀請數量
 */
export async function cancelRefereePairingForMatch(matchId) {
  if (!matchId) return 0;
  let affected = 0;
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("matchId", "==", matchId),
    );
    const snapshot = await getDocs(q);
    const invitations = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    await Promise.all(
      invitations
        .filter((inv) => inv.status === "accepted" || inv.status === "pending")
        .map(async (inv) => {
          affected += 1;
          const wasAccepted = inv.status === "accepted";
          try {
            await updateDoc(doc(db, COLLECTION_NAME, inv.id), {
              status: "cancelled",
              respondedAt: serverTimestamp(),
            });
          } catch (e) {
            console.warn("取消邀裁配對失敗:", inv.id, e?.message);
          }
          // 僅對已配對成功的裁判寄送取消通知 email
          if (wasAccepted) {
            try {
              const timeStr = inv.practiceTime
                ? toDate(inv.practiceTime)?.toLocaleString("zh-TW") || ""
                : "";
              await createNotification(
                inv.refereeId,
                NOTIFICATION_TYPES.REFEREE_INVITATION_RESPONSE,
                "練習賽已取消，邀裁配對同時取消",
                `${inv.tournamentName || "練習賽"}：${inv.fromTeamName || "A隊"} vs ${inv.toTeamName || "B隊"}${timeStr ? `（${timeStr}）` : ""} 已取消，您不需再擔任本場裁判。`,
                inv.id,
                "/profile?tab=referee",
                {
                  refereeId: inv.refereeId,
                  matchId,
                  response: "match_cancelled",
                },
              );
            } catch (e) {
              console.warn("發送裁判取消配對通知失敗:", e?.message);
            }
          }
        }),
    );
  } catch (e) {
    console.warn("取消該場邀裁配對失敗:", e?.message);
  }
  return affected;
}
