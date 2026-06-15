import { Link } from 'react-router-dom';

const cards = [
  { title: 'Pending requests', description: 'Review and decide on new submissions.', link: '/admin/requests' },
  { title: 'Issued certificates', description: 'View active records and revoke if needed.', link: '/admin/certificates' },
  { title: 'Audit trail', description: 'Track all administrative actions.', link: '/admin/audit' },
];

export default function AdminDashboard() {
  return (
    <section className="stack">
      <article className="hero-card">
        <p className="eyebrow">Admin dashboard</p>
        <h2>Review requests and manage issued certificates.</h2>
        <p className="muted-copy">Use this area to approve submissions, revoke records, and review audit history.</p>
      </article>

      <div className="grid three-col">
        {cards.map((card) => (
          <Link key={card.title} to={card.link} className="card metric-card">
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
