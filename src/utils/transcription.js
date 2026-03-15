// 語音轉逐字稿工具 — 使用 Whisper 模型在瀏覽器端運行

import { ref, getBlob } from "firebase/storage";
import { storage } from "../firebase/config";

let transcriber = null;

/**
 * 將音訊轉換為逐字稿
 * @param {string} storagePath - Firebase Storage 路徑
 * @param {function} onProgress - 進度回調 (stage, message)
 * @returns {Promise<string>} 逐字稿文字
 */
export async function transcribeAudio(storagePath, onProgress) {
  try {
    // 動態載入 Transformers.js（僅在使用時載入，不影響首頁載入速度）
    onProgress?.("loading", "正在載入語音辨識引擎...");

    const { pipeline } = await import("@huggingface/transformers");

    if (!transcriber) {
      onProgress?.("model", "首次使用需下載模型（約 77MB），請稍候...");
      transcriber = await pipeline(
        "automatic-speech-recognition",
        "Xenova/whisper-base",
        {
          dtype: "q8",
          device: "wasm",
        },
      );
    }

    // 下載音訊並解碼為 Float32Array
    onProgress?.("decoding", "正在解碼音訊...");
    const audioData = await fetchAndDecodeAudio(storagePath);

    // 執行轉錄
    onProgress?.("transcribing", "正在辨識語音，請耐心等候...");
    const result = await transcriber(audioData, {
      language: "chinese",
      task: "transcribe",
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    return result.text?.trim() || "";
  } catch (error) {
    console.error("語音轉錄失敗:", error);
    throw error;
  }
}

/**
 * 下載音訊並解碼為 Float32Array (16kHz mono)
 * 使用 Firebase Storage SDK 的 getBlob 避免 CORS 問題
 */
async function fetchAndDecodeAudio(storagePath) {
  const storageRef = ref(storage, storagePath);
  const blob = await getBlob(storageRef);
  const arrayBuffer = await blob.arrayBuffer();

  // 使用 OfflineAudioContext 解碼並重新取樣為 16kHz mono
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  // 重新取樣為 16kHz
  const targetSampleRate = 16000;
  const offlineCtx = new OfflineAudioContext(
    1,
    Math.ceil(audioBuffer.duration * targetSampleRate),
    targetSampleRate,
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  const resampled = await offlineCtx.startRendering();
  await audioCtx.close();

  return resampled.getChannelData(0);
}
