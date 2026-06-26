import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUIStore } from '../store/uiStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import Chatbot from './Chatbot';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  Briefcase,
  Users,
  ClipboardList,
  CalendarDays,
  AlertTriangle,
  CreditCard,
  Boxes,
  FileBarChart,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Database,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout, isDemo } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  // Zustand stores UI state
  const { 
    theme, 
    toggleTheme, 
    sidebarCollapsed, 
    toggleSidebar, 
    toasts, 
    removeToast 
  } = useUIStore();

  // Prefetch lists globally once layout is mounted
  useEffect(() => {
    if (!user) return;
    
    // Prefetch Dashboard KPIs
    queryClient.prefetchQuery({
      queryKey: ['dashboardKpi'],
      queryFn: async () => {
        const res = await axios.get('/dashboard/kpi');
        return res.data;
      }
    });

    // Prefetch Dashboard Charts
    queryClient.prefetchQuery({
      queryKey: ['dashboardCharts'],
      queryFn: async () => {
        const res = await axios.get('/dashboard/charts');
        return res.data;
      }
    });

    // Prefetch Dashboard Activities
    queryClient.prefetchQuery({
      queryKey: ['dashboardActivities'],
      queryFn: async () => {
        const res = await axios.get('/dashboard/activities');
        return res.data;
      }
    });

    // Prefetch Events listing (page 1)
    queryClient.prefetchQuery({
      queryKey: ['events', { search: '', status: 'all', sort: 'date_asc', page: 1 }],
      queryFn: async () => {
        const res = await axios.get('/events', {
          params: { search: '', status: 'all', sort: 'date_asc', page: 1, limit: 9 }
        });
        return res.data;
      }
    });

    // Prefetch Vendors listing (page 1)
    queryClient.prefetchQuery({
      queryKey: ['vendors', { search: '', category: 'all', page: 1 }],
      queryFn: async () => {
        const res = await axios.get('/vendors', {
          params: { search: '', category: 'all', page: 1, limit: 9 }
        });
        return res.data;
      }
    });

    // Prefetch Staff listing (page 1)
    queryClient.prefetchQuery({
      queryKey: ['staff', { search: '', role: 'all', page: 1 }],
      queryFn: async () => {
        const res = await axios.get('/staff', {
          params: { search: '', role: 'all', page: 1, limit: 9 }
        });
        return res.data;
      }
    });

    // Prefetch Payments listing (page 1)
    queryClient.prefetchQuery({
      queryKey: ['payments', { search: '', type: 'all', page: 1 }],
      queryFn: async () => {
        const res = await axios.get('/payments', {
          params: { search: '', type: 'all', page: 1, limit: 10 }
        });
        return res.data;
      }
    });

    // Prefetch all events list (dropdown & calendar)
    queryClient.prefetchQuery({
      queryKey: ['events-all'],
      queryFn: async () => {
        const res = await axios.get('/events');
        return res.data;
      }
    });

    // Prefetch all assignments (calendar)
    queryClient.prefetchQuery({
      queryKey: ['assignments-all'],
      queryFn: async () => {
        const res = await axios.get('/assignments');
        return res.data || [];
      }
    });

    // Prefetch all vendors (calendar)
    queryClient.prefetchQuery({
      queryKey: ['vendors-all'],
      queryFn: async () => {
        const res = await axios.get('/vendors');
        return res.data;
      }
    });

    // Prefetch all staff (calendar)
    queryClient.prefetchQuery({
      queryKey: ['staff-all'],
      queryFn: async () => {
        const res = await axios.get('/staff');
        return res.data;
      }
    });

    // Prefetch initial eventPlanner details (Event ID: 1)
    queryClient.prefetchQuery({
      queryKey: ['eventPlanner', '1'],
      queryFn: async () => {
        const [detailRes, recRes] = await Promise.all([
          axios.get('/events/1'),
          axios.get('/assignments/recommendations/1')
        ]);
        return {
          eventDetails: detailRes.data,
          recommendations: recRes.data.recommendations,
          briefs: {
            summary: recRes.data.summary,
            alerts: recRes.data.alerts
          }
        };
      }
    });
  }, [user, queryClient]);

  // Fetch recent notifications via TanStack Query
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await axios.get('/notifications');
      return res.data;
    },
    enabled: !!user,
    refetchInterval: 15000, // refresh every 15s in background
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const recentNotifications = notifications.slice(0, 5);

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id) => {
      await axios.put(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const handleMarkAsRead = (id) => {
    markAsReadMutation.mutate(id);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Define sidebar links with roles
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['Admin', 'Vendor Coordinator', 'Operations Lead', 'Finance Team'] },
    { name: 'Events', path: '/events', icon: Calendar, roles: ['Admin', 'Vendor Coordinator', 'Operations Lead'] },
    { name: 'Assignment Center', path: '/assignments', icon: ClipboardList, roles: ['Admin', 'Vendor Coordinator'] },
    { name: 'Vendors', path: '/vendors', icon: Briefcase, roles: ['Admin', 'Vendor Coordinator'] },
    { name: 'Staff', path: '/staff', icon: Users, roles: ['Admin', 'Operations Lead'] },
    { name: 'Availability Calendar', path: '/calendar', icon: CalendarDays, roles: ['Admin', 'Vendor Coordinator', 'Operations Lead'] },
    { name: 'Conflicts', path: '/conflicts', icon: AlertTriangle, roles: ['Admin', 'Vendor Coordinator'] },
    { name: 'Payments', path: '/payments', icon: CreditCard, roles: ['Admin', 'Finance Team'] },
    { name: 'Inventory', path: '/inventory', icon: Boxes, roles: ['Admin', 'Operations Lead'] },
    { name: 'Reports', path: '/reports', icon: FileBarChart, roles: ['Admin', 'Finance Team', 'Vendor Coordinator', 'Operations Lead'] },
    { name: 'Notifications', path: '/notifications', icon: Bell, roles: ['Admin', 'Vendor Coordinator', 'Operations Lead', 'Finance Team'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['Admin'] },
  ];

  // Filter menu items by user role
  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user?.role));

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0B1220] dark:text-slate-100 theme-transition">
      
      {/* Toast Notifications Stack */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none w-full max-w-sm">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className={`pointer-events-auto p-4 rounded-xl shadow-lg border flex items-start gap-3 backdrop-blur-md ${
                toast.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/90 dark:border-rose-900 dark:text-rose-200'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-900 dark:text-emerald-200'
              }`}
            >
              {toast.type === 'error' ? (
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-550" />
              ) : (
                <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500 animate-bounce" />
              )}
              <div className="flex-1 text-xs font-medium">{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Sidebar - Desktop */}
      <motion.aside 
        animate={{ width: sidebarCollapsed ? 80 : 256 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="hidden md:flex flex-col h-screen sticky top-0 bg-white dark:bg-[#111F35] border-r border-slate-200/80 dark:border-white/[0.06] p-4 shrink-0 relative z-10 theme-transition"
      >
        {/* Collapse Button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/[0.06] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 shadow-md z-50 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Brand Header */}
        <div className={`flex items-center gap-3 px-2 py-4 mb-6 ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md select-none shrink-0">
            SLV
          </div>
          <AnimatePresence mode="wait">
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h1 className="font-bold text-base leading-tight tracking-tight text-slate-900 dark:text-slate-100">SLV Events</h1>
                <span className="text-[10px] text-slate-450 dark:text-slate-400 font-semibold tracking-wider uppercase font-sans">Planner Admin</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1 relative z-0">
          {filteredMenuItems.map(item => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                title={sidebarCollapsed ? item.name : undefined}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <div className="shrink-0">
                  <Icon className="w-4.5 h-4.5 transition-colors duration-200" />
                </div>

                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-xs whitespace-nowrap"
                  >
                    {item.name}
                  </motion.span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Info */}
        <div className="border-t border-slate-150 dark:border-slate-850 pt-4 mt-auto">
          <div className={`flex items-center justify-between px-2 py-2.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 ${sidebarCollapsed ? 'flex-col gap-2' : ''}`}>
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-semibold text-sky-600 dark:text-sky-400 capitalize shrink-0">
                {user?.name?.charAt(0)}
              </div>
              <AnimatePresence mode="wait">
                {!sidebarCollapsed && (
                  <motion.div 
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    <p className="text-[11px] font-semibold truncate text-slate-800 dark:text-slate-200 leading-tight">{user?.name}</p>
                    <p className="text-[9px] text-slate-455 dark:text-slate-400 truncate capitalize">{user?.role}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Sidebar - Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/50 backdrop-blur-sm">
          <div className="w-64 bg-white dark:bg-[#111F35] border-r border-slate-200 dark:border-white/[0.06] p-4 flex flex-col h-full animate-fade-in theme-transition">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-white">
                  SLV
                </div>
                <h1 className="font-bold text-base text-slate-900 dark:text-slate-100">SLV Events</h1>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto">
              {filteredMenuItems.map(item => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                  >
                    <Icon className="w-5 h-5 transition-colors duration-200" />
                    <span className="text-xs">{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-auto">
              <div className="flex items-center gap-3 mb-2 px-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-semibold text-sky-500 dark:text-sky-400 uppercase">
                  {user?.name?.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">{user?.name}</p>
                  <p className="text-[10px] text-slate-450 capitalize dark:text-slate-400">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Panel Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
        {/* Header Navigation */}
        <header className="flex items-center justify-between h-16 px-4 md:px-6 bg-white/85 dark:bg-[#0B1220]/75 backdrop-blur-md border-b border-slate-200/60 dark:border-white/[0.04] shrink-0 sticky top-0 z-30 theme-transition">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg md:hidden hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="hidden md:block font-bold text-base text-slate-800 dark:text-slate-100 font-sans tracking-wide">
              {menuItems.find(i => i.path === location.pathname)?.name || 'Event Details'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Demo Mode Badge */}
            {isDemo && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-yellow-950/80 border border-amber-200 dark:border-yellow-750 text-amber-800 dark:text-yellow-300 rounded-full text-[10px] font-semibold animate-pulse">
                <Database className="w-3.5 h-3.5" />
                <span>Demo Database</span>
              </div>
            )}

            {/* Light/Dark Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-505 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 theme-transition cursor-pointer"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
            </button>

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative cursor-pointer"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-455 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </button>

              {showNotificationsDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white/95 dark:bg-[#111F35]/95 backdrop-blur-xl border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-2xl z-50 p-2 overflow-hidden animate-modal-zoom">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-150 dark:border-slate-800 mb-1">
                    <span className="font-bold text-xs text-slate-450 dark:text-slate-400 uppercase tracking-wider">Alerts & Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[9px] px-2 py-0.5 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-full font-bold">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-850 max-h-64 overflow-y-auto">
                    {recentNotifications.length === 0 ? (
                      <div className="px-3 py-6 text-center text-xs text-slate-400">No recent notifications</div>
                    ) : (
                      recentNotifications.map(notif => (
                        <div
                          key={notif.id}
                          className={`p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-850 transition-all flex flex-col gap-1 cursor-pointer ${
                            !notif.is_read ? 'bg-slate-50/50 dark:bg-slate-850/45 font-medium' : 'text-slate-400 dark:text-slate-500'
                          }`}
                          onClick={() => handleMarkAsRead(notif.id)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{notif.title}</span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500">
                              {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="leading-snug text-[11px] text-slate-650 dark:text-slate-400">{notif.message}</p>
                          {!notif.is_read && (
                            <span className="text-[9px] text-sky-500 mt-1 self-end hover:underline">Mark read</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800 p-2 text-center">
                    <Link
                      to="/notifications"
                      onClick={() => setShowNotificationsDropdown(false)}
                      className="text-xs text-sky-500 hover:text-sky-600 hover:underline font-medium"
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Profile Info */}
            <div className="flex items-center gap-2.5 border-l border-slate-200 dark:border-slate-800 pl-4">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{user?.name}</p>
                <p className="text-[10px] text-slate-450 dark:text-slate-400 capitalize">{user?.role}</p>
              </div>
              <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md capitalize select-none">
                {user?.name?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Global Demo Warning Banner */}
        {isDemo && (
          <div className="bg-amber-50 dark:bg-yellow-950/30 border-b border-amber-100 dark:border-yellow-900/30 px-6 py-2 flex items-center justify-between text-amber-800 dark:text-yellow-250 text-xs">
            <p className="flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-yellow-500 shrink-0" />
              <span>
                <strong>Using Demo Fallback Database:</strong> Connection to MySQL failed. Any edits are persisted inside local JSON cache.
              </span>
            </p>
            <span className="hidden sm:inline text-[9px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-md font-semibold">
              demo_db.json
            </span>
          </div>
        )}

        {/* Main Content Pane */}
        <main className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col bg-slate-50 dark:bg-[#0B1220] theme-transition">
          <div 
            ref={containerRef}
            className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-0.5"
          >
            {children}
          </div>
        </main>
      </div>
      <Chatbot />
    </div>
  );
};

export default Layout;
