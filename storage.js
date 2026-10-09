import { ORGANIZATIONS, ACCOUNTS, seedOrg } from './engine.js';

const KEY = 'logmind-demo-v1:';
export function loadOrganization(orgId) {
  if (!ORGANIZATIONS.some(o => o.id === orgId)) throw new Error('Unknown demo organization.');
  try {
    const data = JSON.parse(localStorage.getItem(KEY + orgId));
    if (data?.version === 1 && data.orgId === orgId && Array.isArray(data.logs) && Array.isArray(data.history) && data.logs.every(l => l.orgId === orgId) && data.history.every(h => h.orgId === orgId) && data.team && data.overrides && data.feedback && data.settings && data.billing && data.integrations) return data;
  } catch { /* A damaged cache is replaced with a fresh demo dataset. */ }
  return seedOrg(orgId);
}
export function saveOrganization(data) {
  if (data.logs.some(l => l.orgId !== data.orgId) || data.history.some(h => h.orgId !== data.orgId)) throw new Error('Organization mismatch.');
  localStorage.setItem(KEY + data.orgId, JSON.stringify(data));
}
export function getSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(KEY + 'session') || localStorage.getItem(KEY + 'session'));
    const account = ACCOUNTS.find(a => a.email === session?.email);
    if (!account || !account.memberships.includes(session.orgId)) return null;
    const { password, ...safeAccount } = account;
    return { ...safeAccount, orgId: session.orgId, remember: Boolean(session.remember) };
  } catch { return null; }
}
export function saveSession(session, remember = false) {
  try {
    localStorage.removeItem(KEY + 'session');
    sessionStorage.removeItem(KEY + 'session');
    if (session) (remember ? localStorage : sessionStorage).setItem(KEY + 'session', JSON.stringify({ email: session.email, orgId: session.orgId, remember }));
  } catch { /* Mock login still works in memory when browser storage is unavailable. */ }
}
