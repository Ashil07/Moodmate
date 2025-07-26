import React, { useEffect, useState } from 'react';

const CLIENT_ID = "627671962369-t1kbnpv6e502iqlr8fgpl41ss5gvr43q.apps.googleusercontent.com";
const SCOPES = [
  "https://www.googleapis.com/auth/fitness.sleep.read",
  "https://www.googleapis.com/auth/fitness.heart_rate.read"
].join(" ");

function GoogleFitAuth({ onDataFetched }) {
  const [status, setStatus] = useState("idle");
  const [sleep, setSleep] = useState(null);
  const [hrv, setHrv] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualSleep, setManualSleep] = useState('');
  const [manualHRV, setManualHRV] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("manualFitHistory") || "{}");
    const formatted = Object.entries(stored).map(([date, entry]) => ({ date, ...entry }));
    setHistory(formatted);
  }, []);

  const saveToHistory = (date, sleep, hrv) => {
    const current = JSON.parse(localStorage.getItem("manualFitHistory") || "{}");
    current[date] = { sleep, hrv };
    localStorage.setItem("manualFitHistory", JSON.stringify(current));
    setHistory(Object.entries(current).map(([date, entry]) => ({ date, ...entry })));
  };

  const handleSaveToDynamoDB = async (data) => {
    const payload = {
      user_id: localStorage.getItem("user_id") || "test_user",  // Replace with real auth
      date: selectedDate,
      sleep: data.sleep,
      hrv: data.hrv
    };

    try {
      const res = await fetch("http://localhost:8006/save-health-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      console.log("✅ Saved to DynamoDB:", result.message);
    } catch (error) {
      console.error("❌ Failed to save to DynamoDB:", error);
    }
  };


  const fetchGoogleFitData = async (accessToken) => {
    setStatus("loading");

    const start = new Date(selectedDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const startTimeMillis = start.getTime();
    const endTimeMillis = end.getTime();

    try {
      const res = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          aggregateBy: [
            { dataTypeName: "com.google.sleep.segment" },
            { dataTypeName: "com.google.heart_rate.bpm" }
          ],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis,
          endTimeMillis
        })
      });

      const result = await res.json();
      const sleepBuckets = result.bucket || [];

      let totalSleepMs = 0;
      let hrvReadings = [];

      for (let bucket of sleepBuckets) {
        for (let dataset of bucket.dataset) {
          for (let point of dataset.point) {
            const start = parseInt(point.startTimeNanos) / 1e6;
            const end = parseInt(point.endTimeNanos) / 1e6;
            const duration = end - start;

            if (dataset.dataSourceId.includes("sleep")) {
              totalSleepMs += duration;
            } else if (dataset.dataSourceId.includes("heart_rate")) {
              for (let val of point.value) {
                hrvReadings.push(val.fpVal);
              }
            }
          }
        }
      }

      const totalSleepHrs = totalSleepMs / (1000 * 60 * 60);
      const avgHRV = hrvReadings.length
        ? hrvReadings.reduce((a, b) => a + b, 0) / hrvReadings.length
        : null;

      setSleep(totalSleepHrs);
      setHrv(avgHRV);
      setStatus("success");

      saveToHistory(selectedDate, totalSleepHrs, avgHRV);
      if (onDataFetched) {
        const data = { sleep: totalSleepHrs, hrv: avgHRV };
        onDataFetched(data);
        handleSaveToDynamoDB(data);
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const handleFetchFromGoogle = () => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.access_token) {
            fetchGoogleFitData(response.access_token);
          } else {
            setStatus("error");
          }
        }
      });
      tokenClient.requestAccessToken();
    };
    document.body.appendChild(script);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const sleepVal = parseFloat(manualSleep);
    const hrvVal = parseFloat(manualHRV);

    if (!isNaN(sleepVal) && !isNaN(hrvVal)) {
      setSleep(sleepVal);
      setHrv(hrvVal);
      setStatus("success");
      saveToHistory(selectedDate, sleepVal, hrvVal);
      if (onDataFetched) {
        const data = { sleep: sleepVal, hrv: hrvVal };
        onDataFetched(data);
        handleSaveToDynamoDB(data);  // ✅ Save to DynamoDB
      }
    } else {
      setStatus("error");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl shadow-lg p-8 flex flex-col items-center relative overflow-hidden transition-colors duration-300">
        <h2 className="text-2xl font-bold mb-2 text-blue-700">Google Fit Authorization</h2>
        <p className="text-gray-600 mb-4 text-center">
          Select a date and fetch your sleep + HRV data.
        </p>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="mb-4 px-3 py-2 rounded border w-full"
        />

        {!manualMode && (
          <button
            onClick={handleFetchFromGoogle}
            className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Fetch from Google Fit
          </button>
        )}

        {status === "loading" && (
          <div className="text-blue-500 font-medium animate-pulse mb-4">Authorizing and fetching data...</div>
        )}

        {status === "success" && (
          <div className="w-full text-center animate-fade-in mb-4">
            <div className="mb-2">
              <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                ✅ Data for {selectedDate} saved!
              </span>
            </div>
            <div className="flex justify-center gap-8 mb-2">
              <div>
                <div className="text-lg font-bold text-blue-700">{sleep?.toFixed(2) ?? "--"}</div>
                <div className="text-gray-500 text-sm">Sleep (hrs)</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-700">{hrv ? hrv.toFixed(2) : "--"}</div>
                <div className="text-gray-500 text-sm">Avg HRV</div>
              </div>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="w-full text-center animate-fade-in mb-4">
            <span className="inline-block bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold">
              ❌ Failed to fetch data. Please try again or use manual input.
            </span>
          </div>
        )}

        {!manualMode ? (
          <button
            onClick={() => setManualMode(true)}
            className="text-sm text-blue-600 hover:underline mt-2"
          >
            Don’t have a wearable? Enter data manually
          </button>
        ) : (
          <form onSubmit={handleManualSubmit} className="w-full mt-4">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Sleep Duration (hrs)</label>
              <input
                type="number"
                step="0.1"
                value={manualSleep}
                onChange={(e) => setManualSleep(e.target.value)}
                className="w-full border px-3 py-2 rounded"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Average HRV</label>
              <input
                type="number"
                step="0.1"
                value={manualHRV}
                onChange={(e) => setManualHRV(e.target.value)}
                className="w-full border px-3 py-2 rounded"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
            >
              Submit Data
            </button>
            <button
              type="button"
              onClick={() => {
                setManualMode(false);
                setManualSleep("");
                setManualHRV("");
              }}
              className="text-sm text-gray-500 hover:underline mt-2 block w-full text-center"
            >
              Use Google Fit instead
            </button>
          </form>
        )}

        <div className="mt-6 w-full">
          <h3 className="text-lg font-semibold mb-2">📅 Historical Entries</h3>
          <div className="overflow-auto max-h-48 border rounded p-2">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left pb-1">Date</th>
                  <th className="text-left pb-1">Sleep (hrs)</th>
                  <th className="text-left pb-1">HRV</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.date}>
                    <td className="py-1 pr-4">{entry.date}</td>
                    <td className="py-1 pr-4">{entry.sleep.toFixed(2)}</td>
                    <td className="py-1">{entry.hrv.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GoogleFitAuth;
