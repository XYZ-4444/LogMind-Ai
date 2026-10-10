import React from 'react';

export default function SavedAnalyses() {
  return (
    <div className="info-banner" role="note">
      <span><strong>Browser-only mode.</strong> Log parsing, rule-based incident grouping,
        and demo recommendations run on this device. Data is stored in this browser
        when storage is available. Cloud AI grouping, Supabase saves, and server-side
        analysis are unavailable without a separately hosted backend. Nothing is sent
        to Render. Clearing browser data removes local history.</span>
    </div>
  );
}
