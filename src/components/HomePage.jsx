// HomePage.jsx - 邊境之外 首頁
// 展示六大核心功能的入口頁面

import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const features = [
  {
    title: "我的隊伍",
    description: "管理你的辯論隊伍，與隊友協作討論、分享資料",
    icon: "👥",
    to: "/teams",
    color: "from-blue-500 to-indigo-600",
    bgLight: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    title: "練習賽媒合",
    description: "跨校練習賽配對，選擇盃賽並邀請其他隊伍進行練習",
    icon: "🤝",
    to: "/practice-matching",
    color: "from-emerald-500 to-teal-600",
    bgLight: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  {
    title: "練習賽討論區",
    description: "練習賽的專屬空間——聊天、資料分享、錄音與通話",
    icon: "💬",
    to: "/practice-matches",
    color: "from-purple-500 to-violet-600",
    bgLight: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  {
    title: "個人主頁",
    description: "管理個人資料、查看所屬隊伍與個人行事曆",
    icon: "👤",
    to: "/profile",
    color: "from-cyan-500 to-blue-600",
    bgLight: "bg-cyan-50",
    borderColor: "border-cyan-200",
  },
  {
    title: "進步區",
    description: "提交功能建議、回報問題，幫助平台持續進步",
    icon: "🚀",
    to: "/feedback",
    color: "from-rose-500 to-pink-600",
    bgLight: "bg-rose-50",
    borderColor: "border-rose-200",
  },
];

export default function HomePage() {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero 區塊 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-blue-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-400 rounded-full blur-3xl"></div>
        </div>
        <div className="relative container mx-auto px-4 py-16 md:py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight">
            邊境之外
          </h1>
          <p className="text-lg md:text-xl text-blue-200 max-w-2xl mx-auto mb-6">
            辯論活動管理平台 — 盃賽資訊、隊伍協作、練習賽媒合，一站搞定
          </p>
          {currentUser && (
            <p className="text-blue-300 text-sm">
              歡迎回來，{currentUser.displayName || currentUser.email}
            </p>
          )}
        </div>
      </section>

      {/* 功能卡片區 */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            核心功能
          </h2>
          <p className="text-gray-500">點擊任一功能開始使用</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature) => (
            <Link
              key={feature.to}
              to={feature.to}
              className={`group block ${feature.bgLight} rounded-2xl border ${feature.borderColor} p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
            >
              <div
                className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} text-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform`}
              >
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {feature.description}
              </p>
              <div className="mt-4 text-sm font-medium text-gray-500 group-hover:text-gray-700 transition-colors">
                前往 →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 底部 */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} 邊境之外 — 辯論活動管理平台
        </div>
      </footer>
    </div>
  );
}
