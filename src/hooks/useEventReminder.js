// useEventReminder Hook
// 客戶端定時檢查即將到來的事件，自動發送提醒通知

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getUserTeams } from "../firebase/teams";
import { getTeamEvents } from "../firebase/teamEvents";
import {
  notifyMeetingReminder,
  getTeamMemberIds,
} from "../firebase/notificationHelpers";

// 檢查間隔：每 2 分鐘
const CHECK_INTERVAL_MS = 2 * 60 * 1000;
// 預設提醒分鐘數（事件開始前多久提醒）
const DEFAULT_REMINDER_MINUTES = 15;

export const useEventReminder = () => {
  const { currentUser } = useAuth();
  const [nextEvent, setNextEvent] = useState(null);
  const remindedEventsRef = useRef(new Set());

  // 從 localStorage 恢復已提醒的事件 ID，避免重複提醒
  useEffect(() => {
    try {
      const saved = localStorage.getItem("remindedEventIds");
      if (saved) {
        const parsed = JSON.parse(saved);
        // 只保留 24 小時內的記錄
        const now = Date.now();
        const valid = parsed.filter(
          (item) => now - item.time < 24 * 60 * 60 * 1000,
        );
        remindedEventsRef.current = new Set(valid.map((item) => item.id));
        localStorage.setItem("remindedEventIds", JSON.stringify(valid));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const saveRemindedEvent = useCallback((eventId) => {
    remindedEventsRef.current.add(eventId);
    try {
      const saved = localStorage.getItem("remindedEventIds");
      const arr = saved ? JSON.parse(saved) : [];
      arr.push({ id: eventId, time: Date.now() });
      localStorage.setItem("remindedEventIds", JSON.stringify(arr));
    } catch {
      // ignore
    }
  }, []);

  const checkUpcomingEvents = useCallback(async () => {
    if (!currentUser) return;

    try {
      // 獲取用戶所有隊伍
      const teams = await getUserTeams(currentUser.uid);
      if (teams.length === 0) return;

      const now = new Date();
      // 查詢未來 60 分鐘內的事件
      const futureLimit = new Date(now.getTime() + 60 * 60 * 1000);

      for (const team of teams) {
        const events = await getTeamEvents(team.id, now, futureLimit);

        for (const event of events) {
          // 跳過已經提醒過的事件
          if (remindedEventsRef.current.has(event.id)) continue;

          const eventTime = event.startTime?.toDate
            ? event.startTime.toDate()
            : new Date(event.startTime);

          const minutesUntilEvent = (eventTime - now) / (1000 * 60);

          // 取得提醒設定的分鐘數
          const reminderMinutes =
            event.reminder?.minutesBefore ?? DEFAULT_REMINDER_MINUTES;

          // 如果在提醒範圍內（且事件尚未開始）
          if (minutesUntilEvent > 0 && minutesUntilEvent <= reminderMinutes) {
            // 標記為已提醒
            saveRemindedEvent(event.id);

            // 獲取隊伍成員並發送通知
            const memberIds = await getTeamMemberIds(team.id);
            if (memberIds.length > 0) {
              await notifyMeetingReminder(
                event.id,
                event.title,
                eventTime,
                memberIds,
                team.id,
              );
              console.log(
                `✅ 已發送事件提醒：${event.title}（${Math.round(minutesUntilEvent)} 分鐘後開始）`,
              );
            }

            // 更新下一個即將到來的事件
            setNextEvent({
              title: event.title,
              time: eventTime,
              minutesLeft: Math.round(minutesUntilEvent),
              teamName: team.name,
            });
          }
        }
      }
    } catch (error) {
      console.error("檢查事件提醒失敗:", error);
    }
  }, [currentUser, saveRemindedEvent]);

  // 設定定時檢查
  useEffect(() => {
    if (!currentUser) return;

    // 首次立即檢查
    checkUpcomingEvents();

    // 定時檢查
    const intervalId = setInterval(checkUpcomingEvents, CHECK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [currentUser, checkUpcomingEvents]);

  return { nextEvent };
};
