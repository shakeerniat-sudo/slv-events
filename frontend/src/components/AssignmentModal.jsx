import { useState, useEffect } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '../store/uiStore';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Search,
  Briefcase,
  Users,
  ClipboardCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AssignmentModal = ({ event, onClose }) => {
  const { addToast } = useUIStore();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const isVendorCoordinator = user?.role === 'Vendor Coordinator';
  const isOperationsLead = user?.role === 'Operations Lead';

  // Search input filters
  const [decoratorSearch, setDecoratorSearch] = useState('');
  const [catererSearch, setCatererSearch] = useState('');
  const [photographerSearch, setPhotographerSearch] = useState('');
  const [anchorSearch, setAnchorSearch] = useState('');
  const [soundSearch, setSoundSearch] = useState('');
  const [coordinatorSearch, setCoordinatorSearch] = useState('');
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [helperSearch, setHelperSearch] = useState('');

  // Selected state IDs
  const [selectedDecorator, setSelectedDecorator] = useState('');
  const [selectedCaterer, setSelectedCaterer] = useState('');
  const [selectedPhotographer, setSelectedPhotographer] = useState('');
  const [selectedAnchor, setSelectedAnchor] = useState('');
  const [selectedSoundTeam, setSelectedSoundTeam] = useState('');
  const [selectedCoordinator, setSelectedCoordinator] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [selectedHelpers, setSelectedHelpers] = useState([]);

  // Data fetching & saving states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successSummary, setSuccessSummary] = useState(null);

  // Full datasets loaded from standard endpoints
  const [vendorsList, setVendorsList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [currentAssignment, setCurrentAssignment] = useState(null);

  // Fetch initial data from live modules
  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const fetches = [];

        // 1. Vendors (Admin or Vendor Coordinator)
        if (isAdmin || isVendorCoordinator) {
          fetches.push(axios.get('/vendors').then(r => ({ type: 'vendors', data: r.data })));
        } else {
          fetches.push(Promise.resolve({ type: 'vendors', data: [] }));
        }

        // 2. Staff (Admin or Operations Lead)
        if (isAdmin || isOperationsLead) {
          fetches.push(axios.get('/staff').then(r => ({ type: 'staff', data: r.data })));
        } else {
          fetches.push(Promise.resolve({ type: 'staff', data: [] }));
        }

        // 3. Assignments (all roles need this to check availability/conflicts)
        fetches.push(axios.get('/assignments').then(r => ({ type: 'assignments', data: r.data })));

        // 4. Events
        fetches.push(axios.get('/events').then(r => ({ type: 'events', data: r.data })));

        // 5. Current Event details
        fetches.push(axios.get(`/assignments/event/${event.id}`).then(r => ({ type: 'current', data: r.data })).catch(() => ({ type: 'current', data: null })));

        const results = await Promise.all(fetches);

        if (!active) return;

        let loadedVendors = [];
        let loadedStaff = [];
        let loadedCurrent = null;

        results.forEach(res => {
          if (res.type === 'vendors') {
            loadedVendors = res.data || [];
            setVendorsList(loadedVendors);
          }
          if (res.type === 'staff') {
            loadedStaff = res.data || [];
            setStaffList(loadedStaff);
          }
          if (res.type === 'assignments') setAssignments(res.data || []);
          if (res.type === 'events') setAllEvents(res.data || []);
          if (res.type === 'current') {
            loadedCurrent = res.data;
            setCurrentAssignment(loadedCurrent);
          }
        });

        if (loadedCurrent) {
          setSelectedDecorator(loadedCurrent.decorator_id ? loadedCurrent.decorator_id.toString() : '');
          setSelectedCaterer(loadedCurrent.caterer_id ? loadedCurrent.caterer_id.toString() : '');
          setSelectedPhotographer(loadedCurrent.photographer_id ? loadedCurrent.photographer_id.toString() : '');
          setSelectedAnchor(loadedCurrent.anchor_id ? loadedCurrent.anchor_id.toString() : '');
          setSelectedSoundTeam(loadedCurrent.sound_team_id ? loadedCurrent.sound_team_id.toString() : '');

          // Map staff details if we have the staff list
          if (loadedStaff.length > 0) {
            const allStaffIds = loadedCurrent.staff_ids
              ? loadedCurrent.staff_ids.split(',').map(id => parseInt(id)).filter(Boolean)
              : [];

            const staffRolesMap = new Map(loadedStaff.map(s => [s.id, s.role]));

            const coord = allStaffIds.find(id => staffRolesMap.get(id) === 'Coordinator');
            const superv = allStaffIds.find(id => staffRolesMap.get(id) === 'Supervisor');
            const helpers = allStaffIds.filter(id => staffRolesMap.get(id) === 'Helper');

            setSelectedCoordinator(coord ? coord.toString() : '');
            setSelectedSupervisor(superv ? superv.toString() : '');
            setSelectedHelpers(helpers);
          }
        }
      } catch (err) {
        console.error('Error loading assignments data:', err);
        setError('Failed to fetch staffing rosters. Try again.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [event.id, isAdmin, isVendorCoordinator, isOperationsLead]);

  // Compute live availability and double-bookings dynamically
  const getResourceAvailability = (resourceType, resourceId) => {
    const resource = resourceType === 'vendor'
      ? vendorsList.find(v => v.id === parseInt(resourceId))
      : staffList.find(s => s.id === parseInt(resourceId));

    if (resource && resource.availability_status === 'Busy') {
      return { status: 'Unavailable', reason: '❌ Unavailable' };
    }

    const eventDateStr = new Date(event.event_date).toISOString().split('T')[0];
    const isOverlapping = assignments.some(a => {
      if (a.event_id === event.id) return false; // Skip current event
      if (a.resource_type !== resourceType || a.resource_id !== parseInt(resourceId)) return false;
      const otherEvent = allEvents.find(e => e.id === a.event_id);
      if (!otherEvent) return false;
      const otherDateStr = new Date(otherEvent.event_date).toISOString().split('T')[0];
      return otherDateStr === eventDateStr;
    });

    if (isOverlapping) {
      const conflictAssignment = assignments.find(a => {
        if (a.event_id === event.id) return false;
        if (a.resource_type !== resourceType || a.resource_id !== parseInt(resourceId)) return false;
        const otherEvent = allEvents.find(e => e.id === a.event_id);
        if (!otherEvent) return false;
        const otherDateStr = new Date(otherEvent.event_date).toISOString().split('T')[0];
        return otherDateStr === eventDateStr;
      });
      const conflictEvent = allEvents.find(e => e.id === conflictAssignment.event_id);
      const eventName = conflictEvent ? conflictEvent.name : 'overlapping event';
      return { status: 'Already Assigned', reason: `⚠️ Busy: Booked on "${eventName}"` };
    }

    return { status: 'Available', reason: '✅ Available' };
  };

  // Handle helper checkbox toggle
  const handleHelperToggle = (id) => {
    setSelectedHelpers(prev => {
      if (prev.includes(id)) {
        return prev.filter(hId => hId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Get name by ID helpers
  const getVendorName = (id) => {
    if (!id) return 'Not Assigned';
    const found = vendorsList.find(v => v.id === parseInt(id));
    return found ? found.name : `Vendor #${id}`;
  };

  const getStaffNames = (ids) => {
    if (!ids || ids.length === 0) return 'None';
    return ids.map(id => {
      const found = staffList.find(s => s.id === id);
      return found ? found.name : `Crew #${id}`;
    }).join(', ');
  };

  // Form Submit / Save
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      let decoratorVal = selectedDecorator ? parseInt(selectedDecorator) : null;
      let catererVal = selectedCaterer ? parseInt(selectedCaterer) : null;
      let photographerVal = selectedPhotographer ? parseInt(selectedPhotographer) : null;
      let anchorVal = selectedAnchor ? parseInt(selectedAnchor) : null;
      let soundTeamVal = selectedSoundTeam ? parseInt(selectedSoundTeam) : null;

      let combinedStaffIds = [
        selectedCoordinator ? parseInt(selectedCoordinator) : null,
        selectedSupervisor ? parseInt(selectedSupervisor) : null,
        ...selectedHelpers
      ].filter(Boolean);

      // Preserve values for fields current role is not authorized to edit
      if (isVendorCoordinator && currentAssignment) {
        combinedStaffIds = currentAssignment.staff_ids
          ? currentAssignment.staff_ids.split(',').map(id => parseInt(id)).filter(Boolean)
          : [];
      }
      if (isOperationsLead && currentAssignment) {
        decoratorVal = currentAssignment.decorator_id ? parseInt(currentAssignment.decorator_id) : null;
        catererVal = currentAssignment.caterer_id ? parseInt(currentAssignment.caterer_id) : null;
        photographerVal = currentAssignment.photographer_id ? parseInt(currentAssignment.photographer_id) : null;
        anchorVal = currentAssignment.anchor_id ? parseInt(currentAssignment.anchor_id) : null;
        soundTeamVal = currentAssignment.sound_team_id ? parseInt(currentAssignment.sound_team_id) : null;
      }

      const payload = {
        decorator_id: decoratorVal,
        caterer_id: catererVal,
        photographer_id: photographerVal,
        anchor_id: anchorVal,
        sound_team_id: soundTeamVal,
        staff_ids: combinedStaffIds,
        status: event.status === 'Pending' ? 'Assigned' : event.status
      };

      await axios.post(`/assignments/event/${event.id}`, payload);

      // Invalidate queries to instantly update UI and Dashboard states globally
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events-all'] });
      queryClient.invalidateQueries({ queryKey: ['assignments-all'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardKpi'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['conflicts'] });

      addToast('Event assignments saved successfully!');

      setSuccessSummary({
        decorator: getVendorName(decoratorVal),
        caterer: getVendorName(catererVal),
        photographer: getVendorName(photographerVal),
        anchor: getVendorName(anchorVal),
        soundTeam: getVendorName(soundTeamVal),
        helpers: getStaffNames(combinedStaffIds.filter(id => {
          const s = staffList.find(st => st.id === id);
          return s && s.role === 'Helper';
        }))
      });
    } catch (err) {
      console.error('Error saving assignments:', err);
      setError(err.response?.data?.message || 'Error occurred while saving assignments.');
      addToast('Failed to save assignments.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filters for searchable lists
  const filterVendors = (category, search) => {
    return vendorsList
      .filter(v => v.category === category)
      .filter(v => v.name.toLowerCase().includes(search.toLowerCase()))
      .map(v => {
        const avail = getResourceAvailability('vendor', v.id);
        return { ...v, status: avail.status, reason: avail.reason };
      });
  };

  const filterStaff = (role, search) => {
    return staffList
      .filter(s => s.role === role)
      .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
      .map(s => {
        const avail = getResourceAvailability('staff', s.id);
        return { ...s, status: avail.status, reason: avail.reason };
      });
  };

  // Lists
  const decorators = filterVendors('Decorator', decoratorSearch);
  const caterers = filterVendors('Caterer', catererSearch);
  const photographers = filterVendors('Photographer', photographerSearch);
  const anchors = filterVendors('Anchor', anchorSearch);
  const soundTeams = filterVendors('Sound Team', soundSearch);
  const coordinators = filterStaff('Coordinator', coordinatorSearch);
  const supervisors = filterStaff('Supervisor', supervisorSearch);
  const helpers = filterStaff('Helper', helperSearch);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -15 }}
            className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-8 flex flex-col justify-center items-center shadow-2xl min-h-[300px]"
          >
            <Loader2 className="w-10 h-10 animate-spin text-sky-500 mb-4" />
            <p className="text-xs font-bold text-slate-500 animate-pulse uppercase tracking-wider text-center">
              Fetching staffing rosters and live resource databases...
            </p>
          </motion.div>
        ) : successSummary ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -15 }}
            className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative"
          >
            <div className="flex items-center gap-3 text-emerald-500 mb-5 pb-2 border-b border-slate-100">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-slate-800">Assignment Complete</h3>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-700 space-y-3 shadow-inner">
              <h4 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-1.5">{event.name}</h4>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-400 font-bold uppercase text-[9px]">Decorator</span>
                <span className="col-span-2 font-semibold text-slate-800">{successSummary.decorator}</span>

                <span className="text-slate-400 font-bold uppercase text-[9px]">Caterer</span>
                <span className="col-span-2 font-semibold text-slate-800">{successSummary.caterer}</span>

                <span className="text-slate-400 font-bold uppercase text-[9px]">Photographer</span>
                <span className="col-span-2 font-semibold text-slate-800">{successSummary.photographer}</span>

                <span className="text-slate-400 font-bold uppercase text-[9px]">Anchor</span>
                <span className="col-span-2 font-semibold text-slate-800">{successSummary.anchor}</span>

                <span className="text-slate-400 font-bold uppercase text-[9px]">Sound Team</span>
                <span className="col-span-2 font-semibold text-slate-800">{successSummary.soundTeam}</span>

                <span className="text-slate-400 font-bold uppercase text-[9px]">Helpers</span>
                <span className="col-span-2 font-semibold text-slate-800 leading-normal">{successSummary.helpers}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 mt-6">
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer transition-colors"
              >
                Close Summary
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -15 }}
            className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto flex flex-col"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 mb-5 shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-sky-500" />
                  <span>{isOperationsLead && !isAdmin ? 'Assign Staff' : 'Assign Vendors & Staff'}</span>
                </h3>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Event: <strong className="text-slate-700">{event.name}</strong> ({new Date(event.event_date).toLocaleDateString('en-GB')})
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
                      {/* Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto pr-1 space-y-6">
              {/* Vendor Assignment Section */}
              {(isAdmin || isVendorCoordinator) && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-sky-500 shrink-0" />
                    <span>Vendor Assignment</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Decorator */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Decorator</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                          <Search className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="text"
                          placeholder="Search Decorators..."
                          value={decoratorSearch}
                          onChange={(e) => setDecoratorSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-[11px] mb-1.5 focus:outline-none focus:border-sky-550"
                        />
                      </div>
                      <select
                        value={selectedDecorator}
                        onChange={(e) => setSelectedDecorator(e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500 cursor-pointer"
                      >
                        <option value="">-- Select Decorator --</option>
                        {decorators.map(d => (
                          <option key={d.id} value={d.id} disabled={d.status === 'Unavailable'}>
                            {d.name} ({d.reason})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Caterer */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Caterer</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                          <Search className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="text"
                          placeholder="Search Caterers..."
                          value={catererSearch}
                          onChange={(e) => setCatererSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-[11px] mb-1.5 focus:outline-none focus:border-sky-550"
                        />
                      </div>
                      <select
                        value={selectedCaterer}
                        onChange={(e) => setSelectedCaterer(e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500 cursor-pointer"
                      >
                        <option value="">-- Select Caterer --</option>
                        {caterers.map(c => (
                          <option key={c.id} value={c.id} disabled={c.status === 'Unavailable'}>
                            {c.name} ({c.reason})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Photographer */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Photographer</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                          <Search className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="text"
                          placeholder="Search Photographers..."
                          value={photographerSearch}
                          onChange={(e) => setPhotographerSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-[11px] mb-1.5 focus:outline-none focus:border-sky-550"
                        />
                      </div>
                      <select
                        value={selectedPhotographer}
                        onChange={(e) => setSelectedPhotographer(e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500 cursor-pointer"
                      >
                        <option value="">-- Select Photographer --</option>
                        {photographers.map(p => (
                          <option key={p.id} value={p.id} disabled={p.status === 'Unavailable'}>
                            {p.name} ({p.reason})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Anchor */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Anchor</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                          <Search className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="text"
                          placeholder="Search Anchors..."
                          value={anchorSearch}
                          onChange={(e) => setAnchorSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-[11px] mb-1.5 focus:outline-none focus:border-sky-550"
                        />
                      </div>
                      <select
                        value={selectedAnchor}
                        onChange={(e) => setSelectedAnchor(e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500 cursor-pointer"
                      >
                        <option value="">-- Select Anchor --</option>
                        {anchors.map(a => (
                          <option key={a.id} value={a.id} disabled={a.status === 'Unavailable'}>
                            {a.name} ({a.reason})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sound Team */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Sound Team</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                          <Search className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="text"
                          placeholder="Search Sound Teams..."
                          value={soundSearch}
                          onChange={(e) => setSoundSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-[11px] mb-1.5 focus:outline-none focus:border-sky-550"
                        />
                      </div>
                      <select
                        value={selectedSoundTeam}
                        onChange={(e) => setSelectedSoundTeam(e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500 cursor-pointer"
                      >
                        <option value="">-- Select Sound Team --</option>
                        {soundTeams.map(s => (
                          <option key={s.id} value={s.id} disabled={s.status === 'Unavailable'}>
                            {s.name} ({s.reason})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Staff Assignment Section */}
              {(isAdmin || isOperationsLead) && (
                <div className={`space-y-4 ${(isAdmin) ? 'border-t border-slate-250 pt-5' : ''}`}>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Staff Assignment</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Coordinator */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Event Coordinator</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                          <Search className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="text"
                          placeholder="Search Coordinators..."
                          value={coordinatorSearch}
                          onChange={(e) => setCoordinatorSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-[11px] mb-1.5 focus:outline-none focus:border-sky-550"
                        />
                      </div>
                      <select
                        value={selectedCoordinator}
                        onChange={(e) => setSelectedCoordinator(e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500 cursor-pointer"
                      >
                        <option value="">-- Select Coordinator --</option>
                        {coordinators.map(c => (
                          <option key={c.id} value={c.id} disabled={c.status === 'Unavailable'}>
                            {c.name} ({c.reason})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Supervisor */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Supervisor</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                          <Search className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="text"
                          placeholder="Search Supervisors..."
                          value={supervisorSearch}
                          onChange={(e) => setSupervisorSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-[11px] mb-1.5 focus:outline-none focus:border-sky-550"
                        />
                      </div>
                      <select
                        value={selectedSupervisor}
                        onChange={(e) => setSelectedSupervisor(e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500 cursor-pointer"
                      >
                        <option value="">-- Select Supervisor --</option>
                        {supervisors.map(s => (
                          <option key={s.id} value={s.id} disabled={s.status === 'Unavailable'}>
                            {s.name} ({s.reason})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Helpers Checklist Multi-Select */}
                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Helpers (Multi-Select)</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                          <Search className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="text"
                          placeholder="Filter Helpers by name..."
                          value={helperSearch}
                          onChange={(e) => setHelperSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500 mb-2"
                        />
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-h-48 overflow-y-auto space-y-2 shadow-inner">
                        {helpers.length === 0 ? (
                          <p className="text-center text-[11px] text-slate-400 italic py-4">No helper staff found matching criteria</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {helpers.map(h => {
                              const isChecked = selectedHelpers.includes(h.id);
                              const isUnavailable = h.status === 'Unavailable';

                              return (
                                <label
                                  key={h.id}
                                  className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer select-none transition-colors duration-150 ${
                                    isUnavailable
                                      ? 'bg-slate-100/50 border-slate-200/50 opacity-40 cursor-not-allowed'
                                      : isChecked
                                        ? 'bg-emerald-50 border-emerald-250 text-emerald-800'
                                        : 'bg-white border-slate-200 hover:border-slate-350'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={isUnavailable}
                                    onChange={() => handleHelperToggle(h.id)}
                                    className="accent-emerald-500 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                  <div className="overflow-hidden">
                                    <span className="block truncate">{h.name}</span>
                                    <span className={`text-[9px] font-extrabold uppercase mt-0.5 block ${
                                      isUnavailable
                                        ? 'text-rose-500'
                                        : isChecked
                                          ? 'text-emerald-500'
                                          : 'text-slate-400'
                                    }`}>
                                      {h.reason}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Footer controls */}
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 mt-6 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer transition-transform duration-100 hover:scale-[1.01] active:scale-[0.99] flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Roster...</span>
                  </>
                ) : (
                  <span>Save Assignments</span>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AssignmentModal;
