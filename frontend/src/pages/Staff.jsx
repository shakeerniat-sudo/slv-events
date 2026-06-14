import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Users, Search, Award, Phone, Plus, Calendar, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';

const Staff = () => {
  const { isOps } = useAuth();
  
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');

  // Add Staff Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: 'Helper',
    phone: '',
    experienceYears: '1'
  });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Schedule Modal
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedule, setSchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const fetchStaff = async () => {
    try {
      const res = await axios.get('/staff');
      setStaff(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await axios.post('/staff', formData);
      setShowAddModal(false);
      setFormData({
        name: '',
        role: 'Helper',
        phone: '',
        experienceYears: '1'
      });
      fetchStaff();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create staff record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('Are you sure you want to remove this staff member? This will release them from all assigned events.')) return;
    try {
      await axios.delete(`/staff/${id}`);
      fetchStaff();
    } catch (err) {
      alert('Error deleting staff record');
    }
  };

  const handleViewSchedule = async (st) => {
    setSelectedStaff(st);
    setShowScheduleModal(true);
    setLoadingSchedule(true);
    try {
      const res = await axios.get(`/staff/${st.id}`);
      setSchedule(res.data.schedule || []);
    } catch (err) {
      console.error(err);
      setSchedule([]);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchesRole = role === 'all' || s.role === role;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 animate-fade-in pr-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Event Staff Roster</h2>
          <p className="text-xs text-slate-400">Roster internal coordinators, helpers, and audio-stage technicians</p>
        </div>

        {isOps && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary-950/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Crew Member</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search staff by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 hover:border-slate-750 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition-all placeholder-slate-550"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-950/40 border border-slate-800 px-3 py-1.5 rounded-xl">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="bg-transparent text-xs text-slate-350 outline-none cursor-pointer pr-4"
          >
            <option value="all" className="bg-slate-900">All Roles</option>
            <option value="Supervisor" className="bg-slate-900">Supervisors</option>
            <option value="Coordinator" className="bg-slate-900">Coordinators</option>
            <option value="Technician" className="bg-slate-900">Technicians</option>
            <option value="Helper" className="bg-slate-900">Helpers</option>
          </select>
        </div>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-56 bg-slate-900 border border-slate-800 rounded-3xl" />
          ))}
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-500">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-30 text-primary-500" />
          <p className="text-sm">No rostered crew found matching criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredStaff.map(s => (
            <div
              key={s.id}
              className="glass-card p-6 flex flex-col justify-between h-56 bg-slate-900/40 relative overflow-hidden group hover:scale-[1.01] duration-150"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] px-2.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-350 rounded-full font-semibold">
                      {s.role}
                    </span>
                    <h3 className="font-bold text-sm text-slate-200 mt-2 truncate group-hover:text-primary-450 transition-colors">
                      {s.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-850">
                    <Award className="w-3.5 h-3.5 text-accent-gold" />
                    <span>{s.experience_years}y Exp</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400 mt-4">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-slate-350">{s.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-slate-350 capitalize">Available Status: {s.availability_status}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end items-center gap-2 border-t border-slate-850 pt-4 mt-6">
                <button
                  onClick={() => handleViewSchedule(s)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-330 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                  title="View Work Calendar"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Workload</span>
                </button>
                {isOps && (
                  <button
                    onClick={() => handleDeleteStaff(s.id)}
                    className="p-1.5 bg-slate-850 hover:bg-red-950 text-slate-450 hover:text-red-400 rounded-lg border border-slate-800 transition-colors"
                    title="Delete Staff"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-5">
              <h3 className="font-bold text-lg text-slate-200">Register Crew Member</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-850"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-800/60 rounded-xl flex items-center gap-2 text-red-400 text-xs animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Sunil Gavaskar"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Roster Role *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none focus:border-primary-500 cursor-pointer"
                >
                  <option value="Supervisor" className="bg-slate-900">Supervisor</option>
                  <option value="Coordinator" className="bg-slate-900">Coordinator</option>
                  <option value="Technician" className="bg-slate-900">Technician</option>
                  <option value="Helper" className="bg-slate-900">Helper</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="e.g. +91 88888 77777"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Years of Experience</label>
                <input
                  type="number"
                  min="0"
                  name="experienceYears"
                  value={formData.experienceYears}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none focus:border-primary-500"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-white rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary-950/40"
                >
                  {submitting ? 'Rostering...' : 'Roster Crew'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-fade-in max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-250">Work Assignment Calendar</h3>
                <p className="text-[10px] text-slate-400">{selectedStaff?.name} ({selectedStaff?.role})</p>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-850"
              >
                ✕
              </button>
            </div>

            {loadingSchedule ? (
              <div className="py-12 text-center text-xs text-slate-500 animate-pulse">Checking records...</div>
            ) : schedule.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <Calendar className="w-8 h-8 text-primary-500 opacity-30 mx-auto mb-2" />
                <p>No shift conflicts scheduled for this crew member</p>
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {schedule.map(item => (
                  <div key={item.id} className="p-3 bg-slate-950/50 border border-slate-850 rounded-xl text-xs flex justify-between items-start gap-4">
                    <div>
                      <p className="font-semibold text-slate-300">{item.event_name}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{item.venue}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-semibold text-primary-400 bg-primary-950/60 border border-primary-900/30 px-2.5 py-0.5 rounded-full">
                        {new Date(item.event_date).toLocaleDateString()}
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
