import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUIStore } from '../store/uiStore';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Sparkles,
  Users,
  CreditCard,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Grid
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useUIStore();

  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    eventType: 'Corporate',
    eventDate: '',
    venue: '',
    budget: '',
    guestCount: '',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [submittedData, setSubmittedData] = useState(null);
  const [error, setError] = useState(null);

  const eventTypes = [
    'Corporate',
    'Wedding',
    'Birthday',
    'Concert',
    'Anniversary',
    'Exhibition',
    'Other'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/public/bookings', formData);
      setSubmittedData({ ...formData, eventId: response.data.eventId });
      setSuccessData(response.data);
      addToast('Event booking submitted successfully!');
      
      // Reset form
      setFormData({
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        eventType: 'Corporate',
        eventDate: '',
        venue: '',
        budget: '',
        guestCount: '',
        notes: ''
      });
    } catch (err) {
      console.error('Booking submission error:', err);
      setError(err.response?.data?.message || 'Failed to submit booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0B1220] dark:text-slate-100 font-sans selection:bg-sky-500 selection:text-white transition-colors duration-200">
      
      {/* Decorative Blur Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-sky-500/10 dark:bg-sky-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Landing Sticky Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-[#0B1220]/75 border-b border-slate-200/60 dark:border-white/[0.04] py-4 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection('home')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md select-none shrink-0">
              SLV
            </div>
            <div>
              <span className="font-bold text-sm tracking-wider font-sans text-slate-800 dark:text-slate-100">SLV EVENTS</span>
              <p className="text-[9px] text-slate-400 dark:text-slate-555 uppercase tracking-widest font-bold">Premium Event Design</p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="hidden sm:flex items-center gap-8 text-xs font-semibold text-slate-655 dark:text-slate-350">
            <button onClick={() => scrollToSection('home')} className="hover:text-sky-500 transition-colors cursor-pointer">Home</button>
            <button onClick={() => scrollToSection('services')} className="hover:text-sky-500 transition-colors cursor-pointer">Services</button>
            <button onClick={() => scrollToSection('booking')} className="hover:text-sky-500 transition-colors cursor-pointer">Book Now</button>
          </nav>

          {/* Action Login/Dashboard Button */}
          <div>
            {user ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-3.5 py-1.5 border border-sky-500 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                Dashboard
                <ArrowRight className="w-3.5 h-3.5 text-sky-550 dark:text-sky-400" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="px-3.5 py-1.5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.04] text-slate-655 dark:text-slate-355 hover:text-slate-800 dark:hover:text-slate-100 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
              >
                Admin Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="max-w-6xl mx-auto px-4 pt-16 pb-24 md:py-32 flex flex-col items-center text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6 max-w-3xl"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 text-sky-500 dark:text-sky-400 text-[10px] font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Elevating Event Execution</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-800 dark:text-white leading-[1.1] font-sans">
            Plan Your Event with <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-500">SLV Events</span>
          </h1>

          <p className="text-sm md:text-base text-slate-555 dark:text-slate-400 leading-relaxed font-medium">
            Book your event in minutes. Our team will review your request and confirm your booking shortly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => scrollToSection('booking')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-lg hover:shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              Book Event
            </button>
            <button
              onClick={() => scrollToSection('services')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-355 hover:bg-slate-55 dark:hover:bg-white/[0.06] font-bold text-xs shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              View Services
            </button>
          </div>
        </motion.div>
      </section>

      {/* Services Section */}
      <section id="services" className="max-w-6xl mx-auto px-4 py-20 border-t border-slate-200/50 dark:border-white/[0.04] relative">
        <div className="text-center space-y-3 mb-16">
          <span className="text-[10px] font-bold text-sky-500 dark:text-sky-400 uppercase tracking-widest">Our Offerings</span>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white">Design & Coordination Services</h2>
          <p className="text-xs text-slate-555 dark:text-slate-400 max-w-lg mx-auto">We provide complete end-to-end management, dispatching specialized coordinators and verified vendors for every booking.</p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: 'Corporate Galas',
              desc: 'Annual business meets, premium product launches, and award ceremonies. High-grade AV configurations and staging.',
              icon: Briefcase,
              color: 'text-sky-500',
              bg: 'dark:bg-sky-500/10 bg-sky-50',
              glow: 'glow-blue'
            },
            {
              title: 'Dream Weddings',
              desc: 'Enchanting floral installations, candid photography, and curated catering options tailored to your guest preferences.',
              icon: Sparkles,
              color: 'text-indigo-500',
              bg: 'dark:bg-indigo-500/10 bg-indigo-50',
              glow: 'glow-purple'
            },
            {
              title: 'Private Themes',
              desc: 'Themed birthday parties, customized anniversary setups, and entertainment options. Live Emcees and anchors.',
              icon: Grid,
              color: 'text-amber-500',
              bg: 'dark:bg-amber-500/10 bg-amber-50',
              glow: 'glow-orange'
            },
            {
              title: 'Sound & Stage Logistics',
              desc: 'Full-scale stage structural builds, high-fidelity JBL speaker setups, professional line arrays, and digital console technicians.',
              icon: Layers,
              color: 'text-emerald-500',
              bg: 'dark:bg-emerald-500/10 bg-emerald-50',
              glow: 'glow-green'
            }
          ].map((srv, idx) => {
            const Icon = srv.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className={`glass-card p-6 flex flex-col justify-between transition-all duration-300 ${srv.glow}`}
              >
                <div>
                  <div className={`w-10 h-10 rounded-xl ${srv.bg} flex items-center justify-center mb-6`}>
                    <Icon className={`w-5 h-5 ${srv.color}`} />
                  </div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 mb-2">{srv.title}</h3>
                  <p className="text-xs text-slate-555 dark:text-slate-400 leading-normal">{srv.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Booking Form Section */}
      <section id="booking" className="max-w-4xl mx-auto px-4 py-20 border-t border-slate-200/50 dark:border-white/[0.04] relative">
        <div className="text-center space-y-3 mb-12">
          <span className="text-[10px] font-bold text-sky-500 dark:text-sky-400 uppercase tracking-widest">Reserve Your Spot</span>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white">Client Booking Form</h2>
          <p className="text-xs text-slate-555 dark:text-slate-400">Fill in the fields below. Once submitted, your booking will immediately enter our planning board.</p>
        </div>

        <div className="glass-card glow-blue p-8 md:p-12 relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            {!successData ? (
              <motion.div
                key="booking-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {error && (
                  <div className="mb-6 p-4 bg-rose-50 border border-rose-250 dark:bg-rose-950/40 dark:border-rose-900 rounded-xl flex items-center gap-3 text-rose-800 dark:text-rose-200 text-xs">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 text-xs font-semibold">
                  

                  
                  {/* Row 1: Client Personal Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Client Full Name *</label>
                      <input
                        type="text"
                        name="clientName"
                        required
                        placeholder="e.g. John Doe"
                        value={formData.clientName}
                        onChange={handleInputChange}
                        className="form-input"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Mobile Number *</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-slate-500">
                          <Phone className="w-4 h-4" />
                        </span>
                        <input
                          type="tel"
                          name="clientPhone"
                          required
                          placeholder="e.g. +91 98765 43210"
                          value={formData.clientPhone}
                          onChange={handleInputChange}
                          className="form-input !pl-9"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Email Address</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-slate-500">
                          <Mail className="w-4 h-4" />
                        </span>
                        <input
                          type="email"
                          name="clientEmail"
                          placeholder="e.g. john@example.com"
                          value={formData.clientEmail}
                          onChange={handleInputChange}
                          className="form-input !pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Event Core Specs */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Event Type *</label>
                      <select
                        name="eventType"
                        value={formData.eventType}
                        onChange={handleInputChange}
                        className="form-input cursor-pointer"
                      >
                        {eventTypes.map((type) => (
                          <option key={type} value={type}>
                            {type} Event
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Event Date *</label>
                      <input
                        type="date"
                        name="eventDate"
                        required
                        value={formData.eventDate}
                        onChange={handleInputChange}
                        className="form-input cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Event Location / Venue *</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-slate-500">
                          <MapPin className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          name="venue"
                          required
                          placeholder="e.g. Grand Palace Hall, Bangalore"
                          value={formData.venue}
                          onChange={handleInputChange}
                          className="form-input !pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Budget & Guests */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Number of Guests</label>
                      <input
                        type="number"
                        name="guestCount"
                        placeholder="e.g. 250"
                        min="1"
                        value={formData.guestCount}
                        onChange={handleInputChange}
                        className="form-input"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Estimated Budget (INR / ₹) *</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500 font-sans font-bold text-xs select-none">
                          ₹
                        </span>
                        <input
                          type="number"
                          name="budget"
                          required
                          placeholder="e.g. 150000"
                          min="1"
                          value={formData.budget}
                          onChange={handleInputChange}
                          className="form-input !pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Notes */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Additional Notes / Theme Requirements</label>
                    <textarea
                      name="notes"
                      placeholder="Share details about theme preferences, sound setups, scheduling time, catering, or anything else you require..."
                      rows="4"
                      value={formData.notes}
                      onChange={handleInputChange}
                      className="form-input h-28 resize-none py-2.5"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3.5 rounded-xl shadow-md hover:shadow-sky-500/10 hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 disabled:opacity-50 text-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4.5 w-4.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Submitting your booking...</span>
                      </>
                    ) : (
                      <span>Submit Booking Request</span>
                    )}
                  </button>

                </form>
              </motion.div>
            ) : (
              <motion.div
                key="booking-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="text-center py-6 flex flex-col items-center gap-6"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <CheckCircle className="w-10 h-10 animate-bounce" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Booking Successfully Received!</h3>
                  <p className="text-xs text-slate-555 dark:text-slate-400 max-w-sm">
                    Thank you. Your request is registered. Our admin, operations, and coordinator teams have been notified to begin assignments.
                  </p>
                </div>

                {/* Booking Receipt Summary Card */}
                <div className="w-full max-w-md bg-slate-50 dark:bg-slate-950/40 border border-slate-205 dark:border-white/[0.04] p-6 rounded-2xl text-left space-y-4 text-xs shadow-inner">
                  <div className="flex justify-between items-center border-b border-slate-200/60 dark:border-white/[0.04] pb-3">
                    <span className="font-bold text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Booking ID / Reference</span>
                    <span className="font-black text-sky-500 text-xs">SLV-EV-{submittedData?.eventId || 'NEW'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3.5 gap-x-4">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Client Name</span>
                      <p className="font-bold mt-0.5 text-slate-800 dark:text-slate-200">{submittedData?.clientName || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Mobile Number</span>
                      <p className="font-bold mt-0.5 text-slate-800 dark:text-slate-200">{submittedData?.clientPhone || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Email</span>
                      <p className="font-bold mt-0.5 text-slate-800 dark:text-slate-200 truncate" title={submittedData?.clientEmail}>{submittedData?.clientEmail || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Event Type</span>
                      <p className="font-bold mt-0.5 text-slate-800 dark:text-slate-200">{submittedData?.eventType || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Event Date</span>
                      <p className="font-bold mt-0.5 text-slate-800 dark:text-slate-200">
                        {submittedData?.eventDate ? (() => {
                          const parts = submittedData.eventDate.split('-');
                          return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : submittedData.eventDate;
                        })() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Event Location</span>
                      <p className="font-bold mt-0.5 text-slate-800 dark:text-slate-200 truncate" title={submittedData?.venue}>{submittedData?.venue || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Estimated Budget</span>
                      <p className="font-bold mt-0.5 text-slate-850 dark:text-slate-100">
                        ₹{submittedData?.budget ? parseFloat(submittedData.budget).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Guest Count</span>
                      <p className="font-bold mt-0.5 text-slate-800 dark:text-slate-200">{submittedData?.guestCount || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Booking Status</span>
                      <p className="font-extrabold mt-0.5 text-amber-500 dark:text-amber-400">NEW</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/60 dark:border-white/[0.04] flex items-center gap-2 text-[10px] text-slate-455 font-bold uppercase tracking-wide">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Logged securely inside SLV Planner Console</span>
                  </div>
                </div>

                <button
                  onClick={() => setSuccessData(null)}
                  className="px-6 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs shadow-sm active:scale-95 cursor-pointer transition-colors"
                >
                  Submit Another Booking
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/50 dark:border-white/[0.04] py-8 text-center text-[10px] text-slate-455 font-medium uppercase tracking-widest">
        &copy; {new Date().getFullYear()} SLV Events. All rights reserved. Managed via automated dispatcher engine.
      </footer>

    </div>
  );
};

export default LandingPage;
