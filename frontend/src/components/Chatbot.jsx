import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const generateBotResponse = async (userMessage, queryClient, navigate) => {
  const cleanInput = userMessage.toLowerCase();
  const msg = cleanInput;

  // Natural Language Matching: mapping synonyms to canonical terms
  const normalizeText = (text) => {
    let t = text.toLowerCase();
    
    // Event = Function = Program = Occasion
    t = t.replace(/\b(function|program|occasion)\b/g, 'event');
    t = t.replace(/\b(functions|programs|occasions)\b/g, 'events');
    
    // Vendor = Supplier = Service Provider
    t = t.replace(/\b(supplier|service provider)\b/g, 'vendor');
    t = t.replace(/\b(suppliers|service providers)\b/g, 'vendors');
    
    // Staff = Crew = Team = Personnel
    t = t.replace(/\b(crew|team|personnel)\b/g, 'staff');
    
    // Conflict = Issue = Clash = Double Booking
    t = t.replace(/\b(issue|clash|double booking)\b/g, 'conflict');
    t = t.replace(/\b(issues|clashes|double bookings)\b/g, 'conflicts');
    
    // Ready = Prepared = Event Ready
    t = t.replace(/\b(prepared|event ready)\b/g, 'ready');
    
    // Completed = Finished = Closed
    t = t.replace(/\b(finished|closed)\b/g, 'completed');
    
    // Pending = Waiting = In Progress
    t = t.replace(/\b(waiting|in progress)\b/g, 'pending');
    
    return t;
  };

  const norm = normalizeText(cleanInput);

  // 1. Live Data Fetching
  let events = [];
  let assignments = [];
  let vendors = [];
  let staff = [];
  let conflicts = [];
  let payments = [];
  let kpi = {};
  let notifications = [];

  try {
    const [eventsRes, assignmentsRes, vendorsRes, staffRes, conflictsRes, paymentsRes, kpiRes, notificationsRes] = await Promise.all([
      axios.get('/events').catch(() => ({ data: [] })),
      axios.get('/assignments').catch(() => ({ data: [] })),
      axios.get('/vendors').catch(() => ({ data: [] })),
      axios.get('/staff').catch(() => ({ data: [] })),
      axios.get('/assignments/conflicts').catch(() => ({ data: [] })),
      axios.get('/payments').catch(() => ({ data: [] })),
      axios.get('/dashboard/kpi').catch(() => ({ data: {} })),
      axios.get('/notifications').catch(() => ({ data: [] }))
    ]);

    events = eventsRes.data || [];
    assignments = assignmentsRes.data || [];
    vendors = vendorsRes.data || [];
    staff = staffRes.data || [];
    conflicts = conflictsRes.data || [];
    payments = paymentsRes.data || [];
    kpi = kpiRes.data || {};
    notifications = notificationsRes.data || [];
  } catch (err) {
    console.error("Operations Assistant fetch error:", err);
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to determine target event (matching name in input, or next upcoming event)
  const getTargetEvent = () => {
    const matched = events.find(e => cleanInput.includes((e.name || '').toLowerCase()));
    if (matched) return matched;

    const upcoming = events.filter(e => (e.event_date || '') >= todayStr);
    if (upcoming.length > 0) {
      return [...upcoming].sort((a, b) => new Date(a.event_date) - new Date(b.event_date))[0];
    }
    return events[0] || null;
  };

  // ==========================================
  // PATTERN MATCHING & RESPONSER LIFE-CYCLE
  // ==========================================

  // --- EVENT QUESTIONS ---
  // "Show upcoming events" / "upcoming functions" / "next events" / "future events" / "scheduled events"
  if (norm.includes('upcoming event') || norm.includes('next event') || norm.includes('future event') || norm.includes('scheduled event')) {
    const upcoming = events.filter(e => (e.event_date || '') >= todayStr);
    if (upcoming.length === 0) {
      return "No events available.";
    }
    upcoming.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    const nextEvent = upcoming[0];
    const formattedDate = new Date(nextEvent.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `Found ${upcoming.length} upcoming events. The next event is ${nextEvent.name} on ${formattedDate} at ${nextEvent.venue}.`;
  }

  // "What events are scheduled today?"
  if (norm.includes('scheduled today') || norm.includes('events today') || norm.includes('happening today')) {
    const todayEvents = events.filter(e => (e.event_date || '') === todayStr);
    if (todayEvents.length === 0) {
      return "No matching records found.";
    }
    const eventList = todayEvents.map(e => e.name).join(', ');
    return `There are ${todayEvents.length} events scheduled today: ${eventList}`;
  }

  // "Show completed events"
  if (norm.includes('completed event')) {
    const completed = events.filter(e => (e.status || '').toLowerCase() === 'completed' || e.workflow_stage === 5);
    if (completed.length === 0) {
      return "No matching records found.";
    }
    return `Found ${completed.length} completed events.`;
  }

  // "Show cancelled events" / "cancellations"
  if (norm.includes('cancelled event') || norm.includes('cancellation')) {
    const cancelled = events.filter(e => (e.status || '').toLowerCase() === 'cancelled' || e.workflow_stage === 6);
    if (cancelled.length === 0) {
      return "No cancelled events found.";
    }
    const cancelledList = cancelled.map(e => {
      const match = e.notes?.match(/Cancellation Reason:\s*(.*)/i);
      const reason = match ? ` (Reason: ${match[1]})` : '';
      return `${e.name}${reason}`;
    }).join(', ');
    return `Found ${cancelled.length} cancelled events: ${cancelledList}`;
  }


  // --- VENDOR QUESTIONS ---
  // "Who is assigned as decorator?" / "decorator assigned" / "event decorator" / "assigned decoration vendor"
  if (norm.includes('decorator assigned') || norm.includes('assigned as decorator') || norm.includes('event decorator') || norm.includes('assigned decoration vendor')) {
    const targetEvent = getTargetEvent();
    if (!targetEvent) return "No matching records found.";

    const decoratorAss = assignments.find(a => 
      a.event_id === targetEvent.id && 
      a.resource_type === 'vendor' && 
      vendors.some(v => v.id === a.resource_id && v.category === 'Decorator')
    );
    if (!decoratorAss) {
      return "No vendors assigned yet.";
    }
    const vendorName = vendors.find(v => v.id === decoratorAss.resource_id)?.name || 'Unknown Decorator';
    return `The assigned decorator is ${vendorName}.`;
  }

  // "Show assigned vendors"
  if (norm.includes('assigned vendor') || norm.includes('show assigned vendors')) {
    const targetEvent = getTargetEvent();
    if (!targetEvent) return "No matching records found.";

    const eventVendors = assignments
      .filter(a => a.event_id === targetEvent.id && a.resource_type === 'vendor')
      .map(a => vendors.find(v => v.id === a.resource_id))
      .filter(Boolean);

    if (eventVendors.length === 0) {
      return "No vendors assigned yet.";
    }
    const vendorList = eventVendors.map(v => `${v.name} (${v.category})`).join(', ');
    return `The following vendors are assigned: ${vendorList}`;
  }

  // "Any vendor conflicts?" / "vendor conflicts"
  if (norm.includes('vendor conflict')) {
    const vendorConflicts = conflicts.filter(c => c.resourceType?.toLowerCase() === 'vendor');
    const count = vendorConflicts.length;
    if (count === 0) {
      return "No vendor conflicts found.";
    }
    return `${count} vendor conflicts detected.`;
  }


  // --- STAFF QUESTIONS ---
  // "Who is assigned as coordinator?"
  if (norm.includes('coordinator assigned') || norm.includes('assigned as coordinator')) {
    const targetEvent = getTargetEvent();
    if (!targetEvent) return "No matching records found.";

    const coordAss = assignments.find(a => 
      a.event_id === targetEvent.id && 
      a.resource_type === 'staff' && 
      staff.some(s => s.id === a.resource_id && s.role === 'Coordinator')
    );
    if (!coordAss) {
      return "No staff assigned yet.";
    }
    const staffName = staff.find(s => s.id === coordAss.resource_id)?.name || 'Unknown Coordinator';
    return `${staffName} is assigned as coordinator.`;
  }

  // "Show assigned staff"
  if (norm.includes('assigned staff') || norm.includes('show assigned staff')) {
    const targetEvent = getTargetEvent();
    if (!targetEvent) return "No matching records found.";

    const eventStaff = assignments
      .filter(a => a.event_id === targetEvent.id && a.resource_type === 'staff')
      .map(a => staff.find(s => s.id === a.resource_id))
      .filter(Boolean);

    if (eventStaff.length === 0) {
      return "No staff assigned yet.";
    }
    const staffList = eventStaff.map(s => `${s.name} (${s.role})`).join(', ');
    return `The assigned staff are: ${staffList}`;
  }

  // "Available staff today?"
  if (norm.includes('available staff today') || norm.includes('staff available today')) {
    const todayEvents = events.filter(e => e.event_date === todayStr);
    const busyStaffIds = assignments
      .filter(a => todayEvents.some(e => e.id === a.event_id) && a.resource_type === 'staff')
      .map(a => a.resource_id);

    const availableStaff = staff.filter(s => s.availability_status !== 'Busy' && !busyStaffIds.includes(s.id));
    if (availableStaff.length === 0) {
      return "No staff assigned yet.";
    }
    return `${availableStaff.length} staff members are available today.`;
  }


  // --- ASSIGNMENT CENTER QUESTIONS ---
  // "What is the workflow status?" / "assignment progress" / "event progress" / "workflow progress"
  if (norm.includes('workflow status') || norm.includes('assignment progress') || norm.includes('event progress') || norm.includes('workflow progress')) {
    const targetEvent = getTargetEvent();
    if (!targetEvent) return "No matching records found.";
    return `Current workflow status: ${targetEvent.status}`;
  }

  // "Which events need assignments?"
  if (norm.includes('events need assignments') || norm.includes('events require assignments') || norm.includes('need assignments') || norm.includes('require assignments')) {
    const pendingEvents = events.filter(e => 
      (e.workflow_stage || 0) < 4 && 
      (e.status || '').toLowerCase() !== 'completed' && 
      (e.status || '').toLowerCase() !== 'cancelled'
    );
    if (pendingEvents.length === 0) {
      return "No matching records found.";
    }
    return `${pendingEvents.length} events require vendor or staff assignments.`;
  }

  // "Show ready events"
  if (norm.includes('ready event') || norm.includes('ready events') || norm.includes('show ready events')) {
    const readyEvents = events.filter(e => (e.status || '').toLowerCase() === 'ready' || e.workflow_stage === 4);
    if (readyEvents.length === 0) {
      return "No matching records found.";
    }
    return `${readyEvents.length} events are marked Ready.`;
  }


  // --- CONFLICT QUESTIONS ---
  // "Show conflicts" / "any issues?" / "double bookings?" / "scheduling conflicts?"
  if (norm.includes('show conflicts') || norm.includes('any conflicts') || norm.includes('any issues') || norm.includes('double bookings') || norm.includes('scheduling conflicts')) {
    if (conflicts.length === 0) {
      return "No conflicts detected.";
    }
    return `There are ${conflicts.length} active conflicts.`;
  }

  // "Show staff conflicts"
  if (norm.includes('staff conflict')) {
    const staffConflicts = conflicts.filter(c => c.resourceType?.toLowerCase() === 'staff');
    if (staffConflicts.length === 0) {
      return "No conflicts detected.";
    }
    return `${staffConflicts.length} staff conflicts detected.`;
  }

  // "Show vendor conflicts"
  if (norm.includes('vendor conflict')) {
    const vendorConflicts = conflicts.filter(c => c.resourceType?.toLowerCase() === 'vendor');
    if (vendorConflicts.length === 0) {
      return "No conflicts detected.";
    }
    return `${vendorConflicts.length} vendor conflicts detected.`;
  }


  // --- PAYMENT QUESTIONS ---
  // "Pending payments"
  if (norm.includes('pending payment') || norm.includes('payments pending')) {
    const pending = payments.filter(p => p.status === 'Pending');
    if (pending.length === 0) {
      return "No payment records available.";
    }
    return `${pending.length} payments are pending.`;
  }

  // "Outstanding balance"
  if (norm.includes('outstanding balance') || norm.includes('due balance')) {
    const pending = payments.filter(p => p.status === 'Pending');
    if (pending.length === 0) {
      return "No payment records available.";
    }
    const amount = pending.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    return `Outstanding balance: ₹${amount.toLocaleString('en-IN')}`;
  }

  // "Event budget" / "budget for {event_name}"
  if (norm.includes('event budget') || norm.includes('budget for') || norm.includes('budget of')) {
    const targetEvent = getTargetEvent();
    if (!targetEvent) return "No matching records found.";
    return `Budget for ${targetEvent.name}: ₹${parseFloat(targetEvent.budget || 0).toLocaleString('en-IN')}`;
  }


  // --- DASHBOARD QUESTIONS ---
  // "Give me today's summary"
  if (norm.includes('today summary') || norm.includes("today's summary") || norm.includes('summary today')) {
    const activeEventsCount = events.filter(e => 
      (e.status || '').toLowerCase() === 'assigned' || 
      (e.status || '').toLowerCase() === 'ready' || 
      (e.status || '').toLowerCase() === 'in progress'
    ).length;
    const pendingAssignmentsCount = kpi.pendingAssignments || 0;
    const conflictCount = conflicts.length;
    const upcomingEventsCount = events.filter(e => (e.event_date || '') >= todayStr).length;
    
    return `Today Summary:\nActive Events: ${activeEventsCount}\nPending Assignments: ${pendingAssignmentsCount}\nConflicts: ${conflictCount}\nUpcoming Events: ${upcomingEventsCount}`;
  }

  // "How many events are active?"
  if (norm.includes('events are active') || norm.includes('active events') || norm.includes('how many active events')) {
    const active = events.filter(e => 
      (e.status || '').toLowerCase() === 'assigned' || 
      (e.status || '').toLowerCase() === 'ready' || 
      (e.status || '').toLowerCase() === 'in progress'
    );
    if (active.length === 0) {
      return "No events available.";
    }
    return `There are ${active.length} active events.`;
  }

  // "How many vendors do we have?"
  if (norm.includes('vendors do we have') || norm.includes('how many vendors') || norm.includes('total vendors')) {
    if (vendors.length === 0) {
      return "No matching records found.";
    }
    return `There are ${vendors.length} registered vendors.`;
  }


  // --- CALENDAR QUESTIONS ---
  // "What events are happening this week?"
  if (norm.includes('happening this week') || norm.includes('events this week') || norm.includes('scheduled this week')) {
    const today = new Date();
    const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thisWeekEvents = events.filter(e => {
      try {
        const d = new Date(e.event_date);
        return d >= today && d <= sevenDaysLater;
      } catch (err) { return false; }
    });
    if (thisWeekEvents.length === 0) {
      return "No events available.";
    }
    return `${thisWeekEvents.length} events are scheduled this week.`;
  }

  // "Show events on {date}"
  if (norm.includes('events on') || norm.includes('event on')) {
    const dateMatch = norm.match(/(\d{4}-\d{2}-\d{2})/);
    let targetDate = '';
    if (dateMatch) {
      targetDate = dateMatch[1];
    } else {
      const matchingEvent = events.find(e => {
        try {
          const formatted = new Date(e.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toLowerCase();
          return norm.includes(formatted) || norm.includes(e.event_date);
        } catch(err) { return false; }
      });
      if (matchingEvent) targetDate = matchingEvent.event_date;
    }

    if (!targetDate) {
      return "Please specify a date (e.g. 'events on 2026-07-15').";
    }

    const dateEvents = events.filter(e => e.event_date === targetDate);
    if (dateEvents.length === 0) {
      return `No matching records found.`;
    }
    const eventListStr = dateEvents.map(e => e.name).join(', ');
    return `Events on ${targetDate}: ${eventListStr}`;
  }


  // --- SMART RECOMMENDATIONS ---
  // "What needs attention?"
  if (norm.includes('needs attention') || norm.includes('attention required')) {
    const requiredVendors = ['Decorator', 'Caterer', 'Photographer', 'Anchor', 'Sound Team'];
    const requiredStaff = ['Supervisor', 'Coordinator', 'Technician', 'Helper'];

    const pendingVendorsCount = events.filter(event => {
      const eventAssignments = assignments.filter(a => a.event_id === event.id && a.resource_type === 'vendor');
      const assignedCats = eventAssignments.map(a => vendors.find(v => v.id === a.resource_id)?.category).filter(Boolean);
      return !requiredVendors.every(cat => assignedCats.includes(cat));
    }).length;

    const pendingStaffCount = events.filter(event => {
      const eventAssignments = assignments.filter(a => a.event_id === event.id && a.resource_type === 'staff');
      const assignedRoles = eventAssignments.map(a => staff.find(s => s.id === a.resource_id)?.role).filter(Boolean);
      return !requiredStaff.every(role => assignedRoles.includes(role));
    }).length;

    return `Attention Required:\n${pendingVendorsCount} events need vendor assignments.\n${pendingStaffCount} events need staff assignments.\n${conflicts.length} conflicts require review.`;
  }

  // "What should I do next?"
  if (norm.includes('what should i do next') || norm.includes('what to do next') || norm.includes('recommended actions')) {
    return "Recommended Actions:\n1. Complete pending assignments.\n2. Resolve active conflicts.\n3. Verify upcoming event readiness.";
  }


  // --- NAVIGATION FALLBACK HANDLERS ---
  if (msg.includes('go to') || msg.includes('navigate to') || msg.includes('show me') || msg.includes('open')) {
    if (msg.includes('dashboard') || msg.includes('kpi') || msg.includes('home')) {
      navigate('/');
      return "Sure! Navigating you to the Dashboard.";
    }
    if (msg.includes('event')) {
      navigate('/events');
      return "Opening the Event Bookings database.";
    }
    if (msg.includes('assignment') || msg.includes('roster') || msg.includes('crew')) {
      navigate('/assignments');
      return "Navigating to the Crew Assignment Center.";
    }
    if (msg.includes('vendor')) {
      navigate('/vendors');
      return "Opening the Vendor database.";
    }
    if (msg.includes('staff')) {
      navigate('/staff');
      return "Navigating to the Internal Staff database.";
    }
    if (msg.includes('calendar') || msg.includes('schedule')) {
      navigate('/calendar');
      return "Opening the Availability Calendar.";
    }
    if (msg.includes('conflict')) {
      navigate('/conflicts');
      return "Opening the Conflicts Management board.";
    }
    if (msg.includes('payment') || msg.includes('ledger') || msg.includes('transaction')) {
      navigate('/payments');
      return "Navigating to the Payments ledger.";
    }
    if (msg.includes('inventory') || msg.includes('stock') || msg.includes('warehouse')) {
      navigate('/inventory');
      return "Opening the Warehouse Inventory manager.";
    }
    if (msg.includes('report') || msg.includes('csv') || msg.includes('excel')) {
      navigate('/reports');
      return "Opening the Reports generator.";
    }
    if (msg.includes('notification') || msg.includes('alert') || msg.includes('inbox')) {
      navigate('/notifications');
      return "Navigating to the Notifications Center.";
    }
    if (msg.includes('setting')) {
      navigate('/settings');
      return "Opening the Admin Settings pane.";
    }
  }

  // --- DETAIL EVENT SUMMARY INJECTION ---
  if (msg.includes('summary') || msg.includes('summarize') || msg.includes('details of') || msg.includes('event summary')) {
    const targetEvent = getTargetEvent();
    if (!targetEvent) return "No events available.";
    
    try {
      const detailRes = await axios.get(`/events/${targetEvent.id}`);
      const detail = detailRes.data;

      const vendorsStr = detail.assignedVendors.map(v => `${v.vendor_name} (${v.vendor_category})`).join(', ') || 'None';
      const staffStr = detail.assignedStaff.map(s => `${s.staff_name} (${s.staff_role})`).join(', ') || 'None';

      return `Event Summary: **${detail.name}**\n\n` +
        `• **Client**: ${detail.client_name}\n` +
        `• **Type**: ${detail.event_type}\n` +
        `• **Date**: ${new Date(detail.event_date).toLocaleDateString('en-GB')}\n` +
        `• **Venue**: ${detail.venue}\n` +
        `• **Budget**: ₹${parseFloat(detail.budget).toLocaleString('en-IN')}\n` +
        `• **Guests**: ${detail.guest_count}\n` +
        `• **Vendors**: ${vendorsStr}\n` +
        `• **Staff**: ${staffStr}\n` +
        `• **Status**: ${detail.status}`;
    } catch (err) {
      console.error(err);
      return "I failed to retrieve event booking summaries. Please try again.";
    }
  }

  // Legacy Fallback Description Answer
  return "Hello! I am your AI Event Operations Assistant. I can help explain today's summary, detect scheduling conflicts, suggest top suppliers/vendors, check staff availability, provide occasion budgets, or navigate across modules.\n\n" +
    "Try asking me:\n" +
    "• *'Give me today's summary'* \n" +
    "• *'Who is assigned as decorator?'* \n" +
    "• *'What should I do next?'*";
};

const TypewriterText = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      setDisplayedText((prev) => {
        if (index === 0) return text.charAt(0);
        return prev + text.charAt(index);
      });
      index++;
      if (index >= text.length) {
        clearInterval(timer);
      }
    }, 8);
    return () => {
      clearInterval(timer);
      setDisplayedText('');
    };
  }, [text]);

  return <span>{displayedText}</span>;
};

const Chatbot = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! I am your AI Event Operations Assistant. How can I help you coordinate today?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setIsTyping(true);

    // Simulate typing delay for AI feel
    setTimeout(async () => {
      const botText = await generateBotResponse(userText, queryClient, navigate);
      setIsTyping(false);
      setMessages(prev => [...prev, { sender: 'bot', text: botText }]);
    }, 600);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col items-end gap-3">
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              y: [0, -5, 0] 
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ 
              y: {
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut"
              },
              scale: { duration: 0.15 },
              opacity: { duration: 0.15 }
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="w-12 h-12 bg-gradient-to-tr from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg dark:shadow-[0_0_20px_rgba(14,165,233,0.25)] border border-white/10 transition-all duration-300 cursor-pointer"
            title="Open AI Event Operations Assistant"
          >
            <MessageSquare className="w-5 h-5 animate-soft-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Conversation Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-80 sm:w-96 h-[460px] bg-white/95 dark:bg-[#0B1220]/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-sky-500 to-indigo-600 text-white flex justify-between items-center select-none border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-355" />
                <div>
                  <h3 className="font-bold text-xs tracking-wide">AI Event Operations Assistant</h3>
                  <span className="text-[9px] opacity-80 uppercase font-extrabold tracking-wider">Real-time Operations Engine</span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50 dark:bg-slate-950/20 text-xs">
              {messages.map((m, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl shadow-sm leading-relaxed whitespace-pre-line font-medium border ${
                      m.sender === 'user'
                        ? 'bg-sky-500 border-sky-455 text-white rounded-tr-sm'
                        : 'bg-white border-slate-200 text-slate-800 dark:bg-white/[0.03] dark:border-white/[0.06] dark:text-slate-100 rounded-tl-sm'
                    }`}
                  >
                    {m.sender === 'bot' && idx === messages.length - 1 ? (
                      <TypewriterText text={m.text} />
                    ) : (
                      m.text
                    )}
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 text-slate-550 dark:bg-white/[0.03] dark:border-white/[0.06] dark:text-slate-400 p-3 rounded-2xl rounded-tl-sm flex flex-col gap-1.5 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-455 dark:text-slate-500">AI Assistant is typing...</span>
                    <div className="flex gap-1 items-center py-1">
                      <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-dot-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-dot-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-dot-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions / Suggested Questions */}
            <div className="px-3 py-2.5 bg-slate-100/50 dark:bg-white/[0.01] border-t border-slate-200 dark:border-white/[0.04] flex flex-wrap gap-1.5 justify-center">
              {[
                { label: "📊 Today Summary", text: "Give me today's summary" },
                { label: "🔍 Decorator assigned?", text: "Who is assigned as decorator?" },
                { label: "💡 Next actions?", text: "What should I do next?" }
              ].map((action, i) => (
                <motion.button
                  key={i}
                  type="button"
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setInput(action.text);
                    inputRef.current?.focus();
                  }}
                  className="px-2.5 py-1.5 bg-white dark:bg-white/[0.02] hover:bg-sky-50 dark:hover:bg-white/[0.06] text-[10px] font-bold rounded-full border border-slate-250 dark:border-white/[0.06] text-slate-600 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400 transition-colors shadow-sm cursor-pointer"
                >
                  {action.label}
                </motion.button>
              ))}
            </div>

            {/* Input Box Footer */}
            <form onSubmit={handleSend} className="p-3 border-t border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#111F35]/15 flex gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask a suggestion or command..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.06] outline-none bg-slate-50 dark:bg-slate-950/40 focus:border-sky-500 dark:focus:border-sky-500 transition-colors"
              />
              <button
                type="submit"
                className="px-3.5 py-2.5 bg-sky-500 hover:bg-sky-655 text-white rounded-xl flex items-center justify-center transition-colors cursor-pointer shadow-sm hover:scale-105 active:scale-95 duration-100"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chatbot;
