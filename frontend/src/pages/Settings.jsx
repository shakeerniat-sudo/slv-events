import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUIStore } from '../store/uiStore';
import { Building, Mail, Shield, CheckCircle } from 'lucide-react';

const SettingsPage = () => {
  const { user } = useAuth();
  const { addToast } = useUIStore();
  const [companyProfile, setCompanyProfile] = useState({
    companyName: 'SLV Events Private Limited',
    contactEmail: 'operations@slvevents.com',
    phone: '+91 80 4321 8765',
    address: 'No. 45, 2nd Floor, Residency Road, Bangalore - 560025',
    gstin: '29AAAAA1111A1Z1'
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setCompanyProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setSaveSuccess(false);
    setTimeout(() => {
      setProfileSaving(false);
      setSaveSuccess(true);
      addToast('Company configurations saved successfully!');
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1200);
  };

  // Mock list of database users to show user management
  const [usersList, setUsersList] = useState([]);
  
  useEffect(() => {
    setUsersList([
      { id: 1, name: 'Admin User', email: 'admin@slvevents.com', role: 'Admin' },
      { id: 2, name: 'Coordinator User', email: 'coordinator@slvevents.com', role: 'Vendor Coordinator' },
      { id: 3, name: 'Operations User', email: 'operations@slvevents.com', role: 'Operations Lead' },
      { id: 4, name: 'Finance User', email: 'finance@slvevents.com', role: 'Finance Team' }
    ]);
  }, []);

  const permissionMatrix = [
    { module: 'Events Management', admin: 'Full', coordinator: 'Full', ops: 'Read-Only', finance: 'Read-Only' },
    { module: 'Vendor Roster & Assignments', admin: 'Full', coordinator: 'Full', ops: 'None', finance: 'None' },
    { module: 'Internal Staffing', admin: 'Full', coordinator: 'None', ops: 'Full', finance: 'None' },
    { module: 'Payments & Financial Ledgers', admin: 'Full', coordinator: 'None', ops: 'None', finance: 'Full' },
    { module: 'Warehouse Stock Inventory', admin: 'Full', coordinator: 'None', ops: 'Full', finance: 'None' }
  ];

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 animate-fade-in-up pr-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Settings & Admin Console</h2>
          <p className="text-xs text-slate-550 dark:text-slate-400">Configure company metadata, user roles, and system permission scopes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Company Profile Configuration */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          <div className="glass-card p-6 bg-white dark:bg-[#111C30]/40 border-slate-200 dark:border-slate-850 transition-colors">
            <h3 className="font-bold text-sm text-slate-850 dark:text-slate-200 mb-4 pb-2 border-b border-slate-150 dark:border-slate-850 flex items-center gap-2">
              <Building className="w-4 h-4 text-sky-500" />
              <span>Company Information</span>
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-slate-500 dark:text-slate-400 mb-2 font-bold uppercase tracking-wider text-[10px]">Registered Company Name</label>
                  <input
                    type="text"
                    name="companyName"
                    value={companyProfile.companyName}
                    onChange={handleProfileChange}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-2 font-bold uppercase tracking-wider text-[10px]">Contact Email</label>
                  <input
                    type="email"
                    name="contactEmail"
                    value={companyProfile.contactEmail}
                    onChange={handleProfileChange}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-2 font-bold uppercase tracking-wider text-[10px]">Phone Helpline</label>
                  <input
                    type="text"
                    name="phone"
                    value={companyProfile.phone}
                    onChange={handleProfileChange}
                    className="form-input"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-500 dark:text-slate-400 mb-2 font-bold uppercase tracking-wider text-[10px]">Corporate Office Address</label>
                  <input
                    type="text"
                    name="address"
                    value={companyProfile.address}
                    onChange={handleProfileChange}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-2 font-bold uppercase tracking-wider text-[10px]">GSTIN Registration</label>
                  <input
                    type="text"
                    name="gstin"
                    value={companyProfile.gstin}
                    onChange={handleProfileChange}
                    className="form-input"
                  />
                </div>
              </div>

              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/40 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Company profile updated successfully.</span>
                </div>
              )}

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-5 py-2.5 bg-sky-500 hover:bg-sky-655 text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer"
                >
                  {profileSaving ? 'Saving Configurations...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* User management directory */}
          <div className="glass-card p-6 bg-white dark:bg-[#111C30]/40 border-slate-200 dark:border-slate-850 transition-colors">
            <h3 className="font-bold text-sm text-slate-850 dark:text-slate-200 mb-4 pb-2 border-b border-slate-150 dark:border-slate-850 flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <span>Sandbox Access Directory</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-150 dark:border-slate-800 text-[10px] text-slate-550 dark:text-slate-400 uppercase font-bold tracking-wider">
                    <th className="py-2.5 px-2">Account Name</th>
                    <th className="py-2.5 px-2">Login Email</th>
                    <th className="py-2.5 px-2">Role Label</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {usersList.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      <td className="py-3 px-2 font-semibold text-slate-800 dark:text-slate-200">{u.name}</td>
                      <td className="py-3 px-2 text-slate-500 dark:text-slate-400">{u.email}</td>
                      <td className="py-3 px-2">
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-950/60 border border-slate-250 dark:border-slate-800 px-2.5 py-0.5 rounded-lg text-slate-650 dark:text-slate-350 font-semibold">
                          {u.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Permission Matrix Details */}
        <div className="xl:col-span-5 glass-card p-6 bg-white dark:bg-[#111C30]/40 border-slate-200 dark:border-slate-850 transition-colors">
          <h3 className="font-bold text-sm text-slate-855 dark:text-slate-200 mb-4 pb-2 border-b border-slate-150 dark:border-slate-850 flex items-center gap-2">
            <Shield className="w-4 h-4 text-violet-500 dark:text-violet-400" />
            <span>Role Permissions Mapping</span>
          </h3>
          
          <div className="space-y-4 text-xs">
            {permissionMatrix.map((item, idx) => (
              <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-850 rounded-2xl space-y-3 transition-colors">
                <h4 className="font-bold text-slate-800 dark:text-slate-250 text-xs border-b border-slate-200 dark:border-slate-900 pb-1.5">{item.module}</h4>
                <div className="grid grid-cols-2 gap-y-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex justify-between pr-4">
                    <span className="font-medium">Admin:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{item.admin}</span>
                  </div>
                  <div className="flex justify-between pr-4">
                    <span className="font-medium">Coordinator:</span>
                    <span className="font-bold text-sky-655 dark:text-sky-400">{item.coordinator}</span>
                  </div>
                  <div className="flex justify-between pr-4">
                    <span className="font-medium">Operations:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{item.ops}</span>
                  </div>
                  <div className="flex justify-between pr-4">
                    <span className="font-medium">Finance:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-350">{item.finance}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsPage;
