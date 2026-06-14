import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CalendarDays, ChevronLeft, ChevronRight, Filter, Info, ShieldAlert } from 'lucide-react';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [showEvents, setShowEvents] = useState(true);
  const [showVendors, setShowVendors] = useState(true);
  const [showStaff, setShowStaff] = useState(true);

  const [selectedDayActivities, setSelectedDayActivities] = useState([]);
  const [selectedDayStr, setSelectedDayStr] = useState('');

  const fetchData = async () => {
    try {
      const [evRes, assRes, venRes, stRes] = await Promise.all([
        axios.get('/events'),
        axios.get('/assignments'), // custom API to get raw assignments mapping
        axios.get('/vendors'),
        axios.get('/staff')
      ]);
      setEvents(evRes.data);
      // Assignments can be mapped dynamically by event dates
      setAssignments(assRes.data || []);
      setVendors(venRes.data);
      setStaff(stRes.data);
    } catch (err) {
      console.error('Failed to load calendars data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
          dayItems.push({ type: 'event', label: `🎉 ${e.name}`, color: 'bg-cyan-950/80 text-cyan-400 border-cyan-800/40', detail: e });
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
              label: `💼 Vendor: ${v.name} (${v.category})`,
              color: 'bg-indigo-950/80 text-indigo-400 border-indigo-900/40',
              detail: v
            });
          }
        } else if (as.resource_type === 'staff' && showStaff) {
          const s = staff.find(st => st.id === as.resource_id);
          if (s) {
            dayItems.push({
              type: 'staff',
              label: ` crew: ${s.name} (${s.role})`,
              color: 'bg-emerald-950/80 text-emerald-400 border-emerald-900/40',
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
    setSelectedDayStr(date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    setSelectedDayActivities(acts);
  };

  if (loading) {
    return <div className="flex-1 py-12 text-center text-xs text-slate-500 animate-pulse">Loading work calendar...</div>;
  }

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 animate-fade-in pr-2">
      {/* Calendar Header with Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Availability & Shifts Calendar</h2>
          <p className="text-xs text-slate-400">Track vendor setups and employee roster shifts on monthly calendars</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-900/50 p-2 rounded-2xl border border-slate-900 text-xs">
          <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1 hover:bg-slate-800 rounded-lg select-none">
            <input type="checkbox" checked={showEvents} onChange={(e) => setShowEvents(e.target.checked)} className="accent-cyan-500" />
            <span className="text-cyan-400 font-medium">Events</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1 hover:bg-slate-800 rounded-lg select-none">
            <input type="checkbox" checked={showVendors} onChange={(e) => setShowVendors(e.target.checked)} className="accent-indigo-500" />
            <span className="text-indigo-400 font-medium">Vendors</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1 hover:bg-slate-800 rounded-lg select-none">
            <input type="checkbox" checked={showStaff} onChange={(e) => setShowStaff(e.target.checked)} className="accent-emerald-500" />
            <span className="text-emerald-400 font-medium">Staff Shifts</span>
          </label>
        </div>
      </div>

      {/* Main Grid Calendar Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Monthly grid */}
        <div className="lg:col-span-8 glass-card p-5 bg-slate-905">
          {/* Calendar Controller bar */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-200 text-sm">
              {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl transition-all border border-slate-850">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={nextMonth} className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl transition-all border border-slate-850">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] uppercase font-bold text-slate-450 mb-2 border-b border-slate-850 pb-2">
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
              if (!day) return <div key={`empty-${idx}`} className="h-24 bg-slate-950/20 border border-slate-950/5 rounded-2xl" />;
              
              const acts = getActivitiesForDate(day);
              const isToday = new Date().toDateString() === day.toDateString();

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day, acts)}
                  className={`h-24 p-1.5 flex flex-col justify-between border rounded-2xl hover:border-slate-700 hover:bg-slate-850/35 transition-all cursor-pointer group ${
                    isToday ? 'border-primary-500 bg-primary-950/10' : 'border-slate-850 bg-slate-950/40'
                  }`}
                >
                  <span className={`text-[10px] font-bold self-end w-5 h-5 rounded-full flex items-center justify-center ${
                    isToday ? 'bg-primary-600 text-white shadow-md' : 'text-slate-400 group-hover:text-slate-200'
                  }`}>
                    {day.getDate()}
                  </span>

                  <div className="space-y-1 overflow-y-auto max-h-12 text-[8px] mt-1 pr-0.5">
                    {acts.slice(0, 2).map((a, i) => (
                      <div key={i} className={`px-1.5 py-0.5 border rounded-md truncate font-medium ${a.color}`}>
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
        <div className="lg:col-span-4 glass-card p-6">
          <h3 className="font-semibold text-sm text-slate-200 mb-4 pb-2 border-b border-slate-850">
            Selected Day Agenda
          </h3>

          {!selectedDayStr ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <CalendarDays className="w-8 h-8 text-primary-500 opacity-30 mx-auto mb-2" />
              <p>Click any calendar date to review crew schedules and events</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-[10px] text-primary-400 font-bold bg-primary-950/30 border border-primary-900/35 p-2 rounded-xl text-center">
                {selectedDayStr}
              </div>

              {selectedDayActivities.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No scheduled tasks or events registered for this day</p>
              ) : (
                <div className="space-y-3">
                  {selectedDayActivities.map((act, idx) => (
                    <div
                      key={idx}
                      className={`p-3 border rounded-xl text-xs flex flex-col gap-1.5 bg-gradient-to-tr ${act.color}`}
                    >
                      <span className="font-bold">{act.label}</span>
                      
                      {act.type === 'event' && (
                        <div className="text-[9px] opacity-80 space-y-1 pt-1 mt-1 border-t border-slate-800">
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
