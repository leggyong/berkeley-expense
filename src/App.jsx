import React, { useState, useEffect } from 'react';

/*
 * ============================================
 * BERKELEY INTERNATIONAL EXPENSE MANAGEMENT SYSTEM
 * Version: 1.8 - PDF Improvements + Admin Edit
 * ============================================
 */
const SUPABASE_URL = 'https://wlhoyjsicvkncfjbexoi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsaG95anNpY3ZrbmNmamJleG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNzIyMzcsImV4cCI6MjA4NTg0ODIzN30.AB-W5DjcmCl6fnWiQ2reD0rgDIJiMCGymc994fSJplw';

const supabase = {
  from: (table) => ({
    select: async (columns = '*') => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${columns}`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
      });
      const data = await res.json();
      return { data, error: res.ok ? null : data };
    },
    insert: async (rows) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(rows)
      });
      const data = await res.json();
      return { data, error: res.ok ? null : data };
    },
    update: async (updates) => ({
      eq: async (column, value) => {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${value}`, {
          method: 'PATCH',
          headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify(updates)
        });
        const data = await res.json();
        return { data, error: res.ok ? null : data };
      }
    })
  })
};

// ============================================
// OFFICES with Company Names
// ============================================
const OFFICES = [
  { code: 'BEJ', name: 'Beijing', currency: 'CNY', country: 'China', companyName: 'Berkeley Real Estate Consulting (Beijing) Co., Ltd.' },
  { code: 'CHE', name: 'Chengdu', currency: 'CNY', country: 'China', companyName: 'Berkeley Real Estate Consulting (Beijing) Co., Ltd. Chengdu Branch' },
  { code: 'SHA', name: 'Shanghai', currency: 'CNY', country: 'China', companyName: 'Berkeley Real Estate Consulting (Beijing) Co., Ltd. Shanghai Branch' },
  { code: 'SHE', name: 'Shenzhen', currency: 'CNY', country: 'China', companyName: 'Berkeley Real Estate Consulting (Beijing) Co., Ltd. Shenzhen Branch' },
  { code: 'HKG', name: 'Hong Kong', currency: 'HKD', country: 'Hong Kong', companyName: 'Berkeley (Hong Kong) Limited' },
  { code: 'LON', name: 'London', currency: 'GBP', country: 'UK', companyName: 'Berkeley London Residential Ltd' },
  { code: 'MYS', name: 'Malaysia', currency: 'MYR', country: 'Malaysia', companyName: 'Berkeley (Malaysia) Sdn Bhd' },
  { code: 'SIN', name: 'Singapore', currency: 'SGD', country: 'Singapore', companyName: 'Berkeley (Singapore)' },
  { code: 'BKK', name: 'Bangkok', currency: 'THB', country: 'Thailand', companyName: 'Berkeley (Thailand) Co., Ltd.' },
  { code: 'DXB', name: 'Dubai', currency: 'AED', country: 'UAE', companyName: 'Berkeley London Residential Ltd' }
];

// ============================================
// EMPLOYEES
// ============================================
const EMPLOYEES = [
  // CHINA - BEIJING
  { id: 101, name: 'Fang Yi', office: 'BEJ', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 102, name: 'Caroline Zhu Yunshu', office: 'BEJ', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 103, name: 'Even Huang Yiyun', office: 'BEJ', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 104, name: 'Charrisa Xia Bei Jia', office: 'BEJ', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 105, name: 'Alice Kong Jing', office: 'BEJ', role: 'admin', reimburseCurrency: 'CNY', password: 'berkeley123' },
  // CHINA - CHENGDU
  { id: 201, name: 'Suki Li Siqi', office: 'CHE', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 202, name: 'Icey Zuo Ziying', office: 'CHE', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 203, name: 'Dora Ji Jue Shi Yu', office: 'CHE', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  // CHINA - SHANGHAI
  { id: 301, name: 'Ariel Tang Xin', office: 'SHA', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 302, name: 'Eddy Tao Xiao Feng', office: 'SHA', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 303, name: 'Elsa Huang Wei-Chen', office: 'SHA', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 304, name: 'Terence Li Liang', office: 'SHA', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 305, name: 'Johnnie Huang Wenjiao', office: 'SHA', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 306, name: 'Cathy Liu Shikun', office: 'SHA', role: 'admin', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 307, name: 'Amy Wang Shiyun', office: 'SHA', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 308, name: 'Echo Yu Miao', office: 'SHA', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  // CHINA - SHENZHEN
  { id: 401, name: 'Ryan Lee Yu-Yen', office: 'SHE', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 402, name: 'Simon Wong Chuen Lun', office: 'SHE', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 403, name: 'Zayn Huang Yanxiao', office: 'SHE', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  { id: 404, name: 'Jade Shen Jie', office: 'SHE', role: 'employee', reimburseCurrency: 'CNY', password: 'berkeley123' },
  // HONG KONG
  { id: 501, name: 'Kate Tai Tsz Lok', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD', password: 'berkeley123' },
  { id: 502, name: 'Anthony Andrew Jurenko', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD', password: 'berkeley123' },
  { id: 503, name: 'Suki Fong Tsz Ching', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD', password: 'berkeley123' },
  { id: 504, name: 'Ron Chung Chun Long', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD', password: 'berkeley123' },
  { id: 505, name: 'Cherry Lai', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD', password: 'berkeley123' },
  { id: 506, name: 'Jacky Khor Yhuen Zhuen', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD', password: 'berkeley123' },
  { id: 507, name: 'Michelle Shum', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD', password: 'berkeley123' },
  { id: 508, name: 'Jennifer Wong Ching Sin', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD', password: 'berkeley123' },
  { id: 509, name: 'Annabelle Yiu Wai-Ying', office: 'HKG', role: 'admin', reimburseCurrency: 'HKD', password: 'berkeley123' },
  // LONDON
  { id: 601, name: 'Mouna Ben Cheikh', office: 'LON', role: 'employee', reimburseCurrency: 'GBP', password: 'berkeley123' },
  { id: 602, name: 'Farah Al-Yawer', office: 'LON', role: 'employee', reimburseCurrency: 'GBP', password: 'berkeley123' },
  // MALAYSIA
  { id: 701, name: 'Joanne Chee Pek Har', office: 'MYS', role: 'employee', reimburseCurrency: 'MYR', password: 'berkeley123' },
  // SINGAPORE
  { id: 801, name: 'John Yan Chung Keung', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', password: 'berkeley123' },
  { id: 802, name: 'Janice Zhu Huijun', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', password: 'berkeley123' },
  { id: 803, name: 'Karen Chia Pei Ru', office: 'SIN', role: 'admin', reimburseCurrency: 'SGD', password: 'berkeley123' },
  { id: 804, name: 'Cathy He Zeqian', office: 'SIN', role: 'admin', reimburseCurrency: 'SGD', password: 'berkeley123' },
  { id: 805, name: 'Ann Low Mei Yen', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', password: 'berkeley123' },
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
  { id: 819, name: 'Emma Fowler', office: 'SIN', role: 'finance', reimburseCurrency: 'GBP', password: 'berkeley123' },
  // THAILAND
  { id: 901, name: 'Sutanya Jaruphiboon', office: 'BKK', role: 'employee', reimburseCurrency: 'THB', password: 'berkeley123' },
  { id: 902, name: 'Chayasid Jongpipattanachoke', office: 'BKK', role: 'employee', reimburseCurrency: 'THB', password: 'berkeley123' },
  { id: 903, name: 'Juthamas Leewanun', office: 'BKK', role: 'employee', reimburseCurrency: 'THB', password: 'berkeley123' },
  { id: 904, name: 'Norakamol Seninvinin', office: 'BKK', role: 'admin', reimburseCurrency: 'THB', password: 'berkeley123' },
  // UAE - DUBAI
  { id: 1001, name: 'Christopher James Mclean Frame', office: 'DXB', role: 'employee', reimburseCurrency: 'AED', password: 'berkeley123' },
  { id: 1002, name: 'Christine Mendoza Dimaranan', office: 'DXB', role: 'admin', reimburseCurrency: 'AED', password: 'berkeley123' },
  { id: 1003, name: 'Nathan Jon Abrahams', office: 'DXB', role: 'employee', reimburseCurrency: 'AED', password: 'berkeley123' },
  { id: 1004, name: 'Leila Kadiri', office: 'DXB', role: 'employee', reimburseCurrency: 'AED', password: 'berkeley123' },
  { id: 1005, name: 'Yasseen Jebara', office: 'DXB', role: 'employee', reimburseCurrency: 'AED', password: 'berkeley123' },
  { id: 1006, name: 'Adham Abu-Salim', office: 'DXB', role: 'employee', reimburseCurrency: 'AED', password: 'berkeley123' },
  { id: 1007, name: 'Olivia Rebecca Wyatt', office: 'DXB', role: 'employee', reimburseCurrency: 'AED', password: 'berkeley123' },
  { id: 1008, name: 'Keisha Latoya Whitehorne', office: 'DXB', role: 'employee', reimburseCurrency: 'AED', password: 'berkeley123' },
];

const EXPENSE_CATEGORIES = {
  A: { name: 'Petrol Expenditure', subcategories: ['Full Petrol Allowance / Fuel Card Holders', 'Business Mileage Return (As Attached)'], icon: '⛽', requiresAttendees: false },
  B: { name: 'Parking', subcategories: ['Off-Street Parking'], icon: '🅿️', requiresAttendees: false },
  C: { name: 'Travel Expenses', subcategories: ['Public Transport (Trains, Tubes, Buses etc.)', 'Taxis', 'Tolls', 'Congestion Charging', 'Subsistence (meals while away from office)'], icon: '🚕', requiresAttendees: false },
  D: { name: 'Vehicle Repairs', subcategories: ['Repairs', 'Parts'], icon: '🔧', requiresAttendees: false },
  E: { name: 'Entertaining', subcategories: ['Customers (Staff & Customers)', 'Employees (Must be only Staff present)'], icon: '🍽️', requiresAttendees: true },
  F: { name: 'Welfare', subcategories: ['Hotel Accommodation', 'Gifts to Employees', 'Corporate Gifts'], icon: '🏨', requiresAttendees: true },
  G: { name: 'Subscriptions', subcategories: ['Professional', 'Non - Professional', 'Newspapers, Magazines etc.'], icon: '📰', requiresAttendees: false },
  H: { name: 'Computer Costs', subcategories: ['All Items'], icon: '💻', requiresAttendees: false },
  I: { name: 'WIP', subcategories: ['All Items'], icon: '📦', requiresAttendees: false },
  J: { name: 'Other', subcategories: ['Miscellaneous Vatable Items'], icon: '📋', requiresAttendees: false }
};

const CURRENCIES = ['SGD', 'HKD', 'CNY', 'THB', 'AED', 'GBP', 'USD', 'EUR', 'MYR', 'JPY', 'SAR'];

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
// MAIN APPLICATION
// ============================================
export default function BerkeleyExpenseSystem() {
  const [currentUser, setCurrentUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showStatementUpload, setShowStatementUpload] = useState(false);
  const [creditCardStatement, setCreditCardStatement] = useState(null);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [activeTab, setActiveTab] = useState('my_expenses');
  const [previewPage, setPreviewPage] = useState(0);
  const [editingClaim, setEditingClaim] = useState(null);
  const [showRequestChanges, setShowRequestChanges] = useState(false);
  const [changeRequestComment, setChangeRequestComment] = useState('');
  
  // Login state
  const [loginStep, setLoginStep] = useState('select');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const loadClaims = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('claims').select('*');
      if (!error) setClaims(data || []);
    } catch (err) {
      console.error('Failed to load claims:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (currentUser) loadClaims();
  }, [currentUser]);

  // Check for returned claims when user logs in
  useEffect(() => {
    if (currentUser) {
      const returnedClaims = claims.filter(c => c.user_id === currentUser.id && c.status === 'changes_requested');
      if (returnedClaims.length > 0) {
        // Load the returned claim into expenses for editing
        const latestReturned = returnedClaims[0];
        if (latestReturned.expenses) {
          setExpenses(latestReturned.expenses.map(e => ({ ...e, status: 'draft' })));
        }
      }
    }
  }, [currentUser, claims]);

  const getUserOffice = (user) => OFFICES.find(o => o.code === user?.office);
  const userOffice = getUserOffice(currentUser);
  const getUserReimburseCurrency = (user) => user?.reimburseCurrency || getUserOffice(user)?.currency;
  const getCompanyName = (officeCode) => OFFICES.find(o => o.code === officeCode)?.companyName || 'Berkeley';
  const pendingExpenses = expenses.filter(e => e.status === 'draft');
  
  const reimbursementTotal = pendingExpenses.reduce((sum, e) => sum + parseFloat(e.reimbursementAmount || e.amount || 0), 0);
  const foreignCurrencyExpenses = pendingExpenses.filter(e => e.isForeignCurrency);
  const hasForeignCurrency = foreignCurrencyExpenses.length > 0;

  const getNextRef = (category) => {
    const catExpenses = pendingExpenses.filter(e => e.category === category);
    return `${category}${catExpenses.length + 1}`;
  };

  const getVisibleClaims = () => {
    if (!currentUser) return [];
    if (currentUser.role === 'finance') return claims;
    if (currentUser.role === 'admin') {
      return claims.filter(c => {
        const claimEmployee = EMPLOYEES.find(e => e.id === c.user_id);
        return c.user_id === currentUser.id || claimEmployee?.office === currentUser.office;
      });
    }
    return claims.filter(c => c.user_id === currentUser.id);
  };

  // ============================================
  // PDF GENERATION - Matching Original Format
  // ============================================
  const generatePDFFromHTML = async (expenseList, userName, officeCode, claimNumber, submittedDate, creditCardStatementName, reimburseCurrency) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download PDF');
      return;
    }

    const office = OFFICES.find(o => o.code === officeCode);
    const companyName = office?.companyName || 'Berkeley';
    
    const groupedExpenses = expenseList.reduce((acc, exp) => {
      if (!acc[exp.category]) acc[exp.category] = [];
      acc[exp.category].push(exp);
      return acc;
    }, {});

    const getSubcategoryTotal = (cat, subcat) => {
      return (groupedExpenses[cat] || [])
        .filter(e => e.subcategory === subcat)
        .reduce((sum, e) => sum + parseFloat(e.reimbursementAmount || e.amount || 0), 0);
    };

    const getCategoryTotal = (cat) => {
      return (groupedExpenses[cat] || []).reduce((sum, e) => sum + parseFloat(e.reimbursementAmount || e.amount || 0), 0);
    };

    const totalAmount = expenseList.reduce((sum, e) => sum + parseFloat(e.reimbursementAmount || e.amount || 0), 0);
    const claimMonth = expenseList.length > 0 ? getMonthYear(expenseList[0].date) : '';
    
    // Group expenses for detail pages
    const travelExpenses = [...(groupedExpenses['A'] || []), ...(groupedExpenses['B'] || []), ...(groupedExpenses['C'] || []), ...(groupedExpenses['D'] || [])];
    const entertainingExpenses = [...(groupedExpenses['E'] || []), ...(groupedExpenses['F'] || [])];

    // Calculate subtotals for travel
    const travelSubtotals = {
      petrol: getCategoryTotal('A'),
      parking: getCategoryTotal('B'),
      pubTrans: getSubcategoryTotal('C', 'Public Transport (Trains, Tubes, Buses etc.)'),
      taxis: getSubcategoryTotal('C', 'Taxis'),
      tolls: getSubcategoryTotal('C', 'Tolls'),
      congestion: getSubcategoryTotal('C', 'Congestion Charging'),
      subsistence: getSubcategoryTotal('C', 'Subsistence (meals while away from office)'),
      repairs: getSubcategoryTotal('D', 'Repairs'),
      parts: getSubcategoryTotal('D', 'Parts'),
      total: getCategoryTotal('A') + getCategoryTotal('B') + getCategoryTotal('C') + getCategoryTotal('D')
    };

    // Build receipt images HTML
    let receiptsHTML = '';
    for (const exp of expenseList) {
      receiptsHTML += `
        <div class="page receipt-page">
          <div class="receipt-header">
            <div class="receipt-ref">${exp.ref}</div>
            <div class="receipt-info">
              <strong>${exp.merchant}</strong><br>
              ${exp.description || ''}<br>
              Original: ${formatCurrency(exp.amount, exp.currency)}
              ${exp.isForeignCurrency ? `<br>Reimburse: ${formatCurrency(exp.reimbursementAmount, reimburseCurrency)}` : ''}
              <br>${formatShortDate(exp.date)}
            </div>
          </div>
          ${exp.receiptPreview ? `<img src="${exp.receiptPreview}" class="receipt-img" />` : '<div class="no-receipt">No receipt image</div>'}
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Expense Claim - ${claimNumber || 'Draft'}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 10px; color: #000; }
          .page { page-break-after: always; padding: 12mm 15mm; min-height: 100vh; }
          .page:last-child { page-break-after: avoid; }
          
          /* Header */
          .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header h1 { font-size: 16px; font-weight: bold; margin-bottom: 3px; }
          .header .company { font-size: 11px; color: #666; }
          
          /* Info Box */
          .info-box { border: 1px solid #000; margin-bottom: 15px; }
          .info-row { display: flex; border-bottom: 1px solid #000; }
          .info-row:last-child { border-bottom: none; }
          .info-cell { flex: 1; padding: 5px 8px; border-right: 1px solid #000; }
          .info-cell:last-child { border-right: none; }
          .info-label { font-size: 9px; color: #666; }
          .info-value { font-weight: bold; }
          
          /* Expenses Table - Matching Original */
          .expenses-section { border: 1px solid #000; margin-bottom: 15px; }
          .section-header { background: #f0f0f0; padding: 5px 8px; font-weight: bold; border-bottom: 1px solid #000; font-size: 11px; }
          .category-header { background: #f8f8f8; padding: 4px 8px; font-weight: bold; font-size: 10px; border-bottom: 1px solid #ccc; text-decoration: underline; }
          
          .expense-row { display: flex; border-bottom: 1px solid #ddd; }
          .expense-row:last-child { border-bottom: none; }
          .col-cat { width: 25px; padding: 3px 5px; font-weight: bold; }
          .col-name { width: 100px; padding: 3px 5px; text-decoration: underline; }
          .col-detail { flex: 1; padding: 3px 5px; }
          .col-amount { width: 80px; padding: 3px 5px; text-align: right; }
          .col-total-label { width: 50px; padding: 3px 5px; font-weight: bold; }
          
          .sub-row { display: flex; padding-left: 125px; border-bottom: 1px solid #eee; }
          .sub-row .col-detail { padding: 2px 5px; }
          .sub-row .col-amount { padding: 2px 5px; }
          
          .total-row { display: flex; background: #f0f0f0; border-top: 2px solid #000; padding: 8px; }
          .total-row .label { flex: 1; font-weight: bold; font-size: 11px; }
          .total-row .amount { width: 100px; text-align: right; font-weight: bold; font-size: 11px; border: 1px solid #000; padding: 3px 8px; }
          
          /* Signature */
          .signature-section { margin-top: 20px; }
          .sig-row { display: flex; margin-bottom: 15px; gap: 20px; }
          .sig-field { flex: 1; }
          .sig-label { font-size: 9px; margin-bottom: 3px; }
          .sig-line { border-bottom: 1px solid #000; height: 20px; }
          
          /* Detail Pages */
          .detail-header { text-align: center; margin-bottom: 15px; border-bottom: 1px solid #000; padding-bottom: 10px; }
          .detail-header h2 { font-size: 14px; }
          .detail-header .name { font-size: 11px; color: #666; }
          
          .detail-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .detail-table th, .detail-table td { border: 1px solid #000; padding: 4px 6px; text-align: left; font-size: 9px; }
          .detail-table th { background: #f0f0f0; font-weight: bold; }
          .detail-table .amount { text-align: right; }
          .detail-table .ref { font-weight: bold; width: 30px; }
          .detail-table .desc { min-width: 150px; }
          .subtotal-row { background: #f8f8f8; font-weight: bold; }
          
          /* Receipt Pages */
          .receipt-page { padding: 10mm; }
          .receipt-header { background: #333; color: white; padding: 12px; margin-bottom: 10px; display: flex; align-items: center; }
          .receipt-ref { font-size: 28px; font-weight: bold; margin-right: 20px; min-width: 50px; }
          .receipt-info { font-size: 11px; }
          .receipt-img { max-width: 100%; max-height: 230mm; object-fit: contain; display: block; margin: 0 auto; }
          .no-receipt { background: #f5f5f5; padding: 50px; text-align: center; color: #999; }
          
          @media print { 
            .page { padding: 10mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <!-- Page 1: Summary -->
        <div class="page">
          <div class="header">
            <h1>Motor & Expense Claim Form</h1>
            <div class="company">${companyName}</div>
          </div>
          
          <div class="info-box">
            <div class="info-row">
              <div class="info-cell"><span class="info-label">Name</span><br><span class="info-value">${userName}</span></div>
              <div class="info-cell"><span class="info-label">Month</span><br><span class="info-value">${claimMonth}</span></div>
            </div>
            <div class="info-row">
              <div class="info-cell"><span class="info-label">Claim Number</span><br><span class="info-value">${claimNumber || 'DRAFT'}</span></div>
              <div class="info-cell"><span class="info-label">Reimbursement Currency</span><br><span class="info-value">${reimburseCurrency}</span></div>
            </div>
          </div>
          
          <div class="expenses-section">
            <div class="section-header">Expenses claim</div>
            
            <!-- Motor Vehicle Expenditure -->
            <div class="category-header">Motor Vehicle Expenditure</div>
            
            <div class="expense-row">
              <div class="col-cat">A.</div>
              <div class="col-name">Petrol Expenditure</div>
              <div class="col-detail">Full Petrol Allowance / Fuel Card Holders</div>
              <div class="col-total-label">Total</div>
            </div>
            <div class="sub-row">
              <div class="col-detail"></div>
              <div class="col-amount">${reimburseCurrency} ${getSubcategoryTotal('A', 'Full Petrol Allowance / Fuel Card Holders').toFixed(2)}</div>
            </div>
            <div class="sub-row">
              <div class="col-detail">Business Mileage Return (As Attached)</div>
              <div class="col-amount">${reimburseCurrency} ${getSubcategoryTotal('A', 'Business Mileage Return (As Attached)').toFixed(2)}</div>
            </div>
            
            <div class="expense-row">
              <div class="col-cat">B.</div>
              <div class="col-name">Parking</div>
              <div class="col-detail">Off-Street Parking</div>
              <div class="col-amount">${reimburseCurrency} ${getCategoryTotal('B').toFixed(2)}</div>
            </div>
            
            <div class="expense-row">
              <div class="col-cat">C.</div>
              <div class="col-name">Travel Expenses</div>
              <div class="col-detail"></div>
              <div class="col-amount"></div>
            </div>
            <div class="sub-row">
              <div class="col-detail">Public Transport (Trains, Tubes, Buses etc.)</div>
              <div class="col-amount">${reimburseCurrency} ${getSubcategoryTotal('C', 'Public Transport (Trains, Tubes, Buses etc.)').toFixed(2)}</div>
            </div>
            <div class="sub-row">
              <div class="col-detail">Taxis</div>
              <div class="col-amount">${reimburseCurrency} ${getSubcategoryTotal('C', 'Taxis').toFixed(2)}</div>
            </div>
            <div class="sub-row">
              <div class="col-detail">Tolls</div>
              <div class="col-amount">${reimburseCurrency} ${getSubcategoryTotal('C', 'Tolls').toFixed(2)}</div>
            </div>
            <div class="sub-row">
              <div class="col-detail">Congestion Charging</div>
              <div class="col-amount">${reimburseCurrency} ${getSubcategoryTotal('C', 'Congestion Charging').toFixed(2)}</div>
            </div>
            <div class="sub-row">
              <div class="col-detail">Subsistence (meals while away from office)</div>
              <div class="col-amount">${reimburseCurrency} ${getSubcategoryTotal('C', 'Subsistence (meals while away from office)').toFixed(2)}</div>
            </div>
            
            <div class="expense-row">
              <div class="col-cat">D</div>
              <div class="col-name">Vehicle Repairs</div>
              <div class="col-detail">Repairs</div>
              <div class="col-amount">${reimburseCurrency} ${getSubcategoryTotal('D', 'Repairs').toFixed(2)}</div>
            </div>
            <div class="sub-row">
              <div class="col-detail">Parts</div>
              <div class="col-amount">${reimburseCurrency} ${getSubcategoryTotal('D', 'Parts').toFixed(2)}</div>
            </div>
            
            <!-- Business Expenditure -->
            <div class="category-header">Business Expenditure</div>
            
            <div class="expense-row">
              <div class="col-cat">E</div>
              <div class="col-name">Entertaining</div>
              <div class="col-detail"></div>
              <div class="col-total-label">Total</div>
            </div>
            <div class="sub-row">
              <div class="col-detail">Customers (Staff & Customers)</div>
              <div class="col-amount">${reimburseCurrency} ${getSubcategoryTotal('E', 'Customers (Staff & Customers)').toFixed(2)}</div>
            </div>
            <div class="sub-row">
              <div class="col-detail">Employees (Must be only Staff present)</div>
              <div class="col-amount">${reimburseCurrency} ${getSubcategoryTotal('E', 'Employees (Must be only Staff present)').toFixed(2)}</div>
            </div>
            
            <div class="expense-row">
              <div class="col-cat">F</div>
              <div class="col-name">Welfare</div>
              <div class="col-detail">Hotel Accommodation</div>
              <div class="col-amount">${reimburseCurrency} ${getSubcategoryTotal('F', 'Hotel Accommodation').toFixed(2)}</div>
            </div>
            <div class="sub-row">
              <div class="col-detail">Gifts to Employees</div>
              <div class="col-amount">${reimburseCurrency} ${getSubcategoryTotal('F', 'Gifts to Employees').toFixed(2)}</div>
            </div>
            <div class="sub-row">
              <div class="col-detail">Corporate Gifts</div>
              <div class="col-amount">${reimburseCurrency} ${getSubcategoryTotal('F', 'Corporate Gifts').toFixed(2)}</div>
            </div>
            
            <div class="expense-row">
              <div class="col-cat">G</div>
              <div class="col-name">Subscriptions</div>
              <div class="col-detail">Professional</div>
              <div class="col-amount">${reimburseCurrency} ${getSubcategoryTotal('G', 'Professional').toFixed(2)}</div>
            </div>
            <div class="sub-row">
              <div class="col-detail">Non - Professional</div>
              <div class="col-amount">${reimburseCurrency} ${getSubcategoryTotal('G', 'Non - Professional').toFixed(2)}</div>
            </div>
            <div class="sub-row">
              <div class="col-detail">Newspapers, Magazines etc.</div>
              <div class="col-amount">${reimburseCurrency} ${getSubcategoryTotal('G', 'Newspapers, Magazines etc.').toFixed(2)}</div>
            </div>
            
            <div class="expense-row">
              <div class="col-cat">H</div>
              <div class="col-name">Computer Costs</div>
              <div class="col-detail">All Items</div>
              <div class="col-amount">${reimburseCurrency} ${getCategoryTotal('H').toFixed(2)}</div>
            </div>
            
            <div class="expense-row">
              <div class="col-cat">I</div>
              <div class="col-name">WIP</div>
              <div class="col-detail">All Items</div>
              <div class="col-amount">${reimburseCurrency} ${getCategoryTotal('I').toFixed(2)}</div>
            </div>
            
            <div class="expense-row">
              <div class="col-cat">J</div>
              <div class="col-name">Other</div>
              <div class="col-detail">Miscellaneous Vatable Items</div>
              <div class="col-amount">${reimburseCurrency} ${getCategoryTotal('J').toFixed(2)}</div>
            </div>
          </div>
          
          <div class="total-row">
            <div class="label">Total expenses claimed</div>
            <div class="amount">${reimburseCurrency} ${totalAmount.toFixed(2)}</div>
          </div>
          
          <div class="signature-section">
            <div class="sig-row">
              <div class="sig-field">
                <div class="sig-label">Signature of Claimant:</div>
                <div class="sig-line" style="font-style: italic; padding-top: 5px;">${userName}</div>
              </div>
              <div class="sig-field">
                <div class="sig-label">Date:</div>
                <div class="sig-line" style="padding-top: 5px;">${formatDate(submittedDate || new Date().toISOString())}</div>
              </div>
            </div>
            <div class="sig-row">
              <div class="sig-field">
                <div class="sig-label">Authorised:</div>
                <div class="sig-line"></div>
              </div>
              <div class="sig-field">
                <div class="sig-label">Date:</div>
                <div class="sig-line"></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Page 2: Travel Expense Detail -->
        <div class="page">
          <div class="detail-header">
            <h2>Travel Expense Detail</h2>
            <div class="name">${userName}</div>
          </div>
          
          <table class="detail-table">
            <thead>
              <tr>
                <th class="ref">Ref</th>
                <th>Parking</th>
                <th>Pub.Trans</th>
                <th>Taxis</th>
                <th>Tolls</th>
                <th>Subsist.</th>
                <th>Repairs</th>
                <th>Parts</th>
                <th class="desc">Description</th>
              </tr>
            </thead>
            <tbody>
              ${travelExpenses.length === 0 ? '<tr><td colspan="9" style="text-align:center;padding:20px;color:#999;">No travel expenses</td></tr>' : 
                travelExpenses.map(exp => `
                  <tr>
                    <td class="ref">${exp.ref}</td>
                    <td class="amount">${exp.category === 'B' ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                    <td class="amount">${exp.subcategory === 'Public Transport (Trains, Tubes, Buses etc.)' ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                    <td class="amount">${exp.subcategory === 'Taxis' ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                    <td class="amount">${exp.subcategory === 'Tolls' ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                    <td class="amount">${exp.subcategory === 'Subsistence (meals while away from office)' ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                    <td class="amount">${exp.subcategory === 'Repairs' ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                    <td class="amount">${exp.subcategory === 'Parts' ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                    <td class="desc">${exp.description || ''}</td>
                  </tr>
                `).join('')}
              <tr class="subtotal-row">
                <td><strong>Subtotals</strong></td>
                <td class="amount">${travelSubtotals.parking.toFixed(2)}</td>
                <td class="amount">${travelSubtotals.pubTrans.toFixed(2)}</td>
                <td class="amount">${travelSubtotals.taxis.toFixed(2)}</td>
                <td class="amount">${travelSubtotals.tolls.toFixed(2)}</td>
                <td class="amount">${travelSubtotals.subsistence.toFixed(2)}</td>
                <td class="amount">${travelSubtotals.repairs.toFixed(2)}</td>
                <td class="amount">${travelSubtotals.parts.toFixed(2)}</td>
                <td><strong>Total: ${reimburseCurrency} ${travelSubtotals.total.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Page 3: Entertaining Detail -->
        <div class="page">
          <div class="detail-header">
            <h2>Entertaining and Welfare Detail</h2>
            <div class="name">${userName}</div>
          </div>
          
          <div style="background: #fff8e1; border: 1px solid #ffb300; padding: 8px; margin-bottom: 15px; font-size: 9px;">
            <strong>⚠️ PLEASE ENSURE A FULL LIST OF GUESTS ENTERTAINED ARE SUPPLIED WITH EACH RECEIPT</strong>
          </div>
          
          <table class="detail-table">
            <thead>
              <tr>
                <th class="ref">Ref</th>
                <th>Emp. Meals</th>
                <th>Bus. Meals</th>
                <th>Hotels</th>
                <th>Emp. Gifts</th>
                <th>Corp. Gifts</th>
                <th class="desc">Description / Attendees</th>
              </tr>
            </thead>
            <tbody>
              ${entertainingExpenses.length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:20px;color:#999;">No entertaining expenses</td></tr>' : 
                entertainingExpenses.map(exp => `
                  <tr>
                    <td class="ref">${exp.ref}</td>
                    <td class="amount">${exp.subcategory === 'Employees (Must be only Staff present)' ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                    <td class="amount">${exp.subcategory === 'Customers (Staff & Customers)' ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                    <td class="amount">${exp.subcategory === 'Hotel Accommodation' ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                    <td class="amount">${exp.subcategory === 'Gifts to Employees' ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                    <td class="amount">${exp.subcategory === 'Corporate Gifts' ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                    <td class="desc">${exp.merchant}${exp.attendees ? ' - ' + exp.attendees : ''}</td>
                  </tr>
                `).join('')}
              <tr class="subtotal-row">
                <td><strong>Subtotals</strong></td>
                <td class="amount">${getSubcategoryTotal('E', 'Employees (Must be only Staff present)').toFixed(2)}</td>
                <td class="amount">${getSubcategoryTotal('E', 'Customers (Staff & Customers)').toFixed(2)}</td>
                <td class="amount">${getSubcategoryTotal('F', 'Hotel Accommodation').toFixed(2)}</td>
                <td class="amount">${getSubcategoryTotal('F', 'Gifts to Employees').toFixed(2)}</td>
                <td class="amount">${getSubcategoryTotal('F', 'Corporate Gifts').toFixed(2)}</td>
                <td><strong>Total: ${reimburseCurrency} ${(getCategoryTotal('E') + getCategoryTotal('F')).toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Receipt Pages -->
        ${receiptsHTML}
        
        ${creditCardStatementName ? `
        <div class="page">
          <div class="detail-header">
            <h2>Credit Card Statement</h2>
            <div class="name">Supporting document for foreign currency expenses</div>
          </div>
          <p style="margin-top: 20px;">Attached file: <strong>${creditCardStatementName}</strong></p>
        </div>
        ` : ''}
        
        <script>window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleDownloadPDF = async (claim) => {
    setDownloading(true);
    try {
      const employee = EMPLOYEES.find(e => e.id === claim.user_id);
      await generatePDFFromHTML(claim.expenses || [], claim.user_name, employee?.office, claim.claim_number, claim.submitted_at, claim.credit_card_statement, employee?.reimburseCurrency || claim.currency);
    } catch (err) {
      alert('❌ Failed to download PDF.');
    }
    setDownloading(false);
  };

  const handleDownloadPreviewPDF = async () => {
    setDownloading(true);
    try {
      await generatePDFFromHTML(pendingExpenses, currentUser.name, currentUser.office, `DRAFT-${Date.now().toString().slice(-6)}`, new Date().toISOString(), creditCardStatement?.name, getUserReimburseCurrency(currentUser));
    } catch (err) {
      alert('❌ Failed to download PDF.');
    }
    setDownloading(false);
  };

  // ============================================
  // LOGIN SCREEN
  // ============================================
  if (!currentUser) {
    const handleSelectEmployee = (e) => {
      const user = EMPLOYEES.find(emp => emp.id === parseInt(e.target.value));
      if (user) {
        setSelectedEmployee(user);
        setLoginStep('password');
        setLoginError('');
        setPasswordInput('');
      }
    };

    const handleLogin = () => {
      if (passwordInput === selectedEmployee.password) {
        setCurrentUser(selectedEmployee);
        setLoginStep('select');
        setSelectedEmployee(null);
        setPasswordInput('');
        setLoginError('');
      } else {
        setLoginError('Incorrect password. Please try again.');
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800">Berkeley Expenses</h1>
            <p className="text-slate-500 text-sm mt-2">
              {loginStep === 'select' ? 'Select your name to continue' : `Welcome, ${selectedEmployee?.name.split(' ')[0]}`}
            </p>
          </div>

          {loginStep === 'select' && (
            <select className="w-full p-4 border-2 border-slate-200 rounded-xl text-base focus:border-blue-500 outline-none bg-white" onChange={handleSelectEmployee} defaultValue="">
              <option value="" disabled>-- Select your name --</option>
              {OFFICES.map(office => {
                const officeEmployees = EMPLOYEES.filter(e => e.office === office.code).sort((a, b) => a.name.localeCompare(b.name));
                if (officeEmployees.length === 0) return null;
                return (
                  <optgroup key={office.code} label={`📍 ${office.name} (${office.currency})`}>
                    {officeEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </optgroup>
                );
              })}
            </select>
          )}

          {loginStep === 'password' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-blue-800"><strong>{selectedEmployee?.name}</strong><br/>
                <span className="text-blue-600">{getUserOffice(selectedEmployee)?.name} • {selectedEmployee?.reimburseCurrency}</span></p>
              </div>
              <input type="password" className="w-full p-4 border-2 border-slate-200 rounded-xl text-lg focus:border-blue-500 outline-none" placeholder="Enter your password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleLogin()} autoFocus />
              {loginError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">⚠️ {loginError}</div>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setLoginStep('select'); setSelectedEmployee(null); }} className="flex-1 py-3 rounded-xl border-2 border-slate-300 font-semibold text-slate-600">← Back</button>
                <button onClick={handleLogin} className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg">Login 🔐</button>
              </div>
              <p className="text-center text-xs text-slate-400 mt-4">Default password: <code className="bg-slate-100 px-2 py-1 rounded">berkeley123</code></p>
            </div>
          )}

          <p className="text-center text-xs text-slate-400 mt-8">v1.8 - Admin Edit + PDF Improvements</p>
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
    const userReimburseCurrency = getUserReimburseCurrency(currentUser);
    
    const [formData, setFormData] = useState({
      merchant: '', amount: '', currency: userOffice?.currency || 'SGD',
      date: new Date().toISOString().split('T')[0], category: 'C', subcategory: 'Taxis',
      description: '', attendees: '', numberOfGuests: '', reimbursementAmount: '', reimbursementCurrency: userReimburseCurrency
    });

    const isForeignCurrency = formData.currency !== userReimburseCurrency;

    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        setReceiptFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setReceiptPreview(reader.result);
        reader.readAsDataURL(file);
        setStep(2);
      }
    };

    const handleSave = () => {
      const ref = getNextRef(formData.category);
      const newExpense = {
        id: Date.now(), ref, ...formData,
        amount: parseFloat(formData.amount),
        reimbursementAmount: isForeignCurrency ? parseFloat(formData.reimbursementAmount) : parseFloat(formData.amount),
        reimbursementCurrency: userReimburseCurrency,
        receiptFile: receiptFile?.name || 'receipt.jpg', receiptPreview,
        status: 'draft', isForeignCurrency, isOld: isOlderThan2Months(formData.date),
        createdAt: new Date().toISOString()
      };
      setExpenses(prev => [...prev, newExpense]);
      setShowAddExpense(false);
    };

    const needsAttendees = EXPENSE_CATEGORIES[formData.category]?.requiresAttendees;
    const canSave = formData.merchant && formData.amount && formData.date && formData.description && 
      (!needsAttendees || formData.attendees) && (!isForeignCurrency || formData.reimbursementAmount);

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">Add Expense</h2>
              <p className="text-blue-100 text-sm">Step {step} of 2 • Reimburse in {userReimburseCurrency}</p>
            </div>
            <button onClick={() => setShowAddExpense(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">✕</button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {step === 1 && (
              <label className="block border-3 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                <input type="file" accept="image/*,application/pdf" capture="environment" onChange={handleFileChange} className="hidden" />
                <div className="text-5xl mb-4">📸</div>
                <p className="font-semibold text-slate-700">Take photo or upload receipt</p>
              </label>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {receiptPreview && (
                  <div className="relative">
                    <img src={receiptPreview} alt="Receipt" className="w-full h-40 object-contain bg-slate-100 rounded-xl" />
                    <button onClick={() => { setStep(1); setReceiptFile(null); setReceiptPreview(null); }} className="absolute top-2 right-2 bg-white/90 px-3 py-1 rounded-lg text-sm shadow">📷 Retake</button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Merchant *</label>
                  <input type="text" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none" value={formData.merchant} onChange={e => setFormData(prev => ({ ...prev, merchant: e.target.value }))} />
                </div>

                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-600 uppercase">💵 Original Expense</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Amount *</label>
                      <input type="number" step="0.01" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none bg-white" value={formData.amount} onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Currency *</label>
                      <select className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none bg-white" value={formData.currency} onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))}>
                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {isForeignCurrency && (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-bold text-amber-800">💳 Foreign Currency - Enter {userReimburseCurrency} amount from statement</p>
                    <input type="number" step="0.01" className="w-full p-3 border-2 border-amber-300 rounded-xl outline-none bg-white" placeholder={`Amount in ${userReimburseCurrency}`} value={formData.reimbursementAmount} onChange={e => setFormData(prev => ({ ...prev, reimbursementAmount: e.target.value }))} />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Date *</label>
                  <input type="date" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none" value={formData.date} onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))} />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Category *</label>
                  <select className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none bg-white" value={formData.category} onChange={e => setFormData(prev => ({ ...prev, category: e.target.value, subcategory: EXPENSE_CATEGORIES[e.target.value].subcategories[0] }))}>
                    {Object.entries(EXPENSE_CATEGORIES).map(([key, val]) => <option key={key} value={key}>{val.icon} {key}. {val.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Sub-category *</label>
                  <select className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none bg-white" value={formData.subcategory} onChange={e => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}>
                    {EXPENSE_CATEGORIES[formData.category].subcategories.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description *</label>
                  <input type="text" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none" value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} />
                </div>

                {needsAttendees && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Attendees * (Name & Company)</label>
                    <textarea className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none resize-none" rows={2} value={formData.attendees} onChange={e => setFormData(prev => ({ ...prev, attendees: e.target.value }))} />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50">
            {step === 2 && (
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border-2 border-slate-300 font-semibold text-slate-600">← Back</button>
                <button onClick={handleSave} disabled={!canSave} className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg disabled:opacity-50">Save ✓</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // PREVIEW CLAIM MODAL
  // ============================================
  const PreviewClaimModal = () => {
    const userReimburseCurrency = getUserReimburseCurrency(currentUser);
    const groupedExpenses = pendingExpenses.reduce((acc, exp) => { if (!acc[exp.category]) acc[exp.category] = []; acc[exp.category].push(exp); return acc; }, {});
    const canSubmit = !hasForeignCurrency || (hasForeignCurrency && creditCardStatement);
    const getCategoryTotal = (cat) => (groupedExpenses[cat] || []).reduce((sum, e) => sum + parseFloat(e.reimbursementAmount || e.amount || 0), 0);
    const pages = ['Summary', 'Travel', 'Entertaining', 'Receipts'];

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-lg font-bold">📋 Preview</h2>
              <p className="text-blue-200 text-sm">{pages[previewPage]} • {userReimburseCurrency}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleDownloadPreviewPDF} disabled={downloading} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold text-sm">📥 PDF</button>
              <button onClick={() => { setShowPreview(false); setPreviewPage(0); }} className="w-8 h-8 rounded-full bg-white/20">✕</button>
            </div>
          </div>

          <div className="bg-slate-100 px-4 py-2 flex gap-2 overflow-x-auto shrink-0">
            {pages.map((page, idx) => <button key={idx} onClick={() => setPreviewPage(idx)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${previewPage === idx ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>{page}</button>)}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {previewPage === 0 && (
              <div className="max-w-3xl mx-auto border-2 border-slate-300 rounded-xl p-6">
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold">Motor & Expense Claim Form</h1>
                  <p className="text-sm text-slate-500">{getCompanyName(currentUser.office)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div><span className="text-slate-500">Name:</span> <strong>{currentUser.name}</strong></div>
                  <div><span className="text-slate-500">Currency:</span> <strong className="text-green-700">{userReimburseCurrency}</strong></div>
                </div>
                <table className="w-full text-sm border-collapse">
                  <tbody>
                    {Object.keys(EXPENSE_CATEGORIES).map(cat => (
                      <tr key={cat} className="border-b border-slate-200">
                        <td className="py-2 font-bold text-blue-700 w-8">{cat}.</td>
                        <td className="py-2">{EXPENSE_CATEGORIES[cat].name}</td>
                        <td className="py-2 text-right font-medium">{userReimburseCurrency} {getCategoryTotal(cat).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="bg-blue-50 p-4 rounded-xl mt-4 flex justify-between items-center">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-2xl text-blue-700">{formatCurrency(reimbursementTotal, userReimburseCurrency)}</span>
                </div>
              </div>
            )}

            {previewPage === 3 && (
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {pendingExpenses.map(exp => (
                    <div key={exp.id} className="border-2 border-slate-300 rounded-lg overflow-hidden">
                      <div className="bg-blue-100 p-2 flex justify-between"><span className="font-bold text-blue-700">{exp.ref}</span>{exp.isForeignCurrency && <span>💳</span>}</div>
                      {exp.receiptPreview ? <img src={exp.receiptPreview} alt={exp.ref} className="w-full h-24 object-cover" /> : <div className="w-full h-24 bg-slate-100 flex items-center justify-center text-3xl">📄</div>}
                      <div className="p-2 bg-slate-50 text-xs">
                        <p className="truncate font-medium">{exp.merchant}</p>
                        <p className="text-green-700 font-bold">{formatCurrency(exp.reimbursementAmount || exp.amount, userReimburseCurrency)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {hasForeignCurrency && !creditCardStatement && (
                  <div className="mt-6 bg-red-50 border-2 border-red-300 rounded-xl p-4">
                    <p className="text-red-800 font-bold">❌ CREDIT CARD STATEMENT REQUIRED</p>
                    <button onClick={() => { setShowPreview(false); setShowStatementUpload(true); }} className="mt-3 bg-amber-500 text-white px-4 py-2 rounded-lg font-semibold">📎 Upload</button>
                  </div>
                )}
              </div>
            )}

            {(previewPage === 1 || previewPage === 2) && <div className="text-center py-12 text-slate-400">Details shown in PDF</div>}
          </div>

          <div className="p-4 border-t bg-slate-50 flex gap-3 shrink-0">
            <button onClick={() => { setShowPreview(false); setPreviewPage(0); }} className="flex-1 py-3 rounded-xl border-2 border-slate-300 font-semibold text-slate-600">← Back</button>
            <button onClick={async () => { await handleSubmitClaim(); setShowPreview(false); setPreviewPage(0); }} disabled={!canSubmit || loading} className={`flex-[2] py-3 rounded-xl font-semibold shadow-lg ${canSubmit && !loading ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
              {loading ? '⏳...' : canSubmit ? 'Submit ✓' : '⚠️ Upload Statement'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const StatementUploadModal = () => {
    const [file, setFile] = useState(null);
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-5 flex justify-between items-center">
            <h2 className="text-lg font-bold">💳 Credit Card Statement</h2>
            <button onClick={() => setShowStatementUpload(false)} className="w-8 h-8 rounded-full bg-white/20">✕</button>
          </div>
          <div className="p-6">
            <label className={`block border-3 border-dashed rounded-2xl p-6 text-center cursor-pointer ${file ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:border-blue-500'}`}>
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
              {file ? <><div className="text-4xl mb-2">✅</div><p className="font-semibold text-green-700">{file.name}</p></> : <><div className="text-4xl mb-2">📄</div><p className="font-semibold">Upload statement</p></>}
            </label>
          </div>
          <div className="p-4 border-t bg-slate-50 flex gap-3">
            <button onClick={() => setShowStatementUpload(false)} className="flex-1 py-3 rounded-xl border-2 border-slate-300 font-semibold text-slate-600">Cancel</button>
            <button onClick={() => { setCreditCardStatement(file); setShowStatementUpload(false); setShowPreview(true); }} disabled={!file} className="flex-[2] py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50">Continue ✓</button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // SUBMIT & UPDATE CLAIM
  // ============================================
  const handleSubmitClaim = async () => {
    setLoading(true);
    try {
      // Check if resubmitting a returned claim
      const returnedClaim = claims.find(c => c.user_id === currentUser.id && c.status === 'changes_requested');
      
      if (returnedClaim) {
        // Update existing claim
        const { error } = await supabase.from('claims').update({
          total_amount: reimbursementTotal,
          item_count: pendingExpenses.length,
          status: 'pending_review',
          expenses: pendingExpenses,
          resubmitted_at: new Date().toISOString()
        }).eq('id', returnedClaim.id);
        
        if (!error) { setExpenses([]); setCreditCardStatement(null); await loadClaims(); alert('✅ Claim resubmitted!'); }
        else alert('❌ Failed');
      } else {
        // Create new claim
        const claimNumber = `EXP-2026-${String(claims.length + 1).padStart(3, '0')}`;
        const { error } = await supabase.from('claims').insert([{
          claim_number: claimNumber, user_id: currentUser.id, user_name: currentUser.name,
          office: userOffice?.name, currency: getUserReimburseCurrency(currentUser),
          total_amount: reimbursementTotal, item_count: pendingExpenses.length,
          status: 'pending_review', credit_card_statement: creditCardStatement?.name || null,
          expenses: pendingExpenses
        }]);
        if (!error) { setExpenses([]); setCreditCardStatement(null); await loadClaims(); alert('✅ Submitted!'); }
        else alert('❌ Failed');
      }
    } catch { alert('❌ Failed'); }
    setLoading(false);
  };

  // ============================================
  // ADMIN ACTIONS
  // ============================================
  const handleRequestChanges = async (claimId, comment) => {
    setLoading(true);
    await supabase.from('claims').update({ 
      status: 'changes_requested', 
      reviewed_by: currentUser.name,
      admin_comment: comment,
      reviewed_at: new Date().toISOString()
    }).eq('id', claimId);
    await loadClaims();
    setSelectedClaim(null);
    setShowRequestChanges(false);
    setChangeRequestComment('');
    setLoading(false);
    alert('✅ Sent back to employee for changes');
  };

  const handleApprove = async (id) => { 
    setLoading(true); 
    await supabase.from('claims').update({ status: 'approved', reviewed_by: currentUser.name, reviewed_at: new Date().toISOString() }).eq('id', id); 
    await loadClaims(); 
    setSelectedClaim(null); 
    setLoading(false); 
  };
  
  const handleReject = async (id) => { 
    setLoading(true); 
    await supabase.from('claims').update({ status: 'rejected', reviewed_by: currentUser.name, reviewed_at: new Date().toISOString() }).eq('id', id); 
    await loadClaims(); 
    setSelectedClaim(null); 
    setLoading(false); 
  };

  // ============================================
  // EDIT CLAIM MODAL (Admin)
  // ============================================
  const EditClaimModal = ({ claim, onClose }) => {
    const [editedExpenses, setEditedExpenses] = useState(claim.expenses || []);
    const [saving, setSaving] = useState(false);

    const updateExpense = (idx, field, value) => {
      setEditedExpenses(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
    };

    const deleteExpense = (idx) => {
      setEditedExpenses(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSaveEdits = async () => {
      setSaving(true);
      const newTotal = editedExpenses.reduce((sum, e) => sum + parseFloat(e.reimbursementAmount || e.amount || 0), 0);
      await supabase.from('claims').update({
        expenses: editedExpenses,
        total_amount: newTotal,
        item_count: editedExpenses.length,
        edited_by: currentUser.name,
        edited_at: new Date().toISOString()
      }).eq('id', claim.id);
      await loadClaims();
      setSaving(false);
      onClose();
      alert('✅ Changes saved');
    };

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-5 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">✏️ Edit Claim</h2>
              <p className="text-purple-200 text-sm">{claim.user_name} • {claim.claim_number}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20">✕</button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="space-y-4">
              {editedExpenses.map((exp, idx) => (
                <div key={idx} className="border-2 border-slate-200 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-lg">{exp.ref}</span>
                    <button onClick={() => deleteExpense(idx)} className="text-red-500 hover:text-red-700 text-sm">🗑️ Delete</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Merchant</label>
                      <input type="text" className="w-full p-2 border rounded-lg text-sm" value={exp.merchant} onChange={e => updateExpense(idx, 'merchant', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Amount ({claim.currency})</label>
                      <input type="number" step="0.01" className="w-full p-2 border rounded-lg text-sm" value={exp.reimbursementAmount || exp.amount} onChange={e => updateExpense(idx, 'reimbursementAmount', parseFloat(e.target.value))} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
                      <input type="text" className="w-full p-2 border rounded-lg text-sm" value={exp.description} onChange={e => updateExpense(idx, 'description', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-slate-100 p-4 rounded-xl">
              <div className="flex justify-between items-center">
                <span className="font-bold">New Total:</span>
                <span className="font-bold text-xl text-blue-700">
                  {claim.currency} {editedExpenses.reduce((sum, e) => sum + parseFloat(e.reimbursementAmount || e.amount || 0), 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 border-t bg-slate-50 flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-slate-300 font-semibold text-slate-600">Cancel</button>
            <button onClick={handleSaveEdits} disabled={saving} className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold disabled:opacity-50">
              {saving ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // REQUEST CHANGES MODAL
  // ============================================
  const RequestChangesModal = ({ claim, onClose }) => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-5 flex justify-between items-center">
          <h2 className="text-lg font-bold">📝 Request Changes</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20">✕</button>
        </div>
        <div className="p-6">
          <p className="text-slate-600 mb-4">Send this claim back to <strong>{claim.user_name}</strong> for corrections:</p>
          <textarea
            className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-amber-500 outline-none resize-none"
            rows={4}
            placeholder="Describe what needs to be corrected..."
            value={changeRequestComment}
            onChange={(e) => setChangeRequestComment(e.target.value)}
          />
        </div>
        <div className="p-4 border-t bg-slate-50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-slate-300 font-semibold text-slate-600">Cancel</button>
          <button 
            onClick={() => handleRequestChanges(claim.id, changeRequestComment)} 
            disabled={!changeRequestComment.trim() || loading}
            className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold disabled:opacity-50"
          >
            Send Back 📤
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================
  // TABS
  // ============================================
  const MyExpensesTab = () => {
    const myClaims = claims.filter(c => c.user_id === currentUser.id);
    const returnedClaims = myClaims.filter(c => c.status === 'changes_requested');
    const userReimburseCurrency = getUserReimburseCurrency(currentUser);
    const groupedExpenses = pendingExpenses.reduce((acc, exp) => { if (!acc[exp.category]) acc[exp.category] = []; acc[exp.category].push(exp); return acc; }, {});

    return (
      <div className="space-y-4">
        {/* Returned Claims Alert */}
        {returnedClaims.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4">
            <h3 className="font-bold text-amber-800 mb-2">⚠️ Changes Requested</h3>
            {returnedClaims.map(claim => (
              <div key={claim.id} className="bg-white rounded-lg p-3 mb-2">
                <p className="font-semibold">{claim.claim_number}</p>
                <p className="text-sm text-amber-700 mt-1">"{claim.admin_comment}"</p>
                <p className="text-xs text-slate-500 mt-1">From: {claim.reviewed_by}</p>
              </div>
            ))}
            <p className="text-sm text-amber-700 mt-2">Your expenses have been loaded for editing. Make corrections and resubmit.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="text-4xl font-bold text-slate-800">{pendingExpenses.length}</div>
            <div className="text-sm text-slate-500">Pending</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(reimbursementTotal, userReimburseCurrency)}</div>
            <div className="text-sm text-slate-500">To Reimburse</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setShowAddExpense(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg">📸 Add Receipt</button>
            {pendingExpenses.length > 0 && (
              <button onClick={() => setShowPreview(true)} className="bg-white border-2 border-green-500 text-green-600 px-6 py-3 rounded-xl font-semibold">📋 Preview ({pendingExpenses.length})</button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-800 mb-4">📋 Pending ({pendingExpenses.length})</h3>
          {pendingExpenses.length === 0 ? (
            <div className="text-center py-12 text-slate-400">📭 No pending expenses</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(groupedExpenses).sort().map(([cat, exps]) => (
                <div key={cat}>
                  <p className="text-xs font-semibold text-slate-500 mb-2">{EXPENSE_CATEGORIES[cat]?.icon} {cat}. {EXPENSE_CATEGORIES[cat]?.name}</p>
                  {exps.map(exp => (
                    <div key={exp.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border mb-2">
                      <div className="flex-1">
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded mr-2">{exp.ref}</span>
                        <span className="font-semibold">{exp.merchant}</span>
                        {exp.isForeignCurrency && <span className="ml-2 text-amber-600 text-xs">💳</span>}
                        <p className="text-xs text-slate-500 mt-1">{exp.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-700">{formatCurrency(exp.reimbursementAmount || exp.amount, userReimburseCurrency)}</div>
                        <button onClick={() => setExpenses(prev => prev.filter(e => e.id !== exp.id))} className="text-xs text-red-500">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-800 mb-4">📁 My Claims ({myClaims.length})</h3>
          {myClaims.filter(c => c.status !== 'changes_requested').length === 0 ? <p className="text-center text-slate-400 py-8">None yet</p> : (
            <div className="space-y-2">
              {myClaims.filter(c => c.status !== 'changes_requested').map(claim => (
                <div key={claim.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border">
                  <div>
                    <span className="font-semibold">{claim.claim_number}</span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${claim.status === 'approved' ? 'bg-green-100 text-green-700' : claim.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{claim.status}</span>
                    <p className="text-sm text-slate-500">{claim.item_count} items</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">{formatCurrency(claim.total_amount, claim.currency)}</span>
                    <button onClick={() => handleDownloadPDF(claim)} className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm">📥</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const ReviewClaimsTab = () => {
    const visibleClaims = getVisibleClaims();
    const pendingClaims = visibleClaims.filter(c => c.status === 'pending_review');

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-lg p-5 text-center"><div className="text-3xl font-bold text-amber-500">{pendingClaims.length}</div><div className="text-xs text-slate-500">Pending</div></div>
          <div className="bg-white rounded-2xl shadow-lg p-5 text-center"><div className="text-3xl font-bold text-orange-500">{visibleClaims.filter(c => c.status === 'changes_requested').length}</div><div className="text-xs text-slate-500">Returned</div></div>
          <div className="bg-white rounded-2xl shadow-lg p-5 text-center"><div className="text-3xl font-bold text-green-500">{visibleClaims.filter(c => c.status === 'approved').length}</div><div className="text-xs text-slate-500">Approved</div></div>
          <div className="bg-white rounded-2xl shadow-lg p-5 text-center"><div className="text-3xl font-bold text-red-500">{visibleClaims.filter(c => c.status === 'rejected').length}</div><div className="text-xs text-slate-500">Rejected</div></div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold mb-4">📊 To Review</h3>
          {pendingClaims.length === 0 ? <div className="text-center py-12 text-slate-400">✅ All done</div> : (
            <div className="space-y-2">
              {pendingClaims.map(claim => (
                <div key={claim.id} onClick={() => setSelectedClaim(claim)} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border cursor-pointer hover:border-blue-300">
                  <div><span className="font-semibold">{claim.user_name}</span><p className="text-sm text-slate-500">{claim.office} • {claim.item_count} items</p></div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">{formatCurrency(claim.total_amount, claim.currency)}</span>
                    <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(claim); }} className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm">📥</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Claim Detail */}
        {selectedClaim && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setSelectedClaim(null)}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b flex justify-between">
                <div><h2 className="text-xl font-bold">{selectedClaim.user_name}</h2><p className="text-sm text-slate-500">{selectedClaim.claim_number}</p></div>
                <button onClick={() => setSelectedClaim(null)} className="text-2xl text-slate-400">×</button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-50 rounded-xl p-4"><div className="text-sm text-slate-500">Total</div><div className="text-2xl font-bold">{formatCurrency(selectedClaim.total_amount, selectedClaim.currency)}</div></div>
                  <div className="bg-slate-50 rounded-xl p-4"><div className="text-sm text-slate-500">Items</div><div className="text-2xl font-bold">{selectedClaim.item_count}</div></div>
                </div>
                
                <button onClick={() => handleDownloadPDF(selectedClaim)} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold mb-4">📥 Download PDF</button>
                
                {selectedClaim.expenses?.map((exp, i) => (
                  <div key={i} className="flex justify-between py-2 border-b">
                    <span><span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded mr-2">{exp.ref}</span>{exp.merchant}</span>
                    <span className="font-semibold">{formatCurrency(exp.reimbursementAmount || exp.amount, selectedClaim.currency)}</span>
                  </div>
                ))}
              </div>
              
              {selectedClaim.status === 'pending_review' && (
                <div className="p-4 border-t bg-slate-50 space-y-3">
                  <div className="flex gap-3">
                    <button onClick={() => { setEditingClaim(selectedClaim); setSelectedClaim(null); }} className="flex-1 py-3 rounded-xl bg-purple-500 text-white font-semibold">✏️ Edit</button>
                    <button onClick={() => { setShowRequestChanges(true); }} className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-semibold">📝 Request Changes</button>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleReject(selectedClaim.id)} disabled={loading} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold disabled:opacity-50">Reject</button>
                    <button onClick={() => handleApprove(selectedClaim.id)} disabled={loading} className="flex-[2] py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50">Approve ✓</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {editingClaim && <EditClaimModal claim={editingClaim} onClose={() => setEditingClaim(null)} />}
        {showRequestChanges && selectedClaim && <RequestChangesModal claim={selectedClaim} onClose={() => setShowRequestChanges(false)} />}
      </div>
    );
  };

  const canReview = currentUser.role === 'admin' || currentUser.role === 'finance';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 py-3 shadow-lg sticky top-0 z-40">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">Berkeley Expenses</div>
            <div className="text-xs text-slate-400">{userOffice?.name} • {getUserReimburseCurrency(currentUser)}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">{currentUser.name.split(' ').slice(0, 2).join(' ')}</div>
              <div className="text-xs text-slate-400 capitalize">{currentUser.role}</div>
            </div>
            <button onClick={() => { setCurrentUser(null); setExpenses([]); setCreditCardStatement(null); setActiveTab('my_expenses'); }} className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-xs font-medium">Logout</button>
          </div>
        </div>
      </header>

      {canReview && (
        <div className="bg-white border-b sticky top-14 z-30">
          <div className="max-w-3xl mx-auto flex">
            <button onClick={() => setActiveTab('my_expenses')} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${activeTab === 'my_expenses' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>📋 My Expenses</button>
            <button onClick={() => setActiveTab('review')} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${activeTab === 'review' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
              👀 Review
              {getVisibleClaims().filter(c => c.status === 'pending_review').length > 0 && <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">{getVisibleClaims().filter(c => c.status === 'pending_review').length}</span>}
            </button>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto p-4 pb-20">
        {canReview && activeTab === 'review' ? <ReviewClaimsTab /> : <MyExpensesTab />}
      </main>

      {showAddExpense && <AddExpenseModal />}
      {showPreview && <PreviewClaimModal />}
      {showStatementUpload && <StatementUploadModal />}
    </div>
  );
}
