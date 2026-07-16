import { useState, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bike, 
  User, 
  MapPin, 
  Sliders, 
  Phone, 
  Clock, 
  Camera, 
  Zap, 
  Wrench, 
  PhoneCall, 
  RefreshCw,
  Compass, 
  Trash2, 
  Check,
  Server,
  CloudLightning,
  AlertCircle,
  Calendar,
  Plus,
  Bell,
  BellRing,
  Sun,
  Moon,
  LogOut,
  Sparkles,
  Send,
  X,
  MessageSquare
} from "lucide-react";
import { 
  isFirebaseConfigured, 
  db, 
  auth, 
  handleFirestoreError, 
  OperationType 
} from "./firebase";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  updateDoc
} from "firebase/firestore";
import { UserProfile, Recorrido, ContactoConfianza, ViajeProgramado } from "./types";
import { 
  initFcmAndGetToken, 
  setupForegroundFcmListener, 
  requestNotificationPermission, 
  showLocalNotification 
} from "./firebaseMessaging";
import GoogleMapsRadar from "./components/GoogleMapsRadar";

const WHATSAPP_DESTINO = "573189882787";

// Default profile image (motorcycle helmet stylized graphic placeholder)
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1622180203374-9524a54b734d?auto=format&fit=crop&q=80&w=200";

export default function App() {
  // Navigation: 'login' | 'registro' | 'home'
  const [pantalla, setPantalla] = useState<'login' | 'registro' | 'home'>('login');
  
  // User profile state
  const [usuario, setUsuario] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  // Active Role and Forms states
  const [loginRole, setLoginRole] = useState<'usuario' | 'conductor'>('usuario');
  const [registroRole, setRegistroRole] = useState<'usuario' | 'conductor'>('usuario');

  // Forms states
  const [loginTelefono, setLoginTelefono] = useState("");
  const [registroNombre, setRegistroNombre] = useState("");
  const [registroTelefono, setRegistroTelefono] = useState("");
  const [registroFoto, setRegistroFoto] = useState("");

  // Conductor unique details
  const [registroMoto, setRegistroMoto] = useState("");
  const [registroPlaca, setRegistroPlaca] = useState("");
  const [registroPinSeguridad, setRegistroPinSeguridad] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [registroTiempoEstimado, setRegistroTiempoEstimado] = useState("3 a 5 minutos");
  const [registroCalificacion, setRegistroCalificacion] = useState("4.9 ★");

  const [isEditMode, setIsEditMode] = useState(false);

  // Active multi-user/simulation lists
  const [recorridosActivos, setRecorridosActivos] = useState<Recorrido[]>([]);
  const [conductoresCercanos, setConductoresCercanos] = useState<any[]>([
    { id: "sim-1", nombre: "Jorge Valenzuela", moto: "Suzuki Gixxer 150", placa: "ABC-12D", latOffset: 0.005, lonOffset: -0.004 },
    { id: "sim-2", nombre: "Andrés Rojas", moto: "Honda CB190R", placa: "HJK-98F", latOffset: -0.003, lonOffset: 0.006 },
    { id: "sim-3", nombre: "Diego Ortiz", moto: "KTM Duke 200", placa: "PLM-45E", latOffset: 0.002, lonOffset: 0.003 },
  ]);

  // Route & Booking parameters
  const [reservaNotas, setReservaNotas] = useState("");
  const [origenManual, setOrigenManual] = useState("");
  const [showOrigenManual, setShowOrigenManual] = useState(false);
  const [conductorOnline, setConductorOnline] = useState(true);

  // Geolocation state
  const [datosUbicacionActual, setDatosUbicacionActual] = useState("Buscando satélites...");
  const [coordenadasGoogleMaps, setCoordenadasGoogleMaps] = useState("");
  const [ubicacionListo, setUbicacionListo] = useState(false);
  const [solicitandoGPS, setSolicitandoGPS] = useState(false);

  // Custom diagnostic modal state
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertText, setAlertText] = useState("");
  const [alertTitle, setAlertTitle] = useState("SISTEMA CHECK // SEGURAPP");
  const [alertCallback, setAlertCallback] = useState<(() => void) | null>(null);

  // Reference for file upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Contacts Integration states
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [todosLosContactos, setTodosLosContactos] = useState<ContactoConfianza[]>([]);
  const [contactosCargados, setContactosCargados] = useState(false);
  const [cargandoContactos, setCargandoContactos] = useState(false);
  const [busquedaContacto, setBusquedaContacto] = useState("");
  const [contactosSeleccionados, setContactosSeleccionados] = useState<ContactoConfianza[]>([]);

  // Google Calendar Integration states
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState<any[]>([]);
  const [cargandoCalendario, setCargandoCalendario] = useState(false);
  const [calendarioCargado, setCalendarioCargado] = useState(false);
  const [fechaAgenda, setFechaAgenda] = useState("");
  const [horaAgenda, setHoraAgenda] = useState("");
  const [showAgendarViaje, setShowAgendarViaje] = useState(false);
  const [agendandoCalendario, setAgendandoCalendario] = useState(false);
  const [viajesProgramadosGoogle, setViajesProgramadosGoogle] = useState<ViajeProgramado[]>([]);

  // State for Driver Pickup Confirmation Dialog
  const [showRecogidaDialog, setShowRecogidaDialog] = useState(false);
  const [conductorRecogida, setConductorRecogida] = useState({
    nombre: "Carlos Mendoza (Piloto Verificado)",
    calificacion: "4.9 ★",
    telefono: "3189882787",
    foto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256",
    moto: "Yamaha FZ25 (Negra Mate)",
    placa: "XYZ-45G",
    tiempoEstimado: "3 a 5 minutos",
    pinSeguridad: "7841"
  });

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("segurapp_theme");
      return saved ? saved === "dark" : true;
    }
    return true;
  });

  // Sync theme class to documentElement
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.remove("light");
      localStorage.setItem("segurapp_theme", "dark");
    } else {
      root.classList.add("light");
      localStorage.setItem("segurapp_theme", "light");
    }
  }, [isDarkMode]);

  // Passenger ride state change listener (Driver acceptance or Arrival)
  const [lastNotifiedRideId, setLastNotifiedRideId] = useState<string | null>(null);
  const [lastNotifiedArrivalId, setLastNotifiedArrivalId] = useState<string | null>(null);

  // Passenger rating features
  const [recorridoCalificar, setRecorridoCalificar] = useState<Recorrido | null>(null);
  const [calificacionEstrellas, setCalificacionEstrellas] = useState<number>(5);
  const [comentarioRating, setComentarioRating] = useState<string>("");
  const [enviandoCalificacion, setEnviandoCalificacion] = useState<boolean>(false);
  const previousActiveRideIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!usuario || usuario.role !== 'usuario') {
      previousActiveRideIdRef.current = null;
      return;
    }

    const currentActiveRide = recorridosActivos.find(
      r => r.telefono === usuario.telefono && 
      r.status !== 'completed' && 
      r.status !== 'cancelled'
    );

    if (currentActiveRide) {
      previousActiveRideIdRef.current = currentActiveRide.id;
    } else if (previousActiveRideIdRef.current) {
      // The active ride is no longer active. Let's check if it was completed!
      const lastActiveId = previousActiveRideIdRef.current;
      const finishedRide = recorridosActivos.find(r => r.id === lastActiveId);
      if (finishedRide && finishedRide.status === 'completed') {
        // If it was completed, and we have a driver assigned, and it wasn't rated yet, prompt for rating!
        if (finishedRide.conductorNombre && !finishedRide.calificacionPasajero) {
          setRecorridoCalificar(finishedRide);
          setCalificacionEstrellas(5);
          setComentarioRating("");
        }
      }
      previousActiveRideIdRef.current = null;
    }
  }, [recorridosActivos, usuario]);

  const guardarCalificacionConductor = async () => {
    if (!recorridoCalificar) return;
    setEnviandoCalificacion(true);

    try {
      // 1. Update local state & localStorage
      const nuevas = recorridosActivos.map(r => {
        if (r.id === recorridoCalificar.id) {
          return {
            ...r,
            calificacionPasajero: calificacionEstrellas,
            comentarioPasajero: comentarioRating,
            calificadoAt: new Date().toISOString()
          };
        }
        return r;
      });
      setRecorridosActivos(nuevas);
      localStorage.setItem("segurapp_active_rides", JSON.stringify(nuevas));

      window.dispatchEvent(new StorageEvent("storage", {
        key: "segurapp_active_rides",
        newValue: JSON.stringify(nuevas)
      }));

      // 2. Update Firestore if connected
      if (isFirebaseConfigured && db) {
        const rideRef = doc(db, "recorridos", recorridoCalificar.id);
        await updateDoc(rideRef, {
          calificacionPasajero: calificacionEstrellas,
          comentarioPasajero: comentarioRating,
          calificadoAt: new Date().toISOString()
        });

        // Optional: Update the driver's profile in the 'users' collection with calculated average
        const driverId = recorridoCalificar.conductorId;
        if (driverId && !driverId.startsWith("sim-")) {
          const driverRides = nuevas.filter(r => r.conductorId === driverId && r.status === 'completed');
          const ratedRides = driverRides.filter(r => r.calificacionPasajero !== undefined);
          
          let totalEstrellas = calificacionEstrellas;
          let count = 1;
          
          ratedRides.forEach(r => {
            if (r.id !== recorridoCalificar.id && r.calificacionPasajero) {
              totalEstrellas += r.calificacionPasajero;
              count++;
            }
          });
          
          const average = (totalEstrellas / count).toFixed(1);
          const ratingString = `${average} ★`;

          const userRef = doc(db, "users", driverId);
          await updateDoc(userRef, {
            calificacion: ratingString
          }).catch(err => {
            console.warn("Could not update driver's user profile directly (they might be logged in under a phone number or different doc ID):", err);
          });
        }
      }

      mostrarAlertaCustom(
        `⭐ ¡Gracias por calificar a tu conductor! Calificación de ${calificacionEstrellas} estrellas registrada con éxito.`,
        null,
        "CALIFICACIÓN REGISTRADA"
      );
      
      setRecorridoCalificar(null);
      setCalificacionEstrellas(5);
      setComentarioRating("");
    } catch (error) {
      console.error("Error saving rating:", error);
      mostrarAlertaCustom("⚠️ Falla al guardar la calificación. Intenta de nuevo.", null, "ERROR DE ALMACENAMIENTO");
    } finally {
      setEnviandoCalificacion(false);
    }
  };

  // Gemini AI Assistant States
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>(() => {
    const saved = localStorage.getItem("segurapp_ai_messages");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn("Could not load AI messages:", e);
      }
    }
    return [
      { role: 'assistant', content: '¡Hola! Soy SegurApp AI, tu Asistente de Seguridad Inteligente para Neiva. 🛡️✨\n\n¿Tienes preguntas sobre una ruta segura, consejos de prevención, o cómo usar la app? Cuéntame y te daré los mejores consejos para un viaje seguro.' }
    ];
  });
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Save AI Chat history to localStorage
  useEffect(() => {
    localStorage.setItem("segurapp_ai_messages", JSON.stringify(aiMessages));
  }, [aiMessages]);

  // Scroll to bottom when AI messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, showAiAssistant]);

  // Call Gemini API Route on the Express server
  const enviarMensajeAI = async (messageText?: string) => {
    const textToSend = messageText || aiInput;
    if (!textToSend.trim() || aiLoading) return;

    const newMessages = [...aiMessages, { role: 'user' as const, content: textToSend }];
    setAiMessages(newMessages);
    if (!messageText) {
      setAiInput("");
    }
    setAiLoading(true);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        throw new Error("Error en respuesta del servidor de IA");
      }

      const data = await response.json();
      setAiMessages([...newMessages, { role: 'assistant' as const, content: data.text || "Lo siento, no pude procesar la consulta." }]);
    } catch (error) {
      console.error("Error calling server Gemini API:", error);
      setAiMessages([
        ...newMessages,
        {
          role: 'assistant' as const,
          content: "⚠️ Lo siento, experimenté una dificultad técnica al conectarme con mi núcleo AI en Neiva. Por favor verifica tu conexión e intenta de nuevo."
        }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const limpiarChatAI = () => {
    setAiMessages([
      { role: 'assistant', content: '¡Hola de nuevo! Soy SegurApp AI. 🛡️✨ ¿En qué puedo ayudarte para que tu recorrido por Neiva sea lo más seguro posible?' }
    ]);
  };

  useEffect(() => {
    if (!usuario || usuario.role === 'conductor') return;
    
    const myRide = recorridosActivos.find(
      r => r.telefono === usuario.telefono && 
      r.status !== 'completed' && 
      r.status !== 'cancelled'
    );

    if (myRide) {
      // 1. Driver accepted the ride
      if (myRide.status === 'accepted') {
        if (myRide.conductorNombre && (!conductorRecogida.nombre || conductorRecogida.nombre !== myRide.conductorNombre)) {
          setConductorRecogida({
            nombre: myRide.conductorNombre,
            calificacion: "4.9 ★",
            telefono: myRide.conductorTelefono || "",
            foto: myRide.conductorFoto || DEFAULT_AVATAR,
            moto: myRide.conductorMoto || "Moto de Seguridad",
            placa: myRide.conductorPlaca || "SN-123",
            tiempoEstimado: myRide.conductorTiempoEstimado || "3 a 5 minutos",
            pinSeguridad: myRide.conductorPinSeguridad || "0000"
          });
        }

        // Pop up the assignment dialog if not open yet and we haven't notified for this ride assignment
        if (!showRecogidaDialog && lastNotifiedRideId !== myRide.id) {
          setShowRecogidaDialog(true);
          setLastNotifiedRideId(myRide.id);
        }
      }

      // 2. Driver arrived ("conductorAfuera" is true)
      if (myRide.conductorAfuera && lastNotifiedArrivalId !== myRide.id) {
        setLastNotifiedArrivalId(myRide.id);
        
        // Highlight arrival with a high-visibility popup alert
        mostrarAlertaCustom(
          `🚨 ¡TU PILOTO YA ESTÁ AFUERA!\n\n${myRide.conductorNombre || 'Tu piloto asignado'} ha llegado al punto de recogida en la moto ${myRide.conductorMoto || ''} de placa [${myRide.conductorPlaca || ''}].\n\n🛡️ PIN de Confirmación Obligatorio: [${myRide.conductorPinSeguridad || ''}]\n\nPor favor, sal con precaución, verifica los datos del piloto antes de subirte y compártele el PIN de seguridad para iniciar el viaje.`,
          () => {
            // Re-open dialogue so they can easily confirm boarding or call
            setShowRecogidaDialog(true);
          },
          "🚨 PILOTO EN EL ORIGEN"
        );

        // Try native browser notification too if allowed
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          try {
            new Notification("🚨 SegurApp: ¡Tu piloto está afuera!", {
              body: `${myRide.conductorNombre || 'Tu piloto'} te espera afuera. Placa: ${myRide.conductorPlaca}. PIN: ${myRide.conductorPinSeguridad}`,
              icon: myRide.conductorFoto || "https://images.unsplash.com/photo-1622180203374-9524a54b734d?auto=format&fit=crop&q=80&w=128"
            });
          } catch (e) {
            console.error(e);
          }
        }
      }
    } else {
      // No active ride, reset notification flags if ride is cleared
      setLastNotifiedRideId(null);
      setLastNotifiedArrivalId(null);
    }
  }, [recorridosActivos, usuario, showRecogidaDialog, lastNotifiedRideId, lastNotifiedArrivalId]);

  // Listen for Firebase Auth state changes if Firebase is configured
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        setFirebaseUser(fbUser);
        if (fbUser) {
          // Attempt to pull their existing profile from Firestore
          const docPath = `users/${fbUser.uid}`;
          try {
            if (db) {
              const userSnap = await getDoc(doc(db, "users", fbUser.uid));
              if (userSnap.exists()) {
                const data = userSnap.data() as UserProfile;
                const profile: UserProfile = {
                  nombre: data.nombre || fbUser.displayName || "Usuario de Google",
                  telefono: data.telefono || "",
                  foto: data.foto || fbUser.photoURL || DEFAULT_AVATAR,
                  uid: fbUser.uid
                };
                setUsuario(profile);
                setRegistroNombre(profile.nombre);
                setRegistroTelefono(profile.telefono);
                setRegistroFoto(profile.foto);
                
                if (profile.telefono) {
                  setPantalla('home');
                } else {
                  // Must complete phone profile
                  setIsEditMode(false);
                  setPantalla('registro');
                  mostrarAlertaCustom("👋 ¡Casi listo! Por favor, complementa tu número de WhatsApp para completar el perfil.", null, "PERFIL INCOMPLETO");
                }
              } else {
                // No Firestore document exists yet
                const profile: UserProfile = {
                  nombre: fbUser.displayName || "",
                  telefono: "",
                  foto: fbUser.photoURL || DEFAULT_AVATAR,
                  uid: fbUser.uid
                };
                setUsuario(profile);
                setRegistroNombre(profile.nombre);
                setRegistroTelefono("");
                setRegistroFoto(profile.foto);
                setIsEditMode(false);
                setPantalla('registro');
              }
            }
          } catch (error) {
            const isOffline = String(error).toLowerCase().includes("offline") || String(error).toLowerCase().includes("network") || String(error).toLowerCase().includes("failed-precondition");
            if (isOffline) {
              console.warn("Firestore client is offline or loading from cache. Fallback to localStorage...");
              const savedUser = localStorage.getItem("segurapp_usuario");
              if (savedUser) {
                try {
                  const parsed = JSON.parse(savedUser) as UserProfile;
                  setUsuario(parsed);
                  setRegistroNombre(parsed.nombre);
                  setRegistroTelefono(parsed.telefono);
                  setRegistroFoto(parsed.foto);
                  setRegistroRole(parsed.role || 'usuario');
                  if (parsed.role === 'conductor') {
                    setRegistroMoto(parsed.moto || "");
                    setRegistroPlaca(parsed.placa || "");
                    setRegistroPinSeguridad(parsed.pinSeguridad || "");
                    setRegistroTiempoEstimado(parsed.tiempoEstimado || "3 a 5 minutos");
                    setRegistroCalificacion(parsed.calificacion || "5.0 ★");
                  }
                  setPantalla('home');
                } catch (e) {
                  console.error("Error setting fallback user data:", e);
                }
              }
            } else {
              handleFirestoreError(error, OperationType.GET, docPath);
            }
          }
        }
      });
      return () => unsubscribe();
    }
  }, []);

  // Initialize FCM Token and Foreground Listener once authenticated
  useEffect(() => {
    if (isFirebaseConfigured && auth && firebaseUser) {
      // Get FCM token
      initFcmAndGetToken(firebaseUser.uid).catch((err) => {
        console.warn("FCM token request skipped or unsupported:", err);
      });

      // Listen for foreground FCM notifications
      let unsubscribeFore: (() => void) | null = null;
      setupForegroundFcmListener((payload) => {
        if (payload && payload.notification) {
          mostrarAlertaCustom(
            payload.notification.body || "Actualización de tu viaje",
            null,
            payload.notification.title || "NOTIFICACIÓN"
          );
        }
      }).then((unsub) => {
        if (unsub) unsubscribeFore = unsub;
      }).catch(console.error);

      return () => {
        if (unsubscribeFore) unsubscribeFore();
      };
    }
  }, [firebaseUser]);

  // Real-time Firestore synchronizer for Recorridos
  useEffect(() => {
    if (isFirebaseConfigured && db && firebaseUser) {
      const q = query(
        collection(db, "recorridos"),
        orderBy("createdAt", "desc"),
        limit(50)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const ridesList: Recorrido[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          ridesList.push({
            id: docSnap.id,
            usuarioId: data.usuarioId || "",
            nombre: data.nombre || "",
            telefono: data.telefono || "",
            dePartida: data.dePartida || "",
            coordenadasGoogleMaps: data.coordenadasGoogleMaps || "",
            notas: data.notas || "",
            status: data.status || "pending",
            createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : new Date().toISOString(),
            conductorId: data.conductorId,
            conductorNombre: data.conductorNombre,
            conductorTelefono: data.conductorTelefono,
            conductorFoto: data.conductorFoto,
            conductorMoto: data.conductorMoto,
            conductorPlaca: data.conductorPlaca,
            conductorPinSeguridad: data.conductorPinSeguridad,
            conductorTiempoEstimado: data.conductorTiempoEstimado,
            conductorAfuera: data.conductorAfuera,
            driverLatOffset: data.driverLatOffset,
            driverLonOffset: data.driverLonOffset,
            passengerLat: data.passengerLat,
            passengerLon: data.passengerLon,
          });
        });

        setRecorridosActivos(ridesList);
        localStorage.setItem("segurapp_active_rides", JSON.stringify(ridesList));

        // Sync with standard storage event for open tabs on the same browser
        window.dispatchEvent(new StorageEvent("storage", {
          key: "segurapp_active_rides",
          newValue: JSON.stringify(ridesList)
        }));
      }, (error) => {
        console.error("Firestore real-time sync failed:", error);
      });

      return () => unsubscribe();
    }
  }, [firebaseUser]);

  // Load user from localStorage on mount as backup or for LocalStorage mode and sync active rides across tabs
  useEffect(() => {
    // 1. Load active rides initially
    const savedRides = localStorage.getItem("segurapp_active_rides");
    if (savedRides) {
      try {
        setRecorridosActivos(JSON.parse(savedRides));
      } catch (err) {
        console.error("Error loading initial rides", err);
      }
    }

    // 2. Multi-tab listener for active rides and profile sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "segurapp_active_rides") {
        if (e.newValue) {
          try {
            setRecorridosActivos(JSON.parse(e.newValue));
          } catch (err) {
            console.error("Error syncing rides across tabs", err);
          }
        } else {
          setRecorridosActivos([]);
        }
      }
      if (e.key === "segurapp_usuario") {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue) as UserProfile;
            setUsuario(parsed);
          } catch (err) {
            console.error("Error syncing profile across tabs", err);
          }
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // 3. Load user from localStorage
    const savedUser = localStorage.getItem("segurapp_usuario");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as UserProfile;
        // Only override if Firebase is not configured or not yet signed in
        if (!isFirebaseConfigured || !auth?.currentUser) {
          setUsuario(parsed);
          setRegistroNombre(parsed.nombre);
          setRegistroTelefono(parsed.telefono);
          setRegistroFoto(parsed.foto);
          setRegistroRole(parsed.role || 'usuario');
          if (parsed.role === 'conductor') {
            setRegistroMoto(parsed.moto || "");
            setRegistroPlaca(parsed.placa || "");
            setRegistroPinSeguridad(parsed.pinSeguridad || "");
            setRegistroTiempoEstimado(parsed.tiempoEstimado || "3 a 5 minutos");
            setRegistroCalificacion(parsed.calificacion || "5.0 ★");
          }
          setPantalla('home');
        }
      } catch (e) {
        console.error("Error parsing saved user", e);
      }
    }

    const savedTrusted = localStorage.getItem("segurapp_contactos_confianza");
    if (savedTrusted) {
      try {
        setContactosSeleccionados(JSON.parse(savedTrusted));
      } catch (e) {
        console.error("Error loading trusted contacts", e);
      }
    }

    const savedViajes = localStorage.getItem("segurapp_viajes_programados");
    if (savedViajes) {
      try {
        setViajesProgramadosGoogle(JSON.parse(savedViajes));
      } catch (e) {
        console.error("Error loading scheduled trips", e);
      }
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(console.error);
      }
    }

    // Start geolocation search on load
    solicitarGeolocalizacion();

    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Interval timer to check for upcoming trip reminders (10 minutes before)
  useEffect(() => {
    const interval = setInterval(() => {
      const ahora = new Date();
      let huboCambio = false;
      const nuevosViajes = viajesProgramadosGoogle.map((viaje) => {
        if (viaje.notificado) return viaje;

        const horaViaje = new Date(viaje.fechaHora);
        const diffMs = horaViaje.getTime() - ahora.getTime();
        const diffMin = diffMs / (1000 * 60);

        // Auto-mark past trips as notified to keep state clean
        if (diffMin <= 0) {
          huboCambio = true;
          return { ...viaje, notificado: true };
        }

        // Remind if the scheduled ride starts in <= 10.1 minutes
        if (diffMin > 0 && diffMin <= 10.1) {
          huboCambio = true;
          
          // 1. Try Native Web Notification
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              new Notification("🚨 SegurApp: Recorrido Seguro Próximo", {
                body: `¡Viaje listo! Tu recorrido programado "${viaje.titulo}" iniciará en 10 minutos (a las ${horaViaje.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).`,
                icon: "https://images.unsplash.com/photo-1622180203374-9524a54b734d?auto=format&fit=crop&q=80&w=128",
              });
            } catch (e) {
              console.error("Error displaying native notification", e);
            }
          }

          // 2. Beautiful custom premium in-app notification popup
          mostrarAlertaCustom(
            `⏰ RECORDATORIO DE VIAJE SEGURO\n\nTu recorrido programado por Google Calendar está a punto de comenzar.\n\n📅 Viaje: "${viaje.titulo}"\n⏱️ Inicia en 10 minutos (a las ${horaViaje.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).\n📍 Origen: ${viaje.origen || 'Por confirmar'}\n\n🛡️ ¿Todo listo para rodar seguro? Recuerda reportar tu ubicación a tus contactos de confianza.`,
            null,
            "NOTIFICACIÓN DE SEGURIDAD"
          );

          return { ...viaje, notificado: true };
        }
        return viaje;
      });

      if (huboCambio) {
        setViajesProgramadosGoogle(nuevosViajes);
        localStorage.setItem("segurapp_viajes_programados", JSON.stringify(nuevosViajes));
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [viajesProgramadosGoogle]);

  // Sync geolocation
  const solicitarGeolocalizacion = () => {
    setSolicitandoGPS(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const mapLink = `https://www.google.com/maps?q=${lat},${lon}`;
          setCoordenadasGoogleMaps(mapLink);
          setDatosUbicacionActual(`Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}`);
          setUbicacionListo(true);
          setSolicitandoGPS(false);
        },
        (error) => {
          console.warn("Error getting geolocation", error);
          setDatosUbicacionActual("Ubicación manual o imprecisa.");
          setCoordenadasGoogleMaps("");
          setUbicacionListo(false);
          setSolicitandoGPS(false);
          setShowOrigenManual(true);
        },
        { enableHighAccuracy: true, timeout: 12000 }
      );
    } else {
      setDatosUbicacionActual("GPS no soportado en este dispositivo.");
      setUbicacionListo(false);
      setSolicitandoGPS(false);
      setShowOrigenManual(true);
    }
  };

  // Helper to open our premium custom motorcycle alert
  const mostrarAlertaCustom = (text: string, callback: (() => void) | null = null, title = "SISTEMA CHECK // SEGURAPP") => {
    setAlertTitle(title);
    setAlertText(text);
    setAlertCallback(() => callback);
    setAlertOpen(true);
  };

  const cerrarAlertaCustom = () => {
    setAlertOpen(false);
    if (alertCallback) {
      alertCallback();
      setAlertCallback(null);
    }
  };

  // Firebase Google Login
  const iniciarSesionGoogle = async () => {
    if (!isFirebaseConfigured || !auth) {
      mostrarAlertaCustom("ℹ️ Firebase no está totalmente configurado. Ingresa tu teléfono para continuar con el modo local seguro.", null, "SOPORTE LOCAL ACTIVO");
      return;
    }
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/contacts.readonly");
    provider.addScope("https://www.googleapis.com/auth/contacts.other.readonly");
    provider.addScope("https://www.googleapis.com/auth/user.phonenumbers.read");
    provider.addScope("https://www.googleapis.com/auth/calendar");
    provider.addScope("https://www.googleapis.com/auth/calendar.events");
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
        cargarGoogleContactos(credential.accessToken);
        cargarGoogleCalendario(credential.accessToken);
      }
    } catch (error) {
      console.error("Google sign in error", error);
      mostrarAlertaCustom("⚠️ Falla de autenticación satelital con Google. Intente nuevamente.");
    }
  };

  const cargarGoogleContactos = async (token: string) => {
    setCargandoContactos(true);
    try {
      const response = await fetch(
        "https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers,photos&pageSize=150",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) {
        throw new Error(`Gapi error: ${response.status}`);
      }
      const data = await response.json();
      const rawConnections = data.connections || [];
      const parseados: ContactoConfianza[] = rawConnections
        .map((person: any) => {
          const nombre = person.names?.[0]?.displayName || "Sin Nombre";
          const telefonoRaw = person.phoneNumbers?.[0]?.value || "";
          const telefono = telefonoRaw.replace(/[^\d+]/g, "");
          const foto = person.photos?.[0]?.url || "";
          if (!telefono) return null;
          return { nombre, telefono, foto };
        })
        .filter(Boolean) as ContactoConfianza[];

      setTodosLosContactos(parseados);
      setContactosCargados(true);
      setGoogleAccessToken(token);
    } catch (error) {
      console.error("Error loading contacts from Google API:", error);
      mostrarAlertaCustom(
        "⚠️ No se pudieron cargar tus contactos de Google. Por favor, vuelve a vincular tu cuenta.",
        null,
        "FALLA SATELITAL DE CONTACTOS"
      );
    } finally {
      setCargandoContactos(false);
    }
  };

  const cargarGoogleCalendario = async (token: string) => {
    setCargandoCalendario(true);
    try {
      const timeMin = new Date().toISOString();
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=15&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) {
        throw new Error(`Calendar API error: ${response.status}`);
      }
      const data = await response.json();
      const rawEvents = data.items || [];
      const parseados = rawEvents.map((event: any) => ({
        id: event.id,
        titulo: event.summary || "Evento sin título",
        descripcion: event.description || "",
        ubicacion: event.location || "",
        inicio: event.start?.dateTime || event.start?.date || "",
        fin: event.end?.dateTime || event.end?.date || "",
        link: event.htmlLink || "",
      }));
      setGoogleCalendarEvents(parseados);
      setCalendarioCargado(true);

      // Auto-discover and sync SegurApp events created from the integration
      const eventosSegurApp = parseados.filter((ev: any) => 
        (ev.titulo.includes("SegurApp") || ev.descripcion.includes("SegurApp")) && ev.inicio
      );
      
      if (eventosSegurApp.length > 0) {
        setViajesProgramadosGoogle((prev) => {
          const actualizados = [...prev];
          eventosSegurApp.forEach((ev: any) => {
            const existe = actualizados.some(v => v.id === ev.id);
            if (!existe) {
              actualizados.push({
                id: ev.id,
                titulo: ev.titulo,
                fechaHora: ev.inicio,
                origen: ev.ubicacion || "",
                notas: ev.descripcion || "",
                notificado: false
              });
            }
          });
          localStorage.setItem("segurapp_viajes_programados", JSON.stringify(actualizados));
          return actualizados;
        });
      }
    } catch (error) {
      console.error("Error loading Google Calendar events:", error);
      mostrarAlertaCustom(
        "⚠️ No se pudieron cargar los eventos de tu calendario de Google. Por favor, vuelve a vincular tu cuenta.",
        null,
        "FALLA DE CALENDARIO"
      );
    } finally {
      setCargandoCalendario(false);
    }
  };

  const vincularGoogleContacts = async () => {
    if (!isFirebaseConfigured || !auth) {
      mostrarAlertaCustom("ℹ️ Firebase no está configurado. No es posible conectar Google Contacts en modo local offline.", null, "SOPORTE GOOGLE NO ACTIVO");
      return;
    }
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/contacts.readonly");
    provider.addScope("https://www.googleapis.com/auth/contacts.other.readonly");
    provider.addScope("https://www.googleapis.com/auth/user.phonenumbers.read");
    provider.addScope("https://www.googleapis.com/auth/calendar");
    provider.addScope("https://www.googleapis.com/auth/calendar.events");
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
        await cargarGoogleContactos(credential.accessToken);
        await cargarGoogleCalendario(credential.accessToken);
        mostrarAlertaCustom("🛡️ Sincronización exitosa con tus Contactos y Calendario de Google. Ahora puedes gestionarlos en la aplicación.", null, "CONECTIVIDAD COMPLETA");
      } else {
        throw new Error("No access token found");
      }
    } catch (error) {
      console.error("Error syncing Google Contacts:", error);
      mostrarAlertaCustom("⚠️ Falla de autorización satelital para acceder a tus contactos/calendario. Intente nuevamente.", null, "FALLA DE VINCULACIÓN");
    }
  };

  const vincularGoogleCalendar = async () => {
    if (!isFirebaseConfigured || !auth) {
      mostrarAlertaCustom("ℹ️ Firebase no está configurado. No es posible conectar Google Calendar en modo local offline.", null, "SOPORTE GOOGLE NO ACTIVO");
      return;
    }
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/calendar");
    provider.addScope("https://www.googleapis.com/auth/calendar.events");
    provider.addScope("https://www.googleapis.com/auth/contacts.readonly");
    provider.addScope("https://www.googleapis.com/auth/contacts.other.readonly");
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
        await cargarGoogleCalendario(credential.accessToken);
        await cargarGoogleContactos(credential.accessToken);
        mostrarAlertaCustom("📅 ¡Sincronización de Google Calendar exitosa! Puedes planificar y agendar recorridos.", null, "CALENDARIO CONECTADO");
      } else {
        throw new Error("No access token found");
      }
    } catch (error) {
      console.error("Error syncing Google Calendar:", error);
      mostrarAlertaCustom("⚠️ Falla de autorización para acceder a tu Google Calendar. Intente de nuevo.", null, "FALLA DE CONEXIÓN CALENDARIO");
    }
  };

  const agendarRecorridoGoogleCalendar = async (e: FormEvent) => {
    e.preventDefault();
    if (!googleAccessToken) {
      vincularGoogleCalendar();
      return;
    }
    if (!fechaAgenda || !horaAgenda) {
      mostrarAlertaCustom("⚠️ Por favor selecciona la fecha y hora para el recorrido.", null, "CAMPOS INCOMPLETOS");
      return;
    }

    setAgendandoCalendario(true);
    try {
      const startDateTime = new Date(`${fechaAgenda}T${horaAgenda}:00`);
      // Default duration: 45 minutes
      const endDateTime = new Date(startDateTime.getTime() + 45 * 60 * 1000);

      const dePartida = showOrigenManual && origenManual.trim() 
        ? origenManual.trim() 
        : (coordenadasGoogleMaps ? "Ubicación GPS actual" : "Neiva, Huila (Coordinar ubicación exacta)");

      const notas = reservaNotas.trim();
      
      const body = {
        summary: `🚖 SegurApp Recorrido Seguro`,
        location: dePartida,
        description: `Recorrido programado y asegurado con SegurApp Recorridos.\n\n📝 Notas de viaje: ${notas || "Ninguna"}\n📍 Coordenadas de GPS de origen: ${coordenadasGoogleMaps || "No fijadas"}`,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: "America/Bogota",
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: "America/Bogota",
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 30 },
            { method: "email", minutes: 60 }
          ]
        }
      };

      const response = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        throw new Error(`Calendar Event Creation error: ${response.status}`);
      }

      const responseData = await response.json();
      const nuevoViaje: ViajeProgramado = {
        id: responseData.id || `viaje-${Date.now()}`,
        titulo: `🚖 SegurApp Recorrido Seguro`,
        fechaHora: startDateTime.toISOString(),
        origen: dePartida,
        notas: notas,
        notificado: false,
      };

      setViajesProgramadosGoogle((prev) => {
        const nuevos = [nuevoViaje, ...prev.filter(v => v.id !== nuevoViaje.id)];
        localStorage.setItem("segurapp_viajes_programados", JSON.stringify(nuevos));
        return nuevos;
      });

      mostrarAlertaCustom(
        `📅 ¡Tu recorrido ha sido agendado con éxito en tu Google Calendar para el ${fechaAgenda} a las ${horaAgenda}!`,
        null,
        "RECORRIDO AGENDADO"
      );
      
      setFechaAgenda("");
      setHoraAgenda("");
      setShowAgendarViaje(false);
      
      cargarGoogleCalendario(googleAccessToken);
    } catch (error) {
      console.error("Error creating Google Calendar event:", error);
      mostrarAlertaCustom(
        "⚠️ No se pudo agendar el recorrido en tu Google Calendar. Intenta nuevamente.",
        null,
        "FALLA DE CREACIÓN"
      );
    } finally {
      setAgendandoCalendario(false);
    }
  };

  const seleccionarEventoCalendarioParaViaje = (evento: any) => {
    if (!evento.ubicacion) {
      setReservaNotas(`Viaje para: ${evento.titulo}`);
      setShowOrigenManual(true);
      mostrarAlertaCustom(
        `ℹ️ Este evento ("${evento.titulo}") no tiene una ubicación configurada en tu calendario. Se configuraron las notas; por favor escribe el destino manualmente.`,
        null,
        "UBICACIÓN NO DETECTADA"
      );
      return;
    }
    setOrigenManual(evento.ubicacion);
    setShowOrigenManual(true);
    setReservaNotas(`Viaje para: ${evento.titulo}`);
    mostrarAlertaCustom(
      `📍 Se importó el destino "${evento.ubicacion}" para tu evento: "${evento.titulo}". ¡Ahora puedes solicitar tu conductor de confianza!`,
      null,
      "UBICACIÓN IMPORTADA"
    );
  };

  const simularRecordatorioPrueba = () => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().catch(console.error);
    }

    const startSimulated = new Date(Date.now() + 9.5 * 60 * 1000); // 9.5 minutes in the future (within 10 min window)
    
    const viajePrueba: ViajeProgramado = {
      id: `test-${Date.now()}`,
      titulo: "🚖 SegurApp Recorrido de Prueba",
      fechaHora: startSimulated.toISOString(),
      origen: "Neiva, Huila (Coordenadas Satelitales de Prueba)",
      notas: "Simulación de recordatorio seguro de 10 minutos para viaje agendado.",
      notificado: false
    };

    setViajesProgramadosGoogle(prev => {
      const nuevos = [viajePrueba, ...prev.filter(v => !v.id.startsWith("test-"))];
      localStorage.setItem("segurapp_viajes_programados", JSON.stringify(nuevos));
      return nuevos;
    });

    mostrarAlertaCustom(
      "⚡ Simulación Iniciada: Se ha creado un viaje de prueba programado para dentro de 10 minutos (a las " + startSimulated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + "). El satélite de recordatorio local activará la alarma en unos segundos.",
      null,
      "SIMULACIÓN DE ALERTA"
    );
  };

  const importarPerfilGoogle = async () => {
    if (!googleAccessToken) {
      vincularGoogleContacts();
      return;
    }
    try {
      const res = await fetch("https://people.googleapis.com/v1/people/me?personFields=names,phoneNumbers,photos", {
        headers: { Authorization: `Bearer ${googleAccessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        const nombre = data.names?.[0]?.displayName || "";
        const telefonoRaw = data.phoneNumbers?.[0]?.value || "";
        const telefono = telefonoRaw.replace(/[^\d+]/g, "");
        const foto = data.photos?.[0]?.url || "";
        if (nombre) setRegistroNombre(nombre);
        if (telefono) setRegistroTelefono(telefono);
        if (foto) setRegistroFoto(foto);
        mostrarAlertaCustom("✅ Datos de perfil importados correctamente desde tu cuenta de Google.", null, "DATOS IMPORTADOS");
      } else {
        throw new Error("Failed to fetch me profile");
      }
    } catch (error) {
      console.error("Error importing profile:", error);
      mostrarAlertaCustom("⚠️ No pudimos extraer tu perfil de Google en este momento.", null, "ERROR DE IMPORTACIÓN");
    }
  };

  const agregarContactoConfianza = (contacto: ContactoConfianza) => {
    if (contactosSeleccionados.some((c) => c.telefono === contacto.telefono)) {
      return;
    }
    const nuevosContactos = [...contactosSeleccionados, contacto];
    setContactosSeleccionados(nuevosContactos);
    localStorage.setItem("segurapp_contactos_confianza", JSON.stringify(nuevosContactos));
    mostrarAlertaCustom(`🛡️ ${contacto.nombre} ha sido agregado como tu contacto de confianza para seguridad.`, null, "CONTACTO AGREGADO");
    setBusquedaContacto("");
  };

  const eliminarContactoConfianza = (telefono: string) => {
    const nuevosContactos = contactosSeleccionados.filter((c) => c.telefono !== telefono);
    setContactosSeleccionados(nuevosContactos);
    localStorage.setItem("segurapp_contactos_confianza", JSON.stringify(nuevosContactos));
  };

  const compartirRutaConContacto = (contacto: ContactoConfianza) => {
    const notas = reservaNotas.trim();
    const dePartida = showOrigenManual && origenManual.trim() 
      ? origenManual.trim() 
      : (coordenadasGoogleMaps ? "Origen fijado automáticamente por GPS" : "Neiva, Huila (Coordinar ubicación exacta)");

    let mensaje = `🚨 *ALERTA DE RECORRIDO SEGURO* \n`;
    mensaje += `───────────────────────\n`;
    mensaje += `Hola *${contacto.nombre}*, estoy iniciando un viaje seguro con SegurApp Recorridos y te comparto mi ubicación en tiempo real para mi tranquilidad y seguridad:\n\n`;
    mensaje += `📍 *Origen de partida:* _${dePartida}_\n`;
    
    if (coordenadasGoogleMaps) {
      mensaje += `🛰️ *Ubicación GPS actual:* \n${coordenadasGoogleMaps}\n`;
    }
    if (notas) {
      mensaje += `📝 *Notas de viaje:* "${notas}"\n`;
    }

    // Add driver details if active and accepted/picked_up
    const activeRide = usuario ? recorridosActivos.find(r => r.telefono === usuario.telefono && r.status !== 'completed' && r.status !== 'cancelled') : undefined;
    if (activeRide && (activeRide.status === 'accepted' || activeRide.status === 'picked_up')) {
      const conductorId = activeRide.conductorId;
      if (conductorId) {
        const savedDriver = localStorage.getItem(`segurapp_usuario_conductor`);
        if (savedDriver) {
          try {
            const driverInfo = JSON.parse(savedDriver) as UserProfile;
            mensaje += `\n🏍️ *INFORMACIÓN DEL PILOTO ASIGNADO:*\n`;
            mensaje += `• *Nombre:* ${driverInfo.nombre}\n`;
            mensaje += `• *Motocicleta:* ${driverInfo.moto}\n`;
            mensaje += `• *Placa:* ${driverInfo.placa}\n`;
            mensaje += `• *Tiempo Estimado:* ${driverInfo.tiempoEstimado || '3 a 5 min'}\n`;
            mensaje += `• *Calificación:* ${driverInfo.calificacion || '5.0'}\n`;
            mensaje += `• *PIN de Confirmación:* ${driverInfo.pinSeguridad}\n`;
          } catch (e) {}
        }
      }
    }
    mensaje += `\n───────────────────────\n`;
    mensaje += `_Por favor, hazle seguimiento a mi recorrido por seguridad._`;

    window.open(`https://wa.me/${contacto.telefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  // Process manual login via Phone (LocalStorage fallback mode)
  const procesarLogin = () => {
    const telClean = loginTelefono.trim();
    if (!telClean) {
      mostrarAlertaCustom("⚠️ Error: Por favor ingresa tu número telefónico.");
      return;
    }

    const savedUser = localStorage.getItem(`segurapp_usuario_${loginRole}`);
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as UserProfile;
        if (parsed.telefono === telClean) {
          localStorage.setItem("segurapp_usuario", JSON.stringify(parsed));
          setUsuario(parsed);
          setRegistroNombre(parsed.nombre);
          setRegistroTelefono(parsed.telefono);
          setRegistroFoto(parsed.foto);
          setRegistroRole(parsed.role || 'usuario');
          if (parsed.role === 'conductor') {
            setRegistroMoto(parsed.moto || "");
            setRegistroPlaca(parsed.placa || "");
            setRegistroPinSeguridad(parsed.pinSeguridad || "");
            setRegistroTiempoEstimado(parsed.tiempoEstimado || "3 a 5 minutos");
            setRegistroCalificacion(parsed.calificacion || "5.0 ★");
          }
          mostrarAlertaCustom(`⚡ Llave detectada: Bienvenido de nuevo, ${parsed.nombre}. Ingresando como ${parsed.role === 'conductor' ? 'Piloto Conductor' : 'Pasajero'}.`, () => {
            setPantalla('home');
          }, "ACCESO AUTORIZADO");
        } else {
          mostrarAlertaCustom("⚠️ Llave incorrecta: El número no coincide localmente con el usuario registrado en este dispositivo.", null, "SISTEMA BLOQUEADO");
        }
      } catch (e) {
        mostrarAlertaCustom("⚙️ Error en base de datos local. Por favor regístrate de nuevo.");
      }
    } else {
      mostrarAlertaCustom(`⚙️ Sistema vacío: No hay registros de ${loginRole === 'conductor' ? 'Conductor' : 'Pasajero'} con este teléfono en este móvil.`, () => {
        setIsEditMode(false);
        setRegistroNombre("");
        setRegistroTelefono(telClean); // Pre-fill entered number
        setRegistroFoto("");
        setRegistroRole(loginRole);
        if (loginRole === 'conductor') {
          setRegistroMoto("");
          setRegistroPlaca("");
          setRegistroPinSeguridad(Math.floor(1000 + Math.random() * 9000).toString());
          setRegistroTiempoEstimado("3 a 5 minutos");
          setRegistroCalificacion("5.0 ★");
        }
        setPantalla('registro');
      }, "REGISTRO REQUERIDO");
    }
  };

  // Handle image upload and conversion to base64
  const manejarCargaFoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setRegistroFoto(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save or update profile (Firestore + LocalStorage)
  const guardarPerfil = async () => {
    const nombreClean = registroNombre.trim();
    const telefonoClean = registroTelefono.trim();

    if (!nombreClean || !telefonoClean) {
      mostrarAlertaCustom("⚠️ Falla de encendido: Completa tu Nombre y tu Teléfono para encender motores.", null, "DATOS INCOMPLETOS");
      return;
    }

    if (registroRole === 'conductor') {
      if (!registroMoto.trim() || !registroPlaca.trim()) {
        mostrarAlertaCustom("⚠️ Falla de encendido: Completa los datos de tu vehículo (Modelo de moto y Placa).", null, "VEHÍCULO INCOMPLETO");
        return;
      }
    }

    const currentUid = firebaseUser?.uid;
    const userProfile: UserProfile = {
      nombre: nombreClean,
      telefono: telefonoClean,
      foto: registroFoto || DEFAULT_AVATAR,
      uid: currentUid,
      role: registroRole,
      moto: registroRole === 'conductor' ? registroMoto.trim() : undefined,
      placa: registroRole === 'conductor' ? registroPlaca.trim() : undefined,
      pinSeguridad: registroRole === 'conductor' ? registroPinSeguridad.trim() : undefined,
      tiempoEstimado: registroRole === 'conductor' ? registroTiempoEstimado.trim() : undefined,
      calificacion: registroRole === 'conductor' ? registroCalificacion : undefined,
    };

    // Always save to role key and default key
    localStorage.setItem(`segurapp_usuario_${registroRole}`, JSON.stringify(userProfile));
    localStorage.setItem("segurapp_usuario", JSON.stringify(userProfile));
    setUsuario(userProfile);

    // Save to Firestore if connected and authenticated
    if (isFirebaseConfigured && db && currentUid) {
      const docPath = `users/${currentUid}`;
      try {
        await setDoc(doc(db, "users", currentUid), {
          nombre: nombreClean,
          telefono: telefonoClean,
          foto: registroFoto || DEFAULT_AVATAR,
          role: registroRole,
          moto: registroRole === 'conductor' ? registroMoto.trim() : null,
          placa: registroRole === 'conductor' ? registroPlaca.trim() : null,
          pinSeguridad: registroRole === 'conductor' ? registroPinSeguridad.trim() : null,
          tiempoEstimado: registroRole === 'conductor' ? registroTiempoEstimado.trim() : null,
          calificacion: registroRole === 'conductor' ? registroCalificacion : null,
          createdAt: serverTimestamp()
        });
        // Request and save FCM token
        initFcmAndGetToken(currentUid).catch(console.error);
      } catch (error) {
        const isOffline = String(error).toLowerCase().includes("offline") || String(error).toLowerCase().includes("network") || String(error).toLowerCase().includes("failed-precondition");
        if (isOffline) {
          console.warn("Firestore is offline. User profile was saved locally.");
        } else {
          handleFirestoreError(error, OperationType.WRITE, docPath);
        }
      }
    }

    const titleAlert = isEditMode ? "PERFIL MODIFICADO" : "REGISTRO EXITOSO";
    const textAlert = isEditMode 
      ? `⚡ Perfil actualizado: Sincronizando datos como ${registroRole === 'conductor' ? 'Piloto Conductor' : 'Pasajero'}.`
      : `⚡ Registro completado: Iniciando tu cuenta como ${registroRole === 'conductor' ? 'Piloto Conductor' : 'Pasajero'}. Redirigiendo a validación por WhatsApp...`;

    mostrarAlertaCustom(textAlert, () => {
      const infoConductor = registroRole === 'conductor' ? `\n *Moto:* ${registroMoto.trim()}\n *Placa:* ${registroPlaca.trim()}\n *PIN:* ${registroPinSeguridad}` : '';
      const textoValidacion = encodeURIComponent(` *VERIFICACIÓN SEGURAPP*\nHola SegurApp, valido mi cuenta de ${registroRole === 'conductor' ? 'Conductor' : 'Pasajero'}.\n *Nombre:* ${nombreClean}\n *Teléfono:* ${telefonoClean}${infoConductor}`);
      window.open(`https://wa.me/${WHATSAPP_DESTINO}?text=${textoValidacion}`, '_blank');
      setPantalla('home');
    }, titleAlert);
  };

  // Dispatch ride request over WhatsApp & save to Firestore if configured
  const enviarReserva = async () => {
    if (!usuario) {
      mostrarAlertaCustom("⚠️ Error: Sesión no iniciada. Por favor regístrate.");
      setPantalla('registro');
      return;
    }

    const notas = reservaNotas.trim();
    const dePartida = showOrigenManual && origenManual.trim() 
      ? origenManual.trim() 
      : (coordenadasGoogleMaps ? "Origen fijado automáticamente por GPS" : "Neiva, Huila (Coordinar ubicación exacta)");

    const randomId = "recorrido-" + Math.random().toString(36).substring(2, 15);
    
    // Create Recorrido object
    const nuevoRecorrido: Recorrido = {
      id: randomId,
      usuarioId: firebaseUser?.uid || usuario.telefono,
      nombre: usuario.nombre,
      telefono: usuario.telefono,
      dePartida: dePartida,
      coordenadasGoogleMaps: coordenadasGoogleMaps,
      notas: notas,
      status: 'pending',
      createdAt: new Date().toISOString(),
      passengerLat: 2.9273 + (Math.random() - 0.5) * 0.002, // random Neiva location near center
      passengerLon: -75.28189 + (Math.random() - 0.5) * 0.002,
    };

    // Save locally & broadcast to other tabs (multi-tab sync)
    const actuales = [nuevoRecorrido, ...recorridosActivos.filter(r => r.status === 'pending')];
    setRecorridosActivos(actuales);
    localStorage.setItem("segurapp_active_rides", JSON.stringify(actuales));
    window.dispatchEvent(new StorageEvent("storage", {
      key: "segurapp_active_rides",
      newValue: JSON.stringify(actuales)
    }));

    // Save request to Firestore if available
    if (isFirebaseConfigured && db && firebaseUser) {
      const docPath = `recorridos/${randomId}`;
      try {
        await setDoc(doc(db, "recorridos", randomId), {
          usuarioId: firebaseUser.uid,
          nombre: usuario.nombre,
          telefono: usuario.telefono,
          dePartida: dePartida,
          coordenadasGoogleMaps: coordenadasGoogleMaps,
          notas: notas,
          status: 'pending',
          passengerLat: nuevoRecorrido.passengerLat,
          passengerLon: nuevoRecorrido.passengerLon,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        const isOffline = String(error).toLowerCase().includes("offline") || String(error).toLowerCase().includes("network") || String(error).toLowerCase().includes("failed-precondition");
        if (isOffline) {
          console.warn("Firestore is offline. Ride request was saved locally.");
        } else {
          handleFirestoreError(error, OperationType.WRITE, docPath);
        }
      }
    }

    let mensaje = `*SOLICITUD DE RECORRIDO INMEDIATO* \n`;
    mensaje += `───────────────────────\n\n`;
    mensaje += ` *Usuario:* ${usuario.nombre}\n`;
    mensaje += ` *Teléfono Cel:* ${usuario.telefono}\n\n`;
    mensaje += ` *Origen:* _${dePartida}_\n`;
    
    if (coordenadasGoogleMaps) {
      mensaje += `🛰️ *Enlace Satelital GPS:* \n${coordenadasGoogleMaps}\n`;
    } else {
      mensaje += ` _Ubicación de partida aproximada. Compartir ubicación actual por WhatsApp para mayor precisión._\n`;
    }

    if (notas) {
      mensaje += `\n *Notas de Ruta:* "${notas}"\n`;
    }
    
    mensaje += `\n───────────────────────\n\n`;
    mensaje += ` _Tiempo estimado de respuesta: 3 - 5 min_\n`;
    mensaje += ` *Servicio en la ciudad de Neiva*`;

    window.open(`https://wa.me/${WHATSAPP_DESTINO}?text=${encodeURIComponent(mensaje)}`, '_blank');

    mostrarAlertaCustom(
      "🚀 ¡Buscando Piloto! Tu solicitud ha sido compartida en la red de SegurApp de Neiva. Puedes abrir otra pestaña como 'Conductor' para aceptar este servicio en tiempo real, o esperar 5 segundos para que un conductor cercano lo acepte de manera automática.",
      () => {
        // Fallback simulation timer if no actual conductor accepts it
        setTimeout(() => {
          // Check if ride is still pending (hasn't been accepted by a real driver in another tab)
          const saved = localStorage.getItem("segurapp_active_rides");
          if (saved) {
            try {
              const parsed = JSON.parse(saved) as Recorrido[];
              const target = parsed.find(r => r.id === randomId);
              if (target && target.status === 'pending') {
                // Auto-accept with simulated driver
                const simDriver = conductoresCercanos[0] || { nombre: "Jorge Valenzuela", moto: "Suzuki Gixxer 150", placa: "ABC-12D" };
                const updatedTarget: Recorrido = {
                  ...target,
                  status: 'accepted',
                  conductorId: "sim-driver-1",
                  conductorNombre: `${simDriver.nombre} (Piloto Verificado)`,
                  conductorTelefono: "3154889566",
                  conductorFoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256",
                  conductorMoto: simDriver.moto,
                  conductorPlaca: simDriver.placa,
                  conductorPinSeguridad: Math.floor(1000 + Math.random() * 9000).toString(),
                  conductorTiempoEstimado: "3 a 5 minutos",
                  driverLatOffset: 0.005,
                  driverLonOffset: -0.004,
                };
                
                // Update state
                const nuevas = parsed.map(r => r.id === randomId ? updatedTarget : r);
                setRecorridosActivos(nuevas);
                localStorage.setItem("segurapp_active_rides", JSON.stringify(nuevas));

                // Sync simulated driver accept with Firestore if configured
                if (isFirebaseConfigured && db) {
                  updateDoc(doc(db, "recorridos", randomId), {
                    status: 'accepted',
                    conductorId: "sim-driver-1",
                    conductorNombre: updatedTarget.conductorNombre,
                    conductorTelefono: updatedTarget.conductorTelefono,
                    conductorFoto: updatedTarget.conductorFoto,
                    conductorMoto: updatedTarget.conductorMoto,
                    conductorPlaca: updatedTarget.conductorPlaca,
                    conductorPinSeguridad: updatedTarget.conductorPinSeguridad,
                    conductorTiempoEstimado: updatedTarget.conductorTiempoEstimado,
                    driverLatOffset: updatedTarget.driverLatOffset,
                    driverLonOffset: updatedTarget.driverLonOffset
                  }).catch(err => console.warn("Could not sync simulated accept to Firestore:", err));
                }
                
                // Set pickup info
                setConductorRecogida({
                  nombre: updatedTarget.conductorNombre!,
                  calificacion: "4.9 ★",
                  telefono: updatedTarget.conductorTelefono!,
                  foto: updatedTarget.conductorFoto!,
                  moto: updatedTarget.conductorMoto!,
                  placa: updatedTarget.conductorPlaca!,
                  tiempoEstimado: updatedTarget.conductorTiempoEstimado!,
                  pinSeguridad: updatedTarget.conductorPinSeguridad!
                });

                // Display dialogue
                setShowRecogidaDialog(true);
                
                // Trigger tab sync
                window.dispatchEvent(new StorageEvent("storage", {
                  key: "segurapp_active_rides",
                  newValue: JSON.stringify(nuevas)
                }));
              }
            } catch (err) {
              console.error(err);
            }
          }
        }, 5000);
      },
      "SISTEMA SATELITAL ACTIVADO"
    );
  };

  // Conductor Action Handlers
  const aceptarRecorrido = (recorridoId: string) => {
    if (!usuario || usuario.role !== 'conductor') return;
    
    const saved = localStorage.getItem("segurapp_active_rides");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Recorrido[];
        const target = parsed.find(r => r.id === recorridoId);
        if (target && target.status === 'pending') {
          const updated: Recorrido = {
            ...target,
            status: 'accepted',
            conductorId: usuario.telefono,
            conductorNombre: `${usuario.nombre} (Piloto Verificado)`,
            conductorTelefono: usuario.telefono,
            conductorFoto: usuario.foto || DEFAULT_AVATAR,
            conductorMoto: usuario.moto || "Yamaha FZ25",
            conductorPlaca: usuario.placa || "XYZ-45G",
            conductorPinSeguridad: usuario.pinSeguridad || "7841",
            conductorTiempoEstimado: "3 a 5 minutos",
            driverLatOffset: 0.005, // simulated driver start distance
            driverLonOffset: -0.004,
          };
          
          const nuevas = parsed.map(r => r.id === recorridoId ? updated : r);
          setRecorridosActivos(nuevas);
          localStorage.setItem("segurapp_active_rides", JSON.stringify(nuevas));

          // Sync driver acceptance with Firestore if configured
          if (isFirebaseConfigured && db) {
            updateDoc(doc(db, "recorridos", recorridoId), {
              status: 'accepted',
              conductorId: firebaseUser?.uid || usuario.telefono,
              conductorNombre: updated.conductorNombre,
              conductorTelefono: updated.conductorTelefono,
              conductorFoto: updated.conductorFoto,
              conductorMoto: updated.conductorMoto,
              conductorPlaca: updated.conductorPlaca,
              conductorPinSeguridad: updated.conductorPinSeguridad,
              conductorTiempoEstimado: updated.conductorTiempoEstimado,
              driverLatOffset: updated.driverLatOffset,
              driverLonOffset: updated.driverLonOffset
            }).catch(err => handleFirestoreError(err, OperationType.WRITE, `recorridos/${recorridoId}`));
          }
          
          // Trigger instant multi-tab notification to the passenger tab
          window.dispatchEvent(new StorageEvent("storage", {
            key: "segurapp_active_rides",
            newValue: JSON.stringify(nuevas)
          }));
          
          mostrarAlertaCustom(
            `🚀 Has aceptado el servicio de ${target.nombre}. Tu PIN de recogida seguro es [${usuario.pinSeguridad || "7841"}]. Dirígete al origen de inmediato.`,
            () => {},
            "SERVICIO ACEPTADO"
          );
        }
      } catch (err) {
        console.error("Error accepting ride", err);
      }
    }
  };

  const avisarConductorAfuera = (recorridoId: string) => {
    const saved = localStorage.getItem("segurapp_active_rides");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Recorrido[];
        const target = parsed.find(r => r.id === recorridoId);
        if (target) {
          const updated: Recorrido = {
            ...target,
            conductorAfuera: true,
          };
          
          const nuevas = parsed.map(r => r.id === recorridoId ? updated : r);
          setRecorridosActivos(nuevas);
          localStorage.setItem("segurapp_active_rides", JSON.stringify(nuevas));

          // Sync driver arrival with Firestore if configured
          if (isFirebaseConfigured && db) {
            updateDoc(doc(db, "recorridos", recorridoId), {
              conductorAfuera: true
            }).catch(err => handleFirestoreError(err, OperationType.WRITE, `recorridos/${recorridoId}`));
          }
          
          window.dispatchEvent(new StorageEvent("storage", {
            key: "segurapp_active_rides",
            newValue: JSON.stringify(nuevas)
          }));
          
          mostrarAlertaCustom(
            "📢 Se ha notificado en tiempo real al pasajero que ya estás esperando afuera. ¡Excelente servicio, piloto!",
            () => {
              // Open a ready-to-send WhatsApp notification template as backup
              const msj = `🏍️ *SEGURAPP: ¡YA ESTOY AFUERA!*\nHola *${target.nombre}*, te confirmo que ya me encuentro afuera esperándote.\n\n• *Piloto:* ${updated.conductorNombre || 'Verificado'}\n• *Vehículo:* ${updated.conductorMoto}\n• *Placa:* ${updated.conductorPlaca}\n• *PIN de seguridad:* ${updated.conductorPinSeguridad}\n\nPor favor, verifica estos datos por seguridad antes de abordar. ¡Te espero!`;
              window.open(`https://wa.me/${target.telefono}?text=${encodeURIComponent(msj)}`, '_blank');
            },
            "NOTIFICACIÓN AFUERA"
          );
        }
      } catch (err) {
        console.error("Error setting conductor afuera", err);
      }
    }
  };

  const registrarRecogida = (recorridoId: string) => {
    const saved = localStorage.getItem("segurapp_active_rides");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Recorrido[];
        const target = parsed.find(r => r.id === recorridoId);
        if (target) {
          const updated: Recorrido = {
            ...target,
            status: 'picked_up',
          };
          
          const nuevas = parsed.map(r => r.id === recorridoId ? updated : r);
          setRecorridosActivos(nuevas);
          localStorage.setItem("segurapp_active_rides", JSON.stringify(nuevas));

          // Sync boarding status with Firestore if configured
          if (isFirebaseConfigured && db) {
            updateDoc(doc(db, "recorridos", recorridoId), {
              status: 'picked_up'
            }).catch(err => handleFirestoreError(err, OperationType.WRITE, `recorridos/${recorridoId}`));
          }
          
          window.dispatchEvent(new StorageEvent("storage", {
            key: "segurapp_active_rides",
            newValue: JSON.stringify(nuevas)
          }));
          
          mostrarAlertaCustom(
            "✅ Pasajero a bordo registrado correctamente. El piloto ha sido ocultado del mapa satelital público de Neiva para resguardar la privacidad del viaje.",
            () => {},
            "PASAJERO EN MOTO"
          );
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const finalizarRecorrido = (recorridoId: string) => {
    const saved = localStorage.getItem("segurapp_active_rides");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Recorrido[];
        const target = parsed.find(r => r.id === recorridoId);
        if (target) {
          const updated: Recorrido = {
            ...target,
            status: 'completed',
          };
          
          const nuevas = parsed.map(r => r.id === recorridoId ? updated : r);
          setRecorridosActivos(nuevas);
          localStorage.setItem("segurapp_active_rides", JSON.stringify(nuevas));

          // Sync completion with Firestore if configured
          if (isFirebaseConfigured && db) {
            updateDoc(doc(db, "recorridos", recorridoId), {
              status: 'completed'
            }).catch(err => handleFirestoreError(err, OperationType.WRITE, `recorridos/${recorridoId}`));
          }
          
          window.dispatchEvent(new StorageEvent("storage", {
            key: "segurapp_active_rides",
            newValue: JSON.stringify(nuevas)
          }));
          
          mostrarAlertaCustom(
            "🏁 Servicio de recorrido finalizado con éxito. ¡Buen trabajo, piloto!",
            () => {},
            "SERVICIO COMPLETADO"
          );
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Open Edit Profile form from home screen
  const abrirConfiguracion = () => {
    if (usuario) {
      setRegistroNombre(usuario.nombre);
      setRegistroTelefono(usuario.telefono);
      setRegistroFoto(usuario.foto);
      setRegistroRole(usuario.role || 'usuario');
      if (usuario.role === 'conductor') {
        setRegistroMoto(usuario.moto || "");
        setRegistroPlaca(usuario.placa || "");
        setRegistroPinSeguridad(usuario.pinSeguridad || "");
        setRegistroTiempoEstimado(usuario.tiempoEstimado || "3 a 5 minutos");
        setRegistroCalificacion(usuario.calificacion || "5.0 ★");
      }
      setIsEditMode(true);
      setPantalla('registro');
    }
  };

  // Clean data reset
  const cerrarSesion = async () => {
    mostrarAlertaCustom("⚠️ ¿Deseas cerrar tu sesión? Se borrarán tus datos locales de piloto.", async () => {
      if (isFirebaseConfigured && auth) {
        try {
          await signOut(auth);
        } catch (error) {
          console.error("Sign out error", error);
        }
      }
      localStorage.removeItem("segurapp_usuario");
      localStorage.removeItem("segurapp_usuario_usuario");
      localStorage.removeItem("segurapp_usuario_conductor");
      setUsuario(null);
      setFirebaseUser(null);
      setLoginTelefono("");
      setRegistroNombre("");
      setRegistroTelefono("");
      setRegistroFoto("");
      setRegistroMoto("");
      setRegistroPlaca("");
      setPantalla('login');
    }, "CERRAR SESIÓN");
  };

  const contactosFiltrados = todosLosContactos.filter(c => 
    c.nombre.toLowerCase().includes(busquedaContacto.toLowerCase()) ||
    c.telefono.includes(busquedaContacto)
  ).slice(0, 5);

  return (
    <div className="relative min-h-screen">
      {/* Decorative ambient Raider motorcycle background */}
      <div className="ambient-bg" />

      {/* Main layout wrapper - Centered beautiful mock container */}
      <div className="mx-auto max-w-md px-6 py-8 pb-32 min-h-screen flex flex-col justify-between relative z-10">
        
        {/* Top Header Badge & Theme Toggle Bar */}
        <div className="flex items-center justify-between mb-4 gap-2">
          {/* Theme Switch / Interruptor de Tema */}
          <button
            type="button"
            onClick={() => setIsDarkMode(prev => !prev)}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-full transition-all text-[10px] font-bold text-white uppercase tracking-wider cursor-pointer active:scale-95 shadow-md"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-spin-slow" />
                <span>Modo Día</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                <span>Modo Noche</span>
              </>
            )}
          </button>

          {isFirebaseConfigured ? (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                Firebase Conectado
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
              <CloudLightning className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                Modo Offline
              </span>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* SCREEN: LOGIN */}
          {pantalla === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col flex-grow justify-between"
            >
              <div>
                {/* Sports logo helmet container with animated glow border */}
                <div className="w-28 h-28 rounded-full bg-black/60 border-2 border-brand-primary/40 flex items-center justify-center mx-auto mt-6 mb-4 relative backdrop-blur-md animate-metallic shadow-lg shadow-brand-primary/10">
                  <div className="absolute inset-0 rounded-full border border-brand-primary animate-ping opacity-25" style={{ animationDuration: '3s' }} />
                  <Bike className="w-14 h-14 text-white z-10" />
                </div>

                <h1 className="text-center font-display text-4xl font-extrabold tracking-wider text-white uppercase drop-shadow-sm">
                  SegurApp
                </h1>
                <p className="text-center text-xs font-semibold tracking-wider text-brand-primary uppercase mt-1">
                  Recorridos en la ciudad de Neiva
                </p>

                {/* About "Recorridos" Informational Section */}
                <div className="bg-bg-dark/95 border border-white/10 rounded-3xl p-6 mt-6 relative overflow-hidden animate-metallic shadow-2xl">
                  <p className="text-sm leading-relaxed text-white">
                    Si buscas un servicio de transporte rápido, seguro y totalmente confiable, <strong className="text-brand-primary">Recorridos</strong> es tu mejor opción. 📍
                  </p>
                  <p className="text-sm leading-relaxed text-white mt-3">
                    Nos encargamos de que llegues a tiempo a tus citas, trabajo, compromisos o de regreso a casa, con la comodidad y la tranquilidad que te mereces.
                  </p>
                  
                  <h5 className="text-xs font-bold font-display tracking-widest text-brand-primary uppercase mt-5 mb-3 border-b border-brand-primary/20 pb-1">
                    ¿POR QUÉ ELEGIRNOS?
                  </h5>
                  <ul className="space-y-3 text-xs">
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-brand-primary/15 flex items-center justify-center text-brand-primary shrink-0 font-bold">⏱️</div>
                      <p className="text-text-secondary leading-normal">
                        <strong className="text-white font-semibold">Puntualidad garantizada:</strong> Respetamos tu valioso tiempo en cada salida.
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-brand-primary/15 flex items-center justify-center text-brand-primary shrink-0 font-bold">🔒</div>
                      <p className="text-text-secondary leading-normal">
                        <strong className="text-white font-semibold">Viajes protegidos:</strong> Conductores experimentados de confianza y rutas controladas.
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-brand-primary/15 flex items-center justify-center text-brand-primary shrink-0 font-bold">💬</div>
                      <p className="text-text-secondary leading-normal">
                        <strong className="text-white font-semibold">Solicitud en 1-Clic:</strong> Despacho directo a tu WhatsApp, sin enredos.
                      </p>
                    </li>
                  </ul>
                  <p className="text-xs font-bold text-brand-primary mt-4 tracking-wide text-center">
                    ¡Olvídate del estrés del tráfico de Neiva! Déjanos el volante.
                  </p>
                </div>
              </div>

              {/* Login Input Controls */}
              <div className="bg-bg-dark/95 border border-white/10 rounded-3xl p-6 mt-6 relative shadow-xl">
                
                {/* Segmented Role Selector */}
                <div className="grid grid-cols-2 p-1 bg-black/40 rounded-2xl mb-5 border border-white/5">
                  <button
                    type="button"
                    onClick={() => setLoginRole('usuario')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                      loginRole === 'usuario'
                        ? 'bg-brand-primary text-white shadow-md'
                        : 'text-text-secondary hover:text-white'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" /> Pasajero
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginRole('conductor')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                      loginRole === 'conductor'
                        ? 'bg-brand-secondary text-white shadow-md'
                        : 'text-text-secondary hover:text-white'
                    }`}
                  >
                    <Bike className="w-3.5 h-3.5" /> Conductor
                  </button>
                </div>

                {isFirebaseConfigured && (
                  <div className="mb-5">
                    <button
                      type="button"
                      onClick={iniciarSesionGoogle}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-xs tracking-wider py-4 rounded-xl cursor-pointer transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
                    >
                      <User className="w-4 h-4" /> Ingresar con Google
                    </button>
                    
                    <div className="relative flex py-3 items-center">
                      <div className="flex-grow border-t border-white/5"></div>
                      <span className="flex-shrink mx-4 text-text-secondary text-[10px] font-bold uppercase tracking-widest">O con tu teléfono</span>
                      <div className="flex-grow border-t border-white/5"></div>
                    </div>
                  </div>
                )}

                <div className="mb-5">
                  <label className="block text-[10px] font-bold tracking-widest text-text-secondary uppercase mb-2">
                    Número de Teléfono {loginRole === 'conductor' ? '(Conductor)' : '(Pasajero)'}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <input
                      type="tel"
                      value={loginTelefono}
                      onChange={(e) => setLoginTelefono(e.target.value)}
                      className="w-full bg-bg-input border border-white/5 rounded-xl py-4 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-brand-primary/60 transition-all font-mono"
                      placeholder="Ej. 3189882787"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={procesarLogin}
                  className="w-full bg-white hover:bg-neutral-100 text-black font-extrabold uppercase text-xs tracking-wider py-4 rounded-xl cursor-pointer transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-white/5"
                >
                  <Zap className="w-4 h-4 fill-black" /> Ingreso Seguro
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsEditMode(false);
                    setRegistroNombre("");
                    setRegistroTelefono(loginTelefono); // prefill with whatever phone they entered
                    setRegistroFoto("");
                    setRegistroRole(loginRole);
                    if (loginRole === 'conductor') {
                      setRegistroMoto("");
                      setRegistroPlaca("");
                      setRegistroPinSeguridad(Math.floor(1000 + Math.random() * 9000).toString());
                    }
                    setPantalla('registro');
                  }}
                  className="w-full text-center text-[11px] font-semibold text-text-secondary hover:text-white mt-4 py-1 transition-colors cursor-pointer uppercase tracking-wider"
                >
                  ¿No tienes cuenta? Regístrate aquí
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN: REGISTER & PROFILE UPDATE */}
          {pantalla === 'registro' && (
            <motion.div
              key="registro"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col flex-grow justify-between"
            >
              <div>
                <h1 className="text-center font-display text-3xl font-extrabold tracking-wider text-white uppercase mt-4">
                  {isEditMode ? "Modificar Perfil" : (registroRole === 'conductor' ? "Registro de Piloto" : "Registro de Pasajero")}
                </h1>
                <p className="text-center text-xs text-text-secondary mt-1">
                  {isEditMode ? "Actualiza tus credenciales de seguridad" : (registroRole === 'conductor' ? "Crea tu cuenta de conductor de recorridos" : "Crea tu cuenta de pasajero para viajes rápidos")}
                </p>

                <div className="bg-bg-dark/95 border border-white/10 rounded-3xl p-6 mt-6 shadow-xl relative overflow-hidden">
                  
                  {/* Role Switcher (Only if NOT in Edit Mode to avoid accidentally changing role after registration) */}
                  {!isEditMode && (
                    <div className="grid grid-cols-2 p-1 bg-black/40 rounded-2xl mb-6 border border-white/5">
                      <button
                        type="button"
                        onClick={() => setRegistroRole('usuario')}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                          registroRole === 'usuario'
                            ? 'bg-brand-primary text-white shadow-md'
                            : 'text-text-secondary hover:text-white'
                        }`}
                      >
                        <User className="w-3.5 h-3.5" /> Pasajero
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegistroRole('conductor')}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                          registroRole === 'conductor'
                            ? 'bg-brand-secondary text-white shadow-md'
                            : 'text-text-secondary hover:text-white'
                        }`}
                      >
                        <Bike className="w-3.5 h-3.5" /> Conductor
                      </button>
                    </div>
                  )}

                  {/* Photo Upload Box */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative w-24 h-24 rounded-full border-2 border-brand-secondary shadow-lg shadow-brand-secondary/20 overflow-hidden bg-bg-input">
                      <img
                        src={registroFoto || DEFAULT_AVATAR}
                        className="w-full h-full object-cover"
                        alt="Avatar piloto"
                      />
                      <div className="absolute inset-0 bg-black/10 animate-metallic" />
                    </div>
                    
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={manejarCargaFoto}
                      className="hidden"
                    />
                    
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-brand-secondary/10 hover:bg-brand-secondary/20 border border-brand-secondary/25 text-brand-secondary text-[10px] font-bold tracking-widest uppercase px-4 py-2 rounded-full cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" /> Cargar Foto
                      </button>

                      {isFirebaseConfigured && (
                        <button
                          type="button"
                          onClick={importarPerfilGoogle}
                          className="bg-neutral-800 hover:bg-neutral-700 border border-white/5 text-white text-[10px] font-bold tracking-widest uppercase px-4 py-2 rounded-full cursor-pointer transition-all flex items-center gap-1.5"
                        >
                          <User className="w-3.5 h-3.5 text-brand-primary" /> Importar Google
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Name Input */}
                  <div className="mb-5">
                    <label className="block text-[10px] font-bold tracking-widest text-text-secondary uppercase mb-2">
                      {registroRole === 'conductor' ? "Nombre Completo del Conductor" : "Nombre del Pasajero / Apodo"}
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                      <input
                        type="text"
                        value={registroNombre}
                        onChange={(e) => setRegistroNombre(e.target.value)}
                        className="w-full bg-bg-input border border-white/5 rounded-xl py-4 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-brand-primary/60 transition-all"
                        placeholder={registroRole === 'conductor' ? "Ej. Carlos Mendoza" : "Ej. Carolina Rojas"}
                      />
                    </div>
                  </div>

                  {/* Phone Input */}
                  <div className="mb-5">
                    <label className="block text-[10px] font-bold tracking-widest text-text-secondary uppercase mb-2">
                      Número de WhatsApp
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                      <input
                        type="tel"
                        value={registroTelefono}
                        onChange={(e) => setRegistroTelefono(e.target.value)}
                        className="w-full bg-bg-input border border-white/5 rounded-xl py-4 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-brand-primary/60 transition-all font-mono"
                        placeholder="Ej. 3189882787"
                      />
                    </div>
                  </div>

                  {/* CONDUCTOR ADDITIONAL FIELDS */}
                  {registroRole === 'conductor' && (
                    <div className="space-y-5 mb-6 border-t border-white/5 pt-5 animate-fade-in">
                      <div className="text-center text-[10px] font-bold tracking-widest text-brand-secondary uppercase bg-brand-secondary/5 py-1.5 rounded-lg border border-brand-secondary/15">
                        🔑 Detalles del Vehículo de Recogida
                      </div>
                      
                      {/* Moto Model */}
                      <div>
                        <label className="block text-[10px] font-bold tracking-widest text-text-secondary uppercase mb-2">
                          Modelo de la Motocicleta
                        </label>
                        <div className="relative">
                          <Bike className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                          <input
                            type="text"
                            value={registroMoto}
                            onChange={(e) => setRegistroMoto(e.target.value)}
                            className="w-full bg-bg-input border border-white/5 rounded-xl py-4 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-brand-primary/60 transition-all"
                            placeholder="Ej. Yamaha FZ25 (Negra Mate)"
                          />
                        </div>
                      </div>

                      {/* Plate Code */}
                      <div>
                        <label className="block text-[10px] font-bold tracking-widest text-text-secondary uppercase mb-2">
                          Placa de la Motocicleta
                        </label>
                        <div className="relative">
                          <Sliders className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                          <input
                            type="text"
                            value={registroPlaca}
                            onChange={(e) => setRegistroPlaca(e.target.value.toUpperCase())}
                            className="w-full bg-bg-input border border-white/5 rounded-xl py-4 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-brand-primary/60 transition-all font-mono uppercase"
                            placeholder="Ej. XYZ-45G"
                          />
                        </div>
                      </div>

                      {/* Security PIN Code */}
                      <div>
                        <label className="block text-[10px] font-bold tracking-widest text-text-secondary uppercase mb-2">
                          PIN de Seguridad Seguro (4 dígitos)
                        </label>
                        <div className="relative">
                          <Sliders className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                          <input
                            type="text"
                            maxLength={4}
                            value={registroPinSeguridad}
                            onChange={(e) => setRegistroPinSeguridad(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-bg-input border border-white/5 rounded-xl py-4 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-brand-primary/60 transition-all font-mono text-center tracking-widest"
                            placeholder="Ej. 7841"
                          />
                        </div>
                        <p className="text-[10px] text-text-secondary mt-1.5 leading-relaxed">
                          Este PIN será compartido con el pasajero para que pueda verificar que eres su piloto asignado oficial al momento de la recogida.
                        </p>
                      </div>

                      {/* Autofill Test Conductor Helper Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setRegistroNombre("Carlos Mendoza");
                          setRegistroTelefono("3189882787");
                          setRegistroMoto("Yamaha FZ25 (Negra Mate)");
                          setRegistroPlaca("XYZ-45G");
                          setRegistroPinSeguridad("7841");
                          setRegistroFoto("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256");
                        }}
                        className="w-full bg-brand-secondary/10 hover:bg-brand-secondary/20 border border-brand-secondary/20 text-brand-secondary font-bold text-[10px] py-3 rounded-xl uppercase tracking-widest transition-all cursor-pointer"
                      >
                        ✨ Autocompletar Piloto de Prueba
                      </button>
                    </div>
                  )}

                  {/* Save profile action buttons */}
                  <button
                    type="button"
                    onClick={guardarPerfil}
                    className="w-full bg-brand-primary hover:bg-red-600 text-white font-extrabold uppercase text-xs tracking-widest py-4 rounded-xl cursor-pointer transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/25"
                  >
                    {isEditMode ? (
                      <>Sincronizar Modificación</>
                    ) : (
                      <>Completar Registro</>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (isEditMode) {
                        setPantalla('home');
                      } else {
                        setPantalla('login');
                      }
                    }}
                    className="w-full text-center text-[11px] font-medium text-text-secondary hover:text-white mt-4 py-1 transition-colors cursor-pointer"
                  >
                    Volver Atrás
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* SCREEN: HOME (DESPACHO COCKPIT) */}
          {pantalla === 'home' && usuario && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col flex-grow justify-between"
            >
              <div>
                <h1 className="text-center font-display text-4xl font-extrabold tracking-wider text-white uppercase mt-2">
                  SegurApp
                </h1>
                <p className="text-center text-[10px] font-bold tracking-widest text-brand-primary uppercase mt-0.5">
                  Cockpit de Recorridos Neiva
                </p>

                {/* User profile capsule card */}
                <div className="bg-bg-dark/95 border border-white/10 rounded-2xl p-4 mt-6 flex items-center gap-4 relative overflow-hidden shadow-xl">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full blur-2xl" />
                  
                  <div className="relative w-14 h-14 rounded-full border-2 border-brand-primary overflow-hidden shrink-0 shadow-md">
                    <img
                      src={usuario.foto || DEFAULT_AVATAR}
                      className="w-full h-full object-cover"
                      alt="Perfil"
                    />
                    <div className="absolute inset-0 bg-black/10 animate-metallic" />
                  </div>

                  <div className="flex-grow min-w-0">
                    <h4 className="text-sm font-extrabold text-white truncate uppercase font-display">
                      {usuario.nombre}
                    </h4>
                    <p className="text-xs text-text-secondary mt-0.5 font-mono">
                      Cel: {usuario.telefono}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                        Sesión Activa
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={cerrarSesion}
                    title="Cerrar sesión"
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-white/5 hover:border-red-500/20 text-text-secondary transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                {usuario.role === 'conductor' ? (
                  /* ======================================================== */
                  /*                   VISTA DE CONDUCTOR                     */
                  /* ======================================================== */
                  <div className="space-y-4 mt-4">
                    {/* Status Toggle & Stats */}
                    <div className="bg-bg-dark border border-white/10 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Tu Estado de Conexión</h4>
                          <p className="text-[10px] text-text-secondary mt-0.5">
                            {conductorOnline ? "🟢 Recibiendo viajes satelitales" : "🔴 Desconectado de la red"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setConductorOnline(!conductorOnline)}
                          className={`px-4 py-2 rounded-full text-[10px] font-extrabold uppercase tracking-widest border transition-all cursor-pointer ${
                            conductorOnline 
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                              : 'bg-neutral-800 hover:bg-neutral-700 border-white/10 text-white'
                          }`}
                        >
                          {conductorOnline ? "En Línea" : "Desconectado"}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                        <div className="text-center border-r border-white/10 pr-2">
                          <span className="block text-[9px] text-text-secondary uppercase font-bold">Calificación</span>
                          <span className="text-xs font-bold text-brand-secondary">{usuario.calificacion || "5.0 ★"}</span>
                        </div>
                        <div className="text-center pl-2">
                          <span className="block text-[9px] text-text-secondary uppercase font-bold">PIN de Seguridad</span>
                          <span className="text-xs font-mono font-bold text-emerald-400">[{usuario.pinSeguridad || "7841"}]</span>
                        </div>
                      </div>
                    </div>

                    {/* GOOGLE MAPS RADAR FOR DRIVERS */}
                    {usuario && (
                      <GoogleMapsRadar
                        recorridosActivos={recorridosActivos}
                        conductoresCercanos={conductoresCercanos}
                        usuarioActual={{
                          nombre: usuario.nombre,
                          telefono: usuario.telefono,
                          foto: usuario.foto
                        }}
                      />
                    )}

                    {/* LIVE SERVICES LIST */}
                    <div className="bg-bg-dark border border-white/10 rounded-3xl p-5 shadow-xl">
                      <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <span className="text-brand-secondary">⚡</span> Solicitudes Pendientes en Neiva
                      </h3>

                      {!conductorOnline ? (
                        <p className="text-xs text-text-secondary text-center py-4">Ponte en línea para recibir servicios de pasajeros.</p>
                      ) : recorridosActivos.filter(r => r.status === 'pending').length === 0 ? (
                        <p className="text-xs text-text-secondary text-center py-4">Esperando nuevas solicitudes de pasajeros...</p>
                      ) : (
                        <div className="space-y-3">
                          {recorridosActivos.filter(r => r.status === 'pending').map((ride) => (
                            <div key={ride.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col gap-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full border border-brand-primary overflow-hidden">
                                    <img src={ride.foto || DEFAULT_AVATAR} className="w-full h-full object-cover" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-bold text-white">{ride.nombre}</h4>
                                    <span className="text-[9px] text-text-secondary font-mono">{ride.telefono}</span>
                                  </div>
                                </div>
                                <span className="text-[9px] font-bold text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2.5 py-0.5 rounded-full uppercase animate-pulse">Pendiente</span>
                              </div>

                              <div className="bg-black/20 p-2.5 rounded-xl border border-white/5 text-[10px] space-y-1 text-text-secondary">
                                <p><strong className="text-white">📍 Origen:</strong> {ride.dePartida}</p>
                                {ride.notas && <p><strong className="text-white">📝 Notas:</strong> "{ride.notas}"</p>}
                              </div>

                              <button
                                type="button"
                                onClick={() => aceptarRecorrido(ride.id)}
                                className="w-full bg-brand-secondary hover:bg-emerald-600 text-white font-bold text-xs uppercase py-2.5 rounded-xl transition-all cursor-pointer text-center"
                              >
                                🚀 Aceptar Servicio
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ACCEPTED ACTIVE SERVICES */}
                    {recorridosActivos.filter(r => r.conductorId === usuario.telefono && (r.status === 'accepted' || r.status === 'picked_up')).length > 0 && (
                      <div className="bg-bg-dark border border-brand-secondary/25 rounded-3xl p-5 shadow-xl animate-metallic">
                        <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <span className="text-brand-secondary animate-bounce">🏍️</span> Servicio en Progreso
                        </h3>

                        {recorridosActivos.filter(r => r.conductorId === usuario.telefono && (r.status === 'accepted' || r.status === 'picked_up')).map((ride) => (
                          <div key={ride.id} className="space-y-4">
                            <div className="flex items-center gap-2.5">
                              <img src={ride.foto || DEFAULT_AVATAR} className="w-9 h-9 rounded-full object-cover border border-white/10" />
                              <div className="min-w-0">
                                <h4 className="text-xs font-extrabold text-white">{ride.nombre}</h4>
                                <span className="text-[9px] text-text-secondary font-mono">{ride.telefono}</span>
                              </div>
                            </div>

                            <div className="bg-black/40 p-3 rounded-2xl border border-white/5 text-xs space-y-1.5 text-text-secondary">
                              <p><strong className="text-white">📍 Origen de Recogida:</strong> {ride.dePartida}</p>
                              {ride.notas && <p><strong className="text-white">📝 Ruta Notas:</strong> "{ride.notas}"</p>}
                              <p className="text-brand-secondary font-bold">🔐 PIN de Recogida Exigido: [{usuario.pinSeguridad || "7841"}]</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              {ride.status === 'accepted' ? (
                                <div className="col-span-2 flex flex-col gap-2.5">
                                  <button
                                    type="button"
                                    disabled={ride.conductorAfuera}
                                    onClick={() => avisarConductorAfuera(ride.id)}
                                    className={`w-full py-3 px-4 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer text-center flex items-center justify-center gap-2 border ${
                                      ride.conductorAfuera 
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 cursor-not-allowed opacity-80' 
                                        : 'bg-amber-500 hover:bg-amber-600 border-amber-600 text-white active:scale-[0.99]'
                                    }`}
                                  >
                                    <span>📢</span>
                                    {ride.conductorAfuera ? "Notificación 'Ya estoy afuera' enviada" : "Avisar: ¡Ya estoy afuera!"}
                                  </button>
                                  
                                  <button
                                    type="button"
                                    onClick={() => registrarRecogida(ride.id)}
                                    className="w-full bg-emerald-500 hover:bg-emerald-600 border border-emerald-600 text-white text-xs font-bold uppercase py-3 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 active:scale-[0.99]"
                                  >
                                    ✅ Registrar Recogida (Pasajero a Bordo)
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => finalizarRecorrido(ride.id)}
                                  className="col-span-2 bg-neutral-800 hover:bg-neutral-700 border border-brand-secondary/30 text-brand-secondary text-xs font-bold uppercase py-3 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                                >
                                  🏁 Finalizar Viaje
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* ======================================================== */
                  /*                   VISTA DE PASAJERO                      */
                  /* ======================================================== */
                  <>
                    {/* Active Ride Tracker Card */}
                    {(() => {
                      const myActiveRide = recorridosActivos.find(
                        r => r.telefono === usuario.telefono && 
                        r.status !== 'completed' && 
                        r.status !== 'cancelled'
                      );
                      if (!myActiveRide) return null;

                      return (
                        <div className="bg-bg-dark border border-brand-primary/20 rounded-3xl p-5 mt-4 shadow-xl animate-metallic relative overflow-hidden">
                          {/* Background radial highlight */}
                          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-2xl pointer-events-none" />

                          <div className="flex justify-between items-center mb-3.5 border-b border-white/5 pb-3">
                            <div>
                              <span className="text-[10px] font-bold tracking-widest text-text-secondary uppercase">
                                Estado de tu recorrido
                              </span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`w-2 h-2 rounded-full animate-pulse ${
                                  myActiveRide.status === 'pending' 
                                    ? 'bg-amber-400' 
                                    : myActiveRide.conductorAfuera 
                                      ? 'bg-brand-primary animate-bounce' 
                                      : myActiveRide.status === 'accepted' 
                                        ? 'bg-emerald-400' 
                                        : 'bg-emerald-500'
                                }`} />
                                <h4 className="text-[11px] font-extrabold text-white uppercase tracking-wider">
                                  {myActiveRide.status === 'pending' && "Buscando piloto..."}
                                  {myActiveRide.status === 'accepted' && (myActiveRide.conductorAfuera ? "¡Tu piloto ya llegó!" : "Piloto en camino")}
                                  {myActiveRide.status === 'picked_up' && "Recorrido en progreso"}
                                </h4>
                              </div>
                            </div>

                            {myActiveRide.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => {
                                  // Cancel pending ride
                                  const nuevas = recorridosActivos.map(r => r.id === myActiveRide.id ? { ...r, status: 'cancelled' as const } : r);
                                  setRecorridosActivos(nuevas);
                                  localStorage.setItem("segurapp_active_rides", JSON.stringify(nuevas));

                                  if (isFirebaseConfigured && db) {
                                    updateDoc(doc(db, "recorridos", myActiveRide.id), {
                                      status: 'cancelled'
                                    }).catch(err => handleFirestoreError(err, OperationType.WRITE, `recorridos/${myActiveRide.id}`));
                                  }

                                  window.dispatchEvent(new StorageEvent("storage", {
                                    key: "segurapp_active_rides",
                                    newValue: JSON.stringify(nuevas)
                                  }));
                                  mostrarAlertaCustom("🚫 Tu solicitud de recorrido ha sido cancelada.", null, "RECORRIDO CANCELADO");
                                }}
                                className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>

                          {myActiveRide.status === 'pending' ? (
                            <div className="text-center py-4 bg-white/5 rounded-2xl border border-white/5">
                              <p className="text-xs text-text-secondary px-4 leading-normal">
                                Estamos transmitiendo tu señal de solicitud satelital en Neiva para asignarte un piloto verificado. Espera unos segundos o comparte el enlace por WhatsApp.
                              </p>
                              <div className="mt-3 flex justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Trigger sharing coordinates link again
                                    const mapLink = myActiveRide.coordenadasGoogleMaps;
                                    let mensaje = `🚨 *SOLICITUD DE VIAJE SEGURO - SEGURAPP*\n\n`;
                                    mensaje += `👤 *Usuario:* ${myActiveRide.nombre}\n`;
                                    mensaje += `📍 *Origen:* ${myActiveRide.dePartida}\n`;
                                    if (mapLink) mensaje += `🛰️ *GPS:* ${mapLink}\n`;
                                    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
                                  }}
                                  className="bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/20 text-brand-primary text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                                >
                                  Compartir Alerta de Viaje
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3.5">
                              {/* Driver arrived special notice banner */}
                              {myActiveRide.conductorAfuera && (
                                <div className="bg-brand-primary/15 border border-brand-primary/30 p-3 rounded-2xl flex gap-2.5 items-start">
                                  <span className="text-lg">🏍️</span>
                                  <div>
                                    <p className="text-xs font-extrabold text-brand-primary uppercase">¡Tu piloto ya está afuera!</p>
                                    <p className="text-[11px] text-text-secondary leading-snug mt-0.5">
                                      Verifica los datos del vehículo y compártele tu PIN de seguridad para que el viaje pueda dar inicio formalmente.
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Driver Details */}
                              <div className="bg-white/5 border border-white/5 p-3 rounded-2xl flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden shrink-0 bg-neutral-800">
                                  <img src={myActiveRide.conductorFoto || DEFAULT_AVATAR} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-grow min-w-0">
                                  <h5 className="text-xs font-extrabold text-white truncate">{myActiveRide.conductorNombre}</h5>
                                  <p className="text-[10px] text-brand-secondary font-bold flex items-center gap-1 mt-0.5">
                                    {myActiveRide.conductorMoto} • <span className="font-mono bg-white/5 px-1 py-0.5 rounded border border-white/5 text-white">{myActiveRide.conductorPlaca}</span>
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="block text-[8px] text-text-secondary uppercase font-bold tracking-wider">PIN</span>
                                  <span className="text-xs font-mono font-extrabold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded">
                                    {myActiveRide.conductorPinSeguridad || "----"}
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2.5">
                                <a
                                  href={`tel:${myActiveRide.conductorTelefono}`}
                                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl py-2.5 text-center text-xs font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                                >
                                  📞 Llamar Piloto
                                </a>

                                {myActiveRide.status === 'accepted' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Passenger confirms they are onboard!
                                      const nuevas = recorridosActivos.map(r => r.id === myActiveRide.id ? { ...r, status: 'picked_up' as const } : r);
                                      setRecorridosActivos(nuevas);
                                      localStorage.setItem("segurapp_active_rides", JSON.stringify(nuevas));

                                      if (isFirebaseConfigured && db) {
                                        updateDoc(doc(db, "recorridos", myActiveRide.id), {
                                          status: 'picked_up'
                                        }).catch(err => handleFirestoreError(err, OperationType.WRITE, `recorridos/${myActiveRide.id}`));
                                      }

                                      window.dispatchEvent(new StorageEvent("storage", {
                                        key: "segurapp_active_rides",
                                        newValue: JSON.stringify(nuevas)
                                      }));
                                      mostrarAlertaCustom(
                                        "✅ ¡Viaje Iniciado! Tu piloto ha registrado el abordaje de forma segura. Disfruta tu recorrido protegido por SegurApp.",
                                        null,
                                        "VIAJE EN CURSO"
                                      );
                                    }}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2.5 text-center text-xs font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95 shadow-lg shadow-emerald-500/10"
                                  >
                                    👍 Abordar
                                  </button>
                                )}

                                {myActiveRide.status === 'picked_up' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Passenger completes ride
                                      const nuevas = recorridosActivos.map(r => r.id === myActiveRide.id ? { ...r, status: 'completed' as const } : r);
                                      setRecorridosActivos(nuevas);
                                      localStorage.setItem("segurapp_active_rides", JSON.stringify(nuevas));

                                      if (isFirebaseConfigured && db) {
                                        updateDoc(doc(db, "recorridos", myActiveRide.id), {
                                          status: 'completed'
                                        }).catch(err => handleFirestoreError(err, OperationType.WRITE, `recorridos/${myActiveRide.id}`));
                                      }

                                      window.dispatchEvent(new StorageEvent("storage", {
                                        key: "segurapp_active_rides",
                                        newValue: JSON.stringify(nuevas)
                                      }));
                                      mostrarAlertaCustom(
                                        "🏁 ¡Has llegado seguro a tu destino! Gracias por utilizar SegurApp para tu movilidad en Neiva.",
                                        () => {
                                          if (myActiveRide.conductorNombre) {
                                            setRecorridoCalificar(myActiveRide);
                                            setCalificacionEstrellas(5);
                                            setComentarioRating("");
                                          }
                                        },
                                        "LLEGADA EXITOSA"
                                      );
                                    }}
                                    className="flex-1 bg-brand-primary hover:bg-red-600 text-white rounded-xl py-2.5 text-center text-xs font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                                  >
                                    🏁 Finalizar
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Dispatch reservation settings form */}
                <div className="bg-bg-dark/95 border border-white/10 rounded-3xl p-6 mt-4 relative overflow-hidden shadow-xl animate-metallic">
                  
                  {/* Warning label */}
                  <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-xl p-3 mb-5 flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                    <p className="text-xs leading-normal font-semibold text-brand-primary">
                      ¡Reserva con 10 minutos de anticipación para asegurar tu piloto!
                    </p>
                  </div>

                  {/* Geolocation status / Maps selector */}
                  <div className="mb-5 border-b border-white/5 pb-5">
                    <div className="flex justify-between items-center mb-2.5">
                      <label className="block text-[10px] font-bold tracking-widest text-text-secondary uppercase">
                        Soporte Satelital (GPS)
                      </label>
                      <button
                        type="button"
                        onClick={solicitarGeolocalizacion}
                        disabled={solicitandoGPS}
                        className="text-[10px] font-bold text-brand-primary hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Compass className={`w-3 h-3 ${solicitandoGPS ? 'animate-spin' : ''}`} />
                        {solicitandoGPS ? "Buscando..." : "Sincronizar"}
                      </button>
                    </div>

                    <div className={`p-4 rounded-xl flex items-center gap-3 transition-colors ${ubicacionListo ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-brand-primary/5 border border-brand-primary/20'}`}>
                      <MapPin className={`w-5 h-5 shrink-0 ${ubicacionListo ? 'text-emerald-400' : 'text-brand-primary animate-pulse'}`} />
                      <div className="flex-grow min-w-0">
                        <p className="text-xs font-bold text-white uppercase tracking-wide">
                          {ubicacionListo ? "Ubicación fijada por satélite" : "GPS de partida"}
                        </p>
                        <p className="text-[11px] text-text-secondary mt-0.5 truncate font-mono">
                          {datosUbicacionActual}
                        </p>
                      </div>
                      {ubicacionListo && (
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    {/* Button to toggle manual input if GPS is weak */}
                    <button
                      type="button"
                      onClick={() => setShowOrigenManual(!showOrigenManual)}
                      className="text-[10px] text-text-secondary hover:text-white underline mt-3 block cursor-pointer"
                    >
                      {showOrigenManual ? "Ocultar origen manual" : "Establecer origen manual (opcional)"}
                    </button>

                    {showOrigenManual && (
                      <div className="mt-3">
                        <input
                          type="text"
                          value={origenManual}
                          onChange={(e) => setOrigenManual(e.target.value)}
                          className="w-full bg-bg-input border border-white/5 rounded-xl py-3 px-4 text-white text-xs focus:outline-none focus:border-brand-primary/60 transition-all"
                          placeholder="Ej: Carrera 5 # 10-24 Centro"
                        />
                      </div>
                    )}
                  </div>

                  {/* Optional route notes input */}
                  <div className="mb-6">
                    <label className="block text-[10px] font-bold tracking-widest text-text-secondary uppercase mb-2">
                      Notas de Ruta (Opcional)
                    </label>
                    <input
                      type="text"
                      id="reserva-notas"
                      value={reservaNotas}
                      onChange={(e) => setReservaNotas(e.target.value)}
                      className="w-full bg-bg-input border border-white/5 rounded-xl py-4 px-4 text-white text-sm focus:outline-none focus:border-brand-primary/60 transition-all"
                      placeholder="Ej: Llevar casco extra, maleta pesada..."
                    />
                    
                    {/* Notes quick recommendations chips */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {[
                        "Llevar casco extra",
                        "Maleta pesada",
                        "Viajo con equipaje",
                        "Se requiere cambio"
                      ].map((noteChip) => (
                        <button
                          key={noteChip}
                          type="button"
                          onClick={() => setReservaNotas(noteChip)}
                          className="text-[10px] font-semibold text-text-secondary bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full cursor-pointer transition-all"
                        >
                          {noteChip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ULTRA EYE-CATCHING ACTION BUTTON (btn-neon-solicitar with pulsoMagnetico & motorRalenti) */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={enviarReserva}
                      className="w-full text-white font-extrabold uppercase py-5 rounded-2xl cursor-pointer transition-all duration-300 active:scale-[0.96] flex items-center justify-center gap-3 border border-white/20 shadow-xl shadow-brand-primary/40 animate-engine-idle animate-magnetic-pulse"
                      style={{
                        background: 'linear-gradient(135deg, #ff1e27 0%, #e50914 100%)',
                        fontSize: '1.05rem',
                        letterSpacing: '1px'
                      }}
                    >
                      <Bike className="w-6 h-6 animate-bounce" />
                      Solicitar Servicio Ahora
                    </button>
                  </div>

                </div>

                {/* 🛡️ Contacts Integration Section */}
                <div className="bg-bg-dark/95 border border-white/10 rounded-3xl p-6 mt-4 relative overflow-hidden shadow-xl animate-metallic">
                  <h3 className="font-display text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                    <span className="text-brand-primary font-bold">🛡️</span> Contactos de Confianza
                  </h3>
                  <p className="text-xs text-text-secondary mb-4 leading-normal">
                    Vincula tu cuenta para agregar tus contactos de emergencia y compartirles tu recorrido y coordenadas en tiempo real de forma segura.
                  </p>

                  {/* If Google Contacts NOT connected */}
                  {!googleAccessToken ? (
                    <div className="flex flex-col items-center py-2">
                      <button
                        type="button"
                        onClick={vincularGoogleContacts}
                        className="w-full bg-bg-input hover:bg-neutral-900 border border-white/10 text-white rounded-xl py-4 flex items-center justify-center gap-2 text-xs font-bold uppercase cursor-pointer transition-all active:scale-[0.98]"
                      >
                        <User className="w-4 h-4 text-brand-primary" /> Sincronizar Google Contacts
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Search Contacts Bar */}
                      <div>
                        <label className="block text-[10px] font-bold tracking-widest text-text-secondary uppercase mb-2">
                          Buscar Contactos de Google
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={busquedaContacto}
                            onChange={(e) => setBusquedaContacto(e.target.value)}
                            className="w-full bg-bg-input border border-white/5 rounded-xl py-3 px-4 text-white text-xs focus:outline-none focus:border-brand-primary/60 transition-all"
                            placeholder="Buscar por nombre o número..."
                          />
                        </div>
                        
                        {/* Search Results */}
                        {busquedaContacto.trim().length > 0 && (
                          <div className="mt-2 bg-black/40 border border-white/5 rounded-xl divide-y divide-white/5 max-h-48 overflow-y-auto">
                            {cargandoContactos ? (
                              <div className="p-3 text-xs text-text-secondary text-center">Buscando satélite de contactos...</div>
                            ) : contactosFiltrados.length === 0 ? (
                              <div className="p-3 text-xs text-text-secondary text-center">No se encontraron contactos.</div>
                            ) : (
                              contactosFiltrados.map((contact) => {
                                const isAdded = contactosSeleccionados.some(s => s.telefono === contact.telefono);
                                return (
                                  <div key={contact.telefono} className="p-2.5 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden shrink-0 bg-neutral-800 flex items-center justify-center">
                                        {contact.foto ? (
                                          <img src={contact.foto} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                          <span className="text-[10px] font-bold text-white uppercase">{contact.nombre.charAt(0)}</span>
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-white truncate">{contact.nombre}</p>
                                        <p className="text-[10px] text-text-secondary font-mono">{contact.telefono}</p>
                                      </div>
                                    </div>
                                    
                                    <button
                                      type="button"
                                      disabled={isAdded}
                                      onClick={() => agregarContactoConfianza(contact)}
                                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${isAdded ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-brand-primary hover:bg-red-600 text-white'}`}
                                    >
                                      {isAdded ? "Agregado" : "Agregar"}
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* List of Trusted Contacts */}
                  {contactosSeleccionados.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-white/5">
                      <h4 className="text-[10px] font-bold tracking-widest text-brand-primary uppercase mb-3">
                        🛡️ Tus Contactos Activos ({contactosSeleccionados.length})
                      </h4>
                      <div className="space-y-3">
                        {contactosSeleccionados.map((contacto) => (
                          <div key={contacto.telefono} className="flex items-center justify-between bg-bg-input/60 border border-white/5 p-3 rounded-2xl gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full border-2 border-brand-primary/20 overflow-hidden shrink-0 bg-neutral-800 flex items-center justify-center">
                                {contacto.foto ? (
                                  <img src={contacto.foto} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <span className="text-xs font-bold text-white uppercase">{contacto.nombre.charAt(0)}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-extrabold text-white truncate">{contacto.nombre}</p>
                                <p className="text-[10px] text-text-secondary font-mono">{contacto.telefono}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => compartirRutaConContacto(contacto)}
                                className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 px-3 py-2 rounded-xl text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                title="Alerta rápida por WhatsApp"
                              >
                                <PhoneCall className="w-3.5 h-3.5" /> Compartir
                              </button>
                              <button
                                type="button"
                                onClick={() => eliminarContactoConfianza(contacto.telefono)}
                                className="p-2 rounded-xl bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-text-secondary transition-all cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 📅 Google Calendar & Trip Planner Section */}
                <div className="bg-bg-dark/95 border border-white/10 rounded-3xl p-6 mt-4 relative overflow-hidden shadow-xl animate-metallic">
                  <h3 className="font-display text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                    <span className="text-brand-primary font-bold">📅</span> Agenda y Calendar
                  </h3>
                  <p className="text-xs text-text-secondary mb-4 leading-normal">
                    Planifica tus próximos recorridos seguros integrando tu Google Calendar para sincronizar y agendar tus itinerarios en tiempo real.
                  </p>

                  {/* If Google Calendar NOT connected */}
                  {!googleAccessToken ? (
                    <div className="flex flex-col items-center py-2">
                      <button
                        type="button"
                        onClick={vincularGoogleCalendar}
                        className="w-full bg-bg-input hover:bg-neutral-900 border border-white/10 text-white rounded-xl py-4 flex items-center justify-center gap-2 text-xs font-bold uppercase cursor-pointer transition-all active:scale-[0.98]"
                      >
                        <Calendar className="w-4 h-4 text-brand-primary" /> Sincronizar Google Calendar
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Form / Toggle to Schedule a Ride */}
                      <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                        <button
                          type="button"
                          onClick={() => setShowAgendarViaje(!showAgendarViaje)}
                          className="w-full flex items-center justify-between text-xs font-bold uppercase text-white tracking-wider cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5 text-brand-primary">
                            <Plus className="w-4 h-4" /> Agendar Viaje Futuro
                          </span>
                          <span className="text-text-secondary text-[10px]">{showAgendarViaje ? "Ocultar" : "Mostrar formulario"}</span>
                        </button>

                        {showAgendarViaje && (
                          <form onSubmit={agendarRecorridoGoogleCalendar} className="mt-4 space-y-3">
                            <div>
                              <label className="block text-[10px] font-bold tracking-widest text-text-secondary uppercase mb-1">
                                Fecha del Recorrido
                              </label>
                              <input
                                type="date"
                                value={fechaAgenda}
                                onChange={(e) => setFechaAgenda(e.target.value)}
                                className="w-full bg-bg-input border border-white/5 rounded-xl py-2.5 px-3 text-white text-xs focus:outline-none focus:border-brand-primary/60 transition-all"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold tracking-widest text-text-secondary uppercase mb-1">
                                Hora de Partida
                              </label>
                              <input
                                type="time"
                                value={horaAgenda}
                                onChange={(e) => setHoraAgenda(e.target.value)}
                                className="w-full bg-bg-input border border-white/5 rounded-xl py-2.5 px-3 text-white text-xs focus:outline-none focus:border-brand-primary/60 transition-all"
                                required
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={agendandoCalendario}
                              className="w-full bg-brand-primary hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold uppercase py-3 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              {agendandoCalendario ? "Agendando..." : "Guardar en Google Calendar"}
                            </button>
                          </form>
                        )}
                      </div>

                      {/* Local Notification Center */}
                      <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                            <Bell className="w-4 h-4 text-amber-400" /> Centro de Alertas
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded-full uppercase">
                            Activo
                          </span>
                        </div>
                        <p className="text-[10px] text-text-secondary leading-normal mb-3">
                          Las notificaciones locales te recordarán automáticamente 10 minutos antes de cada viaje de SegurApp agendado en tu Google Calendar.
                        </p>
                        <button
                          type="button"
                          onClick={simularRecordatorioPrueba}
                          className="w-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase py-2.5 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <BellRing className="w-3.5 h-3.5" /> Simular Alerta (Viaje en 10 min)
                        </button>
                      </div>

                      {/* Display upcoming calendar events */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                          <h4 className="text-[10px] font-bold tracking-widest text-brand-primary uppercase">
                            📅 Próximos Eventos en tu Agenda
                          </h4>
                          <button
                            type="button"
                            onClick={() => cargarGoogleCalendario(googleAccessToken)}
                            className="text-[9px] font-bold tracking-wider text-text-secondary hover:text-white uppercase"
                          >
                            Actualizar
                          </button>
                        </div>

                        {cargandoCalendario ? (
                          <div className="py-6 text-center text-xs text-text-secondary animate-pulse">
                            Buscando itinerario satelital...
                          </div>
                        ) : googleCalendarEvents.length === 0 ? (
                          <div className="py-4 text-center text-xs text-text-secondary">
                            No se encontraron eventos próximos en tu calendario principal.
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                            {googleCalendarEvents.map((event) => {
                              const tieneUbicacion = !!event.ubicacion;
                              const inicioFormateado = event.inicio ? (() => {
                                try {
                                  const d = new Date(event.inicio);
                                  return d.toLocaleString("es-CO", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                  });
                                } catch (e) {
                                  return event.inicio;
                                }
                              })() : "Sin fecha";

                              return (
                                <div
                                  key={event.id}
                                  className="bg-bg-input/40 border border-white/5 p-3 rounded-2xl flex flex-col gap-2 hover:border-brand-primary/30 transition-all duration-200"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <h5 className="text-xs font-extrabold text-white truncate">{event.titulo}</h5>
                                      <p className="text-[10px] text-brand-primary font-mono mt-0.5 flex items-center gap-1">
                                        <Clock className="w-3 h-3 shrink-0" /> {inicioFormateado}
                                      </p>
                                      {(() => {
                                        const matchedTrip = viajesProgramadosGoogle.find(v => v.id === event.id);
                                        const esViajeSegurApp = event.titulo.includes("SegurApp") || (matchedTrip !== undefined);
                                        if (esViajeSegurApp) {
                                          return (
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                              {matchedTrip?.notificado ? (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                                  <Check className="w-2.5 h-2.5" /> Recordado (10m antes)
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full animate-pulse">
                                                  <BellRing className="w-2.5 h-2.5 text-amber-400 shrink-0" /> Alarma 10m activa
                                                </span>
                                              )}
                                            </div>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </div>
                                    {event.link && (
                                      <a
                                        href={event.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-text-secondary hover:text-white underline shrink-0 font-semibold"
                                      >
                                        Ver Evento
                                      </a>
                                    )}
                                  </div>

                                  {tieneUbicacion ? (
                                    <p className="text-[10px] text-text-secondary truncate flex items-center gap-1 bg-black/20 p-1.5 rounded-lg border border-white/5">
                                      <MapPin className="w-3.5 h-3.5 text-brand-primary shrink-0" /> {event.ubicacion}
                                    </p>
                                  ) : (
                                    <p className="text-[10px] text-text-secondary italic">Sin ubicación definida</p>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => seleccionarEventoCalendarioParaViaje(event)}
                                    className="w-full bg-neutral-800 hover:bg-neutral-700 border border-white/5 text-white text-[10px] font-bold uppercase py-2 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                                  >
                                    <Bike className="w-3 h-3 text-brand-primary" /> Solicitar Viaje para este Evento
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                </>
                )}

              </div>

              {/* Bottom quick contact bar */}
              <div className="flex gap-4 mt-8 relative z-50">
                <button
                  type="button"
                  onClick={abrirConfiguracion}
                  className="flex-1 bg-bg-dark border border-white/10 text-white rounded-2xl py-4 flex items-center justify-center gap-2 text-xs font-bold uppercase cursor-pointer hover:bg-neutral-900 transition-all active:scale-[0.97]"
                >
                  <Sliders className="w-4 h-4 text-brand-primary" /> Mi Perfil
                </button>
                
                <a
                  href="tel:3189882787"
                  className="flex-1 bg-bg-input border border-brand-primary/20 text-brand-primary rounded-2xl py-4 flex items-center justify-center gap-2 text-xs font-bold uppercase cursor-pointer hover:bg-brand-primary/5 transition-all active:scale-[0.97]"
                >
                  <PhoneCall className="w-4 h-4" /> Soporte
                </a>
              </div>

              {/* Red prominent Log Out button / Botón de Cerrar Sesión */}
              <button
                type="button"
                onClick={cerrarSesion}
                className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-500 hover:text-red-400 rounded-2xl py-4 flex items-center justify-center gap-2 text-xs font-bold uppercase cursor-pointer transition-all active:scale-[0.97] mt-4 relative z-50 shadow-md shadow-red-500/5 font-display tracking-wider"
              >
                <LogOut className="w-4 h-4" /> Cerrar Sesión
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Universal Footer */}
        <footer className="text-center text-[11px] text-text-secondary mt-12 pt-6 border-t border-white/5 leading-relaxed">
          © 2026 SegurApp Recorridos. Todos los derechos reservados.<br />
          Desarrollado con alto rendimiento por <span className="text-white font-semibold">Sergio Chala</span>
        </footer>

      </div>

      {/* CUSTOM PREMIUM DIALOG / MOTORBIKE ALARM POPUP */}
      <AnimatePresence>
        {alertOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-xs bg-bg-dark border-2 border-brand-primary rounded-3xl p-6 shadow-2xl relative overflow-hidden"
            >
              {/* Metallic swept reflection on dialog */}
              <div className="absolute inset-0 bg-black/10 animate-metallic pointer-events-none" />

              <div className="flex items-center gap-2.5 text-brand-primary text-[10px] font-bold tracking-widest uppercase border-b border-white/5 pb-3 mb-4">
                <Wrench className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
                <span>{alertTitle}</span>
              </div>
              
              <div className="text-sm leading-relaxed text-white font-medium mb-6">
                {alertText}
              </div>

              <button
                type="button"
                onClick={cerrarAlertaCustom}
                className="w-full bg-transparent hover:bg-brand-primary/10 border border-brand-primary text-brand-primary py-3 rounded-xl font-bold uppercase text-xs tracking-wider cursor-pointer transition-all duration-100 active:bg-brand-primary active:text-black"
              >
                Entendido / Aceptar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🚖 DRIVER PICKUP CONFIRMATION DIALOG / ¡YA TE VAN A RECOGER! */}
      <AnimatePresence>
        {showRecogidaDialog && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-full max-w-sm bg-bg-dark border-2 border-brand-primary rounded-3xl p-6 shadow-2xl relative overflow-hidden"
            >
              {/* Decorative radial lighting */}
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-brand-primary/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute inset-0 bg-black/5 animate-metallic pointer-events-none" />

              {/* Status Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3.5 mb-4">
                <span className="flex items-center gap-2 text-brand-primary text-[10px] font-extrabold tracking-widest uppercase">
                  <BellRing className="w-4 h-4 text-brand-primary animate-bounce" /> ¡YA TE VAN A RECOGER!
                </span>
                <span className="text-[9px] font-extrabold text-amber-400 bg-amber-400/15 border border-amber-400/20 px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                  Piloto Asignado
                </span>
              </div>

              {/* Driver Identity Card & Details */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-4">
                  {/* Rounded avatar with status light */}
                  <div className="relative shrink-0">
                    <img
                      src={conductorRecogida.foto}
                      className="w-16 h-16 rounded-full object-cover border-2 border-brand-primary"
                      alt="Conductor"
                    />
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-bg-dark flex items-center justify-center">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-grow">
                    <h3 className="text-white font-extrabold text-sm uppercase tracking-wide font-display truncate">
                      {conductorRecogida.nombre}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-amber-400 text-xs font-bold">{conductorRecogida.calificacion}</span>
                      <span className="text-[10px] text-text-secondary font-medium">• Piloto de Neiva</span>
                    </div>
                    <p className="text-[10px] text-brand-primary font-mono mt-1 font-bold">
                      {conductorRecogida.moto}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/5 text-xs">
                  <div>
                    <span className="block text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-0.5">Placa Moto</span>
                    <strong className="text-white text-sm font-mono tracking-wider bg-white/5 px-2 py-0.5 rounded border border-white/5 inline-block">{conductorRecogida.placa}</strong>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-0.5">Tiempo de Llegada</span>
                    <strong className="text-brand-primary text-sm font-extrabold">{conductorRecogida.tiempoEstimado}</strong>
                  </div>
                </div>
              </div>

              {/* Safety security pin / PIN de seguridad */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-3 text-center mb-5">
                <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest mb-1">
                  🛡️ Código de Abordaje Seguro
                </p>
                <p className="text-lg font-extrabold text-white font-mono tracking-widest">
                  PIN: <span className="text-amber-400">{conductorRecogida.pinSeguridad}</span>
                </p>
                <p className="text-[10px] text-text-secondary leading-normal mt-1">
                  Verifica que el piloto coincida con los datos y te proporcione este PIN antes de subirte.
                </p>
              </div>

              {/* Action options */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowRecogidaDialog(false);
                    mostrarAlertaCustom(
                      "🚀 ¡Excelente! Tu abordaje seguro ha sido verificado con éxito. El GPS satelital de SegurApp continúa monitoreando tu viaje en Neiva. ¡Buen viaje!",
                      null,
                      "ABORDAJE SEGURO"
                    );
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold uppercase py-3.5 rounded-xl text-xs tracking-widest transition-all duration-150 active:scale-[0.98] shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1.5 cursor-pointer font-display"
                >
                  <Check className="w-4 h-4 text-black stroke-[3]" /> ¡Confirmar Abordaje!
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${conductorRecogida.telefono}`}
                    className="bg-white/5 hover:bg-white/10 border border-white/15 text-white py-3 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-brand-primary" /> Llamar Piloto
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      if (contactosSeleccionados.length === 0) {
                        mostrarAlertaCustom(
                          "⚠️ No tienes contactos de confianza agregados aún. Por favor, vincula tus contactos desde el panel de seguridad.",
                          null,
                          "CONTACTO REQUERIDO"
                        );
                        return;
                      }
                      
                      // Notify all trusted contacts with driver's details
                      contactosSeleccionados.forEach(contacto => {
                        let mensaje = `🚨 *SEGUIMIENTO DE VIAJE EN CAMINO - SEGURAPP* \n`;
                        mensaje += `───────────────────────\n`;
                        mensaje += `Hola *${contacto.nombre}*, mi conductor ya está en camino a recogerme. Te comparto la información de seguridad de mi piloto:\n\n`;
                        mensaje += `👤 *Piloto:* ${conductorRecogida.nombre}\n`;
                        mensaje += `🏍️ *Vehículo:* ${conductorRecogida.moto}\n`;
                        mensaje += `🔢 *Placa:* ${conductorRecogida.placa}\n`;
                        mensaje += `⏱️ *Llegada estimada:* ${conductorRecogida.tiempoEstimado}\n`;
                        mensaje += `🔐 *PIN de Confirmación:* ${conductorRecogida.pinSeguridad}\n`;
                        mensaje += `\n───────────────────────\n`;
                        mensaje += `_Por favor, hazle seguimiento a mi recorrido por seguridad._`;

                        window.open(`https://wa.me/${contacto.telefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
                      });
                    }}
                    className="bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/25 text-brand-primary py-3 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  >
                    <Zap className="w-3.5 h-3.5 fill-brand-primary text-brand-primary shrink-0" /> Alertar Contactos
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowRecogidaDialog(false)}
                  className="w-full bg-transparent hover:bg-white/5 border border-white/10 text-text-secondary py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest cursor-pointer transition-all active:scale-[0.98] text-center"
                >
                  Cerrar
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🚀 SEGURAPP AI ASSISTANT OVERLAY & FLOATING ACTION BUTTON */}
      {pantalla === 'home' && usuario && (
        <>
          {/* Pulsing Floating Action Button in Bottom Right */}
          <button
            type="button"
            onClick={() => setShowAiAssistant(true)}
            className="fixed bottom-6 right-6 z-[90] bg-gradient-to-tr from-brand-primary to-orange-500 hover:from-orange-500 hover:to-brand-primary text-white shadow-lg shadow-brand-primary/30 w-14 h-14 rounded-full border border-white/20 transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer group"
            title="Asistente de Seguridad AI"
          >
            <Sparkles className="w-6 h-6 animate-pulse group-hover:rotate-12 transition-transform duration-300" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-black/20"></span>
            </span>
          </button>

          {/* AI Assistant Chat Panel Dialog Overlay */}
          <AnimatePresence>
            {showAiAssistant && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4"
              >
                {/* Backdrop Click to Close */}
                <div 
                  className="absolute inset-0 cursor-default" 
                  onClick={() => setShowAiAssistant(false)} 
                />

                <motion.div
                  initial={{ y: "100%", opacity: 0.5 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "100%", opacity: 0.5 }}
                  transition={{ type: "spring", damping: 25, stiffness: 220 }}
                  className="relative w-full max-w-md bg-bg-dark border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col h-[90vh] sm:h-[620px] shadow-2xl animate-metallic"
                >
                  {/* Decorative Header Border Accent */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-primary via-orange-500 to-brand-secondary" />

                  {/* Chat Header */}
                  <div className="bg-bg-dark/95 border-b border-white/5 p-4 flex items-center justify-between shrink-0 relative">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center relative">
                        <Sparkles className="w-5 h-5 text-brand-primary" />
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-bg-dark" />
                      </div>
                      <div>
                        <h3 className="font-display text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          SegurApp AI
                        </h3>
                        <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Núcleo de Seguridad Activo
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Clear history */}
                      <button
                        type="button"
                        onClick={limpiarChatAI}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white text-[10px] font-bold uppercase transition-all cursor-pointer"
                        title="Limpiar Conversación"
                      >
                        Reiniciar
                      </button>
                      
                      {/* Close button */}
                      <button
                        type="button"
                        onClick={() => setShowAiAssistant(false)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-text-secondary transition-all cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Chat Messages Body */}
                  <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-bg-dark/40 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {aiMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`p-3.5 rounded-2xl text-[11px] leading-relaxed max-w-[85%] whitespace-pre-wrap shadow-md ${
                            msg.role === 'user'
                              ? 'bg-brand-primary text-white rounded-tr-none'
                              : 'bg-white/5 border border-white/10 text-text-primary rounded-tl-none'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <span className="text-[8px] text-text-secondary font-mono mt-1 px-1">
                          {msg.role === 'user' ? 'Tú' : 'SegurApp AI'}
                        </span>
                      </div>
                    ))}
                    {aiLoading && (
                      <div className="flex flex-col items-start">
                        <div className="bg-white/5 border border-white/5 p-3.5 rounded-2xl rounded-tl-none text-[11px] text-text-secondary max-w-[80%] flex items-center gap-2 shadow-sm">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="font-mono text-[9px] text-brand-primary animate-pulse">Trazando rutas seguras en Neiva...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Prompt Chip suggestions */}
                  <div className="px-4 py-2 shrink-0 border-t border-white/5 bg-bg-dark/95">
                    <p className="text-[8px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Consultas de seguridad rápidas:</p>
                    <div className="flex gap-2 overflow-x-auto pb-1.5 -mx-1 px-1 scrollbar-none">
                      <button
                        type="button"
                        onClick={() => enviarMensajeAI("¿Cuáles son las rutas y avenidas más iluminadas y recomendadas para transitar en moto en Neiva de noche?")}
                        className="shrink-0 bg-white/5 hover:bg-white/10 hover:border-brand-primary/30 border border-white/5 text-[9px] font-bold text-white px-2.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap active:scale-95"
                      >
                        🗺️ Rutas seguras Neiva
                      </button>
                      <button
                        type="button"
                        onClick={() => enviarMensajeAI("¿Qué recomendaciones de seguridad y prevención debo tener en cuenta al viajar como pasajero de noche?")}
                        className="shrink-0 bg-white/5 hover:bg-white/10 hover:border-brand-primary/30 border border-white/5 text-[9px] font-bold text-white px-2.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap active:scale-95"
                      >
                        🌙 Prevención nocturna
                      </button>
                      <button
                        type="button"
                        onClick={() => enviarMensajeAI("Dame un checklist de seguridad rápido antes de subirme a la moto de un recorrido de SegurApp.")}
                        className="shrink-0 bg-white/5 hover:bg-white/10 hover:border-brand-primary/30 border border-white/5 text-[9px] font-bold text-white px-2.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap active:scale-95"
                      >
                        📋 Checklist Pasajero
                      </button>
                      <button
                        type="button"
                        onClick={() => enviarMensajeAI("¿Cuáles son las normas de seguridad vial, uso de chaleco y velocidad recomendadas para conductores en Neiva?")}
                        className="shrink-0 bg-white/5 hover:bg-white/10 hover:border-brand-primary/30 border border-white/5 text-[9px] font-bold text-white px-2.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap active:scale-95"
                      >
                        🏍️ Tips para Conductores
                      </button>
                    </div>
                  </div>

                  {/* Input form footer */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      enviarMensajeAI();
                    }}
                    className="p-4 bg-bg-dark border-t border-white/5 flex gap-2 shrink-0"
                  >
                    <input
                      type="text"
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      placeholder="Pregunta a la IA sobre rutas, seguridad..."
                      disabled={aiLoading}
                      className="flex-grow bg-bg-input border border-white/10 focus:border-brand-primary/50 text-white rounded-xl px-4 py-2.5 text-xs outline-none transition-all placeholder:text-text-secondary animate-none"
                    />
                    <button
                      type="submit"
                      disabled={aiLoading || !aiInput.trim()}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        aiInput.trim() && !aiLoading
                          ? 'bg-brand-primary hover:bg-red-600 text-white shadow-md shadow-brand-primary/10 active:scale-95'
                          : 'bg-white/5 border border-white/5 text-text-secondary cursor-not-allowed'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ⭐ PASAJERO RATING DIALOG OVERLAY */}
          <AnimatePresence>
            {recorridoCalificar && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-4"
              >
                {/* Backdrop Click */}
                <div 
                  className="absolute inset-0 cursor-default" 
                  onClick={() => {
                    // Prevent accidental dismissal if sending, otherwise reset
                    if (!enviandoCalificacion) {
                      setRecorridoCalificar(null);
                      setCalificacionEstrellas(5);
                      setComentarioRating("");
                    }
                  }} 
                />

                <motion.div
                  initial={{ scale: 0.95, y: 20, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.95, y: 20, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 220 }}
                  className="relative w-full max-w-md bg-bg-dark border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6 z-10 animate-metallic"
                >
                  {/* Decorative Header Accent */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-400 via-brand-primary to-orange-500" />

                  <h3 className="font-display text-base font-black text-white uppercase tracking-wider text-center mt-2">
                    Califica tu Piloto
                  </h3>
                  <p className="text-[10px] text-text-secondary font-mono text-center mt-1 uppercase tracking-widest">
                    SegurApp Calidad de Servicio Neiva
                  </p>

                  {/* Driver Profile Card */}
                  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col items-center text-center mt-5">
                    <div className="w-16 h-16 rounded-full border-2 border-brand-primary/30 overflow-hidden bg-neutral-800 shadow-lg mb-2.5">
                      <img src={recorridoCalificar.conductorFoto || DEFAULT_AVATAR} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <h4 className="text-sm font-extrabold text-white">{recorridoCalificar.conductorNombre}</h4>
                    <p className="text-[11px] text-brand-secondary font-bold mt-1">
                      {recorridoCalificar.conductorMoto} • <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/5 text-white">{recorridoCalificar.conductorPlaca}</span>
                    </p>
                    <p className="text-[10px] text-text-secondary mt-1 max-w-xs leading-normal">
                      Ayúdanos a mantener altos estándares de seguridad y confianza en Neiva calificando tu experiencia en este viaje.
                    </p>
                  </div>

                  {/* Star Selector */}
                  <div className="flex flex-col items-center mt-6">
                    <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider mb-2">¿Cómo estuvo tu recorrido?</span>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setCalificacionEstrellas(star)}
                          className="p-1 hover:scale-125 transition-transform duration-200 cursor-pointer"
                        >
                          <svg
                            className={`w-8 h-8 transition-colors duration-200 ${
                              star <= calificacionEstrellas
                                ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                                : 'text-neutral-600 fill-transparent'
                            }`}
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.246.588 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.971-2.883a1 1 0 00-1.175 0l-3.97 2.883c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118L2.98 10.1c-.773-.565-.375-1.81.587-1.81H8.5a1 1 0 00.951-.69l1.519-4.674z"
                            />
                          </svg>
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-black text-amber-400 mt-2">
                      {calificacionEstrellas === 1 && "⚠️ Muy malo"}
                      {calificacionEstrellas === 2 && "⚡ Regular"}
                      {calificacionEstrellas === 3 && "👍 Aceptable"}
                      {calificacionEstrellas === 4 && "✨ Muy bueno"}
                      {calificacionEstrellas === 5 && "🛡️ Excelente e Impecable"}
                    </span>
                  </div>

                  {/* Highlight tags */}
                  <div className="mt-5">
                    <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider mb-2 block text-center">Aspectos destacados:</span>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {[
                        "Conducción Segura 🛡️",
                        "Excelente Ruta 🗺️",
                        "Uso de EPP / Casco 🏍️",
                        "Piloto Amable 🤝",
                        "Buena Velocidad ⚡",
                        "Identidad Verificada ✅"
                      ].map((tag) => {
                        const contains = comentarioRating.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              if (contains) {
                                setComentarioRating(
                                  comentarioRating
                                    .replace(tag, "")
                                    .replace(/,\s*,/g, ",")
                                    .trim()
                                );
                              } else {
                                setComentarioRating(
                                  comentarioRating 
                                    ? `${comentarioRating}, ${tag}`
                                    : tag
                                );
                              }
                            }}
                            className={`text-[9px] font-bold px-2.5 py-1.5 rounded-full border transition-all cursor-pointer active:scale-95 ${
                              contains
                                ? 'bg-brand-primary/20 border-brand-primary text-white shadow-sm'
                                : 'bg-white/5 border-white/5 text-text-secondary hover:text-white'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Comment inputs */}
                  <div className="mt-5">
                    <textarea
                      value={comentarioRating}
                      onChange={(e) => setComentarioRating(e.target.value)}
                      placeholder="Escribe comentarios adicionales (opcional)..."
                      className="w-full bg-bg-input border border-white/10 focus:border-brand-primary/50 text-white rounded-xl p-3 text-[11px] h-20 outline-none resize-none transition-all placeholder:text-text-secondary"
                      maxLength={200}
                    />
                    <div className="text-right text-[8px] text-text-secondary font-mono mt-1">
                      {comentarioRating.length}/200 caracteres
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setRecorridoCalificar(null);
                        setCalificacionEstrellas(5);
                        setComentarioRating("");
                      }}
                      disabled={enviandoCalificacion}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white text-xs font-bold uppercase py-3 rounded-xl transition-all cursor-pointer text-center"
                    >
                      Omitir
                    </button>
                    <button
                      type="button"
                      onClick={guardarCalificacionConductor}
                      disabled={enviandoCalificacion}
                      className="flex-1 bg-gradient-to-tr from-brand-primary to-orange-500 hover:from-orange-500 hover:to-brand-primary text-white text-xs font-bold uppercase py-3 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1 shadow-lg shadow-brand-primary/20"
                    >
                      {enviandoCalificacion ? "Guardando..." : "Calificar"}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
