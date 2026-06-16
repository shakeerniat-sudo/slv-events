import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useUIStore } from '../store/uiStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Search, Filter, Plus, Eye, Trash2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const Events = () => {
  const navigate = useNavigate();
  const { isCoordinator } = useAuth();
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('date_asc');
  const [page, setPage] = useState(1);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    eventType: 'Corporate',
    eventDate: '',
    venue: '',
    budget: '',
    guestCount: '',
    themePreference: '',
    notes: ''
  });
  const [formError, setFormError] = useState(null);

  // Handle auto-open and prefill date from URL query (e.g. from Availability Calendar)
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('create') === 'true') {
      const dateParam = params.get('date');
      if (dateParam) {
        setFormData(prev => ({ ...prev, eventDate: dateParam }));
      }
      setShowModal(true);
      // Clean up parameters to prevent modal reopening on refresh
      navigate('/events', { replace: true });
    }
  }, [location.search]);

  // Search input debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset to page 1 on search
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Page resets when filter changes
  useEffect(() => {
    setPage(1);
  }, [status, sort]);

  // Query to fetch events
  const { data, isLoading } = useQuery({
    queryKey: ['events', { search: debouncedSearch, status, sort, page }],
    queryFn: async () => {
      const res = await axios.get('/events', {
        params: { search: debouncedSearch, status, sort, page, limit: 9 }
      });
      return res.data;
    },
    placeholderData: (prev) => prev
  });

  const eventsData = data?.data || [];
  const totalPages = data?.totalPages || 1;
  const totalItems = data?.total || 0;

  // Create Event Mutation
  const createEventMutation = useMutation({
    mutationFn: async (formData) => {
      await axios.post('/events', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowModal(false);
      // Reset form
      setFormData({
        name: '',
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        eventType: 'Corporate',
        eventDate: '',
        venue: '',
        budget: '',
        guestCount: '',
        themePreference: '',
        notes: ''
      });
      addToast('Event booking registered successfully!');
    },
    onError: (err) => {
      setFormError(err.response?.data?.message || 'Failed to register event. Try again.');
      addToast('Failed to register event.', 'error');
    }
  });

  // Delete Event Mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (id) => {
      await axios.delete(`/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      addToast('Event successfully deleted and canceled.');
      window.alert('Event deleted successfully.');
    },
    onError: () => {
      addToast('Failed to cancel event.', 'error');
    }
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateEvent = (e) => {
    e.preventDefault();
    setFormError(null);
    createEventMutation.mutate(formData);
  };

  const handleDeleteEvent = (id) => {
    if (!window.confirm('Are you sure you want to cancel and remove this event? This will release all rostered crew.')) return;
    deleteEventMutation.mutate(id);
  };

  const getStatusColor = (st) => {
    switch (st.toLowerCase()) {
      case 'pending': 
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/30';
      case 'assigned': 
        return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/30';
      case 'in progress': 
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/30';
      case 'completed': 
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'cancelled': 
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/30';
      default: 
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 animate-fade-in-up pr-2">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Event Registrations</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage client event bookings and scheduling checklists</p>
        </div>
        
        {isCoordinator && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event Booking</span>
          </button>
        )}
      </div>

      {/* Filter and Search Panels */}
      <div className="glass-card p-4 flex flex-col lg:flex-row gap-4 bg-white dark:bg-[#111C30]/40">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by event title, venue or customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input !pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl transition-colors">
            <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-550" />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-transparent text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer pr-4"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">All Statuses</option>
              <option value="pending" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Pending</option>
              <option value="assigned" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Assigned</option>
              <option value="in progress" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">In Progress</option>
              <option value="completed" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Completed</option>
              <option value="cancelled" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl transition-colors">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-transparent text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer pr-4"
            >
              <option value="date_asc" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Upcoming First</option>
              <option value="date_desc" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Latest Bookings</option>
              <option value="budget_desc" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">High Budget</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events List Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="h-64 bg-white dark:bg-[#111C30]/40 border border-slate-200 dark:border-slate-800 rounded-3xl" />
          ))}
        </div>
      ) : eventsData.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-450 bg-white dark:bg-[#111C30]/40">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-35 text-sky-500" />
          <p className="text-sm">No events found matching current criteria</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {eventsData.map(ev => (
              <div
                key={ev.id}
                onClick={() => navigate(`/events/${ev.id}`)}
                className="glass-card bg-white hover:bg-slate-50/50 dark:bg-[#111C30]/20 dark:hover:bg-[#111C30]/40 p-6 flex flex-col justify-between h-72 cursor-pointer relative overflow-hidden group hover:scale-[1.01] duration-200"
              >
                <div>
                  {/* Header tags */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-350 rounded-full font-bold">
                      {ev.event_type}
                    </span>
                    <span className={`text-[9px] px-2.5 py-0.5 border rounded-full font-bold uppercase tracking-wider ${getStatusColor(ev.status)}`}>
                      {ev.status}
                    </span>
                  </div>

                  {/* Event Details */}
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-sky-500 transition-colors truncate">
                    {ev.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{ev.venue}</p>

                  <div className="grid grid-cols-2 gap-4 mt-6 border-t border-slate-150 dark:border-slate-850/80 pt-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-450 dark:text-slate-500 block uppercase font-bold">Event Date</span>
                      <span className="text-slate-700 dark:text-slate-300 font-bold">{new Date(ev.event_date).toLocaleDateString('en-GB')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-450 dark:text-slate-500 block uppercase font-bold">Budget Allocation</span>
                      <span className="text-sky-500 dark:text-sky-400 font-bold">₹{parseFloat(ev.budget).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between border-t border-slate-150 dark:border-slate-850/80 pt-4 mt-6">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px] text-sky-600 dark:text-sky-400 capitalize shrink-0">
                      {ev.client_name?.charAt(0)}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">{ev.client_name}</span>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/events/${ev.id}`)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {isCoordinator && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setTimeout(() => handleDeleteEvent(ev.id), 0);
                        }}
                        className="p-1.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950 text-slate-450 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg border border-slate-200 dark:border-slate-700/50 transition-colors cursor-pointer"
                        title="Delete Event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-8">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold select-none">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Event Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-modal-zoom my-8 max-h-[90vh] overflow-y-auto transition-colors">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Register New Event Booking</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 dark:bg-rose-950/60 dark:border-rose-800/60 rounded-xl flex items-center gap-2 text-rose-800 dark:text-rose-450 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Event Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Event Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Wedding Reception - Rahul & Sneha"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>

                {/* Client Details */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Client Contact Name *</label>
                  <input
                    type="text"
                    name="clientName"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Client Phone *</label>
                  <input
                    type="tel"
                    name="clientPhone"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={formData.clientPhone}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Client Email</label>
                  <input
                    type="email"
                    name="clientEmail"
                    placeholder="e.g. rahul@example.com"
                    value={formData.clientEmail}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>

                {/* Event Specifications */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Event Category *</label>
                  <select
                    name="eventType"
                    value={formData.eventType}
                    onChange={handleInputChange}
                    className="form-input cursor-pointer pr-8"
                  >
                    <option value="Corporate" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Corporate Gala / Launch</option>
                    <option value="Wedding" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Wedding / Pre-wedding</option>
                    <option value="Sangeet" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Sangeet / Dance Event</option>
                    <option value="Concert" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Music Concert / Fest</option>
                    <option value="Birthday" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Birthday / Private Party</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Scheduled Date *</label>
                  <input
                    type="date"
                    name="eventDate"
                    required
                    value={formData.eventDate}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Venue Address *</label>
                  <input
                    type="text"
                    name="venue"
                    required
                    placeholder="e.g. Royal Palace Hall, Bangalore"
                    value={formData.venue}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Total Budget (INR) *</label>
                  <input
                    type="number"
                    name="budget"
                    required
                    placeholder="e.g. 250000"
                    value={formData.budget}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Expected Guest Count</label>
                  <input
                    type="number"
                    name="guestCount"
                    placeholder="e.g. 300"
                    value={formData.guestCount}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Theme Preference / Palette</label>
                  <input
                    type="text"
                    name="themePreference"
                    placeholder="e.g. Mint Green & Gold Floral"
                    value={formData.themePreference}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Planning Notes</label>
                  <textarea
                    name="notes"
                    placeholder="Add special instructions, food preferences or decoration highlights..."
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="3"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEventMutation.isPending}
                  className="px-5 py-2.5 bg-sky-500 hover:bg-sky-650 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                >
                  {createEventMutation.isPending ? 'Registering...' : 'Register Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
