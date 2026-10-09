export const ORGANIZATIONS = [
  { id: 'shopsphere', name: 'ShopSphere', sector: 'Commerce & payments', initials: 'SS', color: '#9b85ff', services: ['payment-service', 'orders-api', 'postgres-db', 'auth-service', 'edge-proxy'] },
  { id: 'cloudnova', name: 'CloudNova', sector: 'Cloud infrastructure', initials: 'CN', color: '#5ed9ee', services: ['compute-api', 'edge-proxy', 'metrics-db', 'identity-api', 'billing-service'] },
  { id: 'securegate', name: 'SecureGate', sector: 'Identity & access', initials: 'SG', color: '#64ddac', services: ['auth-service', 'session-api', 'identity-db', 'access-proxy', 'billing-service'] },
];

// Deliberately public MOCK accounts. This browser-only prototype has no security boundary.
export const ACCOUNTS = [
  { email: 'demo@logmind.local', password: 'Demo123!', name: 'Alex Morgan', role: 'admin', memberships: ORGANIZATIONS.map(o => o.id) },
  { email: 'engineer@logmind.local', password: 'Demo123!', name: 'Sam Rivera', role: 'engineer', memberships: ['shopsphere'] },
];

export const TYPES = ['ALL LOGS', 'ERROR', 'CRITICAL', 'WARNING', 'INFO', 'DEBUG', 'AUTHENTICATION', 'PAYMENT', 'DATABASE', 'API & NETWORK'];
export const SEVERITY = { CRITICAL: 5, ERROR: 4, WARNING: 3, INFO: 2, DEBUG: 1 };
export const TITLES = { database: 'Database connection failure', payment: 'Payment processing timeout', authentication: 'Authentication service failure', api: 'API rate limit exceeded', network: 'Upstream connectivity failure', other: 'Unclassified application error' };
const patterns = {
  database: /database|postgres|sqlstate|connection pool|db connection|deadlock/i,
  authentication: /authenticat|login|session valid|token expir|identity provider|unauthorized/i,
  payment: /payment|transaction|gateway|checkout/i,
  api: /rate.?limit|429|quota|too many requests/i,
  network: /upstream|connection reset|network|dns|econn|api request|socket/i,
};
export function classify(message) {
  return Object.keys(patterns).find(key => patterns[key].test(message)) || 'other';
}
export function normalize(message) {
  return String(message).toLowerCase().replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/g, '<id>').replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '<ip>').replace(/\b\d+(?:\.\d+)?\b/g, '<n>').replace(/[^a-z<>\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
export function redact(message) {
  return String(message).replace(/((?:password|secret|api[_-]?key|token)\s*[=:]\s*)([^\s,;]+)/gi, '$1[REDACTED]').replace(/(Bearer\s+)[\w.\-]+/gi, '$1[REDACTED]');
}
export function groupKey(log) {
  return log.kind === 'other' ? `other:${log.service}:${normalize(log.message)}` : `${log.kind}:${log.service}`;
}
export function authenticate(email, password, orgId) {
  const account = ACCOUNTS.find(a => a.email === email.trim().toLowerCase() && a.password === password);
  if (!account || !account.memberships.includes(orgId)) return null;
  const { password: omitted, ...user } = account;
  return { ...user, orgId };
}
export function parseLogs(text, orgId, now = Date.now()) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(s => s.trim());
  if (lines.length > 10000) throw new Error('This local demo accepts up to 10,000 non-empty lines per file.');
  if (!lines.length) throw new Error('The file contains no log entries.');
  let inferredTimestamps = 0;
  let unstructuredLines = 0;
  const batch = `${now}-${Math.random().toString(36).slice(2, 8)}`;
  const logs = lines.map((line, i) => {
    let obj = null;
    try { const value = JSON.parse(line); if (value && !Array.isArray(value) && typeof value === 'object') obj = value; } catch { /* Plain text is supported. */ }
    const rawTime = obj?.timestamp || obj?.time || line.match(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/)?.[0];
    const timestamp = Date.parse(rawTime);
    const hasTimezone = typeof rawTime === 'string' && /(?:Z|[+-]\d{2}:?\d{2})$/.test(rawTime);
    const validTime = Number.isFinite(timestamp);
    if (!validTime) inferredTimestamps++;
    const level = String(obj?.level || obj?.severity || line.match(/\b(CRITICAL|FATAL|ERROR|WARN(?:ING)?|INFO|DEBUG)\b/i)?.[0] || 'INFO').toUpperCase();
    const severity = level === 'FATAL' ? 'CRITICAL' : level === 'WARN' ? 'WARNING' : SEVERITY[level] ? level : 'INFO';
    const service = String(obj?.service || obj?.service_name || line.match(/\bservice[=:]([^\s,;]+)/i)?.[1] || line.match(/\b(?:CRITICAL|FATAL|ERROR|WARNING|WARN|INFO|DEBUG)\b\s+\[([^\]]+)\]/i)?.[1] || 'uploaded-service').slice(0, 100);
    const message = redact(typeof obj?.message === 'string' ? obj.message : typeof obj?.msg === 'string' ? obj.msg : line);
    if (!obj && !rawTime && !/\b(CRITICAL|FATAL|ERROR|WARN|WARNING|INFO|DEBUG)\b/i.test(line)) unstructuredLines++;
    return { id: `upload-${batch}-${i}`, orgId, timestamp: validTime ? timestamp : now + i, timestampInferred: !validTime, timezoneInferred: validTime && !hasTimezone, severity, service, message, kind: classify(message), traceId: String(obj?.trace_id || line.match(/trace(?:_id)?[=:]([^\s,;]+)/i)?.[1] || ''), source: 'upload' };
  });
  return { logs, inferredTimestamps, unstructuredLines };
}

export function prioritize(logs, now) {
  const severity = logs.reduce((a, l) => SEVERITY[l.severity] > SEVERITY[a] ? l.severity : a, 'INFO');
  const services = [...new Set(logs.map(l => l.service))];
  const first = Math.min(...logs.map(l => l.timestamp));
  const last = Math.max(...logs.map(l => l.timestamp));
  const recent = logs.filter(l => l.timestamp >= now - 30 * 60000).length;
  const previous = logs.filter(l => l.timestamp >= now - 60 * 60000 && l.timestamp < now - 30 * 60000).length;
  const impact = logs.some(l => ['payment', 'authentication'].includes(l.kind));
  const factors = [
    { label: `Highest severity: ${severity.toLowerCase()}`, value: { CRITICAL: 35, ERROR: 24, WARNING: 12, INFO: 0, DEBUG: 0 }[severity] },
    { label: `${logs.length} related entries`, value: Math.min(15, Math.ceil(Math.log2(logs.length + 1) * 2)) },
    { label: `${services.length} affected service${services.length > 1 ? 's' : ''}`, value: Math.min(10, services.length * 5) },
    { label: `${recent} errors in last 30 min vs ${previous} in previous 30 min`, value: recent > Math.max(previous * 1.5, 2) ? 15 : 0 },
    { label: impact ? 'Customer-facing payment or authentication path' : 'No payment or authentication indicator', value: impact ? 15 : 0 },
    { label: `Observed over ${Math.round((last - first) / 60000)} minutes`, value: last - first > 30 * 60000 ? 10 : 0 },
  ];
  const score = Math.min(100, factors.reduce((s, f) => s + f.value, 0));
  return { score, factors, severity, services, first, last, priority: score >= 80 ? 'P0' : score >= 60 ? 'P1' : score >= 35 ? 'P2' : 'P3' };
}
export function groupIncidents(logs, overrides = {}, orgId) {
  const own = logs.filter(l => l.orgId === orgId);
  const now = Math.max(Date.now(), ...own.map(l => l.timestamp));
  const groups = new Map();
  own.filter(l => SEVERITY[l.severity] >= 3).forEach(log => {
    const key = groupKey(log);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(log);
  });
  return [...groups].map(([id, entries]) => {
    const ranked = prioritize(entries, now);
    return { id, orgId, title: entries[0].kind === 'other' ? entries[0].message.slice(0, 90) : TITLES[entries[0].kind], kind: entries[0].kind, logs: entries.sort((a,b) => a.timestamp - b.timestamp), ...ranked, status: 'Open', assignee: 'Unassigned', notes: [], activity: [], ...overrides[id] };
  }).sort((a,b) => b.score - a.score || b.last - a.last);
}
const tokens = message => new Set(normalize(message).split(' ').filter(t => t.length > 2 && t !== '<n>'));
export function similarity(a, b) {
  const left = tokens(a), right = tokens(b);
  const union = new Set([...left, ...right]);
  return union.size ? [...left].filter(t => right.has(t)).length / union.size : 0;
}
export function historicalMatches(incident, history) {
  return history.filter(h => h.orgId === incident.orgId && h.status === 'Resolved' && h.worked === true && h.id !== `resolved:${incident.id}`).map(h => {
    const samples = [...new Set(incident.logs.map(l => normalize(l.message)))];
    const patternScore = Math.max(0, ...samples.flatMap(s => h.messages.map(m => similarity(s, m))));
    const sameService = incident.services.includes(h.service);
    const sameType = incident.kind === h.kind;
    const score = Math.round(100 * (patternScore * 0.7 + (sameService ? 0.2 : 0) + (sameType ? 0.1 : 0)));
    return { ...h, score, patternScore: Math.round(patternScore * 100), sameService, sameType };
  }).filter(h => h.score >= 45 && h.patternScore >= 25).sort((a,b) => b.score - a.score).slice(0,3);
}
export function filterLogs(logs, { type = 'ALL LOGS', search = '', service = 'all', severity = 'all', group = 'all', hours = '24', sort = 'timestamp', direction = 'desc' } = {}) {
  const newest = Math.max(Date.now(), ...logs.map(l => l.timestamp));
  const category = { AUTHENTICATION: ['authentication'], PAYMENT: ['payment'], DATABASE: ['database'], 'API & NETWORK': ['api', 'network'] }[type];
  return logs.filter(l => (type === 'ALL LOGS' || category?.includes(l.kind) || l.severity === type)
    && (severity === 'all' || severity === 'errors' && SEVERITY[l.severity] >= 4 || l.severity === severity) && (service === 'all' || l.service === service)
    && (group === 'all' || groupKey(l) === group)
    && (hours === 'all' || l.timestamp >= newest - Number(hours) * 3600000)
    && `${l.message} ${l.service} ${l.severity} ${l.traceId}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => { const left = sort === 'severity' ? SEVERITY[a.severity] : a[sort]; const right = sort === 'severity' ? SEVERITY[b.severity] : b[sort]; return (typeof left === 'number' ? left - right : String(left).localeCompare(String(right))) * (direction === 'asc' ? 1 : -1); });
}
export function csvCell(value) {
  const text = String(value ?? '');
  // Prevent spreadsheet formula execution, including leading whitespace/control characters.
  const safe = /^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function incidentsCSV(incidents) {
  return [['Incident', 'Organization', 'Severity', 'Priority', 'Score', 'Status', 'Services', 'Entries', 'First seen', 'Last seen', 'Assignee'], ...incidents.map(i => [i.title, i.orgId, i.severity, i.priority, i.score, i.status, i.services.join('; '), i.logs.length, new Date(i.first).toISOString(), new Date(i.last).toISOString(), i.assignee])].map(row => row.map(csvCell).join(',')).join('\r\n');
}
export const GENERAL_STEPS = ['Inspect the earliest failure and nearby log entries.', 'Check service health, resource limits, and recent deployments.', 'Compare trace identifiers across dependencies; correlation alone does not prove a shared cause.', 'Test a reversible mitigation in a safe environment and record the outcome.'];

export function paymentScenario(orgId, now = Date.now()) {
  const org = ORGANIZATIONS.find(o => o.id === orgId);
  const payment = org.services.find(s => /payment|billing/.test(s));
  const database = org.services.find(s => /db/.test(s));
  const traceId = `demo-payment-${now}`;
  return [
    ['INFO', payment, 'Payment request received for order 48219'],
    ['INFO', payment, 'Payment gateway request initiated'],
    ['ERROR', database, 'Database connection timeout after 5000ms'],
    ['ERROR', payment, 'Payment processing exceeded the timeout threshold'],
    ['CRITICAL', payment, 'Payment request failed after database connection timeout'],
    ['ERROR', payment, 'Payment retry attempt failed: transaction could not be completed'],
  ].map(([severity, service, message], i) => ({ id: `${traceId}-${i}`, orgId, timestamp: now - (5 - i) * 2000, severity, service, message, kind: classify(message), traceId, source: 'payment-demo' }));
}

export function seedOrg(orgId, now = Date.now()) {
  const org = ORGANIZATIONS.find(o => o.id === orgId);
  const index = ORGANIZATIONS.findIndex(o => o.id === orgId);
  const serviceFor = kind => kind === 'database' ? org.services[2] : kind === 'authentication' ? org.services[index === 2 ? 0 : 3] : kind === 'payment' ? org.services[index === 0 ? 0 : 4] : org.services[index === 0 ? 4 : 1];
  const specs = [
    { kind: 'database', message: 'Database connection timeout after 5000ms', rootCause: 'An increased worker count exhausted the database connection pool.', steps: ['Inspect active and idle database connections.', 'Compare application pool limits with the database connection budget.', 'Reduce worker concurrency and roll back the recent pool configuration.', 'Confirm connection utilization and payment latency return to baseline.'], failed: 'Restarting the payment gateway did not reduce connection timeouts.' },
    { kind: 'payment', message: 'Payment request timeout: gateway unavailable', rootCause: 'The gateway client timeout was lower than measured upstream latency.', steps: ['Check gateway latency and provider status.', 'Verify idempotency keys before retrying transactions.', 'Adjust timeout and bounded retry settings after a controlled test.', 'Reconcile transaction status to avoid duplicate charges.'], failed: 'Unbounded retries increased request volume without restoring payments.' },
    { kind: 'authentication', message: 'Authentication service unavailable: session validation error', rootCause: 'An identity-provider key rotation left a stale validation-key cache.', steps: ['Check identity-provider availability and recent key rotations.', 'Inspect token validation failures without logging credentials.', 'Refresh the validation-key cache using the documented runbook.', 'Verify sign-in and session refresh on a test account.'], failed: 'Extending session lifetime did not restore token validation.' },
    { kind: 'api', message: 'API rate limit exceeded: HTTP 429 quota exhausted', rootCause: 'A scheduled job exceeded the configured API request quota.', steps: ['Review HTTP 429 responses and Retry-After headers.', 'Identify the caller producing the traffic increase.', 'Apply bounded exponential backoff and lower worker concurrency.', 'Confirm request volume stays within the quota.'], failed: 'Immediate retries amplified throttling.' },
    { kind: 'network', message: 'Upstream service unavailable: connection reset by peer', rootCause: 'A connection-draining mismatch interrupted requests during a proxy rollout.', steps: ['Compare failures with proxy rollout timestamps.', 'Inspect upstream health and connection-reset metrics.', 'Align connection-draining and keepalive settings in staging.', 'Canary the change and watch error rates before continuing.'], failed: 'Increasing the request timeout did not prevent connection resets.' },
  ];
  const logs = [];
  const count = [640, 480, 360][index];
  for (let i = 0; i < count; i++) {
    const isError = i % 5 === 0 || i > count - 45;
    const primaryKind = ['payment', 'network', 'authentication'][index];
    const spec = specs[i > count - 16 ? specs.findIndex(s => s.kind === primaryKind) : (Math.floor(i / 5) + index * 2) % specs.length];
    const severity = isError ? (spec.kind === 'api' ? 'WARNING' : i % 19 === 0 || (spec.kind === ['payment','network','authentication'][index] && i > count - 20) ? 'CRITICAL' : i % 4 === 0 ? 'WARNING' : 'ERROR') : i % 11 === 0 ? 'DEBUG' : 'INFO';
    const message = isError ? spec.message : severity === 'DEBUG' ? 'Worker heartbeat completed; queue depth 0' : 'Request completed successfully with status 200';
    logs.push({ id: `${orgId}-seed-${i}`, orgId, timestamp: now - (count - i) * (86400000 / count), severity, service: isError ? serviceFor(spec.kind) : org.services[i % org.services.length], message, kind: isError ? spec.kind : 'other', traceId: `trace-${orgId}-${i}`, source: 'seed' });
  }
  const burst = specs.find(s => s.kind === ['payment', 'network', 'authentication'][index]);
  for (let i = 0; i < 18; i++) {
    logs.push({ id: `${orgId}-burst-${i}`, orgId, timestamp: now - (18 - i) * 12000, severity: i % 6 === 0 ? 'CRITICAL' : 'ERROR', service: serviceFor(burst.kind), message: burst.message, kind: burst.kind, traceId: `${orgId}-burst-trace-${i}`, source: 'seed' });
  }
  logs.push({ id: `${orgId}-low-priority`, orgId, timestamp: now - 120000, severity: 'WARNING', service: org.services[1], message: 'Background cache warming delayed', kind: 'other', traceId: `${orgId}-cache`, source: 'seed' });
  const history = specs.map((spec, i) => ({ id: `${orgId}-H${101 + i}`, orgId, title: TITLES[spec.kind], kind: spec.kind, service: serviceFor(spec.kind), severity: i === 0 || i === 2 ? 'CRITICAL' : 'ERROR', messages: [spec.message], patterns: [normalize(spec.message)], rootCause: spec.rootCause, steps: spec.steps, failed: spec.failed, status: 'Resolved', worked: true, first: now - (i + 3) * 86400000, last: now - (i + 3) * 86400000 + (23 + i * 6) * 60000, outcome: 'Error rate returned to baseline; verified in the seeded demo case.', engineer: ['Alex Morgan', 'Sam Rivera', 'Priya Shah'][i % 3] }));
  return { version: 1, orgId, logs, history, overrides: {}, feedback: {}, team: [{ id: 'alex', name: 'Alex Morgan', email: 'demo@logmind.local', role: 'admin' }, { id: 'sam', name: 'Sam Rivera', email: 'engineer@logmind.local', role: 'engineer' }, { id: 'priya', name: 'Priya Shah', email: 'priya@example.test', role: 'engineer' }], integrations: {}, settings: { retention: '30', notifications: true, name: org.name }, billing: { active: true, start: new Date(now).toISOString(), next: new Date(now + 30 * 86400000).toISOString() } };
}
