// 活動卡片元件
// 在活動列表中顯示單一活動的摘要資訊

import { Link } from "react-router-dom";

export function ActivityCard({ activity }) {
  // 活動類型對應的顏色
  const typeColors = {
    比賽: "bg-red-100 text-red-800",
    練習賽: "bg-blue-100 text-blue-800",
    社內討論: "bg-green-100 text-green-800",
    跨校: "bg-purple-100 text-purple-800",
  };

  return (
    <Link to={`/activity/${activity.id}`}>
      <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 cursor-pointer border border-gray-200">
        {/* 活動名稱 */}
        <h3 className="text-xl font-bold text-gray-800 mb-3">
          {activity.title}
        </h3>

        {/* 活動類型標籤 */}
        <div className="mb-4">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${typeColors[activity.type] || "bg-gray-100 text-gray-800"}`}
          >
            {activity.type}
          </span>
        </div>

        {/* 活動日期時間 */}
        <div className="flex items-center gap-2 text-gray-600">
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
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span>{activity.date}</span>
          {activity.time && <span className="ml-2">{activity.time}</span>}
        </div>

        {/* 賽制資訊（如果有） */}
        {activity.format && (
          <div className="mt-3 text-sm text-gray-500">
            賽制：{activity.format}
          </div>
        )}
      </div>
    </Link>
  );
}
