/**
 * LoadMatch API client — talks to the Node backend instead of localStorage.
 *
 * Include this script BEFORE assets/js/pages.js:
 *   <script src="assets/js/api-client.js"></script>
 *   <script src="assets/js/pages.js"></script>
 *
 * It exposes a single global: LoadMatchAPI
 *
 * Set the backend URL below once you've deployed it (see backend/README.md
 * for the Render deployment steps). For local development against
 * `node server.js`, https://trackloadadmin.onrender.com';</script> is already correct.
 */
(function (global) {
  'use strict';

  // TODO: replace with your deployed backend's URL once it's live, e.g.
  // 'https://loadmatch-backend.onrender.com'
  const API_BASE = window.LOADMATCH_API_BASE || 'https://trackloadadmin.onrender.com';</script>.

  const TOKEN_KEY = 'lm_token';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }
  function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  async function request(method, path, { body, query, auth = true } = {}) {
    let url = API_BASE + path;
    if (query) {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ''))
      ).toString();
      if (qs) url += '?' + qs;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (auth && getToken()) headers.Authorization = 'Bearer ' + getToken();

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      const err = new Error(data.error || `Request failed (${res.status})`);
      err.status = res.status;
      err.details = data.details;
      throw err;
    }
    return data;
  }

  const LoadMatchAPI = {
    // ---- auth ----
    async register({ role, ownerName, company, email, phone, password }) {
      const data = await request('POST', '/api/auth/register', { body: { role, ownerName, company, email, phone, password }, auth: false });
      setToken(data.token);
      return data.user;
    },
    async login(email, password) {
      const data = await request('POST', '/api/auth/login', { body: { email, password }, auth: false });
      setToken(data.token);
      return data.user;
    },
    logout() {
      setToken(null);
    },
    isLoggedIn() {
      return !!getToken();
    },
    async me() {
      const data = await request('GET', '/api/me');
      return data.user;
    },

    // ---- trucks ----
    postTruck(truck) {
      // truck: { plateNo, truckType, fromCity, toCity, capacityKg, volumeM3, ratePerKmGhs, availableFrom, availableTo }
      return request('POST', '/api/trucks', { body: truck }).then((d) => d.truck);
    },
    listTrucks(filter = {}) {
      return request('GET', '/api/trucks', { query: filter, auth: false }).then((d) => d.trucks);
    },

    // ---- loads ----
    postLoad(load) {
      // load: { description, fromCity, toCity, weightKg, volumeM3, budgetGhs, pickupDate, deliveryDate }
      return request('POST', '/api/loads', { body: load }).then((d) => d.load);
    },
    listLoads(filter = {}) {
      return request('GET', '/api/loads', { query: filter, auth: false }).then((d) => d.loads);
    },

    // ---- pricing ----
    estimatePrice({ from, to, ratePerKmGhs, weightKg, volumeM3, verified }) {
      return request('GET', '/api/pricing/estimate', {
        query: { from, to, ratePerKmGhs, weightKg, volumeM3, verified },
        auth: false,
      });
    },

    // ---- matching ----
    runMatching() {
      return request('GET', '/api/matches/run', { auth: false }).then((d) => d.candidates);
    },
    proposeMatch(truckId, loadId) {
      return request('POST', '/api/matches', { body: { truckId, loadId } }).then((d) => d.match);
    },
    listMyMatches() {
      return request('GET', '/api/matches').then((d) => d.matches);
    },
    getMatch(id) {
      return request('GET', `/api/matches/${id}`);
    },
    acceptMatch(id) {
      return request('POST', `/api/matches/${id}/accept`).then((d) => d.match);
    },

    // ---- contract ----
    generateContract(matchId) {
      return request('POST', `/api/matches/${matchId}/contract`).then((d) => d.contract);
    },
    signContract(matchId, signatureName) {
      return request('POST', `/api/matches/${matchId}/contract/sign`, { body: { signatureName } });
    },

    // ---- escrow / payment ----
    fundEscrow(matchId) {
      return request('POST', `/api/matches/${matchId}/escrow/fund`);
    },
    getPayment(matchId) {
      return request('GET', `/api/matches/${matchId}/payment`).then((d) => d.payment);
    },

    // ---- GPS tracking ----
    postTrackingPoint(matchId, lat, lng, note) {
      return request('POST', `/api/matches/${matchId}/tracking`, { body: { lat, lng, note } });
    },
    getTracking(matchId) {
      return request('GET', `/api/matches/${matchId}/tracking`).then((d) => d.events);
    },

    // ---- proof of delivery ----
    requestPodOtp(matchId) {
      return request('POST', `/api/matches/${matchId}/pod/request-otp`);
    },
    verifyPodOtp(matchId, otp) {
      return request('POST', `/api/matches/${matchId}/pod/verify`, { body: { otp } });
    },
  };

  global.LoadMatchAPI = LoadMatchAPI;
})(window);
