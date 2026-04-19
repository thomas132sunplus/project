// TournamentCard.jsx - 盃賽卡片元件
// 在盃賽列表中顯示單一盃賽的名稱

import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function TournamentCard({ tournament }) {
  const { currentUser } = useAuth();
  return (
    <Link
      to={`/tournament/${tournament.id}`}
      className="block bg-white rounded-2xl shadow-md hover:shadow-xl transition-all hover:-translate-y-1 p-8 border border-gray-200 text-center"
    >
      <h3 className="text-2xl font-bold text-gray-800">
        {tournament.name || "未命名盃賽"}
      </h3>
    </Link>
  );
}
