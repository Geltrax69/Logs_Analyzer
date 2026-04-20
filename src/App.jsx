import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DashboardOverview from './pages/DashboardOverview';
import SecurityAlerts from './pages/SecurityAlerts';

function App() {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<DashboardOverview />} />
          <Route path="/alerts" element={<SecurityAlerts />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
