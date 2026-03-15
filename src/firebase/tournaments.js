// tournaments.js - 盃賽相關的 Firestore 操作

import { db } from "./config";
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import {
  notifyTournamentUpdate,
  getTeamMemberIds,
} from "./notificationHelpers";

const COLLECTION_NAME = "tournaments";

/**
 * 建立新盃賽
 * @param {Object} tournamentData - 盃賽資料
 * @param {string} userId - 建立者 ID
 * @returns {Promise<string>} 新盃賽的 ID
 */
export async function createTournament(tournamentData, userId) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...tournamentData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      participatingTeams: tournamentData.participatingTeams || [],
    });
    return docRef.id;
  } catch (error) {
    console.error("建立盃賽失敗:", error);
    throw error;
  }
}

/**
 * 取得所有盃賽（按日期排序）
 * @returns {Promise<Array>} 盃賽列表
 */
export async function getAllTournaments() {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("取得盃賽列表失敗:", error);
    throw error;
  }
}

/**
 * 取得單一盃賽詳細資訊
 * @param {string} tournamentId - 盃賽 ID
 * @returns {Promise<Object>} 盃賽資料
 */
export async function getTournament(tournamentId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, tournamentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    } else {
      throw new Error("找不到該盃賽");
    }
  } catch (error) {
    console.error("取得盃賽失敗:", error);
    throw error;
  }
}

/**
 * 更新盃賽資訊
 * @param {string} tournamentId - 盃賽 ID
 * @param {Object} updates - 要更新的資料
 * @param {string} [updateType] - 更新類型 (辨題公布/循環圖更新/賽程調整/結果公布)
 * @returns {Promise<void>}
 */
export async function updateTournament(
  tournamentId,
  updates,
  updateType = "資訊更新",
) {
  try {
    const docRef = doc(db, COLLECTION_NAME, tournamentId);

    // 獲取盃賽資訊
    const tournamentSnap = await getDoc(docRef);
    const tournamentData = tournamentSnap.data();

    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    // 發送通知給所有參賽隊伍成員
    try {
      if (
        tournamentData?.participatingTeams &&
        tournamentData.participatingTeams.length > 0
      ) {
        // 獲取所有參賽隊伍的成員 ID
        const allMemberIds = [];
        for (const teamId of tournamentData.participatingTeams) {
          const memberIds = await getTeamMemberIds(teamId);
          allMemberIds.push(...memberIds);
        }

        // 去除重複的成員 ID
        const uniqueMemberIds = [...new Set(allMemberIds)];

        if (uniqueMemberIds.length > 0) {
          await notifyTournamentUpdate(
            tournamentId,
            tournamentData.name || "盃賽",
            updateType,
            uniqueMemberIds,
          );
          console.log(`✅ 已發送盃賽通知給 ${uniqueMemberIds.length} 位成員`);
        }
      }
    } catch (notifError) {
      console.error("❌ 發送盃賽通知失敗:", notifError);
    }
  } catch (error) {
    console.error("更新盃賽失敗:", error);
    throw error;
  }
}

/**
 * 刪除盃賽
 * @param {string} tournamentId - 盃賽 ID
 * @returns {Promise<void>}
 */
export async function deleteTournament(tournamentId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, tournamentId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("刪除盃賽失敗:", error);
    throw error;
  }
}

/**
 * 新增參賽隊伍到盃賽
 * @param {string} tournamentId - 盃賽 ID
 * @param {string} teamId - 隊伍 ID
 * @returns {Promise<void>}
 */
export async function addTeamToTournament(tournamentId, teamId) {
  try {
    const tournament = await getTournament(tournamentId);
    const updatedTeams = [...(tournament.participatingTeams || []), teamId];
    await updateTournament(tournamentId, {
      participatingTeams: updatedTeams,
    });
  } catch (error) {
    console.error("新增參賽隊伍失敗:", error);
    throw error;
  }
}
