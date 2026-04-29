import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'STUDIO', emoji: '🏭' },
  { path: '/tasks', label: 'TASKS', emoji: '📋' },
  { path: '/nodes', label: 'NODES', emoji: '🖥' },
  { path: '/submit', label: 'SUBMIT', emoji: '📦' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        {/* Logo */}
        <div style={{ padding: '18px 14px 14px', textAlign: 'center', borderBottom: '2px solid var(--c-border)' }}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>🤖</div>
          <div style={{ font: '9px var(--font-pixel)', color: '#5a4a8a', lineHeight: 1.7 }}>AI TRAIN</div>
          <div style={{ fontSize: 8, color: 'var(--c-dim)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>☆ pixel scheduler ☆</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(item => {
            const active = pathname === item.path;
            return (
              <Link key={item.path} to={item.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 12px', borderRadius: 'var(--radius-sm)',
                  color: active ? '#5a4a8a' : 'var(--c-dim)',
                  background: active ? '#f5f0ff' : 'transparent',
                  font: '8px var(--font-pixel)',
                  border: active ? '2px solid #d4c0f0' : '2px solid transparent',
                  transition: 'all 0.12s',
                  letterSpacing: '0.5px',
                }}>
                <span style={{ fontSize: 15 }}>{item.emoji}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          margin: '8px', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
          background: '#f5f0ff', border: '2px solid #e8ddf8',
          font: '7px var(--font-pixel)', color: 'var(--c-dim)',
          textAlign: 'center', lineHeight: 2,
        }}>
          <div>v3.0 STUDIO</div>
          <div style={{ color: 'var(--c-muted)', fontSize: 6 }}>© 2026 AI SCHEDULER</div>
        </div>
      </aside>

      <main className="app-main">
        {children}
      </main>
    </div>
  );
}
