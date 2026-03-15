// Feedback.jsx - 進步區（客服功能）
// 讓用戶回饋建議和回報 bug

import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { submitFeedback } from "../firebase/feedback";

export default function Feedback() {
  const { currentUser } = useAuth();
  const [feedbackType, setFeedbackType] = useState("suggestion"); // suggestion, bug, other
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      alert("請填寫標題和詳細描述");
      return;
    }

    try {
      setSubmitting(true);
      await submitFeedback({
        type: feedbackType,
        title: title.trim(),
        description: description.trim(),
        contactInfo: contactInfo.trim(),
        userId: currentUser?.uid,
        userEmail: currentUser?.email,
      });

      setSubmitSuccess(true);
      // 清空表單
      setTitle("");
      setDescription("");
      setContactInfo("");
      setFeedbackType("suggestion");

      // 3秒後隱藏成功訊息
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (err) {
      console.error("提交反饋失敗:", err);
      alert("提交失敗，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 頁面標題 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">進步區</h1>

        {/* 測試版提示 */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-6 rounded-r-lg shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-3xl">💡</span>
            </div>
            <div className="ml-4">
              <p className="text-lg text-blue-900 font-medium">
                歡迎回饋對我們的建議或回報問題，我們會持續優化。
              </p>
              <p className="text-sm text-blue-700 mt-2">
                您的每一個建議都能幫助我們變得更好！
              </p>
            </div>
          </div>
        </div>

        <p className="text-gray-600">
          有任何功能建議、問題回報或使用疑問，歡迎在此告訴我們。我們會盡快回覆！
        </p>
      </div>

      {/* 成功訊息 */}
      {submitSuccess && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg animate-pulse">
          <div className="flex items-center">
            <span className="text-2xl mr-3">✅</span>
            <div>
              <p className="text-green-800 font-medium">感謝您的回饋！</p>
              <p className="text-green-600 text-sm">
                我們已收到您的訊息，會盡快處理。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 反饋表單 */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 反饋類型 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              反饋類型 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setFeedbackType("suggestion")}
                className={`p-4 rounded-lg border-2 transition ${
                  feedbackType === "suggestion"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-3xl mb-2">💡</div>
                <div className="font-medium text-gray-800">功能建議</div>
                <div className="text-sm text-gray-600 mt-1">希望增加的功能</div>
              </button>

              <button
                type="button"
                onClick={() => setFeedbackType("bug")}
                className={`p-4 rounded-lg border-2 transition ${
                  feedbackType === "bug"
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-3xl mb-2">🐛</div>
                <div className="font-medium text-gray-800">Bug 回報</div>
                <div className="text-sm text-gray-600 mt-1">系統錯誤或異常</div>
              </button>

              <button
                type="button"
                onClick={() => setFeedbackType("other")}
                className={`p-4 rounded-lg border-2 transition ${
                  feedbackType === "other"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-3xl mb-2">💬</div>
                <div className="font-medium text-gray-800">其他意見</div>
                <div className="text-sm text-gray-600 mt-1">使用疑問或建議</div>
              </button>
            </div>
          </div>

          {/* 標題 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              標題 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="簡短描述您的問題或建議"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              {title.length}/100 字元
            </p>
          </div>

          {/* 詳細描述 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              詳細描述 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                feedbackType === "bug"
                  ? "請描述：\n1. 發生問題的頁面\n2. 操作步驟\n3. 預期結果\n4. 實際結果\n5. 其他相關資訊"
                  : "請詳細說明您的想法或建議..."
              }
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 mt-1">
              {description.length}/1000 字元
            </p>
          </div>

          {/* 聯絡資訊（選填）*/}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              聯絡資訊（選填）
            </label>
            <input
              type="text"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="如需回覆，請留下 Email 或其他聯絡方式"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              如果您希望我們回覆，請留下聯絡方式
            </p>
          </div>

          {/* 用戶資訊提示 */}
          {currentUser && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                📧 已登入帳號：{currentUser.email}
              </p>
            </div>
          )}

          {/* 提交按鈕 */}
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-gray-500">
              <span className="text-red-500">*</span> 為必填項目
            </p>
            <button
              type="submit"
              disabled={submitting}
              className={`px-8 py-3 rounded-lg font-medium transition ${
                submitting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {submitting ? "提交中..." : "送出反饋"}
            </button>
          </div>
        </form>
      </div>

      {/* 常見問題提示 */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          💡 提交前小提示
        </h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            <span>
              <strong>回報 Bug：</strong>
              請盡量詳細描述操作步驟，方便我們重現問題
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            <span>
              <strong>功能建議：</strong>
              說明您希望的功能和使用情境，幫助我們更好地理解您的需求
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            <span>
              <strong>緊急問題：</strong>
              如果遇到無法使用的情況，請盡快聯繫我們
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
