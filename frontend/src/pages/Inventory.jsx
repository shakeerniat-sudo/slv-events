import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useUIStore } from '../store/uiStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Boxes, Search, Plus, Trash2, AlertCircle } from 'lucide-react';

const Inventory = () => {
  const { isOps } = useAuth();
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Add Item Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    itemName: '',
    quantity: '',
    status: 'In Stock'
  });
  const [formError, setFormError] = useState(null);

  // Search input debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Query to fetch inventory
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory', debouncedSearch],
    queryFn: async () => {
      const res = await axios.get('/inventory');
      return res.data;
    }
  });

  // Client-side filter matching the server database search
  const filteredItems = items.filter(item =>
    item.item_name.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  // Create Inventory Mutation
  const createItemMutation = useMutation({
    mutationFn: async (formData) => {
      await axios.post('/inventory', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setShowAddModal(false);
      setFormData({
        itemName: '',
        quantity: '',
        status: 'In Stock'
      });
      addToast('Warehouse stock item registered successfully!');
    },
    onError: (err) => {
      setFormError(err.response?.data?.message || 'Failed to add inventory item');
      addToast('Failed to add warehouse stock.', 'error');
    }
  });

  // Delete Inventory Mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id) => {
      await axios.delete(`/inventory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      addToast('Warehouse item deleted successfully.');
      window.alert('Inventory item deleted successfully.');
    },
    onError: () => {
      addToast('Failed to delete item.', 'error');
    }
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    setFormError(null);
    createItemMutation.mutate(formData);
  };

  const handleDeleteItem = (id) => {
    if (!window.confirm('Are you sure you want to remove this item from the warehouse log?')) return;
    deleteItemMutation.mutate(id);
  };

  const getStatusColor = (st) => {
    switch (st.toLowerCase()) {
      case 'in stock': 
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'out of stock': 
        return 'bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-955/40 dark:text-rose-400 dark:border-rose-900/30';
      case 'maintenance': 
        return 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-955/40 dark:text-amber-400 dark:border-amber-900/30';
      case 'assigned': 
        return 'bg-indigo-50 text-indigo-700 border-indigo-250 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/30';
      default: 
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 animate-fade-in-up pr-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Stage Material & Inventory</h2>
          <p className="text-xs text-slate-550 dark:text-slate-400">Track structural props, LED lights, stages, and PA sound systems</p>
        </div>

        {isOps && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Warehouse Stock</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 bg-white dark:bg-[#111C30]/40 border-slate-200 dark:border-slate-850">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search structural items, lights or speakers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input !pl-10 animate-fade-in"
          />
        </div>
      </div>

      {/* Inventory Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="h-44 bg-white dark:bg-[#111C30]/40 border border-slate-200 dark:border-slate-800 rounded-3xl" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-450 bg-white dark:bg-[#111C30]/40 border-slate-200 dark:border-slate-800">
          <Boxes className="w-12 h-12 mx-auto mb-4 opacity-35 text-sky-500 animate-bounce" />
          <p className="text-sm">No warehouse stock items found matching your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="glass-card p-5 bg-white hover:bg-slate-50/50 dark:bg-[#111C30]/20 dark:hover:bg-[#111C30]/40 flex flex-col justify-between h-44 hover:scale-[1.01] duration-150 border-slate-200 dark:border-slate-850"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title={item.item_name}>
                    {item.item_name}
                  </h3>
                  <span className="text-[10px] text-slate-455 dark:text-slate-400 mt-0.5 block">Item Catalog ID: #{item.id}</span>
                </div>
                <span className={`text-[9px] px-2.5 py-0.5 border rounded-full font-bold uppercase tracking-wider ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-150 dark:border-slate-850 pt-3 mt-4 text-xs transition-colors">
                <div>
                  <span className="text-[9px] text-slate-455 dark:text-slate-500 uppercase block font-bold">Total Qty</span>
                  <span className="font-bold text-slate-800 dark:text-slate-350">{item.quantity} Units</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-455 dark:text-slate-500 uppercase block font-bold">Available Qty</span>
                  <span className="font-bold text-sky-550 dark:text-sky-400">{item.available_quantity} Units</span>
                </div>
              </div>

              {isOps && (
                <div className="flex justify-end pt-3 border-t border-slate-150 dark:border-slate-850/60 mt-3 transition-colors" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setTimeout(() => handleDeleteItem(item.id), 0);
                    }}
                    className="p-1.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-900 dark:hover:bg-red-950 text-slate-450 hover:text-rose-500 dark:hover:text-rose-455 border border-slate-200 dark:border-slate-800/80 rounded-lg transition-colors cursor-pointer"
                    title="Delete Item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-modal-zoom transition-colors">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Register Warehouse Stock</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 dark:bg-rose-955/65 dark:border-rose-800/65 rounded-xl flex items-center gap-2 text-rose-800 dark:text-rose-455 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Item Name *</label>
                <input
                  type="text"
                  name="itemName"
                  required
                  placeholder="e.g. Banquet Chairs (Red Velvet)"
                  value={formData.itemName}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Total Quantity *</label>
                  <input
                    type="number"
                    name="quantity"
                    required
                    placeholder="e.g. 500"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Status *</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="form-input cursor-pointer pr-8"
                  >
                    <option value="In Stock" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">In Stock</option>
                    <option value="Out of Stock" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Out of Stock</option>
                    <option value="Maintenance" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Maintenance</option>
                  </select>
                </div>
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
                  disabled={createItemMutation.isPending}
                  className="px-5 py-2.5 bg-sky-500 hover:bg-sky-655 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                >
                  {createItemMutation.isPending ? 'Registering...' : 'Register Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
