/**
 * 通知隊伍成員有新成員加入
 * @param {string} teamId - 隊伍 ID
 * @param {string} teamName - 隊伍名稱
 * @param {string} newMemberName - 新成員名稱
 * @param {Array<string>} memberIds - 所有隊員 ID（含新成員）
 * @param {string} newMemberId - 新成員 ID
 */
export const notifyTeamMemberAdded = async (
  teamId,
  teamName,
  newMemberName,
  memberIds,
  newMemberId,
) => {
  try {
    // 通知所有隊員（排除新成員自己）
    await createBatchNotifications(
      memberIds.filter((id) => id !== newMemberId),
      NOTIFICATION_TYPES.TEAM_MEMBER_ADDED,
      `${teamName} 有新隊員加入`,
      `${newMemberName} 已加入隊伍！`,
      teamId,
      `/team/${teamId}`,
      { newMemberId, newMemberName },
    );
  } catch (error) {
    console.error("❌ 發送新隊員加入通知失敗:", error);
  }
};
// 通知觸發幫助函數
// 封裝常見的通知觸發場景

import {
  createNotification,
  createBatchNotifications,
  NOTIFICATION_TYPES,
} from "./notifications";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";
import { db } from "./config";

/**
 * 發送聊天訊息通知
 * @param {string} teamId - 隊伍或練習賽 ID
 * @param {string} senderId - 發送者 ID
 * @param {string} senderName - 發送者名稱
 * @param {string} message - 訊息內容
 * @param {Array<string>} recipientIds - 接收者 ID 列表（排除發送者）
 * @param {string} type - 'team' 或 'match'
 */
export const notifyChatMessage = async (
  teamId,
  senderId,
  senderName,
  message,
  recipientIds,
  type = "team",
) => {
  try {
    const linkTo =
      type === "team"
        ? `/team/${teamId}`
        : `/practice-match-discussion/${teamId}`;

    const title = `${senderName} 發送了新訊息`;
    const content =
      message.length > 50 ? message.substring(0, 50) + "..." : message;

    await createBatchNotifications(
      recipientIds.filter((id) => id !== senderId),
      NOTIFICATION_TYPES.CHAT_MESSAGE,
      title,
      content,
      teamId,
      linkTo,
      { senderId, senderName, type },
    );
  } catch (error) {
    console.error("❌ 發送聊天通知失敗:", error);
  }
};

/**
 * 發送盃賽更新通知
 * @param {string} tournamentId - 盃賽 ID
 * @param {string} tournamentName - 盃賽名稱
 * @param {string} updateType - 更新類型（如 '辯題公布', '循環圖更新' 等）
 * @param {Array<string>} recipientIds - 接收者 ID 列表（參賽隊伍的所有成員）
 */
export const notifyTournamentUpdate = async (
  tournamentId,
  tournamentName,
  updateType,
  recipientIds,
) => {
  try {
    const title = `${tournamentName}`;
    const message = `盃賽有新的更新：${updateType}`;

    await createBatchNotifications(
      recipientIds,
      NOTIFICATION_TYPES.TOURNAMENT_UPDATE,
      title,
      message,
      tournamentId,
      `/tournament/${tournamentId}`,
      { updateType },
    );
  } catch (error) {
    console.error("❌ 發送盃賽更新通知失敗:", error);
  }
};

/**
 * 發送會議開始通知
 * @param {string} teamId - 隊伍或練習賽 ID
 * @param {string} teamName - 隊伍或練習賽名稱
 * @param {string} starterId - 發起者 ID
 * @param {string} starterName - 發起者名稱
 * @param {Array<string>} recipientIds - 接收者 ID 列表（排除發起者）
 * @param {string} type - 'team' 或 'match'
 */
export const notifyMeetingStart = async (
  teamId,
  teamName,
  starterId,
  starterName,
  recipientIds,
  type = "team",
) => {
  try {
    const linkTo =
      type === "team"
        ? `/team/${teamId}`
        : `/practice-match-discussion/${teamId}`;

    const title = `${starterName} 發起了會議`;
    const message = `在 ${teamName} 中開始了語音會議，快來加入吧！`;

    await createBatchNotifications(
      recipientIds.filter((id) => id !== starterId),
      NOTIFICATION_TYPES.MEETING_START,
      title,
      message,
      teamId,
      linkTo,
      { starterId, starterName, type },
    );
  } catch (error) {
    console.error("❌ 發送會議開始通知失敗:", error);
  }
};

/**
 * 發送會議提醒通知
 * @param {string} eventId - 事件 ID
 * @param {string} eventTitle - 事件標題
 * @param {Date} eventTime - 事件時間
 * @param {Array<string>} recipientIds - 接收者 ID 列表
 * @param {string} teamId - 相關隊伍 ID
 */
export const notifyMeetingReminder = async (
  eventId,
  eventTitle,
  eventTime,
  recipientIds,
  teamId,
) => {
  try {
    const title = `會議提醒：${eventTitle}`;
    const timeStr = new Date(eventTime).toLocaleString("zh-TW");
    const message = `您的會議將在 ${timeStr} 開始`;

    await createBatchNotifications(
      recipientIds,
      NOTIFICATION_TYPES.MEETING_REMINDER,
      title,
      message,
      eventId,
      `/team/${teamId}`,
      { eventTime: timeStr },
    );
  } catch (error) {
    console.error("❌ 發送會議提醒通知失敗:", error);
  }
};

/**
 * 發送練習賽邀請通知
 * @param {string} invitationId - 邀請 ID
 * @param {string} fromTeamName - 邀請方隊伍名稱
 * @param {string} toTeamName - 被邀請隊伍名稱
 * @param {Array<string>} recipientIds - 被邀請隊伍成員 ID 列表
 * @param {string} tournamentName - 相關盃賽名稱
 * @param {string} toTeamId - 被邀請隊伍 ID
 */
export const notifyPracticeInvitation = async (
  invitationId,
  fromTeamName,
  toTeamName,
  recipientIds,
  tournamentName,
  toTeamId,
) => {
  try {
    const title = `${fromTeamName} 邀請您練習賽`;
    const message = `${fromTeamName} 想與 ${toTeamName} 進行 ${tournamentName} 的練習賽`;
    const linkTo = toTeamId
      ? `/team/${toTeamId}?tab=invitations`
      : "/practice-matches";

    await createBatchNotifications(
      recipientIds,
      NOTIFICATION_TYPES.PRACTICE_INVITATION,
      title,
      message,
      invitationId,
      linkTo,
      { fromTeamName, toTeamName, tournamentName },
    );
  } catch (error) {
    console.error("❌ 發送練習賽邀請通知失敗:", error);
  }
};

/**
 * 發送邀請回應通知
 * @param {string} invitationId - 邀請 ID
 * @param {string} fromTeamName - 原邀請方隊伍名稱
 * @param {string} toTeamName - 回應方隊伍名稱
 * @param {Array<string>} recipientIds - 原邀請方隊伍成員 ID 列表
 * @param {string} response - 回應類型（'accepted' 或 'declined'）
 */
export const notifyInvitationResponse = async (
  invitationId,
  fromTeamName,
  toTeamName,
  recipientIds,
  response,
) => {
  try {
    const isAccepted = response === "accepted";
    const title = isAccepted
      ? `${toTeamName} 接受了您的邀請！`
      : `${toTeamName} 婉拒了您的邀請`;
    const message = isAccepted
      ? `${toTeamName} 接受了練習賽邀請，開始討論時間吧！`
      : `${toTeamName} 暫時無法參加練習賽`;

    await createBatchNotifications(
      recipientIds,
      NOTIFICATION_TYPES.INVITATION_RESPONSE,
      title,
      message,
      invitationId,
      "/practice-matches",
      { fromTeamName, toTeamName, response },
    );
  } catch (error) {
    console.error("❌ 發送邀請回應通知失敗:", error);
  }
};

/**
 * 發送日曆事件通知
 * @param {string} eventId - 事件 ID
 * @param {string} eventTitle - 事件標題
 * @param {Date} eventTime - 事件時間
 * @param {Array<string>} recipientIds - 接收者 ID 列表
 * @param {string} teamId - 相關隊伍 ID
 */
export const notifyCalendarEvent = async (
  eventId,
  eventTitle,
  eventTime,
  recipientIds,
  teamId,
) => {
  try {
    const title = `新活動：${eventTitle}`;
    const timeStr = new Date(eventTime).toLocaleString("zh-TW");
    const message = `活動時間：${timeStr}`;

    await createBatchNotifications(
      recipientIds,
      NOTIFICATION_TYPES.CALENDAR_EVENT,
      title,
      message,
      eventId,
      `/team/${teamId}`,
      { eventTime: timeStr },
    );
  } catch (error) {
    console.error("❌ 發送日曆事件通知失敗:", error);
  }
};

/**
 * 發送檔案上傳通知
 * @param {string} fileId - 檔案 ID
 * @param {string} fileName - 檔案名稱
 * @param {string} uploaderId - 上傳者 ID
 * @param {string} uploaderName - 上傳者名稱
 * @param {Array<string>} recipientIds - 接收者 ID 列表（排除上傳者）
 * @param {string} teamId - 隊伍或練習賽 ID
 * @param {string} type - 'team' 或 'match'
 */
export const notifyFileUpload = async (
  fileId,
  fileName,
  uploaderId,
  uploaderName,
  recipientIds,
  teamId,
  type = "team",
) => {
  try {
    const linkTo =
      type === "team"
        ? `/team/${teamId}`
        : `/practice-match-discussion/${teamId}`;

    const title = `${uploaderName} 上傳了新檔案`;
    const message = `檔案名稱：${fileName}`;

    await createBatchNotifications(
      recipientIds.filter((id) => id !== uploaderId),
      NOTIFICATION_TYPES.FILE_UPLOAD,
      title,
      message,
      fileId,
      linkTo,
      { uploaderId, uploaderName, fileName, type },
    );
  } catch (error) {
    console.error("❌ 發送檔案上傳通知失敗:", error);
  }
};

/**
 * 發送錄音上傳通知
 * @param {string} recordingId - 錄音 ID
 * @param {string} recordingName - 錄音名稱
 * @param {string} uploaderId - 上傳者 ID
 * @param {string} uploaderName - 上傳者名稱
 * @param {Array<string>} recipientIds - 接收者 ID 列表（排除上傳者）
 * @param {string} teamId - 隊伍或練習賽 ID
 * @param {string} type - 'team' 或 'match'
 */
export const notifyRecordingUpload = async (
  recordingId,
  recordingName,
  uploaderId,
  uploaderName,
  recipientIds,
  teamId,
  type = "team",
) => {
  try {
    const linkTo =
      type === "team"
        ? `/team/${teamId}`
        : `/practice-match-discussion/${teamId}`;

    const title = `${uploaderName} 上傳了新錄音`;
    const message = `錄音名稱：${recordingName}`;

    await createBatchNotifications(
      recipientIds.filter((id) => id !== uploaderId),
      NOTIFICATION_TYPES.RECORDING_UPLOAD,
      title,
      message,
      recordingId,
      linkTo,
      { uploaderId, uploaderName, recordingName, type },
    );
  } catch (error) {
    console.error("❌ 發送錄音上傳通知失敗:", error);
  }
};

/**
 * 發送反饋通知
 * @param {string} feedbackId - 反饋 ID
 * @param {string} fromName - 發送者名稱
 * @param {string} feedbackType - 反饋類型
 * @param {string} contentPreview - 反饋內容預覽
 * @param {Array<string>} recipientIds - 接收者 ID 列表
 */
export const notifyFeedback = async (
  feedbackId,
  fromName,
  feedbackType,
  contentPreview,
  recipientIds,
) => {
  try {
    const title = `新反饋：${feedbackType}`;
    const message = `${fromName} 提交了反饋${contentPreview ? `：${contentPreview}...` : ""}`;

    await createBatchNotifications(
      recipientIds,
      NOTIFICATION_TYPES.FEEDBACK,
      title,
      message,
      feedbackId,
      `/feedback`,
      { fromName, feedbackType },
    );
  } catch (error) {
    console.error("❌ 發送反饋通知失敗:", error);
  }
};

/**
 * 發送被加入隊伍通知
 * @param {string} teamId - 隊伍 ID
 * @param {string} teamName - 隊伍名稱
 * @param {string} addedUserId - 被加入的用戶 ID
 * @param {string} adderName - 執行加入的人名稱
 */

/**
 * 獲取隊伍所有成員的 ID
 * @param {string} teamId - 隊伍 ID
 * @returns {Promise<Array<string>>} 成員 ID 列表
 */
export const getTeamMemberIds = async (teamId) => {
  try {
    const teamDoc = await getDoc(doc(db, "teams", teamId));
    if (teamDoc.exists()) {
      return teamDoc.data().members || [];
    }
    return [];
  } catch (error) {
    console.error("❌ 獲取隊伍成員失敗:", error);
    return [];
  }
};

/**
 * 發送練習賽取消請求通知
 * @param {string} matchId - 練習賽 ID
 * @param {string} requestingTeamName - 發起取消的隊伍名稱
 * @param {Array<string>} recipientIds - 雙方隊伍所有成員 ID
 */
export const notifyMatchCancelRequest = async (
  matchId,
  requestingTeamName,
  recipientIds,
) => {
  try {
    const title = `${requestingTeamName} 請求取消練習賽`;
    const message = `${requestingTeamName} 已發送取消練習賽的請求，等待對方隊伍同意`;

    await createBatchNotifications(
      recipientIds,
      NOTIFICATION_TYPES.MATCH_CANCEL_REQUEST,
      title,
      message,
      matchId,
      `/practice-match-discussion/${matchId}`,
      { requestingTeamName },
    );
  } catch (error) {
    console.error("❌ 發送取消練習賽請求通知失敗:", error);
  }
};

/**
 * 發送練習賽已取消通知
 * @param {string} matchId - 練習賽 ID
 * @param {string} fromTeamName - 隊伍1名稱
 * @param {string} toTeamName - 隊伍2名稱
 * @param {Array<string>} recipientIds - 雙方隊伍所有成員 ID
 */
export const notifyMatchCancelled = async (
  matchId,
  fromTeamName,
  toTeamName,
  recipientIds,
) => {
  try {
    const title = `練習賽已取消`;
    const message = `${fromTeamName} vs ${toTeamName} 的練習賽已正式取消`;

    await createBatchNotifications(
      recipientIds,
      NOTIFICATION_TYPES.MATCH_CANCELLED,
      title,
      message,
      matchId,
      "/practice-matches",
      { fromTeamName, toTeamName },
    );
  } catch (error) {
    console.error("❌ 發送練習賽已取消通知失敗:", error);
  }
};

/**
 * 發送練習賽過期自動刪除通知
 * @param {string} matchId - 練習賽 ID
 * @param {string} fromTeamName - 隊伍1名稱
 * @param {string} toTeamName - 隊伍2名稱
 * @param {string} matchDate - 練習賽日期
 * @param {Array<string>} recipientIds - 雙方隊伍所有成員 ID
 */
export const notifyMatchExpired = async (
  matchId,
  fromTeamName,
  toTeamName,
  matchDate,
  recipientIds,
) => {
  try {
    const title = `練習賽已過期`;
    const message = `${fromTeamName} vs ${toTeamName}（${matchDate}）的練習賽已過期，討論房間已自動刪除`;

    await createBatchNotifications(
      recipientIds,
      NOTIFICATION_TYPES.MATCH_CANCELLED,
      title,
      message,
      matchId,
      "/practice-matches",
      { fromTeamName, toTeamName, matchDate, reason: "expired" },
    );
  } catch (error) {
    console.error("❌ 發送練習賽過期通知失敗:", error);
  }
};

/**
 * 獲取練習賽雙方隊伍的所有成員 ID
 * @param {string} matchId - 練習賽 ID
 * @returns {Promise<Array<string>>} 成員 ID 列表
 */
export const getMatchParticipantIds = async (matchId) => {
  try {
    const matchDoc = await getDoc(doc(db, "practice_matches", matchId));
    if (matchDoc.exists()) {
      const matchData = matchDoc.data();
      // 優先用 fromTeam/toTeam，fallback 到 affirmativeTeam/negativeTeam
      const team1 = matchData.fromTeam || matchData.affirmativeTeam;
      const team2 = matchData.toTeam || matchData.negativeTeam;

      const allIds = [];
      if (team1) {
        const ids1 = await getTeamMemberIds(team1);
        allIds.push(...ids1);
      }
      if (team2) {
        const ids2 = await getTeamMemberIds(team2);
        allIds.push(...ids2);
      }
      return allIds;
    }
    return [];
  } catch (error) {
    console.error("❌ 獲取練習賽參與者失敗:", error);
    return [];
  }
};

/**
 * 發送新公告通知給所有用戶
 * @param {string} announcementTitle - 公告標題
 * @param {string} senderId - 發布者（admin）的 UID，會被排除
 */
export const notifyNewAnnouncement = async (announcementTitle, senderId) => {
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    const allUserIds = usersSnap.docs
      .map((d) => d.id)
      .filter((id) => id !== senderId);

    if (allUserIds.length === 0) return;

    const title = "📢 新公告";
    const message =
      announcementTitle.length > 50
        ? announcementTitle.substring(0, 50) + "..."
        : announcementTitle;

    await createBatchNotifications(
      allUserIds,
      NOTIFICATION_TYPES.ANNOUNCEMENT,
      title,
      message,
      null,
      "/announcements",
    );
  } catch (error) {
    console.error("❌ 發送新公告通知失敗:", error);
  }
};
