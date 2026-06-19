// RefereeZone.jsx - 裁判區
// 顯示每位裁判近兩個月的「可邀裁」事件、邀裁日曆，並讓選手篩選與練習賽時間重疊的裁判後一鍵發送邀請

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getUserTeams, getTeam } from "../firebase/teams";
import { getTournament } from "../firebase/tournaments";
import { getUserPracticeMatches } from "../firebase/practiceMatches";
import { getInvitation } from "../firebase/invitations";
import { subscribeToAllAvailability } from "../firebase/refereeEvents";
import { getAllReferees } from "../firebase/referees";
import {
  getSentRefereeInvitations,
  createRefereeInvitationsBatch,
} from "../firebase/refereeInvitations";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;

function getTime(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val) ? null : val.getTime();
  if (typeof val === "object" && typeof val.toDate === "function")
    return val.toDate().getTime();
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    return isNaN(d) ? null : d.getTime();
  }
  return null;
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fmtRange(startMs, endMs) {
  if (startMs == null) return "";
  const s = new Date(startMs);
  const e = endMs != null ? new Date(endMs) : null;
  const md = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
  const hm = (d) =>
    d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
  if (!e) return `${md(s)} ${hm(s)}`;
  const sameDay = toDateKey(s) === toDateKey(e);
  return sameDay
    ? `${md(s)} ${hm(s)} ~ ${hm(e)}`
    : `${md(s)} ${hm(s)} ~ ${md(e)} ${hm(e)}`;
}

export function RefereeZone() {
  const { currentUser } = useAuth();
  const [availability, setAvailability] = useState([]);
  const [myMatches, setMyMatches] = useState([]);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [selected, setSelected] = useState({}); // { matchId: { refereeId: true } }
  const [sending, setSending] = useState(false);
  const [calDate, setCalDate] = useState(new Date());

  // 直接邀請相關狀態
  const [allReferees, setAllReferees] = useState([]);
  const [directMatchId, setDirectMatchId] = useState("");
  const [directSelected, setDirectSelected] = useState({}); // { refereeId: true }
  const [directSending, setDirectSending] = useState(false);

  // 訂閱所有裁判的「可邀裁」事件
  useEffect(() => {
    const unsub = subscribeToAllAvailability((events) => {
      setAvailability(events);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const teams = await getUserTeams(currentUser.uid);
      const teamIds = teams.map((t) => t.id);

      const [matches, sent] = await Promise.all([
        teamIds.length ? getUserPracticeMatches(teamIds) : Promise.resolve([]),
        getSentRefereeInvitations(currentUser.uid),
      ]);
      setSentInvitations(sent);

      try {
        const refs = await getAllReferees();
        setAllReferees(refs.filter((r) => r.userId !== currentUser.uid));
      } catch (e) {
        console.warn("載入裁判清單失敗:", e?.message);
      }

      const enriched = await Promise.all(
        matches.map(async (m) => {
          try {
            const fromId = m.fromTeam || m.affirmativeTeam;
            const toId = m.toTeam || m.negativeTeam;
            const [fromTeam, toTeam, tournament] = await Promise.all([
              getTeam(fromId),
              getTeam(toId),
              getTournament(m.tournamentId).catch(() => null),
            ]);
            if (!tournament) return null;

            // 取得練習賽時間（優先讀邀請的 practiceTime / endTime）
            let startMs = null;
            let endMs = null;
            if (m.invitationId) {
              try {
                const inv = await getInvitation(m.invitationId);
                startMs = getTime(inv.practiceTime);
                endMs = getTime(inv.endTime);
              } catch {
                /* ignore */
              }
            }
            if (startMs == null && m.matchInfo?.date) {
              startMs = getTime(m.matchInfo.date);
            }

            const myIsFrom = teamIds.includes(fromId);
            const myTeam = myIsFrom ? fromTeam : toTeam;
            const opponent = myIsFrom ? toTeam : fromTeam;

            return {
              id: m.id,
              tournamentId: tournament.id,
              tournamentName: tournament.name,
              fromTeam: fromId,
              toTeam: toId,
              fromTeamName: fromTeam?.name || "A隊",
              toTeamName: toTeam?.name || "B隊",
              myTeamName: myTeam?.name || "我方",
              opponentName: opponent?.name || "對手",
              startMs,
              endMs: endMs != null ? endMs : startMs,
            };
          } catch {
            return null;
          }
        }),
      );
      setMyMatches(enriched.filter(Boolean));
    } catch (err) {
      console.error("載入裁判區資料失敗:", err);
    } finally {
      setLoading(false);
    }
  };

  // 近兩個月內的「可邀裁」事件
  const upcomingAvailability = useMemo(() => {
    const now = Date.now();
    const limit = now + TWO_MONTHS_MS;
    return availability
      .map((ev) => ({
        ...ev,
        _start: getTime(ev.startTime),
        _end: getTime(ev.endTime) ?? getTime(ev.startTime),
      }))
      .filter((ev) => ev._start != null && ev._end >= now && ev._start <= limit)
      .sort((a, b) => a._start - b._start);
  }, [availability]);

  // 依裁判分組
  const byReferee = useMemo(() => {
    const map = new Map();
    upcomingAvailability.forEach((ev) => {
      if (!map.has(ev.refereeId)) {
        map.set(ev.refereeId, {
          refereeId: ev.refereeId,
          refereeName: ev.refereeName || "未具名裁判",
          events: [],
        });
      }
      map.get(ev.refereeId).events.push(ev);
    });
    return Array.from(map.values()).sort((a, b) =>
      a.refereeName.localeCompare(b.refereeName),
    );
  }, [upcomingAvailability]);

  // 篩選：每場練習賽與裁判可邀裁事件時間重疊
  const overlapByMatch = useMemo(() => {
    if (!showFilter) return [];
    return myMatches
      .filter((m) => m.startMs != null)
      .map((m) => {
        const mEnd = m.endMs != null ? m.endMs : m.startMs;
        const refs = upcomingAvailability.filter(
          (ev) => ev._start <= mEnd && ev._end >= m.startMs,
        );
        // 依裁判去重（取最早一筆重疊事件）
        const seen = new Map();
        refs.forEach((ev) => {
          if (!seen.has(ev.refereeId)) seen.set(ev.refereeId, ev);
        });
        return { match: m, referees: Array.from(seen.values()) };
      })
      .filter((row) => row.referees.length > 0);
  }, [showFilter, myMatches, upcomingAvailability]);

  const invitationStatusFor = (matchId, refereeId) => {
    const inv = sentInvitations.find(
      (i) => i.matchId === matchId && i.refereeId === refereeId,
    );
    return inv?.status || null;
  };

  const matchHasAccepted = (matchId) =>
    sentInvitations.some(
      (i) => i.matchId === matchId && i.status === "accepted",
    );

  const toggleSelect = (matchId, refereeId) => {
    setSelected((prev) => {
      const cur = { ...(prev[matchId] || {}) };
      if (cur[refereeId]) delete cur[refereeId];
      else cur[refereeId] = true;
      return { ...prev, [matchId]: cur };
    });
  };

  const handleSendInvites = async (row) => {
    const sel = selected[row.match.id] || {};
    const refereeIds = Object.keys(sel).filter((id) => sel[id]);
    if (refereeIds.length === 0) {
      alert("請至少選擇一位裁判");
      return;
    }
    const referees = row.referees
      .filter((ev) => refereeIds.includes(ev.refereeId))
      .map((ev) => ({ id: ev.refereeId, name: ev.refereeName }));
    if (!window.confirm(`確定發送邀請給 ${referees.length} 位裁判嗎？`)) return;

    try {
      setSending(true);
      await createRefereeInvitationsBatch({
        matchId: row.match.id,
        tournamentId: row.match.tournamentId,
        tournamentName: row.match.tournamentName,
        fromUserId: currentUser.uid,
        fromUserName: currentUser.displayName || currentUser.email || "選手",
        fromTeam: row.match.fromTeam,
        toTeam: row.match.toTeam,
        fromTeamName: row.match.fromTeamName,
        toTeamName: row.match.toTeamName,
        practiceTime: row.match.startMs ? new Date(row.match.startMs) : null,
        endTime: row.match.endMs ? new Date(row.match.endMs) : null,
        referees,
      });
      setSelected((prev) => ({ ...prev, [row.match.id]: {} }));
      const sent = await getSentRefereeInvitations(currentUser.uid);
      setSentInvitations(sent);
      alert("邀請已發送！先同意的裁判將配對成功。");
    } catch (err) {
      console.error("發送邀裁邀請失敗:", err);
      alert(err?.message || "發送失敗，請稍後再試");
    } finally {
      setSending(false);
    }
  };

  // 有排定時間的練習賽（供直接邀請選擇）
  const matchesWithTime = useMemo(
    () => myMatches.filter((m) => m.startMs != null),
    [myMatches],
  );

  const toggleDirectSelect = (refereeId) => {
    setDirectSelected((prev) => {
      const cur = { ...prev };
      if (cur[refereeId]) delete cur[refereeId];
      else cur[refereeId] = true;
      return cur;
    });
  };

  const handleDirectInvite = async () => {
    const match = matchesWithTime.find((m) => m.id === directMatchId);
    if (!match) {
      alert("請先選擇要邀請裁判的練習賽");
      return;
    }
    if (matchHasAccepted(match.id)) {
      alert("此場練習賽已配對裁判，無法再發送邀請");
      return;
    }
    const refereeIds = Object.keys(directSelected).filter(
      (id) => directSelected[id],
    );
    if (refereeIds.length === 0) {
      alert("請至少選擇一位裁判");
      return;
    }
    const referees = allReferees
      .filter((r) => refereeIds.includes(r.userId))
      .map((r) => ({ id: r.userId, name: r.name }));
    if (!window.confirm(`確定發送邀請給 ${referees.length} 位裁判嗎？`)) return;

    try {
      setDirectSending(true);
      await createRefereeInvitationsBatch({
        matchId: match.id,
        tournamentId: match.tournamentId,
        tournamentName: match.tournamentName,
        fromUserId: currentUser.uid,
        fromUserName: currentUser.displayName || currentUser.email || "選手",
        fromTeam: match.fromTeam,
        toTeam: match.toTeam,
        fromTeamName: match.fromTeamName,
        toTeamName: match.toTeamName,
        practiceTime: match.startMs ? new Date(match.startMs) : null,
        endTime: match.endMs ? new Date(match.endMs) : null,
        referees,
      });
      setDirectSelected({});
      const sent = await getSentRefereeInvitations(currentUser.uid);
      setSentInvitations(sent);
      alert("邀請已發送！先同意的裁判將配對成功。");
    } catch (err) {
      console.error("直接邀請裁判失敗:", err);
      alert(err?.message || "發送失敗，請稍後再試");
    } finally {
      setDirectSending(false);
    }
  };

  // 邀裁日曆格子
  const calendarDays = useMemo(() => {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    let firstDay = new Date(year, month, 1).getDay();
    firstDay = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const days = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        cur: false,
      });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), cur: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), cur: false });
    }
    return days;
  }, [calDate]);

  const availabilityByDate = useMemo(() => {
    const map = {};
    availability.forEach((ev) => {
      const startMs = getTime(ev.startTime);
      const endMs = getTime(ev.endTime) ?? startMs;
      if (startMs == null) return;
      const cursor = new Date(startMs);
      cursor.setHours(0, 0, 0, 0);
      const last = new Date(endMs);
      last.setHours(0, 0, 0, 0);
      while (cursor.getTime() <= last.getTime()) {
        const key = toDateKey(cursor);
        if (!map[key]) map[key] = [];
        map[key].push(ev);
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return map;
  }, [availability]);

  const todayKey = toDateKey(new Date());

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">⚖️ 裁判區</h1>
        <p className="text-gray-600">
          查看裁判的可邀裁時段，並邀請裁判擔任您練習賽的評審。
        </p>
      </div>

      {/* 媒合方式說明 */}
      <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded mb-6">
        <h2 className="font-bold text-teal-800 mb-1">📋 邀裁媒合方式</h2>
        <p className="text-sm text-teal-700">
          點選「篩選」會列出與您練習賽時間重疊的裁判。勾選裁判後一鍵發送多筆邀請，
          <span className="font-semibold">
            先同意的裁判即配對成功，其餘邀請會自動取消
          </span>
          ，與隊伍練習賽媒合方式相同。配對成功的裁判會顯示於該場練習賽討論區的「邀裁區」。
        </p>
      </div>

      {/* 邀裁日曆 */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-gray-800">📅 邀裁日曆</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setCalDate(
                  new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1),
                )
              }
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 transition"
            >
              ◀
            </button>
            <span className="font-bold text-gray-800 min-w-[120px] text-center">
              {calDate.getFullYear()} 年 {calDate.getMonth() + 1} 月
            </span>
            <button
              onClick={() =>
                setCalDate(
                  new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1),
                )
              }
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 transition"
            >
              ▶
            </button>
            <button
              onClick={() => setCalDate(new Date())}
              className="px-3 py-1.5 bg-teal-600 text-white rounded hover:bg-teal-700 transition text-sm"
            >
              今天
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-2">
          顯示所有裁判的「可邀裁」時段（標註裁判姓名）
        </p>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-100">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="py-2 text-center text-sm font-medium text-gray-600"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((info, idx) => {
              const key = toDateKey(info.date);
              const evs = availabilityByDate[key] || [];
              const isToday = key === todayKey;
              return (
                <div
                  key={idx}
                  className={`min-h-[84px] p-1.5 border-b border-r border-gray-200 ${
                    info.cur ? "" : "bg-gray-50"
                  } ${isToday ? "ring-2 ring-inset ring-teal-400" : ""}`}
                >
                  <div
                    className={`text-xs font-medium mb-1 ${
                      isToday
                        ? "text-teal-600"
                        : info.cur
                          ? "text-gray-700"
                          : "text-gray-400"
                    }`}
                  >
                    {info.date.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {evs.slice(0, 3).map((ev, i) => (
                      <div
                        key={i}
                        className="truncate text-[11px] rounded px-1 py-0.5 bg-teal-100 text-teal-800"
                        title={`${ev.refereeName}：${ev.title || "可邀裁"}`}
                      >
                        {ev.refereeName}
                      </div>
                    ))}
                    {evs.length > 3 && (
                      <div className="text-[10px] text-gray-400">
                        +{evs.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 篩選 */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-gray-800">🔍 邀請裁判</h2>
          <button
            onClick={() => setShowFilter((v) => !v)}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition text-sm"
          >
            {showFilter ? "收合篩選" : "篩選"}
          </button>
        </div>
        {!showFilter ? (
          <p className="text-sm text-gray-500">
            點選「篩選」，列出與您各場練習賽（盃賽、對手隊伍、時間）時間重疊的裁判。
          </p>
        ) : myMatches.filter((m) => m.startMs != null).length === 0 ? (
          <p className="text-sm text-gray-500">
            您目前沒有已排定時間的練習賽。請先前往
            <Link
              to="/practice-matches"
              className="text-blue-600 underline mx-1"
            >
              練習賽討論區
            </Link>
            建立練習賽。
          </p>
        ) : overlapByMatch.length === 0 ? (
          <p className="text-sm text-gray-500">
            目前沒有與您練習賽時間重疊的可邀裁裁判。
          </p>
        ) : (
          <div className="space-y-4">
            {overlapByMatch.map((row) => {
              const accepted = matchHasAccepted(row.match.id);
              return (
                <div
                  key={row.match.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="mb-3">
                    <p className="font-semibold text-gray-800">
                      {row.match.tournamentName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {row.match.myTeamName} vs {row.match.opponentName}
                    </p>
                    <p className="text-sm text-gray-500">
                      🕒 {fmtRange(row.match.startMs, row.match.endMs)}
                    </p>
                  </div>

                  {accepted ? (
                    <div className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded">
                      ✅ 此場已配對裁判，邀請流程結束。
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 mb-3">
                        {row.referees.map((ev) => {
                          const status = invitationStatusFor(
                            row.match.id,
                            ev.refereeId,
                          );
                          const checked = !!(selected[row.match.id] || {})[
                            ev.refereeId
                          ];
                          return (
                            <label
                              key={ev.refereeId}
                              className="flex items-center gap-2 p-2 rounded border border-gray-100 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={status === "pending"}
                                onChange={() =>
                                  toggleSelect(row.match.id, ev.refereeId)
                                }
                                className="w-4 h-4"
                              />
                              <span className="flex-1 text-sm text-gray-800">
                                {ev.refereeName}
                                <span className="text-gray-400 ml-2 text-xs">
                                  可邀裁 {fmtRange(ev._start, ev._end)}
                                </span>
                              </span>
                              {status === "pending" && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                                  已邀請
                                </span>
                              )}
                              {status === "declined" && (
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                  已拒絕
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => handleSendInvites(row)}
                        disabled={sending}
                        className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition text-sm disabled:bg-gray-400"
                      >
                        {sending ? "發送中..." : "發送邀請"}
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 每位裁判近兩個月的可邀裁時段 */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-3">
          🧑‍⚖️ 裁判可邀裁時段（近兩個月）
        </h2>
        {byReferee.length === 0 ? (
          <p className="text-sm text-gray-500">目前沒有裁判提供可邀裁時段。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {byReferee.map((ref) => (
              <div
                key={ref.refereeId}
                className="border border-gray-200 rounded-lg p-4"
              >
                <p className="font-semibold text-gray-800 mb-2">
                  {ref.refereeName}
                </p>
                <ul className="space-y-1">
                  {ref.events.map((ev) => (
                    <li
                      key={ev.id}
                      className="text-sm text-gray-600 flex items-center gap-2"
                    >
                      <span className="inline-block w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
                      {fmtRange(ev._start, ev._end)}
                      {ev.title ? (
                        <span className="text-gray-400">— {ev.title}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 直接邀請：列出所有註冊裁判 */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mt-6">
        <h2 className="text-xl font-bold text-gray-800 mb-3">
          📨 直接邀請裁判
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          不受可邀裁時段限制，可直接邀請任一位註冊裁判。選擇練習賽與裁判後點「直接邀請」，
          一鍵發送多筆邀請；先同意的裁判即配對成功，其餘邀請會自動取消。
        </p>

        {matchesWithTime.length === 0 ? (
          <p className="text-sm text-gray-500">
            您目前沒有已排定時間的練習賽。請先前往
            <Link
              to="/practice-matches"
              className="text-blue-600 underline mx-1"
            >
              練習賽討論區
            </Link>
            建立練習賽。
          </p>
        ) : allReferees.length === 0 ? (
          <p className="text-sm text-gray-500">目前沒有其他註冊為裁判的人。</p>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                選擇練習賽
              </label>
              <select
                value={directMatchId}
                onChange={(e) => setDirectMatchId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">請選擇練習賽…</option>
                {matchesWithTime.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.tournamentName}｜{m.myTeamName} vs {m.opponentName}｜
                    {fmtRange(m.startMs, m.endMs)}
                  </option>
                ))}
              </select>
            </div>

            {directMatchId && matchHasAccepted(directMatchId) ? (
              <div className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded">
                ✅ 此場已配對裁判，邀請流程結束。
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                  {allReferees.map((ref) => {
                    const status = directMatchId
                      ? invitationStatusFor(directMatchId, ref.userId)
                      : null;
                    const checked = !!directSelected[ref.userId];
                    return (
                      <label
                        key={ref.userId}
                        className="flex items-center gap-2 p-2 rounded border border-gray-100 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={status === "pending"}
                          onChange={() => toggleDirectSelect(ref.userId)}
                          className="w-4 h-4"
                        />
                        <span className="flex-1 text-sm text-gray-800">
                          {ref.name}
                          {ref.gender && (
                            <span className="text-gray-400 ml-2 text-xs">
                              （{ref.gender}）
                            </span>
                          )}
                        </span>
                        {status === "pending" && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                            已邀請
                          </span>
                        )}
                        {status === "declined" && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            已拒絕
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
                <button
                  onClick={handleDirectInvite}
                  disabled={directSending || !directMatchId}
                  className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition text-sm disabled:bg-gray-400"
                >
                  {directSending ? "發送中..." : "直接邀請"}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
