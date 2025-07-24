import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Sidebar from './components/Sidebar';
import ChatbotPage from './components/ChatbotPage';
import StressDashboard from './components/StressDashboard';
import InputMonitor from './components/InputMonitor';
import TwitterAnalyzer from './components/TwitterAnalyzer';
import ChatInterface from './components/ChatInterface';
import BookingPage from './pages/BookingPage';
import GoogleFitAuth from './components/GoogleFitAuth';
import BreathingCatalog from './components/BreathingCatalog';
import JournalDashboard from './components/JournalDashboard';
import HabitFlow from './components/HabitFlow';
import MotivationalPopup from "./components/MotivationalPopup";
import './App.css';

const AppLayout = () => {
  const location = useLocation();
  const [fusionInputs, setFusionInputs] = useState({
    face: null,
    voice: null,
    text: null,
    typing: null
  });
  const [popupData, setPopupData] = useState(null);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  React.useEffect(() => {
    console.log("🌙 Applying dark mode");
    document.documentElement.classList.add("dark");
  }, []);

  const hideSidebarRoutes = ['/', '/login'];
  const showSidebar = !hideSidebarRoutes.includes(location.pathname);

  React.useEffect(() => {
    fetch("/api/trigger_check")  // 🛠️ Your endpoint here
      .then(res => res.json())
      .then(data => {
        if (data.show_popup) {
          setPopupData({
            message: data.support_message || "Keep going. You've got this. 💙"
          });
        }
      });
  }, []);

  return (
    <div className="flex">
      {showSidebar && (
        <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
      )}
      <div
        className={`flex-1 p-6 transition-all duration-300 ${
          showSidebar ? (isSidebarCollapsed ? 'ml-20' : 'ml-64') : ''
        } bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100`}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat" element={<ChatInterface />} />
          <Route path="/chatbot/*" element={<ChatbotPage fusionInputs={fusionInputs} setFusionInputs={setFusionInputs} />} />
          <Route path="/dashboard" element={<StressDashboard fusionInputs={fusionInputs} />} />
          <Route path="/inputs" element={<InputMonitor setFusionInputs={setFusionInputs} />} />
          <Route path="/twitter" element={<TwitterAnalyzer />} />
          <Route path="/book" element={<BookingPage />} />
          <Route path="/sleep" element={<GoogleFitAuth onDataFetched={(data) => setFusionInputs(prev => ({ ...prev, ...data }))} />} />
          <Route path="/library" element={<BreathingCatalog />} />
          <Route path="/journal" element={<JournalDashboard />} />
          <Route path="/habits" element={<HabitFlow />} />
        </Routes>
      </div>
      {popupData && (
        <MotivationalPopup message={popupData.message} />
      )}
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
