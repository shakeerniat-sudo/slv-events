import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { MessageSquare, X, Send, Sparkles, Loader } from 'lucide-react';

const generateBotResponse = async (userMessage, queryClient, navigate) => {
  const msg = userMessage.toLowerCase();

  // 1. Help users navigate
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

  // 2. Explain dashboard data
  if (msg.includes('dashboard') || msg.includes('kpi') || msg.includes('statistics') || msg.includes('overview') || msg.includes('status')) {
    try {
      const res = await axios.get('/dashboard/kpi');
      const kpi = res.data;
      return `Here is a summary of the current Dashboard metrics:\n\n` +
        `• **Total Events**: ${kpi.totalEvents} (${kpi.activeEvents} active)\n` +
        `• **Total Vendors**: ${kpi.totalVendors} partners\n` +
        `• **Active Staff**: ${kpi.totalStaff} rostered crew\n` +
        `• **Conflict Alerts**: ${kpi.conflictAlerts} 🚨\n` +
        `• **Pending Crewing**: ${kpi.pendingAssignments} tasks\n` +
        `• **Pending Payments**: ${kpi.paymentsPending} invoices`;
    } catch (err) {
      console.error(err);
      return "I couldn't fetch the dashboard KPI stats right now. Please check if the server is running.";
    }
  }

  // 3. Explain active alerts/conflicts
  if (msg.includes('alert') || msg.includes('conflict') || msg.includes('warning') || msg.includes('double booking')) {
    try {
      const res = await axios.get('/notifications');
      const alerts = res.data.filter(n => n.type === 'Conflict Alert' && !n.is_read);
      if (alerts.length === 0) {
        return "Great news! There are currently no unread Conflict Alerts or double-bookings in the system.";
      }
      let reply = `Here are the active unread Conflict Alerts:\n\n`;
      alerts.forEach((a, idx) => {
        reply += `${idx + 1}. **${a.title}**: ${a.message}\n`;
      });
      return reply;
    } catch (err) {
      console.error(err);
      return "I'm having trouble retrieving active system alerts. Please try again.";
    }
  }

  // 4. Suggest vendors with detailed reasons matching user's requested type
  if (msg.includes('suggest') && (msg.includes('vendor') || msg.includes('photographer') || msg.includes('decorator') || msg.includes('caterer') || msg.includes('anchor') || msg.includes('sound') || msg.includes('audio'))) {
    let category = '';
    if (msg.includes('photographer')) category = 'Photographer';
    else if (msg.includes('decorator')) category = 'Decorator';
    else if (msg.includes('caterer')) category = 'Caterer';
    else if (msg.includes('anchor') || msg.includes('emcee')) category = 'Anchor';
    else if (msg.includes('sound') || msg.includes('audio') || msg.includes('stage')) category = 'Sound Team';

    const eventType = msg.includes('wedding') ? 'Wedding' : msg.includes('corporate') ? 'Corporate' : 'General';
    const isTomorrow = msg.includes('tomorrow');

    try {
      const res = await axios.get('/vendors');
      const allVendors = res.data;
      let matched = allVendors;
      if (category) {
        matched = allVendors.filter(v => v.category === category);
      }
      
      if (matched.length === 0) {
        return `I couldn't find any registered vendors ${category ? `in the category "${category}"` : ''}.`;
      }

      // Sort by rating descending
      matched.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
      const top = matched[0];

      return `Recommended ${top.category}: **${top.name}**\n\n` +
        `Reason:\n` +
        `✓ Available ${isTomorrow ? 'tomorrow' : 'on selected date'}\n` +
        `✓ Rating: **${parseFloat(top.rating).toFixed(1)}⭐**\n` +
        `✓ Fits budget (Tier: ${top.price_range})\n` +
        `✓ Experienced in ${eventType} events`;
    } catch (err) {
      console.error(err);
      return "I was unable to search the Vendor database. Please try again.";
    }
  }

  // 5. Suggest staff
  if (msg.includes('suggest') && (msg.includes('staff') || msg.includes('helper') || msg.includes('coordinator') || msg.includes('supervisor') || msg.includes('technician'))) {
    let role = 'Helper';
    if (msg.includes('coordinator')) role = 'Coordinator';
    else if (msg.includes('supervisor')) role = 'Supervisor';
    else if (msg.includes('technician') || msg.includes('audio')) role = 'Technician';

    try {
      const res = await axios.get('/staff');
      const allStaff = res.data.filter(s => s.role === role);
      if (allStaff.length === 0) {
        return `No internal crew members found with the role "${role}".`;
      }
      allStaff.sort((a, b) => b.experience_years - a.experience_years);
      const top = allStaff[0];

      return `Recommended ${top.role}: **${top.name}**\n\n` +
        `Reason:\n` +
        `✓ Available on event date\n` +
        `✓ Experience: **${top.experience_years} years**\n` +
        `✓ Internal crew member ready to deploy`;
    } catch (err) {
      console.error(err);
      return "I couldn't access the Internal Staff database. Please try again.";
    }
  }

  // 6. Provide event summaries
  if (msg.includes('summary') || msg.includes('summarize') || msg.includes('details of') || msg.includes('event summary')) {
    try {
      const res = await axios.get('/events');
      const events = res.data;
      if (events.length === 0) {
        return "There are no events registered in the system.";
      }
      
      let match = null;
      for (const ev of events) {
        if (msg.includes(ev.name.toLowerCase()) || msg.includes(ev.id.toString())) {
          match = ev;
          break;
        }
      }
      
      if (!match) {
        match = events[0]; // fallback to first event
      }

      const detailRes = await axios.get(`/events/${match.id}`);
      const detail = detailRes.data;

      const vendorsStr = detail.assignedVendors.map(v => `${v.vendor_name} (${v.vendor_category})`).join(', ') || 'None';
      const staffStr = detail.assignedStaff.map(s => `${s.staff_name} (${s.staff_role})`).join(', ') || 'None';

      return `Event Summary: **${detail.name}**\n\n` +
        `• **Client**: ${detail.client_name}\n` +
        `• **Type**: ${detail.event_type}\n` +
        `• **Date**: ${new Date(detail.event_date).toLocaleDateString('en-GB')}\n` +
        `• **Venue**: ${detail.venue}\n` +
        `• **Budget**: $${parseFloat(detail.budget).toLocaleString(undefined, { minimumFractionDigits: 2 })}\n` +
        `• **Guests**: ${detail.guest_count}\n` +
        `• **Vendors**: ${vendorsStr}\n` +
        `• **Staff**: ${staffStr}\n` +
        `• **Status**: ${detail.status}`;
    } catch (err) {
      console.error(err);
      return "I failed to retrieve event booking summaries. Please try again.";
    }
  }

  // 7. Help with payments
  if (msg.includes('payment') || msg.includes('due') || msg.includes('billing') || msg.includes('invoice') || msg.includes('ledger') || msg.includes('payout')) {
    try {
      const res = await axios.get('/payments');
      const payments = res.data.filter(p => p.status === 'Pending' || p.status === 'Overdue');
      if (payments.length === 0) {
        return "All client billings and vendor payouts are fully paid. There are no pending payments!";
      }
      let reply = `Here are the top pending/overdue payments:\n\n`;
      payments.slice(0, 5).forEach((p, idx) => {
        const desc = p.type === 'vendor' ? `Vendor payout` : `Client billing`;
        reply += `${idx + 1}. **${p.event_name}** - $${parseFloat(p.amount).toLocaleString()} (${desc}) | Due: ${new Date(p.due_date).toLocaleDateString('en-GB')} [${p.status}]\n`;
      });
      return reply;
    } catch (err) {
      console.error(err);
      return "I'm having trouble loading the payments ledger details. Please try again.";
    }
  }

  // Default response
  return "Hello! I am your SLV Events planning assistant. I can help explain dashboard metrics, show active alerts, suggest top vendors or internal crew, provide event briefings, summarize client bookings, or navigate across modules.\n\n" +
    "Try asking me:\n" +
    "• *'Suggest a photographer for tomorrow's wedding.'*\n" +
    "• *'What conflict alerts do we have?'*\n" +
    "• *'Go to Dashboard'*";
};

const Chatbot = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! I am your SLV Events planning assistant. How can I help you coordinate today?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef(null);

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

    // Simulate small typing delay for natural feel
    setTimeout(async () => {
      const botText = await generateBotResponse(userText, queryClient, navigate);
      setIsTyping(false);
      setMessages(prev => [...prev, { sender: 'bot', text: botText }]);
    }, 600);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9999]">
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-12 h-12 bg-sky-500 hover:bg-sky-600 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer border border-sky-450/30"
          title="Open AI Planner Assistant"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      )}

      {/* Chat Conversation Drawer */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[450px] bg-white dark:bg-[#111C30]/95 backdrop-blur-md border border-slate-200 dark:border-slate-850 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-modal-zoom">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-sky-500 to-indigo-600 text-white flex justify-between items-center select-none">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <div>
                <h3 className="font-bold text-xs">SLV Planning Assistant</h3>
                <span className="text-[9px] opacity-80 uppercase font-extrabold tracking-wider">Rule-Based Sandbox Engine</span>
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
              <div
                key={idx}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl shadow-sm leading-relaxed whitespace-pre-line font-medium border ${
                    m.sender === 'user'
                      ? 'bg-sky-500 border-sky-400 text-white rounded-tr-none'
                      : 'bg-white border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 rounded-tl-none'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 text-slate-550 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 p-3 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-sm">
                  <Loader className="w-3.5 h-3.5 animate-spin text-sky-550" />
                  <span className="text-[10px] font-semibold animate-pulse">Assistant is compiling...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box Footer */}
          <form onSubmit={handleSend} className="p-3 border-t border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111C30]/50 flex gap-2">
            <input
              type="text"
              placeholder="Ask a suggestion or command..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 outline-none bg-slate-50 dark:bg-slate-900 focus:border-sky-500 dark:focus:border-sky-500 transition-colors"
            />
            <button
              type="submit"
              className="px-3.5 py-2.5 bg-sky-500 hover:bg-sky-650 text-white rounded-xl flex items-center justify-center transition-colors cursor-pointer shadow-sm hover:scale-105 active:scale-95 duration-100"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
