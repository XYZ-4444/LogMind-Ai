import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLogs, groupIncidents, paymentScenario, seedOrg } from '../src/engine.js';
import { saveOrganization, loadOrganization } from '../src/storage.js';

test('mixed uploaded logs retain severities and group errors locally', () => {
  const sample = [
    JSON.stringify({timestamp: '2026-10-10T10:00:00Z', severity: 'ERROR', level: 'ERROR', service: 'db-api', message: 'Database connection timeout after 5000ms'}),
    JSON.stringify({timestamp: '2026-10-10T10:00:01Z', level: 'ERROR', service: 'db-api', message: 'Database connection timeout after 6000ms'}),
    '2026-10-10T10:00:02Z WARNING [auth-api] Authentication retry delayed',
    'plain unstructured line'
  ].join('\n');
  const parsed = parseLogs(sample, 'shopsphere');
  assert.equal(parsed.logs.length, 4);
  assert.equal(parsed.logs.filter(l => l.severity === 'ERROR').length, 2);
  assert.ok(parsed.logs.every(l => l.orgId === 'shopsphere'));
  const incidents = groupIncidents(parsed.logs, {}, 'shopsphere');
  assert.ok(incidents.some(i => i.logs.length === 2 && /^P[0-3]$/.test(i.priority)));
});

test('empty uploads and more than 10,000 lines are rejected; 10,000 lines work', () => {
  assert.throws(() => parseLogs(' \n ', 'shopsphere'), /no log entries/);
  assert.throws(() => parseLogs('INFO sample\n'.repeat(10001), 'shopsphere'), /10,000/);
  assert.equal(parseLogs('INFO sample\n'.repeat(10000), 'shopsphere').logs.length, 10000);
});

test('local results persist and are isolated by demo organization', () => {
  const cache = new Map();
  globalThis.localStorage = {getItem: k => cache.get(k) ?? null, setItem: (k,v) => cache.set(k,v)};
  const data = seedOrg('shopsphere');
  const sample = paymentScenario('shopsphere');
  data.logs.push(...sample);
  saveOrganization(data);
  assert.equal(loadOrganization('shopsphere').logs.length, data.logs.length);
  assert.ok(groupIncidents(sample, {}, 'shopsphere').length > 0);
  const contaminated = {...data, logs: [...data.logs, {...sample[0], orgId: 'other'}]};
  assert.throws(() => saveOrganization(contaminated), /mismatch/);
  delete globalThis.localStorage;
});
