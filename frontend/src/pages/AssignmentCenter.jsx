import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Calendar,
  AlertTriangle,
  Briefcase,
  Users,
  CheckCircle2,
  Trash2,
  Copy,
  Info,
  ShieldAlert
} from 'lucide-react';

const AssignmentCenter = () => {
  const { isCoordinator } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialEventId = searchParams.get('eventId');

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId || '');
  const [eventDetails, setEventDetails] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [briefs, setBriefs] = useState({ summary: '', vendorBriefing: '', staffBriefing: '' });
  const [loading, setLoading] = useState(false);
  
  // Dialog / Warning states
  const [conflictWarning, setConflictWarning] = useState(null);
  const [showBriefingModal, setShowBriefingModal] = useState(false);
  const [copiedText, setCopiedText] = useState('');

  // Fetch events list for dropdown
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await axios.get('/events');
        setEvents(res.data);
        if (res.data.length > 0 && !selectedEventId) {
          setSelectedEventId(res.data[0].id.toString());
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchEvents();
  }, []);

  // Fetch recommendations and assigned details when selected event changes
  const fetchEventPlannerData = async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const [detailRes, recRes] = await Promise.all([
        axios.get(`/events/${selectedEventId}`),
        axios.get(`/assignments/recommendations/${selectedEventId}`)
      ]);
      setEventDetails(detailRes.data);
      setRecommendations(recRes.data.recommendations);
      setBriefs({
        summary: recRes.data.summary,
        vendorBriefing: recRes.data.vendorBriefing,
        staffBriefing: recRes.data.staffBriefing
      });
      // Synchronize search params URL
      setSearchParams({ eventId: selectedEventId });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventPlannerData();
  }, [selectedEventId]);

  const handleAssign = async (resourceType, resourceId, force = false) => {
    try {
      await axios.post('/assignments', {
        eventId: selectedEventId,
        resourceType,
        resourceId,
        force
      });
      setConflictWarning(null);
      fetchEventPlannerData();
    } catch (err) {
      if (err.response?.status === 409) {
        // Conflict detected
        setConflictWarning({
          resourceType,
          resourceId,
          message: err.response.data.message,
          conflict: err.response.data.conflict
        });
      } else {
        alert(err.response?.data?.message || 'Error making assignment');
      }
    }
  };

  const handleRemoveAssignment = async (resourceType, resourceId) => {
    try {
      await axios.post('/assignments/delete', {
        eventId: selectedEventId,
        resourceType,
        resourceId
      });
      fetchEventPlannerData();
    } catch (err) {
      alert('Error removing assignment');
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Available': return 'bg-emerald-950/60 text-emerald-400 border-emerald-900/40 hover:bg-emerald-950';
      case 'Already Assigned': return 'bg-red-950/60 text-red-400 border-red-900/40 hover:bg-red-950 cursor-pointer';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 animate-fade-in pr-2">
      {/* Event Selection Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 border border-slate-900 p-4 rounded-3xl">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-primary-500 shrink-0" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold uppercase">Active Event Planner:</span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-transparent font-bold text-sm text-slate-200 outline-none cursor-pointer pr-4 focus:text-primary-450 border-b border-dashed border-slate-600 pb-0.5"
            >
              {events.map(e => (
                <option key={e.id} value={e.id} className="bg-slate-900 text-slate-250">
                  {e.name} ({new Date(e.event_date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {eventDetails && (
          <button
            onClick={() => setShowBriefingModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
          >
            <Copy className="w-4 h-4" />
            <span>Export Roster Briefings</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex-1 py-12 text-center text-xs text-slate-500 animate-pulse">
          Analyzing crew databases and conflict calendars...
        </div>
      ) : !eventDetails ? (
        <div className="glass-card p-12 text-center text-slate-500">
          <Info className="w-12 h-12 mx-auto mb-4 opacity-30 text-primary-500" />
          <p>Please register an event in the bookings module first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* Left Column: Required Crew & Current Roster Checklist */}
          <div className="xl:col-span-5 flex flex-col gap-6">
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-slate-200 mb-4 pb-2 border-b border-slate-850">
                Staffing Roster Checklist
              </h3>

              <div className="space-y-4">
                {/* 1. Vendors Needed */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-indigo-400" />
                    <span>Vendor Roles Required</span>
                  </h4>
                  <div className="space-y-2">
                    {['Decorator', 'Caterer', 'Photographer', 'Anchor', 'Sound Team'].map(cat => {
                      const assigned = eventDetails.assignedVendors.find(v => v.vendor_category === cat);
                      return (
                        <div
                          key={cat}
                          className="flex justify-between items-center p-3 bg-slate-950/40 border border-slate-850 rounded-xl text-xs"
                        >
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase font-medium">{cat}</span>
                            <span className="font-semibold text-slate-300">
                              {assigned ? assigned.vendor_name : '🚨 Not Assigned'}
                            </span>
                          </div>
                          {assigned ? (
                            <button
                              onClick={() => handleRemoveAssignment('vendor', assigned.resource_id)}
                              className="p-1.5 bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded-lg transition-colors border border-slate-850"
                              title="Remove Vendor"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-900/35 px-2.5 py-0.5 rounded-full font-semibold">
                              Pending
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Staff Roles Needed */}
                <div className="border-t border-slate-850 pt-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Internal Staff Needed</span>
                  </h4>
                  <div className="space-y-2">
                    {['Supervisor', 'Coordinator', 'Technician', 'Helper'].map(role => {
                      const assigned = eventDetails.assignedStaff.find(s => s.staff_role === role);
                      return (
                        <div
                          key={role}
                          className="flex justify-between items-center p-3 bg-slate-950/40 border border-slate-850 rounded-xl text-xs"
                        >
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase font-medium">{role}</span>
                            <span className="font-semibold text-slate-300">
                              {assigned ? assigned.staff_name : '🚨 Not Assigned'}
                            </span>
                          </div>
                          {assigned ? (
                            <button
                              onClick={() => handleRemoveAssignment('staff', assigned.resource_id)}
                              className="p-1.5 bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded-lg transition-colors border border-slate-850"
                              title="Remove Crew Member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-900/35 px-2.5 py-0.5 rounded-full font-semibold">
                              Pending
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: AI Suggestion Matrices */}
          <div className="xl:col-span-7 flex flex-col gap-6">
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-850">
                <Sparkles className="w-5 h-5 text-accent-gold" />
                <h3 className="text-sm font-semibold text-slate-200">
                  AI Recommendation & Assignment Panels
                </h3>
              </div>

              {/* Vendor Recommendations */}
              <div className="space-y-5">
                {['Decorator', 'Caterer', 'Photographer', 'Anchor', 'Sound Team'].map(cat => {
                  const options = recommendations ? recommendations[cat] || [] : [];
                  return (
                    <div key={cat} className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">{cat} Suggestions</h4>
                      
                      <div className="space-y-2">
                        {options.map(candidate => (
                          <div
                            key={candidate.id}
                            className="p-3 bg-slate-900/60 border border-slate-850 rounded-xl flex justify-between items-center text-xs"
                          >
                            <div>
                              <p className="font-semibold text-slate-200">{candidate.name}</p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                                <span>Rating: {parseFloat(candidate.rating).toFixed(1)}⭐</span>
                                <span>•</span>
                                <span>Tier: {candidate.price_range}</span>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                if (candidate.status === 'Already Assigned') {
                                  // triggers custom warning dialog
                                  setConflictWarning({
                                    resourceType: 'vendor',
                                    resourceId: candidate.id,
                                    message: 'Resource is already double-booked on this day.',
                                    conflict: { date: eventDetails.event_date }
                                  });
                                } else {
                                  handleAssign('vendor', candidate.id);
                                }
                              }}
                              className={`px-3 py-1.5 border rounded-lg font-semibold text-[11px] transition-all ${getStatusStyle(candidate.status)}`}
                            >
                              {candidate.status === 'Available' ? 'Assign' : 'Conflict ⚠️'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Staff Recommendations */}
                {recommendations && recommendations['Staff'] && (
                  <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Internal Crew Suggestions</h4>
                    <div className="space-y-4">
                      {['Supervisor', 'Coordinator', 'Technician', 'Helper'].map(role => {
                        const crew = recommendations['Staff'][role] || [];
                        return (
                          <div key={role} className="space-y-2">
                            <span className="text-[10px] text-slate-500 block uppercase font-bold">{role} Options</span>
                            {crew.map(c => (
                              <div
                                key={c.id}
                                className="p-3 bg-slate-900/60 border border-slate-850 rounded-xl flex justify-between items-center text-xs"
                              >
                                <div>
                                  <p className="font-semibold text-slate-200">{c.name}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">{c.experience_years} Years Experience</p>
                                </div>
                                <button
                                  onClick={() => {
                                    if (c.status === 'Already Assigned') {
                                      setConflictWarning({
                                        resourceType: 'staff',
                                        resourceId: c.id,
                                        message: 'Staff member is already assigned to a shift on this day.',
                                        conflict: { date: eventDetails.event_date }
                                      });
                                    } else {
                                      handleAssign('staff', c.id);
                                    }
                                  }}
                                  className={`px-3 py-1.5 border rounded-lg font-semibold text-[11px] transition-all ${getStatusStyle(c.status)}`}
                                >
                                  {c.status === 'Available' ? 'Assign' : 'Conflict ⚠️'}
                                </button>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Conflict Warning Dialog Modal */}
      {conflictWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center gap-3 text-rose-500 mb-4">
              <ShieldAlert className="w-6 h-6 shrink-0 animate-bounce" />
              <h3 className="font-bold text-lg text-slate-200">Scheduling Conflict Alert</h3>
            </div>

            <div className="bg-rose-950/35 border border-rose-900/40 rounded-2xl p-4 text-xs text-rose-300 mb-6 leading-relaxed">
              <p className="font-semibold mb-2">{conflictWarning.message}</p>
              <p>The selected resource is booked on <strong>{new Date(conflictWarning.conflict.date).toLocaleDateString()}</strong> for event <strong>{conflictWarning.conflict.eventName || 'another gig'}</strong>.</p>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-850 pt-4">
              <button
                onClick={() => setConflictWarning(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-white rounded-xl text-xs"
              >
                Cancel Assignment
              </button>
              <button
                onClick={() => handleAssign(conflictWarning.resourceType, conflictWarning.resourceId, true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-950/20"
              >
                Force Double Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Briefings Modal */}
      {showBriefingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-fade-in max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-5">
              <h3 className="font-bold text-lg text-slate-250">Exported Roster & Briefings</h3>
              <button
                onClick={() => setShowBriefingModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-850"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Summary Block */}
              <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 relative text-xs">
                <h4 className="font-semibold text-slate-400 mb-2 uppercase">Roster Summary Details</h4>
                <pre className="text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">{briefs.summary}</pre>
                <button
                  onClick={() => copyToClipboard(briefs.summary, 'summary')}
                  className="absolute top-4 right-4 p-1.5 bg-slate-900 border border-slate-800 hover:text-white rounded-lg text-slate-400 transition-colors"
                  title="Copy Summary"
                >
                  {copiedText === 'summary' ? 'Copied' : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Vendor Briefing */}
              <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 relative text-xs">
                <h4 className="font-semibold text-slate-400 mb-2 uppercase">Vendor Briefing Message (Outgoing SMS/Email)</h4>
                <pre className="text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">{briefs.vendorBriefing}</pre>
                <button
                  onClick={() => copyToClipboard(briefs.vendorBriefing, 'vendor')}
                  className="absolute top-4 right-4 p-1.5 bg-slate-900 border border-slate-800 hover:text-white rounded-lg text-slate-400 transition-colors"
                  title="Copy Briefing"
                >
                  {copiedText === 'vendor' ? 'Copied' : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Staff Briefing */}
              <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 relative text-xs">
                <h4 className="font-semibold text-slate-400 mb-2 uppercase">Internal Crew Instructions</h4>
                <pre className="text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">{briefs.staffBriefing}</pre>
                <button
                  onClick={() => copyToClipboard(briefs.staffBriefing, 'staff')}
                  className="absolute top-4 right-4 p-1.5 bg-slate-900 border border-slate-800 hover:text-white rounded-lg text-slate-400 transition-colors"
                  title="Copy Briefing"
                >
                  {copiedText === 'staff' ? 'Copied' : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end mt-6 border-t border-slate-800 pt-4">
              <button
                onClick={() => setShowBriefingModal(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-xs transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentCenter;
