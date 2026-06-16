import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 dark:bg-[#090D16] dark:text-slate-100 p-6 overflow-hidden transition-colors duration-200">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/5 dark:bg-primary-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl" />

      {/* Main 404 Portal Card */}
      <div className="w-full max-w-md z-10 animate-fade-in-up text-center">
        {/* Glowing Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg border border-white/10 select-none animate-pulse">
            <Compass className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* 404 Heading */}
        <h1 className="text-7xl font-extrabold tracking-widest text-slate-800 dark:text-slate-100 font-sans">
          404
        </h1>
        <h2 className="font-bold text-lg text-slate-700 dark:text-slate-200 mt-2 mb-4">
          Page Not Found
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-8 leading-relaxed">
          The route or feature you are trying to open does not exist, or has been relocated to another secure department.
        </p>

        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] duration-150 text-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
};

export default NotFound;
