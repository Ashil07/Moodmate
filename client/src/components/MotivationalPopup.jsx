import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function MotivationalPopup({ message }) {
  const [visible, setVisible] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setVisible(true); // Re-show popup when a new message arrives
  }, [message]);

  if (!visible) return null;

  return (
    <div className="fixed right-4 bottom-4 w-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-50 p-4 transition-all duration-300">
      <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
        Just a gentle reminder...
      </div>

      <div className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {message}
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => navigate("/chat")}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Talk to MoodMate
        </button>

        <button
          onClick={() => setVisible(false)}
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          ✕ Close
        </button>
      </div>
    </div>
  );
}

export default MotivationalPopup;
