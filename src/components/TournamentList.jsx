// TournamentList.jsx - 盃賽列表頁
// 顯示所有盃賽的列表

import { useState, useEffect } from "react";
import { getAllTournaments } from "../firebase/tournaments";
import TournamentCard from "./TournamentCard";

export default function TournamentList() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 載入盃賽列表
  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllTournaments();
      setTournaments(data);
    } catch (err) {
      console.error("載入盃賽失敗:", err);
      setError("載入盃賽失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  // 載入中狀態
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

  // 錯誤狀態
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 頁面標題 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">盃賽卡片</h1>
        <p className="text-gray-600">查看所有辯論盃賽的詳細資訊</p>
      </div>

      {/* 盃賽列表 */}
      {tournaments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 text-lg mb-4">目前沒有盃賽資訊</p>
          <p className="text-gray-400 text-sm">
            點擊右上角「+ 建立盃賽」開始新增盃賽
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </div>
      )}
    </div>
  );
}
