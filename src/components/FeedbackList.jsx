// FeedbackList.jsx - 查看所有反饋（管理員頁面）

import { useState, useEffect } from "react";
import { getAllFeedback } from "../firebase/feedback";

export function FeedbackList() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, suggestion, bug, other

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      const data = await getAllFeedback();
      setFeedbacks(data);
    } catch (err) {
      console.error("載入反饋失敗:", err);
      alert("載入失敗，請重新整理頁面");
    } finally {
      setLoading(false);
    }
  };

  const filteredFeedbacks =
    filter === "all" ? feedbacks : feedbacks.filter((f) => f.type === filter);

  const getTypeLabel = (type) => {
    switch (type) {
      case "suggestion":
        return {
          icon: "💡",
          label: "功能建議",
          color: "bg-blue-100 text-blue-800",
        };
      case "bug":
        return {
          icon: "🐛",
          label: "Bug 回報",
          color: "bg-red-100 text-red-800",
        };
      case "other":
        return {
          icon: "💬",
          label: "其他意見",
          color: "bg-green-100 text-green-800",
        };
      default:
        return {
          icon: "📝",
          label: "未分類",
          color: "bg-gray-100 text-gray-800",
        };
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending":
        return { label: "待處理", color: "bg-yellow-100 text-yellow-800" };
      case "in-progress":
        return { label: "處理中", color: "bg-blue-100 text-blue-800" };
      case "resolved":
        return { label: "已解決", color: "bg-green-100 text-green-800" };
      default:
        return { label: status, color: "bg-gray-100 text-gray-800" };
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "未知時間";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (err) {
      return "未知時間";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 頁面標題 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">反饋管理</h1>
        <p className="text-gray-600">
          查看所有用戶提交的反饋和建議 · 共 {feedbacks.length} 則
        </p>
      </div>

      {/* 篩選器 */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-700">篩選：</span>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg transition ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              全部 ({feedbacks.length})
            </button>
            <button
              onClick={() => setFilter("suggestion")}
              className={`px-4 py-2 rounded-lg transition ${
                filter === "suggestion"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              💡 功能建議 (
              {feedbacks.filter((f) => f.type === "suggestion").length})
            </button>
            <button
              onClick={() => setFilter("bug")}
              className={`px-4 py-2 rounded-lg transition ${
                filter === "bug"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              🐛 Bug 回報 ({feedbacks.filter((f) => f.type === "bug").length})
            </button>
            <button
              onClick={() => setFilter("other")}
              className={`px-4 py-2 rounded-lg transition ${
                filter === "other"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              💬 其他 ({feedbacks.filter((f) => f.type === "other").length})
            </button>
          </div>
        </div>
      </div>

      {/* 反饋列表 */}
      {filteredFeedbacks.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 text-lg">目前沒有反饋</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFeedbacks.map((feedback) => {
            const typeInfo = getTypeLabel(feedback.type);
            const statusInfo = getStatusLabel(feedback.status);

            return (
              <div
                key={feedback.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition p-6"
              >
                {/* 標題和標籤 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${typeInfo.color}`}
                      >
                        {typeInfo.icon} {typeInfo.label}
                      </span>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">
                      {feedback.title}
                    </h3>
                  </div>
                </div>

                {/* 描述 */}
                <div className="mb-4">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {feedback.description}
                  </p>
                </div>

                {/* 元資訊 */}
                <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <p className="mb-1">
                      <span className="font-semibold">提交時間：</span>
                      {formatDate(feedback.createdAt)}
                    </p>
                    <p className="mb-1">
                      <span className="font-semibold">用戶帳號：</span>
                      {feedback.userEmail || "未知"}
                    </p>
                    {feedback.contactInfo && (
                      <p className="mb-1">
                        <span className="font-semibold">聯絡資訊：</span>
                        {feedback.contactInfo}
                      </p>
                    )}
                  </div>
                  <div className="flex items-end justify-end">
                    <span className="text-xs text-gray-400">
                      ID: {feedback.id}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 統計資訊 */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">📊 統計資訊</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">
              {feedbacks.length}
            </p>
            <p className="text-sm text-gray-600 mt-1">總反饋數</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">
              {feedbacks.filter((f) => f.status === "pending").length}
            </p>
            <p className="text-sm text-gray-600 mt-1">待處理</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">
              {feedbacks.filter((f) => f.status === "in-progress").length}
            </p>
            <p className="text-sm text-gray-600 mt-1">處理中</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-600">
              {feedbacks.filter((f) => f.status === "resolved").length}
            </p>
            <p className="text-sm text-gray-600 mt-1">已解決</p>
          </div>
        </div>
      </div>
    </div>
  );
}
