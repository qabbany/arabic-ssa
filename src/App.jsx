
import { useState, useRef } from "react";

const API_BASE = "https://ssa-backend-production.up.railway.app"; // replace with your backend URL

export default function App() {
  const [recording, setRecording] = useState(false);
  const [aspects, setAspects] = useState([]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    setAspects([]);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
      const formData = new FormData();
      formData.append("audio", audioBlob, "speech.wav");

      const res = await fetch(`${API_BASE}/transcribe`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.transcript) analyzeText(data.transcript);
    };

    mediaRecorder.start();
    setRecording(true);

    setTimeout(() => {
      mediaRecorder.stop();
      setRecording(false);
    }, 5000);
  };

  const analyzeText = async (text) => {
    const res = await fetch(`${API_BASE}/analyze-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (data.aspects) setAspects((prev) => [...prev, ...data.aspects]);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">🎙️ تحليل المشاعر أثناء التحدث (Google STT)</h1>

      <button
        onClick={startRecording}
        disabled={recording}
        className="px-6 py-2 rounded bg-blue-600 text-white mb-6"
      >
        {recording ? "🎤 جارٍ التسجيل..." : "🎙️ ابدأ التحدث"}
      </button>

      <div className="flex flex-wrap gap-3">
        {aspects.map((item, idx) => (
          <span
            key={idx}
            className={[
              "px-3 py-1 rounded-full text-white text-sm font-medium shadow-md animate-bounce",
              item.sentiment === "positive"
                ? "bg-green-500"
                : item.sentiment === "negative"
                ? "bg-red-500"
                : "bg-yellow-500"
            ].join(" ")}
          >
            {item.aspect} ({item.sentiment})
          </span>
        ))}
      </div>
    </div>
  );
}
