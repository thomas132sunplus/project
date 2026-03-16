import { db } from "./config";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

const GUIDE_COLLECTION = "guide_topics";

// 取得所有主題（即時監聽）
export function subscribeToGuideTopics(callback) {
  return onSnapshot(collection(db, GUIDE_COLLECTION), (snapshot) => {
    const topics = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(topics);
  });
}

// 新增主題
export async function addGuideTopic(topic) {
  const docRef = await addDoc(collection(db, GUIDE_COLLECTION), {
    ...topic,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// 更新主題
export async function updateGuideTopic(id, data) {
  await updateDoc(doc(db, GUIDE_COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// 刪除主題
export async function deleteGuideTopic(id) {
  await deleteDoc(doc(db, GUIDE_COLLECTION, id));
}

// 新增卡片
export async function addGuideCard(topicId, card) {
  const topicRef = doc(db, GUIDE_COLLECTION, topicId);
  const topicSnap = await getDoc(topicRef);
  if (!topicSnap.exists()) throw new Error("找不到主題");
  const prevCards = topicSnap.data().cards || [];
  await updateDoc(topicRef, {
    cards: [...prevCards, card],
    updatedAt: serverTimestamp(),
  });
}

// 更新卡片
export async function updateGuideCard(topicId, cardIdx, card) {
  const topicRef = doc(db, GUIDE_COLLECTION, topicId);
  const topicSnap = await getDoc(topicRef);
  if (!topicSnap.exists()) throw new Error("找不到主題");
  const prevCards = topicSnap.data().cards || [];
  prevCards[cardIdx] = card;
  await updateDoc(topicRef, {
    cards: prevCards,
    updatedAt: serverTimestamp(),
  });
}

// 刪除卡片
export async function deleteGuideCard(topicId, cardIdx) {
  const topicRef = doc(db, GUIDE_COLLECTION, topicId);
  const topicSnap = await getDoc(topicRef);
  if (!topicSnap.exists()) throw new Error("找不到主題");
  const prevCards = topicSnap.data().cards || [];
  prevCards.splice(cardIdx, 1);
  await updateDoc(topicRef, {
    cards: prevCards,
    updatedAt: serverTimestamp(),
  });
}
