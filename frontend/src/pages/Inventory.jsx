import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Boxes, Search, Plus, Trash2, Edit2, AlertCircle } from 'lucide-react';

const Inventory = () => {
  const { isOps } = useAuth();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add Item Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    itemName: '',
    quantity: '',
    status: 'In Stock'
  });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchInventory = async () => {
    try {
      const res = await axios.get('/inventory');
      setItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await axios.post('/inventory', formData);
      setShowAddModal(false);
      setFormData({
        itemName: '',
        quantity: '',
        status: 'In Stock'
      });
      fetchInventory();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to add inventory item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to remove this item from the warehouse log?')) return;
    try {
      await axios.delete(`/inventory/${id}`);
      fetchInventory();
    } catch (err) {
      alert('Error deleting item');
    }
  };

  const getStatusColor = (st) => {
    switch (st.toLowerCase()) {
      case 'in stock': return 'bg-emerald-950/80 text-emerald-400 border-emerald-900/40';
      case 'out of stock': return 'bg-red-950/80 text-red-400 border-red-900/40';
      case 'maintenance': return 'bg-amber-950/80 text-amber-400 border-amber-900/40';
      case 'assigned': return 'bg-indigo-950/80 text-indigo-400 border-indigo-900/40';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const filteredItems = items.filter(item =>
    item.item_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 animate-fade-in pr-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Stage Material & Inventory</h2>
          <p className="text-xs text-slate-400">Track structural props, LED lights, stages, and PA sound systems</p>
        </div>

        {isOps && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary-950/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Warehouse Stock</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search structural items, lights or speakers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 hover:border-slate-750 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition-all placeholder-slate-550"
          />
        </div>
      </div>

      {/* Inventory Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-44 bg-slate-900 border border-slate-800 rounded-3xl" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-500">
          <Boxes className="w-12 h-12 mx-auto mb-4 opacity-30 text-primary-500" />
          <p className="text-sm">No warehouse stock items found matching your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="glass-card p-5 bg-slate-900/40 flex flex-col justify-between h-44 hover:scale-[1.01] duration-150"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-sm text-slate-200 truncate max-w-[200px]" title={item.item_name}>
                    {item.item_name}
                  </h3>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Item Catalog ID: #{item.id}</span>
                </div>
                <span className={`text-[9px] px-2.5 py-0.5 border rounded-full font-bold uppercase tracking-wider ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-850 pt-3 mt-4 text-xs">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block">Total Qty</span>
                  <span className="font-bold text-slate-300">{item.quantity} Units</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block">Available Qty</span>
                  <span className="font-bold text-primary-400">{item.available_quantity} Units</span>
                </div>
              </div>

              {isOps && (
                <div className="flex justify-end pt-3 border-t border-slate-850/60 mt-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1 bg-slate-950 hover:bg-red-950 text-slate-450 hover:text-red-400 border border-slate-850 rounded-lg transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-5">
              <h3 className="font-bold text-lg text-slate-200">Register Warehouse Stock</h3>
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

            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Item Name *</label>
                <input
                  type="text"
                  name="itemName"
                  required
                  placeholder="e.g. Banquet Chairs (Red Velvet)"
                  value={formData.itemName}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Total Quantity *</label>
                  <input
                    type="number"
                    name="quantity"
                    required
                    placeholder="e.g. 500"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Status *</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none cursor-pointer"
                  >
                    <option value="In Stock" className="bg-slate-900">In Stock</option>
                    <option value="Out of Stock" className="bg-slate-900">Out of Stock</option>
                    <option value="Maintenance" className="bg-slate-900">Maintenance</option>
                  </select>
                </div>
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
                  {submitting ? 'Registering...' : 'Register Stock'}
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
