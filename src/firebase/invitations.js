/**
 * 隱藏單筆邀請（設 status=deleted）
 * @param {string} invitationId - 邀請 ID
 * @returns {Promise<void>}
 */
export async function hideInvitation(invitationId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, invitationId);
    await updateDoc(docRef, {
      status: "deleted",
      respondedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("隱藏邀請失敗:", error);
    throw error;
  }
}

/**
 * 將邀請標記為過期（status=expired），避免被自動重新建立練習賽
 * @param {string} invitationId - 邀請 ID
 * @returns {Promise<void>}
 */
export async function markInvitationExpired(invitationId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, invitationId);
    await updateDoc(docRef, {
      status: "expired",
      respondedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("標記邀請過期失敗:", error);
    throw error;
  }
}

/**
 * 批次隱藏邀請（設 status=deleted）
 * @param {string[]} invitationIds - 邀請 ID 陣列
 * @returns {Promise<void>}
 */
export async function hideInvitationsBatch(invitationIds) {
  try {
    const batch = invitationIds.map((id) =>
      updateDoc(doc(db, COLLECTION_NAME, id), {
        status: "deleted",
        respondedAt: serverTimestamp(),
      }),
    );
    await Promise.all(batch);
  } catch (error) {
    console.error("批次隱藏邀請失敗:", error);
    throw error;
  }
}
/**
 * 將指定團隊配對下所有 accepted 邀請標記為 deleted（用於取消練習賽的後備清理）
 * @param {string} teamA
 * @param {string} teamB
 * @param {string} tournamentId
 * @returns {Promise<number>} 標記的邀請數量
 */
export async function hideAcceptedInvitationsByTeams(
  teamA,
  teamB,
  tournamentId,
) {
  try {
    const invitationsRef = collection(db, COLLECTION_NAME);
    // 查兩個方向：fromTeam==A,toTeam==B 與 fromTeam==B,toTeam==A
    const q1 = query(
      invitationsRef,
      where("tournamentId", "==", tournamentId),
      where("fromTeam", "==", teamA),
      where("toTeam", "==", teamB),
      where("status", "==", "accepted"),
    );
    const q2 = query(
      invitationsRef,
      where("tournamentId", "==", tournamentId),
      where("fromTeam", "==", teamB),
      where("toTeam", "==", teamA),
      where("status", "==", "accepted"),
    );
    const [s1, s2] = await Promise.all([
      getDocs(q1).catch(() => null),
      getDocs(q2).catch(() => null),
    ]);
    const ids = [];
    if (s1) s1.forEach((d) => ids.push(d.id));
    if (s2) s2.forEach((d) => ids.push(d.id));
    await Promise.all(
      ids.map((id) =>
        updateDoc(doc(db, COLLECTION_NAME, id), {
          status: "deleted",
          respondedAt: serverTimestamp(),
        }).catch((e) => console.warn("標記邀請 deleted 失敗:", id, e)),
      ),
    );
    return ids.length;
  } catch (err) {
    console.warn("hideAcceptedInvitationsByTeams 失敗:", err);
    return 0;
  }
}
/**
 * 取消同批其他邀請（同一 fromTeam, tournamentId, practiceTime，排除已接受的 invitationId）
 * @param {string} fromTeam - 發起隊伍 ID
 * @param {string} tournamentId - 盃賽 ID
 * @param {string} practiceTime - 練習賽時間
 * @param {string} acceptedInvitationId - 已接受的邀請 ID
 * @returns {Promise<void>}
 */
export async function cancelOtherInvitations(
  fromTeam,
  tournamentId,
  practiceTime,
  acceptedInvitationId,
) {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("fromTeam", "==", fromTeam),
      where("tournamentId", "==", tournamentId),
      where("practiceTime", "==", practiceTime),
      where("status", "==", "pending"),
    );
    const querySnapshot = await getDocs(q);
    const batch = [];
    querySnapshot.forEach((docSnap) => {
      if (docSnap.id !== acceptedInvitationId) {
        batch.push(
          updateDoc(doc(db, COLLECTION_NAME, docSnap.id), {
            status: "cancelled",
            respondedAt: serverTimestamp(),
          }),
        );
      }
    });
    await Promise.all(batch);
    console.log(`已自動取消 ${batch.length} 筆其他邀請`);
  } catch (error) {
    console.error("自動取消其他邀請失敗:", error);
    throw error;
  }
}
// invitations.js - 練習賽邀請相關的 Firestore 操作

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
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import {
  notifyPracticeInvitation,
  notifyInvitationResponse,
  getTeamMemberIds,
} from "./notificationHelpers";
import { getTeam } from "./teams";
import { getTournament } from "./tournaments";

const COLLECTION_NAME = "invitations";

/**
 * 建立新邀請
 * @param {Object} invitationData - 邀請資料
 * @returns {Promise<string>} 新邀請的 ID
 */
export async function createInvitation(invitationData) {
  try {
    // 強制轉型 practiceTime/endTime
    let data = { ...invitationData };
    if (data.practiceTime) {
      if (
        typeof data.practiceTime === "string" ||
        typeof data.practiceTime === "number"
      ) {
        data.practiceTime = new Date(data.practiceTime);
      }
    }
    // 強制要求 endTime 必填
    if (!data.endTime) {
      throw new Error("必須指定結束時間 (endTime)");
    }
    if (typeof data.endTime === "string" || typeof data.endTime === "number") {
      data.endTime = new Date(data.endTime);
    }
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    // 發送通知給被邀請隊伍
    try {
      const toTeamMemberIds = await getTeamMemberIds(invitationData.toTeam);
      const fromTeamDoc = await getTeam(invitationData.fromTeam);
      const toTeamDoc = await getTeam(invitationData.toTeam);
      const tournamentDoc = invitationData.tournamentId
        ? await getTournament(invitationData.tournamentId)
        : null;

      if (toTeamMemberIds.length > 0) {
        await notifyPracticeInvitation(
          docRef.id,
          fromTeamDoc.name || "某隊伍",
          toTeamDoc.name || "您的隊伍",
          toTeamMemberIds,
          tournamentDoc?.name || "練習賽",
          invitationData.toTeam,
        );
        console.log("✅ 已發送練習賽邀請通知");
      }
    } catch (notifError) {
      console.error("❌ 發送邀請通知失敗:", notifError);
    }

    return docRef.id;
  } catch (error) {
    console.error("建立邀請失敗:", error);
    throw error;
  }
}

/**
 * 取得邀請詳細資訊
 * @param {string} invitationId - 邀請 ID
 * @returns {Promise<Object>} 邀請資料
 */
export async function getInvitation(invitationId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, invitationId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    } else {
      throw new Error("找不到該邀請");
    }
  } catch (error) {
    console.error("取得邀請失敗:", error);
    throw error;
  }
}

/**
 * 取得隊伍收到的邀請
 * @param {string} teamId - 隊伍 ID
 * @returns {Promise<Array>} 邀請列表
 */
export async function getTeamInvitations(teamId) {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("toTeam", "==", teamId),
    );
    const querySnapshot = await getDocs(q);
    const invitations = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    // 在客戶端排序，避免需要 Firestore 索引
    return invitations.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA; // 降序排列
    });
  } catch (error) {
    console.error("取得隊伍邀請失敗:", error);
    throw error;
  }
}

/**
 * 取得隊伍發出的邀請
 * @param {string} teamId - 隊伍 ID
 * @returns {Promise<Array>} 邀請列表
 */
export async function getTeamSentInvitations(teamId) {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("fromTeam", "==", teamId),
    );
    const querySnapshot = await getDocs(q);
    const invitations = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    // 在客戶端排序，避免需要 Firestore 索引
    return invitations.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA; // 降序排列
    });
  } catch (error) {
    console.error("取得發出的邀請失敗:", error);
    throw error;
  }
}

/**
 * 接受邀請
 * @param {string} invitationId - 邀請 ID
 * @param {string} chatRoomId - 聊天室 ID
 * @returns {Promise<void>}
 */
export async function acceptInvitation(invitationId, chatRoomId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, invitationId);

    // 獲取邀請資訊
    const invitationSnap = await getDoc(docRef);
    const invitationData = invitationSnap.data();

    await updateDoc(docRef, {
      status: "accepted",
      chatRoomId: chatRoomId,
      respondedAt: serverTimestamp(),
    });

    // 發送通知給邀請方隊伍
    try {
      const fromTeamMemberIds = await getTeamMemberIds(invitationData.fromTeam);
      const fromTeamDoc = await getTeam(invitationData.fromTeam);
      const toTeamDoc = await getTeam(invitationData.toTeam);

      if (fromTeamMemberIds.length > 0) {
        await notifyInvitationResponse(
          invitationId,
          fromTeamDoc.name || "發起隊伍",
          toTeamDoc.name || "接受隊伍",
          fromTeamMemberIds,
          "accepted",
        );
        console.log("✅ 已發送邀請接受通知");
      }
    } catch (notifError) {
      console.error("❌ 發送接受通知失敗:", notifError);
    }
  } catch (error) {
    console.error("接受邀請失敗:", error);
    throw error;
  }
}

/**
 * 拒絕邀請
 * @param {string} invitationId - 邀請 ID
 * @returns {Promise<void>}
 */
export async function declineInvitation(invitationId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, invitationId);

    // 獲取邀請資訊
    const invitationSnap = await getDoc(docRef);
    const invitationData = invitationSnap.data();

    await updateDoc(docRef, {
      status: "declined",
      respondedAt: serverTimestamp(),
    });

    // 發送通知給邀請方隊伍
    try {
      const fromTeamMemberIds = await getTeamMemberIds(invitationData.fromTeam);
      const fromTeamDoc = await getTeam(invitationData.fromTeam);
      const toTeamDoc = await getTeam(invitationData.toTeam);

      if (fromTeamMemberIds.length > 0) {
        await notifyInvitationResponse(
          invitationId,
          fromTeamDoc.name || "發起隊伍",
          toTeamDoc.name || "拒絕隊伍",
          fromTeamMemberIds,
          "declined",
        );
        console.log("✅ 已發送邀請拒絕通知");
      }
    } catch (notifError) {
      console.error("❌ 發送拒絕通知失敗:", notifError);
    }
  } catch (error) {
    console.error("拒絕邀請失敗:", error);
    throw error;
  }
}

/**
 * 確認邀請（建立練習賽後）
 * @param {string} invitationId - 邀請 ID
 * @param {string} matchId - 練習賽 ID
 * @returns {Promise<void>}
 */
export async function confirmInvitation(invitationId, matchId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, invitationId);
    await updateDoc(docRef, {
      status: "confirmed",
      matchId: matchId,
    });
  } catch (error) {
    console.error("確認邀請失敗:", error);
    throw error;
  }
}

/**
 * 獲取用戶所有已接受的邀請（根據隊伍 ID 列表）
 * @param {Array<string>} teamIds - 用戶的隊伍 ID 列表
 * @returns {Promise<Array>} 已接受的邀請列表
 */
export async function getAcceptedInvitations(teamIds) {
  try {
    if (!teamIds || teamIds.length === 0) {
      return [];
    }

    // Firestore 'in' 查詢最多 30 個值
    const chunks = [];
    for (let i = 0; i < teamIds.length; i += 30) {
      chunks.push(teamIds.slice(i, i + 30));
    }

    const invitationsRef = collection(db, COLLECTION_NAME);
    const invitationsMap = new Map();

    for (const chunk of chunks) {
      // 分別查詢 fromTeam / toTeam，避免讀取整個 collection 造成規則拒絕
      const queries = [
        query(
          invitationsRef,
          where("status", "==", "accepted"),
          where("fromTeam", "in", chunk),
        ),
        query(
          invitationsRef,
          where("status", "==", "accepted"),
          where("toTeam", "in", chunk),
        ),
      ];

      const snapshots = await Promise.all(
        queries.map((q) =>
          getDocs(q).catch((err) => {
            console.warn(
              "getAcceptedInvitations 子查詢失敗:",
              err?.code || err,
            );
            return null;
          }),
        ),
      );

      for (const snap of snapshots) {
        if (!snap) continue;
        snap.forEach((docSnap) => {
          if (!invitationsMap.has(docSnap.id)) {
            invitationsMap.set(docSnap.id, {
              id: docSnap.id,
              ...docSnap.data(),
            });
          }
        });
      }
    }

    const invitations = Array.from(invitationsMap.values());

    // 客戶端排序
    invitations.sort((a, b) => {
      const aTime =
        a.respondedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
      const bTime =
        b.respondedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    return invitations;
  } catch (error) {
    console.error("獲取已接受邀請失敗:", error);
    throw error;
  }
}
