// InviteCodeGate.jsx - 邀請碼驗證閘道
// 透過 Firestore 後端驗證邀請碼，避免硬編碼在前端

import { useState, useEffect } from "react";
import { getDoc, updateDoc, doc, increment } from "firebase/firestore";
import { db } from "../firebase/config";

// 從 Firestore invite_codes 集合驗證邀請碼（使用 getDoc 而非 query，配合 list: if false 規則防止枚舉）
async function verifyInviteCode(code) {
  const docId = code.toLowerCase().replace(/\s+/g, "-");
  const docRef = doc(db, "invite_codes", docId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return false;
  const data = snapshot.data();
  if (!data.active || data.code !== code) return false;
  // 更新使用次數
  await updateDoc(docRef, { usageCount: increment(1) });
  return true;
}

export function InviteCodeGate({ children }) {
  const [isVerified, setIsVerified] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // 檢查是否已經驗證過
    const verified = localStorage.getItem("invite_verified");
    if (verified === "true") {
      setIsVerified(true);
    }
    setLoading(false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedCode = inviteCode.trim().toUpperCase();

    if (!trimmedCode) {
      setError("請輸入邀請碼");
      return;
    }

    try {
      setSubmitting(true);
      const isValid = await verifyInviteCode(trimmedCode);
      if (isValid) {
        // 驗證成功
        localStorage.setItem("invite_verified", "true");
        localStorage.setItem("verified_at", new Date().toISOString());
        setIsVerified(true);
        setError("");
      } else {
        setError("邀請碼無效，請聯繫管理員取得有效邀請碼");
        setInviteCode("");
      }
    } catch (err) {
      setError("驗證時發生錯誤，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm("確定要登出？下次需要重新輸入邀請碼。")) {
      localStorage.removeItem("invite_verified");
      localStorage.removeItem("verified_at");
      setIsVerified(false);
      setInviteCode("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="text-white text-xl">載入中...</div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          {/* Logo/標題 */}
          <div className="text-center mb-8">
            <div className="inline-block bg-blue-100 rounded-full p-4 mb-4">
              <svg
                className="w-12 h-12 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">邊境之外</h1>
            <p className="text-gray-600 mb-1">辯論活動媒合平台</p>
            <div className="inline-block bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full font-medium">
              🧪 內部測試版
            </div>
          </div>

          {/* 說明 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 text-center">
              本平台目前處於內部測試階段
              <br />
              需要有效的邀請碼才能進入
            </p>
          </div>

          {/* 邀請碼輸入表單 */}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">
                邀請碼
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="請輸入邀請碼"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg font-mono uppercase"
                autoFocus
              />
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold text-lg disabled:opacity-50"
            >
              {submitting ? "驗證中..." : "驗證並進入"}
            </button>
          </form>

          {/* 聯繫資訊 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">沒有邀請碼？</p>
            <p className="text-sm text-gray-600 mt-1">
              請聯繫管理員取得測試資格
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 驗證通過，顯示實際內容
  return (
    <>
      {children}
      {/* 登出按鈕（可選） */}
      <button
        onClick={handleLogout}
        className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition text-sm shadow-lg z-50"
        title="登出邀請碼驗證"
      >
        🔒 登出測試
      </button>
    </>
  );
}
