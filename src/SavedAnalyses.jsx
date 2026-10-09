import { useEffect, useState } from "react";

export default function SavedAnalyses() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:8001/analyses")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch analyses");
        }
        return response.json();
      })
      .then((data) => {
        setAnalyses(data.analyses || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>Loading saved analyses...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div>
      <h2>Saved Log Analyses</h2>

      <table>
        <thead>
          <tr>
            <th>Filename</th>
            <th>Total Logs</th>
            <th>Errors</th>
            <th>Warnings</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {analyses.map((item) => (
            <tr key={item.id}>
              <td>{item.filename}</td>
              <td>{item.total_logs}</td>
              <td>{item.errors}</td>
              <td>{item.warnings}</td>
              <td>{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}