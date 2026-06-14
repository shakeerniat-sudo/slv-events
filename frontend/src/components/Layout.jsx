import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  LayoutDashboard,
  Calendar,
  Briefcase,
  Users,
  UserCheck,
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
  Database
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout, isDemo } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Fetch recent notifications
  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/notifications');
      setNotifications(res.data.slice(0, 5)); // show top 5
      setUnreadCount(res.data.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Failed to fetch notifications in layout:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000); // refresh every 15s
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAsRead = async (id) => {
    try {
      await axios.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Define sidebar links with roles
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['Admin', 'Vendor Coordinator', 'Operations Lead', 'Finance Team'] },
    { name: 'Events', path: '/events', icon: Calendar, roles: ['Admin', 'Vendor Coordinator', 'Operations Lead', 'Finance Team'] },
    { name: 'Assignment Center', path: '/assignments', icon: ClipboardList, roles: ['Admin', 'Vendor Coordinator'] },
    { name: 'Vendors', path: '/vendors', icon: Briefcase, roles: ['Admin', 'Vendor Coordinator'] },
    { name: 'Staff', path: '/staff', icon: Users, roles: ['Admin', 'Operations Lead'] },
    { name: 'Availability Calendar', path: '/calendar', icon: CalendarDays, roles: ['Admin', 'Vendor Coordinator', 'Operations Lead'] },
    { name: 'Conflicts', path: '/conflicts', icon: AlertTriangle, roles: ['Admin', 'Vendor Coordinator'] },
    { name: 'Payments', path: '/payments', icon: CreditCard, roles: ['Admin', 'Finance Team'] },
    { name: 'Inventory', path: '/inventory', icon: Boxes, roles: ['Admin', 'Operations Lead'] },
    { name: 'Reports', path: '/reports', icon: FileBarChart, roles: ['Admin', 'Finance Team'] },
    { name: 'Notifications', path: '/notifications', icon: Bell, roles: ['Admin', 'Vendor Coordinator', 'Operations Lead', 'Finance Team'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['Admin'] },
  ];

  // Filter menu items by user role
  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user?.role));

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-4 shrink-0">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-premium">
            SLV
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">SLV Events</h1>
            <span className="text-xs text-slate-400">Assignment Center</span>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 space-y-1">
          {filteredMenuItems.map(item => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-primary-600 text-white font-medium shadow-md shadow-primary-900/35'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform group-hover:scale-105 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-100'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="border-t border-slate-850 pt-4 mt-auto">
          <div className="flex items-center justify-between px-2 py-3 bg-slate-950/40 rounded-xl border border-slate-800 mb-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-semibold text-primary-500 capitalize">
                {user?.name?.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-accent-coral hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar - Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-sm">
          <div className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col h-full animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center font-bold text-white">
                  SLV
                </div>
                <h1 className="font-bold text-base">SLV Events</h1>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1">
              {filteredMenuItems.map(item => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                      isActive
                        ? 'bg-primary-600 text-white font-medium shadow-md shadow-primary-900/35'
                        : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-slate-800 pt-4 mt-auto">
              <div className="flex items-center gap-3 mb-2 px-2">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-semibold text-primary-400 uppercase">
                  {user?.name?.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-white rounded-xl text-xs transition-colors"
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
        <header className="flex items-center justify-between h-16 px-4 md:px-6 bg-slate-900/40 border-b border-slate-900 shrink-0 relative z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg md:hidden hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="hidden md:block font-semibold text-lg text-slate-100 font-sans tracking-wide">
              {menuItems.find(i => i.path === location.pathname)?.name || 'Event Details'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Demo Mode Badge */}
            {isDemo && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-950/80 border border-yellow-700/60 rounded-full text-yellow-300 text-xs font-medium animate-pulse">
                <Database className="w-3.5 h-3.5" />
                <span>Demo Mode</span>
              </div>
            )}

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-accent-coral border-2 border-slate-900 rounded-full" />
                )}
              </button>

              {showNotificationsDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 p-2 overflow-hidden animate-slide-up">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 mb-1">
                    <span className="font-semibold text-xs text-slate-400 uppercase tracking-wider">Alerts & Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 bg-primary-900/60 text-primary-400 rounded-full font-medium">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-slate-850 max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-3 py-4 text-center text-xs text-slate-500">No recent notifications</div>
                    ) : (
                      notifications.map(notif => (
                        <div
                          key={notif.id}
                          className={`p-3 text-xs hover:bg-slate-850 transition-all flex flex-col gap-1 cursor-pointer ${
                            !notif.is_read ? 'bg-slate-850/45 font-medium' : 'text-slate-400'
                          }`}
                          onClick={() => handleMarkAsRead(notif.id)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200">{notif.title}</span>
                            <span className="text-[9px] text-slate-500">
                              {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="leading-snug">{notif.message}</p>
                          {!notif.is_read && (
                            <span className="text-[10px] text-primary-400 mt-1 self-end hover:underline">Mark read</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="border-t border-slate-800 p-2 text-center">
                    <Link
                      to="/notifications"
                      onClick={() => setShowNotificationsDropdown(false)}
                      className="text-xs text-primary-500 hover:text-primary-400 hover:underline"
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Profile Info */}
            <div className="flex items-center gap-2.5 border-l border-slate-800 pl-4">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold">{user?.name}</p>
                <p className="text-[10px] text-slate-400 capitalize">{user?.role}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-premium capitalize">
                {user?.name?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Global Demo Warning Banner */}
        {isDemo && (
          <div className="bg-yellow-950/35 border-b border-yellow-700/30 px-6 py-2 flex items-center justify-between text-yellow-250 text-xs">
            <p className="flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span>
                <strong>Using Demo Fallback Database:</strong> Connection to MySQL failed or variables were not set. Any edits are persisted inside local JSON cache.
              </span>
            </p>
            <span className="hidden sm:inline text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-md font-semibold">
              demo_db.json
            </span>
          </div>
        )}

        {/* Main Content Pane */}
        <main className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
