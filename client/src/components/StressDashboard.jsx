import React, { useEffect, useState, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import axios from "axios";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const StressDashboard = ({ fusionInputs }) => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const valid = Object.values(fusionInputs).filter(x => x !== null);
    if (valid.length === 4) {
      const fusionScore = valid.reduce((a, b) => a + b, 0) / 4;
      setHistory(prev => [...prev.slice(-9), { timestamp: new Date().toLocaleTimeString(), score: fusionScore }]);
    }
  }, [fusionInputs]);

  const average =
    history.length > 0
      ? history.reduce((sum, h) => sum + h.score, 0) / history.length
      : 0;

  const chartData = {
    labels: history.map((h) => h.timestamp),
    datasets: [
      {
        label: 'Stress Score',
        data: history.map((h) => h.score),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.3)',
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Average',
        data: history.map(() => average),
        borderColor: 'rgb(54, 162, 235)',
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
      },
      {
        label: 'Threshold (0.7)',
        data: history.map(() => 0.7),
        borderColor: 'orange',
        borderDash: [2, 2],
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const options = {
  scales: {
    y: {
      min: 0,
      max: 1,
      title: {
        display: true,
        text: 'Risk Probability',
      },
      grid: {
        color: "#e5e7eb",
      },
    },
    x: {
      grid: {
        color: "#e5e7eb",
      },
    },
  },
  plugins: {
    legend: {
      display: false, // Hide legend for a cleaner look
    },
    tooltip: {
      enabled: true,
      callbacks: {
        label: ctx => ` ${ctx.parsed.y}`,
      },
    },
  },
};

  return (
    <div className="ml-64 p-6 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 min-h-screen transition-colors duration-300">
      <h2 className="text-2xl font-bold mb-4">📊 Stress Fusion Dashboard</h2>
      <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-4 rounded shadow space-y-4 transition-colors duration-300">
        <p className="text-lg">🧠 Fusion Stress Score (Live)</p>
        <Line data={chartData} options={options} />

        <div className="mt-4">
          <h3 className="text-lg font-semibold">Latest Scores:</h3>
          <ul className="list-disc ml-5 text-sm text-gray-700 dark:text-gray-200">
            {Object.entries(fusionInputs).map(([key, val]) => (
              <li key={key}>{key.toUpperCase()}: {val !== null ? val.toFixed(2) : 'Not captured'}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StressDashboard;