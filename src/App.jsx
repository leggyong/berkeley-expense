import React, { useState } from 'react';

// ============================================
// BERKELEY INTERNATIONAL EXPENSE MANAGEMENT SYSTEM
// Version: 1.0 (Manual Entry - No OCR)
// ============================================

// Expense Categories matching the Berkeley form structure
const EXPENSE_CATEGORIES = {
  A: { name: 'Petrol Expenditure', subcategories: ['Full Petrol Allowance / Fuel Card', 'Business Mileage'], icon: '⛽' },
  B: { name: 'Parking', subcategories: ['Off-Street Parking'], icon: '🅿️' },
  C: { name: 'Travel Expenses', subcategories: ['Public Transport', 'Taxis', 'Tolls', 'Congestion Charging', 'Subsistence'], icon: '🚕' },
  D: { name: 'Vehicle Repairs', subcategories: ['Repairs', 'Parts'], icon: '🔧' },
  E: { name: 'Entertaining', subcategories: ['Customers (Staff & Customers)', 'Employees Only'], icon: '🍽️' },
  F: { name: 'Welfare', subcategories: ['Hotel Accommodation', 'Gifts to Employees', 'Corporate Gifts'], icon: '🏨' },
  G: { name: 'Subscriptions', subcategories: ['Professional', 'Non-Professional', 'Newspapers/Magazines'], icon: '📰' },
  H: { name: 'Computer Costs', subcategories: ['All Items'], icon: '💻' },
  I: { name: 'WIP / Other', subcategories: ['WIP', 'Miscellaneous Vatable Items'], icon: '📦' }
};

const OFFICES = [
  { code: 'SHA', name: 'Shanghai', currency: 'CNY', country: 'China' },
  { code: 'BEJ', name: 'Beijing', currency: 'CNY', country: 'China' },
  { code: 'CHE', name: 'Chengdu', currency: 'CNY', country: 'China' },
  { code: 'SHE', name: 'Shenzhen', currency: 'CNY', country: 'China' },
  { code: 'HKG', name: 'Hong Kong', currency: 'HKD', country: 'Hong Kong' },
  { code: 'SIN', name: 'Singapore', currency: 'SGD', country: 'Singapore' },
  { code: 'BKK', name: 'Bangkok', currency: 'THB', country: 'Thailand' },
  { code: 'DXB', name: 'Dubai', currency: 'AED', country: 'UAE' }
];

const CURRENCIES = ['SGD', 'HKD', 'CNY', 'THB', 'AED', 'GBP', 'USD', 'EUR', 'MYR', 'JPY'];

// Demo users - in production, this would come from a database
const DEMO_USERS = [
  { id: 1, name: 'Chris Frame', email: 'chris.frame@berkeley.com', office: 'DXB', role: 'employee' },
  { id: 2, name: 'Kate Tai', email: 'kate.tai@berkeley.com', office: 'HKG', role: 'employee' },
  { id: 3, name: 'Keisha Whitehorne', email: 'keisha.w@berkeley.com', office: 'DXB', role: 'employee' },
  { id: 4, name: 'Farah Ahmed', email: 'farah.a@berkeley.com', office: 'DXB', role: 'employee', reimburseCurrency: 'GBP' },
  { id: 5, name: 'Mouna Hassan', email: 'mouna.h@berkeley.com', office: 'DXB', role: 'employee', reimburseCurrency: 'GBP' },
  { id: 6, name: 'Joanne Chee', email: 'joanne.c@berkeley.com', office: 'SIN', role: 'employee' },
  { id: 7, name: 'Karen Lim', email: 'karen.l@berkeley.com', office: 'SIN', role: 'admin' },
  { id: 8, name: 'Christine Tan', email: 'christine.t@berkeley.com', office: 'DXB', role: 'admin' },
  { id: 9, name: 'Ong Yongle', email: 'yongle.ong@berkeley.com', office: 'SIN', role: 'finance' },
  { id: 10, name: 'Emma Fowler', email: 'emma.fowler@berkeley.com', office: 'SIN', role: 'finance' }
];

// ============================================
// MAIN APPLICATION COMPONENT
// ============================================

export default function BerkeleyExpenseSystem() {
  const [currentUser, setCurrentUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [claims, setClaims] = useState([
    // Sample data for demo
    { id: 1, odId: 'EXP-2026-001', employeeName: 'Chris Frame', employeeId: 1, office: 'Dubai', currency: 'AED', total: 3370.89, items: 9, status: 'pending_admin', submittedAt: '2026-01-23', flags: ['E1: 3 Kirin Draft beers - verify with office head'] },
    { id: 2, odId: 'EXP-2026-002', employeeName: 'Kate Tai', employeeId: 2, office: 'Hong Kong', currency: 'HKD', total: 7404.38, items: 5, status: 'pending_admin', submittedAt: '2026-01-22', flags: [] },
    { id: 3, odId: 'EXP-2026-003', employeeName: 'Keisha Whitehorne', employeeId: 3, office: 'Dubai', currency: 'AED', total: 5379.17, items: 12, status: 'approved', submittedAt: '2026-01-16', flags: [] },
  ]);
  const [view, setView] = useState('dashboard');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [adminTab, setAdminTab] = useState('pending');

  // Get user's office details
  const getUserOffice = (user) => OFFICES.find(o => o.code === user?.office);
  const userOffice = getUserOffice(currentUser);

  // Calculate stats
  const pendingExpenses = expenses.filter(e => e.status === 'draft');
  const totalPendingAmount = pendingExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  // Get next reference number for a category
  const getNextRef = (category) => {
    const catExpenses = pendingExpenses.filter(e => e.category === category);
    return `${category}${catExpenses.length + 1}`;
  };

  // Check if expense is foreign currency
  const isForeignCurrency = (currency) => {
    if (!currentUser) return false;
    const userCurrency = currentUser.reimburseCurrency || getUserOffice(currentUser)?.currency;
    return currency !== userCurrency;
  };

  // Check if expense is older than 2 months
  const isOlderThan2Months = (dateStr) => {
    const expenseDate = new Date(dateStr);
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    return expenseDate < twoMonthsAgo;
  };

  // ============================================
  // LOGIN SCREEN
  // ============================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-lg transform rotate-3">
              B
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Berkeley Expenses</h1>
            <p className="text-slate-500 text-sm mt-2">Select your account to continue</p>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {DEMO_USERS.map(user => (
              <button
                key={user.id}
                onClick={() => setCurrentUser(user)}
                className="w-full p-4 rounded-xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all text-left flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 group-hover:from-blue-100 group-hover:to-blue-200 flex items-center justify-center text-lg font-semibold text-slate-600 group-hover:text-blue-600 transition-all">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-800">{user.name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span>{OFFICES.find(o => o.code === user.office)?.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      user.role === 'finance' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'admin' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {user.role === 'finance' ? '💼 Finance' : user.role === 'admin' ? '👤 Admin' : '📋 Employee'}
                    </span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Berkeley International Expense Management System v1.0
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // ADD EXPENSE MODAL
  // ============================================
  const AddExpenseModal = () => {
    const [step, setStep] = useState(1);
    const [receiptFile, setReceiptFile] = useState(null);
    const [receiptPreview, setReceiptPreview] = useState(null);
    const [formData, setFormData] = useState({
      merchant: '',
      amount: '',
      currency: userOffice?.currency || 'SGD',
      date: new Date().toISOString().split('T')[0],
      category: 'C',
      subcategory: 'Taxis',
      description: '',
      attendees: '',
      numberOfGuests: ''
    });

    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        setReceiptFile(file);
        setReceiptPreview(URL.createObjectURL(file));
        setStep(2);
      }
    };

    const handleSave = () => {
      const ref = getNextRef(formData.category);
      const newExpense = {
        id: Date.now(),
        ref,
        ...formData,
        amount: parseFloat(formData.amount),
        receiptFile: receiptFile?.name || 'receipt.jpg',
        receiptPreview,
        status: 'draft',
        isForeignCurrency: isForeignCurrency(formData.currency),
        isOld: isOlderThan2Months(formData.date),
        createdAt: new Date().toISOString()
      };
      setExpenses(prev => [...prev, newExpense]);
      setShowAddExpense(false);
    };

    const needsAttendees = formData.category === 'E' || formData.category === 'F';
    const isChina = userOffice?.country === 'China';

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">Add Expense</h2>
              <p className="text-blue-100 text-sm">Step {step} of 2</p>
            </div>
            <button onClick={() => setShowAddExpense(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
              ✕
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {step === 1 && (
              <div className="space-y-4">
                <label className="block border-3 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                  <input type="file" accept="image/*,application/pdf" capture="environment" onChange={handleFileChange} className="hidden" />
                  <div className="text-5xl mb-4">📸</div>
                  <p className="font-semibold text-slate-700">Take photo or upload receipt</p>
                  <p className="text-sm text-slate-500 mt-1">JPG, PNG or PDF</p>
                </label>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  <strong>💡 Tips for good receipt photos:</strong>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Ensure receipt is flat and well-lit</li>
                    <li>Capture the entire receipt including date and total</li>
                    <li>Make sure text is readable</li>
                  </ul>
                </div>

                {isChina && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                    <strong>🇨🇳 China offices:</strong> Remember to upload both the fapiao AND the itemized receipt for meals.
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {/* Receipt Preview */}
                {receiptPreview && (
                  <div className="relative">
                    <img src={receiptPreview} alt="Receipt" className="w-full h-40 object-contain bg-slate-100 rounded-xl" />
                    <button 
                      onClick={() => { setStep(1); setReceiptFile(null); setReceiptPreview(null); }}
                      className="absolute top-2 right-2 bg-white/90 hover:bg-white px-3 py-1 rounded-lg text-sm font-medium shadow"
                    >
                      📷 Retake
                    </button>
                  </div>
                )}

                {/* Form Fields */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Merchant / Vendor *</label>
                  <input
                    type="text"
                    className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="e.g., Uber, Restaurant Name"
                    value={formData.merchant}
                    onChange={e => setFormData(prev => ({ ...prev, merchant: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Currency *</label>
                    <select
                      className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white"
                      value={formData.currency}
                      onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    >
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {isForeignCurrency(formData.currency) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2">
                    <span>💳</span>
                    <span>Foreign currency - you'll need to attach your credit card statement when submitting your claim.</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Date of Expense *</label>
                  <input
                    type="date"
                    className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    value={formData.date}
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>

                {isOlderThan2Months(formData.date) && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800 flex items-start gap-2">
                    <span>⚠️</span>
                    <span>This expense is older than 2 months. It will require Cathy's approval.</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Category *</label>
                  <select
                    className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white"
                    value={formData.category}
                    onChange={e => setFormData(prev => ({ 
                      ...prev, 
                      category: e.target.value,
                      subcategory: EXPENSE_CATEGORIES[e.target.value].subcategories[0]
                    }))}
                  >
                    {Object.entries(EXPENSE_CATEGORIES).map(([key, val]) => (
                      <option key={key} value={key}>{val.icon} {key}. {val.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Sub-category *</label>
                  <select
                    className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white"
                    value={formData.subcategory}
                    onChange={e => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                  >
                    {EXPENSE_CATEGORIES[formData.category].subcategories.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Description / Purpose *</label>
                  <input
                    type="text"
                    className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="e.g., Taxi to client meeting at DIFC"
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                {needsAttendees && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Attendees * <span className="text-slate-400 normal-case">(Name & Company)</span>
                      </label>
                      <textarea
                        className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
                        rows={2}
                        placeholder="e.g., John Smith (ABC Corp), Jane Doe (XYZ Ltd)"
                        value={formData.attendees}
                        onChange={e => setFormData(prev => ({ ...prev, attendees: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Number of Guests (including yourself)</label>
                      <input
                        type="number"
                        className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        placeholder="e.g., 4"
                        value={formData.numberOfGuests}
                        onChange={e => setFormData(prev => ({ ...prev, numberOfGuests: e.target.value }))}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50">
            {step === 2 && (
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl border-2 border-slate-300 font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formData.merchant || !formData.amount || !formData.date || !formData.description || (needsAttendees && !formData.attendees)}
                  className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Expense ✓
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // EMPLOYEE DASHBOARD
  // ============================================
  const EmployeeDashboard = () => {
    const hasFCY = pendingExpenses.some(e => e.isForeignCurrency);
    const hasOldExpenses = pendingExpenses.some(e => e.isOld);

    const handleSubmitClaim = () => {
      if (hasFCY) {
        alert('📎 Please ensure you have your credit card statements ready for foreign currency expenses. In the full version, you would upload them here.');
      }
      
      const total = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);
      const newClaim = {
        id: Date.now(),
        odId: `EXP-2026-${String(claims.length + 1).padStart(3, '0')}`,
        employeeName: currentUser.name,
        employeeId: currentUser.id,
        office: userOffice?.name,
        currency: userOffice?.currency,
        total,
        items: pendingExpenses.length,
        status: 'pending_admin',
        submittedAt: new Date().toISOString().split('T')[0],
        flags: hasOldExpenses ? ['Contains expenses older than 2 months - requires Cathy approval'] : [],
        expenses: [...pendingExpenses]
      };
      
      setClaims(prev => [newClaim, ...prev]);
      setExpenses([]);
      alert('✅ Expense claim submitted successfully! Your admin will review it shortly.');
    };

    // Group expenses by category
    const groupedExpenses = pendingExpenses.reduce((acc, exp) => {
      if (!acc[exp.category]) acc[exp.category] = [];
      acc[exp.category].push(exp);
      return acc;
    }, {});

    return (
      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="text-4xl font-bold text-slate-800">{pendingExpenses.length}</div>
            <div className="text-sm text-slate-500 mt-1">Pending Receipts</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="text-4xl font-bold text-blue-600">{userOffice?.currency} {totalPendingAmount.toFixed(2)}</div>
            <div className="text-sm text-slate-500 mt-1">Total Amount</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="text-xl">⚡</span> Quick Actions
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowAddExpense(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
            >
              📸 Add Receipt
            </button>
            {pendingExpenses.length > 0 && (
              <button
                onClick={handleSubmitClaim}
                className="bg-white border-2 border-green-500 text-green-600 px-6 py-3 rounded-xl font-semibold hover:bg-green-50 transition-all flex items-center gap-2"
              >
                📤 Submit Claim ({pendingExpenses.length} items)
              </button>
            )}
          </div>
        </div>

        {/* Warnings */}
        {hasFCY && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-xl">💳</span>
            <div>
              <strong className="text-amber-800">Foreign Currency Expenses</strong>
              <p className="text-sm text-amber-700 mt-1">You have expenses in foreign currencies. Remember to attach your credit card statement when submitting.</p>
            </div>
          </div>
        )}

        {hasOldExpenses && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <strong className="text-red-800">Old Expenses Detected</strong>
              <p className="text-sm text-red-700 mt-1">Some expenses are older than 2 months. These will require Cathy's approval.</p>
            </div>
          </div>
        )}

        {/* Pending Expenses */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="text-xl">📋</span> Pending Expenses ({pendingExpenses.length})
          </h3>

          {pendingExpenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-slate-500 font-medium">No pending expenses</p>
              <p className="text-sm text-slate-400 mt-1">Tap "Add Receipt" to get started</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedExpenses).map(([cat, exps]) => (
                <div key={cat}>
                  <h4 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
                    <span>{EXPENSE_CATEGORIES[cat].icon}</span>
                    {cat}. {EXPENSE_CATEGORIES[cat].name}
                  </h4>
                  <div className="space-y-2">
                    {exps.map(exp => (
                      <div key={exp.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-lg">{exp.ref}</span>
                            <span className="font-semibold text-slate-800 truncate">{exp.merchant}</span>
                            {exp.isForeignCurrency && <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-lg">FCY</span>}
                            {exp.isOld && <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-lg">&gt;2mo</span>}
                          </div>
                          <p className="text-sm text-slate-500 mt-1 truncate">{exp.description}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{exp.date}</p>
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-bold text-slate-800">{exp.currency} {exp.amount.toFixed(2)}</div>
                          <button
                            onClick={() => setExpenses(prev => prev.filter(e => e.id !== exp.id))}
                            className="text-xs text-red-500 hover:text-red-700 hover:underline mt-1"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Previous Claims */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="text-xl">📁</span> My Previous Claims
          </h3>
          {claims.filter(c => c.employeeId === currentUser.id).length === 0 ? (
            <p className="text-center text-slate-400 py-8">No previous claims</p>
          ) : (
            <div className="space-y-2">
              {claims.filter(c => c.employeeId === currentUser.id).map(claim => (
                <div key={claim.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{claim.odId}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        claim.status === 'approved' ? 'bg-green-100 text-green-700' :
                        claim.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {claim.status === 'pending_admin' ? 'Pending Review' : 
                         claim.status === 'pending_finance' ? 'With Finance' :
                         claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{claim.items} items • {claim.submittedAt}</p>
                  </div>
                  <div className="font-bold text-slate-800">{claim.currency} {claim.total.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // ADMIN DASHBOARD
  // ============================================
  const AdminDashboard = () => {
    const pendingClaims = claims.filter(c => c.status === 'pending_admin');
    const filteredClaims = adminTab === 'pending' ? pendingClaims :
                          adminTab === 'approved' ? claims.filter(c => c.status === 'approved') :
                          adminTab === 'rejected' ? claims.filter(c => c.status === 'rejected') :
                          claims;

    const handleApprove = (claimId) => {
      setClaims(prev => prev.map(c => 
        c.id === claimId ? { ...c, status: currentUser.role === 'finance' ? 'approved' : 'pending_finance' } : c
      ));
      setSelectedClaim(null);
    };

    const handleReject = (claimId) => {
      setClaims(prev => prev.map(c => 
        c.id === claimId ? { ...c, status: 'rejected' } : c
      ));
      setSelectedClaim(null);
    };

    return (
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-lg p-5 text-center">
            <div className="text-3xl font-bold text-amber-500">{claims.filter(c => c.status === 'pending_admin' || c.status === 'pending_finance').length}</div>
            <div className="text-xs text-slate-500 mt-1">Pending Review</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-5 text-center">
            <div className="text-3xl font-bold text-green-500">{claims.filter(c => c.status === 'approved').length}</div>
            <div className="text-xs text-slate-500 mt-1">Approved</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-5 text-center">
            <div className="text-3xl font-bold text-red-500">{claims.filter(c => c.status === 'rejected').length}</div>
            <div className="text-xs text-slate-500 mt-1">Rejected</div>
          </div>
        </div>

        {/* Claims List */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="text-xl">📊</span> Expense Claims
          </h3>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {[
              { id: 'pending', label: 'Pending', count: pendingClaims.length },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' },
              { id: 'all', label: 'All' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setAdminTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  adminTab === tab.id 
                    ? 'bg-blue-600 text-white shadow' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                    adminTab === tab.id ? 'bg-white/20' : 'bg-amber-500 text-white'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Claims */}
          {filteredClaims.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-slate-500">No claims in this category</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClaims.map(claim => (
                <div
                  key={claim.id}
                  onClick={() => setSelectedClaim(claim)}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">{claim.employeeName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        claim.status === 'approved' ? 'bg-green-100 text-green-700' :
                        claim.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        claim.status === 'pending_finance' ? 'bg-purple-100 text-purple-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {claim.status === 'pending_admin' ? 'Pending Admin' : 
                         claim.status === 'pending_finance' ? 'With Finance' :
                         claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{claim.office} • {claim.items} items • {claim.submittedAt}</p>
                    {claim.flags.length > 0 && (
                      <div className="mt-2">
                        {claim.flags.map((flag, i) => (
                          <span key={i} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded mr-2">⚠️ {flag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-bold text-slate-800">{claim.currency} {claim.total.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Claim Detail Modal */}
        {selectedClaim && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedClaim(null)}>
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{selectedClaim.employeeName}</h2>
                    <p className="text-sm text-slate-500">{selectedClaim.odId} • {selectedClaim.office}</p>
                  </div>
                  <button onClick={() => setSelectedClaim(null)} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="text-sm text-slate-500">Total Amount</div>
                    <div className="text-2xl font-bold text-slate-800">{selectedClaim.currency} {selectedClaim.total.toFixed(2)}</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="text-sm text-slate-500">Items</div>
                    <div className="text-2xl font-bold text-slate-800">{selectedClaim.items}</div>
                  </div>
                </div>

                {selectedClaim.flags.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <strong className="text-red-800 flex items-center gap-2">
                      <span>⚠️</span> Review Flags
                    </strong>
                    <ul className="mt-2 space-y-1">
                      {selectedClaim.flags.map((flag, i) => (
                        <li key={i} className="text-sm text-red-700">• {flag}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                  <strong>💡 In the full version:</strong>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>You would see all receipts attached</li>
                    <li>Click each line item to view receipt image</li>
                    <li>Add comments for specific items</li>
                    <li>Download the expense form as Excel</li>
                  </ul>
                </div>
              </div>

              {(selectedClaim.status === 'pending_admin' || selectedClaim.status === 'pending_finance') && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
                  <button
                    onClick={() => handleReject(selectedClaim.id)}
                    className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-all"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedClaim.id)}
                    className="flex-[2] py-3 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition-all"
                  >
                    {currentUser.role === 'finance' ? 'Approve ✓' : 'Send to Finance →'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'finance';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 py-3 shadow-lg sticky top-0 z-40">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center font-bold shadow-lg">B</div>
            <div>
              <div className="font-semibold text-sm">Berkeley Expenses</div>
              <div className="text-xs text-slate-400">{userOffice?.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">{currentUser.name}</div>
              <div className="text-xs text-slate-400 capitalize">{currentUser.role}</div>
            </div>
            <button
              onClick={() => { setCurrentUser(null); setExpenses([]); }}
              className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-xs font-medium transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-4 pb-20">
        {isAdmin ? <AdminDashboard /> : <EmployeeDashboard />}
      </main>

      {/* Add Expense Modal */}
      {showAddExpense && <AddExpenseModal />}
    </div>
  );
}
