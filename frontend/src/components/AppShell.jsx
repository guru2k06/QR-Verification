import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const publicLinks = [
  { to: '/request', label: 'Request certificate' },
  { to: '/verify/demo-cert', label: 'Verify certificate' },
];

const adminLinks = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/requests', label: 'Requests' },
  { to: '/admin/certificates', label: 'Certificates' },
  { to: '/admin/audit', label: 'Audit log' },
];

export default function AppShell() {
  const { token, adminUser, logout } = useAuth();
  const location = useLocation();
  const isAdminArea = location.pathname.startsWith('/admin');

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark">CV</div>
          <div>
            <p className="eyebrow">Digital Certificate Verification System</p>
            <h1>Certificate verification made simple.</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="pill">{isAdminArea ? 'Admin area' : 'Public access'}</span>
          {token ? <span className="pill subtle">{adminUser?.name || 'Admin signed in'}</span> : null}
          {token ? (
            <button className="button button-ghost" type="button" onClick={logout}>
              Sign out
            </button>
          ) : null}
        </div>
      </header>

      <nav className="subnav">
        {(isAdminArea ? adminLinks : publicLinks).map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => `subnav-link ${isActive ? 'active' : ''}`}>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <section className="page-intro">
        <p className="page-intro-label">{isAdminArea ? 'Administration' : 'Public verification'}</p>
        <p className="page-intro-copy">
          {isAdminArea
            ? 'Review requests, issue certificates, and track administrative activity from one place.'
            : 'Submit a request or verify a certificate from a public QR code link.'}
        </p>
      </section>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
