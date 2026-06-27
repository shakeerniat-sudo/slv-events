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
  Grid,
  Camera,
  Utensils,
  Heart,
  Award,
  DollarSign,
  Check,
  Clock
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
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-[#080E1A] dark:text-slate-100 font-sans selection:bg-sky-500 selection:text-white transition-colors duration-200 overflow-x-hidden">
      
      {/* Visual Blur Orbs */}
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-gradient-to-tr from-sky-500/10 to-indigo-500/10 dark:from-sky-500/5 dark:to-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[40%] left-[-100px] w-[500px] h-[500px] bg-sky-400/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Sticky Premium Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-[#080E1A]/80 border-b border-slate-200/50 dark:border-white/[0.03] py-4 transition-all">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => scrollToSection('home')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-black text-white shadow-lg hover:rotate-3 transition-transform select-none">
              SLV
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-wider font-sans text-slate-800 dark:text-slate-100">SLV EVENTS</span>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">Planner Console</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-600 dark:text-slate-300">
            <button onClick={() => scrollToSection('home')} className="hover:text-sky-500 transition-colors cursor-pointer">Home</button>
            <button onClick={() => scrollToSection('services')} className="hover:text-sky-500 transition-colors cursor-pointer">Services</button>
            <button onClick={() => scrollToSection('why-choose-us')} className="hover:text-sky-500 transition-colors cursor-pointer">Why Choose Us</button>
            <button onClick={() => scrollToSection('process')} className="hover:text-sky-500 transition-colors cursor-pointer">Process</button>
            <button onClick={() => scrollToSection('booking')} className="hover:text-sky-500 transition-colors cursor-pointer">Book Now</button>
          </nav>

          {/* Login/Dashboard CTA */}
          <div>
            {user ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 border border-sky-500 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                Dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.04] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Admin Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="max-w-6xl mx-auto px-6 pt-12 pb-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-7 space-y-6 text-left"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Premium Event Sourcing & Planning</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15] font-sans">
            Plan Your Perfect Event with <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-indigo-600 dark:from-sky-400 dark:to-indigo-500">SLV Events</span>
          </h1>

          <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium max-w-xl">
            From weddings and corporate events to private celebrations, we handle everything from planning to execution. Let our dedicated supervisors, crew members, and top-tier vendors craft your ideal gathering.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <button
              onClick={() => scrollToSection('booking')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-lg shadow-sky-500/15 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-center"
            >
              Book Your Event
            </button>
            <button
              onClick={() => scrollToSection('services')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-55 dark:hover:bg-white/[0.06] font-bold text-xs shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-center"
            >
              Explore Services
            </button>
          </div>
        </motion.div>

        {/* Decorative Grid Frame */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="lg:col-span-5 hidden lg:block relative"
        >
          <div className="w-full aspect-[4/3] rounded-3xl bg-gradient-to-tr from-sky-500 to-indigo-600 p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between text-white">
            {/* Overlay Patterns */}
            <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
            
            <div className="flex justify-between items-start">
              <div className="p-3 bg-white/15 rounded-xl backdrop-blur-md">
                <Calendar className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-extrabold bg-white/20 px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">SLV Premium</span>
            </div>

            <div>
              <p className="text-xl font-bold font-sans">Crafting Moments Into Lasting Memories</p>
              <p className="text-[11px] text-white/80 font-medium mt-1 leading-normal">Our dedicated team oversees execution logistics, vendor deliveries, and staff dispatch seamlessly.</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Trust & Metrics Section */}
      <section className="bg-white dark:bg-[#0C1424]/40 border-y border-slate-200/50 dark:border-white/[0.03] py-10 transition-colors">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { metric: '500+', title: 'Successful Events' },
            { metric: '1000+', title: 'Happy Clients' },
            { metric: 'Professional', title: 'Event Team' },
            { metric: 'Trusted', title: 'Vendor Network' }
          ].map((stat, idx) => (
            <div key={idx} className="text-center space-y-1">
              <p className="text-2xl md:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-indigo-600 dark:from-sky-400 dark:to-indigo-400 font-sans">{stat.metric}</p>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{stat.title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="max-w-6xl mx-auto px-6 py-20 relative">
        <div className="text-center space-y-3 mb-16">
          <span className="text-[10px] font-bold text-sky-500 dark:text-sky-400 uppercase tracking-widest">What We Do</span>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-sans">Our Event Management Services</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">Simple, end-to-end planning and logistics for events of any size. We handle the crew, schedule, and vendors.</p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: 'Corporate Events',
              desc: 'Seamless conferences, annual business meets, premium launches, and business galas.',
              icon: Briefcase,
              color: 'text-sky-500',
              bg: 'bg-sky-50 dark:bg-sky-500/10'
            },
            {
              title: 'Wedding Planning',
              desc: 'Enchanting weddings, designer stage backdrops, reception coordination, and setup.',
              icon: Sparkles,
              color: 'text-indigo-500',
              bg: 'bg-indigo-50 dark:bg-indigo-500/10'
            },
            {
              title: 'Birthday & Private Parties',
              desc: 'Customized birthdays, themes, anniversaries, and private milestones.',
              icon: Grid,
              color: 'text-amber-500',
              bg: 'bg-amber-50 dark:bg-amber-500/10'
            },
            {
              title: 'Sound & Stage Setup',
              desc: 'State-of-the-art sound systems, trusses, custom lighting arrays, and expert technicians.',
              icon: Layers,
              color: 'text-emerald-500',
              bg: 'bg-emerald-50 dark:bg-emerald-500/10'
            },
            {
              title: 'Photography & Videography',
              desc: 'Candid event photos, cinematic films, drone footage, and visual archiving.',
              icon: Camera,
              color: 'text-rose-500',
              bg: 'bg-rose-50 dark:bg-rose-500/10'
            },
            {
              title: 'Catering Services',
              desc: 'Curated multi-cuisine food menus, buffet settings, and professional hospitality staff.',
              icon: Utensils,
              color: 'text-teal-500',
              bg: 'bg-teal-50 dark:bg-teal-500/10'
            }
          ].map((srv, idx) => {
            const Icon = srv.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                whileHover={{ y: -6, scale: 1.015 }}
                className="p-6 bg-white dark:bg-[#0C1424]/50 border border-slate-200/60 dark:border-white/[0.03] rounded-2xl flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-white/[0.08]"
              >
                <div>
                  <div className={`w-10 h-10 rounded-xl ${srv.bg} flex items-center justify-center mb-5`}>
                    <Icon className={`w-5 h-5 ${srv.color}`} />
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-2 font-sans">{srv.title}</h3>
                  <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-medium">{srv.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section id="why-choose-us" className="bg-white dark:bg-[#0C1424]/30 border-y border-slate-200/50 dark:border-white/[0.03] py-20 transition-colors">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-4">
            <span className="text-[10px] font-bold text-sky-500 dark:text-sky-400 uppercase tracking-widest">Our Difference</span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-sans">Why Host Your Next Event With Us?</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">We coordinate directly with tested, verified vendor partners and run fully synchronized staff schedules so you can enjoy your event stress-free.</p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                title: 'Professional Planning',
                desc: 'Dedicated coordinators organize timelines, layouts, and resource allocations.',
                icon: Heart,
                color: 'text-indigo-500',
                bg: 'bg-indigo-500/10'
              },
              {
                title: 'On-Time Execution',
                desc: 'Precise crew arrival tracking ensures all setups complete hours before start.',
                icon: Clock,
                color: 'text-sky-500',
                bg: 'bg-sky-500/10'
              },
              {
                title: 'Experienced Team',
                desc: 'Trained technical leads and supervisors run real-time support on-site.',
                icon: Users,
                color: 'text-teal-500',
                bg: 'bg-teal-500/10'
              },
              {
                title: 'Transparent Pricing',
                desc: 'Clear quotations, vendor payouts tracking, and balanced billing ledgers.',
                icon: DollarSign,
                color: 'text-emerald-500',
                bg: 'bg-emerald-500/10'
              },
              {
                title: 'Dedicated Support',
                desc: 'Direct communication channels for quick adjustments or requirements.',
                icon: Award,
                color: 'text-amber-500',
                bg: 'bg-amber-500/10'
              }
            ].map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <div key={idx} className="flex gap-4 p-4 bg-slate-50/50 dark:bg-[#0B1220]/40 border border-slate-205 dark:border-white/[0.02] rounded-2xl transition-colors">
                  <div className={`w-9 h-9 shrink-0 rounded-lg bg-sky-500/10 flex items-center justify-center ${benefit.color}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 font-sans">{benefit.title}</h4>
                    <p className="text-[10px] text-slate-550 dark:text-slate-400 font-medium leading-relaxed">{benefit.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Booking Experience / Process Stepper */}
      <section id="process" className="max-w-6xl mx-auto px-6 py-20 relative">
        <div className="text-center space-y-3 mb-16">
          <span className="text-[10px] font-bold text-sky-500 dark:text-sky-400 uppercase tracking-widest">How It Works</span>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-sans">Your Simple Booking Experience</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-lg mx-auto">Get your plan off the ground in four simple phases. No complicated procedures.</p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {[
            { step: 'Step 1', title: 'Submit Event Details', desc: 'Provide event details, location, requirements, and budget.' },
            { step: 'Step 2', title: 'Admin Reviews Request', desc: 'Our team assesses dates, venue availability, and plans.' },
            { step: 'Step 3', title: 'Confirmation & Planning', desc: 'We confirm booking status, align team leads, and dispatch resources.' },
            { step: 'Step 4', title: 'Event Execution', desc: 'Sit back and relax as our operations crew delivers the layout.' }
          ].map((proc, idx) => (
            <div key={idx} className="relative p-6 bg-white dark:bg-[#0C1424]/50 border border-slate-200/50 dark:border-white/[0.02] rounded-2xl space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black text-sky-500 uppercase tracking-wider">{proc.step}</span>
                <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 mt-2 font-sans">{proc.title}</h4>
                <p className="text-[10.5px] text-slate-555 dark:text-slate-400 font-medium mt-1 leading-relaxed">{proc.desc}</p>
              </div>
              {idx < 3 && (
                <div className="hidden md:block absolute top-[40%] right-[-14px] w-6 h-6 rounded-full bg-slate-100 dark:bg-[#0F182A] border border-slate-200/60 dark:border-white/5 flex items-center justify-center text-slate-400 z-10">
                  <ArrowRight className="w-3 h-3" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Booking Form Section */}
      <section id="booking" className="max-w-4xl mx-auto px-6 py-20 border-t border-slate-200/50 dark:border-white/[0.04] relative">
        <div className="text-center space-y-3 mb-12">
          <span className="text-[10px] font-bold text-sky-500 dark:text-sky-400 uppercase tracking-widest">Reserve Your Spot</span>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-sans">Book Your Event</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal">Submit your details below. Once sent, our planners will immediately review your booking.</p>
        </div>

        <div className="bg-white dark:bg-[#0C1424]/50 border border-slate-200/60 dark:border-white/[0.03] rounded-3xl p-6 md:p-10 shadow-xl relative overflow-hidden transition-colors">
          <AnimatePresence mode="wait">
            {!successData ? (
              <motion.div
                key="booking-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {error && (
                  <div className="mb-6 p-4 bg-rose-50 border border-rose-250 dark:bg-rose-955/40 dark:border-rose-900 rounded-xl flex items-center gap-3 text-rose-800 dark:text-rose-200 text-xs">
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
                      <label className="block text-[10px] uppercase tracking-wider text-slate-505 dark:text-slate-400 mb-2">Estimated Budget (INR / ₹) *</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-405 dark:text-slate-500 font-sans font-bold text-xs select-none">
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
                  <p className="text-xs text-slate-555 dark:text-slate-400 max-w-sm leading-relaxed">
                    Thank you. Your request is registered. Our admin, operations, and coordinator teams have been notified to begin assignments.
                  </p>
                </div>

                {/* Booking Receipt Summary Card */}
                <div className="w-full max-w-md bg-slate-50 dark:bg-slate-950/40 border border-slate-205 dark:border-white/[0.04] p-6 rounded-2xl text-left space-y-4 text-xs shadow-inner">
                  <div className="flex justify-between items-center border-b border-slate-200/60 dark:border-white/[0.04] pb-3">
                    <span className="font-bold text-[10px] text-slate-400 dark:text-slate-505 uppercase tracking-wider">Booking ID / Reference</span>
                    <span className="font-black text-sky-500 text-xs">SLV-EV-{submittedData?.eventId || 'NEW'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3.5 gap-x-4">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-sans">Client Name</span>
                      <p className="font-bold mt-0.5 text-slate-800 dark:text-slate-200">{submittedData?.clientName || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-sans">Mobile Number</span>
                      <p className="font-bold mt-0.5 text-slate-800 dark:text-slate-200">{submittedData?.clientPhone || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-sans">Email</span>
                      <p className="font-bold mt-0.5 text-slate-800 dark:text-slate-200 truncate" title={submittedData?.clientEmail}>{submittedData?.clientEmail || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-sans">Event Type</span>
                      <p className="font-bold mt-0.5 text-slate-800 dark:text-slate-200">{submittedData?.eventType || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-sans">Event Date</span>
                      <p className="font-bold mt-0.5 text-slate-800 dark:text-slate-200">
                        {submittedData?.eventDate ? (() => {
                          const parts = submittedData.eventDate.split('-');
                          return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : submittedData.eventDate;
                        })() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-sans">Event Location</span>
                      <p className="font-bold mt-0.5 text-slate-800 dark:text-slate-200 truncate" title={submittedData?.venue}>{submittedData?.venue || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-sans">Estimated Budget</span>
                      <p className="font-bold mt-0.5 text-slate-855 dark:text-slate-100">
                        ₹{submittedData?.budget ? parseFloat(submittedData.budget).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-sans">Guest Count</span>
                      <p className="font-bold mt-0.5 text-slate-800 dark:text-slate-200">{submittedData?.guestCount || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-sans">Booking Status</span>
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
      <footer className="bg-white dark:bg-[#050A12] border-t border-slate-200/50 dark:border-white/[0.04] pt-16 pb-8 transition-colors text-xs font-semibold text-slate-655 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          
          {/* Column 1: Brand & Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-black text-white shadow-md select-none">
                SLV
              </div>
              <span className="font-extrabold text-sm tracking-wider font-sans text-slate-800 dark:text-slate-100">SLV EVENTS</span>
            </div>
            <p className="text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-450 uppercase">
              Creating clean, premium, and stress-free event experiences. We manage coordinators, handle vendor negotiations, and dispatch dedicated crews.
            </p>
          </div>

          {/* Column 2: Navigation Links */}
          <div className="space-y-4">
            <h4 className="font-bold text-[10px] uppercase tracking-widest text-slate-405 dark:text-slate-500">Quick Links</h4>
            <ul className="space-y-2 text-[11px] font-bold">
              <li><button onClick={() => scrollToSection('home')} className="hover:text-sky-500 cursor-pointer transition-colors">Home</button></li>
              <li><button onClick={() => scrollToSection('services')} className="hover:text-sky-500 cursor-pointer transition-colors">Services</button></li>
              <li><button onClick={() => scrollToSection('why-choose-us')} className="hover:text-sky-500 cursor-pointer transition-colors">Why Choose Us</button></li>
              <li><button onClick={() => scrollToSection('process')} className="hover:text-sky-500 cursor-pointer transition-colors">How it works</button></li>
              <li><button onClick={() => scrollToSection('booking')} className="hover:text-sky-500 cursor-pointer transition-colors">Book Now</button></li>
            </ul>
          </div>

          {/* Column 3: Contact Details */}
          <div className="space-y-4">
            <h4 className="font-bold text-[10px] uppercase tracking-widest text-slate-405 dark:text-slate-500">Contact Us</h4>
            <ul className="space-y-2.5 text-[11px] font-medium text-slate-555 dark:text-slate-450 uppercase">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-sky-500 shrink-0" />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-sky-500 shrink-0" />
                <span className="lowercase truncate">info@slvevents.com</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-500 shrink-0" />
                <span>Bangalore, Karnataka, India</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Social media & Logins */}
          <div className="space-y-4">
            <h4 className="font-bold text-[10px] uppercase tracking-widest text-slate-405 dark:text-slate-500">Official Links</h4>
            <div className="space-y-2 text-[11px] font-bold text-slate-655 dark:text-slate-400">
              <p className="hover:text-sky-500 cursor-pointer transition-colors">Facebook</p>
              <p className="hover:text-sky-500 cursor-pointer transition-colors">Instagram</p>
              <p className="hover:text-sky-500 cursor-pointer transition-colors">LinkedIn</p>
              <p className="hover:text-sky-500 cursor-pointer transition-colors">Twitter / X</p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200/50 dark:border-white/[0.03] pt-8 text-center text-[10px] text-slate-405 dark:text-slate-500 font-bold uppercase tracking-widest">
          &copy; {new Date().getFullYear()} SLV Events. All rights reserved. Created with Premium Event Aesthetics.
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
