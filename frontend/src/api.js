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
    } catch {}
    
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

export async function reverseGeocode(lat, lng) {
  const googleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleKey}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          let city = '';
          let district = '';
          let address = data.results[0].formatted_address || '';
          data.results[0].address_components.forEach(comp => {
            if (comp.types.includes('locality')) city = comp.long_name;
            if (comp.types.includes('administrative_area_level_2')) district = comp.long_name;
          });
          return {
            city: city || district || 'Lucknow',
            district: district || city || 'Lucknow',
            address
          };
        }
      }
    } catch (e) {
      console.warn("Google Maps reverse geocoding error:", e);
    }
  }

  // Fallback to OpenStreetMap Nominatim
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`);
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.village || addr.suburb || addr.state_district || 'Lucknow';
      const district = addr.state_district || addr.county || city;
      return {
        city: city.replace(/ Division| District/gi, '').trim(),
        district: district.replace(/ Division| District/gi, '').trim(),
        address: data.display_name || ''
      };
    }
  } catch (e) {
    console.warn("Nominatim reverse geocode error:", e);
  }

  return { city: 'Lucknow', district: 'Lucknow', address: '' };
}

export const api = {
  register: (userData) =>
    request('/auth/register', { method: 'POST', body: userData, noAuth: true }),

  login: (credentials) =>
    request('/auth/login', { method: 'POST', body: credentials, noAuth: true }),

  authorityRegister: (userData) =>
    request('/auth/authority/register', { method: 'POST', body: userData, noAuth: true }),

  authorityLogin: (credentials) =>
    request('/auth/authority/login', { method: 'POST', body: credentials, noAuth: true }),

  sendOtp: (mobile_number) =>
    request('/auth/send-otp', { method: 'POST', body: { mobile_number }, noAuth: true }),
    
  verifyOtp: (mobile_number, otp) =>
    request('/auth/verify-otp', { method: 'POST', body: { mobile_number, otp }, noAuth: true }),
    
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

  getCivicImpact: () =>
    request('/feed/complaints/impact'),

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
  getRates: ({ commodity = '', mandi = '', district = '', state = '', refresh = false } = {}) => {
    let url = '/rates?';
    if (commodity) url += `commodity=${encodeURIComponent(commodity)}&`;
    if (mandi) url += `mandi=${encodeURIComponent(mandi)}&`;
    if (district) url += `district=${encodeURIComponent(district)}&`;
    if (state) url += `state=${encodeURIComponent(state)}&`;
    if (refresh) url += 'refresh=1&';
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
