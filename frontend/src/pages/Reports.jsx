import React, { useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { FileBarChart, FileText, Download, ArrowUpRight } from 'lucide-react';

const Reports = () => {
  const { addToast } = useUIStore();
  const [downloadingReport, setDownloadingReport] = useState(null);
  const [reportType, setReportType] = useState('Event');
  const [format, setFormat] = useState('PDF');

  const handleExport = (type, fmt) => {
    setDownloadingReport(`${type}_${fmt}`);
    setTimeout(() => {
      // Simulate CSV file download trigger
      const dummyData = {
        Event: "Event ID,Event Name,Client Name,Date,Venue,Budget\n1,Annual Gala 2026,John Doe,2026-07-15,Grand Palace,150000\n2,Sarah Reception,Sarah Jenkins,2026-07-20,Lakeside Pavilion,350000",
        Vendor: "Vendor ID,Vendor Name,Category,Rating,Phone\n1,Royal Decorators,Decorator,4.8,+91 91111 22222\n2,Spice Route Catering,Caterer,4.5,+91 92222 33333",
        Staff: "Staff ID,Staff Name,Role,Experience,Phone\n1,Rohan Sharma,Supervisor,5 years,+91 81111 11111",
        Assignment: "Assignment ID,Event Name,Resource Type,Resource Name,Status\n1,Annual Gala 2026,vendor,Royal Decorators,Confirmed",
        Payment: "Payment ID,Event Name,Type,Amount,Due Date,Status\n1,Annual Gala 2026,client,50000,2026-07-01,Paid"
      };

      if (fmt === 'CSV') {
        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(dummyData[type]);
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", `SLV_Events_${type}_Report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast(`${type} report successfully downloaded as CSV.`);
      } else {
        addToast(`Downloaded ${type} Report successfully in ${fmt} format.`);
      }
      setDownloadingReport(null);
    }, 1500);
  };

  const reportsList = [
    { name: 'Event Roster Report', type: 'Event', desc: 'Lists event date rosters, venues, and status metrics.' },
    { name: 'Vendor Utilization Report', type: 'Vendor', desc: 'Vendor bookings tracking and feedback performance indices.' },
    { name: 'Employee Staffing Report', type: 'Staff', desc: 'Crew labor details, shift records, and experiences.' },
    { name: 'Roster Assignments Report', type: 'Assignment', desc: 'Detailed log of assigned assets and override alerts.' },
    { name: 'Payments & Collections Ledger', type: 'Payment', desc: 'Client invoice summaries, collections, and vendor balances.' }
  ];

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 animate-fade-in-up pr-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Reports & Analytics Exporter</h2>
          <p className="text-xs text-slate-550 dark:text-slate-400">Generate and export operations CSV, Excel, or PDF document checklists</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Quick Select Exporter */}
        <div className="lg:col-span-5 glass-card p-6 flex flex-col justify-between bg-white dark:bg-[#111C30]/40 border-slate-200 dark:border-slate-850 h-80 transition-colors">
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <FileBarChart className="w-4 h-4 text-sky-500" />
              <span>Export Custom Document</span>
            </h3>
            
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="form-input cursor-pointer pr-8"
                >
                  <option value="Event">Event Registrations</option>
                  <option value="Vendor">Vendor Database</option>
                  <option value="Staff">Crew Roster</option>
                  <option value="Assignment">Roster Assignments</option>
                  <option value="Payment">Payments & Dues Ledger</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Export Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="form-input cursor-pointer pr-8"
                >
                  <option value="PDF">Adobe Acrobat (PDF)</option>
                  <option value="CSV">Comma Separated values (CSV)</option>
                  <option value="Excel">Microsoft Excel Spreadsheet (XLSX)</option>
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleExport(reportType, format)}
            disabled={downloadingReport !== null}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-6 cursor-pointer"
          >
            {downloadingReport ? (
              <span>Compiling Document...</span>
            ) : (
              <>
                <Download className="w-4.5 h-4.5" />
                <span>Export Report Document</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Prebuilt reports categories */}
        <div className="lg:col-span-7 glass-card p-6 bg-white dark:bg-[#111C30]/40 border-slate-200 dark:border-slate-850 transition-colors">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4 pb-2 border-b border-slate-150 dark:border-slate-850">
            Prebuilt System Catalogues
          </h3>

          <div className="space-y-4">
            {reportsList.map(rep => (
              <div
                key={rep.type}
                className="p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/30 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl flex items-center justify-between gap-4 group hover:border-slate-350 dark:hover:border-slate-750 transition-all cursor-pointer"
                onClick={() => handleExport(rep.type, 'CSV')}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-sky-500 shrink-0 shadow-sm transition-colors">
                    <FileText className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-250 group-hover:text-sky-500 transition-colors">
                      {rep.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{rep.desc}</p>
                  </div>
                </div>

                <div className="text-slate-400 dark:text-slate-500 group-hover:text-sky-500 transition-colors">
                  <ArrowUpRight className="w-4.5 h-4.5" />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Reports;
