// TournamentForm.jsx - 建立/編輯盃賽表單
// 只包含名稱、日期、辯題、參賽隊伍

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createTournament,
  getTournament,
  updateTournament,
} from "../firebase/tournaments";
import { getAllTeams } from "../firebase/teams";
import { useAuth } from "../contexts/AuthContext";

export function TournamentForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [allTeams, setAllTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    date: "",
    topics: "",
    participatingTeams: [],
  });

  useEffect(() => {
    if (id) {
      setIsEditMode(true);
      loadTournamentData();
    } else {
      setInitialLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoadingTeams(true);
      const teams = await getAllTeams();
      setAllTeams(teams);
    } catch (error) {
      console.error("載入隊伍列表失敗:", error);
    } finally {
      setLoadingTeams(false);
    }
  };

  const loadTournamentData = async () => {
    try {
      setInitialLoading(true);
      const data = await getTournament(id);
      // 編輯模式下檢查是否為建立者
      if (data.createdBy && data.createdBy !== currentUser?.uid) {
        alert("您沒有權限編輯此盃賽");
        navigate("/practice-matching");
        return;
      }
      setFormData({
        name: data.name || "",
        date: data.date || "",
        topics: data.topics ? data.topics.join("、") : "",
        participatingTeams: data.participatingTeams || [],
      });
    } catch (error) {
      console.error("載入盃賽資料失敗:", error);
      alert("載入盃賽資料失敗");
      navigate("/practice-matching");
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTeamToggle = (teamId, teamName) => {
    setFormData((prev) => {
      const isSelected = prev.participatingTeams.includes(teamId);

      if (!isSelected) {
        const selectedTeams = allTeams.filter((t) =>
          prev.participatingTeams.includes(t.id),
        );
        const isDuplicateName = selectedTeams.some(
          (t) => t.name.trim().toLowerCase() === teamName.trim().toLowerCase(),
        );

        if (isDuplicateName) {
          alert(`隊伍名稱「${teamName}」已存在於此盃賽中，請勿重複選擇。`);
          return prev;
        }
      }

      return {
        ...prev,
        participatingTeams: isSelected
          ? prev.participatingTeams.filter((id) => id !== teamId)
          : [...prev.participatingTeams, teamId],
      };
    });
  };

  const filteredTeams = allTeams.filter((team) => {
    const query = searchQuery.toLowerCase();
    return (
      team.name.toLowerCase().includes(query) ||
      (team.school && team.school.toLowerCase().includes(query))
    );
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("請填寫盃賽名稱");
      return;
    }

    try {
      setLoading(true);

      const tournamentData = {
        name: formData.name,
        date: formData.date || null,
        topics: formData.topics
          ? formData.topics
              .split("、")
              .map((t) => t.trim())
              .filter((t) => t)
          : [],
        participatingTeams: formData.participatingTeams || [],
      };

      const userId = currentUser?.uid;

      if (isEditMode) {
        await updateTournament(id, tournamentData);
        alert("盃賽更新成功！");
        navigate("/practice-matching");
      } else {
        await createTournament(tournamentData, userId);
        alert("盃賽建立成功！");
        navigate("/practice-matching");
      }
    } catch (error) {
      console.error(isEditMode ? "更新盃賽失敗:" : "建立盃賽失敗:", error);
      alert(
        isEditMode ? "更新盃賽失敗，請稍後再試" : "建立盃賽失敗，請稍後再試",
      );
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
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
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        {isEditMode ? "編輯盃賽" : "建立新盃賽"}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-md p-8"
      >
        {/* 盃賽名稱 */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">
            盃賽名稱 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例：2024 春季盃"
            required
          />
        </div>

        {/* 比賽日期 */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">
            比賽日期
          </label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 辯題 */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">辯題</label>
          <input
            type="text"
            name="topics"
            value={formData.topics}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="多個辯題請用「、」分隔，例：AI發展、教育改革"
          />
        </div>

        {/* 參賽隊伍選擇 */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-3">
            參賽隊伍
          </label>

          {loadingTeams ? (
            <div className="text-gray-500 text-sm">載入隊伍中...</div>
          ) : allTeams.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                目前沒有隊伍。請先創建隊伍後再選擇參賽隊伍。
              </p>
            </div>
          ) : (
            <div>
              {/* 搜尋框 */}
              <div className="mb-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 搜尋隊伍名稱或學校..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 已選擇的隊伍 */}
              {formData.participatingTeams.length > 0 && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm font-semibold text-blue-900 mb-2">
                    已選擇 {formData.participatingTeams.length} 支隊伍：
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.participatingTeams.map((teamId) => {
                      const team = allTeams.find((t) => t.id === teamId);
                      if (!team) return null;
                      return (
                        <div
                          key={teamId}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-blue-300"
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: team.teamColor || "#3B82F6",
                            }}
                          ></div>
                          <span className="text-sm font-medium">
                            {team.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTeamToggle(team.id, team.name)}
                            className="text-red-500 hover:text-red-700 ml-1"
                            title="移除"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 隊伍列表 */}
              {filteredTeams.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-4 border border-gray-300 rounded-lg">
                  找不到符合「{searchQuery}」的隊伍
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-4 space-y-2">
                  {filteredTeams.map((team) => {
                    const isSelected = formData.participatingTeams.includes(
                      team.id,
                    );
                    return (
                      <label
                        key={team.id}
                        className={`flex items-center p-3 rounded cursor-pointer transition ${
                          isSelected
                            ? "bg-blue-50 border border-blue-300"
                            : "hover:bg-gray-50 border border-transparent"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleTeamToggle(team.id, team.name)}
                          className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500 rounded"
                        />
                        <div className="ml-3 flex-1">
                          <div className="font-medium text-gray-800">
                            {team.name}
                          </div>
                          {team.school && (
                            <div className="text-sm text-gray-500">
                              {team.school}
                            </div>
                          )}
                        </div>
                        <div
                          className="w-4 h-4 rounded-full ml-2"
                          style={{
                            backgroundColor: team.teamColor || "#3B82F6",
                          }}
                        ></div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="mt-2 space-y-1">
            <p className="text-sm text-gray-500">
              💡 提示：可使用搜尋功能快速找到隊伍
            </p>
            {formData.participatingTeams.length > 0 && (
              <p className="text-sm text-blue-600">
                ✓ 已選擇 {formData.participatingTeams.length} 支隊伍
              </p>
            )}
            <p className="text-sm text-amber-600">
              ⚠️ 同一盃賽中不可有重複名稱的隊伍
            </p>
          </div>
        </div>

        {/* 提交按鈕 */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
          >
            {loading
              ? isEditMode
                ? "更新中..."
                : "建立中..."
              : isEditMode
                ? "更新盃賽"
                : "建立盃賽"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/practice-matching")}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            取消
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          * 標示為必填欄位，其他欄位可先留空，之後再補充
        </p>
      </form>
    </div>
  );
}
