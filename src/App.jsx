import React, { useState, useEffect } from 'react';

/*
 * ============================================
 * BERKELEY INTERNATIONAL EXPENSE MANAGEMENT SYSTEM
 * Version: 1.4 - With Excel Download
 * ============================================
 * 
 * SUPABASE CONNECTION
 */
const SUPABASE_URL = 'https://wlhoyjsicvkncfjbexoi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsaG95anNpY3ZrbmNmamJleG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNzIyMzcsImV4cCI6MjA4NTg0ODIzN30.AB-W5DjcmCl6fnWiQ2reD0rgDIJiMCGymc994fSJplw';

// Simple Supabase client
const supabase = {
  from: (table) => ({
    select: async (columns = '*') => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${columns}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      const data = await res.json();
      return { data, error: res.ok ? null : data };
    },
    insert: async (rows) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(rows)
      });
      const data = await res.json();
      return { data, error: res.ok ? null : data };
    },
    update: async (updates) => ({
      eq: async (column, value) => {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${value}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(updates)
        });
        const data = await res.json();
        return { data, error: res.ok ? null : data };
      }
    }),
    delete: async () => ({
      eq: async (column, value) => {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${value}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });
        return { error: res.ok ? null : 'Delete failed' };
      }
    })
  })
};

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
// CONFIGURATION
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
const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
};
const isOlderThan2Months = (dateStr) => {
  const expenseDate = new Date(dateStr);
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  return expenseDate < twoMonthsAgo;
};
const getMonthYear = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
};

// ============================================
// EXCEL EXPORT FUNCTION
// ============================================
const generateExcelFile = async (claim, userName, officeName) => {
  // Dynamically load SheetJS
  const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
  
  const expenses = claim.expenses || [];
  
  // Group expenses by category
  const groupedExpenses = expenses.reduce((acc, exp) => {
    if (!acc[exp.category]) acc[exp.category] = [];
    acc[exp.category].push(exp);
    return acc;
  }, {});

  // Calculate totals by subcategory
  const getSubcategoryTotal = (cat, subcat) => {
    return (groupedExpenses[cat] || [])
      .filter(e => e.subcategory === subcat)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const getCategoryTotal = (cat) => {
    return (groupedExpenses[cat] || []).reduce((sum, e) => sum + e.amount, 0);
  };

  // ===== SHEET 1: Summary =====
  const summaryData = [
    ['', '', 'Motor & Expense Claim Form', '', '', 'Account Code', 'Document Number'],
    ['', '', 'Berkeley London Residential Ltd', '', '', 'Accounts Use Only', ''],
    [''],
    ['Name', userName, '', 'Month', getMonthYear(expenses[0]?.date || new Date().toISOString())],
    ['Office', officeName, '', '', ''],
    [''],
    ['Expenses claim', '', '', '', '', '', 'Total'],
    [''],
    ['', 'Motor Vehicle Expenditure'],
    ['A.', 'Petrol Expenditure', 'Full Petrol Allowance / Fuel Card Holders', '', '', '', getCategoryTotal('A')],
    ['', '', 'Business Mileage Return (As Attached)', '', '', '', 0],
    ['B.', 'Parking', 'Off-Street Parking', '', '', '', getCategoryTotal('B')],
    ['C.', 'Travel Expenses', 'Public Transport (Trains, Tubes, Buses etc.)', '', '', '', getSubcategoryTotal('C', 'Public Transport')],
    ['', '', 'Taxis', '', '', '', getSubcategoryTotal('C', 'Taxis')],
    ['', '', 'Tolls', '', '', '', getSubcategoryTotal('C', 'Tolls')],
    ['', '', 'Congestion Charging', '', '', '', getSubcategoryTotal('C', 'Congestion Charging')],
    ['', '', 'Subsistence (meals while away from office)', '', '', '', getSubcategoryTotal('C', 'Subsistence')],
    ['D.', 'Vehicle Repairs', 'Repairs', '', '', '', getSubcategoryTotal('D', 'Repairs')],
    ['', '', 'Parts', '', '', '', getSubcategoryTotal('D', 'Parts')],
    [''],
    ['', 'Business Expenditure'],
    ['E.', 'Entertaining', 'Customers (Staff & Customers)', '', '', '', getSubcategoryTotal('E', 'Customers (Staff & Customers)')],
    ['', '', 'Employees (Must be only Staff present)', '', '', '', getSubcategoryTotal('E', 'Employees Only')],
    ['F.', 'Welfare', 'Hotel Accommodation', '', '', '', getSubcategoryTotal('F', 'Hotel Accommodation')],
    ['', '', 'Gifts to Employees', '', '', '', getSubcategoryTotal('F', 'Gifts to Employees')],
    ['', '', 'Corporate Gifts', '', '', '', getSubcategoryTotal('F', 'Corporate Gifts')],
    ['G.', 'Subscriptions', 'Professional / Non-Professional / Newspapers', '', '', '', getCategoryTotal('G')],
    ['H.', 'Computer Costs', 'All items', '', '', '', getCategoryTotal('H')],
    ['I.', 'WIP', 'All items', '', '', '', getCategoryTotal('I')],
    ['I.', 'Other', 'Miscellaneous Vatable Items', '', '', '', 0],
    [''],
    ['', '', '', '', 'Total expenses claimed', '', claim.total_amount],
    [''],
    ['Signature of Claimant', '', '', '', 'Date', formatDate(claim.submitted_at)],
    ['Authorised', '', '', '', '', ''],
  ];

  // ===== SHEET 2: Travel Expense Detail =====
  const travelExpenses = [...(groupedExpenses['B'] || []), ...(groupedExpenses['C'] || []), ...(groupedExpenses['D'] || [])];
  const travelData = [
    ['Travel Expense Detail'],
    ['Name', userName, '', '', '', '', '', '', '', '', '', 'Please do not include any travel expenses associated with Employee Entertaining'],
    [''],
    ['Receipt No', 'VAT', 'B. Parking', 'Public Transport', 'Taxis', 'Tolls', 'Cong Chg', 'Subsistence', 'Repairs', 'Parts', 'Full Description'],
    ...travelExpenses.map(exp => [
      exp.ref,
      '*',
      exp.category === 'B' ? exp.amount : '',
      exp.subcategory === 'Public Transport' ? exp.amount : '',
      exp.subcategory === 'Taxis' ? exp.amount : '',
      exp.subcategory === 'Tolls' ? exp.amount : '',
      exp.subcategory === 'Congestion Charging' ? exp.amount : '',
      exp.subcategory === 'Subsistence' ? exp.amount : '',
      exp.subcategory === 'Repairs' ? exp.amount : '',
      exp.subcategory === 'Parts' ? exp.amount : '',
      exp.description
    ]),
    [''],
    ['Totals', '', 
      getCategoryTotal('B'),
      getSubcategoryTotal('C', 'Public Transport'),
      getSubcategoryTotal('C', 'Taxis'),
      getSubcategoryTotal('C', 'Tolls'),
      getSubcategoryTotal('C', 'Congestion Charging'),
      getSubcategoryTotal('C', 'Subsistence'),
      getSubcategoryTotal('D', 'Repairs'),
      getSubcategoryTotal('D', 'Parts'),
      `${claim.currency} ${(getCategoryTotal('B') + getCategoryTotal('C') + getCategoryTotal('D')).toFixed(2)}`
    ]
  ];

  // ===== SHEET 3: Entertaining & Welfare Detail =====
  const entertainingExpenses = [...(groupedExpenses['E'] || []), ...(groupedExpenses['F'] || [])];
  const entertainingData = [
    ['Entertaining and Welfare Detail'],
    ['PLEASE ENSURE A FULL LIST OF GUESTS ENTERTAINED ARE SUPPLIED WITH EACH RECEIPT STATING WHO THEY ARE EMPLOYED BY.'],
    ['Name', userName],
    [''],
    ['Receipt No', 'E. Employee Entertaining', '', '', 'E. Business Entertaining', '', '', 'F. Welfare', '', '', 'Full Description'],
    ['', 'Meals/Drinks', 'Accomodation', 'Other', 'Meals/Drinks', 'Accomodation', 'Other', 'Hotels', 'Employee Gifts', 'Corporate Gifts', ''],
    ...entertainingExpenses.map(exp => {
      const isEmployeeEntertaining = exp.category === 'E' && exp.subcategory?.includes('Employee');
      const isBusinessEntertaining = exp.category === 'E' && exp.subcategory?.includes('Customer');
      const isHotel = exp.category === 'F' && exp.subcategory?.includes('Hotel');
      const isEmployeeGift = exp.category === 'F' && exp.subcategory?.includes('Gifts to Employees');
      const isCorporateGift = exp.category === 'F' && exp.subcategory?.includes('Corporate');
      
      return [
        exp.ref,
        isEmployeeEntertaining ? exp.amount : '',
        '',
        '',
        isBusinessEntertaining ? exp.amount : '',
        '',
        '',
        isHotel ? exp.amount : '',
        isEmployeeGift ? exp.amount : '',
        isCorporateGift ? exp.amount : '',
        `${exp.merchant}${exp.attendees ? ' - ' + exp.attendees : ''}`
      ];
    }),
    [''],
    ['Totals', 
      getSubcategoryTotal('E', 'Employees Only'), '', '',
      getSubcategoryTotal('E', 'Customers (Staff & Customers)'), '', '',
      getSubcategoryTotal('F', 'Hotel Accommodation'),
      getSubcategoryTotal('F', 'Gifts to Employees'),
      getSubcategoryTotal('F', 'Corporate Gifts'),
      `${claim.currency} ${(getCategoryTotal('E') + getCategoryTotal('F')).toFixed(2)}`
    ]
  ];

  // ===== SHEET 4: All Receipts =====
  const receiptsData = [
    ['Attached Receipts'],
    [''],
    ['Ref', 'Date', 'Merchant', 'Category', 'Subcategory', 'Amount', 'Currency', 'Description', 'Attendees'],
    ...expenses.map(exp => [
      exp.ref,
      formatShortDate(exp.date),
      exp.merchant,
      EXPENSE_CATEGORIES[exp.category]?.name || exp.category,
      exp.subcategory,
      exp.amount,
      exp.currency,
      exp.description,
      exp.attendees || ''
    ])
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();
  
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  ws1['!cols'] = [{ wch: 5 }, { wch: 18 }, { wch: 35 }, { wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Summary');
  
  const ws2 = XLSX.utils.aoa_to_sheet(travelData);
  ws2['!cols'] = [{ wch: 10 }, { wch: 5 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Travel Detail');
  
  const ws3 = XLSX.utils.aoa_to_sheet(entertainingData);
  ws3['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Entertaining Detail');
  
  const ws4 = XLSX.utils.aoa_to_sheet(receiptsData);
  ws4['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 10 }, { wch: 8 }, { wch: 35 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws4, 'All Receipts');

  // Generate and download
  const fileName = `${claim.claim_number}_${userName.replace(/\s+/g, '_')}_${formatDate(claim.submitted_at).replace(/\s+/g, '')}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// ============================================
// MAIN APPLICATION
// ============================================
export default function BerkeleyExpenseSystem() {
  const [currentUser, setCurrentUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showStatementUpload, setShowStatementUpload] = useState(false);
  const [creditCardStatement, setCreditCardStatement] = useState(null);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [activeTab, setActiveTab] = useState('my_expenses');
  const [previewPage, setPreviewPage] = useState(0);

  // Load claims from database
  const loadClaims = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('claims').select('*');
      if (error) {
        console.error('Error loading claims:', error);
      } else {
        setClaims(data || []);
      }
    } catch (err) {
      console.error('Failed to load claims:', err);
    }
    setLoading(false);
  };

  // Load claims on mount and when user changes
  useEffect(() => {
    if (currentUser) {
      loadClaims();
    }
  }, [currentUser]);

  // Derived values
  const getUserOffice = (user) => OFFICES.find(o => o.code === user?.office);
  const userOffice = getUserOffice(currentUser);
  const pendingExpenses = expenses.filter(e => e.status === 'draft');
  
  // Group pending expenses by currency for proper display
  const expensesByCurrency = pendingExpenses.reduce((acc, e) => {
    if (!acc[e.currency]) acc[e.currency] = { total: 0, count: 0 };
    acc[e.currency].total += parseFloat(e.amount || 0);
    acc[e.currency].count += 1;
    return acc;
  }, {});
  
  const isForeignCurrency = (currency) => {
    if (!currentUser) return false;
    const userCurrency = currentUser.reimburseCurrency || getUserOffice(currentUser)?.currency;
    return currency !== userCurrency;
  };
  const foreignCurrencyExpenses = pendingExpenses.filter(e => e.isForeignCurrency);
  const hasForeignCurrency = foreignCurrencyExpenses.length > 0;
  const hasOldExpenses = pendingExpenses.some(e => e.isOld);

  const getNextRef = (category) => {
    const catExpenses = pendingExpenses.filter(e => e.category === category);
    return `${category}${catExpenses.length + 1}`;
  };

  const getVisibleClaims = () => {
    if (!currentUser) return [];
    if (currentUser.role === 'finance') {
      return claims;
    } else if (currentUser.role === 'admin') {
      const userOfficeCode = currentUser.office;
      return claims.filter(c => {
        const claimEmployee = EMPLOYEES.find(e => e.id === c.user_id);
        return c.user_id === currentUser.id || claimEmployee?.office === userOfficeCode;
      });
    } else {
      return claims.filter(c => c.user_id === currentUser.id);
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
            Berkeley International Expense Management System v1.4
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
                    <span><strong>Foreign currency</strong> - You MUST upload your credit card statement before submitting.</span>
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
  // PREVIEW CLAIM MODAL - Excel Style Multi-Page
  // ============================================
  const PreviewClaimModal = () => {
    const groupedExpenses = pendingExpenses.reduce((acc, exp) => {
      if (!acc[exp.category]) acc[exp.category] = [];
      acc[exp.category].push(exp);
      return acc;
    }, {});

    const canSubmit = !hasForeignCurrency || (hasForeignCurrency && creditCardStatement);
    
    // Calculate category totals - maintain original currency
    const getSubcategoryTotal = (cat, subcat) => {
      return (groupedExpenses[cat] || [])
        .filter(e => e.subcategory === subcat)
        .reduce((sum, e) => sum + e.amount, 0);
    };

    const getCategoryTotal = (cat) => {
      return (groupedExpenses[cat] || []).reduce((sum, e) => sum + e.amount, 0);
    };

    // Get claim month
    const claimMonth = pendingExpenses.length > 0 ? getMonthYear(pendingExpenses[0].date) : getMonthYear(new Date().toISOString());

    // Pages: 0=Summary, 1=Travel Detail, 2=Entertaining Detail, 3=Receipts
    const pages = ['Summary', 'Travel Expense Detail', 'Entertaining & Welfare Detail', 'Attached Receipts'];

    // Travel expenses (B, C, D)
    const travelExpenses = [...(groupedExpenses['B'] || []), ...(groupedExpenses['C'] || []), ...(groupedExpenses['D'] || [])];
    // Entertaining expenses (E, F)
    const entertainingExpenses = [...(groupedExpenses['E'] || []), ...(groupedExpenses['F'] || [])];

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-lg font-bold">📋 Expense Claim Form Preview</h2>
              <p className="text-blue-200 text-sm">Page {previewPage + 1} of {pages.length}: {pages[previewPage]}</p>
            </div>
            <button onClick={() => { setShowPreview(false); setPreviewPage(0); }} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">✕</button>
          </div>

          {/* Page Navigation */}
          <div className="bg-slate-100 px-4 py-2 flex gap-2 overflow-x-auto shrink-0">
            {pages.map((page, idx) => (
              <button
                key={idx}
                onClick={() => setPreviewPage(idx)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  previewPage === idx 
                    ? 'bg-blue-600 text-white shadow' 
                    : 'bg-white text-slate-600 hover:bg-slate-200'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          {/* Page Content */}
          <div className="flex-1 overflow-y-auto p-6">
            
            {/* PAGE 0: Summary (Main Expense Claim Form) */}
            {previewPage === 0 && (
              <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="border-2 border-slate-400 mb-4">
                  <div className="flex">
                    <div className="w-24 bg-slate-100 p-2 flex items-center justify-center border-r border-slate-400">
                      <div className="w-16 h-16 bg-blue-900 rounded-lg flex items-center justify-center text-white text-2xl font-bold">B</div>
                    </div>
                    <div className="flex-1 text-center py-4">
                      <h1 className="text-xl font-bold">Motor & Expense Claim Form</h1>
                      <p className="text-sm text-slate-600">Berkeley London Residential Ltd</p>
                    </div>
                    <div className="w-48 border-l border-slate-400">
                      <div className="border-b border-slate-400 p-2 text-xs">
                        <span className="text-slate-500">Account Code</span>
                        <span className="float-right text-slate-500">Document Number</span>
                      </div>
                      <div className="p-2 text-center text-sm font-medium italic text-slate-400">Accounts Use Only</div>
                    </div>
                  </div>
                </div>

                {/* Employee Info */}
                <div className="border-2 border-slate-400 mb-4">
                  <div className="grid grid-cols-2">
                    <div className="border-r border-b border-slate-400 p-3 flex">
                      <span className="text-slate-600 w-20">Name</span>
                      <span className="font-semibold text-blue-700">{currentUser.name}</span>
                    </div>
                    <div className="border-b border-slate-400 p-3 flex">
                      <span className="text-slate-600 w-20">Month</span>
                      <span className="font-semibold">{claimMonth}</span>
                    </div>
                    <div className="border-r border-slate-400 p-3 flex">
                      <span className="text-slate-600 w-20">Office</span>
                      <span className="font-semibold">{userOffice?.name}</span>
                    </div>
                    <div className="p-3 flex">
                      <span className="text-slate-600 w-20">Currency</span>
                      <span className="font-semibold">{Object.keys(expensesByCurrency).join(', ') || userOffice?.currency}</span>
                    </div>
                  </div>
                </div>

                {/* Expenses Claim Table */}
                <div className="border-2 border-slate-400 mb-4">
                  <div className="bg-slate-200 p-2 font-bold text-center border-b border-slate-400">Expenses claim</div>
                  
                  {/* Motor Vehicle Expenditure */}
                  <div className="border-b border-slate-400">
                    <div className="bg-slate-100 p-2 font-semibold border-b border-slate-300">Motor Vehicle Expenditure</div>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <td className="p-2 w-8">A.</td>
                          <td className="p-2 text-blue-700 underline">Petrol Expenditure</td>
                          <td className="p-2">Full Petrol Allowance / Fuel Card Holders</td>
                          <td className="p-2 text-right w-28">{getCategoryTotal('A').toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="p-2"></td>
                          <td className="p-2"></td>
                          <td className="p-2">Business Mileage Return (As Attached)</td>
                          <td className="p-2 text-right">0.00</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="p-2">B.</td>
                          <td className="p-2 text-blue-700 underline">Parking</td>
                          <td className="p-2">Off-Street Parking</td>
                          <td className="p-2 text-right">{getCategoryTotal('B').toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="p-2">C.</td>
                          <td className="p-2 text-blue-700 underline">Travel Expenses</td>
                          <td className="p-2">Public Transport (Trains, Tubes, Buses etc.)</td>
                          <td className="p-2 text-right">{getSubcategoryTotal('C', 'Public Transport').toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="p-2"></td>
                          <td className="p-2"></td>
                          <td className="p-2">Taxis</td>
                          <td className="p-2 text-right font-medium">{getSubcategoryTotal('C', 'Taxis').toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="p-2"></td>
                          <td className="p-2"></td>
                          <td className="p-2">Tolls</td>
                          <td className="p-2 text-right">{getSubcategoryTotal('C', 'Tolls').toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="p-2"></td>
                          <td className="p-2"></td>
                          <td className="p-2">Subsistence (meals while away from office)</td>
                          <td className="p-2 text-right">{getSubcategoryTotal('C', 'Subsistence').toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-2">D.</td>
                          <td className="p-2 text-blue-700 underline">Vehicle Repairs</td>
                          <td className="p-2">Repairs</td>
                          <td className="p-2 text-right">{getSubcategoryTotal('D', 'Repairs').toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-2"></td>
                          <td className="p-2"></td>
                          <td className="p-2">Parts</td>
                          <td className="p-2 text-right">{getSubcategoryTotal('D', 'Parts').toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Business Expenditure */}
                  <div>
                    <div className="bg-slate-100 p-2 font-semibold border-b border-slate-300">Business Expenditure</div>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <td className="p-2 w-8">E.</td>
                          <td className="p-2 text-blue-700 underline">Entertaining</td>
                          <td className="p-2">Customers (Staff & Customers)</td>
                          <td className="p-2 text-right w-28 font-medium">{getSubcategoryTotal('E', 'Customers (Staff & Customers)').toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="p-2"></td>
                          <td className="p-2"></td>
                          <td className="p-2">Employees (Must be only Staff present)</td>
                          <td className="p-2 text-right">{getSubcategoryTotal('E', 'Employees Only').toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="p-2">F.</td>
                          <td className="p-2 text-blue-700 underline">Welfare</td>
                          <td className="p-2">Hotel Accommodation</td>
                          <td className="p-2 text-right">{getSubcategoryTotal('F', 'Hotel Accommodation').toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="p-2"></td>
                          <td className="p-2"></td>
                          <td className="p-2">Gifts to Employees / Corporate Gifts</td>
                          <td className="p-2 text-right">{(getSubcategoryTotal('F', 'Gifts to Employees') + getSubcategoryTotal('F', 'Corporate Gifts')).toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="p-2">G.</td>
                          <td className="p-2 text-blue-700 underline">Subscriptions</td>
                          <td className="p-2">Professional / Non-Professional / Newspapers</td>
                          <td className="p-2 text-right">{getCategoryTotal('G').toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="p-2">H.</td>
                          <td className="p-2 text-blue-700 underline">Computer Costs</td>
                          <td className="p-2">All items</td>
                          <td className="p-2 text-right">{getCategoryTotal('H').toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="p-2">I.</td>
                          <td className="p-2 text-blue-700 underline">WIP</td>
                          <td className="p-2">All items</td>
                          <td className="p-2 text-right">{getCategoryTotal('I').toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="p-2">I.</td>
                          <td className="p-2 text-blue-700 underline">Other</td>
                          <td className="p-2">Miscellaneous Vatable Items</td>
                          <td className="p-2 text-right">0.00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Total - Show by currency */}
                  <div className="border-t-2 border-slate-400 bg-blue-50 p-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">Total expenses claimed</span>
                      <div className="text-right">
                        {Object.entries(expensesByCurrency).map(([currency, data]) => (
                          <div key={currency} className="font-bold text-xl text-blue-700">
                            {formatCurrency(data.total, currency)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Signature Section */}
                <div className="border-2 border-slate-400 p-4">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-sm text-slate-600 mb-2">Signature of Claimant</p>
                      <div className="border-b border-slate-400 h-12 flex items-end pb-1">
                        <span className="text-blue-700 italic font-medium">{currentUser.name}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-2">Date</p>
                      <div className="border-b border-slate-400 h-12 flex items-end pb-1">
                        <span className="font-medium">{formatDate(new Date().toISOString())}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-slate-600 mb-2">Authorised</p>
                    <div className="border-b border-slate-400 h-12 flex items-end pb-1">
                      <span className="text-slate-400 italic">Pending approval</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 1: Travel Expense Detail */}
            {previewPage === 1 && (
              <div className="max-w-4xl mx-auto">
                <div className="border-2 border-slate-400">
                  <div className="bg-blue-900 text-white p-3 text-center font-bold text-lg">
                    Travel Expense Detail
                  </div>
                  <div className="p-3 bg-slate-50 border-b border-slate-400 flex justify-between">
                    <span>Name: <strong>{currentUser.name}</strong></span>
                    <span className="text-blue-700 text-sm italic">Please do not include any travel expenses associated with Employee Entertaining (See Staff Entertaining)</span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-200">
                          <th className="border border-slate-300 p-2 w-16">Receipt No</th>
                          <th className="border border-slate-300 p-2">VAT</th>
                          <th className="border border-slate-300 p-2">B. Parking</th>
                          <th className="border border-slate-300 p-2" colSpan="5">C. Travel Expenses</th>
                          <th className="border border-slate-300 p-2" colSpan="2">D. Motor Vehicles</th>
                          <th className="border border-slate-300 p-2 w-48">Full Description</th>
                        </tr>
                        <tr className="bg-slate-100 text-xs">
                          <th className="border border-slate-300 p-1"></th>
                          <th className="border border-slate-300 p-1"></th>
                          <th className="border border-slate-300 p-1">Parking</th>
                          <th className="border border-slate-300 p-1">Public Transport</th>
                          <th className="border border-slate-300 p-1">Taxis</th>
                          <th className="border border-slate-300 p-1">Tolls</th>
                          <th className="border border-slate-300 p-1">Cong Chg</th>
                          <th className="border border-slate-300 p-1">Subsistence</th>
                          <th className="border border-slate-300 p-1">Repairs</th>
                          <th className="border border-slate-300 p-1">Parts</th>
                          <th className="border border-slate-300 p-1"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {travelExpenses.length === 0 ? (
                          <tr>
                            <td colSpan="11" className="border border-slate-300 p-8 text-center text-slate-400">
                              No travel expenses
                            </td>
                          </tr>
                        ) : (
                          travelExpenses.map((exp, idx) => (
                            <tr key={exp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="border border-slate-300 p-2 text-center font-bold text-blue-700">{exp.ref}</td>
                              <td className="border border-slate-300 p-2 text-center">*</td>
                              <td className="border border-slate-300 p-2 text-right">{exp.category === 'B' ? exp.amount.toFixed(2) : ''}</td>
                              <td className="border border-slate-300 p-2 text-right">{exp.subcategory === 'Public Transport' ? exp.amount.toFixed(2) : ''}</td>
                              <td className="border border-slate-300 p-2 text-right font-medium">{exp.subcategory === 'Taxis' ? exp.amount.toFixed(2) : ''}</td>
                              <td className="border border-slate-300 p-2 text-right">{exp.subcategory === 'Tolls' ? exp.amount.toFixed(2) : ''}</td>
                              <td className="border border-slate-300 p-2 text-right">{exp.subcategory === 'Congestion Charging' ? exp.amount.toFixed(2) : ''}</td>
                              <td className="border border-slate-300 p-2 text-right">{exp.subcategory === 'Subsistence' ? exp.amount.toFixed(2) : ''}</td>
                              <td className="border border-slate-300 p-2 text-right">{exp.subcategory === 'Repairs' ? exp.amount.toFixed(2) : ''}</td>
                              <td className="border border-slate-300 p-2 text-right">{exp.subcategory === 'Parts' ? exp.amount.toFixed(2) : ''}</td>
                              <td className="border border-slate-300 p-2 text-xs">{exp.description}</td>
                            </tr>
                          ))
                        )}
                        {/* Totals row */}
                        <tr className="bg-blue-100 font-bold">
                          <td className="border border-slate-300 p-2" colSpan="2">Totals</td>
                          <td className="border border-slate-300 p-2 text-right">{getCategoryTotal('B').toFixed(2)}</td>
                          <td className="border border-slate-300 p-2 text-right">{getSubcategoryTotal('C', 'Public Transport').toFixed(2)}</td>
                          <td className="border border-slate-300 p-2 text-right">{getSubcategoryTotal('C', 'Taxis').toFixed(2)}</td>
                          <td className="border border-slate-300 p-2 text-right">{getSubcategoryTotal('C', 'Tolls').toFixed(2)}</td>
                          <td className="border border-slate-300 p-2 text-right">{getSubcategoryTotal('C', 'Congestion Charging').toFixed(2)}</td>
                          <td className="border border-slate-300 p-2 text-right">{getSubcategoryTotal('C', 'Subsistence').toFixed(2)}</td>
                          <td className="border border-slate-300 p-2 text-right">{getSubcategoryTotal('D', 'Repairs').toFixed(2)}</td>
                          <td className="border border-slate-300 p-2 text-right">{getSubcategoryTotal('D', 'Parts').toFixed(2)}</td>
                          <td className="border border-slate-300 p-2 text-right text-blue-700">
                            {(getCategoryTotal('B') + getCategoryTotal('C') + getCategoryTotal('D')).toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 2: Entertaining & Welfare Detail */}
            {previewPage === 2 && (
              <div className="max-w-4xl mx-auto">
                <div className="border-2 border-slate-400">
                  <div className="bg-blue-900 text-white p-3 text-center font-bold text-lg">
                    Entertaining and Welfare Detail
                  </div>
                  <div className="p-3 bg-amber-50 border-b border-slate-400">
                    <p className="text-amber-800 font-semibold">⚠️ PLEASE ENSURE A FULL LIST OF GUESTS ENTERTAINED ARE SUPPLIED WITH EACH RECEIPT STATING WHO THEY ARE EMPLOYED BY.</p>
                  </div>
                  <div className="p-3 bg-slate-50 border-b border-slate-400">
                    <span>Name: <strong>{currentUser.name}</strong></span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-200">
                          <th className="border border-slate-300 p-2 w-16">Receipt No</th>
                          <th className="border border-slate-300 p-2" colSpan="3">E. Employee Entertaining</th>
                          <th className="border border-slate-300 p-2" colSpan="3">E. Business / Client Entertaining</th>
                          <th className="border border-slate-300 p-2" colSpan="3">F. Welfare</th>
                          <th className="border border-slate-300 p-2 w-56">Full Description</th>
                        </tr>
                        <tr className="bg-slate-100 text-xs">
                          <th className="border border-slate-300 p-1"></th>
                          <th className="border border-slate-300 p-1">Meals/Drinks</th>
                          <th className="border border-slate-300 p-1">Accomodation</th>
                          <th className="border border-slate-300 p-1">Other</th>
                          <th className="border border-slate-300 p-1">Meals/Drinks</th>
                          <th className="border border-slate-300 p-1">Accomodation</th>
                          <th className="border border-slate-300 p-1">Other</th>
                          <th className="border border-slate-300 p-1">Hotels</th>
                          <th className="border border-slate-300 p-1">Employee Gifts</th>
                          <th className="border border-slate-300 p-1">Corporate Gifts</th>
                          <th className="border border-slate-300 p-1"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {entertainingExpenses.length === 0 ? (
                          <tr>
                            <td colSpan="11" className="border border-slate-300 p-8 text-center text-slate-400">
                              No entertaining or welfare expenses
                            </td>
                          </tr>
                        ) : (
                          entertainingExpenses.map((exp, idx) => {
                            const isEmployeeEntertaining = exp.category === 'E' && exp.subcategory?.includes('Employee');
                            const isBusinessEntertaining = exp.category === 'E' && exp.subcategory?.includes('Customer');
                            const isWelfare = exp.category === 'F';
                            
                            return (
                              <tr key={exp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                <td className="border border-slate-300 p-2 text-center font-bold text-blue-700">{exp.ref}</td>
                                <td className="border border-slate-300 p-2 text-right">{isEmployeeEntertaining ? exp.amount.toFixed(2) : ''}</td>
                                <td className="border border-slate-300 p-2 text-right"></td>
                                <td className="border border-slate-300 p-2 text-right"></td>
                                <td className="border border-slate-300 p-2 text-right font-medium">{isBusinessEntertaining ? exp.amount.toFixed(2) : ''}</td>
                                <td className="border border-slate-300 p-2 text-right"></td>
                                <td className="border border-slate-300 p-2 text-right"></td>
                                <td className="border border-slate-300 p-2 text-right">{isWelfare && exp.subcategory?.includes('Hotel') ? exp.amount.toFixed(2) : ''}</td>
                                <td className="border border-slate-300 p-2 text-right">{isWelfare && exp.subcategory?.includes('Gifts to Employees') ? exp.amount.toFixed(2) : ''}</td>
                                <td className="border border-slate-300 p-2 text-right">{isWelfare && exp.subcategory?.includes('Corporate') ? exp.amount.toFixed(2) : ''}</td>
                                <td className="border border-slate-300 p-2 text-xs">
                                  {exp.merchant}{exp.attendees ? ` - ${exp.attendees}` : ''}
                                </td>
                              </tr>
                            );
                          })
                        )}
                        {/* Totals row */}
                        <tr className="bg-blue-100 font-bold">
                          <td className="border border-slate-300 p-2">Totals</td>
                          <td className="border border-slate-300 p-2 text-right" colSpan="3">
                            {getSubcategoryTotal('E', 'Employees Only').toFixed(2)}
                          </td>
                          <td className="border border-slate-300 p-2 text-right" colSpan="3">
                            {getSubcategoryTotal('E', 'Customers (Staff & Customers)').toFixed(2)}
                          </td>
                          <td className="border border-slate-300 p-2 text-right" colSpan="3">
                            {getCategoryTotal('F').toFixed(2)}
                          </td>
                          <td className="border border-slate-300 p-2 text-right text-blue-700">
                            {(getCategoryTotal('E') + getCategoryTotal('F')).toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 3: Attached Receipts */}
            {previewPage === 3 && (
              <div className="max-w-4xl mx-auto">
                <div className="border-2 border-slate-400 mb-4">
                  <div className="bg-blue-900 text-white p-3 text-center font-bold text-lg">
                    Attached Receipts
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-slate-600 mb-4">
                      The following {pendingExpenses.length} receipts are attached to this claim, labeled with reference numbers:
                    </p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {pendingExpenses.map(exp => (
                        <div key={exp.id} className="border-2 border-slate-300 rounded-lg overflow-hidden">
                          <div className="bg-blue-100 p-2 flex justify-between items-center">
                            <span className="font-bold text-blue-700 text-lg">{exp.ref}</span>
                            <span className="text-xs text-slate-600">{formatShortDate(exp.date)}</span>
                          </div>
                          {exp.receiptPreview ? (
                            <img src={exp.receiptPreview} alt={exp.ref} className="w-full h-32 object-cover" />
                          ) : (
                            <div className="w-full h-32 bg-slate-100 flex items-center justify-center">
                              <span className="text-4xl">📄</span>
                            </div>
                          )}
                          <div className="p-2 bg-slate-50">
                            <p className="font-medium text-sm truncate">{exp.merchant}</p>
                            <p className="text-xs text-slate-500 truncate">{exp.description}</p>
                            <p className="font-bold text-blue-700 mt-1">{formatCurrency(exp.amount, exp.currency)}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {hasForeignCurrency && (
                      <div className={`mt-6 rounded-xl p-4 ${creditCardStatement ? 'bg-green-50 border border-green-200' : 'bg-red-50 border-2 border-red-300'}`}>
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
                            <p className="text-red-800 font-bold">❌ CREDIT CARD STATEMENT REQUIRED</p>
                            <p className="text-red-700 text-sm mt-2">
                              Foreign currency expenses: {foreignCurrencyExpenses.map(e => `${e.ref} (${e.currency})`).join(', ')}
                            </p>
                            <button 
                              onClick={() => { setShowPreview(false); setShowStatementUpload(true); }}
                              className="mt-3 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-semibold"
                            >
                              📎 Upload Statement
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3 shrink-0">
            <button 
              onClick={() => { setShowPreview(false); setPreviewPage(0); }} 
              className="flex-1 py-3 rounded-xl border-2 border-slate-300 font-semibold text-slate-600 hover:bg-slate-100"
            >
              ← Back to Edit
            </button>
            <button 
              onClick={async () => { 
                await handleSubmitClaim(); 
                setShowPreview(false); 
                setPreviewPage(0);
              }} 
              disabled={!canSubmit || loading}
              className={`flex-[2] py-3 rounded-xl font-semibold shadow-lg transition-all ${
                canSubmit && !loading
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-xl cursor-pointer' 
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              {loading ? '⏳ Submitting...' : canSubmit ? 'Submit Claim ✓' : '⚠️ Upload Statement First'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // CREDIT CARD STATEMENT UPLOAD
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
  // SUBMIT CLAIM - Save to Database
  // ============================================
  const handleSubmitClaim = async () => {
    setLoading(true);
    try {
      const claimNumber = `EXP-2026-${String(claims.length + 1).padStart(3, '0')}`;
      
      // Calculate total by currency
      const currencies = [...new Set(pendingExpenses.map(e => e.currency))];
      const totalAmount = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);
      const primaryCurrency = currencies[0] || userOffice?.currency;
      
      const newClaim = {
        claim_number: claimNumber,
        user_id: currentUser.id,
        user_name: currentUser.name,
        office: userOffice?.name,
        currency: primaryCurrency,
        total_amount: totalAmount,
        item_count: pendingExpenses.length,
        status: 'pending_review',
        credit_card_statement: creditCardStatement?.name || null,
        expenses: pendingExpenses
      };
      
      const { data, error } = await supabase.from('claims').insert([newClaim]);
      
      if (error) {
        console.error('Error submitting claim:', error);
        alert('❌ Failed to submit claim. Please try again.');
      } else {
        setExpenses([]);
        setCreditCardStatement(null);
        await loadClaims();
        alert('✅ Expense claim submitted successfully!');
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('❌ Failed to submit claim. Please try again.');
    }
    setLoading(false);
  };

  // ============================================
  // DOWNLOAD EXCEL HANDLER
  // ============================================
  const handleDownloadExcel = async (claim) => {
    try {
      const employee = EMPLOYEES.find(e => e.id === claim.user_id);
      const office = OFFICES.find(o => employee && o.code === employee.office);
      await generateExcelFile(claim, claim.user_name, office?.name || claim.office);
    } catch (err) {
      console.error('Download error:', err);
      alert('❌ Failed to download Excel file. Please try again.');
    }
  };

  // ============================================
  // MY EXPENSES TAB
  // ============================================
  const MyExpensesTab = () => {
    const myClaims = claims.filter(c => c.user_id === currentUser.id);

    const groupedExpenses = pendingExpenses.reduce((acc, exp) => {
      if (!acc[exp.category]) acc[exp.category] = [];
      acc[exp.category].push(exp);
      return acc;
    }, {});

    return (
      <div className="space-y-4">
        {/* Stats - Show by currency */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="text-4xl font-bold text-slate-800">{pendingExpenses.length}</div>
            <div className="text-sm text-slate-500 mt-1">Pending Receipts</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            {Object.keys(expensesByCurrency).length === 0 ? (
              <>
                <div className="text-3xl font-bold text-blue-600">{formatCurrency(0, userOffice?.currency)}</div>
                <div className="text-sm text-slate-500 mt-1">Total Amount</div>
              </>
            ) : (
              <>
                {Object.entries(expensesByCurrency).map(([currency, data]) => (
                  <div key={currency} className="text-2xl font-bold text-blue-600">
                    {formatCurrency(data.total, currency)}
                  </div>
                ))}
                <div className="text-sm text-slate-500 mt-1">Total Amount</div>
              </>
            )}
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
          {loading ? (
            <p className="text-center text-slate-400 py-8">Loading...</p>
          ) : myClaims.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No submitted claims yet</p>
          ) : (
            <div className="space-y-2">
              {myClaims.map(claim => (
                <div key={claim.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{claim.claim_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        claim.status === 'approved' ? 'bg-green-100 text-green-700' :
                        claim.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {claim.status === 'pending_review' ? 'Pending Review' : claim.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{claim.item_count} items • {formatDate(claim.submitted_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-slate-800">{formatCurrency(claim.total_amount, claim.currency)}</div>
                    <button
                      onClick={() => handleDownloadExcel(claim)}
                      className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1"
                    >
                      📥 Excel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // REVIEW CLAIMS TAB
  // ============================================
  const ReviewClaimsTab = () => {
    const visibleClaims = getVisibleClaims();
    const pendingClaims = visibleClaims.filter(c => c.status === 'pending_review');

    const handleApprove = async (claimId) => {
      setLoading(true);
      const { error } = await supabase.from('claims').update({ 
        status: 'approved', 
        reviewed_by: currentUser.name,
        reviewed_at: new Date().toISOString()
      }).eq('id', claimId);
      
      if (!error) {
        await loadClaims();
      }
      setSelectedClaim(null);
      setLoading(false);
    };

    const handleReject = async (claimId) => {
      setLoading(true);
      const { error } = await supabase.from('claims').update({ 
        status: 'rejected', 
        reviewed_by: currentUser.name,
        reviewed_at: new Date().toISOString()
      }).eq('id', claimId);
      
      if (!error) {
        await loadClaims();
      }
      setSelectedClaim(null);
      setLoading(false);
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

        {/* Pending Claims */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-800 mb-4">📊 Claims to Review</h3>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4 animate-spin">⏳</div>
              <p className="text-slate-500">Loading claims...</p>
            </div>
          ) : pendingClaims.length === 0 ? (
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
                      <span className="font-semibold text-slate-800">{claim.user_name}</span>
                      <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">Pending</span>
                    </div>
                    <p className="text-sm text-slate-500">{claim.office} • {claim.item_count} items • {formatDate(claim.submitted_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-slate-800">{formatCurrency(claim.total_amount, claim.currency)}</div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownloadExcel(claim); }}
                      className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1"
                    >
                      📥 Excel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Claims */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-800 mb-4">📁 All Claims</h3>
          <div className="space-y-2">
            {visibleClaims.filter(c => c.status !== 'pending_review').map(claim => (
              <div key={claim.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div onClick={() => setSelectedClaim(claim)} className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{claim.user_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      claim.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {claim.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{claim.office} • {claim.item_count} items</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-bold text-slate-800">{formatCurrency(claim.total_amount, claim.currency)}</div>
                  <button
                    onClick={() => handleDownloadExcel(claim)}
                    className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1"
                  >
                    📥 Excel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Claim Detail Modal */}
        {selectedClaim && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedClaim(null)}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{selectedClaim.user_name}</h2>
                    <p className="text-sm text-slate-500">{selectedClaim.claim_number} • {selectedClaim.office}</p>
                  </div>
                  <button onClick={() => setSelectedClaim(null)} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="text-sm text-slate-500">Total Amount</div>
                    <div className="text-2xl font-bold text-slate-800">{formatCurrency(selectedClaim.total_amount, selectedClaim.currency)}</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="text-sm text-slate-500">Items</div>
                    <div className="text-2xl font-bold text-slate-800">{selectedClaim.item_count}</div>
                  </div>
                </div>

                {/* Download Excel Button */}
                <button
                  onClick={() => handleDownloadExcel(selectedClaim)}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  📥 Download Excel File
                </button>

                {selectedClaim.credit_card_statement && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <strong className="text-blue-800">💳 Credit Card Statement</strong>
                    <p className="text-sm text-blue-700 mt-1">{selectedClaim.credit_card_statement}</p>
                  </div>
                )}

                {/* Show expenses */}
                {selectedClaim.expenses && selectedClaim.expenses.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2 font-semibold text-sm text-slate-600">Line Items</div>
                    <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                      {selectedClaim.expenses.map((exp, idx) => (
                        <div key={idx} className="px-4 py-3 flex justify-between items-center">
                          <div>
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded mr-2">{exp.ref}</span>
                            <span className="font-medium text-slate-800">{exp.merchant}</span>
                            <p className="text-xs text-slate-500 mt-1">{exp.description}</p>
                            {exp.attendees && <p className="text-xs text-slate-400">👥 {exp.attendees}</p>}
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
                  <button onClick={() => handleReject(selectedClaim.id)} disabled={loading} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-50">
                    {loading ? '...' : 'Reject'}
                  </button>
                  <button onClick={() => handleApprove(selectedClaim.id)} disabled={loading} className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold shadow-lg disabled:opacity-50">
                    {loading ? '...' : 'Approve ✓'}
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

      {/* Tabs */}
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
