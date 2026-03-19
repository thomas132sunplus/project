// PracticeMatchList_fixed.jsx - 乾淨重建
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getUserTeams } from "../firebase/teams";
import {
  getUserPracticeMatches,
  createPracticeMatch,
  getExpiredMatches,
  deletePracticeMatch,
} from "../firebase/practiceMatches";
import { getTeam } from "../firebase/teams";
import { getTournament } from "../firebase/tournaments";
import { getAcceptedInvitations } from "../firebase/invitations";
import {
  getTeamMemberIds,
  notifyMatchExpired,
} from "../firebase/notificationHelpers";

export function PracticeMatchList() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [myTeams, setMyTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [groupedMatches, setGroupedMatches] = useState({});

  useEffect(() => {
    loadData();
    // eslint-disable-next-line
  }, [currentUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      const teams = await getUserTeams(currentUser.uid);
      setMyTeams(teams);
      if (teams.length === 0) {
        setLoading(false);
        return;
      }
      const teamIds = teams.map((t) => t.id);
      const acceptedInvitations = await getAcceptedInvitations(teamIds);
      let matches = await getUserPracticeMatches(teamIds);
      const existingInvitationIds = new Set(
        matches.map((m) => m.invitationId).filter(Boolean)
      );
      const missingInvitations = acceptedInvitations.filter(
        (inv) => !existingInvitationIds.has(inv.id)
      );
      if (missingInvitations.length > 0) {
        for (const invitation of missingInvitations) {
          try {
            await createPracticeMatch(
              {
                invitationId: invitation.id,
                tournamentId: invitation.tournamentId,
                fromTeam: invitation.fromTeam,
                toTeam: invitation.toTeam,
                matchInfo: {
                  format: "single",
                  propositionOrder: [],
                  date: "",
                  time: "",
                  venue: "",
                  refreshments: {
                    [invitation.fromTeam]: "",
                    [invitation.toTeam]: "",
                  },
                  contacts: {
                    [invitation.fromTeam]: { name: "", phone: "" },
                    [invitation.toTeam]: { name: "", phone: "" },
                  },
                },
              },
              currentUser.uid
            );
          } catch (err) {
            // 忽略單筆失敗
          }
        }
        matches = await getUserPracticeMatches(teamIds);
      }
      const expiredMatches = getExpiredMatches(matches);
      if (expiredMatches.length > 0) {
        for (const expired of expiredMatches) {
          try {
            const [ft, tt] = await Promise.all([
              getTeam(expired.fromTeam || expired.affirmativeTeam),
              getTeam(expired.toTeam || expired.negativeTeam),
            ]);
            const [fromIds, toIds] = await Promise.all([
              getTeamMemberIds(ft?.id),
              getTeamMemberIds(tt?.id),
            ]);
            const allIds = [...new Set([...fromIds, ...toIds])];
            await notifyMatchExpired(
              expired.id,
              ft?.name || "隊伍A",
              tt?.name || "隊伍B",
              expired.matchInfo?.date || "",
              allIds
            );
            await deletePracticeMatch(expired.id);
          } catch (err) {}
        }
        const expiredIds = new Set(expiredMatches.map((m) => m.id));
        matches = matches.filter((m) => !expiredIds.has(m.id));
      }
      const enriched = await Promise.all(
        matches.map(async (match) => {
          try {
            const [fromTeam, toTeam, tournament] = await Promise.all([
              getTeam(match.fromTeam || match.affirmativeTeam),
              getTeam(match.toTeam || match.negativeTeam),
              getTournament(match.tournamentId).catch(() => null),
            ]);
            const myTeam = teams.find(
              (t) =>
                t.id === match.fromTeam ||
                t.id === match.toTeam ||
                t.id === match.affirmativeTeam ||
                t.id === match.negativeTeam
            );
            return tournament
              ? {
                  ...match,
                  fromTeamData: fromTeam,
                  toTeamData: toTeam,
                  tournamentData: tournament,
                  myTeamId: myTeam?.id,
                  myTeamName: myTeam?.name,
                }
              : null;
          } catch (err) {
            return null;
          }
        })
      );
      const filteredEnriched = enriched.filter(Boolean);
      const grouped = {};
      for (const match of filteredEnriched) {
        if (!match.tournamentData) continue;
        const tid = match.tournamentData.id;
        if (!grouped[tid]) {
          grouped[tid] = {
            tournament: match.tournamentData,
            matches: [],
          };
        }
        grouped[tid].matches.push(match);
      }
      setGroupedMatches(grouped);
    } catch (err) {
      // 載入失敗
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTournament = (tournamentId) => {
    setSelectedTournament(tournamentId);
  };
  const handleBackToList = () => {
    setSelectedTournament(null);
  };
  const handleMatchClick = (matchId) => {
    navigate(`/practice-match-discussion/${matchId}`);
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
  if (myTeams.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded">
          <p className="text-yellow-800">你還沒有加入任何隊伍，請先加入或創建隊伍。</p>
        </div>
      </div>
    );
  }
  if (!selectedTournament) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">練習賽討論區</h1>
          <p className="text-gray-600">選擇盃賽，查看你的練習賽</p>
        </div>
        {Object.keys(groupedMatches).length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500">目前沒有練習賽</p>
            <p className="text-gray-400 text-sm mt-2">前往「跨校練習賽媒合」頁面邀請其他隊伍</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(groupedMatches).map(([tournamentId, data]) => (
              <button
                key={tournamentId}
                onClick={() => handleSelectTournament(tournamentId)}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border border-gray-200 text-left"
              >
                <h3 className="text-xl font-bold text-gray-800 mb-3">{data.tournament?.name || "未知盃賽"}</h3>
                <div className="mb-4">
                  <p className="text-gray-600 text-sm mb-1">
                    📅{" "}
                    {data.tournament?.date
                      ? new Date(data.tournament.date).toLocaleDateString("zh-TW")
                      : "未設定日期"}
                  </p>
                  <p className="text-gray-600 text-sm">🏟️ {data.tournament?.location || "未設定地點"}</p>
                </div>
                <div className="border-t pt-3 mb-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">參與的隊伍：</p>
                  {Array.from(new Set(data.matches.map((m) => m.myTeamName).filter(Boolean))).map((teamName, idx) => (
                    <span key={idx} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2 mb-1">{teamName}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-600 font-medium text-sm">{data.matches.length} 場練習賽</span>
                  <span className="text-gray-400">→</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  const currentTournamentData = groupedMatches[selectedTournament];
  const tournamentMatches = currentTournamentData?.matches || [];
  return (
    <div className="container mx-auto px-4 py-8">
      <button onClick={handleBackToList} className="mb-4 text-blue-600 hover:underline flex items-center">← 返回盃賽列表</button>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{currentTournamentData?.tournament?.name || "未知盃賽"}</h1>
        <p className="text-gray-600">點擊練習賽進入討論區</p>
      </div>
      {tournamentMatches.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500">此盃賽沒有練習賽</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournamentMatches.map((match) => {
            const opponentTeam = match.myTeamId === match.fromTeamData?.id ? match.toTeamData : match.fromTeamData;
            return (
              <button
                key={match.id}
                onClick={() => handleMatchClick(match.id)}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all p-4 md:p-6 border-2 border-gray-200 hover:border-blue-400 text-left"
              >
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">我的隊伍</p>
                      <p className="font-bold text-gray-800">{match.myTeamName}</p>
                    </div>
                    <div className="px-3">
                      <span className="text-lg md:text-2xl text-gray-400">VS</span>
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-xs text-gray-500 mb-1">對手隊伍</p>
                      <p className="font-bold text-gray-800">{opponentTeam?.name || "未知隊伍"}</p>
                    </div>
                  </div>
                </div>
                <div className="border-t pt-3 space-y-1">
                  {match.matchInfo?.date && (
                    <p className="text-sm text-gray-600">
                      📅 {match.matchInfo.date}
                      {match.matchInfo.time && ` ${match.matchInfo.time}`}
                    </p>
                  )}
                  {match.matchInfo?.venue && (
                    <p className="text-sm text-gray-600">📍 {match.matchInfo.venue}</p>
                  )}
                  {match.matchInfo?.format && (
                    <p className="text-sm text-gray-600">
                      {match.matchInfo.format === "double" ? "🔄 雙持" : "➡️ 單持"}
                    </p>
                  )}
                </div>
                <div className="mt-4">
                  {match.status === "scheduled" && (
                    <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">待進行</span>
                  )}
                  {match.status === "confirmed" && (
                    <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">已確認</span>
                  )}
                  {match.status === "completed" && (
                    <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">已完成</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
