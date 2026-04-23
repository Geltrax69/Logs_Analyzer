import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { fetchAuditSchools, fetchLogsPaged } from '../api';

const PAGE_SIZE = 30;

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const getLogRole = (log) => {
  const role = normalizeText(log?.actorRole || log?.userRole);
  if (role === 'parent') return 'parent';
  if (role === 'teacher') return 'teacher';
  if (normalizeText(log?.normalizedEventType || log?.eventType) === 'student_login') return 'parent';
  if (normalizeText(log?.normalizedEventType || log?.eventType).includes('teacher')) return 'teacher';
  if (normalizeText(log?.normalizedEventType || log?.eventType).includes('parent')) return 'parent';
  return role || 'unknown';
};

const getStatusMeta = (log) => {
  const raw = String(log?.status || log?.level || '').trim().toUpperCase();
  if (raw.includes('FAIL')) return { label: 'FAILED', cls: 'status-failure' };
  if (raw.includes('WARN')) return { label: 'WARNING', cls: 'status-warning' };
  if (raw.includes('SUCC')) return { label: 'SUCCESS', cls: 'status-success' };
  return { label: raw || 'INFO', cls: 'status-info' };
};

const getSchoolName = (log) => log.schoolDisplayName || log.schoolName || log.schoolUID || '-';

const getEventLabel = (log) => {
  const eventType = normalizeText(log?.normalizedEventType || log?.eventType || log?.action);
  if (eventType === 'parent_login') return 'Parent Login';
  if (eventType === 'student_login') return 'Parent Login';
  if (eventType === 'teacher_login') return 'Teacher Login';
  if (eventType === 'failed_login') return `${getLogRole(log) === 'teacher' ? 'Teacher' : 'Parent'} Login Failed`;
  return log?.eventType || log?.action || 'Unknown';
};

const getReasonText = (log) => {
  if (log?.failureReason && log.failureReason !== '-') return log.failureReason;
  if (log?.status === 'FAILURE' && log?.errorMessage) return log.errorMessage;
  if (normalizeText(log?.normalizedEventType || log?.eventType) === 'parent_login') return 'Parent login successful';
  if (normalizeText(log?.normalizedEventType || log?.eventType) === 'student_login') return 'Parent login successful';
  if (normalizeText(log?.normalizedEventType || log?.eventType) === 'teacher_login') return 'Teacher login successful';
  return '-';
};

const buildEventTypeFilter = ({ userRole, result }) => {
  if (result === 'failure') return 'failed_login';
  if (result === 'success' && userRole === 'parent') return 'parent_login,student_login';
  if (result === 'success' && userRole === 'teacher') return 'teacher_login';
  if (result === 'success') return 'parent_login,student_login,teacher_login';
  if (userRole === 'parent') return 'parent_login,student_login,failed_login';
  if (userRole === 'teacher') return 'teacher_login,failed_login';
  return 'parent_login,student_login,teacher_login,failed_login';
};

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
    userRole: '',
    result: '',
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
        eventType: buildEventTypeFilter(activeFilters),
        schoolUID: activeFilters.schoolUID,
        search: activeFilters.search,
        userRole: activeFilters.userRole
      });

      const logsArray = Array.isArray(data?.data) ? data.data : [];
      setLogs(logsArray);
      setPagination(data?.pagination || { total: logsArray.length, page: requestedPage, limit: PAGE_SIZE, totalPages: 1 });
      setPage(requestedPage);
    } catch {
      setError('Failed to fetch school login logs from backend. Check backend URL/CORS and /api/audit endpoint.');
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

  const metrics = useMemo(() => {
    const parentCount = logs.filter((log) => getLogRole(log) === 'parent').length;
    const teacherCount = logs.filter((log) => getLogRole(log) === 'teacher').length;
    const failedCount = logs.filter((log) => normalizeText(log?.status).includes('fail')).length;
    const selectedSchool = schools.find((school) => school.schoolUID === filters.schoolUID);

    return {
      total: logs.length,
      parentCount,
      teacherCount,
      failedCount,
      selectedSchoolName: selectedSchool?.schoolName || 'All Schools'
    };
  }, [filters.schoolUID, logs, schools]);

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const applyFilters = () => loadData(1, filters);

  const clearFilters = () => {
    const reset = { schoolUID: '', userRole: '', result: '', search: '' };
    setFilters(reset);
    loadData(1, reset);
  };

  return (
    <div className="animate-fade-in">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1 className="page-title">School Login Logs</h1>
          <p className="page-subtitle">Select a school to review parent and teacher login activity with clear failure reasons.</p>
        </div>
        <button
          onClick={() => loadData(page, filters)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--accent-primary)',
            color: '#fff',
            border: 'none',
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          Refresh Logs
        </button>
      </header>

      <div className="glass-card" style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '0.75rem' }}>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>SELECTED SCHOOL</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{metrics.selectedSchoolName}</div>
        </div>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>VISIBLE LOGS</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{metrics.total}</div>
        </div>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>PARENT LOGINS</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{metrics.parentCount}</div>
        </div>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>TEACHER / FAILED</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{metrics.teacherCount} / {metrics.failedCount}</div>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1.4fr auto auto', gap: '0.6rem', alignItems: 'end' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>School</div>
          <select
            value={filters.schoolUID}
            onChange={(e) => handleFilterChange('schoolUID', e.target.value)}
            style={{ width: '100%', background: '#0e1735', color: '#fff', border: '1px solid #24315d', borderRadius: 8, padding: '0.7rem 0.75rem' }}
            disabled={schoolsLoading}
          >
            <option value="">{schoolsLoading ? 'Loading schools...' : 'All Schools'}</option>
            {schools.map((school) => (
              <option key={school.schoolUID} value={school.schoolUID}>
                {school.schoolName} ({school.schoolUID})
              </option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>User Type</div>
          <select
            value={filters.userRole}
            onChange={(e) => handleFilterChange('userRole', e.target.value)}
            style={{ width: '100%', background: '#0e1735', color: '#fff', border: '1px solid #24315d', borderRadius: 8, padding: '0.7rem 0.75rem' }}
          >
            <option value="">Parent + Teacher</option>
            <option value="parent">Parent Only</option>
            <option value="teacher">Teacher Only</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Result</div>
          <select
            value={filters.result}
            onChange={(e) => handleFilterChange('result', e.target.value)}
            style={{ width: '100%', background: '#0e1735', color: '#fff', border: '1px solid #24315d', borderRadius: 8, padding: '0.7rem 0.75rem' }}
          >
            <option value="">All Results</option>
            <option value="success">Successful Logins</option>
            <option value="failure">Failed Logins</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Search</div>
          <input
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="username, school, ip"
            style={{ width: '100%', background: '#0e1735', color: '#fff', border: '1px solid #24315d', borderRadius: 8, padding: '0.7rem 0.75rem' }}
          />
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
          <p style={{ color: 'var(--text-muted)' }}>Fetching school login logs...</p>
        </div>
      ) : (
        <div className="glass-card delay-100">
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>No matching login logs found for the selected filters.</div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                <span>Showing page {pagination.page} of {pagination.totalPages}</span>
                <span>{pagination.total} matching records</span>
              </div>

              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>TIME</th>
                      <th>SCHOOL</th>
                      <th>USER TYPE</th>
                      <th>USERNAME</th>
                      <th>EVENT</th>
                      <th>RESULT</th>
                      <th>REASON</th>
                      <th>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, index) => {
                      const role = getLogRole(log);
                      const statusMeta = getStatusMeta(log);

                      return (
                        <tr key={log._id || index}>
                          <td>{new Date(log.createdAt || log.timestamp).toLocaleString()}</td>
                          <td>
                            <div style={{ display: 'grid', gap: '0.2rem' }}>
                              <span>{getSchoolName(log)}</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{log.schoolUID || 'No school UID'}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`status-badge ${role === 'teacher' ? 'status-info' : 'status-warning'}`}>
                              {role === 'teacher' ? 'Teacher' : role === 'parent' ? 'Parent' : 'Unknown'}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace' }}>{log.username || '-'}</td>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  onClick={() => loadData(page - 1, filters)}
                  disabled={page <= 1 || loading}
                  style={{ background: '#374151', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem 1rem', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                <button
                  onClick={() => loadData(page + 1, filters)}
                  disabled={page >= pagination.totalPages || loading}
                  style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem 1rem', cursor: page >= pagination.totalPages ? 'not-allowed' : 'pointer', opacity: page >= pagination.totalPages ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SecurityAlerts;
