import { useState } from 'react';
import axios from 'axios';
import { useUIStore } from '../store/uiStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  Calendar, 
  CreditCard, 
  ClipboardList, 
  Users, 
  Tag, 
  MapPin, 
  DollarSign, 
  Inbox,
  Clock,
  Trash2,
  Search,
  Check
} from 'lucide-react';

const Notifications = () => {
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();
  
  // States for category filter, search query, and confirmation dialogs
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);

  // Query to fetch notifications
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

  // Delete single notification mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await axios.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      addToast('Notification deleted successfully.');
    },
    onError: () => {
      addToast('Failed to delete notification.', 'error');
    }
  });

  // Clear all notifications mutation
  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      await axios.delete('/notifications');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      addToast('All notifications cleared successfully.');
    },
    onError: () => {
      addToast('Failed to clear notifications.', 'error');
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

  // Helper mapping function for category classification
  const getTabCategory = (type, title) => {
    const t = type || '';
    const titleText = title || '';
    if (t === 'Event Summary' || titleText.includes('Summary') || titleText.includes('Briefing')) {
      return 'recommendations';
    }
    if (t === 'Conflict Alert' || titleText.includes('Conflict')) {
      return 'alerts';
    }
    if (t === 'Assignment Confirmation' || titleText.includes('Assigned') || titleText.includes('Allocated')) {
      return 'confirmations';
    }
    if (t === 'Payment Reminder' || t === 'Upcoming Event' || titleText.includes('Reminder') || titleText.includes('Warning') || titleText.includes('Day')) {
      return 'reminders';
    }
    return 'alerts'; // default fallback
  };

  const getIcon = (type) => {
    switch (type) {
      case 'Assignment Confirmation': 
        return <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'Payment Reminder': 
        return <CreditCard className="w-5 h-5 text-violet-600 dark:text-violet-400" />;
      case 'Upcoming Event': 
        return <Calendar className="w-5 h-5 text-sky-600 dark:text-sky-405" />;
      case 'Conflict Alert': 
        return <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 animate-pulse" />;
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

  // Helper parser for Event Summary card format
  const parseSummaryMessage = (message) => {
    const lines = message.split('\n');
    const details = {};
    lines.forEach(line => {
      const parts = line.split(': ');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join(': ').trim();
        details[key] = val;
      }
    });
    return details;
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-12 text-slate-500 dark:text-slate-400">
        <Clock className="w-8 h-8 animate-spin mb-3 text-sky-500" />
        <span className="text-xs animate-pulse font-medium">Checking automation desk feeds...</span>
      </div>
    );
  }

  // Filter list based on selected category tab & search query
  const filteredNotifications = notifications.filter(notif => {
    const matchesSearch = 
      notif.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      notif.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (activeTab === 'all') return true;
    return getTabCategory(notif.type, notif.title) === activeTab;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 pr-2">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-sky-500" />
            <span>Notifications Center</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Review alerts, reminders, crew recommendations, and briefings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-655 hover:text-slate-900 dark:text-slate-350 dark:hover:text-white rounded-xl text-xs font-semibold transition-colors border border-slate-250 dark:border-slate-800 cursor-pointer shadow-sm"
            >
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={() => setDeleteAllConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold transition-colors border border-rose-200 dark:border-rose-900/40 cursor-pointer shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
          <Search className="w-4 h-4" />
        </span>
        <input
          type="text"
          placeholder="Search notifications by title or message contents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="form-input !pl-10 text-xs w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C30]/20"
        />
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { id: 'all', label: 'All Inbox', count: notifications.length, icon: Inbox },
          { id: 'recommendations', label: 'Recommendations', count: notifications.filter(n => getTabCategory(n.type, n.title) === 'recommendations').length, icon: ClipboardList },
          { id: 'alerts', label: 'Alerts', count: notifications.filter(n => getTabCategory(n.type, n.title) === 'alerts').length, icon: AlertTriangle },
          { id: 'confirmations', label: 'Confirmations', count: notifications.filter(n => getTabCategory(n.type, n.title) === 'confirmations').length, icon: CheckCircle },
          { id: 'reminders', label: 'Follow-up Reminders', count: notifications.filter(n => getTabCategory(n.type, n.title) === 'reminders').length, icon: Clock }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              activeTab === tab.id
                ? 'bg-sky-50 dark:bg-[#0ea5e9]/10 border-sky-200 dark:border-[#0ea5e9]/20 text-sky-600 dark:text-sky-400'
                : 'bg-transparent border-transparent hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-850 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <tab.icon className="w-4 h-4 shrink-0" />
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id 
                  ? 'bg-sky-500 text-white' 
                  : 'bg-slate-150 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications Render Pane */}
      {filteredNotifications.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-450 bg-white dark:bg-[#111C30]/40 border border-slate-200 dark:border-slate-800">
          <Bell className="w-12 h-12 text-sky-500 opacity-25 mx-auto mb-4 animate-bounce" />
          <p className="text-sm font-semibold">Workspace clear</p>
          <p className="text-xs text-slate-500 mt-1">No notifications matched your query filters.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredNotifications.map(notif => {
            const isSummary = notif.type === 'Event Summary' || notif.title.startsWith('Event Summary:');
            
            if (isSummary) {
              const details = parseSummaryMessage(notif.message);
              return (
                <div
                  key={notif.id}
                  className={`glass-card p-6 flex flex-col gap-4 transition-all border bg-white dark:bg-[#111C30]/25 ${
                    !notif.is_read 
                      ? 'border-sky-300 shadow-md dark:border-sky-900/40' 
                      : 'border-slate-200 dark:border-slate-850 opacity-80'
                  } rounded-2xl relative group`}
                >
                  {/* Top Summary Header */}
                  <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl border border-sky-105 dark:border-sky-900/30 bg-sky-50 dark:bg-sky-955/40 flex items-center justify-center shrink-0">
                        <ClipboardList className="w-4.5 h-4.5 text-sky-600 dark:text-sky-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-850 dark:text-slate-100 leading-tight">
                            {notif.title}
                          </span>
                          {!notif.is_read && (
                            <span className="w-1.5 h-1.5 bg-sky-500 rounded-full shrink-0" />
                          )}
                        </div>
                        <span className="text-[9px] px-2 py-0.5 bg-sky-50 dark:bg-[#0ea5e9]/10 border border-sky-150 dark:border-[#0ea5e9]/20 rounded-full text-sky-600 dark:text-sky-405 uppercase font-extrabold mt-1 inline-block">
                          Roster Briefing
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!notif.is_read && (
                        <button
                          onClick={() => markReadMutation.mutate(notif.id)}
                          className="p-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-[10px] text-sky-600 dark:text-sky-500 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Mark Read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteConfirmId(notif.id)}
                        className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 dark:bg-slate-900 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Delete Notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Summary Grid details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                    <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-950/20 p-2 rounded-xl border border-slate-150 dark:border-slate-850">
                      <Users className="w-4 h-4 text-indigo-550 dark:text-indigo-400 shrink-0" />
                      <div>
                        <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase">Client</p>
                        <p className="font-bold text-slate-705 dark:text-slate-300">{details['Client'] || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-955/20 p-2 rounded-xl border border-slate-150 dark:border-slate-855">
                      <Tag className="w-4 h-4 text-pink-500 shrink-0" />
                      <div>
                        <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase">Event Type</p>
                        <p className="font-bold text-slate-705 dark:text-slate-300">{details['Event Type'] || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-950/20 p-2 rounded-xl border border-slate-150 dark:border-slate-850">
                      <Calendar className="w-4 h-4 text-amber-550 dark:text-amber-405 shrink-0" />
                      <div>
                        <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase">Event Date</p>
                        <p className="font-bold text-slate-705 dark:text-slate-300">{details['Date'] || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-950/20 p-2 rounded-xl border border-slate-150 dark:border-slate-850">
                      <MapPin className="w-4 h-4 text-sky-505 shrink-0" />
                      <div>
                        <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase">Venue</p>
                        <p className="font-bold text-slate-705 dark:text-slate-300 truncate max-w-[170px]" title={details['Venue']}>
                          {details['Venue'] || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-950/20 p-2 rounded-xl border border-slate-150 dark:border-slate-850">
                      <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase">Budget</p>
                        <p className="font-bold text-slate-705 dark:text-slate-300">{details['Budget'] || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-950/20 p-2 rounded-xl border border-slate-150 dark:border-slate-850">
                      <Users className="w-4 h-4 text-teal-555 shrink-0" />
                      <div>
                        <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase">Guests</p>
                        <p className="font-bold text-slate-705 dark:text-slate-300">{details['Guest Count'] || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Resource details */}
                  <div className="flex flex-col gap-2 border-t border-slate-150 dark:border-slate-850 pt-3 text-[11px]">
                    <div>
                      <span className="font-bold text-[9px] text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-1">
                        Assigned Vendor Partners:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {details['Assigned Vendors'] && details['Assigned Vendors'] !== 'None' ? (
                          details['Assigned Vendors'].split(', ').map((v, idx) => (
                            <span key={idx} className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-655 dark:text-slate-300 font-semibold shadow-sm">
                              {v}
                            </span>
                          ))
                        ) : (
                          <span className="text-rose-500 dark:text-rose-405 font-bold italic">No vendor partners allocated yet.</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-1">
                      <span className="font-bold text-[9px] text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-1">
                        Assigned Internal Crew:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {details['Assigned Staff'] && details['Assigned Staff'] !== 'None' ? (
                          details['Assigned Staff'].split(', ').map((s, idx) => (
                            <span key={idx} className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-655 dark:text-slate-300 font-semibold shadow-sm">
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-rose-500 dark:text-rose-405 font-bold italic">No internal staff allocated yet.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Operational Status */}
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-850/60 mt-1">
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase font-sans">Operational Status</span>
                    <span className={`px-3 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                      details['Current Status'] === 'Assigned' 
                        ? 'bg-emerald-50 border border-emerald-250 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30' 
                        : 'bg-amber-50 border border-amber-250 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/30'
                    }`}>
                      {details['Current Status'] || 'Pending'}
                    </span>
                  </div>
                </div>
              );
            }

            // Otherwise, render regular notification card
            return (
              <div
                key={notif.id}
                className={`glass-card p-4 flex items-start justify-between gap-4 transition-all border bg-white dark:bg-[#111C30]/20 dark:hover:bg-[#111C30]/30 relative group ${
                  !notif.is_read 
                    ? 'border-sky-305 shadow-sm dark:border-sky-900/40' 
                    : 'border-slate-200 dark:border-slate-850 opacity-80'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${getCategoryColor(notif.type)}`}>
                    {getIcon(notif.type)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-105 leading-tight">{notif.title}</span>
                      <span className="text-[8px] px-2 py-0.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-full text-slate-605 dark:text-slate-400 uppercase font-extrabold tracking-wide">
                        {getTabCategory(notif.type, notif.title)}
                      </span>
                      {!notif.is_read && (
                        <span className="w-1.5 h-1.5 bg-sky-500 rounded-full shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-305 leading-relaxed mt-1.5 max-w-2xl font-semibold">
                      {notif.message}
                    </p>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-2 font-medium">
                      {new Date(notif.created_at).toLocaleString('en-GB')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!notif.is_read && (
                    <button
                      onClick={() => markReadMutation.mutate(notif.id)}
                      className="p-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-[10px] text-sky-600 dark:text-sky-505 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Mark Read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteConfirmId(notif.id)}
                    className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-450 hover:text-rose-600 dark:bg-slate-900 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 border border-slate-205 dark:border-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Delete Notification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Single Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-modal-zoom">
            <h3 className="font-bold text-base text-slate-850 dark:text-slate-100 mb-2">Delete this notification?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Are you sure you want to delete this notification?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-350 rounded-xl text-xs transition-colors cursor-pointer border border-slate-200 dark:border-slate-750 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteMutation.mutate(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {deleteAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-modal-zoom">
            <h3 className="font-bold text-base text-slate-850 dark:text-slate-100 mb-2">Delete all notifications?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Are you sure you want to delete all notifications? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteAllConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-350 rounded-xl text-xs transition-colors cursor-pointer border border-slate-200 dark:border-slate-750 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteAllMutation.mutate();
                  setDeleteAllConfirm(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
