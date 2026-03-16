// MyTeams.jsx - 我的隊伍列表頁
// 顯示使用者所屬的所有隊伍

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getUserTeams, createTeam } from "../firebase/teams";
import { useAuth } from "../contexts/AuthContext";

export function MyTeams() {
  const { currentUser } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // 建立隊伍表單資料
  const [formData, setFormData] = useState({
    name: "",
    school: "",
    description: "",
    teamColor: "#3B82F6",
  });

  const currentUserId = currentUser?.uid;

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserTeams(currentUserId);
      setTeams(data);
    } catch (err) {
      console.error("載入隊伍失敗:", err);
      setError("載入隊伍失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };
  // 處理表單輸入變更
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 處理建立隊伍
  const handleCreateTeam = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("請輸入隊伍名稱");
      return;
    }

    try {
      setCreating(true);

      // 建立隊伍資料
      const teamData = {
        name: formData.name.trim(),
        school: formData.school.trim(),
        description: formData.description.trim(),
        teamColor: formData.teamColor,
        captain: currentUserId,
        members: [currentUserId], // 建立者自動成為隊員
        tournaments: [],
      };

      const newTeamId = await createTeam(teamData);
      alert("隊伍建立成功！");

      // 重新載入隊伍列表
      await loadTeams();

      // 重置表單並關閉彈窗
      setFormData({
        name: "",
        school: "",
        description: "",
        teamColor: "#3B82F6",
      });
      setShowCreateForm(false);
    } catch (err) {
      console.error("建立隊伍失敗:", err);
      alert("建立隊伍失敗，請稍後再試");
    } finally {
      setCreating(false);
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
        <h1 className="text-3xl font-bold text-gray-800 mb-2">我的隊伍</h1>
        <p className="text-gray-600">進入隊伍討論區，與隊友協作</p>
      </div>

      {/* 隊伍列表 */}
      {teams.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 text-lg mb-4">你還沒有加入任何隊伍</p>
          <p className="text-gray-400 text-sm">請聯繫隊長將你加入隊伍</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <Link
              key={team.id}
              to={`/team/${team.id}`}
              className="block rounded-lg shadow-md hover:shadow-xl transition-all p-6 border-4 transform hover:scale-105"
              style={{
                backgroundColor: team.teamColor || "#3B82F6",
                borderColor: team.teamColor || "#3B82F6",
              }}
            >
              {/* 隊伍名稱 */}
              <h3 className="text-2xl font-bold text-white mb-3 drop-shadow-md">
                {team.name}
              </h3>

              {/* 學校 */}
              {team.school && (
                <p className="text-white text-opacity-95 mb-2">
                  🏫 {team.school}
                </p>
              )}

              {/* 隊員數量 */}
              <p className="text-white text-opacity-95 mb-2">
                👥 {team.members?.length || 0} 位隊員
              </p>

              {/* 參加的盃賽數量 */}
              {team.tournaments && team.tournaments.length > 0 && (
                <p className="text-white text-opacity-95">
                  🏆 參加 {team.tournaments.length} 個盃賽
                </p>
              )}

              {/* 進入隊伍提示 */}
              <div className="mt-4 text-white font-medium text-sm bg-black bg-opacity-20 px-3 py-2 rounded inline-block">
                點擊進入隊伍討論區 →
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 建立隊伍按鈕 */}
      <div className="mt-8 text-center">
        <button
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          onClick={() => setShowCreateForm(true)}
        >
          + 建立新隊伍
        </button>
      </div>

      {/* 建立隊伍彈窗 */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              建立新隊伍
            </h2>

            <form onSubmit={handleCreateTeam}>
              {/* 隊伍名稱 */}
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  隊伍名稱 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：辯士學校辯論社 A 隊"
                  required
                />
              </div>

              {/* 學校 */}
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  學校
                </label>
                <input
                  type="text"
                  name="school"
                  value={formData.school}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：論辯市立辯士高級中學"
                />
              </div>

              {/* 隊伍簡介 */}
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  隊伍簡介
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="簡單介紹一下你的隊伍..."
                />
              </div>

              {/* 隊伍顏色 */}
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  隊伍代表色
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="teamColor"
                    value={formData.teamColor}
                    onChange={handleInputChange}
                    className="w-16 h-10 rounded cursor-pointer"
                  />
                  <span className="text-gray-600">{formData.teamColor}</span>
                </div>
              </div>

              {/* 按鈕 */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400"
                >
                  {creating ? "建立中..." : "建立隊伍"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({
                      name: "",
                      school: "",
                      description: "",
                      teamColor: "#3B82F6",
                    });
                  }}
                  disabled={creating}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:bg-gray-100"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
