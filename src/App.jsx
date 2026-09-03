import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Calendar as CalendarIcon, FileText, Users, 
  School, PlusCircle, ListTodo, Search, Clock, CheckCircle, 
  XCircle, AlertCircle, ChevronLeft, ChevronRight, Bell, Menu, X,
  Briefcase, ArrowRight, Activity
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc
} from 'firebase/firestore';

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDVVUeWh0xTzXj4aZvorUT8-XSZgXth2GQ",
  authDomain: "azvasa.firebaseapp.com",
  projectId: "azvasa",
  storageBucket: "azvasa.firebasestorage.app",
  messagingSenderId: "538057161382",
  appId: "1:538057161382:web:db66f52570648e619d5267",
  measurementId: "G-FG6M22869C"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = firebaseConfig.appId;
// --- UTILITY FUNCTIONS ---
const generateId = () => crypto.randomUUID();

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Premium Status Colors
const getStatusColor = (status) => {
  switch (status) {
    case 'Planned': return 'bg-blue-50 text-blue-700 border-blue-200/60';
    case 'Completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
    case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-200/60';
    case 'Cancelled': return 'bg-slate-50 text-slate-700 border-slate-200/60';
    case 'Rescheduled': return 'bg-purple-50 text-purple-700 border-purple-200/60';
    default: return 'bg-gray-50 text-gray-700 border-gray-200/60';
  }
};

const getReportStatusColor = (status) => {
  switch (status) {
    case 'Not Required': return 'bg-slate-50 text-slate-600 border-slate-200/60';
    case 'REPORT DUE': return 'bg-orange-50 text-orange-700 border-orange-200/60';
    case 'REPORT SUBMITTED': return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
    case 'OVERDUE': return 'bg-rose-50 text-rose-700 border-rose-200/60';
    default: return 'bg-gray-50 text-gray-700 border-gray-200/60';
  }
};

// --- MAIN APPLICATION COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Data States
  const [schools, setSchools] = useState([]);
  const [managers, setManagers] = useState([]);
  const [visits, setVisits] = useState([]);

  // --- AUTHENTICATION ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- DATA FETCHING (FIRESTORE) ---
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const schoolsRef = collection(db, 'artifacts', appId, 'public', 'data', 'azvasa_schools');
    const managersRef = collection(db, 'artifacts', appId, 'public', 'data', 'azvasa_managers');
    const visitsRef = collection(db, 'artifacts', appId, 'public', 'data', 'azvasa_visits');

    const unsubSchools = onSnapshot(schoolsRef, (snapshot) => {
      setSchools(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, console.error);

    const unsubManagers = onSnapshot(managersRef, (snapshot) => {
      setManagers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, console.error);

    const unsubVisits = onSnapshot(visitsRef, (snapshot) => {
      setVisits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => {
      unsubSchools();
      unsubManagers();
      unsubVisits();
    };
  }, [user]);

  // --- AUTO-STATUS ENGINE ---
  useEffect(() => {
    if (!user || visits.length === 0) return;

    const checkOverdueReports = () => {
      const now = new Date();
      visits.forEach(visit => {
        if (visit.reportStatus === 'REPORT DUE' && visit.reportDueDate) {
          const dueDate = new Date(visit.reportDueDate);
          if (now > dueDate) {
            const visitRef = doc(db, 'artifacts', appId, 'public', 'data', 'azvasa_visits', visit.id);
            updateDoc(visitRef, { reportStatus: 'OVERDUE' }).catch(console.error);
          }
        }
      });
    };

    checkOverdueReports();
    const interval = setInterval(checkOverdueReports, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [visits, user]);


  // --- DB OPERATIONS ---
  const handleAddSchool = async (schoolData) => {
    if (!user) return;
    const id = generateId();
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'azvasa_schools', id), {
      ...schoolData, createdAt: new Date().toISOString()
    });
  };

  const handleAddManager = async (managerData) => {
    if (!user) return;
    const id = generateId();
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'azvasa_managers', id), {
      ...managerData, createdAt: new Date().toISOString()
    });
  };

  const handleDeleteItem = async (collectionName, id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, id));
  };

  const handleAddVisit = async (visitData) => {
    if (!user) return;
    const id = generateId();
    
    const currentMaxId = visits.reduce((max, v) => {
      if (!v.displayId) return max;
      const num = parseInt(v.displayId.replace('AZV-', ''));
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    const nextDisplayId = `AZV-${String(currentMaxId + 1).padStart(4, '0')}`;

    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'azvasa_visits', id), {
      ...visitData,
      displayId: nextDisplayId,
      status: 'Planned',
      reportStatus: 'Not Required',
      createdAt: new Date().toISOString()
    });
    setCurrentView('Visit Tracker');
  };

  const handleCompleteVisit = async (visitId) => {
    if (!user) return;
    const now = new Date();
    const dueDate = new Date(now.getTime() + (24 * 60 * 60 * 1000)); 
    
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'azvasa_visits', visitId), {
      status: 'Completed',
      completionDate: now.toISOString(),
      reportDueDate: dueDate.toISOString(),
      reportStatus: 'REPORT DUE'
    });
  };

  const handleUpdateVisitStatus = async (visitId, newStatus) => {
    if (!user) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'azvasa_visits', visitId), {
      status: newStatus
    });
  };

  const handleSubmitReport = async (visitId, reportData) => {
    if (!user) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'azvasa_visits', visitId), {
      reportStatus: 'REPORT SUBMITTED',
      reportSubmittedDate: new Date().toISOString(),
      reportDetails: reportData
    });
  };


  // --- UI COMPONENTS ---

  const SidebarItem = ({ icon: Icon, label }) => (
    <button
      onClick={() => { setCurrentView(label); setIsSidebarOpen(false); }}
      className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative ${
        currentView === label 
          ? 'bg-indigo-600/10 text-indigo-400 font-semibold' 
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
      }`}
    >
      {currentView === label && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-indigo-500 rounded-r-full" />
      )}
      <Icon size={20} className={currentView === label ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'} />
      <span>{label}</span>
    </button>
  );

  const EmptyState = ({ title, message, icon: Icon }) => (
    <div className="flex flex-col items-center justify-center p-16 bg-white rounded-3xl border border-gray-100 shadow-[0_2px_20px_-8px_rgba(0,0,0,0.05)] text-center h-[400px]">
      <div className="w-20 h-20 bg-indigo-50/50 rounded-2xl flex items-center justify-center mb-6 text-indigo-500 shadow-inner">
        <Icon size={36} strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2 tracking-tight">{title}</h3>
      <p className="text-gray-500 max-w-sm leading-relaxed">{message}</p>
    </div>
  );

  // --- VIEWS ---

  const DashboardView = () => {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);

    const stats = useMemo(() => {
      let scheduled = 0, completed = 0, upcoming = 0, pending = 0, cancelled = 0;
      let reportsSub = 0, reportsDue = 0, overdue = 0;
      let todaysVisits = 0, thisMonthsVisits = 0;

      visits.forEach(v => {
        if (v.status === 'Planned') scheduled++;
        if (v.status === 'Completed') completed++;
        if (v.status === 'Pending') pending++;
        if (v.status === 'Cancelled') cancelled++;
        
        if (v.date >= today && v.status !== 'Completed' && v.status !== 'Cancelled') upcoming++;
        if (v.date === today) todaysVisits++;
        if (v.date?.startsWith(thisMonth)) thisMonthsVisits++;

        if (v.reportStatus === 'REPORT SUBMITTED') reportsSub++;
        if (v.reportStatus === 'REPORT DUE') reportsDue++;
        if (v.reportStatus === 'OVERDUE') overdue++;
      });

      return { scheduled, completed, upcoming, pending, cancelled, reportsSub, reportsDue, overdue, todaysVisits, thisMonthsVisits };
    }, [visits, today, thisMonth]);

    const StatCard = ({ title, value, icon: Icon, colorClass, bgClass }) => (
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.1)] transition-all duration-300 group flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-500 mb-1">{title}</p>
          <h4 className="text-4xl font-bold text-gray-900 tracking-tight">{value}</h4>
        </div>
        <div className={`p-4 rounded-2xl ${bgClass} ${colorClass} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
          <Icon size={28} strokeWidth={2} />
        </div>
      </div>
    );

    const todaysVisitsList = visits.filter(v => v.date === today);
    const attentionReports = visits.filter(v => v.reportStatus === 'REPORT DUE' || v.reportStatus === 'OVERDUE');

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h2>
            <p className="text-gray-500 mt-1">Here's what's happening with your school visits today.</p>
          </div>
        </div>
        
        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Visits (This Month)" value={stats.thisMonthsVisits} icon={Activity} colorClass="text-indigo-600" bgClass="bg-indigo-50" />
          <StatCard title="Completed Visits" value={stats.completed} icon={CheckCircle} colorClass="text-emerald-600" bgClass="bg-emerald-50" />
          <StatCard title="Reports Due" value={stats.reportsDue} icon={FileText} colorClass="text-orange-600" bgClass="bg-orange-50" />
          <StatCard title="Overdue Reports" value={stats.overdue} icon={AlertCircle} colorClass="text-rose-600" bgClass="bg-rose-50" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Today's Visits */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Clock className="mr-2 text-indigo-500" size={20}/> Today's Schedule
              </h3>
              <span className="bg-indigo-50 text-indigo-700 text-xs px-3 py-1.5 rounded-full font-bold tracking-wide">{todaysVisitsList.length} Scheduled</span>
            </div>
            <div className="flex-1 bg-gray-50/30">
              {todaysVisitsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                  <CalendarIcon size={32} className="text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">No Visits Scheduled Today</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {todaysVisitsList.map(v => {
                    const school = schools.find(s => s.id === v.schoolId);
                    const manager = managers.find(m => m.id === v.managerId);
                    return (
                      <li key={v.id} className="p-6 hover:bg-white transition-colors cursor-default group">
                        <div className="flex justify-between items-center">
                          <div className="flex items-start space-x-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                              {school?.name?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{school?.name || 'Unknown School'}</p>
                              <p className="text-sm text-gray-500 flex items-center mt-0.5">
                                <Briefcase size={14} className="mr-1.5 text-gray-400" /> {manager?.name || 'Unknown Manager'}
                              </p>
                            </div>
                          </div>
                          <span className={`px-3 py-1.5 rounded-full text-[11px] uppercase tracking-wider font-bold border ${getStatusColor(v.status)}`}>
                            {v.status}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Reports Requiring Attention */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-orange-50/50 to-rose-50/50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <AlertCircle className="mr-2 text-rose-500" size={20}/> Action Required
              </h3>
            </div>
            <div className="flex-1 bg-gray-50/30">
              {attentionReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                  <CheckCircle size={32} className="text-emerald-300 mb-3" />
                  <p className="text-gray-500 font-medium">All caught up! No reports pending.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {attentionReports.map(v => {
                    const school = schools.find(s => s.id === v.schoolId);
                    return (
                      <li key={v.id} className="p-6 hover:bg-white transition-colors cursor-default group">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{v.displayId}</span>
                              <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{school?.name || 'Unknown'}</p>
                            </div>
                            <p className="text-sm text-gray-500 flex items-center">
                               <Clock size={14} className="mr-1.5 text-gray-400" /> Completed: {formatDate(v.completionDate)}
                            </p>
                          </div>
                          <span className={`px-3 py-1.5 rounded-full text-[11px] uppercase tracking-wider font-bold border ${getReportStatusColor(v.reportStatus)}`}>
                            {v.reportStatus}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CalendarView = () => {
    const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 1)); 

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const jumpToToday = () => setCurrentDate(new Date());

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)]">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{monthNames[month]} <span className="text-indigo-600">{year}</span></h2>
          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            <button onClick={prevMonth} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-600"><ChevronLeft size={20}/></button>
            <button onClick={jumpToToday} className="px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 font-semibold text-gray-700 transition-all">Today</button>
            <button onClick={nextMonth} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-600"><ChevronRight size={20}/></button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-50/80 border-b border-gray-100">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="p-4 text-center text-xs font-bold uppercase tracking-wider text-gray-500">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-fr">
            {days.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="p-2 border-r border-b border-gray-50 min-h-[140px] bg-gray-50/30"></div>;
              
              const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayVisits = visits.filter(v => v.date === dateString);
              const isToday = new Date().toISOString().split('T')[0] === dateString;

              return (
                <div key={day} className={`p-3 border-r border-b border-gray-50 min-h-[140px] transition-colors group ${isToday ? 'bg-indigo-50/20' : 'hover:bg-gray-50/50'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full transition-all ${isToday ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 group-hover:bg-gray-200 group-hover:text-gray-900'}`}>
                      {day}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {dayVisits.map(v => {
                      const school = schools.find(s => s.id === v.schoolId);
                      return (
                        <div key={v.id} className={`text-[11px] font-semibold px-2 py-1.5 rounded-lg border truncate transition-transform hover:scale-[1.02] cursor-pointer ${getStatusColor(v.status)}`} title={`${school?.name} - ${v.status}`}>
                          {school?.name || 'School'}
                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const AddVisitView = () => {
    const [formData, setFormData] = useState({
      schoolId: '', newSchoolName: '', managerId: '', date: '', city: '', purpose: '', time: '', notes: ''
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      let finalSchoolId = formData.schoolId;

      if (formData.schoolId === 'new' && formData.newSchoolName) {
        const newId = generateId();
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'azvasa_schools', newId), {
          name: formData.newSchoolName, city: formData.city, createdAt: new Date().toISOString()
        });
        finalSchoolId = newId;
      }

      if (!finalSchoolId || !formData.managerId || !formData.date) {
        alert("Please fill all required fields.");
        return;
      }

      await handleAddVisit({
        schoolId: finalSchoolId,
        managerId: formData.managerId,
        date: formData.date,
        city: formData.city,
        purpose: formData.purpose,
        time: formData.time,
        notes: formData.notes
      });
    };

    return (
      <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-100 bg-gradient-to-br from-indigo-50/50 to-white">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
               <PlusCircle size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Schedule School Visit</h2>
            <p className="text-gray-500 text-sm mt-1">Plan and record a new visit for your Success Management team.</p>
          </div>
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            <div className="space-y-5">
              <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center">
                 <span className="w-6 h-[1px] bg-indigo-200 mr-3"></span> Required Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">School Name <span className="text-rose-500">*</span></label>
                  <select 
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none"
                    value={formData.schoolId}
                    onChange={(e) => setFormData({...formData, schoolId: e.target.value})}
                    required
                  >
                    <option value="" className="text-gray-400">Select a School...</option>
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    <option value="new" className="font-bold text-indigo-600">+ Add New School</option>
                  </select>
                </div>

                {formData.schoolId === 'new' && (
                  <div className="md:col-span-2 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-semibold text-indigo-900 mb-2">New School Name <span className="text-rose-500">*</span></label>
                    <input 
                      type="text" 
                      className="w-full p-3.5 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                      value={formData.newSchoolName}
                      onChange={(e) => setFormData({...formData, newSchoolName: e.target.value})}
                      required={formData.schoolId === 'new'}
                      placeholder="Enter school name to add to master list"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Responsible Success Manager <span className="text-rose-500">*</span></label>
                  <select 
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none"
                    value={formData.managerId}
                    onChange={(e) => setFormData({...formData, managerId: e.target.value})}
                    required
                  >
                    <option value="">Select Manager...</option>
                    {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Visit Date <span className="text-rose-500">*</span></label>
                  <input 
                    type="date" 
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-5 pt-8 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
                 <span className="w-6 h-[1px] bg-gray-200 mr-3"></span> Optional Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">City / Location</label>
                  <input type="text" className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} placeholder="e.g., Bangalore"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Meeting Time</label>
                  <input type="time" className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Visit Purpose</label>
                  <input type="text" className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" placeholder="e.g., Annual Review, Training Session"
                    value={formData.purpose} onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                  <textarea className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none" rows="3" placeholder="Any additional context..."
                    value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 active:translate-y-0 flex justify-center items-center">
                 Schedule Visit <ArrowRight className="ml-2" size={20} />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const VisitTrackerView = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    const filteredVisits = visits.filter(v => {
      const school = schools.find(s => s.id === v.schoolId)?.name?.toLowerCase() || '';
      const manager = managers.find(m => m.id === v.managerId)?.name?.toLowerCase() || '';
      const matchesSearch = school.includes(searchTerm.toLowerCase()) || manager.includes(searchTerm.toLowerCase()) || v.displayId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'All' || v.status === filterStatus;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (visits.length === 0) return <EmptyState title="No Visits Scheduled Yet" message="Start by scheduling a school visit. They will all be tracked here." icon={ListTodo} />;

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)]">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">School Visit Tracker</h2>
            <p className="text-gray-500 text-sm mt-1">Manage and update all scheduled visits.</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" placeholder="Search ID, School, Manager..." 
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-gray-700 shadow-sm outline-none cursor-pointer"
              value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Planned">Planned</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-4">Visit ID</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">School Name</th>
                  <th className="px-6 py-4">Manager</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Report Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredVisits.map(v => {
                  const school = schools.find(s => s.id === v.schoolId);
                  const manager = managers.find(m => m.id === v.managerId);
                  return (
                    <tr key={v.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-6 py-4 font-mono font-bold text-indigo-600/80">{v.displayId}</td>
                      <td className="px-6 py-4 text-gray-600 font-medium whitespace-nowrap">{formatDate(v.date)}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">{school?.name || '-'}</td>
                      <td className="px-6 py-4 text-gray-600">{manager?.name || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide border ${getStatusColor(v.status)}`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide border ${getReportStatusColor(v.reportStatus)}`}>
                          {v.reportStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        {v.status !== 'Completed' && (
                          <button 
                            onClick={() => handleCompleteVisit(v.id)}
                            className="inline-flex items-center px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold border border-emerald-200 transition-all hover:shadow-sm"
                          >
                            <CheckCircle size={14} className="mr-1.5" /> Mark Complete
                          </button>
                        )}
                        {v.status !== 'Completed' && v.status !== 'Cancelled' && (
                          <button 
                            onClick={() => handleUpdateVisitStatus(v.id, 'Cancelled')}
                            className="inline-flex items-center p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Cancel Visit"
                          >
                            <XCircle size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredVisits.length === 0 && (
              <div className="p-12 text-center text-gray-500 bg-gray-50/50">
                 No visits match your current search or filter.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const ReportsView = () => {
    const [activeTab, setActiveTab] = useState('ALL');
    const [selectedVisitForReport, setSelectedVisitForReport] = useState(null);

    const tabs = [
      { id: 'ALL', label: 'All Reports' },
      { id: 'REPORT DUE', label: 'Reports Due' },
      { id: 'OVERDUE', label: 'Overdue Reports' },
      { id: 'REPORT SUBMITTED', label: 'Submitted Reports' }
    ];

    const completedVisits = visits.filter(v => v.status === 'Completed').sort((a, b) => new Date(b.completionDate) - new Date(a.completionDate));
    const filteredReports = activeTab === 'ALL' 
      ? completedVisits 
      : completedVisits.filter(v => v.reportStatus === activeTab);

    const ReportModal = () => {
      const v = selectedVisitForReport;
      if (!v) return null;
      const school = schools.find(s => s.id === v.schoolId);
      const manager = managers.find(m => m.id === v.managerId);

      const [rData, setRData] = useState({
        peopleMet: '', discussionSummary: '', keyPoints: '', issues: '', actions: '', feedback: '',
        followUpRequired: 'No', followUpAction: '', followUpDate: '', overallOutcome: '', remarks: ''
      });

      return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-8 max-h-[90vh] flex flex-col overflow-hidden transform transition-all">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mr-4">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">Submit Visit Report</h3>
                  <p className="text-sm text-gray-500 font-medium mt-0.5">{v.displayId} • <span className="text-indigo-600">{school?.name}</span></p>
                </div>
              </div>
              <button onClick={() => setSelectedVisitForReport(null)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"><X size={24}/></button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 bg-slate-50/50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-sm">
                <div><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Date</p> <p className="font-semibold text-gray-900">{formatDate(v.date)}</p></div>
                <div><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Manager</p> <p className="font-semibold text-gray-900 truncate">{manager?.name}</p></div>
                <div><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Completed On</p> <p className="font-semibold text-gray-900">{formatDate(v.completionDate)}</p></div>
                <div><p className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">Deadline</p> <p className="font-bold text-rose-600">{formatDate(v.reportDueDate)}</p></div>
              </div>

              <div className="space-y-8">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h4 className="font-bold text-gray-900 flex items-center mb-5"><span className="w-2 h-6 bg-indigo-500 rounded-full mr-3"></span> Visit Details</h4>
                  <div className="space-y-5">
                    <div><label className="block text-sm font-semibold mb-2 text-gray-700">People Met</label>
                    <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all" value={rData.peopleMet} onChange={e=>setRData({...rData, peopleMet: e.target.value})} placeholder="Names and designations..." /></div>
                    <div><label className="block text-sm font-semibold mb-2 text-gray-700">Discussion Summary</label>
                    <textarea className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all resize-none" rows="3" value={rData.discussionSummary} onChange={e=>setRData({...rData, discussionSummary: e.target.value})} /></div>
                    <div><label className="block text-sm font-semibold mb-2 text-gray-700">Issues Identified</label>
                    <textarea className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all resize-none" rows="2" value={rData.issues} onChange={e=>setRData({...rData, issues: e.target.value})} /></div>
                    <div><label className="block text-sm font-semibold mb-2 text-gray-700">Actions Taken</label>
                    <textarea className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all resize-none" rows="2" value={rData.actions} onChange={e=>setRData({...rData, actions: e.target.value})} /></div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h4 className="font-bold text-gray-900 flex items-center mb-5"><span className="w-2 h-6 bg-amber-400 rounded-full mr-3"></span> Follow-up Requirements</h4>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">Follow-up Required?</label>
                      <select className="p-3 w-48 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" value={rData.followUpRequired} onChange={e=>setRData({...rData, followUpRequired: e.target.value})}>
                        <option>No</option><option>Yes</option>
                      </select>
                    </div>
                    {rData.followUpRequired === 'Yes' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-amber-50/50 rounded-xl border border-amber-100">
                         <div><label className="block text-sm font-semibold mb-2 text-gray-700">Action</label>
                         <input className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400" value={rData.followUpAction} onChange={e=>setRData({...rData, followUpAction: e.target.value})} /></div>
                         <div><label className="block text-sm font-semibold mb-2 text-gray-700">Date</label>
                         <input type="date" className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400" value={rData.followUpDate} onChange={e=>setRData({...rData, followUpDate: e.target.value})} /></div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h4 className="font-bold text-gray-900 flex items-center mb-5"><span className="w-2 h-6 bg-emerald-400 rounded-full mr-3"></span> Conclusion</h4>
                  <div className="space-y-5">
                    <div><label className="block text-sm font-semibold mb-2 text-gray-700">Overall Outcome</label>
                    <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all" value={rData.overallOutcome} onChange={e=>setRData({...rData, overallOutcome: e.target.value})} /></div>
                    <div><label className="block text-sm font-semibold mb-2 text-gray-700">Remarks</label>
                    <textarea className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all resize-none" rows="2" value={rData.remarks} onChange={e=>setRData({...rData, remarks: e.target.value})} /></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-white flex justify-end space-x-4 rounded-b-3xl">
              <button onClick={() => setSelectedVisitForReport(null)} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-bold transition-all">Cancel</button>
              <button 
                onClick={async () => {
                  await handleSubmitReport(v.id, rData);
                  setSelectedVisitForReport(null);
                }} 
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 font-bold flex items-center transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)]"
              >
                <CheckCircle size={18} className="mr-2" /> Submit Final Report
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (completedVisits.length === 0) return <EmptyState title="No Reports Available" message="Reports become available here automatically after a visit is marked as Completed." icon={FileText} />;

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Visit Reports</h2>
            <p className="text-gray-500 mt-1">Review, submit, and track all post-visit documentation.</p>
          </div>
        </div>
        
        {/* Modern Tabs */}
        <div className="flex space-x-2 bg-gray-200/50 p-1.5 rounded-2xl w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
                activeTab === tab.id 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] overflow-hidden mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-4">Visit Date</th>
                  <th className="px-6 py-4">School Name</th>
                  <th className="px-6 py-4">Manager</th>
                  <th className="px-6 py-4">Report Deadline</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredReports.map(v => {
                  const school = schools.find(s => s.id === v.schoolId);
                  const manager = managers.find(m => m.id === v.managerId);
                  const needsReport = v.reportStatus === 'REPORT DUE' || v.reportStatus === 'OVERDUE';
                  return (
                    <tr key={v.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-6 py-5 text-gray-600 font-medium">{formatDate(v.date)}</td>
                      <td className="px-6 py-5 font-bold text-gray-900">{school?.name || '-'}</td>
                      <td className="px-6 py-5 text-gray-600">{manager?.name || '-'}</td>
                      <td className={`px-6 py-5 font-semibold ${v.reportStatus === 'OVERDUE' ? 'text-rose-600' : 'text-gray-600'}`}>{formatDate(v.reportDueDate)}</td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide border ${getReportStatusColor(v.reportStatus)}`}>
                          {v.reportStatus}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        {needsReport ? (
                          <button 
                            onClick={() => setSelectedVisitForReport(v)}
                            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold transition-all shadow-[0_4px_10px_0_rgba(79,70,229,0.3)] hover:-translate-y-0.5"
                          >
                             Submit Report
                          </button>
                        ) : v.reportStatus === 'REPORT SUBMITTED' ? (
                          <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-3 py-1.5 rounded-full">✓ Submitted {formatDate(v.reportSubmittedDate)}</span>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredReports.length === 0 && (
              <div className="p-16 text-center">
                 <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4"><Search className="text-gray-300" size={24}/></div>
                 <p className="text-gray-500 font-medium">No records found for the selected tab.</p>
              </div>
            )}
          </div>
        </div>
        <ReportModal />
      </div>
    );
  };

  const SchoolListView = () => {
    const [name, setName] = useState('');
    const [city, setCity] = useState('');

    const onSubmit = (e) => {
      e.preventDefault();
      if (name.trim()) {
        handleAddSchool({ name: name.trim(), city: city.trim() });
        setName(''); setCity('');
      }
    };

    return (
      <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
        <div>
           <h2 className="text-3xl font-bold text-gray-900 tracking-tight">School Master List</h2>
           <p className="text-gray-500 mt-1">Manage the directory of all schools.</p>
        </div>
        
        <form onSubmit={onSubmit} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row gap-5 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-2">School Name <span className="text-rose-500">*</span></label>
            <input required type="text" className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all" value={name} onChange={e => setName(e.target.value)} placeholder="Enter school name" />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-2">City / Location</label>
            <input type="text" className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g., Mumbai" />
          </div>
          <button type="submit" className="w-full sm:w-auto bg-slate-900 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-all hover:shadow-lg active:scale-95 flex items-center justify-center">
            <PlusCircle size={18} className="mr-2" /> Add School
          </button>
        </form>

        {schools.length === 0 ? <EmptyState title="No Schools Added Yet" message="Add your first school above to start populating your directory." icon={School} /> : (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-500"><th className="px-6 py-4">School Name</th><th className="px-6 py-4">Location</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {schools.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-gray-900 flex items-center"><div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mr-3 font-bold">{s.name.charAt(0)}</div>{s.name}</td>
                    <td className="px-6 py-4 text-gray-500 font-medium">{s.city || '-'}</td>
                    <td className="px-6 py-4 text-right"><button onClick={() => handleDeleteItem('azvasa_schools', s.id)} className="text-gray-400 hover:text-rose-600 font-bold text-xs bg-gray-50 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100">Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const ManagerListView = () => {
    const [name, setName] = useState('');

    const onSubmit = (e) => {
      e.preventDefault();
      if (name.trim()) {
        handleAddManager({ name: name.trim() });
        setName('');
      }
    };

    return (
      <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
        <div>
           <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Success Manager List</h2>
           <p className="text-gray-500 mt-1">Manage your team of Success Managers.</p>
        </div>
        
        <form onSubmit={onSubmit} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row gap-5 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Success Manager Name <span className="text-rose-500">*</span></label>
            <input required type="text" className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" />
          </div>
          <button type="submit" className="w-full sm:w-auto bg-slate-900 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-all hover:shadow-lg active:scale-95 flex items-center justify-center">
            <PlusCircle size={18} className="mr-2" /> Add Manager
          </button>
        </form>

        {managers.length === 0 ? <EmptyState title="No Success Managers" message="Add your team members above to assign them to visits." icon={Users} /> : (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-500"><th className="px-6 py-4">Name</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {managers.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-gray-900 flex items-center"><div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mr-3 font-bold">{m.name.charAt(0)}</div>{m.name}</td>
                    <td className="px-6 py-4 text-right"><button onClick={() => handleDeleteItem('azvasa_managers', m.id)} className="text-gray-400 hover:text-rose-600 font-bold text-xs bg-gray-50 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100">Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };


  // --- MAIN RENDER ---
  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans"><div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div><div className="text-indigo-900 font-bold text-lg tracking-wide">Loading AZVASA System...</div></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans text-slate-900 selection:bg-indigo-100">
      {/* HEADER - Glassy Light Theme */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 max-w-[1600px] mx-auto">
          <div className="flex items-center">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mr-4 lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
              <Menu size={24} />
            </button>
            <div className="flex items-center space-x-3 cursor-pointer select-none">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-lg shadow-indigo-200">A</div>
              <h1 className="text-2xl font-black tracking-tighter text-slate-900 hidden sm:block">AZVASA</h1>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex text-sm font-semibold text-gray-500 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <button className="text-gray-400 hover:text-indigo-600 transition-colors relative bg-gray-50 p-2 rounded-full border border-gray-100 hover:bg-indigo-50">
              <Bell size={20} />
              {visits.some(v => v.reportStatus === 'OVERDUE') && <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>}
            </button>
            <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
               <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-sm font-bold text-white shadow-md">SM</div>
               <div className="hidden sm:block">
                  <p className="text-sm font-bold text-gray-900 leading-none mb-1">Senior Manager</p>
                  <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider leading-none">Admin</p>
               </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden max-w-[1600px] mx-auto w-full">
        {/* SIDEBAR - Premium Dark Theme */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
        )}
        <aside className={`fixed lg:static inset-y-0 left-0 w-[280px] bg-[#0B1120] border-r border-slate-800/50 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl lg:shadow-none lg:my-6 lg:ml-6 lg:rounded-3xl overflow-hidden`}>
          <div className="p-4 lg:hidden flex justify-end"><button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-xl"><X size={20}/></button></div>
          <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-4">Overview</div>
            <SidebarItem icon={LayoutDashboard} label="Dashboard" />
            <SidebarItem icon={CalendarIcon} label="Visit Calendar" />
            
            <div className="mt-8 mb-4 px-4 pt-4 border-t border-slate-800/50">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Operations</div>
            </div>
            <SidebarItem icon={PlusCircle} label="Add Visit" />
            <SidebarItem icon={ListTodo} label="Visit Tracker" />
            <SidebarItem icon={FileText} label="Reports" />
            
            <div className="mt-8 mb-4 px-4 pt-4 border-t border-slate-800/50">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Master Data</div>
            </div>
            <SidebarItem icon={School} label="School List" />
            <SidebarItem icon={Users} label="Success Manager List" />
          </nav>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 w-full">
          <div className="max-w-6xl mx-auto pb-24">
            {currentView === 'Dashboard' && <DashboardView />}
            {currentView === 'Visit Calendar' && <CalendarView />}
            {currentView === 'Add Visit' && <AddVisitView />}
            {currentView === 'Visit Tracker' && <VisitTrackerView />}
            {currentView === 'Reports' && <ReportsView />}
            {currentView === 'School List' && <SchoolListView />}
            {currentView === 'Success Manager List' && <ManagerListView />}
          </div>
        </main>
      </div>

      {/* FOOTER */}
      <footer className="bg-transparent py-6 mt-auto border-t border-gray-200/60 w-full relative z-10">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm font-medium text-gray-400">
          © AZVASA – School Visit Calendar & Visit Report Tracker | Developed By <span className="text-gray-600 font-bold">Rakesh V</span>
        </div>
      </footer>
    </div>
  );
}