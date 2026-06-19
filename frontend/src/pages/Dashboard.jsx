import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useUIStore } from '../store/uiStore';
import { useQuery } from '@tanstack/react-query';
import { motion, animate } from 'framer-motion';
import {
  Calendar,
  AlertTriangle,
  CreditCard,
  Users,
  Briefcase,
  Layers,
  Clock,
  TrendingUp,
  Loader,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

const AnimatedCounter = ({ value, duration = 0.8 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const controls = animate(0, value || 0, {
      duration: duration,
      ease: "easeOut",
      onUpdate: (latest) => {
        if (isMounted) setCount(Math.floor(latest));
      }
    });
    return () => {
      isMounted = false;
      controls.stop();
    };
  }, [value, duration]);

  return <span>{count}</span>;
};

const Dashboard = () => {
  const { user } = useAuth();
  const { theme } = useUIStore();
  const isDark = theme === 'dark';

  // Fetch KPI Stats
  const { data: kpi = {
    totalEvents: 0,
    activeEvents: 0,
    totalVendors: 0,
    totalStaff: 0,
    pendingAssignments: 0,
    conflictAlerts: 0,
    paymentsPending: 0
  }, isLoading: kpiLoading } = useQuery({
    queryKey: ['dashboardKpi'],
    queryFn: async () => {
      const res = await axios.get('/dashboard/kpi');
      return res.data;
    },
    refetchInterval: 20000,
  });

  // Fetch Charts Data
  const { data: charts = {
    monthlyEvents: [],
    vendorUtilization: [],
    staffUtilization: []
  }, isLoading: chartsLoading } = useQuery({
    queryKey: ['dashboardCharts'],
    queryFn: async () => {
      const res = await axios.get('/dashboard/charts');
      return res.data;
    },
    refetchInterval: 20000,
  });

  // Fetch Recent Activities
  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['dashboardActivities'],
    queryFn: async () => {
      const res = await axios.get('/dashboard/activities');
      return res.data;
    },
    refetchInterval: 20000,
  });

  // Stat Card Configs
  const statCards = [
    {
      title: 'Total Events',
      value: kpi.totalEvents,
      subtitle: `${kpi.activeEvents} Active Events`,
      icon: Calendar,
      color: 'from-sky-500/10 to-sky-500/5 text-sky-600 border-sky-200/60 dark:from-sky-500/20 dark:to-sky-500/10 dark:text-sky-400 dark:border-sky-500/20',
      glow: 'glow-primary'
    },
    {
      title: 'Total Vendors',
      value: kpi.totalVendors,
      subtitle: 'Partner Companies',
      icon: Briefcase,
      color: 'from-indigo-500/10 to-indigo-500/5 text-indigo-600 border-indigo-200/60 dark:from-indigo-500/20 dark:to-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
      glow: 'glow-accent'
    },
    {
      title: 'Active Staff',
      value: kpi.totalStaff,
      subtitle: 'Rostered Crew',
      icon: Users,
      color: 'from-emerald-500/10 to-emerald-500/5 text-emerald-600 border-emerald-200/60 dark:from-emerald-500/20 dark:to-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
      glow: 'glow-primary'
    },
    {
      title: 'Conflict Alerts',
      value: kpi.conflictAlerts,
      subtitle: 'Requires Resolution',
      icon: AlertTriangle,
      color: kpi.conflictAlerts > 0 
        ? 'from-rose-500/10 to-rose-500/5 text-rose-600 border-rose-300 dark:from-rose-500/20 dark:to-rose-500/10 dark:text-rose-450 dark:border-rose-500/30' 
        : 'from-slate-500/10 to-slate-600/5 text-slate-500 border-slate-200 dark:from-slate-500/20 dark:to-slate-600/10 dark:text-slate-400 dark:border-slate-800',
      glow: kpi.conflictAlerts > 0 ? 'shadow-rose-950/20' : ''
    },
    {
      title: 'Pending Staffing',
      value: kpi.pendingAssignments,
      subtitle: 'Awaiting Crewing',
      icon: Layers,
      color: 'from-amber-500/10 to-amber-500/5 text-amber-600 border-amber-200/60 dark:from-amber-500/20 dark:to-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
      glow: 'glow-accent'
    },
    {
      title: 'Payments Pending',
      value: kpi.paymentsPending,
      subtitle: 'Collections & Dues',
      icon: CreditCard,
      color: 'from-violet-500/10 to-violet-500/5 text-violet-600 border-violet-200/60 dark:from-violet-500/20 dark:to-violet-500/10 dark:text-violet-400 dark:border-violet-500/20',
      glow: ''
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 pr-2"
    >
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#111C30]/40 border border-slate-250/70 dark:border-slate-850 p-6 rounded-2xl shadow-sm dark:shadow-premium relative overflow-hidden transition-all duration-200">
        <div className="z-10">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Welcome back, {user?.name}!
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Here is the latest planning health status for SLV Events assignments.</p>
        </div>
        <div className="text-xs text-slate-650 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl flex items-center gap-2 shadow-inner transition-colors">
          <Clock className="w-4 h-4 text-sky-500" />
          <span>Local Time: {new Date().toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.04 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className={`glass-card p-5 flex flex-col justify-between relative overflow-hidden bg-gradient-to-tr ${c.color} ${c.glow} cursor-default`}
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{c.title}</span>
                <Icon className="w-4.5 h-4.5 shrink-0 opacity-70" />
              </div>
              <div className="mt-4">
                <h4 className="text-2xl font-bold font-sans tracking-tight text-slate-900 dark:text-slate-100 min-h-[32px] flex items-center">
                  {kpiLoading ? (
                    <Loader className="w-5 h-5 animate-spin-loader text-sky-500" />
                  ) : (
                    <AnimatedCounter value={c.value} />
                  )}
                </h4>
                <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-1 font-semibold">{c.subtitle}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Line Chart */}
        <div className="lg:col-span-8 glass-card p-6 bg-white dark:bg-[#111C30]/40">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Monthly Bookings Trend</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Total events managed month-by-month in {new Date().getFullYear()}</p>
            </div>
            <TrendingUp className="w-4 h-4 text-sky-500" />
          </div>
          <div className="h-72 w-full text-xs">
            {chartsLoading ? (
              <div className="h-full w-full flex items-center justify-center">
                <Loader className="w-8 h-8 animate-spin-loader text-sky-500" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.monthlyEvents} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                  <XAxis dataKey="name" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={10} />
                  <YAxis stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={10} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                      borderColor: isDark ? '#1e293b' : '#e2e8f0', 
                      borderRadius: '12px',
                      color: isDark ? '#f8fafc' : '#0f172a'
                    }}
                    labelStyle={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '11px', fontWeight: '600' }}
                    itemStyle={{ color: '#0ea5e9', fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="events" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorEvents)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Column: Resource Utilization Rates */}
        <div className="lg:col-span-4 glass-card p-6 flex flex-col justify-between bg-white dark:bg-[#111C30]/40">
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Resource Utilization</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Percentage of assigned vendors & staff by categories</p>
          </div>

          <div className="h-64 w-full mt-4 text-xs">
            {chartsLoading ? (
              <div className="h-full w-full flex items-center justify-center">
                <Loader className="w-8 h-8 animate-spin-loader text-indigo-500" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.vendorUtilization} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} horizontal={false} />
                  <XAxis type="number" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={9} domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={9} width={65} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                      borderColor: isDark ? '#1e293b' : '#e2e8f0', 
                      borderRadius: '12px',
                      color: isDark ? '#f8fafc' : '#0f172a'
                    }}
                    itemStyle={{ fontSize: '10px' }}
                  />
                  <Bar dataKey="utilizationRate" name="Utilization %" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="text-[9px] text-slate-450 dark:text-slate-400 text-center border-t border-slate-150 dark:border-slate-850 pt-3 mt-2">
            Active/Assigned rates calculate upcoming conflict reservations.
          </div>
        </div>
      </div>

      {/* Activity Logs & Brief Feed */}
      <div className="glass-card p-6 bg-white dark:bg-[#111C30]/40">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-500" />
          <span>Recent Activity Logs</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Details</th>
                <th className="text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {activitiesLoading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <Loader className="w-6 h-6 animate-spin-loader text-sky-500 mx-auto" />
                  </td>
                </tr>
              ) : activities.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-450 dark:text-slate-500">No activity logged yet</td>
                </tr>
              ) : (
                activities.map(log => (
                  <tr key={log.id}>
                    <td className="font-bold text-slate-800 dark:text-slate-350">{log.user_name}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide ${
                        log.action.includes('CREATE') ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/35' :
                        log.action.includes('DELETE') ? 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-955/40 dark:text-rose-455 dark:border-rose-900/35' :
                        'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700/50'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="text-slate-700 dark:text-slate-300 leading-normal max-w-sm truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="text-right text-slate-450 dark:text-slate-400">
                      {new Date(log.timestamp).toLocaleDateString('en-GB')} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
