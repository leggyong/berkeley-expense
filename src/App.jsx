import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, RefreshCw, LogOut, CheckCircle, ChevronRight, Lock, MapPin 
} from 'lucide-react';

/*
 * BERKELEY INTERNATIONAL EXPENSE MANAGEMENT SYSTEM
 * Version: 4.0 - FINAL STABLE FIX (Smart Sync Client)
 */
const SUPABASE_URL = 'https://wlhoyjsicvkncfjbexoi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsaG95anNpY3ZrbmNmamJleG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNzIyMzcsImV4cCI6MjA4NTg0ODIzN30.AB-W5DjcmCl6fnWiQ2reD0rgDIJiMCGymc994fSJplw';

// --- FIXED DATABASE CLIENT (Understands .eq chaining) ---
const supabase = {
  from: (table) => {
    const headers = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };
    
    return {
      // SELECT that handles both await select('*') AND select('*').eq(...)
      select: (columns = '*') => {
        let url = `${SUPABASE_URL}/rest/v1/${table}?select=${columns}`;
        const query = {
          eq: (col, val) => { url += `&${col}=eq.${val}`; return query; },
          then: async (resolve, reject) => {
            try {
              const res = await fetch(url, { headers });
              const data = await res.json();
              resolve({ data, error: res.ok ? null : data });
            } catch (e) { resolve({ data: null, error: e }); }
          }
        };
        return query;
      },
      // INSERT
      insert: async (rows) => {
        try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: 'POST', headers, body: JSON.stringify(rows) });
          const data = await res.json();
          return { data, error: res.ok ? null : data };
        } catch (e) { return { error: e }; }
      },
      // UPDATE that handles .eq(...)
      update: (updates) => ({
        eq: async (col, val) => {
          try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}`, { method: 'PATCH', headers, body: JSON.stringify(updates) });
            const data = await res.json();
            return { data, error: res.ok ? null : data };
          } catch (e) { return { error: e }; }
        }
      }),
      // DELETE that handles .eq(...)
      delete: () => ({
        eq: async (col, val) => {
          try {
            await fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}`, { method: 'DELETE', headers });
            return { error: null };
          } catch (e) { return { error: e }; }
        }
      })
    };
  }
};

// --- CONFIGURATION ---
const OFFICES = [
  { code: 'BEJ', name: 'Beijing', currency: 'CNY', companyName: 'Berkeley Real Estate Consulting (Beijing) Co., Ltd.' },
  { code: 'CHE', name: 'Chengdu', currency: 'CNY', companyName: 'Berkeley Real Estate Consulting (Beijing) Co., Ltd. Chengdu Branch' },
  { code: 'SHA', name: 'Shanghai', currency: 'CNY', companyName: 'Berkeley Real Estate Consulting (Beijing) Co., Ltd. Shanghai Branch' },
  { code: 'SHE', name: 'Shenzhen', currency: 'CNY', companyName: 'Berkeley Real Estate Consulting (Beijing) Co., Ltd. Shenzhen Branch' },
  { code: 'HKG', name: 'Hong Kong', currency: 'HKD', companyName: 'Berkeley (Hong Kong) Limited' },
  { code: 'LON', name: 'London', currency: 'GBP', companyName: 'Berkeley London Residential Ltd' },
  { code: 'MYS', name: 'Malaysia', currency: 'MYR', companyName: 'Berkeley (Singapore)' },
  { code: 'SIN', name: 'Singapore', currency: 'SGD', companyName: 'Berkeley (Singapore)' },
  { code: 'BKK', name: 'Bangkok', currency: 'THB', companyName: 'Berkeley (Thailand)' },
  { code: 'DXB', name: 'Dubai', currency: 'AED', companyName: 'Berkeley London Residential Ltd' }
];

const EMPLOYEES = [
  { id: 101, name: 'Fang Yi', office: 'BEJ', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 102, name: 'Caroline Zhu Yunshu', office: 'BEJ', role: 'admin', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 103, name: 'Even Huang Yiyun', office: 'BEJ', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 104, name: 'Charrisa Xia Bei Jia', office: 'BEJ', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 105, name: 'Alice Kong Jing', office: 'BEJ', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 201, name: 'Suki Li Siqi', office: 'CHE', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 202, name: 'Icey Zuo Ziying', office: 'CHE', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 203, name: 'Dora Ji Jue Shi Yu', office: 'CHE', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 301, name: 'Ariel Tang Xin', office: 'SHA', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 302, name: 'Eddy Tao Xiao Feng', office: 'SHA', role: 'manager', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 303, name: 'Elsa Huang Wei-Chen', office: 'SHA', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 304, name: 'Terence Li Liang', office: 'SHA', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 305, name: 'Johnnie Huang Wenjiao', office: 'SHA', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 306, name: 'Cathy Liu Shikun', office: 'SHA', role: 'admin', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 307, name: 'Amy Wang Shiyun', office: 'SHA', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 308, name: 'Echo Yu Miao', office: 'SHA', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 401, name: 'Ryan Lee Yu-Yen', office: 'SHE', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 402, name: 'Simon Wong Chuen Lun', office: 'SHE', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 403, name: 'Zayn Huang Yanxiao', office: 'SHE', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 404, name: 'Jade Shen Jie', office: 'SHE', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 501, name: 'Kate Tai Tsz Lok', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD', password: 'berkeley123' },
  { id: 502, name: 'Anthony Andrew Jurenko', office: 'HKG', role: 'manager', reimburseCurrency: 'HKD', password: 'berkeley123' },
  { id: 503, name: 'Suki Fong Tsz Ching', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD', password: 'berkeley123' },
  { id: 504, name: 'Ron Chung Chun Long', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD', password: 'berkeley123' },
  { id: 505, name: 'Cherry Lai', office: 'HKG', role: 'admin', reimburseCurrency: 'HKD', password: 'berkeley123' },
  { id: 506, name: 'Jacky Khor Yhuen Zhuen', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD', password: 'berkeley123' },
  { id: 507, name: 'Michelle Shum', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD', password: 'berkeley123' },
  { id: 508, name: 'Jennifer Wong Ching Sin', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD', password: 'berkeley123' },
  { id: 509, name: 'Annabelle Yiu Wai-Ying', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD', password: 'berkeley123' },
  { id: 601, name: 'Mouna Ben Cheikh', office: 'LON', role: 'employee', reimburseCurrency: 'GBP', password: 'berkeley123' },
  { id: 602, name: 'Farah Al-Yawer', office: 'LON', role: 'employee', reimburseCurrency: 'GBP', password: 'berkeley123' },
  { id: 701, name: 'Joanne Chee Pek Har', office: 'MYS', role: 'employee', reimburseCurrency: 'MYR', password: 'berkeley123' },
  { id: 801, name: 'John Yan Chung Keung', office: 'SIN', role: 'manager', reimburseCurrency: 'SGD', password: 'berkeley123' },
  { id: 802, name: 'Janice Zhu Huijun', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', password: 'berkeley123' },
  { id: 803, name: 'Karen Chia Pei Ru', office: 'SIN', role: 'manager', reimburseCurrency: 'SGD', password: 'berkeley123' },
  { id: 804, name: 'Cathy He Zeqian', office: 'SIN', role: 'admin', reimburseCurrency: 'SGD', password: 'berkeley123' },
  { id: 805, name: 'Ann Low Mei Yen', office: 'SIN', role: 'admin', reimburseCurrency: 'SGD', password: 'berkeley123' },
  { id: 806, name: 'Prabakaran Rajinderan', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', password: 'berkeley123' },
  { id: 807, name: 'Zhang Weiyu', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', password: 'berkeley123' },
  { id: 808, name: 'Ong Yongle', office: 'SIN', role: 'finance', reimburseCurrency: 'SGD', password: 'berkeley123' },
  { id: 809, name: 'William Robert Swinburn', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', password: 'berkeley123' },
  { id: 810, name: 'Fiolita', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', password: 'berkeley123' },
  { id: 811, name: 'Ng Ziyao', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', password: 'berkeley123' },
  { id: 812, name: 'Kareen Ng Qiu Lin', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', password: 'berkeley123' },
  { id: 813, name: 'Danny Tan Yew Chong', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', password: 'berkeley123' },
  { id: 814, name: 'Foo Chin Yee', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', password: 'berkeley123' },
  { id: 815, name: 'Jeslyn Yap Soo Pheng', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', password: 'berkeley123' },
  { id: 816, name: 'Humphrey George Robert Perrins', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', password: 'berkeley123' },
  { id: 817, name: 'Tay Ruo Fan', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', password: 'berkeley123' },
  { id: 818, name: 'Wah Wah May Zaw', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', password: 'berkeley123' },
  { id: 901, name: 'Sutanya Jaruphiboon', office: 'BKK', role: 'employee', reimburseCurrency: 'THB', password: 'berkeley123' },
  { id: 902, name: 'Chayasid Jongpipattanachoke', office: 'BKK', role: 'employee', reimburseCurrency: 'THB', password: 'berkeley123' },
  { id: 903, name: 'Juthamas Leewanun', office: 'BKK', role: 'employee', reimburseCurrency: 'THB', password: 'berkeley123' },
  { id: 904, name: 'Norakamol Seninvinin', office: 'BKK', role: 'employee', reimburseCurrency: 'THB', password: 'berkeley123' },
  { id: 1001, name: 'Christopher James Mclean Frame', office: 'DXB', role: 'manager', reimburseCurrency: 'AED', password: 'berkeley123' },
  { id: 1002, name: 'Christine Mendoza Dimaranan', office: 'DXB', role: 'admin', reimburseCurrency: 'AED', password: 'berkeley123' },
  { id: 1003, name: 'Nathan Jon Abrahams', office: 'DXB', role: 'employee', reimburseCurrency: 'AED', password: 'berkeley123' },
  { id: 1004, name: 'Leila Kadiri', office: 'DXB', role: 'employee', reimburseCurrency: 'AED', password: 'berkeley123' },
  { id: 1005, name: 'Yasseen Jebara', office: 'DXB', role: 'employee', reimburseCurrency: 'AED', password: 'berkeley123' },
  { id: 1006, name: 'Adham Abu-Salim', office: 'DXB', role: 'employee', reimburseCurrency: 'AED', password: 'berkeley123' },
  { id: 1007, name: 'Olivia Rebecca Wyatt', office: 'DXB', role: 'employee', reimburseCurrency: 'AED', password: 'berkeley123' },
  { id: 1008, name: 'Keisha Latoya Whitehorne', office: 'DXB', role: 'employee', reimburseCurrency: 'AED', password: 'berkeley123' }
];

const EXPENSE_CATEGORIES = {
  A: { name: 'Petrol Expenditure', subcategories: ['Full Petrol Allowance', 'Business Mileage Return'], icon: '⛽', requiresAttendees: false },
  B: { name: 'Parking', subcategories: ['Off-Street Parking'], icon: '🅿️', requiresAttendees: false },
  C: { name: 'Travel Expenses', subcategories: ['Public Transport', 'Taxis', 'Tolls', 'Congestion Charging', 'Subsistence'], icon: '🚕', requiresAttendees: false },
  D: { name: 'Vehicle Repairs', subcategories: ['Repairs', 'Parts'], icon: '🔧', requiresAttendees: false },
  E: { name: 'Entertaining', subcategories: ['Customers (Staff & Customers)', 'Employees (Staff only)'], icon: '🍽️', requiresAttendees: true },
  F: { name: 'Welfare', subcategories: ['Hotel Accommodation', 'Gifts to Employees', 'Corporate Gifts'], icon: '🏨', requiresAttendees: true },
  G: { name: 'Subscriptions', subcategories: ['Professional', 'Non-Professional', 'Newspapers & Magazines'], icon: '📰', requiresAttendees: false },
  H: { name: 'Computer Costs', subcategories: ['All Items'], icon: '💻', requiresAttendees: false },
  I: { name: 'WIP', subcategories: ['All Items'], icon: '📦', requiresAttendees: false },
  J: { name: 'Other', subcategories: ['Miscellaneous Vatable Items'], icon: '📋', requiresAttendees: false }
};

const CURRENCIES = ['SGD', 'HKD', 'CNY', 'THB', 'AED', 'GBP', 'USD', 'EUR', 'MYR', 'JPY', 'SAR'];

// --- APP COMPONENT ---
export default function BerkeleyExpenseSystem() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('berkeley_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Modals & UI State
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [loginStep, setLoginStep] = useState('select');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- 1. ROBUST SYNC LOGIC (The Fix) ---
  const loadDrafts = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    
    // 1. Try LocalStorage FIRST (Immediate UI update)
    try {
      const savedExpenses = localStorage.getItem(`draft_expenses_${currentUser.id}`);
      if (savedExpenses) {
        setExpenses(JSON.parse(savedExpenses));
      }
    } catch(e) { console.error("Local Load Error", e); }

    // 2. Try Supabase SECOND (Cloud Sync)
    try {
      const { data, error } = await supabase.from('user_drafts').select('*').eq('user_id', currentUser.id);
      
      if (!error && data && data.length > 0) {
        const draft = data[0];
        if (draft.expenses) {
          const cloudExpenses = JSON.parse(draft.expenses);
          // If cloud has data, update local state and storage
          if(cloudExpenses.length > 0) {
            setExpenses(cloudExpenses);
            localStorage.setItem(`draft_expenses_${currentUser.id}`, JSON.stringify(cloudExpenses));
          }
        }
      }
    } catch (err) {
      console.error('Cloud Sync Error (Using Local Data):', err);
    }
    setIsSyncing(false);
  };

  // Initial Load
  useEffect(() => {
    loadDrafts();
  }, [currentUser]);

  // Save drafts when expenses change
  useEffect(() => {
    const saveDrafts = async () => {
      if (!currentUser) return;

      // 1. Save to LocalStorage immediately
      localStorage.setItem(`draft_expenses_${currentUser.id}`, JSON.stringify(expenses));
      
      // 2. Save to Supabase (Debounced would be better, but direct is safer for now)
      const draftData = {
        user_id: String(currentUser.id),
        expenses: JSON.stringify(expenses),
        updated_at: new Date().toISOString()
      };

      try {
        // Check if exists
        const { data: existing } = await supabase.from('user_drafts').select('id').eq('user_id', currentUser.id);
        
        if (existing && existing.length > 0) {
           await supabase.from('user_drafts').update(draftData).eq('user_id', currentUser.id);
        } else {
           await supabase.from('user_drafts').insert([draftData]);
        }
      } catch (e) {
        console.error("Cloud Save Failed (Data safe in LocalStorage)", e);
      }
    };
    
    // Only save if we have data or if we intentionally cleared it
    if(expenses.length > 0 || localStorage.getItem(`draft_expenses_${currentUser.id}`)) {
       saveDrafts();
    }
  }, [expenses, currentUser]);


  // --- UI ACTIONS ---
  const handleLogin = () => { 
    if (passwordInput === selectedEmployee.password) { 
      setCurrentUser(selectedEmployee);
      localStorage.setItem('berkeley_current_user', JSON.stringify(selectedEmployee));
      setLoginStep('select'); 
      setSelectedEmployee(null); 
      setPasswordInput(''); 
      setLoginError(''); 
    } else { 
      setLoginError('Incorrect password.'); 
    } 
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setExpenses([]);
    localStorage.removeItem('berkeley_current_user');
  };

  const getUserOffice = (user) => OFFICES.find(o => o.code === user?.office);
  const userOffice = getUserOffice(currentUser);
  const userCurrency = currentUser?.reimburseCurrency || userOffice?.currency || 'SGD';
  const reimbursementTotal = expenses.reduce((sum, e) => sum + parseFloat(e.reimbursementAmount || e.amount || 0), 0);

  // --- RENDER LOGIN ---
  if (!currentUser) {
    const handleSelectEmployee = (e) => { const user = EMPLOYEES.find(emp => emp.id === parseInt(e.target.value)); if (user) { setSelectedEmployee(user); setLoginStep('password'); setLoginError(''); setPasswordInput(''); } };
    
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800">Berkeley Expenses</h1>
            <p className="text-slate-500 mt-2">v4.0 (Stable Sync)</p>
          </div>
          
          {loginStep === 'select' && (
             <select className="w-full p-4 border rounded-xl text-lg bg-white" onChange={handleSelectEmployee} defaultValue="">
               <option value="" disabled>-- Select your name --</option>
               {OFFICES.map(office => (
                 <optgroup key={office.code} label={office.name}>
                   {EMPLOYEES.filter(e => e.office === office.code).map(e => (
                     <option key={e.id} value={e.id}>{e.name}</option>
                   ))}
                 </optgroup>
               ))}
             </select>
          )}

          {loginStep === 'password' && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl text-center">
                <div className="font-bold text-blue-900">{selectedEmployee?.name}</div>
                <div className="text-sm text-blue-600">{getUserOffice(selectedEmployee)?.name}</div>
              </div>
              <input type="password" 
                className="w-full p-4 border rounded-xl text-center text-xl" 
                placeholder="Password"
                value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus 
              />
              <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold">Login</button>
              <button onClick={() => setLoginStep('select')} className="w-full text-slate-400 p-2">Back</button>
              {loginError && <p className="text-red-500 text-center">{loginError}</p>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- RENDER MAIN APP ---
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* HEADER */}
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-10 shadow-md flex justify-between items-center">
        <div>
          <div className="font-bold">Berkeley Expenses</div>
          <div className="text-xs text-slate-400">{userOffice?.name} • {currentUser.name}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadDrafts} className={`p-2 bg-slate-800 rounded-lg ${isSyncing ? 'animate-spin' : ''}`}>
            <RefreshCw size={18} />
          </button>
          <button onClick={handleLogout} className="p-2 bg-red-900/50 text-red-200 rounded-lg">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* DASHBOARD */}
      <div className="p-4 max-w-3xl mx-auto space-y-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
          <div>
            <div className="text-slate-500 text-sm">Draft Total ({userCurrency})</div>
            <div className="text-3xl font-bold text-slate-800">{reimbursementTotal.toFixed(2)}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{expenses.length}</div>
            <div className="text-xs text-slate-400">Items</div>
          </div>
        </div>

        {/* EXPENSE LIST */}
        <div className="space-y-3">
          {expenses.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>No draft expenses.</p>
              <p className="text-sm">Tap + to start.</p>
            </div>
          ) : (
            expenses.map((exp, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl border shadow-sm flex justify-between items-center">
                <div className="flex gap-3 items-center">
                  <div className="text-2xl">{EXPENSE_CATEGORIES[exp.category]?.icon || '📄'}</div>
                  <div>
                    <div className="font-bold text-slate-800">{exp.merchant}</div>
                    <div className="text-xs text-slate-500">{exp.date} • {exp.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold">{exp.reimbursementAmount || exp.amount}</span>
                  <button onClick={() => {
                    const newExpenses = expenses.filter((_, i) => i !== idx);
                    setExpenses(newExpenses);
                  }} className="text-slate-300 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ADD BUTTON */}
      <button 
        onClick={() => setShowAddExpense(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-50"
      >
        <Plus size={32} />
      </button>

      {/* SIMPLIFIED ADD MODAL (For brevity - full version logic is similar) */}
      {showAddExpense && (
        <AddExpenseForm 
          onClose={() => setShowAddExpense(false)} 
          onSave={(newExp) => {
            setExpenses(prev => [...prev, { ...newExp, id: Date.now() }]);
            setShowAddExpense(false);
          }}
          currency={userCurrency}
        />
      )}
    </div>
  );
}

// Sub-component for adding expense to keep main file clean
function AddExpenseForm({ onClose, onSave, currency }) {
  const [formData, setFormData] = useState({
    merchant: '', amount: '', description: '', category: 'C', date: new Date().toISOString().split('T')[0]
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl p-6">
        <h2 className="font-bold text-xl mb-4">Add Expense</h2>
        <div className="space-y-4">
          <input type="text" placeholder="Merchant" className="w-full p-3 border rounded-xl" value={formData.merchant} onChange={e => setFormData({...formData, merchant: e.target.value})} autoFocus />
          <div className="flex gap-2">
            <span className="p-3 bg-slate-100 rounded-xl font-bold text-slate-500">{currency}</span>
            <input type="number" placeholder="0.00" className="w-full p-3 border rounded-xl font-bold" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
          </div>
          <input type="text" placeholder="Description" className="w-full p-3 border rounded-xl" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          <select className="w-full p-3 border rounded-xl bg-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
            {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.name}</option>)}
          </select>
          <button onClick={() => onSave({...formData, reimbursementAmount: formData.amount})} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold mt-2">Save</button>
          <button onClick={onClose} className="w-full p-3 text-slate-500">Cancel</button>
        </div>
      </div>
    </div>
  );
}