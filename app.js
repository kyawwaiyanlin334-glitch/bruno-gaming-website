/* ============================================================
       ⚠️ SECURITY WARNING (အရေးကြီး)
       ------------------------------------------------------------
       TELEGRAM_BOT_TOKEN နှင့် SERVERCHAN_SENDKEY ကို 
       client-side မှာ ပွင့်လင်းမြင်သာအောင် ထည့်ထားသည်။
       ဘယ်သူမဆို ဒီ HTML ကို ကြည့်ပြီး Token ယူသုံးနိုင်သည်။
       
       အကြံပြုချက်:
       - နောက်ပိုင်း Cloudflare Workers / Vercel Function သုံးပြီး 
         Token ကို server-side မှာ ဖုံးအုပ်ထားပါ။
       - အခုအချိန်မှာ Bot ကို privacy mode ဖွင့်ထားပါ။
       ============================================================ */

    /* Safe storage — Google Sites sandbox may block localStorage */
    const _memStore = {};
    function safeGet(key, fallback) {
        try {
            if (typeof localStorage !== 'undefined') {
                const v = localStorage.getItem(key);
                return v === null || v === undefined ? fallback : v;
            }
        } catch (e) {}
        return _memStore.hasOwnProperty(key) ? _memStore[key] : fallback;
    }
    function safeSet(key, val) {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(key, val);
                return true;
            }
        } catch (e) {}
        _memStore[key] = val;
        return false;
    }
    function safeRemove(key) {
        try {
            if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
        } catch (e) {}
        delete _memStore[key];
    }
    function safeBind(id, event, fn) {
        try {
            const el = document.getElementById(id);
            if (el) el.addEventListener(event, fn);
            else console.warn('missing element', id);
        } catch (e) { console.warn('bind fail', id, e); }
    }
    function safeQS(sel, event, fn) {
        try {
            document.querySelectorAll(sel).forEach(el => el.addEventListener(event, fn));
        } catch (e) { console.warn('qs bind fail', sel, e); }
    }
    window.addEventListener('error', function(ev) {
        try { console.error('Global error', ev.message, ev.filename, ev.lineno); } catch(e) {}
    });
    console.log('Bruno Gaming script loaded');
    window.addEventListener('unhandledrejection', function(ev) {
        try { console.error('Unhandled rejection', ev.reason); } catch(e) {}
    });

        const TELEGRAM_BOT_TOKEN = "8943039738:AAEh-O7jMIhAXFUJ8coeNgzXgtLn2vbFXjA";
    const TELEGRAM_CHAT_ID = "7395026933";
    const SERVERCHAN_SENDKEY = "SCT367189TzSEPAQ3JQRe0LqCCELAed07D";

    // ========== AI (LinkBus + Gemini) ==========
    // ⚠️ ဒီ key လည်း client-side မှာ ပွင့်နေပါတယ်
    const AI_API_URL = "https://www.linkbus.net/v1/chat/completions";
    // Chat key (codex group) + Vision key (Gemini group)
    // SuperGrok = smart chat | Gemini = slip vision + fallback chat
    const AI_CHAT_KEY = "sk-e8rJzWVhhniSMScRAz46gYKk0WZb48Zc8o6SxpIPga0pyyUe";
    const AI_CHAT_MODEL = "grok-4.5";
    const AI_VISION_KEY = "sk-y21u9RBer7s84L4Ke0ye8SQBI3Q2YxRHn2YOlSziXA77TZUA";
    const AI_VISION_MODEL = "gemini-2.5-flash";
    const AI_API_KEY = AI_CHAT_KEY;
    const AI_MODEL = AI_CHAT_MODEL;

    // ========== Firebase Realtime Database ==========
    const firebaseConfig = {
      apiKey: "AIzaSyAo1jFvL_tLE2bTs_SfKxKvnp_RlNsPoIA",
      authDomain: "bruno-b72e5.firebaseapp.com",
      databaseURL: "https://bruno-b72e5-default-rtdb.firebaseio.com",
      projectId: "bruno-b72e5",
      storageBucket: "bruno-b72e5.firebasestorage.app",
      messagingSenderId: "255708324200",
      appId: "1:255708324200:web:cd3b5b2916d8a2727576dd",
      measurementId: "G-C7QW64D33T"
    };
    let fbDb = null;
    let fbChatRef = null;
    try {
      if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        fbDb = firebase.database();
        fbChatRef = fbDb.ref('chats/live');
        console.log('Firebase OK');
      } else {
        console.warn('Firebase SDK not loaded');
      }
    } catch (e) {
      console.error('Firebase init error', e);
      fbDb = null; fbChatRef = null;
    }

    let guestContact = safeGet('bg_guest_contact', '');
    let guestName = safeGet('bg_guest_name', '');
    let guestPlatform = safeGet('bg_guest_platform', '');

    function getGuestProfile() {
      return {
        name: guestName || '',
        contact: guestContact || '',
        platform: guestPlatform || ''
      };
    }

    function saveCustomerToFirebase(profile) {
      if (!fbDb) return;
      const key = (profile.contact || 'unknown').replace(/[.#$\[\]]/g, '_');
      fbDb.ref('customers/' + key).set({
        name: profile.name,
        contact: profile.contact,
        platform: profile.platform,
        lastSeen: Date.now(),
        lastSeenStr: new Date().toLocaleString('en-GB', { timeZone: 'Asia/Yangon' })
      }).catch(e => console.error('customer save', e));
    }

    function fbPushMessage(role, text) {
      if (!fbChatRef) return;
      const p = getGuestProfile();
      fbChatRef.push({
        role: role,
        text: text,
        name: p.name,
        contact: p.contact,
        platform: p.platform,
        time: Date.now(),
        timeStr: new Date().toLocaleString('en-GB', { timeZone: 'Asia/Yangon' })
      }).catch(e => console.error('fb push', e));
    }

    function ensureGuestLogin() {
      // Login gate removed — chat is open for everyone
      guestContact = safeGet('bg_guest_contact', '') || guestContact || '';
      guestName = safeGet('bg_guest_name', '') || guestName || 'Guest';
      guestPlatform = safeGet('bg_guest_platform', '') || guestPlatform || '';
      const st = document.getElementById('ai-chat-status');
      if (st && guestContact) st.innerText = (guestName || 'Customer') + ' · Online';
      else if (st) st.innerText = 'Professional AI · Online';
    }

    function completeGateLogin() { /* login removed */ }

    // ========== ADMIN LOGIN (ဒီနေရာမှာ ပြောင်းပါ) ==========
    const ADMIN_EMAIL = "kyawwaiyanlin334@gmail.com";
    const ADMIN_PASS  = "Bruno@2026";   // ← Password ပြောင်းချင်ရင် ဒီမှာ ပြင်ပါ

    const PAYMENT_METHODS = [
        { id: "wavepay", name: "WavePay", icon: "fa-mobile-screen", number: "09 420749991", holder: "Kyaw Waiyan Linn" },
        { id: "kbzpay", name: "KBZ Pay", icon: "fa-wallet", number: "09 965302618", holder: "Win Ko Ko Aung" },
        { id: "ayapay", name: "AYA Pay", icon: "fa-wallet", number: "09 965302618", holder: "Win Ko Ko Aung" },
        { id: "ayabank", name: "AYA Bank", icon: "fa-building-columns", number: "20021667008", holder: "Win Ko Ko Aung" },
        { id: "kbzbank", name: "KBZ Bank", icon: "fa-building-columns", number: "27730127700513901", holder: "Win Ko Ko Aung" },
        { id: "cbpay", name: "CB Pay", icon: "fa-wallet", number: "09 965302618", holder: "Win Ko Ko Aung" }
    ];

    const PACKAGES = {
        ios: {
            promo: [
                { id: "p1", price: 34000, label: "260+840 - 34,000 MMK" },
                { id: "p3", price: 46000, label: "1630 - 46,000 MMK" },
                { id: "p4", price: 77000, label: "260+840+1630 - 77,000 MMK" }
            ],
            std: [
                { id: "s1", price: 16000, label: "300 Coins - 16,000 MMK" },
                { id: "s2", price: 23000, label: "550 Coins - 23,000 MMK" },
                { id: "s3", price: 30000, label: "750 Coins - 30,000 MMK" },
                { id: "s4", price: 45000, label: "1040 Coins - 45,000 MMK" },
                { id: "s5", price: 84000, label: "2130 Coins - 84,000 MMK" },
                { id: "s6", price: 120000, label: "3250 Coins - 120,000 MMK" },
                { id: "s7", price: 190000, label: "5700 Coins - 190,000 MMK" },
                { id: "s8", price: 370000, label: "12800 Coins - 370,000 MMK" }
            ]
        },
        android: {
            promo: [
                { id: "p5", price: 34000, label: "260+840 - 34,000 MMK" },
                { id: "p6", price: 46000, label: "1630 - 46,000 MMK" },
                { id: "p7", price: 77000, label: "260+840+1630 - 77,000 MMK" }
            ],
            std: [
                { id: "s9", price: 17000, label: "300 Coins - 17,000 MMK" },
                { id: "s10", price: 27000, label: "550 Coins - 27,000 MMK" },
                { id: "s11", price: 33000, label: "750 Coins - 33,000 MMK" },
                { id: "s12", price: 44000, label: "1040 Coins - 44,000 MMK" },
                { id: "s13", price: 80000, label: "2130 Coins - 80,000 MMK" },
                { id: "s14", price: 116000, label: "3250 Coins - 116,000 MMK" },
                { id: "s15", price: 195000, label: "5700 Coins - 195,000 MMK" },
                { id: "s16", price: 388000, label: "12800 Coins - 388,000 MMK" }
            ]
        },
        japan: {
            promo: [
                { id: "jp1", price: 34000, label: "260+840 - 34,000 MMK" },
                { id: "jp2", price: 46000, label: "1630 - 46,000 MMK" },
                { id: "jp3", price: 77000, label: "260+840+1630 - 77,000 MMK" },
                { id: "jp4", price: 70000, label: "2700 - 70,000 MMK" }
            ],
            std: [
                { id: "js1", price: 17000, label: "315 Coins - 17,000 MMK" },
                { id: "js2", price: 27000, label: "578 Coins - 27,000 MMK" },
                { id: "js3", price: 35000, label: "788 Coins - 35,000 MMK" },
                { id: "js4", price: 46000, label: "1092 Coins - 46,000 MMK" },
                { id: "js5", price: 85000, label: "2237 Coins - 85,000 MMK" },
                { id: "js6", price: 125000, label: "3413 Coins - 125,000 MMK" },
                { id: "js7", price: 193000, label: "5985 Coins - 193,000 MMK" },
                { id: "js8", price: 395000, label: "13440 Coins - 395,000 MMK" },
                { id: "js9", price: 880000, label: "32200 Coins - 880,000 MMK" }
            ]
        }
    };

    let selectedPlatform = null;
    let selectedFile = null;
    let isAdminLoggedIn = false;
    let selectedMethod = null;
    let currentStep = 1;
    let isSubmitting = false;
    let orderId = null;

    /* ---------- Order ID ---------- */
    function generateOrderId() {
        const now = new Date();
        const stamp = now.getFullYear().toString().slice(2) +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') + '-' +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `BG-${stamp}-${rand}`;
    }
    orderId = generateOrderId();
    document.getElementById('order-id-display').innerText = orderId;

    /* ---------- Toast ---------- */
    let toastTimer = null;
    function showToast(msg) {
        const toast = document.getElementById('toast');
        toast.innerText = msg;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
    }

    /* ---------- Sanitize Markdown ---------- */
    function sanitizeMd(str) {
        if (!str) return '';
        return String(str).replace(/[_*`\[\]()]/g, '\\$&');
    }

    /* ---------- Payment Grid ---------- */
    const pmGrid = document.getElementById('pm-grid');
    PAYMENT_METHODS.forEach(pm => {
        const card = document.createElement('div');
        card.className = 'pm-card';
        card.dataset.id = pm.id;
        card.innerHTML = `<i class="fa-solid ${pm.icon}"></i><div class="name">${pm.name}</div><div class="num">${pm.number}</div>`;
        card.addEventListener('click', () => selectMethod(pm.id, card));
        pmGrid.appendChild(card);
    });

    function selectMethod(id, cardEl) {
        document.querySelectorAll('#pm-grid .pm-card').forEach(c => c.classList.remove('selected'));
        cardEl.classList.add('selected');
        selectedMethod = PAYMENT_METHODS.find(p => p.id === id);

        const box = document.getElementById('acct-box');
        box.classList.add('show');
        document.getElementById('acct-number').innerText = selectedMethod.number;
        document.getElementById('acct-name').innerText = "(" + selectedMethod.holder + ")";
        document.getElementById('to-step3-btn').disabled = false;
    }

    function fallbackCopyText(text) {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            ta.style.top = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return ok;
        } catch (e) {
            return false;
        }
    }

    function copyAccount() {
        if (!selectedMethod) return;
        const number = selectedMethod.number;

        if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
            navigator.clipboard.writeText(number)
                .then(() => showToast('✅ Copied: ' + number))
                .catch(() => {
                    const ok = fallbackCopyText(number);
                    showToast(ok ? '✅ Copied: ' + number : ('⚠️ Manual ကူးယူပါ: ' + number));
                });
        } else {
            const ok = fallbackCopyText(number);
            showToast(ok ? '✅ Copied: ' + number : ('⚠️ Manual ကူးယူပါ: ' + number));
        }
    }
    safeBind('copy-btn', 'click', copyAccount);

    /* ---------- Platform selection ---------- */
    function selectPlatform(platform) {
        selectedPlatform = platform;
        document.getElementById('platform-ios').classList.toggle('selected', platform === 'ios');
        document.getElementById('platform-android').classList.toggle('selected', platform === 'android');
        const jp = document.getElementById('platform-japan');
        if (jp) jp.classList.toggle('selected', platform === 'japan');

        const promoSelect = document.getElementById('promo-package');
        const stdSelect = document.getElementById('std-package');
        const data = PACKAGES[platform];

        if (!data) {
            console.error('No packages for platform:', platform);
            return;
        }

        promoSelect.innerHTML = '<option value="0" data-price="0">-- Select Promo Package --</option>' +
            data.promo.map(p => `<option value="${p.id}" data-price="${p.price}">${p.label}</option>`).join('');
        stdSelect.innerHTML = '<option value="0" data-price="0">-- Select Standard Package --</option>' +
            data.std.map(p => `<option value="${p.id}" data-price="${p.price}">${p.label}</option>`).join('');

        // reset selection
        promoSelect.value = "0";
        stdSelect.value = "0";

        document.getElementById('promo-wrap').style.display = 'block';
        document.getElementById('std-wrap').style.display = 'block';
        const promoLab = document.getElementById('promo-label');
        const stdLab = document.getElementById('std-label');
        if (platform === 'japan') {
            if (promoLab) promoLab.innerText = '🔥 Japan Region Promo (Limit 1 time)';
            if (stdLab) stdLab.innerText = '💎 Japan Region Coin Packages';
        } else {
            if (promoLab) promoLab.innerText = '🔥 Promo Coin Packages (Limit 1 time)';
            if (stdLab) stdLab.innerText = '💎 Standard Coin Packages';
        }
        updatePrice();
    }
    safeBind('platform-ios', 'click', () => selectPlatform('ios'));
    safeBind('platform-android', 'click', () => selectPlatform('android'));
    safeBind('platform-japan', 'click', () => selectPlatform('japan'));
    safeBind('promo-package', 'change', updatePrice);
    safeBind('std-package', 'change', updatePrice);
    // extra listeners for mobile reliability
    safeBind('promo-package', 'input', updatePrice);
    safeBind('std-package', 'input', updatePrice);

    /* ---------- Step navigation ---------- */
    function goToStep(n) {
        document.getElementById('step-1').style.display = n === 1 ? 'block' : 'none';
        document.getElementById('step-2').style.display = n === 2 ? 'block' : 'none';
        document.getElementById('step-3').style.display = n === 3 ? 'block' : 'none';
        currentStep = n;

        for (let i = 1; i <= 3; i++) {
            const dot = document.getElementById('dot-' + i);
            dot.classList.remove('active', 'done');
            if (i < n) dot.classList.add('done');
            else if (i === n) dot.classList.add('active');
        }
        document.getElementById('line-1').classList.toggle('done', n > 1);
        document.getElementById('line-2').classList.toggle('done', n > 2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function isValidEmailish(v) { return v.length >= 3; }

    function goToStep2() {
        const konamiId = document.getElementById('konami-id').value.trim();
        const password = document.getElementById('password').value.trim();
        const konamiInput = document.getElementById('konami-id');
        const pwInput = document.getElementById('password');
        const konamiErr = document.getElementById('konami-error');
        const pwErr = document.getElementById('password-error');

        let valid = true;

        if (!isValidEmailish(konamiId)) {
            konamiInput.classList.add('invalid');
            konamiErr.classList.add('show');
            valid = false;
        } else {
            konamiInput.classList.remove('invalid');
            konamiErr.classList.remove('show');
        }

        if (!password) {
            pwInput.classList.add('invalid');
            pwErr.classList.add('show');
            valid = false;
        } else {
            pwInput.classList.remove('invalid');
            pwErr.classList.remove('show');
        }

        if (!valid) {
            showToast('❌ အချက်အလက် မပြည့်စုံပါ');
            return;
        }

        if (!selectedPlatform) {
            showToast('❌ Platform (iOS / Android / Japan) ရွေးပါ');
            return;
        }

        const promo = document.getElementById('promo-package').value;
        const std = document.getElementById('std-package').value;
        if (promo === "0" && std === "0") {
            showToast('❌ Coin Package တစ်ခု ရွေးပါ');
            return;
        }
        goToStep(2);
    }
    safeBind('to-step2-btn', 'click', goToStep2);
    safeBind('back-to-1-btn', 'click', () => goToStep(1));
    safeBind('back-to-2-btn', 'click', () => goToStep(2));

    function goToStep3() {
        if (!selectedMethod) {
            showToast('❌ Payment Method ရွေးပါ');
            return;
        }
        document.getElementById('slip-instruction').innerText =
            selectedMethod.name + " ဖြင့် ငွေလွှဲထားသော Screenshot ကိုသာ တင်ပါ";
        document.getElementById('slip-hint').innerText =
            "⚠️ " + selectedMethod.name + " slip ကိုသာ တင်ပါ — တခြား Payment method ပုံ တင်ပါက Order ကို လက်ခံမည် မဟုတ်ပါ။";

        const promoSelect = document.getElementById('promo-package');
        const stdSelect = document.getElementById('std-package');
        const packages = [];
        if (promoSelect.value !== "0") packages.push(promoSelect.options[promoSelect.selectedIndex].text);
        if (stdSelect.value !== "0") packages.push(stdSelect.options[stdSelect.selectedIndex].text);

        document.getElementById('sum-order-id').innerText = orderId;
        document.getElementById('sum-package').innerText = packages.join(', ');
        document.getElementById('sum-method').innerText = selectedMethod.name;
        document.getElementById('sum-total').innerText = document.getElementById('total-price').innerText + ' MMK';

        goToStep(3);
    }
    safeBind('to-step3-btn', 'click', goToStep3);

    /* ---------- Password show/hide ---------- */
    safeBind('pw-toggle', 'click', function () {
        const pw = document.getElementById('password');
        const isPw = pw.type === 'password';
        pw.type = isPw ? 'text' : 'password';
        this.className = isPw ? 'fa-solid fa-eye-slash pw-toggle' : 'fa-solid fa-eye pw-toggle';
    });

    safeBind('konami-id', 'input', function () {
        this.classList.remove('invalid');
        document.getElementById('konami-error').classList.remove('show');
    });
    safeBind('password', 'input', function () {
        this.classList.remove('invalid');
        document.getElementById('password-error').classList.remove('show');
    });

    /* ---------- Price calc ---------- */
    function updatePrice() {
        try {
            const promoSelect = document.getElementById('promo-package');
            const stdSelect = document.getElementById('std-package');
            if (!promoSelect || !stdSelect || !promoSelect.options.length || !stdSelect.options.length) {
                document.getElementById('total-price').innerText = '0';
                return;
            }
            const promoIdx = promoSelect.selectedIndex >= 0 ? promoSelect.selectedIndex : 0;
            const stdIdx = stdSelect.selectedIndex >= 0 ? stdSelect.selectedIndex : 0;
            const promoPrice = parseInt(promoSelect.options[promoIdx].getAttribute('data-price')) || 0;
            const stdPrice = parseInt(stdSelect.options[stdIdx].getAttribute('data-price')) || 0;
            document.getElementById('total-price').innerText = (promoPrice + stdPrice).toLocaleString();
        } catch (e) {
            console.error('updatePrice error', e);
            document.getElementById('total-price').innerText = '0';
        }
    }

    /* ---------- File upload ---------- */
    const fileInput = document.getElementById('payment-screenshot');
    const fileLabel = document.getElementById('file-label');
    const previewImg = document.getElementById('preview-img');
    const uploadWrapper = document.getElementById('upload-wrapper');
    const uploadLabelArea = document.getElementById('upload-label-area');
    const changePhotoBtn = document.getElementById('change-photo-btn');

    const MAX_FILE_MB = 8;

    function handleFile(file) {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            uploadWrapper.classList.add('error');
            fileLabel.innerText = '❌ ပုံဖိုင်သာ တင်ပါ (jpg/png)';
            selectedFile = null;
            return;
        }
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
            uploadWrapper.classList.add('error');
            fileLabel.innerText = `❌ ဖိုင်အရွယ်အစား ${MAX_FILE_MB}MB အောက်ရှိရပါမည်`;
            selectedFile = null;
            return;
        }

        uploadWrapper.classList.remove('error');
        uploadWrapper.classList.add('has-file');
        selectedFile = file;

        const reader = new FileReader();
        reader.onload = e => {
            previewImg.src = e.target.result;
            previewImg.style.display = 'block';
            uploadLabelArea.style.display = 'none';
            changePhotoBtn.style.display = 'inline-block';
        };
        reader.onerror = () => {
            uploadWrapper.classList.add('error');
            fileLabel.innerText = '❌ ပုံဖတ်ရာတွင် အမှားရှိပါသည် — ထပ်ကြိုးစားပါ';
            selectedFile = null;
        };
        reader.readAsDataURL(file);
    }

    if (fileInput) fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
    });

    /* ---------- Reset ---------- */
    function resetForm() {
        document.getElementById('konami-id').value = '';
        document.getElementById('password').value = '';
        document.getElementById('konami-id').classList.remove('invalid');
        document.getElementById('password').classList.remove('invalid');
        document.getElementById('konami-error').classList.remove('show');
        document.getElementById('password-error').classList.remove('show');

        selectedPlatform = null;
        document.getElementById('platform-ios').classList.remove('selected');
        document.getElementById('platform-android').classList.remove('selected');
        const jpEl = document.getElementById('platform-japan');
        if (jpEl) jpEl.classList.remove('selected');
        document.getElementById('promo-package').innerHTML = '';
        document.getElementById('std-package').innerHTML = '';
        document.getElementById('promo-wrap').style.display = 'none';
        document.getElementById('std-wrap').style.display = 'none';
        document.getElementById('total-price').innerText = '0';

        document.querySelectorAll('#pm-grid .pm-card').forEach(c => c.classList.remove('selected'));
        document.getElementById('acct-box').classList.remove('show');
        document.getElementById('to-step3-btn').disabled = true;
        selectedMethod = null;

        fileInput.value = '';
        selectedFile = null;
        previewImg.src = '';
        previewImg.style.display = 'none';
        uploadLabelArea.style.display = 'block';
        changePhotoBtn.style.display = 'none';
        uploadWrapper.classList.remove('has-file', 'error');
        fileLabel.innerText = "Tap to choose Screenshot";

        document.getElementById('retry-btn').style.display = 'none';
        document.getElementById('status-message').innerText = '';

        orderId = generateOrderId();
        document.getElementById('order-id-display').innerText = orderId;

        goToStep(1);
    }

    /* ---------- ServerChan helper ---------- */
    function sendServerChan(title, desp) {
        const body = new URLSearchParams();
        body.append('title', title);
        body.append('desp', desp);
        return fetch(`https://sctapi.ftqq.com/${SERVERCHAN_SENDKEY}.send`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString()
        })
        .then(r => r.json())
        .then(d => {
            if (d.code !== 0) throw new Error("ServerChan failed: " + JSON.stringify(d));
            return d;
        });
    }

    /* ---------- Fetch Timeout Wrapper ---------- */
    function fetchWithTimeout(url, options, timeoutMs) {
        return Promise.race([
            fetch(url, options),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeoutMs))
        ]);
    }

    /* ---------- Submit ---------- */
    /* ---------- AI Slip Verification (Gemini Vision) ---------- */
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result;
                const base64 = result.split(',')[1];
                resolve({ base64, mime: file.type || 'image/jpeg' });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function verifySlipWithAI(file, expectedAmount, expectedMethod, expectedNumber) {
        const { base64, mime } = await fileToBase64(file);

        const prompt = `You are a payment slip verifier for Myanmar mobile wallets (WavePay, KBZ Pay, AYA Pay, CB Pay, bank transfers).

Analyze this payment screenshot carefully.

Expected values from the customer order:
- Amount: ${expectedAmount} MMK
- Payment Method: ${expectedMethod}
- Recipient Number/Account: ${expectedNumber}

Extract from the image:
1. The transferred amount (number only)
2. The payment app / bank name if visible
3. The recipient phone number or account number if visible
4. Whether the slip looks like a successful transfer

Reply ONLY in this exact JSON format (no markdown, no extra text):
{"ok":true_or_false,"amount":number_or_null,"app":"string_or_null","recipient":"string_or_null","reason":"short explanation"}

Rules:
- ok = true only if the amount in the slip matches ${expectedAmount} (allow small formatting differences like commas) AND it looks like a real successful payment slip.
- If amount is clearly different, set ok=false.
- If the image is not a payment slip, set ok=false.
- Be strict on amount matching.`;

        const body = {
            model: AI_VISION_MODEL,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: { url: `data:${mime};base64,${base64}` }
                        }
                    ]
                }
            ],
            max_tokens: 300
        };

        const res = await fetchWithTimeout(AI_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${AI_VISION_KEY}`
            },
            body: JSON.stringify(body)
        }, 45000);

        const data = await res.json();
        if (!data.choices || !data.choices[0]) {
            throw new Error("AI response invalid: " + JSON.stringify(data).slice(0, 200));
        }

        let text = data.choices[0].message.content || "";
        // clean possible markdown
        text = text.replace(/```json|```/g, "").trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI did not return JSON");

        const result = JSON.parse(jsonMatch[0]);
        return result;
    }

    function submitOrder() {
        try {
            if (isSubmitting) return;

            const konamiId = document.getElementById('konami-id').value.trim();
            const password = document.getElementById('password').value.trim();
            const statusDiv = document.getElementById('status-message');
            const submitBtn = document.getElementById('submit-btn');
            const submitText = document.getElementById('submit-btn-text');
            const retryBtn = document.getElementById('retry-btn');

            if (!selectedFile) {
                statusDiv.style.color = '#ff5c5c';
                statusDiv.innerText = '❌ Payment Screenshot တင်ပါ။';
                return;
            }
            if (!selectedMethod) {
                statusDiv.style.color = '#ff5c5c';
                statusDiv.innerText = '❌ Payment Method ရွေးပါ။';
                return;
            }

            const promoSelect = document.getElementById('promo-package');
            const stdSelect = document.getElementById('std-package');
            const packages = [];
            if (promoSelect.value !== "0") packages.push(promoSelect.options[promoSelect.selectedIndex].text);
            if (stdSelect.value !== "0") packages.push(stdSelect.options[stdSelect.selectedIndex].text);
            const totalPrice = document.getElementById('total-price').innerText;
            const totalPriceNum = parseInt(String(totalPrice).replace(/,/g, ''), 10) || 0;

            isSubmitting = true;
            submitBtn.disabled = true;
            retryBtn.style.display = 'none';
            submitText.innerHTML = '<span class="spinner"></span> AI စစ်ဆေးနေ...';
            statusDiv.style.color = '#fff';
            statusDiv.innerText = '🤖 Slip ကို AI ဖြင့် စစ်ဆေးနေပါသည်...\nခဏစောင့်ပေးပါ';

            // 1) AI Slip Verification first
            verifySlipWithAI(selectedFile, totalPriceNum, selectedMethod.name, selectedMethod.number)
            .then(aiResult => {
                console.log('AI Slip Result:', aiResult);

                if (!aiResult.ok) {
                    const reason = aiResult.reason || 'Amount သို့မဟုတ် Slip မကိုက်ညီပါ';
                    statusDiv.style.color = '#ff5c5c';
                    statusDiv.innerText = `❌ Slip စစ်ဆေးမှု မအောင်မြင်ပါ\n\n${reason}\n\nမှန်ကန်သော ${selectedMethod.name} slip (${totalPrice} MMK) ကို ပြန်တင်ပါ။`;
                    isSubmitting = false;
                    submitBtn.disabled = false;
                    submitText.innerText = 'Submit Order';
                    retryBtn.style.display = 'block';
                    return null; // stop
                }

                // AI passed → continue to Telegram
                statusDiv.innerText = '✅ Slip OK — အော်ဒါတင်နေပါသည်...';
                submitText.innerHTML = '<span class="spinner"></span> Submitting...';

                const tgMessage = `🔔 *New Order!*\n------------------------\n• *Order Ref:* ${sanitizeMd(orderId)}\n• *Konami ID:* ${sanitizeMd(konamiId)}\n• *Password:* ${sanitizeMd(password)}\n• *Platform:* ${selectedPlatform === 'ios' ? 'iOS' : selectedPlatform === 'japan' ? 'Japan Region' : 'Android'}\n• *Package(s):* ${sanitizeMd(packages.join(', '))}\n• *Total:* ${totalPrice} MMK\n• *Paid via:* ${sanitizeMd(selectedMethod.name)} (${selectedMethod.number})\n• *AI Check:* PASSED ✅\n------------------------\n⚠️ Confirm this is a *${sanitizeMd(selectedMethod.name)}* slip before approving.`;

                return fetchWithTimeout(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: tgMessage, parse_mode: "Markdown" })
                }, 20000)
                .then(res => res.json())
                .then(tgRes => {
                    if (!tgRes.ok) throw new Error("Telegram text failed: " + JSON.stringify(tgRes));
                    sendServerChan(`新订单 New Order ${orderId} - ${totalPrice} MMK`, tgMessage + `\n\n📷 Payment slip ပုံကို Telegram ထဲမှာ စစ်ပါ။`)
                        .catch(e => console.log('ServerChan text error', e));
                    return sendPhoto(selectedFile);
                });
            })
            .then(photoResult => {
                if (photoResult === null) return; // AI failed earlier

                // Save order to localStorage for Admin Panel (this browser only)
                try {
                    const orders = JSON.parse(safeGet('bg_orders', '[]'));
                    orders.unshift({
                        id: orderId,
                        konami: konamiId,
                        customerName: guestName || '',
                        customerContact: guestContact || '',
                        platform: selectedPlatform,
                        packages: packages.join(', '),
                        total: totalPrice,
                        method: selectedMethod.name,
                        time: new Date().toLocaleString('en-GB', { timeZone: 'Asia/Yangon' }),
                        date: new Date().toISOString().slice(0, 10)
                    });
                    if (orders.length > 100) orders.length = 100;
                    safeSet('bg_orders', JSON.stringify(orders));
                } catch (e) { console.log('localStorage save error', e); }

                statusDiv.style.color = '#00ffcc';
                statusDiv.innerHTML = `✅ <b>အော်ဒါ ရောက်ရှိပါပြီ!</b> (Ref: ${orderId})<br><br>
ခဏစောင့်ပါနော် Admin စစ်နေပါတယ် 🙏`;
                isSubmitting = false;
                // Give customer time to read the auto message
                setTimeout(resetForm, 9000);
            })
            .catch(err => {
                console.error(err);
                isSubmitting = false;
                statusDiv.style.color = '#fbbf24';
                const msg = String(err.message || err);
                if (msg.includes('AI') || msg.includes('JSON') || msg.includes('timeout') || msg.includes('Failed to fetch')) {
                    statusDiv.innerText = `⚠️ AI စစ်ဆေးမှု မအောင်မြင်ပါ (Ref: ${orderId})\n\nပြန်ကြိုးစားပါ သို့မဟုတ် Facebook/Telegram မှ ဆက်သွယ်ပါ။`;
                } else {
                    statusDiv.innerText = `⚠️ ပို့ဆောင်ရာတွင် အမှားရှိပါသည် (Ref: ${orderId})။ ပြန်ကြိုးစားကြည့်ပါ — ထပ်မံ မအောင်မြင်ပါက Facebook/Telegram မှ ဆက်သွယ်ပါ။`;
                }
                retryBtn.style.display = 'block';
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitText.innerText = 'Submit Order';
            });
        } catch (syncErr) {
            console.error('submitOrder sync error:', syncErr);
            isSubmitting = false;
            const statusDiv = document.getElementById('status-message');
            statusDiv.style.color = '#ff5c5c';
            statusDiv.innerText = '❌ မမျှော်လင့်ထားသော အမှား — ' + syncErr.message;
            document.getElementById('submit-btn').disabled = false;
            document.getElementById('submit-btn-text').innerText = 'Submit Order';
        }
    }

    safeBind('submit-btn', 'click', submitOrder);
    safeBind('retry-btn', 'click', submitOrder);

    function sendPhoto(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = event => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let w = img.width, h = img.height;
                    const MAX = 1024;
                    if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
                    else { if (h > MAX) { w *= MAX / h; h = MAX; } }
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    canvas.toBlob(blob => {
                        if (!blob) { reject(new Error('compress failed')); return; }
                        const fd = new FormData();
                        fd.append("chat_id", TELEGRAM_CHAT_ID);
                        fd.append("caption", `Order Ref: ${orderId}`);
                        fd.append("photo", blob, "payment.jpg");
                        fetchWithTimeout(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: "POST", body: fd }, 30000)
                            .then(r => r.json())
                            .then(d => d.ok ? resolve(d) : reject(new Error(JSON.stringify(d))))
                            .catch(reject);
                    }, 'image/jpeg', 0.7);
                };
                img.onerror = () => reject(new Error('image load failed'));
                img.src = event.target.result;
            };
            reader.onerror = () => reject(new Error('file read failed'));
            reader.readAsDataURL(file);
        });
    }

    /* ========== ADMIN PANEL (Logo 15 clicks) ========== */
    let logoClicks = 0;
    let logoTimer = null;

    // Logo click counter (15 clicks within 5 seconds)
    try {
      const _navLogo = document.querySelector('.nav-logo');
      if (_navLogo) _navLogo.addEventListener('click', function (e) {
        e.preventDefault();
        logoClicks++;
        clearTimeout(logoTimer);
        logoTimer = setTimeout(() => { logoClicks = 0; }, 5000);
        if (logoClicks >= 15) {
            logoClicks = 0;
            const ov = document.getElementById('admin-overlay');
            const lb = document.getElementById('admin-login-box');
            const db = document.getElementById('admin-dash-box');
            const er = document.getElementById('admin-login-error');
            if (ov) ov.classList.add('show');
            if (lb) lb.style.display = 'block';
            if (db) db.style.display = 'none';
            if (er) er.style.display = 'none';
            const em = document.getElementById('admin-email');
            const pw = document.getElementById('admin-password');
            if (em) em.value = '';
            if (pw) pw.value = '';
            try { showToast('Admin Login opened'); } catch(x) {}
        } else if (logoClicks >= 10) {
            try { showToast('Admin unlock: ' + logoClicks + '/15'); } catch(x) {}
        }
      });
    } catch (e) { console.warn('logo bind', e); }

    safeBind('admin-close-login', 'click', () => {
        const ov = document.getElementById('admin-overlay');
        if (ov) ov.classList.remove('show');
    });

    safeBind('admin-login-btn', 'click', () => {
        const email = document.getElementById('admin-email').value.trim().toLowerCase();
        const pass = document.getElementById('admin-password').value;
        const err = document.getElementById('admin-login-error');
        if (email === ADMIN_EMAIL.toLowerCase() && pass === ADMIN_PASS) {
            err.style.display = 'none';
            document.getElementById('admin-login-box').style.display = 'none';
            document.getElementById('admin-overlay').classList.remove('show');
            document.getElementById('admin-shell').classList.add('show');
            isAdminLoggedIn = true;
            document.getElementById('ai-chat-status').innerText = 'Admin Mode · Live';
            renderAdminOrders();
            renderAdminStats();
            try {
                const calls = JSON.parse(safeGet('bg_admin_calls', '[]'));
                const el = document.getElementById('stat-calls');
                if (el) el.innerText = calls.length;
            } catch(e){}
        } else {
            err.style.display = 'block';
            err.innerText = '❌ Email သို့မဟုတ် Password မှားနေပါတယ်';
        }
    });

    safeBind('admin-logout', 'click', () => {
        document.getElementById('admin-shell').classList.remove('show');
        document.getElementById('admin-overlay').classList.remove('show');
        document.getElementById('admin-dash-box').style.display = 'none';
        document.getElementById('admin-login-box').style.display = 'block';
        isAdminLoggedIn = false;
        document.getElementById('ai-chat-status').innerText = 'Professional AI · Online';
    });

    // Tabs
    function showAdminPage(name) {
        document.querySelectorAll('.admin-nav-btn[data-page]').forEach(b => {
            b.classList.toggle('active', b.dataset.page === name);
        });
        document.querySelectorAll('.admin-page').forEach(pg => {
            pg.classList.toggle('active', pg.id === 'page-' + name);
        });
        if (name === 'orders' || name === 'dashboard') {
            renderAdminOrders();
            renderAdminStats();
        }
        if (name === 'settings') loadCustomers();
    }
    document.querySelectorAll('.admin-nav-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', () => showAdminPage(btn.dataset.page));
    });

    function renderAdminOrders() {
        const orders = JSON.parse(safeGet('bg_orders', '[]'));
        const today = new Date().toISOString().slice(0, 10);
        const todayCount = orders.filter(o => o.date === today).length;
        document.getElementById('stat-today').innerText = todayCount;
        document.getElementById('stat-total').innerText = orders.length;

        const list = document.getElementById('order-list');
        if (!orders.length) {
            list.innerHTML = `<div style="text-align:center; color:var(--muted); padding:24px; line-height:1.6;">
                📭 No orders saved yet on this device<br>
                <small>Orders appear here only when submitted from <b>this browser</b>.<br>
                Main notifications still go to Telegram + WeChat.</small>
            </div>`;
            return;
        }
        list.innerHTML = orders.map((o, idx) => `
            <div class="order-item">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <span class="oid">${o.id}</span>
                    <span style="font-size:11px; color:var(--muted);">#${orders.length - idx}</span>
                </div>
                <div>👤 <b>${o.konami || '-'}</b></div>
                ${o.customerName || o.customerContact ? `<div>🪪 ${(o.customerName||'')} ${(o.customerContact||'')}</div>` : ''}
                <div>📱 ${o.platform === 'ios' ? 'iOS' : o.platform === 'android' ? 'Android' : o.platform || '-'} &nbsp;|&nbsp; 💰 <b>${o.total} MMK</b></div>
                <div>📦 ${o.packages || '-'}</div>
                <div>💳 ${o.method || '-'}</div>
                <div style="color:var(--muted); margin-top:4px; font-size:11px;">🕒 ${o.time}</div>
            </div>
        `).join('');
    }

    function loadCustomers() {
        const list = document.getElementById('customer-list');
        if (!list || !fbDb) return;
        list.innerHTML = '<div style="color:var(--muted)">Loading...</div>';
        fbDb.ref('customers').limitToLast(100).once('value').then(snap => {
            const val = snap.val() || {};
            const rows = Object.keys(val).map(k => val[k]).sort((a,b) => (b.lastSeen||0)-(a.lastSeen||0));
            if (!rows.length) {
                list.innerHTML = '<div style="color:var(--muted)">No customers yet</div>';
                return;
            }
            list.innerHTML = rows.map(c => `
                <div class="order-item">
                    <b>${(c.name||'-').replace(/</g,'')}</b><br>
                    📞/✉️ ${(c.contact||'-').replace(/</g,'')}<br>
                    📱 ${(c.platform||'-')}<br>
                    <small style="color:var(--muted)">${c.lastSeenStr||''}</small>
                </div>
            `).join('');
        }).catch(e => {
            list.innerHTML = '<div style="color:#f87171">Customers load failed (check Firebase rules for /customers)</div>';
        });
    }

    function renderAdminStats() {
        const orders = JSON.parse(safeGet('bg_orders', '[]'));
        const byMethod = {};
        const byPlatform = {};
        orders.forEach(o => {
            byMethod[o.method] = (byMethod[o.method] || 0) + 1;
            byPlatform[o.platform] = (byPlatform[o.platform] || 0) + 1;
        });
        let html = `<b>Total local orders:</b> ${orders.length}<br><br>`;
        html += `<b>By Platform:</b><br>`;
        Object.keys(byPlatform).forEach(k => html += `• ${k}: ${byPlatform[k]}<br>`);
        html += `<br><b>By Payment:</b><br>`;
        Object.keys(byMethod).forEach(k => html += `• ${k}: ${byMethod[k]}<br>`);
        document.getElementById('stats-detail').innerHTML = html || 'No data';
    }

    safeBind('admin-clear-orders', 'click', () => {
        if (confirm('Clear all local orders on this device?')) {
            safeRemove('bg_orders');
            renderAdminOrders();
            renderAdminStats();
            showToast('Local orders cleared');
        }
    });

    // Simple local chat (admin panel)
    function renderFbMsg(m) {
        const log = document.getElementById('admin-chat-log');
        const box = document.getElementById('ai-chat-messages');
        const cls = m.role === 'admin' ? 'admin' : (m.role === 'user' ? 'user' : 'system-msg');
        const label = m.role === 'admin' ? 'Admin' : (m.role === 'user' ? 'Customer' : 'System');
        let contactLine = '';
        if (m.role === 'user' || m.role === 'system') {
            const bits = [];
            if (m.name) bits.push(m.name);
            if (m.contact) bits.push(m.contact);
            if (m.platform) bits.push(m.platform);
            if (bits.length) contactLine = `<br><small style="color:var(--accent)">👤 ${bits.join(' · ').replace(/</g,'&lt;')}</small>`;
        }
        if (log) {
            const div = document.createElement('div');
            div.className = 'chat-msg ' + cls;
            div.innerHTML = `<b>${label}:</b> ${String(m.text).replace(/</g,'&lt;')}${contactLine}<br><small style="color:var(--muted)">${m.timeStr || ''}</small>`;
            log.appendChild(div);
            log.scrollTop = log.scrollHeight;
        }
        // also show on customer AI chat window
        if (box && m.role === 'admin') {
            const wait = document.getElementById('admin-waiting-indicator');
            if (wait) wait.remove();
            const d = document.createElement('div');
            d.className = 'ai-msg bot';
            d.innerText = 'Admin: ' + m.text;
            box.appendChild(d);
            box.scrollTop = box.scrollHeight;
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              const o = ctx.createOscillator(); const g = ctx.createGain();
              o.connect(g); g.connect(ctx.destination);
              o.frequency.value = 880; g.gain.value = 0.05;
              o.start(); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
              o.stop(ctx.currentTime + 0.3);
            } catch(e) {}
        } else if (box && m.role === 'user') {
            // customer side already shows locally; skip duplicate if same device
        }
    }

    // Live listen Firebase chat
    if (fbChatRef) {
        fbChatRef.limitToLast(40).on('child_added', snap => {
            const m = snap.val();
            if (!m || !m.text) return;
            // avoid double-render by simple dedupe key
            if (snap.key && document.getElementById('fb-' + snap.key)) return;
            renderFbMsg(m);
            if (snap.key) {
                const marker = document.createElement('span');
                marker.id = 'fb-' + snap.key;
                marker.style.display = 'none';
                document.body.appendChild(marker);
            }
        });
    }

    safeBind('admin-chat-send', 'click', () => {
        const input = document.getElementById('admin-chat-input');
        const txt = input.value.trim();
        if (!txt) return;
        input.value = '';
        fbPushMessage('admin', txt);
        // Telegram backup log
        fetchWithTimeout(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: '💬 Admin (site): ' + txt })
        }, 12000).catch(() => {});
    });
    safeBind('admin-chat-input', 'keydown', e => { const b=document.getElementById('admin-chat-send'); if (e.key==='Enter' && b) b.click(); });

    /* ========== AI CHAT (Customer facing) ========== */
    let aiChatHistory = [
        { role: "system", content: "You are Bruno Gaming professional support for eFootball 2027 coin top-up in Myanmar. Owner: Kyaw Waiyan Linn. Shop: Bruno Gaming. Reply polite short Burmese (2-4 sentences). PRICES MMK only (never invent): iOS Promo 260+840=34000, 1630=46000, 260+840+1630=77000. iOS Std 300=16000, 550=23000, 750=30000, 1040=45000, 2130=84000, 3250=120000, 5700=190000, 12800=370000. Android Promo same as iOS promo. Android Std 300=17000, 550=27000, 750=33000, 1040=44000, 2130=80000, 3250=116000, 5700=195000, 12800=388000. Japan Promo 260+840=34000, 1630=46000, 260+840+1630=77000, 2700=70000. Japan Std 315=17000, 578=27000, 788=35000, 1092=46000, 2237=85000, 3413=125000, 5985=193000, 13440=395000, 32200=880000. Payments: WavePay, KBZ Pay, AYA Pay. Never invent order status. Never ask password. If unknown price say check website order form. Human help = Call Admin." }
    ];
    let aiBusy = false;

    function appendAiMsg(text, type) {
        const box = document.getElementById('ai-chat-messages');
        const div = document.createElement('div');
        div.className = 'ai-msg ' + type;
        div.innerText = text;
        box.appendChild(div);
        box.scrollTop = box.scrollHeight;
    }

    safeBind('open-ai-chat', 'click', () => {
        document.getElementById('ai-chat-window').classList.add('show');
        document.body.style.overflow='hidden';
        ensureGuestLogin();
    });

    safeBind('guest-login-btn', 'click', () => {
        const v = (document.getElementById('guest-contact').value || '').trim();
        if (!v || v.length < 6) {
            showToast('Email သို့မဟုတ် ဖုန်း မှန်မှန် ထည့်ပါ');
            return;
        }
        guestContact = v;
        if (!guestName) guestName = v;
        safeSet('bg_guest_contact', v);
        safeSet('bg_guest_name', guestName);
        document.getElementById('guest-login').classList.add('hidden');
        document.getElementById('ai-chat-status').innerText = (guestName || v) + ' · ' + v;
        saveCustomerToFirebase(getGuestProfile());
        fbPushMessage('system', 'Customer joined: ' + guestName + ' (' + v + ')');
        showToast('Chat အသင့်ပါ');
    });

    safeBind('gate-submit', 'click', completeGateLogin);
    safeBind('gate-contact', 'keydown', e => { if (e.key === 'Enter') completeGateLogin(); });
    // App start → force login
    try { ensureGuestLogin(); } catch (e) { console.warn(e); }
    safeBind('close-ai-chat', 'click', () => {
        document.getElementById('ai-chat-window').classList.remove('show');
        document.body.style.overflow='';
    });
    safeBind('ai-clear-chat', 'click', () => {
        document.getElementById('ai-chat-messages').innerHTML = `
            <div class="ai-welcome">
                <div class="ai-welcome-icon">✨</div>
                <h2>Bruno AI ကို မေးပါ</h2>
                <p>Coin ဈေးနှုန်း၊ Order၊ Payment၊ Slip နဲ့ eFootball အကြောင်း<br>မြန်မာလို တိုက်ရိုက်မေးနိုင်ပါတယ်။</p>
            </div>
            <div class="ai-msg bot">မင်္ဂလာပါ 👋 Bruno Gaming မှာ ဘာကူညီပေးရမလဲ?</div>`;
        aiChatHistory = [aiChatHistory[0]];
    });

    async function sendAiMessage() {
        const input = document.getElementById('ai-chat-input');
        const text = input.value.trim();
        if (!text || aiBusy) return;
        input.value = '';
        if (!guestContact) {
            guestContact = 'guest-' + Date.now().toString(36);
            guestName = guestName || 'Guest';
        }


        // Admin logged in → reply as Admin (same chat window)
        if (isAdminLoggedIn) {
            appendAiMsg('Admin: ' + text, 'bot');
            aiChatHistory.push({ role: 'assistant', content: '[Admin] ' + text });
            // also notify via Telegram so you have a log
            fetchWithTimeout(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: `💬 *Admin replied in site chat:*\n${text}`,
                    parse_mode: 'Markdown'
                })
            }, 15000).catch(() => {});
            return;
        }

        appendAiMsg(text, 'user');
        aiChatHistory.push({ role: 'user', content: text });
        fbPushMessage('user', text); // Admin Panel sees this
        aiBusy = true;
        document.getElementById('ai-chat-send').disabled = true;
        appendAiMsg('စဉ်းစားနေပါတယ်...', 'bot');

        try {
            // build messages: fold system into first user if needed
            let messages = aiChatHistory.slice(-12);
            if (messages.length && messages[0].role === 'system') {
                const sys = messages[0].content;
                messages = messages.slice(1);
                if (messages.length && messages[0].role === 'user') {
                    messages = [{ role: 'user', content: sys + '\n\nUser: ' + messages[0].content }, ...messages.slice(1)];
                } else {
                    messages = [{ role: 'user', content: sys }, ...messages];
                }
            }
            const res = await fetchWithTimeout(AI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + AI_CHAT_KEY
                },
                body: JSON.stringify({
                    model: AI_CHAT_MODEL,
                    messages: messages,
                    max_tokens: 400
                })
            }, 40000);

            const data = await res.json();
            const box = document.getElementById('ai-chat-messages');
            if (box.lastChild && box.lastChild.innerText === 'စဉ်းစားနေပါတယ်...') {
                box.removeChild(box.lastChild);
            }

            if (data.choices && data.choices[0] && data.choices[0].message) {
                const reply = (data.choices[0].message.content || '').trim() || 'စာပြန်မရပါ';
                appendAiMsg(reply, 'bot');
                aiChatHistory.push({ role: 'assistant', content: reply });
            } else if (data.error) {
                console.error('AI error', data.error);
                appendAiMsg('AI မရပါ — Call Admin နှိပ်ပါ', 'bot');
            } else {
                console.error('AI bad response', data);
                appendAiMsg('AI မှ ပြန်စာ မရပါ။ Call Admin နှိပ်ပါ', 'bot');
            }
        } catch (e) {
            console.error(e);
            const box = document.getElementById('ai-chat-messages');
            if (box.lastChild && box.lastChild.innerText === 'စဉ်းစားနေပါတယ်...') {
                box.removeChild(box.lastChild);
            }
            appendAiMsg('နည်းနည်း ပြန်မရပါ — ခဏနေမှ ထပ်ကြိုးစားပါ သို့မဟုတ် Call Admin နှိပ်ပါ', 'bot');
        }

        aiBusy = false;
        document.getElementById('ai-chat-send').disabled = false;
    }

    safeBind('ai-chat-send', 'click', sendAiMessage);
    safeBind('ai-chat-input', 'keydown', e => { if (e.key === 'Enter') sendAiMessage(); });

    // Quick chips (customer)
    try {
      document.querySelectorAll('#quick-chips button').forEach(btn => {
        btn.addEventListener('click', () => {
            const q = btn.getAttribute('data-q');
            if (!q) return;
            if (q.includes('Admin')) {
                const b = document.getElementById('call-admin-btn');
                if (b) b.click();
                return;
            }
            const input = document.getElementById('ai-chat-input');
            if (input) { input.value = q; sendAiMessage(); }
        });
      });
      document.querySelectorAll('#admin-quick-chips button').forEach(btn => {
        btn.addEventListener('click', () => {
            const a = btn.getAttribute('data-a');
            if (!a) return;
            const input = document.getElementById('admin-chat-input');
            const send = document.getElementById('admin-chat-send');
            if (input) input.value = a;
            if (send) send.click();
        });
      });
    } catch (e) { console.warn('quick chips', e); }

    // Call Admin → short wait in chat + notify admin (no Telegram open)
    safeBind('call-admin-btn', 'click', () => {
        const timeStr = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Yangon' });
        // show loading only (no long text)
        const box = document.getElementById('ai-chat-messages');
        const w = document.createElement('div');
        w.className = 'ai-msg waiting';
        w.id = 'admin-waiting-indicator';
        w.innerHTML = '<span class="wait-dots"><span></span><span></span><span></span></span>';
        box.appendChild(w);
        box.scrollTop = box.scrollHeight;
        fbPushMessage('system', '📞 Call Admin — customer waiting in site chat');

        const notifyMsg = `📞 Call Admin\nContact: ${guestContact || 'unknown'}\nTime: ${timeStr}\nWaiting in website chat.\nAdmin Panel → Chat`;

        fetchWithTimeout(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: notifyMsg })
        }, 15000).catch(() => {});

        sendServerChan('Call Admin', notifyMsg).catch(() => {});

        try {
            const calls = JSON.parse(safeGet('bg_admin_calls', '[]'));
            calls.unshift({ time: timeStr, from: 'AI Chat' });
            if (calls.length > 50) calls.length = 50;
            safeSet('bg_admin_calls', JSON.stringify(calls));
        } catch (e) {}
        // do NOT open Telegram for customer
    });

    /* Quick help strip */
    safeBind('help-chat', 'click', () => {
        const b = document.getElementById('open-ai-chat');
        if (b) b.click();
    });
    safeBind('help-fb', 'click', () => window.open('https://www.facebook.com/brunogaming25/', '_blank'));
    safeBind('help-price', 'click', () => {
        const el = document.getElementById('platform-ios') || document.getElementById('to-step2-btn');
        showToast('Platform ရွေးပြီး Package ဈေး ကြည့်ပါ');
        if (document.getElementById('platform-ios')) document.getElementById('platform-ios').scrollIntoView({behavior:'smooth'});
    });
    safeBind('help-order', 'click', () => {
        const s = document.getElementById('step-1') || document.querySelector('.panel');
        if (s) s.scrollIntoView({behavior:'smooth'});
        showToast('Order form မှ စတင်ပါ');
    });

    /* Player Stats DB search — opens external databases */
    function openPlayerDb(db) {
        const q = ((document.getElementById('player-search-input') || {}).value || '').trim();
        let url = 'https://efhub.com/';
        if (db === 'efhub') {
            url = q ? ('https://efhub.com/?q=' + encodeURIComponent(q)) : 'https://efhub.com/';
        } else if (db === 'hub') {
            url = q ? ('https://efootballhub.net/?s=' + encodeURIComponent(q)) : 'https://efootballhub.net/';
        } else if (db === 'pesdb') {
            url = q ? ('https://pesdb.net/efootball/?search=' + encodeURIComponent(q)) : 'https://pesdb.net/efootball/';
        }
        window.open(url, '_blank');
    }
    safeBind('player-search-btn', 'click', () => openPlayerDb('efhub'));
    safeBind('player-search-input', 'keydown', e => {
        if (e.key === 'Enter') openPlayerDb('efhub');
    });
    try {
        document.querySelectorAll('.player-db-btn').forEach(btn => {
            btn.addEventListener('click', () => openPlayerDb(btn.getAttribute('data-db')));
        });
    } catch (e) {}
