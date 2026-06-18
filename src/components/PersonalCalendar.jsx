// PersonalCalendar.jsx - 個人日曆元件
// 月曆格子視圖 + 聚合個人事件與所有隊伍事件

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getUserTeams } from "../firebase/teams";
import { subscribeToTeamEvents } from "../firebase/teamEvents";
import {
  subscribeToPersonalEvents,
  createPersonalEvent,
  deletePersonalEvent,
  updatePersonalEvent,
} from "../firebase/personalEvents";
import {
  subscribeToRefereeEvents,
  createRefereeEvent,
  updateRefereeEvent,
  deleteRefereeEvent,
  REFEREE_EVENT_TYPES,
  REFEREE_TYPE_COLORS,
} from "../firebase/refereeEvents";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

const REFEREE_EVENT_TYPE_OPTIONS = [
  {
    value: REFEREE_EVENT_TYPES.AVAILABLE,
    label: REFEREE_EVENT_TYPES.AVAILABLE,
    color: REFEREE_TYPE_COLORS[REFEREE_EVENT_TYPES.AVAILABLE],
    referee: true,
  },
  {
    value: REFEREE_EVENT_TYPES.JUDGING,
    label: REFEREE_EVENT_TYPES.JUDGING,
    color: REFEREE_TYPE_COLORS[REFEREE_EVENT_TYPES.JUDGING],
    referee: true,
  },
];

const REFEREE_TYPE_VALUES = REFEREE_EVENT_TYPE_OPTIONS.map((t) => t.value);

const EVENT_TYPES = [
  { value: "personal", label: "個人事項", color: "#3B82F6" },
  { value: "deadline", label: "截止日期", color: "#EF4444" },
  { value: "reminder", label: "提醒", color: "#F59E0B" },
  { value: "competition", label: "比賽", color: "#F97316" },
];

const CUSTOM_TYPE_COLOR = "#6B7280";

const TEAM_EVENT_COLORS = {
  meeting: "#8B5CF6",
  practice: "#10B981",
  competition: "#F97316",
  deadline: "#EF4444",
  other: "#6B7280",
};

export function PersonalCalendar({ isReferee = false, refereeName = "" } = {}) {
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
  const [refereeEvents, setRefereeEvents] = useState([]);
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
    tags: [],
  });
  const [customTagInput, setCustomTagInput] = useState("");
  const [customTypeInput, setCustomTypeInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [editingEventSource, setEditingEventSource] = useState("personal");
  const [hiddenCustomTypes, setHiddenCustomTypes] = useState(() => {
    try {
      const raw = localStorage.getItem("personalHiddenTypes");
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });
  const persistHidden = (next) => {
    setHiddenCustomTypes(next);
    try {
      localStorage.setItem(
        "personalHiddenTypes",
        JSON.stringify(Array.from(next)),
      );
    } catch {}
  };
  const handleDeleteCustomType = (value) => {
    if (
      !window.confirm(
        `確定要從清單中隱藏「${value}」類型嗎？\n\n（不會刪除現有使用此類型的事件，只會從下拉選項移除）`,
      )
    )
      return;
    const next = new Set(hiddenCustomTypes);
    next.add(value);
    persistHidden(next);
    if (eventForm.type === value) {
      setEventForm((prev) => ({ ...prev, type: "personal" }));
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 可選擇的標籤：個人事件 + 所有隊伍事件中曾使用過的標籤（去重排序）
  const availableTags = useMemo(() => {
    const set = new Set();
    [...personalEvents, ...teamEvents].forEach((e) =>
      (e.tags || []).forEach((t) => {
        const v = (t || "").toString().trim();
        if (v) set.add(v);
      }),
    );
    return Array.from(set).sort();
  }, [personalEvents, teamEvents]);

  // 個人事件中出現過的自訂類型（排除內建類型與已隱藏項目）
  const customEventTypes = useMemo(() => {
    const builtin = new Set(EVENT_TYPES.map((t) => t.value));
    const set = new Set();
    personalEvents.forEach((e) => {
      if (e.type && !builtin.has(e.type) && !hiddenCustomTypes.has(e.type))
        set.add(e.type);
    });
    if (
      eventForm.type &&
      !builtin.has(eventForm.type) &&
      !REFEREE_TYPE_VALUES.includes(eventForm.type)
    )
      set.add(eventForm.type);
    return Array.from(set).sort();
  }, [personalEvents, eventForm.type, hiddenCustomTypes]);

  const allEventTypes = useMemo(
    () => [
      ...EVENT_TYPES,
      ...(isReferee ? REFEREE_EVENT_TYPE_OPTIONS : []),
      ...customEventTypes.map((t) => ({
        value: t,
        label: t,
        color: CUSTOM_TYPE_COLOR,
        custom: true,
      })),
    ],
    [customEventTypes, isReferee],
  );

  const handleAddCustomType = () => {
    const v = customTypeInput.trim();
    if (!v) return;
    // 若之前被隱藏，重新可見
    if (hiddenCustomTypes.has(v)) {
      const next = new Set(hiddenCustomTypes);
      next.delete(v);
      persistHidden(next);
    }
    setEventForm((prev) => ({ ...prev, type: v }));
    setCustomTypeInput("");
  };

  const toggleEventTag = (tag) => {
    setEventForm((prev) => {
      const tags = prev.tags || [];
      return {
        ...prev,
        tags: tags.includes(tag)
          ? tags.filter((t) => t !== tag)
          : [...tags, tag],
      };
    });
  };

  const handleAddCustomTag = () => {
    const v = customTagInput.trim();
    if (!v) return;
    setEventForm((prev) => {
      const tags = prev.tags || [];
      return tags.includes(v) ? prev : { ...prev, tags: [...tags, v] };
    });
    setCustomTagInput("");
  };

  // 訂閱個人事件
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToPersonalEvents(currentUser.uid, (events) => {
      setPersonalEvents(events);
    });
    return () => unsub();
  }, [currentUser]);

  // 訂閱裁判事件（可邀裁 / 裁比賽）
  useEffect(() => {
    if (!currentUser || !isReferee) {
      setRefereeEvents([]);
      return;
    }
    const unsub = subscribeToRefereeEvents(currentUser.uid, (events) => {
      setRefereeEvents(events);
    });
    return () => unsub();
  }, [currentUser, isReferee]);

  // 訂閱所有隊伍事件（即時同步新增/編輯/刪除）
  useEffect(() => {
    if (!currentUser) return;
    let unsubs = [];
    let teamMap = {};
    let eventsByTeam = {};

    const recompute = () => {
      const all = [];
      Object.entries(eventsByTeam).forEach(([tid, evs]) => {
        const t = teamMap[tid];
        evs.forEach((ev) => {
          all.push({
            ...ev,
            teamName: t?.name || "",
            teamId: tid,
          });
        });
      });
      setTeamEvents(all);
    };

    (async () => {
      try {
        setLoading(true);
        const teams = await getUserTeams(currentUser.uid);
        teamMap = Object.fromEntries(teams.map((t) => [t.id, t]));
        unsubs = teams.map((team) =>
          subscribeToTeamEvents(team.id, (evs) => {
            eventsByTeam[team.id] = evs;
            recompute();
          }),
        );
      } catch (error) {
        console.error("訂閱隊伍事件失敗:", error);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      unsubs.forEach((u) => {
        try {
          u && u();
        } catch (e) {
          /* noop */
        }
      });
    };
  }, [currentUser]);

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

  // 將事件分配到日期（支援跨日，事件會出現在每一天）
  const eventsByDate = useMemo(() => {
    const map = {};

    const addToDate = (dateStr, event) => {
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(event);
    };

    const expandEvent = (ev, source, extra = {}) => {
      const start = ev.startTime?.toDate
        ? ev.startTime.toDate()
        : new Date(ev.startTime);
      const end = ev.endTime?.toDate
        ? ev.endTime.toDate()
        : ev.endTime
          ? new Date(ev.endTime)
          : null;
      if (!end || isNaN(end) || end.getTime() <= start.getTime()) {
        addToDate(toDateKey(start), { ...ev, source, ...extra });
        return;
      }
      const cursor = new Date(start);
      cursor.setHours(0, 0, 0, 0);
      const last = new Date(end);
      // 若結束剛好在 00:00，視為前一天結束
      if (
        last.getHours() === 0 &&
        last.getMinutes() === 0 &&
        last.getSeconds() === 0
      ) {
        last.setMilliseconds(-1);
      }
      last.setHours(0, 0, 0, 0);
      const enriched = {
        ...ev,
        source,
        ...extra,
        _multiDay: cursor.getTime() !== last.getTime(),
      };
      while (cursor.getTime() <= last.getTime()) {
        addToDate(toDateKey(cursor), enriched);
        cursor.setDate(cursor.getDate() + 1);
      }
    };

    personalEvents.forEach((ev) => expandEvent(ev, "personal"));
    teamEvents.forEach((ev) =>
      expandEvent(ev, "team", { teamName: ev.teamName, teamId: ev.teamId }),
    );
    refereeEvents.forEach((ev) => expandEvent(ev, "referee"));

    return map;
  }, [personalEvents, teamEvents, refereeEvents]);

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
    setEditingEventId(null);
    setEditingEventSource("personal");
    setEventForm({
      title: "",
      description: "",
      type: "personal",
      startTime: `${dateStr}T09:00`,
      endTime: `${dateStr}T10:00`,
      allDay: false,
      tags: [],
    });
    setCustomTagInput("");
    setShowEventForm(true);
  };

  const handleEditEvent = (ev) => {
    const toDt = (ts) => (ts?.toDate ? ts.toDate() : new Date(ts));
    const toLocalInput = (d) => {
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    const start = ev.startTime ? toDt(ev.startTime) : new Date();
    const end = ev.endTime ? toDt(ev.endTime) : null;
    setEditingEventId(ev.id);
    setEditingEventSource(ev.source === "referee" ? "referee" : "personal");
    setEventForm({
      title: ev.title || "",
      description: ev.description || "",
      type: ev.type || "personal",
      startTime: toLocalInput(start),
      endTime: end ? toLocalInput(end) : "",
      allDay: !!ev.allDay,
      tags: Array.isArray(ev.tags) ? [...ev.tags] : [],
    });
    setCustomTagInput("");
    setShowEventForm(true);
  };

  const handleSubmitEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title.trim()) return;

    try {
      setSubmitting(true);
      const typeInfo = allEventTypes.find((t) => t.value === eventForm.type);
      const payload = {
        title: eventForm.title.trim(),
        description: eventForm.description.trim(),
        type: eventForm.type,
        startTime: new Date(eventForm.startTime),
        endTime: eventForm.endTime ? new Date(eventForm.endTime) : null,
        allDay: eventForm.allDay,
        color: typeInfo?.color || CUSTOM_TYPE_COLOR,
        tags: eventForm.tags || [],
      };
      const isRefereeType = REFEREE_TYPE_VALUES.includes(eventForm.type);
      if (isRefereeType) {
        // 裁判事件（可邀裁 / 裁比賽）寫入 referee_events
        if (editingEventId && editingEventSource === "referee") {
          await updateRefereeEvent(editingEventId, {
            ...payload,
            refereeName,
          });
        } else {
          await createRefereeEvent(currentUser.uid, refereeName, payload);
        }
      } else if (editingEventId && editingEventSource === "referee") {
        // 由裁判類型改為一般類型：刪除舊裁判事件，建立新個人事件
        await deleteRefereeEvent(editingEventId);
        await createPersonalEvent(currentUser.uid, payload);
      } else if (editingEventId) {
        await updatePersonalEvent(editingEventId, payload);
      } else {
        await createPersonalEvent(currentUser.uid, payload);
      }
      setShowEventForm(false);
      setEditingEventId(null);
      setEditingEventSource("personal");
      setEventForm({
        title: "",
        description: "",
        type: "personal",
        startTime: "",
        endTime: "",
        allDay: false,
        tags: [],
      });
      setCustomTagInput("");
    } catch (error) {
      console.error("儲存事件失敗:", error);
      alert("儲存事件失敗，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (ev) => {
    if (!confirm("確定要刪除此事件？")) return;
    try {
      if (ev.source === "referee") {
        await deleteRefereeEvent(ev.id);
      } else {
        await deletePersonalEvent(ev.id);
      }
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
        {isReferee && (
          <>
            <span className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{
                  backgroundColor:
                    REFEREE_TYPE_COLORS[REFEREE_EVENT_TYPES.AVAILABLE],
                }}
              ></span>{" "}
              可邀裁
            </span>
            <span className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{
                  backgroundColor:
                    REFEREE_TYPE_COLORS[REFEREE_EVENT_TYPES.JUDGING],
                }}
              ></span>{" "}
              裁比賽
            </span>
          </>
        )}
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
                        const label = getEventLabelForDate(evt, key);
                        const tagSuffix =
                          Array.isArray(evt.tags) && evt.tags.length > 0
                            ? ` #${evt.tags[0]}${evt.tags.length > 1 ? `+${evt.tags.length - 1}` : ""}`
                            : "";
                        const evColor = getEventColor(evt);
                        return (
                          <div
                            key={i}
                            className="truncate text-xs rounded px-1 py-0.5 flex items-center gap-1"
                            style={{
                              backgroundColor: `${evColor}22`,
                              color: evColor,
                            }}
                            title={`${evt.title}${tagSuffix ? ` (${evt.tags.map((t) => "#" + t).join(" ")})` : ""}`}
                          >
                            <span
                              className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: evColor }}
                            />
                            <span className="truncate">
                              {label} {evt.title}
                              {tagSuffix && (
                                <span className="opacity-75">{tagSuffix}</span>
                              )}
                            </span>
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
                        const label = getEventLabelForDate(evt, key);
                        const tagSuffix =
                          Array.isArray(evt.tags) && evt.tags.length > 0
                            ? ` #${evt.tags[0]}${evt.tags.length > 1 ? `+${evt.tags.length - 1}` : ""}`
                            : "";
                        const evColor = getEventColor(evt);
                        return (
                          <div
                            key={i}
                            className="truncate text-xs rounded px-1 py-0.5 flex items-center gap-1"
                            style={{
                              backgroundColor: `${evColor}22`,
                              color: evColor,
                            }}
                            title={`${evt.title}${tagSuffix ? ` (${evt.tags.map((t) => "#" + t).join(" ")})` : ""}`}
                          >
                            <span
                              className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: evColor }}
                            />
                            <span className="truncate">
                              {label} {evt.title}
                              {tagSuffix && (
                                <span className="opacity-75">{tagSuffix}</span>
                              )}
                            </span>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* 左側：事件標籤 */}
                <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col h-full">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    🏷️ 事件標籤
                  </label>
                  <div className="flex-1 min-h-[60px] max-h-40 overflow-y-auto pr-1">
                    {availableTags.length === 0 &&
                    (eventForm.tags || []).filter(
                      (t) => !availableTags.includes(t),
                    ).length === 0 ? (
                      <p className="text-xs text-gray-400">
                        尚無標籤，可於下方新增自訂標籤
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from(
                          new Set([
                            ...availableTags,
                            ...(eventForm.tags || []),
                          ]),
                        ).map((tag) => {
                          const active = (eventForm.tags || []).includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleEventTag(tag)}
                              className={`px-2.5 py-1 rounded-full text-xs border transition whitespace-nowrap ${
                                active
                                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                  : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-300"
                              }`}
                            >
                              {active ? "✓ " : "#"}
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <input
                      type="text"
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomTag();
                        }
                      }}
                      placeholder="新增自訂標籤..."
                      className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomTag}
                      className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 whitespace-nowrap"
                    >
                      + 新增
                    </button>
                  </div>
                </div>

                {/* 右側：事件類型 */}
                <div className="bg-white border border-gray-200 rounded-lg p-3 h-full flex flex-col">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    📋 事件類型
                  </label>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                    {allEventTypes.map((t) => {
                      const active = eventForm.type === t.value;
                      return (
                        <div key={t.value} className="relative">
                          <label
                            className={`flex items-center gap-2 px-3 py-2 ${t.custom ? "pr-8" : ""} rounded-lg border cursor-pointer transition ${
                              active
                                ? "bg-blue-50 border-blue-500 ring-1 ring-blue-300"
                                : "bg-white border-gray-200 hover:bg-gray-50"
                            }`}
                            title={t.label}
                          >
                            <input
                              type="radio"
                              name="personalEventType"
                              value={t.value}
                              checked={active}
                              onChange={(e) =>
                                setEventForm({
                                  ...eventForm,
                                  type: e.target.value,
                                })
                              }
                              className="text-blue-600 flex-shrink-0"
                            />
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: t.color }}
                            />
                            <span
                              className={`text-sm break-all flex-1 min-w-0 ${active ? "text-blue-700 font-medium" : "text-gray-700"}`}
                            >
                              {t.label}
                            </span>
                            {t.custom && (
                              <span className="flex-shrink-0 text-[10px] leading-none px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
                                自訂
                              </span>
                            )}
                          </label>
                          {t.custom && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteCustomType(t.value);
                              }}
                              title="刪除此自訂類型"
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded leading-none"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <input
                      type="text"
                      value={customTypeInput}
                      onChange={(e) => setCustomTypeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomType();
                        }
                      }}
                      placeholder="新增自訂類型..."
                      className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomType}
                      className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 whitespace-nowrap"
                    >
                      + 新增
                    </button>
                  </div>
                  <label className="flex items-center gap-2 px-3 py-2 mt-3 border-t border-gray-100 pt-3 cursor-pointer">
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
                  備註（選填）
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
                  {submitting
                    ? editingEventId
                      ? "更新中..."
                      : "建立中..."
                    : editingEventId
                      ? "更新事件"
                      : "建立事件"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEventForm(false);
                    setEditingEventId(null);
                  }}
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
                      ) : ev.source === "referee" ? (
                        <span className="inline-block bg-teal-100 text-teal-700 text-xs px-1.5 py-0.5 rounded mr-1">
                          裁判
                        </span>
                      ) : (
                        <span className="inline-block bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded mr-1">
                          個人
                        </span>
                      )}
                      {(() => {
                        const typeLabel = getEventTypeLabel(ev);
                        if (!typeLabel || typeLabel === (ev.title || "").trim())
                          return null;
                        return (
                          <span
                            className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-1.5 py-0.5 rounded mr-1"
                            title="事件類型"
                          >
                            <span
                              className="inline-block w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: getEventColor(ev) }}
                            />
                            {typeLabel}
                          </span>
                        );
                      })()}
                      {formatEventTime(ev)}
                    </div>
                    {ev.description && (
                      <div className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">
                        {ev.description}
                      </div>
                    )}
                    {ev.location && (
                      <div className="text-sm text-gray-500 mt-0.5">
                        📍 {ev.location}
                      </div>
                    )}
                    {Array.isArray(ev.tags) && ev.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {ev.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* 只能編輯/刪除自己的個人事件或裁判事件 */}
                  {(ev.source === "personal" || ev.source === "referee") && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEditEvent(ev)}
                        className="text-blue-500 hover:text-blue-700 text-sm"
                        title="編輯"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(ev)}
                        className="text-red-500 hover:text-red-700 text-sm"
                        title="刪除"
                      >
                        🗑️
                      </button>
                    </div>
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

// 取得事件於指定日期(dsKey: YYYY-MM-DD)的「當日片段」時間 label
// 跨日：開頭日 = startTime ~ 24:00，中間日 = 00:00 ~ 24:00，結束日 = 00:00 ~ endTime
function getEventLabelForDate(evt, dsKey) {
  if (evt.allDay) return "全天";
  if (!evt.startTime) return "";
  const toDt = (ts) => (ts?.toDate ? ts.toDate() : new Date(ts));
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const start = toDt(evt.startTime);
  const end = evt.endTime ? toDt(evt.endTime) : null;
  const startKey = toDateKey(start);
  const endKey = end ? toDateKey(end) : startKey;
  const s = dsKey === startKey ? fmt(start) : "00:00";
  if (!end) return s;
  const e = dsKey === endKey ? fmt(end) : "24:00";
  return `${s} ~ ${e}`;
}

function getEventColor(ev) {
  if (ev.source === "team") {
    return TEAM_EVENT_COLORS[ev.type] || ev.color || TEAM_EVENT_COLORS.other;
  }
  const typeInfo = EVENT_TYPES.find((t) => t.value === ev.type);
  return typeInfo?.color || ev.color || "#6B7280";
}

const TEAM_TYPE_LABELS = {
  meeting: "討論",
  practice: "練習賽",
  competition: "比賽",
  deadline: "一辯稿繳交",
  other: "其他",
};

function getEventTypeLabel(ev) {
  if (!ev?.type) return "";
  if (ev.source === "team") {
    return TEAM_TYPE_LABELS[ev.type] || ev.type;
  }
  const typeInfo = EVENT_TYPES.find((t) => t.value === ev.type);
  return typeInfo?.label || ev.type;
}

function formatEventTime(ev) {
  const toDt = (ts) => (ts?.toDate ? ts.toDate() : new Date(ts));
  const toTime = (d) =>
    d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
  const toMD = (d) => `${d.getMonth() + 1}/${d.getDate()}`;

  if (ev.allDay) return "全天";
  if (!ev.startTime) return "";

  const start = toDt(ev.startTime);
  const end = ev.endTime ? toDt(ev.endTime) : null;

  if (!end) return toTime(start);

  const sameDay = toDateKey(start) === toDateKey(end);
  if (sameDay) return `${toTime(start)} - ${toTime(end)}`;
  return `${toMD(start)} ${toTime(start)} ~ ${toMD(end)} ${toTime(end)}`;
}
