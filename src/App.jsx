import React, { useState, useEffect } from 'react';

/*
 * BERKELEY EXPENSE SYSTEM - v5.0 (Bulletproof / No-Dependency)
 * Uses Emojis instead of Icons to prevent crash
 */

const SUPABASE_URL = 'https://wlhoyjsicvkncfjbexoi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsaG95anNpY3ZrbmNmamJleG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNzIyMzcsImV4cCI6MjA4NTg0ODIzN30.AB-W5DjcmCl6fnWiQ2reD0rgDIJiMCGymc994fSJplw';

// --- ROBUST DATABASE CONNECTION ---
const supabase = {
  from: (table) => {
    const headers = { 
      'apikey': SUPABASE_ANON_KEY, 
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 
      'Content-Type': 'application/json', 
      'Prefer': 'return=representation' 
    };
    
    return {
      // Handles both "await select()" and "await select().eq()"
      select: (columns = '*') => {
        let url = `${SUPABASE_URL}/rest/v1/${table}?select=${columns}`;
        const query = {
          eq: (col, val) => { url += `&${col}=eq.${val}`; return query; },
          then: async (resolve) => {
            try {
              const res = await fetch(url, { headers });
              const data = await res.json();
              resolve({ data, error: res.ok ? null : data });
            } catch (e) { resolve({ data: null, error: e }); }
          }
        };
        return query;
      },
      insert: async (rows) => {
        try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: 'POST', headers, body: JSON.stringify(rows) });
          const data = await res.json();
          return { data, error: res.ok ? null : data };
        } catch (e) { return { error: e }; }
      },
      update: (updates) => ({
        eq: async (col, val) => {
          try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}`, { method: 'PATCH', headers, body: JSON.stringify(updates) });
            const data = await res.json();
            return { data, error: res.ok ? null : data };
          } catch (e) { return { error: e }; }
        }
      }),
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

// --- DATA ---
const OFFICES = [
  { code: 'BEJ', name: 'Beijing', currency: 'CNY' },
  { code: 'CHE', name: 'Chengdu', currency: 'CNY' },
  { code: 'SHA', name: 'Shanghai', currency: 'CNY' },
  { code: 'SHE', name: 'Shenzhen', currency: 'CNY' },
  { code: 'HKG', name: 'Hong Kong', currency: 'HKD' },
  { code: 'LON', name: 'London', currency: 'GBP' },
  { code: 'MYS', name: 'Malaysia', currency: 'MYR' },
  { code: 'SIN', name: 'Singapore', currency: 'SGD' },
  { code: 'BKK', name: 'Bangkok', currency: 'THB' },
  { code: 'DXB', name: 'Dubai', currency: 'AED' }
];

const EMPLOYEES = [
  { id: 101, name: 'Fang Yi', office: 'BEJ', role: 'employee', password: 'berkeley123' },
  { id: 102, name: 'Caroline Zhu Yunshu', office: 'BEJ', role: 'admin', password: 'berkeley123' },
  { id: 306, name: 'Cathy Liu Shikun', office: 'SHA', role: 'admin', password: 'berkeley123' },
  { id: 501, name: 'Kate Tai Tsz Lok', office: 'HKG', role: 'employee', password: 'berkeley123' },
  { id: 801, name: 'John Yan Chung Keung', office: 'SIN', role: 'manager', password: 'berkeley123' },
  { id: 805, name: 'Ann Low Mei Yen', office: 'SIN', role: 'admin', password: 'berkeley123' },
  { id: 808, name: 'Ong Yongle', office: 'SIN', role: 'finance', password: 'berkeley123' },
  { id: 1001, name: 'Christopher James Mclean Frame', office: 'DXB', role: 'manager', password: 'berkeley123' },
  { id: 1002, name: 'Christine Mendoza Dimaranan', office: 'DXB', role: 'admin', password: 'berkeley123' }
];

const EXPENSE_CATEGORIES = {
  A: { name: 'Petrol', icon: '⛽' },
  B: { name: 'Parking', icon: '🅿️' },
  C: { name: 'Travel/Taxi', icon: '🚕' },
  E: { name: 'Entertaining', icon: '🍽️' },
  H: { name: 'Computer/IT', icon: '💻' },
  I: { name: 'Other/WIP', icon: '📦' }
};

// --- MAIN COMPONENT ---
export default function BerkeleyExpenseSystem() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('berkeley_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  const [expenses, setExpenses] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // UI State
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [loginStep, setLoginStep] = useState('select');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // 1. SYNC FUNCTION
  const loadDrafts = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    
    // Try LocalStorage first (Fast)
    try {
      const savedExpenses = localStorage.getItem(`draft_expenses_${currentUser.id}`);
      if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
    } catch(e) { console.error(e); }

    // Try Cloud second (Sync)
    try {
      const { data } = await supabase.from('user_drafts').select('*').eq('user_id', currentUser.id);
      if (data && data.length > 0 && data[0].expenses) {
        const cloudExpenses = JSON.parse(data[0].expenses);
        if(cloudExpenses.length > 0) {
          setExpenses(cloudExpenses);
          localStorage.setItem(`draft_expenses_${currentUser.id}`, JSON.stringify(cloudExpenses));
        }
      }
    } catch (err) { console.error('Sync failed, using local data'); }
    setIsSyncing(false);
  };

  useEffect(() => { loadDrafts(); }, [currentUser]);

  // 2. AUTO-SAVE
  useEffect(() => {
    const saveDrafts = async () => {
      if (!currentUser) return;
      localStorage.setItem(`draft_expenses_${currentUser.id}`, JSON.stringify(expenses));
      
      try {
        const draftData = { user_id: String(currentUser.id), expenses: JSON.stringify(expenses), updated_at: new Date().toISOString() };
        const { data: existing } = await supabase.from('user_drafts').select('id').eq('user_id', currentUser.id);
        if (existing?.length > 0) {
           await supabase.from('user_drafts').update(draftData).eq('user_id', currentUser.id);
        } else {
           await supabase.from('user_drafts').insert([draftData]);
        }
      } catch (e) { console.error("Cloud save failed"); }
    };
    if(expenses.length > 0) saveDrafts();
  }, [expenses, currentUser]);

  // --- LOGIN SCREEN ---
  if (!currentUser) {
    const handleLogin = () => { 
      if (passwordInput === 'berkeley123') { 
        setCurrentUser(selectedEmployee);
        localStorage.setItem('berkeley_current_user', JSON.stringify(selectedEmployee));
        setLoginStep('select'); setSelectedEmployee(null); setPasswordInput(''); 
      } else { setLoginError('Incorrect password'); } 
    };

    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">Berkeley Expenses</h1>
          {loginStep === 'select' && (
             <div className="space-y-2 max-h-[60vh] overflow-auto">
               <p className="text-center text-sm text-slate-500 mb-2">Select your name:</p>
               {EMPLOYEES.map(emp => (
                 <button key={emp.id} onClick={() => { setSelectedEmployee(emp); setLoginStep('password'); }} className="w-full p-4 border rounded-xl flex justify-between hover:bg-slate-50 text-left">
                   <span className="font-bold">{emp.name}</span>
                   <span className="text-xs bg-slate-100 px-2 py-1 rounded">{emp.office}</span>
                 </button>
               ))}
             </div>
          )}
          {loginStep === 'password' && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl text-center font-bold text-blue-900">{selectedEmployee?.name}</div>
              <input type="password" className="w-full p-4 border rounded-xl text-center text-xl" placeholder="Password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} autoFocus />
              <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold">Login</button>
              <button onClick={() => { setLoginStep('select'); setLoginError(''); }} className="w-full p-3 text-slate-500">Back</button>
              {loginError && <p className="text-red-500 text-center">{loginError}</p>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- DASHBOARD ---
  const userOffice = OFFICES.find(o => o.code === currentUser.office);
  const currency = currentUser.reimburseCurrency || userOffice?.currency || 'SGD';
  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-10 flex justify-between items-center shadow-lg">
        <div><div className="font-bold">My Expenses</div><div className="text-xs text-slate-400">{currentUser.name} ({currency})</div></div>
        <div className="flex gap-3">
          <button onClick={loadDrafts} className={`p-2 bg-slate-800 rounded-lg text-xl ${isSyncing ? 'opacity-50' : ''}`}>🔄</button>
          <button onClick={() => { setCurrentUser(null); localStorage.removeItem('berkeley_current_user'); }} className="p-2 bg-red-900/50 rounded-lg text-xl">🚪</button>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
          <div><div className="text-slate-500 text-xs uppercase font-bold">Draft Total</div><div className="text-3xl font-bold text-slate-800">{total.toFixed(2)}</div></div>
          <div className="text-right"><div className="text-2xl font-bold text-blue-600">{expenses.length}</div><div className="text-xs text-slate-400">Items</div></div>
        </div>

        <div className="space-y-3">
          {expenses.length === 0 ? <div className="text-center py-10 text-slate-400">No expenses yet.<br/>Tap + to add one.</div> : expenses.map((exp, i) => (
            <div key={i} className="bg-white p-4 rounded-xl border shadow-sm flex justify-between items-center">
              <div className="flex gap-3 items-center">
                <div className="text-2xl">{EXPENSE_CATEGORIES[exp.category]?.icon || '📄'}</div>
                <div><div className="font-bold text-slate-800">{exp.merchant}</div><div className="text-xs text-slate-500">{exp.date} • {exp.description}</div></div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold">{parseFloat(exp.amount).toFixed(2)}</span>
                <button onClick={() => setExpenses(expenses.filter((_, idx) => idx !== i))} className="text-xl hover:scale-110 transition-transform">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => setShowAddExpense(true)} className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center text-4xl hover:scale-105 active:scale-95 transition-all z-50">＋</button>

      {showAddExpense && (
        <AddExpenseForm onClose={() => setShowAddExpense(false)} currency={currency} onSave={(newExp) => { setExpenses([...expenses, { ...newExp, id: Date.now() }]); setShowAddExpense(false); }} />
      )}
    </div>
  );
}

// Simple Add Form Component
function AddExpenseForm({ onClose, onSave, currency }) {
  const [formData, setFormData] = useState({ merchant: '', amount: '', description: '', category: 'C', date: new Date().toISOString().split('T')[0] });
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-pulse-once">
        <h2 className="font-bold text-xl mb-4">Add Expense</h2>
        <div className="space-y-3">
          <input type="text" placeholder="Merchant (e.g. Shell)" className="w-full p-3 border rounded-xl" value={formData.merchant} onChange={e => setFormData({...formData, merchant: e.target.value})} autoFocus />
          <div className="flex gap-2">
            <span className="p-3 bg-slate-100 rounded-xl font-bold text-slate-500 flex items-center">{currency}</span>
            <input type="number" placeholder="0.00" className="w-full p-3 border rounded-xl font-bold text-lg" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
          </div>
          <input type="text" placeholder="Description" className="w-full p-3 border rounded-xl" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          <select className="w-full p-3 border rounded-xl bg-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
            {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.name}</option>)}
          </select>
          <button onClick={() => { if(formData.merchant && formData.amount) onSave(formData); }} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold mt-2 shadow-lg">Save Expense</button>
          <button onClick={onClose} className="w-full p-3 text-slate-500">Cancel</button>
        </div>
      </div>
    </div>
  );
}