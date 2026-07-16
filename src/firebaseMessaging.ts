import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import firebaseConfig from '../firebase-applet-config.json';

// Standard VAPID public key placeholder (Users can customize this in the settings menu)
export const DEFAULT_VAPID_KEY = "BDHjWreUu5-Pq2wZzV_8-X6X9k-j4o8r-K0n9vD-WpS_O1K9sR5T0Y_m";

/**
 * Request desktop/mobile notification permissions
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn("This browser does not support browser Notifications.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (error) {
    console.error("Error requesting browser notification permission:", error);
    return false;
  }
}

/**
 * Triggers a standard local browser notification
 */
export function showLocalNotification(title: string, options?: NotificationOptions) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      const defaultOptions: NotificationOptions = {
        icon: "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=256",
        badge: "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=128",
        ...options
      };
      new Notification(title, defaultOptions);
    } catch (e) {
      console.warn("Failed to fire browser Notification (might be on standard sandboxed browser):", e);
    }
  }
}

/**
 * Initialize FCM, registers Service Worker, and retrieve FCM token
 */
export async function initFcmAndGetToken(userId: string, customVapidKey?: string): Promise<string | null> {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("Firebase Messaging (FCM) is not supported in this browser environment.");
      return null;
    }

    if (!db || !auth) {
      console.warn("Firebase or Firestore is not fully initialized.");
      return null;
    }

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const messaging = getMessaging(app);

    // Request permissions
    const granted = await requestNotificationPermission();
    if (!granted) {
      console.warn("Notification permission was denied by the user.");
      return null;
    }

    // Register the FCM service worker dynamically from Vite
    let registration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log("FCM Service Worker registered successfully:", registration);
      } catch (swErr) {
        console.warn("Could not register service worker (sandboxed iframe or localhost restriction):", swErr);
      }
    }

    // Retrieve FCM token
    const token = await getToken(messaging, {
      vapidKey: customVapidKey || DEFAULT_VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log("FCM Registration Token generated:", token);
      // Save FCM token to user document
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { fcmToken: token });
      return token;
    } else {
      console.warn("No registration token available. Check your push settings.");
      return null;
    }
  } catch (error) {
    console.error("Error setting up FCM / fetching token:", error);
    return null;
  }
}

/**
 * Listen for FCM messages while app is in the foreground
 */
export async function setupForegroundFcmListener(onMessageCallback: (payload: any) => void) {
  try {
    const supported = await isSupported();
    if (!supported) return null;

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const messaging = getMessaging(app);

    return onMessage(messaging, (payload) => {
      console.log("Foreground FCM message received:", payload);
      onMessageCallback(payload);
    });
  } catch (error) {
    console.error("Error in foreground messaging setup:", error);
    return null;
  }
}
