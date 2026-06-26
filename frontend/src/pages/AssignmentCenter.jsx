import { useState } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Briefcase,
  Users,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  MapPin,
  AlertCircle,
  UserCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Mail,
  Phone,
  ShieldAlert,
  Plus
} from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import AssignmentModal from '../components/AssignmentModal';

const AssignmentCenter = () => {
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();

  // Simplified Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(false);

  // Modal and Expanded States
  const [activeAssignEvent, setActiveAssignEvent] = useState(null);
  const [expandedConflicts, setExpandedConflicts] = useState({});

  // 1. Fetch live events list
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events-all'],
    queryFn: async () => {
      const res = await axios.get('/events');
      return res.data;
    }
  });

  // 2. Fetch live assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['assignments-all'],
    queryFn: async () => {
      const res = await axios.get('/assignments');
      return res.data || [];
    }
  });

  // 3. Fetch live vendors
  const { data: vendorsList = [] } = useQuery({
    queryKey: ['vendors-all'],
    queryFn: async () => {
      const res = await axios.get('/vendors');
      return res.data;
    }
  });

  // 4. Fetch live staff
  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-all'],
    queryFn: async () => {
      const res = await axios.get('/staff');
      return res.data;
    }
  });

  // 5. Fetch conflicts
  const { data: conflictsList = [], refetch: refetchConflicts } = useQuery({
    queryKey: ['conflicts'],
    queryFn: async () => {
      const res = await axios.get('/assignments/conflicts');
      return res.data;
    }
  });

  // Safe Array conversion to handle unexpected non-array formats defensively
  const eventsArray = (Array.isArray(events) ? events : []).filter(e => !e.status || (e.status.toLowerCase() !== 'new' && e.status.toLowerCase() !== 'rejected'));
  const assignmentsArray = Array.isArray(assignments) ? assignments : [];
  const vendorsArray = Array.isArray(vendorsList) ? vendorsList : [];
  const staffArray = Array.isArray(staffList) ? staffList : [];
  const conflictsArray = Array.isArray(conflictsList) ? conflictsList : [];

  // Helper to resolve detailed conflicts info for an event
  const getConflictDetails = (event) => {
    if (!event.event_date) {
      return { conflicts: [], count: 0, status: 'No Conflict', color: 'Green' };
    }

    let eventDateStr;
    try {
      eventDateStr = new Date(event.event_date).toISOString().split('T')[0];
    } catch (e) {
      return { conflicts: [], count: 0, status: 'No Conflict', color: 'Green' };
    }
    
    // Find all conflicts matching the date and involving this event
    const eventConflicts = conflictsArray.filter(c => {
      if (!c.date) return false;
      let conflictDateStr;
      try {
        conflictDateStr = new Date(c.date).toISOString().split('T')[0];
      } catch (e) {
        return false;
      }
      if (conflictDateStr !== eventDateStr) return false;
      return c.events && c.events.some(ev => ev.id === event.id);
    });

    const count = eventConflicts.length;

    // Check if any of these conflicts involves a key resource
    const hasKeyResourceOverlap = eventConflicts.some(c => {
      if (c.resourceType === 'Vendor') {
        const vendor = vendorsArray.find(v => v.name === c.resourceName);
        return vendor && ['Decorator', 'Caterer', 'Photographer'].includes(vendor.category);
      } else if (c.resourceType === 'Staff') {
        const staff = staffArray.find(s => s.name === c.resourceName);
        return staff && ['Supervisor', 'Coordinator'].includes(staff.role);
      }
      return false;
    });

    let status = 'No Conflict';
    let color = 'Green'; // Green, Orange, Red

    if (count > 0) {
      if (count >= 2 || hasKeyResourceOverlap) {
        status = 'Conflict';
        color = 'Red';
      } else {
        status = 'Warning: 1 conflict';
        color = 'Orange';
      }
    }

    return {
      conflicts: eventConflicts,
      count,
      status,
      color
    };
  };

  // Map events to include resolved resources, stage checklists, and conflict details
  const mappedEvents = eventsArray.map(event => {
    const eventAssignments = assignmentsArray.filter(a => a.event_id === event.id);
    
    // Resolve detailed vendor models
    const assignedVendors = eventAssignments
      .filter(a => a.resource_type === 'vendor')
      .map(a => {
        const vendor = vendorsArray.find(v => v.id === a.resource_id);
        return {
          assignmentId: a.id,
          resourceId: a.resource_id,
          name: vendor ? vendor.name : `Vendor #${a.resource_id}`,
          category: vendor ? vendor.category : 'Unknown',
          phone: vendor ? vendor.phone : '',
          email: vendor ? vendor.email : ''
        };
      });

    // Resolve detailed staff models
    const assignedStaff = eventAssignments
      .filter(a => a.resource_type === 'staff')
      .map(a => {
        const staff = staffArray.find(s => s.id === a.resource_id);
        return {
          assignmentId: a.id,
          resourceId: a.resource_id,
          name: staff ? staff.name : `Staff #${a.resource_id}`,
          role: staff ? staff.role : 'Unknown',
          phone: staff ? staff.phone : ''
        };
      });

    // Check completeness
    const requiredVendors = ['Decorator', 'Caterer', 'Photographer', 'Anchor', 'Sound Team', 'Lighting'];
    const requiredStaff = ['Supervisor', 'Coordinator', 'Technician', 'Helper'];

    const hasAllVendors = requiredVendors.every(cat => assignedVendors.some(v => v.category === cat));
    const hasAllStaff = requiredStaff.every(role => assignedStaff.some(s => s.role === role));

    const conflictInfo = getConflictDetails(event);

    return {
      ...event,
      assignedVendors,
      assignedStaff,
      conflictInfo,
      hasAllVendors,
      hasAllStaff
    };
  });

  // Filter events based on simplified filters
  const filteredEvents = mappedEvents.filter(event => {
    // 1. Search by Event Name
    const matchesName = (event.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. Date Range
    let eventTimeMs = 0;
    try {
      eventTimeMs = event.event_date ? new Date(event.event_date).getTime() : 0;
    } catch (e) {}

    const startRangeMs = startDate ? new Date(startDate).getTime() : null;
    const endRangeMs = endDate ? new Date(endDate).getTime() : null;
    
    const matchesDateRange = (!startRangeMs || eventTimeMs >= startRangeMs) &&
                             (!endRangeMs || eventTimeMs <= endRangeMs);

    // 3. Upcoming Events Only
    let matchesUpcoming = true;
    if (showUpcomingOnly) {
      const todayStr = new Date().toISOString().split('T')[0];
      matchesUpcoming = (event.event_date || '') >= todayStr;
    }

    return matchesName && matchesDateRange && matchesUpcoming;
  });

  // Mutation to delete a specific assignment directly
  const removeAssignmentMutation = useMutation({
    mutationFn: async ({ eventId, resourceType, resourceId }) => {
      await axios.post('/assignments/delete', {
        eventId,
        resourceType,
        resourceId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments-all'] });
      queryClient.invalidateQueries({ queryKey: ['events-all'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardKpi'] });
      queryClient.invalidateQueries({ queryKey: ['conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      addToast('Assignment removed successfully.');
    },
    onError: () => {
      addToast('Error removing assignment.', 'error');
    }
  });

  const handleRemoveAssignment = (eventId, resourceType, resourceId) => {
    removeAssignmentMutation.mutate({ eventId, resourceType, resourceId });
  };

  // Click handler to update manual workflow stage with toggle and uncheck-dependency rules
  const handleStageClick = async (event, clickedStageNum) => {
    const currentStage = event.workflow_stage || 0;

    // Stop workflow progression after cancellation
    if (currentStage === 6 && clickedStageNum !== 6) {
      addToast('Workflow locked. Uncheck the Cancelled Event stage first to proceed.', 'warning');
      return;
    }

    let newStage;
    if (currentStage >= clickedStageNum) {
      // Toggle Off: clicked stage and all stages after it become unchecked
      newStage = clickedStageNum - 1;
    } else {
      // Toggle On: clicked stage and all stages before it become checked
      newStage = clickedStageNum;
    }

    let newStatus = event.status;
    let newNotes = event.notes || '';

    if (newStage === 6) {
      // Prompt for cancellation reason
      const reason = prompt('Please enter the reason for event cancellation:');
      if (reason === null) return; // Cancel click
      newStatus = 'Cancelled';
      newNotes = `${newNotes}\nCancellation Reason: ${reason}`.trim();
    } else if (newStage === 5) {
      newStatus = 'Completed';
    } else if (newStage === 4) {
      newStatus = 'Ready';
    } else if (newStage >= 2) {
      newStatus = 'In Progress';
    } else if (newStage === 1) {
      newStatus = 'Confirmed';
    } else {
      newStatus = 'Pending';
    }

    try {
      const payload = {
        workflow_stage: newStage,
        status: newStatus,
        notes: newNotes,
        workflow_mode: 'Manual' // Locked into manual as toggles are removed
      };

      await axios.put(`/events/${event.id}`, payload);
      queryClient.invalidateQueries({ queryKey: ['events-all'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardKpi'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      if (currentStage >= clickedStageNum) {
        addToast(`Stage ${clickedStageNum} and subsequent stages unchecked.`);
      } else {
        addToast(`Workflow stage updated to Stage ${newStage}.`);
      }
    } catch (err) {
      console.error('Error updating stage:', err);
      addToast('Failed to update workflow stage.', 'error');
    }
  };

  const toggleConflictDetails = (eventId) => {
    setExpandedConflicts(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  // Badges utility style resolver
  const getConflictBadgeStyles = (color) => {
    if (color === 'Red') return 'bg-rose-50 border-rose-200 text-rose-700 glow-red animate-unread-pulse';
    if (color === 'Orange') return 'bg-amber-50 border-amber-200 text-amber-700 glow-orange';
    return 'bg-emerald-50 border-emerald-250 text-emerald-700';
  };

  const getStatusBadgeStyles = (status) => {
    const s = status?.toLowerCase() || '';
    if (s === 'cancelled') return 'bg-rose-50 border-rose-200 text-rose-700 font-bold';
    if (s === 'completed') return 'bg-indigo-50 border-indigo-200 text-indigo-700';
    if (s === 'ready') return 'bg-emerald-50 border-emerald-200 text-emerald-750 font-bold';
    if (s === 'in progress') return 'bg-amber-50 border-amber-200 text-amber-700';
    if (s === 'confirmed') return 'bg-sky-50 border-sky-200 text-sky-700';
    return 'bg-slate-100 border-slate-200 text-slate-500';
  };

  if (eventsLoading || assignmentsLoading) {
    return (
      <div className="flex-1 py-20 text-center flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-sky-500 animate-spin" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Assignment System...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-8 pr-2">
      {/* Top Banner and KPI Summary Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm transition-all duration-300">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 font-outfit">
            <UserCheck className="w-6 h-6 text-sky-500" />
            <span>Workflow & Assignment Center</span>
          </h2>
          <p className="text-xs text-slate-550 mt-1">Manage vendor checklists, internal staff availability, and track progress with clickable stages.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-700">
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-150 rounded-xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Pending: {mappedEvents.filter(e => e.status === 'Pending').length}</span>
          </div>
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Ready: {mappedEvents.filter(e => e.status === 'Ready').length}</span>
          </div>
          <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-150 text-indigo-800 rounded-xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <span>Completed: {mappedEvents.filter(e => e.status === 'Completed').length}</span>
          </div>
        </div>
      </div>

      {/* Simplified Filters Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-end gap-4">
        {/* Search Events */}
        <div className="flex-1 space-y-1">
          <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider font-outfit">Search Events</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-450">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="Search by event name only..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-9"
            />
          </div>
        </div>

        {/* Date Range: From Date */}
        <div className="w-full md:w-44 space-y-1">
          <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider font-outfit">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="form-input"
          />
        </div>

        {/* Date Range: To Date */}
        <div className="w-full md:w-44 space-y-1">
          <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider font-outfit">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="form-input"
          />
        </div>

        {/* Upcoming Events Filter */}
        <div className="flex items-center h-10 px-1 shrink-0 select-none">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showUpcomingOnly}
              onChange={(e) => setShowUpcomingOnly(e.target.checked)}
              className="accent-sky-500 w-4 h-4 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-700">Upcoming Events Only</span>
          </label>
        </div>
      </div>

      {/* Main Grid View of Event Cards */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white p-16 text-center border border-slate-200/60 rounded-2xl shadow-sm">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-sky-500 opacity-40 animate-pulse" />
          <p className="text-sm font-bold text-slate-800">No events found matching criteria</p>
          <p className="text-xs text-slate-400 mt-1">Try expanding your dates or clearing search strings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredEvents.map((event, idx) => {
              const conflictDetails = event.conflictInfo;
              const hasAllVendors = event.hasAllVendors;
              const hasAllStaff = event.hasAllStaff;

              const getStageFromStatus = (status) => {
                const s = status?.toLowerCase() || '';
                if (s === 'cancelled') return 6;
                if (s === 'completed') return 5;
                if (s === 'ready') return 4;
                if (s === 'in progress') return hasAllVendors ? 3 : 2;
                if (s === 'confirmed') return 1;
                return 0;
              };

              // Resolve stageVal, fallback to status mapped stage if stage is 0/null/undefined
              let stageVal = event.workflow_stage !== undefined && event.workflow_stage !== null ? parseInt(event.workflow_stage) : 0;
              if (stageVal === 0 && event.status && event.status.toLowerCase() !== 'pending') {
                stageVal = getStageFromStatus(event.status);
              }
              const progressPercent = Math.round((stageVal / 6) * 100);

              // Color-coded borders based on conflict severity
              let borderClass = 'border-slate-200 hover:border-sky-500/40 glow-blue';
              if (stageVal === 6) {
                borderClass = 'border-rose-250 hover:border-rose-500 glow-red';
              } else if (conflictDetails.color === 'Orange') {
                borderClass = 'border-amber-205 hover:border-amber-500/40 glow-orange';
              } else if (conflictDetails.color === 'Red') {
                borderClass = 'border-rose-250 hover:border-rose-500/40 glow-red animate-shake-conflict';
              }

              const fillBg = stageVal === 6 ? '#f43f5e' : '#0ea5e9';

              return (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border ${borderClass} shadow-sm hover:shadow-md transition-all duration-300 p-6 flex flex-col gap-6 stagger-${(idx % 6) + 1}`}
                >
                  {/* Card Header & Details */}
                  <div className="flex flex-col lg:flex-row justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/60">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight font-outfit">{event.name}</h3>
                        <span className={`px-2.5 py-0.5 border rounded-full text-[9px] font-extrabold uppercase tracking-wider ${getStatusBadgeStyles(event.status)}`}>
                          {event.status}
                        </span>
                        {/* Selected Workflow Status Name */}
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-355 px-2 py-0.5 rounded-md font-bold uppercase font-outfit">
                          Stage {stageVal}: {
                            stageVal === 6 ? 'Cancelled Event' :
                            stageVal === 5 ? 'Completed' :
                            stageVal === 4 ? 'Ready' :
                            stageVal === 3 ? 'Assign Staff' :
                            stageVal === 2 ? 'Assign Vendors' :
                            stageVal === 1 ? 'Confirmed Event' : 'Not Started'
                          }
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-semibold text-slate-500 bg-slate-50/40 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 p-4 rounded-xl mt-3">
                        <div className="flex flex-col gap-1 border-r border-slate-150 dark:border-slate-800/50 pr-4 last:border-0 last:pr-0">
                          <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 uppercase text-[9px] tracking-wider font-bold mb-0.5">Client Contact</span>
                          <span className="flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-sky-500 shrink-0" />
                            <span className="text-slate-750 dark:text-slate-200">{event.client_name}</span>
                          </span>
                          <div className="pl-5 space-y-0.5 text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                            {event.client_phone && <span className="flex items-center gap-1 hover:text-sky-500 transition-colors">📞 {event.client_phone}</span>}
                            {event.client_email && <span className="flex items-center gap-1 hover:text-sky-500 transition-colors">✉️ {event.client_email}</span>}
                          </div>
                        </div>

                        <div className="space-y-1 border-r border-slate-150 dark:border-slate-800/50 pr-4 last:border-0 last:pr-0">
                          <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 uppercase text-[9px] tracking-wider font-bold mb-0.5">Schedule Timing</span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-violet-500 shrink-0" />
                            <span className="text-slate-750 dark:text-slate-200">{new Date(event.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </span>
                          <span className="flex items-center gap-1.5 pl-5.5 text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
                            <Clock className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                            <span>{event.event_time || '10:00 AM - 04:00 PM'}</span>
                          </span>
                        </div>

                        <div className="space-y-1 last:border-0 last:pr-0">
                          <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 uppercase text-[9px] tracking-wider font-bold mb-0.5">Event Location</span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                            <span className="text-slate-750 dark:text-slate-200 truncate" title={event.venue}>{event.venue}</span>
                          </span>
                        </div>
                      </div>

                      {/* Notes / Cancellation Reason display */}
                      {event.status?.toLowerCase() === 'cancelled' ? (
                        <div className="p-4 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-200/50 dark:border-rose-900/35 border-l-4 border-l-rose-500 text-rose-700 dark:text-rose-400 text-xs rounded-r-2xl rounded-l-lg flex items-start gap-3 mt-4 shadow-sm animate-fade-in-up">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                          <div className="space-y-1">
                            <span className="font-bold text-[10px] uppercase tracking-wider block text-rose-600 dark:text-rose-400">Cancellation Reason</span>
                            <p className="leading-relaxed font-medium">{event.notes || 'No reason provided.'}</p>
                          </div>
                        </div>
                      ) : (
                        event.notes && (
                          <div className="p-4 bg-slate-50/60 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/60 border-l-4 border-l-sky-500 dark:border-l-sky-400 text-slate-650 dark:text-slate-300 text-xs rounded-r-2xl rounded-l-lg mt-4 leading-relaxed shadow-sm animate-fade-in-up">
                            <span className="font-bold text-[10px] uppercase tracking-wider block text-sky-600 dark:text-sky-450 mb-1">Planning Notes</span>
                            <p className="font-medium text-slate-600 dark:text-slate-300">{event.notes}</p>
                          </div>
                        )
                      )}
                    </div>

                    {/* Budget, Tracking Mode & Conflict Badges */}
                    <div className="flex flex-row lg:flex-col lg:items-end justify-between lg:justify-start gap-3.5 shrink-0">
                      {/* Budget */}
                      <div className="lg:text-right">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Est. Budget</span>
                        <span className="text-sm font-extrabold text-sky-600 font-sans block mt-0.5">₹{parseFloat(event.budget).toLocaleString()}</span>
                      </div>

                      {/* Conflict Badge */}
                      <span className={`px-2.5 py-1 border rounded-full text-[10px] font-extrabold flex items-center gap-1.5 uppercase ${getConflictBadgeStyles(conflictDetails.color)}`}>
                        {conflictDetails.color === 'Red' ? <ShieldAlert className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                        <span>{conflictDetails.status}</span>
                      </span>
                    </div>
                  </div>

                  {/* Clickable Step Progress Timeline */}
                  <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-xl p-4">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-4">
                      <span>Workflow Stage Progression</span>
                      <span className={`${stageVal === 6 ? 'text-rose-500 font-extrabold' : 'text-sky-655 font-bold'}`}>{progressPercent}% Completed</span>
                    </div>

                    <div className="relative flex justify-between items-start w-full">
                      {/* Track Background */}
                      <div className="absolute left-[3%] right-[3%] top-3.5 h-0.5 bg-slate-200 z-0" />
                      
                      {/* Active Track Fill */}
                      <motion.div 
                        className="absolute left-[3%] top-3.5 h-0.5 z-0"
                        animate={{ 
                          width: stageVal > 0 ? `${((stageVal - 1) / 5) * 94}%` : '0%',
                          backgroundColor: fillBg
                        }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                      />

                      {/* 6 Stage Node Indicators with Smooth Animations */}
                      {[
                        { num: 1, key: 'confirmed', label: 'Confirmed Event', desc: 'Booking verified' },
                        { num: 2, key: 'vendors', label: 'Assign Vendors', desc: 'Checklist source' },
                        { num: 3, key: 'staff', label: 'Assign Staff', desc: 'Roster crew' },
                        { num: 4, key: 'ready', label: 'Ready', desc: 'Checklists filled' },
                        { num: 5, key: 'completed', label: 'Completed', desc: 'Admin closed' },
                        { num: 6, key: 'cancelled', label: 'Cancelled Event', desc: 'Reason required' }
                      ].map((step) => {
                        const isFinished = stageVal >= step.num;
                        const isCurrent = stageVal === step.num;
                        const stepActiveBg = step.num === 6 ? '#f43f5e' : fillBg;
                        
                        return (
                          <div 
                            key={step.key} 
                            onClick={() => handleStageClick(event, step.num)}
                            className="flex flex-col items-center text-center w-[15%] z-10 cursor-pointer select-none group"
                          >
                            <motion.div 
                              animate={{
                                backgroundColor: isFinished ? stepActiveBg : "#ffffff",
                                borderColor: isFinished ? "transparent" : "#cbd5e1",
                                scale: isCurrent ? 1.06 : 1,
                                boxShadow: isCurrent ? `0 0 0 4px ${step.num === 6 ? 'rgba(244, 63, 94, 0.18)' : 'rgba(14, 165, 233, 0.18)'}` : "none"
                              }}
                              transition={{ duration: 0.25, ease: "easeInOut" }}
                              className="w-8 h-8 rounded-full border flex items-center justify-center text-slate-400 group-hover:border-sky-400 shadow-sm"
                            >
                              <AnimatePresence mode="wait">
                                {isFinished ? (
                                  <motion.div
                                    key="check"
                                    initial={{ scale: 0, rotate: -45 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    exit={{ scale: 0, rotate: 45 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                    className="text-white flex items-center justify-center"
                                  >
                                    <CheckCircle2 className="w-4.5 h-4.5" />
                                  </motion.div>
                                ) : (
                                  <motion.span
                                    key="num"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.15 }}
                                    className="text-xs font-bold text-slate-400 group-hover:text-sky-500 transition-colors"
                                  >
                                    {step.num}
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </motion.div>
                            <span className={`text-[10px] font-extrabold mt-2 uppercase tracking-wide group-hover:text-sky-600 transition-colors ${
                              isFinished 
                                ? (step.num === 6 ? 'text-rose-600 font-extrabold' : 'text-slate-700') 
                                : 'text-slate-400'
                            }`}>{step.label}</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5 font-medium leading-none group-hover:text-slate-500 transition-colors">{step.desc}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Checklist Summary (Vendors / Staff columns) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                    {/* Vendors Checklist */}
                    <div className="lg:col-span-6 space-y-3">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-1">
                        <span className="flex items-center gap-1.5 font-outfit">
                          <Briefcase className="w-3.5 h-3.5 text-sky-500" />
                          <span>Vendors Checklist</span>
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${hasAllVendors ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                          {event.assignedVendors.length} / 6 sourced
                        </span>
                      </h4>

                      <div className="grid grid-cols-1 gap-2">
                        {['Decorator', 'Caterer', 'Photographer', 'Anchor', 'Sound Team', 'Lighting'].map(cat => {
                          const assigned = event.assignedVendors.find(v => v.category === cat);
                          return (
                            <div key={cat} className="flex justify-between items-center p-2.5 bg-slate-50/50 border border-slate-150 rounded-xl text-xs">
                              <div className="overflow-hidden mr-2">
                                <span className="text-[9px] text-slate-400 uppercase font-bold block">{cat}</span>
                                {assigned ? (
                                  <span className="font-semibold text-slate-800 block truncate" title={assigned.name}>{assigned.name}</span>
                                ) : (
                                  <span className="text-rose-500 font-bold block mt-0.5">🚨 Empty assignment slot</span>
                                )}
                              </div>

                              {assigned ? (
                                <button
                                  onClick={() => handleRemoveAssignment(event.id, 'vendor', assigned.resourceId)}
                                  className="p-1 hover:bg-rose-50 border border-transparent hover:border-rose-100 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                                  title="Unassign vendor"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => setActiveAssignEvent(event)}
                                  className="px-2.5 py-1 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-500/50 text-sky-600 font-bold rounded-lg text-[9px] transition-all cursor-pointer"
                                >
                                  Source
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Staff Checklist */}
                    <div className="lg:col-span-6 space-y-3">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-1">
                        <span className="flex items-center gap-1.5 font-outfit">
                          <Users className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Crew Roster Checklist</span>
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${hasAllStaff ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                          {event.assignedStaff.filter(s => ['Supervisor', 'Coordinator', 'Technician'].includes(s.role) || s.role === 'Helper').length} / 4 roles filled
                        </span>
                      </h4>

                      <div className="grid grid-cols-1 gap-2">
                        {['Supervisor', 'Coordinator', 'Technician', 'Helper'].map(role => {
                          const matches = event.assignedStaff.filter(s => s.role === role);
                          const assigned = matches.length > 0 ? matches[0] : null;

                          return (
                            <div key={role} className="flex justify-between items-center p-2.5 bg-slate-50/50 border border-slate-150 rounded-xl text-xs">
                              <div className="overflow-hidden mr-2 flex-1">
                                <span className="text-[9px] text-slate-400 uppercase font-bold block">{role}</span>
                                {role === 'Helper' && matches.length > 0 ? (
                                  <span className="font-semibold text-slate-800 block truncate" title={matches.map(m => m.name).join(', ')}>
                                    {matches.map(m => m.name).join(', ')} ({matches.length})
                                  </span>
                                ) : assigned ? (
                                  <span className="font-semibold text-slate-800 block truncate" title={assigned.name}>{assigned.name}</span>
                                ) : (
                                  <span className="text-rose-500 font-bold block mt-0.5">🚨 Empty assignment slot</span>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                {role === 'Helper' && matches.length > 0 ? (
                                  <div className="flex items-center gap-1">
                                    {matches.map(h => (
                                      <button
                                        key={h.resourceId}
                                        onClick={() => handleRemoveAssignment(event.id, 'staff', h.resourceId)}
                                        className="p-1 hover:bg-rose-50 border border-transparent hover:border-rose-100 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                                        title={`Remove Helper: ${h.name}`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    ))}
                                    <button
                                      onClick={() => setActiveAssignEvent(event)}
                                      className="p-1 hover:bg-sky-50 border border-slate-200 hover:border-sky-555 text-sky-600 rounded-lg transition-all cursor-pointer font-bold text-[9px]"
                                      title="Add Helper"
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : assigned ? (
                                  <button
                                    onClick={() => handleRemoveAssignment(event.id, 'staff', assigned.resourceId)}
                                    className="p-1 hover:bg-rose-50 border border-transparent hover:border-rose-100 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                                    title="Unassign staff"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setActiveAssignEvent(event)}
                                    className="px-2.5 py-1 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-500/50 text-sky-600 font-bold rounded-lg text-[9px] transition-all cursor-pointer"
                                  >
                                    Source
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Overlaps Summary Drawer */}
                  {conflictDetails.count > 0 && (
                    <div className="border border-slate-150 rounded-xl p-3 bg-rose-50/20 text-xs">
                      <button
                        onClick={() => toggleConflictDetails(event.id)}
                        className="w-full flex justify-between items-center font-bold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-rose-500 animate-bounce" />
                          <span className="text-slate-800 font-outfit">Date Overlaps & Double Bookings ({conflictDetails.count})</span>
                        </span>
                        {expandedConflicts[event.id] ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                      </button>

                      <AnimatePresence>
                        {expandedConflicts[event.id] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mt-2 space-y-2 pt-2 border-t border-slate-200/50"
                          >
                            {conflictDetails.conflicts.map((c, i) => (
                              <div key={i} className="p-2 rounded-xl bg-white border border-slate-150 flex flex-col gap-1 shadow-inner animate-fade-in-up">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-slate-800">{c.resourceName} ({c.resourceType})</span>
                                  {c.resourcePhone && <span className="text-[10px] text-slate-500">📞 {c.resourcePhone}</span>}
                                </div>
                                <div className="text-[10px] text-slate-500 leading-normal">
                                  Assigned to: <strong className="text-slate-700">{c.events.map(ev => ev.name).join(' & ')}</strong> on this day ({new Date(c.date).toLocaleDateString('en-GB')})
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Edit Staffing Roster Consolidated Button */}
                  <div className="flex justify-end pt-2 border-t border-slate-100 mt-2">
                    <button
                      onClick={() => setActiveAssignEvent(event)}
                      className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs transition-colors shadow-sm hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center gap-1.5 font-outfit"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Manage Roster & Assignments</span>
                    </button>
                  </div>

                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Main Single-Source Assignment Roster Modal Popup */}
      <AnimatePresence>
        {activeAssignEvent && (
          <AssignmentModal
            event={activeAssignEvent}
            onClose={() => {
              setActiveAssignEvent(null);
              // Invalidate queries after modal closes to refresh cards state instantly
              queryClient.invalidateQueries({ queryKey: ['assignments-all'] });
              queryClient.invalidateQueries({ queryKey: ['events-all'] });
              queryClient.invalidateQueries({ queryKey: ['dashboardKpi'] });
              queryClient.invalidateQueries({ queryKey: ['conflicts'] });
              queryClient.invalidateQueries({ queryKey: ['notifications'] });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AssignmentCenter;
