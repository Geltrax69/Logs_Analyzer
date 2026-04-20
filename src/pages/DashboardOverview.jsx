import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ShieldAlert, Users, Server } from 'lucide-react';
import { fetchLogsPaged } from '../api';

const DashboardOverview = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statsNow] = useState(() => Date.now());

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError('');
      const resp = await fetchLogsPaged({ page: 1, limit: 120 });
      setLogs(Array.isArray(resp?.data) ? resp.data : []);
    } catch {
      setError('Unable to load real overview data from backend.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial backend fetch for dashboard summary cards.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOverview();
  }, []);

  const stats = useMemo(() => {
    const oneDayAgo = statsNow - 24 * 60 * 60 * 1000;

    const last24h = logs.filter((l) => new Date(l.createdAt || l.timestamp || 0).getTime() >= oneDayAgo);
    const critical = logs.filter(
      (l) => ['sql_injection_alert', 'bruteforce_alert'].includes(l.eventType) || String(l.status || '').toUpperCase() === 'WARNING'
    );
    const failedLogins = logs.filter((l) => l.eventType === 'failed_login');
    const uniqueIps = new Set(logs.map((l) => l.ipAddress).filter(Boolean));

    return {
      events24h: last24h.length,
      critical: critical.length,
      failed: failedLogins.length,
      activeNodes: uniqueIps.size
    };
  }, [logs, statsNow]);

  const getStatusMeta = (row) => {
    const raw = String(row?.status || row?.level || '').trim().toUpperCase();
    if (raw.includes('FAIL')) return { label: 'FAILURE', cls: 'status-failure' };
    if (raw.includes('WARN')) return { label: 'WARNING', cls: 'status-warning' };
    if (raw.includes('SUCC')) return { label: 'SUCCESS', cls: 'status-success' };
    if (raw.includes('CRIT')) return { label: 'CRITICAL', cls: 'status-critical' };
    return { label: raw || 'INFO', cls: 'status-info' };
  };

  return (
    <div className="animate-fade-in">
      <header className="page-header">
        <h1 className="page-title">Dashboard Overview</h1>
        <p className="page-subtitle">Real-time Security Information and Event Management</p>
      </header>

      {error && (
        <div className="glass-card" style={{ marginBottom: '1rem', borderLeft: '4px solid #ef4444' }}>
          {error}
        </div>
      )}

      <div className="dashboard-grid delay-100">
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)' }}>
            <Activity />
          </div>
          <div className="stat-info">
            <h3>Events Monitored (24h)</h3>
            <p>{loading ? '...' : stats.events24h}</p>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-critical)' }}>
            <ShieldAlert />
          </div>
          <div className="stat-info">
            <h3>Critical Alerts</h3>
            <p>{loading ? '...' : stats.critical}</p>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-low)' }}>
            <Server />
          </div>
          <div className="stat-info">
            <h3>Unique Source IPs</h3>
            <p>{loading ? '...' : stats.activeNodes}</p>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(234, 179, 8, 0.1)', color: 'var(--status-medium)' }}>
            <Users />
          </div>
          <div className="stat-info">
            <h3>Failed Logins</h3>
            <p>{loading ? '...' : stats.failed}</p>
          </div>
        </div>
      </div>

      <div className="glass-card delay-200">
        <h2 style={{ marginBottom: '1.5rem', color: '#fff', fontSize: '1.25rem' }}>Recent Activity (Real Logs)</h2>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>TIME</th>
                <th>EVENT</th>
                <th>SOURCE IP</th>
                <th>SCHOOL</th>
                <th>SEVERITY</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 8).map((row) => {
                const school = row.schoolDisplayName || row.schoolName || row.schoolUID || '-';
                const statusMeta = getStatusMeta(row);
                return (
                  <tr key={row._id}>
                    <td>{new Date(row.createdAt || row.timestamp).toLocaleString()}</td>
                    <td>{row.eventType || row.action || '-'}</td>
                    <td>{row.ipAddress || '-'}</td>
                    <td>{school}</td>
                    <td><span className={`status-badge ${statusMeta.cls}`}>{statusMeta.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
