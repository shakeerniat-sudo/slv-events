import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Briefcase,
  UserCheck,
  CreditCard,
  ChevronLeft,
  Settings,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isCoordinator, isFinance } = useAuth();
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchEventDetails = async () => {
    try {
      const res = await axios.get(`/events/${id}`);
      setEvent(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load event details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    setStatusUpdating(true);
    try {
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
      fetchEventDetails();
    } catch (err) {
      alert('Failed to update event status');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col gap-6 animate-pulse p-4">
        <div className="h-20 bg-slate-900 border border-slate-800 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-900 border border-slate-800 rounded-2xl" />
          <div className="h-96 bg-slate-900 border border-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="glass-card p-8 text-center text-slate-400">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <p className="text-sm">{error || 'Event not found'}</p>
        <Link to="/events" className="mt-4 inline-flex items-center gap-2 text-xs text-primary-500 hover:underline">
          <ChevronLeft className="w-4 h-4" />
          <span>Back to events</span>
        </Link>
      </div>
    );
  }

  // Calculate quick metrics
  const clientPayment = event.payments.find(p => p.type === 'client') || {
    total_amount: event.budget,
    advance: 0,
    balance: event.budget,
    status: 'Pending'
  };

  const vendorPayments = event.payments.filter(p => p.type === 'vendor');
  const totalVendorAllocated = vendorPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-8 animate-fade-in pr-2">
      {/* Header Back & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/events')}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition-all"
            title="Go Back"
          >
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{event.event_type} Planning</span>
            <h2 className="text-lg font-bold text-slate-100">{event.name}</h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Changer */}
          {isCoordinator && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Status:</span>
              <select
                disabled={statusUpdating}
                value={event.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer pr-4 disabled:opacity-55"
              >
                <option value="Pending" className="bg-slate-900">Pending</option>
                <option value="Assigned" className="bg-slate-900">Assigned</option>
                <option value="In Progress" className="bg-slate-900">In Progress</option>
                <option value="Completed" className="bg-slate-900">Completed</option>
                <option value="Cancelled" className="bg-slate-900">Cancelled</option>
              </select>
            </div>
          )}

          {/* Quick Route to Planner */}
          {isCoordinator && (
            <Link
              to={`/assignments?eventId=${event.id}`}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary-950/20"
            >
              <Sparkles className="w-4 h-4 text-accent-gold animate-bounce" />
              <span>Crew Planner Center</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Event Specifications & Crew */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Specifications Card */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 pb-2 border-b border-slate-850">Event Specifications</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Scheduled Date</span>
                  <span className="text-slate-350 font-semibold">{new Date(event.event_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Venue Venue</span>
                  <span className="text-slate-350 leading-relaxed font-semibold">{event.venue}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Guest Count</span>
                  <span className="text-slate-350 font-semibold">{event.guest_count} Attendees</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Theme Preference</span>
                  <span className="text-slate-350 font-semibold">{event.theme_preference || 'No custom theme specified'}</span>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {event.notes && (
              <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 mt-6 text-xs">
                <span className="text-[10px] text-slate-500 block uppercase mb-1">Planning Notes</span>
                <p className="text-slate-300 leading-normal whitespace-pre-line">{event.notes}</p>
              </div>
            )}
          </div>

          {/* Roster / Assignments section */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 pb-2 border-b border-slate-850">Assigned Roster Crew</h3>
            
            <div className="space-y-6">
              {/* Assigned Vendors */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-400" />
                  <span>Vendor Assignments</span>
                </h4>
                {event.assignedVendors.length === 0 ? (
                  <p className="text-xs text-slate-500 pl-6">No vendors assigned yet. Open the Crew Planner to assign.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {event.assignedVendors.map(v => (
                      <div key={v.id} className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <p className="font-semibold text-slate-300">{v.vendor_name}</p>
                          <span className="text-[10px] text-slate-500 capitalize">{v.vendor_category}</span>
                        </div>
                        <span className="text-[9px] px-2 py-0.5 bg-emerald-950/80 border border-emerald-900/60 text-emerald-400 rounded-full font-bold">
                          ✓ Confirmed
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assigned Staff */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Internal Event Staff</span>
                </h4>
                {event.assignedStaff.length === 0 ? (
                  <p className="text-xs text-slate-500 pl-6">No internal staff rostered yet. Open the Crew Planner to assign.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {event.assignedStaff.map(s => (
                      <div key={s.id} className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <p className="font-semibold text-slate-300">{s.staff_name}</p>
                          <span className="text-[10px] text-slate-500 capitalize">{s.staff_role}</span>
                        </div>
                        <span className="text-[9px] px-2 py-0.5 bg-emerald-950/80 border border-emerald-900/60 text-emerald-400 rounded-full font-bold">
                          ✓ Confirmed
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Contact Cards & Budget Dashboard */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Client contact card */}
          <div className="glass-card p-6 bg-gradient-to-tr from-slate-900 to-indigo-950/20">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Client Contact Profile</h3>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-primary-400 uppercase text-sm border border-slate-700">
                {event.client_name?.charAt(0)}
              </div>
              <div>
                <h4 className="font-semibold text-xs text-slate-200">{event.client_name}</h4>
                <p className="text-[10px] text-slate-500">Client ID: #{event.client_id}</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-350 border-t border-slate-850 pt-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="font-semibold text-slate-250">{event.client_phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-semibold text-slate-250 truncate max-w-[150px]" title={event.client_email}>{event.client_email || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Budget Financials card */}
          <div className="glass-card p-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-violet-400" />
              <span>Budget Ledger Summary</span>
            </h3>

            <div className="space-y-4">
              {/* Invoicing info */}
              <div className="bg-slate-950/60 p-4 border border-slate-850 rounded-2xl">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Contract Value:</span>
                  <span className="font-bold text-slate-100">₹{parseFloat(event.budget).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs mt-2 text-slate-400">
                  <span>Advance Paid:</span>
                  <span className="font-semibold text-emerald-400">₹{parseFloat(clientPayment.advance).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs mt-2 border-t border-slate-850 pt-2 font-semibold text-slate-300">
                  <span>Pending Invoice:</span>
                  <span className={parseFloat(clientPayment.balance) > 0 ? 'text-amber-400' : 'text-slate-400'}>
                    ₹{parseFloat(clientPayment.balance).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Vendor Allocations */}
              <div className="text-xs space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Vendor Cost Allocated:</span>
                  <span className="font-semibold text-slate-200">₹{totalVendorAllocated.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between font-bold text-slate-300 border-t border-slate-850 pt-2 text-[11px]">
                  <span>Est. Gross Margin:</span>
                  <span className="text-emerald-400">
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
    </div>
  );
};

export default EventDetail;
