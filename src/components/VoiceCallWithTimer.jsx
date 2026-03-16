import { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase/config";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  addDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../contexts/AuthContext";
import {
  notifyMeetingStart,
  getTeamMemberIds,
  getMatchParticipantIds,
} from "../firebase/notificationHelpers";

// WebRTC 配置
const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    // TURN 服務器 — 改善手機/不同網路間的 NAT 穿透
    {
      urls: "turn:freestun.net:3478",
      username: "free",
      credential: "free",
    },
    {
      urls: "turn:freestun.net:5349",
      username: "free",
      credential: "free",
    },
  ],
  iceCandidatePoolSize: 10,
};

// 預設計時方案
const TIMER_PRESETS = [
  {
    name: "奧瑞岡444制",
    duration: 270,
    bells: [
      { time: 210, count: 1, label: "3分30秒" },
      { time: 239, count: 1, label: "3分59秒" },
      { time: 240, count: 1, label: "4分0秒" },
      { time: 268, count: 1, label: "4分28秒" },
      { time: 269, count: 1, label: "4分29秒" },
      { time: 270, count: 1, label: "4分30秒（結束）" },
    ],
  },
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

export function VoiceCallWithTimer({
  teamId,
  onClose,
  recordingType = "team",
}) {
  const { currentUser } = useAuth();

  // 會議室狀態
  const [roomData, setRoomData] = useState(null);
  const [inRoom, setInRoom] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const localStreamRef = useRef(null); // 用 ref 確保能在事件監聽器中獲取最新值
  const sessionIdRef = useRef(
    `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  ); // 唯一會話 ID

  // WebRTC 狀態
  const peerConnectionsRef = useRef({}); // { sessionId: RTCPeerConnection }
  const remoteStreamsRef = useRef({}); // { sessionId: MediaStream }
  const [remoteAudioElements, setRemoteAudioElements] = useState({});
  const [audioBlocked, setAudioBlocked] = useState(false); // 手機瀏覽器阻擋音頻播放
  const audioElementsRef = useRef({}); // 保存音頻 DOM 元素的引用

  // 錄音狀態
  const [isRecording, setIsRecording] = useState(false);
  const [showRecordingAlert, setShowRecordingAlert] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingDurationIntervalRef = useRef(null);
  const mixedStreamRef = useRef(null); // 混合音頻流（本地 + 遠端）

  // 計時器狀態
  const [timerRunning, setTimerRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customDuration, setCustomDuration] = useState(270);
  const [customBells, setCustomBells] = useState([]);
  const [showStopSpeechAlert, setShowStopSpeechAlert] = useState(false);
  const [bellsRung, setBellsRung] = useState([]);
  const [showTimerSettings, setShowTimerSettings] = useState(false);

  const timerIntervalRef = useRef(null);
  const audioContextRef = useRef(null);

  // 初始化音頻上下文
  useEffect(() => {
    audioContextRef.current = new (
      window.AudioContext || window.webkitAudioContext
    )();

    // 檢查是否剛剛離開會議室，如果是則清除殘留會話
    const justLeft = sessionStorage.getItem("voiceCallLeft");
    if (justLeft === "true") {
      console.log("⚠️ 檢測到頁面刷新，清除殘留會話...");
      sessionStorage.removeItem("voiceCallLeft");

      // 清理 Firestore 中的舊會話
      const cleanupSession = async () => {
        try {
          const roomRef = doc(db, "voice_rooms", teamId);
          const roomSnap = await getDoc(roomRef);

          if (roomSnap.exists()) {
            const data = roomSnap.data();
            // 移除所有屬於當前用戶的舊會話
            const updatedParticipants = data.participants.filter(
              (p) => p.uid !== currentUser.uid,
            );

            if (updatedParticipants.length === 0) {
              await deleteDoc(roomRef);
              console.log("✅ 會議室已清空並刪除");
            } else if (
              updatedParticipants.length !== data.participants.length
            ) {
              await updateDoc(roomRef, { participants: updatedParticipants });
              console.log("✅ 已清理當前用戶的所有舊會話");
            }
          }
        } catch (error) {
          console.error("清理舊會話失敗:", error);
        }
      };

      cleanupSession();
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [teamId, currentUser]);

  // 響鈴音效
  const playBell = (count = 1) => {
    if (!audioContextRef.current) return;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const oscillator = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);
        oscillator.frequency.value = 800;
        oscillator.type = "sine";
        gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContextRef.current.currentTime + 0.3,
        );
        oscillator.start(audioContextRef.current.currentTime);
        oscillator.stop(audioContextRef.current.currentTime + 0.3);
      }, i * 400);
    }
  };

  // 監控遠程音頻元素變化
  useEffect(() => {
    console.log(
      "🔊 remoteAudioElements 更新:",
      Object.keys(remoteAudioElements),
    );
    Object.entries(remoteAudioElements).forEach(([sessionId, stream]) => {
      console.log(`Session ${sessionId}:`, {
        streamId: stream.id,
        active: stream.active,
        audioTracks: stream.getAudioTracks().length,
      });
    });
  }, [remoteAudioElements]);

  // 處理頁面刷新/關閉時自動離開會議室
  useEffect(() => {
    // 標記頁面是否正在卸載
    let isUnloading = false;

    // 停止麥克風的通用函數
    const stopMicrophone = (reason) => {
      console.log(`⚠️ ${reason}，正在強制關閉麥克風...`);

      const currentStream = localStreamRef.current;
      if (currentStream) {
        const tracks = currentStream.getTracks();
        console.log(`發現 ${tracks.length} 個音頻軌道，正在停止...`);
        tracks.forEach((track) => {
          try {
            track.stop();
            console.log(
              `✅ 已停止音頻軌道: ${track.id} (${track.label}) readyState: ${track.readyState}`,
            );
          } catch (e) {
            console.error("停止軌道失敗:", e);
          }
        });
      } else {
        console.log("⚠️ 沒有找到活動的音頻流 (localStreamRef.current 為 null)");
      }

      // 關閉所有 P2P 連接
      try {
        Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      } catch (e) {
        console.error("關閉 P2P 連接失敗:", e);
      }

      // 停止錄音
      try {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state !== "inactive"
        ) {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {
        console.error("停止錄音失敗:", e);
      }

      // 清除定時器
      if (recordingDurationIntervalRef.current) {
        clearInterval(recordingDurationIntervalRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      console.log("✅ 所有資源已清理完畢");
    };

    // 頁面即將卸載時調用（刷新/關閉）
    const handleBeforeUnload = (e) => {
      isUnloading = true; // 標記頁面正在卸載
      stopMicrophone("頁面即將關閉");

      // 如果在會議室中，立即標記離開狀態
      if (inRoom) {
        // 設置一個標記，表示用戶已離開
        sessionStorage.setItem("voiceCallLeft", "true");

        console.log("⚠️ 正在從會議室中移除會話記錄...");

        // 嘗試同步移除 Firestore 會話（可能不會完成，但嘗試一下）
        try {
          const roomRef = doc(db, "voice_rooms", teamId);
          getDoc(roomRef).then((roomSnap) => {
            if (roomSnap.exists()) {
              const data = roomSnap.data();
              const updatedParticipants = data.participants.filter(
                (p) => p.sessionId !== sessionIdRef.current,
              );

              if (updatedParticipants.length === 0) {
                deleteDoc(roomRef);
              } else {
                updateDoc(roomRef, { participants: updatedParticipants });
              }
            }
          });
        } catch (e) {
          console.error("清除會議室會話失敗:", e);
        }
      }
    };

    // 頁面隱藏時只在真正卸載時停止麥克風
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("📱 頁面變為隱藏狀態");
        // 延遲檢查：如果 500ms 後還是隱藏且沒有標記為卸載，說明只是切換標籤
        setTimeout(() => {
          if (document.hidden && !isUnloading) {
            console.log("ℹ️ 只是切換標籤，保持麥克風開啟");
          }
        }, 500);
      } else {
        console.log("📱 頁面變為可見狀態");
        isUnloading = false; // 重置標記
      }
    };

    // 添加所有監聽器
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);
    window.addEventListener("unload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    console.log("✅ 已註冊麥克風關閉監聽器");

    // 清理事件監聽器（不要在這裡停止麥克風，因為依賴 [inRoom, teamId] 變化時會重新執行 cleanup 導致音軌被殺死）
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
      window.removeEventListener("unload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [inRoom, teamId]);

  // 組件真正卸載時才停止麥克風（空依賴 = 只在 unmount 時執行 cleanup）
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          track.stop();
          console.log(`✅ 組件卸載：已停止音頻軌道 ${track.id}`);
        });
      }
      // 關閉所有 P2P 連接
      Object.values(peerConnectionsRef.current).forEach((pc) => {
        try {
          pc.close();
        } catch (e) {
          /* ignore */
        }
      });
    };
  }, []);

  // 清理同一用戶的舊會話（進入會議室時）
  useEffect(() => {
    if (!inRoom) return;

    const cleanupOldSessions = async () => {
      try {
        const roomRef = doc(db, "voice_rooms", teamId);
        const roomSnap = await getDoc(roomRef);

        if (roomSnap.exists()) {
          const data = roomSnap.data();
          // 移除同一用戶的舊會話（不同 sessionId）
          const updatedParticipants = data.participants.filter(
            (p) =>
              !(
                p.uid === currentUser.uid &&
                p.sessionId !== sessionIdRef.current
              ),
          );

          if (updatedParticipants.length !== data.participants.length) {
            await updateDoc(roomRef, {
              participants: updatedParticipants,
            });
            console.log("✅ 已清理同一用戶的舊會話");
          }
        }
      } catch (error) {
        console.error("清理舊會話失敗:", error);
      }
    };

    cleanupOldSessions();
  }, [inRoom, teamId, currentUser]);

  // 獲取麥克風
  const getMediaStream = async () => {
    try {
      console.log("請求麥克風權限...");
      // 配置回聲消除和音頻增強功能
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true, // 回聲消除
          noiseSuppression: true, // 噪音抑制
          autoGainControl: true, // 自動增益控制
        },
      });
      console.log("取得麥克風成功，音頻軌道:", stream.getAudioTracks());
      stream.getAudioTracks().forEach((track) => {
        console.log("音頻軌道詳情:", {
          id: track.id,
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
        });
        // 顯示音頻約束設置
        const settings = track.getSettings();
        console.log("音頻設置:", {
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression,
          autoGainControl: settings.autoGainControl,
        });
      });
      return stream;
    } catch (error) {
      console.error("獲取麥克風失敗:", error);
      alert("無法訪問麥克風，請檢查權限設置");
      throw error;
    }
  };

  // 監聽會議室
  useEffect(() => {
    const roomRef = doc(db, "voice_rooms", teamId);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setRoomData(data);
        setParticipants(data.participants || []);

        // 檢查錄音狀態
        if (data.isRecording && !isRecording) {
          setShowRecordingAlert(true);
          setTimeout(() => setShowRecordingAlert(false), 3000);
        }

        // 如果在會議室中，處理新加入的用戶
        if (inRoom) {
          handleParticipantsChange(data.participants || []);
        }
      } else {
        setRoomData(null);
        setParticipants([]);
      }
    });

    return () => unsubscribe();
  }, [teamId, inRoom]);

  // 處理參與者變化（建立或關閉 P2P 連接）
  const handleParticipantsChange = async (newParticipants) => {
    const currentSessionIds = Object.keys(peerConnectionsRef.current);
    const newSessionIds = newParticipants
      .filter((p) => p.sessionId !== sessionIdRef.current) // 使用 sessionId 過濾自己的會話
      .map((p) => p.sessionId);

    // 關閉已離開用戶的連接
    currentSessionIds.forEach((sessionId) => {
      if (!newSessionIds.includes(sessionId)) {
        if (peerConnectionsRef.current[sessionId]) {
          peerConnectionsRef.current[sessionId].close();
          delete peerConnectionsRef.current[sessionId];
        }
        if (remoteStreamsRef.current[sessionId]) {
          remoteStreamsRef.current[sessionId]
            .getTracks()
            .forEach((track) => track.stop());
          delete remoteStreamsRef.current[sessionId];
        }
      }
    });

    // 為新會話創建連接（只有本地 sessionId 較小的一方發起 offer，避免競爭）
    for (const sessionId of newSessionIds) {
      if (!peerConnectionsRef.current[sessionId]) {
        // 比較 sessionId，只有較小的一方主動發起連接
        const shouldInitiate = sessionIdRef.current < sessionId;
        if (shouldInitiate) {
          console.log("🎯 本地 sessionId 較小，主動發起連接到:", sessionId);
          await createPeerConnection(sessionId);
        } else {
          console.log("⏳ 本地 sessionId 較大，等待來自", sessionId, "的連接");
        }
      }
    }
  };

  // 創建 P2P 連接
  const createPeerConnection = async (remoteSessionId) => {
    try {
      console.log("為會話創建 P2P 連接:", remoteSessionId);
      const peerConnection = new RTCPeerConnection(rtcConfig);
      peerConnectionsRef.current[remoteSessionId] = peerConnection;

      // 添加本地音頻流（使用 ref 避免陷入過期閉包）
      const currentStream = localStreamRef.current;
      if (currentStream) {
        console.log("📤 準備添加本地音頻流到 P2P 連接");
        currentStream.getTracks().forEach((track) => {
          console.log("📤 添加本地軌道:", {
            kind: track.kind,
            label: track.label,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
          });
          peerConnection.addTrack(track, currentStream);

          // 監聽本地軌道的狀態變化
          track.addEventListener("mute", () => {
            console.error("❌ 本地軌道被靜音!", track.id);
          });
          track.addEventListener("unmute", () => {
            console.log("✅ 本地軌道取消靜音", track.id);
          });
          track.addEventListener("ended", () => {
            console.error("❌ 本地軌道已結束!", track.id);
          });

          console.log("✅ 本地軌道已添加到 PeerConnection");
        });
      } else {
        console.warn("⚠️ 警告：本地流不存在，無法添加音頻軌道");
      }

      // 接收遠程音頻流
      peerConnection.ontrack = (event) => {
        console.log("收到遠程音頻流:", remoteSessionId);
        const remoteStream = event.streams[0];
        const audioTracks = remoteStream.getAudioTracks();
        console.log("遠程流軌道:", audioTracks);

        // 驗證接收者狀態
        const receivers = peerConnection.getReceivers();
        console.log(`📥 接收者數量: ${receivers.length}`);
        receivers.forEach((receiver, index) => {
          if (receiver.track) {
            console.log(`📥 接收者 ${index}:`, {
              kind: receiver.track.kind,
              enabled: receiver.track.enabled,
              muted: receiver.track.muted,
              readyState: receiver.track.readyState,
            });
          }
        });

        // 詳細檢查音頻軌道
        audioTracks.forEach((track, index) => {
          console.log(`音頻軌道 ${index}:`, {
            id: track.id,
            label: track.label,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
          });

          // 監聽軌道 unmute 事件
          track.addEventListener("unmute", () => {
            console.log(`✅ 軌道 ${index} 已取消靜音:`, track.id);
          });

          track.addEventListener("mute", () => {
            console.log(`⚠️ 軌道 ${index} 被靜音:`, track.id);
          });

          // 如果軌道當前靜音，記錄警告
          if (track.muted) {
            console.log(`⚠️ 軌道 ${index} 當前靜音，等待 unmute 事件`);
          }
        });

        remoteStreamsRef.current[remoteSessionId] = remoteStream;

        // 創建音頻元素
        setRemoteAudioElements((prev) => {
          console.log("更新音頻元素狀態，新增 sessionId:", remoteSessionId);
          return {
            ...prev,
            [remoteSessionId]: remoteStream,
          };
        });
      };

      // 處理 ICE candidates
      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          // 保存 ICE candidate 到 Firestore
          const candidatesRef = collection(
            db,
            "voice_rooms",
            teamId,
            "ice_candidates",
          );
          await addDoc(candidatesRef, {
            fromSessionId: sessionIdRef.current,
            toSessionId: remoteSessionId,
            candidate: event.candidate.toJSON(),
            createdAt: serverTimestamp(),
          });
        }
      };

      // ICE 連接狀態變化（更詳細）
      peerConnection.oniceconnectionstatechange = () => {
        console.log(
          `🧊 ICE 連接狀態 (${remoteSessionId}):`,
          peerConnection.iceConnectionState,
        );

        // 處理連接失敗
        if (peerConnection.iceConnectionState === "failed") {
          console.error("❌ ICE 連接失敗，嘗試重啟 ICE...");
          peerConnection.restartIce();
        }

        if (peerConnection.iceConnectionState === "disconnected") {
          console.warn("⚠️ ICE 連接斷開");
        }

        if (peerConnection.iceConnectionState === "connected") {
          console.log("✅ ICE 連接成功");
        }
      };

      // 連接狀態變化
      peerConnection.onconnectionstatechange = () => {
        console.log(
          `連接狀態 (${remoteSessionId}):`,
          peerConnection.connectionState,
        );

        // 處理連接失敗
        if (peerConnection.connectionState === "failed") {
          console.error("❌ P2P 連接完全失敗");
          // 可以在這裡添加重連邏輯
        }
      };

      // ICE 候選收集狀態
      peerConnection.onicegatheringstatechange = () => {
        console.log(
          `📡 ICE 收集狀態 (${remoteSessionId}):`,
          peerConnection.iceGatheringState,
        );
      };

      // 創建並發送 offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // 驗證發送者狀態
      const senders = peerConnection.getSenders();
      console.log(`📤 發送者數量: ${senders.length}`);
      senders.forEach((sender, index) => {
        if (sender.track) {
          console.log(`📤 發送者 ${index}:`, {
            kind: sender.track.kind,
            enabled: sender.track.enabled,
            muted: sender.track.muted,
            readyState: sender.track.readyState,
          });
        }
      });

      // 保存 offer 到 Firestore
      const offersRef = collection(db, "voice_rooms", teamId, "offers");
      await addDoc(offersRef, {
        fromSessionId: sessionIdRef.current,
        toSessionId: remoteSessionId,
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("創建 P2P 連接失敗:", error);
    }
  };

  // 監聽offers（接收來自其他會話的 offer）
  useEffect(() => {
    if (!inRoom) return;

    const offersRef = collection(db, "voice_rooms", teamId, "offers");
    const q = query(
      offersRef,
      where("toSessionId", "==", sessionIdRef.current),
      orderBy("createdAt", "desc"),
      limit(30),
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === "added") {
          const data = change.doc.data();
          await handleOffer(data.fromSessionId, data.offer);
          // 刪除已處理的 offer
          await deleteDoc(change.doc.ref);
        }
      }
    });

    return () => unsubscribe();
  }, [inRoom, teamId]);

  // 處理收到的 offer
  const handleOffer = async (remoteSessionId, offer) => {
    try {
      console.log("處理來自", remoteSessionId, "的 offer");
      let peerConnection = peerConnectionsRef.current[remoteSessionId];

      if (!peerConnection) {
        console.log("創建新的 P2P 連接來處理 offer");
        peerConnection = new RTCPeerConnection(rtcConfig);
        peerConnectionsRef.current[remoteSessionId] = peerConnection;

        // 添加本地音頻流（使用 ref 避免過期閉包）
        const currentStream = localStreamRef.current;
        if (currentStream) {
          console.log("📤 準備添加本地音頻流 (handleOffer)");
          currentStream.getTracks().forEach((track) => {
            console.log("📤 添加本地軌道 (handleOffer):", {
              kind: track.kind,
              label: track.label,
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState,
            });
            peerConnection.addTrack(track, currentStream);

            // 監聽本地軌道的狀態變化
            track.addEventListener("mute", () => {
              console.error("❌ 本地軌道被靜音! (handleOffer)", track.id);
            });
            track.addEventListener("unmute", () => {
              console.log("✅ 本地軌道取消靜音 (handleOffer)", track.id);
            });
            track.addEventListener("ended", () => {
              console.error("❌ 本地軌道已結束! (handleOffer)", track.id);
            });

            console.log("✅ 本地軌道已添加到 PeerConnection");
          });
        } else {
          console.warn("⚠️ 警告：本地流不存在 (handleOffer)");
        }

        // 接收遠程音頻流
        peerConnection.ontrack = (event) => {
          console.log("收到遠程音頻流:", remoteSessionId);
          const remoteStream = event.streams[0];
          const audioTracks = remoteStream.getAudioTracks();
          console.log("遠程流軌道:", audioTracks);

          // 驗證接收者狀態（handleOffer）
          const receivers = peerConnection.getReceivers();
          console.log(`📥 接收者數量 (handleOffer): ${receivers.length}`);
          receivers.forEach((receiver, index) => {
            if (receiver.track) {
              console.log(`📥 接收者 ${index} (handleOffer):`, {
                kind: receiver.track.kind,
                enabled: receiver.track.enabled,
                muted: receiver.track.muted,
                readyState: receiver.track.readyState,
              });
            }
          });

          // 詳細檢查音頻軌道
          audioTracks.forEach((track, index) => {
            console.log(`音頻軌道 ${index}:`, {
              id: track.id,
              label: track.label,
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState,
            });

            // 監聽軌道 unmute 事件
            track.addEventListener("unmute", () => {
              console.log(`✅ 軌道 ${index} 已取消靜音:`, track.id);
            });

            track.addEventListener("mute", () => {
              console.log(`⚠️ 軌道 ${index} 被靜音:`, track.id);
            });

            // 如果軌道當前靜音，記錄警告
            if (track.muted) {
              console.log(`⚠️ 軌道 ${index} 當前靜音，等待 unmute 事件`);
            }
          });

          remoteStreamsRef.current[remoteSessionId] = remoteStream;
          setRemoteAudioElements((prev) => {
            console.log(
              "更新音頻元素狀態（handleOffer），新增 sessionId:",
              remoteSessionId,
            );
            return {
              ...prev,
              [remoteSessionId]: remoteStream,
            };
          });
        };

        // 處理 ICE candidates
        peerConnection.onicecandidate = async (event) => {
          if (event.candidate) {
            const candidatesRef = collection(
              db,
              "voice_rooms",
              teamId,
              "ice_candidates",
            );
            await addDoc(candidatesRef, {
              fromSessionId: sessionIdRef.current,
              toSessionId: remoteSessionId,
              candidate: event.candidate.toJSON(),
              createdAt: serverTimestamp(),
            });
          }
        };

        // ICE 連接狀態變化
        peerConnection.oniceconnectionstatechange = () => {
          console.log(
            `🧊 ICE 連接狀態 (${remoteSessionId}, handleOffer):`,
            peerConnection.iceConnectionState,
          );

          if (peerConnection.iceConnectionState === "failed") {
            console.error("❌ ICE 連接失敗，嘗試重啟 ICE...");
            peerConnection.restartIce();
          }

          if (peerConnection.iceConnectionState === "disconnected") {
            console.warn("⚠️ ICE 連接斷開");
          }

          if (peerConnection.iceConnectionState === "connected") {
            console.log("✅ ICE 連接成功");
          }
        };

        // 連接狀態變化
        peerConnection.onconnectionstatechange = () => {
          console.log(
            `連接狀態 (${remoteSessionId}, handleOffer):`,
            peerConnection.connectionState,
          );

          if (peerConnection.connectionState === "failed") {
            console.error("❌ P2P 連接完全失敗");
          }
        };

        // ICE 候選收集狀態
        peerConnection.onicegatheringstatechange = () => {
          console.log(
            `📡 ICE 收集狀態 (${remoteSessionId}, handleOffer):`,
            peerConnection.iceGatheringState,
          );
        };
      }

      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer),
      );

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // 驗證發送者狀態（handleOffer）
      const senders = peerConnection.getSenders();
      console.log(`📤 發送者數量 (handleOffer): ${senders.length}`);
      senders.forEach((sender, index) => {
        if (sender.track) {
          console.log(`📤 發送者 ${index} (handleOffer):`, {
            kind: sender.track.kind,
            enabled: sender.track.enabled,
            muted: sender.track.muted,
            readyState: sender.track.readyState,
          });
        }
      });

      // 發送 answer
      const answersRef = collection(db, "voice_rooms", teamId, "answers");
      await addDoc(answersRef, {
        fromSessionId: sessionIdRef.current,
        toSessionId: remoteSessionId,
        answer: {
          type: answer.type,
          sdp: answer.sdp,
        },
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("處理 offer 失敗:", error);
    }
  };

  // 監聽 answers
  useEffect(() => {
    if (!inRoom) return;

    const answersRef = collection(db, "voice_rooms", teamId, "answers");
    const q = query(
      answersRef,
      where("toSessionId", "==", sessionIdRef.current),
      orderBy("createdAt", "desc"),
      limit(30),
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === "added") {
          const data = change.doc.data();
          await handleAnswer(data.fromSessionId, data.answer);
          await deleteDoc(change.doc.ref);
        }
      }
    });

    return () => unsubscribe();
  }, [inRoom, teamId]);

  // 處理收到的 answer
  const handleAnswer = async (remoteSessionId, answer) => {
    try {
      const peerConnection = peerConnectionsRef.current[remoteSessionId];
      if (peerConnection) {
        // 檢查連接狀態，避免在 stable 狀態設置 remote description
        if (peerConnection.signalingState === "have-local-offer") {
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(answer),
          );
          console.log("成功設置 remote answer:", remoteSessionId);
        } else {
          console.warn(
            "跳過設置 answer，當前狀態:",
            peerConnection.signalingState,
          );
        }
      }
    } catch (error) {
      console.error("處理 answer 失敗:", error);
    }
  };

  // 監聽 ICE candidates
  useEffect(() => {
    if (!inRoom) return;

    const candidatesRef = collection(
      db,
      "voice_rooms",
      teamId,
      "ice_candidates",
    );
    const q = query(
      candidatesRef,
      where("toSessionId", "==", sessionIdRef.current),
      orderBy("createdAt", "desc"),
      limit(50),
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === "added") {
          const data = change.doc.data();
          await handleIceCandidate(data.fromSessionId, data.candidate);
          await deleteDoc(change.doc.ref);
        }
      }
    });

    return () => unsubscribe();
  }, [inRoom, teamId]);

  // 處理 ICE candidate
  const handleIceCandidate = async (remoteSessionId, candidate) => {
    try {
      const peerConnection = peerConnectionsRef.current[remoteSessionId];
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error("添加 ICE candidate 失敗:", error);
    }
  };

  // 創建會議室
  const createRoom = async () => {
    try {
      // 手機瀏覽器需要在用戶互動時恢復 AudioContext
      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume();
      }

      const stream = await getMediaStream();
      setLocalStream(stream);
      localStreamRef.current = stream; // 同步更新 ref

      const roomRef = doc(db, "voice_rooms", teamId);
      await setDoc(roomRef, {
        teamId,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName || currentUser.email,
        participants: [
          {
            uid: currentUser.uid,
            sessionId: sessionIdRef.current, // 添加唯一的會話 ID
            name: currentUser.displayName || currentUser.email,
            isMuted: false,
            isRecording: false,
            joinedAt: new Date().toISOString(),
          },
        ],
        isRecording: false,
        createdAt: serverTimestamp(),
      });

      setInRoom(true);

      // 創建房間時發送通知給其他成員
      try {
        let memberIds = [];
        let roomName = "會議";

        if (recordingType === "team") {
          // 隊伍會議：從 teams 集合獲取成員
          memberIds = await getTeamMemberIds(teamId);
          const teamDocSnap = await getDoc(doc(db, "teams", teamId));
          roomName = teamDocSnap.exists() ? teamDocSnap.data().name : "隊伍";
        } else {
          // 練習賽會議：從 practice_matches 獲取雙方隊伍成員
          memberIds = await getMatchParticipantIds(teamId);
          const matchDocSnap = await getDoc(
            doc(db, "practice_matches", teamId),
          );
          roomName = matchDocSnap.exists()
            ? matchDocSnap.data().title || "練習賽"
            : "練習賽";
        }

        console.log(
          "📢 會議通知 - 類型:",
          recordingType,
          "成員數:",
          memberIds.length,
          "成員:",
          memberIds,
        );

        if (memberIds.length > 1) {
          await notifyMeetingStart(
            teamId,
            roomName,
            currentUser.uid,
            currentUser.displayName || currentUser.email,
            memberIds,
            recordingType === "team" ? "team" : "match",
          );
          console.log("✅ 已發送會議開始通知給", memberIds.length - 1, "人");
        } else {
          console.warn("⚠️ 成員不足，無法發送通知。memberIds:", memberIds);
        }
      } catch (error) {
        console.error("❌ 發送會議通知失敗:", error);
      }
    } catch (error) {
      console.error("創建會議室失敗:", error);
      alert("創建會議室失敗: " + error.message);
    }
  };

  // 加入會議室
  const joinRoom = async () => {
    try {
      // 手機瀏覽器需要在用戶互動時恢復 AudioContext
      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume();
      }

      const stream = await getMediaStream();
      setLocalStream(stream);
      localStreamRef.current = stream; // 同步更新 ref

      const roomRef = doc(db, "voice_rooms", teamId);

      await updateDoc(roomRef, {
        participants: arrayUnion({
          uid: currentUser.uid,
          sessionId: sessionIdRef.current,
          name: currentUser.displayName || currentUser.email,
          isMuted: false,
          isRecording: false,
          joinedAt: new Date().toISOString(),
        }),
      });

      setInRoom(true);
    } catch (error) {
      console.error("加入會議室失敗:", error);
      alert("加入會議室失敗: " + error.message);
    }
  };

  // 離開會議室
  const leaveRoom = async () => {
    try {
      // 停止錄音
      if (isRecording) {
        await stopRecording();
      }

      // 停止本地流
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
        localStreamRef.current = null; // 同步清空 ref
      }

      // 關閉混合錄音用的 AudioContext
      if (mixedStreamRef.current?.ctx) {
        mixedStreamRef.current.ctx.close();
        mixedStreamRef.current = null;
      }

      // 關閉所有 P2P 連接
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      peerConnectionsRef.current = {};
      remoteStreamsRef.current = {};
      audioElementsRef.current = {};
      setRemoteAudioElements({});
      setAudioBlocked(false);

      // 更新 Firestore
      const roomRef = doc(db, "voice_rooms", teamId);
      const roomSnap = await getDoc(roomRef);

      if (roomSnap.exists()) {
        const data = roomSnap.data();
        const updatedParticipants = data.participants.filter(
          (p) => p.sessionId !== sessionIdRef.current, // 使用 sessionId 過濾
        );

        if (updatedParticipants.length === 0) {
          await deleteDoc(roomRef);
        } else {
          await updateDoc(roomRef, {
            participants: updatedParticipants,
          });
        }
      }

      setInRoom(false);
      setIsMuted(false);
    } catch (error) {
      console.error("離開會議室失敗:", error);
    }
  };

  // 切換靜音
  const toggleMute = async () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMutedState = !audioTrack.enabled;
        setIsMuted(newMutedState);

        // 更新 Firestore 中的靜音狀態，讓其他人看到
        try {
          const roomRef = doc(db, "voice_rooms", teamId);
          const roomSnap = await getDoc(roomRef);
          if (roomSnap.exists()) {
            const data = roomSnap.data();
            const updatedParticipants = data.participants.map((p) =>
              p.sessionId === sessionIdRef.current
                ? { ...p, isMuted: newMutedState }
                : p,
            );
            await updateDoc(roomRef, {
              participants: updatedParticipants,
            });
            console.log(
              `${newMutedState ? "🔇 已靜音" : "🎤 已取消靜音"}，已同步到其他參與者`,
            );
          }
        } catch (error) {
          console.error("更新靜音狀態失敗:", error);
        }
      }
    }
  };

  // 開始錄音
  const startRecording = async () => {
    if (!inRoom) {
      alert("請先加入會議室");
      return;
    }

    const currentLocalStream = localStreamRef.current;
    if (!currentLocalStream) {
      alert("無法訪問麥克風");
      return;
    }

    try {
      // 更新會議室狀態
      const roomRef = doc(db, "voice_rooms", teamId);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const data = roomSnap.data();
        const updatedParticipants = data.participants.map((p) =>
          p.sessionId === sessionIdRef.current
            ? { ...p, isRecording: true }
            : p,
        );
        await updateDoc(roomRef, {
          isRecording: true,
          participants: updatedParticipants,
        });
      }

      // 使用 Web Audio API 混合本地 + 所有遠端音頻
      const mixCtx = new (window.AudioContext || window.webkitAudioContext)();
      const destination = mixCtx.createMediaStreamDestination();

      // 加入本地麥克風
      const localSource = mixCtx.createMediaStreamSource(currentLocalStream);
      localSource.connect(destination);
      console.log("🎙️ 已加入本地麥克風到混合流");

      // 加入所有遠端音頻流
      let remoteCount = 0;
      Object.entries(remoteStreamsRef.current).forEach(
        ([sessionId, stream]) => {
          if (stream && stream.active && stream.getAudioTracks().length > 0) {
            const remoteSource = mixCtx.createMediaStreamSource(stream);
            remoteSource.connect(destination);
            remoteCount++;
            console.log("🔊 已加入遠端音頻到混合流:", sessionId);
          }
        },
      );
      console.log(`📝 開始錄音：本地 + ${remoteCount} 個遠端音頻`);

      mixedStreamRef.current = { ctx: mixCtx, destination };

      // 開始錄製混合流
      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(destination.stream, {
        mimeType: "audio/webm",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log(
          "錄音停止，準備保存，總計:",
          recordedChunksRef.current.length,
          "chunks",
        );
        // 關閉混合用的 AudioContext
        if (mixedStreamRef.current?.ctx) {
          mixedStreamRef.current.ctx.close();
          mixedStreamRef.current = null;
        }
        await saveRecording();
      };

      // 每1秒收集一次數據
      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      console.log("開始錄音...");

      // 錄音時長計時
      recordingDurationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // 顯示提示
      setShowRecordingAlert(true);
      setTimeout(() => setShowRecordingAlert(false), 3000);
    } catch (error) {
      console.error("開始錄音失敗:", error);
      alert("開始錄音失敗: " + error.message);
    }
  };

  // 停止錄音
  const stopRecording = async () => {
    console.log("停止錄音...");

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      console.log(
        "MediaRecorder 狀態:",
        mediaRecorderRef.current.state,
        "正在停止...",
      );
      mediaRecorderRef.current.stop();
    }

    if (recordingDurationIntervalRef.current) {
      clearInterval(recordingDurationIntervalRef.current);
    }

    setIsRecording(false);
    setRecordingDuration(0);

    // 更新會議室狀態
    try {
      const roomRef = doc(db, "voice_rooms", teamId);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const data = roomSnap.data();
        const updatedParticipants = data.participants.map((p) =>
          p.sessionId === sessionIdRef.current
            ? { ...p, isRecording: false }
            : p,
        );
        const stillRecording = updatedParticipants.some((p) => p.isRecording);
        await updateDoc(roomRef, {
          isRecording: stillRecording,
          participants: updatedParticipants,
        });
      }
    } catch (error) {
      console.error("更新錄音狀態失敗:", error);
    }
  };

  // 保存錄音
  const saveRecording = async () => {
    console.log("準備保存錄音, chunks數量:", recordedChunksRef.current.length);

    if (recordedChunksRef.current.length === 0) {
      console.log("沒有錄音數據，跳過保存");
      return;
    }

    try {
      const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
      console.log("創建錄音 Blob，大小:", blob.size, "bytes");

      const timestamp = Date.now();
      const fileName = `recording_${currentUser.uid}_${timestamp}.webm`;

      // Storage 路徑
      let storagePath;
      let fullPath;
      if (recordingType === "team") {
        storagePath = `team_recordings/${teamId}/${fileName}`;
        fullPath = storagePath;
      } else {
        storagePath = `practice_matches/${teamId}/recordings/${fileName}`;
        fullPath = storagePath;
      }

      console.log("上傳路徑:", storagePath);
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, blob);
      console.log("上傳完成");

      const downloadURL = await getDownloadURL(storageRef);
      console.log("取得下載 URL:", downloadURL);

      // 保存到頂層集合（讓錄音區能讀取）
      const recordingsCollection =
        recordingType === "team"
          ? collection(db, "team_recordings")
          : collection(db, "practice_match_recordings");

      console.log("保存到 Firestore...");
      const recordingData = {
        fileName,
        fileSize: blob.size,
        fileType: blob.type,
        storagePath: fullPath,
        downloadURL,
        duration: recordingDuration,
        title: `語音會議錄音 ${new Date().toLocaleString("zh-TW")}`,
        description: "語音會議室錄音",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // 添加 teamId 或 matchId
      if (recordingType === "team") {
        recordingData.teamId = teamId;
        recordingData.uploadedBy = currentUser.uid;
        recordingData.uploaderName =
          currentUser.displayName || currentUser.email;
        recordingData.uploaderEmail = currentUser.email;
      } else {
        recordingData.matchId = teamId; // 練習賽用 matchId
        recordingData.uploaderId = currentUser.uid;
        recordingData.uploaderName =
          currentUser.displayName || currentUser.email;
        recordingData.uploaderEmail = currentUser.email;
      }

      await addDoc(recordingsCollection, recordingData);

      recordedChunksRef.current = [];
      console.log("錄音保存成功！");
      alert("錄音已保存到錄音區");
    } catch (error) {
      console.error("保存錄音失敗:", error);
      console.error("錯誤詳情:", error.message, error.code);
      alert("保存錄音失敗: " + error.message);
    }
  };

  // 計時器功能
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
    setShowTimerSettings(false);

    let time = 0;
    timerIntervalRef.current = setInterval(() => {
      time++;
      setCurrentTime(time);

      const bell = bells.find((b) => b.time === time);
      if (bell) {
        playBell(bell.count);
        setBellsRung((prev) => [...prev, bell]);

        if (time >= duration) {
          setTimeout(() => {
            setShowStopSpeechAlert(true);
            stopTimer();
          }, bell.count * 400);
        }
      }

      if (time >= duration && !bells.find((b) => b.time === duration)) {
        setShowStopSpeechAlert(true);
        stopTimer();
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setTimerRunning(false);
  };

  const resetTimer = () => {
    stopTimer();
    setCurrentTime(0);
    setBellsRung([]);
    setShowStopSpeechAlert(false);
  };

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

  // 清理
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (recordingDurationIntervalRef.current) {
        clearInterval(recordingDurationIntervalRef.current);
      }
      if (inRoom) {
        leaveRoom();
      }
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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
        {/* 隱藏的遠程音頻元素 */}
        {Object.entries(remoteAudioElements).map(([sessionId, stream]) => (
          <audio
            key={sessionId}
            autoPlay
            playsInline
            ref={(el) => {
              if (el && stream) {
                if (el.srcObject !== stream) {
                  el.srcObject = stream;
                  el.volume = 1.0;
                }
                audioElementsRef.current[sessionId] = el;

                el.play()
                  .then(() => {
                    console.log("✅ 音頻播放成功:", sessionId);
                    setAudioBlocked(false);
                  })
                  .catch((err) => {
                    console.warn("❌ 音頻需要用戶互動:", err.name);
                    setAudioBlocked(true);
                  });
              }
            }}
          />
        ))}

        {/* 手機音頻解鎖提示 */}
        {audioBlocked &&
          inRoom &&
          Object.keys(remoteAudioElements).length > 0 && (
            <div
              onClick={() => {
                // 恢復 AudioContext
                if (audioContextRef.current?.state === "suspended") {
                  audioContextRef.current.resume();
                }
                // 重新播放所有遠端音頻
                Object.values(audioElementsRef.current).forEach((el) => {
                  if (el) {
                    el.play()
                      .then(() => console.log("✅ 音頻已恢復"))
                      .catch((e) => console.error("仍然無法播放:", e));
                  }
                });
                setAudioBlocked(false);
              }}
              className="mx-4 mt-2 p-3 bg-yellow-100 border-2 border-yellow-400 rounded-lg text-center cursor-pointer animate-pulse"
            >
              <span className="text-yellow-800 font-bold">
                🔊 點擊此處開啟對方語音
              </span>
              <p className="text-xs text-yellow-700 mt-1">
                手機瀏覽器需要您手動點擊才能播放音訊
              </p>
            </div>
          )}

        {/* 標題欄 */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-800">
            📞 語音會議與計時器
          </h2>
          <button
            onClick={() => {
              if (inRoom) {
                if (window.confirm("確定要離開會議嗎？")) {
                  leaveRoom();
                  onClose();
                }
              } else {
                onClose();
              }
            }}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 錄音提示 */}
          {showRecordingAlert && (
            <div className="bg-red-100 border-2 border-red-500 rounded-lg p-4 text-center animate-pulse">
              <div className="text-xl font-bold text-red-800">🔴 開始錄音</div>
            </div>
          )}

          {/* 會議室狀態區域 */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-6 border-2 border-green-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              📞 語音會議室（網站內通話 · 最多7人）
            </h3>

            {!roomData && (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">目前沒有進行中的會議</p>
                <button
                  onClick={createRoom}
                  className="px-8 py-4 bg-green-600 text-white rounded-full hover:bg-green-700 transition text-lg font-semibold shadow-lg"
                >
                  🚀 發起語音會議
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  允許麥克風權限後即可開始
                </p>
              </div>
            )}

            {roomData && !inRoom && (
              <div className="text-center py-8">
                <div className="inline-block text-6xl mb-4">📞</div>
                <p className="text-xl text-gray-700 mb-2">語音會議進行中</p>
                <p className="text-sm text-gray-600 mb-2">
                  {participants.length} 人在會議中
                </p>
                <div className="mb-6">
                  {participants.map((p, idx) => (
                    <span
                      key={idx}
                      className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-2 mb-2"
                    >
                      {p.name} {p.isMuted && "🔇"}
                      {p.isRecording && (
                        <span className="ml-1 text-red-500">🔴</span>
                      )}
                    </span>
                  ))}
                </div>
                <button
                  onClick={joinRoom}
                  className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition font-semibold"
                >
                  ➕ 加入語音會議
                </button>
              </div>
            )}

            {inRoom && (
              <div>
                {/* 參與者列表 */}
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-3">
                    🔊 目前 {participants.length} 人在通話中
                    {roomData?.isRecording && (
                      <span className="ml-2 inline-flex items-center gap-1 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-semibold">
                        🔴 有人正在錄音
                      </span>
                    )}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {participants.map((p, idx) => (
                      <div
                        key={idx}
                        className={`px-3 py-2 rounded-lg text-sm flex items-center justify-between ${
                          p.sessionId === sessionIdRef.current
                            ? "bg-green-100 text-green-800 font-semibold"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        <span>{p.name}</span>
                        <span>
                          {p.isMuted ? "🔇" : "🎤"}
                          {p.isRecording && (
                            <span className="ml-1 text-red-500">🔴</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 控制按鈕 */}
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    onClick={toggleMute}
                    className={`px-6 py-3 rounded-full transition font-semibold ${
                      isMuted
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {isMuted ? "🔇 取消靜音" : "🎤 靜音"}
                  </button>

                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      className="px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition font-semibold"
                    >
                      🔴 開始錄音（本地）
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="px-6 py-3 bg-red-800 text-white rounded-full hover:bg-red-900 transition font-semibold animate-pulse"
                    >
                      ⏹️ 停止錄音 ({formatTime(recordingDuration)})
                    </button>
                  )}

                  <button
                    onClick={leaveRoom}
                    className="px-6 py-3 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition font-semibold"
                  >
                    🚪 離開會議
                  </button>
                </div>

                <div className="mt-4 text-center text-xs text-gray-500">
                  💡 提示：確保您的麥克風已開啟，其他參與者可以聽到您的聲音
                  <br />
                  建議使用耳機以避免回音，支援最多7人同時通話
                </div>
              </div>
            )}
          </div>

          {/* 計時器區域 - 保持不變 */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">⏱️ 辯論計時器</h3>
              {!timerRunning && (
                <button
                  onClick={() => setShowTimerSettings(!showTimerSettings)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {showTimerSettings ? "隱藏設定" : "⚙️ 設定"}
                </button>
              )}
            </div>

            {/* 計時器設定 */}
            {showTimerSettings && !timerRunning && (
              <div className="mb-4 space-y-3 bg-white p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    計時方案
                  </label>
                  <select
                    value={selectedPreset}
                    onChange={(e) =>
                      setSelectedPreset(parseInt(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {TIMER_PRESETS.map((preset, idx) => (
                      <option key={idx} value={idx}>
                        {preset.name}
                        {preset.duration > 0 &&
                          ` (${formatTime(preset.duration)})`}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPreset === TIMER_PRESETS.length - 1 && (
                  <div className="space-y-3">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
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
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                        >
                          + 添加
                        </button>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {customBells.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            尚未設定響鈴時間
                          </p>
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
                                className="text-red-600 hover:text-red-800"
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
              </div>
            )}

            {/* 計時器顯示 */}
            <div className="bg-white rounded-lg p-6 mb-4 text-center border-2 border-gray-200">
              <div className="text-5xl font-bold text-gray-800 mb-2 font-mono">
                {formatTime(currentTime)}
              </div>
              <div className="text-sm text-gray-600">
                / {formatTime(timerDuration)}
              </div>

              {/* 進度條 */}
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${Math.min((currentTime / timerDuration) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* 響鈴記錄 */}
            {timerBells.length > 0 && timerRunning && (
              <div className="mb-4 bg-white p-3 rounded-lg max-h-24 overflow-y-auto">
                <div className="text-xs space-y-1">
                  {timerBells.map((bell, idx) => (
                    <div
                      key={idx}
                      className={`px-2 py-1 rounded ${
                        bellsRung.includes(bell)
                          ? "bg-green-100 text-green-800 font-semibold"
                          : "text-gray-500"
                      }`}
                    >
                      {bell.label} {bellsRung.includes(bell) && "✓"}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 停止發言提示 */}
            {showStopSpeechAlert && (
              <div className="mb-4 bg-blue-50 border border-blue-300 rounded-lg p-3 text-center">
                <div className="text-blue-800">請台上辯士停止發言</div>
              </div>
            )}

            {/* 控制按鈕 */}
            <div className="flex justify-center gap-2">
              {!timerRunning ? (
                <button
                  onClick={startTimer}
                  disabled={timerDuration <= 0}
                  className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold disabled:bg-gray-400"
                >
                  ▶️ 開始
                </button>
              ) : (
                <button
                  onClick={stopTimer}
                  className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                >
                  ⏸️ 停止
                </button>
              )}
              <button
                onClick={resetTimer}
                className="px-5 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold"
              >
                🔄 重置
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
