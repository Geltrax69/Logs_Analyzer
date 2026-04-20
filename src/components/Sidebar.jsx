import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShieldAlert, Activity, Users, Settings } from 'lucide-react';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <ShieldAlert size={28} />
        <span>SIEM Analytics</span>
      </div>
      
      <nav className="nav-menu">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
          <LayoutDashboard size={20} />
          Overview
        </NavLink>
        <NavLink to="/alerts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ShieldAlert size={20} />
          Security Alerts
        </NavLink>
        <div className="nav-item" style={{opacity: 0.5, cursor: 'not-allowed'}}>
          <Activity size={20} />
          Network Traffic
        </div>
        <div className="nav-item" style={{opacity: 0.5, cursor: 'not-allowed'}}>
          <Users size={20} />
          User Analytics
        </div>
        <div className="nav-item" style={{opacity: 0.5, cursor: 'not-allowed'}}>
          <Settings size={20} />
          System Config
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
