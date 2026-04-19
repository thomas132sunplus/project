// Announcements.jsx - 公告頁面
// 所有登入用戶可閱讀，只有 admin 可發布／刪除
// 不顯示發文帳號

import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getUser } from "../firebase/users";
import {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} from "../firebase/announcements";
import { notifyNewAnnouncement } from "../firebase/notificationHelpers";

export function Announcements() {
  const { currentUser } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // 新增公告表單狀態
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // 檢查是否為 admin
  useEffect(() => {
    if (!currentUser) return;
    getUser(currentUser.uid)
      .then((userData) => {
        setIsAdmin(userData?.role === "admin");
      })
      .catch(() => setIsAdmin(false));
  }, [currentUser]);

  // 載入公告
  const loadAnnouncements = () => {
    setLoading(true);
    getAnnouncements()
      .then((data) => {
        setAnnouncements(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("載入公告失敗，請重新整理頁面");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("請填寫公告標題");
      return;
    }
    if (!content.trim()) {
      setFormError("請填寫公告內容");
      return;
    }
    try {
      setSubmitting(true);
      setFormError("");
      await createAnnouncement({ title, content });
      notifyNewAnnouncement(title.trim(), currentUser.uid);
      setTitle("");
      setContent("");
      setShowForm(false);
      loadAnnouncements();
    } catch {
      setFormError("發布失敗，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("確定要刪除這則公告？")) return;
    try {
      await deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert("刪除失敗，請稍後再試");
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* 標題列 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📢 公告</h1>
        {isAdmin && (
          <button
            onClick={() => {
              setShowForm((v) => !v);
              setFormError("");
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
          >
            {showForm ? "取消" : "＋ 新增公告"}
          </button>
        )}
      </div>

      {/* 新增公告表單（僅 admin 看得到） */}
      {isAdmin && showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow p-6 mb-6 border border-blue-100"
        >
          <h2 className="text-lg font-semibold text-gray-700 mb-4">新增公告</h2>
          {formError && (
            <div className="mb-3 bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">
              {formError}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              標題
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="公告標題"
              maxLength={100}
            />
          </div>
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              內容
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              placeholder="公告內容…"
              maxLength={2000}
            />
            <p className="text-xs text-gray-400 text-right mt-1">
              {content.length} / 2000
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              {submitting ? "發布中…" : "發布公告"}
            </button>
          </div>
        </form>
      )}

      {/* 公告列表 */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-500">載入中...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p>目前沒有任何公告</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold text-gray-800 leading-snug">
                  {a.title}
                </h2>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="flex-shrink-0 text-xs text-red-400 hover:text-red-600 transition"
                  >
                    刪除
                  </button>
                )}
              </div>
              <p className="mt-3 text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">
                {a.content}
              </p>
              <p className="mt-4 text-xs text-gray-400 text-right">
                {formatDate(a.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
