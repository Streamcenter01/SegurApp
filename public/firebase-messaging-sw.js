// Import Firebase scripts for Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

let isInitialized = false;

async function getMessagingInstance() {
  if (isInitialized) {
    return firebase.messaging();
  }
  
  try {
    const response = await fetch('/firebase-applet-config.json');
    const config = await response.json();
    firebase.initializeApp(config);
    isInitialized = true;
    return firebase.messaging();
  } catch (error) {
    console.error('Failed to initialize Firebase in Service Worker:', error);
    // Fallback initialize with hardcoded client credentials
    const fallbackConfig = {
      projectId: "gen-lang-client-0804351449",
      appId: "1:566174451047:web:46c95cb585f2871a1b9bc2",
      apiKey: "AIzaSyCYu6ERZ2WVkXPVLIFIc-dTxkqP944pNu8",
      authDomain: "gen-lang-client-0804351449.firebaseapp.com",
      messagingSenderId: "566174451047"
    };
    firebase.initializeApp(fallbackConfig);
    isInitialized = true;
    return firebase.messaging();
  }
}

// Background push notification listener
self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      await getMessagingInstance();
      let payload;
      try {
        payload = event.data ? event.data.json() : null;
      } catch (e) {
        payload = { 
          notification: { 
            title: "SegurApp", 
            body: event.data ? event.data.text() : "Nueva notificación de tu viaje" 
          } 
        };
      }
      
      if (payload && payload.notification) {
        const title = payload.notification.title || "SegurApp Notificación";
        const options = {
          body: payload.notification.body || "Tienes una actualización de tu recorrido.",
          icon: payload.notification.image || "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=256",
          badge: "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=128",
          data: payload.data || {}
        };
        await self.registration.showNotification(title, options);
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
