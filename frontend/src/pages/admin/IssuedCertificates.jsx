import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';

export default function IssuedCertificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadCertificates() {
      try {
        const response = await apiClient.get('/admin/certificates');
        if (active) {
          setCertificates(response.data);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError?.response?.data?.message || 'Unable to load certificates.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCertificates();

    return () => {
      active = false;
    };
  }, []);

  const revokeCertificate = async (id) => {
    await apiClient.patch(`/admin/certificates/${id}/revoke`);
    setCertificates((current) => current.filter((item) => (item._id || item.id) !== id));
  };

  const downloadPdf = async (id, name) => {
    const response = await apiClient.get(`/admin/certificates/${id}/pdf`, {
      responseType: 'blob',
    });

    const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${name || 'certificate'}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  };

  const columns = [
    { key: 'recipientName', label: 'Recipient' },
    { key: 'certificateId', label: 'Certificate ID' },
    { key: 'issueDate', label: 'Issue date' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="row-actions">
            <button className="button button-small" type="button" onClick={() => downloadPdf(row._id || row.id, row.certificateId)}>
              PDF
            </button>
            <button className="button button-small button-ghost" type="button" onClick={() => revokeCertificate(row._id || row.id)}>
            Revoke
          </button>
        </div>
      ),
    },
  ];

  return (
    <section className="stack">
      <article className="hero-card compact">
        <h2>Issued certificates</h2>
        <p className="muted-copy">Manage live records and export or revoke certificates when needed.</p>
      </article>

      {error ? <div className="inline-alert error">{error}</div> : null}
      {loading ? <div className="inline-alert neutral">Loading certificates...</div> : null}
      {!loading ? <DataTable columns={columns} rows={certificates} emptyState="No certificates have been issued yet." /> : null}
    </section>
  );
}
