import React, { useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { useUIStore } from '../store/uiStore';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const Calendar = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const { theme } = useUIStore();
  const isDark = theme === 'dark';

  // Filters
  const [showEvents, setShowEvents] = useState(true);
  const [showVendors, setShowVendors] = useState(true);
  const [showStaff, setShowStaff] = useState(true);

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayActivities, setSelectedDayActivities] = useState([]);
  const [selectedDayStr, setSelectedDayStr] = useState('');

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

    // Filter events
    if (showEvents) {
      events.forEach(e => {
        const evDateStr = e.event_date ? e.event_date.split('T')[0] : '';
        if (evDateStr === dateStr) {
          dayItems.push({ 
            type: 'event', 
            label: `🎉 ${e.name}`, 
            color: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/30', 
            detail: e 
          });
        }
      });
    }

    // Filter assignments
    assignments.forEach(as => {
      // Find event for assignment
      const ev = events.find(e => e.id === as.event_id);
      const evDateStr = ev && ev.event_date ? ev.event_date.split('T')[0] : '';
      if (ev && evDateStr === dateStr) {
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
                      <div key={i} className={`px-1.5 py-0.5 border rounded-md truncate font-semibold ${a.color}`}>
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
                      className={`p-3 border rounded-xl text-xs flex flex-col gap-1.5 ${act.color}`}
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
    </div>
  );
};

export default Calendar;
