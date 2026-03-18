// Monster Routine — Service Worker v4
const CACHE_NAME = 'monster-routine-v4';
const CACHE_FILES = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATIONS') scheduleFromClient(e.data);
  if (e.data && e.data.type === 'CANCEL_NOTIFICATIONS') clearScheduled();
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow('./');
    })
  );
});

let scheduledTimers = [];
function clearScheduled() { scheduledTimers.forEach(id => clearTimeout(id)); scheduledTimers = []; }

function scheduleFromClient(data) {
  clearScheduled();
  const { alarms, day, workout } = data;
  const now = new Date();
  const messages = {
    wake:   { title: '🌅 Wake Up — Monster Routine', body: `Good morning! Today is ${day}. Rise up! 🔥` },
    gym:    { title: '💪 Gym in 10 Minutes', body: `${day} — ${workout}. Let's go! 🏋️` },
    german: { title: '🇩🇪 Deutsch in 5 Minuten', body: 'German session starts now. Viel Erfolg!' },
    cat:    { title: '📚 CAT Study — Starting Now', body: 'Focus mode ON. 🎯' },
    night:  { title: '🌑 End of Day — Log Your Progress', body: 'Open Monster Routine → Progress tab. 📖' },
  };
  alarms.forEach(alarm => {
    const fireTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), alarm.hour, alarm.min, 0);
    const msUntil = fireTime.getTime() - now.getTime();
    if (msUntil > 0 && msUntil < 24 * 60 * 60 * 1000) {
      const msg = messages[alarm.id] || { title: alarm.title, body: 'Time to check Monster Routine!' };
      const id = setTimeout(() => {
        self.registration.showNotification(msg.title, {
          body: msg.body, icon: './icon-192.png', badge: './icon-192.png',
          tag: 'monster-' + alarm.id, renotify: true,
          requireInteraction: alarm.id === 'wake' || alarm.id === 'gym',
          actions: [{ action: 'open', title: 'Open App' }, { action: 'dismiss', title: 'Dismiss' }],
        });
      }, msUntil);
      scheduledTimers.push(id);
    }
  });
}
self.addEventListener('notificationclose', () => {});
