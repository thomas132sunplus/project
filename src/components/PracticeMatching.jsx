// PracticeMatching.jsx - 跨校練習賽媒合頁面
// 選擇盃賽 -> 查看參賽隊伍 -> 邀請對戰

import { useState, useEffect } from "react";
import { getAllTournaments } from "../firebase/tournaments";
import { getTeam } from "../firebase/teams";
import {
  createInvitation,
  getTeamSentInvitations,
} from "../firebase/invitations";
import { useAuth } from "../contexts/AuthContext";
import { getUserTeams } from "../firebase/teams";
import { Link } from "react-router-dom";

export default function PracticeMatching() {
  const { currentUser } = useAuth();
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

  useEffect(() => {
    loadTournaments();
    loadMyTeams();
  }, [currentUser]);

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
    }
  };

  const loadTournaments = async () => {
    try {
      setLoading(true);
      const data = await getAllTournaments();
      setTournaments(data);
    } catch (err) {
      console.error("載入盃賽失敗:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTournament = async (tournament) => {
    setSelectedTournament(tournament);
    setLoadingTeams(true);

    try {
      // 從盃賽的 participatingTeams 欄位獲取隊伍 ID 列表
      const teamIds = tournament.participatingTeams || [];

      // 根據 ID 列表獲取完整的隊伍資料
      const teamPromises = teamIds.map((id) => getTeam(id));
      const teamsData = await Promise.all(teamPromises);

      setTeams(teamsData);

      // useEffect 會自動載入邀請狀態
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
      console.log(
        "開始載入邀請狀態，盃賽ID:",
        tournamentId,
        "myTeams:",
        myTeams.length,
      );
      const newInvitationsMap = new Map();

      // 對每個我的隊伍，獲取發出的邀請
      for (const myTeam of myTeams) {
        const sentInvitations = await getTeamSentInvitations(myTeam.id);
        console.log(
          `隊伍 ${myTeam.name} 發出的邀請數:`,
          sentInvitations.length,
        );

        // 過濾出相關盃賽的邀請
        const relevantInvitations = sentInvitations.filter(
          (inv) => inv.tournamentId === tournamentId,
        );
        console.log(
          `隊伍 ${myTeam.name} 在此盃賽的邀請數:`,
          relevantInvitations.length,
        );

        // 建立對目標隊伍的邀請映射
        for (const inv of relevantInvitations) {
          const key = `${myTeam.id}-${inv.toTeam}`;
          newInvitationsMap.set(key, inv);
          console.log("載入邀請狀態:", key, inv.status);
        }
      }

      console.log("總共載入邀請數量:", newInvitationsMap.size);
      console.log("invitationsMap keys:", Array.from(newInvitationsMap.keys()));
      setInvitationsMap(newInvitationsMap);
    } catch (err) {
      console.error("載入邀請狀態失敗:", err);
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

          {/* 參賽隊伍列表 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">參賽隊伍</h3>

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
                  let buttonText = "邀請練習賽";
                  let buttonClass =
                    "w-full px-4 py-2 bg-white text-gray-800 rounded hover:bg-opacity-90 transition font-semibold";
                  let buttonDisabled = false;

                  if (isMyTeam) {
                    buttonText = "我的隊伍";
                    buttonClass =
                      "w-full px-4 py-2 bg-white bg-opacity-30 text-white rounded cursor-not-allowed";
                    buttonDisabled = true;
                  } else if (invitationStatus === "pending") {
                    buttonText = "已發送邀請 (待回應)";
                    buttonClass =
                      "w-full px-4 py-2 bg-yellow-100 text-yellow-800 rounded cursor-default font-semibold";
                    buttonDisabled = true;
                  } else if (invitationStatus === "accepted") {
                    buttonText = "✓ 已同意邀請";
                    buttonClass =
                      "w-full px-4 py-2 bg-green-100 text-green-800 rounded cursor-default font-semibold";
                    buttonDisabled = true;
                  } else if (invitationStatus === "declined") {
                    buttonText = "✗ 已拒絕邀請";
                    buttonClass =
                      "w-full px-4 py-2 bg-red-100 text-red-800 rounded cursor-default font-semibold";
                    buttonDisabled = true;
                  }

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

                      <button
                        onClick={() =>
                          !buttonDisabled && handleInviteTeam(team)
                        }
                        disabled={buttonDisabled}
                        className={buttonClass}
                      >
                        {buttonText}
                      </button>
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
                onClick={handleConfirmTeamSelection}
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
