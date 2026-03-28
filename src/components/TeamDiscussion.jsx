// TeamDiscussion.jsx - 隊伍討論區主頁面
// 包含聊天、資料區、日曆、練習賽邀請等功能

import { useState, useEffect, useRef } from "react";
import {
  useParams,
  Link,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  getTeam,
  addMemberToTeam,
  removeMemberFromTeam,
} from "../firebase/teams";
import { getUserByEmail, getUser } from "../firebase/users";
import {
  getTeamInvitations,
  getTeamSentInvitations,
  acceptInvitation,
  declineInvitation,
  cancelOtherInvitations,
  hideInvitation,
  hideInvitationsBatch,
} from "../firebase/invitations";
import { getTournament } from "../firebase/tournaments";
import { createPracticeMatch } from "../firebase/practiceMatches";

// 隊伍功能相關 imports
import {
  sendTeamMessage,
  subscribeToTeamMessages,
} from "../firebase/teamMessages";
import {
  createTeamEvent,
  getTeamEvents,
  deleteTeamEvent,
  updateTeamEvent,
  subscribeToTeamEvents,
} from "../firebase/teamEvents";
import { TeamCalendar } from "./TeamCalendar";
import { notifyTeamMemberAdded } from "../firebase/notificationHelpers";

export function TeamDiscussion() {
  const [copySuccess, setCopySuccess] = useState(false);

  // 複製隊伍代碼到剪貼簿
  const handleCopyInviteCode = async () => {
    if (team?.inviteCode) {
      try {
        await navigator.clipboard.writeText(team.inviteCode);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 1500);
      } catch (err) {
        alert("複製失敗，請手動選取");
      }
    }
  };
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab");
    return ["chat", "calendar", "invitations", "members"].includes(tab)
      ? tab
      : "chat";
  });

  useEffect(() => {
    loadTeam();
  }, [id]);

  const loadTeam = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTeam(id);
      setTeam(data);
    } catch (err) {
      console.error("載入隊伍失敗:", err);
      setError("載入隊伍失敗");
    } finally {
      setLoading(false);
    }
  };

  // 編輯表單狀態
  const [showEditForm, setShowEditForm] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    school: "",
    teamColor: "#3B82F6",
  });
  const [editLoading, setEditLoading] = useState(false);

  // 載入隊伍時預設填入編輯表單
  useEffect(() => {
    if (team) {
      setEditForm({
        name: team.name || "",
        school: team.school || "",
        teamColor: team.teamColor || "#3B82F6",
      });
    }
  }, [team]);

  // 編輯表單送出
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      alert("請輸入隊伍名稱");
      return;
    }
    setEditLoading(true);
    try {
      // 權限檢查：僅隊員可編輯（可改為僅隊長）
      if (!team.members?.includes(currentUser?.uid)) {
        alert("只有隊伍成員可以編輯隊伍資料");
        return;
      }
      // 呼叫 updateTeam
      await import("../firebase/teams").then((mod) =>
        mod.updateTeam(team.id, {
          name: editForm.name.trim(),
          school: editForm.school.trim(),
          teamColor: editForm.teamColor || "#3B82F6",
        }),
      );
      alert("隊伍資料已更新！");
      setShowEditForm(false);
      await loadTeam();
    } catch (err) {
      console.error("更新隊伍失敗:", err);
      alert("更新失敗，請稍後再試");
    } finally {
      setEditLoading(false);
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

  if (error || !team) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error || "找不到該隊伍"}
        </div>
        <Link
          to="/teams"
          className="inline-block mt-4 text-blue-600 hover:underline"
        >
          ← 返回隊伍列表
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 返回按鈕 */}
      <Link
        to="/teams"
        className="inline-block mb-4 text-blue-600 hover:underline"
      >
        ← 返回隊伍列表
      </Link>

      {/* 隊伍標題與編輯功能 */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-gray-800 mb-2">
              {team.name}
            </h1>
            {/* 隊伍專屬代碼 */}
            {team.inviteCode && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs md:text-sm text-gray-500 select-all">
                  🆔 隊伍代碼：{team.inviteCode}
                </span>
                <button
                  type="button"
                  className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 transition border border-gray-300"
                  onClick={handleCopyInviteCode}
                  title="複製隊伍代碼"
                >
                  複製
                </button>
                {copySuccess && (
                  <span className="text-green-600 text-xs ml-1">已複製！</span>
                )}
              </div>
            )}
            <p className="text-sm md:text-base text-gray-600">
              {team.school} | {team.members?.length || 0} 位隊員
            </p>
          </div>
          <div className="flex gap-2">
            {/* 僅隊員可見編輯按鈕，可改為僅隊長可見：team.captain === currentUser?.uid */}
            {team.members?.includes(currentUser?.uid) && (
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
                onClick={() => setShowEditForm(true)}
              >
                編輯隊伍資料
              </button>
            )}
            {/* 僅創辦者可見刪除按鈕 */}
            {team.captain === currentUser?.uid && (
              <button
                className="px-4 py-2 bg-red-600 text-white rounded shadow hover:bg-red-700 transition"
                onClick={async () => {
                  if (
                    window.confirm("確定要刪除這個隊伍嗎？此操作無法復原。")
                  ) {
                    try {
                      const mod = await import("../firebase/teams");
                      await mod.deleteTeam(team.id);
                      alert("隊伍已刪除");
                      window.location.href = "/teams";
                    } catch (err) {
                      alert("刪除失敗，請稍後再試");
                    }
                  }
                }}
                type="button"
              >
                刪除隊伍
              </button>
            )}
          </div>
        </div>

        {/* 編輯表單 Dialog */}
        {showEditForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl"
                onClick={() => setShowEditForm(false)}
                aria-label="關閉"
              >
                ×
              </button>
              <h2 className="text-lg font-bold mb-4">編輯隊伍資料</h2>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-1">隊伍名稱</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">所屬學校</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={editForm.school}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, school: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">隊伍代表色</label>
                  <input
                    type="color"
                    className="w-12 h-8 p-0 border-0 bg-transparent cursor-pointer"
                    value={editForm.teamColor}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, teamColor: e.target.value }))
                    }
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    onClick={() => setShowEditForm(false)}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    disabled={editLoading}
                  >
                    {editLoading ? "儲存中..." : "儲存"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Tab 選單 */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="flex border-b overflow-x-auto">
          <TabButton
            label="💬 聊天區"
            active={activeTab === "chat"}
            onClick={() => setActiveTab("chat")}
          />
          <TabButton
            label="📆 隊伍日曆"
            active={activeTab === "calendar"}
            onClick={() => setActiveTab("calendar")}
          />
          <TabButton
            label="📨 練習賽邀請"
            active={activeTab === "invitations"}
            onClick={() => setActiveTab("invitations")}
          />
          <TabButton
            label="👥 隊員管理"
            active={activeTab === "members"}
            onClick={() => setActiveTab("members")}
          />
        </div>

        {/* Tab 內容 */}
        <div className="p-3 md:p-6">
          {activeTab === "chat" && <ChatSection teamId={id} />}
          {activeTab === "calendar" && <TeamCalendar teamId={id} />}
          {activeTab === "invitations" && <InvitationsSection teamId={id} />}
          {activeTab === "members" && (
            <MembersSection teamId={id} onUpdate={loadTeam} />
          )}
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
          : "text-gray-600 hover:text-blue-600"
      }`}
    >
      {label}
    </button>
  );
}

// 聊天區元件
function ChatSection({ teamId }) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    console.log("=== 開始訂閱隊伍聊天訊息 ===");
    console.log("teamId:", teamId);
    const unsubscribe = subscribeToTeamMessages(teamId, (msgs) => {
      console.log("收到訊息更新，共", msgs.length, "條訊息");
      setMessages(msgs);
    });
    console.log("訂閱成功");

    return () => {
      console.log("取消訂閱聊天訊息");
      unsubscribe();
    };
  }, [teamId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    console.log("=== 準備發送訊息 ===");
    console.log("訊息內容:", newMessage);
    console.log("teamId:", teamId);
    console.log("currentUser:", currentUser.email);

    try {
      setSending(true);
      await sendTeamMessage(teamId, newMessage, {
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        userEmail: currentUser.email,
      });
      console.log("✓ 訊息發送成功");
      setNewMessage("");
    } catch (error) {
      console.error("❌ 發送訊息失敗:", error);
      console.error("錯誤類型:", error.name);
      console.error("錯誤訊息:", error.message);
      console.error("錯誤代碼:", error.code);

      let errorMsg = "發送失敗";
      if (error.code === "permission-denied") {
        errorMsg = "權限不足，無法發送訊息。請確認您是隊伍成員。";
      } else if (error.code === "unavailable") {
        errorMsg = "網絡連接失敗，請檢查網絡後重試。";
      } else if (error.message) {
        errorMsg = `發送失敗：${error.message}`;
      }

      alert(errorMsg + "\n\n請按 F12 查看詳細錯誤日誌。");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">隊伍聊天</h2>
      {/* 訊息列表 */}
      <div className="bg-gray-50 rounded-lg h-64 md:h-96 overflow-y-auto p-4 mb-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            <p>還沒有訊息</p>
            <p className="text-sm mt-2">發送第一條訊息開始討論吧！</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.userId === currentUser.uid
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] md:max-w-md px-3 md:px-4 py-2 rounded-lg ${
                    msg.userId === currentUser.uid
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  <p
                    className={`text-xs mb-1 ${
                      msg.userId === currentUser.uid
                        ? "text-blue-100"
                        : "text-gray-500"
                    }`}
                  >
                    {msg.userName}
                  </p>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.userId === currentUser.uid
                        ? "text-blue-100"
                        : "text-gray-400"
                    }`}
                  >
                    {msg.createdAt?.toDate?.()?.toLocaleString("zh-TW") || ""}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 發送訊息表單 */}
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="輸入訊息..."
          className="flex-1 min-w-0 px-3 md:px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="px-4 md:px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base flex-shrink-0"
        >
          {sending ? "發送中..." : "發送"}
        </button>
      </form>
    </div>
  );
}

// 日曆區元件
function CalendarSection({ teamId }) {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    type: "meeting",
    startTime: "",
    endTime: "",
    location: "",
    isAllDay: false,
  });

  useEffect(() => {
    loadEvents();
    const unsubscribe = subscribeToTeamEvents(teamId, (eventsList) => {
      setEvents(eventsList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [teamId]);

  const loadEvents = async () => {
    try {
      const eventsList = await getTeamEvents(teamId);
      setEvents(eventsList);
    } catch (error) {
      console.error("載入事件失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title.trim() || !eventForm.startTime) {
      alert("請填寫標題和開始時間");
      return;
    }

    try {
      await createTeamEvent(teamId, {
        ...eventForm,
        startTime: new Date(eventForm.startTime),
        endTime: eventForm.endTime
          ? new Date(eventForm.endTime)
          : new Date(eventForm.startTime),
        creatorInfo: {
          userId: currentUser.uid,
          userName: currentUser.displayName || currentUser.email,
          userEmail: currentUser.email,
        },
      });
      alert("事件已建立！");
      setShowEventForm(false);
      setEventForm({
        title: "",
        description: "",
        type: "meeting",
        startTime: "",
        endTime: "",
        location: "",
        isAllDay: false,
      });
      loadEvents();
    } catch (error) {
      console.error("建立事件失敗:", error);
      alert("建立失敗，請稍後再試");
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("確定要刪除此事件嗎？")) return;

    try {
      await deleteTeamEvent(eventId);
      alert("事件已刪除");
      loadEvents();
    } catch (error) {
      console.error("刪除失敗:", error);
      alert("刪除失敗，請稍後再試");
    }
  };

  const getEventTypeText = (type) => {
    const types = {
      meeting: "會議",
      practice: "練習",
      tournament: "比賽",
      deadline: "截止日期",
      other: "其他",
    };
    return types[type] || type;
  };

  const getEventTypeColor = (type) => {
    const colors = {
      meeting: "bg-blue-100 text-blue-800",
      practice: "bg-green-100 text-green-800",
      tournament: "bg-purple-100 text-purple-800",
      deadline: "bg-red-100 text-red-800",
      other: "bg-gray-100 text-gray-800",
    };
    return colors[type] || colors.other;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">載入中...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">時間整理系統</h2>
        <button
          onClick={() => setShowEventForm(!showEventForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          {showEventForm ? "取消" : "+ 新增事件"}
        </button>
      </div>

      {/* 新增事件表單 */}
      {showEventForm && (
        <form
          onSubmit={handleCreateEvent}
          className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-6"
        >
          <h3 className="font-medium text-gray-800 mb-3">新增事件</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                事件標題 *
              </label>
              <input
                type="text"
                value={eventForm.title}
                onChange={(e) =>
                  setEventForm({ ...eventForm, title: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="輸入事件標題..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                事件類型
              </label>
              <select
                value={eventForm.type}
                onChange={(e) =>
                  setEventForm({ ...eventForm, type: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="meeting">會議</option>
                <option value="practice">練習</option>
                <option value="tournament">比賽</option>
                <option value="deadline">截止日期</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                地點
              </label>
              <input
                type="text"
                value={eventForm.location}
                onChange={(e) =>
                  setEventForm({ ...eventForm, location: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="地點或線上會議連結"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                開始時間 *
              </label>
              <input
                type="datetime-local"
                value={eventForm.startTime}
                onChange={(e) =>
                  setEventForm({ ...eventForm, startTime: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                結束時間
              </label>
              <input
                type="datetime-local"
                value={eventForm.endTime}
                onChange={(e) =>
                  setEventForm({ ...eventForm, endTime: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                描述
              </label>
              <textarea
                value={eventForm.description}
                onChange={(e) =>
                  setEventForm({ ...eventForm, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="事件詳細說明..."
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              建立事件
            </button>
            <button
              type="button"
              onClick={() => setShowEventForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
            >
              取消
            </button>
          </div>
        </form>
      )}

      {/* 事件列表 */}
      {events.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">尚無事件</p>
          <p className="text-sm text-gray-400 mt-2">
            點擊「新增事件」來建立第一個事件
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-gray-800 text-lg">
                      {event.title}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getEventTypeColor(event.type)}`}
                    >
                      {getEventTypeText(event.type)}
                    </span>
                  </div>
                  {event.description && (
                    <p className="text-gray-600 mb-2">{event.description}</p>
                  )}
                  <div className="space-y-1 text-sm text-gray-500">
                    <p>
                      🕒 時間：
                      {(() => {
                        const start =
                          event.startTime?.toDate?.() ||
                          new Date(event.startTime);
                        const end =
                          event.endTime?.toDate?.() ||
                          (event.endTime ? new Date(event.endTime) : null);
                        let label =
                          start && !isNaN(start)
                            ? start.toLocaleString("zh-TW", {
                                hour: "2-digit",
                                minute: "2-digit",
                                month: "2-digit",
                                day: "2-digit",
                              })
                            : "";
                        if (end && !isNaN(end)) {
                          label += ` ~ ${end.toLocaleString("zh-TW", { hour: "2-digit", minute: "2-digit", month: "2-digit", day: "2-digit" })}`;
                        }
                        return label;
                      })()}
                    </p>
                    {event.location && <p>📍 地點：{event.location}</p>}
                    <p>👤 建立者：{event.creatorName}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteEvent(event.id)}
                  className="ml-4 text-sm text-red-600 hover:bg-red-50 px-3 py-1 rounded transition"
                >
                  刪除
                </button>
              </div>

              {/* 參與者 */}
              {event.attendees && event.attendees.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    參與者 ({event.attendees.length})：
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {event.attendees.map((attendee, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-1 rounded text-sm ${
                          attendee.status === "confirmed"
                            ? "bg-green-100 text-green-800"
                            : attendee.status === "tentative"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {attendee.userName}{" "}
                        {attendee.status === "confirmed"
                          ? "✓"
                          : attendee.status === "tentative"
                            ? "?"
                            : "✗"}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          \n{" "}
        </div>
      )}
    </div>
  );
}

// 練習賽邀請區元件
function InvitationsSection({ teamId }) {
  const { currentUser } = useAuth();
  const [receivedInvitations, setReceivedInvitations] = useState([]);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    loadInvitations();
  }, [teamId]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const [received, sent] = await Promise.all([
        getTeamInvitations(teamId),
        getTeamSentInvitations(teamId),
      ]);

      // 載入邀請關聯的隊伍和盃賽資訊
      const enrichedReceived = await Promise.all(
        received.map(async (inv) => {
          try {
            const [fromTeam, tournament] = await Promise.all([
              getTeam(inv.fromTeam),
              getTournament(inv.tournamentId),
            ]);
            return {
              ...inv,
              fromTeamData: fromTeam,
              tournamentData: tournament,
            };
          } catch (err) {
            console.error("載入邀請詳情失敗:", err);
            return inv;
          }
        }),
      );

      const enrichedSent = await Promise.all(
        sent.map(async (inv) => {
          try {
            const [toTeam, tournament] = await Promise.all([
              getTeam(inv.toTeam),
              getTournament(inv.tournamentId),
            ]);
            return { ...inv, toTeamData: toTeam, tournamentData: tournament };
          } catch (err) {
            console.error("載入邀請詳情失敗:", err);
            return inv;
          }
        }),
      );

      setReceivedInvitations(enrichedReceived);
      setSentInvitations(enrichedSent);
    } catch (err) {
      console.error("載入邀請失敗:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId) => {
    console.log("=== 開始接受邀請流程 ===");
    console.log("1. 當前用戶狀態:", currentUser);
    console.log("2. currentUser 是否存在:", !!currentUser);
    console.log("3. currentUser.uid:", currentUser?.uid);
    console.log("4. currentUser.email:", currentUser?.email);
    console.log("5. 邀請 ID:", invitationId);

    if (!window.confirm("確定接受此練習賽邀請嗎？")) {
      console.log("用戶取消操作");
      return;
    }

    // 確保用戶已登入
    if (!currentUser) {
      console.error("錯誤：用戶未登入");
      alert("請先登入後再接受邀請");
      return;
    }

    try {
      setProcessingId(invitationId);
      console.log("6. 開始處理邀請，用戶:", currentUser.email);

      // 找到對應的邀請
      const invitation = receivedInvitations.find(
        (inv) => inv.id === invitationId,
      );

      if (!invitation) {
        console.error("錯誤：找不到邀請，invitationId:", invitationId);
        console.log("當前所有邀請:", receivedInvitations);
        throw new Error("找不到該邀請");
      }

      console.log("7. 找到邀請資料:", invitation);

      // 接受邀請
      console.log("8. 準備更新邀請狀態...");
      await acceptInvitation(invitationId, null);
      console.log("9. ✓ 邀請狀態已更新為 accepted");

      // 自動取消同批其他邀請（同 fromTeam, tournamentId, practiceTime）
      if (
        invitation.fromTeam &&
        invitation.tournamentId &&
        invitation.practiceTime
      ) {
        try {
          await cancelOtherInvitations(
            invitation.fromTeam,
            invitation.tournamentId,
            invitation.practiceTime,
            invitationId,
          );
          console.log("10. ✓ 已自動取消同批其他邀請");
        } catch (cancelErr) {
          console.error("❌ 自動取消其他邀請失敗:", cancelErr);
        }
      }

      // 自動創建練習賽記錄
      try {
        console.log("10. 準備創建練習賽...");
        // 自動帶入邀約練習賽時間
        let matchDate = "";
        let matchTime = "";
        alert(
          "[DEBUG] invitation.practiceTime: " +
            JSON.stringify(invitation.practiceTime),
        );
        if (invitation.practiceTime) {
          if (
            typeof invitation.practiceTime === "object" &&
            invitation.practiceTime.toDate
          ) {
            const dt = invitation.practiceTime.toDate();
            matchDate = dt.toISOString().slice(0, 10); // yyyy-mm-dd
            matchTime = dt.toTimeString().slice(0, 5); // HH:mm
          } else if (typeof invitation.practiceTime === "string") {
            // 嘗試解析 ISO 字串
            const dt = new Date(invitation.practiceTime);
            if (!isNaN(dt)) {
              matchDate = dt.toISOString().slice(0, 10);
              matchTime = dt.toTimeString().slice(0, 5);
            } else {
              matchDate = invitation.practiceTime;
            }
          }
        }
        const matchData = {
          invitationId: invitationId,
          tournamentId: invitation.tournamentId,
          fromTeam: invitation.fromTeam,
          toTeam: invitation.toTeam,
          matchInfo: {
            format: "single",
            propositionOrder: [],
            date: matchDate,
            time: matchTime,
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
        };
        alert(
          `[DEBUG] matchData.matchInfo.date: ${matchDate} / time: ${matchTime}`,
        );
        console.log("11. 練習賽資料:", matchData);
        console.log("12. 使用用戶 ID:", currentUser.uid);

        const matchId = await createPracticeMatch(matchData, currentUser.uid);
        console.log("13. ✓ 練習賽創建成功，ID:", matchId);
        console.log("=== 接受邀請流程完成 ===");

        alert("已接受邀請！練習賽討論區已建立，請前往「練習賽」頁面查看。");
      } catch (matchErr) {
        console.error("❌ 創建練習賽失敗:");
        console.error("  - 錯誤對象:", matchErr);
        console.error("  - 錯誤訊息:", matchErr.message);
        console.error("  - 錯誤代碼:", matchErr.code);
        console.error("  - 錯誤堆疊:", matchErr.stack);
        alert(
          `已接受邀請，但創建練習賽討論區時發生錯誤：\n${matchErr.message}\n\n請打開瀏覽器控制台查看詳細錯誤，或聯繫管理員。`,
        );
      }

      loadInvitations(); // 重新載入
    } catch (err) {
      console.error("❌ 接受邀請失敗:");
      console.error("  - 錯誤對象:", err);
      console.error("  - 錯誤訊息:", err.message);
      console.error("  - 錯誤代碼:", err.code);
      console.error("  - 錯誤堆疊:", err.stack);
      alert(
        `接受邀請失敗：\n${err.message}\n\n請打開瀏覽器控制台（按F12）查看詳細錯誤。`,
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitationId) => {
    if (!window.confirm("確定拒絕此練習賽邀請嗎？")) return;

    try {
      setProcessingId(invitationId);
      await declineInvitation(invitationId);
      alert("已拒絕邀請");
      loadInvitations(); // 重新載入
    } catch (err) {
      console.error("拒絕邀請失敗:", err);
      alert("拒絕邀請失敗，請稍後再試");
    } finally {
      setProcessingId(null);
    }
  };

  const handleHideInvitation = async (invitationId) => {
    if (!window.confirm("確定要刪除此邀請紀錄？")) return;
    try {
      await hideInvitation(invitationId);
      loadInvitations();
    } catch (err) {
      alert("刪除失敗，請稍後再試");
    }
  };

  // 支援一鍵刪除已回復與已取消邀請
  const handleHideAll = async (type, statusList) => {
    // 預設一鍵刪除已回復/已取消
    if (!statusList)
      statusList = ["accepted", "declined", "confirmed", "cancelled"];
    const list =
      type === "received"
        ? receivedInvitations.filter(
            (inv) =>
              statusList.includes(inv.status) && inv.status !== "deleted",
          )
        : sentInvitations.filter(
            (inv) =>
              statusList.includes(inv.status) && inv.status !== "deleted",
          );
    if (list.length === 0) return alert("沒有可刪除的紀錄");
    const statusText = statusList.includes("pending")
      ? "待回應"
      : "已回復/已取消";
    if (
      !window.confirm(
        `確定要刪除所有${type === "received" ? "收到" : "發出"}的${statusText}邀請？`,
      )
    )
      return;
    try {
      await hideInvitationsBatch(list.map((inv) => inv.id));
      loadInvitations();
    } catch (err) {
      alert("批次刪除失敗，請稍後再試");
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: "待回應",
      accepted: "已接受",
      declined: "已拒絕",
      confirmed: "已確認",
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      pending: "bg-yellow-100 text-yellow-800",
      accepted: "bg-green-100 text-green-800",
      declined: "bg-red-100 text-red-800",
      confirmed: "bg-blue-100 text-blue-800",
    };
    return colorMap[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">載入中...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">練習賽邀請</h2>

      <div className="space-y-6">
        {/* 收到的邀請 */}
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold text-gray-800">📥 收到的邀請</h3>
            <button
              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
              onClick={() => handleHideAll("received")}
            >
              一鍵刪除已回復
            </button>
          </div>
          {receivedInvitations.filter((inv) => inv.status !== "deleted")
            .length === 0 ? (
            <p className="text-gray-500">目前沒有收到邀請</p>
          ) : (
            <div className="space-y-3">
              {receivedInvitations
                .filter((inv) => inv.status !== "deleted")
                .map((invitation) => (
                  <div
                    key={invitation.id}
                    className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
                  >
                    {/* ...existing code... */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold text-gray-800">
                            {invitation.fromTeamData?.name || "未知隊伍"}
                          </h4>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(invitation.status)}`}
                          >
                            {getStatusText(invitation.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          🏆 {invitation.tournamentData?.name || "未知盃賽"}
                        </p>
                        <p className="text-sm text-blue-600 mb-1">
                          🕒 練習賽時間：
                          {(() => {
                            // 允許 Firestore Timestamp、Date、string
                            let startObj = null;
                            let endObj = null;
                            if (invitation.practiceTime) {
                              if (
                                typeof invitation.practiceTime === "object" &&
                                invitation.practiceTime.toDate
                              ) {
                                startObj = invitation.practiceTime.toDate();
                              } else if (
                                typeof invitation.practiceTime === "string" ||
                                typeof invitation.practiceTime === "number"
                              ) {
                                startObj = new Date(invitation.practiceTime);
                              }
                            }
                            if (invitation.endTime) {
                              if (
                                typeof invitation.endTime === "object" &&
                                invitation.endTime.toDate
                              ) {
                                endObj = invitation.endTime.toDate();
                              } else if (
                                typeof invitation.endTime === "string" ||
                                typeof invitation.endTime === "number"
                              ) {
                                endObj = new Date(invitation.endTime);
                              }
                            }
                            if (startObj && !isNaN(startObj)) {
                              let label = startObj.toLocaleString("zh-TW");
                              if (
                                endObj &&
                                !isNaN(endObj) &&
                                endObj.getTime() !== startObj.getTime()
                              ) {
                                label += " ~ " + endObj.toLocaleString("zh-TW");
                              }
                              return label;
                            }
                            return "未指定";
                          })()}
                        </p>
                        {invitation.message && (
                          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded mt-2">
                            💬 {invitation.message}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          {invitation.createdAt
                            ?.toDate?.()
                            ?.toLocaleString("zh-TW") || "未知時間"}
                        </p>
                      </div>
                      {/* ...existing code... */}
                      <div>
                        <button
                          className="ml-2 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          onClick={() => handleHideInvitation(invitation.id)}
                        >
                          刪除
                        </button>
                      </div>
                    </div>

                    {invitation.status === "pending" && (
                      <div className="flex gap-2 mt-2">
                        <button
                          className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          onClick={() => handleAccept(invitation.id)}
                        >
                          同意
                        </button>
                        <button
                          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          onClick={() => handleDecline(invitation.id)}
                        >
                          拒絕
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* 發出的邀請 */}
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold text-gray-800">📤 發出的邀請</h3>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                onClick={() =>
                  handleHideAll("sent", [
                    "accepted",
                    "declined",
                    "confirmed",
                    "cancelled",
                  ])
                }
              >
                一鍵刪除已回復
              </button>
              <button
                className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                onClick={() => handleHideAll("sent", ["pending"])}
              >
                一鍵刪除待回應
              </button>
            </div>
          </div>
          {sentInvitations.filter(
            (inv) => inv.status !== "deleted" && inv.status !== "cancelled",
          ).length === 0 ? (
            <p className="text-gray-500">目前沒有發出邀請</p>
          ) : (
            <div className="space-y-3">
              {sentInvitations
                .filter(
                  (inv) =>
                    inv.status !== "deleted" && inv.status !== "cancelled",
                )
                .map((invitation) => (
                  <div
                    key={invitation.id}
                    className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold text-gray-800">
                            {invitation.toTeamData?.name || "未知隊伍"}
                          </h4>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(invitation.status)}`}
                          >
                            {getStatusText(invitation.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          🏆 {invitation.tournamentData?.name || "未知盃賽"}
                        </p>
                        <p className="text-sm text-blue-600 mb-1">
                          🕒 練習賽時間：
                          {(() => {
                            // 允許 Firestore Timestamp、Date、string
                            let startObj = null;
                            let endObj = null;
                            if (invitation.practiceTime) {
                              if (
                                typeof invitation.practiceTime === "object" &&
                                invitation.practiceTime.toDate
                              ) {
                                startObj = invitation.practiceTime.toDate();
                              } else if (
                                typeof invitation.practiceTime === "string" ||
                                typeof invitation.practiceTime === "number"
                              ) {
                                startObj = new Date(invitation.practiceTime);
                              }
                            }
                            if (invitation.endTime) {
                              if (
                                typeof invitation.endTime === "object" &&
                                invitation.endTime.toDate
                              ) {
                                endObj = invitation.endTime.toDate();
                              } else if (
                                typeof invitation.endTime === "string" ||
                                typeof invitation.endTime === "number"
                              ) {
                                endObj = new Date(invitation.endTime);
                              }
                            }
                            if (startObj && !isNaN(startObj)) {
                              let label = startObj.toLocaleString("zh-TW");
                              if (
                                endObj &&
                                !isNaN(endObj) &&
                                endObj.getTime() !== startObj.getTime()
                              ) {
                                label += " ~ " + endObj.toLocaleString("zh-TW");
                              }
                              return label;
                            }
                            return "未指定";
                          })()}
                        </p>
                        {invitation.message && (
                          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded mt-2">
                            💬 {invitation.message}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          {invitation.createdAt
                            ?.toDate?.()
                            ?.toLocaleString("zh-TW") || "未知時間"}
                        </p>
                      </div>
                      <div>
                        <button
                          className="ml-2 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          onClick={() => handleHideInvitation(invitation.id)}
                        >
                          刪除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 隊員管理區元件
function MembersSection({ teamId, onUpdate }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadTeamAndMembers();
  }, [teamId]);

  const loadTeamAndMembers = async () => {
    try {
      setLoading(true);
      const teamData = await getTeam(teamId);
      setTeam(teamData);

      // 載入所有成員的詳細資料
      const membersData = await Promise.all(
        (teamData.members || []).map(async (memberId) => {
          try {
            const userData = await getUser(memberId);
            return userData;
          } catch (error) {
            console.error("載入成員失敗:", memberId, error);
            return null;
          }
        }),
      );

      setMembers(membersData.filter((m) => m !== null));
    } catch (error) {
      console.error("載入隊伍和成員失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUser = async () => {
    if (!newMemberEmail.trim()) {
      alert("請輸入 Email");
      return;
    }

    try {
      setSearching(true);
      setSearchResult(null);
      const user = await getUserByEmail(newMemberEmail.trim());

      if (!user) {
        alert("找不到該用戶，請確認 Email 是否正確");
        return;
      }

      // 檢查是否已經是成員
      if (team.members && team.members.includes(user.id)) {
        alert("該用戶已經是隊伍成員");
        return;
      }

      setSearchResult(user);
    } catch (error) {
      console.error("搜尋用戶失敗:", error);
      alert("搜尋失敗，請稍後再試");
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = async () => {
    if (!searchResult) return;

    const confirmMsg = `確定要將 ${searchResult.displayName || searchResult.email} 加入隊伍嗎？`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      await addMemberToTeam(teamId, searchResult.id);
      await notifyTeamMemberAdded(
        teamId,
        team.name,
        searchResult.id,
        currentUser.displayName || currentUser.email,
      );
      alert("成員已加入！");
      setNewMemberEmail("");
      setSearchResult(null);
      setAddingMember(false);
      loadTeamAndMembers();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("添加成員失敗:", error);
      alert("添加失敗，請稍後再試");
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    const confirmMsg = `確定要將 ${memberName} 移出隊伍嗎？`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      await removeMemberFromTeam(teamId, memberId);
      alert("成員已移除");
      loadTeamAndMembers();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("移除成員失敗:", error);
      alert("移除失敗，請稍後再試");
    }
  };

  const handleLeaveSelf = async () => {
    if (!window.confirm("確定要退出此隊伍嗎？退出後將無法查看隊伍內容。")) {
      return;
    }

    try {
      await removeMemberFromTeam(teamId, currentUser.uid);
      alert("已退出隊伍");
      navigate("/teams");
    } catch (error) {
      console.error("退出隊伍失敗:", error);
      alert("退出失敗，請稍後再試");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">載入中...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">隊伍成員</h2>
        <button
          onClick={() => setAddingMember(!addingMember)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          {addingMember ? "取消" : "+ 新增成員"}
        </button>
      </div>

      {/* 新增成員表單 */}
      {addingMember && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-6">
          <h3 className="font-medium text-gray-800 mb-3">新增隊伍成員</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                輸入成員 Email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleSearchUser();
                  }}
                  placeholder="example@gmail.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSearchUser}
                  disabled={searching}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {searching ? "搜尋中..." : "搜尋"}
                </button>
              </div>
            </div>

            {/* 搜尋結果 */}
            {searchResult && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">
                      {searchResult.displayName || searchResult.email}
                    </p>
                    <p className="text-sm text-gray-600">
                      {searchResult.email}
                    </p>
                    {searchResult.school && (
                      <p className="text-sm text-gray-500">
                        {searchResult.school}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleAddMember}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                  >
                    加入隊伍
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 成員列表 */}
      <div className="space-y-3">
        {members.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-500">尚無成員</p>
          </div>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* 頭像 */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                    {(member.displayName || member.email)
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  {/* 成員資訊 */}
                  <div>
                    <p className="font-bold text-gray-800">
                      {member.displayName || member.email}
                    </p>
                    <p className="text-sm text-gray-600">{member.email}</p>
                    {member.school && (
                      <p className="text-sm text-gray-500">
                        {member.school}
                        {member.grade && ` | ${member.grade}`}
                      </p>
                    )}
                    {member.role && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                        {member.role === "debater" ? "辯士" : member.role}
                      </span>
                    )}
                  </div>
                </div>

                {/* 移除 / 退出按鈕 */}
                {currentUser && (
                  <button
                    onClick={() =>
                      member.id === currentUser.uid
                        ? handleLeaveSelf()
                        : handleRemoveMember(
                            member.id,
                            member.displayName || member.email,
                          )
                    }
                    className="text-sm text-red-600 hover:bg-red-50 px-3 py-1 rounded transition"
                  >
                    {member.id === currentUser.uid ? "退出隊伍" : "移除"}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 說明文字 */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-gray-700">
          💡 <strong>提示：</strong>新成員需要先在系統中註冊帳號，才能透過 Email
          被加入隊伍。
        </p>
      </div>
    </div>
  );
}
