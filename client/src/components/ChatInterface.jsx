import React, { useState, useRef, useEffect } from "react";
import botAvatar from "../assets/bot-avatar.png";
import userAvatar from "../assets/user-avatar.png";
import FaceDetector from "../components/FaceDetector";

const API_URL = "http://localhost:8000/chat";

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      const femaleVoices = voices.filter((v) =>
        v.lang.startsWith("en") &&
        (v.name.toLowerCase().includes("female") ||
         v.name.toLowerCase().includes("woman") ||
         v.name.toLowerCase().includes("google"))
      );
      setAvailableVoices(femaleVoices);
      if (!selectedVoice && femaleVoices.length > 0) {
        setSelectedVoice(femaleVoices[0]);
      }
    };
    if (typeof speechSynthesis !== "undefined") {
      speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();
    }
  }, [selectedVoice]);

  const speak = (text) => {
    if (!text || !selectedVoice) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = selectedVoice;
    utterance.lang = "en-US";
    utterance.pitch = 1.2;
    utterance.rate = 0.95;
    utterance.volume = 1.0;
    setIsBotSpeaking(true);
    utterance.onend = () => setIsBotSpeaking(false);
    speechSynthesis.speak(utterance);
  };

  const sendMessage = async (textToSend = input) => {
    if (!textToSend.trim()) return;
    const userMsg = { sender: "user", text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_input: textToSend }),
      });

      if (!res.body) throw new Error("No response stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let botText = "";
      let spokenSoFar = "";
      setMessages((prev) => [...prev, { sender: "bot", text: "" }]);

      const speakBuffered = (buffer) => {
        if (!buffer || !selectedVoice) return;
        const utterance = new SpeechSynthesisUtterance(buffer);
        utterance.voice = selectedVoice;
        utterance.pitch = 1.1;
        utterance.rate = 0.95;
        utterance.volume = 1.0;
        speechSynthesis.cancel();
        setIsBotSpeaking(true);
        utterance.onend = () => setIsBotSpeaking(false);
        speechSynthesis.speak(utterance);
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        try {
          const parsed = JSON.parse(chunk);
          if (parsed.response) {
            botText += parsed.response;
          } else {
            botText += chunk;
          }
        } catch {
          botText += chunk;
        }

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { sender: "bot", text: botText };
          return updated;
        });

        const sentenceEnd = botText.lastIndexOf(".");
        if (sentenceEnd > spokenSoFar.length + 5) {
          const toSpeak = botText.slice(spokenSoFar.length, sentenceEnd + 1);
          spokenSoFar += toSpeak;
          speakBuffered(toSpeak);
        }
      }

      const remaining = botText.slice(spokenSoFar.length).trim();
      if (remaining.length > 2) speakBuffered(remaining);

      const stressKeywords = [
        "i can't",
        "give up",
        "worthless",
        "want to disappear",
        "i'm broken",
        "no one cares",
        "everything is dark",
        "i hate myself",
        "ending it all"
      ];
      const isHighlyStressed = stressKeywords.some((kw) =>
        textToSend.toLowerCase().includes(kw)
      );
      if (isHighlyStressed) {
        console.log("⚠️ Stress detected — triggering help popup.");
        setTimeout(() => setShowHelpPopup(true), 500);
      }

    } catch {
      const errorMsg = "Error: Could not reach server.";
      setMessages((prev) => [...prev, { sender: "bot", text: errorMsg }]);
      speak(errorMsg);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const recog = new SpeechRecognition();
    recog.continuous = false;
    recog.interimResults = false;
    recog.lang = "en-US";
    recog.onstart = () => setIsListening(true);
    recog.onend = () => setIsListening(false);
    recog.onresult = (event) => {
      const speechText = event.results[0][0].transcript;
      sendMessage(speechText);
    };
    recognitionRef.current = recog;
  }, []);

  const toggleListening = () => {
    if (isListening) recognitionRef.current.stop();
    else recognitionRef.current.start();
  };

  const waveformBars = (
    <div className="flex items-end gap-[2px] ml-2 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="w-[3px] bg-blue-500 rounded-sm"
          style={{
            height: `${8 + Math.random() * 16}px`,
            animationDuration: `${0.3 + i * 0.1}s`,
            animationDirection: i % 2 === 0 ? "alternate" : "alternate-reverse",
          }}
        ></div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-[85vh] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-lg shadow p-4 max-w-2xl mx-auto transition-colors duration-300">
      <div style={{ display: "none" }}>
        <FaceDetector
          onEmotionDetected={({ emotion, stress }) => {
            console.log("🧠 Detected emotion:", emotion, "→ stress score:", stress);
            if (stress > 0.2 && !showHelpPopup) {
              setShowHelpPopup(true);
            }
          }}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex mb-4 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "bot" && (
              <img src={botAvatar} alt="Bot" className="w-8 h-8 rounded-full mr-2 self-end" />
            )}
            <div
              className={`relative max-w-[70%] px-4 py-2 rounded-xl shadow-sm ${
                msg.sender === "user"
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
                  : "bg-[#f4f8ff] dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-l-4 border-blue-400"
              }`}
            >
              {msg.text}
              <button
                className="absolute bottom-1 right-1 text-gray-400 hover:text-gray-600"
                title="Copy"
                onClick={() => navigator.clipboard.writeText(msg.text)}
                style={{ fontSize: 14 }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke="currentColor"
                    strokeWidth="2"
                    d="M8 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"
                  />
                  <rect
                    width="12"
                    height="14"
                    x="4"
                    y="8"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </button>
            </div>
            {msg.sender === "user" && (
              <img src={userAvatar} alt="You" className="w-8 h-8 rounded-full ml-2 self-end" />
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex items-center gap-2 mt-2 text-sm">
        <label htmlFor="voiceSelect" className="text-gray-700 font-medium">
          Voice:
        </label>
        <select
          id="voiceSelect"
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-2 py-1 rounded text-sm"
          onChange={(e) =>
            setSelectedVoice(
              availableVoices.find((v) => v.name === e.target.value)
            )
          }
          value={selectedVoice?.name || ""}
        >
          {availableVoices.map((voice, idx) => (
            <option key={idx} value={voice.name}>
              {voice.name}
            </option>
          ))}
        </select>
      </div>

      <form
        className="flex items-center gap-2 border-t border-gray-200 dark:border-gray-700 pt-3 bg-white dark:bg-gray-900 rounded-b-lg transition-colors duration-300"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
      >
        <textarea
          className="flex-1 resize-none border-none outline-none p-2 bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          rows={1}
          placeholder="Type a new message here"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />

        <button
          type="button"
          onClick={toggleListening}
          className={`p-2 rounded-full ${
            isListening ? "bg-red-100 dark:bg-red-200" : "hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
          title={isListening ? "Stop Listening" : "Start Voice Input"}
        >
          <svg
            width="22"
            height="22"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3zm6 11a6 6 0 0 1-12 0" />
            <path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v4m0 0h4m-4 0H8" />
          </svg>
        </button>

        {(isListening || isBotSpeaking) && waveformBars}

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading || !input.trim()}
        >
          {loading ? "..." : "Send"}
        </button>
      </form>

      {showHelpPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl max-w-sm w-full text-center space-y-4">
            <h2 className="text-lg font-semibold text-red-600">It’s okay to ask for help 🌱</h2>
            <p className="text-gray-800 dark:text-gray-200">
              It seems like you're feeling overwhelmed. You're not alone—talking to someone can really help.
            </p>
            <button
              onClick={() => {
                setShowHelpPopup(false);
                window.location.href = "/book";
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Talk to a Professional
            </button>
            <button
              onClick={() => setShowHelpPopup(false)}
              className="text-sm text-gray-500 underline"
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatInterface;
