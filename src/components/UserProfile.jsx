// UserProfile.jsx - 個人主頁
// 顯示個人資料、所屬隊伍、個人日曆等

import { useState, useEffect } from "react";
import { getUser, updateUser, createOrUpdateUser } from "../firebase/users";
import {
  upsertRefereeRegistry,
  removeRefereeRegistry,
} from "../firebase/referees";
import { deleteAccount } from "../firebase/auth";
import { getUserTeams } from "../firebase/teams";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { PersonalCalendar } from "./PersonalCalendar";
import {
  getRefereeReceivedInvitations,
  acceptRefereeInvitation,
  declineRefereeInvitation,
} from "../firebase/refereeInvitations";

export function UserProfile() {
  // 展開個人檔案狀態
  const [showProfileDetail, setShowProfileDetail] = useState(false);
  const { currentUser } = useAuth();
  const location = useLocation();
  const initialTab =
    new URLSearchParams(location.search).get("tab") === "referee"
      ? "referee"
      : "teams";
  const [activeTab, setActiveTab] = useState(initialTab); // teams, calendar, referee
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [userData, setUserData] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // 裁判身分相關狀態
  const [showRefereeForm, setShowRefereeForm] = useState(false);
  const [savingReferee, setSavingReferee] = useState(false);
  const [refereeForm, setRefereeForm] = useState({
    name: "",
    gender: "",
    notes: "",
  });
  const [refereeInvitations, setRefereeInvitations] = useState([]);
  const [loadingRefInv, setLoadingRefInv] = useState(false);
  const [processingRefInvId, setProcessingRefInvId] = useState(null);

  const isReferee = !!userData?.isReferee;

  // 編輯表單的狀態
  const [editForm, setEditForm] = useState({
    displayName: "",
    school: "",
    grade: "",
    phoneNumber: "",
    isPublic: true,
  });

  const currentUserId = currentUser?.uid;

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);

      // 載入用戶資料
      const user = await getUser(currentUserId);
      if (user) {
        setUserData(user);
        // 初始化編輯表單
        setEditForm({
          displayName: user.displayName || "",
          school: user.school || "",
          grade: user.grade || "",
          phoneNumber: user.phoneNumber || "",
          isPublic: user.isPublic !== undefined ? user.isPublic : true,
        });
      } else {
        // 若用戶不存在，設定預設資料
        const defaultData = {
          id: currentUserId,
          displayName: "示範用戶",
          email: "demo@example.com",
          school: "建國中學",
          grade: "高二",
          role: "debater",
          isPublic: true,
          teams: [],
        };
        setUserData(defaultData);
        setEditForm({
          displayName: defaultData.displayName,
          school: defaultData.school,
          grade: defaultData.grade,
          phoneNumber: "",
          isPublic: defaultData.isPublic,
        });
      }

      // 載入隊伍資料
      const userTeams = await getUserTeams(currentUserId);
      setTeams(userTeams);
    } catch (err) {
      console.error("載入用戶資料失敗:", err);
    } finally {
      setLoading(false);
    }
  };

  // 處理表單輸入變更
  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 儲存變更
  const handleSave = async () => {
    try {
      setSaving(true);

      // 驗證必填欄位
      if (!editForm.displayName.trim()) {
        alert("請填寫姓名");
        setSaving(false);
        return;
      }

      // 準備更新資料
      const updates = {
        displayName: editForm.displayName.trim(),
        school: editForm.school.trim(),
        grade: editForm.grade.trim(),
        phoneNumber: editForm.phoneNumber.trim(),
        isPublic: editForm.isPublic,
      };

      // 更新 Firestore
      if (userData && userData.email) {
        // 如果用戶已存在，更新資料
        await createOrUpdateUser(currentUserId, {
          ...updates,
          email: userData.email,
          role: userData.role || "debater",
        });
      } else {
        // 建立新用戶
        await createOrUpdateUser(currentUserId, {
          ...updates,
          email: "demo@example.com",
          role: "debater",
        });
      }

      // 更新本地狀態
      setUserData((prev) => ({
        ...prev,
        ...updates,
      }));

      alert("儲存成功！");
      setIsEditing(false);

      // 重新載入資料
      await loadUserData();
    } catch (error) {
      console.error("儲存失敗:", error);
      alert("儲存失敗，請稍後再試");
    } finally {
      setSaving(false);
    }
  };

  // 同步裁判表單預設值
  useEffect(() => {
    if (userData?.refereeProfile) {
      setRefereeForm({
        name: userData.refereeProfile.name || userData.displayName || "",
        gender: userData.refereeProfile.gender || "",
        notes: userData.refereeProfile.notes || "",
      });
    } else if (userData) {
      setRefereeForm((prev) => ({
        ...prev,
        name: prev.name || userData.displayName || "",
      }));
    }
  }, [userData]);

  // 載入裁判收到的邀請
  const loadRefereeInvitations = async () => {
    if (!currentUserId) return;
    try {
      setLoadingRefInv(true);
      const list = await getRefereeReceivedInvitations(currentUserId);
      setRefereeInvitations(list);
    } catch (err) {
      console.error("載入邀裁邀請失敗:", err);
    } finally {
      setLoadingRefInv(false);
    }
  };

  useEffect(() => {
    if (isReferee && activeTab === "referee") {
      loadRefereeInvitations();
    }
  }, [isReferee, activeTab]);

  // 儲存裁判身分（註冊 / 更新）
  const handleSaveReferee = async () => {
    if (!refereeForm.name.trim()) {
      alert("請填寫裁判姓名");
      return;
    }
    try {
      setSavingReferee(true);
      const refereeProfile = {
        name: refereeForm.name.trim(),
        gender: refereeForm.gender.trim(),
        notes: refereeForm.notes.trim(),
      };
      await updateUser(currentUserId, {
        isReferee: true,
        refereeProfile,
      });
      try {
        await upsertRefereeRegistry(currentUserId, refereeProfile);
      } catch (e) {
        console.warn("更新裁判註冊表失敗:", e?.message);
      }
      setUserData((prev) => ({ ...prev, isReferee: true, refereeProfile }));
      setShowRefereeForm(false);
      alert("裁判身分已儲存！");
    } catch (err) {
      console.error("儲存裁判身分失敗:", err);
      alert("儲存失敗，請稍後再試");
    } finally {
      setSavingReferee(false);
    }
  };

  // 取消裁判身分
  const handleUnregisterReferee = async () => {
    if (!window.confirm("確定要取消裁判身分嗎？您將無法再收到邀裁邀請。"))
      return;
    try {
      setSavingReferee(true);
      await updateUser(currentUserId, { isReferee: false });
      try {
        await removeRefereeRegistry(currentUserId);
      } catch (e) {
        console.warn("移除裁判註冊表失敗:", e?.message);
      }
      setUserData((prev) => ({ ...prev, isReferee: false }));
      if (activeTab === "referee") setActiveTab("teams");
      alert("已取消裁判身分");
    } catch (err) {
      console.error("取消裁判身分失敗:", err);
      alert("操作失敗，請稍後再試");
    } finally {
      setSavingReferee(false);
    }
  };

  const handleAcceptRefInv = async (invitationId) => {
    if (!window.confirm("確定接受此邀裁邀請嗎？")) return;
    try {
      setProcessingRefInvId(invitationId);
      await acceptRefereeInvitation(invitationId);
      await loadRefereeInvitations();
      alert("已接受邀請，配對成功！");
    } catch (err) {
      console.error("接受邀裁邀請失敗:", err);
      alert(err?.message || "操作失敗，請稍後再試");
      await loadRefereeInvitations();
    } finally {
      setProcessingRefInvId(null);
    }
  };

  const handleDeclineRefInv = async (invitationId) => {
    if (!window.confirm("確定拒絕此邀裁邀請嗎？")) return;
    try {
      setProcessingRefInvId(invitationId);
      await declineRefereeInvitation(invitationId);
      await loadRefereeInvitations();
    } catch (err) {
      console.error("拒絕邀裁邀請失敗:", err);
      alert("操作失敗，請稍後再試");
    } finally {
      setProcessingRefInvId(null);
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
      {/* 個人資料卡片 */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 md:gap-6">
            {/* 頭像 */}
            <div className="w-16 h-16 md:w-24 md:h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl md:text-4xl font-bold flex-shrink-0">
              {userData?.displayName?.charAt(0) || "?"}
            </div>

            {/* 基本資訊 */}
            <div className="min-w-0">
              <h1 className="text-xl md:text-3xl font-bold text-gray-800 mb-1 md:mb-2 truncate">
                {userData?.displayName || "未命名"}
              </h1>
              <p className="text-sm md:text-base text-gray-600 mb-1">
                {userData?.school} | {userData?.grade}
              </p>
              <p className="text-sm md:text-base text-gray-600 truncate">
                {userData?.email}
              </p>
              <p className="text-xs md:text-sm text-gray-500 mt-1 md:mt-2">
                {userData?.isPublic ? "🌐 公開個人頁面" : "🔒 私密個人頁面"}
              </p>
            </div>
          </div>

          {/* 編輯按鈕 */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowProfileDetail((v) => !v)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm self-start flex-shrink-0"
            >
              {showProfileDetail ? "收合個人檔案" : "展開個人檔案"}
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm self-start flex-shrink-0"
            >
              {isEditing ? "取消編輯" : "✏️ 編輯資料"}
            </button>
          </div>
          {/* 展開個人檔案內容 */}
          {showProfileDetail && (
            <div className="mt-4 border-t pt-4">
              <h3 className="font-bold text-gray-800 mb-2">個人檔案</h3>
              <ul className="text-gray-700 text-sm md:text-base space-y-1">
                <li>
                  <span className="font-semibold">姓名：</span>
                  {userData?.displayName || "未命名"}
                </li>
                <li>
                  <span className="font-semibold">學校：</span>
                  {userData?.school || "-"}
                </li>
                <li>
                  <span className="font-semibold">字頭：</span>
                  {userData?.grade || "-"}
                </li>
                <li>
                  <span className="font-semibold">個人簡介：</span>
                  {userData?.bio || "-"}
                </li>
                <li>
                  <span className="font-semibold">Email：</span>
                  {userData?.email || "-"}
                </li>
                <li>
                  <span className="font-semibold">頁面狀態：</span>
                  {userData?.isPublic ? "🌐 公開" : "🔒 私密"}
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* 編輯表單 */}
        {isEditing && (
          <div className="border-t pt-6">
            <h3 className="font-bold text-gray-800 mb-4">編輯個人資料</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="姓名"
                  value={editForm.displayName}
                  onChange={(e) =>
                    handleEditFormChange("displayName", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  學校
                </label>
                <input
                  type="text"
                  placeholder="學校"
                  value={editForm.school}
                  onChange={(e) =>
                    handleEditFormChange("school", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  字頭
                </label>
                <input
                  type="text"
                  placeholder="2字"
                  value={editForm.grade}
                  onChange={(e) =>
                    handleEditFormChange("grade", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  個人簡介
                </label>
                <input
                  type="text"
                  placeholder="個人簡介"
                  value={editForm.bio || ""}
                  onChange={(e) => handleEditFormChange("bio", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={editForm.isPublic}
                onChange={(e) =>
                  handleEditFormChange("isPublic", e.target.checked)
                }
                className="w-4 h-4"
              />
              <label htmlFor="isPublic" className="text-gray-700">
                公開個人頁面（允許其他人查看）
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {saving ? "儲存中..." : "儲存變更"}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  // 重置表單為當前資料
                  setEditForm({
                    displayName: userData?.displayName || "",
                    school: userData?.school || "",
                    grade: userData?.grade || "",
                    phoneNumber: userData?.phoneNumber || "",
                    isPublic:
                      userData?.isPublic !== undefined
                        ? userData.isPublic
                        : true,
                  });
                }}
                disabled={saving}
                className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 裁判身分卡片 */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            ⚖️ 裁判身分
            {isReferee && (
              <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                已註冊
              </span>
            )}
          </h3>
          {!isReferee && !showRefereeForm && (
            <button
              onClick={() => setShowRefereeForm(true)}
              className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition text-sm"
            >
              註冊為裁判
            </button>
          )}
          {isReferee && !showRefereeForm && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowRefereeForm(true)}
                className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm"
              >
                ✏️ 編輯
              </button>
              <button
                onClick={handleUnregisterReferee}
                disabled={savingReferee}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition text-sm"
              >
                取消身分
              </button>
            </div>
          )}
        </div>

        {!isReferee && !showRefereeForm && (
          <p className="text-sm text-gray-500">
            註冊為裁判後，您可以在個人日曆新增「可邀裁」與「裁比賽」標籤，並在裁判區收到選手的邀裁邀請。
          </p>
        )}

        {isReferee && !showRefereeForm && (
          <ul className="text-gray-700 text-sm space-y-1">
            <li>
              <span className="font-semibold">裁判姓名：</span>
              {userData?.refereeProfile?.name || "-"}
            </li>
            <li>
              <span className="font-semibold">性別：</span>
              {userData?.refereeProfile?.gender || "（未填）"}
            </li>
            <li>
              <span className="font-semibold">備註：</span>
              {userData?.refereeProfile?.notes || "（無）"}
            </li>
            <li className="pt-2 text-teal-700">
              ⚖️ 在個人日曆上建立
              <span className="font-semibold">【可邀裁】</span>
              事件後，該時段會出現在
              <span className="font-semibold">裁判區的邀裁日曆</span>
              中（標註您的姓名），供選手邀請您擔任練習賽評審。
            </li>
          </ul>
        )}

        {showRefereeForm && (
          <div className="border-t pt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                裁判姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="裁判姓名"
                value={refereeForm.name}
                onChange={(e) =>
                  setRefereeForm((p) => ({ ...p, name: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                性別（選填）
              </label>
              <input
                type="text"
                placeholder="例如：男 / 女 / 其他"
                value={refereeForm.gender}
                onChange={(e) =>
                  setRefereeForm((p) => ({ ...p, gender: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                備註
              </label>
              <textarea
                placeholder="可填寫評審經歷、可裁賽制、聯絡方式等"
                rows={2}
                value={refereeForm.notes}
                onChange={(e) =>
                  setRefereeForm((p) => ({ ...p, notes: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveReferee}
                disabled={savingReferee}
                className="px-5 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition disabled:bg-gray-400"
              >
                {savingReferee ? "儲存中..." : "儲存裁判身分"}
              </button>
              <button
                onClick={() => setShowRefereeForm(false)}
                disabled={savingReferee}
                className="px-5 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tab 選單 */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="flex border-b overflow-x-auto">
          <TabButton
            label="👥 我的隊伍"
            active={activeTab === "teams"}
            onClick={() => setActiveTab("teams")}
          />
          <TabButton
            label="📅 個人日曆"
            active={activeTab === "calendar"}
            onClick={() => setActiveTab("calendar")}
          />
          {isReferee && (
            <TabButton
              label="⚖️ 裁判邀請"
              active={activeTab === "referee"}
              onClick={() => setActiveTab("referee")}
            />
          )}
        </div>
        <div className="p-3 md:p-6">
          {activeTab === "teams" && <TeamsSection teams={teams} />}
          {activeTab === "calendar" && (
            <CalendarSection
              isReferee={isReferee}
              refereeName={
                userData?.refereeProfile?.name || userData?.displayName || ""
              }
            />
          )}
          {activeTab === "referee" && (
            <RefereeInvitationsSection
              invitations={refereeInvitations}
              loading={loadingRefInv}
              processingId={processingRefInvId}
              onAccept={handleAcceptRefInv}
              onDecline={handleDeclineRefInv}
              onRefresh={loadRefereeInvitations}
            />
          )}
        </div>
      </div>

      {/* 危险區域：刪除帳號 */}
      <div className="mt-8 border border-red-200 rounded-lg p-5 bg-red-50">
        <h3 className="text-red-700 font-bold mb-2">危险區域</h3>
        <p className="text-sm text-red-600 mb-4">
          刪除帳號後，您的所有個人資料將被永久刪除且無法回復。隊伍相關資料（討論記錄等）將保留。
        </p>
        <button
          onClick={async () => {
            if (!window.confirm("確定要刪除帳號？此操作無法復原。")) return;
            if (!window.confirm("再次確認：您的所有個人資料將被永久刪除。"))
              return;
            try {
              setDeletingAccount(true);
              await deleteAccount(currentUser.uid);
              // 會自動登出，導航到登入頁
            } catch (err) {
              if (err.code === "auth/requires-recent-login") {
                alert("安全起見，請先登出後重新登入，再嘗試刪除。");
              } else {
                alert("刪除失敗，請稍後再試。");
              }
              setDeletingAccount(false);
            }
          }}
          disabled={deletingAccount}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium disabled:bg-gray-400"
        >
          {deletingAccount ? "刪除中..." : "🗑️ 刪除我的帳號"}
        </button>
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

// 隊伍區塊
function TeamsSection({ teams }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">所屬隊伍</h2>

      {teams.length === 0 ? (
        <p className="text-gray-500">尚未加入任何隊伍</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <Link
              key={team.id}
              to={`/team/${team.id}`}
              className="block border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition"
            >
              <h3 className="font-bold text-gray-800 mb-2">{team.name}</h3>
              <p className="text-sm text-gray-600 mb-1">🏫 {team.school}</p>
              <p className="text-sm text-gray-600">
                👥 {team.members?.length || 0} 位隊員
              </p>
              <div className="mt-3 text-blue-600 text-sm font-medium">
                進入隊伍討論區 →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// 日曆區塊
function CalendarSection({ isReferee, refereeName }) {
  return <PersonalCalendar isReferee={isReferee} refereeName={refereeName} />;
}

// 裁判邀請區塊（裁判收到的邀裁邀請）
function RefereeInvitationsSection({
  invitations,
  loading,
  processingId,
  onAccept,
  onDecline,
  onRefresh,
}) {
  const fmtTime = (val) => {
    if (!val) return "";
    const d = val?.toDate ? val.toDate() : new Date(val);
    if (isNaN(d)) return "";
    return d.toLocaleString("zh-TW", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusLabel = {
    pending: { text: "待回應", cls: "bg-yellow-100 text-yellow-800" },
    accepted: { text: "已接受", cls: "bg-green-100 text-green-800" },
    declined: { text: "已拒絕", cls: "bg-gray-100 text-gray-600" },
    cancelled: { text: "已取消", cls: "bg-gray-100 text-gray-500" },
  };

  const pending = invitations.filter((i) => i.status === "pending");
  const history = invitations.filter((i) => i.status !== "pending");

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">載入邀裁邀請中...</div>
    );
  }

  const renderCard = (inv) => {
    const s = statusLabel[inv.status] || statusLabel.pending;
    return (
      <div
        key={inv.id}
        className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <p className="font-semibold text-gray-800">
              {inv.tournamentName || "練習賽"}
            </p>
            <p className="text-sm text-gray-600">
              {inv.fromTeamName || "A隊"} vs {inv.toTeamName || "B隊"}
            </p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${s.cls}`}>
            {s.text}
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-1">
          🕒 {fmtTime(inv.practiceTime)}
          {inv.endTime ? ` ~ ${fmtTime(inv.endTime)}` : ""}
        </p>
        <p className="text-sm text-gray-500 mb-3">
          邀請人：{inv.fromUserName || "選手"}
        </p>
        {inv.status === "pending" && (
          <div className="flex gap-2">
            <button
              onClick={() => onAccept(inv.id)}
              disabled={processingId === inv.id}
              className="px-4 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm disabled:bg-gray-400"
            >
              {processingId === inv.id ? "處理中..." : "同意"}
            </button>
            <button
              onClick={() => onDecline(inv.id)}
              disabled={processingId === inv.id}
              className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition text-sm disabled:opacity-50"
            >
              拒絕
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">裁判邀請</h2>
        <button
          onClick={onRefresh}
          className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition text-sm"
        >
          🔄 重新整理
        </button>
      </div>

      {invitations.length === 0 ? (
        <p className="text-gray-500 text-center py-8">目前沒有邀裁邀請</p>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">
                待回應（{pending.length}）
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pending.map(renderCard)}
              </div>
            </div>
          )}
          {history.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2 mt-4">
                歷史紀錄
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {history.map(renderCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
