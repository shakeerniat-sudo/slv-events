import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, ShieldCheck, RefreshCw, Eye, AlertCircle, Info } from 'lucide-react';

const ConflictManagement = () => {
  const navigate = useNavigate();
  const { isCoordinator } = useAuth();
  
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);

  const fetchConflicts = async () => {
    try {
      const res = await axios.get('/assignments/conflicts');
      setConflicts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConflicts();
  }, []);

  const handleIgnore = (idx) => {
    if (!window.confirm('Are you sure you want to dismiss this warning? Ensure the vendor/staff has adequate manpower.')) return;
    setConflicts(prev => prev.filter((_, i) => i !== idx));
  };

  const handleResolveRedirect = (eventId) => {
    navigate(`/assignments?eventId=${eventId}`);
  };

  if (loading) {
    return <div className="flex-1 py-12 text-center text-xs text-slate-500 animate-pulse">Running scheduling scan...</div>;
  }

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 animate-fade-in pr-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Conflict Management Center</h2>
          <p className="text-xs text-slate-400">Scan and resolve resource double-bookings and scheduling overlaps</p>
        </div>
        
        <button
          onClick={fetchConflicts}
          className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl text-xs transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Scan</span>
        </button>
      </div>

      {conflicts.length === 0 ? (
        <div className="glass-card p-12 text-center bg-slate-900/10">
          <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-200 mb-1">Roster Conflicts Clean</h3>
          <p className="text-xs text-slate-500">All assigned vendors and crew shifts are free of date overlaps</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="bg-rose-950/20 border border-rose-900/40 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-300 leading-normal">
              <p className="font-bold">Detected Double Bookings ({conflicts.length})</p>
              <p className="mt-1">The following resources are currently booked on multiple events scheduled for the same calendar date. Prompt resolution is advised.</p>
            </div>
          </div>

          <div className="space-y-4">
            {conflicts.map((conf, idx) => (
              <div
                key={idx}
                className="glass-card p-5 bg-gradient-to-r from-slate-900/50 to-rose-950/5 border-rose-900/10 hover:border-rose-900/25 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-900/50 flex items-center justify-center text-rose-400 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] px-2 py-0.5 bg-rose-950/80 border border-rose-900/40 text-rose-400 rounded-full font-bold uppercase tracking-wider">
                      {conf.conflictType} ({conf.resourceType})
                    </span>
                    <h3 className="font-semibold text-sm text-slate-200 mt-2">
                      {conf.resourceName}
                    </h3>
                    <p className="text-[11px] text-slate-450 mt-1">
                      Double-booked on <strong>{new Date(conf.date).toLocaleDateString()}</strong> for:
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {conf.events.map(e => (
                        <span key={e.id} className="text-[10px] bg-slate-950/60 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-lg">
                          {e.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t border-slate-800/80 md:border-none pt-4 md:pt-0">
                  <button
                    onClick={() => handleIgnore(idx)}
                    className="px-3.5 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-850 hover:text-white text-slate-400 rounded-xl text-xs transition-colors"
                  >
                    Ignore Alert
                  </button>
                  {isCoordinator && (
                    <button
                      onClick={() => handleResolveRedirect(conf.events[0].id)}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-950/20"
                    >
                      Resolve Overlap
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConflictManagement;
