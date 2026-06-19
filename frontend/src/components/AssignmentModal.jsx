import { useState, useEffect } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '../store/uiStore';
import {
  X,
  Search,
  Briefcase,
  Users,
  ClipboardCheck,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AssignmentModal = ({ event, onClose }) => {
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();

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

  // Lists returned from availability API
  const [vendorsList, setVendorsList] = useState([]);
  const [staffList, setStaffList] = useState([]);

  // Fetch initial data
  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Parse date to YYYY-MM-DD
        const eventDateStr = new Date(event.event_date).toISOString().split('T')[0];

        // 1. Fetch availability of all resources for this event date
        const availRes = await axios.get('/assignments/availability', {
          params: { date: eventDateStr, eventId: event.id }
        });

        // 2. Fetch existing consolidated assignment (if any)
        const currentRes = await axios.get(`/assignments/event/${event.id}`);

        if (!active) return;

        setVendorsList(availRes.data.vendors || []);
        setStaffList(availRes.data.staff || []);

        const current = currentRes.data;
        if (current) {
          setSelectedDecorator(current.decorator_id ? current.decorator_id.toString() : '');
          setSelectedCaterer(current.caterer_id ? current.caterer_id.toString() : '');
          setSelectedPhotographer(current.photographer_id ? current.photographer_id.toString() : '');
          setSelectedAnchor(current.anchor_id ? current.anchor_id.toString() : '');
          setSelectedSoundTeam(current.sound_team_id ? current.sound_team_id.toString() : '');

          // Split staff_ids into coordinator, supervisor, and helpers
          const allStaffIds = current.staff_ids
            ? current.staff_ids.split(',').map(id => parseInt(id)).filter(Boolean)
            : [];

          // Identify coordinator & supervisor by their roles from staffList
          const staffRolesMap = new Map(availRes.data.staff.map(s => [s.id, s.role]));

          const coord = allStaffIds.find(id => staffRolesMap.get(id) === 'Coordinator');
          const superv = allStaffIds.find(id => staffRolesMap.get(id) === 'Supervisor');
          const helpers = allStaffIds.filter(id => staffRolesMap.get(id) === 'Helper');

          setSelectedCoordinator(coord ? coord.toString() : '');
          setSelectedSupervisor(superv ? superv.toString() : '');
          setSelectedHelpers(helpers);
        }
      } catch (err) {
        console.error('Error loading assignments data:', err);
        setError('Failed to query availability calendars or database files.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [event.id, event.event_date]);

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

      // Combine coordinator, supervisor, and helpers into staff_ids array
      const combinedStaffIds = [
        selectedCoordinator ? parseInt(selectedCoordinator) : null,
        selectedSupervisor ? parseInt(selectedSupervisor) : null,
        ...selectedHelpers
      ].filter(Boolean);

      const payload = {
        decorator_id: selectedDecorator ? parseInt(selectedDecorator) : null,
        caterer_id: selectedCaterer ? parseInt(selectedCaterer) : null,
        photographer_id: selectedPhotographer ? parseInt(selectedPhotographer) : null,
        anchor_id: selectedAnchor ? parseInt(selectedAnchor) : null,
        sound_team_id: selectedSoundTeam ? parseInt(selectedSoundTeam) : null,
        staff_ids: combinedStaffIds,
        status: 'Assigned'
      };

      await axios.post(`/assignments/event/${event.id}`, payload);

      // Invalidate queries to instantly update UI and Dashboard states globally
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events-all'] });
      queryClient.invalidateQueries({ queryKey: ['eventPlanner'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardKpi'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      addToast('Event assignments saved successfully!');

      // Set the success summary details to display as per requirement 5
      setSuccessSummary({
        decorator: getVendorName(selectedDecorator, 'Decorator'),
        caterer: getVendorName(selectedCaterer, 'Caterer'),
        photographer: getVendorName(selectedPhotographer, 'Photographer'),
        anchor: getVendorName(selectedAnchor, 'Anchor'),
        soundTeam: getVendorName(selectedSoundTeam, 'Sound Team'),
        helpers: getStaffNames(selectedHelpers)
      });
    } catch (err) {
      console.error('Error saving assignments:', err);
      setError(err.response?.data?.message || 'Error occurred while saving assignments.');
      addToast('Failed to save assignments.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filters for searchable dropdowns
  const filterVendors = (category, search) => {
    return vendorsList
      .filter(v => v.category === category)
      .filter(v => v.name.toLowerCase().includes(search.toLowerCase()));
  };

  const filterStaff = (role, search) => {
    return staffList
      .filter(s => s.role === role)
      .filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  };

  // Helper lists
  const decorators = filterVendors('Decorator', decoratorSearch);
  const caterers = filterVendors('Caterer', catererSearch);
  const photographers = filterVendors('Photographer', photographerSearch);
  const anchors = filterVendors('Anchor', anchorSearch);
  const soundTeams = filterVendors('Sound Team', soundSearch);
  const coordinators = filterStaff('Coordinator', coordinatorSearch);
  const supervisors = filterStaff('Supervisor', supervisorSearch);
  const helpers = filterStaff('Helper', helperSearch);

  // Unified rendering with animations
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
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 flex flex-col justify-center items-center shadow-2xl min-h-[300px]"
          >
            <Loader2 className="w-10 h-10 animate-spin text-sky-500 mb-4" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 animate-pulse uppercase tracking-wider text-center">
              Fetching staffing rosters and checking resource conflicts...
            </p>
          </motion.div>
        ) : successSummary ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -15 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative transition-colors"
          >
            <div className="flex items-center gap-3 text-emerald-500 mb-5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.15 }}
              >
                <CheckCircle2 className="w-6 h-6 shrink-0" />
              </motion.div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Assignment Complete</h3>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-850 rounded-2xl p-5 text-xs text-slate-700 dark:text-slate-300 space-y-3.5 shadow-inner">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-1.5">{event.name}</h4>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-450 dark:text-slate-500 font-bold uppercase text-[9px]">Decorator</span>
                <span className="col-span-2 font-semibold text-slate-800 dark:text-slate-200">{successSummary.decorator}</span>

                <span className="text-slate-450 dark:text-slate-500 font-bold uppercase text-[9px]">Caterer</span>
                <span className="col-span-2 font-semibold text-slate-800 dark:text-slate-200">{successSummary.caterer}</span>

                <span className="text-slate-450 dark:text-slate-500 font-bold uppercase text-[9px]">Photographer</span>
                <span className="col-span-2 font-semibold text-slate-800 dark:text-slate-200">{successSummary.photographer}</span>

                <span className="text-slate-450 dark:text-slate-500 font-bold uppercase text-[9px]">Anchor</span>
                <span className="col-span-2 font-semibold text-slate-800 dark:text-slate-200">{successSummary.anchor}</span>

                <span className="text-slate-450 dark:text-slate-500 font-bold uppercase text-[9px]">Sound Team</span>
                <span className="col-span-2 font-semibold text-slate-800 dark:text-slate-200">{successSummary.soundTeam}</span>

                <span className="text-slate-450 dark:text-slate-500 font-bold uppercase text-[9px]">Helpers</span>
                <span className="col-span-2 font-semibold text-slate-800 dark:text-slate-200 leading-normal">{successSummary.helpers}</span>

                <span className="text-slate-450 dark:text-slate-500 font-bold uppercase text-[9px] mt-1">Status</span>
                <span className="col-span-2 mt-0.5"><span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 rounded-full font-bold text-[9px] uppercase tracking-wider">Assigned ✅</span></span>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4 mt-6">
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
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto flex flex-col transition-colors"
          >

            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800 mb-5 shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-sky-500" />
                  <span>Assign Vendors & Staff</span>
                </h3>
                <p className="text-[10px] text-slate-455 dark:text-slate-400 font-medium mt-0.5">
                  Event: <strong className="text-slate-700 dark:text-slate-300">{event.name}</strong> ({new Date(event.event_date).toLocaleDateString('en-GB')})
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 dark:bg-rose-955/60 dark:border-rose-800/60 rounded-xl flex items-center gap-2 text-rose-800 dark:text-rose-455 text-xs shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto pr-1 space-y-6">

              {/* Vendor Assignment Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Vendor Assignment Section</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Decorator */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-455 uppercase tracking-wide">Decorator</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-slate-500">
                        <Search className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search Decorators..."
                        value={decoratorSearch}
                        onChange={(e) => setDecoratorSearch(e.target.value)}
                        className="form-input !pl-9 mb-1.5 py-1.5 text-[11px]"
                      />
                    </div>
                    <select
                      value={selectedDecorator}
                      onChange={(e) => setSelectedDecorator(e.target.value)}
                      className="form-input cursor-pointer"
                    >
                      <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">-- Select Decorator --</option>
                      {decorators.map(d => (
                        <option
                          key={d.id}
                          value={d.id}
                          disabled={d.status === 'Unavailable'}
                          className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 disabled:opacity-40"
                        >
                          {d.name} ({d.reason})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Caterer */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-455 uppercase tracking-wide">Caterer</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-slate-500">
                        <Search className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search Caterers..."
                        value={catererSearch}
                        onChange={(e) => setCatererSearch(e.target.value)}
                        className="form-input !pl-9 mb-1.5 py-1.5 text-[11px]"
                      />
                    </div>
                    <select
                      value={selectedCaterer}
                      onChange={(e) => setSelectedCaterer(e.target.value)}
                      className="form-input cursor-pointer"
                    >
                      <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">-- Select Caterer --</option>
                      {caterers.map(c => (
                        <option
                          key={c.id}
                          value={c.id}
                          disabled={c.status === 'Unavailable'}
                          className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                        >
                          {c.name} ({c.reason})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Photographer */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-455 uppercase tracking-wide">Photographer</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-slate-500">
                        <Search className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search Photographers..."
                        value={photographerSearch}
                        onChange={(e) => setPhotographerSearch(e.target.value)}
                        className="form-input !pl-9 mb-1.5 py-1.5 text-[11px]"
                      />
                    </div>
                    <select
                      value={selectedPhotographer}
                      onChange={(e) => setSelectedPhotographer(e.target.value)}
                      className="form-input cursor-pointer"
                    >
                      <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">-- Select Photographer --</option>
                      {photographers.map(p => (
                        <option
                          key={p.id}
                          value={p.id}
                          disabled={p.status === 'Unavailable'}
                          className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                        >
                          {p.name} ({p.reason})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Anchor */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-455 uppercase tracking-wide">Anchor</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-slate-500">
                        <Search className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search Anchors..."
                        value={anchorSearch}
                        onChange={(e) => setAnchorSearch(e.target.value)}
                        className="form-input !pl-9 mb-1.5 py-1.5 text-[11px]"
                      />
                    </div>
                    <select
                      value={selectedAnchor}
                      onChange={(e) => setSelectedAnchor(e.target.value)}
                      className="form-input cursor-pointer"
                    >
                      <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">-- Select Anchor --</option>
                      {anchors.map(a => (
                        <option
                          key={a.id}
                          value={a.id}
                          disabled={a.status === 'Unavailable'}
                          className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                        >
                          {a.name} ({a.reason})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sound Team */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-455 uppercase tracking-wide">Sound Team</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-slate-500">
                        <Search className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search Sound Teams..."
                        value={soundSearch}
                        onChange={(e) => setSoundSearch(e.target.value)}
                        className="form-input !pl-9 mb-1.5 py-1.5 text-[11px]"
                      />
                    </div>
                    <select
                      value={selectedSoundTeam}
                      onChange={(e) => setSelectedSoundTeam(e.target.value)}
                      className="form-input cursor-pointer"
                    >
                      <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">-- Select Sound Team --</option>
                      {soundTeams.map(s => (
                        <option
                          key={s.id}
                          value={s.id}
                          disabled={s.status === 'Unavailable'}
                          className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                        >
                          {s.name} ({s.reason})
                        </option>
                      ))}
                    </select>
                  </div>

                </div>
              </div>

              {/* Staff Assignment Section */}
              <div className="space-y-4 border-t border-slate-150 dark:border-slate-800 pt-5">
                <h4 className="text-xs font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Staff Assignment Section</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Coordinator */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-455 uppercase tracking-wide">Event Coordinator</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-slate-500">
                        <Search className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search Coordinators..."
                        value={coordinatorSearch}
                        onChange={(e) => setCoordinatorSearch(e.target.value)}
                        className="form-input !pl-9 mb-1.5 py-1.5 text-[11px]"
                      />
                    </div>
                    <select
                      value={selectedCoordinator}
                      onChange={(e) => setSelectedCoordinator(e.target.value)}
                      className="form-input cursor-pointer"
                    >
                      <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">-- Select Coordinator --</option>
                      {coordinators.map(c => (
                        <option
                          key={c.id}
                          value={c.id}
                          disabled={c.status === 'Unavailable'}
                          className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                        >
                          {c.name} ({c.reason})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Supervisor */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-455 uppercase tracking-wide">Supervisor</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-slate-500">
                        <Search className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search Supervisors..."
                        value={supervisorSearch}
                        onChange={(e) => setSupervisorSearch(e.target.value)}
                        className="form-input !pl-9 mb-1.5 py-1.5 text-[11px]"
                      />
                    </div>
                    <select
                      value={selectedSupervisor}
                      onChange={(e) => setSelectedSupervisor(e.target.value)}
                      className="form-input cursor-pointer"
                    >
                      <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">-- Select Supervisor --</option>
                      {supervisors.map(s => (
                        <option
                          key={s.id}
                          value={s.id}
                          disabled={s.status === 'Unavailable'}
                          className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                        >
                          {s.name} ({s.reason})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Helpers Checklist Multi-Select */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-455 uppercase tracking-wide">Helpers (Multi-Select)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-slate-500">
                        <Search className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Filter Helpers by name..."
                        value={helperSearch}
                        onChange={(e) => setHelperSearch(e.target.value)}
                        className="form-input !pl-9 mb-2"
                      />
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 max-h-48 overflow-y-auto space-y-2 shadow-inner">
                      {helpers.length === 0 ? (
                        <p className="text-center text-[11px] text-slate-450 italic py-4">No helper staff found matching criteria</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {helpers.map(h => {
                            const isChecked = selectedHelpers.includes(h.id);
                            const isUnavailable = h.status === 'Unavailable';

                            return (
                              <label
                                key={h.id}
                                className={`flex items-center gap-3.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer select-none transition-colors duration-150 ${isUnavailable
                                    ? 'bg-slate-100/50 border-slate-200/50 opacity-40 cursor-not-allowed dark:bg-slate-900/30 dark:border-slate-850'
                                    : isChecked
                                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-805 dark:bg-emerald-950/15 dark:border-emerald-900/50 dark:text-emerald-400'
                                      : 'bg-white border-slate-200 hover:border-slate-350 dark:bg-slate-900/50 dark:border-slate-850 dark:hover:border-slate-700'
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
                                  <span className={`text-[9px] font-extrabold uppercase mt-0.5 block ${isUnavailable
                                      ? 'text-rose-500'
                                      : isChecked
                                        ? 'text-emerald-500'
                                        : 'text-slate-450 dark:text-slate-500'
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

            </form>

            {/* Footer controls */}
            <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4 mt-6 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-655 dark:text-slate-350 hover:text-slate-950 dark:hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-sky-500 hover:bg-sky-655 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer transition-transform duration-100 hover:scale-[1.01] active:scale-[0.99] flex items-center gap-1.5"
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
