import React from 'react';
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
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import NotFound from './NotFound';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isCoordinator } = useAuth();
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();

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
          {isCoordinator && (
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

          {/* Quick Route to Crew Planner */}
          {isCoordinator && (
            <Link
              to={`/assignments?eventId=${event.id}`}
              className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99]"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-bounce shrink-0" />
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
          <div className="glass-card p-6 bg-white dark:bg-[#111C30]/40">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200 mb-4 pb-2 border-b border-slate-150 dark:border-slate-850">Event Specifications</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div className="flex items-start gap-3">
                <Calendar className="w-4.5 h-4.5 text-sky-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-450 dark:text-slate-500 block uppercase font-bold">Scheduled Date</span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{new Date(event.event_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
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

          {/* Roster / Assignments section */}
          <div className="glass-card p-6 bg-white dark:bg-[#111C30]/40">
            <h3 className="text-sm font-bold text-slate-855 dark:text-slate-200 mb-4 pb-2 border-b border-slate-150 dark:border-slate-855">Assigned Roster Crew</h3>
            
            <div className="space-y-6">
              {/* Assigned Vendors */}
              <div>
                <h4 className="text-xs font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                  <span>Vendor Assignments</span>
                </h4>
                {(!event.assignedVendors || event.assignedVendors.length === 0) ? (
                  <p className="text-xs text-slate-500 pl-6">No vendors assigned yet. Open the Crew Planner to assign.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {event.assignedVendors.map(v => (
                      <div key={v.id} className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl flex justify-between items-center text-xs transition-colors">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-350">{v.vendor_name}</p>
                          <span className="text-[10px] text-slate-455 dark:text-slate-400 capitalize">{v.vendor_category}</span>
                        </div>
                        <span className="text-[9px] px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 rounded-full font-bold">
                          ✓ Confirmed
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assigned Staff */}
              <div>
                <h4 className="text-xs font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                  <span>Internal Event Staff</span>
                </h4>
                {(!event.assignedStaff || event.assignedStaff.length === 0) ? (
                  <p className="text-xs text-slate-500 pl-6">No internal staff rostered yet. Open the Crew Planner to assign.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {event.assignedStaff.map(s => (
                      <div key={s.id} className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl flex justify-between items-center text-xs transition-colors">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-350">{s.staff_name}</p>
                          <span className="text-[10px] text-slate-455 dark:text-slate-400 capitalize">{s.staff_role}</span>
                        </div>
                        <span className="text-[9px] px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 rounded-full font-bold">
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
                <span className="text-slate-450 dark:text-slate-450 font-medium">Phone:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-250">{event.client_phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 dark:text-slate-450 font-medium">Email:</span>
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
    </div>
  );
};

export default EventDetail;
