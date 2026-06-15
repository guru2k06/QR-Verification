import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import DataTable from '../../components/DataTable';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadLogs() {
      try {
        const response = await apiClient.get('/admin/audit-logs');
        if (active) {
          setLogs(response.data);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError?.response?.data?.message || 'Unable to load audit logs.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadLogs();

    return () => {
      active = false;
    };
  }, []);

  const columns = [
    { key: 'createdAt', label: 'Timestamp' },
    { key: 'admin', label: 'Admin' },
    { key: 'action', label: 'Action' },
    { key: 'targetType', label: 'Target' },
    { key: 'details', label: 'Details' },
  ];

  return (
    <section className="stack">
      <article className="hero-card compact">
        <h2>Audit log</h2>
        <p className="muted-copy">Approve, reject, and revoke actions are written here for traceability.</p>
      </article>

      {error ? <div className="inline-alert error">{error}</div> : null}
      {loading ? <div className="inline-alert neutral">Loading audit log...</div> : null}
      {!loading ? <DataTable columns={columns} rows={logs} emptyState="No audit entries yet." /> : null}
    </section>
  );
}
