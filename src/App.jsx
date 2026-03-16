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

  useEffect(() => {
    console.log("[DEBUG] currentUser:", currentUser);
    console.log("[DEBUG] surveyChecked:", surveyChecked);
    console.log("[DEBUG] showSurvey:", showSurvey);
  }, [currentUser, surveyChecked, showSurvey]);

  useEffect(() => {
    if (currentUser && location.pathname === "/") {
      navigate("/feedback", { replace: true });
    }
  }, [currentUser, location.pathname, navigate]);

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
              {showSurvey && surveyChecked && (
                <MeetingRoomSurveyModal
                  onClose={() => setShowSurvey(false)}
                  onSubmit={() => setSurveyChecked(true)}
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
