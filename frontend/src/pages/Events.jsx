import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Calendar, Search, Filter, Plus, Eye, Trash2, Edit2, AlertCircle } from 'lucide-react';

const Events = () => {
  const navigate = useNavigate();
  const { isCoordinator } = useAuth();
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('date_asc');
  
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
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await axios.get('/events', {
        params: { search, status, sort }
      });
      setEvents(res.data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [search, status, sort]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);
    try {
      await axios.post('/events', formData);
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
      fetchEvents();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to register event. Try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Are you sure you want to cancel and remove this event? This will release all rostered crew.')) return;
    try {
      await axios.delete(`/events/${id}`);
      fetchEvents();
    } catch (err) {
      alert('Failed to delete event');
    }
  };

  const getStatusColor = (st) => {
    switch (st.toLowerCase()) {
      case 'pending': return 'bg-amber-950/80 text-amber-400 border-amber-800/40';
      case 'assigned': return 'bg-blue-950/80 text-blue-400 border-blue-800/40';
      case 'in progress': return 'bg-indigo-950/80 text-indigo-400 border-indigo-800/40';
      case 'completed': return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/40';
      case 'cancelled': return 'bg-red-950/80 text-red-400 border-red-800/40';
      default: return 'bg-slate-800 text-slate-400';
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 animate-fade-in pr-2">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Event Registrations</h2>
          <p className="text-xs text-slate-400">Manage client event bookings and scheduling checklists</p>
        </div>
        
        {isCoordinator && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary-950/30 hover:scale-[1.01] active:scale-[0.99] duration-150"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event Booking</span>
          </button>
        )}
      </div>

      {/* Filter and Search Panels */}
      <div className="glass-card p-4 flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by event title, venue or customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 hover:border-slate-750 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition-all placeholder-slate-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950/40 border border-slate-800 px-3 py-1.5 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer pr-4"
            >
              <option value="all" className="bg-slate-900">All Statuses</option>
              <option value="pending" className="bg-slate-900">Pending</option>
              <option value="assigned" className="bg-slate-900">Assigned</option>
              <option value="in progress" className="bg-slate-900">In Progress</option>
              <option value="completed" className="bg-slate-900">Completed</option>
              <option value="cancelled" className="bg-slate-900">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/40 border border-slate-800 px-3 py-1.5 rounded-xl">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer pr-4"
            >
              <option value="date_asc" className="bg-slate-900">Upcoming First</option>
              <option value="date_desc" className="bg-slate-900">Latest Bookings</option>
              <option value="budget_desc" className="bg-slate-900">High Budget</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events List Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-64 bg-slate-900 border border-slate-800 rounded-3xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-500">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30 text-primary-500" />
          <p className="text-sm">No events found matching current criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {events.map(ev => (
            <div
              key={ev.id}
              onClick={() => navigate(`/events/${ev.id}`)}
              className="glass-card bg-slate-900/40 hover:bg-slate-900/75 p-6 flex flex-col justify-between h-72 cursor-pointer relative overflow-hidden group hover:scale-[1.01] duration-200"
            >
              <div>
                {/* Header tags */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] px-2.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-full font-semibold">
                    {ev.event_type}
                  </span>
                  <span className={`text-[9px] px-2.5 py-0.5 border rounded-full font-bold uppercase tracking-wider ${getStatusColor(ev.status)}`}>
                    {ev.status}
                  </span>
                </div>

                {/* Event Details */}
                <h3 className="font-bold text-sm text-slate-100 group-hover:text-primary-400 transition-colors truncate">
                  {ev.name}
                </h3>
                <p className="text-xs text-slate-450 mt-1 truncate">{ev.venue}</p>

                <div className="grid grid-cols-2 gap-4 mt-6 border-t border-slate-850 pt-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Event Date</span>
                    <span className="text-slate-300 font-semibold">{new Date(ev.event_date).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Budget Allocation</span>
                    <span className="text-primary-400 font-bold">₹{parseFloat(ev.budget).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-slate-850 pt-4 mt-6">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-400 capitalize">
                    {ev.client_name?.charAt(0)}
                  </div>
                  <span className="text-[11px] text-slate-400 truncate max-w-[120px]">{ev.client_name}</span>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => navigate(`/events/${ev.id}`)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  {isCoordinator && (
                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="p-1.5 bg-slate-850 hover:bg-red-950 text-slate-450 hover:text-red-400 rounded-lg border border-slate-800 transition-colors"
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
      )}

      {/* Create Event Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-fade-in my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-6">
              <h3 className="font-bold text-lg text-slate-200">Register New Event Booking</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-850"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-800/60 rounded-xl flex items-center gap-2 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Event Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Event Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Wedding Reception - Rahul & Sneha"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none focus:border-primary-500"
                  />
                </div>

                {/* Client Details */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Client Contact Name *</label>
                  <input
                    type="text"
                    name="clientName"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Client Phone *</label>
                  <input
                    type="tel"
                    name="clientPhone"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={formData.clientPhone}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Client Email</label>
                  <input
                    type="email"
                    name="clientEmail"
                    placeholder="e.g. rahul@example.com"
                    value={formData.clientEmail}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none focus:border-primary-500"
                  />
                </div>

                {/* Event Specifications */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Event Category *</label>
                  <select
                    name="eventType"
                    value={formData.eventType}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none focus:border-primary-500 cursor-pointer"
                  >
                    <option value="Corporate" className="bg-slate-900">Corporate Gala / Launch</option>
                    <option value="Wedding" className="bg-slate-900">Wedding / Pre-wedding</option>
                    <option value="Sangeet" className="bg-slate-900">Sangeet / Dance Event</option>
                    <option value="Concert" className="bg-slate-900">Music Concert / Fest</option>
                    <option value="Birthday" className="bg-slate-900">Birthday / Private Party</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Scheduled Date *</label>
                  <input
                    type="date"
                    name="eventDate"
                    required
                    value={formData.eventDate}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Venue Address *</label>
                  <input
                    type="text"
                    name="venue"
                    required
                    placeholder="e.g. Royal Palace Hall, Bangalore"
                    value={formData.venue}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Total Budget (INR) *</label>
                  <input
                    type="number"
                    name="budget"
                    required
                    placeholder="e.g. 250000"
                    value={formData.budget}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Expected Guest Count</label>
                  <input
                    type="number"
                    name="guestCount"
                    placeholder="e.g. 300"
                    value={formData.guestCount}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Theme Preference / Palette</label>
                  <input
                    type="text"
                    name="themePreference"
                    placeholder="e.g. Mint Green & Gold Floral"
                    value={formData.themePreference}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none focus:border-primary-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Planning Notes</label>
                  <textarea
                    name="notes"
                    placeholder="Add special instructions, food preferences or decoration highlights..."
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-white rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary-950/40"
                >
                  {formSubmitting ? 'Registering...' : 'Register Event'}
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
