import React, { useRef, useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import { Chart, Filler, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, } from "chart.js";
Chart.register(Filler,LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);
import { format } from "date-fns";

const TwitterAnalyzer = () => {
  const [twitterUsername, setTwitterUsername] = useState("");
  const [twitterResults, setTwitterResults] = useState(null);
  const [wordCloudData, setWordCloudData] = useState(null);
  const [selectedEmotion, setSelectedEmotion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const twitterDates = twitterResults ? twitterResults.map(tweet => tweet.date) : [];
  const twitterProbabilities = twitterResults ? twitterResults.map(tweet => Number(tweet.probability_of_risk)) : [];

  const handleViewStored = async () => {
    setLoading(true);
    setError("");
    setTwitterResults(null);

    try {
      const res = await fetch("http://localhost:8000/api/read_analysis");
      const data = await res.json();

      if (data.risk_analysis && Array.isArray(data.risk_analysis)) {
        const normalized = data.risk_analysis.map(item => ({
          date: item.date,
          text: item.text,
          probability_of_risk: Number(item.probability_of_risk),
          confidence: item.confidence,
          risk_detected: item.risk_detected,
          tweet_id: item.tweet_id,
          explanation: item.explanation,
        }));

        setTwitterResults(normalized);
        setWordCloudData(null);
        setSelectedEmotion("");
      } else {
        setError(data.error || "No stored analysis found.");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to fetch stored results.");
    }

    setLoading(false);
  };



  const twitterRiskChartData = {
    labels: twitterDates,
    datasets: [
      {
        label: "Risk Probability",
        data: twitterProbabilities,
        fill: true,
        borderColor: "#00BFFF",
        backgroundColor: function(context) {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, "rgba(0,191,255,0.4)");
          gradient.addColorStop(1, "rgba(0,191,255,0)");
          return gradient;
        },
        tension: 0.4,
        pointBackgroundColor: "#fff",
        pointBorderColor: "#00BFFF",
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBorderWidth: 3,
        spanGaps: true,
      },
    ],
  };

  const options = {
    scales: {
      y: { min: 0, max: 1, title: { display: true, text: 'Risk Probability' }, grid: { color: "#e5e7eb" } },
      x: { grid: { color: "#e5e7eb" } },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: { label: ctx => ` ${ctx.parsed.y}` },
      },
    },
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError("");
    setTwitterResults(null);
    try {
      const res = await fetch(`http://localhost:8000/analyze_all/${twitterUsername}`);
      const data = await res.json();
      if (data.risk_analysis) {
        setTwitterResults(data.risk_analysis);
        setWordCloudData(data.wordcloud);
        setSelectedEmotion(""); // reset emotion selection
      } else {
        setError(data.error || "No results found.");
      }
    } catch {
      setError("Failed to fetch Twitter analysis.");
    }
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 p-4 rounded shadow transition-colors duration-300">
      <h3 className="text-lg font-semibold mb-2">Twitter Stress Analysis</h3>
      <input
        type="text"
        placeholder="Enter Twitter username"
        value={twitterUsername}
        onChange={e => setTwitterUsername(e.target.value)}
        className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-2 py-1 rounded mr-2 transition-colors duration-300"
      />
      <button
        onClick={handleAnalyze}
        disabled={loading || !twitterUsername}
        className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors duration-300"
      >
        {loading ? "Analyzing..." : "Analyze Tweets"}
      </button>
      <button
        onClick={handleViewStored}
        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded ml-2 transition-colors duration-300"
      >
        View Stored Analysis
      </button>

      {loading && <div className="text-blue-500 mt-2">Loading...</div>}
      {error && <div className="text-red-500 mt-2">{error}</div>}

      {twitterResults && (
        <div className="mt-8 bg-white dark:bg-gray-800 p-4 rounded shadow transition-colors duration-300" style={{ maxWidth: 800, margin: "0 auto" }}>
          <h4 className="font-semibold mb-2">Twitter Risk Over Time</h4>
          <Line
            data={twitterRiskChartData}
            options={options}
            width={500}
            height={250}
          />
        </div>
      )}

      {twitterResults && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Results:</h4>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm overflow-x-auto transition-colors duration-300">
            <table className="border-b last:border-none hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <thead>
                <tr className="text-left text-gray-500 font-semibold border-b">
                  <th className="py-2 px-4">Date & Time</th>
                  <th className="py-2 px-4">Content</th>
                  <th className="py-2 px-4">Status</th>
                  <th className="py-2 px-4">Probability</th>
                </tr>
              </thead>
              <tbody>
                {twitterResults.map((tweet, idx) => (
                  <tr key={idx} className="border-b last:border-none hover:bg-gray-100 transition">
                    <td className="py-2 px-4 whitespace-nowrap text-gray-700 font-mono">{format(new Date(tweet.date), "PPpp")}</td>
                    <td className="py-2 px-4 whitespace-pre-wrap break-words">{tweet.text}</td>
                    <td className="py-2 px-4">
                      {(() => {
                        const prob = Number(tweet.probability_of_risk);
                        let label = "", color = "";

                        if (prob >= 0.8) {
                          label = "Very High";
                          color = "bg-red-200 text-red-800";
                        } else if (prob >= 0.6) {
                          label = "High";
                          color = "bg-orange-200 text-orange-800";
                        } else if (prob >= 0.4) {
                          label = "Moderate";
                          color = "bg-yellow-200 text-yellow-800";
                        } else if (prob >= 0.2) {
                          label = "Low";
                          color = "bg-green-200 text-green-800";
                        } else {
                          label = "Very Low";
                          color = "bg-blue-200 text-blue-800";
                        }

                        return (
                          <span className={`whitespace-nowrap px-3 py-1 rounded-full font-semibold text-xs ${color}`}>
                            {label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-2 px-4 font-semibold">{Number(tweet.probability_of_risk).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {wordCloudData && Object.keys(wordCloudData).length > 0 && (
        <div className="mt-8">
          <h4 className="font-semibold mb-2">Emotion Word Cloud</h4>
          <div className="mb-4">
            <label className="block mb-1 text-sm">Select an emotion:</label>
            <select
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-2 py-1 rounded"
              value={selectedEmotion}
              onChange={(e) => setSelectedEmotion(e.target.value)}
            >
              <option value="">-- Choose an emotion --</option>
              {Object.keys(wordCloudData).map((emotion) => (
                <option key={emotion} value={emotion}>{emotion}</option>
              ))}
            </select>
          </div>
          {selectedEmotion && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded shadow-sm">
              <h5 className="text-md font-medium mb-2">Top Words for: {selectedEmotion}</h5>
              <div className="flex flex-wrap gap-2">
                {Object.entries(wordCloudData[selectedEmotion]).map(([word, count]) => (
                  <span
                    key={word}
                    className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-sm"
                  >
                    {word} ({count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TwitterAnalyzer;
