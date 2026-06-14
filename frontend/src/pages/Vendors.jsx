import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Briefcase, Search, Star, Phone, Mail, Plus, Eye, Trash2, Calendar, AlertCircle } from 'lucide-react';

const Vendors = () => {
  const { isCoordinator } = useAuth();
  
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

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
  const [submitting, setSubmitting] = useState(false);

  // Schedule Modal
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedule, setSchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const fetchVendors = async () => {
    try {
      const res = await axios.get('/vendors');
      setVendors(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddVendor = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await axios.post('/vendors', formData);
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
      fetchVendors();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create vendor record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVendor = async (id) => {
    if (!window.confirm('Are you sure you want to remove this vendor from database? This will clear all their assignments.')) return;
    try {
      await axios.delete(`/vendors/${id}`);
      fetchVendors();
    } catch (err) {
      alert('Error deleting vendor');
    }
  };

  const handleViewSchedule = async (vendor) => {
    setSelectedVendor(vendor);
    setShowScheduleModal(true);
    setLoadingSchedule(true);
    try {
      const res = await axios.get(`/vendors/${vendor.id}`);
      setSchedule(res.data.schedule || []);
    } catch (err) {
      console.error(err);
      setSchedule([]);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) || 
                          v.contact_person?.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === 'all' || v.category === category;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 animate-fade-in pr-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Vendors Database</h2>
          <p className="text-xs text-slate-400">Roster and verify ratings for external vendor services</p>
        </div>

        {isCoordinator && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary-950/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Vendor</span>
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
            placeholder="Search vendor name or key contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 hover:border-slate-750 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition-all placeholder-slate-550"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-950/40 border border-slate-800 px-3 py-1.5 rounded-xl">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-transparent text-xs text-slate-350 outline-none cursor-pointer pr-4"
          >
            <option value="all" className="bg-slate-900">All Categories</option>
            <option value="Decorator" className="bg-slate-900">Decorators</option>
            <option value="Caterer" className="bg-slate-900">Caterers</option>
            <option value="Photographer" className="bg-slate-900">Photographers</option>
            <option value="Anchor" className="bg-slate-900">Anchors</option>
            <option value="Sound Team" className="bg-slate-900">Sound Teams</option>
          </select>
        </div>
      </div>

      {/* Vendor Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-56 bg-slate-900 border border-slate-800 rounded-3xl" />
          ))}
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-500">
          <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30 text-primary-500" />
          <p className="text-sm">No vendors logged matching selection criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredVendors.map(vendor => (
            <div
              key={vendor.id}
              className="glass-card p-6 flex flex-col justify-between h-60 bg-slate-900/40 relative overflow-hidden group hover:scale-[1.01] duration-150"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] px-2.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-350 rounded-full font-semibold">
                      {vendor.category}
                    </span>
                    <h3 className="font-bold text-sm text-slate-200 mt-2 truncate group-hover:text-primary-450 transition-colors">
                      {vendor.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-accent-gold font-bold">
                    <Star className="w-3.5 h-3.5 fill-accent-gold" />
                    <span>{parseFloat(vendor.rating).toFixed(1)}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Contact:</span>
                    <span className="text-slate-350">{vendor.contact_person || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-slate-350">{vendor.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-slate-350 truncate max-w-[200px]" title={vendor.email}>{vendor.email}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center border-t border-slate-850 pt-4 mt-6">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Tier: <span className="text-slate-300 font-semibold">{vendor.price_range}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewSchedule(vendor)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                    title="View Schedule"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Schedule</span>
                  </button>
                  {isCoordinator && (
                    <button
                      onClick={() => handleDeleteVendor(vendor.id)}
                      className="p-1.5 bg-slate-850 hover:bg-red-950 text-slate-450 hover:text-red-400 rounded-lg border border-slate-800 transition-colors"
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
      )}

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-fade-in my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-5">
              <h3 className="font-bold text-lg text-slate-200">Roster New Vendor</h3>
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

            <form onSubmit={handleAddVendor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Vendor Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Lavender Florals"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none focus:border-primary-500 cursor-pointer"
                >
                  <option value="Decorator" className="bg-slate-900">Decorator</option>
                  <option value="Caterer" className="bg-slate-900">Caterer</option>
                  <option value="Photographer" className="bg-slate-900">Photographer</option>
                  <option value="Anchor" className="bg-slate-900">Anchor</option>
                  <option value="Sound Team" className="bg-slate-900">Sound Team</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Contact Representative</label>
                <input
                  type="text"
                  name="contactPerson"
                  placeholder="e.g. John Miller"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="e.g. +91 91234 56789"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Email *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="e.g. contact@decor.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Price Range *</label>
                  <select
                    name="priceRange"
                    value={formData.priceRange}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none focus:border-primary-500 cursor-pointer"
                  >
                    <option value="Low" className="bg-slate-900">Standard (Low)</option>
                    <option value="Medium" className="bg-slate-900">Premium (Medium)</option>
                    <option value="High" className="bg-slate-900">Luxury (High)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Initial Rating (1-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    name="rating"
                    value={formData.rating}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Service Type Description</label>
                <input
                  type="text"
                  name="serviceType"
                  placeholder="e.g. Flower walls, floral setups"
                  value={formData.serviceType}
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
                  {submitting ? 'Rostering...' : 'Roster Vendor'}
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
                <h3 className="font-bold text-base text-slate-250">Booking Calendar Schedule</h3>
                <p className="text-[10px] text-slate-400">{selectedVendor?.name} ({selectedVendor?.category})</p>
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
                <p>No conflict assignments scheduled for this vendor</p>
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

export default Vendors;
