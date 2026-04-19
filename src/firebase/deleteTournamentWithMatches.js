// deleteTournamentWithMatches.js
// 刪除盃賽並連帶刪除所有相關練習賽房間、訊息、文件

import { deleteTournament, getTournament } from "./tournaments";
import { getTournamentMatches } from "./practiceMatches";
import { deletePracticeMatch } from "./practiceMatches";
import { getMessages } from "./practiceMatchMessages";
import { getFiles, deleteFile } from "./practiceMatchFiles";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "./config";

/**
 * 刪除盃賽及其所有相關練習賽房間、訊息、文件
 * @param {string} tournamentId
 * @param {string} currentUserId - 當前用戶 UID，用於授權驗證
 */
export async function deleteTournamentWithMatches(tournamentId, currentUserId) {
  // 授權檢查：確認呼叫者是盃賽建立者
  const tournament = await getTournament(tournamentId);
  if (!tournament || tournament.createdBy !== currentUserId) {
    throw new Error("無權限刪除此盃賽");
  }
  // 1. 取得所有相關練習賽
  const matches = await getTournamentMatches(tournamentId);
  for (const match of matches) {
    // 2. 刪除練習賽訊息
    const messages = await getMessages(match.id);
    for (const msg of messages) {
      await deleteDoc(doc(db, "practice_match_messages", msg.id));
    }
    // 3. 刪除練習賽文件
    const files = await getFiles(match.id);
    for (const file of files) {
      await deleteFile(file.id, file.storagePath);
    }
    // 4. 刪除練習賽房間本身
    await deletePracticeMatch(match.id);
  }
  // 5. 刪除盃賽
  await deleteTournament(tournamentId);
}
