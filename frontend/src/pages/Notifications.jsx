import React from 'react';
import axios from 'axios';
import { useUIStore } from '../store/uiStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckSquare, AlertTriangle, Calendar, CreditCard } from 'lucide-react';

const Notifications = () => {
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();

  // Query to fetch notifications (synchronized with global polling query in Layout)
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await axios.get('/notifications');
      return res.data;
    }
  });

  // Mark single notification as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      await axios.put(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      addToast('Notification marked as read.');
    }
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => axios.put(`/notifications/${n.id}/read`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      addToast('All notifications marked as read.');
    }
  });

  const getIcon = (type) => {
    switch (type) {
      case 'Assignment Confirmation': 
        return <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'Payment Reminder': 
        return <CreditCard className="w-5 h-5 text-violet-600 dark:text-violet-400" />;
      case 'Upcoming Event': 
        return <Calendar className="w-5 h-5 text-sky-600 dark:text-sky-455" />;
      case 'Conflict Alert': 
        return <AlertTriangle className="w-5 h-5 text-rose-605 dark:text-rose-400 animate-bounce" />;
      default: 
        return <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400" />;
    }
  };

  const getCategoryColor = (type) => {
    switch (type) {
      case 'Assignment Confirmation': 
        return 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900/30 dark:text-emerald-400';
      case 'Payment Reminder': 
        return 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/40 dark:border-violet-900/30 dark:text-violet-400';
      case 'Upcoming Event': 
        return 'bg-sky-50 border-sky-200 text-sky-700 dark:bg-[#0ea5e9]/10 dark:border-[#0ea5e9]/20 dark:text-sky-400';
      case 'Conflict Alert': 
        return 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-955/40 dark:border-rose-905/30 dark:text-rose-450';
      default: 
        return 'bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400';
    }
  };

  if (isLoading) {
    return <div className="flex-1 py-12 text-center text-xs text-slate-500 dark:text-slate-400 animate-pulse">Checking inbox alerts...</div>;
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 animate-fade-in-up pr-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Notifications Center</h2>
          <p className="text-xs text-slate-550 dark:text-slate-400">Review system warnings, payments, and assignment confirmations</p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-205 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-655 hover:text-slate-900 dark:text-slate-350 dark:hover:text-white rounded-xl text-xs transition-colors border border-slate-250 dark:border-slate-800 cursor-pointer"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-450 bg-white dark:bg-[#111C30]/40 border-slate-200 dark:border-slate-800">
          <Bell className="w-12 h-12 text-sky-500 opacity-35 mx-auto mb-4 animate-bounce" />
          <p className="text-sm">Inbox clear. No recent notifications.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`glass-card p-4 flex items-start justify-between gap-4 transition-all border-slate-200 dark:border-slate-850 bg-white hover:bg-slate-50/50 dark:bg-[#111C30]/20 dark:hover:bg-[#111C30]/40 ${
                !notif.is_read 
                  ? 'border-sky-200 shadow-sm dark:border-slate-700/80' 
                  : 'opacity-70'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${getCategoryColor(notif.type)}`}>
                  {getIcon(notif.type)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{notif.title}</span>
                    <span className="text-[8px] px-2.5 py-0.5 bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-850 rounded-full text-slate-600 dark:text-slate-400 uppercase font-bold">
                      {notif.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-655 dark:text-slate-300 leading-relaxed mt-2 max-w-2xl font-medium">{notif.message}</p>
                  <span className="text-[10px] text-slate-450 dark:text-slate-500 block mt-2">
                    {new Date(notif.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {!notif.is_read && (
                <button
                  onClick={() => markReadMutation.mutate(notif.id)}
                  className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-[10px] font-bold text-sky-600 dark:text-sky-500 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors shrink-0 cursor-pointer"
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
