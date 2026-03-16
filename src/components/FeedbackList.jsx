// FeedbackList.jsx - 查看所有反饋（管理員頁面）

import { useState, useEffect } from "react";
import {
  getAllFeedback,
  deleteFeedback,
  updateFeedbackStatus,
} from "../firebase/feedback";

export function FeedbackList() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all"); // all, suggestion, bug, other, meeting-room-survey
  const [statusFilter, setStatusFilter] = useState("pending"); // pending, in-progress, resolved, all

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

  const filteredFeedbacks = feedbacks.filter((f) => {
    const typeOk = typeFilter === "all" ? true : f.type === typeFilter;
    const statusOk =
      statusFilter === "all" ? true : (f.status || "pending") === statusFilter;
    return typeOk && statusOk;
  });

  const getTypeLabel = (type) => {
    switch (type) {
      case "meeting-room-survey":
        return {
          icon: "🏠",
          label: "會議室意願調查",
          color: "bg-purple-100 text-purple-800",
        };
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
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-semibold text-gray-700">狀態：</span>
          <div className="flex gap-2 mr-6">
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-4 py-2 rounded-lg transition ${statusFilter === "pending" ? "bg-yellow-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              待處理 (
              {
                feedbacks.filter((f) => (f.status || "pending") === "pending")
                  .length
              }
              )
            </button>
            <button
              onClick={() => setStatusFilter("in-progress")}
              className={`px-4 py-2 rounded-lg transition ${statusFilter === "in-progress" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              處理中 (
              {feedbacks.filter((f) => f.status === "in-progress").length})
            </button>
            <button
              onClick={() => setStatusFilter("resolved")}
              className={`px-4 py-2 rounded-lg transition ${statusFilter === "resolved" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              已解決 ({feedbacks.filter((f) => f.status === "resolved").length})
            </button>
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-4 py-2 rounded-lg transition ${statusFilter === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              全部 ({feedbacks.length})
            </button>
          </div>
          <span className="text-sm font-semibold text-gray-700">分類：</span>
          <div className="flex gap-2">
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-4 py-2 rounded-lg transition ${typeFilter === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              全部
            </button>
            <button
              onClick={() => setTypeFilter("suggestion")}
              className={`px-4 py-2 rounded-lg transition ${typeFilter === "suggestion" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              💡 功能建議
            </button>
            <button
              onClick={() => setTypeFilter("bug")}
              className={`px-4 py-2 rounded-lg transition ${typeFilter === "bug" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              🐛 Bug 回報
            </button>
            <button
              onClick={() => setTypeFilter("other")}
              className={`px-4 py-2 rounded-lg transition ${typeFilter === "other" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              💬 其他
            </button>
            <button
              onClick={() => setTypeFilter("meeting-room-survey")}
              className={`px-4 py-2 rounded-lg transition ${typeFilter === "meeting-room-survey" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              🏠 會議室意願調查
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
                  {/* 狀態操作與刪除 */}
                  <div className="flex flex-col items-end gap-2 min-w-[120px]">
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={feedback.status || "pending"}
                      onChange={async (e) => {
                        await updateFeedbackStatus(feedback.id, e.target.value);
                        loadFeedbacks();
                      }}
                    >
                      <option value="pending">待處理</option>
                      <option value="in-progress">處理中</option>
                      <option value="resolved">已解決</option>
                    </select>
                    <button
                      className="text-xs text-red-600 hover:underline mt-1"
                      onClick={async () => {
                        if (window.confirm("確定要刪除這則反饋嗎？")) {
                          await deleteFeedback(feedback.id);
                          loadFeedbacks();
                        }
                      }}
                    >
                      刪除
                    </button>
                  </div>
                </div>

                {/* 描述/意願調查內容 */}
                <div className="mb-4">
                  {feedback.type === "meeting-room-survey" ? (
                    <div className="space-y-1">
                      <p className="text-gray-700">
                        <span className="font-semibold">意願選擇：</span>
                        {feedback.choice === "yes"
                          ? "有使用會議室的意願"
                          : feedback.choice === "no"
                            ? "無使用會議室的意願"
                            : feedback.choice === "other"
                              ? "有其他想法"
                              : feedback.choice === "never-show"
                                ? "不再顯示此畫面"
                                : feedback.choice || "-"}
                      </p>
                      {feedback.otherText && (
                        <p className="text-gray-700">
                          <span className="font-semibold">其他想法：</span>
                          {feedback.otherText}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {feedback.description}
                    </p>
                  )}
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
