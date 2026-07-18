import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  X, CheckCircle, AlertTriangle, RefreshCw, HelpCircle, 
  MapPin, Clock, Edit2, Loader2, ArrowRight 
} from 'lucide-react';

export default function AuthorityView({ user, onClose }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  
  // Selected complaint details
  const [activeComplaint, setActiveComplaint] = useState(null);
  const [updating, setUpdating] = useState(false);

  const statusColors = {
    pending: { 
      bg: 'bg-zinc-100 dark:bg-zinc-900', 
      border: 'border-zinc-200 dark:border-zinc-800', 
      text: 'text-zinc-500 dark:text-zinc-400', 
      label: 'Pending' 
    },
    forwarded: { 
      bg: 'bg-zinc-100 dark:bg-zinc-900', 
      border: 'border-zinc-300 dark:border-zinc-700', 
      text: 'text-zinc-700 dark:text-zinc-300', 
      label: 'Forwarded' 
    },
    in_progress: { 
      bg: 'bg-zinc-50 dark:bg-zinc-950', 
      border: 'border-black dark:border-white', 
      text: 'text-black dark:text-white', 
      label: 'In Progress' 
    },
    resolved: { 
      bg: 'bg-black dark:bg-white', 
      border: 'border-black dark:border-white', 
      text: 'text-white dark:text-black font-extrabold', 
      label: 'Resolved' 
    },
  };

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const response = await api.getFeed({
        type: 'complaint',
        limit: 50,
        sort: 'recent',
        statusFilter
      });
      setComplaints(response.posts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.is_authority) {
      fetchComplaints();
    }
  }, [statusFilter]);

  const handleUpdateStatus = async (statusVal) => {
    if (!activeComplaint) return;
    setUpdating(true);
    try {
      const updated = await api.updateComplaintStatus(activeComplaint.id, statusVal);
      // Update in local list
      setComplaints(prev => prev.map(c => c.id === updated.id ? { ...c, status: updated.status } : c));
      setActiveComplaint(null);
      fetchComplaints();
    } catch (err) {
      alert(err.message || 'Failed to update complaint status');
    } finally {
      setUpdating(false);
    }
  };

  if (!user?.is_authority) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center px-6 text-center transition-colors duration-300 bg-black">
        <AlertTriangle className="w-12 h-12 text-white mb-4" />
        <h2 className="text-white font-extrabold text-xl uppercase tracking-wider">Access Denied</h2>
        <p className="text-xs text-zinc-400 mt-2 max-w-xs leading-relaxed font-bold">
          Your account is not marked as a civic authority. Please log in with an authorized account.
        </p>
        <button 
          onClick={onClose}
          className="mt-6 bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider px-6 py-3.5 rounded-xl transition duration-300"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="w-full pb-20">
      {/* Header bar */}
      <div className="bg-zinc-50 dark:bg-zinc-950 border-b border-line px-4 py-3.5 flex items-center justify-between animate-fadeIn">
        <div>
          <h2 className="text-black dark:text-white font-black text-sm uppercase tracking-wider">Authority Dashboard</h2>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Reviewing complaints in {user.city}</p>
        </div>
        <button 
          onClick={onClose}
          className="pill-button-secondary text-xs font-black uppercase tracking-wider px-3.5 py-1.5"
        >
          Exit Panel
        </button>
      </div>

      <div className="max-w-xl mx-auto px-4 mt-4 space-y-4">
        {/* Filters */}
        <div className="relative animate-fadeIn">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full premium-input rounded-xl py-3.5 px-4 text-xs font-bold appearance-none"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="forwarded">Forwarded</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <span className="absolute right-4 top-4 border-l border-line pl-3 text-zinc-400 pointer-events-none text-xs">▼</span>
        </div>

        {/* Complaints count */}
        <h3 className="text-[10px] uppercase font-black tracking-wider text-zinc-400 dark:text-zinc-500 px-1 animate-fadeIn">
          Complaints List ({complaints.length})
        </h3>

        {/* Complaints items */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-black dark:text-white" />
          </div>
        ) : complaints.length === 0 ? (
          <div className="text-center py-16 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-2xl border border-line border-dashed">
            <CheckCircle className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-xs text-zinc-505 font-bold uppercase tracking-wider">No active complaints found matching this filter.</p>
          </div>
        ) : (
          <div className="space-y-3.5 animate-fadeIn">
            {complaints.map((complaint) => {
              const statusCfg = statusColors[complaint.status] || statusColors.pending;
              const borderColors = {
                resolved: 'border-l-black dark:border-l-white',
                in_progress: 'border-l-zinc-500',
                forwarded: 'border-l-zinc-300',
                pending: 'border-l-zinc-100 dark:border-l-zinc-800'
              };
              const leftBorderColorClass = borderColors[complaint.status] || 'border-l-zinc-200';

              return (
                <button
                  key={complaint.id}
                  onClick={() => setActiveComplaint(complaint)}
                  className={`w-full premium-card p-5 text-left hover:border-black dark:hover:border-white block border-l-4 ${leftBorderColorClass} transition duration-300`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[9px] uppercase font-black px-2.5 py-0.5 rounded-lg border border-line bg-zinc-50 dark:bg-zinc-900 text-black dark:text-white tracking-wider">
                      {complaint.category}
                    </span>
                    <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.border} ${statusCfg.text} uppercase tracking-wider`}>
                      {statusCfg.label}
                    </span>
                  </div>
                  <h4 className="text-xs text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-relaxed mb-3.5 font-semibold">
                    {complaint.text}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-550 font-bold">
                    <span>By: {complaint.user.full_name}</span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(complaint.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* COMPLAINT STATUS DRAWER */}
      {activeComplaint && (
        <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/80 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 border-t border-line rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden animate-slideUp">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-line sticky top-0 z-10 bg-white dark:bg-zinc-950">
              <span className="text-xs font-black text-black dark:text-white uppercase tracking-wider">Manage Complaint Status</span>
              <button 
                onClick={() => setActiveComplaint(null)} 
                className="text-zinc-400 hover:text-black dark:hover:text-white p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.05]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Details body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4.5 no-scrollbar">
              <div className="flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-450 font-bold">
                <span>Category: <strong className="text-black dark:text-white font-extrabold uppercase tracking-wider">{activeComplaint.category}</strong></span>
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-black dark:text-white" /> {activeComplaint.city}</span>
              </div>

              {/* Photo attachment */}
              {activeComplaint.media_url && (
                <div className="w-full aspect-video rounded-xl bg-zinc-100 dark:bg-black border border-line overflow-hidden">
                  <img src={`http://localhost:8000${activeComplaint.media_url}`} alt="Evidence" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Description */}
              <div className="bg-zinc-50 dark:bg-white/[0.02] p-4.5 rounded-xl text-xs text-zinc-800 dark:text-zinc-205 leading-relaxed border border-line font-semibold">
                {activeComplaint.text}
              </div>

              {/* Status Update Options */}
              <div className="space-y-4 border-t border-line pt-4">
                <h4 className="text-[10px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">Change Status State</h4>
                
                {updating ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-black dark:text-white" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 text-xs font-bold">
                    <button
                      onClick={() => handleUpdateStatus('pending')}
                      className={`py-3.5 px-4 border rounded-xl flex items-center justify-center gap-1.5 transition duration-300 ${
                        activeComplaint.status === 'pending'
                          ? 'bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-black dark:text-white font-extrabold'
                          : 'border-line bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-white/[0.05] text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      <span>Pending</span>
                    </button>
                    
                    <button
                      onClick={() => handleUpdateStatus('forwarded')}
                      className={`py-3.5 px-4 border rounded-xl flex items-center justify-center gap-1.5 transition duration-300 ${
                        activeComplaint.status === 'forwarded'
                          ? 'bg-zinc-150 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-black dark:text-white font-extrabold'
                          : 'border-line bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-white/[0.05] text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      <span>Forwarded</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus('in_progress')}
                      className={`py-3.5 px-4 border rounded-xl flex items-center justify-center gap-1.5 transition duration-300 ${
                        activeComplaint.status === 'in_progress'
                          ? 'bg-zinc-200 dark:bg-zinc-700 border-zinc-400 dark:border-zinc-650 text-black dark:text-white font-extrabold'
                          : 'border-line bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-white/[0.05] text-zinc-550 dark:text-zinc-400'
                      }`}
                    >
                      <span>In Progress</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus('resolved')}
                      className={`py-3.5 px-4 border rounded-xl flex items-center justify-center gap-1.5 transition duration-300 ${
                        activeComplaint.status === 'resolved'
                          ? 'bg-black dark:bg-white border-black dark:border-white text-white dark:text-black font-extrabold'
                          : 'border-line bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-white/[0.05] text-zinc-550 dark:text-zinc-400'
                      }`}
                    >
                      <span>Resolved</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
