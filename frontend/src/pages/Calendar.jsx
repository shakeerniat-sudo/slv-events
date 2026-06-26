import { useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';

const Calendar = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filters State
  const [showEvents, setShowEvents] = useState(true);
  const [showVendors, setShowVendors] = useState(true);
  const [showStaff, setShowStaff] = useState(true);
  const [filterUpcomingOnly, setFilterUpcomingOnly] = useState(false);
  const [filterCompletedOnly, setFilterCompletedOnly] = useState(false);

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayActivities, setSelectedDayActivities] = useState([]);
  const [selectedDayStr, setSelectedDayStr] = useState('');
  const [selectedEventForModal, setSelectedEventForModal] = useState(null);

  // Fetch all calendar data in parallel via TanStack Query
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events-all'],
    queryFn: async () => {
      const res = await axios.get('/events');
      return res.data;
    }
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['assignments-all'],
    queryFn: async () => {
      const res = await axios.get('/assignments');
      return res.data || [];
    }
  });

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors-all'],
    queryFn: async () => {
      const res = await axios.get('/vendors');
      return res.data;
    }
  });

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff-all'],
    queryFn: async () => {
      const res = await axios.get('/staff');
      return res.data;
    }
  });

  const loading = eventsLoading || assignmentsLoading || vendorsLoading || staffLoading;

  const handleClearFilters = () => {
    setShowEvents(true);
    setShowVendors(true);
    setShowStaff(true);
    setFilterUpcomingOnly(false);
    setFilterCompletedOnly(false);
  };

  // Get days in month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday, 6 is Saturday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Pad initial days
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // Add calendar days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const days = getDaysInMonth(currentDate);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Get items occurring on date
  const getActivitiesForDate = (date) => {
    if (!date) return [];
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const dayItems = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Filter events
    if (showEvents) {
      events.forEach(e => {
        let evDateStr = '';
        if (e.event_date) {
          try {
            evDateStr = new Date(e.event_date).toISOString().split('T')[0];
          } catch (err) {
            evDateStr = e.event_date.split('T')[0];
          }
        }
        if (evDateStr === dateStr) {
          // Check upcoming filter
          if (filterUpcomingOnly && evDateStr < todayStr) return;

          // Check completed filter
          if (filterCompletedOnly) {
            const isCompleted = (e.status || '').toLowerCase() === 'completed' || e.workflow_stage === 5;
            if (!isCompleted) return;
          }

          const statusLower = (e.status || '').toLowerCase();
          let colorClass = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/30'; // Blue for New
          let prefix = '✉️';
          if (statusLower === 'rejected' || statusLower === 'cancelled' || e.workflow_stage === 6) {
            colorClass = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/45 dark:border-rose-900/30 dark:text-rose-455'; // Red for Rejected
            prefix = '❌';
          } else if (statusLower === 'confirmed' || statusLower === 'assigned' || statusLower === 'in progress' || statusLower === 'ready' || statusLower === 'completed') {
            colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30'; // Green for Confirmed
            prefix = '🎉';
          }

          dayItems.push({ 
            type: 'event', 
            label: `${prefix} ${e.name}`, 
            color: colorClass, 
            detail: e 
          });
        }
      });
    }

    // Filter assignments
    assignments.forEach(as => {
      // Find event for assignment
      const ev = events.find(e => e.id === as.event_id);
      if (!ev) return;
      let evDateStr = '';
      if (ev && ev.event_date) {
        try {
          evDateStr = new Date(ev.event_date).toISOString().split('T')[0];
        } catch (err) {
          evDateStr = ev.event_date.split('T')[0];
        }
      }
      if (ev && evDateStr === dateStr) {
        // Check upcoming filter
        if (filterUpcomingOnly && evDateStr < todayStr) return;

        // Check completed filter
        if (filterCompletedOnly) {
          const isCompleted = (ev.status || '').toLowerCase() === 'completed' || ev.workflow_stage === 5;
          if (!isCompleted) return;
        }

        if (as.resource_type === 'vendor' && showVendors) {
          const v = vendors.find(vd => vd.id === as.resource_id);
          if (v) {
            dayItems.push({
              type: 'vendor',
              label: `💼 Vendor: ${v.name}`,
              color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/30',
              detail: v
            });
          }
        } else if (as.resource_type === 'staff' && showStaff) {
          const s = staff.find(st => st.id === as.resource_id);
          if (s) {
            dayItems.push({
              type: 'staff',
              label: `🏃 Crew: ${s.name}`,
              color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30',
              detail: s
            });
          }
        }
      }
    });

    return dayItems;
  };

  const handleDayClick = (date, acts) => {
    if (!date) return;
    setSelectedDate(date);
    setSelectedDayStr(date.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    setSelectedDayActivities(acts);
  };

  const getFormattedDateForQuery = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  if (loading) {
    return <div className="flex-1 py-12 text-center text-xs text-slate-500 dark:text-slate-400 animate-pulse">Loading work calendar...</div>;
  }

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const hasActiveFilters = !showEvents || !showVendors || !showStaff || filterUpcomingOnly || filterCompletedOnly;

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 pr-2">
      {/* Calendar Header with Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Availability & Shifts Calendar</h2>
          <p className="text-xs text-slate-550 dark:text-slate-400">Track vendor setups and employee roster shifts on monthly calendars</p>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg select-none">
              <input type="checkbox" checked={showEvents} onChange={(e) => setShowEvents(e.target.checked)} className="accent-sky-500 w-3.5 h-3.5" />
              <span className="text-sky-600 dark:text-sky-400 font-bold">Events</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg select-none">
              <input type="checkbox" checked={showVendors} onChange={(e) => setShowVendors(e.target.checked)} className="accent-indigo-500 w-3.5 h-3.5" />
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">Vendors</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg select-none">
              <input type="checkbox" checked={showStaff} onChange={(e) => setShowStaff(e.target.checked)} className="accent-emerald-500 w-3.5 h-3.5" />
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Staff Shifts</span>
            </label>

            {/* Divider */}
            <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800"></div>

            {/* Upcoming Events Filter */}
            <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg select-none">
              <input 
                type="checkbox" 
                checked={filterUpcomingOnly} 
                onChange={(e) => {
                  setFilterUpcomingOnly(e.target.checked);
                  if (e.target.checked) setFilterCompletedOnly(false);
                }} 
                className="accent-sky-500 w-3.5 h-3.5" 
              />
              <span className="text-sky-600 dark:text-sky-400 font-bold">Upcoming Only</span>
            </label>

            {/* Completed Events Filter */}
            <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg select-none">
              <input 
                type="checkbox" 
                checked={filterCompletedOnly} 
                onChange={(e) => {
                  setFilterCompletedOnly(e.target.checked);
                  if (e.target.checked) setFilterUpcomingOnly(false);
                }} 
                className="accent-indigo-500 w-3.5 h-3.5" 
              />
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">Completed Only</span>
            </label>

            {/* Clear Filters button */}
            {hasActiveFilters && (
              <button 
                onClick={handleClearFilters}
                className="ml-1 text-[10px] font-bold text-sky-500 hover:text-sky-655 transition-colors uppercase cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          
          <button
            onClick={() => navigate('/events?create=true')}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            <span>+ Create Event</span>
          </button>
        </div>
      </div>

      {/* Main Grid Calendar Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Monthly grid */}
        <div className="lg:col-span-8 glass-card p-5 bg-white dark:bg-[#111C30]/40">
          {/* Calendar Controller bar */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 rounded-xl transition-all border border-slate-200 dark:border-slate-850 cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={nextMonth} className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 rounded-xl transition-all border border-slate-200 dark:border-slate-850 cursor-pointer">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] uppercase font-bold text-slate-450 dark:text-slate-400 mb-2 border-b border-slate-150 dark:border-slate-850 pb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="h-24 bg-slate-50/30 dark:bg-slate-950/20 border border-transparent dark:border-slate-950/5 rounded-2xl" />;
              
              const acts = getActivitiesForDate(day);
              const isToday = new Date().toDateString() === day.toDateString();

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day, acts)}
                  className={`h-24 p-1.5 flex flex-col justify-between border rounded-2xl hover:border-slate-400 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850/35 transition-all cursor-pointer group ${
                    isToday 
                      ? 'border-sky-500 bg-sky-500/5 dark:border-sky-500 dark:bg-primary-950/10' 
                      : 'border-slate-150 dark:border-slate-850 bg-white dark:bg-slate-950/40'
                  }`}
                >
                  <span className={`text-[10px] font-bold self-end w-5 h-5 rounded-full flex items-center justify-center ${
                    isToday ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-250'
                  }`}>
                    {day.getDate()}
                  </span>

                  <div className="space-y-1 overflow-y-auto max-h-12 text-[8px] mt-1 pr-0.5">
                    {acts.slice(0, 2).map((a, i) => (
                      <div
                        key={i}
                        onClick={(e) => {
                          if (a.type === 'event') {
                            e.stopPropagation();
                            setSelectedEventForModal(a.detail);
                          }
                        }}
                        className={`px-1.5 py-0.5 border rounded-md truncate font-semibold transition-all hover:scale-105 ${a.color}`}
                      >
                        {a.label}
                      </div>
                    ))}
                    {acts.length > 2 && (
                      <div className="text-[7px] text-slate-500 font-bold pl-1">
                        + {acts.length - 2} more...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Day Activities panel */}
        <div className="lg:col-span-4 glass-card p-6 bg-white dark:bg-[#111C30]/40">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4 pb-2 border-b border-slate-150 dark:border-slate-850">
            Selected Day Agenda
          </h3>

          {!selectedDayStr ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <CalendarDays className="w-8 h-8 text-sky-500 opacity-35 mx-auto mb-2 animate-bounce" />
              <p>Click any calendar date to review crew schedules and events</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-[10px] text-sky-600 bg-sky-50 border border-sky-100 dark:text-sky-400 dark:bg-[#111C30] dark:border-slate-800 p-2 rounded-xl text-center font-bold">
                {selectedDayStr}
              </div>

              <div className="flex flex-col gap-2 pt-1 border-b border-slate-150 dark:border-slate-850 pb-4">
                <button
                  onClick={() => navigate(`/events?create=true&date=${getFormattedDateForQuery(selectedDate)}`)}
                  className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>+ Create Event on this Day</span>
                </button>
                <button
                  onClick={() => navigate('/assignments')}
                  className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-850 text-slate-700 dark:text-slate-350 rounded-xl text-xs font-semibold shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Crew Planner & Shifts</span>
                </button>
              </div>

              {selectedDayActivities.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No scheduled tasks or events registered for this day</p>
              ) : (
                <div className="space-y-3">
                  {selectedDayActivities.map((act, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        if (act.type === 'event') {
                          setSelectedEventForModal(act.detail);
                        }
                      }}
                      className={`p-3 border rounded-xl text-xs flex flex-col gap-1.5 ${
                        act.type === 'event' ? 'cursor-pointer hover:scale-[1.01] transition-transform' : ''
                      } ${act.color}`}
                    >
                      <span className="font-bold">{act.label}</span>
                      
                      {act.type === 'event' && (
                        <div className="text-[9px] opacity-90 space-y-1 pt-1 mt-1 border-t border-slate-200 dark:border-slate-800">
                          <p><strong>Venue:</strong> {act.detail.venue}</p>
                          <p><strong>Budget:</strong> ₹{parseFloat(act.detail.budget).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Event Details Click Popup Modal */}
      {selectedEventForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-[#111F35] rounded-3xl border border-slate-200 dark:border-white/[0.08] shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-white/[0.04] flex justify-between items-center bg-slate-50/50 dark:bg-slate-905/30">
              <div>
                <span className="text-[9px] font-bold text-sky-500 uppercase tracking-widest">Event Agenda Details</span>
                <h3 className="font-bold text-sm text-slate-805 dark:text-slate-100 mt-0.5">{selectedEventForModal.name}</h3>
              </div>
              <button
                onClick={() => setSelectedEventForModal(null)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-205 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs font-semibold text-slate-655 dark:text-slate-350">
              <div className="grid grid-cols-2 gap-3.5 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-white/[0.02]">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Client Name</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedEventForModal.client_name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Event Type</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedEventForModal.event_type}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Event Date</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedEventForModal.event_date ? new Date(selectedEventForModal.event_date).toLocaleDateString('en-GB') : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Location / Venue</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate" title={selectedEventForModal.venue}>{selectedEventForModal.venue}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Estimated Budget</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">₹{parseFloat(selectedEventForModal.budget).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Guest Count</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedEventForModal.guest_count || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Booking Status</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border mt-0.5 ${
                    selectedEventForModal.status?.toLowerCase() === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/30 dark:text-emerald-400' :
                    selectedEventForModal.status?.toLowerCase() === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-955/30 dark:text-rose-455' :
                    'bg-blue-50 text-blue-700 border-blue-250 dark:bg-blue-950/30 dark:text-blue-400'
                  }`}>
                    {selectedEventForModal.status}
                  </span>
                </div>
              </div>

              {selectedEventForModal.notes && (
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Additional Notes</span>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-white/[0.02] rounded-xl text-slate-655 dark:text-slate-350 leading-relaxed mt-1">
                    {selectedEventForModal.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-white/[0.04] bg-slate-50/50 dark:bg-slate-900/30 flex justify-end">
              <button
                onClick={() => setSelectedEventForModal(null)}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
