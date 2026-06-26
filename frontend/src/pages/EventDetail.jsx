import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useUIStore } from '../store/uiStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  MapPin,
  Users,
  Briefcase,
  UserCheck,
  CreditCard,
  ChevronLeft,
  Sparkles,
  ClipboardCheck,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Clock,
  Camera,
  MessageSquare,
  Upload,
  X,
  ShieldAlert,
  Check,
  Boxes
} from 'lucide-react';
import NotFound from './NotFound';
import AssignmentModal from '../components/AssignmentModal';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isCoordinator, isOps, isAdmin } = useAuth();
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();

  const [showRosterModal, setShowRosterModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const { user } = useAuth();
  const isOperationsLead = user?.role === 'Operations Lead';
  
  // States for operational console tools
  const [activeTab, setActiveTab] = useState('timeline'); // timeline, roster, inventory, logs, media
  const [incidentForm, setIncidentForm] = useState({ category: 'Vendor Delay', details: '' });
  const [logNote, setLogNote] = useState('');
  const [allocatingItem, setAllocatingItem] = useState({ itemId: '', quantity: 1 });
  const [completionNotes, setCompletionNotes] = useState('');

  // 1. Fetch Global Inventory
  const { data: globalInventory = [] } = useQuery({
    queryKey: ['globalInventory'],
    queryFn: async () => {
      const res = await axios.get('/inventory');
      return res.data || [];
    },
    enabled: isOps
  });

  // 2. Milestone/Timeline Update Mutation
  const milestoneMutation = useMutation({
    mutationFn: async ({ stage, status }) => {
      await axios.put(`/events/${id}`, {
        name: event.name,
        status: status,
        workflow_stage: stage,
        workflow_mode: 'Manual'
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['eventDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      addToast(`Milestone updated to ${variables.status} (Stage ${variables.stage})`);
    },
    onError: () => {
      addToast('Failed to update event milestone', 'error');
    }
  });

  // 3. Crew check-in / individual assignment status update
  const assignmentStatusMutation = useMutation({
    mutationFn: async ({ assignmentId, status }) => {
      await axios.put(`/assignments/${assignmentId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventDetail', id] });
      addToast('Roster crew check-in status updated!');
    },
    onError: () => {
      addToast('Failed to update crew check-in status', 'error');
    }
  });

  // 3b. Remove individual staff assignment
  const removeStaffMutation = useMutation({
    mutationFn: async (staffId) => {
      await axios.post('/assignments/delete', {
        eventId: parseInt(id),
        resourceType: 'staff',
        resourceId: parseInt(staffId)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventDetail', id] });
      addToast('Staff assignment removed successfully!');
    },
    onError: () => {
      addToast('Failed to remove staff assignment', 'error');
    }
  });

  // 4. Inventory allocation update mutation
  const inventoryAllocationMutation = useMutation({
    mutationFn: async (updatedInventory) => {
      await axios.put(`/events/${id}`, {
        name: event.name,
        status: event.status,
        inventory: updatedInventory
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventDetail', id] });
      addToast('Allocated inventory updated successfully!');
    },
    onError: () => {
      addToast('Failed to update allocated inventory', 'error');
    }
  });

  // 5. Operations Log Notes mutation
  const addOpsLogMutation = useMutation({
    mutationFn: async (noteText) => {
      const newLog = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: 'Note',
        details: noteText,
        user: user?.name || 'Operations Lead'
      };
      const updatedLogs = [...(event.ops_logs || []), newLog];
      await axios.put(`/events/${id}`, {
        name: event.name,
        status: event.status,
        ops_logs: updatedLogs
      });
    },
    onSuccess: () => {
      setLogNote('');
      queryClient.invalidateQueries({ queryKey: ['eventDetail', id] });
      addToast('Operations log entry registered!');
    },
    onError: () => {
      addToast('Failed to log note', 'error');
    }
  });

  // 6. Report Incident Mutation
  const reportIncidentMutation = useMutation({
    mutationFn: async ({ category, details }) => {
      const newLog = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: 'Incident',
        category,
        details,
        user: user?.name || 'Operations Lead'
      };
      
      // Update event logs
      const updatedLogs = [...(event.ops_logs || []), newLog];
      await axios.put(`/events/${id}`, {
        name: event.name,
        status: event.status,
        ops_logs: updatedLogs
      });

      // Post high-priority warning notification
      await axios.post('/notifications', {
        title: `${category} Incident Warning`,
        message: `🚨 HIGH PRIORITY Alert at "${event.name}": ${details}`,
        type: 'Conflict Alert'
      });
    },
    onSuccess: () => {
      setIncidentForm({ category: 'Vendor Delay', details: '' });
      queryClient.invalidateQueries({ queryKey: ['eventDetail', id] });
      addToast('Incident warning submitted successfully!');
    },
    onError: () => {
      addToast('Failed to report incident', 'error');
    }
  });

  // 7. Post Event Completion report and media uploads
  const postEventMutation = useMutation({
    mutationFn: async ({ notes, photos }) => {
      await axios.put(`/events/${id}`, {
        name: event.name,
        status: event.status,
        notes: notes ? `${event.notes || ''}\n\n[Completion Summary]: ${notes}` : event.notes,
        photos: photos
      });
    },
    onSuccess: () => {
      setCompletionNotes('');
      queryClient.invalidateQueries({ queryKey: ['eventDetail', id] });
      addToast('Post-event summary and gallery updated!');
    },
    onError: () => {
      addToast('Failed to save post-event summary', 'error');
    }
  });

  // Query to fetch single event details
  const { data: event, isLoading, error } = useQuery({
    queryKey: ['eventDetail', id],
    queryFn: async () => {
      const res = await axios.get(`/events/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  // Mutation to update event status
  const statusMutation = useMutation({
    mutationFn: async (newStatus) => {
      await axios.put(`/events/${id}`, {
        name: event.name,
        eventType: event.event_type,
        eventDate: event.event_date,
        venue: event.venue,
        budget: event.budget,
        guestCount: event.guest_count,
        themePreference: event.theme_preference,
        notes: event.notes,
        status: newStatus
      });
    },
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['eventDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      addToast(`Status successfully changed to ${newStatus}`);
    },
    onError: () => {
      addToast('Failed to update event status', 'error');
    }
  });

  const handleStatusChange = (newStatus) => {
    statusMutation.mutate(newStatus);
  };

  // Mutation to update event tasks checklist
  const tasksMutation = useMutation({
    mutationFn: async (newTasks) => {
      await axios.put(`/events/${id}`, {
        name: event.name,
        eventType: event.event_type,
        eventDate: event.event_date,
        venue: event.venue,
        budget: event.budget,
        guestCount: event.guest_count,
        themePreference: event.theme_preference,
        notes: event.notes,
        status: event.status,
        tasks: newTasks
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      addToast('Tasks checklist updated successfully');
    },
    onError: () => {
      addToast('Failed to update tasks checklist', 'error');
    }
  });

  const handleToggleTask = (taskId) => {
    const currentTasks = event.tasks || [];
    const updatedTasks = currentTasks.map(t => 
      t.id === taskId 
        ? { ...t, status: t.status === 'Completed' ? 'Pending' : 'Completed' } 
        : t
    );
    tasksMutation.mutate(updatedTasks);
  };

  const handleDeleteTask = (taskId) => {
    const currentTasks = event.tasks || [];
    const updatedTasks = currentTasks.filter(t => t.id !== taskId);
    tasksMutation.mutate(updatedTasks);
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const currentTasks = event.tasks || [];
    const newTask = {
      id: Date.now(),
      title: newTaskTitle.trim(),
      status: 'Pending'
    };
    const updatedTasks = [...currentTasks, newTask];
    tasksMutation.mutate(updatedTasks);
    setNewTaskTitle('');
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col gap-6 animate-pulse p-4">
        <div className="h-20 bg-white dark:bg-[#111C30]/40 border border-slate-200 dark:border-slate-800 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-white dark:bg-[#111C30]/40 border border-slate-200 dark:border-slate-800 rounded-2xl" />
          <div className="h-96 bg-white dark:bg-[#111C30]/40 border border-slate-200 dark:border-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return <NotFound />;
  }

  // Calculate quick metrics
  const clientPayment = event.payments?.find(p => p.type === 'client') || {
    total_amount: event.budget,
    advance: 0,
    balance: event.budget,
    status: 'Pending'
  };

  const vendorPayments = event.payments?.filter(p => p.type === 'vendor') || [];
  const totalVendorAllocated = vendorPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const showRosterButton = isAdmin || isOps || isCoordinator;
  let rosterButtonLabel = "Assign Crew & Vendors";
  if (isAdmin) {
    rosterButtonLabel = "Assign Crew & Vendors";
  } else if (isOps) {
    rosterButtonLabel = "Assign Staff";
  } else if (isCoordinator) {
    rosterButtonLabel = "Assign Vendors";
  }

  const tasks = event.tasks || [];
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.status === 'Completed').length;

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-8 animate-fade-in-up pr-2">
      {/* Header Back & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/events')}
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            title="Go Back"
          >
            <ChevronLeft className="w-5 h-5 text-slate-550 dark:text-slate-400" />
          </button>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-450 dark:text-slate-400">{event.event_type} Planning</span>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{event.name}</h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Changer */}
          {isOps && (
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl">
              <span className="text-[10px] text-slate-450 dark:text-slate-400 font-bold uppercase">Status:</span>
              <select
                disabled={statusMutation.isPending}
                value={event.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-transparent text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer pr-4 disabled:opacity-55"
              >
                <option value="Pending" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Pending</option>
                <option value="Assigned" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Assigned</option>
                <option value="In Progress" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">In Progress</option>
                <option value="Completed" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Completed</option>
                <option value="Cancelled" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Cancelled</option>
              </select>
            </div>
          )}

          {/* Quick Route to Crew Planner Modal */}
          {showRosterButton && (
            <button
              onClick={() => setShowRosterModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-bounce shrink-0" />
              <span>{rosterButtonLabel}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Event Specifications & Crew */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Specifications Card */}
          <div className="glass-card p-6 bg-white dark:bg-[#111C30]/40">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200 mb-4 pb-2 border-b border-slate-150 dark:border-slate-850">Event Specifications</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div className="flex items-start gap-3">
                <Calendar className="w-4.5 h-4.5 text-sky-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-450 dark:text-slate-500 block uppercase font-bold">Scheduled Date</span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{new Date(event.event_date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4.5 h-4.5 text-sky-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-450 dark:text-slate-500 block uppercase font-bold">Venue Venue</span>
                  <span className="text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">{event.venue}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-4.5 h-4.5 text-sky-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-450 dark:text-slate-500 block uppercase font-bold">Guest Count</span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{event.guest_count} Attendees</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Sparkles className="w-4.5 h-4.5 text-sky-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-450 dark:text-slate-500 block uppercase font-bold">Theme Preference</span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{event.theme_preference || 'No custom theme specified'}</span>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {event.notes && (
              <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl p-4 mt-6 text-xs transition-colors">
                <span className="text-[10px] text-slate-450 dark:text-slate-500 block uppercase mb-1 font-bold">Planning Notes</span>
                <p className="text-slate-750 dark:text-slate-300 leading-normal whitespace-pre-line">{event.notes}</p>
              </div>
            )}
          </div>
          {/* Operations Lead / Admin Workspaces */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1.5 mt-2 overflow-x-auto">
            {[
              { id: 'timeline', label: 'Timeline & Status', icon: Clock },
              { id: 'checklist', label: 'Checklist', icon: ClipboardCheck },
              { id: 'roster', label: 'Roster & Check-ins', icon: UserCheck },
              { id: 'inventory', label: 'Inventory Allocation', icon: Boxes },
              { id: 'logs', label: 'Operations Log', icon: MessageSquare },
              { id: 'media', label: 'Completion & Media', icon: Camera }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id
                      ? 'border-sky-500 text-sky-500'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab View */}
          <div className="min-h-[300px]">
            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="glass-card p-6 bg-white dark:bg-[#111C30]/40 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-855 dark:text-slate-200">Execution Timeline Milestone</h3>
                  <p className="text-[10px] text-slate-550 dark:text-slate-405 mt-1 font-semibold uppercase tracking-wider">Update event execution status</p>
                </div>
                
                {/* Visual milestone checklist */}
                <div className="relative flex flex-col md:flex-row justify-between items-center gap-6 md:gap-2 py-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 p-6 rounded-2xl">
                  {/* Track line (Desktop) */}
                  <div className="hidden md:block absolute left-[8%] right-[8%] top-[34px] h-0.5 bg-slate-200 dark:bg-slate-805 z-0" />
                  
                  {[
                    { stage: 1, label: 'Pending', desc: 'Awaiting scheduling' },
                    { stage: 2, label: 'Confirmed', desc: 'Booking confirmed' },
                    { stage: 3, label: 'Setup Started', desc: 'Logistics on site' },
                    { stage: 4, label: 'Ready', desc: 'Decor & AV set' },
                    { stage: 5, label: 'In Progress', desc: 'Event live' },
                    { stage: 6, label: 'Completed', desc: 'Event concluded' }
                  ].map((m, idx) => {
                    const isFinished = (event.workflow_stage || 1) >= m.stage;
                    const isCurrent = (event.workflow_stage || 1) === m.stage;

                    return (
                      <button
                        key={m.stage}
                        disabled={milestoneMutation.isPending}
                        onClick={() => milestoneMutation.mutate({ stage: m.stage, status: m.label })}
                        className="relative z-10 flex flex-row md:flex-col items-center gap-3 md:gap-2 md:text-center select-none w-full md:w-[15%] group cursor-pointer disabled:opacity-50"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-bold text-xs shadow-sm transition-all duration-300 ${
                          isFinished
                            ? 'bg-sky-500 border-sky-500 text-white shadow-sky-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-300 text-slate-400 dark:border-slate-700'
                        } ${isCurrent ? 'ring-4 ring-sky-500/15' : ''}`}>
                          {isFinished ? '✓' : m.stage}
                        </div>
                        <div className="text-left md:text-center">
                          <span className={`block text-[10px] font-extrabold uppercase tracking-wide transition-colors ${
                            isFinished ? 'text-slate-850 dark:text-slate-200' : 'text-slate-450'
                          } group-hover:text-sky-500`}>
                            {m.label}
                          </span>
                          <span className="block text-[9px] text-slate-400 font-medium leading-none mt-0.5">{m.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Progress Circle & Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 rounded-2xl flex items-center gap-4 text-xs">
                    <div className="w-12 h-12 rounded-full border-4 border-sky-500/25 border-t-sky-500 flex items-center justify-center font-bold text-sky-500 shrink-0 shadow-inner">
                      {event.status === 'Completed' ? '100%' : `${Math.round(((event.workflow_stage || 1) / 6) * 100)}%`}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-250">Event Pipeline Readiness</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Execution checks and milestones completed</p>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 rounded-2xl flex items-center gap-4 text-xs">
                    <div className="w-12 h-12 rounded-full border-4 border-emerald-500/25 border-t-emerald-500 flex items-center justify-center font-bold text-emerald-500 shrink-0 shadow-inner">
                      {totalTasksCount > 0 ? `${Math.round((completedTasksCount / totalTasksCount) * 100)}%` : '0%'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-250">Checklist Tasks Finished</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">{completedTasksCount} of {totalTasksCount} checklist tasks completed</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Checklist Tab */}
            {activeTab === 'checklist' && (
              <div className="glass-card p-6 bg-white dark:bg-[#111C30]/40 space-y-4">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-150 dark:border-slate-850">
                  <h3 className="text-sm font-bold text-slate-855 dark:text-slate-200">Operations Checklist</h3>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold">
                    {completedTasksCount}/{totalTasksCount} Completed
                  </span>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {tasks.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-8 italic">No checklist tasks recorded for this event.</p>
                  ) : (
                    tasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl transition-all">
                        <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={task.status === 'Completed'}
                            disabled={!(isAdmin || isOps)}
                            onChange={() => handleToggleTask(task.id)}
                            className="w-4 h-4 accent-sky-500 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span className={`text-xs text-slate-700 dark:text-slate-350 truncate ${task.status === 'Completed' ? 'line-through opacity-50' : 'font-semibold'}`}>
                            {task.title}
                          </span>
                        </label>
                        {(isAdmin || isOps) && (
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition-colors cursor-pointer"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {(isAdmin || isOps) && (
                  <form onSubmit={handleAddTask} className="flex gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Add a new checklist task..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 text-slate-850 dark:text-slate-200 rounded-xl text-xs outline-none focus:border-sky-550 transition-all font-semibold"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                    >
                      Add
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Roster & Check-ins Tab */}
            {activeTab === 'roster' && (
              isOperationsLead ? (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-slate-855 dark:text-slate-200">Assigned Team</h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Roster of internal staff assigned to execute this event</p>
                    </div>
                    {showRosterButton && (
                      <button
                        onClick={() => setShowRosterModal(true)}
                        className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                      >
                        Assign Staff
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    {(!event.assignedStaff || event.assignedStaff.length === 0) ? (
                      <div className="py-12 text-center text-xs text-slate-450 dark:text-slate-500 italic">
                        No staff have been assigned to this event yet.
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-wider font-bold">
                            <th className="py-3 px-4">Name</th>
                            <th className="py-3 px-4">Role</th>
                            <th className="py-3 px-4">Assigned Event</th>
                            <th className="py-3 px-4">Status</th>
                            {showRosterButton && <th className="py-3 px-4 text-right">Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {event.assignedStaff.map(s => {
                            let statusLabel = 'Assigned';
                            let badgeClass = 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/40';
                            
                            const statusLower = (s.status || '').toLowerCase();
                            if (event.status === 'Completed') {
                              statusLabel = 'Completed';
                              badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/40';
                            } else if (event.status === 'In Progress' || statusLower === 'present') {
                              statusLabel = 'In Progress';
                              badgeClass = 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/20 dark:text-amber-455 dark:border-amber-900/40';
                            } else {
                              statusLabel = 'Assigned';
                              badgeClass = 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/40';
                            }

                            return (
                              <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">{s.staff_name}</td>
                                <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-medium capitalize">{s.staff_role}</td>
                                <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-medium">{event.name}</td>
                                <td className="py-3.5 px-4">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${badgeClass}`}>
                                    {statusLabel}
                                  </span>
                                </td>
                                {showRosterButton && (
                                  <td className="py-3.5 px-4 text-right">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (confirm(`Are you sure you want to remove ${s.staff_name} from this event?`)) {
                                          removeStaffMutation.mutate(s.resource_id);
                                        }
                                      }}
                                      className="text-rose-500 hover:text-rose-600 font-semibold cursor-pointer text-xs transition-colors"
                                    >
                                      Remove Staff
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              ) : (
                <div className="glass-card p-6 bg-white dark:bg-[#111C30]/40 space-y-6">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-150 dark:border-slate-855">
                    <div>
                      <h3 className="text-sm font-bold text-slate-855 dark:text-slate-200">Assigned Roster Crew</h3>
                      <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-0.5">Manage partner vendor arrivals and check in rostered staff</p>
                    </div>
                    {showRosterButton && (
                      <button
                        onClick={() => setShowRosterModal(true)}
                        className="text-xs text-sky-500 hover:text-sky-600 font-bold cursor-pointer transition-colors bg-sky-500/10 px-3 py-1.5 rounded-xl border border-sky-500/20"
                      >
                        Manage Roster
                      </button>
                    )}
                  </div>

                  {/* Assigned Vendors Arrivals */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-sky-555 animate-pulse" />
                      <span>Vendor Check-ins</span>
                    </h4>
                    {(!event.assignedVendors || event.assignedVendors.length === 0) ? (
                      <p className="text-xs text-slate-500 pl-6 italic">No vendors assigned to this event.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {event.assignedVendors.map(v => (
                          <div key={v.id} className="p-4 bg-slate-55 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-2xl flex flex-col gap-3 text-xs transition-colors">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-slate-800 dark:text-slate-250">{v.vendor_name}</p>
                                <span className="text-[10px] text-slate-500 dark:text-slate-405 font-medium capitalize">{v.vendor_category}</span>
                              </div>
                              
                              <select
                                value={v.status || 'Confirmed'}
                                onChange={(e) => assignmentStatusMutation.mutate({ assignmentId: v.id, status: e.target.value })}
                                className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase border cursor-pointer outline-none ${
                                  v.status === 'Arrived' ? 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-450' :
                                  'bg-amber-50 text-amber-707 border-amber-250 dark:bg-amber-955/20 dark:text-amber-455'
                                }`}
                              >
                                <option value="Confirmed">Pending</option>
                                <option value="Arrived">Arrived</option>
                              </select>
                            </div>

                            {v.vendor_phone && (
                              <div className="flex items-center gap-2 border-t border-slate-150 dark:border-slate-850 pt-2">
                                <button
                                  onClick={() => window.location.href = `tel:${v.vendor_phone}`}
                                  className="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                                >
                                  📞 Call
                                </button>
                                <button
                                  onClick={() => {
                                    const message = `Hello ${v.vendor_name},\n\nHope setup is going well for "${event.name}". Please confirm your status.\n\nSLV Events`;
                                    window.open(`https://wa.me/${v.vendor_phone}?text=${encodeURIComponent(message)}`, "_blank");
                                  }}
                                  className="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-205 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-355 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                                >
                                  💬 WhatsApp
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Assigned Staff Attendance check-ins */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-500" />
                      <span>Internal Staff Attendance</span>
                    </h4>
                    {(!event.assignedStaff || event.assignedStaff.length === 0) ? (
                      <p className="text-xs text-slate-500 pl-6 italic">No staff rostered to this event.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {event.assignedStaff.map(s => (
                          <div key={s.id} className="p-4 bg-slate-55 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-2xl flex flex-col gap-3 text-xs transition-colors">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-slate-800 dark:text-slate-250">{s.staff_name}</p>
                                <span className="text-[10px] text-slate-555 dark:text-slate-400 font-medium capitalize">{s.staff_role}</span>
                              </div>
                              
                              <select
                                value={s.status || 'Confirmed'}
                                onChange={(e) => assignmentStatusMutation.mutate({ assignmentId: s.id, status: e.target.value })}
                                className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase border cursor-pointer outline-none ${
                                  s.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-450' :
                                  s.status === 'Absent' ? 'bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-955/20 dark:text-rose-455' :
                                  'bg-sky-50 text-sky-700 border-sky-250 dark:bg-sky-950/20 dark:text-sky-450'
                                }`}
                              >
                                <option value="Confirmed">Confirmed</option>
                                <option value="Present">Present</option>
                                <option value="Absent">Absent</option>
                              </select>
                            </div>

                            {s.staff_phone && (
                              <div className="flex items-center gap-2 border-t border-slate-150 dark:border-slate-850 pt-2">
                                <button
                                  onClick={() => window.location.href = `tel:${s.staff_phone}`}
                                  className="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-805 text-slate-705 dark:text-slate-350 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                                >
                                  📞 Call
                                </button>
                                <button
                                  onClick={() => {
                                    const message = `Hello ${s.staff_name},\n\nPlease report to "${event.name}" venue by setup time.\n\nSLV Events`;
                                    window.open(`https://wa.me/${s.staff_phone}?text=${encodeURIComponent(message)}`, "_blank");
                                  }}
                                  className="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-355 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                                >
                                  💬 WhatsApp
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            )}

            {/* Inventory Allocation Tab */}
            {activeTab === 'inventory' && (
              <div className="glass-card p-6 bg-white dark:bg-[#111C30]/40 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-855 dark:text-slate-200">Event Inventory Allocation</h3>
                  <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-0.5">Allocate furniture, technical stage equipment, and lights from warehouse logs</p>
                </div>

                {/* Allocation Form (Only for Ops Lead/Admin) */}
                {(isOps || isAdmin) && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!allocatingItem.itemId) return;
                      const selectedItem = globalInventory.find(item => item.id === parseInt(allocatingItem.itemId));
                      if (!selectedItem) return;

                      // Check warehouse limit
                      if (selectedItem.available_quantity < allocatingItem.quantity) {
                        addToast(`Only ${selectedItem.available_quantity} available in stock!`, 'error');
                        return;
                      }

                      const currentAllocation = event.inventory || [];
                      const existingIdx = currentAllocation.findIndex(item => item.itemId === selectedItem.id);
                      let updatedAllocation = [];

                      if (existingIdx !== -1) {
                        updatedAllocation = currentAllocation.map((item, idx) =>
                          idx === existingIdx
                            ? { ...item, allocatedQty: item.allocatedQty + parseInt(allocatingItem.quantity) }
                            : item
                        );
                      } else {
                        updatedAllocation = [
                          ...currentAllocation,
                          {
                            itemId: selectedItem.id,
                            itemName: selectedItem.item_name,
                            allocatedQty: parseInt(allocatingItem.quantity),
                            returnedQty: 0,
                            damagedQty: 0,
                            status: 'Allocated'
                          }
                        ];
                      }

                      inventoryAllocationMutation.mutate(updatedAllocation);
                      setAllocatingItem({ itemId: '', quantity: 1 });
                    }}
                    className="flex flex-col sm:flex-row gap-3 bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-150 dark:border-slate-850 rounded-2xl text-xs"
                  >
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Select Warehouse Item</label>
                      <select
                        value={allocatingItem.itemId}
                        onChange={(e) => setAllocatingItem(prev => ({ ...prev, itemId: e.target.value }))}
                        className="form-input cursor-pointer pr-8 outline-none"
                      >
                        <option value="">-- Select Item --</option>
                        {globalInventory.map(i => (
                          <option key={i.id} value={i.id}>{i.item_name} (Stock: {i.available_quantity})</option>
                        ))}
                      </select>
                    </div>

                    <div className="w-full sm:w-28">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={allocatingItem.quantity}
                        onChange={(e) => setAllocatingItem(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="form-input"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={inventoryAllocationMutation.isPending}
                      className="self-end px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer transition-colors"
                    >
                      Allocate Stock
                    </button>
                  </form>
                )}

                {/* Allocated Inventory Table list */}
                <div className="overflow-x-auto">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>Allocated Qty</th>
                        <th>Returned Qty</th>
                        <th>Damaged Qty</th>
                        <th>Status</th>
                        {isOps && <th className="text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(!event.inventory || event.inventory.length === 0) ? (
                        <tr>
                          <td colSpan={isOps ? 6 : 5} className="text-center py-8 text-slate-500 italic">No inventory allocated to this event.</td>
                        </tr>
                      ) : (
                        event.inventory.map((item) => (
                          <tr key={item.itemId}>
                            <td className="font-bold text-slate-805 dark:text-slate-350">{item.itemName}</td>
                            <td className="font-semibold text-slate-700 dark:text-slate-300">{item.allocatedQty}</td>
                            <td>{item.returnedQty || 0}</td>
                            <td className={item.damagedQty > 0 ? 'text-rose-500 font-bold' : ''}>{item.damagedQty || 0}</td>
                            <td>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                                item.status === 'Returned' ? 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-450' :
                                item.status === 'Damaged' ? 'bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-955/20 dark:text-rose-455' :
                                'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/20 dark:text-sky-450'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            {isOps && (
                              <td className="text-right flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    const qty = parseInt(prompt(`How many items returned? (Max: ${item.allocatedQty})`, item.allocatedQty));
                                    if (isNaN(qty) || qty < 0 || qty > item.allocatedQty) return;
                                    
                                    const updated = event.inventory.map(i =>
                                      i.itemId === item.itemId
                                        ? { ...i, returnedQty: qty, status: qty === item.allocatedQty ? 'Returned' : 'Allocated' }
                                        : i
                                    );
                                    inventoryAllocationMutation.mutate(updated);
                                  }}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-205 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-lg text-[9px] font-bold cursor-pointer border dark:border-slate-800"
                                >
                                  ↩ Return
                                </button>
                                <button
                                  onClick={() => {
                                    const qty = parseInt(prompt(`How many items damaged? (Max: ${item.allocatedQty - (item.returnedQty || 0)})`, "0"));
                                    if (isNaN(qty) || qty < 0 || qty > (item.allocatedQty - (item.returnedQty || 0))) return;
                                    
                                    const updated = event.inventory.map(i =>
                                      i.itemId === item.itemId
                                        ? { ...i, damagedQty: qty, status: qty > 0 ? 'Damaged' : i.status }
                                        : i
                                    );
                                    inventoryAllocationMutation.mutate(updated);
                                    
                                    // If damaged items exist, log an incident alert automatically
                                    if (qty > 0) {
                                      reportIncidentMutation.mutate({
                                        category: 'Equipment Failure',
                                        details: `🚨 Damaged Inventory: ${qty} units of "${item.itemName}" reported damaged during event execution.`
                                      });
                                    }
                                  }}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/20 text-rose-700 dark:text-rose-455 rounded-lg text-[9px] font-bold cursor-pointer border border-rose-200 dark:border-rose-900/40"
                                >
                                  ⚠️ Damaged
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Operations Log Tab */}
            {activeTab === 'logs' && (
              <div className="glass-card p-6 bg-white dark:bg-[#111C30]/40 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left: Log Notes & Incidents List */}
                  <div className="md:col-span-8 space-y-4">
                    <h3 className="text-sm font-bold text-slate-855 dark:text-slate-200 pb-2 border-b border-slate-150 dark:border-slate-850 flex items-center gap-2">
                      <Clock className="w-4.5 h-4.5 text-indigo-500" />
                      <span>Timestamped Execution Feed</span>
                    </h3>

                    <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                      {(!event.ops_logs || event.ops_logs.length === 0) ? (
                        <p className="text-xs text-slate-500 text-center py-12 italic">No operational logs recorded. Submit a note to begin logs.</p>
                      ) : (
                        [...event.ops_logs].reverse().map((log) => (
                          <div
                            key={log.id}
                            className={`p-4 border rounded-2xl text-xs space-y-1.5 transition-colors ${
                              log.type === 'Incident'
                                ? 'bg-rose-50/50 border-rose-200 dark:bg-rose-955/10 dark:border-rose-900'
                                : 'bg-slate-50/80 border-slate-200 dark:bg-slate-950/40 dark:border-slate-850'
                            }`}
                          >
                            <div className="flex justify-between items-center text-[10px] text-slate-505 font-bold uppercase">
                              <span className="flex items-center gap-1">
                                {log.type === 'Incident' ? (
                                  <>
                                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                                    <span className="text-rose-605 dark:text-rose-455">Incident Reported ({log.category})</span>
                                  </>
                                ) : (
                                  <>
                                    <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                                    <span className="text-slate-600 dark:text-slate-400">Log Note</span>
                                  </>
                                )}
                              </span>
                              <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(log.timestamp).toLocaleDateString('en-GB')})</span>
                            </div>
                            <p className="text-slate-800 dark:text-slate-250 leading-relaxed font-semibold">{log.details}</p>
                            <div className="text-[10px] text-slate-450 dark:text-slate-455 font-medium flex justify-between pt-1 border-t border-slate-100 dark:border-slate-850/50">
                              <span>Logged By: <strong className="text-slate-655 dark:text-slate-350">{log.user}</strong></span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right: Forms */}
                  <div className="md:col-span-4 space-y-6">
                    {/* Add note */}
                    <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 p-4 rounded-2xl text-xs space-y-3">
                      <h4 className="font-bold text-slate-855 dark:text-slate-200 flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-indigo-500" />
                        <span>Add Operational Note</span>
                      </h4>
                      <textarea
                        placeholder="Type setup update or general note..."
                        value={logNote}
                        onChange={(e) => setLogNote(e.target.value)}
                        className="form-input h-20 resize-none py-1.5 outline-none"
                      />
                      <button
                        onClick={() => {
                          if (!logNote.trim()) return;
                          addOpsLogMutation.mutate(logNote);
                        }}
                        disabled={addOpsLogMutation.isPending || !logNote.trim()}
                        className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl shadow-sm transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
                      >
                        Add Log Note
                      </button>
                    </div>

                    {/* Report Incident */}
                    <div className="bg-rose-50/20 dark:bg-rose-955/5 border border-rose-200 dark:border-rose-900/60 p-4 rounded-2xl text-xs space-y-3">
                      <h4 className="font-bold text-rose-700 dark:text-rose-455 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" />
                        <span>Report Incident Alert</span>
                      </h4>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-455 uppercase mb-1">Issue Category</label>
                        <select
                          value={incidentForm.category}
                          onChange={(e) => setIncidentForm(prev => ({ ...prev, category: e.target.value }))}
                          className="form-input cursor-pointer pr-8 py-1.5 outline-none"
                        >
                          <option value="Vendor Delay">Vendor Delay</option>
                          <option value="Equipment Failure">Equipment Failure</option>
                          <option value="Staff Shortage">Staff Shortage</option>
                          <option value="Logistics Issue">Logistics Issue</option>
                          <option value="Emergency Incident">Emergency Incident</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-455 uppercase mb-1">Description Details</label>
                        <textarea
                          placeholder="Details of delay or failure..."
                          value={incidentForm.details}
                          onChange={(e) => setIncidentForm(prev => ({ ...prev, details: e.target.value }))}
                          className="form-input h-20 resize-none py-1.5 border-rose-200 focus:border-rose-400 focus:ring-rose-200 outline-none"
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (!incidentForm.details.trim()) return;
                          reportIncidentMutation.mutate(incidentForm);
                        }}
                        disabled={reportIncidentMutation.isPending || !incidentForm.details.trim()}
                        className="w-full py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl shadow-sm transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
                      >
                        File Incident Alert
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Photo Gallery & Post-Event Media Tab */}
            {activeTab === 'media' && (
              <div className="glass-card p-6 bg-white dark:bg-[#111C30]/40 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-855 dark:text-slate-200">Post-Event Summary & Gallery</h3>
                  <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-0.5">Upload mock photos and log post-event completion briefs once event is concluded</p>
                </div>

                {/* Upload Simulated Photo & Notes */}
                {(isOps || isAdmin) && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-55/40 dark:bg-slate-950/40 p-5 border border-slate-150 dark:border-slate-850 rounded-2xl text-xs">
                    <div className="md:col-span-8 space-y-3">
                      <label className="block text-[11px] font-bold text-slate-550 uppercase tracking-wide">Event Concluding summary</label>
                      <textarea
                        placeholder="Write summary notes (guests feedback, caterer evaluations, anchor reviews, teardown status)..."
                        value={completionNotes}
                        onChange={(e) => setCompletionNotes(e.target.value)}
                        className="form-input h-24 py-2 resize-none outline-none"
                      />
                    </div>
                    
                    <div className="md:col-span-4 flex flex-col justify-between gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-550 uppercase tracking-wide mb-1.5">Add Gallery Photo</label>
                        <button
                          type="button"
                          onClick={() => {
                            // Pick a random beautiful image link for mock demo
                            const mockImages = [
                              'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=600',
                              'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&q=80&w=600',
                              'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&q=80&w=600',
                              'https://images.unsplash.com/photo-1478147427282-58a87a120781?auto=format&fit=crop&q=80&w=600'
                            ];
                            const randomImg = mockImages[Math.floor(Math.random() * mockImages.length)];
                            const currentPhotos = event.photos || [];
                            const updatedPhotos = [
                              ...currentPhotos,
                              {
                                id: Date.now(),
                                url: randomImg,
                                uploadedAt: new Date().toISOString()
                              }
                            ];
                            postEventMutation.mutate({ notes: '', photos: updatedPhotos });
                          }}
                          disabled={postEventMutation.isPending}
                          className="w-full border border-dashed border-slate-300 dark:border-slate-800 hover:border-sky-505 py-6 rounded-xl flex flex-col justify-center items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Upload className="w-6 h-6 text-slate-400" />
                          <span className="text-[10px] text-slate-405 font-bold">Simulate Photo Upload</span>
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          if (!completionNotes.trim()) return;
                          postEventMutation.mutate({ notes: completionNotes, photos: event.photos || [] });
                        }}
                        disabled={postEventMutation.isPending || !completionNotes.trim()}
                        className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs shadow-sm transition-all active:scale-[0.99] cursor-pointer"
                      >
                        Save Completion Brief
                      </button>
                    </div>
                  </div>
                )}

                {/* Media Gallery display */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Camera className="w-4 h-4 text-sky-500" />
                    <span>Post-Event Media Gallery</span>
                  </h4>
                  
                  {(!event.photos || event.photos.length === 0) ? (
                    <div className="border border-slate-200 dark:border-slate-850 p-12 text-center text-slate-500 italic rounded-2xl text-xs">
                      No photos uploaded for this event.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {event.photos.map((p) => (
                        <div key={p.id} className="relative group overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-850 aspect-video bg-slate-100 transition-all shadow-sm">
                          <img src={p.url} alt="Event update" className="w-full h-full object-cover animate-fade-in" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center text-[9px] text-white">
                            <span>Uploaded {new Date(p.uploadedAt).toLocaleDateString('en-GB')}</span>
                          </div>
                          {(isOps || isAdmin) && (
                            <button
                              onClick={() => {
                                if (!window.confirm('Delete this photo?')) return;
                                const updated = event.photos.filter(photo => photo.id !== p.id);
                                postEventMutation.mutate({ notes: '', photos: updated });
                              }}
                              className="absolute top-2 right-2 p-1 bg-red-650 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105 active:scale-95 cursor-pointer shadow-md"
                              title="Delete Photo"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          </div>

        {/* Right Side: Contact Cards & Budget Dashboard */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Client contact card */}
          <div className="glass-card p-6 bg-white dark:bg-gradient-to-tr dark:from-slate-900 dark:to-indigo-950/20 border-slate-200 dark:border-slate-850">
            <h3 className="text-xs font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-4">Client Contact Profile</h3>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sky-600 dark:text-sky-400 uppercase text-sm border border-slate-200 dark:border-slate-700 transition-colors">
                {event.client_name?.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">{event.client_name}</h4>
                <p className="text-[10px] text-slate-450 dark:text-slate-400 font-medium">Client ID: #{event.client_id}</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-705 dark:text-slate-350 border-t border-slate-150 dark:border-slate-850 pt-4 transition-colors">
              <div className="flex justify-between">
                <span className="text-slate-455 dark:text-slate-450 font-medium">Phone:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-250">{event.client_phone}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 mb-1">
                <button
                  onClick={() => window.location.href = `tel:${event.client_phone}`}
                  className="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  📞 Call
                </button>
                <button
                  onClick={() => {
                    const message = `Hello,\n\nYour event planning is currently in progress.\n\nThank you for choosing SLV Events.`;
                    window.open(`https://wa.me/${event.client_phone}?text=${encodeURIComponent(message)}`, "_blank");
                  }}
                  className="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  💬 WhatsApp
                </button>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 dark:text-slate-455 font-medium">Email:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-250 truncate max-w-[150px]" title={event.client_email}>{event.client_email || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Budget Financials card */}
          <div className="glass-card p-6 bg-white dark:bg-[#111C30]/40">
            <h3 className="text-xs font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-violet-500 dark:text-violet-400 shrink-0" />
              <span>Budget Ledger Summary</span>
            </h3>

            <div className="space-y-4">
              {/* Invoicing info */}
              <div className="bg-slate-50 dark:bg-slate-950/60 p-4 border border-slate-200 dark:border-slate-850 rounded-2xl transition-colors">
                <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300">
                  <span className="text-slate-450 dark:text-slate-450">Contract Value:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">₹{parseFloat(event.budget).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs mt-2 text-slate-650 dark:text-slate-400">
                  <span>Advance Paid:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{parseFloat(clientPayment.advance).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs mt-2 border-t border-slate-200 dark:border-slate-850 pt-2 font-semibold text-slate-700 dark:text-slate-300">
                  <span>Pending Invoice:</span>
                  <span className={parseFloat(clientPayment.balance) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-400'}>
                    ₹{parseFloat(clientPayment.balance).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Vendor Allocations */}
              <div className="text-xs space-y-2">
                <div className="flex justify-between text-slate-650 dark:text-slate-400">
                  <span>Vendor Cost Allocated:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">₹{totalVendorAllocated.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between font-bold text-slate-750 dark:text-slate-350 border-t border-slate-150 dark:border-slate-850 pt-2 text-[11px] transition-colors">
                  <span>Est. Gross Margin:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {event.budget > 0 
                      ? `${Math.round(((event.budget - totalVendorAllocated) / event.budget) * 100)}%` 
                      : '0%'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
      {showRosterModal && (
        <AssignmentModal
          event={event}
          onClose={() => {
            setShowRosterModal(false);
            queryClient.invalidateQueries({ queryKey: ['eventDetail', id] });
          }}
        />
      )}
    </div>
  );
};

export default EventDetail;
