// TeamCalendar.jsx - 隊伍日曆元件
// 支援分鐘精度、週曆/月曆切換、代表色、篩選重疊、建立事件

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  markUserAvailability,
  subscribeToTeamAvailability,
  createTeamEvent,
  getTeamEvents,
  subscribeToTeamEvents,
  deleteTeamEvent,
  updateTeamEvent,
} from "../firebase/teamEvents";
import { getTeam } from "../firebase/teams";
import { getUser } from "../firebase/users";

const START_HOUR = 0;
const END_HOUR = 24;
const GRID_INTERVAL = 60; // 格子間隔（分鐘）
const DAY_NAMES = ["一", "二", "三", "四", "五", "六", "日"];

const COLOR_OPTIONS = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#06B6D4",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F43F5E",
];

const EVENT_TYPES = [
  { value: "discussion", label: "討論" },
  { value: "practice", label: "練習賽" },
  { value: "competition", label: "比賽" },
  { value: "submission", label: "一辯稿繳交" },
  { value: "custom", label: "自訂" },
];

// 儲存到 Firestore 的內建內部類型集合（用以判斷哪些是「自訂類型」）
const BUILTIN_INTERNAL_TYPES = new Set([
  "meeting",
  "practice",
  "competition",
  "deadline",
  "other",
]);

function pad(n) {
  return String(n).padStart(2, "0");
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function toDateStr(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function timeToMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minToTime(m) {
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

// 產生週曆時間列表 "08:00", "08:30", ...
function getTimeSlots() {
  const slots = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    for (let m = 0; m < 60; m += GRID_INTERVAL) {
      slots.push(`${pad(h)}:${pad(m)}`);
    }
  }
  return slots;
}
const TIME_SLOTS = getTimeSlots();

// 範圍是否覆蓋某個格子
function rangeCoversSlot(range, targetDate, slotTime) {
  if (range.date !== targetDate) return false;
  const slotStart = timeToMin(slotTime);
  const slotEnd = slotStart + GRID_INTERVAL;
  const rStart = timeToMin(range.start);
  const rEnd = timeToMin(range.end);
  return rStart < slotEnd && rEnd > slotStart;
}

// 取得月曆日期陣列（6 列 × 7 欄）
function getMonthCalendarDates(year, month) {
  const firstDay = new Date(year, month, 1);
  let dow = firstDay.getDay();
  dow = dow === 0 ? 6 : dow - 1; // 轉成週一=0
  const startDate = new Date(year, month, 1 - dow);
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatResultLabel(r) {
  const dn = ["日", "一", "二", "三", "四", "五", "六"];
  const fmt = (ds) => {
    const d = new Date(`${ds}T00:00:00`);
    return `${d.getMonth() + 1}/${d.getDate()}（${dn[d.getDay()]}）`;
  };
  const endDate = r.endDate || r.date;
  if (endDate === r.date) {
    return `${fmt(r.date)}${r.start} - ${r.end}`;
  }
  return `${fmt(r.date)}${r.start} ~ ${fmt(endDate)}${r.end}`;
}

// 取得事件於指定日期(ds: YYYY-MM-DD)的「當日片段」時間 label
// 例：跨日事件 5/24 06:00 → 5/26 21:00
//   5/24 顯示 06:00 ~ 24:00（開頭日）
//   5/25 顯示 00:00 ~ 24:00（中間日）
//   5/26 顯示 00:00 ~ 21:00（結束日）
function getEventLabelForDate(evt, ds) {
  const start = evt.startTime?.toDate
    ? evt.startTime.toDate()
    : new Date(evt.startTime);
  const end = evt.endTime?.toDate
    ? evt.endTime.toDate()
    : evt.endTime
      ? new Date(evt.endTime)
      : null;
  const fmt = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const startDs = toDateStr(start);
  const endDs = end ? toDateStr(end) : startDs;
  const s = ds === startDs ? fmt(start) : "00:00";
  if (!end) return s;
  const e = ds === endDs ? fmt(end) : "24:00";
  return `${s} ~ ${e}`;
}

// 解析舊格式 slot key → range
function oldSlotToRange(key) {
  const d = new Date(key);
  return {
    date: toDateStr(d),
    start: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    end: `${pad(d.getHours() + 1)}:${pad(d.getMinutes())}`,
  };
}

// 解析 availableSlots（相容新舊格式）
function parseSlots(slots) {
  if (!slots || slots.length === 0) return [];
  if (typeof slots[0] === "string") return slots.map(oldSlotToRange);
  return slots;
}

export function TeamCalendar({ teamId }) {
  const { currentUser } = useAuth();

  // 視圖
  const [viewMode, setViewMode] = useState("week");

  // 週曆導航
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));

  // 月曆導航
  const [mYear, setMYear] = useState(() => new Date().getFullYear());
  const [mMonth, setMMonth] = useState(() => new Date().getMonth());

  // 使用者設定
  const [myColor, setMyColor] = useState(COLOR_OPTIONS[0]);
  const [myRanges, setMyRanges] = useState([]); // [{date, start, end}]

  // 資料
  const [allAvailability, setAllAvailability] = useState([]);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 新增表單
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDate, setAddDate] = useState("");
  const [addStart, setAddStart] = useState("09:00");
  const [addEndDate, setAddEndDate] = useState("");
  const [addEnd, setAddEnd] = useState("10:00");

  // 篩選
  const [minOverlap, setMinOverlap] = useState(2);
  const [isFiltered, setIsFiltered] = useState(false);
  const [filteredResults, setFilteredResults] = useState([]);
  const [mergeConsecutive, setMergeConsecutive] = useState(true);

  // 建立事件
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [eventType, setEventType] = useState("discussion");
  const [customEventName, setCustomEventName] = useState("");

  // 直接建立事件
  const [showDirectEventForm, setShowDirectEventForm] = useState(false);
  const [directEventDate, setDirectEventDate] = useState("");
  const [directEventStart, setDirectEventStart] = useState("09:00");
  const [directEventEndDate, setDirectEventEndDate] = useState("");
  const [directEventEnd, setDirectEventEnd] = useState("10:00");
  const [directEventType, setDirectEventType] = useState("discussion");
  const [directEventName, setDirectEventName] = useState("");
  const [directEventDescription, setDirectEventDescription] = useState("");
  // 編輯中的事件 ID（null = 新增模式）
  const [editingEventId, setEditingEventId] = useState(null);
  // 事件標籤（可從現有隊伍事件選取或自訂新增）
  const [directEventTags, setDirectEventTags] = useState([]);
  const [customTagInput, setCustomTagInput] = useState("");
  // 自訂事件類型（在兩個 Modal 內共用 input 狀態）
  const [customTypeInput, setCustomTypeInput] = useState("");
  // 隱藏的自訂類型（依 teamId 保存於 localStorage）
  const [hiddenCustomTypes, setHiddenCustomTypes] = useState(new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`teamHiddenTypes_${teamId}`);
      setHiddenCustomTypes(new Set(raw ? JSON.parse(raw) : []));
    } catch {
      setHiddenCustomTypes(new Set());
    }
  }, [teamId]);
  const persistHidden = (next) => {
    setHiddenCustomTypes(next);
    try {
      localStorage.setItem(
        `teamHiddenTypes_${teamId}`,
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
    if (eventType === value) setEventType("discussion");
    if (directEventType === value) setDirectEventType("discussion");
  };

  // ─── 載入隊伍成員 ───
  useEffect(() => {
    (async () => {
      try {
        const teamData = await getTeam(teamId);
        const details = await Promise.all(
          (teamData.members || []).map(async (id) => {
            try {
              return await getUser(id);
            } catch {
              return null;
            }
          }),
        );
        setMembers(details.filter(Boolean));
      } catch (err) {
        console.error("載入成員失敗:", err);
      }
    })();
  }, [teamId]);

  // ─── 訂閱可用時間 ───
  useEffect(() => {
    const unsub = subscribeToTeamAvailability(teamId, (avail) => {
      setAllAvailability(avail);
      const mine = avail.find((a) => a.userId === currentUser.uid);
      if (mine) {
        if (mine.color) setMyColor(mine.color);
        if (mine.availableSlots) setMyRanges(parseSlots(mine.availableSlots));
      }
      setLoading(false);
    });
    return () => unsub();
  }, [teamId, currentUser.uid]);

  // ─── 訂閱事件 ───
  useEffect(() => {
    const unsub = subscribeToTeamEvents(teamId, setEvents);
    return () => unsub();
  }, [teamId]);

  // ─── 計算日期 ───
  const weekDates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  const monthDates = useMemo(
    () => getMonthCalendarDates(mYear, mMonth),
    [mYear, mMonth],
  );

  // ─── 導航 ───
  const prevWeek = () => {
    setWeekStart((p) => {
      const d = new Date(p);
      d.setDate(d.getDate() - 7);
      return d;
    });
    setIsFiltered(false);
  };
  const nextWeek = () => {
    setWeekStart((p) => {
      const d = new Date(p);
      d.setDate(d.getDate() + 7);
      return d;
    });
    setIsFiltered(false);
  };
  const goThisWeek = () => {
    setWeekStart(getMonday(new Date()));
    setIsFiltered(false);
  };
  const prevMonth = () => {
    if (mMonth === 0) {
      setMYear((y) => y - 1);
      setMMonth(11);
    } else setMMonth((m) => m - 1);
    setIsFiltered(false);
  };
  const nextMonth = () => {
    if (mMonth === 11) {
      setMYear((y) => y + 1);
      setMMonth(0);
    } else setMMonth((m) => m + 1);
    setIsFiltered(false);
  };
  const goThisMonth = () => {
    const n = new Date();
    setMYear(n.getFullYear());
    setMMonth(n.getMonth());
    setIsFiltered(false);
  };

  // ─── 格子點擊（新增/移除 30 分鐘範圍）───
  const handleGridClick = (date, slotTime) => {
    const ds = toDateStr(date);
    const endTime = minToTime(timeToMin(slotTime) + GRID_INTERVAL);
    const idx = myRanges.findIndex(
      (r) => r.date === ds && r.start === slotTime && r.end === endTime,
    );
    if (idx >= 0) {
      setMyRanges((prev) => prev.filter((_, i) => i !== idx));
    } else {
      setMyRanges((prev) => [
        ...prev,
        { date: ds, start: slotTime, end: endTime },
      ]);
    }
  };

  // ─── 精確新增（支援跨日，自動切分為每日 range）───
  const handleAddRange = () => {
    if (!addDate || !addStart || !addEnd) {
      alert("請填寫完整的日期和時間");
      return;
    }
    const endDate = addEndDate || addDate;
    if (endDate < addDate) {
      alert("結束日期必須晚於或等於開始日期");
      return;
    }
    if (endDate === addDate && timeToMin(addStart) >= timeToMin(addEnd)) {
      alert("結束時間必須晚於開始時間");
      return;
    }

    // 將跨日時間切分成每日的 range
    const newRanges = [];
    const startDt = new Date(`${addDate}T${addStart}:00`);
    const endDt = new Date(`${endDate}T${addEnd}:00`);
    const cursor = new Date(startDt);
    cursor.setHours(0, 0, 0, 0);
    const lastDay = new Date(endDt);
    lastDay.setHours(0, 0, 0, 0);
    while (cursor.getTime() <= lastDay.getTime()) {
      const ds = toDateStr(cursor);
      const isFirst = ds === addDate;
      const isLast = ds === endDate;
      const s = isFirst ? addStart : "00:00";
      const e = isLast ? addEnd : "24:00";
      // 24:00 在 timeToMin 為 1440，若 START_HOUR>0 仍可運作
      if (timeToMin(s) < timeToMin(e)) {
        newRanges.push({ date: ds, start: s, end: e });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    setMyRanges((prev) => [...prev, ...newRanges]);
    setShowAddForm(false);
    setAddEndDate("");
  };

  const removeRange = (r) => {
    setMyRanges((prev) =>
      prev.filter(
        (x) => !(x.date === r.date && x.start === r.start && x.end === r.end),
      ),
    );
  };

  // ─── 儲存 ───
  const handleSave = async () => {
    try {
      setSaving(true);
      await markUserAvailability(teamId, currentUser.uid, myRanges, myColor);
      alert("已儲存！");
    } catch (err) {
      console.error("儲存失敗:", err);
      alert("儲存失敗，請稍後再試");
    } finally {
      setSaving(false);
    }
  };

  // ─── 查詢輔助 ───
  const myCoversSlot = (ds, slot) =>
    myRanges.some((r) => rangeCoversSlot(r, ds, slot));

  const getSlotMembers = (ds, slot) =>
    allAvailability
      .filter((a) =>
        parseSlots(a.availableSlots).some((r) => rangeCoversSlot(r, ds, slot)),
      )
      .map((a) => ({ userId: a.userId, color: a.color || "#6B7280" }));

  const getSlotEvents = (ds, slot) => {
    const sStart = timeToMin(slot);
    const sEnd = sStart + GRID_INTERVAL;
    // 該格子的絕對時間範圍
    const dayStart = new Date(`${ds}T00:00:00`).getTime();
    const slotStartTs = dayStart + sStart * 60_000;
    const slotEndTs = dayStart + sEnd * 60_000;
    return events.filter((e) => {
      const start = e.startTime?.toDate?.() || new Date(e.startTime);
      const end =
        e.endTime?.toDate?.() ||
        (e.endTime
          ? new Date(e.endTime)
          : new Date(start.getTime() + 60 * 60_000));
      return start.getTime() < slotEndTs && end.getTime() > slotStartTs;
    });
  };

  const getDateEvents = (ds) => {
    const dayStart = new Date(`${ds}T00:00:00`).getTime();
    const dayEnd = dayStart + 24 * 60 * 60_000;
    return events.filter((e) => {
      const start = e.startTime?.toDate?.() || new Date(e.startTime);
      const end =
        e.endTime?.toDate?.() ||
        (e.endTime
          ? new Date(e.endTime)
          : new Date(start.getTime() + 60 * 60_000));
      return start.getTime() < dayEnd && end.getTime() > dayStart;
    });
  };

  const getDateMembers = (ds) =>
    allAvailability
      .filter((a) => parseSlots(a.availableSlots).some((r) => r.date === ds))
      .map((a) => ({ userId: a.userId, color: a.color || "#6B7280" }));

  // ─── 篩選重疊（分鐘精度）───
  const handleFilter = () => {
    const dates =
      viewMode === "week"
        ? weekDates.map(toDateStr)
        : [
            ...new Set(
              monthDates.filter((d) => d.getMonth() === mMonth).map(toDateStr),
            ),
          ];

    const results = [];

    for (const ds of dates) {
      const memberData = allAvailability
        .map((a) => {
          const ranges = parseSlots(a.availableSlots).filter(
            (r) => r.date === ds,
          );
          const mem = members.find((m) => m.id === a.userId);
          return {
            userId: a.userId,
            color: a.color || "#6B7280",
            name: mem?.displayName || mem?.email || "未知",
            ranges,
          };
        })
        .filter((m) => m.ranges.length > 0);

      if (memberData.length < minOverlap) continue;

      let blockStart = null;
      let blockIds = null;
      let blockMembers = null;

      for (let min = START_HOUR * 60; min < END_HOUR * 60; min++) {
        const avail = memberData.filter((m) =>
          m.ranges.some(
            (r) => min >= timeToMin(r.start) && min < timeToMin(r.end),
          ),
        );

        const ids =
          avail.length >= minOverlap
            ? avail
                .map((a) => a.userId)
                .sort()
                .join(",")
            : null;

        if (ids && blockStart === null) {
          blockStart = min;
          blockIds = ids;
          blockMembers = avail;
        } else if (ids && ids !== blockIds) {
          // 不同成員組合 → 結束上一段、開始新段
          results.push({
            date: ds,
            start: minToTime(blockStart),
            end: minToTime(min),
            members: blockMembers.map((m) => ({
              userId: m.userId,
              name: m.name,
              color: m.color,
            })),
          });
          blockStart = min;
          blockIds = ids;
          blockMembers = avail;
        } else if (!ids && blockStart !== null) {
          results.push({
            date: ds,
            start: minToTime(blockStart),
            end: minToTime(min),
            members: blockMembers.map((m) => ({
              userId: m.userId,
              name: m.name,
              color: m.color,
            })),
          });
          blockStart = null;
          blockIds = null;
          blockMembers = null;
        }
      }
      if (blockStart !== null) {
        results.push({
          date: ds,
          start: minToTime(blockStart),
          end: minToTime(END_HOUR * 60),
          members: blockMembers.map((m) => ({
            userId: m.userId,
            name: m.name,
            color: m.color,
          })),
        });
      }
    }

    // 合併連續時段（含跨日）：同一組成員、前一段 end=24:00 且下一日第一段 start=00:00
    let finalResults = results;
    if (mergeConsecutive && results.length > 1) {
      const sorted = [...results].sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.start.localeCompare(b.start),
      );
      const memKey = (r) =>
        r.members
          .map((m) => m.userId)
          .sort()
          .join(",");
      const nextDateStr = (ds) => {
        const d = new Date(`${ds}T00:00:00`);
        d.setDate(d.getDate() + 1);
        return toDateStr(d);
      };
      const merged = [];
      for (const r of sorted) {
        const last = merged[merged.length - 1];
        // 同一天連續：last.end === r.start
        if (
          last &&
          last.endDate === r.date &&
          last.end === r.start &&
          memKey(last) === memKey(r)
        ) {
          last.end = r.end;
          continue;
        }
        // 跨日連續：last.end === "24:00" 且 r.date 為 last.endDate 隔天、r.start === "00:00"
        if (
          last &&
          last.end === "24:00" &&
          r.start === "00:00" &&
          nextDateStr(last.endDate) === r.date &&
          memKey(last) === memKey(r)
        ) {
          last.endDate = r.date;
          last.end = r.end;
          continue;
        }
        merged.push({ ...r, endDate: r.date });
      }
      finalResults = merged;
    } else {
      // 不合併：將每個重疊區塊依各成員「原始時段邊界」拆成多段獨立列出
      const splitResults = [];
      for (const r of results) {
        const rStart = timeToMin(r.start);
        const rEnd = timeToMin(r.end);
        // 收集區塊內所有成員 range 的邊界點
        const boundaries = new Set([rStart, rEnd]);
        for (const m of r.members) {
          const av = allAvailability.find((a) => a.userId === m.userId);
          if (!av) continue;
          parseSlots(av.availableSlots)
            .filter((x) => x.date === r.date)
            .forEach((x) => {
              const s = timeToMin(x.start);
              const e = timeToMin(x.end);
              if (s > rStart && s < rEnd) boundaries.add(s);
              if (e > rStart && e < rEnd) boundaries.add(e);
            });
        }
        const sortedBoundaries = [...boundaries].sort((a, b) => a - b);
        for (let i = 0; i < sortedBoundaries.length - 1; i++) {
          splitResults.push({
            date: r.date,
            endDate: r.date,
            start: minToTime(sortedBoundaries[i]),
            end: minToTime(sortedBoundaries[i + 1]),
            members: r.members,
          });
        }
      }
      finalResults = splitResults;
    }

    setFilteredResults(finalResults);
    setIsFiltered(true);
  };

  // ─── 建立事件 ───
  const handleCreateEvent = async () => {
    if (!selectedResult) return;
    const typeInfo = allEventTypes.find((t) => t.value === eventType);
    const title = typeInfo?.label || eventType || "事件";

    const r = selectedResult;
    try {
      const typeMap = {
        discussion: "meeting",
        practice: "practice",
        competition: "competition",
        submission: "deadline",
        custom: "other",
      };
      const internalType = typeMap[eventType] || eventType; // 自訂類型以字串本身儲存
      // 將 r.end="24:00" 轉成隔天的 00:00
      let realEndDate = r.endDate || r.date;
      let realEndTime = r.end;
      if (realEndTime === "24:00") {
        const d = new Date(`${realEndDate}T00:00:00`);
        d.setDate(d.getDate() + 1);
        realEndDate = toDateStr(d);
        realEndTime = "00:00";
      }
      await createTeamEvent(teamId, {
        title,
        type: internalType,
        startTime: new Date(`${r.date}T${r.start}:00`),
        endTime: new Date(`${realEndDate}T${realEndTime}:00`),
        description: directEventDescription,
        tags: directEventTags,
        creatorInfo: {
          userId: currentUser.uid,
          userName: currentUser.displayName || currentUser.email,
          userEmail: currentUser.email,
        },
      });
      alert("事件已建立！");
      setShowEventForm(false);
      setSelectedResult(null);
      setCustomEventName("");
      setDirectEventTags([]);
      setDirectEventDescription("");
      setCustomTagInput("");
      // 手動重新查詢，防止訂閱失效時暫不更新
      getTeamEvents(teamId).then(setEvents).catch(console.error);
    } catch (err) {
      console.error("建立事件失敗:", err);
      alert("建立失敗，請稍後再試");
    }
  };

  // ─── 直接建立事件（支援跨日）───
  const handleDirectCreateEvent = async () => {
    if (!directEventDate) {
      alert("請選擇日期");
      return;
    }
    const endDate = directEventEndDate || directEventDate;
    if (endDate < directEventDate) {
      alert("結束日期必須晚於或等於開始日期");
      return;
    }
    if (endDate === directEventDate && directEventStart >= directEventEnd) {
      alert("結束時間必須晚於開始時間");
      return;
    }
    const typeInfoDirect = allEventTypes.find(
      (t) => t.value === directEventType,
    );
    const title = typeInfoDirect?.label || directEventType || "事件";

    try {
      const typeMap = {
        discussion: "meeting",
        practice: "practice",
        competition: "competition",
        submission: "deadline",
        custom: "other",
      };
      const internalType = typeMap[directEventType] || directEventType;
      const payload = {
        title,
        type: internalType,
        startTime: new Date(`${directEventDate}T${directEventStart}:00`),
        endTime: new Date(`${endDate}T${directEventEnd}:00`),
        description: directEventDescription,
        tags: directEventTags,
      };
      if (editingEventId) {
        await updateTeamEvent(editingEventId, payload);
        alert("事件已更新！");
      } else {
        await createTeamEvent(teamId, {
          ...payload,
          creatorInfo: {
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email,
            userEmail: currentUser.email,
          },
        });
        alert("事件已建立！");
      }
      setShowDirectEventForm(false);
      setEditingEventId(null);
      setDirectEventName("");
      setDirectEventEndDate("");
      setDirectEventDescription("");
      setDirectEventTags([]);
      setCustomTagInput("");
      // 訂閱 (subscribeToTeamEvents) 會自動同步，不再手動 setEvents 以免覆蓋新資料
    } catch (err) {
      console.error("儲存事件失敗:", err);
      alert("儲存失敗，請稍後再試");
    }
  };

  // 開啟編輯表單（套用「直接建立事件」表單）
  const handleEditEvent = (event) => {
    const toDt = (ts) => (ts?.toDate ? ts.toDate() : new Date(ts));
    const start = event.startTime ? toDt(event.startTime) : new Date();
    const end = event.endTime ? toDt(event.endTime) : null;
    const startDs = toDateStr(start);
    const endDs = end ? toDateStr(end) : startDs;
    const fmtTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    // 對應 type 到表單 value
    const typeReverseMap = {
      meeting: "discussion",
      practice: "practice",
      competition: "competition",
      deadline: "submission",
      other: "custom",
    };
    // 內建內部類型 → 表單 value；其他視為「使用者自訂類型」，直接以原本類型字串作為 value
    const formType = typeReverseMap[event.type] || event.type || "custom";
    setEditingEventId(event.id);
    setDirectEventDate(startDs);
    setDirectEventEndDate(endDs === startDs ? "" : endDs);
    setDirectEventStart(fmtTime(start));
    setDirectEventEnd(end ? fmtTime(end) : "10:00");
    setDirectEventType(formType);
    setDirectEventName(formType === "custom" ? event.title || "" : "");
    setDirectEventDescription(event.description || "");
    setDirectEventTags(Array.isArray(event.tags) ? [...event.tags] : []);
    setCustomTagInput("");
    setShowDirectEventForm(true);
  };

  // 取得目前隊伍日曆中已使用過的標籤（去重排序）
  const availableTeamTags = useMemo(() => {
    const set = new Set();
    events.forEach((e) =>
      (e.tags || []).forEach((t) => {
        const v = (t || "").toString().trim();
        if (v) set.add(v);
      }),
    );
    return Array.from(set).sort();
  }, [events]);

  // 切換標籤勾選
  const toggleEventTag = (tag) => {
    setDirectEventTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  // 新增自訂標籤
  const handleAddCustomTag = () => {
    const v = customTagInput.trim();
    if (!v) return;
    setDirectEventTags((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setCustomTagInput("");
  };

  // 從現有事件聚合「自訂事件類型」（內部 type 不在 BUILTIN_INTERNAL_TYPES 內）
  const customEventTypes = useMemo(() => {
    const set = new Set();
    events.forEach((e) => {
      if (
        e.type &&
        !BUILTIN_INTERNAL_TYPES.has(e.type) &&
        !hiddenCustomTypes.has(e.type)
      )
        set.add(e.type);
    });
    // 若表單目前選的類型是新自訂，先暫時顯示
    if (
      directEventType &&
      !EVENT_TYPES.some((t) => t.value === directEventType)
    )
      set.add(directEventType);
    if (eventType && !EVENT_TYPES.some((t) => t.value === eventType))
      set.add(eventType);
    return Array.from(set).sort();
  }, [events, directEventType, eventType, hiddenCustomTypes]);

  const allEventTypes = useMemo(
    () => [
      ...EVENT_TYPES,
      ...customEventTypes.map((t) => ({
        value: t,
        label: t,
        custom: true,
      })),
    ],
    [customEventTypes],
  );

  // 新增自訂類型：直接套用為目前表單的 type
  const handleAddCustomType = (which) => {
    const v = customTypeInput.trim();
    if (!v) return;
    // 若之前被隱藏，重新可見
    if (hiddenCustomTypes.has(v)) {
      const next = new Set(hiddenCustomTypes);
      next.delete(v);
      persistHidden(next);
    }
    if (which === "direct") setDirectEventType(v);
    else setEventType(v);
    setCustomTypeInput("");
  };

  // 當前視圖事件（含跨日 overlap）
  const visibleEvents = useMemo(() => {
    const getRange = (e) => {
      const s = e.startTime?.toDate?.() || new Date(e.startTime);
      const en =
        e.endTime?.toDate?.() ||
        (e.endTime ? new Date(e.endTime) : new Date(s.getTime() + 60 * 60_000));
      return [s.getTime(), en.getTime()];
    };
    if (viewMode === "week") {
      const ws = new Date(weekDates[0]);
      ws.setHours(0, 0, 0, 0);
      const we = new Date(weekDates[6]);
      we.setHours(23, 59, 59, 999);
      return events.filter((e) => {
        const [s, en] = getRange(e);
        return s <= we.getTime() && en >= ws.getTime();
      });
    }
    const ms = new Date(mYear, mMonth, 1).getTime();
    const me = new Date(mYear, mMonth + 1, 0, 23, 59, 59, 999).getTime();
    return events.filter((e) => {
      const [s, en] = getRange(e);
      return s <= me && en >= ms;
    });
  }, [events, viewMode, weekDates, mYear, mMonth]);

  // ─── Loading ───
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">載入日曆中...</p>
      </div>
    );
  }

  // 排序後的 ranges
  const sortedRanges = [...myRanges].sort(
    (a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start),
  );

  return (
    <div>
      {/* 標題 + 視圖切換 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">隊伍日曆</h2>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
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
      </div>

      {/* 代表色 */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-700 mb-2">🎨 選擇你的代表色</h3>
        <div className="flex gap-2 flex-wrap">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              onClick={() => setMyColor(c)}
              className={`w-8 h-8 rounded-full border-2 transition ${myColor === c ? "border-gray-800 scale-110 shadow-md" : "border-transparent hover:scale-105"}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
          你的代表色：
          <span
            className="inline-block w-4 h-4 rounded"
            style={{ backgroundColor: myColor }}
          />
        </p>
      </div>

      {/* 成員圖例 */}
      {allAvailability.length > 0 && (
        <div className="mb-4 p-3 bg-white border border-gray-200 rounded-lg">
          <h4 className="text-sm font-medium text-gray-600 mb-2">
            👥 成員代表色
          </h4>
          <div className="flex gap-3 flex-wrap">
            {allAvailability.map((a) => {
              const mem = members.find((m) => m.id === a.userId);
              return (
                <div
                  key={a.userId}
                  className="flex items-center gap-1.5 text-sm"
                >
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: a.color || "#6B7280" }}
                  />
                  <span className="text-gray-700">
                    {mem?.displayName || mem?.email || "未知"}
                    {a.userId === currentUser.uid && " (我)"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 導航 */}
      {viewMode === "week" ? (
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={prevWeek}
            className="px-3 py-1.5 bg-gray-200 rounded hover:bg-gray-300 transition text-sm"
          >
            ← 上週
          </button>
          <div className="text-center">
            <span className="font-medium text-gray-800">
              {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
            </span>
            <button
              onClick={goThisWeek}
              className="ml-2 text-sm text-blue-600 hover:underline"
            >
              本週
            </button>
          </div>
          <button
            onClick={nextWeek}
            className="px-3 py-1.5 bg-gray-200 rounded hover:bg-gray-300 transition text-sm"
          >
            下週 →
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={prevMonth}
            className="px-3 py-1.5 bg-gray-200 rounded hover:bg-gray-300 transition text-sm"
          >
            ← 上月
          </button>
          <div className="text-center">
            <span className="font-medium text-gray-800">
              {mYear} 年 {mMonth + 1} 月
            </span>
            <button
              onClick={goThisMonth}
              className="ml-2 text-sm text-blue-600 hover:underline"
            >
              本月
            </button>
          </div>
          <button
            onClick={nextMonth}
            className="px-3 py-1.5 bg-gray-200 rounded hover:bg-gray-300 transition text-sm"
          >
            下月 →
          </button>
        </div>
      )}

      {/* 新增可用時間 */}
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <p className="text-xs text-gray-500">
          💡 {viewMode === "week" ? "點擊格子快速選 30 分鐘，或" : ""}
          使用表單新增精確到分鐘的時間
        </p>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
        >
          {showAddForm ? "收起" : "+ 新增精確時間"}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium text-gray-700 mb-3">
            新增可用時間（支援跨日，分鐘精度）
          </h4>
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                開始日期
              </label>
              <input
                type="date"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                開始時間
              </label>
              <input
                type="time"
                value={addStart}
                onChange={(e) => setAddStart(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                結束日期（可跨日，留空＝同一天）
              </label>
              <input
                type="date"
                value={addEndDate}
                onChange={(e) => setAddEndDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                結束時間
              </label>
              <input
                type="time"
                value={addEnd}
                onChange={(e) => setAddEnd(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
            <button
              onClick={handleAddRange}
              className="px-4 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm font-medium"
            >
              新增
            </button>
          </div>
        </div>
      )}

      {/* 我的時間列表 */}
      {sortedRanges.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-600 mb-2">
            我的可用時間（{sortedRanges.length} 段）
          </h4>
          <div className="flex gap-2 flex-wrap">
            {sortedRanges.map((r, i) => (
              <span
                key={`${r.date}-${r.start}-${r.end}-${i}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-white"
                style={{ backgroundColor: myColor }}
              >
                {r.date.slice(5)} {r.start}-{r.end}
                <button
                  onClick={() => removeRange(r)}
                  className="ml-0.5 hover:text-red-200 font-bold"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ══════ 週曆 ══════ */}
      {viewMode === "week" && (
        <div className="overflow-x-auto mb-4 border border-gray-300 rounded-lg">
          <table
            className="w-full border-collapse text-sm"
            style={{ minWidth: 500 }}
          >
            <thead>
              <tr>
                <th className="border-b border-r border-gray-300 bg-gray-100 p-1.5 w-16 text-xs sticky left-0 z-10">
                  時間
                </th>
                {weekDates.map((date, i) => (
                  <th
                    key={i}
                    className="border-b border-r border-gray-300 bg-gray-100 p-1.5 text-xs"
                  >
                    <div className="font-bold">週{DAY_NAMES[i]}</div>
                    <div className="text-gray-500">{formatDate(date)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slot) => (
                <tr key={slot}>
                  <td className="border-b border-r border-gray-200 bg-gray-50 p-1 text-center text-xs font-mono sticky left-0 z-10">
                    {slot}
                  </td>
                  {weekDates.map((date, di) => {
                    const ds = toDateStr(date);
                    const isMine = myCoversSlot(ds, slot);
                    const slotMem = getSlotMembers(ds, slot);
                    const slotEvts = getSlotEvents(ds, slot);
                    const hasEvt = slotEvts.length > 0;

                    return (
                      <td
                        key={di}
                        onClick={() => handleGridClick(date, slot)}
                        className={`border-b border-r border-gray-200 p-0.5 cursor-pointer transition-all relative ${hasEvt ? "" : "hover:bg-blue-50"}`}
                        style={
                          isMine
                            ? {
                                backgroundColor: myColor + "25",
                                outline: `2px solid ${myColor}`,
                                outlineOffset: "-2px",
                              }
                            : {}
                        }
                        title={`${ds} ${slot}\n${slotMem.length > 0 ? `${slotMem.length} 人可以` : "點擊選擇"}`}
                      >
                        <div className="flex flex-wrap gap-0.5 min-h-[18px] justify-center items-center">
                          {slotMem.map((m, idx) => (
                            <span
                              key={idx}
                              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: m.color }}
                            />
                          ))}
                        </div>
                        {hasEvt &&
                          (() => {
                            const evtType = slotEvts[0].type || "other";
                            const evtBgMap = {
                              meeting: "bg-blue-400",
                              practice: "bg-green-400",
                              competition: "bg-orange-400",
                              deadline: "bg-red-400",
                              other: "bg-gray-400",
                            };
                            const evt = slotEvts[0];
                            const label = getEventLabelForDate(evt, ds);
                            return (
                              <div
                                className={`absolute bottom-0 left-0 right-0 ${evtBgMap[evtType] || evtBgMap.other} text-white text-[7px] leading-tight text-center truncate px-0.5 font-medium`}
                              >
                                {label + (evt.title ? " " + evt.title : "")}
                              </div>
                            );
                          })()}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════ 月曆 ══════ */}
      {viewMode === "month" && (
        <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-100">
            {DAY_NAMES.map((d) => (
              <div
                key={d}
                className="text-center py-2 text-xs font-bold text-gray-600 border-b border-gray-300"
              >
                週{d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDates.map((date, i) => {
              const ds = toDateStr(date);
              const isCurMonth = date.getMonth() === mMonth;
              const isToday = ds === toDateStr(new Date());
              const dayMem = getDateMembers(ds);
              const dayEvts = getDateEvents(ds);

              return (
                <div
                  key={i}
                  onClick={() => {
                    setWeekStart(getMonday(date));
                    setViewMode("week");
                  }}
                  className={`min-h-[80px] p-1.5 border-b border-r border-gray-200 cursor-pointer hover:bg-blue-50 transition ${
                    isCurMonth ? "" : "bg-gray-50 opacity-50"
                  } ${isToday ? "bg-blue-50 ring-2 ring-inset ring-blue-400" : ""}`}
                >
                  <div
                    className={`text-xs font-medium mb-1 ${isToday ? "text-blue-600" : "text-gray-700"}`}
                  >
                    {date.getDate()}
                  </div>
                  <div className="flex flex-wrap gap-0.5 mb-1">
                    {dayMem.map((m, idx) => (
                      <span
                        key={idx}
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: m.color }}
                      />
                    ))}
                  </div>
                  {dayEvts.slice(0, 2).map((evt, idx) => {
                    const evtType = evt.type || "other";
                    const evtStyleMap = {
                      meeting: "bg-blue-100 text-blue-800",
                      practice: "bg-green-100 text-green-800",
                      competition: "bg-orange-100 text-orange-800",
                      deadline: "bg-red-100 text-red-800",
                      other: "bg-gray-100 text-gray-800",
                    };
                    const label = getEventLabelForDate(evt, ds);
                    return (
                      <div
                        key={idx}
                        className={`text-[9px] leading-tight ${evtStyleMap[evtType] || evtStyleMap.other} rounded px-1 mb-0.5 truncate`}
                      >
                        {label + (evt.title ? " " + evt.title : "")}
                      </div>
                    );
                  })}
                  {dayEvts.length > 2 && (
                    <div className="text-[8px] text-gray-400">
                      +{dayEvts.length - 2}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 儲存 & 直接建立事件 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
        >
          {saving ? "儲存中..." : "💾 儲存我的時間"}
        </button>
        <button
          onClick={() => {
            setShowDirectEventForm(true);
            setEditingEventId(null);
            setDirectEventDate(toDateStr(new Date()));
            setDirectEventEndDate("");
            setDirectEventStart("09:00");
            setDirectEventEnd("10:00");
            setDirectEventType("discussion");
            setDirectEventName("");
            setDirectEventDescription("");
            setDirectEventTags([]);
            setCustomTagInput("");
          }}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
        >
          📅 直接建立事件
        </button>
      </div>

      {/* 篩選 */}
      <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200 mb-6">
        <h3 className="font-bold text-gray-800 mb-3">🔍 篩選重疊時間</h3>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm text-gray-700">至少</label>
          <select
            value={minOverlap}
            onChange={(e) => setMinOverlap(Number(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <label className="text-sm text-gray-700">人時間重疊</label>
          <button
            onClick={handleFilter}
            className="px-4 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition font-medium"
          >
            篩選
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-700">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={mergeConsecutive}
              onChange={(e) => setMergeConsecutive(e.target.checked)}
              className="w-4 h-4"
            />
            <span>
              連續時段合併為同一事件（含跨日，例如 5/24 22:00 ~ 5/25 02:00）
            </span>
          </label>
        </div>
      </div>

      {/* 篩選結果 */}
      {isFiltered && (
        <div className="mb-6">
          <h3 className="font-bold text-gray-800 mb-3">
            📋 篩選結果（{filteredResults.length} 個時段）
          </h3>
          {filteredResults.length === 0 ? (
            <p className="text-gray-500 bg-gray-50 rounded-lg p-4 text-center">
              找不到符合條件的重疊時段
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {filteredResults.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">
                      {formatResultLabel(r)}
                    </p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {r.members.map((m) => (
                        <span
                          key={m.userId}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-white"
                          style={{ backgroundColor: m.color }}
                        >
                          {m.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedResult(r);
                      setShowEventForm(true);
                      setEventType("discussion");
                      setCustomEventName("");
                      setDirectEventDescription(
                        `參與成員：${r.members.map((m) => m.name).join("、")}`,
                      );
                      setDirectEventTags([]);
                      setCustomTagInput("");
                    }}
                    className="ml-3 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition flex-shrink-0"
                  >
                    + 建立事件
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 建立事件 Modal（筱選結果） */}
      {showEventForm && selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-1">建立事件</h3>
            <p className="text-sm text-gray-500 mb-4">
              📅 {formatResultLabel(selectedResult)}
            </p>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {/* 左側：事件標籤 */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col h-full">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  🏷️ 事件標籤
                </label>
                <div className="flex-1 min-h-[60px] max-h-40 overflow-y-auto pr-1">
                  {availableTeamTags.length === 0 &&
                  directEventTags.filter((t) => !availableTeamTags.includes(t))
                    .length === 0 ? (
                    <p className="text-xs text-gray-400">
                      尚無標籤，可於下方新增自訂標籤
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(
                        new Set([...availableTeamTags, ...directEventTags]),
                      ).map((tag) => {
                        const active = directEventTags.includes(tag);
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
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {allEventTypes.map((t) => {
                    const active = eventType === t.value;
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
                            name="eventType"
                            value={t.value}
                            checked={active}
                            onChange={(e) => setEventType(e.target.value)}
                            className="text-blue-600 flex-shrink-0"
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
                        handleAddCustomType("filter");
                      }
                    }}
                    placeholder="新增自訂類型..."
                    className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCustomType("filter")}
                    className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 whitespace-nowrap"
                  >
                    + 新增
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                備註（選填）
              </label>
              <textarea
                value={directEventDescription}
                onChange={(e) => setDirectEventDescription(e.target.value)}
                rows={3}
                placeholder="事件備註說明..."
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                👥 參與成員：
                {selectedResult.members.map((m) => m.name).join("、")}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCreateEvent}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                確認建立
              </button>
              <button
                onClick={() => {
                  setShowEventForm(false);
                  setSelectedResult(null);
                  setCustomEventName("");
                  setDirectEventDescription("");
                  setDirectEventTags([]);
                  setCustomTagInput("");
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 直接建立事件 Modal */}
      {showDirectEventForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {editingEventId ? "✏️ 編輯事件" : "📅 建立事件"}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                開始日期
              </label>
              <input
                type="date"
                value={directEventDate}
                onChange={(e) => setDirectEventDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                結束日期（可跨日，留空＝同一天）
              </label>
              <input
                type="date"
                value={directEventEndDate}
                onChange={(e) => setDirectEventEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始時間
                </label>
                <input
                  type="time"
                  value={directEventStart}
                  onChange={(e) => setDirectEventStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  結束時間
                </label>
                <input
                  type="time"
                  value={directEventEnd}
                  onChange={(e) => setDirectEventEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {/* 左側：事件標籤 */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col h-full">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  🏷️ 事件標籤
                </label>
                <div className="flex-1 min-h-[60px] max-h-40 overflow-y-auto pr-1">
                  {availableTeamTags.length === 0 &&
                  directEventTags.filter((t) => !availableTeamTags.includes(t))
                    .length === 0 ? (
                    <p className="text-xs text-gray-400">
                      尚無標籤，可於下方新增自訂標籤
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(
                        new Set([...availableTeamTags, ...directEventTags]),
                      ).map((tag) => {
                        const active = directEventTags.includes(tag);
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
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {allEventTypes.map((t) => {
                    const active = directEventType === t.value;
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
                            name="directEventType"
                            value={t.value}
                            checked={active}
                            onChange={(e) => setDirectEventType(e.target.value)}
                            className="text-blue-600 flex-shrink-0"
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
                        handleAddCustomType("direct");
                      }
                    }}
                    placeholder="新增自訂類型..."
                    className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCustomType("direct")}
                    className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 whitespace-nowrap"
                  >
                    + 新增
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                備註（選填）
              </label>
              <textarea
                value={directEventDescription}
                onChange={(e) => setDirectEventDescription(e.target.value)}
                rows={3}
                placeholder="事件備註說明..."
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDirectCreateEvent}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                {editingEventId ? "確認更新" : "確認建立"}
              </button>
              <button
                onClick={() => {
                  setShowDirectEventForm(false);
                  setEditingEventId(null);
                  setDirectEventName("");
                  setDirectEventEndDate("");
                  setDirectEventDescription("");
                  setDirectEventTags([]);
                  setCustomTagInput("");
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 事件列表 */}
      {events.length > 0 && (
        <div className="mt-4">
          <h3 className="font-bold text-gray-800 mb-3">
            📅 所有隊伍事件（{events.length}）
          </h3>
          <div className="space-y-2">
            {events.map((event) => {
              const start =
                event.startTime?.toDate?.() || new Date(event.startTime);
              const typeColors = {
                meeting: "border-l-blue-500",
                practice: "border-l-green-500",
                competition: "border-l-orange-500",
                deadline: "border-l-red-500",
                other: "border-l-gray-500",
              };
              const TYPE_LABELS = {
                meeting: "討論",
                practice: "練習賽",
                competition: "比賽",
                deadline: "一辯稿繳交",
                other: "其他",
              };
              const typeLabel = TYPE_LABELS[event.type] || event.type || "";
              // 若事件標題本身就是類型名稱（常見於自訂類型），不再重複顯示徽章
              const showTypeBadge =
                typeLabel && typeLabel !== (event.title || "").trim();
              return (
                <div
                  key={event.id}
                  className={`bg-white border border-gray-200 border-l-4 ${typeColors[event.type] || typeColors.other} rounded-lg p-3`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="font-medium text-gray-800">
                        {event.title}
                      </span>
                      {showTypeBadge && (
                        <span className="inline-block bg-gray-100 text-gray-700 text-xs px-1.5 py-0.5 rounded">
                          {typeLabel}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {(() => {
                          const end =
                            event.endTime?.toDate?.() ||
                            (event.endTime ? new Date(event.endTime) : null);
                          let label =
                            start && !isNaN(start)
                              ? start.toLocaleString("zh-TW", {
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "";
                          if (end && !isNaN(end)) {
                            label += ` ~ ${end.toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}`;
                          }
                          return label;
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEditEvent(event)}
                        className="text-blue-500 hover:text-blue-700 transition"
                        title="編輯事件"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={async () => {
                          if (
                            !window.confirm(`確定要刪除「${event.title}」嗎？`)
                          )
                            return;
                          try {
                            await deleteTeamEvent(event.id);
                          } catch (err) {
                            console.error("刪除事件失敗:", err);
                            alert("刪除失敗，請稍後再試");
                          }
                        }}
                        className="text-red-400 hover:text-red-600 transition"
                        title="刪除事件"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  {event.description && (
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                      {event.description}
                    </p>
                  )}
                  {Array.isArray(event.tags) && event.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {event.tags.map((tag) => (
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
