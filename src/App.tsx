/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { 
  Home, 
  Users, 
  CheckSquare, 
  Wrench, 
  Package, 
  Plus, 
  Phone, 
  Search, 
  ChevronLeft,
  Camera,
  MoreVertical,
  X,
  Mic,
  Trash,
  Lock,
  User as UserIcon,
  LogOut,
  Clock,
  Calendar as CalendarIcon,
  Copy,
  Check,
  Edit,
  Save,
  Upload,
  Mail,
  Info,
  UserPlus,
  Car as CarIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  CarStatus, 
  TaskStatus, 
  Task, 
  Car, 
  Client, 
  Mechanic, 
  InventoryItem, 
  Transaction, 
  ScreenType, 
  Role, 
  User, 
  NavItem,
  Appointment
} from './types';
import { 
  db, 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit 
} from './firebase';

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let message = "Щось пішло не так.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) message = `Помилка: ${parsed.error}`;
      } catch (e) {}
      
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center p-6 bg-gray-950 text-white text-center">
          <h1 className="text-2xl font-black text-orange-500 mb-4 uppercase">Упс! Сталася помилка</h1>
          <p className="text-gray-400 mb-6">{message}</p>
          <Button onClick={() => window.location.reload()}>Оновити сторінку</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Mock Data ---
const INITIAL_CLIENTS: Client[] = [
  { id: 'c1', name: 'Іван Петренко', phone: '+380671234567', debt: 0, notes: 'Постійний клієнт' },
  { id: 'c2', name: 'Марія Сидоренко', phone: '+380509876543', debt: 1500, notes: 'Потрібна знижка наступного разу' },
];

const INITIAL_CARS: Car[] = [
  { id: 'car1', brand: 'Toyota', model: 'Camry', year: '2020', plate: 'AA 1234 BB', clientId: 'c1', status: 'В роботі' },
  { id: 'car2', brand: 'BMW', model: 'X5', year: '2018', plate: 'BC 5678 CB', clientId: 'c2', status: 'Очікує' },
];

const INITIAL_MECHANICS: Mechanic[] = [
  { id: 'm1', name: 'Олександр Коваль', isBusy: true },
  { id: 'm2', name: 'Сергій Бондар', isBusy: false },
];

const INITIAL_TASKS: Task[] = [
  { id: 't1', carId: 'car1', clientId: 'c1', text: 'Заміна масла', status: 'В роботі', mechanicId: 'm1', receptionDate: new Date().toISOString() },
  { id: 't2', carId: 'car1', clientId: 'c1', text: 'Діагностика ходової', status: 'Нова', mechanicId: 'm2', receptionDate: new Date().toISOString() },
];

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'i1', name: 'Масло 5W-30', category: 'Масла', quantity: 15, minStock: 5, unit: 'л', type: 'REGULAR' },
  { id: 'i2', name: 'Фільтр масляний', category: 'Фільтри', quantity: 2, minStock: 10, unit: 'шт', type: 'REGULAR' },
];

// --- Components ---

const Button = ({ children, onClick, className = "", variant = "primary", fullWidth = false, type = "button", disabled = false }: any) => {
  const base = "py-3 px-4 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 orange-glow disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";
  const variants: any = {
    primary: "bg-orange-500 text-gray-950",
    secondary: "bg-gray-800 text-orange-500 border border-orange-500/50",
    danger: "bg-red-600 text-white",
    outline: "border-2 border-orange-500/50 text-orange-500",
    yellow: "bg-yellow-500 text-black",
  };
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4">
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="bg-gray-900 w-full max-w-lg md:max-w-xl lg:max-w-2xl rounded-t-3xl sm:rounded-3xl overflow-hidden border-t sm:border border-orange-500/30 flex flex-col max-h-[90vh] shadow-2xl"
      >
        <div className="p-6 border-b border-orange-500/20 flex justify-between items-center bg-gray-900/50">
          <h2 className="text-xl font-black text-orange-500 uppercase tracking-wider">{title}</h2>
          <button onClick={onClose} className="p-2 bg-gray-800 text-orange-500 rounded-full border border-orange-500/30"><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [users, setUsers] = useState<User[]>([]);
  const [activeScreen, setActiveScreen] = useState<ScreenType>('HANGAR');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [publicRequests, setPublicRequests] = useState<any[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [isNewClientQuick, setIsNewClientQuick] = useState(false);
  const [tabState, setTabState] = useState<'HANGAR' | 'SCHEDULE' | 'PARKING'>('HANGAR');
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isNewCarModalOpen, setIsNewCarModalOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isNewMechanicModalOpen, setIsNewMechanicModalOpen] = useState(false);
  const [isNewInventoryItemModalOpen, setIsNewInventoryItemModalOpen] = useState(false);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE' | 'WRITE_OFF'>('INCOME');

  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  const getTaskTotalCost = (task: Task) => {
    const laborCost = task.cost || 0;
    const partsCost = transactions
      .filter(tr => tr.taskId === task.id && tr.type === 'EXPENSE')
      .reduce((sum, tr) => sum + ((tr.price || 0) * tr.quantity), 0);
    return laborCost + partsCost;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Simple feedback could be added here if needed
  };

  if (!isAuthReady) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-950 text-orange-500">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-black uppercase tracking-widest text-xs">Завантаження системи...</p>
      </div>
    );
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const userEmail = user.email?.toLowerCase();
          const adminEmail = 'musalini2016@gmail.com';
          
          console.log('Auth state changed: User logged in', user.email);
          
          // Try to find user in the users collection first
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            console.log('User document found in Firestore');
            setCurrentUser(userDoc.data() as User);
          } else if (userEmail === adminEmail) {
            console.log('Admin email detected, performing emergency bypass');
            // EMERGENCY BYPASS FOR ADMIN
            const adminUser: User = {
              id: user.uid,
              username: 'admin',
              password: 'google-auth',
              role: 'ADMIN',
              name: user.displayName || 'Власник',
              email: user.email || 'Musalini2016@gmail.com',
              avatar: user.photoURL || undefined
            };
            
            try {
              await setDoc(userDocRef, adminUser);
              console.log('Admin document created/updated in Firestore');
            } catch (err) {
              console.error('Non-critical: Could not save admin doc, but letting user in:', err);
            }
            setCurrentUser(adminUser);
          } else {
            console.warn('User logged in but not authorized:', user.email);
            setLoginError(`Користувач ${user.email} не знайдений у системі. Зверніться до адміністратора.`);
            setCurrentUser(null);
          }
        } else {
          console.log('Auth state changed: No user logged in');
          setCurrentUser(null);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        setCurrentUser(null);
      } finally {
        setIsAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoginLoading(true);
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setActiveScreen('HANGAR');
    } catch (err: any) {
      console.error('Google Login Error:', err);
      let errorMessage = 'Помилка входу через Google.';
      
      if (err.code === 'auth/unauthorized-domain') {
        errorMessage = 'Цей домен не додано до дозволених у консолі Firebase. Будь ласка, додайте ваш домен (наприклад, vash-login.github.io) у налаштуваннях Authentication -> Settings -> Authorized domains.';
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMessage = 'Вхід через Google не активовано в консолі Firebase. Будь ласка, активуйте Google у вкладці Sign-in method.';
      } else if (err.code === 'auth/configuration-not-found') {
        errorMessage = 'Конфігурація Firebase не знайдена. Перевірте налаштування проекту.';
      } else if (err.code === 'auth/popup-blocked') {
        errorMessage = 'Браузер заблокував спливаюче вікно. Будь ласка, дозвольте спливаючі вікна для цього сайту.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Вхід скасовано користувачем.';
      } else if (err.message) {
        errorMessage = `Помилка: ${err.message}`;
      }
      
      setLoginError(errorMessage);
    } finally {
      setIsLoginLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  // Public Listeners
  useEffect(() => {
    const unsubMechanics = onSnapshot(collection(db, 'mechanics'), (snapshot) => {
      setMechanics(snapshot.docs.map(doc => doc.data() as Mechanic));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'mechanics'));

    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      setTasks(snapshot.docs.map(doc => doc.data() as Task));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'tasks'));

    return () => {
      unsubMechanics();
      unsubTasks();
    };
  }, []);

  // Restricted Listeners
  useEffect(() => {
    if (!isAuthReady || !auth.currentUser) return;

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as User));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      setClients(snapshot.docs.map(doc => doc.data() as Client));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'clients'));

    const unsubCars = onSnapshot(collection(db, 'cars'), (snapshot) => {
      setCars(snapshot.docs.map(doc => doc.data() as Car));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'cars'));

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      setInventory(snapshot.docs.map(doc => doc.data() as InventoryItem));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'inventory'));

    const unsubTransactions = onSnapshot(query(collection(db, 'transactions'), orderBy('date', 'desc')), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => doc.data() as Transaction));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'transactions'));

    const unsubPublicRequests = onSnapshot(query(collection(db, 'publicRequests'), orderBy('timestamp', 'desc')), (snapshot) => {
      setPublicRequests(snapshot.docs.map(doc => doc.data() as any));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'publicRequests'));

    const unsubAppointments = onSnapshot(collection(db, 'appointments'), (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'appointments'));

    return () => {
      unsubUsers();
      unsubClients();
      unsubCars();
      unsubInventory();
      unsubTransactions();
      unsubPublicRequests();
      unsubAppointments();
    };
  }, [isAuthReady, auth.currentUser]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUser) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const updatedUser = { ...currentUser, avatar: base64String };
        try {
          await setDoc(doc(db, 'users', currentUser.id), updatedUser);
          setCurrentUser(updatedUser);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.id}`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordChange = async (userId: string, newPass: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { password: newPass });
      if (currentUser?.id === userId) {
        setCurrentUser({ ...currentUser, password: newPass });
      }
      alert('Пароль змінено!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handlePublicRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const id = Math.random().toString(36).substr(2, 9);
    const newRequest = {
      id,
      name: formData.get('name'),
      phone: formData.get('phone'),
      car: formData.get('car'),
      problem: formData.get('problem'),
      urgency: formData.get('urgency'),
      status: 'PENDING',
      timestamp: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'publicRequests', id), newRequest);
      alert('Заявку подано! Ми зв\'яжемося з вами.');
      (e.currentTarget as HTMLFormElement).reset();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `publicRequests/${id}`);
    }
  };

  const PublicScreen = () => {
    const [publicTab, setPublicTab] = useState<'REGISTER' | 'SCHEDULE'>('SCHEDULE');

    return (
      <div className="h-full w-full overflow-y-auto bg-gray-950 p-4 md:p-8 space-y-8 pb-32 custom-scrollbar">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.4)]">
              <CarIcon className="text-gray-950" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Золота Підкова</h1>
              <p className="text-xs font-black text-orange-500 uppercase tracking-widest mt-1">Автосервіс преміум-класу</p>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={() => {
                setActiveScreen('HANGAR');
                setCurrentUser(null);
              }}
              className="flex-1 md:flex-none px-6 py-4 bg-gray-900 rounded-2xl border border-orange-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-gray-800 hover:border-orange-500/40 group shadow-lg"
            >
              <Lock className="text-orange-500 group-hover:scale-110 transition-transform" size={20} />
              <div className="text-left">
                <div className="text-[10px] font-black text-white uppercase tracking-widest">Персонал</div>
                <div className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">Вхід для майстрів</div>
              </div>
            </button>
            <button 
              onClick={() => {
                setActiveScreen('HANGAR');
                setCurrentUser(null);
              }}
              className="flex-1 md:flex-none px-6 py-4 bg-gray-900 rounded-2xl border border-orange-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-gray-800 hover:border-orange-500/40 group shadow-lg"
            >
              <UserIcon className="text-orange-500 group-hover:scale-110 transition-transform" size={20} />
              <div className="text-left">
                <div className="text-[10px] font-black text-white uppercase tracking-widest">Власник</div>
                <div className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">Панель управління</div>
              </div>
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-12">
          <div className="flex p-1.5 bg-gray-900 rounded-[2rem] gap-1.5 border border-orange-500/10 shadow-inner">
            <button 
              onClick={() => setPublicTab('SCHEDULE')}
              className={`flex-1 py-5 rounded-[1.5rem] text-sm font-black uppercase tracking-[0.2em] transition-all duration-300 ${publicTab === 'SCHEDULE' ? 'bg-orange-500 text-gray-950 shadow-[0_0_30px_rgba(249,115,22,0.4)] scale-[1.02]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Запис на сервіс
            </button>
            <button 
              onClick={() => setPublicTab('REGISTER')}
              className={`flex-1 py-5 rounded-[1.5rem] text-sm font-black uppercase tracking-[0.2em] transition-all duration-300 ${publicTab === 'REGISTER' ? 'bg-orange-500 text-gray-950 shadow-[0_0_30px_rgba(249,115,22,0.4)] scale-[1.02]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Стати клієнтом
            </button>
          </div>

          <div className="space-y-6">
            {publicTab === 'SCHEDULE' ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 bg-gray-900 rounded-[2.5rem] border border-orange-500/20 space-y-6 shadow-2xl"
              >
                <div className="flex items-center gap-4 text-orange-500">
                  <div className="p-3 bg-orange-500/10 rounded-2xl">
                    <CalendarIcon size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-widest text-white">Запис на сервіс</h2>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Швидка обробка заявок</p>
                  </div>
                </div>
                
                <form onSubmit={handlePublicRequest} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-2">Ваше Ім'я</label>
                    <input name="name" type="text" className="w-full p-4 bg-gray-950 border border-orange-500/10 rounded-2xl font-bold text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all" placeholder="Іван Іванов" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-2">Телефон для зв'язку</label>
                    <input name="phone" type="tel" className="w-full p-4 bg-gray-950 border border-orange-500/10 rounded-2xl font-bold text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all" placeholder="+380..." required />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-2">Автомобіль (Марка, модель, номер)</label>
                    <input name="car" type="text" className="w-full p-4 bg-gray-950 border border-orange-500/10 rounded-2xl font-bold text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all" placeholder="Toyota Camry AA1234BB" required />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-2">Опис проблеми</label>
                    <textarea name="problem" className="w-full p-4 bg-gray-950 border border-orange-500/10 rounded-2xl font-bold text-white outline-none focus:ring-2 focus:ring-orange-500 h-32 resize-none transition-all" placeholder="Що саме потрібно зробити?" required />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-2">Терміновість</label>
                    <select name="urgency" className="w-full p-4 bg-gray-950 border border-orange-500/10 rounded-2xl font-bold text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all appearance-none cursor-pointer">
                      <option value="NORMAL">Звичайно (планово)</option>
                      <option value="URGENT">Терміново (сьогодні/завтра)</option>
                      <option value="CRITICAL">Критично (авто не на ходу)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 pt-2">
                    <Button fullWidth type="submit" className="h-16 text-lg tracking-widest">Відправити заявку</Button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 bg-gray-900 rounded-[2.5rem] border border-orange-500/20 space-y-6 shadow-2xl"
              >
                <div className="flex items-center gap-4 text-orange-500">
                  <div className="p-3 bg-orange-500/10 rounded-2xl">
                    <UserPlus size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-widest text-white">Стати клієнтом</h2>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Програма лояльності</p>
                  </div>
                </div>
                
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget as HTMLFormElement);
                  const id = Math.random().toString(36).substr(2, 9);
                  const newClient: Client = {
                    id,
                    name: formData.get('name') as string,
                    phone: formData.get('phone') as string,
                    email: formData.get('email') as string,
                    debt: 0,
                    notes: 'Реєстрація через публічну сторінку'
                  };
                  try {
                    await setDoc(doc(db, 'clients', id), newClient);
                    alert('Дякуємо за реєстрацію! Тепер ви у нашій базі.');
                    setActiveScreen('PUBLIC');
                  } catch (err) {
                    handleFirestoreError(err, OperationType.WRITE, `clients/${id}`);
                  }
                }} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-2">ПІБ</label>
                    <input name="name" type="text" className="w-full p-4 bg-gray-950 border border-orange-500/10 rounded-2xl font-bold text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all" placeholder="Іван Іванов" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-2">Телефон</label>
                    <input name="phone" type="tel" className="w-full p-4 bg-gray-950 border border-orange-500/10 rounded-2xl font-bold text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all" placeholder="+380..." required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-2">Email (опціонально)</label>
                    <input name="email" type="email" className="w-full p-4 bg-gray-950 border border-orange-500/10 rounded-2xl font-bold text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all" placeholder="email@example.com" />
                  </div>
                  <Button fullWidth type="submit" className="h-16 text-lg tracking-widest">Зареєструватися</Button>
                </form>
              </motion.div>
            )}

            <div className="p-8 bg-gray-900/50 rounded-[2.5rem] border border-gray-800 space-y-6">
              <div className="flex items-center gap-4 text-gray-500">
                <div className="p-3 bg-gray-800 rounded-2xl">
                  <Info size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-widest text-white">Про нас</h2>
                  <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">Якість та надійність</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-950 rounded-2xl border border-gray-800">
                  <div className="text-orange-500 font-black mb-1">10+ років</div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold">Досвіду</div>
                </div>
                <div className="p-4 bg-gray-950 rounded-2xl border border-gray-800">
                  <div className="text-orange-500 font-black mb-1">Сучасне</div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold">Обладнання</div>
                </div>
                <div className="p-4 bg-gray-950 rounded-2xl border border-gray-800">
                  <div className="text-orange-500 font-black mb-1">Гарантія</div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold">На всі роботи</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ProfileScreen = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [newPass, setNewPass] = useState('');
    const [showPassModal, setShowPassModal] = useState(false);
    const [selectedUserToEdit, setSelectedUserToEdit] = useState<User | null>(null);

    const [editName, setEditName] = useState(currentUser?.name || '');
    const [editPhone, setEditPhone] = useState(currentUser?.phone || '');
    const [editEmail, setEditEmail] = useState(currentUser?.email || '');
    const [editBio, setEditBio] = useState(currentUser?.bio || '');

    const quickTexts = [
      "Ваше авто готове! Можете забирати.",
      "Потрібні додаткові запчастини. Зателефонуйте нам.",
      "Запис підтверджено на завтра о 10:00.",
      "Вартість ремонту складе 2500 грн."
    ];

    const handleSaveProfile = async () => {
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          name: editName,
          phone: editPhone,
          email: editEmail,
          bio: editBio
        };
        try {
          await setDoc(doc(db, 'users', currentUser.id), updatedUser);
          setCurrentUser(updatedUser);
          setIsEditing(false);
          alert('Профіль оновлено!');
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.id}`);
        }
      }
    };

    return (
      <div className="h-full w-full overflow-y-auto bg-gray-950 p-6 space-y-8 pb-32">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Мій Профіль</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsEditing(!isEditing)} 
              className={`p-3 rounded-2xl border transition-all ${isEditing ? 'bg-orange-500 text-gray-950 border-orange-500' : 'bg-gray-900 text-orange-500 border-orange-500/20'}`}
            >
              {isEditing ? <Save size={20} /> : <Edit size={20} />}
            </button>
            <button 
              onClick={async () => {
                await signOut(auth);
                setCurrentUser(null);
              }}
              className="p-3 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Profile Card */}
        <div className="p-6 bg-gray-900 rounded-[40px] border border-orange-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[60px] rounded-full" />
          
          <div className="flex flex-col items-center space-y-4">
            <div className="relative group">
              <div className="w-32 h-32 rounded-[40px] bg-gray-800 border-4 border-orange-500/20 overflow-hidden flex items-center justify-center">
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={60} className="text-gray-700" />
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 p-3 bg-orange-500 text-gray-950 rounded-2xl cursor-pointer shadow-xl active:scale-90 transition-transform">
                <Upload size={20} />
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
              </label>
            </div>

            <div className="text-center w-full">
              {isEditing ? (
                <input 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-gray-950 border border-orange-500/30 rounded-xl p-2 text-center text-xl font-black text-white outline-none focus:ring-2 focus:ring-orange-500"
                />
              ) : (
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">{currentUser?.name}</h2>
              )}
              <p className="text-orange-500 font-black uppercase tracking-[0.2em] text-[10px] mt-1">{currentUser?.role}</p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-2">Телефон</label>
              {isEditing ? (
                <input 
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-gray-950 border border-orange-500/10 rounded-xl p-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="+380..."
                />
              ) : (
                <div className="p-4 bg-gray-950 rounded-2xl border border-orange-500/5 flex items-center gap-3">
                  <Phone size={18} className="text-orange-500" />
                  <span className="text-sm font-black text-white">{currentUser?.phone || 'Не вказано'}</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-2">Email</label>
              {isEditing ? (
                <input 
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-gray-950 border border-orange-500/10 rounded-xl p-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="email@example.com"
                />
              ) : (
                <div className="p-4 bg-gray-950 rounded-2xl border border-orange-500/5 flex items-center gap-3">
                  <Mail size={18} className="text-orange-500" />
                  <span className="text-sm font-black text-white">{currentUser?.email || 'Не вказано'}</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-2">Про себе</label>
              {isEditing ? (
                <textarea 
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-gray-950 border border-orange-500/10 rounded-xl p-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-orange-500 h-24"
                  placeholder="Коротка інформація..."
                />
              ) : (
                <div className="p-4 bg-gray-950 rounded-2xl border border-orange-500/5">
                  <p className="text-sm font-bold text-gray-400 leading-relaxed">{currentUser?.bio || 'Інформація відсутня'}</p>
                </div>
              )}
            </div>
            
            {isEditing && (
              <Button fullWidth onClick={handleSaveProfile}>
                Зберегти зміни
              </Button>
            )}

            {!isEditing && (
              <Button fullWidth variant="secondary" onClick={() => setShowPassModal(true)}>
                <Lock size={18} /> Змінити пароль
              </Button>
            )}
          </div>
        </div>

        {/* Quick Actions (Admin only) */}
        {currentUser?.role === 'ADMIN' && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-4">Швидкі відповіді</h3>
            <div className="grid grid-cols-1 gap-3">
              {quickTexts.map((text, idx) => (
                <button 
                  key={idx}
                  onClick={() => copyToClipboard(text)}
                  className="p-4 bg-gray-900 rounded-2xl border border-gray-800 flex items-center justify-between group active:bg-orange-500/10 transition-colors"
                >
                  <span className="text-sm font-bold text-gray-300 text-left">{text}</span>
                  <Copy size={18} className="text-gray-600 group-hover:text-orange-500" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manage Subordinates (Admin only) */}
        {currentUser?.role === 'ADMIN' && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-4">Керування персоналом</h3>
            <div className="space-y-3">
              {users.filter(u => u.id !== currentUser.id).map(user => (
                <div key={user.id} className="p-4 bg-gray-900 rounded-2xl border border-gray-800 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-white uppercase">{user.name}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{user.role}</div>
                  </div>
                  <button 
                    onClick={() => { setSelectedUserToEdit(user); setShowPassModal(true); }}
                    className="p-3 bg-gray-800 text-orange-500 rounded-xl border border-orange-500/20"
                  >
                    <Edit size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Password Modal */}
        <Modal isOpen={showPassModal} onClose={() => { setShowPassModal(false); setSelectedUserToEdit(null); setNewPass(''); }} title="Зміна паролю">
          <div className="space-y-4">
            <p className="text-gray-500 text-xs font-bold">
              Зміна паролю для: <span className="text-orange-500">{selectedUserToEdit ? selectedUserToEdit.name : 'мене'}</span>
            </p>
            <input 
              type="password" 
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Новий пароль"
              className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-orange-500"
            />
            <Button fullWidth onClick={async () => {
              await handlePasswordChange(selectedUserToEdit ? selectedUserToEdit.id : currentUser!.id, newPass);
              setShowPassModal(false);
              setSelectedUserToEdit(null);
              setNewPass('');
            }}>
              <Save size={18} /> Зберегти
            </Button>
          </div>
        </Modal>
      </div>
    );
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // --- Helpers ---
  const getClientById = (id: string) => clients.find(c => c.id === id);
  const getCarTasks = (carId: string) => tasks.filter(t => t.carId === carId);
  const getOpenTasksCount = (carId: string) => tasks.filter(t => t.carId === carId && t.status !== 'Закрита').length;

  // --- Auth Components ---

  const LoginScreen = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      const user = users.find(u => u.username === username && u.password === password);
      if (user) {
        setCurrentUser(user);
        if (user.role === 'EMPLOYEE') {
          setActiveScreen('TASKS');
        } else {
          setActiveScreen('HANGAR');
        }
      } else {
        setError('Невірний логін або пароль');
      }
    };

    return (
      <div className="h-screen w-full flex flex-col items-center justify-center p-6 bg-gray-950">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-8"
        >
          <div className="text-center space-y-2">
            <div className="inline-flex p-4 bg-orange-500/10 rounded-3xl border border-orange-500/20 mb-4">
              <Lock className="text-orange-500" size={40} />
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Золота Підкова</h1>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Система управління СТО</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-2">Логін</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-2xl font-bold text-white focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="Введіть логін"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-2">Пароль</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-2xl font-bold text-white focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
            {loginError && (
              <div className="space-y-3">
                <p className="text-red-500 text-xs font-bold text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">{loginError}</p>
                {auth.currentUser && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[8px] text-gray-500 text-center uppercase font-black">Ви увійшли як: {auth.currentUser.email}</p>
                    <button 
                      onClick={() => signOut(auth)}
                      className="w-full text-[10px] font-black text-orange-500 uppercase tracking-widest hover:underline"
                    >
                      Вийти та спробувати інший аккаунт
                    </button>
                  </div>
                )}
              </div>
            )}
            <Button fullWidth type="submit" className="h-14" disabled={isLoginLoading}>Увійти в систему</Button>
            
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-orange-500/10"></div>
              </div>
              <div className="relative flex justify-center text-[8px] uppercase font-black tracking-widest">
                <span className="bg-gray-950 px-2 text-gray-500">Або за допомогою Google</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoginLoading}
              className="w-full flex items-center justify-center gap-3 p-4 bg-white text-gray-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95 shadow-lg disabled:opacity-50"
            >
              {isLoginLoading ? (
                <div className="w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
              )}
              {isLoginLoading ? 'Завантаження...' : 'Увійти через Google'}
            </button>

            <div className="pt-4 border-t border-orange-500/10">
              <button 
                type="button"
                onClick={() => setActiveScreen('PUBLIC')}
                className="w-full py-4 text-orange-500 font-black uppercase tracking-widest text-[10px] hover:text-orange-400 transition-colors"
              >
                Реєстрація та запис на графік
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  };

  // --- Screen Components ---

  const ScheduleScreen = () => {
    const dayAppointments = appointments
      .filter(a => a.date === selectedDate && a.status === 'SCHEDULED')
      .sort((a, b) => a.time.localeCompare(b.time));

    const handleCheckIn = async (app: Appointment) => {
      try {
        let carId = app.carId;
        
        if (carId) {
          // Update existing car status
          await updateDoc(doc(db, 'cars', carId), { status: 'Очікує' });
        } else {
          // Create new car entry
          carId = Math.random().toString(36).substr(2, 9);
          const newCar: Car = {
            id: carId,
            plate: app.carPlate,
            clientId: app.clientId,
            brand: '',
            model: app.carModel,
            year: '',
            status: 'Очікує'
          };
          await setDoc(doc(db, 'cars', carId), newCar);
        }

        await updateDoc(doc(db, 'appointments', app.id), { status: 'CHECKED_IN' });
        alert('Авто прийнято в ангар!');
        setSelectedCarId(carId);
        setIsNewTaskModalOpen(true);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'check_in');
      }
    };

    return (
      <div className="flex flex-col h-full bg-gray-950">
        <header className="bg-gray-900/80 backdrop-blur-md p-6 pt-10 border-b border-orange-500/20">
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Графік записів</h1>
          <div className="mt-4 flex items-center gap-4">
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-gray-950 border border-orange-500/20 rounded-xl p-3 text-sm font-black text-white outline-none focus:ring-2 focus:ring-orange-500"
            />
            <div className="flex-1 h-px bg-orange-500/10" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-32 content-start">
          {dayAppointments.length === 0 ? (
            <div className="text-center py-20 col-span-full">
              <div className="inline-flex p-6 bg-gray-900 rounded-full mb-4">
                <CalendarIcon size={40} className="text-gray-700" />
              </div>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">На цей день записів немає</p>
              <Button 
                variant="outline" 
                className="mt-6"
                onClick={() => {
                  setSelectedCarId(null);
                  setIsNewRequestModalOpen(true);
                }}
              >
                Додати запис
              </Button>
            </div>
          ) : (
            dayAppointments.map(app => {
              const client = getClientById(app.clientId);
              return (
                <motion.div 
                  key={app.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-card p-4 orange-outline flex items-center gap-6"
                >
                  <div className="text-center min-w-[60px]">
                    <div className="text-xl font-black text-orange-500 leading-none">{app.time}</div>
                    <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">Час</div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-lg font-black text-white uppercase tracking-tight">{app.carPlate}</div>
                    <div className="text-xs text-gray-400 font-bold">{app.carModel}</div>
                    <div className="mt-1 text-[10px] font-black text-orange-500/50 uppercase">{client?.name}</div>
                  </div>

                  <button 
                    onClick={() => handleCheckIn(app)}
                    className="p-4 bg-orange-500 text-gray-950 rounded-2xl shadow-lg active:scale-90 transition-all hover:scale-105 group"
                  >
                    <Check size={20} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                  </button>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    );
  };
  const HangarScreen = () => {
    const [tab, setTab] = useState<CarStatus>('Очікує');
    const filteredCars = cars.filter(c => c.status === tab);

    const statusCounts = {
      'Відстійник': cars.filter(c => c.status === 'Відстійник').length,
      'Очікує': cars.filter(c => c.status === 'Очікує').length,
      'В роботі': cars.filter(c => c.status === 'В роботі').length,
      'Готово': cars.filter(c => c.status === 'Готово').length,
      'Видано': cars.filter(c => c.status === 'Видано').length,
    };

    return (
      <div className="flex flex-col h-full relative">
        <header className="bg-gray-900/80 backdrop-blur-md p-4 pt-8 border-b border-orange-500/20 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-1">АНГАР / ЧЕРГА</h2>
            <h1 className="text-xl font-black text-white tracking-tight">Дошка активних авто</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-orange-500 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">{currentTime}</span>
            <button 
              onClick={async () => {
                await signOut(auth);
                setCurrentUser(null);
              }}
              className="p-2 bg-gray-800 text-orange-500 rounded-lg active:scale-90 transition-all border border-orange-500/20"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <div className="flex p-2 gap-1 bg-gray-900/40 border-b border-orange-500/10 overflow-x-auto no-scrollbar">
          {(['Відстійник', 'Очікує', 'В роботі', 'Готово', 'Видано'] as CarStatus[]).map(s => (
            <button 
              key={s}
              onClick={() => setTab(s)}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap relative ${tab === s ? 'bg-orange-500 text-gray-950 shadow-[0_0_20px_rgba(249,115,22,0.4)]' : 'text-gray-500'}`}
            >
              {s}
              {statusCounts[s] > 0 && (
                <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] border border-gray-950 ${tab === s ? 'bg-gray-950 text-orange-500' : 'bg-orange-500 text-gray-950'}`}>
                  {statusCounts[s]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-32 custom-scrollbar content-start">
          {filteredCars.map(car => (
            <div 
              key={car.id} 
              onClick={() => setSelectedCarId(car.id)}
              className="glass-card p-4 flex justify-between items-center active:scale-95 transition-transform orange-outline cursor-pointer"
            >
              <div>
                <div className="text-xl font-black text-white tracking-wider">{car.plate}</div>
                <div className="text-sm text-gray-400 font-medium">{car.brand} {car.model} • {getClientById(car.clientId)?.name}</div>
                <div className="mt-2 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${car.status === 'В роботі' ? 'bg-green-500 animate-pulse' : car.status === 'Готово' ? 'bg-blue-500' : 'bg-yellow-500'}`}></div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500/70">{car.status}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {getOpenTasksCount(car.id) > 0 && (
                  <div className="bg-orange-500 text-gray-950 text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                    {getOpenTasksCount(car.id)}
                  </div>
                )}
                <ChevronLeft className="rotate-180 text-orange-500/30" size={20} />
              </div>
            </div>
          ))}
          {filteredCars.length === 0 && (
            <div className="text-center py-20 text-gray-600 font-medium italic">Немає автомобілів у статусі "{tab}"</div>
          )}
        </div>
      </div>
    );
  };

  const ClientsScreen = () => {
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState<'LIST' | 'QUEUE' | 'SCHEDULE' | 'REQUESTS'>('LIST');

    const filteredClients = clients.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.phone.includes(search)
    ).map(client => {
      const clientTasks = tasks.filter(t => t.clientId === client.id && t.status !== 'Закрита');
      const debt = clientTasks.reduce((sum, t) => sum + getTaskTotalCost(t), 0);
      return { ...client, debt };
    });

    // Mock data for schedule
    const scheduleData = [
      { name: 'Пн', visits: 4 },
      { name: 'Вт', visits: 7 },
      { name: 'Ср', visits: 5 },
      { name: 'Чт', visits: 8 },
      { name: 'Пт', visits: 12 },
      { name: 'Сб', visits: 6 },
      { name: 'Нд', visits: 2 },
    ];

    return (
      <div className="flex flex-col h-full">
        <header className="bg-gray-900/80 backdrop-blur-md p-4 pt-8 border-b border-orange-500/20 sticky top-0 z-10">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Клієнти</h1>
            <div className="flex gap-2">
              <button 
                onClick={async () => {
                  await signOut(auth);
                  setCurrentUser(null);
                }}
                className="p-2 bg-gray-800 text-orange-500 rounded-lg active:scale-90 transition-all border border-orange-500/20"
              >
                <LogOut size={20} />
              </button>
              <button 
                onClick={() => setIsNewClientModalOpen(true)}
                className="p-2 bg-orange-500 text-gray-950 rounded-lg active:scale-90 transition-all shadow-[0_0_15px_rgba(249,115,22,0.4)]"
              >
                <Plus size={20} strokeWidth={3} />
              </button>
            </div>
          </div>

          <div className="flex p-1 bg-gray-950 rounded-xl gap-1 border border-orange-500/10 mb-4 overflow-x-auto no-scrollbar">
            {(['LIST', 'QUEUE', 'SCHEDULE', 'REQUESTS'] as const).map(t => (
              <button 
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${tab === t ? 'bg-orange-500 text-gray-950 shadow-lg' : 'text-gray-500'}`}
              >
                {t === 'LIST' ? 'Список' : t === 'QUEUE' ? 'Черга' : t === 'SCHEDULE' ? 'Графік' : 'Заявки'}
              </button>
            ))}
          </div>

          {tab === 'LIST' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500/50" size={18} />
              <input 
                type="text" 
                placeholder="Пошук клієнта..." 
                className="w-full bg-gray-950 border border-orange-500/20 rounded-xl py-3 pl-10 pr-4 font-medium text-white placeholder:text-gray-600 focus:ring-2 focus:ring-orange-500 outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-32 custom-scrollbar content-start">
          {tab === 'LIST' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredClients.map(client => (
                <div 
                  key={client.id} 
                  onClick={() => setSelectedClientId(client.id)}
                  className="glass-card p-4 orange-outline flex justify-between items-center active:scale-[0.98] transition-all"
                >
                  <div>
                    <div className="text-lg font-bold text-white leading-tight">{client.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone size={12} className="text-orange-500/50" />
                      <span className="text-xs text-gray-400 font-medium">{client.phone}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-black ${client.debt > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {client.debt > 0 ? `-${client.debt} ₴` : '0 ₴'}
                    </div>
                    <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Баланс</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'QUEUE' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl col-span-full">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="text-orange-500" size={16} />
                  <span className="text-xs font-black text-orange-500 uppercase tracking-widest">Поточна черга</span>
                </div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Зараз в очікуванні: {cars.filter(c => c.status === 'Очікує').length} авто</p>
              </div>

              <div className="space-y-3">
                {cars.filter(c => c.status === 'Очікує').map((car, index) => {
                  const client = getClientById(car.clientId);
                  return (
                    <div key={car.id} className="glass-card p-4 orange-outline flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-900 rounded-xl border border-orange-500/20 flex items-center justify-center text-orange-500 font-black">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-black text-white uppercase">{car.plate}</div>
                        <div className="text-xs text-gray-500 font-bold">{car.model}</div>
                        <div className="text-[10px] text-orange-500/50 font-black uppercase mt-1">{client?.name}</div>
                      </div>
                      <Button variant="outline" className="h-10 px-4 text-[10px]" onClick={() => setSelectedCarId(car.id)}>
                        Деталі
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'SCHEDULE' && (
            <div className="space-y-6">
              {/* ... existing schedule content ... */}
              <div className="glass-card p-6 orange-outline">
                <div className="flex items-center gap-2 mb-6">
                  <CalendarIcon className="text-orange-500" size={18} />
                  <span className="text-sm font-black text-white uppercase tracking-widest">Завантаженість СТО</span>
                </div>
                
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={scheduleData}>
                      <defs>
                        <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#4b5563" 
                        fontSize={10} 
                        fontWeight="bold"
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="#4b5563" 
                        fontSize={10} 
                        fontWeight="bold"
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #f9731633', borderRadius: '12px' }}
                        itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="visits" 
                        stroke="#f97316" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorVisits)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-4 orange-outline text-center">
                  <div className="text-2xl font-black text-orange-500">44</div>
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Візитів за тиждень</div>
                </div>
                <div className="glass-card p-4 orange-outline text-center">
                  <div className="text-2xl font-black text-green-500">85%</div>
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ефективність</div>
                </div>
              </div>
            </div>
          )}

          {tab === 'REQUESTS' && (
            <div className="space-y-4">
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="text-orange-500" size={16} />
                  <span className="text-xs font-black text-orange-500 uppercase tracking-widest">Публічні заявки</span>
                </div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Нових заявок: {publicRequests.filter(r => r.status === 'PENDING').length}</p>
              </div>

              <div className="space-y-3">
                {publicRequests.map((request) => (
                  <div key={request.id} className="glass-card p-4 orange-outline space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-black text-white uppercase">{request.name}</div>
                        <div className="text-xs text-orange-500 font-bold">{request.phone}</div>
                      </div>
                      <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${request.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>
                        {request.status}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-950 rounded-xl border border-gray-800">
                      <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Автомобіль та проблема</div>
                      <div className="text-xs text-gray-300 font-bold">{request.car}</div>
                      <div className="text-xs text-orange-500 font-black mt-1">{request.problem}</div>
                      <div className="text-[8px] text-gray-600 font-black uppercase mt-1">Терміновість: {request.urgency}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="primary" className="flex-1 h-10 text-[10px]" onClick={async () => {
                        try {
                          await updateDoc(doc(db, 'publicRequests', request.id), { status: 'ACCEPTED' });
                        } catch (err) {
                          handleFirestoreError(err, OperationType.UPDATE, `publicRequests/${request.id}`);
                        }
                      }}>
                        Прийняти
                      </Button>
                      <Button variant="secondary" className="h-10 px-4" onClick={async () => {
                        try {
                          await deleteDoc(doc(db, 'publicRequests', request.id));
                        } catch (err) {
                          handleFirestoreError(err, OperationType.DELETE, `publicRequests/${request.id}`);
                        }
                      }}>
                        <Trash size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
                {publicRequests.length === 0 && (
                  <div className="text-center py-10 text-gray-600 font-medium italic">Заявок немає</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const TasksScreen = () => {
    const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('OPEN');
    
    // Filter tasks based on role: Employees only see their own tasks
    const filteredTasks = tasks.filter(t => {
      const matchesFilter = filter === 'ALL' ? true : (filter === 'OPEN' ? t.status !== 'Закрита' : t.status === 'Закрита');
      
      if (currentUser?.role === 'ADMIN') return matchesFilter;
      
      // For employees, find the mechanic entry linked to their userId
      const mechanic = mechanics.find(m => m.userId === currentUser?.id);
      return matchesFilter && t.mechanicId === mechanic?.id;
    });

    return (
      <div className="flex flex-col h-full">
        <header className="bg-gray-900/80 backdrop-blur-md p-4 pt-8 border-b border-orange-500/20">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-black text-white">Всі задачі</h1>
            <button 
              onClick={async () => {
                await signOut(auth);
                setCurrentUser(null);
              }}
              className="p-2 bg-gray-800 text-orange-500 rounded-lg active:scale-90 transition-all border border-orange-500/20"
            >
              <LogOut size={20} />
            </button>
          </div>
          <div className="flex mt-4 p-1 bg-gray-950 rounded-xl gap-1 border border-orange-500/10">
            {(['ALL', 'OPEN', 'CLOSED'] as const).map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-orange-500 text-gray-950 shadow-lg' : 'text-gray-500'}`}
              >
                {f === 'ALL' ? 'Всі' : f === 'OPEN' ? 'Відкриті' : 'Закриті'}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-32 custom-scrollbar content-start">
          {filteredTasks.map(task => {
            const car = cars.find(c => c.id === task.carId);
            const mechanic = mechanics.find(m => m.id === task.mechanicId);
            return (
              <div 
                key={task.id} 
                onClick={() => setSelectedCarId(task.carId)}
                className="glass-card p-4 active:scale-95 transition-transform orange-outline"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="text-lg font-bold text-white leading-tight">{task.text}</div>
                    <div className="text-xs font-black text-orange-500 mt-1">
                      {getTaskTotalCost(task)} ₴
                      {task.cost && (task.cost < getTaskTotalCost(task)) && (
                        <span className="text-[8px] text-gray-500 ml-1 font-bold">(Робота: {task.cost} + Запчастини)</span>
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${
                    task.status === 'Нова' ? 'bg-gray-800 text-gray-400' :
                    task.status === 'В роботі' ? 'bg-orange-500/20 text-orange-500' :
                    task.status === 'Виконана' ? 'bg-green-500/20 text-green-500' : 'bg-gray-800 text-gray-500'
                  }`}>
                    {task.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                  <span className="bg-orange-500/10 px-2 py-0.5 rounded text-orange-500 font-bold border border-orange-500/20">{car?.plate}</span>
                  <span>•</span>
                  <span>{mechanic?.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const UsersScreen = () => {
    const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);

    const handleNewUser = async (e: React.FormEvent) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      const userId = Math.random().toString(36).substr(2, 9);
      const role = formData.get('role') as Role || 'EMPLOYEE';
      const name = formData.get('name') as string;

      const newUser: User = {
        id: userId,
        username: formData.get('username') as string,
        password: formData.get('password') as string,
        role,
        name,
      };

      try {
        await setDoc(doc(db, 'users', userId), newUser);
        
        // If it's an employee, also create a Mechanic entry
        if (role === 'EMPLOYEE') {
          const mechanicId = Math.random().toString(36).substr(2, 9);
          const newMechanic: Mechanic = {
            id: mechanicId,
            name,
            isBusy: false,
            userId: userId
          };
          await setDoc(doc(db, 'mechanics', mechanicId), newMechanic);
        }
        
        setIsNewUserModalOpen(false);
        alert('Працівника успішно додано до штату!');
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
      }
    };

    return (
      <div className="flex flex-col h-full">
        <header className="bg-gray-900/80 backdrop-blur-md p-4 pt-8 border-b border-orange-500/20 flex justify-between items-center">
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Працівники</h1>
          <div className="flex gap-2">
        <button 
          onClick={() => setIsNewUserModalOpen(true)}
          className="p-2 bg-orange-500 text-gray-950 rounded-lg active:scale-90 transition-all"
        >
          <Plus size={20} strokeWidth={3} />
        </button>
            <button 
              onClick={async () => {
                await signOut(auth);
                setCurrentUser(null);
              }}
              className="p-2 bg-gray-800 text-orange-500 rounded-lg active:scale-90 transition-all border border-orange-500/20"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-32 custom-scrollbar content-start">
          {users.map(user => (
            <div key={user.id} className="glass-card p-4 orange-outline flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-900 rounded-2xl border border-orange-500/20 flex items-center justify-center text-orange-500">
                  <UserIcon size={24} />
                </div>
                <div>
                  <div className="text-lg font-bold text-white leading-tight">{user.name}</div>
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">{user.role} • @{user.username}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest">Пароль</div>
                <div className="text-sm font-black text-white">{user.password}</div>
              </div>
            </div>
          ))}
        </div>

        <Modal isOpen={isNewUserModalOpen} onClose={() => setIsNewUserModalOpen(false)} title="Ввести в штат (Новий працівник)">
          <form onSubmit={handleNewUser} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-2">ПІБ Працівника</label>
              <input name="name" placeholder="Іван Іванов" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-black text-white placeholder:text-gray-700 focus:ring-2 focus:ring-orange-500 outline-none" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-2">Логін</label>
                <input name="username" placeholder="ivan_i" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white placeholder:text-gray-700 focus:ring-2 focus:ring-orange-500 outline-none" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-2">Пароль</label>
                <input name="password" placeholder="123456" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white placeholder:text-gray-700 focus:ring-2 focus:ring-orange-500 outline-none" required />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-2">Роль</label>
              <select name="role" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white focus:ring-2 focus:ring-orange-500 outline-none">
                <option value="EMPLOYEE">Слесар (Тільки свої задачі)</option>
                <option value="ADMIN">Адміністратор (Повний доступ)</option>
              </select>
            </div>
            <Button fullWidth type="submit">Прийняти на роботу</Button>
          </form>
        </Modal>
      </div>
    );
  };
  const WarehouseScreen = () => {
    const [tab, setTab] = useState<'STOCK' | 'NEEDS' | 'HISTORY'>('STOCK');
    const [search, setSearch] = useState('');

    const filteredInventory = inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                           item.category.toLowerCase().includes(search.toLowerCase());
      if (item.type === 'ONE_TIME' && item.quantity <= 0) return false;
      return matchesSearch;
    });

    const itemsInNeed = inventory.filter(item => item.quantity < item.minStock && !(item.type === 'ONE_TIME' && item.quantity <= 0));

    return (
      <div className="flex flex-col h-full">
        <header className="bg-gray-900/80 backdrop-blur-md p-4 pt-8 border-b border-orange-500/20">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-black text-white">Склад</h1>
            {currentUser?.role === 'ADMIN' && (
              <button 
                onClick={() => setIsNewInventoryItemModalOpen(true)}
                className="p-2 bg-orange-500 text-gray-950 rounded-lg active:scale-90 transition-all"
              >
                <Plus size={20} strokeWidth={3} />
              </button>
            )}
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500/50" size={18} />
            <input 
              type="text" 
              placeholder="Пошук запчастин..." 
              className="w-full bg-gray-900 border border-orange-500/20 rounded-xl py-3 pl-10 pr-4 font-medium text-white placeholder:text-gray-600 focus:ring-2 focus:ring-orange-500 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex p-1 bg-gray-950 rounded-xl gap-1 border border-orange-500/10">
            {(['STOCK', 'NEEDS', 'HISTORY'] as const).map(t => (
              <button 
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all relative ${tab === t ? 'bg-orange-500 text-gray-950 shadow-lg' : 'text-gray-500'}`}
              >
                {t === 'STOCK' ? 'Наявність' : t === 'NEEDS' ? 'Потреби' : 'Історія'}
                {t === 'NEEDS' && itemsInNeed.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] border border-gray-950">
                    {itemsInNeed.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-32 custom-scrollbar content-start">
          {tab === 'STOCK' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredInventory.map(item => (
                <div key={item.id} className="glass-card p-4 orange-outline flex justify-between items-center">
                  <div className="flex-1">
                    <div className="text-lg font-bold text-white leading-tight">{item.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest">{item.category}</span>
                      <span className="text-gray-700">•</span>
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Мін: {item.minStock} {item.unit}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-xl font-black ${item.quantity < item.minStock ? 'text-red-500' : 'text-orange-500'}`}>
                        {item.quantity} <span className="text-xs font-medium opacity-50">{item.unit}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => { setSelectedInventoryItem(item); setTransactionType('INCOME'); setIsTransactionModalOpen(true); }}
                        className="p-1.5 bg-green-500/20 text-green-500 rounded-md border border-green-500/30 active:scale-90 transition-all"
                      >
                        <Plus size={14} strokeWidth={3} />
                      </button>
                      <button 
                        onClick={() => { setSelectedInventoryItem(item); setTransactionType('EXPENSE'); setIsTransactionModalOpen(true); }}
                        className="p-1.5 bg-red-500/20 text-red-500 rounded-md border border-red-500/30 active:scale-90 transition-all"
                      >
                        <X size={14} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'NEEDS' && (
            <div className="space-y-3">
              {itemsInNeed.length === 0 ? (
                <div className="text-center py-20 text-gray-600 italic">Всі запчастини в достатній кількості</div>
              ) : (
                itemsInNeed.map(item => (
                  <div key={item.id} className="glass-card p-4 border-l-4 border-l-red-500 orange-outline flex justify-between items-center">
                    <div>
                      <div className="text-lg font-bold text-white">{item.name}</div>
                      <div className="text-xs text-red-500/70 font-bold">Дефіцит: {item.minStock - item.quantity} {item.unit}</div>
                    </div>
                    <Button variant="outline" className="h-10 px-4 text-xs" onClick={() => { setSelectedInventoryItem(item); setTransactionType('INCOME'); setIsTransactionModalOpen(true); }}>
                      Замовити
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'HISTORY' && (
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <div className="text-center py-20 text-gray-600 italic">Історія транзакцій порожня</div>
              ) : (
                transactions.map(tr => {
                  const item = inventory.find(i => i.id === tr.itemId);
                  const task = tr.taskId ? tasks.find(t => t.id === tr.taskId) : null;
                  const car = task ? cars.find(c => c.id === task.carId) : null;
                  
                  return (
                    <div key={tr.id} className="glass-card p-3 orange-outline flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tr.type === 'INCOME' ? 'bg-green-500/20 text-green-500' : 
                        tr.type === 'EXPENSE' ? 'bg-red-500/20 text-red-500' : 'bg-gray-800 text-gray-400'
                      }`}>
                        {tr.type === 'INCOME' ? <Plus size={20} /> : tr.type === 'EXPENSE' ? <X size={20} /> : <Trash size={20} />}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-white">{item?.name}</div>
                        <div className="text-[10px] text-gray-500 uppercase font-black">
                          {new Date(tr.date).toLocaleDateString()} • {tr.notes || (tr.type === 'INCOME' ? 'Прихід' : 'Витрата')}
                        </div>
                        {car && task && (
                          <div className="text-[9px] text-orange-500/70 font-black uppercase tracking-tighter mt-0.5">
                            Авто: {car.plate} ({car.brand}) • {task.text}
                          </div>
                        )}
                      </div>
                      <div className={`text-sm font-black ${tr.type === 'INCOME' ? 'text-green-500' : 'text-red-500'}`}>
                        {tr.type === 'INCOME' ? '+' : '-'}{tr.quantity} {item?.unit}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- Detail Views ---

  const ClientDetail = ({ id, onClose }: { id: string, onClose: () => void }) => {
    const client = clients.find(c => c.id === id);
    const clientCars = cars.filter(c => c.clientId === id);
    const [tab, setTab] = useState<'CARS' | 'HISTORY'>('CARS');

    if (!client) return null;

    const clientTasks = tasks.filter(t => t.clientId === id && t.status !== 'Закрита');
    const debt = clientTasks.reduce((sum, t) => sum + getTaskTotalCost(t), 0);
    const clientHistory = tasks.filter(t => t.clientId === id && t.status === 'Закрита');

    return (
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="fixed inset-0 md:left-auto md:w-full md:max-w-2xl z-40 bg-gray-950 flex flex-col shadow-2xl md:border-l md:border-orange-500/20"
      >
        <header className="bg-gray-900/80 backdrop-blur-md p-4 pt-8 border-b border-orange-500/20 flex items-center gap-4">
          <button onClick={onClose} className="p-2 bg-gray-900 border border-orange-500/20 rounded-full text-orange-500"><ChevronLeft size={24} /></button>
          <div className="flex-1">
            <h1 className="text-xl font-black text-white">{client.name}</h1>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-400">{client.phone}</p>
              <span className="text-gray-700">•</span>
              <span className={`text-sm font-black ${debt > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {debt > 0 ? `Борг: ${debt} ₴` : 'Оплачено'}
              </span>
            </div>
          </div>
          <a href={`tel:${client.phone}`} className="p-3 bg-orange-500 text-gray-950 rounded-full active:scale-90 transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)]">
            <Phone size={24} />
          </a>
        </header>

        <div className="p-4 flex-1 overflow-y-auto space-y-4 pb-32 custom-scrollbar">
          <div className="flex gap-2">
            <button 
              onClick={() => setTab('CARS')}
              className={`px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest transition-all ${tab === 'CARS' ? 'bg-orange-500 text-gray-950 shadow-lg' : 'bg-gray-900 text-gray-500 border border-orange-500/10'}`}
            >
              Авто
            </button>
            <button 
              onClick={() => setTab('HISTORY')}
              className={`px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest transition-all ${tab === 'HISTORY' ? 'bg-orange-500 text-gray-950 shadow-lg' : 'bg-gray-900 text-gray-500 border border-orange-500/10'}`}
            >
              Історія
            </button>
          </div>

          {tab === 'CARS' ? (
            <div className="space-y-3">
              {clientCars.map(car => (
                <div 
                  key={car.id} 
                  onClick={() => setSelectedCarId(car.id)}
                  className="glass-card p-4 flex justify-between items-center orange-outline active:scale-95 transition-transform"
                >
                  <div>
                    <div className="text-lg font-black text-white">{car.plate}</div>
                    <div className="text-sm text-gray-400">{car.brand} {car.model} ({car.year})</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${car.status === 'В роботі' ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500'}`}>
                    {car.status}
                  </div>
                </div>
              ))}
              {clientCars.length === 0 && (
                <div className="text-center py-10 text-gray-600 italic">Немає доданих автомобілів</div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {clientHistory.map(task => {
                const car = cars.find(c => c.id === task.carId);
                return (
                  <div key={task.id} className="glass-card p-4 orange-outline space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="text-sm font-black text-white">{new Date(task.receptionDate).toLocaleDateString()}</div>
                      <div className="text-xs text-orange-500 font-black uppercase">{car?.plate}</div>
                    </div>
                    <div className="text-sm text-gray-300">{task.text}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Виконано: {task.completionDate ? new Date(task.completionDate).toLocaleDateString() : '---'}</div>
                  </div>
                );
              })}
              {clientHistory.length === 0 && (
                <div className="text-center py-10 text-gray-600 italic">Історія звернень порожня</div>
              )}
            </div>
          )}
        </div>

        {tab === 'CARS' && (
          <button 
            onClick={() => setIsNewCarModalOpen(true)}
            className="absolute bottom-6 right-6 w-16 h-16 bg-orange-500 text-gray-950 rounded-full shadow-[0_0_30px_rgba(249,115,22,0.5)] flex items-center justify-center active:scale-90 transition-all z-20"
          >
            <Plus size={32} strokeWidth={3} />
          </button>
        )}
      </motion.div>
    );
  };

  const CarDetail = ({ id, onClose }: { id: string, onClose: () => void }) => {
    const car = cars.find(c => c.id === id);
    const client = clients.find(c => c.id === car?.clientId);
    const carTasks = tasks.filter(t => t.carId === id);

    if (!car || !client) return null;

    const updateCarStatus = async (nextStatus: CarStatus) => {
      try {
        await updateDoc(doc(db, 'cars', id), { status: nextStatus });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `cars/${id}`);
      }
    };

    const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
      try {
        const updateData: any = { status: newStatus };
        if (newStatus === 'Закрита') {
          updateData.completionDate = new Date().toISOString();
        }
        await updateDoc(doc(db, 'tasks', taskId), updateData);

        // If task is 'В роботі', ensure car is also 'В роботі'
        if (newStatus === 'В роботі' && car.status === 'Очікує') {
          await updateDoc(doc(db, 'cars', id), { status: 'В роботі' });
        }

        // If all tasks are 'Виконана' or 'Закрита', set car to 'Готово'
        const otherTasks = carTasks.filter(t => t.id !== taskId);
        const allDone = [newStatus, ...otherTasks.map(t => t.status)].every(s => s === 'Виконана' || s === 'Закрита');
        if (allDone && car.status === 'В роботі') {
          await updateDoc(doc(db, 'cars', id), { status: 'Готово' });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `tasks/${taskId}`);
      }
    };

    return (
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="fixed inset-0 md:left-auto md:w-full md:max-w-2xl z-40 bg-gray-950 flex flex-col shadow-2xl md:border-l md:border-orange-500/20"
      >
        <header className="bg-gray-900/80 backdrop-blur-md p-4 pt-8 border-b border-orange-500/20 flex items-center gap-4">
          <button onClick={onClose} className="p-2 bg-gray-900 border border-orange-500/20 rounded-full text-orange-500"><ChevronLeft size={24} /></button>
          <div className="flex-1">
            <h1 className="text-xl font-black text-white">{car.plate}</h1>
            <p className="text-sm text-gray-400">{car.brand} {car.model} ({car.year})</p>
          </div>
          <div className="flex gap-2">
            <a href={`tel:${client.phone}`} className="p-2 bg-gray-900 border border-orange-500/20 text-orange-500 rounded-full"><Phone size={20} /></a>
          </div>
        </header>

        <div className="p-4 flex-1 overflow-y-auto space-y-4 pb-40 custom-scrollbar">
          <div className="glass-card p-4 orange-outline space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Власник:</span>
              <span className="text-sm font-black text-white">{client.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">VIN:</span>
              <span className="text-xs font-mono text-orange-500">{car.vin || '---'}</span>
            </div>
            <div className="pt-2 border-t border-gray-800">
              <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest mb-2 block">Статус авто в Ангарі:</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Відстійник', 'Очікує', 'В роботі', 'Готово', 'Видано'] as CarStatus[]).map(s => (
                  <button 
                    key={s}
                    onClick={() => updateCarStatus(s)}
                    className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all border ${car.status === s ? 'bg-orange-500 text-gray-950 border-orange-500 shadow-lg' : 'bg-gray-900 text-gray-500 border-gray-800'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center px-2">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Задачі</h3>
            <div className="flex gap-3">
              {car.status === 'Відстійник' && (
                <button 
                  onClick={() => {
                    setTabState('SCHEDULE');
                    setIsNewRequestModalOpen(true);
                    // We'll pre-fill the form using a ref or just let the user type the plate
                    // But for now, just opening the modal is a start.
                  }} 
                  className="text-orange-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1"
                >
                  <CalendarIcon size={14} /> Запланувати
                </button>
              )}
              {currentUser?.role === 'ADMIN' && (
                <button onClick={() => setIsNewTaskModalOpen(true)} className="text-orange-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                  <Plus size={14} /> Створити задачу
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {carTasks.map(task => {
              const mechanic = mechanics.find(m => m.id === task.mechanicId);
              // Workers only see their own tasks in the list OR Admin sees all
              if (currentUser?.role === 'EMPLOYEE' && task.mechanicId !== mechanics.find(m => m.userId === currentUser.id)?.id) {
                return null;
              }

              return (
                <div key={task.id} className="glass-card p-4 orange-outline">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="font-bold text-white text-sm">{task.text}</div>
                      <div className="text-xs font-black text-orange-500 mt-1">
                        {getTaskTotalCost(task)} ₴
                        {task.cost && (task.cost < getTaskTotalCost(task)) && (
                          <span className="text-[8px] text-gray-500 ml-1 font-bold">(Робота: {task.cost} + Запчастини)</span>
                        )}
                      </div>
                    </div>
                    <select 
                      value={task.status}
                      onChange={(e) => updateTaskStatus(task.id, e.target.value as TaskStatus)}
                      className={`text-[10px] font-black rounded-md border-none ring-1 ring-orange-500/20 py-1 px-2 bg-gray-900 ${
                        task.status === 'Нова' ? 'text-gray-400' :
                        task.status === 'В роботі' ? 'text-orange-500' :
                        task.status === 'Виконана' ? 'text-green-500' : 'text-gray-500'
                      }`}
                    >
                      <option value="Нова">Нова</option>
                      <option value="В роботі">В роботі</option>
                      <option value="Виконана">Виконана</option>
                      {currentUser?.role === 'ADMIN' && <option value="Закрита">Закрита</option>}
                    </select>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-[10px] text-gray-500 font-bold uppercase">Майстер: {mechanic?.name}</div>
                    <div className="text-[10px] text-gray-600 font-bold">{new Date(task.receptionDate).toLocaleDateString()}</div>
                  </div>
                </div>
              );
            })}
            {carTasks.length === 0 && (
              <div className="text-center py-10 text-gray-600 italic text-sm">Задач поки немає</div>
            )}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900 border-t border-orange-500/20">
          <Button fullWidth onClick={() => setIsNewTaskModalOpen(true)}>
            <Plus size={20} /> Створити задачу
          </Button>
        </div>
      </motion.div>
    );
  };

  // --- Modals Logic ---

  const handleNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    
    console.log("Saving request with data:", Object.fromEntries(formData.entries()));
    console.log("Current tabState:", tabState);

    // Use tabState directly for status determination
    const status = tabState === 'SCHEDULE' ? 'SCHEDULE' : (tabState === 'HANGAR' ? 'Очікує' : 'Відстійник');
    
    const plate = formData.get('plate') as string;
    const model = formData.get('model') as string;
    const carIdFromForm = formData.get('carId') as string;
    const appointmentDate = formData.get('appointmentDate') as string;
    const appointmentTime = formData.get('appointmentTime') as string;

    let clientId = formData.get('clientId') as string;

    try {
      if (isNewClientQuick) {
        const clientName = formData.get('clientName') as string;
        const clientPhone = formData.get('clientPhone') as string;
        
        if (!clientName || !clientPhone) {
          showToast("Будь ласка, вкажіть ім'я та телефон клієнта", 'error');
          setIsSaving(false);
          return;
        }

        const newClientId = Math.random().toString(36).substr(2, 9);
        const newClient: Client = {
          id: newClientId,
          name: clientName,
          phone: clientPhone,
          debt: 0,
          notes: 'Створено через швидкий запис'
        };
        await setDoc(doc(db, 'clients', newClientId), newClient);
        clientId = newClientId;
      }

      if (!clientId) {
        showToast("Будь ласка, виберіть або створіть клієнта", 'error');
        setIsSaving(false);
        return;
      }

      if (status === 'SCHEDULE') {
        const appointmentId = Math.random().toString(36).substr(2, 9);
        const dateToSave = appointmentDate || new Date().toISOString().split('T')[0];
        const newAppointment: Appointment = {
          id: appointmentId,
          clientId,
          carId: carIdFromForm || undefined,
          carPlate: plate,
          carModel: model,
          date: dateToSave,
          time: appointmentTime || "10:00",
          status: 'SCHEDULED'
        };
        await setDoc(doc(db, 'appointments', appointmentId), newAppointment);
        setSelectedDate(dateToSave);
        setActiveScreen('SCHEDULE');
        showToast(`Запис збережено на ${dateToSave}`);
      } else {
        // If carIdFromForm exists, update the existing car's status
        if (carIdFromForm) {
          await updateDoc(doc(db, 'cars', carIdFromForm), { 
            status: status as CarStatus,
            plate,
            model
          });
          showToast("Статус авто оновлено");
        } else {
          const carId = Math.random().toString(36).substr(2, 9);
          const newCar: Car = {
            id: carId,
            plate,
            clientId,
            brand: '',
            model,
            year: '',
            status: status as CarStatus
          };
          await setDoc(doc(db, 'cars', carId), newCar);
          showToast("Авто додано в чергу");
        }
        setActiveScreen('HANGAR');
      }
      
      setIsNewRequestModalOpen(false);
      setIsNewClientQuick(false);
      setTabState('HANGAR');
      form.reset();
    } catch (err) {
      showToast("Помилка при збереженні", 'error');
      handleFirestoreError(err, OperationType.WRITE, 'quick_request');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const id = Math.random().toString(36).substr(2, 9);
    const newClient: Client = {
      id,
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      debt: 0,
      notes: formData.get('notes') as string,
    };
    try {
      await setDoc(doc(db, 'clients', id), newClient);
      setIsNewClientModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `clients/${id}`);
    }
  };

    const handleNewTask = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedCarId) return;
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      const id = Math.random().toString(36).substr(2, 9);
      const newTask: Task = {
        id,
        carId: selectedCarId,
        clientId: cars.find(c => c.id === selectedCarId)?.clientId || '',
        text: formData.get('text') as string,
        status: 'Нова',
        mechanicId: formData.get('mechanicId') as string,
        receptionDate: new Date().toISOString(),
        parts: []
      };
      try {
        await setDoc(doc(db, 'tasks', id), newTask);
        setIsNewTaskModalOpen(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `tasks/${id}`);
      }
    };

    const handleNewInventoryItem = async (e: React.FormEvent) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      const id = Math.random().toString(36).substr(2, 9);
      const newItem: InventoryItem = {
        id,
        name: formData.get('name') as string,
        category: formData.get('category') as string,
        unit: formData.get('unit') as string,
        quantity: Number(formData.get('quantity')) || 0,
        minStock: Number(formData.get('minStock')) || 0,
        type: 'REGULAR'
      };
      try {
        await setDoc(doc(db, 'inventory', id), newItem);
        setIsNewInventoryItemModalOpen(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `inventory/${id}`);
      }
    };

  const handleInventoryTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInventoryItem) return;
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const qty = Number(formData.get('quantity')) || 0;
    
    const id = Math.random().toString(36).substr(2, 9);
    const newTransaction: Transaction = {
      id,
      itemId: selectedInventoryItem.id,
      type: transactionType,
      quantity: qty,
      price: Number(formData.get('price')) || 0,
      date: new Date().toISOString(),
      notes: formData.get('notes') as string,
    };

    try {
      await setDoc(doc(db, 'transactions', id), newTransaction);
      let newQty = selectedInventoryItem.quantity;
      if (transactionType === 'INCOME') newQty += qty;
      else newQty -= qty;
      await updateDoc(doc(db, 'inventory', selectedInventoryItem.id), { quantity: newQty });
      setIsTransactionModalOpen(false);
      setSelectedInventoryItem(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `transactions/${id}`);
    }
  };

  if (!currentUser) {
    if (activeScreen === 'PUBLIC') return <PublicScreen />;
    return <LoginScreen />;
  }

  const navItems = [
    { id: 'HANGAR', label: 'Ангар', icon: Home, roles: ['ADMIN', 'EMPLOYEE'] },
    { id: 'SCHEDULE', label: 'Графік', icon: CalendarIcon, roles: ['ADMIN', 'EMPLOYEE'] },
    { id: 'TASKS', label: 'Задачі', icon: CheckSquare, roles: ['ADMIN', 'EMPLOYEE'] },
    { id: 'WAREHOUSE', label: 'Склад', icon: Package, roles: ['ADMIN', 'EMPLOYEE'] },
    { id: 'MORE', label: 'Більше', icon: Plus, roles: ['ADMIN', 'EMPLOYEE'] },
  ].filter(item => item.roles.includes(currentUser.role));

  const moreScreens = ['CLIENTS', 'USERS', 'PROFILE', 'MORE'];
  const isMoreActive = moreScreens.includes(activeScreen);

  const MoreMenu = () => (
    <div className="flex-1 bg-gray-950 p-6 overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Меню</h2>
        <div className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full">
          <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{currentUser.role}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {currentUser.role === 'ADMIN' && (
          <>
            <button 
              onClick={() => setActiveScreen('CLIENTS')}
              className="glass-card p-6 flex flex-col items-center gap-3 hover:bg-orange-500/10 transition-all border-orange-500/20 group"
            >
              <div className="p-4 bg-gray-800 rounded-2xl group-hover:scale-110 transition-transform">
                <Users size={32} className="text-orange-500" />
              </div>
              <span className="font-bold text-sm text-gray-300">Клієнти</span>
            </button>
            <button 
              onClick={() => setActiveScreen('USERS')}
              className="glass-card p-6 flex flex-col items-center gap-3 hover:bg-orange-500/10 transition-all border-orange-500/20 group"
            >
              <div className="p-4 bg-gray-800 rounded-2xl group-hover:scale-110 transition-transform">
                <Lock size={32} className="text-orange-500" />
              </div>
              <span className="font-bold text-sm text-gray-300">Доступ та штат</span>
            </button>
          </>
        )}
        <button 
          onClick={() => setActiveScreen('PROFILE')}
          className="glass-card p-6 flex flex-col items-center gap-3 hover:bg-orange-500/10 transition-all border-orange-500/20 group"
        >
          <div className="p-4 bg-gray-800 rounded-2xl group-hover:scale-110 transition-transform">
            <UserIcon size={32} className="text-orange-500" />
          </div>
          <span className="font-bold text-sm text-gray-300">Профіль</span>
        </button>
      </div>
      
      <div className="mt-12 space-y-4">
        <div className="p-4 bg-gray-900/50 border border-white/5 rounded-2xl">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-gray-950 font-black">
              {currentUser.name[0]}
            </div>
            <div>
              <p className="font-bold text-white leading-none">{currentUser.name}</p>
              <p className="text-xs text-gray-500 mt-1">{currentUser.username}</p>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => signOut(auth)}
          className="w-full p-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <LogOut size={20} /> Вийти з системи
        </button>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="h-screen w-full bg-gray-950 flex flex-col items-center justify-center font-sans text-gray-100 overflow-hidden p-0 md:p-4">
        <div className="h-full w-full max-w-md md:max-w-4xl lg:max-w-6xl xl:max-w-7xl bg-gray-950 flex flex-col relative overflow-hidden shadow-2xl md:rounded-3xl border border-orange-500/10">
          
          {/* Main Content */}
          <div className="flex-1 overflow-hidden relative">
            {activeScreen === 'HANGAR' && <HangarScreen />}
            {activeScreen === 'SCHEDULE' && <ScheduleScreen />}
            {activeScreen === 'CLIENTS' && <ClientsScreen />}
            {activeScreen === 'TASKS' && <TasksScreen />}
            {activeScreen === 'WAREHOUSE' && <WarehouseScreen />}
            {activeScreen === 'USERS' && <UsersScreen />}
            {activeScreen === 'PROFILE' && <ProfileScreen />}
            {activeScreen === 'MORE' && <MoreMenu />}
            {activeScreen === 'PUBLIC' && <PublicScreen />}

            {/* Toast Notification */}
            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50 }}
                  className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-[100] font-black uppercase tracking-widest text-xs flex items-center gap-3 ${
                    toast.type === 'success' ? 'bg-orange-500 text-gray-950' : 'bg-red-500 text-white'
                  }`}
                >
                  {toast.type === 'success' ? <Check size={16} /> : <Info size={16} />}
                  {toast.message}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Unified Floating Action Buttons */}
            {currentUser?.role === 'ADMIN' && (
              <>
                {(activeScreen === 'HANGAR' || activeScreen === 'SCHEDULE' || activeScreen === 'TASKS') && (
                  <button 
                    onClick={() => {
                      if (activeScreen === 'TASKS') {
                        setSelectedCarId(null);
                        setIsNewTaskModalOpen(true);
                      } else {
                        setSelectedCarId(null);
                        setIsNewRequestModalOpen(true);
                      }
                    }}
                    className="absolute bottom-6 right-6 w-16 h-16 bg-orange-500 text-gray-950 rounded-full shadow-[0_0_30px_rgba(249,115,22,0.6)] flex items-center justify-center active:scale-90 transition-all z-40 hover:scale-105"
                  >
                    <Plus size={32} strokeWidth={3} />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Detail Views */}
          <AnimatePresence>
            {selectedCarId && (
              <CarDetail id={selectedCarId} onClose={() => setSelectedCarId(null)} />
            )}
            {selectedClientId && (
              <ClientDetail id={selectedClientId} onClose={() => setSelectedClientId(null)} />
            )}
          </AnimatePresence>

          {/* Bottom Nav */}
          <nav className="h-[75px] bg-gray-900/90 backdrop-blur-xl flex items-center justify-center border-t border-orange-500/10 z-30 pb-safe">
            <div className="w-full max-w-2xl flex items-center justify-around px-2">
              {navItems.map((item) => {
                const isActive = item.id === 'MORE' ? isMoreActive : activeScreen === item.id;
                return (
                  <button 
                    key={item.id}
                    onClick={() => setActiveScreen(item.id as ScreenType)}
                    className="flex flex-col items-center justify-center gap-1 flex-1 transition-all"
                  >
                    <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-orange-500 text-gray-950 shadow-[0_0_20px_rgba(249,115,22,0.4)]' : 'text-gray-500'}`}>
                      <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-tighter ${isActive ? 'text-orange-500' : 'text-gray-600'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Modals */}
      <Modal isOpen={isNewCarModalOpen} onClose={() => setIsNewCarModalOpen(false)} title="Додати автомобіль">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const id = Math.random().toString(36).substr(2, 9);
          const newCar: Car = {
            id,
            brand: formData.get('brand') as string,
            model: formData.get('model') as string,
            year: formData.get('year') as string,
            plate: formData.get('plate') as string,
            vin: formData.get('vin') as string,
            clientId: selectedClientId || (formData.get('clientId') as string),
            status: 'Очікує'
          };
          try {
            await setDoc(doc(db, 'cars', id), newCar);
            setIsNewCarModalOpen(false);
            // Suggest moving to hangar or creating task
            if (confirm('Авто додано. Створити задачу для цього авто?')) {
              setSelectedCarId(id);
              setIsNewTaskModalOpen(true);
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `cars/${id}`);
          }
        }} className="space-y-4">
          {!selectedClientId && (
            <div>
              <label className="block text-[10px] font-black text-orange-500/50 uppercase tracking-widest mb-1">Клієнт</label>
              <select name="clientId" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white focus:ring-2 focus:ring-orange-500 outline-none" required>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <input name="brand" placeholder="Марка" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-orange-500" required />
            <input name="model" placeholder="Модель" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-orange-500" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input name="year" placeholder="Рік" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-orange-500" required />
            <input name="plate" placeholder="Держномер" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-orange-500 uppercase" required />
          </div>
          <input name="vin" placeholder="VIN код" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-orange-500 uppercase" />
          <Button fullWidth type="submit">Зберегти авто</Button>
        </form>
      </Modal>

      <Modal isOpen={isNewRequestModalOpen} onClose={() => { setIsNewRequestModalOpen(false); setIsNewClientQuick(false); setTabState('HANGAR'); }} title="Швидкий запис">
        <form onSubmit={handleNewRequest} className="space-y-4">
          <input type="hidden" name="carId" value={selectedCarId || ''} />
          
          {/* Client Selection */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest">Клієнт</label>
              <button 
                type="button"
                onClick={() => setIsNewClientQuick(!isNewClientQuick)}
                className="text-[10px] font-black text-orange-500 uppercase tracking-widest hover:underline"
              >
                {isNewClientQuick ? 'Вибрати існуючого' : '+ Новий клієнт'}
              </button>
            </div>
            
            {isNewClientQuick ? (
              <div className="grid grid-cols-2 gap-3">
                <input name="clientName" placeholder="Ім'я" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-orange-500" required />
                <input name="clientPhone" placeholder="Телефон" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-orange-500" required />
              </div>
            ) : (
              <select name="clientId" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white focus:ring-2 focus:ring-orange-500 outline-none" required>
                <option value="">Виберіть клієнта</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
              </select>
            )}
          </div>

          {/* Car Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-orange-500/50 uppercase tracking-widest mb-1">Держномер</label>
              <input 
                name="plate" 
                placeholder="AA0000BB" 
                defaultValue={selectedCarId ? cars.find(c => c.id === selectedCarId)?.plate : ''}
                className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-orange-500 uppercase" 
                required 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-orange-500/50 uppercase tracking-widest mb-1">Модель</label>
              <input 
                name="model" 
                placeholder="BMW X5" 
                defaultValue={selectedCarId ? cars.find(c => c.id === selectedCarId)?.model : ''}
                className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-orange-500" 
                required 
              />
            </div>
          </div>

          {/* Action Selector */}
          <div className="flex p-1 bg-gray-950 rounded-xl border border-orange-500/10 mb-4">
            <button 
              type="button"
              onClick={() => setTabState('HANGAR')}
              className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tabState === 'HANGAR' ? 'bg-orange-500 text-gray-950 shadow-lg' : 'text-gray-500'}`}
            >
              В Ангар
            </button>
            <button 
              type="button"
              onClick={() => setTabState('PARKING')}
              className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tabState === 'PARKING' ? 'bg-orange-500 text-gray-950 shadow-lg' : 'text-gray-500'}`}
            >
              В Відстійник
            </button>
            <button 
              type="button"
              onClick={() => setTabState('SCHEDULE')}
              className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tabState === 'SCHEDULE' ? 'bg-orange-500 text-gray-950 shadow-lg' : 'text-gray-500'}`}
            >
              В Графік
            </button>
          </div>

          <div id="appointment-fields" className="space-y-4 p-4 bg-gray-900 rounded-2xl border border-orange-500/10" style={{ display: tabState === 'SCHEDULE' ? 'block' : 'none' }}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-orange-500/50 uppercase tracking-widest mb-1">Дата</label>
                <input name="appointmentDate" type="date" className="w-full p-4 bg-gray-950 border border-orange-500/20 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-orange-500" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-orange-500/50 uppercase tracking-widest mb-1">Час</label>
                <input name="appointmentTime" type="time" className="w-full p-4 bg-gray-950 border border-orange-500/20 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-orange-500" defaultValue="10:00" />
              </div>
            </div>
          </div>

          <Button fullWidth type="submit" disabled={isSaving}>
            {isSaving ? 'Збереження...' : 'Зберегти запис'}
          </Button>
        </form>
      </Modal>

      <Modal isOpen={isNewClientModalOpen} onClose={() => setIsNewClientModalOpen(false)} title="Новий клієнт">
        <form onSubmit={handleNewClient} className="space-y-4">
          <input name="name" placeholder="ПІБ" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-black text-white placeholder:text-gray-700 focus:ring-2 focus:ring-orange-500 outline-none" required />
          <input name="phone" placeholder="+380..." className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white placeholder:text-gray-700 focus:ring-2 focus:ring-orange-500 outline-none" required />
          <input name="email" type="email" placeholder="Email (опціонально)" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white placeholder:text-gray-700 focus:ring-2 focus:ring-orange-500 outline-none" />
          <textarea name="notes" placeholder="Примітки" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white placeholder:text-gray-700 focus:ring-2 focus:ring-orange-500 outline-none h-24" />
          <Button fullWidth type="submit">Зберегти клієнта</Button>
        </form>
      </Modal>

      <Modal isOpen={isNewTaskModalOpen} onClose={() => setIsNewTaskModalOpen(false)} title="Нова задача">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const id = Math.random().toString(36).substr(2, 9);
          const carId = selectedCarId || (formData.get('carId') as string);
          const car = cars.find(c => c.id === carId);
          
          let clientId = car?.clientId || '';
          
          // Fix race condition: if car not in local state, fetch from Firestore
          if (!clientId && carId) {
            try {
              const carDoc = await getDoc(doc(db, 'cars', carId));
              if (carDoc.exists()) {
                clientId = carDoc.data().clientId;
              }
            } catch (err) {
              console.error("Error fetching car for clientId:", err);
            }
          }

          const newTask: Task = {
            id,
            carId,
            clientId,
            text: formData.get('text') as string,
            status: 'Нова',
            mechanicId: formData.get('mechanicId') as string,
            cost: Number(formData.get('cost')) || 0,
            receptionDate: new Date().toISOString(),
            parts: []
          };
          try {
            await setDoc(doc(db, 'tasks', id), newTask);
            // Auto-update car status to 'В роботі' if it's currently 'Очікує'
            if (car && car.status === 'Очікує') {
              await updateDoc(doc(db, 'cars', carId), { status: 'В роботі' });
            }
            setIsNewTaskModalOpen(false);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `tasks/${id}`);
          }
        }} className="space-y-4">
          {!selectedCarId && (
            <div>
              <label className="block text-[10px] font-black text-orange-500/50 uppercase tracking-widest mb-1">Автомобіль</label>
              <select name="carId" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-orange-500" required>
                {cars.map(c => <option key={c.id} value={c.id}>{c.plate} ({c.brand} {c.model})</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-orange-500/50 uppercase tracking-widest mb-1">Майстер</label>
              <select name="mechanicId" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white focus:ring-2 focus:ring-orange-500" required>
                {mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-orange-500/50 uppercase tracking-widest mb-1">Вартість робіт (₴)</label>
              <input name="cost" type="number" placeholder="0" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
          </div>
          <textarea name="text" placeholder="Опис робіт..." className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white placeholder:text-gray-700 focus:ring-2 focus:ring-orange-500 outline-none h-32" required />
          <Button fullWidth type="submit">Створити задачу</Button>
        </form>
      </Modal>

      <Modal 
        isOpen={isNewInventoryItemModalOpen} 
        onClose={() => setIsNewInventoryItemModalOpen(false)} 
        title="Нова запчастина"
      >
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const id = Math.random().toString(36).substr(2, 9);
          const newItem: InventoryItem = {
            id,
            name: formData.get('name') as string,
            category: formData.get('category') as string,
            quantity: Number(formData.get('quantity')) || 0,
            minStock: Number(formData.get('minStock')) || 0,
            unit: formData.get('unit') as string,
            type: formData.get('type') as 'REGULAR' | 'ONE_TIME'
          };
          try {
            await setDoc(doc(db, 'inventory', id), newItem);
            setIsNewInventoryItemModalOpen(false);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `inventory/${id}`);
          }
        }} className="space-y-4">
          <input name="name" placeholder="Назва запчастини" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-black text-white placeholder:text-gray-700 focus:ring-2 focus:ring-orange-500 outline-none" required />
          <div className="grid grid-cols-2 gap-4">
            <input name="category" placeholder="Категорія" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white placeholder:text-gray-700 focus:ring-2 focus:ring-orange-500 outline-none" required />
            <select name="type" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-orange-500">
              <option value="REGULAR">Звичайна</option>
              <option value="ONE_TIME">Разова</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-2 mb-1 block">Початкова к-сть</label>
              <input name="quantity" type="number" placeholder="0" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white placeholder:text-gray-700 focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-2 mb-1 block">Од. виміру</label>
              <input name="unit" placeholder="шт, л..." className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white placeholder:text-gray-700 focus:ring-2 focus:ring-orange-500 outline-none" required />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-2 mb-1 block">Мін. залишок</label>
            <input name="minStock" type="number" placeholder="0" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white placeholder:text-gray-700 focus:ring-2 focus:ring-orange-500 outline-none" />
          </div>
          <Button fullWidth type="submit">Додати на склад</Button>
        </form>
      </Modal>

      <Modal 
        isOpen={isTransactionModalOpen} 
        onClose={() => { setIsTransactionModalOpen(false); setSelectedInventoryItem(null); }} 
        title={transactionType === 'INCOME' ? 'Прихід товару' : transactionType === 'EXPENSE' ? 'Видача товару' : 'Списання товару'}
      >
        <div className="mb-6 p-4 bg-gray-950 rounded-2xl border border-orange-500/10">
          <div className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest mb-1">Товар</div>
          <div className="text-xl font-black text-white">{selectedInventoryItem?.name}</div>
          <div className="text-xs text-gray-500 mt-1">Поточний залишок: {selectedInventoryItem?.quantity} {selectedInventoryItem?.unit}</div>
        </div>

        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!selectedInventoryItem) return;
          const formData = new FormData(e.currentTarget);
          const qty = Number(formData.get('quantity')) || 0;
          
          const id = Math.random().toString(36).substr(2, 9);
          const newTransaction: Transaction = {
            id,
            itemId: selectedInventoryItem.id,
            type: transactionType as 'INCOME' | 'EXPENSE' | 'WRITE_OFF',
            quantity: qty,
            price: Number(formData.get('price')) || 0,
            date: new Date().toISOString(),
            taskId: formData.get('taskId') as string || undefined,
            notes: formData.get('notes') as string,
          };

          try {
            await setDoc(doc(db, 'transactions', id), newTransaction);
            let newQty = selectedInventoryItem.quantity;
            if (transactionType === 'INCOME') newQty += qty;
            else newQty -= qty;
            await updateDoc(doc(db, 'inventory', selectedInventoryItem.id), { quantity: newQty });
            setIsTransactionModalOpen(false);
            setSelectedInventoryItem(null);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `transactions/${id}`);
          }
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-2 mb-1 block">Кількість ({selectedInventoryItem?.unit})</label>
              <input name="quantity" type="number" step="0.01" placeholder="0.00" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-black text-white placeholder:text-gray-700 focus:ring-2 focus:ring-orange-500 outline-none text-2xl" required />
            </div>
            <div>
              <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-widest ml-2 mb-1 block">Ціна (грн)</label>
              <input name="price" type="number" step="0.01" placeholder="0.00" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-black text-white placeholder:text-gray-700 focus:ring-2 focus:ring-orange-500 outline-none text-2xl" />
            </div>
          </div>
          {transactionType === 'EXPENSE' && (
            <div>
              <label className="block text-[10px] font-black text-orange-500/50 uppercase tracking-widest mb-1">Задача (опціонально)</label>
              <select name="taskId" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-orange-500">
                <option value="">Не вказано</option>
                {tasks.filter(t => t.status !== 'Закрита').map(t => {
                  const car = cars.find(c => c.id === t.carId);
                  return <option key={t.id} value={t.id}>{car?.plate} - {t.text}</option>;
                })}
              </select>
            </div>
          )}
          <textarea name="notes" placeholder="Коментар (постачальник, номер накладної...)" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-bold text-white placeholder:text-gray-700 focus:ring-2 focus:ring-orange-500 outline-none h-24" />
          <Button fullWidth type="submit">
            {transactionType === 'INCOME' ? 'Прийняти на склад' : transactionType === 'EXPENSE' ? 'Провести видачу' : 'Списати'}
          </Button>
        </form>
      </Modal>

      <Modal isOpen={isNewMechanicModalOpen} onClose={() => setIsNewMechanicModalOpen(false)} title="Новий слюсар">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const id = Math.random().toString(36).substr(2, 9);
          const newMechanic: Mechanic = {
            id,
            name: formData.get('name') as string,
            isBusy: false
          };
          try {
            await setDoc(doc(db, 'mechanics', id), newMechanic);
            setIsNewMechanicModalOpen(false);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `mechanics/${id}`);
          }
        }} className="space-y-4">
          <input name="name" placeholder="ПІБ слюсаря" className="w-full p-4 bg-gray-900 border border-orange-500/20 rounded-xl font-black text-white outline-none focus:ring-2 focus:ring-orange-500" required />
          <Button fullWidth type="submit">Додати в штат</Button>
        </form>
      </Modal>

      </div>
    </ErrorBoundary>
  );
}
