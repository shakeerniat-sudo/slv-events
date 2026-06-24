import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-white text-slate-800 dark:bg-[#0B1220] dark:text-slate-100 p-6 overflow-hidden transition-colors duration-200 font-sans">
      <div className="w-full max-w-lg z-10 text-left select-text">
        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mb-6 border-b border-slate-100 dark:border-slate-850 pb-4">
          404. <span className="text-slate-450 dark:text-slate-500 font-medium">That’s an error.</span>
        </h1>
        
        {/* Message */}
        <div className="space-y-4 mb-8">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
            The requested URL <code className="bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-md text-xs font-semibold text-rose-500 border border-slate-150 dark:border-slate-850">{location.pathname}</code> was not found on this server.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            That’s all we know.
          </p>
        </div>

        {/* Back Link */}
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 hover:text-sky-500 text-slate-600 dark:text-slate-350 font-semibold rounded-xl border border-slate-200 dark:border-slate-850 transition-all hover:scale-[1.01] active:scale-[0.99] text-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go back to Dashboard</span>
        </button>
      </div>
    </div>
  );
};

export default NotFound;
