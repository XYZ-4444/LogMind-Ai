import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
const server = await createServer({server: {middlewareMode: true, hmr: false, ws: false}, appType: 'custom'});
try {
  const { LogExplorer } = await server.ssrLoadModule('/src/investigation.jsx');
  const { seedOrg, ORGANIZATIONS, groupIncidents } = await server.ssrLoadModule('/src/engine.js');
  const data = seedOrg('shopsphere');
  const incidents = groupIncidents(data.logs, {}, 'shopsphere');
  const html = renderToString(React.createElement(LogExplorer, {data, update: () => {}, org: ORGANIZATIONS[0], incidents, allIncidents: incidents, openIncident: () => {}, hours: 'all', preset: {}, notify: () => {}}));
  assert.match(html, /Browser-only mode/);
  assert.match(html, /Cloud AI grouping, Supabase saves/);
  assert.match(html, /Log stream/);
  assert.doesNotMatch(html, /Failed to fetch|Loading saved analyses|AI Incident Analysis/);
  console.log('Log explorer render: passed; browser-only disclosure and local stream present.');
} finally { await server.close(); }
