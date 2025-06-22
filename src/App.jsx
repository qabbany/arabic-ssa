import React, { useState, useRef } from "react";

const API_BASE = "https://ssa-backend-production.up.railway.app"; // update if needed

export default function App() {
  const [recording, setRecording] = useState(false);
  const [aspects, setAspects] = useState([]);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      setAspects([]);
      setError(null);
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

        try {
          const res = await fetch(`${API_BASE}/transcribe`, {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (data.transcript) {
            analyzeText(data.transcript);
          } else {
            setError("❌ Transcription failed or empty.");
          }
        } catch (err) {
          setError("❌ Error contacting transcription service.");
        }
      };

      mediaRecorder.start();
      setRecording(true);

      setTimeout(() => {
        mediaRecorder.stop();
        setRecording(false);
      }, 5000);
    } catch (err) {
      setError("🎤 Failed to start recording: " + err.message);
    }
  };

  const analyzeText = async (text) => {
    try {
      const res = await fetch(`${API_BASE}/analyze-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.aspects) setAspects(data.aspects);
      else setError("❌ No aspects returned.");
    } catch (err) {
      setError("❌ Error analyzing text.");
    }
  };

  return (
    <div className="p-6 font-sans text-center">
      <h1 className="text-3xl font-bold mb-4">🎙️ تحليل المشاعر بالعربية</h1>
      <button
        onClick={startRecording}
        disabled={recording}
        className="px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
      >
        {recording ? "🎤 جاري التسجيل..." : "ابدأ التحدث 🎙️"}
      </button>

      {error && <p className="text-red-600 mt-4">{error}</p>}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {aspects.map((item, idx) => (
          <span
            key={idx}
            className={`px-4 py-2 rounded-full text-white font-semibold shadow-md animate-bounce ${
              item.sentiment === "positive"
                ? "bg-green-500"
                : item.sentiment === "negative"
                ? "bg-red-500"
                : "bg-yellow-500"
            }`}
          >
            {item.aspect} ({item.sentiment})
          </span>
        ))}
      </div>
    </div>
  );
}
