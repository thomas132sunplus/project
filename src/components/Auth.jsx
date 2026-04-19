// Auth.jsx - 註冊/登入頁面
// 讓用戶註冊新帳號或登入現有帳號

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser, loginUser } from "../firebase/auth";

export function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true); // true: 登入模式, false: 註冊模式
  // 註冊停用旗標
  const REGISTRATION_DISABLED = false;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

  // 密碼顯示狀態
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 表單資料
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    school: "",
    grade: "",
  });

  // 處理輸入變更
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  // 處理登入
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError("請填寫 Email 和密碼");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await loginUser(formData.email, formData.password);
      navigate("/");
    } catch (err) {
      console.error("登入錯誤:", err);
      if (err.code === "auth/invalid-credential") {
        setError("Email 或密碼錯誤");
      } else if (err.code === "auth/user-not-found") {
        setError("找不到此帳號");
      } else if (err.code === "auth/wrong-password") {
        setError("密碼錯誤");
      } else if (err.code === "auth/too-many-requests") {
        setError("登入嘗試次數過多，請稍後再試");
      } else {
        setError("登入失敗，請稍後再試");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {/* 標題 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">邊境之外</h1>
          <p className="text-gray-600">辯論活動媒合平台</p>
        </div>

        {/* 補漏洞橫幅 */}
        {!isLogin && REGISTRATION_DISABLED && (
          <div className="mb-6 bg-yellow-100 border-2 border-yellow-400 text-yellow-800 px-4 py-4 rounded-lg text-xl font-bold text-center">
            補漏洞中，暫停註冊
          </div>
        )}

        {/* 切換登入/註冊 */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => {
              setIsLogin(true);
              setError("");
            }}
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              isLogin ? "bg-white text-blue-600 shadow" : "text-gray-600"
            }`}
          >
            登入
          </button>
          <button
            onClick={() => {
              setIsLogin(false);
              setError("");
            }}
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              !isLogin ? "bg-white text-blue-600 shadow" : "text-gray-600"
            }`}
          >
            註冊
          </button>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* 登入表單 */}
        {isLogin ? (
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                密碼
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400"
            >
              {loading ? "登入中..." : "登入"}
            </button>
          </form>
        ) : REGISTRATION_DISABLED ? (
          <div className="text-center text-lg text-gray-500 py-8">
            <div className="mb-6 bg-yellow-100 border-2 border-yellow-400 text-yellow-800 px-4 py-4 rounded-lg text-xl font-bold text-center">
              補漏洞中，暫停註冊
            </div>
            如有痆問請聯絡管理員。
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!agreedToPrivacy) {
                setError("請勾選同意隱私權政策方可註冊");
                return;
              }
              if (
                !formData.displayName ||
                !formData.email ||
                !formData.password
              ) {
                setError("請填寫所有必填欄位");
                return;
              }
              if (formData.password !== formData.confirmPassword) {
                setError("密碼不一致");
                return;
              }
              if (formData.password.length < 6) {
                setError("密碼至少 6 個字元");
                return;
              }
              try {
                setLoading(true);
                setError("");
                await registerUser(
                  formData.email,
                  formData.password,
                  formData.displayName,
                  {
                    school: formData.school,
                    grade: formData.grade,
                  },
                );
                navigate("/");
              } catch (err) {
                if (err.code === "auth/email-already-in-use") {
                  setError("此 Email 已經被註冊");
                } else if (err.code === "auth/weak-password") {
                  setError("密碼強度不足");
                } else {
                  setError("註冊失敗，請稍後再試");
                }
              } finally {
                setLoading(false);
              }
            }}
          >
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">
                姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="你的姓名"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">
                學校
              </label>
              <input
                type="text"
                name="school"
                value={formData.school}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="學校名稱"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">
                字頭
              </label>
              <input
                type="text"
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="2字"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">
                密碼 <span className="text-red-500">*</span>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="至少 6 個字元"
                required
              />
            </div>
            <div className="mb-5">
              <label className="block text-gray-700 font-semibold mb-2">
                確認密碼 <span className="text-red-500">*</span>
              </label>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="再輸入一次密碼"
                required
              />
            </div>
            {/* 同意隱私權政策 */}
            <div className="mb-6 flex items-start gap-2">
              <input
                type="checkbox"
                id="privacy"
                checked={agreedToPrivacy}
                onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                className="mt-1 w-4 h-4 accent-blue-600 flex-shrink-0"
              />
              <label htmlFor="privacy" className="text-sm text-gray-600">
                我已閱讀並同意《
                <Link
                  to="/privacy"
                  target="_blank"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  隱私權政策
                </Link>
                》，同意本平台收集與使用我的個人資料。
              </label>
            </div>
            <button
              type="submit"
              disabled={loading || !agreedToPrivacy}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400"
            >
              {loading ? "註冊中..." : "註冊"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
