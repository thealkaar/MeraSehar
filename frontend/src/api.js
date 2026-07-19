export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
export const API_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, '');

export function getMediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    ...options.headers,
  };
  
  if (token && !options.noAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is an object and not FormData, stringify it
  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    body,
  });

  if (!response.ok) {
    let errorDetail = 'API Request failed';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch (_) {}
    
    // Auto-logout on 401 Unauthorized
    if (response.status === 401 && !options.noAuth) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth_change'));
    }
    
    throw new Error(errorDetail);
  }

  // Handle file responses (like media downloads)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response;
}

export const api = {
  // Auth
  sendOtp: (mobile_number) => 
    request('/auth/send-otp', { method: 'POST', body: { mobile_number }, noAuth: true }),
    
  verifyOtp: (mobile_number, otp) => 
    request('/auth/verify-otp', { method: 'POST', body: { mobile_number, otp }, noAuth: true }),
    
  register: (userData) => 
    request('/auth/register', { method: 'POST', body: userData, noAuth: true }),
    
  getMe: () => 
    request('/auth/me'),
    
  updateMe: (userData) => 
    request('/auth/me', { method: 'PATCH', body: userData }),

  // Feed (News & Complaints)
  getFeed: ({ type, cursor, limit = 10, sort = 'recent', category = '', statusFilter = '' }) => {
    let url = `/feed?type=${type}&limit=${limit}&sort=${sort}`;
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (statusFilter) url += `&status_filter=${encodeURIComponent(statusFilter)}`;
    return request(url);
  },

  createPost: (formData) => {
    // formData is an instance of FormData to handle media file uploads
    return request('/feed', {
      method: 'POST',
      body: formData,
    });
  },

  likePost: (postId) => 
    request(`/feed/posts/${postId}/like`, { method: 'POST' }),
    
  upvotePost: (postId) => 
    request(`/feed/posts/${postId}/upvote`, { method: 'POST' }),

  // Comments
  getComments: (postId) => 
    request(`/feed/posts/${postId}/comments`),
    
  createComment: (postId, text) => 
    request(`/feed/posts/${postId}/comments`, { method: 'POST', body: { text } }),

  // Jobs
  getJobs: ({ search = '', category = '', location = '' } = {}) => {
    let url = '/jobs?';
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (category) url += `category=${encodeURIComponent(category)}&`;
    if (location) url += `location=${encodeURIComponent(location)}&`;
    return request(url);
  },

  createJob: (jobData) => 
    request('/jobs', { method: 'POST', body: jobData }),
    
  deactivateJob: (jobId) => 
    request(`/jobs/${jobId}/deactivate`, { method: 'PATCH' }),

  // Mandi Rates
  getRates: ({ commodity = '', mandi = '' } = {}) => {
    let url = '/rates?';
    if (commodity) url += `commodity=${encodeURIComponent(commodity)}&`;
    if (mandi) url += `mandi=${encodeURIComponent(mandi)}&`;
    return request(url);
  },

  // Authority Routing & Updates
  updateComplaintStatus: (postId, status) => 
    request(`/feed/complaints/${postId}/status`, { 
      method: 'PATCH', 
      body: { status } 
    }),
    
  getRoutingMap: () => 
    request('/feed/complaints/routing'),
};
