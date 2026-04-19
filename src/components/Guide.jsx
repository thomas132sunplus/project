import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getUser } from "../firebase/users";
import {
  subscribeToGuideTopics,
  addGuideTopic,
  updateGuideTopic,
  deleteGuideTopic,
  addGuideCard,
  updateGuideCard,
  deleteGuideCard,
} from "../firebase/guide";

// 新手導覽頁面：主題選擇 + 主題卡片翻頁
export default function Guide() {
  const { currentUser } = useAuth();
  const [isEditor, setIsEditor] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // 從 Firestore 取得用戶角色判斷編輯權限
  useEffect(() => {
    if (currentUser?.uid) {
      getUser(currentUser.uid).then((userData) => {
        setIsEditor(userData?.role === "admin");
      });
    }
  }, [currentUser]);

  // 主題列表
  const [topics, setTopics] = useState([]);
  // Firestore 主題 id 對應
  const [selectedTopicIdx, setSelectedTopicIdx] = useState(0);
  const [pageIdx, setPageIdx] = useState(0);
  const topic = topics[selectedTopicIdx] || { cards: [] };
  const card = topic.cards?.[pageIdx] || {};

  // Firestore 即時監聯
  useEffect(() => {
    const unsub = subscribeToGuideTopics((data) => {
      setTopics(data);
    });
    return () => unsub();
  }, []);

  // 主題名稱編輯
  async function handleChangeTopicName(idx, value) {
    const t = topics[idx];
    await updateGuideTopic(t.id, { ...t, name: value });
  }

  // 新增主題
  async function handleAddTopic() {
    console.log("[Guide] handleAddTopic click");
    const id = await addGuideTopic({
      name: "新主題",
      cards: [{ img: "", desc: "" }],
    });
    setSelectedTopicIdx(topics.length); // 新增後自動選到新主題
    setPageIdx(0);
  }

  // 刪除主題
  async function handleDeleteTopic(idx) {
    if (!window.confirm("確定要刪除此主題？")) return;
    const t = topics[idx];
    await deleteGuideTopic(t.id);
    setSelectedTopicIdx(0);
    setPageIdx(0);
  }

  // 新增卡片
  async function handleAddCard(topicIdx) {
    const t = topics[topicIdx];
    await addGuideCard(t.id, { img: "", desc: "" });
    setPageIdx(topic.cards?.length || 0); // 跳到新頁
  }

  // 刪除卡片
  async function handleDeleteCard(topicIdx, cardIdx) {
    if (!window.confirm("確定要刪除此頁卡片？")) return;
    const t = topics[topicIdx];
    await deleteGuideCard(t.id, cardIdx);
    setPageIdx((prev) => Math.max(0, prev - 1));
  }

  // 編輯說明
  async function handleChangeDesc(topicIdx, cardIdx, value) {
    const t = topics[topicIdx];
    const c = { ...t.cards[cardIdx], desc: value };
    await updateGuideCard(t.id, cardIdx, c);
  }

  // 上傳圖片
  async function handleImageChange(topicIdx, cardIdx, e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const t = topics[topicIdx];
      const c = { ...t.cards[cardIdx], img: ev.target.result };
      await updateGuideCard(t.id, cardIdx, c);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center">新手導覽</h1>
      <div className="mb-2 text-xs text-gray-500 text-center">
        <span>目前登入：{currentUser?.displayName || "未登入"}</span>
      </div>
      <div className="flex justify-end mb-2">
        {isEditor && (
          <button
            className="px-3 py-1 rounded bg-gray-300 text-gray-700 font-bold mr-2"
            onClick={() => setEditMode((v) => !v)}
          >
            {editMode ? "完成編輯" : "編輯模式"}
          </button>
        )}
      </div>
      {/* 主題選擇區塊 */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {topics.map((t, idx) => (
          <div key={t.id || idx} className="flex items-center gap-1">
            <button
              className={`px-4 py-2 rounded font-bold border transition ${selectedTopicIdx === idx ? "bg-blue-600 text-white" : "bg-white text-blue-700 border-blue-600"}`}
              onClick={() => {
                setSelectedTopicIdx(idx);
                setPageIdx(0);
              }}
            >
              {isEditor && editMode ? (
                <input
                  type="text"
                  value={t.name}
                  onChange={(e) => handleChangeTopicName(idx, e.target.value)}
                  className="bg-transparent border-none font-bold text-center w-24"
                />
              ) : (
                t.name
              )}
            </button>
            {isEditor && editMode && (
              <button
                className="text-red-500 text-lg font-bold px-1"
                title="刪除主題"
                onClick={() => handleDeleteTopic(idx)}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {isEditor && editMode && (
          <button
            className="px-4 py-2 rounded bg-green-600 text-white font-bold"
            onClick={handleAddTopic}
          >
            + 新增主題
          </button>
        )}
      </div>

      {/* 主題卡片翻頁區塊 */}
      <div className="relative w-full max-w-xl mx-auto mb-6">
        <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col">
          {/* 全屏圖片 */}
          <div className="w-full h-64 md:h-96 bg-gray-100 flex items-center justify-center overflow-hidden">
            {isEditor && editMode ? (
              <input
                type="file"
                accept="image/*"
                className="mb-2"
                onChange={(e) =>
                  handleImageChange(selectedTopicIdx, pageIdx, e)
                }
              />
            ) : null}
            {card.img ? (
              <img
                src={card.img}
                alt="導覽圖片"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-400">請上傳圖片</span>
            )}
          </div>
          {/* 文字說明 */}
          <div className="p-4">
            {isEditor && editMode ? (
              <textarea
                value={card.desc}
                onChange={(e) =>
                  handleChangeDesc(selectedTopicIdx, pageIdx, e.target.value)
                }
                className="w-full border rounded p-2 mb-2"
                placeholder="說明文字"
                rows={4}
              />
            ) : (
              <p className="text-gray-700 text-base text-center">{card.desc}</p>
            )}
          </div>
        </div>
        {/* 翻頁按鈕 */}
        <div className="flex justify-between items-center mt-4">
          <button
            className="px-3 py-1 rounded bg-gray-200 text-gray-700 font-bold disabled:opacity-50"
            disabled={pageIdx === 0}
            onClick={() => setPageIdx(pageIdx - 1)}
          >
            ◀ 上一頁
          </button>
          <span className="text-sm text-gray-500">
            {pageIdx + 1} / {topic.cards.length}
          </span>
          <button
            className="px-3 py-1 rounded bg-gray-200 text-gray-700 font-bold disabled:opacity-50"
            disabled={pageIdx === topic.cards.length - 1}
            onClick={() => setPageIdx(pageIdx + 1)}
          >
            下一頁 ▶
          </button>
        </div>
        {isEditor && editMode && (
          <div className="mt-4 text-center flex gap-2 justify-center">
            <button
              className="px-4 py-2 rounded bg-blue-600 text-white font-bold"
              onClick={() => handleAddCard(selectedTopicIdx)}
            >
              + 新增頁面
            </button>
            {topic.cards?.length > 0 && (
              <button
                className="px-4 py-2 rounded bg-red-600 text-white font-bold"
                onClick={() => handleDeleteCard(selectedTopicIdx, pageIdx)}
              >
                刪除此頁
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
