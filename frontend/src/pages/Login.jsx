import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ShieldAlert, Sparkles } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Quick login helper to help user test roles out of the box
  const handleQuickLogin = (role) => {
    const credentials = {
      'Admin': { email: 'admin@slvevents.com', password: 'admin123' },
      'Vendor Coordinator': { email: 'coordinator@slvevents.com', password: 'admin123' },
      'Operations Lead': { email: 'operations@slvevents.com', password: 'admin123' },
      'Finance Team': { email: 'finance@slvevents.com', password: 'admin123' }
    };

    const target = credentials[role];
    if (target) {
      setEmail(target.email);
      setPassword(target.password);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 dark:bg-[#0B1220] dark:text-slate-100 p-4 overflow-hidden transition-colors duration-200">
      {/* Background decorative glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/5 dark:bg-sky-500/10 rounded-full blur-3xl animate-soft-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl animate-soft-pulse" style={{ animationDelay: '1s' }} />

      {/* Login Portal Container */}
      <div className="w-full max-w-md z-10 animate-fade-in-up">
        {/* Brand / Logo */}
        <div className="flex flex-col items-center gap-2 mb-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-2xl text-white shadow-md border border-white/10 select-none">
            SLV
          </div>
          <h2 className="font-bold text-xl tracking-wider text-slate-800 dark:text-slate-100 mt-2 font-sans">SLV EVENTS</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Vendor & Staff Assignment Engine</p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8 rounded-3xl">
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200 mb-6">Sign In</h3>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-250 dark:bg-rose-950/60 dark:border-rose-800/60 rounded-xl flex items-center gap-2 text-rose-800 dark:text-rose-455 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input !pl-10"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Password</label>
                <a href="#forgot" className="text-xs text-sky-500 hover:text-sky-655 hover:underline font-semibold">Forgot password?</a>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input !pl-10"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-sky-500 rounded border-slate-200 dark:border-slate-800 cursor-pointer"
                />
                <span>Remember my account</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99] duration-150 mt-4 disabled:opacity-50 text-xs cursor-pointer"
            >
              {loading ? 'Authenticating...' : 'Secure Sign In'}
            </button>
          </form>

          {/* Quick Sandbox Login Shortcuts */}
          <div className="mt-8 pt-6 border-t border-slate-150 dark:border-slate-850">
            <p className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Sandbox Access Shortcuts</span>
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {['Admin', 'Vendor Coordinator', 'Operations Lead', 'Finance Team'].map(role => (
                <button
                  key={role}
                  onClick={() => handleQuickLogin(role)}
                  className="px-3 py-2 text-[10px] bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/60 dark:hover:bg-slate-850 hover:text-sky-500 dark:hover:text-sky-400 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-800 text-left truncate transition-all font-semibold cursor-pointer"
                >
                  Log in as {role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
