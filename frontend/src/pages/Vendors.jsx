import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useUIStore } from '../store/uiStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Search, Star, Phone, Mail, Plus, Eye, Trash2, Calendar, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const Vendors = () => {
  const { isCoordinator } = useAuth();
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);

  // Add Vendor Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Decorator',
    contactPerson: '',
    phone: '',
    email: '',
    serviceType: '',
    priceRange: 'Medium',
    rating: '5.0'
  });
  const [formError, setFormError] = useState(null);

  // Schedule Modal selected vendor
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Search input debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset to page 1 on search
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Page reset when filter changes
  useEffect(() => {
    setPage(1);
  }, [category]);

  // Query to fetch vendors
  const { data, isLoading } = useQuery({
    queryKey: ['vendors', { search: debouncedSearch, category, page }],
    queryFn: async () => {
      const res = await axios.get('/vendors', {
        params: { search: debouncedSearch, category, page, limit: 9 }
      });
      return res.data;
    },
    placeholderData: (prev) => prev
  });

  const vendorsData = data?.data || [];
  const totalPages = data?.totalPages || 1;

  // Query to fetch specific vendor schedule (for schedule modal)
  const { data: schedule = [], isLoading: loadingSchedule } = useQuery({
    queryKey: ['vendorSchedule', selectedVendor?.id],
    queryFn: async () => {
      const res = await axios.get(`/vendors/${selectedVendor.id}`);
      return res.data.schedule || [];
    },
    enabled: !!selectedVendor && showScheduleModal,
  });

  // Create Vendor Mutation
  const createVendorMutation = useMutation({
    mutationFn: async (formData) => {
      await axios.post('/vendors', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setShowAddModal(false);
      setFormData({
        name: '',
        category: 'Decorator',
        contactPerson: '',
        phone: '',
        email: '',
        serviceType: '',
        priceRange: 'Medium',
        rating: '5.0'
      });
      addToast('Vendor registered successfully!');
    },
    onError: (err) => {
      setFormError(err.response?.data?.message || 'Failed to create vendor record');
      addToast('Failed to register vendor.', 'error');
    }
  });

  // Delete Vendor Mutation
  const deleteVendorMutation = useMutation({
    mutationFn: async (id) => {
      await axios.delete(`/vendors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      addToast('Vendor removed successfully.');
      window.alert('Vendor deleted successfully.');
    },
    onError: () => {
      addToast('Failed to delete vendor record.', 'error');
    }
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddVendor = (e) => {
    e.preventDefault();
    setFormError(null);
    createVendorMutation.mutate(formData);
  };

  const handleDeleteVendor = (id) => {
    if (!window.confirm('Are you sure you want to remove this vendor from database? This will clear all their assignments.')) return;
    deleteVendorMutation.mutate(id);
  };

  const handleViewSchedule = (vendor) => {
    setSelectedVendor(vendor);
    setShowScheduleModal(true);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 animate-fade-in-up pr-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Vendors Database</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Roster and verify ratings for external vendor services</p>
        </div>

        {isCoordinator && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Vendor</span>
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
            placeholder="Search vendor name or key contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input !pl-10"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl transition-colors">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-transparent text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer pr-4"
          >
            <option value="all" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">All Categories</option>
            <option value="Decorator" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Decorators</option>
            <option value="Caterer" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Caterers</option>
            <option value="Photographer" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Photographers</option>
            <option value="Anchor" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Anchors</option>
            <option value="Sound Team" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Sound Teams</option>
          </select>
        </div>
      </div>

      {/* Vendor Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="h-56 bg-white dark:bg-[#111C30]/40 border border-slate-200 dark:border-slate-800 rounded-3xl" />
          ))}
        </div>
      ) : vendorsData.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-450 bg-white dark:bg-[#111C30]/40">
          <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-35 text-sky-500" />
          <p className="text-sm">No vendors logged matching selection criteria</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {vendorsData.map(vendor => (
              <div
                key={vendor.id}
                className="glass-card p-6 flex flex-col justify-between h-60 bg-white hover:bg-slate-50/50 dark:bg-[#111C30]/20 dark:hover:bg-[#111C30]/40 relative overflow-hidden group hover:scale-[1.01] duration-150"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] px-2.5 py-0.5 bg-slate-100 dark:bg-slate-855 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 rounded-full font-bold">
                        {vendor.category}
                      </span>
                      <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-2 truncate group-hover:text-sky-500 transition-colors">
                        {vendor.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{parseFloat(vendor.rating).toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 mt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-450 dark:text-slate-500 font-medium">Contact:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">{vendor.contact_person || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="text-slate-705 dark:text-slate-300">{vendor.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="text-slate-705 dark:text-slate-300 truncate max-w-[200px]" title={vendor.email}>{vendor.email}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center border-t border-slate-150 dark:border-slate-850/80 pt-4 mt-6">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-450 dark:text-slate-500">
                    Tier: <span className="text-slate-700 dark:text-slate-300 font-bold">{vendor.price_range}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewSchedule(vendor)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                      title="View Schedule"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Schedule</span>
                    </button>
                    {isCoordinator && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setTimeout(() => handleDeleteVendor(vendor.id), 0);
                        }}
                        className="p-1.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950 text-slate-450 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg border border-slate-200 dark:border-slate-700/50 transition-colors cursor-pointer"
                        title="Delete Vendor"
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

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-modal-zoom my-8 max-h-[90vh] overflow-y-auto transition-colors">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Roster New Vendor</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 dark:bg-rose-950/60 dark:border-rose-800/60 rounded-xl flex items-center gap-2 text-rose-800 dark:text-rose-455 text-xs animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddVendor} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Vendor Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Lavender Florals"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="form-input cursor-pointer pr-8"
                >
                  <option value="Decorator" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Decorator</option>
                  <option value="Caterer" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Caterer</option>
                  <option value="Photographer" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Photographer</option>
                  <option value="Anchor" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Anchor</option>
                  <option value="Sound Team" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Sound Team</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Contact Representative</label>
                <input
                  type="text"
                  name="contactPerson"
                  placeholder="e.g. John Miller"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="e.g. +91 91234 56789"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Email *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="e.g. contact@decor.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Price Range *</label>
                  <select
                    name="priceRange"
                    value={formData.priceRange}
                    onChange={handleInputChange}
                    className="form-input cursor-pointer pr-8"
                  >
                    <option value="Low" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Standard (Low)</option>
                    <option value="Medium" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Premium (Medium)</option>
                    <option value="High" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Luxury (High)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Initial Rating (1-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    name="rating"
                    value={formData.rating}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Service Type Description</label>
                <input
                  type="text"
                  name="serviceType"
                  placeholder="e.g. Flower walls, floral setups"
                  value={formData.serviceType}
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
                  disabled={createVendorMutation.isPending}
                  className="px-5 py-2.5 bg-sky-500 hover:bg-sky-650 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                >
                  {createVendorMutation.isPending ? 'Rostering...' : 'Roster Vendor'}
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
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">Booking Calendar Schedule</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{selectedVendor?.name} ({selectedVendor?.category})</p>
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
                <p>No conflict assignments scheduled for this vendor</p>
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {schedule.map(item => (
                  <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-850 rounded-xl text-xs flex justify-between items-start gap-4 transition-colors">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-300">{item.event_name}</p>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1">{item.venue}</p>
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

export default Vendors;
