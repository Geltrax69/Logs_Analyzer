import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { fetchAuditSchools, fetchLogsPaged } from '../api';
import { getDisplayUsername, getEventLabel, getLogRole, getReasonText, getSchoolName, getStatusMeta, isSecurityAlert, normalizeText } from '../utils/logs';

const PAGE_SIZE = 30;

const SecurityAlerts = () => {
  const [logs, setLogs] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 });
  const [filters, setFilters] = useState({
    schoolUID: '',
    alertType: '',
    search: ''
  });

  const loadSchools = async () => {
    try {
      setSchoolsLoading(true);
      const response = await fetchAuditSchools();
      setSchools(Array.isArray(response?.data) ? response.data : []);
    } catch {
      setSchools([]);
    } finally {
      setSchoolsLoading(false);
    }
  };

  const loadData = async (requestedPage = page, activeFilters = filters) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchLogsPaged({
        page: requestedPage,
        limit: PAGE_SIZE,
        schoolUID: activeFilters.schoolUID,
        search: activeFilters.search,
        logCategory: 'security'
      });

      let logsArray = Array.isArray(data?.data) ? data.data.filter(isSecurityAlert) : [];
      if (activeFilters.alertType === 'failed_login') logsArray = logsArray.filter((log) => normalizeText(log.eventType) === 'failed_login' || normalizeText(log.action) === 'login_failed');
      if (activeFilters.alertType === 'search_warning') logsArray = logsArray.filter((log) => normalizeText(log.eventType) === 'search_activity');
      if (activeFilters.alertType === 'sql_injection') logsArray = logsArray.filter((log) => normalizeText(log.eventType) === 'sql_injection_alert');
      if (activeFilters.alertType === 'admin_alert') logsArray = logsArray.filter((log) => ['admin', 'website'].includes(getLogRole(log)) || normalizeText(log.action) === 'login_locked');

      setLogs(logsArray);
      setPagination(data?.pagination || { total: logsArray.length, page: requestedPage, limit: PAGE_SIZE, totalPages: 1 });
      setPage(requestedPage);
    } catch {
      setError('Failed to fetch security alerts from backend. Check backend URL/CORS and /api/audit endpoint.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchools();
    loadData(1, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metrics = useMemo(() => ({
    total: logs.length,
    failedLogins: logs.filter((log) => normalizeText(log.eventType) === 'failed_login' || normalizeText(log.action) === 'login_failed').length,
    searchWarnings: logs.filter((log) => normalizeText(log.eventType) === 'search_activity').length,
    criticalAlerts: logs.filter((log) => ['sql_injection_alert', 'bruteforce_alert'].includes(normalizeText(log.eventType)) || normalizeText(log.action) === 'login_locked').length,
  }), [logs]);

  const handleFilterChange = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const applyFilters = () => loadData(1, filters);
  const clearFilters = () => {
    const reset = { schoolUID: '', alertType: '', search: '' };
    setFilters(reset);
    loadData(1, reset);
  };

  return (
    <div className="animate-fade-in">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Security Alerts</h1>
          <p className="page-subtitle">View failed logins, search warnings, SQL injection alerts, and admin security events separately from school activity logs.</p>
        </div>
        <button onClick={() => loadData(page, filters)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }} disabled={loading}>
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          Refresh Alerts
        </button>
      </header>

      <div className="glass-card" style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '0.75rem' }}>
        <div><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>ALERTS ON PAGE</div><div style={{ fontSize: 24, fontWeight: 700 }}>{metrics.total}</div></div>
        <div><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>FAILED LOGINS</div><div style={{ fontSize: 24, fontWeight: 700 }}>{metrics.failedLogins}</div></div>
        <div><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>SEARCH WARNINGS</div><div style={{ fontSize: 24, fontWeight: 700 }}>{metrics.searchWarnings}</div></div>
        <div><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>CRITICAL ALERTS</div><div style={{ fontSize: 24, fontWeight: 700 }}>{metrics.criticalAlerts}</div></div>
      </div>

      <div className="glass-card" style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.4fr auto auto', gap: '0.6rem', alignItems: 'end' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>School</div>
          <select value={filters.schoolUID} onChange={(e) => handleFilterChange('schoolUID', e.target.value)} style={{ width: '100%', background: '#0e1735', color: '#fff', border: '1px solid #24315d', borderRadius: 8, padding: '0.7rem 0.75rem' }} disabled={schoolsLoading}>
            <option value="">{schoolsLoading ? 'Loading schools...' : 'All Schools'}</option>
            {schools.map((school) => (
              <option key={school.schoolUID} value={school.schoolUID}>{school.schoolName} ({school.schoolUID})</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Alert Type</div>
          <select value={filters.alertType} onChange={(e) => handleFilterChange('alertType', e.target.value)} style={{ width: '100%', background: '#0e1735', color: '#fff', border: '1px solid #24315d', borderRadius: 8, padding: '0.7rem 0.75rem' }}>
            <option value="">All Security Alerts</option>
            <option value="failed_login">Failed Login Alerts</option>
            <option value="search_warning">Search Warnings</option>
            <option value="sql_injection">SQL Injection Alerts</option>
            <option value="admin_alert">Admin Security Alerts</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Search</div>
          <input value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} placeholder="username, ip, path, searched text" style={{ width: '100%', background: '#0e1735', color: '#fff', border: '1px solid #24315d', borderRadius: 8, padding: '0.7rem 0.75rem' }} />
        </div>
        <button onClick={applyFilters} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem 0.95rem', cursor: 'pointer' }}>Apply</button>
        <button onClick={clearFilters} style={{ background: '#374151', color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem 0.95rem', cursor: 'pointer' }}>Clear</button>
      </div>

      {error ? (
        <div className="glass-card" style={{ borderLeft: '4px solid var(--status-critical)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <AlertTriangle color="var(--status-critical)" size={24} />
            <div>
              <h3 style={{ color: 'var(--status-critical)', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Connection Error</h3>
              <p style={{ color: 'var(--text-muted)' }}>{error}</p>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Fetching security alerts...</p>
        </div>
      ) : (
        <div className="glass-card delay-100">
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>No security alerts found for the selected filters.</div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>TIME</th>
                    <th>SCHOOL</th>
                    <th>AFFECTED USER</th>
                    <th>USERNAME</th>
                    <th>ALERT</th>
                    <th>RESULT</th>
                    <th>REASON</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => {
                    const statusMeta = getStatusMeta(log);
                    const role = normalizeText(getLogRole(log));
                    return (
                      <tr key={log._id || index}>
                        <td>{new Date(log.createdAt || log.timestamp).toLocaleString()}</td>
                        <td>{getSchoolName(log)}</td>
                        <td><span className={`status-badge ${role === 'admin' ? 'status-info' : role === 'teacher' ? 'status-info' : role === 'website' ? 'status-warning' : 'status-warning'}`}>{role.toUpperCase()}</span></td>
                        <td style={{ fontFamily: 'monospace' }}>{getDisplayUsername(log)}</td>
                        <td>{getEventLabel(log)}</td>
                        <td><span className={`status-badge ${statusMeta.cls}`}>{statusMeta.label}</span></td>
                        <td>{getReasonText(log)}</td>
                        <td style={{ fontFamily: 'monospace' }}>{log.ipAddress || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SecurityAlerts;
