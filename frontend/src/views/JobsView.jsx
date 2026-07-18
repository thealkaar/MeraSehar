import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  Search, Briefcase, MapPin, Phone, User, Plus, X, Loader2, 
  Map, DollarSign, Calendar, ChevronRight, Ban 
} from 'lucide-react';

export default function JobsView({ user }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  
  // Posting state
  const [showPostModal, setShowPostModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [locationArea, setLocationArea] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [postError, setPostError] = useState('');

  // Selected Job Details Drawer
  const [selectedJob, setSelectedJob] = useState(null);

  const categories = [
    "Shop Staff", 
    "Delivery", 
    "Factory Worker", 
    "Driver", 
    "Office Staff", 
    "Other"
  ];

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const list = await api.getJobs({
        search: search.trim(),
        category: categoryFilter,
        location: locationFilter.trim()
      });
      setJobs(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    if (!title || !description || !category || !contactName || !contactNumber || !locationArea) {
      setPostError('Please fill in all mandatory fields');
      return;
    }
    setSubmitting(true);
    setPostError('');
    try {
      await api.createJob({
        title,
        description,
        category,
        contact_name: contactName,
        contact_number: contactNumber,
        location_area: locationArea,
        salary_range: salaryRange || null
      });
      // Reset & close
      setTitle('');
      setDescription('');
      setCategory('');
      setContactName('');
      setContactNumber('');
      setLocationArea('');
      setSalaryRange('');
      setShowPostModal(false);
      fetchJobs();
    } catch (err) {
      setPostError(err.message || 'Failed to post job');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (jobId) => {
    if (!confirm("Are you sure you want to mark this job as filled/closed?")) return;
    try {
      await api.deactivateJob(jobId);
      setSelectedJob(null);
      fetchJobs();
    } catch (err) {
      alert(err.message || 'Failed to close job listing');
    }
  };

  return (
    <div className="w-full px-4 pt-4 pb-24">
      {/* Search & Location Bar */}
      <form onSubmit={handleSearchSubmit} className="space-y-2.5 mb-5.5 animate-fadeIn">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Search jobs (e.g. Delivery boy, Billing)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full premium-input rounded-xl py-3.5 pl-11 pr-20 text-xs placeholder-zinc-400 dark:placeholder-zinc-700 font-semibold"
          />
          <button 
            type="submit"
            className="absolute right-2 top-2 bg-black dark:bg-white text-white dark:text-black border border-line text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg hover:opacity-85 transition"
          >
            Find
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-2.5">
          {/* Location Area Input */}
          <input
            type="text"
            placeholder="Area (e.g. Aliganj)..."
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            onBlur={fetchJobs}
            className="w-full premium-input rounded-xl py-2.5 px-3.5 text-xs placeholder-zinc-400 dark:placeholder-zinc-700 font-semibold"
          />

          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full premium-input rounded-xl py-2.5 pl-3.5 pr-8 text-xs appearance-none font-semibold"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 absolute right-3.5 top-3 rotate-90 pointer-events-none" />
          </div>
        </div>
      </form>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1 animate-fadeIn">
        <h3 className="text-[10px] uppercase font-black tracking-wider text-zinc-400 dark:text-zinc-500">
          Available Listings ({jobs.length})
        </h3>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-wider">Scoped to {user?.city}</span>
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(n => (
            <div key={n} className="premium-card p-5 space-y-3">
              <div className="h-4 premium-skeleton w-1/2"></div>
              <div className="h-3 premium-skeleton w-1/3"></div>
              <div className="h-3 premium-skeleton w-1/4"></div>
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-2xl border border-line border-dashed">
          <Briefcase className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
          <h3 className="text-zinc-700 dark:text-zinc-400 font-bold text-sm uppercase tracking-wider">No jobs available</h3>
          <p className="text-xs text-zinc-500 mt-1.5 px-4 font-semibold">There are currently no active job postings in {user?.city}.</p>
        </div>
      ) : (
        <div className="space-y-3.5 animate-fadeIn">
          {jobs.map((job) => (
            <button
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className="w-full premium-card p-5 flex items-center justify-between text-left hover:border-black dark:hover:border-white transition-all duration-300"
            >
              <div className="space-y-2 flex-1 pr-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] uppercase font-black px-2.5 py-0.5 rounded-lg border border-line bg-zinc-50 dark:bg-zinc-900 text-black dark:text-white tracking-wider">
                    {job.category}
                  </span>
                  {job.posted_by_user_id === user?.id && (
                    <span className="text-[9px] uppercase font-black px-2.5 py-0.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 tracking-wider">
                      My Post
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-black dark:text-white leading-snug">{job.title}</h4>
                <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                    {job.location_area}
                  </span>
                  {job.salary_range && (
                    <span className="flex items-center gap-0.5">
                      <DollarSign className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                      {job.salary_range}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-650 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Floating Action Button for Posting */}
      <button 
        onClick={() => {
          setPostError('');
          setShowPostModal(true);
        }}
        className="fixed bottom-20 lg:bottom-8 right-6 z-30 w-14 h-14 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-xl hover:opacity-90 active:scale-95 border border-zinc-250 dark:border-zinc-850 transition-all duration-300"
      >
        <Plus className="w-7 h-7 stroke-[2.5px]" />
      </button>

      {/* CREATE JOB MODAL */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-line rounded-2xl overflow-hidden shadow-2xl animate-scaleIn max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-line">
              <h3 className="font-black text-black dark:text-white text-base tracking-wider uppercase">Post Job Listing</h3>
              <button 
                onClick={() => setShowPostModal(false)} 
                className="text-zinc-400 hover:text-black dark:hover:text-white p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.05]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostJob} className="p-5 space-y-4 overflow-y-auto no-scrollbar flex-1">
              {postError && (
                <div className="bg-zinc-50 dark:bg-zinc-950 border-2 border-black dark:border-white text-black dark:text-white p-3.5 rounded-xl text-xs font-bold">
                  {postError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Job Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Retail Store Cashier"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full premium-input rounded-xl py-3 px-3.5 text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Category *</label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full premium-input rounded-xl py-3 px-3.5 text-xs appearance-none font-bold"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronRight className="w-4 h-4 text-zinc-400 absolute right-3.5 top-4 rotate-90 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Area/Location *</label>
                  <input
                    type="text"
                    placeholder="e.g. Aliganj Market"
                    value={locationArea}
                    onChange={(e) => setLocationArea(e.target.value)}
                    className="w-full premium-input rounded-xl py-3 px-3.5 text-xs font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Salary Range</label>
                  <input
                    type="text"
                    placeholder="e.g. 12k - 15k / month"
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                    className="w-full premium-input rounded-xl py-3 px-3.5 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Description *</label>
                <textarea
                  rows={4}
                  placeholder="Detail out working hours, requirements, job profile..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full premium-input rounded-xl p-3.5 text-xs resize-none font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-line pt-4">
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Contact Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full premium-input rounded-xl py-3 px-3.5 text-xs font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Contact Number *</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876500111"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full premium-input rounded-xl py-3 px-3.5 text-xs font-semibold"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full pill-button-primary font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 text-xs font-black uppercase tracking-wider mt-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Publish Job Listing</span>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SELECTED JOB DETAIL DRAWER */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/80 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 border-t border-line rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden animate-slideUp">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-line sticky top-0 z-10 bg-white dark:bg-zinc-950">
              <span className="text-[10px] uppercase font-black px-3 py-0.5 rounded-lg border border-line bg-zinc-50 dark:bg-zinc-900 text-black dark:text-white tracking-wider">
                {selectedJob.category}
              </span>
              <button 
                onClick={() => setSelectedJob(null)} 
                className="text-zinc-400 hover:text-black dark:hover:text-white p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.05]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
              <div>
                <h2 className="text-lg font-black text-black dark:text-white leading-snug">{selectedJob.title}</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-2.5 font-bold">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-zinc-400" />
                    {selectedJob.location_area}, {selectedJob.city}
                  </span>
                  {selectedJob.salary_range && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-zinc-400" />
                      {selectedJob.salary_range}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    Expires {new Date(selectedJob.expires_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="bg-zinc-50 dark:bg-white/[0.02] border border-line p-4.5 rounded-xl space-y-2">
                <h4 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Job Description</h4>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed font-semibold">
                  {selectedJob.description}
                </p>
              </div>

              {/* Contact Info */}
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-line p-4.5 rounded-xl space-y-3">
                <h4 className="text-[10px] font-black text-black dark:text-white uppercase tracking-wider">Employer Contact Info</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-zinc-800 dark:text-zinc-200 text-xs font-bold">
                    <User className="w-4.5 h-4.5 text-zinc-500" />
                    <span>{selectedJob.contact_name}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-zinc-800 dark:text-zinc-200 text-xs font-extrabold">
                    <Phone className="w-4.5 h-4.5 text-zinc-500" />
                    <a href={`tel:${selectedJob.contact_number}`} className="hover:underline text-black dark:text-white underline decoration-zinc-400">
                      {selectedJob.contact_number}
                    </a>
                  </div>
                </div>
              </div>

              {/* Deactivate Button (Visible only to creator or admin) */}
              {(selectedJob.posted_by_user_id === user?.id || user?.is_authority) && (
                <button
                  onClick={() => handleDeactivate(selectedJob.id)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-white/[0.05] text-black dark:text-white text-xs font-black py-3.5 rounded-xl flex items-center justify-center gap-2 transition duration-300"
                >
                  <Ban className="w-4 h-4" />
                  <span>Mark Job as Filled / Closed</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
