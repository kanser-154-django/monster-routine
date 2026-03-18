// Monster Routine — Service Worker
// Handles background notifications + offline caching

const CACHE_NAME = 'monster-routine-v4';
const CACHE_FILES = ['./', './index.html'];

// ── INSTALL: cache the app shell ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_FILES))
  );
  self.skipWaiting();
});

// ── ACTIVATE: clean old caches ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH: network first, cache as fallback ──
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// ── MESSAGE: receive schedule commands from the app ──
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATIONS') {
    scheduleFromClient(e.data);
  }
  if (e.data && e.data.type === 'CANCEL_NOTIFICATIONS') {
    clearScheduled();
  }
});

// ── NOTIFICATION CLICK: open the app ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow('./');
    })
  );
});

// ── SCHEDULED ALARM STORAGE ──
let scheduledTimers = [];

function clearScheduled() {
  scheduledTimers.forEach(id => clearTimeout(id));
  scheduledTimers = [];
}

function scheduleFromClient(data) {
  clearScheduled();
  const { alarms, day, workout } = data;
  const now = new Date();

  const messages = {
    wake:   { title: '🌅 Wake Up — Monster Routine',      body: `Good morning! Today is ${day}. Schedule is ready. Rise up! 🔥` },
    gym:    { title: '💪 Gym in 10 Minutes',               body: `${day} — ${workout}. Get your pre-workout and go! 🏋️` },
    german: { title: '🇩🇪 Deutsch in 5 Minuten',          body: 'German session starts at 11:00 AM. Open Monster Routine. Viel Erfolg!' },
    cat:    { title: '📚 CAT Study — Starting Now',        body: 'CAT prep at 12:00 PM. Close all distractions. Focus mode ON. 🎯' },
    night:  { title: '🌑 End of Day — Log Your Progress',  body: 'How was today? Open Monster Routine → Progress tab → journal and habits. 📖' },
  };

  alarms.forEach(alarm => {
    const fireTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), alarm.hour, alarm.min, 0);
    const msUntil = fireTime.getTime() - now.getTime();
    if (msUntil > 0 && msUntil < 24 * 60 * 60 * 1000) {
      const msg = messages[alarm.id] || { title: alarm.title, body: 'Time to check Monster Routine!' };
      const id = setTimeout(() => {
        self.registration.showNotification(msg.title, {
          body: msg.body,
          icon: './icon-192.png',
          badge: './icon-96.png',
          tag: 'monster-' + alarm.id,
          renotify: true,
          requireInteraction: alarm.id === 'wake' || alarm.id === 'gym',
          data: { url: './' },
          actions: [
            { action: 'open', title: 'Open App' },
            { action: 'dismiss', title: 'Dismiss' },
          ],
        });
      }, msUntil);
      scheduledTimers.push(id);
    }
  });
}

// ── NOTIFICATION ACTION ──
self.addEventListener('notificationclose', () => {});
