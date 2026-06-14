import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { CreditCard, Search, DollarSign, Plus, CheckCircle, AlertTriangle, Clock, AlertCircle } from 'lucide-react';

const Payments = () => {
  const { isFinance } = useAuth();
  
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Add Payment Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [events, setEvents] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [formData, setFormData] = useState({
    eventId: '',
    type: 'client',
    vendorId: '',
    totalAmount: '',
    advance: '0',
    balance: '',
    amount: '',
    dueDate: '',
    status: 'Pending',
    notes: ''
  });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [payRes, evRes, venRes] = await Promise.all([
        axios.get('/payments'),
        axios.get('/events'),
        axios.get('/vendors')
      ]);
      setPayments(payRes.data);
      setEvents(evRes.data);
      setVendors(venRes.data);
      if (evRes.data.length > 0) {
        setFormData(prev => ({ ...prev, eventId: evRes.data[0].id.toString() }));
      }
      if (venRes.data.length > 0) {
        setFormData(prev => ({ ...prev, vendorId: venRes.data[0].id.toString() }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // Auto-calculate balance if total and advance are modified
      if (name === 'totalAmount' || name === 'advance') {
        const total = parseFloat(updated.totalAmount) || 0;
        const adv = parseFloat(updated.advance) || 0;
        updated.balance = (total - adv).toString();
        updated.amount = (total - adv).toString();
      }
      return updated;
    });
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await axios.post('/payments', formData);
      setShowAddModal(false);
      setFormData(prev => ({
        ...prev,
        type: 'client',
        totalAmount: '',
        advance: '0',
        balance: '',
        amount: '',
        dueDate: '',
        status: 'Pending',
        notes: ''
      }));
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to add payment item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAsPaid = async (id) => {
    if (!window.confirm('Mark this payment installment as PAID? This will clear the outstanding balance.')) return;
    try {
      await axios.put(`/payments/${id}`, { status: 'Paid' });
      fetchData();
    } catch (err) {
      alert('Error updating payment status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this payment entry?')) return;
    try {
      await axios.delete(`/payments/${id}`);
      fetchData();
    } catch (err) {
      alert('Error deleting payment entry');
    }
  };

  const filteredPayments = payments.filter(p => {
    const matchesSearch = p.event_name.toLowerCase().includes(search.toLowerCase()) || 
                          (p.vendor_name && p.vendor_name.toLowerCase().includes(search.toLowerCase()));
    const matchesType = filterType === 'all' || p.type === filterType;
    return matchesSearch && matchesType;
  });

  const getStatusBadge = (st) => {
    switch (st.toLowerCase()) {
      case 'paid': return 'bg-emerald-950/80 text-emerald-400 border-emerald-900/40 font-bold';
      case 'pending': return 'bg-amber-950/80 text-amber-400 border-amber-900/40 font-bold';
      case 'overdue': return 'bg-rose-950/80 text-rose-400 border-rose-900/40 font-bold';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 animate-fade-in pr-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Financial Payments Center</h2>
          <p className="text-xs text-slate-400">Manage client contract installments and outsource vendor payments</p>
        </div>

        {isFinance && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary-950/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Payment Log</span>
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
            placeholder="Search payments by event name or vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 hover:border-slate-750 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition-all placeholder-slate-550"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-950/40 border border-slate-800 px-3 py-1.5 rounded-xl">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-transparent text-xs text-slate-350 outline-none cursor-pointer pr-4"
          >
            <option value="all" className="bg-slate-900">All Types</option>
            <option value="client" className="bg-slate-900">Client Payments</option>
            <option value="vendor" className="bg-slate-900">Vendor Payments</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      {loading ? (
        <div className="flex-1 py-12 text-center text-xs text-slate-500 animate-pulse">Running database financials scan...</div>
      ) : filteredPayments.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-500">
          <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-30 text-primary-500" />
          <p className="text-sm">No transaction items found matching filters</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider bg-slate-950/20">
                  <th className="py-3 px-4">Event Details</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Invoice / Cost</th>
                  <th className="py-3 px-4">Dues Status</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-xs">
                {filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="py-4 px-4 font-semibold text-slate-200">{p.event_name}</td>
                    <td className="py-4 px-4 capitalize">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.type === 'client' ? 'bg-cyan-950 text-cyan-400' : 'bg-indigo-950 text-indigo-400'
                      }`}>
                        {p.type}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-350">{p.type === 'vendor' ? p.vendor_name : 'Direct Client'}</td>
                    <td className="py-4 px-4 font-semibold text-slate-200">
                      ₹{p.type === 'client' ? parseFloat(p.amount).toLocaleString() : parseFloat(p.amount).toLocaleString()}
                      {p.type === 'client' && parseFloat(p.balance) > 0 && (
                        <span className="block text-[10px] text-slate-500 font-normal mt-0.5">
                          Bal: ₹{parseFloat(p.balance).toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-0.5 border rounded-full text-[9px] ${getStatusBadge(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-400">{new Date(p.due_date).toLocaleDateString()}</td>
                    <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {p.status !== 'Paid' && isFinance && (
                          <button
                            onClick={() => handleMarkAsPaid(p.id)}
                            className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-900/60 rounded-lg font-bold text-[10px] transition-colors"
                          >
                            Mark Paid
                          </button>
                        )}
                        {isFinance && (
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 bg-slate-950 hover:bg-red-950 text-slate-450 hover:text-red-400 border border-slate-850 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-5">
              <h3 className="font-bold text-lg text-slate-200">Register Payment Entry</h3>
              <button
                onClick={() => setShowAddModal(false)}
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

            <form onSubmit={handleAddPayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Select Event *</label>
                  <select
                    name="eventId"
                    value={formData.eventId}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none"
                  >
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id} className="bg-slate-900">
                        {ev.name} (Budget: ₹{parseFloat(ev.budget).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Payment Type *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none cursor-pointer"
                  >
                    <option value="client" className="bg-slate-900">Client Collection</option>
                    <option value="vendor" className="bg-slate-900">Vendor Outsource</option>
                  </select>
                </div>

                {formData.type === 'vendor' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Outsource Vendor *</label>
                    <select
                      name="vendorId"
                      value={formData.vendorId}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none"
                    >
                      {vendors.map(v => (
                        <option key={v.id} value={v.id} className="bg-slate-900">{v.name} ({v.category})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {formData.type === 'client' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Contract Total Value *</label>
                    <input
                      type="number"
                      name="totalAmount"
                      required
                      placeholder="e.g. 150000"
                      value={formData.totalAmount}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Advance Paid</label>
                    <input
                      type="number"
                      name="advance"
                      placeholder="e.g. 50000"
                      value={formData.advance}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Payment Amount *</label>
                  <input
                    type="number"
                    name="amount"
                    required
                    placeholder="e.g. 50000"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Due Date *</label>
                  <input
                    type="date"
                    name="dueDate"
                    required
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Ledger Remarks</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="e.g. stage advance/first installment"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none"
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
                  {submitting ? 'Registering...' : 'Register Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
