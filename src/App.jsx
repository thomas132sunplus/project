// 主應用程式元件
// 設定路由和整體頁面結構

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  Outlet,
} from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { InviteCodeGate } from "./components/InviteCodeGate";
import { Auth } from "./components/Auth";
import { useAuth } from "./contexts/AuthContext";
import { useEffect, useState } from "react";
import { MeetingRoomSurveyModal } from "./components/MeetingRoomSurveyModal";
import { db } from "./firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useEventReminder } from "./hooks/useEventReminder";
import { MyTeams } from "./components/MyTeams";
import { TeamDiscussion } from "./components/TeamDiscussion";
import { TournamentForm } from "./components/TournamentForm";
import { PracticeMatching } from "./components/PracticeMatching";
import { PracticeMatchList } from "./components/PracticeMatchList";

import { PracticeMatchDiscussion } from "./components/PracticeMatchDiscussion";
import { MatchRoom } from "./components/MatchRoom";
import { Feedback } from "./components/Feedback";
import { FeedbackList } from "./components/FeedbackList";
import { UserProfile } from "./components/UserProfile";
import { ActivityList } from "./components/ActivityList";
import { ActivityDetail } from "./components/ActivityDetail";
import { ActivityForm } from "./components/ActivityForm";

function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  // ...原本的邏輯（如果有）
  return currentUser ? children : <Navigate to="/auth" replace />;
}

export function AppRoutes() {
  const { currentUser } = useAuth();
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyChecked, setSurveyChecked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEventReminder();

  // 只彈一次：localStorage 控制
  useEffect(() => {
    if (currentUser) {
      const surveyDone = localStorage.getItem("meetingRoomSurveyDone");
      if (!surveyDone) {
        // 只要登入且沒回覆過，進站自動跳 feedback 並彈窗
        if (location.pathname !== "/feedback") {
          navigate("/feedback", { replace: true });
        }
        setShowSurvey(true);
      }
    }
  }, [currentUser, location.pathname, navigate]);

  // 回饋送出時
  const handleSurveySubmit = async (data) => {
    // 寫入 feedback collection
    try {
      await addDoc(collection(db, "feedback"), {
        type: "meeting-room-survey",
        userId: currentUser?.uid || null,
        userEmail: currentUser?.email || null,
        choice: data.choice,
        otherText: data.otherText || "",
        createdAt: serverTimestamp(),
      });
      localStorage.setItem("meetingRoomSurveyDone", "1");
    } catch (e) {
      // 可加錯誤提示
    }
    setShowSurvey(false);
    setSurveyChecked(true);
  };

  // 關閉彈窗但不送出，並跳轉到 /teams
  const handleSurveyClose = () => {
    setShowSurvey(false);
    setSurveyChecked(true);
    navigate("/teams", { replace: true });
  };

  return (
    <Routes>
      <Route
        path="/auth"
        element={currentUser ? <Navigate to="/" replace /> : <Auth />}
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-gray-50">
              <Navbar />
              {showSurvey && (
                <MeetingRoomSurveyModal
                  onClose={handleSurveyClose}
                  onSubmit={handleSurveySubmit}
                />
              )}
              <Outlet />
            </div>
          </ProtectedRoute>
        }
      >
        <Route index element={<MyTeams />} />
        <Route path="teams" element={<MyTeams />} />
        <Route path="team/:id" element={<TeamDiscussion />} />
        <Route path="practice-matching" element={<PracticeMatching />} />
        <Route path="tournament/create" element={<TournamentForm />} />
        <Route path="tournament/:id/edit" element={<TournamentForm />} />
        <Route path="practice-matches" element={<PracticeMatchList />} />
        <Route
          path="practice-match-discussion/:id"
          element={<PracticeMatchDiscussion />}
        />
        <Route path="match-room/:id" element={<MatchRoom />} />
        <Route path="feedback" element={<Feedback />} />
        <Route path="feedback-list" element={<FeedbackList />} />
        <Route path="profile" element={<UserProfile />} />
        <Route path="activities" element={<ActivityList />} />
        <Route path="activity/:id" element={<ActivityDetail />} />
        <Route path="create" element={<ActivityForm />} />
      </Route>
    </Routes>
  );
}

// App.jsx 最外層
export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
// (已移除多餘的 <Routes> 標籤)
