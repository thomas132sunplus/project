// PracticeMatching.jsx - 跨校練習賽媒合頁面
// 選擇盃賽 -> 查看參賽隊伍 -> 邀請對戰

import { useState, useEffect } from "react";
import { getAllTournaments } from "../firebase/tournaments";
import { deleteTournamentWithMatches } from "../firebase/deleteTournamentWithMatches";
import { getTeam } from "../firebase/teams";
import {
  createInvitation,
  getTeamSentInvitations,
} from "../firebase/invitations";
import { useAuth } from "../contexts/AuthContext";
import { getUserTeams } from "../firebase/teams";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getTeamEvents } from "../firebase/teamEvents";

export function PracticeMatching() {
  // 狀態宣告
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [myTeams, setMyTeams] = useState([]);
  const [selectedMyTeam, setSelectedMyTeam] = useState(null);
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [targetTeamForInvite, setTargetTeamForInvite] = useState(null);
  const [invitationsMap, setInvitationsMap] = useState(new Map());
  // 新功能：批次邀請媒合
  const [batchInviteCandidates, setBatchInviteCandidates] = useState([]); // {team, checked, overlapTimes}
  const [practiceEvents, setPracticeEvents] = useState([]); // 全部隊伍事件
  const [myTeamPracticeEvents, setMyTeamPracticeEvents] = useState([]); // 代表隊伍事件
  const [selectedPracticeTimes, setSelectedPracticeTimes] = useState([]); // 目前複選的練習賽時間
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinSelectedTeamId, setJoinSelectedTeamId] = useState("");

  // 取得毫秒 timestamp
  const getTime = (val) => {
    if (!val) return null;
    if (typeof val === "object" && typeof val.toDate === "function") {
      return val.toDate().getTime();
    }
    if (typeof val === "string" || typeof val === "number") {
      const d = new Date(val);
      return isNaN(d) ? null : d.getTime();
    }
    return null;
  };

  // 切換候選隊伍勾選狀態
  const toggleBatchInviteCandidate = (teamId) => {
    setBatchInviteCandidates(prev => {
      const next = prev.map(item =>
        item.team.id === teamId ? { ...item, checked: !item.checked } : { ...item }
      );
      return next;
    });
  };

  // 批次邀請主流程
  const handleBatchInviteClick = () => {
    if (!selectedPracticeTimes.length) return;
    const selectedTimes = selectedPracticeTimes.map(getTime);
    setBatchInviteCandidates(prev => {
      const prevCheckedMap = new Map(prev.map(item => [item.team.id, item.checked]));
      const candidates = teams
        .map(team => {
          const overlapTimes = practiceEvents
            .filter(event => event.teamId === team.id && selectedTimes.includes(getTime(event.startTime)))
            .map(event => event.startTime);
          return {
            team,
            checked: prevCheckedMap.has(team.id)
              ? prevCheckedMap.get(team.id)
              : overlapTimes.length > 0,
            overlapTimes,
          };
        })
        .filter(item => item.overlapTimes.length > 0);
      return candidates;
    });
  };

  // 批次確認發送邀請
  const handleConfirmBatchInvite = async () => {
    const myTeam = selectedMyTeam || (myTeams.length > 0 ? myTeams[0] : null);
    if (!myTeam) {
      alert("你沒有可用的隊伍");
      return;
    }
    const selectedCandidates = batchInviteCandidates.filter(item => item.checked);
    if (selectedCandidates.length === 0) {
      alert("請至少選擇一個對手");
      return;
    }
    let count = 0;
    for (const item of selectedCandidates) {
      for (const overlapTime of item.overlapTimes) {
        await createInvitation({
          fromTeam: myTeam.id,
          toTeam: item.team.id,
          tournamentId: selectedTournament.id,
          practiceTime: overlapTime,
        });
        count++;
      }
    }
    alert(`已同時發送邀請給 ${count} 組隊伍/時間！`);
    setBatchInviteCandidates([]);
    setSelectedPracticeTimes([]);
  };

  useEffect(() => {
    loadTournaments();
    loadMyTeams();
  }, [currentUser]);

  // 監聽 query string，若有 tournamentId 並且 tournaments 載入完成，直接選中該盃賽（但不跳轉編輯）
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tid = params.get("tournamentId");
    if (tid && tournaments.length > 0) {
      const found = tournaments.find((t) => t.id === tid);
      if (found) {
        setSelectedTournament(found);
        handleSelectTournament(found);
      }
    }
  }, [location.search, tournaments]);

  // 當選擇了盃賽且 myTeams 載入完成後，載入邀請狀態
  useEffect(() => {
    if (selectedTournament && myTeams.length > 0 && teams.length > 0) {
      console.log(
        "重新載入邀請狀態，myTeams:",
        myTeams.length,
        "teams:",
        teams.length,
        "盃賽:",
        selectedTournament.id,
      );
      loadInvitationStatus(selectedTournament.id);
    }
  }, [selectedTournament?.id, myTeams, teams]);

  const loadMyTeams = async () => {
    try {
      const userTeams = await getUserTeams(currentUser?.uid);
      console.log("載入我的隊伍:", userTeams.length, "支隊伍");
      setMyTeams(userTeams);
    } catch (err) {
      console.error("載入我的隊伍失敗:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTournaments = async () => {
    try {
      setLoading(true);
      const data = await getAllTournaments();
      setTournaments(data);
    } catch (err) {
      console.error("載入賽事失敗:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTournament = async (tournament) => {
    setSelectedTournament(tournament);
    setLoadingTeams(true);
    try {
      const teamIds = tournament.participatingTeams || [];
      const teamPromises = teamIds.map((id) => getTeam(id));
      const teamsData = await Promise.all(teamPromises);
      setTeams(teamsData);
    } catch (err) {
      console.error("載入隊伍失敗:", err);
      alert("載入隊伍失敗");
      setTeams([]);
    } finally {
      setLoadingTeams(false);
    }
  };

  const loadInvitationStatus = async (tournamentId) => {
    try {
      const newInvitationsMap = new Map();
      for (const myTeam of myTeams) {
        const sentInvitations = await getTeamSentInvitations(myTeam.id);
        const relevantInvitations = sentInvitations.filter(
          (inv) => inv.tournamentId === tournamentId
        );
        for (const inv of relevantInvitations) {
          const key = `${myTeam.id}-${inv.toTeam}`;
          newInvitationsMap.set(key, inv);
        }
      }
      setInvitationsMap(newInvitationsMap);
    } catch (err) {
      console.error("載入邀請狀態失敗:", err);
    }
  };

  const getInvitationStatus = (targetTeamId) => {
    for (const myTeam of myTeams) {
      const key = `${myTeam.id}-${targetTeamId}`;
      const invitation = invitationsMap.get(key);
      if (invitation) {
        return invitation.status;
      }
    }
    return null;
  };

  const handleInviteTeam = async (targetTeam) => {
    if (!selectedTournament) {
      alert("請先選擇一個盃賽");
      return;
    }
    if (myTeams.length === 0) {
      alert("你還沒有加入任何隊伍，無法發送練習賽邀請");
      return;
    }
    if (myTeams.length === 1) {
      sendInvitation(myTeams[0], targetTeam);
      return;
    }
    setSelectedMyTeam(null);
    setShowTeamSelector(true);
    setTargetTeamForInvite(targetTeam);
  };

  const handleConfirmTeamSelection = () => {
    if (!selectedMyTeam || !targetTeamForInvite) {
      alert("請選擇一支隊伍");
      return;
    }
    setShowTeamSelector(false);
    sendInvitation(selectedMyTeam, targetTeamForInvite);
    setTargetTeamForInvite(null);
    setSelectedMyTeam(null);
  };

  const sendInvitation = async (fromTeam, toTeam) => {
    const message = prompt("請輸入邀請訊息（可選）：");
    if (message === null) {
      return;
    }
    try {
      await createInvitation({
        fromTeam: fromTeam.id,
        toTeam: toTeam.id,
        tournamentId: selectedTournament.id,
        message: message || `${fromTeam.name} 邀請你進行練習賽`,
      });
      alert("邀請已發送！");
      const key = `${fromTeam.id}-${toTeam.id}`;
      const newInvitation = {
        fromTeam: fromTeam.id,
        toTeam: toTeam.id,
        tournamentId: selectedTournament.id,
        status: "pending",
        message: message || `${fromTeam.name} 邀請你進行練習賽`,
      };
      const newInvitationsMap = new Map(invitationsMap);
      newInvitationsMap.set(key, newInvitation);
      setInvitationsMap(newInvitationsMap);
    } catch (err) {
      alert("發送邀請失敗，請稍後再試");
    }
  };

  // 進入盃賽時自動預設代表隊伍與練習賽時間（practiceEvents 載入後才執行）
  useEffect(() => {
    if (!selectedTournament || myTeams.length === 0 || teams.length === 0) return;
    // 找出有參加該盃賽的我的隊伍（myTeams 與 teams 交集）
    const myTeamIds = myTeams.map(t => t.id);
    const participatingMyTeams = teams.filter(t => myTeamIds.includes(t.id));
    if (participatingMyTeams.length > 0) {
      const defaultTeam = participatingMyTeams[0];
      setSelectedMyTeam((prev) => {
        // 僅在未選擇或選擇的隊伍不在本盃賽時才自動設預設
        if (!prev || !participatingMyTeams.some(t => t.id === prev.id)) {
          return defaultTeam;
        }
        return prev;
      });
      // practiceEvents 載入後才設事件
      const events = practiceEvents.filter(ev => ev.teamId === defaultTeam.id);
      setMyTeamPracticeEvents(events);
      setSelectedPracticeTimes(events.map(ev => ev.startTime));
    } else {
      setSelectedMyTeam(null);
      setMyTeamPracticeEvents([]);
      setSelectedPracticeTimes([]);
    }
  }, [selectedTournament, myTeams, teams, practiceEvents]);

  // 載入所有參賽隊伍的練習賽事件
  useEffect(() => {
    async function loadAllPracticeEvents() {
      if (!selectedTournament || !selectedTournament.participatingTeams) {
        setPracticeEvents([]);
        return;
      }
      const allEvents = [];
      for (const teamId of selectedTournament.participatingTeams) {
        try {
          const events = await getTeamEvents(teamId);
          // 只取 type: 'practice' 的事件
          allEvents.push(...events.filter(ev => ev.type === 'practice'));
        } catch (err) {
          console.error(`載入隊伍 ${teamId} 事件失敗:`, err);
        }
      }
      setPracticeEvents(allEvents);
    }
    loadAllPracticeEvents();
  }, [selectedTournament]);

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
        <h1 className="text-3xl font-bold text-gray-800 mb-2">跨校練習賽媒合</h1>
        <p className="text-gray-600">選擇盃賽，查看參賽隊伍，邀請練習對戰</p>
      </div>
      {/* 未選擇盃賽：顯示盃賽列表 */}
      {!selectedTournament ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">選擇盃賽</h2>
            <Link
              to="/tournament/create"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
            >
              + 新增盃賽
            </Link>
          </div>
          {tournaments.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500">目前沒有盃賽</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border border-gray-200"
                >
                  <button
                    onClick={() => handleSelectTournament(tournament)}
                    className="w-full text-left"
                  >
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{tournament.name}</h3>
                    <p className="text-gray-600 text-sm mb-2">📅 {new Date(tournament.date).toLocaleDateString("zh-TW")}</p>
                    <p className="text-gray-600 text-sm">👥 {tournament.participatingTeams?.length || 0} 隊參賽</p>
                    <div className="mt-4 text-blue-600 font-medium text-sm">點擊查看參賽隊伍 →</div>
                  </button>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                    <Link
                      to={`/tournament/${tournament.id}/edit`}
                      className="text-sm text-gray-500 hover:text-blue-600 transition"
                    >
                      ✏️ 編輯盃賽
                    </Link>
                    {/* 僅創建者可見刪除按鈕 */}
                    {currentUser?.uid === tournament.createdBy && (
                      <button
                        className="ml-2 px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700 transition"
                        onClick={async e => {
                          e.stopPropagation();
                          if (!window.confirm('確定要刪除此盃賽嗎？')) return;
                          try {
                            await deleteTournamentWithMatches(tournament.id);
                            alert('盃賽及相關練習賽房間已刪除');
                            setTournaments(tournaments.filter(t => t.id !== tournament.id));
                          } catch (err) {
                            alert('刪除失敗，請稍後再試');
                          }
                        }}
                      >
                        刪除
                      </button>
                    )}
                    {/* 加入盃賽按鈕 */}
                    <button
                      className="ml-2 px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 transition"
                      onClick={e => {
                        e.stopPropagation();
                        setShowJoinDialog(true);
                      }}
                    >
                      ＋加入盃賽
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* 加入盃賽彈窗 */}
          {showJoinDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 min-w-[300px]">
                <h3 className="text-lg font-bold mb-4">選擇代表隊伍加入盃賽</h3>
                <select
                  className="w-full border rounded px-3 py-2 mb-4"
                  value={joinSelectedTeamId}
                  onChange={e => setJoinSelectedTeamId(e.target.value)}
                >
                  <option value="">請選擇隊伍</option>
                  {myTeams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
                <div className="flex justify-end gap-2">
                  <button
                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                    onClick={() => setShowJoinDialog(false)}
                  >取消</button>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    disabled={!joinSelectedTeamId}
                    onClick={() => {/* handleConfirmJoin */}}
                  >確定加入</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // 已選擇盃賽區塊
        <div>
          {/* 返回按鈕 */}
          <button
            onClick={() => {
              setSelectedTournament(null);
              setTeams([]);
            }}
            className="mb-4 text-blue-600 hover:underline"
          >
            ← 返回選擇盃賽
          </button>

          {/* 代表隊伍選擇 */}
          {myTeams.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 flex items-center gap-4">
              <label htmlFor="myTeamSelect" className="font-bold text-gray-800">代表隊伍：</label>
              <select
                id="myTeamSelect"
                className="border rounded px-3 py-2 text-gray-800"
                value={selectedMyTeam ? selectedMyTeam.id : myTeams[0].id}
                onChange={e => {
                  const team = myTeams.find(t => t.id === e.target.value);
                  setSelectedMyTeam(team);
                  // 切換時只顯示該隊伍的事件並同步選擇時間
                  const events = practiceEvents.filter(ev => ev.teamId === team.id);
                  setMyTeamPracticeEvents(events);
                  setSelectedPracticeTimes(events.map(ev => ev.startTime));
                }}
              >
                {myTeams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* 盃賽資訊 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedTournament.name}</h2>
            <p className="text-gray-600">📅 {new Date(selectedTournament.date).toLocaleDateString("zh-TW")} | 📍 {selectedTournament.location}</p>
          </div>

          {/* 參賽隊伍循環圖 */}
          {(selectedTournament.bracketImage || selectedTournament.bracketLink) && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">參賽隊伍循環圖</h3>
              {selectedTournament.bracketImage && (
                <img src={selectedTournament.bracketImage} alt="參賽隊伍循環圖" className="max-w-full h-auto rounded border mb-4" />
              )}
              {selectedTournament.bracketLink && (
                <a href={selectedTournament.bracketLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">在新分頁查看循環圖 →</a>
              )}
            </div>
          )}

          {/* 練習賽時間選擇與一鍵邀請 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">選擇練習賽時間</h3>
            {myTeamPracticeEvents.length === 0 ? (
              <div className="text-gray-500">目前沒有可用的練習賽事件，請先在隊伍日曆建立練習賽事件</div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  {myTeamPracticeEvents.map((event) => {
                    let dateObj = null;
                    if (event.startTime && typeof event.startTime === "object" && typeof event.startTime.toDate === "function") {
                      dateObj = event.startTime.toDate();
                    } else if (typeof event.startTime === "string" || typeof event.startTime === "number") {
                      dateObj = new Date(event.startTime);
                    }
                    const label = dateObj && !isNaN(dateObj) ? dateObj.toLocaleString("zh-TW") : "(無效時間)";
                    const checked = selectedPracticeTimes.some(sel => getTime(sel) === getTime(event.startTime));
                    return (
                      <label key={event.id} className={`flex items-center gap-1 px-3 py-1 rounded border cursor-pointer ${checked ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-600 border-blue-600"}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setSelectedPracticeTimes(prev =>
                              checked
                                ? prev.filter(sel => getTime(sel) !== getTime(event.startTime))
                                : [...prev, event.startTime]
                            );
                          }}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                  onClick={handleBatchInviteClick}
                  disabled={selectedPracticeTimes.length === 0}
                >
                  用這些時間幫我找對手
                </button>
              </>
            )}
          </div>

          {/* 多邀請彈窗（主畫面下方顯示重疊隊伍與時間選擇區塊） */}
          {batchInviteCandidates.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">選擇要邀請的隊伍</h3>
              <p className="text-sm text-gray-600 mb-4">系統已自動勾選所有與你有重疊練習賽時間的隊伍，你可手動取消不要的隊伍</p>
              <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                {batchInviteCandidates.map((item) => (
                  <div key={item.team.id} className={`flex items-center p-3 border-2 rounded-lg ${item.checked ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleBatchInviteCandidate(item.team.id)}
                      className="w-4 h-4 text-blue-600 cursor-pointer transition"
                    />
                    <div className="ml-3 flex-1">
                      <div className="font-semibold text-gray-800">{item.team.name}</div>
                      <div className="text-sm text-gray-600">{item.team.school}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        重疊時間：
                        {item.overlapTimes.map((time, idx) => {
                          let dateObj = null;
                          if (time && typeof time === "object" && typeof time.toDate === "function") {
                            dateObj = time.toDate();
                          } else if (typeof time === "string" || typeof time === "number") {
                            dateObj = new Date(time);
                          }
                          const label = dateObj && !isNaN(dateObj) ? dateObj.toLocaleString("zh-TW") : "(無效時間)";
                          return <span key={time}>{label}{idx < item.overlapTimes.length - 1 ? '、' : ''}</span>;
                        })}
                      </div>
                    </div>
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.team.teamColor || "#3B82F6" }}></div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmBatchInvite}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                >
                  確認發送邀請
                </button>
                <button
                  onClick={() => setBatchInviteCandidates([])}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* 參賽隊伍列表（移除個別邀請按鈕） */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">參賽隊伍</h3>
            {loadingTeams ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">載入隊伍中...</p>
              </div>
            ) : teams.length === 0 ? (
              <p className="text-gray-500 text-center py-8">目前沒有隊伍報名此盃賽</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="rounded-lg p-4 shadow-md hover:shadow-xl transition-all border-4"
                    style={{ backgroundColor: team.teamColor || "#3B82F6", borderColor: team.teamColor || "#3B82F6" }}
                  >
                    <h4 className="font-bold text-white text-lg mb-2 drop-shadow-md">{team.name}</h4>
                    <p className="text-sm text-white text-opacity-95 mb-2">🏫 {team.school || "未提供學校"}</p>
                    <p className="text-sm text-white text-opacity-95 mb-3">👥 {team.members?.length || 0} 位隊員</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 多隊伍選擇器彈窗 */}
      {showTeamSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              選擇發起邀請的隊伍
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              你有多支隊伍，請選擇要代表哪一支隊伍發送邀請
            </p>

            <div className="space-y-2 mb-6">
              {myTeams.map((team) => (
                <label
                  key={team.id}
                  className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition ${
                    selectedMyTeam?.id === team.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="myTeam"
                    checked={selectedMyTeam?.id === team.id}
                    onChange={() => setSelectedMyTeam(team)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="ml-3 flex-1">
                    <div className="font-semibold text-gray-800">
                      {team.name}
                    </div>
                    <div className="text-sm text-gray-600">{team.school}</div>
                  </div>
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: team.teamColor || "#3B82F6" }}
                  ></div>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  if (!selectedMyTeam || pendingBatchInviteTeams.length === 0) {
                    alert("請至少選擇一個隊伍");
                    return;
                  }
                  setShowTeamSelector(false);
                  setShowBatchInvite(false);
                  for (const toTeam of pendingBatchInviteTeams) {
                    await sendInvitation(selectedMyTeam, toTeam);
                  }
                  alert(`已同時發送邀請給 ${pendingBatchInviteTeams.length} 支隊伍！`);
                  setSelectedMyTeam(null);
                  setPendingBatchInviteTeams([]);
                }}
                disabled={!selectedMyTeam}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                確認
              </button>
              <button
                onClick={() => {
                  setShowTeamSelector(false);
                  setTargetTeamForInvite(null);
                  setSelectedMyTeam(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




