import React, { useEffect, useMemo, useState } from 'react';
import { fetchLogsPaged } from '../api';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

const PAGE_SIZE = 30;
const ALERT_DISMISSED_AT_KEY = 'security_alerts_dismissed_at';

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const SQL_PATTERN = /('|--|;|\/\*|\*\/|\b(or|and)\b\s+\d+\s*=\s*\d+|\b(union|select|insert|update|delete|drop|alter|truncate|exec|sleep|benchmark)\b|={2,})/i;

const getLogAction = (log) => normalizeText(`${log?.eventType || ''} ${log?.action || ''} ${log?.type || ''}`);

const isLoginEvent = (log) => {
  const action = getLogAction(log);
  return action.includes('login') && !action.includes('failed') && !action.includes('fail');
};

const isFailedLogin = (log) => {
  const action = getLogAction(log);
  const status = normalizeText(log?.status || log?.level);
  return action.includes('failed_login') || action.includes('login_failed') || (action.includes('login') && status.includes('fail'));
};

const isSqlAlert = (log) => {
  const metadata = log?.metadata || {};
  const status = normalizeText(log?.status || log?.level);
  const scanText = [
    log?.eventType,
    log?.action,
    log?.resource,
    log?.endpoint,
    log?.details,
    log?.errorMessage,
    metadata.searchText,
    metadata.path
  ].filter(Boolean).join(' ');

  return getLogAction(log).includes('sql_injection') || SQL_PATTERN.test(scanText) || (status.includes('warn') && SQL_PATTERN.test(scanText));
};

const SecurityAlerts = () => {
  const [logs, setLogs] = useState([]);
  const [popupAlerts, setPopupAlerts] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 });
  const [filters, setFilters] = useState({ eventType: '', schoolUID: '', search: '' });

  const loadData = async (requestedPage = page, activeFilters = filters) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchLogsPaged({
        page: requestedPage,
        limit: PAGE_SIZE,
        eventType: activeFilters.eventType,
        schoolUID: activeFilters.schoolUID,
        search: activeFilters.search
      });

      const logsArray = Array.isArray(data?.data) ? data.data : [];
      setLogs(logsArray);
      setPagination(data?.pagination || { total: logsArray.length, page: requestedPage, limit: PAGE_SIZE, totalPages: 1 });
      setPage(requestedPage);

      const criticalAlerts = logsArray.filter((log) =>
        isSqlAlert(log) ||
        getLogAction(log).includes('bruteforce') ||
        String(log.status || '').toUpperCase() === 'WARNING'
      );

      const dismissedAtRaw = localStorage.getItem(ALERT_DISMISSED_AT_KEY);
      const dismissedAt = dismissedAtRaw ? new Date(dismissedAtRaw).getTime() : 0;
      const newCriticalAlerts = criticalAlerts.filter((log) => {
        const t = new Date(log.createdAt || log.timestamp || 0).getTime();
        return t > dismissedAt;
      });

      setPopupAlerts(newCriticalAlerts.slice(0, 5));
      setShowPopup(newCriticalAlerts.length > 0);
    } catch {
      setError('Failed to fetch real security logs from backend. Check backend URL/CORS and /api/audit endpoint.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial backend fetch for the security log table.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData(1, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusMeta = (log) => {
    const raw = String(log?.status || log?.level || '').trim().toUpperCase();
    if (raw.includes('FAIL')) return { label: 'FAILURE', cls: 'status-failure' };
    if (raw.includes('WARN')) return { label: 'WARNING', cls: 'status-warning' };
    if (raw.includes('SUCC')) return { label: 'SUCCESS', cls: 'status-success' };
    if (raw.includes('CRIT')) return { label: 'CRITICAL', cls: 'status-critical' };
    return { label: raw || 'INFO', cls: 'status-info' };
  };

  const getResourceText = (log) => {
    const metadata = log.metadata || {};
    if (metadata.searchText) return `Search Entered: ${metadata.searchText}`;
    if (metadata.path) return metadata.path;
    if (typeof log.details === 'string') return log.details;
    if (log.resource) return log.resource;
    return log.endpoint || '-';
  };

  const getSchoolName = (log) => {
    if (log.schoolDisplayName && log.schoolDisplayName !== '-') return log.schoolDisplayName;
    if (log.schoolName && !String(log.schoolName).startsWith('SCH_')) return log.schoolName;
    return log.schoolUID || '-';
  };

  const metrics = useMemo(() => {
    const total = logs.length;
    const loginCount = logs.filter(isLoginEvent).length;
    const failedCount = logs.filter(isFailedLogin).length;
    const sqliCount = logs.filter(isSqlAlert).length;
    return { total, loginCount, failedCount, sqliCount };
  }, [logs]);

  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
  };

  const applyFilters = () => loadData(1, filters);
  const clearFilters = () => {
    const reset = { eventType: '', schoolUID: '', search: '' };
    setFilters(reset);
    loadData(1, reset);
  };

  const dismissPopup = () => {
    localStorage.setItem(ALERT_DISMISSED_AT_KEY, new Date().toISOString());
    setShowPopup(false);
  };

  return (
    <div className="animate-fade-in">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Security Alerts Management</h1>
          <p className="page-subtitle">Real backend logs with school name, login time and IP</p>
        </div>
        <button
          onClick={() => loadData(page, filters)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-primary)',
            color: '#fff', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'
          }}
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          Refresh Logs
        </button>
      </header>

      <div className="glass-card" style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '0.75rem' }}>
        <div><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>ROWS (PAGE)</div><div style={{ fontSize: 24, fontWeight: 700 }}>{metrics.total}</div></div>
        <div><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>LOGIN EVENTS</div><div style={{ fontSize: 24, fontWeight: 700 }}>{metrics.loginCount}</div></div>
        <div><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>FAILED LOGINS</div><div style={{ fontSize: 24, fontWeight: 700 }}>{metrics.failedCount}</div></div>
        <div><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>SQL ALERTS</div><div style={{ fontSize: 24, fontWeight: 700 }}>{metrics.sqliCount}</div></div>
      </div>

      <div className="glass-card" style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr auto auto', gap: '0.6rem', alignItems: 'end' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Search</div>
          <input value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} placeholder="username, ip, school, event"
            style={{ width: '100%', background: '#0e1735', color: '#fff', border: '1px solid #24315d', borderRadius: 8, padding: '0.55rem 0.7rem' }} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Event</div>
          <input value={filters.eventType} onChange={(e) => handleFilterChange('eventType', e.target.value)} placeholder="login / failed_login"
            style={{ width: '100%', background: '#0e1735', color: '#fff', border: '1px solid #24315d', borderRadius: 8, padding: '0.55rem 0.7rem' }} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>School UID</div>
          <input value={filters.schoolUID} onChange={(e) => handleFilterChange('schoolUID', e.target.value)} placeholder="SCH_..."
            style={{ width: '100%', background: '#0e1735', color: '#fff', border: '1px solid #24315d', borderRadius: 8, padding: '0.55rem 0.7rem' }} />
        </div>
        <button onClick={applyFilters} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 0.9rem', cursor: 'pointer' }}>Apply</button>
        <button onClick={clearFilters} style={{ background: '#374151', color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 0.9rem', cursor: 'pointer' }}>Clear</button>
      </div>

      {showPopup && popupAlerts.length > 0 && (
        <div style={{ position: 'fixed', top: 20, right: 20, width: '420px', maxWidth: '90vw', zIndex: 9999, background: 'rgba(20,20,20,0.96)', border: '1px solid rgba(239,68,68,0.6)', borderRadius: 12, padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', fontWeight: 700 }}><AlertTriangle size={18} />Security Alerts</div>
            <button onClick={dismissPopup} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }} aria-label="Close alert popup"><X size={18} /></button>
          </div>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {popupAlerts.map((alert, index) => (
              <div key={alert._id || index} style={{ background: 'rgba(239,68,68,0.12)', borderRadius: 8, padding: '0.65rem' }}>
                <div style={{ fontSize: '0.86rem', color: '#fca5a5', fontWeight: 600 }}>{alert.eventType || alert.action || 'security_alert'}</div>
                <div style={{ fontSize: '0.82rem', color: '#f3f4f6' }}>{alert.errorMessage || getResourceText(alert)}</div>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.2rem' }}>{new Date(alert.createdAt || alert.timestamp).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

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
          <p style={{ color: 'var(--text-muted)' }}>Fetching security logs...</p>
        </div>
      ) : (
        <div className="glass-card delay-100">
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>No audit logs found.</div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>LOGIN TIME</th>
                    <th>SCHOOL NAME</th>
                    <th>IP</th>
                    <th>EVENT ID</th>
                    <th>ACTION</th>
                    <th>RESOURCE</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => (
                    <tr key={log._id || index}>
                      <td>{new Date(log.createdAt || log.timestamp).toLocaleString()}</td>
                      <td>{getSchoolName(log)}</td>
                      <td style={{ fontFamily: 'monospace' }}>{log.ipAddress || '-'}</td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{log._id?.substring(0, 8) || 'N/A'}</td>
                      <td>{log.eventType || log.action || log.type || 'Unknown'}</td>
                      <td>{getResourceText(log)}</td>
                      <td>
                        {(() => {
                          const meta = getStatusMeta(log);
                          return <span className={`status-badge ${meta.cls}`}>{meta.label}</span>;
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.9rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Page {pagination.page} of {pagination.totalPages} | Total {pagination.total}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => loadData(page - 1, filters)}
                disabled={page <= 1 || loading}
                style={{ background: '#1f2937', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 0.8rem', cursor: 'pointer', opacity: page <= 1 ? 0.45 : 1 }}
              >
                Previous
              </button>
              <button
                onClick={() => loadData(page + 1, filters)}
                disabled={page >= pagination.totalPages || loading}
                style={{ background: '#1f2937', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 0.8rem', cursor: 'pointer', opacity: page >= pagination.totalPages ? 0.45 : 1 }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default SecurityAlerts;
