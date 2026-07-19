import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { 
  Heart, ArrowUp, MessageCircle, Send, Image, Camera, X, Plus, 
  ChevronDown, MessageSquare, CheckCircle, AlertTriangle, HelpCircle, 
  MapPin, Loader2, RefreshCw 
} from 'lucide-react';

export default function FeedView({ type, user }) {
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sort, setSort] = useState('recent'); // 'recent' or 'trending'
  
  // Complaints Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [commentDrawerPost, setCommentDrawerPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  // New Post Form State
  const [postText, setPostText] = useState('');
  const [postCategory, setPostCategory] = useState('');
  const [postFile, setPostFile] = useState(null);
  const [postFilePreview, setPostFilePreview] = useState(null);
  const [submittingPost, setSubmittingPost] = useState(false);
  const [postError, setPostError] = useState('');

  // Animation trigger states
  const [animateLikes, setAnimateLikes] = useState({});
  const [animateUpvotes, setAnimateUpvotes] = useState({});

  // Infinite Scroll Trigger
  const loaderRef = useRef(null);

  const categories = [
    "Waste Collection", 
    "Streetlight Fault", 
    "Electricity", 
    "Water Supply", 
    "Road Damage", 
    "Other"
  ];

  // Premium Grayscale Status Indicators
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

  const statusIcons = {
    pending: AlertTriangle,
    forwarded: HelpCircle,
    in_progress: RefreshCw,
    resolved: CheckCircle
  };

  // Fetch initial posts on type, sort or filter change
  const fetchInitialFeed = async () => {
    setLoading(true);
    setHasMore(true);
    try {
      const response = await api.getFeed({
        type,
        sort,
        category: type === 'complaint' ? categoryFilter : '',
        statusFilter: type === 'complaint' ? statusFilter : ''
      });
      setPosts(response.posts);
      setCursor(response.next_cursor);
      if (!response.next_cursor) setHasMore(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialFeed();
  }, [type, sort, categoryFilter, statusFilter]);

  // Fetch more posts for infinite scroll
  const fetchNextPage = async () => {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);
    try {
      const response = await api.getFeed({
        type,
        sort,
        cursor,
        category: type === 'complaint' ? categoryFilter : '',
        statusFilter: type === 'complaint' ? statusFilter : ''
      });
      setPosts((prev) => [...prev, ...response.posts]);
      setCursor(response.next_cursor);
      if (!response.next_cursor) setHasMore(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Setup Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [cursor, hasMore, loading, loadingMore]);

  // Interactive functions
  const handleLike = async (postId) => {
    setAnimateLikes(prev => ({ ...prev, [postId]: true }));
    setTimeout(() => {
      setAnimateLikes(prev => ({ ...prev, [postId]: false }));
    }, 400);

    // Optimistic UI Update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          is_liked: !p.is_liked,
          likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1
        };
      }
      return p;
    }));
    try {
      await api.likePost(postId);
    } catch (err) {
      console.error(err);
      fetchInitialFeed();
    }
  };

  const handleUpvote = async (postId) => {
    setAnimateUpvotes(prev => ({ ...prev, [postId]: true }));
    setTimeout(() => {
      setAnimateUpvotes(prev => ({ ...prev, [postId]: false }));
    }, 400);

    // Optimistic UI Update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          is_upvoted: !p.is_upvoted,
          upvotes_count: p.is_upvoted ? p.upvotes_count - 1 : p.upvotes_count + 1
        };
      }
      return p;
    }));
    try {
      await api.upvotePost(postId);
    } catch (err) {
      console.error(err);
      fetchInitialFeed();
    }
  };

  // Comments Drawer
  const openComments = async (post) => {
    setCommentDrawerPost(post);
    setLoadingComments(true);
    setComments([]);
    try {
      const list = await api.getComments(post.id);
      setComments(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !commentDrawerPost) return;
    try {
      const created = await api.createComment(commentDrawerPost.id, newComment.trim());
      setComments(prev => [...prev, created]);
      setNewComment('');
      
      // Update comment count on post list
      setPosts(prev => prev.map(p => {
        if (p.id === commentDrawerPost.id) {
          return { ...p, comments_count: p.comments_count + 1 };
        }
        return p;
      }));
    } catch (err) {
      alert(err.message || 'Failed to post comment');
    }
  };

  // File selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPostFile(file);
    setPostFilePreview(URL.createObjectURL(file));
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postText.trim()) return;
    if (type === 'complaint' && !postCategory) {
      setPostError('Please select a category');
      return;
    }
    if (type === 'complaint' && !postFile) {
      setPostError('Photo attachment is mandatory for civic complaints');
      return;
    }

    setSubmittingPost(true);
    setPostError('');

    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('text', postText.trim());
      if (postCategory) formData.append('category', postCategory);
      if (postFile) formData.append('file', postFile);
      
      // Attempt manual GPS attachment if available
      if (navigator.geolocation) {
        const pos = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 4000 });
        });
        if (pos) {
          formData.append('latitude', pos.coords.latitude.toString());
          formData.append('longitude', pos.coords.longitude.toString());
        }
      }

      await api.createPost(formData);
      
      // Reset form & reload feed
      setPostText('');
      setPostCategory('');
      setPostFile(null);
      setPostFilePreview(null);
      setShowCreateModal(false);
      fetchInitialFeed();
    } catch (err) {
      setPostError(err.message || 'Failed to submit post');
    } finally {
      setSubmittingPost(false);
    }
  };

  return (
    <div className="w-full px-4 pt-4 pb-24 relative">
      {/* Top Controller */}
      <div className="flex items-center justify-between mb-5.5 animate-fadeIn">
        {/* Sort Tabs */}
        <div className="premium-segment-control flex gap-3 p-1 rounded-xl border border-line">
          <button 
            onClick={() => setSort('recent')}
            className={`premium-segment-option px-5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 ${
              sort === 'recent' 
                ? 'premium-segment-selected' 
                : 'text-zinc-500 hover:text-black dark:hover:text-white'
            }`}
          >
            Recent
          </button>
          <button 
            onClick={() => setSort('trending')}
            className={`premium-segment-option px-5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 ${
              sort === 'trending' 
                ? 'premium-segment-selected' 
                : 'text-zinc-500 hover:text-black dark:hover:text-white'
            }`}
          >
            Trending
          </button>
        </div>

        {/* Info */}
        <div className="text-[10px] uppercase font-black tracking-widest text-zinc-450 dark:text-zinc-500">
          City: {user?.city}
        </div>
      </div>

      {/* Complaints Filtering controls */}
      {type === 'complaint' && (
        <div className="grid grid-cols-2 gap-2.5 mb-5.5 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-line animate-fadeIn">
          {/* Category Filter */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full premium-input text-xs rounded-xl py-2.5 pl-3.5 pr-8 appearance-none font-bold"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-3.5 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full premium-input text-xs rounded-xl py-2.5 pl-3.5 pr-8 appearance-none font-bold"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="forwarded">Forwarded</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-3.5 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Feed List */}
      {loading ? (
        <div className="space-y-4.5">
          {[1, 2, 3].map(n => (
            <div key={n} className="premium-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 premium-skeleton rounded-full shrink-0"></div>
                <div className="space-y-2 flex-grow">
                  <div className="h-4 premium-skeleton w-1/3"></div>
                  <div className="h-3 premium-skeleton w-1/4"></div>
                </div>
              </div>
              <div className="h-20 premium-skeleton"></div>
              <div className="flex gap-4 pt-2">
                <div className="h-8 premium-skeleton w-16"></div>
                <div className="h-8 premium-skeleton w-16"></div>
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-2xl border border-line border-dashed">
          <HelpCircle className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
          <h3 className="text-zinc-700 dark:text-zinc-400 font-bold text-sm uppercase tracking-wider">No posts found</h3>
          <p className="text-xs text-zinc-500 mt-1.5 px-4 font-semibold">Be the first to share updates or raise a complaint in {user?.city}!</p>
        </div>
      ) : (
        <div className="space-y-4.5 animate-fadeIn">
          {posts.map((post) => {
            const statusConfig = post.type === 'complaint' ? statusColors[post.status] : null;
            const StatusIcon = post.type === 'complaint' && statusIcons[post.status] ? statusIcons[post.status] : null;
            return (
              <article key={post.id} className="premium-card overflow-hidden">
                {/* Header */}
                <div className="p-4.5 flex items-center justify-between border-b border-line bg-zinc-50/50 dark:bg-zinc-950/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-black dark:bg-white flex items-center justify-center font-black text-white dark:text-black shrink-0">
                      {post.user.full_name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-black dark:text-white leading-snug">{post.user.full_name}</h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 font-bold">
                        <MapPin className="w-3.5 h-3.5 text-black dark:text-white shrink-0" />
                        <span>{post.city}</span>
                        <span>•</span>
                        <span>{new Date(post.created_at).toLocaleDateString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Complaint Category and Status */}
                  {post.type === 'complaint' && statusConfig && (
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[9px] font-black px-2.5 py-0.5 rounded-lg border border-line bg-zinc-50 dark:bg-zinc-900 text-black dark:text-white uppercase tracking-wider">
                        {post.category}
                      </span>
                      <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text} text-[9px] font-black uppercase tracking-wider`}>
                        {StatusIcon && <StatusIcon className="w-3 h-3" />}
                        <span>{statusConfig.label}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Media Image */}
                {post.media_url && (
                  <div className="relative aspect-video bg-zinc-100 dark:bg-black overflow-hidden border-b border-line">
                    <img 
                      src={`http://localhost:8000${post.media_url}`} 
                      alt="Upload Attachment" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Content Body */}
                <div className="p-5">
                  <p className="text-[13px] text-black dark:text-white whitespace-pre-wrap leading-relaxed font-semibold">
                    {post.text}
                  </p>

                  {/* Actions footer */}
                  <div className="flex items-center gap-3 mt-5 pt-4 border-t border-line text-xs font-bold">
                    {/* Upvote button */}
                    <button 
                      onClick={() => handleUpvote(post.id)}
                      className={`flex items-center gap-2 py-1.5 px-3.5 rounded-xl border transition-all duration-300 ${
                        post.is_upvoted 
                          ? 'bg-black dark:bg-white border-black dark:border-white text-white dark:text-black shadow-sm' 
                          : 'border-line bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      <ArrowUp className={`w-4 h-4 transition-transform duration-300 ${post.is_upvoted ? 'stroke-[2.5px] -translate-y-[1px]' : ''} ${animateUpvotes[post.id] ? 'scale-125' : ''}`} />
                      <span>{post.upvotes_count}</span>
                    </button>

                    {/* Like button */}
                    <button 
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-2 py-1.5 px-3.5 rounded-xl border transition-all duration-300 ${
                        post.is_liked 
                          ? 'bg-black dark:bg-white border-black dark:border-white text-white dark:text-black shadow-sm' 
                          : 'border-line bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      <Heart className={`w-4 h-4 transition-transform duration-350 ${post.is_liked ? 'fill-current stroke-current text-white dark:text-black' : ''} ${animateLikes[post.id] ? 'scale-125 like-bounce' : ''}`} />
                      <span>{post.likes_count}</span>
                    </button>

                    {/* Comment button */}
                    <button 
                      onClick={() => openComments(post)}
                      className="flex items-center gap-2 py-1.5 px-3.5 rounded-xl border border-line bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.05] hover:text-black dark:hover:text-white transition-all duration-300"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{post.comments_count}</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Infinite Scroll Loader Target */}
      <div ref={loaderRef} className="py-6 flex justify-center text-zinc-500 text-xs">
        {loadingMore && <Loader2 className="w-6 h-6 animate-spin text-black dark:text-white" />}
      </div>

      {/* Floating Action Button (FAB) */}
      <button 
        onClick={() => {
          setPostError('');
          setShowCreateModal(true);
        }}
        className="fixed bottom-20 lg:bottom-8 right-6 z-30 w-14 h-14 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-xl hover:opacity-90 active:scale-95 border border-zinc-200 dark:border-zinc-800 transition-all duration-300"
      >
        <Plus className="w-7 h-7 stroke-[2.5px]" />
      </button>

      {/* CREATE POST MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-line rounded-2xl overflow-hidden shadow-2xl animate-scaleIn flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-line">
              <h3 className="font-black text-black dark:text-white text-base tracking-wider uppercase">
                {type === 'news' ? 'Report Incident' : 'File Civic Complaint'}
              </h3>
              <button 
                onClick={() => {
                  setPostFile(null);
                  setPostFilePreview(null);
                  setShowCreateModal(false);
                }}
                className="text-zinc-400 hover:text-black dark:hover:text-white p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.05]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="p-5 space-y-4.5 overflow-y-auto no-scrollbar">
              {postError && (
                <div className="bg-zinc-50 dark:bg-zinc-950 border-2 border-black dark:border-white text-black dark:text-white p-3.5 rounded-xl text-xs font-bold">
                  {postError}
                </div>
              )}

              {/* Category selector (Complaints only) */}
              {type === 'complaint' && (
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Complaint Category
                  </label>
                  <div className="relative">
                    <select
                      value={postCategory}
                      onChange={(e) => setPostCategory(e.target.value)}
                      className="w-full premium-input text-xs rounded-xl py-3.5 px-3.5 appearance-none font-bold"
                      required
                    >
                      <option value="">Select a Category</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-4 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Text Description */}
              <div>
                <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  Details / Description
                </label>
                <textarea
                  rows={4}
                  placeholder={type === 'news' ? "What's happening? Describe the event, traffic or incident..." : "Describe the civic issue in detail so municipal authorities can understand..."}
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  className="w-full premium-input rounded-xl p-3.5 text-xs placeholder-zinc-400 dark:placeholder-zinc-700 resize-none font-semibold"
                  required
                />
              </div>

              {/* Image upload */}
              <div>
                <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  {type === 'complaint' ? 'Attach Photo (Mandatory)' : 'Attach Photo (Optional)'}
                </label>

                {postFilePreview ? (
                  <div className="relative w-full aspect-video rounded-xl bg-zinc-50 dark:bg-black border border-line overflow-hidden">
                    <img src={postFilePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setPostFile(null);
                        setPostFilePreview(null);
                      }}
                      className="absolute top-3 right-3 bg-black/60 backdrop-blur-md rounded-xl p-2 text-white hover:bg-black/80 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full aspect-video rounded-xl border border-line border-dashed bg-zinc-50 dark:bg-black hover:bg-zinc-100 dark:hover:bg-white/[0.02] cursor-pointer transition">
                    <Camera className="w-8 h-8 text-zinc-400 dark:text-zinc-700 mb-2" />
                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Click to upload photo</span>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-650 mt-1 font-bold">JPEG or PNG format</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      className="hidden" 
                      required={type === 'complaint'}
                    />
                  </label>
                )}
              </div>

              <button
                type="submit"
                disabled={submittingPost}
                className="w-full pill-button-primary font-bold py-3.5 flex items-center justify-center gap-2 transition disabled:opacity-50 text-xs font-black uppercase tracking-wider"
              >
                {submittingPost ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Publish Post</span>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* COMMENTS DRAWER / OVERLAY */}
      {commentDrawerPost && (
        <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/80 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 border-t border-line rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden animate-slideUp">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-line sticky top-0 z-10 bg-white dark:bg-zinc-950">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4.5 h-4.5 text-black dark:text-white" />
                <span className="font-black text-sm text-black dark:text-white uppercase tracking-wider">Comments ({commentDrawerPost.comments_count})</span>
              </div>
              <button 
                onClick={() => setCommentDrawerPost(null)}
                className="text-zinc-400 hover:text-black dark:hover:text-white p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.05]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {loadingComments ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-black dark:text-white" />
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 font-bold">Loading comments...</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-10 h-10 text-zinc-300 dark:text-zinc-800 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500 font-bold">No comments yet. Be the first to share your thoughts!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2.5 items-start">
                    <div className="w-9 h-9 rounded-full bg-black dark:bg-white flex items-center justify-center font-bold text-xs text-white dark:text-black flex-shrink-0">
                      {comment.user.full_name.charAt(0)}
                    </div>
                    <div className="flex-grow bg-zinc-50 dark:bg-white/[0.02] border border-line p-3.5 rounded-xl">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold text-black dark:text-white">{comment.user.full_name}</span>
                        <span className="text-[9px] text-zinc-400 dark:text-zinc-550 font-bold">
                          {new Date(comment.created_at).toLocaleDateString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-800 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed font-semibold">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Form */}
            <form onSubmit={handlePostComment} className="p-3.5 border-t border-line bg-zinc-50 dark:bg-zinc-950 flex gap-2 items-center safe-bottom">
              <input
                type="text"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 premium-input rounded-xl px-4 py-2.5 text-xs font-semibold"
                required
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="p-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-85 disabled:opacity-40 transition shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
