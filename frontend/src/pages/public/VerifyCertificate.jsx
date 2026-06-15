import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusBadge from '../../components/StatusBadge';

export default function VerifyCertificate() {
  const { id } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadCertificate() {
      try {
        setLoading(true);
        const response = await apiClient.get(`/verify/${id}`);
        if (active) {
          setCertificate(response.data);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError?.response?.data?.message || 'Unable to verify this certificate right now.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (id) {
      loadCertificate();
    }

    return () => {
      active = false;
    };
  }, [id]);

  return (
    <section className="verify-layout">
      <article className="hero-card verify-summary">
        <p className="eyebrow">Public verification</p>
        <h2>Verify certificate {id}</h2>
        <p className="muted-copy">The result below shows whether the certificate is valid, revoked, or altered.</p>
        {loading ? <div className="inline-alert neutral">Checking certificate...</div> : null}
        {error ? <div className="inline-alert error">{error}</div> : null}
        {certificate ? <StatusBadge status={certificate.status} /> : null}
      </article>

      <article className="card detail-card">
        <h3>Certificate details</h3>
        {certificate ? (
          <dl className="detail-grid">
            <div>
              <dt>Recipient</dt>
              <dd>{certificate.recipientName}</dd>
            </div>
            <div>
              <dt>Course</dt>
              <dd>{certificate.course}</dd>
            </div>
            <div>
              <dt>Issuer</dt>
              <dd>{certificate.issuer}</dd>
            </div>
            <div>
              <dt>Issue date</dt>
              <dd>{certificate.issueDate}</dd>
            </div>
            <div>
              <dt>Certificate ID</dt>
              <dd>{certificate.certificateId || id}</dd>
            </div>
            <div>
              <dt>Verification outcome</dt>
              <dd>{certificate.message}</dd>
            </div>
          </dl>
        ) : (
          <p className="muted-copy">Verification data will appear here once the backend responds.</p>
        )}
      </article>
    </section>
  );
}
