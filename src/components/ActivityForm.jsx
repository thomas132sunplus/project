// 建立活動表單元件
// 提供表單讓使用者建立新活動

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createActivity } from "../firebase/activities";
import { useAuth } from "../contexts/AuthContext";

export function ActivityForm() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // 表單狀態
  const [formData, setFormData] = useState({
    title: "",
    type: "練習賽",
    date: "",
    time: "",
    format: "",
    description: "",
    links: {
      line: "",
      discord: "",
      meeting: "",
    },
  });

  // 載入狀態
  const [loading, setLoading] = useState(false);
  // 錯誤訊息
  const [error, setError] = useState(null);

  // 處理一般欄位的輸入變更
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 處理連結欄位的輸入變更
  const handleLinkChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      links: {
        ...prev.links,
        [name]: value,
      },
    }));
  };

  // 處理表單送出
  const handleSubmit = async (e) => {
    e.preventDefault(); // 防止頁面重新載入

    // 驗證必填欄位
    if (!formData.title || !formData.date) {
      setError("請填寫活動名稱和日期");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 建立活動（帶入建立者 ID）
      const activityId = await createActivity({
        ...formData,
        createdBy: currentUser.uid,
      });

      // 成功後導向活動詳細頁
      navigate(`/activity/${activityId}`);
    } catch (err) {
      console.error("建立活動失敗：", err);
      setError("建立活動時發生錯誤，請稍後再試");
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* 頁面標題 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">建立新活動</h1>
        <p className="text-gray-600">填寫以下資訊來建立辯論活動</p>
      </div>

      {/* 錯誤訊息顯示 */}
      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* 表單 */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-lg p-8"
      >
        {/* 活動名稱 */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">
            活動名稱 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="例：辯士盃辯論賽、週五練習賽"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* 活動類型 */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">
            活動類型 <span className="text-red-500">*</span>
          </label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="練習賽">練習賽</option>
            <option value="比賽">比賽</option>
            <option value="社內討論">社內討論</option>
            <option value="跨校">跨校</option>
          </select>
        </div>

        {/* 日期與時間 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* 日期 */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* 時間 */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              時間
            </label>
            <input
              type="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 賽制 */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">賽制</label>
          <input
            type="text"
            name="format"
            value={formData.format}
            onChange={handleChange}
            placeholder="例：議會制、政策性、亞洲議會制"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 活動說明 */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">
            活動說明
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="說明活動的內容、注意事項等..."
            rows="5"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* 外部連結區塊 */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            外部連結（選填）
          </h3>

          {/* LINE 群組連結 */}
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">
              LINE 群組連結
            </label>
            <input
              type="url"
              name="line"
              value={formData.links.line}
              onChange={handleLinkChange}
              placeholder="https://line.me/..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Discord 頻道連結 */}
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">
              Discord 頻道連結
            </label>
            <input
              type="url"
              name="discord"
              value={formData.links.discord}
              onChange={handleLinkChange}
              placeholder="https://discord.gg/..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 視訊會議連結 */}
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">
              視訊會議連結（Teams / Skype / Zoom）
            </label>
            <input
              type="url"
              name="meeting"
              value={formData.links.meeting}
              onChange={handleLinkChange}
              placeholder="https://teams.microsoft.com/... 或其他視訊連結"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 按鈕區塊 */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "建立中..." : "建立活動"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            disabled={loading}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-semibold disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
