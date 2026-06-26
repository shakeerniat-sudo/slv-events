import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useUIStore } from '../store/uiStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, animate, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
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
  CheckCircle,
  ClipboardList,
  Boxes,
  ArrowUpRight,
  ShieldAlert,
  Award,
  ShieldCheck,
  X
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

const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 p-3 rounded-2xl shadow-xl text-xs font-semibold text-slate-805 dark:text-slate-200 animate-fade-in-up">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider font-bold">{label}</p>
        <div className="space-y-1">
          {payload.map((p, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.stroke || p.fill }} />
              <span>
                {p.name}: <span className="font-extrabold text-slate-900 dark:text-white">{formatter ? formatter(p.value) : p.value}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const { user } = useAuth();
  const { theme, addToast } = useUIStore();
  const queryClient = useQueryClient();
  const isDark = theme === 'dark';

  const isVendorCoordinator = user?.role === 'Vendor Coordinator';
  const isOperationsLead = user?.role === 'Operations Lead';
  const isFinanceTeam = user?.role === 'Finance Team';
  const isAdmin = user?.role === 'Admin';

  const [incidentForm, setIncidentForm] = useState({ eventId: '', type: 'Vendor Delay', details: '' });
  const [reportingIncident, setReportingIncident] = useState(false);

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [sentNotificationPreview, setSentNotificationPreview] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    status: 'Pending',
    coordinator_id: '',
    operations_lead_id: '',
    finance_team_id: ''
  });

  const [bookingHistorySearch, setBookingHistorySearch] = useState('');
  const [bookingHistoryStatus, setBookingHistoryStatus] = useState('all');

  // New query for assignments (Ops Lead & Admin)
  const { data: allAssignments = [] } = useQuery({
    queryKey: ['assignments-all-dashboard'],
    queryFn: async () => {
      const res = await axios.get('/assignments');
      return res.data || [];
    },
    enabled: !!user && (isOperationsLead || isAdmin)
  });

  // Report Incident Mutation
  const reportIncidentMutation = useMutation({
    mutationFn: async ({ eventId, type, details }) => {
      // 1. Fetch current event details
      const evRes = await axios.get(`/events/${eventId}`);
      const eventDetail = evRes.data;
      const currentLogs = eventDetail.ops_logs || [];
      const newLog = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: 'Incident',
        category: type,
        details: details,
        user: user.name
      };
      
      // 2. Update event with log
      await axios.put(`/events/${eventId}`, {
        name: eventDetail.name,
        status: eventDetail.status,
        ops_logs: [...currentLogs, newLog]
      });

      // 3. Create conflict warning notification
      await axios.post('/notifications', {
        title: `${type} reported`,
        message: `🚨 Incident at "${eventDetail.name}": ${details}`,
        type: 'Conflict Alert'
      });
    },
    onSuccess: () => {
      addToast('Incident logged and system notified!');
      setIncidentForm({ eventId: '', type: 'Vendor Delay', details: '' });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events-all'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardKpi'] });
    },
    onError: () => {
      addToast('Failed to report incident.', 'error');
    }
  });

  // Event status quick change mutation
  const eventStatusMutation = useMutation({
    mutationFn: async ({ eventId, name, status }) => {
      await axios.put(`/events/${eventId}`, {
        name,
        status
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events-all'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardKpi'] });
      addToast('Event milestone updated!');
    },
    onError: () => {
      addToast('Failed to update event milestone.', 'error');
    }
  });

  // Crew attendance status check-in mutation
  const staffStatusMutation = useMutation({
    mutationFn: async ({ assignmentId, status }) => {
      await axios.put(`/assignments/${assignmentId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments-all-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['staff-all'] });
      addToast('Crew check-in updated!');
    },
    onError: () => {
      addToast('Failed to update crew check-in.', 'error');
    }
  });

  // Process Booking Mutation (Admin Review & Confirmation dispatch)
  const processBookingMutation = useMutation({
    mutationFn: async ({ eventId, status }) => {
      await axios.put(`/events/${eventId}`, {
        status
      });

      // Insert confirmation notification
      await axios.post('/notifications', {
        title: 'Booking Confirmed',
        message: `🎉 Booking request "${selectedBooking?.name || 'Event'}" has been confirmed. Client notified.`,
        type: 'Assignment Confirmation'
      });
    },
    onSuccess: () => {
      addToast('Booking confirmed successfully!');
      
      const formattedDate = selectedBooking ? new Date(selectedBooking.event_date).toLocaleDateString('en-GB') : '';
      if (selectedBooking) {
        setSentNotificationPreview({
          clientName: selectedBooking.client_name,
          clientPhone: selectedBooking.client_phone,
          clientEmail: selectedBooking.client_email,
          type: 'Confirm',
          whatsappMessage: `Hello ${selectedBooking.client_name}\n\nYour event booking has been confirmed.\n\nBooking ID: SLV-EV-${selectedBooking.id}\nDate: ${formattedDate}\nVenue: ${selectedBooking.venue}\n\nThank you for choosing SLV Events.`,
          emailMessage: `Hello ${selectedBooking.client_name},\n\nYour booking has been confirmed.\n\nBooking ID: SLV-EV-${selectedBooking.id}\nEvent: ${selectedBooking.name}\nDate: ${formattedDate}\nVenue: ${selectedBooking.venue}\n\nOur team will contact you shortly.\n\nThank you,\nSLV Events`
        });
      }

      setSelectedBooking(null);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events-all'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardKpi'] });
    },
    onError: (err) => {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to confirm booking.', 'error');
    }
  });

  // Quick Reject Booking Mutation
  const rejectBookingMutation = useMutation({
    mutationFn: async ({ eventId, name, clientName, clientPhone, clientEmail, eventDate, venue }) => {
      await axios.put(`/events/${eventId}`, {
        name,
        status: 'Rejected'
      });
      return { eventId, clientName, clientPhone, clientEmail, eventName: name, eventDate, venue };
    },
    onSuccess: (data) => {
      addToast('Booking rejected. Notifications sent to client!');
      
      // Set preview state for visual outbox representation
      setSentNotificationPreview({
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail,
        type: 'Reject',
        whatsappMessage: `Hello ${data.clientName}\n\nYour booking request was not approved.\n\nPlease contact SLV Events for more information.`,
        emailMessage: `Hello ${data.clientName},\n\nUnfortunately your booking request has not been approved.\n\nPlease contact us for more information.\n\nThank you,\nSLV Events`
      });

      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events-all'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardKpi'] });
    },
    onError: (err) => {
      console.error(err);
      addToast('Failed to reject booking.', 'error');
    }
  });

  const handleConfirmBooking = (booking) => {
    setSelectedBooking(booking);
    processBookingMutation.mutate({
      eventId: booking.id,
      status: 'Confirmed'
    });
  };

  const handleQuickRejectBooking = (booking) => {
    if (window.confirm(`Are you sure you want to reject the booking request for "${booking.name}"?`)) {
      rejectBookingMutation.mutate({
        eventId: booking.id,
        name: booking.name,
        clientName: booking.client_name,
        clientPhone: booking.client_phone,
        clientEmail: booking.client_email,
        eventDate: booking.event_date,
        venue: booking.venue
      });
    }
  };

  // Fetch All Users (for Admin Booking Review Assignments)
  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users-list-dashboard'],
    queryFn: async () => {
      const res = await axios.get('/users');
      return res.data || [];
    },
    enabled: !!user && isAdmin
  });

  const vendorCoordinators = allUsers.filter(u => u.role === 'Vendor Coordinator');
  const operationsLeads = allUsers.filter(u => u.role === 'Operations Lead');
  const financeTeams = allUsers.filter(u => u.role === 'Finance Team');

  const handleReviewBooking = (booking) => {
    setSelectedBooking(booking);
    setReviewForm({
      status: 'Pending',
      coordinator_id: booking.coordinator_id || '',
      operations_lead_id: booking.operations_lead_id || '',
      finance_team_id: booking.finance_team_id || ''
    });
  };

  // ==========================================
  // Role-Aware Data Queries
  // ==========================================

  // 1. Fetch KPI Stats (Only for Admin/general counts)
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
    enabled: !!user,
    refetchInterval: 30000,
  });

  // 2. Fetch Charts Data
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
    enabled: !!user && (isAdmin || isVendorCoordinator || isOperationsLead),
    refetchInterval: 30000,
  });

  // 3. Fetch Recent Activities (Admin only)
  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['dashboardActivities'],
    queryFn: async () => {
      const res = await axios.get('/dashboard/activities');
      return res.data;
    },
    enabled: !!user && isAdmin,
    refetchInterval: 30000,
  });

  // 4. Fetch All Events (Admin, Ops, Coordinator)
  const { data: allEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events-all'],
    queryFn: async () => {
      const res = await axios.get('/events');
      return res.data || [];
    },
    enabled: !!user && (isAdmin || isVendorCoordinator || isOperationsLead || isFinanceTeam)
  });

  // 5. Fetch All Vendors (Admin, Coordinator)
  const { data: allVendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors-all'],
    queryFn: async () => {
      const res = await axios.get('/vendors');
      return res.data || [];
    },
    enabled: !!user && (isAdmin || isVendorCoordinator)
  });

  // 6. Fetch All Staff (Admin, Ops)
  const { data: allStaff = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff-all'],
    queryFn: async () => {
      const res = await axios.get('/staff');
      return res.data || [];
    },
    enabled: !!user && (isAdmin || isOperationsLead)
  });

  // 7. Fetch All Payments (Admin, Finance)
  const { data: allPayments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments-all-dashboard'],
    queryFn: async () => {
      const res = await axios.get('/payments');
      return res.data || [];
    },
    enabled: !!user && (isAdmin || isFinanceTeam)
  });

  // Mark payment as paid mutation for Finance Dashboard quick links
  const payMutation = useMutation({
    mutationFn: async (id) => {
      await axios.put(`/payments/${id}`, { status: 'Paid' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-all-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardKpi'] });
      addToast('Invoice marked as paid.');
    }
  });

  // Clear activity logs mutation (Admin only)
  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      await axios.delete('/dashboard/activities');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardActivities'] });
      addToast('Recent activity logs cleared.');
    },
    onError: (err) => {
      addToast(err.response?.data?.message || 'Failed to clear activity logs.', 'error');
    }
  });

  // ==========================================
  // Role-Specific Computations & Configuration
  // ==========================================

  let dashboardTitle = 'SLV Control Console';
  let dashboardSubtitle = 'Operations overview and planning diagnostics';
  let statCards = [];

  // --- ADMIN ROLE ---
  if (isAdmin) {
    dashboardTitle = 'Enterprise Control Center';
    dashboardSubtitle = 'Full-scale planning diagnostics and administrative operations';
    
    const confirmedCount = allEvents.filter(e => e.status?.toLowerCase() === 'confirmed').length;
    const rejectedCount = allEvents.filter(e => e.status?.toLowerCase() === 'rejected').length;
    const newCount = allEvents.filter(e => e.status?.toLowerCase() === 'new').length;
    
    const upcomingCount = allEvents.filter(e => 
      e.status?.toLowerCase() === 'confirmed' && 
      new Date(e.event_date) >= new Date()
    ).length;

    const revenueSum = allEvents
      .filter(e => e.status?.toLowerCase() === 'confirmed')
      .reduce((sum, e) => sum + parseFloat(e.budget || 0), 0);

    statCards = [
      { title: 'Total Bookings', value: allEvents.length, subtitle: 'Total request logs', icon: Calendar, gradient: 'from-[#0284C7] to-[#38BDF8]', glowClass: 'glow-blue', iconColor: 'text-sky-500', iconGlow: 'dark:bg-sky-500/10' },
      { title: 'New Bookings', value: newCount, subtitle: 'Pending action', icon: Clock, gradient: 'from-[#D97706] to-[#FBBF24]', glowClass: 'glow-orange', iconColor: 'text-amber-500', iconGlow: 'dark:bg-amber-500/10' },
      { title: 'Confirmed Events', value: confirmedCount, subtitle: 'Approved planning pipeline', icon: CheckCircle, gradient: 'from-[#059669] to-[#34D399]', glowClass: 'glow-green', iconColor: 'text-emerald-500', iconGlow: 'dark:bg-emerald-500/10' },
      { title: 'Rejected Events', value: rejectedCount, subtitle: 'Not approved bookings', icon: X, gradient: 'from-[#DC2626] to-[#F87171]', glowClass: 'glow-red', iconColor: 'text-rose-500', iconGlow: 'dark:bg-rose-500/10' },
      { title: 'Upcoming Events', value: upcomingCount, subtitle: 'Future confirmed dates', icon: Calendar, gradient: 'from-[#7C3AED] to-[#A78BFA]', glowClass: 'glow-purple', iconColor: 'text-violet-500', iconGlow: 'dark:bg-violet-500/10' },
      { title: 'Monthly Revenue', value: revenueSum, subtitle: 'Confirmed total contracts', icon: CreditCard, gradient: 'from-[#10B981] to-[#059669]', glowClass: 'glow-green', isMoney: true, iconColor: 'text-emerald-600', iconGlow: 'dark:bg-emerald-500/10' },
      { title: 'Team Assignments', value: allAssignments.length, subtitle: 'Active vendor/staff shifts', icon: Users, gradient: 'from-[#6366F1] to-[#818CF8]', glowClass: 'glow-indigo', iconColor: 'text-indigo-500', iconGlow: 'dark:bg-indigo-500/10' },
      { title: 'Recent Activities', value: activities.length, subtitle: 'Logged user actions', icon: ClipboardList, gradient: 'from-slate-500 to-slate-400', glowClass: 'glow-slate', iconColor: 'text-slate-550', iconGlow: 'dark:bg-slate-500/10' }
    ];
  }

  // --- VENDOR COORDINATOR ROLE ---
  if (isVendorCoordinator) {
    dashboardTitle = 'Vendor Relations Portal';
    dashboardSubtitle = 'Roster scheduling, outsource logistics, and vendor assignments';

    const coordinatorEvents = allEvents.filter(e => e.coordinator_id === user.id);
    const assignedEventsCount = coordinatorEvents.filter(e => ['Assigned', 'In Progress', 'Ready'].includes(e.status)).length;
    const availableVendors = allVendors.filter(v => v.availability_status === 'Available').length;
    const busyVendors = allVendors.filter(v => v.availability_status === 'Busy').length;
    const upcomingEventsCount = coordinatorEvents.filter(e => new Date(e.event_date) >= new Date()).length;

    statCards = [
      { title: 'Assigned Events', value: assignedEventsCount, subtitle: 'Logistics ongoing', icon: Calendar, gradient: 'from-[#0284C7] to-[#38BDF8]', glowClass: 'glow-blue', iconColor: 'text-sky-500', iconGlow: 'dark:bg-sky-500/10' },
      { title: 'Available Vendors', value: availableVendors, subtitle: 'Ready for placement', icon: Briefcase, gradient: 'from-[#059669] to-[#34D399]', glowClass: 'glow-green', iconColor: 'text-emerald-500', iconGlow: 'dark:bg-emerald-500/10' },
      { title: 'Busy Vendors', value: busyVendors, subtitle: 'Reserved or booked', icon: ShieldAlert, gradient: 'from-[#DC2626] to-[#F87171]', glowClass: 'glow-red', iconColor: 'text-rose-500', iconGlow: 'dark:bg-rose-500/10' },
      { title: 'Upcoming Bookings', value: upcomingEventsCount, subtitle: 'Requires sourcing', icon: Clock, gradient: 'from-[#7C3AED] to-[#A78BFA]', glowClass: 'glow-purple', iconColor: 'text-violet-500', iconGlow: 'dark:bg-violet-500/10' }
    ];
  }

  // --- OPERATIONS LEAD ROLE ---
  if (isOperationsLead) {
    dashboardTitle = 'Operations Management Desk';
    dashboardSubtitle = 'Internal staffing allocations, setup checklists, and event timelines';

    const todayStr = new Date().toISOString().split('T')[0];
    const opsEvents = allEvents.filter(e => e.operations_lead_id === user.id);
    const todayEvents = opsEvents.filter(e => e.event_date.split('T')[0] === todayStr).length;
    const activeStaffCount = allStaff.filter(s => s.availability_status === 'Available').length;
    
    // Extract task checklist stats
    let pendingTasks = 0;
    let completedTasks = 0;
    opsEvents.forEach(e => {
      const tasks = e.tasks ? (typeof e.tasks === 'string' ? JSON.parse(e.tasks) : e.tasks) : [];
      tasks.forEach(t => {
        if (t.status === 'Completed') completedTasks++;
        else pendingTasks++;
      });
    });

    statCards = [
      { title: 'Today\'s Events', value: todayEvents, subtitle: 'Execution today', icon: Calendar, gradient: 'from-[#7C3AED] to-[#A78BFA]', glowClass: 'glow-purple', iconColor: 'text-violet-555', iconGlow: 'dark:bg-violet-500/10' },
      { title: 'Available Crew', value: activeStaffCount, subtitle: 'Available helpers', icon: Users, gradient: 'from-[#059669] to-[#34D399]', glowClass: 'glow-green', iconColor: 'text-emerald-500', iconGlow: 'dark:bg-emerald-500/10' },
      { title: 'Pending Tasks', value: pendingTasks, subtitle: 'Checklists open', icon: ClipboardList, gradient: 'from-[#D97706] to-[#FBBF24]', glowClass: 'glow-orange', iconColor: 'text-amber-500', iconGlow: 'dark:bg-amber-500/10' },
      { title: 'Completed Tasks', value: completedTasks, subtitle: 'Milestones met', icon: CheckCircle, gradient: 'from-[#0284C7] to-[#38BDF8]', glowClass: 'glow-blue', iconColor: 'text-sky-500', iconGlow: 'dark:bg-sky-500/10' }
    ];
  }

  // --- FINANCE TEAM ROLE ---
  if (isFinanceTeam) {
    dashboardTitle = 'Financial Collections Console';
    dashboardSubtitle = 'Contract budgeting, client invoice ledgers, and payout tracking';

    // Filter payments assigned to this finance user
    const financePayments = allPayments.filter(p => allEvents.some(e => e.id === p.event_id && e.finance_team_id === user.id));

    // Calculate revenue metrics
    let totalRevenue = 0;
    let collectionsReceived = 0;
    let pendingPaymentsCount = 0;
    let totalPaidInvoices = 0;
    let totalVendorPayouts = 0;

    financePayments.forEach(p => {
      const amt = parseFloat(p.amount || 0);
      if (p.type === 'client') {
        if (p.status === 'Paid') {
          collectionsReceived += amt;
          totalPaidInvoices++;
        } else {
          pendingPaymentsCount++;
        }
        totalRevenue += parseFloat(p.total_amount || 0);
      } else if (p.type === 'vendor') {
        totalVendorPayouts += amt;
      }
    });

    statCards = [
      { title: 'Paid Collections', value: collectionsReceived, subtitle: `From ${totalPaidInvoices} invoices`, icon: CreditCard, gradient: 'from-[#059669] to-[#34D399]', glowClass: 'glow-green', isMoney: true, iconColor: 'text-emerald-500', iconGlow: 'dark:bg-emerald-500/10' },
      { title: 'Pending Invoices', value: pendingPaymentsCount, subtitle: 'Awaiting checks', icon: Clock, gradient: 'from-[#D97706] to-[#FBBF24]', glowClass: 'glow-orange', iconColor: 'text-amber-500', iconGlow: 'dark:bg-amber-500/10' },
      { title: 'Outsource Payouts', value: totalVendorPayouts, subtitle: 'Vendor costs allocated', icon: Briefcase, gradient: 'from-[#7C3AED] to-[#A78BFA]', glowClass: 'glow-purple', isMoney: true, iconColor: 'text-violet-555', iconGlow: 'dark:bg-violet-500/10' },
      { title: 'Gross Budget Booked', value: totalRevenue, subtitle: 'Gross pipeline contracts', icon: Layers, gradient: 'from-[#0284C7] to-[#38BDF8]', glowClass: 'glow-blue', isMoney: true, iconColor: 'text-sky-500', iconGlow: 'dark:bg-sky-500/10' }
    ];
  }

  // --- Live Monthly Finance Revenue Calculation for Line Graph ---
  const getFinanceChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const monthlyRev = Array(12).fill(0);
    const monthlyPayout = Array(12).fill(0);

    const financePayments = allPayments.filter(p => allEvents.some(e => e.id === p.event_id && e.finance_team_id === user.id));

    financePayments.forEach(p => {
      const amt = parseFloat(p.amount || p.total_amount || 0);
      const d = new Date(p.due_date || p.paid_at);
      if (d.getFullYear() === currentYear && !isNaN(d.getTime())) {
        if (p.type === 'client' && p.status === 'Paid') {
          monthlyRev[d.getMonth()] += amt;
        } else if (p.type === 'vendor' && p.status === 'Paid') {
          monthlyPayout[d.getMonth()] += amt;
        }
      }
    });

    return months.map((m, idx) => ({
      name: m,
      Revenue: monthlyRev[idx],
      Payout: monthlyPayout[idx]
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 pr-2 animate-fade-in-up"
    >
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 relative overflow-hidden transition-all duration-200">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl" />
        <div className="z-10">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Welcome back, {user?.name}!
          </h2>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1 font-medium">{dashboardSubtitle}</p>
        </div>
        <div className="text-xs text-slate-650 dark:text-slate-455 bg-slate-55/5 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-850 px-4 py-2 rounded-xl flex items-center gap-2 shadow-inner transition-colors font-semibold">
          <Clock className="w-4 h-4 text-sky-500" />
          <span>Local Time: {new Date().toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* --- ADMIN: NEW BOOKINGS --- */}
      {isAdmin && (
        <div className="glass-card p-6 bg-white dark:bg-[#111C30]/40 border-slate-200 dark:border-slate-850">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-2">
            <Calendar className="w-4.5 h-4.5 text-sky-500" />
            <span>New Bookings Awaiting Action</span>
            <span className="px-2 py-0.5 bg-sky-500/10 text-sky-500 dark:text-sky-400 rounded-full font-bold text-[10px] ml-1">
              {allEvents.filter(e => e.status && e.status.toLowerCase() === 'new').length}
            </span>
          </h3>

          {eventsLoading ? (
            <div className="py-12 flex justify-center"><Loader className="w-6 h-6 animate-spin text-sky-500" /></div>
          ) : allEvents.filter(e => e.status && e.status.toLowerCase() === 'new').length === 0 ? (
            <p className="text-xs text-slate-550 text-center py-8">No new bookings awaiting action. All set!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {allEvents.filter(e => e.status && e.status.toLowerCase() === 'new').map(e => (
                <div key={e.id} className="p-4 bg-slate-55/35 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-850 rounded-2xl flex flex-col justify-between gap-4 text-xs">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-800 dark:text-slate-250 text-sm leading-tight">{e.name}</h4>
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-250 dark:bg-amber-955/30 dark:text-amber-400 dark:border-amber-900/40 rounded-full font-bold text-[9px] uppercase tracking-wide shrink-0">
                        New
                      </span>
                    </div>
                    <div className="mt-3 space-y-1.5 text-slate-555 dark:text-slate-400 font-medium">
                      <p><strong>Client:</strong> {e.client_name} ({e.client_phone || 'N/A'})</p>
                      <p><strong>Email:</strong> {e.client_email || 'N/A'}</p>
                      <p><strong>Date:</strong> {new Date(e.event_date).toLocaleDateString('en-GB')}</p>
                      <p><strong>Venue:</strong> {e.venue}</p>
                      <p><strong>Budget:</strong> ₹{parseFloat(e.budget).toLocaleString()} | <strong>Guests:</strong> {e.guest_count || 'N/A'}</p>
                      {e.notes && <p className="italic text-[11px] text-slate-455 bg-slate-100 dark:bg-slate-900/60 p-2 rounded-lg mt-2 line-clamp-2">" {e.notes} "</p>}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => handleConfirmBooking(e)}
                      className="flex-1 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider shadow-sm transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => handleQuickRejectBooking(e)}
                      className="py-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/15 dark:hover:bg-rose-950/30 text-rose-600 border border-rose-200 dark:border-rose-900/40 font-bold rounded-xl text-[10px] uppercase tracking-wider shadow-sm transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.04 }}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`glass-card p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 cursor-default ${c.glowClass}`}
            >
              <div className={`absolute top-0 left-0 right-0 h-[3.5px] bg-gradient-to-r ${c.gradient}`} />
              
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest">{c.title}</span>
                <div className={`p-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-900 ${c.iconGlow}`}>
                  <Icon className={`w-4 h-4 shrink-0 ${c.iconColor}`} />
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="text-2xl font-bold font-sans tracking-tight text-slate-800 dark:text-slate-100 min-h-[32px] flex items-center">
                  {kpiLoading ? (
                    <Loader className="w-5 h-5 animate-spin-loader text-sky-500" />
                  ) : (
                    <>
                      {c.isMoney && <span className="text-lg mr-0.5">₹</span>}
                      <AnimatedCounter value={c.value} />
                    </>
                  )}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">{c.subtitle}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Double Column Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* --- LEFT SIDE CHART WIDGET --- */}
        <div className="lg:col-span-8 glass-card p-6">
          {isFinanceTeam ? (
            // Finance Revenue Line/Area Chart
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Collections vs Payouts Trend</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Realized revenue collections compared to vendor payouts</p>
                </div>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="h-72 w-full text-xs">
                {paymentsLoading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <Loader className="w-8 h-8 animate-spin-loader text-emerald-500" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getFinanceChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorPay" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} vertical={false} />
                      <XAxis dataKey="name" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip formatter={(val) => `₹${val.toLocaleString()}`} />} />
                      <Area type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                      <Area type="monotone" dataKey="Payout" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPay)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          ) : (
            // Default Bookings Volume Area Chart
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Monthly Bookings Volume</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Monthly event bookings scheduled in {new Date().getFullYear()}</p>
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
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} vertical={false} />
                      <XAxis dataKey="name" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={10} allowDecimals={false} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="events" name="Events Count" stroke="#0ea5e9" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEvents)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          )}
        </div>

        {/* --- RIGHT SIDE ANALYSIS WIDGET --- */}
        <div className="lg:col-span-4 glass-card p-6 flex flex-col justify-between">
          {isOperationsLead ? (
            // Operations Staff Utilization Rate
            <>
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Staff Utilization</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Rostered crew active rates by roles</p>
              </div>
              <div className="h-64 w-full mt-4 text-xs">
                {chartsLoading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <Loader className="w-8 h-8 animate-spin-loader text-[#10b981]" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.staffUtilization} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorStaff" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="#34d399" stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} horizontal={false} />
                      <XAxis type="number" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={9} domain={[0, 100]} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={9} width={75} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip formatter={(val) => `${val}%`} />} />
                      <Bar dataKey="utilizationRate" name="Utilization Rate" fill="url(#colorStaff)" radius={[0, 99, 99, 0]} barSize={12} background={{ fill: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)', radius: 99 }} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          ) : (
            // Default Vendor Utilization Rate
            <>
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Vendor Utilization</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Assigned vendor outsource booking rates by categories</p>
              </div>
              <div className="h-64 w-full mt-4 text-xs">
                {chartsLoading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <Loader className="w-8 h-8 animate-spin-loader text-indigo-500" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.vendorUtilization} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorUtilization" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} horizontal={false} />
                      <XAxis type="number" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={9} domain={[0, 100]} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={9} width={75} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip formatter={(val) => `${val}%`} />} />
                      <Bar dataKey="utilizationRate" name="Utilization Rate" fill="url(#colorUtilization)" radius={[0, 99, 99, 0]} barSize={12} background={{ fill: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)', radius: 99 }} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          )}

          <div className="text-[9px] text-slate-450 dark:text-slate-400 text-center border-t border-slate-150 dark:border-slate-850 pt-3 mt-2 font-medium">
            Active/Assigned rates calculate upcoming conflict reservations.
          </div>
        </div>
      </div>

      {/* --- ROLE-SPECIFIC DETAIL PANELS (GRID OR LISTS) --- */}

      {/* --- ADMIN: RECENT ACTIVITIES --- */}
      {isAdmin && (
        <>
        <div className="glass-card p-6 bg-white dark:bg-[#111C30]/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 border-b border-slate-100 dark:border-slate-800/60 pb-3">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>Recent System Activity Logs</span>
            </h3>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all recent activity logs?')) {
                  clearLogsMutation.mutate();
                }
              }}
              disabled={clearLogsMutation.isPending}
              className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
            >
              {clearLogsMutation.isPending ? 'Clearing Logs...' : 'Clear Logs'}
            </button>
          </div>
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
                    <td colSpan={4} className="py-4 text-center text-slate-455">No logs found</td>
                  </tr>
                ) : (
                  activities.map(log => (
                    <tr key={log.id}>
                      <td className="font-bold text-slate-800 dark:text-slate-350">{log.user_name}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide ${
                          log.action.includes('CREATE') ? 'bg-emerald-55 text-emerald-600 border border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/35' :
                          log.action.includes('DELETE') ? 'bg-rose-50 text-rose-600 border border-rose-250 dark:bg-rose-955/40 dark:text-rose-455 dark:border-rose-900/35' :
                          'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700/50'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="text-slate-700 dark:text-slate-300 leading-normal max-w-sm truncate" title={log.details}>
                        {log.details}
                      </td>
                      <td className="text-right text-slate-455">
                        {new Date(log.timestamp).toLocaleDateString('en-GB')} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Booking History & Archives Section */}
        <div className="glass-card p-6 bg-white dark:bg-[#111C30]/40 mt-6 border-slate-200 dark:border-slate-850">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-800/60 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-850 dark:text-slate-200 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-sky-500" />
                <span>Booking History & Archives</span>
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Review, search and filter all historical bookings</p>
            </div>
            
            {/* Search Input */}
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search bookings..."
                value={bookingHistorySearch}
                onChange={(e) => setBookingHistorySearch(e.target.value)}
                className="form-input text-xs"
              />
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex gap-2 mb-4 border-b border-slate-100 dark:border-slate-850 pb-3 overflow-x-auto">
            {['all', 'new', 'confirmed', 'rejected'].map(tab => (
              <button
                key={tab}
                onClick={() => setBookingHistoryStatus(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                  bookingHistoryStatus === tab
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-400'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Table list */}
          <div className="overflow-x-auto">
            <table className="modern-table text-xs">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Event Name</th>
                  <th>Client</th>
                  <th>Event Date</th>
                  <th>Venue</th>
                  <th>Budget</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filtered = allEvents.filter(e => {
                    const matchesSearch = e.name.toLowerCase().includes(bookingHistorySearch.toLowerCase()) ||
                      (e.client_name && e.client_name.toLowerCase().includes(bookingHistorySearch.toLowerCase())) ||
                      (e.venue && e.venue.toLowerCase().includes(bookingHistorySearch.toLowerCase()));
                    const matchesStatus = bookingHistoryStatus === 'all' || (e.status && e.status.toLowerCase() === bookingHistoryStatus);
                    return matchesSearch && matchesStatus;
                  });

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500 font-medium">No matching bookings in archives.</td>
                      </tr>
                    );
                  }

                  return filtered.map(e => (
                    <tr key={e.id} className="hover:bg-slate-55/35 dark:hover:bg-slate-950/20 transition-colors">
                      <td className="font-bold text-sky-500">SLV-EV-{e.id}</td>
                      <td className="font-bold text-slate-800 dark:text-slate-200">{e.name}</td>
                      <td>
                        <div className="font-bold">{e.client_name}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{e.client_phone}</div>
                      </td>
                      <td>{new Date(e.event_date).toLocaleDateString('en-GB')}</td>
                      <td className="max-w-xs truncate font-medium text-slate-600 dark:text-slate-350" title={e.venue}>{e.venue}</td>
                      <td className="font-bold">₹{parseFloat(e.budget).toLocaleString()}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border ${
                          e.status?.toLowerCase() === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/30 dark:text-emerald-400' :
                          e.status?.toLowerCase() === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-955/30 dark:text-rose-455' :
                          'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/30 dark:text-amber-400'
                        }`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => handleReviewBooking(e)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-[10px] transition-all cursor-pointer"
                        >
                          Review / Details
                        </button>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* --- VENDOR COORDINATOR: ASSIGNED EVENTS LOGS --- */}
      {isVendorCoordinator && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Sourcing events */}
          <div className="glass-card p-6 bg-white dark:bg-[#111C30]/40 border-slate-200 dark:border-slate-850">
            <h3 className="font-bold text-sm text-slate-805 dark:text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-2">
              <Calendar className="w-4 h-4 text-sky-500" />
              <span>Upcoming Events Requiring Vendors</span>
            </h3>
            {eventsLoading ? (
              <div className="py-12 flex justify-center"><Loader className="w-6 h-6 animate-spin text-sky-500" /></div>
            ) : allEvents.filter(e => e.coordinator_id === user.id && e.status === 'Pending').length === 0 ? (
              <p className="text-xs text-slate-550 text-center py-8">All upcoming events fully assigned!</p>
            ) : (
              <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
                {allEvents.filter(e => e.coordinator_id === user.id && e.status === 'Pending').map(e => (
                  <div key={e.id} className="p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 rounded-2xl flex justify-between items-center text-xs">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-250">{e.name}</h4>
                      <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-1">Date: {new Date(e.event_date).toLocaleDateString('en-GB')} | Venue: {e.venue}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-250 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40 rounded-full font-bold text-[9px] uppercase tracking-wide">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vendors availability status directory */}
          <div className="glass-card p-6 bg-white dark:bg-[#111C30]/40 border-slate-200 dark:border-slate-850">
            <h3 className="font-bold text-sm text-slate-805 dark:text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-2">
              <Briefcase className="w-4 h-4 text-emerald-500" />
              <span>Vendors Roster Availability</span>
            </h3>
            {vendorsLoading ? (
              <div className="py-12 flex justify-center"><Loader className="w-6 h-6 animate-spin text-emerald-550" /></div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {allVendors.slice(0, 5).map(v => (
                  <div key={v.id} className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 rounded-2xl flex justify-between items-center text-xs">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-250">{v.name}</h4>
                      <p className="text-[10px] text-slate-455 dark:text-slate-400 mt-1 font-medium">Category: {v.category} | Contact: {v.contact_person}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-0.5 text-amber-500 font-bold text-[10px] bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                        ★ {v.rating}
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-lg border ${
                        v.availability_status === 'Available'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40'
                          : 'bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-955/30 dark:text-rose-455 dark:border-rose-900/40'
                      }`}>
                        {v.availability_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- OPERATIONS LEAD: OPERATIONAL CONTROL CENTER --- */}
      {isOperationsLead && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Today's Events Timeline Controls */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            <div className="glass-card p-6 bg-white dark:bg-[#111C30]/40 border-slate-200 dark:border-slate-850">
              <h3 className="font-bold text-sm text-slate-805 dark:text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-2">
                <Calendar className="w-4.5 h-4.5 text-sky-500" />
                <span>Today's Event Status Board</span>
              </h3>
              {eventsLoading ? (
                <div className="py-12 flex justify-center"><Loader className="w-6 h-6 animate-spin text-sky-500" /></div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                  {(() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const todayEvents = allEvents.filter(e => e.operations_lead_id === user.id && e.event_date.split('T')[0] === todayStr);

                    if (todayEvents.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-500 font-medium text-xs">
                          🎉 No events scheduled for execution today.
                        </div>
                      );
                    }

                    return todayEvents.map(e => {
                      const tasks = e.tasks ? (typeof e.tasks === 'string' ? JSON.parse(e.tasks) : e.tasks) : [];
                      const totalTasks = tasks.length;
                      const completedTasks = tasks.filter(t => t.status === 'Completed').length;
                      const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                      return (
                        <div key={e.id} className="p-4 bg-slate-55/40 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-2xl space-y-4 text-xs">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-sm text-slate-850 dark:text-slate-250 hover:text-sky-500 transition-colors">
                                <Link to={`/events/${e.id}`}>{e.name}</Link>
                              </h4>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Venue: {e.venue} | Client: {e.client_name}</p>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${
                              e.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400' :
                              e.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-955/20 dark:text-rose-455' :
                              'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400'
                            }`}>
                              {e.status}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] text-slate-455 font-bold uppercase tracking-wider">
                              <span>Event Tasks Readiness</span>
                              <span>{completedTasks}/{totalTasks} Tasks ({percent}%)</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-sky-500 h-full transition-all duration-300" style={{ width: `${percent}%` }} />
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-150 dark:border-slate-850">
                            <span className="text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest mr-2">Set Milestone:</span>
                            {['Setup Started', 'Ready', 'In Progress', 'Completed'].map(statusOption => (
                              <button
                                key={statusOption}
                                disabled={eventStatusMutation.isPending}
                                onClick={() => eventStatusMutation.mutate({ eventId: e.id, name: e.name, status: statusOption })}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                  e.status === statusOption
                                    ? 'bg-sky-500 text-white shadow-sm'
                                    : 'bg-slate-100 hover:bg-slate-205 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350'
                                }`}
                              >
                                {statusOption}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* Crew Attendance Check-in */}
            <div className="glass-card p-6 bg-white dark:bg-[#111C30]/40 border-slate-200 dark:border-slate-850">
              <h3 className="font-bold text-sm text-slate-805 dark:text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-2">
                <Users className="w-4.5 h-4.5 text-emerald-500" />
                <span>Today's Crew Attendance Check-in</span>
              </h3>
              {eventsLoading ? (
                <div className="py-12 flex justify-center"><Loader className="w-6 h-6 animate-spin text-emerald-500" /></div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {(() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const todayEvents = allEvents.filter(e => e.event_date.split('T')[0] === todayStr);
                    const todayEventIds = todayEvents.map(e => e.id);

                    // Filter assignments for staff assigned to today's events
                    const todayCrewAssignments = allAssignments.filter(a =>
                      todayEventIds.includes(a.event_id) && a.resource_type === 'staff'
                    );

                    if (todayCrewAssignments.length === 0) {
                      return (
                        <div className="text-center py-8 text-slate-500 font-medium text-xs">
                          No rostered crew assigned for today. Use the event planning screen to assign helpers.
                        </div>
                      );
                    }

                    return todayCrewAssignments.map(a => {
                      const crewMember = allStaff.find(s => s.id === a.resource_id);
                      const currentEvent = todayEvents.find(e => e.id === a.event_id);
                      if (!crewMember) return null;

                      return (
                        <div key={a.id} className="p-3.5 bg-slate-55/35 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 dark:text-slate-250">{crewMember.name}</span>
                              <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[9px] text-slate-500 dark:text-slate-400 rounded-md font-semibold">{crewMember.role}</span>
                            </div>
                            <p className="text-[10px] text-slate-455 mt-1">Assigned to: <strong className="text-slate-655 dark:text-slate-350">{currentEvent ? currentEvent.name : 'Unknown Event'}</strong></p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-450 dark:text-slate-450 font-bold uppercase mr-1">Roster Status:</span>
                            {['Confirmed', 'Present', 'Absent'].map(statusOption => (
                              <button
                                key={statusOption}
                                disabled={staffStatusMutation.isPending}
                                onClick={() => staffStatusMutation.mutate({ assignmentId: a.id, status: statusOption })}
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer ${
                                  a.status === statusOption
                                    ? statusOption === 'Present' ? 'bg-emerald-500 text-white shadow-sm' :
                                      statusOption === 'Absent' ? 'bg-rose-500 text-white shadow-sm' :
                                      'bg-sky-500 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-455 hover:bg-slate-200'
                                }`}
                              >
                                {statusOption}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Quick Incident Reporting Form */}
          <div className="xl:col-span-4 glass-card p-6 bg-white dark:bg-[#111C30]/40 border-slate-200 dark:border-slate-850 h-fit">
            <h3 className="font-bold text-sm text-slate-805 dark:text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-2">
              <ShieldAlert className="w-4.5 h-4.5 text-rose-500" />
              <span>Report Active Incident</span>
            </h3>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!incidentForm.eventId || !incidentForm.details.trim()) {
                  addToast('Please select an event and describe the incident.', 'error');
                  return;
                }
                reportIncidentMutation.mutate(incidentForm);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Select Target Event</label>
                <select
                  value={incidentForm.eventId}
                  onChange={(e) => setIncidentForm(prev => ({ ...prev, eventId: e.target.value }))}
                  className="form-input cursor-pointer pr-8"
                >
                  <option value="">-- Select Event --</option>
                  {allEvents.filter(e => e.operations_lead_id === user.id && e.status !== 'Completed' && e.status !== 'Cancelled').map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Incident Type</label>
                <select
                  value={incidentForm.type}
                  onChange={(e) => setIncidentForm(prev => ({ ...prev, type: e.target.value }))}
                  className="form-input cursor-pointer pr-8"
                >
                  <option value="Vendor Delay">Vendor Delay</option>
                  <option value="Equipment Failure">Equipment Failure</option>
                  <option value="Staff Shortage">Staff Shortage</option>
                  <option value="Logistics Issue">Logistics Issue</option>
                  <option value="Emergency Incident">Emergency Incident</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-550 dark:text-slate-400 mb-1.5 uppercase">Description Details</label>
                <textarea
                  placeholder="Provide precise incident details, affected resources, and immediate steps taken..."
                  value={incidentForm.details}
                  onChange={(e) => setIncidentForm(prev => ({ ...prev, details: e.target.value }))}
                  className="form-input h-28 resize-none py-2"
                />
              </div>

              <button
                type="submit"
                disabled={reportIncidentMutation.isPending}
                className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                {reportIncidentMutation.isPending ? 'Logging incident warning...' : 'Report Incident Alert'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- FINANCE TEAM: PENDING PAYMENTS LEDGER & QUICK ACTIONS --- */}
      {isFinanceTeam && (
        <div className="glass-card p-6 bg-white dark:bg-[#111C30]/40 border-slate-200 dark:border-slate-850">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-850">
            <CreditCard className="w-4 h-4 text-emerald-550" />
            <span>Active Invoice Collections Checklist</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Event Description</th>
                  <th>Category</th>
                  <th>Amount Due</th>
                  <th>Invoice Due Date</th>
                  <th>Status</th>
                  <th className="text-right">Collection Action</th>
                </tr>
              </thead>
              <tbody>
                {paymentsLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <Loader className="w-6 h-6 animate-spin-loader text-emerald-500 mx-auto" />
                    </td>
                  </tr>
                ) : allPayments.filter(p => p.status !== 'Paid' && allEvents.some(e => e.id === p.event_id && e.finance_team_id === user.id)).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-455 font-medium">No pending payments ledgered!</td>
                  </tr>
                ) : (
                  allPayments.filter(p => p.status !== 'Paid' && allEvents.some(e => e.id === p.event_id && e.finance_team_id === user.id)).slice(0, 5).map(pay => (
                    <tr key={pay.id}>
                      <td className="font-bold text-slate-800 dark:text-slate-350">{pay.event_name}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border ${
                          pay.type === 'client'
                            ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/35'
                            : 'bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20 dark:text-[#A78BFA] dark:border-[#A78BFA]/20'
                        }`}>
                          {pay.type === 'client' ? 'Client Installment' : `Vendor Payout (${pay.vendor_name || 'Partner'})`}
                        </span>
                      </td>
                      <td className="font-bold text-slate-900 dark:text-slate-200">₹{parseFloat(pay.amount).toLocaleString()}</td>
                      <td className="text-slate-500 dark:text-slate-450">{new Date(pay.due_date).toLocaleDateString('en-GB')}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                          pay.status === 'Overdue'
                            ? 'bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-955/20 dark:text-rose-455 dark:border-rose-900/35'
                            : 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/35'
                        }`}>
                          {pay.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => {
                            if (window.confirm(`Mark payment of ₹${parseFloat(pay.amount).toLocaleString()} as PAID?`)) {
                              payMutation.mutate(pay.id);
                            }
                          }}
                          disabled={payMutation.isPending}
                          className="px-3 py-1 bg-[#10b981] hover:bg-[#059669] text-white rounded-lg text-[10px] font-bold shadow-sm transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          Mark Paid
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review & Assignment Modal/Drawer */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-white dark:bg-[#111F35] rounded-3xl border border-slate-205 dark:border-white/[0.08] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-white/[0.04] flex justify-between items-center bg-slate-50/50 dark:bg-slate-905/30">
                <div>
                  <span className="text-[10px] font-bold text-sky-500 dark:text-sky-400 uppercase tracking-widest">Review Booking Request</span>
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 mt-1">
                    {selectedBooking.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Body (Scrollable) */}
              <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-655 dark:text-slate-350 font-medium">
                
                {/* Specs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-100 dark:border-white/[0.02]">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Client Name</span>
                    <p className="font-bold text-slate-800 dark:text-slate-205 mt-0.5">{selectedBooking.client_name}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Mobile Number</span>
                    <p className="font-bold text-slate-800 dark:text-slate-205 mt-0.5">{selectedBooking.client_phone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Email</span>
                    <p className="font-bold text-slate-800 dark:text-slate-205 mt-0.5 truncate" title={selectedBooking.client_email}>{selectedBooking.client_email || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Event Type</span>
                    <p className="font-bold text-slate-800 dark:text-slate-205 mt-0.5">{selectedBooking.event_type}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Event Date</span>
                    <p className="font-bold text-slate-800 dark:text-slate-205 mt-0.5">{new Date(selectedBooking.event_date).toLocaleDateString('en-GB')}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Location / Venue</span>
                    <p className="font-bold text-slate-800 dark:text-slate-205 mt-0.5 truncate" title={selectedBooking.venue}>{selectedBooking.venue}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Number of Guests</span>
                    <p className="font-bold text-slate-855 dark:text-slate-100 mt-0.5">{selectedBooking.guest_count || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Gross Budget</span>
                    <p className="font-bold text-slate-855 dark:text-slate-100 mt-0.5">₹{parseFloat(selectedBooking.budget).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Current Status</span>
                    <p className="font-extrabold text-amber-500 dark:text-amber-400 mt-0.5 uppercase">{selectedBooking.status}</p>
                  </div>
                </div>

                {/* Additional Notes */}
                {selectedBooking.notes && (
                  <div>
                    <h4 className="font-bold text-[10px] text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2">Client Notes / Requirements</h4>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-white/[0.02] rounded-xl text-slate-700 dark:text-slate-300 leading-relaxed">
                      {selectedBooking.notes}
                    </div>
                  </div>
                )}

                {/* Assignment Controls */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/[0.04]">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-250 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-sky-500" />
                    <span>Assign Planning Team & Set Status</span>
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Workflow Status</label>
                      <select
                        value={reviewForm.status}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, status: e.target.value }))}
                        className="form-input cursor-pointer"
                      >
                        <option value="Pending">Pending (Under Sourcing)</option>
                        <option value="Assigned">Assigned (Teams Assigned)</option>
                        <option value="In Progress">In Progress (Execution)</option>
                        <option value="Completed">Completed (Finalized)</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Vendor Coordinator *</label>
                      <select
                        value={reviewForm.coordinator_id}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, coordinator_id: e.target.value }))}
                        className="form-input cursor-pointer"
                        required
                      >
                        <option value="">-- Select Coordinator --</option>
                        {vendorCoordinators.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Operations Lead *</label>
                      <select
                        value={reviewForm.operations_lead_id}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, operations_lead_id: e.target.value }))}
                        className="form-input cursor-pointer"
                        required
                      >
                        <option value="">-- Select Operations Lead --</option>
                        {operationsLeads.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Finance Lead *</label>
                      <select
                        value={reviewForm.finance_team_id}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, finance_team_id: e.target.value }))}
                        className="form-input cursor-pointer"
                        required
                      >
                        <option value="">-- Select Finance Personnel --</option>
                        {financeTeams.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Footer */}
              <div className="p-6 border-t border-slate-100 dark:border-white/[0.04] bg-slate-50/50 dark:bg-slate-900/30 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="px-4 py-2 border border-slate-205 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/[0.04] text-slate-655 dark:text-slate-350 rounded-xl transition-all cursor-pointer text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  disabled={processBookingMutation.isPending || !reviewForm.coordinator_id || !reviewForm.operations_lead_id || !reviewForm.finance_team_id}
                  onClick={() => {
                    processBookingMutation.mutate({
                      eventId: selectedBooking.id,
                      status: reviewForm.status,
                      coordinator_id: reviewForm.coordinator_id,
                      operations_lead_id: reviewForm.operations_lead_id,
                      finance_team_id: reviewForm.finance_team_id
                    });
                  }}
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-xs font-bold disabled:opacity-50"
                >
                  {processBookingMutation.isPending ? 'Processing Assignments...' : 'Begin Planning & Dispatch Teams'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Visual Notification Sent Preview Modal */}
      <AnimatePresence>
        {sentNotificationPreview && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="w-full max-w-xl bg-white dark:bg-[#111F35] rounded-3xl border border-slate-205 dark:border-white/[0.08] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-white/[0.04] flex justify-between items-center bg-slate-50/50 dark:bg-slate-905/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <CheckCircle className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest font-sans">System Outbox Dispatch</span>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 mt-0.5">
                      Client Alerts Successfully Dispatched!
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSentNotificationPreview(null)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preview Body */}
              <div className="p-6 overflow-y-auto space-y-6 text-xs leading-normal font-semibold">
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                  We have simulated the external email and WhatsApp API requests for this booking update. Below are the actual message templates transmitted:
                </p>

                {/* WhatsApp Chat Simulation */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-sans">WhatsApp Message Bubble (Simulated)</span>
                  <div className="p-4 bg-[#E5DDD5] dark:bg-slate-950 border border-slate-205 dark:border-slate-850 rounded-2xl relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="flex justify-start relative z-10">
                      <div className="bg-[#DCF8C6] text-slate-800 dark:bg-emerald-950 dark:text-slate-100 max-w-[85%] rounded-2xl rounded-tl-none p-3.5 shadow-sm text-xs border border-emerald-200/40 dark:border-emerald-900/30">
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-[10px] uppercase tracking-wider mb-1">SLV Events Official</p>
                        <p className="whitespace-pre-wrap select-all font-medium leading-relaxed font-sans">{sentNotificationPreview.whatsappMessage}</p>
                        <span className="block text-[9px] text-slate-400 dark:text-slate-500 text-right mt-1.5 font-semibold">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email Client Simulation */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-sans">Email Client (Simulated)</span>
                  <div className="border border-slate-200 dark:border-white/[0.04] rounded-2xl overflow-hidden shadow-inner bg-slate-50 dark:bg-slate-905/30">
                    <div className="p-3 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-white/[0.04] space-y-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      <p><strong>From:</strong> updates@slvevents.com</p>
                      <p><strong>To:</strong> {sentNotificationPreview.clientEmail || 'N/A'}</p>
                      <p><strong>Subject:</strong> Booking Request Update - SLV Events</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-[#151D2A] text-slate-700 dark:text-slate-350 font-medium font-sans">
                      <p className="whitespace-pre-wrap leading-relaxed select-all">{sentNotificationPreview.emailMessage}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-6 border-t border-slate-100 dark:border-white/[0.04] bg-slate-50/50 dark:bg-slate-900/30 flex justify-end">
                <button
                  onClick={() => setSentNotificationPreview(null)}
                  className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer text-xs uppercase tracking-wide"
                >
                  Close & Refresh Dashboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Dashboard;
