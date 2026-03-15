// PracticeMatchDiscussion.jsx - 練習賽討論區
// 包含聊天、賽事資訊等功能

import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  getPracticeMatch,
  updatePracticeMatchInfo,
  requestCancelPracticeMatch,
  deletePracticeMatch,
} from "../firebase/practiceMatches";
import { getTeam } from "../firebase/teams";
import { getTournament } from "../firebase/tournaments";
import {
  sendMessage,
  subscribeToMessages,
} from "../firebase/practiceMatchMessages";
import {
  getTeamMemberIds,
  notifyMatchCancelRequest,
  notifyMatchCancelled,
} from "../firebase/notificationHelpers";

export default function PracticeMatchDiscussion() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [fromTeam, setFromTeam] = useState(null);
  const [toTeam, setToTeam] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("info");
  const [editingInfo, setEditingInfo] = useState(false);
  const [matchInfo, setMatchInfo] = useState({
    format: "single",
    propositionOrder: [],
    date: "",
    time: "",
    venue: "",
    refreshments: {},
    contacts: {},
  });
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    loadMatchData();
  }, [id]);

  const loadMatchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 獲取練習賽資料
      const matchData = await getPracticeMatch(id);
      if (!matchData) {
        setError("找不到該練習賽");
        setLoading(false);
        return;
      }
      setMatch(matchData);

      // 獲取隊伍和盃賽資料
      const [fromTeamData, toTeamData, tournamentData] = await Promise.all([
        getTeam(matchData.fromTeam || matchData.affirmativeTeam),
        getTeam(matchData.toTeam || matchData.negativeTeam),
        getTournament(matchData.tournamentId),
      ]);

      setFromTeam(fromTeamData);
      setToTeam(toTeamData);
      setTournament(tournamentData);

      // 設定比賽資訊預設值
      if (matchData.matchInfo) {
        setMatchInfo(matchData.matchInfo);
      } else {
        // 初始化 contacts 和 refreshments
        setMatchInfo({
          format: "single",
          propositionOrder: [],
          positions: {
            [fromTeamData.id]: "正方",
            [toTeamData.id]: "反方",
          },
          date: "",
          time: "",
          venue: "",
          refreshments: {
            [fromTeamData.id]: "",
            [toTeamData.id]: "",
          },
          contacts: {
            [fromTeamData.id]: { name: "", phone: "" },
            [toTeamData.id]: { name: "", phone: "" },
          },
        });
      }
    } catch (err) {
      console.error("載入練習賽資料失敗：", err);
      setError("載入練習賽資料失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMatchInfo = async () => {
    try {
      await updatePracticeMatchInfo(id, matchInfo);
      setEditingInfo(false);
      alert("資訊已儲存！");
      loadMatchData(); // 重新載入資料
    } catch (err) {
      console.error("儲存失敗：", err);
      alert("儲存失敗，請稍後再試");
    }
  };

  const handleCancelEdit = () => {
    setEditingInfo(false);
    // 恢復原本資料
    if (match?.matchInfo) {
      setMatchInfo(match.matchInfo);
    }
  };

  // 判斷當前用戶屬於哪個隊伍
  const getUserTeamId = () => {
    if (fromTeam?.members?.includes(currentUser?.uid)) return fromTeam.id;
    if (toTeam?.members?.includes(currentUser?.uid)) return toTeam.id;
    return null;
  };

  // 發起取消練習賽請求
  const handleRequestCancel = async () => {
    const userTeamId = getUserTeamId();
    if (!userTeamId) return;

    if (!window.confirm("確定要發起取消練習賽的請求嗎？")) return;

    try {
      setCancelLoading(true);
      await requestCancelPracticeMatch(id, userTeamId);

      // 取得雙方隊伍所有成員 ID
      const [fromIds, toIds] = await Promise.all([
        getTeamMemberIds(fromTeam.id),
        getTeamMemberIds(toTeam.id),
      ]);
      const allMemberIds = [...new Set([...fromIds, ...toIds])];

      const requestingTeamName =
        userTeamId === fromTeam.id ? fromTeam.name : toTeam.name;
      await notifyMatchCancelRequest(id, requestingTeamName, allMemberIds);

      await loadMatchData();
    } catch (err) {
      console.error("發起取消請求失敗：", err);
      alert("發起取消請求失敗，請稍後再試");
    } finally {
      setCancelLoading(false);
    }
  };

  // 同意取消練習賽
  const handleConfirmCancel = async () => {
    if (!window.confirm("確定要同意取消這場練習賽嗎？取消後將刪除此討論房間。")) return;

    try {
      setCancelLoading(true);

      // 取得雙方隊伍所有成員 ID
      const [fromIds, toIds] = await Promise.all([
        getTeamMemberIds(fromTeam.id),
        getTeamMemberIds(toTeam.id),
      ]);
      const allMemberIds = [...new Set([...fromIds, ...toIds])];

      await notifyMatchCancelled(id, fromTeam.name, toTeam.name, allMemberIds);
      await deletePracticeMatch(id);

      alert("練習賽已取消");
      navigate("/practice-matches");
    } catch (err) {
      console.error("確認取消練習賽失敗：", err);
      alert("取消失敗，請稍後再試");
    } finally {
      setCancelLoading(false);
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

  if (error || !match) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error || "找不到該練習賽"}
        </div>
        <button
          onClick={() => navigate("/practice-matches")}
          className="inline-block mt-4 text-blue-600 hover:underline"
        >
          ← 返回練習賽列表
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 返回連結 */}
      <button
        onClick={() => navigate("/practice-matches")}
        className="inline-block mb-4 text-blue-600 hover:underline"
      >
        ← 返回練習賽列表
      </button>

      {/* 練習賽標題區 */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg md:text-2xl font-bold text-gray-800">
            練習賽討論區
          </h1>
          {match.status === "scheduled" && (
            <span className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded">
              已排期
            </span>
          )}
          {match.status === "confirmed" && (
            <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded">
              已確認
            </span>
          )}
          {match.status === "completed" && (
            <span className="bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded">
              已完成
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-sm md:text-lg">
          <div className="flex-1">
            <span
              className="font-bold px-3 py-1 rounded"
              style={{
                backgroundColor: fromTeam?.teamColor || "#3B82F6",
                color: "white",
              }}
            >
              {fromTeam?.name || "隊伍A"}
            </span>
          </div>
          <div className="px-4">
            <span className="text-xl md:text-2xl text-gray-400 font-bold">
              VS
            </span>
          </div>
          <div className="flex-1 text-right">
            <span
              className="font-bold px-3 py-1 rounded"
              style={{
                backgroundColor: toTeam?.teamColor || "#F59E0B",
                color: "white",
              }}
            >
              {toTeam?.name || "隊伍B"}
            </span>
          </div>
        </div>

        <p className="text-gray-600 mt-3">
          🏆 盃賽：{tournament?.name || "未知盃賽"}
        </p>

        {/* 取消練習賽按鈕 */}
        {match.status !== "completed" && (() => {
          const userTeamId = getUserTeamId();
          const cancelRequest = match.cancelRequest;
          const hasPendingCancel = cancelRequest?.status === "pending";
          const isRequestingTeam = hasPendingCancel && cancelRequest.requestedBy === userTeamId;
          const isOtherTeam = hasPendingCancel && cancelRequest.requestedBy !== userTeamId;

          if (!userTeamId) return null;

          if (hasPendingCancel && isRequestingTeam) {
            return (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  disabled
                  className="w-full px-4 py-2.5 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
                >
                  已送出取消請求
                </button>
                <p className="text-xs text-gray-400 mt-1 text-center">等待對方隊伍同意取消</p>
              </div>
            );
          }

          if (hasPendingCancel && isOtherTeam) {
            const requestingTeamName =
              cancelRequest.requestedBy === fromTeam?.id ? fromTeam.name : toTeam.name;
            return (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-orange-600 mb-2 text-center">
                  ⚠️ {requestingTeamName} 已請求取消此練習賽
                </p>
                <button
                  onClick={handleConfirmCancel}
                  disabled={cancelLoading}
                  className="w-full px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {cancelLoading ? "處理中..." : "同意取消練習賽"}
                </button>
              </div>
            );
          }

          return (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleRequestCancel}
                disabled={cancelLoading}
                className="w-full px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {cancelLoading ? "處理中..." : "取消練習賽"}
              </button>
            </div>
          );
        })()}
      </div>

      {/* Tab 切換 */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="flex border-b overflow-x-auto">
          <TabButton
            label="📋 賽事資訊"
            active={activeTab === "info"}
            onClick={() => setActiveTab("info")}
          />
          <TabButton
            label="💬 聊天"
            active={activeTab === "chat"}
            onClick={() => setActiveTab("chat")}
          />
        </div>

        {/* Tab 內容 */}
        <div className="p-3 md:p-6">
          {activeTab === "info" && (
            <MatchInfoSection
              matchInfo={matchInfo}
              setMatchInfo={setMatchInfo}
              fromTeam={fromTeam}
              toTeam={toTeam}
              editing={editingInfo}
              setEditing={setEditingInfo}
              onSave={handleSaveMatchInfo}
              onCancel={handleCancelEdit}
            />
          )}
          {activeTab === "chat" && <ChatSection matchId={id} />}
        </div>
      </div>
    </div>
  );
}

// Tab 按鈕元件
function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 md:px-6 py-2.5 md:py-3 font-medium transition whitespace-nowrap text-sm md:text-base ${
        active
          ? "text-blue-600 border-b-2 border-blue-600"
          : "text-gray-600 hover:text-gray-800"
      }`}
    >
      {label}
    </button>
  );
}

// 賽事資訊元件
function MatchInfoSection({
  matchInfo,
  setMatchInfo,
  fromTeam,
  toTeam,
  editing,
  setEditing,
  onSave,
  onCancel,
}) {
  const handleInputChange = (field, value) => {
    setMatchInfo((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRefreshmentsChange = (teamId, value) => {
    setMatchInfo((prev) => ({
      ...prev,
      refreshments: {
        ...prev.refreshments,
        [teamId]: value,
      },
    }));
  };

  const handleContactChange = (teamId, field, value) => {
    setMatchInfo((prev) => ({
      ...prev,
      contacts: {
        ...prev.contacts,
        [teamId]: {
          ...prev.contacts[teamId],
          [field]: value,
        },
      },
    }));
  };

  const handlePropositionOrderChange = (index, teamId) => {
    setMatchInfo((prev) => {
      const newOrder = [...prev.propositionOrder];
      newOrder[index] = teamId;
      return {
        ...prev,
        propositionOrder: newOrder,
      };
    });
  };

  const handlePositionChange = (teamId, position) => {
    setMatchInfo((prev) => ({
      ...prev,
      positions: {
        ...prev.positions,
        [teamId]: position,
      },
    }));
  };

  if (!editing) {
    // 顯示模式
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">練習賽資訊</h2>
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            ✏️ 編輯資訊
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 基本資訊 */}
          <InfoCard title="練習賽隊伍">
            <p className="mb-2">
              <span className="font-semibold">隊伍 1：</span>
              {fromTeam?.name}
            </p>
            <p>
              <span className="font-semibold">隊伍 2：</span>
              {toTeam?.name}
            </p>
          </InfoCard>

          <InfoCard title="賽制">
            {matchInfo.format === "single" ? (
              <div>
                <p className="font-semibold mb-2">單持</p>
                <div className="text-sm space-y-1">
                  {matchInfo.positions && (
                    <>
                      <p>
                        {fromTeam?.name || "隊伍1"}：
                        {matchInfo.positions[fromTeam?.id] || "正方"}
                      </p>
                      <p>
                        {toTeam?.name || "隊伍2"}：
                        {matchInfo.positions[toTeam?.id] || "反方"}
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="font-semibold mb-2">雙持</p>
                {matchInfo.positions ? (
                  <div className="text-sm space-y-1">
                    <p>
                      {fromTeam?.name || "隊伍1"}：
                      {matchInfo.positions[fromTeam?.id] || "正方先攻"}
                    </p>
                    <p>
                      {toTeam?.name || "隊伍2"}：
                      {matchInfo.positions[toTeam?.id] || "反方先攻"}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">尚未設定</p>
                )}
              </div>
            )}
          </InfoCard>

          <InfoCard title="比賽日期時間">
            <p>📅 {matchInfo.date || "尚未設定"}</p>
            <p className="mt-1">⏰ {matchInfo.time || "尚未設定"}</p>
          </InfoCard>

          <InfoCard title="場地">
            <p>📍 {matchInfo.venue || "尚未設定"}</p>
          </InfoCard>

          <InfoCard title="茶水安排">
            <p className="mb-2">
              <span className="font-semibold">{fromTeam?.name}：</span>
              {matchInfo.refreshments?.[fromTeam?.id] || "尚未設定"}
            </p>
            <p>
              <span className="font-semibold">{toTeam?.name}：</span>
              {matchInfo.refreshments?.[toTeam?.id] || "尚未設定"}
            </p>
          </InfoCard>

          <InfoCard title="聯絡人資訊">
            <div className="mb-3">
              <p className="font-semibold text-sm mb-1">{fromTeam?.name}</p>
              <p className="text-sm">
                姓名：{matchInfo.contacts?.[fromTeam?.id]?.name || "尚未設定"}
              </p>
              <p className="text-sm">
                電話：{matchInfo.contacts?.[fromTeam?.id]?.phone || "尚未設定"}
              </p>
            </div>
            <div>
              <p className="font-semibold text-sm mb-1">{toTeam?.name}</p>
              <p className="text-sm">
                姓名：{matchInfo.contacts?.[toTeam?.id]?.name || "尚未設定"}
              </p>
              <p className="text-sm">
                電話：{matchInfo.contacts?.[toTeam?.id]?.phone || "尚未設定"}
              </p>
            </div>
          </InfoCard>
        </div>
      </div>
    );
  }

  // 編輯模式
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">編輯練習賽資訊</h2>
        <div className="space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
          >
            取消
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            💾 儲存
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* 賽制 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            賽制
          </label>
          <select
            value={matchInfo.format}
            onChange={(e) => {
              const newFormat = e.target.value;
              handleInputChange("format", newFormat);
              // 初始化 positions
              if (!matchInfo.positions) {
                setMatchInfo((prev) => ({
                  ...prev,
                  positions: {
                    [fromTeam?.id]:
                      newFormat === "single" ? "正方" : "正方先攻",
                    [toTeam?.id]: newFormat === "single" ? "反方" : "反方先攻",
                  },
                }));
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="single">單持</option>
            <option value="double">雙持</option>
          </select>
        </div>

        {/* 方位設定 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            方位設定
          </label>
          <div className="space-y-3">
            {/* 隊伍1 */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                {fromTeam?.name || "隊伍1"}
              </label>
              <select
                value={
                  matchInfo.positions?.[fromTeam?.id] ||
                  (matchInfo.format === "single" ? "正方" : "正方先攻")
                }
                onChange={(e) =>
                  handlePositionChange(fromTeam?.id, e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {matchInfo.format === "single" ? (
                  <>
                    <option value="正方">正方</option>
                    <option value="反方">反方</option>
                  </>
                ) : (
                  <>
                    <option value="正方先攻">正方先攻</option>
                    <option value="反方先攻">反方先攻</option>
                  </>
                )}
              </select>
            </div>
            {/* 隊伍2 */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                {toTeam?.name || "隊伍2"}
              </label>
              <select
                value={
                  matchInfo.positions?.[toTeam?.id] ||
                  (matchInfo.format === "single" ? "反方" : "反方先攻")
                }
                onChange={(e) =>
                  handlePositionChange(toTeam?.id, e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {matchInfo.format === "single" ? (
                  <>
                    <option value="正方">正方</option>
                    <option value="反方">反方</option>
                  </>
                ) : (
                  <>
                    <option value="正方先攻">正方先攻</option>
                    <option value="反方先攻">反方先攻</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* 日期 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            日期
          </label>
          <input
            type="date"
            value={matchInfo.date}
            onChange={(e) => handleInputChange("date", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 時間 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            時間
          </label>
          <input
            type="time"
            value={matchInfo.time}
            onChange={(e) => handleInputChange("time", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 場地 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            場地
          </label>
          <input
            type="text"
            value={matchInfo.venue}
            onChange={(e) => handleInputChange("venue", e.target.value)}
            placeholder="請輸入（例如：學校教室）"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 茶水安排 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            茶水安排
          </label>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {fromTeam?.name}
              </label>
              <input
                type="text"
                value={matchInfo.refreshments?.[fromTeam?.id] || ""}
                onChange={(e) =>
                  handleRefreshmentsChange(fromTeam?.id, e.target.value)
                }
                placeholder="請輸入（例如：紅茶/綠茶）"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {toTeam?.name}
              </label>
              <input
                type="text"
                value={matchInfo.refreshments?.[toTeam?.id] || ""}
                onChange={(e) =>
                  handleRefreshmentsChange(toTeam?.id, e.target.value)
                }
                placeholder="請輸入（例如：點心飲料）"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* 聯絡人資訊 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            聯絡人資訊
          </label>
          <div className="space-y-4">
            {/* 隊伍 1 聯絡人 */}
            <div className="border border-gray-200 rounded p-4">
              <p className="font-semibold text-sm mb-2">{fromTeam?.name}</p>
              <div className="space-y-2">
                <input
                  type="text"
                  value={matchInfo.contacts?.[fromTeam?.id]?.name || ""}
                  onChange={(e) =>
                    handleContactChange(fromTeam?.id, "name", e.target.value)
                  }
                  placeholder="聯絡人姓名"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="tel"
                  value={matchInfo.contacts?.[fromTeam?.id]?.phone || ""}
                  onChange={(e) =>
                    handleContactChange(fromTeam?.id, "phone", e.target.value)
                  }
                  placeholder="聯絡電話"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* 隊伍 2 聯絡人 */}
            <div className="border border-gray-200 rounded p-4">
              <p className="font-semibold text-sm mb-2">{toTeam?.name}</p>
              <div className="space-y-2">
                <input
                  type="text"
                  value={matchInfo.contacts?.[toTeam?.id]?.name || ""}
                  onChange={(e) =>
                    handleContactChange(toTeam?.id, "name", e.target.value)
                  }
                  placeholder="聯絡人姓名"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="tel"
                  value={matchInfo.contacts?.[toTeam?.id]?.phone || ""}
                  onChange={(e) =>
                    handleContactChange(toTeam?.id, "phone", e.target.value)
                  }
                  placeholder="聯絡電話"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 資訊卡片元件
function InfoCard({ title, children }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="text-gray-600">{children}</div>
    </div>
  );
}

// 聊天區元件
function ChatSection({ matchId }) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // 訂閱聊天訊息
    console.log("=== 訂閱聊天訊息 ===");
    console.log("matchId:", matchId);

    try {
      const unsubscribe = subscribeToMessages(matchId, (msgs) => {
        console.log("收到訊息：", msgs.length, "則訊息");
        setMessages(msgs);
      });

      return () => {
        console.log("取消訂閱聊天訊息");
        unsubscribe();
      };
    } catch (error) {
      console.error("訂閱失敗：", error);
      console.error("錯誤詳情：", error.message, error.code);
      alert("無法訂閱聊天訊息，請檢查網絡連接後重試。\n錯誤：" + error.message);
    }
  }, [matchId]);

  useEffect(() => {
    // 自動滾動到最新訊息
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;

    console.log("=== 準備發送訊息 ===");
    console.log("訊息內容:", newMessage.trim());
    console.log("matchId:", matchId);
    console.log("currentUser:", currentUser);

    try {
      setLoading(true);
      console.log("呼叫 sendMessage...");

      const messageId = await sendMessage(matchId, {
        text: newMessage.trim(),
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        userEmail: currentUser.email,
      });

      console.log("成功發送訊息，ID:", messageId);
      setNewMessage("");
    } catch (error) {
      console.error("發送訊息失敗：", error);
      console.error("錯誤類型:", error.name);
      console.error("錯誤訊息:", error.message);
      console.error("錯誤代碼:", error.code);
      console.error("錯誤堆疊:", error.stack);

      let errorMsg = "發送訊息失敗";
      if (error.code === "permission-denied") {
        errorMsg =
          "權限不足，無法發送訊息。請確認您是隊伍成員，且具有發送訊息的權限。";
      } else if (error.code === "unavailable") {
        errorMsg = "網絡連接失敗，請檢查網絡連接後重試。";
      } else if (error.message) {
        errorMsg = `發送失敗：${error.message}`;
      }

      alert(errorMsg + "\n\n請按 F12 打開瀏覽器控制台查看詳細錯誤資訊。");
    } finally {
      setLoading(false);
    }
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / 1000 / 60 / 60);

    if (hours < 24) {
      return date.toLocaleTimeString("zh-TW", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString("zh-TW", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  return (
    <div className="flex flex-col h-[400px] md:h-[600px]">
      {/* 訊息區 */}
      <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>還沒有訊息</p>
            <p className="text-sm mt-2">發送第一條訊息開始討論吧！</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isCurrentUser = msg.userId === currentUser.uid;
            return (
              <div
                key={msg.id}
                className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    isCurrentUser
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  <div
                    className={`text-xs mb-1 ${
                      isCurrentUser ? "text-blue-100" : "text-gray-500"
                    }`}
                  >
                    {msg.userName} · {formatMessageTime(msg.createdAt)}
                  </div>
                  <div className="whitespace-pre-wrap break-words">
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 輸入區 */}
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="輸入訊息..."
          className="flex-1 min-w-0 px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || loading}
          className="px-4 md:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed text-sm md:text-base flex-shrink-0"
        >
          {loading ? "發送中..." : "發送"}
        </button>
      </form>
    </div>
  );
}
