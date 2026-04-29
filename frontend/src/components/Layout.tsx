import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'DASHBOARD', icon: '▓' },
  { path: '/tasks', label: 'TASKS', icon: '▒' },
  { path: '/nodes', label: 'NODES', icon: '░' },
  { path: '/submit', label: 'SUBMIT', icon: '█' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* 像素侧边栏 */}
      <aside style={{
        width: 220, background: '#0d0d1f',
        borderRight: '3px solid #2a2a50',
        boxShadow: '4px 0 20px rgba(180,77,255,0.15)',
        display: 'flex', flexDirection: 'column',
        padding: '20px 0',
        zIndex: 10,
      }}>
        {/* Logo 区域 */}
        <div style={{
          padding: '0 16px 20px',
          borderBottom: '3px solid #2a2a50',
          marginBottom: 12,
        }}>
          <div style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 11, color: '#ff2d78',
            textShadow: '0 0 10px #ff2d78, 2px 2px 0 #6a1b3a',
            lineHeight: 1.8, marginBottom: 4,
          }}>
            AI TRAIN
          </div>
          <div style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 8, color: '#b44dff',
            textShadow: '0 0 6px #b44dff',
          }}>
            ▓▓▓▓▓▓▓▓▓▓▓▓▓▓
          </div>
          <div style={{
            fontSize: 9, color: '#39ff14', marginTop: 6,
            fontFamily: 'monospace',
          }}>
            <span style={{ animation: 'neonFlicker 1.5s infinite' }}>●</span> SYSTEM ONLINE
          </div>
        </div>

        {/* 导航 */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 16px',
                  color: active ? '#00f0ff' : '#6666aa',
                  background: active
                    ? 'linear-gradient(90deg, rgba(180,77,255,0.2), transparent)'
                    : 'transparent',
                  borderLeft: active ? '4px solid #b44dff' : '4px solid transparent',
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 9,
                  textDecoration: 'none',
                  boxShadow: active ? 'inset 0 0 20px rgba(180,77,255,0.1)' : 'none',
                  transition: 'all 0.1s steps(2)',
                }}
              >
                <span style={{ fontSize: 14, color: active ? '#b44dff' : '#444' }}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 底部状态 */}
        <div style={{
          padding: '16px', borderTop: '3px solid #2a2a50',
          fontSize: 8, color: '#555', fontFamily: "'Press Start 2P', monospace",
          lineHeight: 2,
        }}>
          <div>CPU: <span style={{ color: '#39ff14' }}>OK</span></div>
          <div>MEM: <span style={{ color: '#ffe600' }}>35%</span></div>
          <div style={{ marginTop: 4, fontFamily: 'monospace', fontSize: 8 }}>
            v2.0.0 PIXEL
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main style={{
        flex: 1, padding: 20,
        background: '#0a0a12',
        overflow: 'auto',
      }}>
        {children}
      </main>
    </div>
  );
}
