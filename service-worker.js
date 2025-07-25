self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('cashbook-v1').then(cache => cache.addAll([
            '/',
            '/index.html',
            '/css/style.css',
            '/js/pwa.js',
            '/js/i18n.js',
            '/js/utils.js',
            '/lang/en.js',
            '/lang/bn.js',
            '/firebase-config.js',
            '/manifest.json',
            '/assets/icons/icon.svg'
        ]))
    );
});
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});
