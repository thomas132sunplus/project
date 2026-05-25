// practiceMatches.js - 練習賽相關的 Firestore 操作

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
import { getMessages } from "./practiceMatchMessages";
import { getFiles, deleteFile } from "./practiceMatchFiles";
import { getRecordings, deleteRecording } from "./practiceMatchRecordings";
import { getCalls, deleteCall } from "./practiceMatchCalls";

const COLLECTION_NAME = "practice_matches";

/**
 * 建立新練習賽（從邀請建立）
 * @param {Object} matchData - 練習賽資料
 * @param {string} userId - 建立者 ID
 * @returns {Promise<string>} 新練習賽的 ID
 */
export async function createPracticeMatch(matchData, userId) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...matchData,
      status: "scheduled",
      matchInfo: matchData.matchInfo || {
        format: "single", // single 或 double
        propositionOrder: [], // 持方順序，雙持時使用（向後兼容）
        positions: {}, // 持方設定: { teamId: "持正"|"持反"|"先正後反"|"先反後正" }
        date: "",
        time: "",
        venue: "",
        refreshments: {}, // { teamId: "負責項目" }
        contacts: {}, // { teamId: { name: "", phone: "" } }
      },
      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("建立練習賽失敗:", error);
    throw error;
  }
}

/**
 * 取得練習賽詳細資訊
 * @param {string} matchId - 練習賽 ID
 * @returns {Promise<Object>} 練習賽資料
 */
export async function getPracticeMatch(matchId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, matchId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    } else {
      throw new Error("找不到該練習賽");
    }
  } catch (error) {
    console.error("取得練習賽失敗:", error);
    throw error;
  }
}

/**
 * 取得隊伍的所有練習賽
 * @param {string} teamId - 隊伍 ID
 * @returns {Promise<Array>} 練習賽列表
 */
export async function getTeamMatches(teamId) {
  try {
    // 查詢正方或反方包含該隊伍的練習賽
    const q1 = query(
      collection(db, COLLECTION_NAME),
      where("affirmativeTeam", "==", teamId),
      orderBy("scheduledTime", "desc"),
    );
    const q2 = query(
      collection(db, COLLECTION_NAME),
      where("negativeTeam", "==", teamId),
      orderBy("scheduledTime", "desc"),
    );

    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(q1),
      getDocs(q2),
    ]);

    const matches1 = snapshot1.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const matches2 = snapshot2.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 合併並去重
    const allMatches = [...matches1, ...matches2];
    const uniqueMatches = Array.from(
      new Map(allMatches.map((m) => [m.id, m])).values(),
    );

    return uniqueMatches.sort((a, b) => b.scheduledTime - a.scheduledTime);
  } catch (error) {
    console.error("取得隊伍練習賽失敗:", error);
    throw error;
  }
}

/**
 * 取得盃賽的所有練習賽
 * @param {string} tournamentId - 盃賽 ID
 * @returns {Promise<Array>} 練習賽列表
 */
export async function getTournamentMatches(tournamentId) {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("tournamentId", "==", tournamentId),
      orderBy("scheduledTime", "desc"),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("取得盃賽練習賽失敗:", error);
    throw error;
  }
}

/**
 * 更新練習賽資訊
 * @param {string} matchId - 練習賽 ID
 * @param {Object} updates - 要更新的資料
 * @returns {Promise<void>}
 */
export async function updatePracticeMatch(matchId, updates) {
  try {
    const docRef = doc(db, COLLECTION_NAME, matchId);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error("更新練習賽失敗:", error);
    throw error;
  }
}

/**
 * 確認練習賽
 * @param {string} matchId - 練習賽 ID
 * @returns {Promise<void>}
 */
export async function confirmPracticeMatch(matchId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, matchId);
    await updateDoc(docRef, {
      status: "confirmed",
      confirmedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("確認練習賽失敗:", error);
    throw error;
  }
}

/**
 * 完成練習賽
 * @param {string} matchId - 練習賽 ID
 * @returns {Promise<void>}
 */
export async function completePracticeMatch(matchId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, matchId);
    await updateDoc(docRef, {
      status: "completed",
    });
  } catch (error) {
    console.error("完成練習賽失敗:", error);
    throw error;
  }
}

/**
 * 取消練習賽
 * @param {string} matchId - 練習賽 ID
 * @returns {Promise<void>}
 */
export async function cancelPracticeMatch(matchId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, matchId);
    await updateDoc(docRef, {
      status: "cancelled",
    });
  } catch (error) {
    console.error("取消練習賽失敗:", error);
    throw error;
  }
}

/**
 * 發起取消練習賽請求
 * @param {string} matchId - 練習賽 ID
 * @param {string} requestingTeamId - 發起取消的隊伍 ID
 * @returns {Promise<void>}
 */
export async function requestCancelPracticeMatch(matchId, requestingTeamId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, matchId);
    await updateDoc(docRef, {
      cancelRequest: {
        requestedBy: requestingTeamId,
        requestedAt: serverTimestamp(),
        status: "pending",
      },
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("發起取消練習賽請求失敗:", error);
    throw error;
  }
}

/**
 * 刪除練習賽
 * @param {string} matchId - 練習賽 ID
 * @returns {Promise<void>}
 */
export async function deletePracticeMatch(matchId) {
  try {
    const docRef = doc(db, COLLECTION_NAME, matchId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("刪除練習賽失敗:", error);
    throw error;
  }
}

/**
 * 連帶刪除練習賽及其所有子資料（訊息、檔案、錄音、通話記錄）
 * @param {string} matchId - 練習賽 ID
 * @returns {Promise<void>}
 */
export async function deletePracticeMatchCascade(matchId) {
  // 刪除訊息
  try {
    const messages = await getMessages(matchId);
    await Promise.all(
      messages.map((m) =>
        deleteDoc(doc(db, "practice_match_messages", m.id)).catch((err) =>
          console.warn("刪除訊息失敗:", m.id, err),
        ),
      ),
    );
  } catch (err) {
    console.warn("讀取/刪除練習賽訊息失敗:", err);
  }
  // 刪除檔案
  try {
    const files = await getFiles(matchId);
    await Promise.all(
      files.map((f) =>
        deleteFile(f.id, f.storagePath).catch((err) =>
          console.warn("刪除檔案失敗:", f.id, err),
        ),
      ),
    );
  } catch (err) {
    console.warn("讀取/刪除練習賽檔案失敗:", err);
  }
  // 刪除錄音
  try {
    const recordings = await getRecordings(matchId);
    await Promise.all(
      recordings.map((r) =>
        deleteRecording(r.id, r.storagePath).catch((err) =>
          console.warn("刪除錄音失敗:", r.id, err),
        ),
      ),
    );
  } catch (err) {
    console.warn("讀取/刪除練習賽錄音失敗:", err);
  }
  // 刪除通話記錄
  try {
    const calls = await getCalls(matchId);
    await Promise.all(
      calls.map((c) =>
        deleteCall(c.id).catch((err) =>
          console.warn("刪除通話記錄失敗:", c.id, err),
        ),
      ),
    );
  } catch (err) {
    console.warn("讀取/刪除練習賽通話記錄失敗:", err);
  }
  // 最後刪除練習賽本身
  await deletePracticeMatch(matchId);
}

/**
 * 獲取用戶參與的所有練習賽（根據隊伍 ID 列表）
 * @param {Array<string>} teamIds - 用戶的隊伍 ID 列表
 * @returns {Promise<Array>} 練習賽列表
 */
export async function getUserPracticeMatches(teamIds) {
  try {
    if (!teamIds || teamIds.length === 0) {
      return [];
    }

    // Firestore 'in' 查詢最多 30 個值；一般使用者隊伍數遠低於此
    const chunks = [];
    for (let i = 0; i < teamIds.length; i += 30) {
      chunks.push(teamIds.slice(i, i + 30));
    }

    const matchesRef = collection(db, COLLECTION_NAME);
    const matchesMap = new Map();

    for (const chunk of chunks) {
      // 分別查詢 fromTeam / toTeam / affirmativeTeam / negativeTeam，避免讀取整個 collection 造成規則拒絕
      const queries = [
        query(matchesRef, where("fromTeam", "in", chunk)),
        query(matchesRef, where("toTeam", "in", chunk)),
        query(matchesRef, where("affirmativeTeam", "in", chunk)),
        query(matchesRef, where("negativeTeam", "in", chunk)),
      ];

      const snapshots = await Promise.all(
        queries.map((q) =>
          getDocs(q).catch((err) => {
            console.warn(
              "getUserPracticeMatches 子查詢失敗:",
              err?.code || err,
            );
            return null;
          }),
        ),
      );

      for (const snap of snapshots) {
        if (!snap) continue;
        snap.forEach((docSnap) => {
          if (!matchesMap.has(docSnap.id)) {
            matchesMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
          }
        });
      }
    }

    const matches = Array.from(matchesMap.values());
    console.log("getUserPracticeMatches - 匹配到的練習賽數量:", matches.length);

    // 客戶端排序（按日期降序）
    matches.sort((a, b) => {
      const aDate = a.matchInfo?.date || a.scheduledTime || "";
      const bDate = b.matchInfo?.date || b.scheduledTime || "";
      return String(bDate).localeCompare(String(aDate));
    });

    return matches;
  } catch (error) {
    console.error("獲取用戶練習賽失敗:", error);
    throw error;
  }
}

/**
 * 更新練習賽資訊整理區
 * @param {string} matchId - 練習賽 ID
 * @param {Object} matchInfo - 資訊整理區資料
 * @returns {Promise<void>}
 */
export async function updatePracticeMatchInfo(matchId, matchInfo) {
  try {
    const docRef = doc(db, COLLECTION_NAME, matchId);
    await updateDoc(docRef, {
      matchInfo: matchInfo,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("更新練習賽資訊失敗:", error);
    throw error;
  }
}

/**
 * 清理已過期的練習賽（日期已過）
 * @param {Array} matches - 練習賽列表（可選擇性帶 invitation 欄位作為時間後援）
 * @returns {Array<Object>} 過期的練習賽列表（含 id、fromTeam、toTeam）
 */
export function getExpiredMatches(matches) {
  const now = new Date();
  const nowMs = now.getTime();
  const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const nowTimeStr = now.toTimeString().slice(0, 5); // HH:MM

  const toMillis = (val) => {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val) ? null : val.getTime();
    if (typeof val === "object" && typeof val.toMillis === "function")
      return val.toMillis();
    if (typeof val === "object" && typeof val.toDate === "function")
      return val.toDate().getTime();
    if (typeof val === "string" || typeof val === "number") {
      const d = new Date(val);
      return isNaN(d) ? null : d.getTime();
    }
    return null;
  };

  return matches.filter((match) => {
    if (match.status === "completed") return false;
    const date = match.matchInfo?.date;
    if (date) {
      if (date < todayStr) return true;
      if (date === todayStr) {
        const time = match.matchInfo?.time;
        if (time && time < nowTimeStr) return true;
      }
      return false;
    }
    // 未設定 matchInfo.date 時，改用 invitation 的時間判斷
    const inv = match.invitation;
    if (inv) {
      const invEnd = toMillis(inv.endTime) || toMillis(inv.practiceTime);
      if (invEnd && invEnd < nowMs) return true;
    }
    return false;
  });
}
