// DebateTimer.jsx - 辯論計時器元件
// 支援多種賽制的計時器

import { useState, useEffect, useRef } from 'react';

// 賽制時間設定（秒數）
const FORMATS = {
  'oregon-3-3-3': {
    name: '奧瑞岡 3-3-3',
    constructive: 3 * 60,
    rebuttal: 3 * 60,
    summary: 3 * 60
  },
  'oregon-4-4-4': {
    name: '奧瑞岡 4-4-4',
    constructive: 4 * 60,
    rebuttal: 4 * 60,
    summary: 4 * 60
  },
  'singapore': {
    name: '新加坡賽制',
    constructive: 7 * 60,
    rebuttal: 4 * 60,
    summary: 5 * 60
  }
};

// 辯論階段順序
const PHASES = [
  { id: 'aff-c1', label: '正方一辯立論', type: 'constructive', side: 'aff' },
  { id: 'neg-c1', label: '反方一辯立論', type: 'constructive', side: 'neg' },
  { id: 'aff-c2', label: '正方二辯立論', type: 'constructive', side: 'aff' },
  { id: 'neg-c2', label: '反方二辯立論', type: 'constructive', side: 'neg' },
  { id: 'neg-r1', label: '反方一辯質詢', type: 'rebuttal', side: 'neg' },
  { id: 'aff-r1', label: '正方一辯質詢', type: 'rebuttal', side: 'aff' },
  { id: 'neg-r2', label: '反方二辯質詢', type: 'rebuttal', side: 'neg' },
  { id: 'aff-r2', label: '正方二辯質詢', type: 'rebuttal', side: 'aff' },
  { id: 'aff-s1', label: '正方一辯總結', type: 'summary', side: 'aff' },
  { id: 'neg-s1', label: '反方一辯總結', type: 'summary', side: 'neg' },
];

export default function DebateTimer({ format = 'oregon-3-3-3' }) {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  const formatConfig = FORMATS[format] || FORMATS['oregon-3-3-3'];
  const currentPhase = PHASES[currentPhaseIndex];
  const phaseTime = formatConfig[currentPhase.type];

  // 初始化時間
  useEffect(() => {
    setTimeRemaining(phaseTime);
    setIsRunning(false);
  }, [currentPhaseIndex, format]);

  // 計時器邏輯
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            // 時間到，播放提示音（可選）
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeRemaining]);

  // 格式化時間顯示
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 開始/暫停
  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  // 重置當前階段
  const resetPhase = () => {
    setIsRunning(false);
    setTimeRemaining(phaseTime);
  };

  // 下一階段
  const nextPhase = () => {
    if (currentPhaseIndex < PHASES.length - 1) {
      setCurrentPhaseIndex(currentPhaseIndex + 1);
    }
  };

  // 上一階段
  const prevPhase = () => {
    if (currentPhaseIndex > 0) {
      setCurrentPhaseIndex(currentPhaseIndex - 1);
    }
  };

  // 跳到指定階段
  const jumpToPhase = (index) => {
    setCurrentPhaseIndex(index);
  };

  return (
    <div>
      {/* 大型計時器顯示 */}
      <div className={`rounded-lg p-8 mb-6 text-center ${
        currentPhase.side === 'aff' 
          ? 'bg-blue-100 border-4 border-blue-400' 
          : 'bg-red-100 border-4 border-red-400'
      }`}>
        <h2 className={`text-2xl font-bold mb-4 ${
          currentPhase.side === 'aff' ? 'text-blue-800' : 'text-red-800'
        }`}>
          {currentPhase.label}
        </h2>
        
        <div className={`text-8xl font-mono font-bold mb-6 ${
          timeRemaining <= 30 && timeRemaining > 0 
            ? 'text-red-600 animate-pulse' 
            : currentPhase.side === 'aff' 
              ? 'text-blue-700' 
              : 'text-red-700'
        }`}>
          {formatTime(timeRemaining)}
        </div>

        {/* 控制按鈕 */}
        <div className="flex justify-center gap-4">
          <button
            onClick={toggleTimer}
            className={`px-8 py-4 rounded-lg font-bold text-xl transition ${
              isRunning
                ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isRunning ? '⏸ 暫停' : '▶️ 開始'}
          </button>
          
          <button
            onClick={resetPhase}
            className="px-8 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold text-xl transition"
          >
            🔄 重置
          </button>
        </div>
      </div>

      {/* 階段導航 */}
      <div className="bg-white rounded-lg p-6 mb-6">
        <h3 className="font-bold text-gray-800 mb-3">辯論階段</h3>
        <div className="flex justify-between gap-2 mb-4">
          <button
            onClick={prevPhase}
            disabled={currentPhaseIndex === 0}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            ← 上一階段
          </button>
          
          <span className="px-4 py-2 bg-gray-100 rounded text-gray-700 font-semibold">
            {currentPhaseIndex + 1} / {PHASES.length}
          </span>
          
          <button
            onClick={nextPhase}
            disabled={currentPhaseIndex === PHASES.length - 1}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            下一階段 →
          </button>
        </div>

        {/* 所有階段列表 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {PHASES.map((phase, index) => (
            <button
              key={phase.id}
              onClick={() => jumpToPhase(index)}
              className={`px-3 py-2 rounded text-sm font-medium transition ${
                index === currentPhaseIndex
                  ? phase.side === 'aff'
                    ? 'bg-blue-600 text-white'
                    : 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {phase.label}
            </button>
          ))}
        </div>
      </div>

      {/* 賽制資訊 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-2">賽制：{formatConfig.name}</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>立論：{formatConfig.constructive / 60} 分鐘</p>
          <p>質詢：{formatConfig.rebuttal / 60} 分鐘</p>
          <p>總結：{formatConfig.summary / 60} 分鐘</p>
        </div>
      </div>
    </div>
  );
}
