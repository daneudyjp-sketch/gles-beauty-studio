import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  Calendar,
  Clock,
  Check,
  Sparkles,
  Phone,
  Mail,
  User,
  ChevronRight,
  ChevronLeft,
  Shield,
  X,
  Plus,
  Trash2,
  Edit3,
  MessageCircle,
  CheckCircle2,
  Ban,
  CreditCard,
  Lock,
  Copy,
  Cloud
} from 'lucide-react';

// --- LECTURA SEGURA DE CREDENCIALES (COMPATIBLE CON PREVIEW Y VERCEL) ---
function getSafeFirebaseConfig() {
  // 1. Entorno interactivo (__firebase_config)
  try {
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
      return {
        config: JSON.parse(__firebase_config),
        mode: 'preview'
      };
    }
  } catch (e) {
    // Continuar con detección estándar
  }

  // 2. Variables globales inyectadas en window o process.env (Vercel / Producción)
  try {
    const envSource =
      (typeof window !== 'undefined' && window.__ENV__) ||
      (typeof process !== 'undefined' && process.env) ||
      {};

    const apiKey = envSource.VITE_FIREBASE_API_KEY || envSource.REACT_APP_FIREBASE_API_KEY;
    const projectId = envSource.VITE_FIREBASE_PROJECT_ID || envSource.REACT_APP_FIREBASE_PROJECT_ID;
    const appId = envSource.VITE_FIREBASE_APP_ID || envSource.REACT_APP_FIREBASE_APP_ID;

    if (apiKey && projectId && appId) {
      return {
        config: {
          apiKey,
          authDomain: envSource.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
          projectId,
          storageBucket: envSource.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
          messagingSenderId: envSource.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
          appId
        },
        mode: 'vercel'
      };
    }
  } catch (e) {
    // Continuar en modo local
  }

  return { config: null, mode: 'local' };
}

const { config: firebaseConfig, mode: firebaseMode } = getSafeFirebaseConfig();
const appId = typeof __app_id !== 'undefined' ? __app_id : 'gles-beauty-studio';

let auth = null;
let db = null;

if (firebaseConfig) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error('Error inicializando Firebase:', error);
  }
}

// --- CATÁLOGO OFICIAL DE SERVICIOS (RD$) ---
const DEFAULT_SERVICES = [
  // 1. Pestañas Pelo a Pelo (Bloque obligatorio de 180 min)
  { id: 'pelo-clasicas', category: 'Pestañas Pelo a Pelo', name: 'Pestañas Clásicas', price: 1500, badge: 'Apertura' },
  { id: 'pelo-2d', category: 'Pestañas Pelo a Pelo', name: 'Pestañas Volumen 2D', price: 1995, badge: 'Apertura' },
  { id: 'pelo-3d4d', category: 'Pestañas Pelo a Pelo', name: 'Pestañas Volumen 3D-4D', price: 2295, badge: 'Apertura' },
  { id: 'pelo-5d6d', category: 'Pestañas Pelo a Pelo', name: 'Pestañas Volumen 5D-6D', price: 2550, badge: 'Apertura' },
  { id: 'pelo-tupidas', category: 'Pestañas Pelo a Pelo', name: 'Pestañas Tupidas', price: 2955, badge: 'Apertura' },

  // 2. Pestañas de Grupito (Servicios express - 90 min)
  { id: 'grupito-natural', category: 'Pestañas de Grupito', name: 'Pestañas de grupito Natural', price: 300, badge: 'Apertura' },
  { id: 'grupito-ligero', category: 'Pestañas de Grupito', name: 'Pestañas de grupito Volumen Ligero', price: 350 },
  { id: 'grupito-volumen', category: 'Pestañas de Grupito', name: 'Pestañas de grupito Volumen', price: 400 },
  { id: 'grupito-mega', category: 'Pestañas de Grupito', name: 'Pestañas de grupito Mega Volumen', price: 450 },

  // 3. Lifting & Laminado (90 min)
  { id: 'laminado-cejas', category: 'Lifting & Laminado', name: 'Laminado de Cejas', price: 1000 },
  { id: 'lifting-pestanas', category: 'Lifting & Laminado', name: 'Lifting de Pestañas', price: 900 },

  // 4. Tintado & Depilación de Cejas (90 min)
  { id: 'tintado-hena', category: 'Tintado & Depilación de Cejas', name: 'Tintado de Cejas con Hena', price: 300 },
  { id: 'depilacion-navajas', category: 'Tintado & Depilación de Cejas', name: 'Depilación de Cejas con Navajas', price: 100 },
  { id: 'depilacion-hilo', category: 'Tintado & Depilación de Cejas', name: 'Depilación de Cejas con Hilo', price: 350 },
  { id: 'depilacion-cera', category: 'Tintado & Depilación de Cejas', name: 'Depilación de Cejas con Cera', price: 300 }
];

const DEFAULT_SETTINGS = {
  bankInfo: 'Banco Popular / Banreservas / Qik | Cuenta de Ahorros: 000-000000-0 | Titular: GLES Beauty Studio (Edita estos datos en el Panel Admin)',
  depositNote: 'Para asegurar tu espacio se requiere un adelanto mínimo de RD$300 (o el 30% en servicios mayores a RD$1,000).',
  adminPin: '1909'
};

// --- UTILIDADES DE TIEMPO Y FECHA ---
const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const formatTime12h = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const formatDateSpanish = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-DO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// --- LOGOTIPO OFICIAL EXACTO (image_a417cc.jpg) ---
const GlesLogo = ({ className = 'w-72 sm:w-96' }) => (
  <div className={`overflow-hidden flex items-center justify-center bg-white ${className}`}>
    <img
      src="image_a417cc.jpg"
      onError={(e) => {
        if (!e.target.dataset.triedSlash) {
          e.target.dataset.triedSlash = 'true';
          e.target.src = '/image_a417cc.jpg';
        }
      }}
      alt="GLES BEAUTY STUDIO"
      className="w-full h-36 sm:h-44 object-cover object-center select-none pointer-events-none"
    />
  </div>
);

// --- ALMACENAMIENTO LOCAL DE RESPALDO ---
const STORAGE_KEYS = {
  APPOINTMENTS: 'gles_appointments_v1',
  BLOCKS: 'gles_blocked_slots_v1',
  SERVICES: 'gles_services_v1',
  SETTINGS: 'gles_settings_v1'
};

const readLocal = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeLocal = (key, val) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // Ignorar si localStorage está restringido
  }
};

export default function App() {
  // --- AUTENTICACIÓN FIREBASE ---
  const [user, setUser] = useState(null);

  // --- ESTADOS PRINCIPALES DE DATOS ---
  const [appointments, setAppointments] = useState(() => readLocal(STORAGE_KEYS.APPOINTMENTS, []));
  const [blockedSlots, setBlockedSlots] = useState(() => readLocal(STORAGE_KEYS.BLOCKS, []));
  const [services, setServices] = useState(() => readLocal(STORAGE_KEYS.SERVICES, DEFAULT_SERVICES));
  const [settings, setSettings] = useState(() => readLocal(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS));
  const [loadingData, setLoadingData] = useState(Boolean(db));

export default function App() {
  // --- AUTENTICACIÓN FIREBASE ---
  const [user, setUser] = useState(null);

  // --- ESTADOS PRINCIPALES DE DATOS ---
  const [appointments, setAppointments] = useState(() => readLocal(STORAGE_KEYS.APPOINTMENTS, []));
  const [blockedSlots, setBlockedSlots] = useState(() => readLocal(STORAGE_KEYS.BLOCKS, []));
  const [services, setServices] = useState(() => readLocal(STORAGE_KEYS.SERVICES, DEFAULT_SERVICES));
  const [settings, setSettings] = useState(() => readLocal(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS));
  const [loadingData, setLoadingData] = useState(Boolean(db));

  // --- ESTADOS DE FLUJO DE RESERVA ---
  const [step, setStep] = useState(1); // 1: Servicios, 2: Fecha/Hora, 3: Datos & Adelanto, 4: Confirmación
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [clientForm, setClientForm] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [lastBooking, setLastBooking] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // --- ESTADOS PANEL DE ADMINISTRACIÓN ---
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminTab, setAdminTab] = useState('citas'); // 'citas' | 'bloqueos' | 'servicios' | 'config'
  const [blockForm, setBlockForm] = useState({
    date: '',
    fullDay: false,
    startTime: '09:00',
    endTime: '12:30',
    reason: ''
  });
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editPriceVal, setEditPriceVal] = useState(300);
  const [editNameVal, setEditNameVal] = useState('');
  const [settingsForm, setSettingsForm] = useState(() => readLocal(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS));

const confirmarYNotificarCliente = (apt) => {
    const telefonoLimpio = String(apt.clientPhone || '').replace(/\D/g, '');
    const mensaje = `¡Cita confirmada! ✨ Hola *${apt.clientName || 'Cliente'}*, te escribimos de Gles Beauty Studio para confirmarte que tu cita ha sido registrada y aprobada con éxito:\n\n📌 *Servicio:* ${apt.serviceName || apt.servicio}\n📅 *Fecha:* ${apt.date || apt.fecha}\n🕒 *Hora:* ${apt.time || apt.hora}\n\n¡Te esperamos con mucho gusto! 💖`;

    const url = `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };
  // --- INICIALIZAR FECHA POR DEFECTO (LUNES A SÁBADO) ---
  useEffect(() => {
    const today = new Date();
  // --- INICIALIZAR FECHA POR DEFECTO (LUNES A SÁBADO) ---
  useEffect(() => {
    const today = new Date();
    const candidate = new Date(today);
    if (candidate.getDay() === 0) {
      candidate.setDate(candidate.getDate() + 1);
    }
    const yyyy = candidate.getFullYear();
    const mm = String(candidate.getMonth() + 1).padStart(2, '0');
    const dd = String(candidate.getDate()).padStart(2, '0');
    const formatted = `${yyyy}-${mm}-${dd}`;
    setSelectedDate(formatted);
    setBlockForm((prev) => ({ ...prev, date: formatted }));
  }, []);

  // --- 1. INICIALIZAR AUTENTICACIÓN FIREBASE ANTES DE CONSULTAR ---
  useEffect(() => {
    if (!auth) {
      setLoadingData(false);
      return;
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error('Error autenticando en Firebase:', err);
        setLoadingData(false);
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoadingData(false);
    });

    return () => unsubscribe();
  }, []);

  // --- 2. SUSCRIPCIÓN EN TIEMPO REAL A FIRESTORE ---
  useEffect(() => {
    if (!db || !user) return;

    const appointmentsCol = collection(db, 'artifacts', appId, 'public', 'data', 'appointments');
    const blocksCol = collection(db, 'artifacts', appId, 'public', 'data', 'blocked_slots');
    const servicesDoc = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'services');
    const studioDoc = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'studio');

    const unsubAppointments = onSnapshot(
      appointmentsCol,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAppointments(list);
        writeLocal(STORAGE_KEYS.APPOINTMENTS, list);
        setLoadingData(false);
      },
      (err) => {
        console.error('Error leyendo citas:', err);
        setLoadingData(false);
      }
    );

    const unsubBlocks = onSnapshot(
      blocksCol,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBlockedSlots(list);
        writeLocal(STORAGE_KEYS.BLOCKS, list);
      },
      (err) => console.error('Error leyendo bloqueos:', err)
    );

    const unsubServices = onSnapshot(
      servicesDoc,
      (docSnap) => {
        if (docSnap.exists() && Array.isArray(docSnap.data().items)) {
          const items = docSnap.data().items;
          setServices(items);
          writeLocal(STORAGE_KEYS.SERVICES, items);
        }
      },
      (err) => console.error('Error leyendo servicios:', err)
    );

    const unsubSettings = onSnapshot(
      studioDoc,
      (docSnap) => {
        if (docSnap.exists()) {
          const merged = { ...DEFAULT_SETTINGS, ...docSnap.data() };
          setSettings(merged);
          setSettingsForm(merged);
          writeLocal(STORAGE_KEYS.SETTINGS, merged);
        }
      },
      (err) => console.error('Error leyendo configuración:', err)
    );

    return () => {
      unsubAppointments();
      unsubBlocks();
      unsubServices();
      unsubSettings();
    };
  }, [user]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // --- CÁLCULOS DE SELECCIÓN DE SERVICIOS ---
  const selectedServices = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s.id)),
    [services, selectedServiceIds]
  );

  const hasPeloAPelo = useMemo(
    () => selectedServices.some((s) => s.category === 'Pestañas Pelo a Pelo'),
    [selectedServices]
  );

  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + Number(s.price), 0),
    [selectedServices]
  );

  // Regla exacta: 180 min si incluye Pestañas Pelo a Pelo; 90 min para cualquier otra selección
  const totalDuration = useMemo(() => {
    if (selectedServices.length === 0) return 0;
    return hasPeloAPelo ? 180 : 90;
  }, [selectedServices, hasPeloAPelo]);

  const suggestedDeposit = useMemo(() => {
    if (totalPrice <= 0) return 0;
    return totalPrice >= 1000 ? Math.round(totalPrice * 0.3) : Math.min(300, totalPrice);
  }, [totalPrice]);

  const categories = useMemo(
    () => ['Todas', ...new Set(services.map((s) => s.category))],
    [services]
  );

  const filteredServices = useMemo(() => {
    if (activeCategory === 'Todas') return services;
    return services.filter((s) => s.category === activeCategory);
  }, [services, activeCategory]);

  const toggleService = (id) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    setSelectedTime('');
  };

  // --- MOTOR DE DISPONIBILIDAD (INTERVALOS CADA 30 MIN) ---
  // Turno mañana: 9:00 AM (540 min) a 12:30 PM (750 min)
  // Turno tarde: 2:00 PM (840 min) a 7:00 PM (1140 min)
  const availableSlots = useMemo(() => {
    if (!selectedDate || totalDuration <= 0) {
      return { morning: [], afternoon: [], isSunday: false, isFullDayBlocked: false };
    }

    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay();

    // Domingos cerrado
    if (dayOfWeek === 0) {
      return { morning: [], afternoon: [], isSunday: true, isFullDayBlocked: false };
    }

    // Bloqueos del día
    const dayBlocks = blockedSlots.filter((b) => b.date === selectedDate);
    if (dayBlocks.some((b) => b.fullDay)) {
      return { morning: [], afternoon: [], isSunday: false, isFullDayBlocked: true };
    }

    // Citas activas en esa fecha (excluyendo canceladas)
    const dayAppointments = appointments.filter(
      (a) =>
        a.date === selectedDate &&
        a.status !== 'cancelled' &&
        a.status !== 'Cancelada'
    );

    const busyIntervals = [
      ...dayAppointments.map((a) => ({
        start: timeToMinutes(a.startTime),
        end: timeToMinutes(a.endTime)
      })),
      ...dayBlocks
        .filter((b) => !b.fullDay)
        .map((b) => ({
          start: timeToMinutes(b.startTime),
          end: timeToMinutes(b.endTime)
        }))
    ];

    const now = new Date();
    const isToday =
      now.getFullYear() === y && now.getMonth() + 1 === m && now.getDate() === d;
    const currentMinutesNow = now.getHours() * 60 + now.getMinutes() + 30;

    const generateShiftSlots = (shiftStartMin, shiftEndMin) => {
      const slots = [];
      const stepInterval = 30; // Intervalos cada 30 minutos
      for (let start = shiftStartMin; start + totalDuration <= shiftEndMin; start += stepInterval) {
        const end = start + totalDuration;

        if (isToday && start < currentMinutesNow) continue;

        const hasOverlap = busyIntervals.some(
          (busy) => start < busy.end && end > busy.start
        );

        if (!hasOverlap) {
          slots.push({
            startTime: minutesToTime(start),
            endTime: minutesToTime(end),
            label: formatTime12h(minutesToTime(start))
          });
        }
      }
      return slots;
    };

    const morning = generateShiftSlots(540, 750);   // 9:00 AM – 12:30 PM
    const afternoon = generateShiftSlots(840, 1140); // 2:00 PM – 7:00 PM

    return { morning, afternoon, isSunday: false, isFullDayBlocked: false };
  }, [selectedDate, totalDuration, appointments, blockedSlots]);

  // --- PRÓXIMOS 21 DÍAS EN EL SELECTOR ---
  const upcomingDays = useMemo(() => {
    const days = [];
    const base = new Date();
    for (let i = 0; i < 21; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const iso = `${yyyy}-${mm}-${dd}`;
      const isSunday = d.getDay() === 0;
      const weekdayShort = d.toLocaleDateString('es-DO', { weekday: 'short' }).replace('.', '');
      const monthShort = d.toLocaleDateString('es-DO', { month: 'short' }).replace('.', '');
      days.push({ iso, dayNum: dd, weekdayShort, monthShort, isSunday });
    }
    return days;
  }, []);

  // --- GUARDAR CITA CON ESTADO 'pending_deposit' ---
  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!clientForm.name.trim() || !clientForm.phone.trim() || !clientForm.email.trim()) {
      showToast('Por favor completa nombre, teléfono y correo electrónico.');
      return;
    }
    if (!selectedDate || !selectedTime || selectedServices.length === 0) {
      showToast('Verifica los servicios, fecha y hora seleccionados.');
      return;
    }

    setSubmitting(true);
    try {
      const endTime = minutesToTime(timeToMinutes(selectedTime) + totalDuration);
      const bookingPayload = {
        clientName: clientForm.name.trim(),
        clientPhone: clientForm.phone.trim(),
        clientEmail: clientForm.email.trim(),
        notes: clientForm.notes.trim(),
        services: selectedServices.map((s) => ({
          id: s.id,
          name: s.name,
          price: s.price,
          category: s.category
        })),
        totalPrice,
        totalDuration,
        depositAmount: suggestedDeposit,
        date: selectedDate,
        startTime: selectedTime,
        endTime,
        status: 'pending_deposit',
        createdAt: new Date().toISOString()
      };

      if (db && user) {
        const appointmentsCol = collection(db, 'artifacts', appId, 'public', 'data', 'appointments');
        const docRef = await addDoc(appointmentsCol, bookingPayload);
        setLastBooking({ id: docRef.id, ...bookingPayload });
      } else {
        const localBooking = { id: `local-${Date.now()}`, ...bookingPayload };
        const updated = [...appointments, localBooking];
        setAppointments(updated);
        writeLocal(STORAGE_KEYS.APPOINTMENTS, updated);
        setLastBooking(localBooking);
      }

      setStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error guardando la cita:', error);
      showToast('Ocurrió un error al agendar. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- ENLACE DIRECTO WHATSAPP CON DETALLES PRELLENADOS ---
  const getWhatsAppReceiptUrl = (booking) => {
    if (!booking) return 'https://wa.me/18298730919';
    const servicesText = booking.services.map((s) => `• ${s.name} (RD$${Number(s.price).toLocaleString()})`).join('\n');
    const message =
      `Hola *GLES BEAUTY STUDIO* ✨, acabo de agendar mi cita y envío mi comprobante de adelanto:\n\n` +
      `*Clienta:* ${booking.clientName}\n` +
      `*Teléfono:* ${booking.clientPhone}\n` +
      `*Fecha:* ${formatDateSpanish(booking.date)}\n` +
      `*Hora:* ${formatTime12h(booking.startTime)} - ${formatTime12h(booking.endTime)} (${booking.totalDuration} min)\n` +
      `*Servicios:*\n${servicesText}\n` +
      `*Total:* RD$${Number(booking.totalPrice).toLocaleString()}\n` +
      `*Adelanto sugerido:* RD$${Number(booking.depositAmount).toLocaleString()}\n\n` +
      `¡Quedo atenta a la confirmación! 🤍`;

    return `https://wa.me/18298730919?text=${encodeURIComponent(message)}`;
  };

  // --- FUNCIONES PANEL ADMINISTRACIÓN ---
  const handleVerifyPin = (e) => {
    e.preventDefault();
    if (pinInput === (settings.adminPin || '1909')) {
      setShowPinModal(false);
      setPinInput('');
      setPinError('');
      setIsAdminOpen(true);
    } else {
      setPinError('PIN incorrecto. Intenta nuevamente.');
    }
  };

  const handleUpdateStatus = async (appointmentId, newStatus) => {
    try {
      if (db && user) {
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'appointments', appointmentId);
        await updateDoc(ref, { status: newStatus });
      } else {
        const updated = appointments.map((a) =>
          a.id === appointmentId ? { ...a, status: newStatus } : a
        );
        setAppointments(updated);
        writeLocal(STORAGE_KEYS.APPOINTMENTS, updated);
      }
      const label =
        newStatus === 'confirmed'
          ? 'Adelanto Confirmado'
          : newStatus === 'cancelled'
          ? 'Cita Cancelada (Horario liberado)'
          : newStatus;
      showToast(`Estado actualizado: ${label}`);
    } catch (err) {
      console.error('Error actualizando cita:', err);
      showToast('Error al actualizar el estado.');
    }
  };

  const handleAddBlockSlot = async (e) => {
    e.preventDefault();
    if (!blockForm.date) return;
    try {
      const payload = { ...blockForm, createdAt: new Date().toISOString() };
      if (db && user) {
        const blocksCol = collection(db, 'artifacts', appId, 'public', 'data', 'blocked_slots');
        await addDoc(blocksCol, payload);
      } else {
        const updated = [...blockedSlots, { id: `block-${Date.now()}`, ...payload }];
        setBlockedSlots(updated);
        writeLocal(STORAGE_KEYS.BLOCKS, updated);
      }
      showToast('Horario bloqueado correctamente.');
      setBlockForm((prev) => ({ ...prev, reason: '' }));
    } catch (err) {
      console.error('Error bloqueando horario:', err);
      showToast('Error al guardar el bloqueo.');
    }
  };

  const handleDeleteBlock = async (blockId) => {
    try {
      if (db && user) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'blocked_slots', blockId));
      } else {
        const updated = blockedSlots.filter((b) => b.id !== blockId);
        setBlockedSlots(updated);
        writeLocal(STORAGE_KEYS.BLOCKS, updated);
      }
      showToast('Bloqueo eliminado.');
    } catch (err) {
      console.error('Error eliminando bloqueo:', err);
    }
  };

  const handleSaveServiceEdit = async (serviceId) => {
    const updatedList = services.map((s) =>
      s.id === serviceId
        ? {
            ...s,
            name: editNameVal.trim() || s.name,
            price: Number(editPriceVal) || s.price
          }
        : s
    );
    try {
      if (db && user) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'services'), {
          items: updatedList
        });
      } else {
        setServices(updatedList);
        writeLocal(STORAGE_KEYS.SERVICES, updatedList);
      }
      setEditingServiceId(null);
      showToast('Servicio actualizado.');
    } catch (err) {
      console.error('Error guardando servicio:', err);
      showToast('Error al actualizar el servicio.');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      if (db && user) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'studio'), settingsForm);
      } else {
        setSettings(settingsForm);
        writeLocal(STORAGE_KEYS.SETTINGS, settingsForm);
      }
      showToast('Configuración del estudio guardada.');
    } catch (err) {
      console.error('Error guardando configuración:', err);
      showToast('Error al guardar configuración.');
    }
  };

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const dtA = `${a.date}T${a.startTime}`;
      const dtB = `${b.date}T${b.startTime}`;
      return dtA.localeCompare(dtB);
    });
  }, [appointments]);

  const resetBookingFlow = () => {
    setSelectedServiceIds([]);
    setSelectedTime('');
    setClientForm({ name: '', phone: '', email: '', notes: '' });
    setLastBooking(null);
    setStep(1);
  };

  const getStatusBadge = (status) => {
    if (status === 'confirmed' || status === 'Confirmada') {
      return {
        label: 'Confirmada',
        classes: 'bg-emerald-50 text-emerald-800 border-emerald-200'
      };
    }
    if (status === 'cancelled' || status === 'Cancelada') {
      return {
        label: 'Cancelada',
        classes: 'bg-red-50 text-red-700 border-red-200'
      };
    }
    return {
      label: 'Pendiente de Adelanto',
      classes: 'bg-amber-50 text-amber-800 border-amber-200'
    };
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#111111] font-sans selection:bg-[#C6A87C] selection:text-white flex flex-col">
      {/* NOTIFICACIÓN FLOTANTE */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#111111] text-white px-5 py-3 rounded-full shadow-xl border border-[#C6A87C]/40 flex items-center gap-2.5 text-sm">
          <Sparkles className="w-4 h-4 text-[#C6A87C]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ENCABEZADO CON LOGO OFICIAL EXACTO */}
      <div className="relative overflow-hidden bg-white border-b border-[#EAE4DC]">
        <svg className="w-5 h-5 inline-block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
</svg>

        <header className="max-w-4xl mx-auto px-4 pt-5 pb-6 flex flex-col items-center text-center relative z-10">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="focus:outline-none transition-transform hover:scale-[1.01] rounded-2xl overflow-hidden"
            title="Volver al inicio"
          >
            <GlesLogo className="w-72 sm:w-96" />
          </button>
          <p className="mt-1 text-xs sm:text-sm tracking-[0.22em] uppercase text-[#6E685F] font-medium">
            Reserva tu experiencia de belleza
          </p>

          {/* BARRA DE PROGRESO */}
          {step < 4 && (
            <div className="mt-6 w-full max-w-md flex items-center justify-between px-2">
              {[
                { num: 1, label: 'Servicios' },
                { num: 2, label: 'Fecha y Hora' },
                { num: 3, label: 'Tus Datos' }
              ].map((item, idx) => {
                const isActive = step === item.num;
                const isDone = step > item.num;
                return (
                  <React.Fragment key={item.num}>
                    <button
                      type="button"
                      onClick={() => {
                        if (item.num === 1) setStep(1);
                        if (item.num === 2 && selectedServiceIds.length > 0) setStep(2);
                        if (item.num === 3 && selectedServiceIds.length > 0 && selectedTime) setStep(3);
                      }}
                      className={`flex items-center gap-2 text-xs sm:text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-[#111111]'
                          : isDone
                          ? 'text-[#A38354]'
                          : 'text-[#A09A92] cursor-default'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${
                          isActive
                            ? 'bg-[#111111] text-white shadow-sm ring-4 ring-[#C6A87C]/20'
                            : isDone
                            ? 'bg-[#C6A87C] text-white'
                            : 'bg-[#F0ECE6] text-[#8C857B]'
                        }`}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5" /> : item.num}
                      </span>
                      <span>{item.label}</span>
                    </button>
                    {idx < 2 && (
                      <div
                        className={`flex-1 h-[1px] mx-2 ${
                          step > item.num ? 'bg-[#C6A87C]' : 'bg-[#E5DFD6]'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </header>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 pb-32">
        {/* ================= PASO 1: CATÁLOGO DE SERVICIOS ================= */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-[#111111]">
                  Selecciona tus <span className="font-semibold">Servicios</span>
                </h1>
                <p className="text-sm text-[#6E685F] mt-1">
                  Bloque de <strong className="text-[#111111]">90 minutos</strong> por cita, o{' '}
                  <strong className="text-[#111111]">180 minutos</strong> al incluir Pestañas Pelo a Pelo.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-[#F3EFEA] text-[#5C564E] self-start sm:self-auto">
                <Sparkles className="w-3.5 h-3.5 text-[#B89564]" />
                Precios de apertura vigentes
              </span>
            </div>

            {/* FILTROS POR CATEGORÍA */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs sm:text-sm whitespace-nowrap transition-all border ${
                    activeCategory === cat
                      ? 'bg-[#111111] text-white border-[#111111] shadow-sm'
                      : 'bg-white text-[#4A453E] border-[#E4DDD3] hover:border-[#111111]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* LISTADO AGRUPADO POR CATEGORÍA */}
            <div className="space-y-8">
              {(activeCategory === 'Todas'
                ? [...new Set(services.map((s) => s.category))]
                : [activeCategory]
              ).map((categoryName) => {
                const itemsInCat = filteredServices.filter((s) => s.category === categoryName);
                if (itemsInCat.length === 0) return null;

                return (
                  <section key={categoryName} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="bg-[#111111] text-white text-xs tracking-[0.14em] uppercase font-semibold px-4 py-1.5 rounded-full">
                        {categoryName}
                      </span>
                      <div className="flex-1 h-[1px] bg-[#E5DFD6]" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {itemsInCat.map((service) => {
                        const isSelected = selectedServiceIds.includes(service.id);
                        return (
                          <div
                            key={service.id}
                            onClick={() => toggleService(service.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleService(service.id);
                              }
                            }}
                            className={`group relative p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                              isSelected
                                ? 'bg-white border-[#111111] ring-1 ring-[#111111] shadow-md'
                                : 'bg-white border-[#EAE4DC] hover:border-[#C6A87C] hover:shadow-sm'
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-medium text-base text-[#111111] leading-snug">
                                  {service.name}
                                </h3>
                                {service.badge && (
                                  <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-[#FAF2E6] text-[#9E7B48] border border-[#E6D3B5]">
                                    {service.badge}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-[#6E685F]">
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-[#B89564]" />
                                  {service.category === 'Pestañas Pelo a Pelo'
                                    ? 'Bloque de 180 min (3 hrs)'
                                    : 'Bloque de 90 min (1 hr 30 min)'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span
                                className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                                  isSelected
                                    ? 'bg-[#111111] text-white border-[#111111]'
                                    : 'bg-[#FAF8F5] text-[#111111] border-[#111111]'
                                }`}
                              >
                                RD${Number(service.price).toLocaleString()}
                              </span>
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                                  isSelected
                                    ? 'bg-[#C6A87C] border-[#C6A87C] text-white'
                                    : 'border-[#D5CEC4] text-transparent group-hover:border-[#111111]'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= PASO 2: FECHA Y HORA ================= */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-light text-[#111111]">
                  Elige <span className="font-semibold">Fecha y Hora</span>
                </h1>
                <p className="text-sm text-[#6E685F] mt-1">
                  Bloque asignado:{' '}
                  <strong className="text-[#111111]">
                    {totalDuration} minutos ({hasPeloAPelo ? '3 horas - Pelo a Pelo' : '1 hora 30 min - Estándar'})
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs sm:text-sm font-medium text-[#5C564E] hover:text-[#111111] flex items-center gap-1 px-3 py-2 rounded-full border border-[#E4DDD3] bg-white"
              >
                <ChevronLeft className="w-4 h-4" />
                Servicios
              </button>
            </div>

            {/* SELECTOR DE FECHA */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#EAE4DC] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="text-sm font-semibold uppercase tracking-wider text-[#111111] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#B89564]" />
                  1. Selecciona el día (Lunes a Sábado)
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTime('');
                  }}
                  className="text-sm border border-[#DCD5CB] rounded-xl px-3.5 py-2 bg-[#FAF8F5] text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div className="flex gap-2.5 overflow-x-auto pb-2">
                {upcomingDays.map((d) => {
                  const isSelected = selectedDate === d.iso;
                  return (
                    <button
                      key={d.iso}
                      type="button"
                      disabled={d.isSunday}
                      onClick={() => {
                        setSelectedDate(d.iso);
                        setSelectedTime('');
                      }}
                      className={`min-w-[68px] py-3 px-2 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                        d.isSunday
                          ? 'bg-[#F5F2EE] border-transparent text-[#B8B2A8] cursor-not-allowed opacity-60'
                          : isSelected
                          ? 'bg-[#111111] text-white border-[#111111] shadow-md scale-[1.02]'
                          : 'bg-[#FAF8F5] text-[#111111] border-[#E6DFD5] hover:border-[#C6A87C]'
                      }`}
                    >
                      <span className="text-[10px] uppercase tracking-wider opacity-80">
                        {d.weekdayShort}
                      </span>
                      <span className="text-lg font-bold my-0.5">{d.dayNum}</span>
                      <span className="text-[10px] uppercase opacity-75">
                        {d.isSunday ? 'Cerrado' : d.monthShort}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedDate && (
                <p className="text-xs text-[#6E685F] capitalize pt-1 border-t border-[#F2EDE6]">
                  Fecha elegida: <strong className="text-[#111111]">{formatDateSpanish(selectedDate)}</strong>
                </p>
              )}
            </div>

            {/* HORARIOS DISPONIBLES */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#EAE4DC] shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#111111] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#B89564]" />
                  2. Horarios disponibles
                </h2>
                <span className="text-xs text-[#8C857B]">Almuerzo: 12:30 PM - 2:00 PM</span>
              </div>

              {availableSlots.isSunday ? (
                <div className="p-6 text-center rounded-xl bg-[#FAF8F5] border border-[#EAE4DC] text-[#6E685F] text-sm">
                  Los domingos el estudio permanece cerrado. Por favor selecciona un día de lunes a sábado.
                </div>
              ) : availableSlots.isFullDayBlocked ? (
                <div className="p-6 text-center rounded-xl bg-[#FAF8F5] border border-[#EAE4DC] text-[#6E685F] text-sm">
                  Esta fecha no tiene disponibilidad. Por favor selecciona otro día en el calendario.
                </div>
              ) : availableSlots.morning.length === 0 && availableSlots.afternoon.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-[#FAF8F5] border border-[#EAE4DC] text-[#6E685F] text-sm">
                  No hay bloques disponibles con suficiente tiempo ({totalDuration} min) para este día. Prueba seleccionando otra fecha.
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-[#8C857B] mb-3">
                      Turno Mañana (9:00 AM – 12:30 PM)
                    </h3>
                    {availableSlots.morning.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                        {availableSlots.morning.map((slot) => {
                          const isSelected = selectedTime === slot.startTime;
                          return (
                            <button
                              key={slot.startTime}
                              type="button"
                              onClick={() => setSelectedTime(slot.startTime)}
                              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium border transition-all ${
                                isSelected
                                  ? 'bg-[#111111] text-white border-[#111111] shadow-sm'
                                  : 'bg-[#FAF8F5] text-[#111111] border-[#E4DDD3] hover:border-[#111111]'
                              }`}
                            >
                              {slot.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-[#9E978E] italic">Sin espacios disponibles en la mañana.</p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-[#F2EDE6]">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-[#8C857B] mb-3">
                      Turno Tarde (2:00 PM – 7:00 PM)
                    </h3>
                    {availableSlots.afternoon.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                        {availableSlots.afternoon.map((slot) => {
                          const isSelected = selectedTime === slot.startTime;
                          return (
                            <button
                              key={slot.startTime}
                              type="button"
                              onClick={() => setSelectedTime(slot.startTime)}
                              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium border transition-all ${
                                isSelected
                                  ? 'bg-[#111111] text-white border-[#111111] shadow-sm'
                                  : 'bg-[#FAF8F5] text-[#111111] border-[#E4DDD3] hover:border-[#111111]'
                              }`}
                            >
                              {slot.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-[#9E978E] italic">Sin espacios disponibles en la tarde.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= PASO 3: DATOS CLIENTA Y ADELANTO ================= */}
        {step === 3 && (
          <form onSubmit={handleConfirmBooking} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-light text-[#111111]">
                  Completa tu <span className="font-semibold">Reserva</span>
                </h1>
                <p className="text-sm text-[#6E685F] mt-1">
                  Ingresa tus datos y revisa las instrucciones del adelanto para asegurar tu espacio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs sm:text-sm font-medium text-[#5C564E] hover:text-[#111111] flex items-center gap-1 px-3 py-2 rounded-full border border-[#E4DDD3] bg-white"
              >
                <ChevronLeft className="w-4 h-4" />
                Horario
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-[#EAE4DC] shadow-sm space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#111111] pb-2 border-b border-[#F2EDE6]">
                  Datos Personales
                </h2>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#5C564E] mb-1.5">
                    Nombre completo *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#9E978E] absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="Ej. María Fernanda Pérez"
                      value={clientForm.name}
                      onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#DCD5CB] bg-[#FAF8F5] text-sm focus:outline-none focus:border-[#111111] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#5C564E] mb-1.5">
                    Teléfono / WhatsApp *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#9E978E] absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      placeholder="Ej. 829-000-0000"
                      value={clientForm.phone}
                      onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#DCD5CB] bg-[#FAF8F5] text-sm focus:outline-none focus:border-[#111111] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#5C564E] mb-1.5">
                    Correo electrónico *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#9E978E] absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      placeholder="Ej. maria@correo.com"
                      value={clientForm.email}
                      onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#DCD5CB] bg-[#FAF8F5] text-sm focus:outline-none focus:border-[#111111] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#5C564E] mb-1.5">
                    Notas o alergias (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Indícanos si tienes ojos sensibles, alergias o alguna preferencia..."
                    value={clientForm.notes}
                    onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#DCD5CB] bg-[#FAF8F5] text-sm focus:outline-none focus:border-[#111111] focus:bg-white"
                  />
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-[#EAE4DC] shadow-sm space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-[#8C857B]">
                    Resumen de tu Cita
                  </h3>
                  <div className="text-sm space-y-1 pb-3 border-b border-[#F2EDE6]">
                    <p className="font-semibold text-[#111111] capitalize">
                      {formatDateSpanish(selectedDate)}
                    </p>
                    <p className="text-[#5C564E]">
                      Hora: <strong className="text-[#111111]">{formatTime12h(selectedTime)}</strong> • Bloque de{' '}
                      <strong className="text-[#111111]">{totalDuration} min</strong>
                    </p>
                  </div>

                  <ul className="space-y-1.5 text-xs sm:text-sm">
                    {selectedServices.map((s) => (
                      <li key={s.id} className="flex justify-between text-[#4A453E]">
                        <span>{s.name}</span>
                        <span className="font-medium">RD${Number(s.price).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-3 border-t border-[#F2EDE6] flex justify-between items-center">
                    <span className="text-sm font-medium text-[#5C564E]">Total estimado</span>
                    <span className="text-xl font-bold text-[#111111]">
                      RD${totalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* POLÍTICA DE DEPÓSITO ADELANTADO */}
                <div className="bg-[#FAF2E6] border border-[#E2CFAF] p-5 rounded-2xl space-y-3">
                  <div className="flex items-start gap-2.5">
                    <CreditCard className="w-5 h-5 text-[#9E7B48] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#6E5229]">
                        Adelanto para asegurar cita
                      </h4>
                      <p className="text-xs text-[#5E4A2E] mt-1 leading-relaxed">
                        {settings.depositNote}
                      </p>
                      <p className="text-xs font-semibold text-[#111111] mt-1.5">
                        Monto sugerido hoy: RD${suggestedDeposit.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/90 p-3 rounded-xl border border-[#E6D3B5] text-xs text-[#2E2922] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold uppercase tracking-wider text-[10px] text-[#8C734B]">
                        Datos para Transferencia:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(settings.bankInfo);
                          showToast('Datos bancarios copiados');
                        }}
                        className="text-[11px] font-medium text-[#9E7B48] hover:underline flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copiar
                      </button>
                    </div>
                    <p className="leading-relaxed font-medium">{settings.bankInfo}</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-6 rounded-full bg-[#111111] text-white font-semibold text-sm tracking-wide hover:bg-[#2A2A2A] transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? 'Agendando cita...' : 'Confirmar Reserva'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ================= PASO 4: TICKET DE CONFIRMACIÓN & WHATSAPP ================= */}
        {step === 4 && lastBooking && (
          <div className="max-w-lg mx-auto space-y-6">
            <div className="bg-white rounded-3xl border border-[#EAE4DC] shadow-xl overflow-hidden">
              <div className="bg-[#111111] text-white p-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#C6A87C]/20 border border-[#C6A87C] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-[#C6A87C]" />
                </div>
                <h1 className="text-xl sm:text-2xl font-light tracking-wide">
                  ¡Tu cita ha sido <span className="font-semibold">Pre-Agendada</span>!
                </h1>
                <span className="inline-block px-3 py-1 rounded-full text-[11px] uppercase tracking-widest bg-[#C6A87C]/20 text-[#E5C99B] border border-[#C6A87C]/40">
                  Estado: Pendiente de Adelanto
                </span>
              </div>

              <div className="p-6 sm:p-7 space-y-5">
                <div className="grid grid-cols-2 gap-4 text-sm pb-4 border-b border-dashed border-[#DCD5CB]">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-[#8C857B] block">
                      Clienta
                    </span>
                    <span className="font-semibold text-[#111111]">{lastBooking.clientName}</span>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-[#8C857B] block">
                      Teléfono
                    </span>
                    <span className="font-medium text-[#111111]">{lastBooking.clientPhone}</span>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-[#8C857B] block">
                      Fecha
                    </span>
                    <span className="font-semibold text-[#111111] capitalize">
                      {formatDateSpanish(lastBooking.date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-[#8C857B] block">
                      Horario
                    </span>
                    <span className="font-semibold text-[#111111]">
                      {formatTime12h(lastBooking.startTime)} - {formatTime12h(lastBooking.endTime)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] uppercase tracking-wider text-[#8C857B] block">
                    Servicios seleccionados ({lastBooking.totalDuration} min en total)
                  </span>
                  {lastBooking.services.map((s, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-[#2E2922]">
                      <span>• {s.name}</span>
                      <span className="font-medium">RD${Number(s.price).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-[#F2EDE6] flex justify-between items-center">
                    <span className="text-sm font-semibold">Total del Servicio</span>
                    <span className="text-lg font-bold text-[#111111]">
                      RD${Number(lastBooking.totalPrice).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="bg-[#FAF2E6] border border-[#E2CFAF] p-4 rounded-2xl text-xs text-[#5E4A2E] space-y-1.5">
                  <p className="font-bold text-[#111111]">
                    Último paso: Envía tu comprobante de adelanto (RD${Number(lastBooking.depositAmount).toLocaleString()})
                  </p>
                  <p>{settings.bankInfo}</p>
                </div>

                <a
                  href={getWhatsAppReceiptUrl(lastBooking)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-5 rounded-full bg-[#111111] hover:bg-[#262626] text-white font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg transition-all"
                >
                  <MessageCircle className="w-5 h-5 text-[#25D366]" />
                  Enviar comprobante por WhatsApp
                </a>

                <button
                  type="button"
                  onClick={resetBookingFlow}
                  className="w-full py-2.5 text-xs font-medium text-[#6E685F] hover:text-[#111111] transition-colors"
                >
                  Agendar otra cita
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* BARRA FLOTANTE INFERIOR DE RESUMEN EN PASOS 1 Y 2 */}
      {(step === 1 || step === 2) && selectedServiceIds.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E4DDD3] shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
          <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#8C857B]">
                  {selectedServiceIds.length}{' '}
                  {selectedServiceIds.length === 1 ? 'servicio' : 'servicios'}
                </span>
                <span className="text-[#DCD5CB]">•</span>
                <span className="text-xs font-medium text-[#5C564E] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#B89564]" />
                  {totalDuration} min ({hasPeloAPelo ? '3 hrs' : '1h 30m'})
                </span>
              </div>
              <p className="text-lg sm:text-xl font-bold text-[#111111]">
                RD${totalPrice.toLocaleString()}
              </p>
            </div>

            {step === 1 ? (
              <button
                type="button"
                onClick={() => {
                  setStep(2);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-6 py-3 rounded-full bg-[#111111] text-white text-sm font-semibold hover:bg-[#2A2A2A] transition-all flex items-center gap-2 shadow-md"
              >
                Elegir Horario
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!selectedTime}
                onClick={() => {
                  setStep(3);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-6 py-3 rounded-full bg-[#111111] text-white text-sm font-semibold hover:bg-[#2A2A2A] transition-all flex items-center gap-2 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuar
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= FOOTER ================= */}
      <footer className="bg-white border-t border-[#EAE4DC] py-8 px-4 mt-auto">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-[1px] w-10 bg-[#DCD5CB]" />
            <span className="bg-[#111111] text-white text-xs tracking-[0.2em] uppercase px-5 py-2 rounded-full flex items-center gap-2 font-medium">
              <Calendar className="w-3.5 h-3.5 text-[#C6A87C]" />
              Agenda tu cita
            </span>
            <div className="h-[1px] w-10 bg-[#DCD5CB]" />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-[#111111] font-medium">
            <a
              href="https://wa.me/18298730919"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-[#9E7B48] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>829-873-0919</span>
            </a>
            <span className="text-[#DCD5CB]">|</span>
            <a
              href="https://instagram.com/glesbeautystudio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-[#9E7B48] transition-colors"
            >
              <svg className="w-5 h-5 inline-block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
</svg>
              <span>@glesbeautystudio</span>
            </a>
          </div>

          <p className="text-xs text-[#8C857B]">
            Horario: Lunes a Sábado • 9:00 AM – 12:30 PM y 2:00 PM – 7:00 PM
          </p>

          <div className="pt-2 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowPinModal(true)}
              className="text-[11px] uppercase tracking-widest text-[#A09A92] hover:text-[#111111] transition-colors inline-flex items-center gap-1"
            >
              <Lock className="w-3 h-3" />
              Admin
            </button>
            {db && user && (
              <span className="text-[11px] text-emerald-700 inline-flex items-center gap-1">
                <Cloud className="w-3 h-3" /> Nube conectada
              </span>
            )}
          </div>
        </div>
      </footer>

      {/* ================= MODAL DE PIN PARA ADMIN ================= */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#EAE4DC] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#111111] flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#B89564]" />
                Acceso Propietaria
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowPinModal(false);
                  setPinInput('');
                  setPinError('');
                }}
                className="p-1.5 rounded-full hover:bg-[#FAF8F5] text-[#6E685F]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#6E685F]">
              Ingresa tu PIN de administración para gestionar citas, bloqueos y precios. (ocultando el PIN por seguridad).
            </p>

            <form onSubmit={handleVerifyPin} className="space-y-3">
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                placeholder="••••"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                autoFocus
                className="w-full text-center tracking-[0.5em] text-xl font-bold py-3 rounded-xl border border-[#DCD5CB] bg-[#FAF8F5] focus:outline-none focus:border-[#111111]"
              />
              {pinError && <p className="text-xs text-red-600 text-center">{pinError}</p>}
              <button
                type="submit"
                className="w-full py-3 rounded-full bg-[#111111] text-white text-sm font-semibold hover:bg-[#2A2A2A]"
              >
                Entrar al Panel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= PANEL DE ADMINISTRACIÓN ================= */}
      {isAdminOpen && (
        <div className="fixed inset-0 z-50 bg-[#FAF8F5] overflow-y-auto">
          <div className="bg-[#111111] text-white px-4 py-4 sticky top-0 z-20">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-[#C6A87C]" />
                <div>
                  <h2 className="text-sm sm:text-base font-semibold tracking-wide">
                    Panel Administrativo — GLES BEAUTY STUDIO
                  </h2>
                  <p className="text-[11px] text-neutral-400">
                    {db && user ? 'Sincronizado en tiempo real' : 'Almacenamiento local activo'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminOpen(false)}
                className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                Cerrar Panel
              </button>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { id: 'citas', label: `Citas (${appointments.length})` },
                { id: 'bloqueos', label: 'Bloquear Horarios' },
                { id: 'servicios', label: 'Precios y Servicios' },
                { id: 'config', label: 'Cuenta Bancaria y PIN' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setAdminTab(t.id)}
                  className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                    adminTab === t.id
                      ? 'bg-[#111111] text-white'
                      : 'bg-white text-[#5C564E] border border-[#E4DDD3]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB 1: GESTIÓN DE CITAS */}
            {adminTab === 'citas' && (
              <div className="space-y-4">
                {loadingData ? (
                  <p className="text-sm text-[#6E685F]">Cargando citas...</p>
                ) : sortedAppointments.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-[#EAE4DC] text-center text-sm text-[#6E685F]">
                    Aún no hay citas registradas.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sortedAppointments.map((apt) => {
                      const badge = getStatusBadge(apt.status);
                      const isConfirmed = apt.status === 'confirmed' || apt.status === 'Confirmada';
                      const isCancelled = apt.status === 'cancelled' || apt.status === 'Cancelada';

                      return (
                        <div
                          key={apt.id}
                          className="bg-white p-5 rounded-2xl border border-[#EAE4DC] shadow-sm flex flex-col justify-between gap-4"
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-bold text-base text-[#111111]">
                                  {apt.clientName}
                                </h3>
                                <p className="text-xs text-[#6E685F]">
                                  {apt.clientPhone} • {apt.clientEmail}
                                </p>
                              </div>
                              <span
                                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${badge.classes}`}
                              >
                                {badge.label}
                              </span>
                            </div>

                            <div className="bg-[#FAF8F5] p-3 rounded-xl text-xs space-y-1">
                              <p className="font-semibold text-[#111111] capitalize">
                                📅 {formatDateSpanish(apt.date)}
                              </p>
                              <p className="text-[#4A453E]">
                                ⏰ {formatTime12h(apt.startTime)} – {formatTime12h(apt.endTime)} ({apt.totalDuration} min)
                              </p>
                            </div>

                            <div className="text-xs space-y-1">
                              {apt.services?.map((s, idx) => (
                                <div key={idx} className="flex justify-between text-[#4A453E]">
                                  <span>• {s.name}</span>
                                  <span>RD${Number(s.price).toLocaleString()}</span>
                                </div>
                              ))}
                              <div className="pt-1.5 border-t border-[#F2EDE6] flex justify-between font-bold text-[#111111]">
                                <span>Total: RD${Number(apt.totalPrice).toLocaleString()}</span>
                                <span className="text-[#9E7B48]">
                                  Adelanto: RD${Number(apt.depositAmount || 0).toLocaleString()}
                                </span>
                              </div>
                            </div>

                            {apt.notes && (
                              <p className="text-xs italic text-[#6E685F] bg-[#FAF8F5] p-2 rounded-lg">
                                Nota: "{apt.notes}"
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 pt-2 border-t border-[#F2EDE6]">
                            {!isConfirmed && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(apt.id, 'confirmed')}
                                className="flex-1 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Confirmar Adelanto
                              </button>
                            )}
                            {!isCancelled && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(apt.id, 'cancelled')}
                                className="flex-1 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold flex items-center justify-center gap-1"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                Cancelar (Liberar)
                              </button>
                            )}
<button
type="button"
  onClick={() => confirmarYNotificarCliente(apt)}
  className="py-2 px-3 rounded-xl border border-[#DCD5CB] text-xs font-medium text-[#111111] hover:bg-[#FAF8F5] flex items-center gap-1.5"
>
  ✅ Confirmar y Notificar
</button>
                            <a
                              href={`https://wa.me/1${String(apt.clientPhone || '').replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="py-2 px-3 rounded-xl border border-[#DCD5CB] text-xs font-medium text-[#111111] hover:bg-[#FAF8F5] flex items-center justify-center"
                              title="Escribir por WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4 text-[#25D366]" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: BLOQUEAR FECHAS / HORAS */}
            {adminTab === 'bloqueos' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form
                  onSubmit={handleAddBlockSlot}
                  className="bg-white p-6 rounded-2xl border border-[#EAE4DC] space-y-4"
                >
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
                    Nuevo Bloqueo de Agenda
                  </h3>
                  <div>
                    <label className="block text-xs font-medium text-[#5C564E] mb-1">Fecha</label>
                    <input
                      type="date"
                      required
                      value={blockForm.date}
                      onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#DCD5CB] text-sm"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={blockForm.fullDay}
                      onChange={(e) => setBlockForm({ ...blockForm, fullDay: e.target.checked })}
                      className="rounded"
                    />
                    <span>Bloquear el día completo</span>
                  </label>

                  {!blockForm.fullDay && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#5C564E] mb-1">
                          Hora Inicio
                        </label>
                        <input
                          type="time"
                          value={blockForm.startTime}
                          onChange={(e) => setBlockForm({ ...blockForm, startTime: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-[#DCD5CB] text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#5C564E] mb-1">
                          Hora Fin
                        </label>
                        <input
                          type="time"
                          value={blockForm.endTime}
                          onChange={(e) => setBlockForm({ ...blockForm, endTime: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-[#DCD5CB] text-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-[#5C564E] mb-1">
                      Motivo (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Compromiso personal / Feriado"
                      value={blockForm.reason}
                      onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#DCD5CB] text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-full bg-[#111111] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Bloqueo
                  </button>
                </form>

                <div className="bg-white p-6 rounded-2xl border border-[#EAE4DC] space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
                    Bloqueos Activos
                  </h3>
                  {blockedSlots.length === 0 ? (
                    <p className="text-xs text-[#8C857B]">No tienes bloqueos configurados.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {blockedSlots.map((b) => (
                        <div
                          key={b.id}
                          className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E6DFD5] flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-semibold text-[#111111] capitalize">
                              {formatDateSpanish(b.date)}
                            </p>
                            <p className="text-[#6E685F]">
                              {b.fullDay
                                ? 'Día completo bloqueado'
                                : `${formatTime12h(b.startTime)} - ${formatTime12h(b.endTime)}`}
                              {b.reason ? ` • ${b.reason}` : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteBlock(b.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Eliminar bloqueo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: EDITAR PRECIOS Y NOMBRES DE SERVICIOS */}
            {adminTab === 'servicios' && (
              <div className="bg-white p-6 rounded-2xl border border-[#EAE4DC] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
                    Ajustar Precios y Servicios
                  </h3>
                  <span className="text-xs text-[#8C857B]">
                    Duración fija: 180 min (Pelo a Pelo) / 90 min (Demás servicios)
                  </span>
                </div>
                <div className="divide-y divide-[#F2EDE6]">
                  {services.map((srv) => {
                    const isEditing = editingServiceId === srv.id;
                    return (
                      <div
                        key={srv.id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex-1">
                          <span className="text-[10px] uppercase tracking-wider text-[#8C857B] block">
                            {srv.category}
                          </span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editNameVal}
                              onChange={(e) => setEditNameVal(e.target.value)}
                              className="mt-1 w-full max-w-xs px-2.5 py-1 border rounded-lg text-sm font-medium"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-[#111111]">{srv.name}</span>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1 text-xs">
                              <span>RD$</span>
                              <input
                                type="number"
                                value={editPriceVal}
                                onChange={(e) => setEditPriceVal(e.target.value)}
                                className="w-24 px-2 py-1 border rounded-lg"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSaveServiceEdit(srv.id)}
                              className="px-3 py-1 rounded-lg bg-[#111111] text-white text-xs font-medium"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingServiceId(null)}
                              className="px-2 py-1 text-xs text-[#6E685F]"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-[#6E685F]">
                              {srv.category === 'Pestañas Pelo a Pelo' ? '180 min' : '90 min'}
                            </span>
                            <span className="text-sm font-bold text-[#111111]">
                              RD${Number(srv.price).toLocaleString()}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingServiceId(srv.id);
                                setEditNameVal(srv.name);
                                setEditPriceVal(srv.price);
                              }}
                              className="p-1.5 rounded-lg hover:bg-[#FAF8F5] text-[#5C564E]"
                              title="Editar servicio"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: CONFIGURACIÓN BANCARIA Y PIN */}
            {adminTab === 'config' && (
              <form
                onSubmit={handleSaveSettings}
                className="bg-white p-6 rounded-2xl border border-[#EAE4DC] max-w-xl space-y-4"
              >
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
                  Datos de Transferencia y Seguridad
                </h3>

                <div>
                  <label className="block text-xs font-medium text-[#5C564E] mb-1">
                    Cuenta Bancaria para Adelantos (Popular, Banreservas, Qik, etc.)
                  </label>
                  <textarea
                    rows={3}
                    value={settingsForm.bankInfo}
                    onChange={(e) => setSettingsForm({ ...settingsForm, bankInfo: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCD5CB] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5C564E] mb-1">
                    Nota de Política de Adelanto
                  </label>
                  <textarea
                    rows={2}
                    value={settingsForm.depositNote}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, depositNote: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCD5CB] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5C564E] mb-1">
                    PIN de Acceso Admin
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    value={settingsForm.adminPin}
                    onChange={(e) => setSettingsForm({ ...settingsForm, adminPin: e.target.value })}
                    className="w-40 px-3.5 py-2 rounded-xl border border-[#DCD5CB] text-sm font-bold tracking-widest"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#111111] text-white text-xs font-semibold"
                >
                  Guardar Configuración
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}