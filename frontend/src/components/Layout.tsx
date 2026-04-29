import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'HOME', emoji: '🏠' },
  { path: '/tasks', label: 'TASKS', emoji: '📋' },
  { path: '/nodes', label: 'NODES', emoji: '🖥' },
  { path: '/submit', label: 'SUBMIT', emoji: '📦' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const activeIdx = navItems.findIndex(i => i.path === location.pathname);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* 可爱像素侧边栏 */}
      <aside style={{
        width: 210, background: '#fffdf7',
        borderRight: '3px solid #e0d6c8',
        display: 'flex', flexDirection: 'column',
        padding: '16px 0',
        zIndex: 10,
        boxShadow: '2px 0 16px rgba(0,0,0,0.04)',
      }}>
        {/* LOGO */}
        <div style={{
          padding: '0 14px 14px', borderBottom: '3px dashed #e0d6c8',
          marginBottom: 12, textAlign: 'center',
        }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>🤖</div>
          <div style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 10,
            color: '#5a4a8a', lineHeight: 1.8,
          }}>
            AI TRAIN
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#b0a0c0' }}>
            ☆ cute pixel scheduler ☆
          </div>
        </div>

        {/* 导航 */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 8px' }}>
          {navItems.map((item, idx) => {
            const active = idx === activeIdx;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 12px', borderRadius: 6,
                  color: active ? '#5a4a8a' : '#b0a0c0',
                  background: active ? '#f5f0ff' : 'transparent',
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 9,
                  textDecoration: 'none',
                  border: active ? '2px solid #c8b8e8' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 16 }}>{item.emoji}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 底部状态 */}
        <div style={{
          margin: '8px', padding: '10px 12px', borderRadius: 6,
          background: '#f5f0ff', border: '2px solid #e8ddf8',
          fontSize: 8, fontFamily: "'Press Start 2P', monospace",
          color: '#8a7aaa', lineHeight: 2.2,
        }}>
          <div>STATUS: <span style={{ color: '#8cd790' }}>●</span></div>
          <div>WORKERS: <span style={{ color: '#b8a0e8' }}>◈</span></div>
          <div style={{ textAlign: 'center', marginTop: 4 }}>v2.0.0</div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main style={{ flex: 1, padding: 20, background: '#faf5ef', overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
