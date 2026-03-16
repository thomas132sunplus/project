// 活動列表頁元件
// 顯示所有活動的卡片列表

import { useState, useEffect } from "react";
import { getAllActivities } from "../firebase/activities";
import { ActivityCard } from "./ActivityCard";

export function ActivityList() {
  // 狀態：活動列表
  const [activities, setActivities] = useState([]);
  // 狀態：載入中
  const [loading, setLoading] = useState(true);
  // 狀態：錯誤訊息
  const [error, setError] = useState(null);

  // 當元件載入時，從 Firebase 取得活動列表
  useEffect(() => {
    fetchActivities();
  }, []);

  // 取得活動列表的函式
  const fetchActivities = async () => {
    try {
      setLoading(true);
      const data = await getAllActivities();
      setActivities(data);
      setError(null);
    } catch (err) {
      console.error("載入活動失敗：", err);
      setError("無法載入活動列表，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  // 載入中的顯示
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">載入中...</div>
      </div>
    );
  }

  // 錯誤訊息的顯示
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 頁面標題 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">活動列表</h1>
        <p className="text-gray-600">瀏覽所有辯論活動</p>
      </div>

      {/* 活動卡片網格 */}
      {activities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      ) : (
        // 沒有活動時的顯示
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-4">目前沒有任何活動</p>
          <a
            href="/create"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            建立第一個活動
          </a>
        </div>
      )}
    </div>
  );
}
