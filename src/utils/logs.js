export const normalizeText = (value) => String(value || '').trim().toLowerCase();

export const getLogRole = (log) => {
  const role = normalizeText(log?.actorRole || log?.userRole || log?.actorType);
  const category = normalizeText(log?.logCategory);
  const eventType = normalizeText(log?.normalizedEventType || log?.eventType);
  const action = normalizeText(log?.action);

  if (category === 'website') return 'website';
  if (action === 'admin_access' || eventType === 'search_activity') return 'website';
  if (role === 'parent' || eventType === 'parent_login' || eventType === 'student_login') return 'parent';
  if (role === 'teacher' || eventType === 'teacher_login') return 'teacher';
  if (['admin', 'super_admin', 'super-admin', 'principal', 'school_admin', 'simpedu-admin'].includes(role) || action.startsWith('login_')) return 'admin';
  return role || 'unknown';
};

export const getLogCategory = (log) => {
  const category = normalizeText(log?.logCategory);
  if (category) return category;
  const role = getLogRole(log);
  if (role === 'website') return 'website';
  if (role === 'admin') return 'admin';
  if (role === 'teacher') return 'teacher';
  if (role === 'parent') return 'parent';
  return 'system';
};

export const getStatusMeta = (log) => {
  const eventType = normalizeText(log?.normalizedEventType || log?.eventType);
  const action = normalizeText(log?.action);
  const status = normalizeText(log?.status || log?.level);

  if (eventType === 'failed_login' || action === 'login_failed' || status.includes('fail')) {
    return { label: 'FAILED', cls: 'status-failure' };
  }
  if (eventType === 'sql_injection_alert' || eventType === 'bruteforce_alert' || action === 'login_locked' || status.includes('warn')) {
    return { label: 'WARNING', cls: 'status-warning' };
  }
  if (status.includes('succ')) return { label: 'SUCCESS', cls: 'status-success' };
  return { label: (log?.status || 'INFO').toUpperCase(), cls: 'status-info' };
};

export const getSchoolName = (log) => log.schoolDisplayName || log.schoolName || log.schoolUID || '-';

export const getDisplayUsername = (log) => log.displayUsername || log.username || log.actorEmail || log.actorName || '-';

export const getEventLabel = (log) => {
  const eventType = normalizeText(log?.normalizedEventType || log?.eventType);
  const action = normalizeText(log?.action);
  const role = getLogRole(log);

  if (eventType === 'login' && role === 'admin') return 'Admin Login';
  if (eventType === 'parent_login' || eventType === 'student_login') return 'Parent Login';
  if (eventType === 'teacher_login') return 'Teacher Login';
  if (eventType === 'failed_login') {
    if (role === 'teacher') return 'Teacher Login Failed';
    if (role === 'admin') return 'Admin Login Failed';
    return 'Parent Login Failed';
  }
  if (eventType === 'search_activity') return 'Search Activity';
  if (eventType === 'sql_injection_alert') return 'SQL Injection Alert';
  if (eventType === 'bruteforce_alert') return 'Bruteforce Alert';
  if (action === 'login_success') return 'Admin Login';
  if (action === 'login_failed') return 'Admin Login Failed';
  if (action === 'login_locked') return 'Admin Login Locked';
  if (action === 'admin_access') return 'Admin Website Access';
  return log?.eventType || log?.action || 'Unknown';
};

export const getReasonText = (log) => {
  if (log?.metadata?.searchText) return `Searched: ${log.metadata.searchText}`;
  if (log?.failureReason && log.failureReason !== '-') return log.failureReason;
  if (log?.errorMessage) return log.errorMessage;
  if (log?.details?.reason) return log.details.reason;
  if (log?.metadata?.issueReason) return log.metadata.issueReason;
  if (log?.details?.path) return log.details.path;
  if (log?.metadata?.path) return log.metadata.path;

  const eventType = normalizeText(log?.normalizedEventType || log?.eventType);
  const action = normalizeText(log?.action);
  const role = getLogRole(log);

  if (eventType === 'parent_login' || eventType === 'student_login') return 'Parent login successful';
  if (eventType === 'teacher_login') return 'Teacher login successful';
  if (action === 'login_success' && role === 'admin') return 'Admin login successful';
  if (action === 'admin_access') return 'Website/admin dashboard activity';
  return '-';
};

export const isSecurityAlert = (log) => {
  const eventType = normalizeText(log?.normalizedEventType || log?.eventType);
  const action = normalizeText(log?.action);
  const status = normalizeText(log?.status || log?.level);

  return [
    'failed_login',
    'sql_injection_alert',
    'bruteforce_alert',
    'unauthorized_access',
    'devtools_opened',
    'search_activity',
  ].includes(eventType) || ['login_failed', 'login_locked'].includes(action) || status.includes('warn');
};
