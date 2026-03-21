// PersonalCalendar.jsx - 個人日曆元件
// 月曆格子視圖 + 聚合個人事件與所有隊伍事件

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getUserTeams } from "../firebase/teams";
import { getTeamEvents } from "../firebase/teamEvents";
import {
  subscribeToPersonalEvents,
  createPersonalEvent,
  deletePersonalEvent,
} from "../firebase/personalEvents";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

const EVENT_TYPES = [
  { value: "personal", label: "個人事項", color: "#3B82F6" },
  { value: "deadline", label: "截止日期", color: "#EF4444" },
  { value: "reminder", label: "提醒", color: "#F59E0B" },
];

const TEAM_EVENT_COLORS = {
  meeting: "#8B5CF6",
  practice: "#10B981",
  competition: "#F97316",
  deadline: "#EF4444",
  other: "#6B7280",
};

export function PersonalCalendar() {
  const { currentUser } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  // 新增 viewMode 狀態
  const [viewMode, setViewMode] = useState("month"); // "month" | "week"
  // 週曆：取得本週一的日期
  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - ((day === 0 ? 7 : day) - 1);
    return new Date(d.setDate(diff));
  }

  // 週曆：取得本週 7 天日期陣列
  const weekDates = useMemo(() => {
    const monday = getMonday(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [currentDate]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [personalEvents, setPersonalEvents] = useState([]);
  const [teamEvents, setTeamEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    type: "personal",
    startTime: "",
    endTime: "",
    allDay: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 訂閱個人事件
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToPersonalEvents(currentUser.uid, (events) => {
      setPersonalEvents(events);
    });
    return () => unsub();
  }, [currentUser]);

  // 載入所有隊伍事件
  useEffect(() => {
    if (!currentUser) return;
    loadTeamEvents();
  }, [currentUser, year, month]);

  const loadTeamEvents = async () => {
    try {
      setLoading(true);
      const teams = await getUserTeams(currentUser.uid);
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

      const allEvents = [];
      for (const team of teams) {
        const events = await getTeamEvents(team.id, startOfMonth, endOfMonth);
        events.forEach((ev) => {
          allEvents.push({ ...ev, teamName: team.name, teamId: team.id });
        });
      }
      setTeamEvents(allEvents);
    } catch (error) {
      console.error("載入隊伍事件失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  // 計算月曆格子
  const calendarDays = useMemo(() => {
    let firstDay = new Date(year, month, 1).getDay();
    firstDay = firstDay === 0 ? 6 : firstDay - 1; // 轉換為週一=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];

    // 上個月的尾巴
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        currentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i),
      });
    }

    // 本月
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, currentMonth: true, date: new Date(year, month, i) });
    }

    // 下個月的開頭，補滿 6 行
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        currentMonth: false,
        date: new Date(year, month + 1, i),
      });
    }

    return days;
  }, [year, month]);

  // 將事件分配到日期
  const eventsByDate = useMemo(() => {
    const map = {};

    const addToDate = (dateStr, event) => {
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(event);
    };

    // 個人事件
    personalEvents.forEach((ev) => {
      const start = ev.startTime?.toDate
        ? ev.startTime.toDate()
        : new Date(ev.startTime);
      const key = toDateKey(start);
      addToDate(key, { ...ev, source: "personal" });
    });

    // 隊伍事件
    teamEvents.forEach((ev) => {
      const start = ev.startTime?.toDate
        ? ev.startTime.toDate()
        : new Date(ev.startTime);
      const key = toDateKey(start);
      addToDate(key, { ...ev, source: "team" });
    });

    return map;
  }, [personalEvents, teamEvents]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  };

  const handleDayClick = (dayInfo) => {
    setSelectedDate(dayInfo.date);
    setShowEventForm(false);
  };

  const handleAddEvent = () => {
    if (!selectedDate) return;
    const d = selectedDate;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setEventForm({
      title: "",
      description: "",
      type: "personal",
      startTime: `${dateStr}T09:00`,
      endTime: `${dateStr}T10:00`,
      allDay: false,
    });
    setShowEventForm(true);
  };

  const handleSubmitEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title.trim()) return;

    try {
      setSubmitting(true);
      const typeInfo = EVENT_TYPES.find((t) => t.value === eventForm.type);
      await createPersonalEvent(currentUser.uid, {
        title: eventForm.title.trim(),
        description: eventForm.description.trim(),
        type: eventForm.type,
        startTime: new Date(eventForm.startTime),
        endTime: eventForm.endTime ? new Date(eventForm.endTime) : null,
        allDay: eventForm.allDay,
        color: typeInfo?.color || "#3B82F6",
      });
      setShowEventForm(false);
      setEventForm({
        title: "",
        description: "",
        type: "personal",
        startTime: "",
        endTime: "",
        allDay: false,
      });
    } catch (error) {
      console.error("建立事件失敗:", error);
      alert("建立事件失敗，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm("確定要刪除此事件？")) return;
    try {
      await deletePersonalEvent(eventId);
    } catch (error) {
      console.error("刪除失敗:", error);
      alert("刪除失敗");
    }
  };

  const today = new Date();
  const todayKey = toDateKey(today);
  const selectedKey = selectedDate ? toDateKey(selectedDate) : null;
  const selectedEvents = selectedKey ? eventsByDate[selectedKey] || [] : [];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">個人日曆</h2>

      {/* 切換按鈕與導航 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("week")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${viewMode === "week" ? "bg-blue-600 text-white" : "bg-white text-blue-700 border border-blue-600"}`}
          >
            週曆
          </button>
          <button
            onClick={() => setViewMode("month")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-white text-blue-700 border border-blue-600"}`}
          >
            月曆
          </button>
        </div>
        {viewMode === "month" ? (
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 transition"
            >
              ◀
            </button>
            <h3 className="text-lg font-bold text-gray-800 min-w-[140px] text-center">
              {year} 年 {month + 1} 月
            </h3>
            <button
              onClick={nextMonth}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 transition"
            >
              ▶
            </button>
            <button
              onClick={goToday}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
            >
              今天
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setCurrentDate(
                  new Date(currentDate.setDate(currentDate.getDate() - 7)),
                )
              }
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 transition"
            >
              ← 上週
            </button>
            <h3 className="text-lg font-bold text-gray-800 min-w-[140px] text-center">
              {weekDates[0].getFullYear()} 年 {weekDates[0].getMonth() + 1} 月{" "}
              {weekDates[0].getDate()} 日 - {weekDates[6].getMonth() + 1} 月{" "}
              {weekDates[6].getDate()} 日
            </h3>
            <button
              onClick={() =>
                setCurrentDate(
                  new Date(currentDate.setDate(currentDate.getDate() + 7)),
                )
              }
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 transition"
            >
              下週 →
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
            >
              本週
            </button>
          </div>
        )}
      </div>

      {/* 圖例 */}
      <div className="flex flex-wrap gap-3 mb-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>{" "}
          個人事項
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>{" "}
          截止日期
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span>{" "}
          提醒
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-purple-500 inline-block"></span>{" "}
          隊伍會議
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>{" "}
          練習
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-orange-500 inline-block"></span>{" "}
          比賽
        </span>
      </div>

      {/* 日曆格子 */}
      {viewMode === "month" ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* 星期標頭 */}
          <div className="grid grid-cols-7 bg-gray-100">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-sm font-medium text-gray-600"
              >
                {day}
              </div>
            ))}
          </div>
          {/* 日期格子 */}
          <div className="grid grid-cols-7">
            {calendarDays.map((dayInfo, idx) => {
              const key = toDateKey(dayInfo.date);
              const dayEvents = eventsByDate[key] || [];
              const isToday = key === todayKey;
              const isSelected = key === selectedKey;
              return (
                <div
                  key={idx}
                  className={`min-h-[80px] p-1.5 border-b border-r border-gray-200 cursor-pointer hover:bg-blue-50 transition ${isToday ? "bg-blue-50 ring-2 ring-inset ring-blue-400" : ""}`}
                  onClick={() => setSelectedDate(dayInfo.date)}
                >
                  <div
                    className={`text-xs font-medium mb-1 ${isToday ? "text-blue-600" : "text-gray-700"}`}
                  >
                    {dayInfo.day}
                  </div>
                  {/* 當日事件顯示，可自行擴充 */}
                  {dayEvents.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map((evt, i) => {
                        const toTime = (ts) => {
                          const d = ts?.toDate ? ts.toDate() : new Date(ts);
                          return d.toLocaleTimeString("zh-TW", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                        };
                        const start = evt.startTime
                          ? toTime(evt.startTime)
                          : "";
                        const end = evt.endTime ? toTime(evt.endTime) : "";
                        let label = start;
                        if (end) label += ` ~ ${end}`;
                        return (
                          <div
                            key={i}
                            className="truncate text-xs text-gray-500 bg-gray-100 rounded px-1 py-0.5"
                          >
                            {label} {evt.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-gray-400">
                          +{dayEvents.length - 2} 更多
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* 星期標頭 */}
          <div className="grid grid-cols-7 bg-gray-100">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-sm font-medium text-gray-600"
              >
                {day}
              </div>
            ))}
          </div>
          {/* 週曆格子 */}
          <div className="grid grid-cols-7">
            {weekDates.map((date, idx) => {
              const key = toDateKey(date);
              const dayEvents = eventsByDate[key] || [];
              const isToday = key === todayKey;
              const isSelected = key === selectedKey;
              return (
                <div
                  key={idx}
                  className={`min-h-[80px] p-1.5 border-b border-r border-gray-200 cursor-pointer hover:bg-blue-50 transition ${isToday ? "bg-blue-50 ring-2 ring-inset ring-blue-400" : ""}`}
                  onClick={() => setSelectedDate(date)}
                >
                  <div
                    className={`text-xs font-medium mb-1 ${isToday ? "text-blue-600" : "text-gray-700"}`}
                  >
                    {date.getDate()}
                  </div>
                  {/* 當日事件顯示，可自行擴充 */}
                  {dayEvents.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map((evt, i) => {
                        const toTime = (ts) => {
                          const d = ts?.toDate ? ts.toDate() : new Date(ts);
                          return d.toLocaleTimeString("zh-TW", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                        };
                        const start = evt.startTime
                          ? toTime(evt.startTime)
                          : "";
                        const end = evt.endTime ? toTime(evt.endTime) : "";
                        let label = start;
                        if (end) label += ` ~ ${end}`;
                        return (
                          <div
                            key={i}
                            className="truncate text-xs text-gray-500 bg-gray-100 rounded px-1 py-0.5"
                          >
                            {label} {evt.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-gray-400">
                          +{dayEvents.length - 2} 更多
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 選中日期的事件列表 */}
      {selectedDate && (
        <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-gray-800">
              {selectedDate.getFullYear()}/{selectedDate.getMonth() + 1}/
              {selectedDate.getDate()}（
              {
                WEEKDAYS[
                  selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1
                ]
              }
              ）
            </h4>
            <button
              onClick={handleAddEvent}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
            >
              + 新增事件
            </button>
          </div>

          {/* 新增事件表單 */}
          {showEventForm && (
            <form
              onSubmit={handleSubmitEvent}
              className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  標題 *
                </label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, title: e.target.value })
                  }
                  placeholder="事件標題"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    類型
                  </label>
                  <select
                    value={eventForm.type}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, type: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 py-2">
                    <input
                      type="checkbox"
                      checked={eventForm.allDay}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, allDay: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">全天事件</span>
                  </label>
                </div>
              </div>
              {!eventForm.allDay && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      開始時間
                    </label>
                    <input
                      type="datetime-local"
                      value={eventForm.startTime}
                      onChange={(e) =>
                        setEventForm({
                          ...eventForm,
                          startTime: e.target.value,
                        })
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  說明
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, description: e.target.value })
                  }
                  placeholder="備註說明..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {submitting ? "建立中..." : "建立事件"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEventForm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
                >
                  取消
                </button>
              </div>
            </form>
          )}

          {/* 事件列表 */}
          {selectedEvents.length === 0 && !showEventForm ? (
            <p className="text-gray-400 text-center py-4">這天沒有事件</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition"
                >
                  <span
                    className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: getEventColor(ev) }}
                  ></span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800">{ev.title}</div>
                    <div className="text-sm text-gray-500">
                      {ev.source === "team" ? (
                        <span className="inline-block bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded mr-1">
                          {ev.teamName}
                        </span>
                      ) : (
                        <span className="inline-block bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded mr-1">
                          個人
                        </span>
                      )}
                      {formatEventTime(ev)}
                    </div>
                    {ev.description && (
                      <div className="text-sm text-gray-500 mt-1">
                        {ev.description}
                      </div>
                    )}
                    {ev.location && (
                      <div className="text-sm text-gray-500 mt-0.5">
                        📍 {ev.location}
                      </div>
                    )}
                  </div>
                  {/* 只能刪除自己的個人事件 */}
                  {ev.source === "personal" && (
                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="text-red-500 hover:text-red-700 text-sm flex-shrink-0"
                      title="刪除"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="mt-2 text-center text-sm text-gray-400">
          載入隊伍事件中...
        </div>
      )}
    </div>
  );
}

// === 工具函數 ===

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getEventColor(ev) {
  if (ev.source === "team") {
    return TEAM_EVENT_COLORS[ev.type] || TEAM_EVENT_COLORS.other;
  }
  const typeInfo = EVENT_TYPES.find((t) => t.value === ev.type);
  return typeInfo?.color || ev.color || "#3B82F6";
}

function formatEventTime(ev) {
  const toTime = (ts) => {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (ev.allDay) return "全天";

  const start = ev.startTime ? toTime(ev.startTime) : "";
  const end = ev.endTime ? toTime(ev.endTime) : "";

  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  return "";
}
