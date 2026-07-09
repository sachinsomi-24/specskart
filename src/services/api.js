/**
 * API Client — replaces Firebase service.
 * Exposes the same method signatures so Redux sagas need minimal changes.
 */

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_BASE = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

// Token management
const getToken = () => localStorage.getItem('specskart_token');
const setToken = (token) => localStorage.setItem('specskart_token', token);
const removeToken = () => localStorage.removeItem('specskart_token');

const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
});

const authHeaders = () => ({
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
});

class ApiService {
  constructor() {
    this.authChangeCallback = null;

    // Mimic Firebase auth object for index.jsx compatibility
    this.auth = {
      onAuthStateChanged: (callback) => {
        this.authChangeCallback = callback;

        // Check if we have a stored token and validate it
        const token = getToken();
        if (token) {
          fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          })
            .then((res) => {
              if (res.ok) return res.json();
              throw new Error('Invalid token');
            })
            .then((data) => {
              callback(data.user);
            })
            .catch(() => {
              removeToken();
              callback(null);
            });
        } else {
          callback(null);
        }

        return () => {
          this.authChangeCallback = null;
        };
      },
      setPersistence: () => Promise.resolve()
    };
  }

  // AUTH ACTIONS ------------

  createAccount = async (email, password) => {
    // Note: fullname is added by the saga via addUser
    // We need a temporary signup — the saga calls createAccount then addUser
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email, password, fullname: email.split('@')[0] })
    });

    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.message);
      error.code = data.code;
      throw error;
    }

    setToken(data.token);

    if (this.authChangeCallback) {
      this.authChangeCallback(data.user);
    }

    return { user: data.user };
  };

  signIn = async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/signin`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.message);
      error.code = data.code;
      throw error;
    }

    setToken(data.token);

    if (this.authChangeCallback) {
      this.authChangeCallback(data.user);
    }

    return { user: data.user };
  };

  signInWithGoogle = () => {
    // Social auth not supported with custom backend
    // Could be added with passport.js later
    return Promise.reject(new Error('Google sign-in is not available. Please use email/password.'));
  };

  signInWithFacebook = () => {
    return Promise.reject(new Error('Facebook sign-in is not available. Please use email/password.'));
  };

  signInWithGithub = () => {
    return Promise.reject(new Error('GitHub sign-in is not available. Please use email/password.'));
  };

  signOut = async () => {
    await fetch(`${API_BASE}/auth/signout`, {
      method: 'POST',
      headers: headers()
    });

    removeToken();

    if (this.authChangeCallback) {
      this.authChangeCallback(null);
    }
  };

  passwordReset = async (email) => {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.message);
      error.code = data.code;
      throw error;
    }
  };

  addUser = async (id, user) => {
    // User is already created during signup. Update profile if needed.
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({
        fullname: user.fullname,
        address: user.address || '',
        mobile: user.mobile || { data: {} }
      })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update user');
    }
  };

  getUser = async (id) => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });

    if (!res.ok) {
      return { exists: false, data: () => null };
    }

    const data = await res.json();
    return {
      exists: true,
      data: () => data.profile
    };
  };

  passwordUpdate = async (password) => {
    // Not directly supported — use changePassword
  };

  changePassword = async (currentPassword, newPassword) => {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.message);
      error.code = data.code;
      throw error;
    }

    return data.message;
  };

  reauthenticate = async (currentPassword) => {
    // With JWT, no re-auth needed — token is always valid
    return Promise.resolve();
  };

  updateEmail = async (currentPassword, newEmail) => {
    const res = await fetch(`${API_BASE}/profile/email`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ currentPassword, newEmail })
    });

    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.message);
      error.code = data.code;
      throw error;
    }

    return 'Email Successfully updated';
  };

  updateProfile = async (id, updates) => {
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update profile');
    }
  };

  onAuthStateChanged = () => {
    return new Promise((resolve, reject) => {
      const token = getToken();
      if (token) {
        fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then((res) => {
            if (res.ok) return res.json();
            throw new Error('Auth State Changed failed');
          })
          .then((data) => resolve(data.user))
          .catch((err) => reject(err));
      } else {
        reject(new Error('Auth State Changed failed'));
      }
    });
  };

  saveBasketItems = async (items, userId) => {
    const res = await fetch(`${API_BASE}/profile/basket`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ basket: items })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to save basket');
    }
  };

  setAuthPersistence = () => {
    // JWT tokens are persisted in localStorage by default
    return Promise.resolve();
  };

  // PRODUCT ACTIONS --------------

  getSingleProduct = async (id) => {
    const res = await fetch(`${API_BASE}/products/${id}`);
    const data = await res.json();

    if (!res.ok) {
      return { exists: false, ref: { id }, data: () => null };
    }

    return {
      exists: true,
      ref: { id: data.id },
      data: () => data
    };
  };

  getProducts = async (lastRefKey) => {
    const params = new URLSearchParams();
    if (lastRefKey) params.set('lastKey', lastRefKey);
    params.set('limit', '12');

    const res = await fetch(`${API_BASE}/products?${params}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch products');
    }

    return {
      products: data.products,
      lastKey: data.lastKey,
      total: data.total
    };
  };

  searchProducts = async (searchKey) => {
    const res = await fetch(`${API_BASE}/products/search?q=${encodeURIComponent(searchKey)}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Search failed');
    }

    return {
      products: data.products,
      lastKey: null
    };
  };

  getFeaturedProducts = async (itemsCount = 12) => {
    const res = await fetch(`${API_BASE}/products/featured?limit=${itemsCount}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch featured products');
    }

    // Return in Firestore snapshot-like format for compatibility with existing sagas
    const docs = data.products.map((p) => ({
      ref: { id: p.id },
      data: () => p
    }));

    return {
      empty: docs.length === 0,
      forEach: (cb) => docs.forEach(cb)
    };
  };

  getRecommendedProducts = async (itemsCount = 12) => {
    const res = await fetch(`${API_BASE}/products/recommended?limit=${itemsCount}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch recommended products');
    }

    const docs = data.products.map((p) => ({
      ref: { id: p.id },
      data: () => p
    }));

    return {
      empty: docs.length === 0,
      forEach: (cb) => docs.forEach(cb)
    };
  };

  addProduct = async (id, product) => {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(product)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to add product');
    }

    return data;
  };

  generateKey = () => {
    return 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  };

  storeImage = async (id, folder, imageFile) => {
    if (imageFile instanceof File) {
      const formData = new FormData();
      formData.append('image', imageFile);

      const res = await fetch(`${API_BASE}/products/upload-image`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      return `http://localhost:5000${data.url}`;
    }
    // If it's already a URL string, return as-is
    return imageFile || '/static/salt-image-1.png';
  };

  deleteImage = async (id) => {
    // Image deletion from file system — handled server-side during product update
    return Promise.resolve();
  };

  editProduct = async (id, updates) => {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(updates)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to edit product');
    }

    return data;
  };

  removeProduct = async (id) => {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: headers()
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to remove product');
    }
  };
}

const apiInstance = new ApiService();

export default apiInstance;
