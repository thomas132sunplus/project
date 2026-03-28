// fixMissingInviteCodes.js
// 一次性腳本：為所有缺少 inviteCode 的隊伍補發唯一代碼

import { db } from "../src/firebase/config.js";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore";

async function generateUniqueInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  let exists = true;
  while (exists) {
    code = Array.from(
      { length: 6 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
    const q = query(collection(db, "teams"), where("inviteCode", "==", code));
    const snapshot = await getDocs(q);
    exists = !snapshot.empty;
  }
  return code;
}

async function fixMissingInviteCodes() {
  const teamsSnapshot = await getDocs(collection(db, "teams"));
  let fixedCount = 0;
  for (const docSnap of teamsSnapshot.docs) {
    const team = docSnap.data();
    if (!team.inviteCode) {
      const inviteCode = await generateUniqueInviteCode();
      await updateDoc(doc(db, "teams", docSnap.id), { inviteCode });
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
