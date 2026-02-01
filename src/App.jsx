import React, { useState } from 'react';

/*
 * ============================================
 * BERKELEY INTERNATIONAL EXPENSE MANAGEMENT SYSTEM
 * Version: 1.2
 * ============================================
 * 
 * CHANGES IN v1.2:
 * - Preview shows full expense claim form layout before submitting
 * - Credit card statement is MANDATORY for foreign currency (blocks submission)
 * - Fixed claims visibility for finance/admin
 * - Everyone can submit their own expenses
 * 
 * TO ADD/EDIT EMPLOYEES:
 * Scroll down to the EMPLOYEES section and edit the list.
 */

// ============================================
// EMPLOYEES - EDIT THIS LIST TO ADD/REMOVE PEOPLE
// ============================================
const EMPLOYEES = [
  // DUBAI OFFICE (DXB)
  { id: 1, name: 'Chris Frame', office: 'DXB', role: 'employee' },
  { id: 2, name: 'Keisha Whitehorne', office: 'DXB', role: 'employee' },
  { id: 3, name: 'Farah Ahmed', office: 'DXB', role: 'employee', reimburseCurrency: 'GBP' },
  { id: 4, name: 'Mouna Hassan', office: 'DXB', role: 'employee', reimburseCurrency: 'GBP' },
  { id: 5, name: 'Christine Tan', office: 'DXB', role: 'admin' },
  { id: 6, name: 'Cathy He', office: 'DXB', role: 'admin' },
  
  // HONG KONG OFFICE (HKG)
  { id: 10, name: 'Kate Tai', office: 'HKG', role: 'employee' },
  { id: 11, name: 'Anthony Jurenko', office: 'HKG', role: 'employee' },
  { id: 12, name: 'Lisa Wong', office: 'HKG', role: 'admin' },
  
  // SINGAPORE OFFICE (SIN)
  { id: 20, name: 'Joanne Chee', office: 'SIN', role: 'employee' },
  { id: 21, name: 'Karen Lim', office: 'SIN', role: 'admin' },
  { id: 22, name: 'Ong Yongle', office: 'SIN', role: 'finance' },
  { id: 23, name: 'Emma Fowler', office: 'SIN', role: 'finance' },
  
  // BANGKOK OFFICE (BKK)
  { id: 30, name: 'Somchai Prasert', office: 'BKK', role: 'employee' },
  { id: 31, name: 'Nattaya Srisuk', office: 'BKK', role: 'admin' },
  
  // CHINA - SHANGHAI (SHA)
  { id: 40, name: 'Wei Chen', office: 'SHA', role: 'employee' },
  { id: 41, name: 'Zhang Li', office: 'SHA', role: 'admin' },
  
  // CHINA - BEIJING (BEJ)
  { id: 50, name: 'Li Ming', office: 'BEJ', role: 'employee' },
  
  // CHINA - CHENGDU (CHE)
  { id: 60, name: 'Wang Fang', office: 'CHE', role: 'employee' },
  
  // CHINA - SHENZHEN (SHE)
  { id: 70, name: 'Chen Wei', office: 'SHE', role: 'employee' },
];

// ============================================
// SYSTEM CONFIGURATION - DO NOT EDIT UNLESS YOU KNOW WHAT YOU'RE DOING
// ============================================
const EXPENSE_CATEGORIES = {
  A: { name: 'Petrol Expenditure', subcategories: ['Full Petrol Allowance / Fuel Card', 'Business Mileage'], icon: '⛽', requiresAttendees: false },
  B: { name: 'Parking', subcategories: ['Off-Street Parking'], icon: '🅿️', requiresAttendees: false },
  C: { name: 'Travel Expenses', subcategories: ['Public Transport', 'Taxis', 'Tolls', 'Congestion Charging', 'Subsistence'], icon: '🚕', requiresAttendees: false },
  D: { name: 'Vehicle Repairs', subcategories: ['Repairs', 'Parts'], icon: '🔧', requiresAttendees: false },
  E: { name: 'Entertaining', subcategories: ['Customers (Staff & Customers)', 'Employees Only'], icon: '🍽️', requiresAttendees: true },
  F: { name: 'Welfare', subcategories: ['Hotel Accommodation', 'Gifts to Employees', 'Corporate Gifts'], icon: '🏨', requiresAttendees: true },
  G: { name: 'Subscriptions', subcategories: ['Professional', 'Non-Professional', 'Newspapers/Magazines'], icon: '📰', requiresAttendees: false },
  H: { name: 'Computer Costs', subcategories: ['All Items'], icon: '💻', requiresAttendees: false },
  I: { name: 'WIP / Other', subcategories: ['WIP', 'Miscellaneous Vatable Items'], icon: '📦', requiresAttendees: false }
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

const CURRENCIES = ['SGD', 'HKD', 'CNY', 'THB', 'AED', 'GBP', 'USD', 'EUR', 'MYR', 'JPY', 'SAR'];

// Helper functions
const formatCurrency = (amount, currency) => `${currency} ${parseFloat(amount || 0).toFixed(2)}`;
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};
const isOlderThan2Months = (dateStr) => {
  const expenseDate = new Date(dateStr);
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  return expenseDate < twoMonthsAgo;
};

// ============================================
// MAIN APPLICATION
// ============================================
export default function BerkeleyExpenseSystem() {
  const [currentUser, setCurrentUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [claims, setClaims] = useState([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showStatementUpload, setShowStatementUpload] = useState(false);
  const [creditCardStatement, setCreditCardStatement] = useState(null);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [activeTab, setActiveTab] = useState('my_expenses');

  // Derived values
  const getUserOffice = (user) => OFFICES.find(o => o.code === user?.office);
  const userOffice = getUserOffice(currentUser);
  const pendingExpenses = expenses.filter(e => e.status === 'draft');
  const totalPendingAmount = pendingExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  
  // Check for foreign currency
  const isForeignCurrency = (currency) => {
    if (!currentUser) return false;
    const userCurrency = currentUser.reimburseCurrency || getUserOffice(currentUser)?.currency;
    return currency !== userCurrency;
  };
  const foreignCurrencyExpenses = pendingExpenses.filter(e => e.isForeignCurrency);
  const hasForeignCurrency = foreignCurrencyExpenses.length > 0;
  const hasOldExpenses = pendingExpenses.some(e => e.isOld);

  // Get next reference number
  const getNextRef = (category) => {
    const catExpenses = pendingExpenses.filter(e => e.category === category);
    return `${category}${catExpenses.length + 1}`;
  };

  // Get claims visible to current user based on role
  const getVisibleClaims = () => {
    if (!currentUser) return [];
    if (currentUser.role === 'finance') {
      // Finance sees ALL claims
      return claims;
    } else if (currentUser.role === 'admin') {
      // Admin sees their own + their office's claims
      const userOfficeCode = currentUser.office;
      return claims.filter(c => {
        const claimEmployee = EMPLOYEES.find(e => e.id === c.employeeId);
        return c.employeeId === currentUser.id || claimEmployee?.office === userOfficeCode;
      });
    } else {
      // Employee sees only their own
      return claims.filter(c => c.employeeId === currentUser.id);
    }
  };

  // ============================================
  // LOGIN SCREEN
  // ============================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-lg">B</div>
            <h1 className="text-2xl font-bold text-slate-800">Berkeley Expenses</h1>
            <p className="text-slate-500 text-sm mt-2">Select your name to continue</p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-600 mb-2">Your Name</label>
            <select
              className="w-full p-4 border-2 border-slate-200 rounded-xl text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
              onChange={(e) => {
                const user = EMPLOYEES.find(emp => emp.id === parseInt(e.target.value));
                if (user) setCurrentUser(user);
              }}
              defaultValue=""
            >
              <option value="" disabled>-- Select your name --</option>
              {OFFICES.map(office => {
                const officeEmployees = EMPLOYEES.filter(e => e.office === office.code);
                if (officeEmployees.length === 0) return null;
                return (
                  <optgroup key={office.code} label={`📍 ${office.name}`}>
                    {officeEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} {emp.role !== 'employee' ? `(${emp.role})` : ''}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>

          <p className="text-center text-xs text-slate-400 mt-8">
            Berkeley International Expense Management System v1.2
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

    const needsAttendees = EXPENSE_CATEGORIES[formData.category]?.requiresAttendees;
    const isChina = userOffice?.country === 'China';

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">Add Expense</h2>
              <p className="text-blue-100 text-sm">Step {step} of 2</p>
            </div>
            <button onClick={() => setShowAddExpense(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">✕</button>
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
                {isChina && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                    <strong>🇨🇳 China offices:</strong> Remember to upload both the fapiao AND the itemized receipt for meals.
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {receiptPreview && (
                  <div className="relative">
                    <img src={receiptPreview} alt="Receipt" className="w-full h-40 object-contain bg-slate-100 rounded-xl" />
                    <button onClick={() => { setStep(1); setReceiptFile(null); setReceiptPreview(null); }} className="absolute top-2 right-2 bg-white/90 hover:bg-white px-3 py-1 rounded-lg text-sm font-medium shadow">📷 Retake</button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Merchant / Vendor *</label>
                  <input type="text" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none" placeholder="e.g., Uber, Restaurant Name" value={formData.merchant} onChange={e => setFormData(prev => ({ ...prev, merchant: e.target.value }))} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Amount *</label>
                    <input type="number" step="0.01" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none" placeholder="0.00" value={formData.amount} onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Currency *</label>
                    <select className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none bg-white" value={formData.currency} onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {isForeignCurrency(formData.currency) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2">
                    <span>💳</span>
                    <span><strong>Foreign currency</strong> - You MUST upload your credit card statement before submitting your claim.</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Date of Expense *</label>
                  <input type="date" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none" value={formData.date} onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))} />
                </div>

                {isOlderThan2Months(formData.date) && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800 flex items-start gap-2">
                    <span>⚠️</span>
                    <span>This expense is older than 2 months. It will require Cathy's approval.</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Category *</label>
                  <select className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none bg-white" value={formData.category} onChange={e => setFormData(prev => ({ ...prev, category: e.target.value, subcategory: EXPENSE_CATEGORIES[e.target.value].subcategories[0] }))}>
                    {Object.entries(EXPENSE_CATEGORIES).map(([key, val]) => (
                      <option key={key} value={key}>{val.icon} {key}. {val.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Sub-category *</label>
                  <select className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none bg-white" value={formData.subcategory} onChange={e => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}>
                    {EXPENSE_CATEGORIES[formData.category].subcategories.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Description / Purpose *</label>
                  <input type="text" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none" placeholder="e.g., Taxi to client meeting" value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} />
                </div>

                {needsAttendees && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Attendees * (Name & Company)</label>
                      <textarea className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none resize-none" rows={2} placeholder="e.g., John Smith (ABC Corp), Jane Doe (XYZ Ltd)" value={formData.attendees} onChange={e => setFormData(prev => ({ ...prev, attendees: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Number of Guests</label>
                      <input type="number" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none" placeholder="e.g., 4" value={formData.numberOfGuests} onChange={e => setFormData(prev => ({ ...prev, numberOfGuests: e.target.value }))} />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50">
            {step === 2 && (
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border-2 border-slate-300 font-semibold text-slate-600 hover:bg-slate-100">← Back</button>
                <button onClick={handleSave} disabled={!formData.merchant || !formData.amount || !formData.date || !formData.description || (needsAttendees && !formData.attendees)} className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
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
  // PREVIEW CLAIM MODAL - Shows full expense form layout
  // ============================================
  const PreviewClaimModal = () => {
    const groupedExpenses = pendingExpenses.reduce((acc, exp) => {
      if (!acc[exp.category]) acc[exp.category] = [];
      acc[exp.category].push(exp);
      return acc;
    }, {});

    const canSubmit = !hasForeignCurrency || (hasForeignCurrency && creditCardStatement);

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-5 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">📋 Preview Expense Claim Form</h2>
              <p className="text-green-100 text-sm">Review everything before submitting</p>
            </div>
            <button onClick={() => setShowPreview(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">✕</button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Form Header - Like the Excel template */}
            <div className="border-2 border-slate-300 rounded-xl p-4 mb-6 bg-slate-50">
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-slate-800">BERKELEY INTERNATIONAL</h3>
                <p className="text-slate-600">EXPENSE CLAIM FORM</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex">
                  <span className="text-slate-500 w-24">Name:</span>
                  <span className="font-semibold">{currentUser.name}</span>
                </div>
                <div className="flex">
                  <span className="text-slate-500 w-24">Office:</span>
                  <span className="font-semibold">{userOffice?.name}</span>
                </div>
                <div className="flex">
                  <span className="text-slate-500 w-24">Date:</span>
                  <span className="font-semibold">{formatDate(new Date().toISOString())}</span>
                </div>
                <div className="flex">
                  <span className="text-slate-500 w-24">Currency:</span>
                  <span className="font-semibold">{userOffice?.currency}</span>
                </div>
              </div>
            </div>

            {/* Category Sections - Like Excel tabs */}
            {Object.entries(groupedExpenses).sort(([a], [b]) => a.localeCompare(b)).map(([cat, exps]) => {
              const catTotal = exps.reduce((sum, e) => sum + e.amount, 0);
              return (
                <div key={cat} className="mb-6 border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-blue-50 px-4 py-3 flex justify-between items-center border-b border-slate-200">
                    <h3 className="font-bold text-slate-800">{EXPENSE_CATEGORIES[cat].icon} {cat}. {EXPENSE_CATEGORIES[cat].name}</h3>
                    <span className="font-bold text-blue-700">{formatCurrency(catTotal, userOffice?.currency)}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="text-left py-2 px-3 font-semibold text-slate-600 w-16">Ref</th>
                          <th className="text-left py-2 px-3 font-semibold text-slate-600 w-24">Date</th>
                          <th className="text-left py-2 px-3 font-semibold text-slate-600">Merchant</th>
                          <th className="text-left py-2 px-3 font-semibold text-slate-600">Description</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-600 w-28">Amount</th>
                          <th className="text-center py-2 px-3 font-semibold text-slate-600 w-20">Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exps.map((exp, idx) => (
                          <tr key={exp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="py-2 px-3">
                              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">{exp.ref}</span>
                            </td>
                            <td className="py-2 px-3 text-slate-600">{formatDate(exp.date)}</td>
                            <td className="py-2 px-3 font-medium text-slate-800">{exp.merchant}</td>
                            <td className="py-2 px-3 text-slate-600">
                              {exp.description}
                              {exp.attendees && <div className="text-xs text-slate-400 mt-1">👥 {exp.attendees}</div>}
                            </td>
                            <td className="py-2 px-3 text-right font-medium">
                              {formatCurrency(exp.amount, exp.currency)}
                              {exp.isForeignCurrency && <span className="ml-1 text-amber-600 text-xs">FCY</span>}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="text-green-600">✓ {exp.ref}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Summary */}
            <div className="border-2 border-slate-300 rounded-xl p-4 bg-slate-50">
              <div className="flex justify-between items-center text-lg">
                <span className="font-bold text-slate-800">TOTAL CLAIM AMOUNT:</span>
                <span className="font-bold text-2xl text-blue-700">{formatCurrency(totalPendingAmount, userOffice?.currency)}</span>
              </div>
              <div className="mt-2 text-sm text-slate-500">
                {pendingExpenses.length} receipt(s) attached, labelled {pendingExpenses.map(e => e.ref).join(', ')}
              </div>
            </div>

            {/* Warnings */}
            {hasOldExpenses && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-800 font-semibold">⚠️ Contains Expenses Older Than 2 Months</p>
                <p className="text-red-700 text-sm mt-1">This claim requires Cathy's approval.</p>
              </div>
            )}

            {/* Credit Card Statement Section */}
            {hasForeignCurrency && (
              <div className={`mt-4 rounded-xl p-4 ${creditCardStatement ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                {creditCardStatement ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-800 font-semibold">✅ Credit Card Statement Attached</p>
                      <p className="text-green-700 text-sm mt-1">{creditCardStatement.name}</p>
                    </div>
                    <button onClick={() => setCreditCardStatement(null)} className="text-green-600 hover:text-green-800 text-sm underline">Remove</button>
                  </div>
                ) : (
                  <div>
                    <p className="text-red-800 font-semibold">❌ Credit Card Statement REQUIRED</p>
                    <p className="text-red-700 text-sm mt-1">You have foreign currency expenses. You must upload your credit card statement before submitting.</p>
                    <p className="text-red-700 text-sm mt-2">
                      Foreign currency items: {foreignCurrencyExpenses.map(e => `${e.ref} (${e.currency})`).join(', ')}
                    </p>
                    <button 
                      onClick={() => { setShowPreview(false); setShowStatementUpload(true); }}
                      className="mt-3 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-semibold"
                    >
                      📎 Upload Statement Now
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
            <button onClick={() => setShowPreview(false)} className="flex-1 py-3 rounded-xl border-2 border-slate-300 font-semibold text-slate-600 hover:bg-slate-100">
              ← Back to Edit
            </button>
            <button 
              onClick={() => { handleSubmitClaim(); setShowPreview(false); }} 
              disabled={!canSubmit}
              className={`flex-[2] py-3 rounded-xl font-semibold shadow-lg ${
                canSubmit 
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-xl' 
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              {canSubmit ? 'Submit Claim ✓' : '⚠️ Upload Statement First'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // CREDIT CARD STATEMENT UPLOAD MODAL
  // ============================================
  const StatementUploadModal = () => {
    const [file, setFile] = useState(null);

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-5 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">💳 Credit Card Statement</h2>
              <p className="text-amber-100 text-sm">Required for foreign currency claims</p>
            </div>
            <button onClick={() => setShowStatementUpload(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">✕</button>
          </div>

          <div className="p-6">
            <p className="text-slate-600 mb-4">Upload your credit card statement showing the local currency equivalent for:</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              {foreignCurrencyExpenses.map(exp => (
                <div key={exp.id} className="text-sm text-amber-800">
                  • {exp.ref}: {exp.merchant} - {formatCurrency(exp.amount, exp.currency)}
                </div>
              ))}
            </div>

            <label className={`block border-3 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${file ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50'}`}>
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
              {file ? (
                <>
                  <div className="text-4xl mb-2">✅</div>
                  <p className="font-semibold text-green-700">{file.name}</p>
                  <p className="text-sm text-green-600 mt-1">Click to change</p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-2">📄</div>
                  <p className="font-semibold text-slate-600">Upload statement</p>
                  <p className="text-sm text-slate-400 mt-1">PDF or image</p>
                </>
              )}
            </label>
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
            <button onClick={() => setShowStatementUpload(false)} className="flex-1 py-3 rounded-xl border-2 border-slate-300 font-semibold text-slate-600">Cancel</button>
            <button 
              onClick={() => { setCreditCardStatement(file); setShowStatementUpload(false); setShowPreview(true); }} 
              disabled={!file} 
              className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Preview ✓
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // SUBMIT CLAIM FUNCTION
  // ============================================
  const handleSubmitClaim = () => {
    const claimNumber = claims.length + 1;
    const newClaim = {
      id: Date.now(),
      odId: `EXP-2026-${String(claimNumber).padStart(3, '0')}`,
      employeeName: currentUser.name,
      employeeId: currentUser.id,
      office: userOffice?.name,
      officeCode: currentUser.office,
      currency: userOffice?.currency,
      total: totalPendingAmount,
      items: pendingExpenses.length,
      status: 'pending_review',
      submittedAt: new Date().toISOString().split('T')[0],
      flags: hasOldExpenses ? ['Contains expenses older than 2 months'] : [],
      expenses: [...pendingExpenses],
      creditCardStatement: creditCardStatement?.name || null
    };
    
    setClaims(prev => [newClaim, ...prev]);
    setExpenses([]);
    setCreditCardStatement(null);
  };

  // ============================================
  // MY EXPENSES TAB
  // ============================================
  const MyExpensesTab = () => {
    const myClaims = claims.filter(c => c.employeeId === currentUser.id);

    const groupedExpenses = pendingExpenses.reduce((acc, exp) => {
      if (!acc[exp.category]) acc[exp.category] = [];
      acc[exp.category].push(exp);
      return acc;
    }, {});

    return (
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="text-4xl font-bold text-slate-800">{pendingExpenses.length}</div>
            <div className="text-sm text-slate-500 mt-1">Pending Receipts</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{formatCurrency(totalPendingAmount, userOffice?.currency)}</div>
            <div className="text-sm text-slate-500 mt-1">Total Amount</div>
          </div>
        </div>

        {/* Warnings */}
        {hasForeignCurrency && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-xl">💳</span>
            <div>
              <strong className="text-amber-800">Foreign Currency Expenses</strong>
              <p className="text-sm text-amber-700 mt-1">You MUST upload your credit card statement before submitting.</p>
            </div>
          </div>
        )}

        {hasOldExpenses && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <strong className="text-red-800">Old Expenses</strong>
              <p className="text-sm text-red-700 mt-1">Some expenses are older than 2 months and require Cathy's approval.</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-800 mb-4">⚡ Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setShowAddExpense(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
              📸 Add Receipt
            </button>
            {pendingExpenses.length > 0 && (
              <button onClick={() => setShowPreview(true)} className="bg-white border-2 border-green-500 text-green-600 px-6 py-3 rounded-xl font-semibold hover:bg-green-50 transition-all flex items-center gap-2">
                📋 Preview & Submit ({pendingExpenses.length})
              </button>
            )}
          </div>
        </div>

        {/* Pending Expenses */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-800 mb-4">📋 Pending Expenses ({pendingExpenses.length})</h3>

          {pendingExpenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-slate-500 font-medium">No pending expenses</p>
              <p className="text-sm text-slate-400 mt-1">Tap "Add Receipt" to get started</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedExpenses).sort(([a], [b]) => a.localeCompare(b)).map(([cat, exps]) => (
                <div key={cat}>
                  <h4 className="text-sm font-semibold text-slate-500 mb-3">{EXPENSE_CATEGORIES[cat].icon} {cat}. {EXPENSE_CATEGORIES[cat].name}</h4>
                  <div className="space-y-2">
                    {exps.map(exp => (
                      <div key={exp.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-lg">{exp.ref}</span>
                            <span className="font-semibold text-slate-800 truncate">{exp.merchant}</span>
                            {exp.isForeignCurrency && <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-lg">FCY</span>}
                            {exp.isOld && <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-lg">&gt;2mo</span>}
                          </div>
                          <p className="text-sm text-slate-500 mt-1 truncate">{exp.description}</p>
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-bold text-slate-800">{formatCurrency(exp.amount, exp.currency)}</div>
                          <button onClick={() => setExpenses(prev => prev.filter(e => e.id !== exp.id))} className="text-xs text-red-500 hover:text-red-700 mt-1">Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Submitted Claims */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-800 mb-4">📁 My Submitted Claims</h3>
          {myClaims.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No submitted claims yet</p>
          ) : (
            <div className="space-y-2">
              {myClaims.map(claim => (
                <div key={claim.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{claim.odId}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        claim.status === 'approved' ? 'bg-green-100 text-green-700' :
                        claim.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {claim.status === 'pending_review' ? 'Pending Review' : claim.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{claim.items} items • {claim.submittedAt}</p>
                  </div>
                  <div className="font-bold text-slate-800">{formatCurrency(claim.total, claim.currency)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // REVIEW CLAIMS TAB (Admin/Finance only)
  // ============================================
  const ReviewClaimsTab = () => {
    const visibleClaims = getVisibleClaims();
    const pendingClaims = visibleClaims.filter(c => c.status === 'pending_review');

    const handleApprove = (claimId) => {
      setClaims(prev => prev.map(c => c.id === claimId ? { ...c, status: 'approved', reviewedBy: currentUser.name } : c));
      setSelectedClaim(null);
    };

    const handleReject = (claimId) => {
      setClaims(prev => prev.map(c => c.id === claimId ? { ...c, status: 'rejected', reviewedBy: currentUser.name } : c));
      setSelectedClaim(null);
    };

    return (
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-lg p-5 text-center">
            <div className="text-3xl font-bold text-amber-500">{pendingClaims.length}</div>
            <div className="text-xs text-slate-500 mt-1">Pending Review</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-5 text-center">
            <div className="text-3xl font-bold text-green-500">{visibleClaims.filter(c => c.status === 'approved').length}</div>
            <div className="text-xs text-slate-500 mt-1">Approved</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-5 text-center">
            <div className="text-3xl font-bold text-red-500">{visibleClaims.filter(c => c.status === 'rejected').length}</div>
            <div className="text-xs text-slate-500 mt-1">Rejected</div>
          </div>
        </div>

        {/* Claims to Review */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-800 mb-4">📊 Claims to Review</h3>

          {pendingClaims.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-slate-500">No pending claims to review</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingClaims.map(claim => (
                <div key={claim.id} onClick={() => setSelectedClaim(claim)} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-300 cursor-pointer transition-all">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{claim.employeeName}</span>
                      <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">Pending</span>
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
                    <div className="font-bold text-slate-800">{formatCurrency(claim.total, claim.currency)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Claims History */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-800 mb-4">📁 All Claims</h3>
          <div className="space-y-2">
            {visibleClaims.filter(c => c.status !== 'pending_review').map(claim => (
              <div key={claim.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{claim.employeeName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      claim.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {claim.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{claim.office} • {claim.items} items</p>
                </div>
                <div className="font-bold text-slate-800">{formatCurrency(claim.total, claim.currency)}</div>
              </div>
            ))}
          </div>
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
                    <div className="text-2xl font-bold text-slate-800">{formatCurrency(selectedClaim.total, selectedClaim.currency)}</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="text-sm text-slate-500">Items</div>
                    <div className="text-2xl font-bold text-slate-800">{selectedClaim.items}</div>
                  </div>
                </div>

                {selectedClaim.flags.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <strong className="text-red-800">⚠️ Review Flags</strong>
                    <ul className="mt-2 space-y-1">
                      {selectedClaim.flags.map((flag, i) => (
                        <li key={i} className="text-sm text-red-700">• {flag}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedClaim.creditCardStatement && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <strong className="text-blue-800">💳 Credit Card Statement</strong>
                    <p className="text-sm text-blue-700 mt-1">{selectedClaim.creditCardStatement}</p>
                  </div>
                )}

                {/* Show line items */}
                {selectedClaim.expenses && selectedClaim.expenses.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2 font-semibold text-sm text-slate-600">Line Items</div>
                    <div className="divide-y divide-slate-100">
                      {selectedClaim.expenses.map(exp => (
                        <div key={exp.id} className="px-4 py-3 flex justify-between items-center">
                          <div>
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded mr-2">{exp.ref}</span>
                            <span className="font-medium text-slate-800">{exp.merchant}</span>
                            <p className="text-xs text-slate-500 mt-1">{exp.description}</p>
                          </div>
                          <span className="font-semibold">{formatCurrency(exp.amount, exp.currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedClaim.status === 'pending_review' && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
                  <button onClick={() => handleReject(selectedClaim.id)} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600">Reject</button>
                  <button onClick={() => handleApprove(selectedClaim.id)} className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold shadow-lg">Approve ✓</button>
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
  const canReview = currentUser.role === 'admin' || currentUser.role === 'finance';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 py-3 shadow-lg sticky top-0 z-40">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center font-bold shadow-lg">B</div>
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
            <button onClick={() => { setCurrentUser(null); setExpenses([]); setCreditCardStatement(null); setActiveTab('my_expenses'); }} className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-xs font-medium">Logout</button>
          </div>
        </div>
      </header>

      {/* Tabs (for admin/finance) */}
      {canReview && (
        <div className="bg-white border-b border-slate-200 sticky top-14 z-30">
          <div className="max-w-3xl mx-auto flex">
            <button onClick={() => setActiveTab('my_expenses')} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'my_expenses' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              📋 My Expenses
            </button>
            <button onClick={() => setActiveTab('review')} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'review' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              👀 Review Claims
              {getVisibleClaims().filter(c => c.status === 'pending_review').length > 0 && (
                <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {getVisibleClaims().filter(c => c.status === 'pending_review').length}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-4 pb-20">
        {canReview && activeTab === 'review' ? <ReviewClaimsTab /> : <MyExpensesTab />}
      </main>

      {/* Modals */}
      {showAddExpense && <AddExpenseModal />}
      {showPreview && <PreviewClaimModal />}
      {showStatementUpload && <StatementUploadModal />}
    </div>
  );
}
