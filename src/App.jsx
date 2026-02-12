import React, { useState, useEffect, useRef } from 'react';

/*
 * BERKELEY INTERNATIONAL EXPENSE MANAGEMENT SYSTEM
 * Version: 3.6 - Multi-statement support & Submission Guard
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
    update: (updates) => ({
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

const DEVELOPMENTS = [
  '250 City Road', 'Abbey Barn Park', 'Alexandra Gate', 'Bankside Gardens', 'Bath Riverside',
  'Beaufort Park', 'Bermondsey Place', 'Bow Common', 'Camden', 'Carnwath Road',
  'Chelsea Creek', 'Cranleigh', 'Eden Grove', 'Foal Hurst Green', 'Glasswater Locks',
  'Grand Union', 'Green Park Village', 'Guildford', 'Hareshill, Fleet', 'Hartland Village',
  'Heron Wharf', 'Hertford Locks', 'Highwood Village', 'Hildenborough', 'Horlicks Quarter',
  'Kidbrooke Village', "King's Road Park", 'London Dock', 'Milton Keynes', 'Oval Village',
  'Parkside Collection', 'Plumstead', 'Prince of Wales Drive', 'Reading Riverworks', "Regent's View",
  'Royal Arsenal Riverside', 'Silkstream', 'South Quay Plaza', 'Spring Hill', 'Sunningdale Park',
  'Sutton', 'The Exchange', 'The Green Quarter', 'Trent Park', 'Trillium',
  'TwelveTrees Park', 'Wallingford', 'Wandsworth Mills', 'West End Gate', 'White City',
  'Winterbrook', 'Woodberry Down'
];

const APPROVAL_WORKFLOWS = {
  'BEJ': { level1: 102, level2: 302, level1Name: 'Caroline Zhu Yunshu', level2Name: 'Eddy Tao Xiao Feng' },
  'SHE': { level1: 102, level2: 302, level1Name: 'Caroline Zhu Yunshu', level2Name: 'Eddy Tao Xiao Feng' },
  'SHA': { level1: 306, level2: 302, level1Name: 'Cathy Liu Shikun', level2Name: 'Eddy Tao Xiao Feng' },
  'CHE': { level1: 306, level2: 302, level1Name: 'Cathy Liu Shikun', level2Name: 'Eddy Tao Xiao Feng' },
  'SIN': { level1: 805, level2: 803, level1Name: 'Ann Low Mei Yen', level2Name: 'Karen Chia Pei Ru' },
  'BKK': { level1: 805, level2: 803, level1Name: 'Ann Low Mei Yen', level2Name: 'Karen Chia Pei Ru' },
  'MYS': { level1: 805, level2: 803, level1Name: 'Ann Low Mei Yen', level2Name: 'Karen Chia Pei Ru' },
  'DXB': { level1: 1002, level2: 1001, level1Name: 'Christine Mendoza Dimaranan', level2Name: 'Christopher James Mclean Frame' },
  'LON': { level1: 1002, level2: 1001, level1Name: 'Christine Mendoza Dimaranan', level2Name: 'Christopher James Mclean Frame' },
  'HKG': { level1: 505, level2: 502, level1Name: 'Cherry Lai', level2Name: 'Anthony Andrew Jurenko' }
};

const SPECIAL_REVIEWERS = {
  811: { finalReviewer: 808, finalReviewerName: 'Ong Yongle' },
  817: { finalReviewer: 808, finalReviewerName: 'Ong Yongle' },
  813: { finalReviewer: 808, finalReviewerName: 'Ong Yongle' },
  504: { finalReviewer: 808, finalReviewerName: 'Ong Yongle' },
  806: { finalReviewer: 801, finalReviewerName: 'John Yan Chung Keung' },
  818: { finalReviewer: 801, finalReviewerName: 'John Yan Chung Keung' },
  810: { finalReviewer: 801, finalReviewerName: 'John Yan Chung Keung' },
  503: { finalReviewer: 801, finalReviewerName: 'John Yan Chung Keung' },
  1004: { finalReviewer: 801, finalReviewerName: 'John Yan Chung Keung' },
  1007: { finalReviewer: 801, finalReviewerName: 'John Yan Chung Keung' },
};

const SENIOR_STAFF_ROUTING = {
  808: { level1: 805, level2: 804, level1Name: 'Ann Low Mei Yen', level2Name: 'Cathy He Zeqian' },
  801: { level1: 805, level2: 804, level1Name: 'Ann Low Mei Yen', level2Name: 'Cathy He Zeqian' },
  803: { level1: 805, level2: 804, level1Name: 'Ann Low Mei Yen', level2Name: 'Cathy He Zeqian' },
  302: { level1: 306, level2: 804, level1Name: 'Cathy Liu Shikun', level2Name: 'Cathy He Zeqian' },
  502: { level1: 505, level2: 804, level1Name: 'Cherry Lai', level2Name: 'Cathy He Zeqian' },
  1001: { level1: 1002, level2: 804, level1Name: 'Christine Mendoza Dimaranan', level2Name: 'Cathy He Zeqian' },
  812: { level1: 804, level2: null, level1Name: 'Cathy He Zeqian', level2Name: null, singleLevel: true },
  804: { level1: null, level2: null, level1Name: null, level2Name: null, selfSubmit: true, externalApproval: 'Chairman (via Kareen)' },
};

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
  { id: 1008, name: 'Keisha Latoya Whitehorne', office: 'DXB', role: 'employee', reimburseCurrency: 'AED', password: 'berkeley123' },
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

const compressImage = (file, maxWidth = 1200, quality = 0.7) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};

const formatCurrency = (amount, currency) => `${currency} ${parseFloat(amount || 0).toFixed(2)}`;
const formatDate = (dateStr) => { if (!dateStr) return ''; const d = new Date(dateStr); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
const formatShortDate = (dateStr) => { if (!dateStr) return ''; const d = new Date(dateStr); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }); };

const App = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('my_expenses');
  const [expenses, setExpenses] = useState([]);
  const [claims, setClaims] = useState([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [statementImages, setStatementImages] = useState([]);
  const [currentStatementIndex, setCurrentStatementIndex] = useState(0);
  const [statementAnnotations, setStatementAnnotations] = useState([]);
  const [showStatementUpload, setShowStatementUpload] = useState(false);
  const [showStatementAnnotator, setShowStatementAnnotator] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('berkeley_user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const pendingExpenses = expenses.filter(e => e.user_id === user?.id && !e.claim_id);

  const handleLogin = (e) => {
    e.preventDefault();
    const id = parseInt(e.target.employeeId.value);
    const pass = e.target.password.value;
    const emp = EMPLOYEES.find(emp => emp.id === id && emp.password === pass);
    if (emp) {
      setUser(emp);
      localStorage.setItem('berkeley_user', JSON.stringify(emp));
    } else {
      alert('Invalid credentials');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('berkeley_user');
  };

  const handleStatementUpload = async (files) => {
    const newImages = await Promise.all(
      Array.from(files).map(file => compressImage(file))
    );
    // FIX: Append to array so old pages aren't lost
    setStatementImages(prev => [...prev, ...newImages]);
    setCurrentStatementIndex(statementImages.length);
    setShowStatementUpload(false);
    setShowStatementAnnotator(true);
  };

  const handleStatementAnnotationSave = (newAnns) => {
    setStatementAnnotations(prev => {
      // Remove current page's old tags
      const otherPages = prev.filter(a => a.pageIndex !== currentStatementIndex);
      // Mark new tags with page index
      const taggedNew = newAnns.map(a => ({ ...a, pageIndex: currentStatementIndex }));
      return [...otherPages, ...taggedNew];
    });
    setShowStatementAnnotator(false);
    setShowPreview(true);
  };

  const validateSubmission = () => {
    const cardExpenses = pendingExpenses.filter(e => e.payment_method === 'Corporate Credit Card');
    const taggedIds = new Set(statementAnnotations.map(a => a.expenseId));
    const missing = cardExpenses.filter(e => !taggedIds.has(e.id));
    
    if (missing.length > 0) {
      alert(`Stop! You have ${missing.length} credit card expenses that aren't highlighted on your statement. Please annotate them before submitting.`);
      return false;
    }
    return true;
  };

  const PreviewClaimModal = () => (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-6 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-6">Review Submission</h2>

          {/* Statement Gallery Section */}
          <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-200">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Credit Card Statements</h3>
            <div className="flex flex-wrap gap-4">
              {statementImages.map((img, idx) => (
                <div key={idx} className="relative cursor-pointer group" onClick={() => {
                  setCurrentStatementIndex(idx);
                  setShowStatementAnnotator(true);
                  setShowPreview(false);
                }}>
                  <img src={img} className="w-20 h-28 object-cover rounded-lg border-2 border-white shadow-sm group-hover:border-blue-500 transition-all" />
                  <div className="absolute top-1 right-1 bg-blue-600 text-white text-[10px] px-1.5 rounded-full">Pg {idx+1}</div>
                  {statementAnnotations.some(a => a.pageIndex === idx) && (
                    <div className="absolute -bottom-1 -right-1 bg-green-500 text-white w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">✓</div>
                  )}
                </div>
              ))}
              <button 
                onClick={() => setShowStatementUpload(true)}
                className="w-20 h-28 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:bg-white hover:border-slate-400 transition-all"
              >
                <span className="text-2xl">+</span>
                <span className="text-[10px] font-bold">ADD</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {pendingExpenses.map(exp => (
              <div key={exp.id} className="flex items-center gap-4 p-3 bg-white border rounded-xl">
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-xl">
                  {EXPENSE_CATEGORIES[exp.category_code]?.icon || '📄'}
                </div>
                <div className="flex-1">
                  <div className="font-bold">{exp.description}</div>
                  <div className="text-xs text-slate-500">{formatShortDate(exp.date)} • {exp.payment_method}</div>
                </div>
                <div className="text-right font-bold text-blue-600">
                  {formatCurrency(exp.amount, exp.currency)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t flex gap-3">
          <button onClick={() => setShowPreview(false)} className="flex-1 py-4 font-bold text-slate-500">Back</button>
          <button 
            onClick={() => validateSubmission() && alert('Submitted!')} 
            className="flex-[2] bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg"
          >
            Submit Claim
          </button>
        </div>
      </div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm">
        <h1 className="text-2xl font-black mb-6 text-center text-slate-900">BERKELEY</h1>
        <div className="space-y-4">
          <input name="employeeId" type="number" placeholder="Employee ID" required className="w-full p-4 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500" />
          <input name="password" type="password" placeholder="Password" required className="w-full p-4 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500" />
          <button type="submit" className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-blue-200">Sign In</button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4">
      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm">
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase">Berkeley International</div>
          <div className="font-bold">{user.name} ({user.office})</div>
        </div>
        <button onClick={handleLogout} className="text-slate-400 text-xl">Logout</button>
      </header>

      {activeTab === 'my_expenses' && (
        <div className="max-w-xl mx-auto space-y-4">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-2xl font-black">Draft Expenses</h2>
            <button onClick={() => setShowAddExpense(true)} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow-md">+ Add</button>
          </div>
          
          {pendingExpenses.length > 0 ? (
            <>
              <div className="space-y-3">
                {pendingExpenses.map(exp => (
                  <div key={exp.id} className="bg-white p-4 rounded-2xl border flex items-center gap-4">
                    <span className="text-2xl">{EXPENSE_CATEGORIES[exp.category_code]?.icon}</span>
                    <div className="flex-1">
                      <div className="font-bold">{exp.description}</div>
                      <div className="text-xs text-slate-400">{exp.payment_method}</div>
                    </div>
                    <div className="font-bold">{formatCurrency(exp.amount, exp.currency)}</div>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setShowPreview(true)}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl"
              >
                Review & Submit ({pendingExpenses.length})
              </button>
            </>
          ) : (
            <div className="text-center py-20 text-slate-400">No pending expenses</div>
          )}
        </div>
      )}

      {showPreview && <PreviewClaimModal />}
      
      {showStatementUpload && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center">
            <h3 className="text-xl font-bold mb-4">Upload Statement Page</h3>
            <input type="file" multiple accept="image/*" onChange={(e) => handleStatementUpload(e.target.files)} className="mb-6 block w-full text-sm text-slate-500" />
            <button onClick={() => setShowStatementUpload(false)} className="text-slate-400 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {showStatementAnnotator && (
        <StatementAnnotator 
          image={statementImages[currentStatementIndex]} 
          expenses={pendingExpenses.filter(e => e.payment_method === 'Corporate Credit Card')} 
          existingAnnotations={statementAnnotations.filter(a => a.pageIndex === currentStatementIndex)} 
          onSave={handleStatementAnnotationSave} 
          onCancel={() => { setShowStatementAnnotator(false); setShowPreview(true); }}
        />
      )}
    </div>
  );
};

/* --- MOCK COMPONENTS FOR CONTEXT --- */
const StatementAnnotator = ({ image, expenses, existingAnnotations, onSave, onCancel }) => (
  <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col p-4">
    <div className="flex justify-between items-center text-white mb-4">
      <h2 className="font-bold">Annotate Statement</h2>
      <button onClick={onCancel}>Close</button>
    </div>
    <div className="flex-1 bg-white rounded-xl overflow-hidden relative">
      <img src={image} className="w-full h-full object-contain" />
      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
        <div className="bg-white p-6 rounded-2xl text-center">
          <p className="mb-4 font-bold">Click to add highlights for:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {expenses.map(e => (
              <button key={e.id} onClick={() => onSave([...existingAnnotations, { expenseId: e.id, x: 50, y: 50 }])} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">
                {e.description}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default App;