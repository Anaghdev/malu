const CACHE_NAME = 'malu-cache-v1';
const ASSETS = [
    'index.html',
    'style.css',
    'app.js',
    'manifest.json',
    'https://unpkg.com/lucide@latest',
    'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// Push Notification Event Listener
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { title: "Thought for Malu", body: "Check your messages ❤️" };

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678087-heart-512.png',
            badge: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678087-heart-512.png'
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('index.html')
    );
});
