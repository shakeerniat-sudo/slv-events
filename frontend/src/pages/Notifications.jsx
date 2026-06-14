import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, CheckSquare, AlertTriangle, Calendar, CreditCard, ShieldAlert } from 'lucide-react';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await axios.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => axios.put(`/notifications/${n.id}/read`)));
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'Assignment Confirmation': return <CheckSquare className="w-5 h-5 text-emerald-450" />;
      case 'Payment Reminder': return <CreditCard className="w-5 h-5 text-violet-400" />;
      case 'Upcoming Event': return <Calendar className="w-5 h-5 text-cyan-400" />;
      case 'Conflict Alert': return <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />;
      default: return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  const getCategoryColor = (type) => {
    switch (type) {
      case 'Assignment Confirmation': return 'bg-emerald-950/40 border-emerald-900/30 text-emerald-400';
      case 'Payment Reminder': return 'bg-violet-950/40 border-violet-900/30 text-violet-400';
      case 'Upcoming Event': return 'bg-cyan-950/40 border-cyan-900/30 text-cyan-400';
      case 'Conflict Alert': return 'bg-rose-950/40 border-rose-900/30 text-rose-450';
      default: return 'bg-slate-900 border-slate-800 text-slate-400';
    }
  };

  if (loading) {
    return <div className="flex-1 py-12 text-center text-xs text-slate-500 animate-pulse">Checking inbox alerts...</div>;
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 animate-fade-in pr-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Notifications Center</h2>
          <p className="text-xs text-slate-400">Review system warnings, payments, and assignment confirmations</p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-350 hover:text-white rounded-xl text-xs transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-500 bg-slate-900/10">
          <Bell className="w-12 h-12 text-primary-500 opacity-30 mx-auto mb-4" />
          <p className="text-sm">Inbox clear. No recent notifications.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`glass-card p-4 flex items-start justify-between gap-4 transition-all ${
                !notif.is_read 
                  ? 'bg-slate-900/70 border-slate-700/80 shadow-md shadow-primary-950/5' 
                  : 'bg-slate-900/30 border-slate-850 opacity-70'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${getCategoryColor(notif.type)}`}>
                  {getIcon(notif.type)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-xs text-slate-250">{notif.title}</span>
                    <span className="text-[8px] px-2 py-0.5 bg-slate-950/80 border border-slate-850 rounded-full text-slate-450 uppercase font-semibold">
                      {notif.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mt-2 max-w-2xl">{notif.message}</p>
                  <span className="text-[10px] text-slate-500 block mt-2">
                    {new Date(notif.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {!notif.is_read && (
                <button
                  onClick={() => handleMarkAsRead(notif.id)}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] font-semibold text-primary-500 hover:text-primary-400 border border-slate-800 rounded-lg transition-colors shrink-0"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
