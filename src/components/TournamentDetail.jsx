// TournamentDetail.jsx - 盃賽詳細頁
// 顯示單一盃賽的完整資訊

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getTournament, deleteTournament } from "../firebase/tournaments";
import { getTeam } from "../firebase/teams";
import { useAuth } from "../contexts/AuthContext";

export function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [participatingTeams, setParticipatingTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  useEffect(() => {
    loadTournament();
  }, [id]);

  const loadTournament = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTournament(id);
      setTournament(data);

      // 載入參賽隊伍資料
      if (data.participatingTeams && data.participatingTeams.length > 0) {
        loadParticipatingTeams(data.participatingTeams);
      }
    } catch (err) {
      console.error("載入盃賽失敗:", err);
      setError("載入盃賽失敗");
    } finally {
      setLoading(false);
    }
  };

  const loadParticipatingTeams = async (teamIds) => {
    try {
      setLoadingTeams(true);
      const teamPromises = teamIds.map((id) => getTeam(id));
      const teamsData = await Promise.all(teamPromises);
      setParticipatingTeams(teamsData);
    } catch (err) {
      console.error("載入參賽隊伍失敗:", err);
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("確定要刪除此盃賽嗎？")) return;

    try {
      await deleteTournament(id);
      alert("盃賽已刪除");
      navigate("/");
    } catch (err) {
      console.error("刪除失敗:", err);
      alert("刪除失敗，請稍後再試");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "未定";
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return "未定";
    const date = new Date(dateTimeString);
    return date.toLocaleString("zh-TW", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  if (error || !tournament) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error || "找不到該盃賽"}
        </div>
        <Link
          to="/"
          className="inline-block mt-4 text-blue-600 hover:underline"
        >
          ← 返回盃賽列表
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 返回按鈕 */}
      <Link
        to="/tournaments"
        className="inline-block mb-4 text-blue-600 hover:underline"
      >
        ← 返回盃賽列表
      </Link>

      <div className="bg-white rounded-lg shadow-md p-8">
        {/* 盃賽名稱 */}
        <div className="flex justify-between items-start mb-8">
          <h1 className="text-4xl font-bold text-gray-800">
            {tournament.name || "未命名盃賽"}
          </h1>
          <div className="flex gap-2">
            {(currentUser?.uid === tournament.createdBy || false) && (
              <Link
                to={`/tournament/${id}/edit`}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                ✏️ 編輯
              </Link>
            )}
            {currentUser?.uid === tournament.createdBy && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                刪除
              </button>
            )}
          </div>
        </div>

        {/* 參賽隊伍 */}
        <div>
          <h3 className="font-bold text-gray-800 mb-4 text-lg">👥 參賽隊伍</h3>
          {tournament.participatingTeams &&
          tournament.participatingTeams.length > 0 ? (
            loadingTeams ? (
              <div className="text-gray-500 text-sm">載入中...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {participatingTeams.map((team) => (
                  <div
                    key={team.id}
                    className="rounded-lg p-4 shadow-md border-4 transition-all hover:shadow-lg"
                    style={{
                      backgroundColor: team.teamColor || "#3B82F6",
                      borderColor: team.teamColor || "#3B82F6",
                    }}
                  >
                    <h4 className="font-bold text-white text-lg mb-2 drop-shadow-md">
                      {team.name}
                    </h4>
                    {team.school && (
                      <p className="text-sm text-white text-opacity-95 mb-2">
                        🏫 {team.school}
                      </p>
                    )}
                    <p className="text-sm text-white text-opacity-95">
                      👥 {team.members?.length || 0} 位隊員
                    </p>
                  </div>
                ))}
              </div>
            )
          ) : (
            <p className="text-gray-400">尚無參賽隊伍</p>
          )}
        </div>
      </div>
    </div>
  );
}
