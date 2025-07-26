import React, { useState, useEffect } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";


export default function HabitFlowDashboard() {
  const [habits, setHabits] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [badHabitInput, setBadHabitInput] = useState("");
  const [habitSuggestions, setHabitSuggestions] = useState([]);

  const [newHabit, setNewHabit] = useState({
    habit_name: "",
    replacement_habit: "",
    streak_days: 0,
    level: 1,
    last_completed: "",
  });

  // 🧠 Fetch habit streaks
  const fetchHabits = async () => {
    try {
      const res = await fetch("http://localhost:8007/habitflow/get-progress?user_id=demo_user");
      const data = await res.json();
      setHabits(data.habits || []);
    } catch (err) {
      console.error("Failed to fetch habits:", err);
    }
  };

  // ➕ Increment streak
  const incrementStreak = async (habitId) => {
    await fetch("http://localhost:8007/habitflow/increment-streak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: "demo_user", habit_id: habitId })
    });
    fetchHabits(); // refresh UI
  };

  // 💡 Suggest replacements
  const fetchSuggestions = async () => {
    try {
      const { data } = await axios.post("http://localhost:8007/suggest_replacements", {
        bad_habit: badHabitInput,
      });
      setHabitSuggestions(data.suggestions || []);
    } catch (e) {
      console.error("🧨 Suggest error:", e);
    }
  };

  // ✅ Save progress for new habits
  const saveProgress = async () => {
    try {
      await axios.post("http://localhost:8007/habitflow/save-progress", {
        user_id: "demo_user",
        habit_id: uuidv4(),
        ...newHabit,
      });
      alert("✅ Progress saved!");
      fetchHabits();
    } catch (e) {
      console.error("🧨 Save error:", e);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  return (
    <div className={`${darkMode ? "dark" : ""}`}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-300 px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">🌱 HabitFlow</h1>
          </div>

          {/* Habit List */}
          {habits.length === 0 && <p className="text-gray-600 dark:text-gray-400">No habits found.</p>}
          {habits.map((habit, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl p-4 shadow space-y-2">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-300 capitalize">{habit.habit_name}</h2>
                <button
                  onClick={() => incrementStreak(habit.habit_id)}
                  className="text-sm bg-blue-600 dark:bg-blue-400 text-white dark:text-gray-900 px-3 py-1 rounded hover:bg-blue-700 dark:hover:bg-blue-300 transition"
                >
                  ➕ Add Day
                </button>
              </div>
              <p><span className="font-medium">Replacement:</span> <em>{habit.replacement_habit}</em></p>
              <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 pt-1">
                <span>🔥 <strong>{habit.streak_days}</strong> day streak</span>
                <span>🏅 Level <strong>{habit.level}</strong></span>
                <span>📅 Last: {habit.last_completed}</span>
              </div>
            </div>
          ))}

          {/* Suggest Replacements */}
          <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl p-4 shadow space-y-2">
            <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300">💡 Need Replacement Ideas?</h3>
            <input
              type="text"
              value={badHabitInput}
              onChange={(e) => setBadHabitInput(e.target.value)}
              placeholder="Enter a bad habit"
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            />
            <button
              onClick={fetchSuggestions}
              className="px-4 py-2 bg-purple-600 dark:bg-purple-400 text-white dark:text-gray-900 rounded hover:brightness-110 transition"
            >
              Suggest Replacements
            </button>
            <ul className="list-disc pl-6 pt-2">
              {habitSuggestions.map((s, idx) => (
                <li key={idx}>
                  <button
                    onClick={() => setSelectedHabit({
                      bad_habit: badHabitInput,
                      habit_id: uuidv4(),
                      replacement_habit: s,
                      streak_days: 0,
                      level: 1,
                      last_completed: new Date().toISOString().slice(0, 10) // yyyy-mm-dd
                    })}
                    className="text-left w-full hover:underline text-purple-700 dark:text-purple-300"
                  >
                    🌿 {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {selectedHabit && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-gray-700 border border-green-300 dark:border-green-500 rounded-xl space-y-2">
              <h4 className="text-md font-semibold text-green-800 dark:text-green-200">🆕 Suggested Habit</h4>
              <p><strong>Bad Habit:</strong> {selectedHabit.bad_habit}</p>
              <p><strong>Replacement:</strong> {selectedHabit.replacement_habit}</p>
              <p><strong>Start Date:</strong> {selectedHabit.last_completed}</p>
              <p><strong>Level:</strong> {selectedHabit.level}</p>
              <button
                onClick={async () => {
                  await axios.post("http://localhost:8007/habitflow/save-progress", {
                    user_id: "demo_user",
                    habit_id: selectedHabit.habit_id, // ✅ Add this field
                    habit_name: selectedHabit.bad_habit,
                    replacement_habit: selectedHabit.replacement_habit,
                    streak: selectedHabit.streak_days, // ✅ Renamed to match FastAPI's expected field
                    level: selectedHabit.level,
                    last_completed: selectedHabit.last_completed,
                  });
                  alert("🎉 Progress saved!");
                  fetchHabits();
                  setSelectedHabit(null);
                }}
                className="px-4 py-2 bg-green-600 dark:bg-green-400 text-white dark:text-gray-900 rounded hover:brightness-110 transition"
              >
                💾 Save Progress
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
