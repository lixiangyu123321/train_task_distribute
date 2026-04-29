import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: '仪表盘' },
  { path: '/tasks', label: '任务列表' },
  { path: '/nodes', label: '节点监控' },
  { path: '/submit', label: '提交任务' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 220, background: '#1a1a2e', color: '#eee',
        padding: '24px 0', display: 'flex', flexDirection: 'column'
      }}>
        <h1 style={{ fontSize: 18, padding: '0 20px', marginBottom: 32, color: '#e94560' }}>
          AI 调度监控
        </h1>
        <nav style={{ display: 'flex', flexDirection: 'column' }}>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                padding: '12px 20px',
                color: location.pathname === item.path ? '#e94560' : '#aaa',
                background: location.pathname === item.path ? 'rgba(233,69,96,0.1)' : 'transparent',
                textDecoration: 'none', fontSize: 14,
                borderLeft: location.pathname === item.path ? '3px solid #e94560' : '3px solid transparent',
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 24, background: '#f5f6fa', overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
