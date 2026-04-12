
/* ═══════════════════════════════════
   STATE
═══════════════════════════════════ */
const APP = {
  loggedIn: false,
  user: null,
  selectedDate: null,
  selectedTime: null,
  selectedPartner: null,
  vcallTimer: null,
  vcallSecs: 0,
  sessions: [],
  onboardStep: 1,
  offerSkills: [],
  wantSkills: []
};

const SESSION_KEY = 'skillswap_session';
const HANDOFF_KEY = 'skillswap_autologin_payload';
const TARGET_KEY = 'skillswap_post_login_target';
const API_BASE = window.SKILLSWAP_API_BASE || 'http://localhost:8080/SkillSwap';

const DEMO_USERS = {
  'demo@skillswap.com': { pass: 'demo123', name: 'Sarah J.', initials: 'SJ', color: 'linear-gradient(135deg,#3b4fd8,#0cbfb0)' }
};

const SOCIAL_AUTH_PROVIDERS = {
  google: {
    label: 'Google',
    name: 'Google Member',
    initials: 'GM',
    email: 'google.user@skillswap.social',
    color: 'linear-gradient(135deg,#4285f4,#34a853)'
  },
  github: {
    label: 'GitHub',
    name: 'GitHub Member',
    initials: 'GH',
    email: 'github.user@skillswap.social',
    color: 'linear-gradient(135deg,#24292f,#57606a)'
  },
  linkedin: {
    label: 'LinkedIn',
    name: 'LinkedIn Member',
    initials: 'LI',
    email: 'linkedin.user@skillswap.social',
    color: 'linear-gradient(135deg,#0077b5,#00a0dc)'
  }
};

const ALL_PARTNERS = [
  { name:'Marcus T.', initials:'MT', color:'linear-gradient(135deg,#f59e0b,#10b981)', skills:'Teaches React · Wants Figma', compat:'95%' },
  { name:'Elena R.', initials:'ER', color:'linear-gradient(135deg,#8b5cf6,#ec4899)', skills:'Teaches Node.js · Wants Marketing', compat:'97%' },
  { name:'James W.', initials:'JW', color:'linear-gradient(135deg,#0cbfb0,#0891b2)', skills:'Teaches Figma · Wants Python', compat:'75%' },
  { name:'Alex M.', initials:'AM', color:'linear-gradient(135deg,#4f46e5,#7c3aed)', skills:'Teaches Design · Wants React', compat:'91%' },
  { name:'Raj C.', initials:'RC', color:'linear-gradient(135deg,#f59e0b,#ef4444)', skills:'Teaches DevOps · Wants English', compat:'82%' },
];

const OFFER_SKILLS = ['Figma','UI/UX Design','Prototyping','Photoshop','Illustrator','React','Python','Node.js','Vue.js','Django'];
const WANT_SKILLS = ['React','Python','Data Science','Spanish','French','Marketing','Photography','Music','English','Machine Learning'];

/* ═══════════════════════════════════
   NAVIGATION
═══════════════════════════════════ */
function normalizePage(name) {
  const validPages = ['home', 'discover', 'dashboard', 'messages', 'live'];
  return validPages.includes(name) ? name : 'home';
}

function getHashRoute() {
  const hash = (window.location.hash || '').replace('#', '').trim();
  if (hash === 'community') return 'community';
  return normalizePage(hash || 'home');
}

function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(HANDOFF_KEY);
  localStorage.removeItem(TARGET_KEY);
}

function showPage(name) {
  const target = normalizePage(name);
  if (['dashboard','messages','live'].includes(target) && !APP.loggedIn) {
    openModal('login');
    showToast('🔒 Please log in to access ' + target);
    return;
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + target);
  if (el) el.classList.add('active');
  if (target === 'discover') { setTimeout(discoverSearch, 10); }
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.remove('active');
    if (a.dataset && a.dataset.page === target) a.classList.add('active');
  });
  window.scrollTo(0,0);
}

function openCommunity() {
  showPage('home');
  const section = document.getElementById('community-section');
  if (!section) return;
  const nav = document.getElementById('nav');
  const offset = nav ? nav.offsetHeight + 10 : 74;
  const y = section.getBoundingClientRect().top + window.pageYOffset - offset;
  window.scrollTo({ top: y, behavior: 'smooth' });
  document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
  const navLink = document.querySelector('.nav-link[data-page="community"]');
  if (navLink) navLink.classList.add('active');
}

function requireAuth(fn) {
  if (!APP.loggedIn) { openModal('login'); showToast('🔒 Please log in first'); return; }
  fn();
}

/* ═══════════════════════════════════
   AUTH MODAL
═══════════════════════════════════ */
function openModal(tab) {
  document.getElementById('auth-overlay').classList.remove('hidden');
  switchTab(tab || 'login');
}
function closeModal() { document.getElementById('auth-overlay').classList.add('hidden'); }
function closeModalOutside(e) { if (e.target === document.getElementById('auth-overlay')) closeModal(); }
function switchTab(tab) {
  document.getElementById('login-error').classList.add('hidden');
  document.getElementById('signup-error').classList.add('hidden');
  document.getElementById('form-login').classList.toggle('hidden', tab !== 'login');
  document.getElementById('form-signup').classList.toggle('hidden', tab !== 'signup');
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
}

async function parseApiResponse(response) {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_) {
    return { success: false, message: raw.trim() || 'Unexpected server response.' };
  }
}

function resolveApiErrorMessage(response, data, fallbackMessage) {
  if (data && typeof data.message === 'string' && data.message.trim()) return data.message.trim();
  if (response.status === 404) return 'API endpoint not found. Check backend base URL.';
  if (response.status >= 500) return 'Backend server error. Please try again.';
  return fallbackMessage;
}

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  if (!email || !pass) { errEl.textContent='Please fill in all fields.'; errEl.classList.remove('hidden'); return; }
  errEl.classList.add('hidden');

  try {
    const response = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await parseApiResponse(response);

    if (!response.ok || !data.success) {
      errEl.textContent = resolveApiErrorMessage(response, data, 'Login failed. Please try again.');
      errEl.classList.remove('hidden');
      return;
    }

    loginSuccess(mapBackendUser(data.user));
  } catch (error) {
    errEl.textContent = error && error.name === 'TypeError'
      ? 'Cannot reach backend API. Make sure backend is running on localhost:8080.'
      : 'Unexpected login error. Please try again.';
    errEl.classList.remove('hidden');
  }
}

async function doSignup() {
  const fname = document.getElementById('signup-fname').value.trim();
  const lname = document.getElementById('signup-lname').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass = document.getElementById('signup-pass').value;
  const errEl = document.getElementById('signup-error');
  if (!fname || !lname || !email || !pass) { errEl.textContent='Please fill in all fields.'; errEl.classList.remove('hidden'); return; }
  if (pass.length < 6) { errEl.textContent='Password must be at least 6 characters.'; errEl.classList.remove('hidden'); return; }
  errEl.classList.add('hidden');

  try {
    const response = await fetch(`${API_BASE}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: fname,
        lastName: lname,
        email,
        password: pass
      })
    });
    const data = await parseApiResponse(response);

    if (!response.ok || !data.success) {
      errEl.textContent = resolveApiErrorMessage(response, data, 'Signup failed. Please try again.');
      errEl.classList.remove('hidden');
      return;
    }

    closeModal();
    APP.pendingUser = mapBackendUser(data.user);
    startOnboarding();
  } catch (error) {
    errEl.textContent = error && error.name === 'TypeError'
      ? 'Cannot reach backend API. Make sure backend is running on localhost:8080.'
      : 'Unexpected signup error. Please try again.';
    errEl.classList.remove('hidden');
  }
}

function mapBackendUser(user) {
  if (!user) return { name: 'Member', initials: 'M', email: '', color: 'linear-gradient(135deg,#3b4fd8,#0cbfb0)' };
  return {
    name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Member',
    initials: user.avatarInitials || 'M',
    email: user.email || '',
    color: user.avatarColor || 'linear-gradient(135deg,#3b4fd8,#0cbfb0)'
  };
}

function doSocialLogin(provider = 'google', mode = 'login', buttonEl = null) {
  const selected = SOCIAL_AUTH_PROVIDERS[provider] || SOCIAL_AUTH_PROVIDERS.google;
  const actionText = mode === 'signup' ? 'Creating account with ' : 'Signing in with ';
  const originalLabel = buttonEl ? buttonEl.textContent : '';

  if (buttonEl) {
    buttonEl.disabled = true;
    buttonEl.textContent = 'Connecting...';
  }

  showToast('🔐 ' + actionText + selected.label + '...');

  setTimeout(() => {
    const user = {
      name: selected.name,
      initials: selected.initials,
      email: selected.email,
      color: selected.color
    };
    loginSuccess(user, { silent: true });
    showToast((mode === 'signup' ? '🎉 Account created via ' : '✅ Logged in via ') + selected.label + '!');

    if (buttonEl) {
      buttonEl.disabled = false;
      buttonEl.textContent = originalLabel;
    }
  }, 500);
}

function loginSuccess(user, options = {}) {
  const target = normalizePage(options.target || 'dashboard');
  APP.loggedIn = true;
  APP.user = user;
  saveSession(user);
  closeModal();
  // Update nav
  document.getElementById('nav-guest').classList.add('hidden');
  document.getElementById('nav-logged').classList.remove('hidden');
  document.getElementById('nav-logged').style.display = 'flex';
  document.getElementById('nav-user-av').textContent = user.initials;
  document.getElementById('nav-user-av').style.background = user.color;
  document.getElementById('nav-user-name').textContent = user.name;
  // Show auth-only links
  document.querySelectorAll('.auth-only').forEach(el => el.classList.remove('hidden'));
  // Update dashboard
  document.getElementById('dash-greeting').textContent = 'Welcome back, ' + user.name.split(' ')[0] + '! 👋';
  document.getElementById('dash-name').textContent = user.name;
  document.getElementById('dash-av').textContent = user.initials;
  document.getElementById('dash-av').style.background = user.color;
  if (!options.silent) showToast('🎉 Welcome back, ' + user.name.split(' ')[0] + '!');
  showPage(target);
}

function doLogout() {
  APP.loggedIn = false; APP.user = null;
  clearSession();
  document.getElementById('nav-guest').classList.remove('hidden');
  document.getElementById('nav-logged').classList.add('hidden');
  document.querySelectorAll('.auth-only').forEach(el => el.classList.add('hidden'));
  showToast('👋 Logged out successfully.');
  showPage('home');
}

/* ═══════════════════════════════════
   ONBOARDING
═══════════════════════════════════ */
const ONBOARD_STEPS = [
  { label:'Step 1 of 3', title:'What skills do you offer?', sub:'Select the skills you can teach others. Be specific — this helps find better matches.', type:'pills', options: OFFER_SKILLS, key:'offerSkills' },
  { label:'Step 2 of 3', title:'What do you want to learn?', sub:'Select skills you want to acquire. The system will find you the perfect swap partner.', type:'pills', options: WANT_SKILLS, key:'wantSkills' },
  { label:'Step 3 of 3', title:'Set your availability', sub:'When are you free for sessions? You can change this later.', type:'avail' }
];

function startOnboarding() {
  APP.onboardStep = 1;
  APP.offerSkills = []; APP.wantSkills = [];
  renderOnboardStep();
  document.getElementById('onboard-overlay').classList.remove('hidden');
}

function renderOnboardStep() {
  const step = ONBOARD_STEPS[APP.onboardStep - 1];
  const pct = (APP.onboardStep / 3) * 100;
  document.getElementById('onboard-progress').style.width = pct + '%';
  document.getElementById('onboard-back').style.visibility = APP.onboardStep === 1 ? 'hidden' : 'visible';
  document.getElementById('onboard-next').textContent = APP.onboardStep === 3 ? '🚀 Finish Setup' : 'Continue →';

  let html = `<div class="onboard-step-label">${step.label}</div><div class="onboard-title">${step.title}</div><p class="onboard-sub">${step.sub}</p>`;

  if (step.type === 'pills') {
    const sel = APP[step.key] || [];
    html += `<div class="skill-pill-grid">` + step.options.map(s =>
      `<div class="skill-pill ${sel.includes(s)?'selected':''}" onclick="toggleSkillPill(this,'${s}','${step.key}')">${s}</div>`
    ).join('') + `</div>`;
  } else {
    html += `<div class="skill-pill-grid">
      <div class="skill-pill selected" onclick="this.classList.toggle('selected')">Weekdays</div>
      <div class="skill-pill selected" onclick="this.classList.toggle('selected')">Weekends</div>
      <div class="skill-pill" onclick="this.classList.toggle('selected')">Evenings</div>
      <div class="skill-pill" onclick="this.classList.toggle('selected')">Mornings</div>
    </div>
    <div class="input-group" style="margin-top:16px"><label class="input-label">Your timezone</label><select class="input-field"><option>IST (India Standard Time)</option><option>UTC</option><option>EST</option><option>PST</option></select></div>`;
  }
  document.getElementById('onboard-body').innerHTML = html;
}

function toggleSkillPill(el, skill, key) {
  el.classList.toggle('selected');
  if (!APP[key]) APP[key] = [];
  if (el.classList.contains('selected')) APP[key].push(skill);
  else APP[key] = APP[key].filter(s => s !== skill);
}

function onboardNext() {
  if (APP.onboardStep < 3) { APP.onboardStep++; renderOnboardStep(); }
  else {
    document.getElementById('onboard-overlay').classList.add('hidden');
    loginSuccess(APP.pendingUser);
    showToast('🎉 Profile setup complete! Welcome to SkillSwap!');
  }
}
function onboardBack() { if (APP.onboardStep > 1) { APP.onboardStep--; renderOnboardStep(); } }

/* ═══════════════════════════════════
   MESSAGING
═══════════════════════════════════ */
function sendMessage(e) {
  if (e.key !== 'Enter') return;
  const input = document.getElementById('ci');
  const text = input.value.trim();
  if (!text) return;
  const scroll = document.getElementById('messages-scroll');
  const initials = APP.user ? APP.user.initials : 'ME';
  const color = APP.user ? APP.user.color : 'var(--indigo)';
  const group = document.createElement('div');
  group.className = 'msg-group mine';
  group.innerHTML = `
    <div class="avatar avatar-sm msg-av" style="background:${color}">${initials}</div>
    <div class="msg-bubbles">
      <div class="msg-bubble-item">${text.replace(/</g,'&lt;')}</div>
      <div class="msg-time">Just now · ✓</div>
    </div>`;
  scroll.appendChild(group);
  input.value = '';
  scroll.scrollTop = scroll.scrollHeight;
  // Simulate reply after 1.5s
  setTimeout(() => {
    const contactName = document.getElementById('chat-contact-name').innerText;
    const contactAv = document.getElementById('chat-contact-av');
    const reply = document.createElement('div');
    reply.className = 'msg-group';
    reply.innerHTML = `
      <div class="avatar avatar-sm msg-av" style="background:${contactAv.style.background}">${contactAv.textContent}</div>
      <div class="msg-bubbles">
        <div class="msg-bubble-item">Got it! 👍 I'll make sure to prepare accordingly for our session.</div>
        <div class="msg-time">Just now</div>
      </div>`;
    scroll.appendChild(reply);
    scroll.scrollTop = scroll.scrollHeight;
  }, 1500);
}

function selectContact(el, name, sessionTitle, color, initials) {
  document.querySelectorAll('.contact-row').forEach(r => r.classList.remove('active'));
  el.classList.add('active');
  // Update chat header
  const chatAv = document.getElementById('chat-contact-av');
  chatAv.style.background = color;
  chatAv.textContent = initials;
  document.getElementById('chat-contact-name').textContent = name;
  document.getElementById('chat-session-title').textContent = sessionTitle;
  // Update message avatars
  document.querySelectorAll('#messages-scroll .msg-group:not(.mine) .msg-av').forEach(av => { av.style.background = color; av.textContent = initials; });
  // Update profile panel
  document.getElementById('pp-av').style.background = color;
  document.getElementById('pp-av').textContent = initials;
  document.getElementById('pp-name').textContent = name;
  document.getElementById('pp-title').textContent = 'Verified Member';
  // Update chat-msg-av if exists
  const cma = document.getElementById('chat-msg-av');
  if (cma) { cma.style.background = color; cma.textContent = initials; }
  // Remove unread badges
  el.querySelectorAll('.unread-badge').forEach(b => b.remove());
}

function acceptSwap(btn) {
  btn.closest('.swap-proposal').innerHTML = '<div style="color:var(--green);font-weight:600;font-size:14px;padding:6px 0">✅ Swap Accepted! You can now schedule your sessions.</div>';
  showToast('🤝 Swap accepted! You can now schedule sessions in Live Classes.');
}

/* ═══════════════════════════════════
   LIVE CLASSES / CALENDAR
═══════════════════════════════════ */
function initCalendar() {
  const today = new Date();
  const grid = document.getElementById('cal-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();
  for (let i=0; i<firstDay; i++) { const d = document.createElement('div'); d.className='cal-day empty'; grid.appendChild(d); }
  for (let d=1; d<=daysInMonth; d++) {
    const el = document.createElement('div');
    const isPast = d < today.getDate();
    const isToday = d === today.getDate();
    el.className = 'cal-day' + (isPast?' past':'') + (isToday?' today':'');
    el.textContent = d;
    if (!isPast) {
      el.onclick = function() {
        document.querySelectorAll('.cal-day').forEach(x => x.classList.remove('selected'));
        this.classList.add('selected');
        APP.selectedDate = d;
      };
    }
    if ([4,8,15].includes(d)) el.classList.add('has-event');
    grid.appendChild(el);
  }
}

function selectTime(el) {
  document.querySelectorAll('.time-slot').forEach(t => t.classList.remove('selected'));
  el.classList.add('selected');
  APP.selectedTime = el.textContent;
}

function searchPartner(val) {
  const res = document.getElementById('partner-results');
  if (!val || val.length < 2) { res.innerHTML=''; return; }
  const matches = ALL_PARTNERS.filter(p => p.name.toLowerCase().includes(val.toLowerCase()));
  res.innerHTML = matches.map(p => `
    <div class="partner-search-result ${APP.selectedPartner===p.name?'selected':''}" onclick="selectPartner(this,'${p.name}')">
      <div class="avatar avatar-sm" style="background:${p.color}">${p.initials}</div>
      <div class="psf-info"><div class="psf-name">${p.name}</div><div class="psf-skills">${p.skills}</div></div>
      <span class="psf-compat">${p.compat}</span>
    </div>`).join('');
}

function selectPartner(el, name) {
  document.querySelectorAll('.partner-search-result').forEach(r => r.classList.remove('selected'));
  el.classList.add('selected');
  APP.selectedPartner = name;
  document.getElementById('sched-partner-search').value = name;
  document.getElementById('partner-results').innerHTML = '';
}

function scheduleSession() {
  const topic = document.getElementById('sched-topic').value.trim();
  if (!topic) { showToast('⚠️ Please enter a session topic.'); return; }
  if (!APP.selectedPartner) { showToast('⚠️ Please select a swap partner.'); return; }
  if (!APP.selectedDate) { showToast('⚠️ Please select a date on the calendar.'); return; }
  if (!APP.selectedTime) { showToast('⚠️ Please select a time slot.'); return; }

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const today = new Date();
  const dateStr = months[today.getMonth()] + ' ' + APP.selectedDate;
  const partner = ALL_PARTNERS.find(p => p.name === APP.selectedPartner);
  const duration = document.getElementById('sched-duration').value;

  const list = document.getElementById('upcoming-sessions-list');
  const card = document.createElement('div');
  card.className = 'class-card';
  card.innerHTML = `
    <div class="class-card-header">
      <div><div class="class-title">${topic}</div><span class="badge badge-amber">Pending Confirm</span></div>
    </div>
    <div class="class-participants">
      <div class="avatar avatar-sm" style="background:${partner.color}">${partner.initials}</div>
      <div style="font-size:13px;color:var(--text-secondary);margin-left:8px">with <strong>${partner.name}</strong></div>
    </div>
    <div class="class-meta-row"><span class="class-meta-item">📅 ${dateStr}</span><span class="class-meta-item">⏰ ${APP.selectedTime}</span><span class="class-meta-item">⏱ ${duration}</span><span class="class-meta-item">📹 Video</span></div>
    <div class="class-actions"><button class="join-live-btn upcoming" onclick="openVcall('${partner.name}','${topic}')">📹 Join Call</button><button class="class-cancel-btn" onclick="cancelSession(this)">✕ Cancel</button></div>`;
  list.prepend(card);

  const badge = document.getElementById('session-count-badge');
  badge.textContent = list.children.length + ' sessions';

  showToast(`📅 Session scheduled with ${partner.name} on ${dateStr} at ${APP.selectedTime}!`);

  // Reset form
  document.getElementById('sched-topic').value = '';
  document.getElementById('sched-partner-search').value = '';
  document.getElementById('partner-results').innerHTML = '';
  document.querySelectorAll('.cal-day').forEach(d => d.classList.remove('selected'));
  document.querySelectorAll('.time-slot').forEach(t => t.classList.remove('selected'));
  APP.selectedDate = null; APP.selectedTime = null; APP.selectedPartner = null;
}

function cancelSession(btn) {
  if (confirm('Cancel this session?')) {
    btn.closest('.class-card').remove();
    const list = document.getElementById('upcoming-sessions-list');
    document.getElementById('session-count-badge').textContent = list.children.length + ' sessions';
    showToast('✅ Session cancelled. Your partner has been notified.');
  }
}

/* ═══════════════════════════════════
   VIDEO CALL
═══════════════════════════════════ */
function openVcall(name, sessionTitle) {
  const manager = window.skillSwapVideoCall;
  if (!manager || typeof manager.openCall !== 'function') {
    showToast('⚠️ Video call module is not loaded.');
    return;
  }
  const userName = APP.user ? APP.user.name : 'You';
  manager.openCall(name, sessionTitle || 'Skill Session', userName);
}

function closeVcall(e) { if (e.target === document.getElementById('vcall-overlay')) endVcall(); }
function endVcall() {
  const manager = window.skillSwapVideoCall;
  if (manager && typeof manager.endCall === 'function') {
    manager.endCall(true);
    return;
  }
  showToast('📵 Call ended.');
}

function toggleVcallMic(btn) {
  const manager = window.skillSwapVideoCall;
  if (manager && typeof manager.toggleMic === 'function') manager.toggleMic(btn);
}

function toggleVcallCam(btn) {
  const manager = window.skillSwapVideoCall;
  if (manager && typeof manager.toggleCamera === 'function') manager.toggleCamera(btn);
}

function toggleVcallScreenShare() {
  const manager = window.skillSwapVideoCall;
  if (manager && typeof manager.toggleScreenShare === 'function') manager.toggleScreenShare();
}

function toggleVcallParticipants() {
  const manager = window.skillSwapVideoCall;
  if (manager && typeof manager.toggleParticipants === 'function') manager.toggleParticipants();
}

function toggleVcallBtn(btn, on, off) {
  if (btn && btn.id === 'vcall-mic') { toggleVcallMic(btn); return; }
  if (btn && btn.id === 'vcall-cam') { toggleVcallCam(btn); return; }
  btn.textContent = btn.textContent === on ? off : on;
}





/* ═══════════════════════════════════
   MISC UI
═══════════════════════════════════ */
function showToast(msg, duration=3500) {
  const t = document.getElementById('toast');
  const icons = { '🎉':'🎉','✅':'✅','❌':'❌','⚠️':'⚠️','🔒':'🔒','📅':'📅','📵':'📵','✉️':'✉️','🤝':'🤝','👋':'👋','💬':'💬','📞':'📞','🖥️':'🖥️','📋':'📋','📎':'📎','🔔':'🔔','👤':'👤' };
  const first = msg.match(/[\u{1F300}-\u{1FFFF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/u);
  document.getElementById('toast-icon').textContent = first ? first[0] : '💬';
  document.getElementById('toast-msg').textContent = msg.replace(/^[\u{1F300}-\u{1FFFF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]\s*/u,'');
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), duration);
}

function highlightDash(el) {
  document.querySelectorAll('.dash-link').forEach(l => l.classList.remove('active'));
  el.classList.add('active');
}

function acceptRequest(btn) {
  const item = btn.closest('.req-item');
  const name = item.querySelector('.req-name').textContent;
  item.remove();
  const badge = document.querySelector('.dash-badge');
  if (badge) {
    const n = parseInt(badge.textContent) - 1;
    badge.textContent = n;
    if (n === 0) badge.classList.add('hidden');
  }
  showToast(`🤝 Swap accepted with ${name}! Say hi in Messages.`);
}

function pg_click(el) {
  document.querySelectorAll('.pg').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

/* ═══════════════════════════════════
   INIT
═══════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initCalendar();
  discoverSearch(); // render all skill cards on load
  const handoffAuthRaw = localStorage.getItem(HANDOFF_KEY);
  const savedSessionRaw = localStorage.getItem(SESSION_KEY);
  const initialRoute = getHashRoute();
  if (handoffAuthRaw) {
    try {
      const user = JSON.parse(handoffAuthRaw);
      const savedTarget = localStorage.getItem(TARGET_KEY) || initialRoute || 'dashboard';
      localStorage.removeItem(HANDOFF_KEY);
      localStorage.removeItem(TARGET_KEY);
      loginSuccess(user, { target: savedTarget, silent: true });
      showToast('🎉 Welcome back, ' + user.name.split(' ')[0] + '!');
    } catch (err) {
      clearSession();
    }
  } else if (savedSessionRaw) {
    try {
      const user = JSON.parse(savedSessionRaw);
      if (user && user.name && user.initials) {
        loginSuccess(user, { target: initialRoute === 'community' ? 'home' : initialRoute, silent: true });
        if (initialRoute === 'community') openCommunity();
      }
    } catch (err) {
      clearSession();
    }
  } else if (initialRoute === 'community') {
    openCommunity();
  } else if (initialRoute !== 'home') {
    showPage(initialRoute);
  }
  document.querySelectorAll('.pg:not(.pg)').forEach(b => b.addEventListener('click', function(){ pg_click(this); }));
  document.querySelectorAll('.pg').forEach(b => b.addEventListener('click', function(){ if(!this.textContent.includes('›')&&!this.textContent.includes('‹')) pg_click(this); }));
  document.querySelectorAll('.ctab').forEach(t => t.addEventListener('click', function(){ document.querySelectorAll('.ctab').forEach(x=>x.classList.remove('active')); this.classList.add('active'); }));
  document.querySelectorAll('.modal-tab[id^=tab]').forEach(t => {});
});

/* ═══════════════════════════════════
   SKILLS DATA (for Discover page)
═══════════════════════════════════ */
const ALL_SKILLS = [
  { title:'Frontend React', icon:'⚛️', color:'rgba(99,102,241,0.1)', mentors:124, rating:4.9, reviews:340, demand:'High', demandClass:'d-high', demandFill:'d-fill-high', level:'Intermediate', availability:['Weekdays','Evenings'], format:'Remote', verified:true, category:'Development', tags:['react','frontend','web dev','javascript'] },
  { title:'Python Backend', icon:'🐍', color:'rgba(12,191,176,0.1)', mentors:95, rating:4.5, reviews:120, demand:'Medium', demandClass:'d-med', demandFill:'d-fill-med', level:'Beginner', availability:['Weekdays','Weekends'], format:'Remote', verified:true, category:'Development', tags:['python','backend','django','flask'] },
  { title:'UI/UX Design', icon:'🎨', color:'rgba(246,166,35,0.1)', mentors:66, rating:4.2, reviews:920, demand:'Very High', demandClass:'d-vhigh', demandFill:'d-fill-vhigh', level:'Beginner', availability:['Weekends','Evenings'], format:'Remote', verified:true, category:'Design', tags:['ui','ux','design','figma','prototyping'] },
  { title:'JavaScript Basics', icon:'🟡', color:'rgba(234,179,8,0.1)', mentors:110, rating:4.7, reviews:512, demand:'High', demandClass:'d-high', demandFill:'d-fill-high', level:'Beginner', availability:['Weekdays','Weekends','Evenings'], format:'Remote', verified:true, category:'Development', tags:['javascript','js','web','basics'] },
  { title:'SQL & Databases', icon:'🗄️', color:'rgba(6,182,212,0.1)', mentors:65, rating:4.5, reviews:120, demand:'Medium', demandClass:'d-med', demandFill:'d-fill-med', level:'Intermediate', availability:['Weekdays'], format:'Remote', verified:true, category:'Development', tags:['sql','database','mysql','postgresql'] },
  { title:'Mobile App Dev', icon:'📱', color:'rgba(16,185,129,0.1)', mentors:56, rating:4.2, reviews:120, demand:'High', demandClass:'d-high', demandFill:'d-fill-high', level:'Advanced', availability:['Weekends','Evenings'], format:'Remote', verified:true, category:'Development', tags:['mobile','android','ios','flutter','react native'] },
  { title:'Java Programming', icon:'☕', color:'rgba(234,88,12,0.1)', mentors:88, rating:4.6, reviews:280, demand:'High', demandClass:'d-high', demandFill:'d-fill-high', level:'Intermediate', availability:['Weekdays','Weekends'], format:'Remote', verified:true, category:'Development', tags:['java','oop','spring','backend','programming'] },
  { title:'Data Science', icon:'📊', color:'rgba(139,92,246,0.1)', mentors:72, rating:4.8, reviews:410, demand:'Very High', demandClass:'d-vhigh', demandFill:'d-fill-vhigh', level:'Advanced', availability:['Weekdays','Evenings'], format:'Remote', verified:true, category:'Data', tags:['data science','machine learning','ai','python','pandas'] },
  { title:'Digital Marketing', icon:'📣', color:'rgba(239,68,68,0.1)', mentors:43, rating:4.3, reviews:180, demand:'High', demandClass:'d-high', demandFill:'d-fill-high', level:'Beginner', availability:['Weekends'], format:'Any', verified:false, category:'Marketing', tags:['marketing','seo','social media','digital'] },
  { title:'Spanish Language', icon:'🇪🇸', color:'rgba(245,158,11,0.1)', mentors:39, rating:4.7, reviews:230, demand:'Medium', demandClass:'d-med', demandFill:'d-fill-med', level:'Beginner', availability:['Weekdays','Weekends','Evenings'], format:'Remote', verified:true, category:'Languages', tags:['spanish','language','speaking'] },
  { title:'Photography', icon:'📷', color:'rgba(244,114,182,0.1)', mentors:28, rating:4.4, reviews:95, demand:'Medium', demandClass:'d-med', demandFill:'d-fill-med', level:'Beginner', availability:['Weekends'], format:'In-Person', verified:false, category:'Photography', tags:['photography','camera','editing','lightroom'] },
  { title:'Music Production', icon:'🎵', color:'rgba(16,185,129,0.1)', mentors:22, rating:4.6, reviews:140, demand:'Low', demandClass:'d-low', demandFill:'d-fill-low', level:'Intermediate', availability:['Weekends','Evenings'], format:'Remote', verified:true, category:'Music', tags:['music','production','beats','daw','ableton'] },
  { title:'DevOps & Cloud', icon:'☁️', color:'rgba(14,165,233,0.1)', mentors:51, rating:4.8, reviews:195, demand:'Very High', demandClass:'d-vhigh', demandFill:'d-fill-vhigh', level:'Expert', availability:['Weekdays'], format:'Remote', verified:true, category:'Development', tags:['devops','cloud','aws','docker','kubernetes'] },
  { title:'Graphic Design', icon:'✏️', color:'rgba(168,85,247,0.1)', mentors:60, rating:4.5, reviews:310, demand:'High', demandClass:'d-high', demandFill:'d-fill-high', level:'Beginner', availability:['Weekdays','Weekends'], format:'Remote', verified:true, category:'Design', tags:['graphic design','illustrator','photoshop','adobe'] },
  { title:'Machine Learning', icon:'🤖', color:'rgba(99,102,241,0.1)', mentors:45, rating:4.9, reviews:260, demand:'Very High', demandClass:'d-vhigh', demandFill:'d-fill-vhigh', level:'Expert', availability:['Weekdays','Evenings'], format:'Remote', verified:true, category:'Data', tags:['machine learning','ml','ai','tensorflow','deep learning'] },
  { title:'French Language', icon:'🇫🇷', color:'rgba(59,130,246,0.1)', mentors:31, rating:4.5, reviews:110, demand:'Medium', demandClass:'d-med', demandFill:'d-fill-med', level:'Beginner', availability:['Weekends','Evenings'], format:'Remote', verified:false, category:'Languages', tags:['french','language','grammar'] },
  { title:'Video Editing', icon:'🎬', color:'rgba(234,179,8,0.1)', mentors:37, rating:4.4, reviews:155, demand:'High', demandClass:'d-high', demandFill:'d-fill-high', level:'Intermediate', availability:['Weekends'], format:'Remote', verified:true, category:'Design', tags:['video','editing','premiere','final cut','youtube'] },
  { title:'Node.js & Express', icon:'🟢', color:'rgba(34,197,94,0.1)', mentors:68, rating:4.6, reviews:200, demand:'High', demandClass:'d-high', demandFill:'d-fill-high', level:'Intermediate', availability:['Weekdays','Weekends'], format:'Remote', verified:true, category:'Development', tags:['nodejs','express','javascript','backend','api'] },
  { title:'Excel & Spreadsheets', icon:'📗', color:'rgba(22,163,74,0.1)', mentors:82, rating:4.3, reviews:450, demand:'Medium', demandClass:'d-med', demandFill:'d-fill-med', level:'Beginner', availability:['Weekdays'], format:'Remote', verified:false, category:'Business', tags:['excel','spreadsheet','data','microsoft'] },
  { title:'Public Speaking', icon:'🎤', color:'rgba(239,68,68,0.1)', mentors:25, rating:4.7, reviews:175, demand:'Medium', demandClass:'d-med', demandFill:'d-fill-med', level:'Beginner', availability:['Weekdays','Weekends'], format:'In-Person', verified:true, category:'Business', tags:['public speaking','presentation','communication'] },
  { title:'Figma & Prototyping', icon:'🖌️', color:'rgba(236,72,153,0.1)', mentors:54, rating:4.8, reviews:290, demand:'Very High', demandClass:'d-vhigh', demandFill:'d-fill-vhigh', level:'Intermediate', availability:['Weekdays','Evenings'], format:'Remote', verified:true, category:'Design', tags:['figma','design','ui','prototype','wireframe'] },
  { title:'C++ Programming', icon:'⚙️', color:'rgba(107,114,128,0.1)', mentors:41, rating:4.4, reviews:130, demand:'Medium', demandClass:'d-med', demandFill:'d-fill-med', level:'Advanced', availability:['Weekdays'], format:'Remote', verified:true, category:'Development', tags:['c++','programming','dsa','competitive'] },
  { title:'Content Writing', icon:'✍️', color:'rgba(217,119,6,0.1)', mentors:33, rating:4.2, reviews:215, demand:'Medium', demandClass:'d-med', demandFill:'d-fill-med', level:'Beginner', availability:['Weekdays','Weekends','Evenings'], format:'Remote', verified:false, category:'Marketing', tags:['writing','content','blog','copywriting','seo'] },
  { title:'Flutter & Dart', icon:'🐦', color:'rgba(6,182,212,0.1)', mentors:48, rating:4.5, reviews:160, demand:'High', demandClass:'d-high', demandFill:'d-fill-high', level:'Intermediate', availability:['Weekends','Evenings'], format:'Remote', verified:true, category:'Development', tags:['flutter','dart','mobile','android','ios'] },
];

const AVATAR_COLORS = ['#6366f1','#0cbfb0','#f59e0b','#ef4444','#8b5cf6','#10b981','#0891b2','#d97706','#dc2626','#7c3aed'];

function renderSkillCard(skill) {
  const avs = AVATAR_COLORS.slice(0,3).map((c,i) => `<div class="mini-av" style="background:${c}">${String.fromCharCode(65+i)}</div>`).join('');
  return `
    <div class="skill-card" 
         data-title="${skill.title.toLowerCase()}" 
         data-tags="${skill.tags.join(',')}" 
         data-level="${skill.level.toLowerCase()}" 
         data-format="${skill.format.toLowerCase()}" 
         data-verified="${skill.verified}" 
         data-availability="${skill.availability.join(',').toLowerCase()}"
         data-mentors="${skill.mentors}"
         data-rating="${skill.rating}">
      <div class="skill-card-verified">
        ${skill.verified ? '<span class="badge badge-green">✓ Verified</span>' : '<span class="badge" style="background:#f3f4f6;color:#6b7280">Unverified</span>'}
      </div>
      <div class="skill-icon-wrap" style="background:${skill.color}">${skill.icon}</div>
      <div class="skill-card-title">${skill.title}</div>
      <div class="skill-card-meta"><span>👥 ${skill.mentors} Mentors</span><span>⭐ ${skill.rating} (${skill.reviews})</span></div>
      <div class="demand-row">
        <div class="demand-label-row">
          <span style="color:var(--text-muted);font-size:11px">Trending Demand</span>
          <span class="demand-level-text ${skill.demandClass} text-sm">${skill.demand}</span>
        </div>
        <div class="demand-track"><div class="demand-fill ${skill.demandFill}"></div></div>
      </div>
      <div class="skill-card-footer">
        <div class="mini-avatars">${avs}<div class="mini-av" style="background:#ef4444;font-size:8px">+${skill.mentors - 3}</div></div>
        <button class="view-btn" onclick="requireAuth(()=>viewSkillDetail('${skill.title}'))">View →</button>
      </div>
    </div>`;
}

function discoverSearch() {
  const query = (document.getElementById('discover-search-input')?.value || '').toLowerCase().trim();
  const verifiedOnly = document.getElementById('f-verified')?.checked;
  const levels = {
    beginner: document.getElementById('f-beginner')?.checked,
    intermediate: document.getElementById('f-intermediate')?.checked,
    advanced: document.getElementById('f-advanced')?.checked,
    expert: document.getElementById('f-expert')?.checked,
  };
  const avail = {
    weekdays: document.getElementById('f-weekdays')?.checked,
    weekends: document.getElementById('f-weekends')?.checked,
    evenings: document.getElementById('f-evenings')?.checked,
  };
  const fmtEl = document.querySelector('input[name="fmt"]:checked');
  const fmt = fmtEl ? fmtEl.value : 'any';
  const sort = document.getElementById('discover-sort')?.value || 'rated';

  let results = ALL_SKILLS.filter(skill => {
    // Text search
    if (query) {
      const inTitle = skill.title.toLowerCase().includes(query);
      const inTags = skill.tags.some(t => t.includes(query));
      if (!inTitle && !inTags) return false;
    }
    // Verified filter
    if (verifiedOnly && !skill.verified) return false;
    // Level filter
    const lvl = skill.level.toLowerCase();
    if (!levels[lvl]) return false;
    // Format filter
    if (fmt !== 'any' && fmt !== '') {
      if (fmt === 'remote' && skill.format !== 'Remote') return false;
      if (fmt === 'inperson' && skill.format !== 'In-Person') return false;
    }
    // Availability filter (show if ANY selected availability matches)
    const anyAvailChecked = avail.weekdays || avail.weekends || avail.evenings;
    if (anyAvailChecked) {
      const skillAvailLower = skill.availability.map(a => a.toLowerCase());
      const match = (avail.weekdays && skillAvailLower.includes('weekdays')) ||
                    (avail.weekends && skillAvailLower.includes('weekends')) ||
                    (avail.evenings && skillAvailLower.includes('evenings'));
      if (!match) return false;
    }
    return true;
  });

  // Sort
  if (sort === 'rated') results.sort((a,b) => b.rating - a.rating);
  else if (sort === 'popular') results.sort((a,b) => b.mentors - a.mentors);
  else if (sort === 'newest') results.sort((a,b) => b.reviews - a.reviews);

  const grid = document.getElementById('skill-cards-grid');
  const noResults = document.getElementById('no-results');
  const countEl = document.getElementById('results-count');

  if (!grid) return;

  if (results.length === 0) {
    grid.innerHTML = '';
    noResults.classList.remove('hidden');
  } else {
    noResults.classList.add('hidden');
    grid.innerHTML = results.map(renderSkillCard).join('');
  }

  const label = query ? `"${query}"` : 'All Skills';
  if (countEl) countEl.innerHTML = `Showing <strong>${results.length} results</strong> for ${label}`;
}

function clearDiscoverFilters() {
  const inp = document.getElementById('discover-search-input');
  if (inp) inp.value = '';
  ['f-beginner','f-intermediate','f-advanced','f-expert','f-weekdays','f-weekends','f-evenings','f-verified'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = true;
  });
  const anyRadio = document.getElementById('f-any');
  const remoteRadio = document.getElementById('f-remote');
  if (remoteRadio) remoteRadio.checked = true;
  discoverSearch();
}

function heroSearch() {
  const val = document.getElementById('hero-search-input')?.value?.trim() || '';
  showPage('discover');
  setTimeout(() => {
    const discInput = document.getElementById('discover-search-input');
    if (discInput && val) { discInput.value = val; discoverSearch(); }
    else discoverSearch();
  }, 50);
}

function heroSearchQuery(query) {
  showPage('discover');
  setTimeout(() => {
    const discInput = document.getElementById('discover-search-input');
    if (discInput) { discInput.value = query; discoverSearch(); }
  }, 50);
}

function viewSkillDetail(title) {
  showToast(`📚 Skill profile for "${title}" — opening soon!`);
}
