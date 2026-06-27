import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useUIStore } from '../store/uiStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Search, Plus, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const Payments = () => {
  const { isFinance } = useAuth();
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(1);

  // Add Payment Modal
  const [showAddModal, setShowAddModal] = useState(false);
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

  // Search input debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset to page 1 on search
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);


  // Query to fetch payments (paginated)
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', { search: debouncedSearch, type: filterType, page }],
    queryFn: async () => {
      const res = await axios.get('/payments', {
        params: { search: debouncedSearch, type: filterType, page, limit: 10 }
      });
      return res.data;
    },
    placeholderData: (prev) => prev
  });

  const payments = paymentsData?.data || [];
  const totalPages = paymentsData?.totalPages || 1;

  // Query to fetch all events (for creation dropdown)
  const { data: events = [] } = useQuery({
    queryKey: ['events-dropdown'],
    queryFn: async () => {
      const res = await axios.get('/events');
      return res.data;
    },
    enabled: showAddModal,
  });

  // Query to fetch all vendors (for creation dropdown)
  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors-dropdown'],
    queryFn: async () => {
      const res = await axios.get('/vendors');
      return res.data;
    },
    enabled: showAddModal,
  });



  // Create Payment Mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (formData) => {
      await axios.post('/payments', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
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
      addToast('Payment entry registered successfully!');
    },
    onError: (err) => {
      setFormError(err.response?.data?.message || 'Failed to add payment item');
      addToast('Failed to add payment item', 'error');
    }
  });

  // Mark paid mutation
  const markPaidMutation = useMutation({
    mutationFn: async (id) => {
      await axios.put(`/payments/${id}`, { status: 'Paid' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      // Invalidate dashboard metrics as well
      queryClient.invalidateQueries({ queryKey: ['dashboardKpi'] });
      addToast('Payment marked as PAID.');
    },
    onError: () => {
      addToast('Failed to update status', 'error');
    }
  });

  // Delete payment mutation
  const deletePaymentMutation = useMutation({
    mutationFn: async (id) => {
      await axios.delete(`/payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardKpi'] });
      addToast('Payment entry removed.');
      window.alert('Payment deleted successfully.');
    },
    onError: () => {
      addToast('Failed to delete payment entry', 'error');
    }
  });

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

  const handleAddPayment = (e) => {
    e.preventDefault();
    setFormError(null);
    const submitData = { ...formData };
    if (!submitData.eventId && events.length > 0) submitData.eventId = events[0].id.toString();
    if (submitData.type === 'vendor' && !submitData.vendorId && vendors.length > 0) submitData.vendorId = vendors[0].id.toString();
    createPaymentMutation.mutate(submitData);
  };

  const handleMarkAsPaid = (id) => {
    if (!window.confirm('Mark this payment installment as PAID? This will clear the outstanding balance.')) return;
    markPaidMutation.mutate(id);
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this payment entry?')) return;
    deletePaymentMutation.mutate(id);
  };

  const getStatusBadge = (st) => {
    switch (st.toLowerCase()) {
      case 'paid': 
        return 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30 font-bold';
      case 'pending': 
        return 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/30 dark:font-bold';
      case 'overdue': 
        return 'bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/30 font-bold';
      default: 
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 animate-fade-in-up pr-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Financial Payments Center</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage client contract installments and outsource vendor payments</p>
        </div>

        {isFinance && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Payment Log</span>
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
            placeholder="Search payments by event name or vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input !pl-10"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl transition-colors">
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1);
            }}
            className="bg-transparent text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer pr-4"
          >
            <option value="all" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">All Types</option>
            <option value="client" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Client Payments</option>
            <option value="vendor" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Vendor Payments</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      {paymentsLoading ? (
        <div className="flex-1 py-12 text-center text-xs text-slate-400 dark:text-slate-500 animate-pulse">Running database financials scan...</div>
      ) : payments.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-450 bg-white dark:bg-[#111C30]/40">
          <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-35 text-sky-500" />
          <p className="text-sm">No transaction items found matching filters</p>
        </div>
      ) : (
        <>
          <div className="glass-card overflow-hidden bg-white dark:bg-[#111C30]/40">
            <div className="overflow-x-auto">
              <table className="modern-table">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-950/25">
                    <th>Event Details</th>
                    <th>Type</th>
                    <th>Entity</th>
                    <th>Invoice / Cost</th>
                    <th>Dues Status</th>
                    <th>Deadline</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td className="font-semibold text-slate-800 dark:text-slate-200">{p.event_name}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.type === 'client' 
                            ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-400 dark:border-cyan-900/35' 
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/35'
                        }`}>
                          {p.type}
                        </span>
                      </td>
                      <td className="text-slate-650 dark:text-slate-350">{p.type === 'vendor' ? p.vendor_name : 'Direct Client'}</td>
                      <td className="font-semibold text-slate-800 dark:text-slate-200">
                        ₹{parseFloat(p.amount).toLocaleString()}
                        {p.type === 'client' && parseFloat(p.balance) > 0 && (
                          <span className="block text-[10px] text-slate-450 dark:text-slate-550 font-normal mt-0.5">
                            Bal: ₹{parseFloat(p.balance).toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`px-2.5 py-0.5 border rounded-full text-[9px] ${getStatusBadge(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="text-slate-600 dark:text-slate-400">{p.due_date && !p.due_date.toString().includes('Invalid Date') && !isNaN(new Date(p.due_date).getTime()) ? new Date(p.due_date).toLocaleDateString('en-GB') : ''}</td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {p.status !== 'Paid' && isFinance && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setTimeout(() => handleMarkAsPaid(p.id), 0);
                              }}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:text-emerald-400 dark:border-emerald-900/60 rounded-lg font-bold text-[10px] transition-colors cursor-pointer"
                            >
                              Mark Paid
                            </button>
                          )}
                          {isFinance && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setTimeout(() => handleDelete(p.id), 0);
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950 text-slate-450 hover:text-rose-500 dark:hover:text-rose-455 border border-slate-200 dark:border-slate-700/50 rounded-lg transition-colors cursor-pointer"
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

      {/* Add Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-modal-zoom transition-colors">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Register Payment Entry</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 dark:bg-rose-955/60 dark:border-rose-800/60 rounded-xl flex items-center gap-2 text-rose-800 dark:text-rose-455 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddPayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Select Event *</label>
                  <select
                    name="eventId"
                    value={formData.eventId || (events.length > 0 ? events[0].id.toString() : '')}
                    onChange={handleInputChange}
                    className="form-input cursor-pointer"
                  >
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                        {ev.name} (Budget: ₹{parseFloat(ev.budget).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Payment Type *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="form-input cursor-pointer"
                  >
                    <option value="client" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Client Collection</option>
                    <option value="vendor" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Vendor Outsource</option>
                  </select>
                </div>

                {formData.type === 'vendor' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Outsource Vendor *</label>
                    <select
                      name="vendorId"
                      value={formData.vendorId || (vendors.length > 0 ? vendors[0].id.toString() : '')}
                      onChange={handleInputChange}
                      className="form-input cursor-pointer"
                    >
                      {vendors.map(v => (
                        <option key={v.id} value={v.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">{v.name} ({v.category})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {formData.type === 'client' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Contract Total Value *</label>
                    <input
                      type="number"
                      name="totalAmount"
                      required
                      placeholder="e.g. 150000"
                      value={formData.totalAmount}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Advance Paid</label>
                    <input
                      type="number"
                      name="advance"
                      placeholder="e.g. 50000"
                      value={formData.advance}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Payment Amount *</label>
                  <input
                    type="number"
                    name="amount"
                    required
                    placeholder="e.g. 50000"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Due Date *</label>
                  <input
                    type="date"
                    name="dueDate"
                    required
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Ledger Remarks</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="e.g. stage advance/first installment"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-655 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPaymentMutation.isPending}
                  className="px-5 py-2.5 bg-sky-500 hover:bg-sky-655 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                >
                  {createPaymentMutation.isPending ? 'Registering...' : 'Register Payment'}
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
