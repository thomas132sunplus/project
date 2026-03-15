// Firestore 資料庫操作函式
// 這個檔案包含所有與 activities collection 相關的 CRUD 操作

import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  doc, 
  deleteDoc,
  updateDoc,
  Timestamp,
  orderBy,
  query
} from 'firebase/firestore';
import { db } from './config';

// Collection 名稱
const ACTIVITIES_COLLECTION = 'activities';

/**
 * 取得所有活動
 * @returns {Promise<Array>} 活動陣列
 */
export const getAllActivities = async () => {
  try {
    // 建立查詢，按日期排序
    const q = query(
      collection(db, ACTIVITIES_COLLECTION),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const activities = [];
    
    querySnapshot.forEach((doc) => {
      activities.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return activities;
  } catch (error) {
    console.error('取得活動列表時發生錯誤：', error);
    throw error;
  }
};

/**
 * 取得單一活動詳細資訊
 * @param {string} activityId - 活動 ID
 * @returns {Promise<Object>} 活動物件
 */
export const getActivityById = async (activityId) => {
  try {
    const docRef = doc(db, ACTIVITIES_COLLECTION, activityId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } else {
      throw new Error('找不到此活動');
    }
  } catch (error) {
    console.error('取得活動詳細資訊時發生錯誤：', error);
    throw error;
  }
};

/**
 * 建立新活動
 * @param {Object} activityData - 活動資料
 * @returns {Promise<string>} 新建立活動的 ID
 */
export const createActivity = async (activityData) => {
  try {
    // 新增活動到 Firestore
    const docRef = await addDoc(collection(db, ACTIVITIES_COLLECTION), {
      ...activityData,
      createdAt: Timestamp.now() // 加入建立時間戳記
    });
    
    console.log('活動建立成功，ID：', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('建立活動時發生錯誤：', error);
    throw error;
  }
};

/**
 * 更新活動資訊
 * @param {string} activityId - 活動 ID
 * @param {Object} updatedData - 要更新的資料
 * @returns {Promise<void>}
 */
export const updateActivity = async (activityId, updatedData) => {
  try {
    const docRef = doc(db, ACTIVITIES_COLLECTION, activityId);
    await updateDoc(docRef, {
      ...updatedData,
      updatedAt: Timestamp.now() // 加入更新時間戳記
    });
    
    console.log('活動更新成功');
  } catch (error) {
    console.error('更新活動時發生錯誤：', error);
    throw error;
  }
};

/**
 * 刪除活動
 * @param {string} activityId - 活動 ID
 * @returns {Promise<void>}
 */
export const deleteActivity = async (activityId) => {
  try {
    await deleteDoc(doc(db, ACTIVITIES_COLLECTION, activityId));
    console.log('活動刪除成功');
  } catch (error) {
    console.error('刪除活動時發生錯誤：', error);
    throw error;
  }
};
