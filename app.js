// --- CONFIGURATION ---
const API_KEY = "AIzaSyAL27fogypzYE0h7M4YWv7gUxxG-5Iage4";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
const NTFY_TOPIC = "malu-misses-anagh"; // He will subscribe to this topic on his phone


const FALLBACK_MESSAGES = [
    "I realized today that my day doesn't actually 'start' until I hear your voice; everything before that is just standby mode, a gray static where nothing feels quite real. I miss you, Malu.",
    "My mind turned to tell you something funny just now before I remembered you weren't there—that 'phantom limb' feeling is the heaviest part of my day, Ente Malu.",
    "The silence here is missing the specific frequency of your laugh, Liya. Everything feels monochromatic without your vibrant energy bringing the color back.",
    "Honestly, I feel like a fragment of myself today. My personality is most alive when you're here to witness it, and without you, I'm just waiting to hit 'play' again.",
    "This distance feels like a processing error I wasn't prepared for. I'm literally just holding my breath until I'm back in your orbit, Malu."
];

const PSYCHOLOGICAL_DIRECTIVES = [

    "Sensory Memory: Describe a specific sound, scent, or feeling and how its absence creates a void.",
    "Cognitive Habit: Mention a moment where your brain automatically looked for her to share a thought.",
    "The Mirror Effect: Explain how you feel like a fragment of yourself without her.",
    "Visual Contrast: Contrast the bright energy of being with her against the monochrome feeling of being alone.",
    "The Phantom Limb Effect: Describe a moment where your mind expected her to be there."
];

// --- APP LOGIC ---

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initApp();
});

async function initApp() {
    setupInstallBanner();
    setupInteractionBtn();

    // Update dynamic greeting
    const hour = new Date().getHours();
    const greetingEl = document.getElementById('greeting');
    if (hour >= 5 && hour < 12) greetingEl.textContent = "Good Morning, Malu.";
    else if (hour >= 12 && hour < 17) greetingEl.textContent = "Good Afternoon, Malu.";
    else if (hour >= 17 && hour < 21) greetingEl.textContent = "Good Evening, Malu.";
    else greetingEl.textContent = "Thinking of you, Malu.";

    const today = new Date().toISOString().split('T')[0];
    const cachedData = JSON.parse(localStorage.getItem('daily_missive') || '{}');

    if (cachedData.date === today) {
        displayMessage(cachedData.message);
    } else {
        await fetchDailyMessage(today);
    }

    document.getElementById('date-display').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

async function fetchDailyMessage(date) {
    const loader = document.getElementById('loader');
    const content = document.getElementById('message-content');

    loader.classList.remove('hidden');
    content.classList.add('hidden');

    // Check for placeholder API key and use fallback if found
    if (API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
        console.warn("API Key is a placeholder. Using a fallback message.");
        const fallbackMessage = FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];
        localStorage.setItem('daily_missive', JSON.stringify({ date, message: fallbackMessage }));
        displayMessage(fallbackMessage);
        return; // Exit the function early
    }

    const directive = PSYCHOLOGICAL_DIRECTIVES[Math.floor(Math.random() * PSYCHOLOGICAL_DIRECTIVES.length)];

    const prompt = `
        Role: A deeply emotional, psychologically aware boyfriend writing to his girlfriend, Malu (Liya).
        Task: Write a unique "I miss you" message (3-5 sentences).
        Psychological Trigger: ${directive}
        Style: Raw, vulnerable, slightly poetic but modern. Use "Malu" or "Liya".
        Slang: Subtle Malayalam/Thrissur expressions like "Ente Malu", "Pinnalla", "Aliya".
        No Clichés. Focus on a tiny detail.
    `;

    try {
        const response = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const message = data.candidates[0].content.parts[0].text;

        localStorage.setItem('daily_missive', JSON.stringify({ date, message }));
        displayMessage(message);
    } catch (error) {
        console.error("Error fetching message:", error);
        // Use a random fallback message if API call fails
        const fallbackMessage = FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];
        displayMessage(fallbackMessage);
    }
}

function displayMessage(text) {
    const loader = document.getElementById('loader');
    const content = document.getElementById('message-content');
    const dailyText = document.getElementById('daily-text');

    loader.classList.add('hidden');
    content.classList.remove('hidden');
    dailyText.textContent = text;
}

function setupInteractionBtn() {
    const btn = document.getElementById('miss-you-btn');
    const status = document.getElementById('status-message');

    btn.addEventListener('click', () => {
        status.textContent = "Message sent to his heart! ❤️";
        btn.innerHTML = '<i data-lucide="check-circle" class="heart-icon"></i><span>Sent!</span>';
        lucide.createIcons();

        // Visual feedback
        const card = document.getElementById('message-card');
        card.style.transform = 'scale(1.02)';
        setTimeout(() => card.style.transform = 'scale(1)', 200);

        // SEND NOTIFICATION TO YOU (via ntfy.sh)
        fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
            method: 'POST',
            body: "Malu misses you too! ❤️ Click to see the app.",
            headers: {
                'Click': window.location.href,
                'Title': 'Message from Malu ❤️'
            }
        }).catch(err => console.error("Error sending notification:", err));

        // PWA Push simulation for HER
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification("A message for Malu", {
                body: "He's thinking about you right now. Click to see what he said.",
                icon: "https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678087-heart-512.png"
            });
        }
    });

}

// --- PWA FEATURES ---

let deferredPrompt;

function setupInstallBanner() {
    const banner = document.getElementById('install-banner');
    const installBtn = document.getElementById('install-btn');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        banner.classList.add('show');
    });

    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                console.log('User accepted install');
            }
            deferredPrompt = null;
            banner.classList.remove('show');
        }
    });
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(reg => {
            console.log('SW Registered', reg);

            // Notification Permission
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        });
    });
}
