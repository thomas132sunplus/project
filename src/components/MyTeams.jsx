// ...existing code...
// MyTeams.jsx - 我的隊伍列表頁
// 顯示使用者所屬的所有隊伍

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  getUserTeams,
  createTeam,
  getTeamByInviteCode,
  addMemberToTeam,
} from "../firebase/teams";
import { addTeamToUser } from "../firebase/users";
import { notifyTeamMemberAdded } from "../firebase/notificationHelpers";
import { useAuth } from "../contexts/AuthContext";

export function MyTeams() {
  // 加入隊伍流程
  const handleJoinTeam = async () => {
    if (!foundTeam || !currentUser) return;
    setJoinLoading(true);
    setJoinError(null);
    try {
      // 檢查是否已在隊伍內
      if (foundTeam.members?.includes(currentUser.uid)) {
        setJoinError("你已經是該隊伍成員");
        setJoinLoading(false);
        return;
      }
      // 1. 加入隊伍
      await addMemberToTeam(foundTeam.id, currentUser.uid);
      // 2. 隊伍加入用戶
      await addTeamToUser(currentUser.uid, foundTeam.id);
      // 3. 通知所有隊員（含新成員）
      const userName = currentUser.displayName || currentUser.email || "新成員";
      await notifyTeamMemberAdded(
        foundTeam.id,
        foundTeam.name,
        userName,
        [...(foundTeam.members || []), currentUser.uid],
        currentUser.uid,
      );
      // 4. UI 處理
      alert("加入成功！");
      setShowJoinForm(false);
      setJoinCode("");
      setFoundTeam(null);
      setJoinError(null);
      // 重新載入隊伍列表
      setLoading(true);
      getUserTeams(currentUser.uid).then((data) => {
        setTeams(data);
        setLoading(false);
      });
    } catch (err) {
      setJoinError("加入隊伍失敗，請稍後再試");
      setJoinLoading(false);
    }
    setJoinLoading(false);
  };
  // 查詢隊伍 by inviteCode
  const handleJoinQuery = async (e) => {
    e.preventDefault();
    setJoinError(null);
    setFoundTeam(null);
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    try {
      const team = await getTeamByInviteCode(joinCode.trim());
      if (!team) {
        setJoinError("查無此隊伍代碼，請確認輸入正確");
      } else {
        setFoundTeam(team);
      }
    } catch (err) {
      setJoinError("查詢失敗，請稍後再試");
    } finally {
      setJoinLoading(false);
    }
  };
  // 狀態宣告
  const [foundTeam, setFoundTeam] = useState(null);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    school: "",
    description: "",
    teamColor: "#3B82F6",
  });
  const { currentUser } = useAuth();
  const currentUserId = currentUser?.uid;

  // 表單欄位變動 handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      setTeams([]);
      return;
    }
    setLoading(true);
    getUserTeams(currentUserId).then((data) => {
      setTeams(data);
      setLoading(false);
    });
  }, [currentUserId]);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("請輸入隊伍名稱");
      return;
    }
    try {
      setCreating(true);
      const teamData = {
        name: formData.name.trim(),
        school: formData.school.trim(),
        description: formData.description.trim(),
        teamColor: formData.teamColor,
        captain: currentUserId,
        members: [currentUserId],
        tournaments: [],
      };
      await createTeam(teamData);
      alert("隊伍建立成功！");
      setShowCreateForm(false);
      setFormData({
        name: "",
        school: "",
        description: "",
        teamColor: "#3B82F6",
      });
      setCreating(false);
      setLoading(true);
      getUserTeams(currentUserId).then((data) => {
        setTeams(data);
        setLoading(false);
      });
    } catch (err) {
      setCreating(false);
      alert("建立隊伍失敗，請稍後再試");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">載入中...</p>
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
        <div className="flex gap-4 mt-4">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded shadow transition"
            onClick={() => setShowCreateForm(true)}
            type="button"
          >
            ＋建立新隊伍
          </button>
          <button
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded shadow transition"
            onClick={() => setShowJoinForm(true)}
            type="button"
          >
            加入隊伍
          </button>
        </div>
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

              {/* 隊伍專屬代碼 */}
              {team.inviteCode && (
                <p className="text-white text-opacity-90 mb-2 text-sm select-all">
                  🆔 隊伍代碼：{team.inviteCode}
                </p>
              )}

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
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold mt-4"
                disabled={creating}
              >
                {creating ? "建立中..." : "+ 建立隊伍"}
              </button>
              <button
                type="button"
                className="w-full mt-2 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
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
              >
                取消
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 加入隊伍彈窗 */}
      {showJoinForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">加入隊伍</h2>
            <form onSubmit={handleJoinQuery}>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  請輸入隊伍代碼
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="例：8X2K9Q"
                  maxLength={8}
                  required
                  autoFocus
                />
              </div>
              {joinError && (
                <div className="mb-2 text-red-600 text-sm">{joinError}</div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={joinLoading || !joinCode.trim()}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-semibold disabled:bg-gray-400"
                >
                  {joinLoading ? "查詢中..." : "查詢隊伍"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinForm(false);
                    setJoinCode("");
                    setJoinError(null);
                    setFoundTeam(null);
                  }}
                  disabled={joinLoading}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:bg-gray-100"
                >
                  取消
                </button>
              </div>

              {/* 查詢結果顯示 */}
              {foundTeam && (
                <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200">
                  <div className="font-bold text-lg mb-1">{foundTeam.name}</div>
                  <div className="text-gray-600 mb-1">{foundTeam.school}</div>
                  <div className="text-gray-500 text-sm mb-1">
                    🆔 隊伍代碼：{foundTeam.inviteCode}
                  </div>
                  <div className="text-gray-500 text-sm mb-1">
                    👥 {foundTeam.members?.length || 0} 位隊員
                  </div>
                  <button
                    type="button"
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    onClick={handleJoinTeam}
                    disabled={joinLoading}
                  >
                    {joinLoading ? "加入中..." : "加入此隊伍"}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
