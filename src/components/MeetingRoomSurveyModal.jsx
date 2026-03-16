import { useState } from "react";

export function MeetingRoomSurveyModal({ onClose, onSubmit }) {
  const [choice, setChoice] = useState("");
  const [otherText, setOtherText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [neverShow, setNeverShow] = useState(false);

  const handleSelect = (val) => {
    setChoice(val);
    if (val !== "other") setOtherText("");
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit({ choice, otherText, neverShow: false });
    setSubmitting(false);
    onClose();
  };

  // 勾選「不再顯示」並關閉
  const handleNeverShow = async () => {
    setSubmitting(true);
    await onSubmit({ choice: "never-show", otherText: "", neverShow: true });
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl w-10 h-10 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ touchAction: "manipulation", pointerEvents: "auto" }}
          onClick={neverShow ? handleNeverShow : onClose}
          aria-label="關閉"
          tabIndex={0}
        >
          <span className="block w-full h-full flex items-center justify-center">
            ×
          </span>
        </button>
        <h2 className="text-xl font-bold mb-2">會議室功能意願調查</h2>
        <p className="mb-4 text-gray-700">
          您是否希望新增專為辯論設計的會議室？
          <br />
          會議室將包含：通訊、靜音、錄音、計時、資料上傳區、儲存錄音區、聊天室等功能。
          <br />
          也歡迎提出您想要的功能！
        </p>
        <div className="space-y-2 mb-4">
          <button
            className={`w-full py-2 rounded border ${choice === "yes" ? "bg-blue-600 text-white" : "bg-white text-blue-700 border-blue-600"}`}
            onClick={() => handleSelect("yes")}
          >
            有使用會議室的意願
          </button>
          <button
            className={`w-full py-2 rounded border ${choice === "no" ? "bg-blue-600 text-white" : "bg-white text-blue-700 border-blue-600"}`}
            onClick={() => handleSelect("no")}
          >
            無使用會議室的意願
          </button>
          <button
            className={`w-full py-2 rounded border ${choice === "other" ? "bg-blue-600 text-white" : "bg-white text-blue-700 border-blue-600"}`}
            onClick={() => handleSelect("other")}
          >
            有其他想法
          </button>
        </div>
        {choice === "other" && (
          <textarea
            className="w-full border rounded p-2 mb-2"
            rows={3}
            placeholder="請輸入您的想法（可留空）"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
          />
        )}
        <div className="flex items-center mt-2 mb-2">
          <input
            id="neverShow"
            type="checkbox"
            className="mr-2"
            checked={neverShow}
            onChange={(e) => setNeverShow(e.target.checked)}
          />
          <label htmlFor="neverShow" className="text-gray-700 text-sm">
            不再顯示此畫面
          </label>
        </div>
        <button
          className="w-full py-2 mt-2 rounded bg-blue-700 text-white font-bold disabled:opacity-60"
          disabled={!choice || submitting}
          onClick={handleSubmit}
        >
          送出
        </button>
      </div>
    </div>
  );
}
