import { Link, useLocation } from 'react-router-dom';

const nav = [
  { path: '/', label: 'BRIDGE',     icon: '◆' },
  { path: '/tasks', label: 'MISSIONS', icon: '◇' },
  { path: '/nodes', label: 'BAYS',    icon: '◈' },
  { path: '/submit', label: 'CARGO',   icon: '◻' },
  { path: '/tutorial', label: 'GUIDE',  icon: '◉' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        {/* Logo */}
        <div style={{
          padding: '16px 12px 14px', textAlign: 'center',
          borderBottom: '3px solid var(--border)',
          background: 'linear-gradient(180deg, rgba(240,192,64,0.06), transparent)',
        }}>
          <div style={{ fontSize: 26, marginBottom: 4, filter: 'drop-shadow(0 0 4px rgba(240,192,64,0.4))' }}>
            ⭐
          </div>
          <div style={{ font: '9px var(--font-pixel)', color: 'var(--gold)', letterSpacing: 2 }}>
            STAR OFFICE
          </div>
          <div style={{ font: '6px var(--font-mono)', color: 'var(--muted)', marginTop: 2 }}>
            AI SCHEDULER v3
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {nav.map(item => {
            const active = pathname === item.path;
            return (
              <Link key={item.path} to={item.path} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px',
                color: active ? 'var(--gold)' : 'var(--dim)',
                background: active ? 'rgba(240,192,64,0.08)' : 'transparent',
                borderLeft: active ? '3px solid var(--gold)' : '3px solid transparent',
                font: '7px var(--font-pixel)', textDecoration: 'none',
                letterSpacing: 1,
                transition: 'none',
                boxShadow: active ? 'inset 0 0 20px rgba(240,192,64,0.05)' : 'none',
              }}>
                <span style={{ fontSize: 12, color: active ? 'var(--gold)' : 'var(--muted)' }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          margin: '6px', padding: '8px 10px', border: '2px solid var(--border)',
          background: 'var(--bg-deep)', textAlign: 'center',
          font: '6px var(--font-pixel)', color: 'var(--muted)', lineHeight: 2,
        }}>
          <div>SYS <span style={{ color: 'var(--green)' }}>●</span> NOMINAL</div>
          <div style={{ fontSize: 5, color: 'var(--border-lit)', marginTop: 2 }}>© 2026 DEEP SCHEDULER</div>
        </div>
      </aside>

      <main className="app-main" style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </main>
    </div>
  );
}
