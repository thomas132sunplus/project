// 活動詳細頁元件
// 顯示單一活動的完整資訊

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getActivityById } from "../firebase/activities";

export function ActivityDetail() {
  const { id } = useParams(); // 從網址取得活動 ID
  const navigate = useNavigate(); // 用於頁面導航

  // 狀態
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 當元件載入時，從 Firebase 取得活動詳細資訊
  useEffect(() => {
    fetchActivity();
  }, [id]);

  // 取得活動詳細資訊的函式
  const fetchActivity = async () => {
    try {
      setLoading(true);
      const data = await getActivityById(id);
      setActivity(data);
      setError(null);
    } catch (err) {
      console.error("載入活動詳細資訊失敗：", err);
      setError("找不到此活動");
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
  if (error || !activity) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button
          onClick={() => navigate("/")}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          返回活動列表
        </button>
      </div>
    );
  }

  // 活動類型對應的顏色
  const typeColors = {
    比賽: "bg-red-100 text-red-800",
    練習賽: "bg-blue-100 text-blue-800",
    社內討論: "bg-green-100 text-green-800",
    跨校: "bg-purple-100 text-purple-800",
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 返回按鈕 */}
      <button
        onClick={() => navigate("/")}
        className="mb-6 text-blue-600 hover:text-blue-800 flex items-center gap-2"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        返回活動列表
      </button>

      {/* 活動詳細資訊卡片 */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* 活動標題 */}
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          {activity.title}
        </h1>

        {/* 活動類型標籤 */}
        <div className="mb-6">
          <span
            className={`px-4 py-2 rounded-full text-sm font-medium ${typeColors[activity.type] || "bg-gray-100 text-gray-800"}`}
          >
            {activity.type}
          </span>
        </div>

        {/* 基本資訊區塊 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* 日期 */}
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-blue-600 mt-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <div>
              <div className="font-semibold text-gray-700">日期</div>
              <div className="text-gray-600">{activity.date}</div>
            </div>
          </div>

          {/* 時間 */}
          {activity.time && (
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-blue-600 mt-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <div className="font-semibold text-gray-700">時間</div>
                <div className="text-gray-600">{activity.time}</div>
              </div>
            </div>
          )}

          {/* 賽制 */}
          {activity.format && (
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-blue-600 mt-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <div>
                <div className="font-semibold text-gray-700">賽制</div>
                <div className="text-gray-600">{activity.format}</div>
              </div>
            </div>
          )}
        </div>

        {/* 活動描述 */}
        {activity.description && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-3">活動說明</h2>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {activity.description}
            </p>
          </div>
        )}

        {/* 外部連結區塊 */}
        {activity.links && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">外部連結</h2>
            <div className="space-y-3">
              {/* LINE 群組連結 */}
              {activity.links.line && (
                <a
                  href={activity.links.line}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition border border-green-200"
                >
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                    L
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">LINE 群組</div>
                    <div className="text-sm text-gray-600 truncate">
                      {activity.links.line}
                    </div>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              )}

              {/* Discord 頻道連結 */}
              {activity.links.discord && (
                <a
                  href={activity.links.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition border border-indigo-200"
                >
                  <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                    D
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">
                      Discord 頻道
                    </div>
                    <div className="text-sm text-gray-600 truncate">
                      {activity.links.discord}
                    </div>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              )}

              {/* 視訊會議連結 */}
              {activity.links.meeting && (
                <a
                  href={activity.links.meeting}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition border border-blue-200"
                >
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    M
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">視訊會議</div>
                    <div className="text-sm text-gray-600 truncate">
                      {activity.links.meeting}
                    </div>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
