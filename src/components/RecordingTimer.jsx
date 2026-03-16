import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";

// 預設計時方案：奧瑞岡444制
const DEFAULT_TIMER_PRESET = {
  name: "奧瑞岡444制",
  duration: 270, // 4分30秒 = 270秒
  bells: [
    { time: 210, count: 1, label: "3分30秒 - 第一次響鈴" }, // 3:30
    { time: 239, count: 1, label: "3分59秒 - 第二次響鈴" }, // 3:59
    { time: 240, count: 1, label: "4分0秒 - 第三次響鈴" }, // 4:00
    { time: 268, count: 1, label: "4分28秒 - 第四次響鈴" }, // 4:28
    { time: 269, count: 1, label: "4分29秒 - 第五次響鈴" }, // 4:29
    { time: 270, count: 1, label: "4分30秒 - 第六次響鈴（結束）" }, // 4:30
  ],
};

// 其他常見計時方案
const TIMER_PRESETS = [
  DEFAULT_TIMER_PRESET,
  {
    name: "政策性辯論立論（8分鐘）",
    duration: 480,
    bells: [
      { time: 420, count: 1, label: "7分鐘" },
      { time: 478, count: 1, label: "7分58秒" },
      { time: 479, count: 1, label: "7分59秒" },
      { time: 480, count: 2, label: "8分鐘（結束）" },
    ],
  },
  {
    name: "議會制發言（7分鐘）",
    duration: 420,
    bells: [
      { time: 60, count: 1, label: "1分鐘（可質詢）" },
      { time: 360, count: 1, label: "6分鐘（質詢結束）" },
      { time: 418, count: 1, label: "6分58秒" },
      { time: 419, count: 1, label: "6分59秒" },
      { time: 420, count: 2, label: "7分鐘（結束）" },
    ],
  },
  {
    name: "自訂計時",
    duration: 0,
    bells: [],
  },
];

export function RecordingTimer({ teamId, onClose }) {
  const { currentUser } = useAuth();

  // 錄音相關
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcription, setTranscription] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  // 計時器相關
  const [timerRunning, setTimerRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState(0); // 預設為奧瑞岡444制
  const [customDuration, setCustomDuration] = useState(270);
  const [customBells, setCustomBells] = useState([]);
  const [showStopSpeechAlert, setShowStopSpeechAlert] = useState(false);
  const [bellsRung, setBellsRung] = useState([]);
  const timerIntervalRef = useRef(null);
  const audioContextRef = useRef(null);

  // 初始化音頻上下文
  useEffect(() => {
    audioContextRef.current = new (
      window.AudioContext || window.webkitAudioContext
    )();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // 響鈴音效
  const playBell = (count = 1) => {
    if (!audioContextRef.current) return;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const oscillator = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);

        oscillator.frequency.value = 800; // 響鈴頻率
        oscillator.type = "sine";

        gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContextRef.current.currentTime + 0.3,
        );

        oscillator.start(audioContextRef.current.currentTime);
        oscillator.stop(audioContextRef.current.currentTime + 0.3);
      }, i * 400); // 每次響鈴間隔400ms
    }
  };

  // 開始錄音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // 錄音時長計時
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("無法啟動錄音:", error);
      alert("無法訪問麥克風，請檢查權限設置");
    }
  };

  // 停止錄音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  // 播放錄音
  const playRecording = () => {
    if (recordedBlob) {
      const audio = new Audio(URL.createObjectURL(recordedBlob));
      audio.play();
    }
  };

  // 下載錄音
  const downloadRecording = () => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recording_${new Date().getTime()}.webm`;
      a.click();
    }
  };

  // 轉換為逐字稿（模擬功能，實際需要 API）
  const transcribeAudio = async () => {
    if (!recordedBlob) return;

    setIsTranscribing(true);

    // 這裡應該調用實際的語音識別 API
    // 例如：Google Speech-to-Text, Azure Speech Service, 或 Web Speech API

    try {
      // 使用 Web Speech API（如果瀏覽器支援）
      if (
        "webkitSpeechRecognition" in window ||
        "SpeechRecognition" in window
      ) {
        alert(
          "瀏覽器語音識別需要即時錄音。建議使用第三方 API 進行離線音檔轉換。\n\n目前顯示模擬結果。",
        );

        // 模擬轉換結果
        setTimeout(() => {
          setTranscription(
            "這是模擬的逐字稿內容。\n\n實際使用時，需要整合語音識別 API 服務，例如：\n- Google Cloud Speech-to-Text\n- Azure Speech Service\n- AWS Transcribe\n\n這些服務可以將錄音檔案轉換為文字。",
          );
          setIsTranscribing(false);
        }, 2000);
      } else {
        alert("您的瀏覽器不支援語音識別功能。請使用第三方 API 服務進行轉換。");
        setIsTranscribing(false);
      }
    } catch (error) {
      console.error("轉換失敗:", error);
      alert("轉換失敗，請稍後再試");
      setIsTranscribing(false);
    }
  };

  // 開始計時
  const startTimer = () => {
    const preset = TIMER_PRESETS[selectedPreset];
    const duration =
      selectedPreset === TIMER_PRESETS.length - 1
        ? customDuration
        : preset.duration;
    const bells =
      selectedPreset === TIMER_PRESETS.length - 1 ? customBells : preset.bells;

    if (duration <= 0) {
      alert("請設定計時時長");
      return;
    }

    setCurrentTime(0);
    setBellsRung([]);
    setShowStopSpeechAlert(false);
    setTimerRunning(true);

    let time = 0;
    timerIntervalRef.current = setInterval(() => {
      time++;
      setCurrentTime(time);

      // 檢查是否需要響鈴
      const bell = bells.find((b) => b.time === time);
      if (bell) {
        playBell(bell.count);
        setBellsRung((prev) => [...prev, bell]);

        // 如果是最後一次響鈴（時間到）
        if (time >= duration) {
          setTimeout(() => {
            setShowStopSpeechAlert(true);
            stopTimer();
          }, bell.count * 400); // 等響鈴結束後顯示提示
        }
      }

      // 時間到但沒有設定響鈴的情況
      if (time >= duration && !bells.find((b) => b.time === duration)) {
        setShowStopSpeechAlert(true);
        stopTimer();
      }
    }, 1000);
  };

  // 停止計時
  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setTimerRunning(false);
  };

  // 重置計時
  const resetTimer = () => {
    stopTimer();
    setCurrentTime(0);
    setBellsRung([]);
    setShowStopSpeechAlert(false);
  };

  // 添加自訂響鈴時間
  const addCustomBell = () => {
    const time = parseInt(prompt("請輸入響鈴時間（秒）："));
    const count = parseInt(prompt("請輸入響鈴次數：", "1"));

    if (time && count && time > 0 && count > 0 && time <= customDuration) {
      setCustomBells((prev) =>
        [...prev, { time, count, label: `${time}秒` }].sort(
          (a, b) => a.time - b.time,
        ),
      );
    }
  };

  // 格式化時間顯示
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // 清理
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const currentPreset = TIMER_PRESETS[selectedPreset];
  const timerDuration =
    selectedPreset === TIMER_PRESETS.length - 1
      ? customDuration
      : currentPreset.duration;
  const timerBells =
    selectedPreset === TIMER_PRESETS.length - 1
      ? customBells
      : currentPreset.bells;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 標題欄 */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-800">🎙️ 錄音與計時器</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 計時器區域 */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              ⏱️ 辯論計時器
            </h3>

            {/* 計時方案選擇 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                計時方案
              </label>
              <select
                value={selectedPreset}
                onChange={(e) => {
                  setSelectedPreset(parseInt(e.target.value));
                  resetTimer();
                }}
                disabled={timerRunning}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                {TIMER_PRESETS.map((preset, idx) => (
                  <option key={idx} value={idx}>
                    {preset.name}
                    {preset.duration > 0 && ` (${formatTime(preset.duration)})`}
                  </option>
                ))}
              </select>
            </div>

            {/* 自訂計時設定 */}
            {selectedPreset === TIMER_PRESETS.length - 1 && (
              <div className="mb-4 space-y-3 bg-white p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    計時時長（秒）
                  </label>
                  <input
                    type="number"
                    value={customDuration}
                    onChange={(e) =>
                      setCustomDuration(parseInt(e.target.value) || 0)
                    }
                    disabled={timerRunning}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    min="1"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      響鈴時間點
                    </label>
                    <button
                      onClick={addCustomBell}
                      disabled={timerRunning}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition disabled:bg-gray-400"
                    >
                      + 添加
                    </button>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {customBells.length === 0 ? (
                      <p className="text-sm text-gray-500">尚未設定響鈴時間</p>
                    ) : (
                      customBells.map((bell, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm"
                        >
                          <span>
                            {formatTime(bell.time)} - 響{bell.count}次
                          </span>
                          <button
                            onClick={() =>
                              setCustomBells((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                            disabled={timerRunning}
                            className="text-red-600 hover:text-red-800 disabled:text-gray-400"
                          >
                            刪除
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 計時器顯示 */}
            <div className="bg-white rounded-lg p-8 mb-4 text-center border-2 border-gray-200">
              <div className="text-6xl font-bold text-gray-800 mb-2 font-mono">
                {formatTime(currentTime)}
              </div>
              <div className="text-sm text-gray-600">
                / {formatTime(timerDuration)}
              </div>

              {/* 進度條 */}
              <div className="w-full bg-gray-200 rounded-full h-3 mt-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${Math.min((currentTime / timerDuration) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* 響鈴記錄 */}
            {timerBells.length > 0 && (
              <div className="mb-4 bg-white p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  響鈴設定：
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {timerBells.map((bell, idx) => (
                    <div
                      key={idx}
                      className={`text-sm px-3 py-1 rounded ${
                        bellsRung.includes(bell)
                          ? "bg-green-100 text-green-800 font-semibold"
                          : "bg-gray-50 text-gray-600"
                      }`}
                    >
                      🔔 {bell.label} {bellsRung.includes(bell) && "✓"}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 控制按鈕 */}
            <div className="flex justify-center gap-3">
              {!timerRunning ? (
                <button
                  onClick={startTimer}
                  disabled={timerDuration <= 0}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold disabled:bg-gray-400"
                >
                  ▶️ 開始計時
                </button>
              ) : (
                <button
                  onClick={stopTimer}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                >
                  ⏸️ 停止計時
                </button>
              )}
              <button
                onClick={resetTimer}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold"
              >
                🔄 重置
              </button>
            </div>
          </div>

          {/* 停止發言提示 */}
          {showStopSpeechAlert && (
            <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 text-center">
              <div className="text-lg text-blue-800">請台上辯士停止發言</div>
            </div>
          )}

          {/* 錄音區域 */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border-2 border-purple-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              🎙️ 錄音功能
            </h3>

            {/* 錄音狀態顯示 */}
            {isRecording && (
              <div className="mb-4 bg-red-100 border-2 border-red-500 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="w-4 h-4 bg-red-600 rounded-full animate-pulse"></div>
                  <span className="text-lg font-semibold text-red-800">
                    錄音中...
                  </span>
                </div>
                <div className="text-2xl font-mono text-red-700">
                  {formatTime(recordingDuration)}
                </div>
              </div>
            )}

            {/* 錄音控制按鈕 */}
            <div className="flex justify-center gap-3 mb-4">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold flex items-center gap-2"
                >
                  <span className="text-xl">🎙️</span>
                  開始錄音
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold flex items-center gap-2"
                >
                  <span className="text-xl">⏹️</span>
                  停止錄音
                </button>
              )}
            </div>

            {/* 錄音檔案操作 */}
            {recordedBlob && (
              <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3">錄音檔案</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={playRecording}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    ▶️ 播放
                  </button>
                  <button
                    onClick={downloadRecording}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center gap-2"
                  >
                    💾 下載
                  </button>
                  <button
                    onClick={transcribeAudio}
                    disabled={isTranscribing}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition flex items-center gap-2 disabled:bg-gray-400"
                  >
                    {isTranscribing ? "轉換中..." : "📝 轉逐字稿"}
                  </button>
                  <button
                    onClick={() => {
                      setRecordedBlob(null);
                      setTranscription("");
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition flex items-center gap-2"
                  >
                    🗑️ 刪除
                  </button>
                </div>

                {/* 逐字稿顯示 */}
                {transcription && (
                  <div className="mt-4">
                    <h5 className="font-semibold text-gray-800 mb-2">
                      逐字稿：
                    </h5>
                    <div className="bg-gray-50 rounded p-4 max-h-64 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700">
                        {transcription}
                      </pre>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(transcription);
                        alert("已複製到剪貼簿");
                      }}
                      className="mt-2 px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition"
                    >
                      📋 複製逐字稿
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
