import React, { useState, useEffect } from 'react';

/*
 * ============================================
 * BERKELEY INTERNATIONAL EXPENSE MANAGEMENT SYSTEM
 * Version: 1.6 - Fixed PDF + Foreign Currency Reimbursement
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
// EMPLOYEES
// ============================================
const EMPLOYEES = [
  { id: 1, name: 'Chris Frame', office: 'DXB', role: 'employee', reimburseCurrency: 'AED' },
  { id: 2, name: 'Keisha Whitehorne', office: 'DXB', role: 'employee', reimburseCurrency: 'AED' },
  { id: 3, name: 'Farah Ahmed', office: 'DXB', role: 'employee', reimburseCurrency: 'GBP' },
  { id: 4, name: 'Mouna Hassan', office: 'DXB', role: 'employee', reimburseCurrency: 'GBP' },
  { id: 5, name: 'Christine Tan', office: 'DXB', role: 'admin', reimburseCurrency: 'AED' },
  { id: 6, name: 'Cathy He', office: 'DXB', role: 'admin', reimburseCurrency: 'AED' },
  { id: 10, name: 'Kate Tai', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD' },
  { id: 11, name: 'Anthony Jurenko', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD' },
  { id: 12, name: 'Lisa Wong', office: 'HKG', role: 'admin', reimburseCurrency: 'HKD' },
  { id: 20, name: 'Joanne Chee', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD' },
  { id: 21, name: 'Karen Lim', office: 'SIN', role: 'admin', reimburseCurrency: 'SGD' },
  { id: 22, name: 'Ong Yongle', office: 'SIN', role: 'finance', reimburseCurrency: 'SGD' },
  { id: 23, name: 'Emma Fowler', office: 'SIN', role: 'finance', reimburseCurrency: 'GBP' },
  { id: 30, name: 'Somchai Prasert', office: 'BKK', role: 'employee', reimburseCurrency: 'THB' },
  { id: 31, name: 'Nattaya Srisuk', office: 'BKK', role: 'admin', reimburseCurrency: 'THB' },
  { id: 40, name: 'Wei Chen', office: 'SHA', role: 'employee', reimburseCurrency: 'CNY' },
  { id: 41, name: 'Zhang Li', office: 'SHA', role: 'admin', reimburseCurrency: 'CNY' },
  { id: 50, name: 'Li Ming', office: 'BEJ', role: 'employee', reimburseCurrency: 'CNY' },
  { id: 60, name: 'Wang Fang', office: 'CHE', role: 'employee', reimburseCurrency: 'CNY' },
  { id: 70, name: 'Chen Wei', office: 'SHE', role: 'employee', reimburseCurrency: 'CNY' },
];

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

  const getUserOffice = (user) => OFFICES.find(o => o.code === user?.office);
  const userOffice = getUserOffice(currentUser);
  const getUserReimburseCurrency = (user) => user?.reimburseCurrency || getUserOffice(user)?.currency;
  const pendingExpenses = expenses.filter(e => e.status === 'draft');
  
  // Calculate totals by REIMBURSEMENT currency
  const reimbursementTotal = pendingExpenses.reduce((sum, e) => {
    const amount = e.reimbursementAmount || e.amount;
    return sum + parseFloat(amount || 0);
  }, 0);
  
  const foreignCurrencyExpenses = pendingExpenses.filter(e => e.isForeignCurrency);
  const hasForeignCurrency = foreignCurrencyExpenses.length > 0;
  const hasOldExpenses = pendingExpenses.some(e => e.isOld);

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
  // PDF GENERATION - Using HTML to PDF approach
  // ============================================
  const generatePDFFromHTML = async (expenseList, userName, officeName, claimNumber, submittedDate, creditCardStatementName, reimburseCurrency) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download PDF');
      return;
    }

    const groupedExpenses = expenseList.reduce((acc, exp) => {
      if (!acc[exp.category]) acc[exp.category] = [];
      acc[exp.category].push(exp);
      return acc;
    }, {});

    const getSubcategoryTotal = (cat, subcat) => {
      return (groupedExpenses[cat] || [])
        .filter(e => e.subcategory === subcat)
        .reduce((sum, e) => sum + (e.reimbursementAmount || e.amount), 0);
    };

    const getCategoryTotal = (cat) => {
      return (groupedExpenses[cat] || []).reduce((sum, e) => sum + (e.reimbursementAmount || e.amount), 0);
    };

    const totalAmount = expenseList.reduce((sum, e) => sum + (e.reimbursementAmount || e.amount), 0);
    const claimMonth = expenseList.length > 0 ? getMonthYear(expenseList[0].date) : '';
    const travelExpenses = [...(groupedExpenses['B'] || []), ...(groupedExpenses['C'] || []), ...(groupedExpenses['D'] || [])];
    const entertainingExpenses = [...(groupedExpenses['E'] || []), ...(groupedExpenses['F'] || [])];

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
              <span class="amount">Original: ${formatCurrency(exp.amount, exp.currency)}</span>
              ${exp.isForeignCurrency ? `<br><span class="reimburse">Reimburse: ${formatCurrency(exp.reimbursementAmount, exp.reimbursementCurrency)}</span>` : ''}
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
          body { font-family: Arial, sans-serif; font-size: 11px; }
          .page { page-break-after: always; padding: 15mm; min-height: 100vh; }
          .page:last-child { page-break-after: avoid; }
          
          .header { background: #1a237e; color: white; padding: 15px; margin-bottom: 15px; display: flex; align-items: center; }
          .logo { width: 50px; height: 50px; background: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; color: #1a237e; margin-right: 15px; }
          .header-text h1 { font-size: 18px; margin-bottom: 3px; }
          .header-text p { font-size: 11px; opacity: 0.9; }
          
          .info-box { border: 1px solid #999; margin-bottom: 15px; }
          .info-row { display: flex; border-bottom: 1px solid #ddd; }
          .info-row:last-child { border-bottom: none; }
          .info-cell { flex: 1; padding: 8px 12px; }
          .info-cell:first-child { border-right: 1px solid #ddd; }
          .info-label { color: #666; font-size: 10px; }
          .info-value { font-weight: bold; color: #003399; }
          
          .section-title { background: #e0e0e0; padding: 8px 12px; font-weight: bold; font-size: 12px; }
          .subsection-title { background: #f5f5f5; padding: 6px 12px; font-weight: bold; font-size: 11px; border-bottom: 1px solid #ddd; }
          
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
          th { background: #e0e0e0; font-size: 10px; }
          .amount-col { text-align: right; width: 80px; }
          .ref-col { width: 50px; font-weight: bold; color: #003399; }
          .cat-link { color: #003399; }
          
          .total-row { background: #e3f2fd; }
          .total-row td { font-weight: bold; font-size: 13px; }
          .total-amount { color: #003399; }
          
          .signature-section { margin-top: 20px; }
          .sig-row { display: flex; margin-bottom: 15px; }
          .sig-field { flex: 1; }
          .sig-label { font-size: 10px; color: #666; margin-bottom: 5px; }
          .sig-line { border-bottom: 1px solid #999; height: 25px; display: flex; align-items: flex-end; padding-bottom: 3px; }
          .sig-value { color: #003399; font-style: italic; }
          
          .warning-box { background: #fff8e1; border: 1px solid #ffb300; padding: 8px 12px; margin-bottom: 10px; font-size: 10px; color: #8d6e00; }
          
          .receipt-page { padding: 10mm; }
          .receipt-header { background: #1a237e; color: white; padding: 15px; margin-bottom: 10px; display: flex; align-items: center; }
          .receipt-ref { font-size: 32px; font-weight: bold; margin-right: 20px; }
          .receipt-info { font-size: 12px; }
          .receipt-info .amount { font-weight: bold; }
          .receipt-info .reimburse { color: #90caf9; }
          .receipt-img { max-width: 100%; max-height: 220mm; object-fit: contain; display: block; margin: 0 auto; }
          .no-receipt { background: #f5f5f5; padding: 50px; text-align: center; color: #999; }
          
          @media print {
            .page { padding: 10mm; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <!-- Page 1: Summary -->
        <div class="page">
          <div class="header">
            <div class="logo">B</div>
            <div class="header-text">
              <h1>Motor & Expense Claim Form</h1>
              <p>Berkeley London Residential Ltd</p>
            </div>
          </div>
          
          <div class="info-box">
            <div class="info-row">
              <div class="info-cell"><span class="info-label">Name</span><br><span class="info-value">${userName}</span></div>
              <div class="info-cell"><span class="info-label">Month</span><br><span class="info-value">${claimMonth}</span></div>
            </div>
            <div class="info-row">
              <div class="info-cell"><span class="info-label">Office</span><br><span class="info-value">${officeName}</span></div>
              <div class="info-cell"><span class="info-label">Claim #</span><br><span class="info-value">${claimNumber || 'DRAFT'}</span></div>
            </div>
            <div class="info-row">
              <div class="info-cell"><span class="info-label">Reimbursement Currency</span><br><span class="info-value">${reimburseCurrency}</span></div>
              <div class="info-cell"></div>
            </div>
          </div>
          
          <div class="section-title">Expenses Claim</div>
          <div class="subsection-title">Motor Vehicle Expenditure</div>
          <table>
            <tr><td class="ref-col">A.</td><td class="cat-link">Petrol Expenditure</td><td>Full Petrol Allowance / Fuel Card</td><td class="amount-col">${getCategoryTotal('A').toFixed(2)}</td></tr>
            <tr><td class="ref-col">B.</td><td class="cat-link">Parking</td><td>Off-Street Parking</td><td class="amount-col">${getCategoryTotal('B').toFixed(2)}</td></tr>
            <tr><td class="ref-col">C.</td><td class="cat-link">Travel Expenses</td><td>Taxis</td><td class="amount-col">${getSubcategoryTotal('C', 'Taxis').toFixed(2)}</td></tr>
            <tr><td></td><td></td><td>Public Transport / Tolls / Subsistence</td><td class="amount-col">${(getSubcategoryTotal('C', 'Public Transport') + getSubcategoryTotal('C', 'Tolls') + getSubcategoryTotal('C', 'Subsistence') + getSubcategoryTotal('C', 'Congestion Charging')).toFixed(2)}</td></tr>
            <tr><td class="ref-col">D.</td><td class="cat-link">Vehicle Repairs</td><td>Repairs / Parts</td><td class="amount-col">${getCategoryTotal('D').toFixed(2)}</td></tr>
          </table>
          
          <div class="subsection-title">Business Expenditure</div>
          <table>
            <tr><td class="ref-col">E.</td><td class="cat-link">Entertaining</td><td>Customers / Employees</td><td class="amount-col">${getCategoryTotal('E').toFixed(2)}</td></tr>
            <tr><td class="ref-col">F.</td><td class="cat-link">Welfare</td><td>Hotels / Gifts</td><td class="amount-col">${getCategoryTotal('F').toFixed(2)}</td></tr>
            <tr><td class="ref-col">G-I.</td><td class="cat-link">Other</td><td>Subscriptions / Computer / WIP</td><td class="amount-col">${(getCategoryTotal('G') + getCategoryTotal('H') + getCategoryTotal('I')).toFixed(2)}</td></tr>
          </table>
          
          <table>
            <tr class="total-row">
              <td colspan="3"><strong>Total expenses claimed</strong></td>
              <td class="amount-col total-amount">${reimburseCurrency} ${totalAmount.toFixed(2)}</td>
            </tr>
          </table>
          
          <div class="signature-section">
            <div class="sig-row">
              <div class="sig-field">
                <div class="sig-label">Signature of Claimant</div>
                <div class="sig-line"><span class="sig-value">${userName}</span></div>
              </div>
              <div class="sig-field" style="margin-left: 20px;">
                <div class="sig-label">Date</div>
                <div class="sig-line">${formatDate(submittedDate || new Date().toISOString())}</div>
              </div>
            </div>
            <div class="sig-field">
              <div class="sig-label">Authorised</div>
              <div class="sig-line"></div>
            </div>
          </div>
        </div>
        
        <!-- Page 2: Travel Detail -->
        <div class="page">
          <div class="header">
            <div class="logo">B</div>
            <div class="header-text">
              <h1>Travel Expense Detail</h1>
              <p>${userName}</p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Ref</th>
                <th>Parking</th>
                <th>Pub.Trans</th>
                <th>Taxis</th>
                <th>Tolls</th>
                <th>Subsist.</th>
                <th>Repairs</th>
                <th>Parts</th>
                <th>Description</th>
                <th>Amount (${reimburseCurrency})</th>
              </tr>
            </thead>
            <tbody>
              ${travelExpenses.length === 0 ? '<tr><td colspan="10" style="text-align:center;padding:20px;color:#999;">No travel expenses</td></tr>' : 
                travelExpenses.map(exp => `
                  <tr>
                    <td class="ref-col">${exp.ref}</td>
                    <td class="amount-col">${exp.category === 'B' ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                    <td class="amount-col">${exp.subcategory === 'Public Transport' ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                    <td class="amount-col">${exp.subcategory === 'Taxis' ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                    <td class="amount-col">${exp.subcategory === 'Tolls' ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                    <td class="amount-col">${exp.subcategory === 'Subsistence' ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                    <td class="amount-col">${exp.subcategory === 'Repairs' ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                    <td class="amount-col">${exp.subcategory === 'Parts' ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                    <td>${exp.description || ''}</td>
                    <td class="amount-col"><strong>${(exp.reimbursementAmount || exp.amount).toFixed(2)}</strong></td>
                  </tr>
                `).join('')}
              <tr class="total-row">
                <td colspan="9"><strong>Total Travel Expenses</strong></td>
                <td class="amount-col total-amount">${(getCategoryTotal('B') + getCategoryTotal('C') + getCategoryTotal('D')).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Page 3: Entertaining Detail -->
        <div class="page">
          <div class="header">
            <div class="logo">B</div>
            <div class="header-text">
              <h1>Entertaining and Welfare Detail</h1>
              <p>${userName}</p>
            </div>
          </div>
          
          <div class="warning-box">
            ⚠️ PLEASE ENSURE A FULL LIST OF GUESTS ENTERTAINED ARE SUPPLIED WITH EACH RECEIPT
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Ref</th>
                <th>Emp. Meals</th>
                <th>Bus. Meals</th>
                <th>Hotels</th>
                <th>Gifts</th>
                <th>Description / Attendees</th>
                <th>Amount (${reimburseCurrency})</th>
              </tr>
            </thead>
            <tbody>
              ${entertainingExpenses.length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:20px;color:#999;">No entertaining expenses</td></tr>' : 
                entertainingExpenses.map(exp => `
                  <tr>
                    <td class="ref-col">${exp.ref}</td>
                    <td class="amount-col">${exp.category === 'E' && exp.subcategory?.includes('Employee') ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                    <td class="amount-col">${exp.category === 'E' && exp.subcategory?.includes('Customer') ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                    <td class="amount-col">${exp.category === 'F' && exp.subcategory?.includes('Hotel') ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                    <td class="amount-col">${exp.category === 'F' && !exp.subcategory?.includes('Hotel') ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                    <td>${exp.merchant}${exp.attendees ? ' - ' + exp.attendees : ''}</td>
                    <td class="amount-col"><strong>${(exp.reimbursementAmount || exp.amount).toFixed(2)}</strong></td>
                  </tr>
                `).join('')}
              <tr class="total-row">
                <td colspan="6"><strong>Total Entertaining & Welfare</strong></td>
                <td class="amount-col total-amount">${(getCategoryTotal('E') + getCategoryTotal('F')).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Receipt Pages -->
        ${receiptsHTML}
        
        ${creditCardStatementName ? `
        <div class="page">
          <div class="header" style="background: #ff9800;">
            <div class="logo" style="color: #ff9800;">💳</div>
            <div class="header-text">
              <h1>Credit Card Statement</h1>
              <p>Supporting document for foreign currency expenses</p>
            </div>
          </div>
          <p style="margin-top: 20px;">Attached file: <strong>${creditCardStatementName}</strong></p>
          <p style="color: #666; margin-top: 10px;">(Statement uploaded separately)</p>
        </div>
        ` : ''}
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
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
      const office = OFFICES.find(o => employee && o.code === employee.office);
      const reimburseCurrency = employee?.reimburseCurrency || office?.currency || claim.currency;
      await generatePDFFromHTML(
        claim.expenses || [],
        claim.user_name,
        office?.name || claim.office,
        claim.claim_number,
        claim.submitted_at,
        claim.credit_card_statement,
        reimburseCurrency
      );
    } catch (err) {
      console.error('Download error:', err);
      alert('❌ Failed to download PDF. Please try again.');
    }
    setDownloading(false);
  };

  const handleDownloadPreviewPDF = async () => {
    setDownloading(true);
    try {
      const draftClaimNumber = `DRAFT-${new Date().getTime().toString().slice(-6)}`;
      const reimburseCurrency = getUserReimburseCurrency(currentUser);
      await generatePDFFromHTML(
        pendingExpenses,
        currentUser.name,
        userOffice?.name,
        draftClaimNumber,
        new Date().toISOString(),
        creditCardStatement?.name,
        reimburseCurrency
      );
    } catch (err) {
      console.error('Download error:', err);
      alert('❌ Failed to download PDF. Please try again.');
    }
    setDownloading(false);
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

          <select
            className="w-full p-4 border-2 border-slate-200 rounded-xl text-lg focus:border-blue-500 outline-none bg-white"
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
                      {emp.name} {emp.role !== 'employee' ? `(${emp.role})` : ''} [{emp.reimburseCurrency}]
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>

          <p className="text-center text-xs text-slate-400 mt-8">v1.6 - Foreign Currency Reimbursement</p>
        </div>
      </div>
    );
  }

  // ============================================
  // ADD EXPENSE MODAL - With Foreign Currency Fields
  // ============================================
  const AddExpenseModal = () => {
    const [step, setStep] = useState(1);
    const [receiptFile, setReceiptFile] = useState(null);
    const [receiptPreview, setReceiptPreview] = useState(null);
    const userReimburseCurrency = getUserReimburseCurrency(currentUser);
    
    const [formData, setFormData] = useState({
      merchant: '',
      amount: '',
      currency: userOffice?.currency || 'SGD',
      date: new Date().toISOString().split('T')[0],
      category: 'C',
      subcategory: 'Taxis',
      description: '',
      attendees: '',
      numberOfGuests: '',
      reimbursementAmount: '',
      reimbursementCurrency: userReimburseCurrency
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
        id: Date.now(),
        ref,
        ...formData,
        amount: parseFloat(formData.amount),
        reimbursementAmount: isForeignCurrency ? parseFloat(formData.reimbursementAmount) : parseFloat(formData.amount),
        reimbursementCurrency: userReimburseCurrency,
        receiptFile: receiptFile?.name || 'receipt.jpg',
        receiptPreview,
        status: 'draft',
        isForeignCurrency,
        isOld: isOlderThan2Months(formData.date),
        createdAt: new Date().toISOString()
      };
      setExpenses(prev => [...prev, newExpense]);
      setShowAddExpense(false);
    };

    const needsAttendees = EXPENSE_CATEGORIES[formData.category]?.requiresAttendees;
    const isChina = userOffice?.country === 'China';
    
    const canSave = formData.merchant && formData.amount && formData.date && formData.description && 
      (!needsAttendees || formData.attendees) &&
      (!isForeignCurrency || formData.reimbursementAmount);

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

                {/* Original Expense Amount & Currency */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-600 uppercase">💵 Original Expense (Receipt Amount)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Amount *</label>
                      <input type="number" step="0.01" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none bg-white" placeholder="0.00" value={formData.amount} onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Currency *</label>
                      <select className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none bg-white" value={formData.currency} onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))}>
                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Foreign Currency - Reimbursement Fields */}
                {isForeignCurrency && (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">💳</span>
                      <div>
                        <p className="text-sm font-bold text-amber-800">Foreign Currency Detected</p>
                        <p className="text-xs text-amber-700">Enter the amount from your credit card statement in {userReimburseCurrency}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-amber-700 mb-1">Reimbursement Amount *</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          className="w-full p-3 border-2 border-amber-300 rounded-xl focus:border-amber-500 outline-none bg-white" 
                          placeholder="From credit card statement" 
                          value={formData.reimbursementAmount} 
                          onChange={e => setFormData(prev => ({ ...prev, reimbursementAmount: e.target.value }))} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-amber-700 mb-1">Reimburse Currency</label>
                        <input 
                          type="text" 
                          className="w-full p-3 border-2 border-amber-300 rounded-xl bg-amber-100 text-amber-800 font-bold" 
                          value={userReimburseCurrency}
                          disabled
                        />
                      </div>
                    </div>
                    
                    <p className="text-xs text-amber-700 italic">
                      ⚠️ You will also need to upload your credit card statement before submitting.
                    </p>
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
                <button onClick={handleSave} disabled={!canSave} className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
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
  // PREVIEW CLAIM MODAL
  // ============================================
  const PreviewClaimModal = () => {
    const userReimburseCurrency = getUserReimburseCurrency(currentUser);
    
    const groupedExpenses = pendingExpenses.reduce((acc, exp) => {
      if (!acc[exp.category]) acc[exp.category] = [];
      acc[exp.category].push(exp);
      return acc;
    }, {});

    const canSubmit = !hasForeignCurrency || (hasForeignCurrency && creditCardStatement);
    
    const getSubcategoryTotal = (cat, subcat) => {
      return (groupedExpenses[cat] || [])
        .filter(e => e.subcategory === subcat)
        .reduce((sum, e) => sum + (e.reimbursementAmount || e.amount), 0);
    };

    const getCategoryTotal = (cat) => {
      return (groupedExpenses[cat] || []).reduce((sum, e) => sum + (e.reimbursementAmount || e.amount), 0);
    };

    const claimMonth = pendingExpenses.length > 0 ? getMonthYear(pendingExpenses[0].date) : getMonthYear(new Date().toISOString());
    const pages = ['Summary', 'Travel Detail', 'Entertaining Detail', 'Receipts'];
    const travelExpenses = [...(groupedExpenses['B'] || []), ...(groupedExpenses['C'] || []), ...(groupedExpenses['D'] || [])];
    const entertainingExpenses = [...(groupedExpenses['E'] || []), ...(groupedExpenses['F'] || [])];

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-lg font-bold">📋 Expense Claim Form Preview</h2>
              <p className="text-blue-200 text-sm">Page {previewPage + 1} of {pages.length} • Reimburse in {userReimburseCurrency}</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleDownloadPreviewPDF}
                disabled={downloading}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {downloading ? '⏳' : '📥'} Download PDF
              </button>
              <button onClick={() => { setShowPreview(false); setPreviewPage(0); }} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">✕</button>
            </div>
          </div>

          <div className="bg-slate-100 px-4 py-2 flex gap-2 overflow-x-auto shrink-0">
            {pages.map((page, idx) => (
              <button
                key={idx}
                onClick={() => setPreviewPage(idx)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  previewPage === idx ? 'bg-blue-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-200'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* PAGE 0: Summary */}
            {previewPage === 0 && (
              <div className="max-w-3xl mx-auto">
                <div className="border-2 border-slate-400 mb-4">
                  <div className="flex">
                    <div className="w-24 bg-slate-100 p-2 flex items-center justify-center border-r border-slate-400">
                      <div className="w-16 h-16 bg-blue-900 rounded-lg flex items-center justify-center text-white text-2xl font-bold">B</div>
                    </div>
                    <div className="flex-1 text-center py-4">
                      <h1 className="text-xl font-bold">Motor & Expense Claim Form</h1>
                      <p className="text-sm text-slate-600">Berkeley London Residential Ltd</p>
                    </div>
                  </div>
                </div>

                <div className="border-2 border-slate-400 mb-4">
                  <div className="grid grid-cols-2">
                    <div className="border-r border-b border-slate-400 p-3 flex">
                      <span className="text-slate-600 w-24">Name</span>
                      <span className="font-semibold text-blue-700">{currentUser.name}</span>
                    </div>
                    <div className="border-b border-slate-400 p-3 flex">
                      <span className="text-slate-600 w-24">Month</span>
                      <span className="font-semibold">{claimMonth}</span>
                    </div>
                    <div className="border-r border-b border-slate-400 p-3 flex">
                      <span className="text-slate-600 w-24">Office</span>
                      <span className="font-semibold">{userOffice?.name}</span>
                    </div>
                    <div className="border-b border-slate-400 p-3 flex">
                      <span className="text-slate-600 w-24">Reimburse In</span>
                      <span className="font-semibold text-green-700">{userReimburseCurrency}</span>
                    </div>
                  </div>
                </div>

                <div className="border-2 border-slate-400 mb-4">
                  <div className="bg-slate-200 p-2 font-bold text-center border-b border-slate-400">Expenses Claim (in {userReimburseCurrency})</div>
                  
                  <div className="border-b border-slate-400">
                    <div className="bg-slate-100 p-2 font-semibold border-b border-slate-300">Motor Vehicle Expenditure</div>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <td className="p-2 w-8">A.</td>
                          <td className="p-2 text-blue-700">Petrol</td>
                          <td className="p-2">Fuel Card / Mileage</td>
                          <td className="p-2 text-right w-28">{getCategoryTotal('A').toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="p-2">B.</td>
                          <td className="p-2 text-blue-700">Parking</td>
                          <td className="p-2">Off-Street Parking</td>
                          <td className="p-2 text-right">{getCategoryTotal('B').toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="p-2">C.</td>
                          <td className="p-2 text-blue-700">Travel</td>
                          <td className="p-2">Taxis / Transport / Tolls</td>
                          <td className="p-2 text-right">{getCategoryTotal('C').toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-2">D.</td>
                          <td className="p-2 text-blue-700">Repairs</td>
                          <td className="p-2">Repairs / Parts</td>
                          <td className="p-2 text-right">{getCategoryTotal('D').toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <div className="bg-slate-100 p-2 font-semibold border-b border-slate-300">Business Expenditure</div>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <td className="p-2 w-8">E.</td>
                          <td className="p-2 text-blue-700">Entertaining</td>
                          <td className="p-2">Customers / Employees</td>
                          <td className="p-2 text-right w-28">{getCategoryTotal('E').toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="p-2">F.</td>
                          <td className="p-2 text-blue-700">Welfare</td>
                          <td className="p-2">Hotels / Gifts</td>
                          <td className="p-2 text-right">{getCategoryTotal('F').toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="p-2">G-I.</td>
                          <td className="p-2 text-blue-700">Other</td>
                          <td className="p-2">Subs / Computer / WIP</td>
                          <td className="p-2 text-right">{(getCategoryTotal('G') + getCategoryTotal('H') + getCategoryTotal('I')).toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t-2 border-slate-400 bg-blue-50 p-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">Total to Reimburse</span>
                      <span className="font-bold text-xl text-blue-700">{formatCurrency(reimbursementTotal, userReimburseCurrency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 1: Travel Detail */}
            {previewPage === 1 && (
              <div className="max-w-4xl mx-auto">
                <div className="border-2 border-slate-400">
                  <div className="bg-blue-900 text-white p-3 text-center font-bold">Travel Expense Detail</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-200">
                          <th className="border p-2">Ref</th>
                          <th className="border p-2">Original</th>
                          <th className="border p-2">Parking</th>
                          <th className="border p-2">Transport</th>
                          <th className="border p-2">Taxis</th>
                          <th className="border p-2">Repairs</th>
                          <th className="border p-2">Description</th>
                          <th className="border p-2 bg-green-100">Reimburse ({userReimburseCurrency})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {travelExpenses.map(exp => (
                          <tr key={exp.id}>
                            <td className="border p-2 font-bold text-blue-700">{exp.ref}</td>
                            <td className="border p-2 text-xs text-slate-500">{formatCurrency(exp.amount, exp.currency)}</td>
                            <td className="border p-2 text-right">{exp.category === 'B' ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                            <td className="border p-2 text-right">{exp.subcategory === 'Public Transport' ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                            <td className="border p-2 text-right">{exp.subcategory === 'Taxis' ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                            <td className="border p-2 text-right">{['Repairs', 'Parts'].includes(exp.subcategory) ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                            <td className="border p-2">{exp.description}</td>
                            <td className="border p-2 text-right font-bold bg-green-50">{(exp.reimbursementAmount || exp.amount).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 2: Entertaining Detail */}
            {previewPage === 2 && (
              <div className="max-w-4xl mx-auto">
                <div className="border-2 border-slate-400">
                  <div className="bg-blue-900 text-white p-3 text-center font-bold">Entertaining and Welfare Detail</div>
                  <div className="bg-amber-50 p-2 text-amber-800 text-xs font-semibold">⚠️ ENSURE FULL LIST OF GUESTS ARE SUPPLIED</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-200">
                          <th className="border p-2">Ref</th>
                          <th className="border p-2">Original</th>
                          <th className="border p-2">Emp.Meals</th>
                          <th className="border p-2">Bus.Meals</th>
                          <th className="border p-2">Hotels/Gifts</th>
                          <th className="border p-2">Attendees</th>
                          <th className="border p-2 bg-green-100">Reimburse ({userReimburseCurrency})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entertainingExpenses.map(exp => (
                          <tr key={exp.id}>
                            <td className="border p-2 font-bold text-blue-700">{exp.ref}</td>
                            <td className="border p-2 text-xs text-slate-500">{formatCurrency(exp.amount, exp.currency)}</td>
                            <td className="border p-2 text-right">{exp.category === 'E' && exp.subcategory?.includes('Employee') ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                            <td className="border p-2 text-right">{exp.category === 'E' && exp.subcategory?.includes('Customer') ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                            <td className="border p-2 text-right">{exp.category === 'F' ? (exp.reimbursementAmount || exp.amount).toFixed(2) : ''}</td>
                            <td className="border p-2">{exp.merchant}{exp.attendees ? ` - ${exp.attendees}` : ''}</td>
                            <td className="border p-2 text-right font-bold bg-green-50">{(exp.reimbursementAmount || exp.amount).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 3: Receipt Images */}
            {previewPage === 3 && (
              <div className="max-w-4xl mx-auto">
                <div className="border-2 border-slate-400 mb-4">
                  <div className="bg-blue-900 text-white p-3 text-center font-bold">Attached Receipt Images</div>
                  <div className="p-4">
                    <p className="text-sm text-slate-600 mb-4">{pendingExpenses.length} receipts will be included (each on its own page)</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {pendingExpenses.map(exp => (
                        <div key={exp.id} className="border-2 border-slate-300 rounded-lg overflow-hidden">
                          <div className="bg-blue-100 p-2 flex justify-between items-center">
                            <span className="font-bold text-blue-700">{exp.ref}</span>
                            <span className="text-xs">{exp.isForeignCurrency ? '💳' : ''}</span>
                          </div>
                          {exp.receiptPreview ? (
                            <img src={exp.receiptPreview} alt={exp.ref} className="w-full h-24 object-cover" />
                          ) : (
                            <div className="w-full h-24 bg-slate-100 flex items-center justify-center text-3xl">📄</div>
                          )}
                          <div className="p-2 bg-slate-50 text-xs">
                            <p className="truncate">{exp.merchant}</p>
                            <p className="text-slate-500">Original: {formatCurrency(exp.amount, exp.currency)}</p>
                            {exp.isForeignCurrency && (
                              <p className="text-green-700 font-bold">Reimburse: {formatCurrency(exp.reimbursementAmount, userReimburseCurrency)}</p>
                            )}
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
                              Foreign currency: {foreignCurrencyExpenses.map(e => `${e.ref} (${e.currency}→${userReimburseCurrency})`).join(', ')}
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

          <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3 shrink-0">
            <button onClick={() => { setShowPreview(false); setPreviewPage(0); }} className="flex-1 py-3 rounded-xl border-2 border-slate-300 font-semibold text-slate-600 hover:bg-slate-100">← Back</button>
            <button 
              onClick={async () => { await handleSubmitClaim(); setShowPreview(false); setPreviewPage(0); }} 
              disabled={!canSubmit || loading}
              className={`flex-[2] py-3 rounded-xl font-semibold shadow-lg transition-all ${
                canSubmit && !loading ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white cursor-pointer' : 'bg-slate-300 text-slate-500 cursor-not-allowed'
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
    const userReimburseCurrency = getUserReimburseCurrency(currentUser);

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
            <p className="text-slate-600 mb-4">Upload your credit card statement showing the {userReimburseCurrency} equivalent for:</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              {foreignCurrencyExpenses.map(exp => (
                <div key={exp.id} className="text-sm text-amber-800">
                  • {exp.ref}: {exp.merchant} - {formatCurrency(exp.amount, exp.currency)} → <strong>{formatCurrency(exp.reimbursementAmount, userReimburseCurrency)}</strong>
                </div>
              ))}
            </div>

            <label className={`block border-3 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${file ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50'}`}>
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
              {file ? (
                <>
                  <div className="text-4xl mb-2">✅</div>
                  <p className="font-semibold text-green-700">{file.name}</p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-2">📄</div>
                  <p className="font-semibold text-slate-600">Upload statement</p>
                </>
              )}
            </label>
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
            <button onClick={() => setShowStatementUpload(false)} className="flex-1 py-3 rounded-xl border-2 border-slate-300 font-semibold text-slate-600">Cancel</button>
            <button onClick={() => { setCreditCardStatement(file); setShowStatementUpload(false); setShowPreview(true); }} disabled={!file} className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold disabled:opacity-50">
              Continue ✓
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // SUBMIT CLAIM
  // ============================================
  const handleSubmitClaim = async () => {
    setLoading(true);
    try {
      const claimNumber = `EXP-2026-${String(claims.length + 1).padStart(3, '0')}`;
      const userReimburseCurrency = getUserReimburseCurrency(currentUser);
      
      const newClaim = {
        claim_number: claimNumber,
        user_id: currentUser.id,
        user_name: currentUser.name,
        office: userOffice?.name,
        currency: userReimburseCurrency,
        total_amount: reimbursementTotal,
        item_count: pendingExpenses.length,
        status: 'pending_review',
        credit_card_statement: creditCardStatement?.name || null,
        expenses: pendingExpenses
      };
      
      const { error } = await supabase.from('claims').insert([newClaim]);
      
      if (error) {
        alert('❌ Failed to submit claim. Please try again.');
      } else {
        setExpenses([]);
        setCreditCardStatement(null);
        await loadClaims();
        alert('✅ Expense claim submitted successfully!');
      }
    } catch (err) {
      alert('❌ Failed to submit claim. Please try again.');
    }
    setLoading(false);
  };

  // ============================================
  // MY EXPENSES TAB
  // ============================================
  const MyExpensesTab = () => {
    const myClaims = claims.filter(c => c.user_id === currentUser.id);
    const userReimburseCurrency = getUserReimburseCurrency(currentUser);

    const groupedExpenses = pendingExpenses.reduce((acc, exp) => {
      if (!acc[exp.category]) acc[exp.category] = [];
      acc[exp.category].push(exp);
      return acc;
    }, {});

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="text-4xl font-bold text-slate-800">{pendingExpenses.length}</div>
            <div className="text-sm text-slate-500 mt-1">Pending Receipts</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(reimbursementTotal, userReimburseCurrency)}</div>
            <div className="text-sm text-slate-500 mt-1">To Reimburse</div>
          </div>
        </div>

        {hasForeignCurrency && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-xl">💳</span>
            <div>
              <strong className="text-amber-800">Foreign Currency Expenses</strong>
              <p className="text-sm text-amber-700 mt-1">You must upload your credit card statement before submitting.</p>
            </div>
          </div>
        )}

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

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-800 mb-4">📋 Pending Expenses ({pendingExpenses.length})</h3>

          {pendingExpenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-slate-500 font-medium">No pending expenses</p>
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
                            {exp.isForeignCurrency && <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-lg">💳 FCY</span>}
                          </div>
                          <p className="text-sm text-slate-500 mt-1 truncate">{exp.description}</p>
                          {exp.isForeignCurrency && (
                            <p className="text-xs text-slate-400 mt-1">
                              Original: {formatCurrency(exp.amount, exp.currency)} → Reimburse: <span className="text-green-700 font-semibold">{formatCurrency(exp.reimbursementAmount, userReimburseCurrency)}</span>
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-bold text-green-700">{formatCurrency(exp.reimbursementAmount || exp.amount, userReimburseCurrency)}</div>
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

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-800 mb-4">📁 My Submitted Claims</h3>
          {myClaims.length === 0 ? (
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
                        claim.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {claim.status === 'pending_review' ? 'Pending' : claim.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{claim.item_count} items • {formatDate(claim.submitted_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-slate-800">{formatCurrency(claim.total_amount, claim.currency)}</div>
                    <button onClick={() => handleDownloadPDF(claim)} disabled={downloading} className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg text-sm font-medium">
                      📥 PDF
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
      await supabase.from('claims').update({ status: 'approved', reviewed_by: currentUser.name, reviewed_at: new Date().toISOString() }).eq('id', claimId);
      await loadClaims();
      setSelectedClaim(null);
      setLoading(false);
    };

    const handleReject = async (claimId) => {
      setLoading(true);
      await supabase.from('claims').update({ status: 'rejected', reviewed_by: currentUser.name, reviewed_at: new Date().toISOString() }).eq('id', claimId);
      await loadClaims();
      setSelectedClaim(null);
      setLoading(false);
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-lg p-5 text-center">
            <div className="text-3xl font-bold text-amber-500">{pendingClaims.length}</div>
            <div className="text-xs text-slate-500">Pending</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-5 text-center">
            <div className="text-3xl font-bold text-green-500">{visibleClaims.filter(c => c.status === 'approved').length}</div>
            <div className="text-xs text-slate-500">Approved</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-5 text-center">
            <div className="text-3xl font-bold text-red-500">{visibleClaims.filter(c => c.status === 'rejected').length}</div>
            <div className="text-xs text-slate-500">Rejected</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-800 mb-4">📊 Claims to Review</h3>
          {pendingClaims.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-slate-500">No pending claims</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingClaims.map(claim => (
                <div key={claim.id} onClick={() => setSelectedClaim(claim)} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-300 cursor-pointer">
                  <div className="flex-1">
                    <span className="font-semibold text-slate-800">{claim.user_name}</span>
                    <p className="text-sm text-slate-500">{claim.office} • {claim.item_count} items</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-slate-800">{formatCurrency(claim.total_amount, claim.currency)}</div>
                    <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(claim); }} className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg text-sm font-medium">📥</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedClaim && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedClaim(null)}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedClaim.user_name}</h2>
                  <p className="text-sm text-slate-500">{selectedClaim.claim_number} • {selectedClaim.office}</p>
                </div>
                <button onClick={() => setSelectedClaim(null)} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="text-sm text-slate-500">Total</div>
                    <div className="text-2xl font-bold">{formatCurrency(selectedClaim.total_amount, selectedClaim.currency)}</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="text-sm text-slate-500">Items</div>
                    <div className="text-2xl font-bold">{selectedClaim.item_count}</div>
                  </div>
                </div>

                <button onClick={() => handleDownloadPDF(selectedClaim)} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2">
                  📥 Download PDF with Receipts
                </button>

                {selectedClaim.expenses?.length > 0 && (
                  <div className="border rounded-xl overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2 font-semibold text-sm">Line Items</div>
                    <div className="divide-y max-h-64 overflow-y-auto">
                      {selectedClaim.expenses.map((exp, idx) => (
                        <div key={idx} className="px-4 py-3 flex justify-between items-center">
                          <div>
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded mr-2">{exp.ref}</span>
                            <span className="font-medium">{exp.merchant}</span>
                            {exp.isForeignCurrency && (
                              <p className="text-xs text-slate-400 mt-1">
                                Original: {formatCurrency(exp.amount, exp.currency)}
                              </p>
                            )}
                          </div>
                          <span className="font-semibold">{formatCurrency(exp.reimbursementAmount || exp.amount, selectedClaim.currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedClaim.status === 'pending_review' && (
                <div className="p-4 border-t bg-slate-50 flex gap-3">
                  <button onClick={() => handleReject(selectedClaim.id)} disabled={loading} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold disabled:opacity-50">Reject</button>
                  <button onClick={() => handleApprove(selectedClaim.id)} disabled={loading} className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold disabled:opacity-50">Approve ✓</button>
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
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 py-3 shadow-lg sticky top-0 z-40">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center font-bold shadow-lg">B</div>
            <div>
              <div className="font-semibold text-sm">Berkeley Expenses</div>
              <div className="text-xs text-slate-400">{userOffice?.name} • Reimburse: {getUserReimburseCurrency(currentUser)}</div>
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

      {canReview && (
        <div className="bg-white border-b border-slate-200 sticky top-14 z-30">
          <div className="max-w-3xl mx-auto flex">
            <button onClick={() => setActiveTab('my_expenses')} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${activeTab === 'my_expenses' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>📋 My Expenses</button>
            <button onClick={() => setActiveTab('review')} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${activeTab === 'review' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
              👀 Review
              {getVisibleClaims().filter(c => c.status === 'pending_review').length > 0 && (
                <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">{getVisibleClaims().filter(c => c.status === 'pending_review').length}</span>
              )}
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
