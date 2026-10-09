import React from "react";

export default function AIIncidents({ incidents = [] }) {

  if (!incidents.length) {
    return null;
  }

  return (
    <div
      style={{
        padding: "20px",
        background: "#111827",
        borderRadius: "12px",
        marginBottom: "24px",
        color: "white"
      }}
    >

      <h2>🤖 AI Incident Analysis</h2>

      <p>
        {incidents.length} incidents detected by AI
      </p>

      {incidents.map((incident, index) => (

        <div
          key={incident.incident_id ?? index}
          style={{
            background: "#1f2937",
            padding: "20px",
            borderRadius: "10px",
            marginTop: "15px"
          }}
        >

          <h3>Incident #{incident.incident_id}</h3>

          <p>
            <strong>Error:</strong>{" "}
            {incident.example_error}
          </p>

          <p>
            <strong>Priority:</strong>{" "}
            {incident.priority}
          </p>

          <p>
            <strong>Occurrences:</strong>{" "}
            {incident.occurrences}
          </p>

          <p>
            <strong>Affected Services:</strong>{" "}
            {incident.affected_services?.join(", ") || "Unknown"}
          </p>

          <h4>🔍 Possible Root Cause</h4>

          <p>
            {incident.root_cause?.possible_cause ||
              "Not available"}
          </p>

          <small>
            {incident.root_cause?.status}
          </small>

          <h4>💡 Recommended Solutions</h4>

          <ol>
            {incident.solutions?.recommended_actions?.map(
              (action, i) => (
                <li key={i}>{action}</li>
              )
            )}
          </ol>

        </div>

      ))}

    </div>
  );
}