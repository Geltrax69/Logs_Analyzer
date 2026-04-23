import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { fetchAuditSchools, fetchLogsPaged } from '../api';
import { getDisplayUsername, getEventLabel, getLogCategory, getReasonText, getSchoolName, getStatusMeta, normalizeText } from '../utils/logs';

const PAGE_SIZE = 30;

const categoryOptions = [
  { value: '', label: 'All Logs' },
  { value: 'parent', label: 'Parent Logs' },
  { value: 'teacher', label: 'Teacher Logs' },
  { value: 'admin', label: 'Admin Logs' },
  { value: 'website', label: 'Website Logs' },
];

const SchoolLogs = () => {
  const [logs, setLogs] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 });
  const [filters, setFilters] = useState({
    schoolUID: '',
    logCategory: '',
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
        schoolUID: activeFilters.schoolUID,
        search: activeFilters.search,
        logCategory: activeFilters.logCategory || 'school'
      });

      let logsArray = Array.isArray(data?.data) ? data.data : [];
      if (activeFilters.result === 'success') {
        logsArray = logsArray.filter((log) => getStatusMeta(log).label === 'SUCCESS');
      }
      if (activeFilters.result === 'failure') {
        logsArray = logsArray.filter((log) => getStatusMeta(log).label === 'FAILED');
      }
      if (activeFilters.result === 'warning') {
        logsArray = logsArray.filter((log) => getStatusMeta(log).label === 'WARNING');
      }

      setLogs(logsArray);
      setPagination(data?.pagination || { total: logsArray.length, page: requestedPage, limit: PAGE_SIZE, totalPages: 1 });
      setPage(requestedPage);
    } catch {
      setError('Failed to fetch school logs from backend. Check backend URL/CORS and /api/audit endpoint.');
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
    const selectedSchool = schools.find((school) => school.schoolUID === filters.schoolUID);
    return {
      total: logs.length,
      parentCount: logs.filter((log) => getLogCategory(log) === 'parent').length,
      teacherCount: logs.filter((log) => getLogCategory(log) === 'teacher').length,
      adminCount: logs.filter((log) => getLogCategory(log) === 'admin').length,
      websiteCount: logs.filter((log) => getLogCategory(log) === 'website').length,
      selectedSchoolName: selectedSchool?.schoolName || 'All Schools'
    };
  }, [filters.schoolUID, logs, schools]);

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const applyFilters = () => loadData(1, filters);
  const clearFilters = () => {
    const reset = { schoolUID: '', logCategory: '', result: '', search: '' };
    setFilters(reset);
    loadData(1, reset);
  };

  return (
    <div className="animate-fade-in">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1 className="page-title">School Logs</h1>
          <p className="page-subtitle">Review school logs separately for parent, teacher, admin, and website activity, including what users searched in the app.</p>
        </div>
        <button
          onClick={() => loadData(page, filters)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          Refresh Logs
        </button>
      </header>

      <div className="glass-card" style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: '0.75rem' }}>
        <div><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>SELECTED SCHOOL</div><div style={{ fontSize: 20, fontWeight: 700 }}>{metrics.selectedSchoolName}</div></div>
        <div><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>VISIBLE LOGS</div><div style={{ fontSize: 24, fontWeight: 700 }}>{metrics.total}</div></div>
        <div><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>PARENT / TEACHER</div><div style={{ fontSize: 24, fontWeight: 700 }}>{metrics.parentCount} / {metrics.teacherCount}</div></div>
        <div><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>ADMIN LOGS</div><div style={{ fontSize: 24, fontWeight: 700 }}>{metrics.adminCount}</div></div>
        <div><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>WEBSITE LOGS</div><div style={{ fontSize: 24, fontWeight: 700 }}>{metrics.websiteCount}</div></div>
      </div>

      <div className="glass-card" style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1.4fr auto auto', gap: '0.6rem', alignItems: 'end' }}>
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
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Log Type</div>
          <select value={filters.logCategory} onChange={(e) => handleFilterChange('logCategory', e.target.value)} style={{ width: '100%', background: '#0e1735', color: '#fff', border: '1px solid #24315d', borderRadius: 8, padding: '0.7rem 0.75rem' }}>
            {categoryOptions.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Result</div>
          <select value={filters.result} onChange={(e) => handleFilterChange('result', e.target.value)} style={{ width: '100%', background: '#0e1735', color: '#fff', border: '1px solid #24315d', borderRadius: 8, padding: '0.7rem 0.75rem' }}>
            <option value="">All Results</option>
            <option value="success">Success</option>
            <option value="failure">Failed</option>
            <option value="warning">Warning</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Search</div>
          <input value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} placeholder="username, school, ip, searched text" style={{ width: '100%', background: '#0e1735', color: '#fff', border: '1px solid #24315d', borderRadius: 8, padding: '0.7rem 0.75rem' }} />
        </div>
        <button onClick={applyFilters} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem 0.95rem', cursor: 'pointer' }}>Apply</button>
        <button onClick={clearFilters} style={{ background: '#374151', color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem 0.95rem', cursor: 'pointer' }}>Clear</button>
      </div>

      {error ? (
        <div className="glass-card" style={{ borderLeft: '4px solid var(--status-critical)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>{error}</div>
      ) : loading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Fetching school logs...</p>
        </div>
      ) : (
        <div className="glass-card delay-100">
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>No matching school logs found for the selected filters.</div>
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
                      <th>LOG TYPE</th>
                      <th>USERNAME</th>
                      <th>EVENT</th>
                      <th>RESULT</th>
                      <th>DETAILS</th>
                      <th>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, index) => {
                      const statusMeta = getStatusMeta(log);
                      const category = normalizeText(getLogCategory(log));
                      return (
                        <tr key={log._id || index}>
                          <td>{new Date(log.createdAt || log.timestamp).toLocaleString()}</td>
                          <td><div style={{ display: 'grid', gap: '0.2rem' }}><span>{getSchoolName(log)}</span><span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{log.schoolUID || 'No school UID'}</span></div></td>
                          <td><span className={`status-badge ${category === 'admin' ? 'status-info' : category === 'website' ? 'status-warning' : category === 'teacher' ? 'status-info' : 'status-warning'}`}>{category.toUpperCase()}</span></td>
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button onClick={() => loadData(page - 1, filters)} disabled={page <= 1 || loading} style={{ background: '#374151', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem 1rem', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}>Previous</button>
                <button onClick={() => loadData(page + 1, filters)} disabled={page >= pagination.totalPages || loading} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem 1rem', cursor: page >= pagination.totalPages ? 'not-allowed' : 'pointer', opacity: page >= pagination.totalPages ? 0.5 : 1 }}>Next</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SchoolLogs;
