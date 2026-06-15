const labelMap = {
  valid: 'Valid',
  tampered: 'Tampered / Invalid',
  revoked: 'Revoked',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function StatusBadge({ status }) {
  return <span className={`status-badge status-${status}`}>{labelMap[status] || status}</span>;
}
