// 主應用程式元件
// 設定路由和整體頁面結構

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import InviteCodeGate from "./components/InviteCodeGate";
import Auth from "./components/Auth";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useEventReminder } from "./hooks/useEventReminder";

// 隊伍相關頁面
import MyTeams from "./components/MyTeams";
import TeamDiscussion from "./components/TeamDiscussion";

// 盃賽建立/編輯
import TournamentForm from "./components/TournamentForm";

// 練習賽相關頁面
import PracticeMatching from "./components/PracticeMatching";
import PracticeMatchList from "./components/PracticeMatchList";
import PracticeMatchDiscussion from "./components/PracticeMatchDiscussion";
import MatchRoom from "./components/MatchRoom";

// 個人主頁
import UserProfile from "./components/UserProfile";

// 進步區（客服功能）
import Feedback from "./components/Feedback";
import FeedbackList from "./components/FeedbackList";

// 舊的活動頁面（向後兼容）
import ActivityList from "./components/ActivityList";
import ActivityDetail from "./components/ActivityDetail";
import ActivityForm from "./components/ActivityForm";

// 受保護的路由組件
function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

function AppRoutes() {
  const { currentUser } = useAuth();
  // 啟動事件提醒定時檢查
  useEventReminder();

  return (
    <BrowserRouter>
      <Routes>
        {/* 認證頁面 */}
        <Route
          path="/auth"
          element={currentUser ? <Navigate to="/" replace /> : <Auth />}
        />

        {/* 受保護的路由 */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <Routes>
                  {/* 首頁（我的隊伍） */}
                  <Route path="/" element={<MyTeams />} />

                  {/* 隊伍討論區 */}
                  <Route path="/teams" element={<MyTeams />} />
                  <Route path="/team/:id" element={<TeamDiscussion />} />

                  {/* 練習賽媒合 */}
                  <Route
                    path="/practice-matching"
                    element={<PracticeMatching />}
                  />
                  <Route
                    path="/tournament/create"
                    element={<TournamentForm />}
                  />
                  <Route
                    path="/tournament/:id/edit"
                    element={<TournamentForm />}
                  />

                  {/* 練習賽討論區 */}
                  <Route
                    path="/practice-matches"
                    element={<PracticeMatchList />}
                  />
                  <Route
                    path="/practice-match-discussion/:id"
                    element={<PracticeMatchDiscussion />}
                  />

                  {/* 練習賽房間 */}
                  <Route path="/match-room/:id" element={<MatchRoom />} />
                  {/* 進步區 */}
                  <Route path="/feedback" element={<Feedback />} />
                  <Route path="/feedback-list" element={<FeedbackList />} />
                  {/* 個人主頁 */}
                  <Route path="/profile" element={<UserProfile />} />

                  {/* 舊的活動頁面（向後兼容）*/}
                  <Route path="/activities" element={<ActivityList />} />
                  <Route path="/activity/:id" element={<ActivityDetail />} />
                  <Route path="/create" element={<ActivityForm />} />
                </Routes>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <InviteCodeGate>
        <AppRoutes />
      </InviteCodeGate>
    </AuthProvider>
  );
}

export default App;
