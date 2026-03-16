// 導航列元件
// 顯示網站標題和主要導航連結

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { logoutUser } from "../firebase/auth";
import { NotificationBell } from "./NotificationBell";

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  const handleLogout = async () => {
    if (window.confirm("確定要登出嗎？")) {
      try {
        await logoutUser();
        navigate("/auth");
      } catch (error) {
        console.error("登出失敗:", error);
        alert("登出失敗，請稍後再試");
      }
    }
  };

  const navLinks = [
    {
      to: "/teams",
      label: "我的隊伍",
      active: isActive("/teams") || isActive("/team"),
    },
    {
      to: "/practice-matching",
      label: "練習賽媒合",
      active: isActive("/practice-matching"),
    },
    {
      to: "/practice-matches",
      label: "練習賽討論區",
      active:
        isActive("/practice-matches") || isActive("/practice-match-discussion"),
    },
    { to: "/feedback", label: "進步區", active: isActive("/feedback") },
    { to: "/profile", label: "個人主頁", active: isActive("/profile") },
  ];

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-14 md:h-16">
          {/* 網站標題 */}
          <Link
            to="/"
            className="text-lg md:text-2xl font-extrabold hover:text-blue-300 transition tracking-wide"
          >
            邊境之外
          </Link>

          {/* 桌面版導航 */}
          <div className="hidden lg:flex gap-5 items-center">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`hover:text-blue-300 transition font-medium text-sm ${
                  link.active ? "text-blue-300 border-b-2 border-blue-400" : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
            {currentUser && <NotificationBell />}
            {currentUser && (
              <div className="flex items-center gap-2 ml-3 pl-3 border-l border-blue-700">
                <span className="text-sm max-w-[120px] truncate">
                  👤 {currentUser.displayName || currentUser.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm bg-blue-600 px-3 py-1 rounded hover:bg-blue-500 transition"
                >
                  登出
                </button>
              </div>
            )}
          </div>

          {/* 手機版右側：通知 + 漢堡按鈕 */}
          <div className="flex items-center gap-2 lg:hidden">
            {currentUser && <NotificationBell />}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded hover:bg-blue-800/50 transition"
              aria-label="選單"
            >
              {menuOpen ? (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 手機版下拉選單 */}
      {menuOpen && (
        <div className="lg:hidden border-t border-blue-800">
          <div className="container mx-auto px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={closeMenu}
                className={`block px-3 py-2.5 rounded-lg font-medium transition ${
                  link.active
                    ? "bg-blue-800 text-blue-200"
                    : "hover:bg-blue-800/50"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {currentUser && (
              <div className="flex items-center justify-between pt-2 mt-2 border-t border-blue-800">
                <span className="text-sm truncate">
                  👤 {currentUser.displayName || currentUser.email}
                </span>
                <button
                  onClick={() => {
                    handleLogout();
                    closeMenu();
                  }}
                  className="text-sm bg-blue-600 px-3 py-1.5 rounded hover:bg-blue-500 transition"
                >
                  登出
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
