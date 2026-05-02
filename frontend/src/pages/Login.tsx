import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../services/api';
import { showToast } from '../services/toast';

export default function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async () => {
    setLoading(true); setErr('');
    try {
      const result = mode === 'login'
        ? await login(username, password)
        : await register(username, password);
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      showToast('success', mode === 'login' ? 'LOGIN OK' : 'REGISTERED');
      nav('/');
    } catch (e: any) {
      setErr(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-deep)',
      position: 'relative',
      zIndex: 2,
    }}>
      <div className="panel" style={{
        width: 360,
        padding: '36px 32px 28px',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{ fontSize: 48, marginBottom: 8, filter: 'drop-shadow(0 0 8px rgba(240,192,64,0.5))' }}>
          🖥️
        </div>
        <div style={{ font: '12px var(--font-pixel)', color: 'var(--gold)', letterSpacing: 3, marginBottom: 4 }}>
          GPU SCHEDULER
        </div>
        <div style={{ font: '7px var(--font-mono)', color: 'var(--muted)', marginBottom: 28 }}>
          AI TRAIN DISPATCH SYSTEM
        </div>

        <div className="divider" style={{ marginBottom: 20 }} />

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{ font: '6px var(--font-pixel)', color: 'var(--dim)', letterSpacing: 1, display: 'block', marginBottom: 4 }}>
              USERNAME
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="enter username"
              style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 12 }}
            />
          </div>

          <div style={{ textAlign: 'left' }}>
            <label style={{ font: '6px var(--font-pixel)', color: 'var(--dim)', letterSpacing: 1, display: 'block', marginBottom: 4 }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="enter password"
              style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 12 }}
            />
          </div>

          {err && (
            <div style={{
              padding: '8px 10px',
              background: 'rgba(240,64,80,0.1)',
              border: '2px solid var(--red)',
              font: '7px var(--font-mono)',
              color: 'var(--red)',
              textAlign: 'left',
            }}>
              {err}
            </div>
          )}

          <button
            className="btn gold"
            onClick={handleSubmit}
            disabled={loading || !username || !password}
            style={{
              width: '100%',
              justifyContent: 'center',
              fontSize: 8,
              padding: '10px 14px',
              marginTop: 4,
              opacity: loading || !username || !password ? 0.5 : 1,
            }}
          >
            {loading ? '...' : mode === 'login' ? 'LOGIN' : 'REGISTER'}
          </button>
        </div>

        <div className="divider" style={{ marginTop: 20, marginBottom: 14 }} />

        {/* Toggle mode */}
        <div style={{ font: '6px var(--font-pixel)', color: 'var(--muted)' }}>
          {mode === 'login' ? (
            <>
              NO ACCOUNT?{' '}
              <span
                style={{ color: 'var(--cyan)', cursor: 'pointer' }}
                onClick={() => { setMode('register'); setErr(''); }}
              >
                REGISTER
              </span>
            </>
          ) : (
            <>
              HAVE ACCOUNT?{' '}
              <span
                style={{ color: 'var(--cyan)', cursor: 'pointer' }}
                onClick={() => { setMode('login'); setErr(''); }}
              >
                LOGIN
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
