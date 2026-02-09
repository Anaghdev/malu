// --- CONFIGURATION ---
const API_KEY = "AIzaSyAL27fogypzYE0h7M4YWv7gUxxG-5Iage4";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

// Topics
const TOPIC_MISSIVE = "malu-anagh-missive-bridge";
const TOPIC_UPDATES = "malu-anagh-status-updates";
const TOPIC_CHAT_A = "malu-chat-anagh-A";
const TOPIC_CHAT_B = "malu-chat-anagh-B";
const TOPIC_MISS = "malu-misses-anagh";


// Identity Logic
let IS_ANAGH = false;
let MY_NAME = "";
let PARTNER_NAME = "";

const urlParams = new URLSearchParams(window.location.search);
const paramUser = urlParams.get('user');

function checkIdentity() {
    const savedUser = localStorage.getItem('app_user') || paramUser;

    if (!savedUser) {
        document.getElementById('identity-selector').classList.remove('hidden');
        document.getElementById('select-anagh').onclick = () => setRole('anagh');
        document.getElementById('select-malu').onclick = () => setRole('malu');
        return false;
    }

    IS_ANAGH = savedUser === 'anagh';
    MY_NAME = IS_ANAGH ? "Anagh" : "Malu";
    PARTNER_NAME = IS_ANAGH ? "Liya" : "Anagh";
    return true;
}

function setRole(role) {
    localStorage.setItem('app_user', role);
    location.reload();
}


const FALLBACK_MESSAGES = [
    "I realized today that my day doesn't actually 'start' until I hear your voice; everything before that is just standby mode.",
    "The silence here is missing the specific frequency of your laugh, Liya.",
    "Honestly, I feel like a fragment of myself today without you.",
    "This distance feels like a processing error I wasn't prepared for."
];

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initApp();
});

async function initApp() {
    if (!checkIdentity()) return; // Wait for role selection

    setupRoleUI();

    setupInteractionBtn();
    setupChat();
    setupStories();
    setupListening();
    setupInstallBanner(); // Ensure PWA banner setup is called

    // Greeting
    const hour = new Date().getHours();
    const greetingEl = document.getElementById('greeting');
    if (hour >= 5 && hour < 12) greetingEl.textContent = `Good Morning, ${IS_ANAGH ? 'Liya' : 'Malu'}.`;
    else if (hour >= 12 && hour < 17) greetingEl.textContent = `Good Afternoon, ${IS_ANAGH ? 'Liya' : 'Malu'}.`;
    else greetingEl.textContent = `Thinking of you, ${IS_ANAGH ? 'Liya' : 'Malu'}.`;

    // Load current missive
    const today = new Date().toISOString().split('T')[0];
    const cached = JSON.parse(localStorage.getItem('daily_missive') || '{}');
    if (cached.date === today) {
        displayMessage(cached.message);
    } else {
        if (!IS_ANAGH) {
            // Malu waits for him to send it or uses fallback/nothing until it arrives
            displayMessage("Waiting for Anagh's heart to speak... ❤️");
        } else {
            // Anagh can generate it
            document.getElementById('generate-missive').classList.remove('hidden');
        }
    }

    document.getElementById('date-display').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

function setupRoleUI() {
    if (IS_ANAGH) {
        document.getElementById('generate-missive').classList.remove('hidden');
        document.getElementById('generate-missive').addEventListener('click', generateAndSendMissive);
    }
}

// --- MISSIVE FLOW ---

async function generateAndSendMissive() {
    const btn = document.getElementById('generate-missive');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Sending...';
    lucide.createIcons();

    const today = new Date().toISOString().split('T')[0];
    const prompt = `Write a deep "I miss you" message for Malu (Liya). 3-5 sentences. English mixed with Thrissur slang like "Ente Malu".`;

    try {
        const response = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
            method: 'POST',
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        const message = data.candidates[0].content.parts[0].text;

        // Save locally
        localStorage.setItem('daily_missive', JSON.stringify({ date: today, message }));
        displayMessage(message);

        // Notify Malu via bridge
        await fetch(`https://ntfy.sh/${TOPIC_MISSIVE}`, {
            method: 'POST',
            body: message,
            headers: { 'Title': 'A message from my heart ❤️', 'Tags': 'heart,sparkles' }
        });

        btn.classList.add('hidden');
    } catch (e) {
        console.error(e);
        btn.disabled = false;
        btn.textContent = "Try again...";
    }
}

function displayMessage(text) {
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('message-content').classList.remove('hidden');
    document.getElementById('daily-text').textContent = text;
}

// --- STORIES (Snapchat Updates) ---

function setupStories() {
    const addBtn = document.getElementById('add-update');
    addBtn.addEventListener('click', () => {
        const thought = prompt("What's on your mind?");
        if (thought) postUpdate(thought);
    });

    // Fetch recent updates
    fetch(`https://ntfy.sh/${TOPIC_UPDATES}/json?since=12h`).then(r => r.json()).then(updates => {
        updates.forEach(u => addUpdateToUI(u.message, u.title === MY_NAME));
    });
}

async function postUpdate(text) {
    addUpdateToUI(text, true);
    await fetch(`https://ntfy.sh/${TOPIC_UPDATES}`, {
        method: 'POST',
        body: text,
        headers: { 'Title': MY_NAME, 'Tags': 'thought_balloon' }
    });
}

function addUpdateToUI(text, isMe) {
    const bar = document.getElementById('stories-bar');
    const item = document.createElement('div');
    item.className = 'story-item';
    item.innerHTML = `<i data-lucide="${isMe ? 'user' : 'heart'}"></i><span>${text.substring(0, 10)}...</span>`;
    item.onclick = () => alert(`${isMe ? 'You' : PARTNER_NAME}: ${text}`);
    bar.appendChild(item);
    lucide.createIcons();
}

// --- REAL-TIME LISTENERS ---

function setupListening() {
    // Listen for missives (Malu only)
    if (!IS_ANAGH) {
        const missiveSource = new EventSource(`https://ntfy.sh/${TOPIC_MISSIVE}/sse`);
        missiveSource.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.message) {
                const today = new Date().toISOString().split('T')[0];
                localStorage.setItem('daily_missive', JSON.stringify({ date: today, message: data.message }));
                displayMessage(data.message);
                new Notification("New Message!", { body: "Anagh sent a piece of his heart. ❤️" });
            }
        };
    }

    // Listen for updates (Stories)
    const updateSource = new EventSource(`https://ntfy.sh/${TOPIC_UPDATES}/sse`);
    updateSource.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.message && data.title !== MY_NAME) {
            addUpdateToUI(data.message, false);
        }
    };

    // Listen for Calls & Chat
    const MY_RECV = IS_ANAGH ? TOPIC_CHAT_A : TOPIC_CHAT_B;
    const bridgeSource = new EventSource(`https://ntfy.sh/${MY_RECV}/sse`);
    bridgeSource.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (!data.message) return;

        if (data.message.startsWith('CALL_SIGNAL:')) {
            const [_, room, type] = data.message.split(':');
            showIncomingCall(room, type);
        } else {
            addChatMessage(data.message, false);
            if (document.getElementById('chat-overlay').classList.contains('hidden')) {
                document.getElementById('chat-badge').classList.remove('hidden');
            }
        }
    };
}


// --- CALLING SYSTEM (PREMIUM) ---

let jitsiApi = null;

function startCall(type) {
    const room = `Couple-${Math.random().toString(36).substring(7)}`;
    const MY_SEND = IS_ANAGH ? TOPIC_CHAT_B : TOPIC_CHAT_A;

    fetch(`https://ntfy.sh/${MY_SEND}`, {
        method: 'POST',
        body: `CALL_SIGNAL:${room}:${type}`,
        headers: { 'Title': `${MY_NAME} is calling...`, 'Tags': 'phone,heart' }
    });

    initiateJitsi(room, type);
}

function showIncomingCall(room, type) {
    const screen = document.getElementById('incoming-call-screen');
    const nameEl = document.getElementById('caller-name');
    nameEl.textContent = `${PARTNER_NAME} is calling... ❤️`;
    screen.classList.remove('hidden');

    document.getElementById('accept-call').onclick = () => {
        screen.classList.add('hidden');
        initiateJitsi(room, type);
    };

    document.getElementById('decline-call').onclick = () => {
        screen.classList.add('hidden');
    };
}

function initiateJitsi(room, type) {
    const overlay = document.getElementById('call-overlay');
    overlay.classList.remove('hidden');

    const options = {
        roomName: room,
        width: '100%',
        height: '100%',
        parentNode: document.getElementById('jitsi-container'),
        configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: type === 'audio',
            prejoinPageEnabled: false
        }
    };

    jitsiApi = new JitsiMeetExternalAPI("8x8.vc", options);
    jitsiApi.addEventListeners({
        videoConferenceLeft: closeCall
    });

    document.getElementById('end-call-btn').onclick = closeCall;
}

function closeCall() {
    if (jitsiApi) {
        jitsiApi.dispose();
        jitsiApi = null;
    }
    document.getElementById('call-overlay').classList.add('hidden');
    document.getElementById('jitsi-container').innerHTML = '';
}

function setupChat() {
    const MY_SEND = IS_ANAGH ? TOPIC_CHAT_B : TOPIC_CHAT_A;

    document.getElementById('send-msg').onclick = () => {
        const input = document.getElementById('chat-input');
        const text = input.value;
        if (!text) return;
        input.value = '';
        addChatMessage(text, true);
        fetch(`https://ntfy.sh/${MY_SEND}`, { method: 'POST', body: text, headers: { 'Title': MY_NAME } });
    };

    document.getElementById('chat-toggle').onclick = () => {
        document.getElementById('chat-overlay').classList.remove('hidden');
        document.getElementById('chat-badge').classList.add('hidden');
    };
    document.getElementById('close-chat').onclick = () => document.getElementById('chat-overlay').classList.add('hidden');
}

function addChatMessage(text, isMe) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `msg-bubble ${isMe ? 'msg-me' : 'msg-them'}`;
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function setupInteractionBtn() {
    const btn = document.getElementById('miss-you-btn');
    const status = document.getElementById('status-message');
    btn.onclick = () => {
        status.textContent = "Notified! ❤️";
        const msg = IS_ANAGH ? "Anagh misses you! ❤️" : "Malu misses you! ❤️";
        fetch(`https://ntfy.sh/${TOPIC_MISS}`, { method: 'POST', body: msg, headers: { 'Title': MY_NAME } });
    };

    document.getElementById('audio-call').onclick = () => startCall('audio');
    document.getElementById('video-call').onclick = () => startCall('video');
}


// --- PWA FEATURES ---

let deferredPrompt; // Declare deferredPrompt globally or within setupInstallBanner scope

function setupInstallBanner() {
    const banner = document.getElementById('install-banner');
    const installBtn = document.getElementById('install-btn');

    // Show if already available
    if (window.deferredPrompt) banner.classList.add('show');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        window.deferredPrompt = e;
        banner.classList.add('show');
    });

    installBtn.onclick = async () => {
        if (window.deferredPrompt) {
            window.deferredPrompt.prompt();
            const { outcome } = await window.deferredPrompt.userChoice;
            if (outcome === 'accepted') banner.classList.remove('show');
            window.deferredPrompt = null;
        }
    };

    // Hide if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
        banner.classList.add('hidden');
    }
}


if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(reg => {
            console.log('SW Registered', reg);
        });
    });
}
