import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  AlertTriangle,
  CreditCard,
  Users,
  Briefcase,
  Layers,
  Clock,
  TrendingUp,
  Database
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
  Legend,
  CartesianGrid
} from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const [kpi, setKpi] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalVendors: 0,
    totalStaff: 0,
    pendingAssignments: 0,
    conflictAlerts: 0,
    paymentsPending: 0
  });
  const [charts, setCharts] = useState({
    monthlyEvents: [],
    vendorUtilization: [],
    staffUtilization: []
  });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [kpiRes, chartsRes, actRes] = await Promise.all([
        axios.get('/dashboard/kpi'),
        axios.get('/dashboard/charts'),
        axios.get('/dashboard/activities')
      ]);
      setKpi(kpiRes.data);
      setCharts(chartsRes.data);
      setActivities(actRes.data);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 20000); // refresh every 20s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col gap-6 animate-pulse p-4">
        {/* KPI Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-28 bg-slate-900 border border-slate-800 rounded-2xl" />
          ))}
        </div>
        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-900 border border-slate-800 rounded-2xl" />
          <div className="h-80 bg-slate-900 border border-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Stat Card Configs
  const statCards = [
    {
      title: 'Total Events',
      value: kpi.totalEvents,
      subtitle: `${kpi.activeEvents} Active Events`,
      icon: Calendar,
      color: 'from-blue-500/20 to-cyan-500/10 text-cyan-400 border-cyan-500/20',
      glow: 'glow-primary'
    },
    {
      title: 'Total Vendors',
      value: kpi.totalVendors,
      subtitle: 'Partner Companies',
      icon: Briefcase,
      color: 'from-indigo-500/20 to-purple-500/10 text-indigo-400 border-indigo-500/20',
      glow: 'glow-accent'
    },
    {
      title: 'Active Staff',
      value: kpi.totalStaff,
      subtitle: 'Rostered Crew',
      icon: Users,
      color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/20',
      glow: 'glow-primary'
    },
    {
      title: 'Conflict Alerts',
      value: kpi.conflictAlerts,
      subtitle: 'Requires Resolution',
      icon: AlertTriangle,
      color: kpi.conflictAlerts > 0 
        ? 'from-rose-500/20 to-pink-500/10 text-rose-400 border-rose-500/30' 
        : 'from-slate-500/20 to-slate-600/10 text-slate-400 border-slate-800',
      glow: kpi.conflictAlerts > 0 ? 'shadow-rose-950/20' : ''
    },
    {
      title: 'Pending Staffing',
      value: kpi.pendingAssignments,
      subtitle: 'Awaiting Crewing',
      icon: Layers,
      color: 'from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/20',
      glow: 'glow-accent'
    },
    {
      title: 'Payments Pending',
      value: kpi.paymentsPending,
      subtitle: 'Collections & Dues',
      icon: CreditCard,
      color: 'from-violet-500/20 to-fuchsia-500/10 text-violet-400 border-violet-500/20',
      glow: ''
    }
  ];

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 animate-fade-in pr-2">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-3xl shadow-premium relative overflow-hidden">
        <div className="z-10">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Welcome back, {user?.name}!
          </h2>
          <p className="text-xs text-slate-400 mt-1">Here is the latest planning health status for SLV Events assignments.</p>
        </div>
        <div className="text-xs text-slate-400 bg-slate-950/80 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-2 shadow-inner">
          <Clock className="w-4 h-4 text-primary-500" />
          <span>Local Time: {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <div
              key={idx}
              className={`glass-card p-5 flex flex-col justify-between relative overflow-hidden bg-gradient-to-tr ${c.color} ${c.glow} hover:scale-[1.02] active:scale-[0.98] duration-200 cursor-default`}
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{c.title}</span>
                <Icon className="w-5 h-5 shrink-0 opacity-70" />
              </div>
              <div className="mt-4">
                <h4 className="text-2xl font-bold font-sans tracking-tight">{c.value}</h4>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">{c.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Line Chart */}
        <div className="lg:col-span-8 glass-card p-6 bg-slate-905">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-sm text-slate-200">Monthly Bookings Trend</h3>
              <p className="text-[10px] text-slate-400">Total events managed month-by-month in {new Date().getFullYear()}</p>
            </div>
            <TrendingUp className="w-4 h-4 text-primary-500" />
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.monthlyEvents} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600' }}
                  itemStyle={{ color: '#0ea5e9', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="events" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorEvents)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Resource Utilization Rates */}
        <div className="lg:col-span-4 glass-card p-6 flex flex-col justify-between bg-slate-905">
          <div>
            <h3 className="font-semibold text-sm text-slate-200">Resource Utilization</h3>
            <p className="text-[10px] text-slate-400">Percentage of assigned vendors & staff by categories</p>
          </div>

          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.vendorUtilization} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={9} domain={[0, 100]} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={9} width={65} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '10px' }}
                />
                <Bar dataKey="utilizationRate" name="Utilization %" fill="#818cf8" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[9px] text-slate-400 text-center border-t border-slate-800/80 pt-3 mt-2">
            Active/Assigned rates calculate upcoming conflict reservations.
          </div>
        </div>
      </div>

      {/* Activity Logs & Brief Feed */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-sm text-slate-200 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          <span>Recent Activity Logs</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Details</th>
                <th className="py-2.5 px-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-xs">
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 px-3 text-center text-slate-500">No activity logged yet</td>
                </tr>
              ) : (
                activities.map(log => (
                  <tr key={log.id} className="hover:bg-slate-900/35 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-300">{log.user_name}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-semibold tracking-wide ${
                        log.action.includes('CREATE') ? 'bg-emerald-950 text-emerald-400' :
                        log.action.includes('DELETE') ? 'bg-red-950 text-red-400' :
                        'bg-slate-800 text-slate-350'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 leading-normal max-w-sm truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-450">
                      {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
