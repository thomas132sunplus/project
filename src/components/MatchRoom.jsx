// MatchRoom.jsx - 練習賽房間（線上辯論工具）
// 包含計時器、視訊、錄音、資料存放等功能

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import DebateTimer from "./DebateTimer";

export default function MatchRoom() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("timer"); // timer, participants, recordings, files, judges
  const [matchFormat, setMatchFormat] = useState("oregon-3-3-3");

  // 假設的比賽資料
  const [matchData, setMatchData] = useState({
    id: id,
    affirmativeTeam: "辯士學校辯論隊 A",
    negativeTeam: "論辯學校辯論隊 B",
    tournament: "2024 春季盃",
    status: "in-progress",
  });

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 頂部資訊列 */}
      <div className="bg-blue-600 text-white p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold mb-2">練習賽房間</h1>
          <div className="flex gap-6 text-sm">
            <span>🏆 {matchData.tournament}</span>
            <span>正方：{matchData.affirmativeTeam}</span>
            <span>反方：{matchData.negativeTeam}</span>
          </div>
        </div>
      </div>

      {/* 主要內容區 */}
      <div className="container mx-auto px-4 py-6">
        {/* Tab 選單 */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b overflow-x-auto">
            <TabButton
              label="⏱️ 計時器"
              active={activeTab === "timer"}
              onClick={() => setActiveTab("timer")}
            />
            <TabButton
              label="🎥 參與者"
              active={activeTab === "participants"}
              onClick={() => setActiveTab("participants")}
            />
            <TabButton
              label="🎙️ 錄音"
              active={activeTab === "recordings"}
              onClick={() => setActiveTab("recordings")}
            />
            <TabButton
              label="📁 資料"
              active={activeTab === "files"}
              onClick={() => setActiveTab("files")}
            />
            <TabButton
              label="📝 裁單"
              active={activeTab === "judges"}
              onClick={() => setActiveTab("judges")}
            />
          </div>

          {/* Tab 內容 */}
          <div className="p-6">
            {activeTab === "timer" && (
              <TimerSection
                matchFormat={matchFormat}
                setMatchFormat={setMatchFormat}
              />
            )}
            {activeTab === "participants" && <ParticipantsSection />}
            {activeTab === "recordings" && <RecordingsSection />}
            {activeTab === "files" && <FilesSection />}
            {activeTab === "judges" && <JudgesSection />}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab 按鈕元件
function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 font-medium transition whitespace-nowrap ${
        active
          ? "text-blue-600 border-b-2 border-blue-600"
          : "text-gray-600 hover:text-blue-600"
      }`}
    >
      {label}
    </button>
  );
}

// 計時器區塊
function TimerSection({ matchFormat, setMatchFormat }) {
  return (
    <div>
      {/* 賽制選擇 */}
      <div className="mb-6">
        <label className="block text-gray-700 font-semibold mb-2">
          選擇賽制
        </label>
        <select
          value={matchFormat}
          onChange={(e) => setMatchFormat(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="oregon-3-3-3">奧瑞岡 3-3-3</option>
          <option value="oregon-4-4-4">奧瑞岡 4-4-4</option>
          <option value="singapore">新加坡賽制</option>
          <option value="custom">自訂賽制</option>
        </select>
      </div>

      {/* 辯論計時器元件 */}
      <DebateTimer format={matchFormat} />
    </div>
  );
}

// 參與者區塊
function ParticipantsSection() {
  // 假設的參與者資料
  const participants = [
    { id: 1, name: "王小明", team: "affirmative", role: "一辯" },
    { id: 2, name: "李小華", team: "affirmative", role: "二辯" },
    { id: 3, name: "張小美", team: "negative", role: "一辯" },
    { id: 4, name: "陳小強", team: "negative", role: "二辯" },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">參與者視窗</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className={`rounded-lg p-4 text-center ${
              participant.team === "affirmative"
                ? "bg-blue-50 border-2 border-blue-300"
                : "bg-red-50 border-2 border-red-300"
            }`}
          >
            {/* 視訊佔位 */}
            <div className="bg-gray-800 rounded aspect-video mb-3 flex items-center justify-center">
              <span className="text-white text-4xl">👤</span>
            </div>
            <p className="font-semibold text-gray-800">{participant.name}</p>
            <p className="text-sm text-gray-600">{participant.role}</p>
            <p className="text-xs text-gray-500 mt-1">
              {participant.team === "affirmative" ? "正方" : "反方"}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-gray-700">
          <strong>實作建議：</strong>視訊功能可整合 WebRTC 服務（Agora, Twilio,
          Jitsi Meet 等） 或使用 iframe 嵌入外部視訊平台
        </p>
      </div>
    </div>
  );
}

// 錄音區塊
function RecordingsSection() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState([
    {
      id: 1,
      name: "練習賽錄音 2024-03-15",
      duration: "45:32",
      hasTranscript: true,
    },
  ]);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">錄音與逐字稿</h2>

      {/* 錄音控制 */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">比賽錄音</h3>
            <p className="text-sm text-gray-600">
              {isRecording ? "錄音中..." : "點擊開始錄音"}
            </p>
          </div>
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              isRecording
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isRecording ? "⏹ 停止錄音" : "🎙️ 開始錄音"}
          </button>
        </div>
      </div>

      {/* 已有的錄音 */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">歷史錄音</h3>
        {recordings.length === 0 ? (
          <p className="text-gray-500">尚無錄音</p>
        ) : (
          <div className="space-y-3">
            {recordings.map((recording) => (
              <div
                key={recording.id}
                className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold text-gray-800">
                    {recording.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    時長：{recording.duration}
                  </p>
                  {recording.hasTranscript && (
                    <span className="text-xs text-green-600">
                      ✓ 已生成逐字稿
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                    播放
                  </button>
                  {recording.hasTranscript && (
                    <button className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">
                      查看逐字稿
                    </button>
                  )}
                  <button className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700">
                    下載
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-gray-700">
          <strong>實作建議：</strong>使用 MediaRecorder API 實現錄音功能， 搭配
          Firebase Storage 儲存，並可整合 Google Speech-to-Text 生成逐字稿
        </p>
      </div>
    </div>
  );
}

// 資料區塊
function FilesSection() {
  const files = [
    {
      id: 1,
      name: "立論稿.pdf",
      uploadedBy: "王小明",
      uploadedAt: "2024-03-15 14:30",
    },
    {
      id: 2,
      name: "質詢稿.docx",
      uploadedBy: "李小華",
      uploadedAt: "2024-03-15 14:35",
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">資料存放區</h2>

      <button className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
        + 上傳檔案
      </button>

      {files.length === 0 ? (
        <p className="text-gray-500">尚無檔案</p>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold text-gray-800">📄 {file.name}</p>
                <p className="text-sm text-gray-600">
                  上傳者：{file.uploadedBy} | {file.uploadedAt}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                  下載
                </button>
                <button className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">
                  刪除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 裁單區塊
function JudgesSection() {
  const judgeForms = [
    {
      id: 1,
      name: "裁判講評.pdf",
      uploadedBy: "裁判",
      uploadedAt: "2024-03-15 16:30",
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">裁單存放區</h2>

      <button className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
        + 上傳裁單
      </button>

      {judgeForms.length === 0 ? (
        <p className="text-gray-500">尚無裁單</p>
      ) : (
        <div className="space-y-3">
          {judgeForms.map((form) => (
            <div
              key={form.id}
              className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold text-gray-800">📋 {form.name}</p>
                <p className="text-sm text-gray-600">
                  上傳者：{form.uploadedBy} | {form.uploadedAt}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                  查看
                </button>
                <button className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">
                  下載
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
