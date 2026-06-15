import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';

export default function PendingRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadRequests() {
      try {
        const response = await apiClient.get('/admin/requests');
        if (active) {
          setRequests(response.data);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError?.response?.data?.message || 'Unable to load requests.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadRequests();

    return () => {
      active = false;
    };
  }, []);

  const updateRequest = async (id, action) => {
    await apiClient.patch(`/admin/requests/${id}/${action}`);
    setRequests((current) => current.filter((item) => (item._id || item.id) !== id));
  };

  const columns = [
    { key: 'recipientName', label: 'Recipient' },
    { key: 'course', label: 'Course' },
    { key: 'issuer', label: 'Issuer' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="row-actions">
          <button className="button button-small" type="button" onClick={() => updateRequest(row._id || row.id, 'approve')}>
            Approve
          </button>
          <button className="button button-small button-ghost" type="button" onClick={() => updateRequest(row._id || row.id, 'reject')}>
            Reject
          </button>
        </div>
      ),
    },
  ];

  return (
    <section className="stack">
      <article className="hero-card compact">
        <h2>Pending requests</h2>
        <p className="muted-copy">Approve or reject submissions before certificates are issued.</p>
      </article>

      {error ? <div className="inline-alert error">{error}</div> : null}
      {loading ? <div className="inline-alert neutral">Loading requests...</div> : null}
      {!loading ? <DataTable columns={columns} rows={requests} emptyState="No requests waiting for review." /> : null}
    </section>
  );
}
