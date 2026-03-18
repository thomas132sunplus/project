import { useState, useEffect } from "react";
import { getTeamEvents } from "../firebase/teamEvents";
import { getAllTournaments } from "../firebase/tournaments";
import { getTeam } from "../firebase/teams";
import {
  createInvitation,
  getTeamSentInvitations,
} from "../firebase/invitations";
import { useAuth } from "../contexts/AuthContext";
import { getUserTeams } from "../firebase/teams";
import { Link, useLocation, useNavigate } from "react-router-dom";

export function PracticeMatching() {
  // ...existing useState...
  // 切換候選隊伍勾選狀態
  const toggleBatchInviteCandidate = (teamId) => {
    setBatchInviteCandidates(prev => {
      const next = prev.map(item =>
        item.team.id === teamId ? { ...item, checked: !item.checked } : { ...item }
      );
      console.log('toggleBatchInviteCandidate', teamId, next.map(i => ({ id: i.team.id, checked: i.checked })));
      return next;
    });
  };
  // 批次確認發送邀請
  const handleConfirmBatchInvite = async () => {
    // 自動選用唯一一支我的隊伍，或取第一支
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
        // 批次邀請按鈕：根據選擇的練習賽時間，自動找出有重疊的隊伍
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
      const [loadingTeams, setLoadingTeams] = useState(false);
    // 點擊盃賽時載入隊伍
    const handleSelectTournament = async (tournament) => {
      setSelectedTournament(tournament);
      setLoading(true);
      const teamIds = tournament.participatingTeams || [];
      const teamPromises = teamIds.map((id) => getTeam(id));
      const teamsData = await Promise.all(teamPromises);
      setTeams(teamsData);

      // 取得所有隊伍的練習賽事件
      let allEvents = [];
      for (const team of teamsData) {
        const events = await getTeamEvents(team.id);
        allEvents = allEvents.concat(events);
      }
      setPracticeEvents(allEvents);

      setLoading(false);
    };
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [myTeams, setMyTeams] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invitationsMap, setInvitationsMap] = useState(new Map());
  const [selectedMyTeam, setSelectedMyTeam] = useState(null);
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [targetTeamForInvite, setTargetTeamForInvite] = useState(null);
  // 狀態宣告區（順序很重要）
  // 不再用 showBatchInvite 彈窗，直接在主畫面顯示
  // 暫存多隊伍選擇時已勾選的隊伍
  const [pendingBatchInviteTeams, setPendingBatchInviteTeams] = useState([]);
  const [batchInviteCandidates, setBatchInviteCandidates] = useState([]); // {team, checked}
  const [practiceEvents, setPracticeEvents] = useState([]); // {id, startTime, ...}
  const [excludedEventIds, setExcludedEventIds] = useState([]); // 不參與媒合的事件 id
  const [selectedPracticeTimes, setSelectedPracticeTimes] = useState([]); // 目前複選的練習賽時間（陣列）
  const loadInvitationStatus = async (tournamentId) => {
    try {
      const newInvitationsMap = new Map();
      // 對每個我的隊伍，獲取發出的邀請
      for (const myTeam of myTeams) {
        const sentInvitations = await getTeamSentInvitations(myTeam.id);
        // 過濾出相關盃賽的邀請
        const relevantInvitations = sentInvitations.filter(
          (inv) => inv.tournamentId === tournamentId
        );
        // 建立對目標隊伍的邀請映射
        for (const inv of relevantInvitations) {
          const key = `${myTeam.id}-${inv.toTeam}`;
          newInvitationsMap.set(key, inv);
        }
      }
      // setInvitationsMap(newInvitationsMap);
    } catch (err) {
      console.error("載入邀請狀態失敗:", err);
    }
  };
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  // 其餘 useState 已於最上方宣告，這裡移除重複宣告

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
        // 立即載入參賽隊伍
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

  const getInvitationStatus = (targetTeamId) => {
    // 檢查我的任何隊伍是否已經邀請過這個隊伍
    console.log(
      `檢查隊伍 ${targetTeamId} 的邀請狀態，invitationsMap size:`,
      invitationsMap.size,
    );
    for (const myTeam of myTeams) {
      const key = `${myTeam.id}-${targetTeamId}`;
      const invitation = invitationsMap.get(key);
      console.log(
        `檢查 key: ${key}, 結果:`,
        invitation ? invitation.status : "未找到",
      );
      if (invitation) {
        return invitation.status;
      }
    }
    return null;
  };

  const handleInviteTeam = async (targetTeam) => {
    console.log("=== 點擊邀請按鈕 ===");
    console.log("目標隊伍:", targetTeam);
    console.log("我的隊伍數量:", myTeams.length);
    console.log("我的隊伍列表:", myTeams);
    console.log("選中的盃賽:", selectedTournament);

    // 檢查是否選擇了盃賽
    if (!selectedTournament) {
      console.error("錯誤：未選擇盃賽");
      alert("請先選擇一個盃賽");
      return;
    }

    // 檢查是否有我的隊伍
    if (myTeams.length === 0) {
      console.error("錯誤：沒有隊伍");
      alert("你還沒有加入任何隊伍，無法發送練習賽邀請");
      return;
    }

    console.log("準備發送邀請...");

    // 如果只有一支隊伍，直接使用
    if (myTeams.length === 1) {
      console.log("只有一支隊伍，直接發送", myTeams[0]);
      sendInvitation(myTeams[0], targetTeam);
      return;
    }

    // 多支隊伍時，讓用戶選擇
    console.log("有多支隊伍，顯示選擇器");
    setSelectedMyTeam(null);
    setShowTeamSelector(true);
    setTargetTeamForInvite(targetTeam);
  };

  const handleConfirmTeamSelection = () => {
    console.log("確認選擇隊伍:", selectedMyTeam);
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
    console.log("=== 開始發送邀請 ===");
    console.log("從隊伍:", fromTeam);
    console.log("到隊伍:", toTeam);
    console.log("盃賽ID:", selectedTournament.id);

    const message = prompt("請輸入邀請訊息（可選）：");
    if (message === null) {
      console.log("用戶取消輸入訊息");
      return; // 用戶取消
    }

    try {
      console.log("呼叫 createInvitation...");
      await createInvitation({
        fromTeam: fromTeam.id,
        toTeam: toTeam.id,
        tournamentId: selectedTournament.id,
        message: message || `${fromTeam.name} 邀請你進行練習賽`,
      });

      console.log("✓ 邀請已發送到 Firestore");
      alert("邀請已發送！");

      // 立即更新本地狀態，添加新的邀請
      const key = `${fromTeam.id}-${toTeam.id}`;
      const newInvitation = {
        fromTeam: fromTeam.id,
        toTeam: toTeam.id,
        tournamentId: selectedTournament.id,
        status: "pending",
        message: message || `${fromTeam.name} 邀請你進行練習賽`,
      };

      console.log("更新本地邀請狀態，key:", key);
      const newInvitationsMap = new Map(invitationsMap);
      newInvitationsMap.set(key, newInvitation);
      setInvitationsMap(newInvitationsMap);
      console.log("✓ 本地狀態已更新");
    } catch (err) {
      console.error("❌ 發送邀請失敗:", err);
      console.error("錯誤詳情:", err.message, err.code);
      alert("發送邀請失敗，請稍後再試");
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
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          跨校練習賽媒合
        </h1>
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
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {tournament.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      📅 {new Date(tournament.date).toLocaleDateString("zh-TW")}
                    </p>
                    <p className="text-gray-600 text-sm">
                      👥 {tournament.participatingTeams?.length || 0} 隊參賽
                    </p>
                    <div className="mt-4 text-blue-600 font-medium text-sm">
                      點擊查看參賽隊伍 →
                    </div>
                  </button>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <Link
                      to={`/tournament/${tournament.id}/edit`}
                      className="text-sm text-gray-500 hover:text-blue-600 transition"
                    >
                      ✏️ 編輯盃賽
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 已選擇盃賽：顯示參賽隊伍 */
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

          {/* 盃賽資訊 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {selectedTournament.name}
            </h2>
            <p className="text-gray-600">
              📅 {new Date(selectedTournament.date).toLocaleDateString("zh-TW")}{" "}
              | 📍 {selectedTournament.location}
            </p>
          </div>

          {/* 參賽隊伍循環圖 */}
          {(selectedTournament.bracketImage ||
            selectedTournament.bracketLink) && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                參賽隊伍循環圖
              </h3>
              {selectedTournament.bracketImage && (
                <img
                  src={selectedTournament.bracketImage}
                  alt="參賽隊伍循環圖"
                  className="max-w-full h-auto rounded border mb-4"
                />
              )}
              {selectedTournament.bracketLink && (
                <a
                  href={selectedTournament.bracketLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  在新分頁查看循環圖 →
                </a>
              )}
            </div>
          )}

          {/* 已移除偏好選擇區塊 */}
          {/* 練習賽時間選擇與一鍵邀請 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">選擇練習賽時間</h3>
            {practiceEvents.length === 0 ? (
              <div className="text-gray-500">目前沒有可用的練習賽事件，請先在隊伍日曆建立練習賽事件</div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  {practiceEvents.map((event) => {
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
                          disabled={excludedEventIds.includes(event.id)}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
                <div className="mb-2 text-sm text-gray-600">可勾選不參與媒合的時間：</div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {practiceEvents.map((event) => {
                    let dateObj = null;
                    if (event.startTime && typeof event.startTime === "object" && typeof event.startTime.toDate === "function") {
                      dateObj = event.startTime.toDate();
                    } else if (typeof event.startTime === "string" || typeof event.startTime === "number") {
                      dateObj = new Date(event.startTime);
                    }
                    const label = dateObj && !isNaN(dateObj) ? dateObj.toLocaleString("zh-TW") : "(無效時間)";
                    return (
                      <label key={event.id} className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                        <input
                          type="checkbox"
                          checked={excludedEventIds.includes(event.id)}
                          onChange={() => {
                            setExcludedEventIds((prev) =>
                              prev.includes(event.id)
                                ? prev.filter((id) => id !== event.id)
                                : [...prev, event.id]
                            );
                            // 若目前選擇的時間被排除，取消選取
                            if (getTime(selectedPracticeTime) === getTime(event.startTime)) setSelectedPracticeTime(null);
                          }}
                        />
                        不媒合 {label}
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

          {/* 參賽隊伍列表 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">參賽隊伍</h3>
      {/* 多邀請彈窗 */}
      {/* 主畫面下方顯示重疊隊伍與時間選擇區塊 */}
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

            {loadingTeams ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">載入隊伍中...</p>
              </div>
            ) : teams.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                目前沒有隊伍報名此盃賽
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map((team) => {
                  const isMyTeam = myTeams.some(
                    (myTeam) => myTeam.id === team.id,
                  );
                  const invitationStatus = getInvitationStatus(team.id);

                  // 根據狀態決定按鈕文字和樣式
                  return (
                    <div
                      key={team.id}
                      className="rounded-lg p-4 shadow-md hover:shadow-xl transition-all border-4"
                      style={{
                        backgroundColor: team.teamColor || "#3B82F6",
                        borderColor: team.teamColor || "#3B82F6",
                      }}
                    >
                      <h4 className="font-bold text-white text-lg mb-2 drop-shadow-md">
                        {team.name}
                      </h4>
                      <p className="text-sm text-white text-opacity-95 mb-2">
                        🏫 {team.school || "未提供學校"}
                      </p>
                      <p className="text-sm text-white text-opacity-95 mb-3">
                        👥 {team.members?.length || 0} 位隊員
                      </p>
                      {/* 已徹底移除邀請練習賽按鈕與相關狀態 */}
                    </div>
                  );
                })}
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
