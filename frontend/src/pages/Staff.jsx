import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useUIStore } from '../store/uiStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, Award, Phone, Plus, Calendar, Trash2, ShieldCheck, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const Staff = () => {
  const { isOps } = useAuth();
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [role, setRole] = useState('all');
  const [page, setPage] = useState(1);

  // Add Staff Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: 'Helper',
    phone: '',
    experienceYears: '1'
  });
  const [formError, setFormError] = useState(null);

  // Schedule Modal selected staff
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Search input debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset to page 1 on search
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);



  // Query to fetch staff list
  const { data, isLoading } = useQuery({
    queryKey: ['staff', { search: debouncedSearch, role, page }],
    queryFn: async () => {
      const res = await axios.get('/staff', {
        params: { search: debouncedSearch, role, page, limit: 9 }
      });
      return res.data;
    },
    placeholderData: (prev) => prev
  });

  const staffData = data?.data || [];
  const totalPages = data?.totalPages || 1;

  // Query to fetch specific staff schedule (for schedule modal)
  const { data: schedule = [], isLoading: loadingSchedule } = useQuery({
    queryKey: ['staffSchedule', selectedStaff?.id],
    queryFn: async () => {
      const res = await axios.get(`/staff/${selectedStaff.id}`);
      return res.data.schedule || [];
    },
    enabled: !!selectedStaff && showScheduleModal,
  });

  // Create Staff Mutation
  const createStaffMutation = useMutation({
    mutationFn: async (formData) => {
      await axios.post('/staff', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff-all'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardKpi'] });
      setShowAddModal(false);
      setFormData({
        name: '',
        role: 'Helper',
        phone: '',
        experienceYears: '1'
      });
      addToast('Staff member rostered successfully!');
    },
    onError: (err) => {
      setFormError(err.response?.data?.message || 'Failed to create staff record');
      addToast('Failed to roster staff.', 'error');
    }
  });

  // Delete Staff Mutation
  const deleteStaffMutation = useMutation({
    mutationFn: async (id) => {
      await axios.delete(`/staff/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff-all'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardKpi'] });
      addToast('Staff member removed successfully.');
      window.alert('Staff deleted successfully.');
    },
    onError: () => {
      addToast('Failed to delete staff record.', 'error');
    }
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddStaff = (e) => {
    e.preventDefault();
    setFormError(null);
    createStaffMutation.mutate(formData);
  };

  const handleDeleteStaff = (id) => {
    if (!window.confirm('Are you sure you want to remove this staff member? This will release them from all assigned events.')) return;
    deleteStaffMutation.mutate(id);
  };

  const handleViewSchedule = (st) => {
    setSelectedStaff(st);
    setShowScheduleModal(true);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 animate-fade-in-up pr-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Event Staff Roster</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Roster internal coordinators, helpers, and audio-stage technicians</p>
        </div>

        {isOps && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Crew Member</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col lg:flex-row gap-4 bg-white dark:bg-[#111C30]/40">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search staff by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input !pl-10"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl transition-colors">
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            className="bg-transparent text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer pr-4"
          >
            <option value="all" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">All Roles</option>
            <option value="Supervisor" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Supervisors</option>
            <option value="Coordinator" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Coordinators</option>
            <option value="Technician" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Technicians</option>
            <option value="Helper" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Helpers</option>
          </select>
        </div>
      </div>

      {/* Staff Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="h-56 bg-white dark:bg-[#111C30]/40 border border-slate-200 dark:border-slate-800 rounded-3xl" />
          ))}
        </div>
      ) : staffData.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-450 bg-white dark:bg-[#111C30]/40">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-35 text-sky-500" />
          <p className="text-sm">No rostered crew found matching criteria</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {staffData.map(s => (
              <div
                key={s.id}
                className="glass-card p-6 flex flex-col justify-between h-56 bg-white hover:bg-slate-50/50 dark:bg-[#111C30]/20 dark:hover:bg-[#111C30]/40 relative overflow-hidden group hover:scale-[1.01] duration-150"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] px-2.5 py-0.5 bg-slate-100 dark:bg-slate-855 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 rounded-full font-bold">
                        {s.role}
                      </span>
                      <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-2 truncate group-hover:text-sky-500 transition-colors">
                        {s.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-550 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-850">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span>{s.experience_years}y Exp</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 mt-4">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="text-slate-705 dark:text-slate-300 font-medium">{s.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="text-slate-705 dark:text-slate-300 capitalize">Available Status: {s.availability_status}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end items-center gap-2 border-t border-slate-150 dark:border-slate-850/80 pt-4 mt-6">
                  <button
                    onClick={() => handleViewSchedule(s)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                    title="View Work Calendar"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Workload</span>
                  </button>
                  {isOps && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setTimeout(() => handleDeleteStaff(s.id), 0);
                      }}
                      className="p-1.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950 text-slate-450 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg border border-slate-200 dark:border-slate-700/50 transition-colors cursor-pointer"
                      title="Delete Staff"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
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

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-modal-zoom transition-colors">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Register Crew Member</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 dark:bg-rose-955/60 dark:border-rose-800/60 rounded-xl flex items-center gap-2 text-rose-800 dark:text-rose-455 text-xs animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Sunil Gavaskar"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Roster Role *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="form-input cursor-pointer pr-8"
                >
                  <option value="Supervisor" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Supervisor</option>
                  <option value="Coordinator" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Coordinator</option>
                  <option value="Technician" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Technician</option>
                  <option value="Helper" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Helper</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="e.g. +91 88888 77777"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Years of Experience</label>
                <input
                  type="number"
                  min="0"
                  name="experienceYears"
                  value={formData.experienceYears}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createStaffMutation.isPending}
                  className="px-5 py-2.5 bg-sky-500 hover:bg-sky-650 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                >
                  {createStaffMutation.isPending ? 'Rostering...' : 'Roster Crew'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-modal-zoom max-h-[80vh] overflow-y-auto transition-colors">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">Work Assignment Calendar</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{selectedStaff?.name} ({selectedStaff?.role})</p>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-450 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {loadingSchedule ? (
              <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500 animate-pulse">Checking records...</div>
            ) : schedule.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <Calendar className="w-8 h-8 text-sky-500 opacity-35 mx-auto mb-2 animate-bounce" />
                <p>No shift conflicts scheduled for this crew member</p>
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {schedule.map(item => (
                  <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-850 rounded-xl text-xs flex justify-between items-start gap-4 transition-colors">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-300">{item.event_name}</p>
                      <p className="text-[10px] text-slate-455 dark:text-slate-500 mt-1">{item.venue}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-sky-600 bg-sky-50 border border-sky-200 dark:text-sky-400 dark:bg-sky-950/60 dark:border-sky-900/35 px-2.5 py-0.5 rounded-full">
                        {new Date(item.event_date).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;
