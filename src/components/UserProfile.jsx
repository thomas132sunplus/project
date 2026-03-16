// UserProfile.jsx - 個人主頁
// 顯示個人資料、所屬隊伍、個人日曆等

import { useState, useEffect } from "react";
import { getUser, updateUser, createOrUpdateUser } from "../firebase/users";
import { getUserTeams } from "../firebase/teams";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { PersonalCalendar } from "./PersonalCalendar";

export function UserProfile() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("teams"); // teams, calendar
  const [userData, setUserData] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

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
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm self-start flex-shrink-0"
          >
            {isEditing ? "取消編輯" : "✏️ 編輯資料"}
          </button>
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
                  年級
                </label>
                <input
                  type="text"
                  placeholder="年級"
                  value={editForm.grade}
                  onChange={(e) =>
                    handleEditFormChange("grade", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  電話
                </label>
                <input
                  type="tel"
                  placeholder="電話"
                  value={editForm.phoneNumber}
                  onChange={(e) =>
                    handleEditFormChange("phoneNumber", e.target.value)
                  }
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
        </div>

        {/* Tab 內容 */}
        <div className="p-3 md:p-6">
          {activeTab === "teams" && <TeamsSection teams={teams} />}
          {activeTab === "calendar" && <CalendarSection />}
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
function CalendarSection() {
  return <PersonalCalendar />;
}
