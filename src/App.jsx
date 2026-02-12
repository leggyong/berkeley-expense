import React, { useState, useEffect, useRef } from 'react';

/*
 * BERKELEY INTERNATIONAL EXPENSE MANAGEMENT SYSTEM
 * Version: 4.0 - Full Feature Restoration + Multi-Statement Gallery Workflow
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
    update: (updates) => ({
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
].sort((a, b) => a.name.localeCompare(b.name));

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
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const formatCurrency = (amount, currency) => `${currency} ${parseFloat(amount || 0).toFixed(2)}`;
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const App = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('my_expenses');
  const [expenses, setExpenses] = useState([]);
  const [claims, setClaims] = useState([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // NEW STATEMENT STATES
  const [statementImages, setStatementImages] = useState([]);
  const [currentStatementIndex, setCurrentStatementIndex] = useState(0);
  const [statementAnnotations, setStatementAnnotations] = useState([]);
  const [showStatementUpload, setShowStatementUpload] = useState(false);
  const [showStatementAnnotator, setShowStatementAnnotator] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('berkeley_user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (user) {
      fetchExpenses();
      fetchClaims();
      const interval = setInterval(() => {
        if (!showAddExpense && !editingExpense && !showPreview && !showStatementAnnotator) {
          fetchExpenses();
          fetchClaims();
        }
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [user, showAddExpense, editingExpense, showPreview, showStatementAnnotator]);

  const fetchExpenses = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    const { data, error } = await supabase.from('expenses').select('*');
    if (!error && data) setExpenses(data);
    setIsSyncing(false);
  };

  const fetchClaims = async () => {
    const { data, error } = await supabase.from('claims').select('*');
    if (!error && data) setClaims(data);
  };

  const pendingExpenses = expenses.filter(e => e.user_id === user?.id && !e.claim_id);

  const handleLogin = (e) => {
    e.preventDefault();
    const empId = parseInt(e.target.employee.value);
    const pass = e.target.password.value;
    const emp = EMPLOYEES.find(emp => emp.id === empId && emp.password === pass);
    if (emp) {
      setUser(emp);
      localStorage.setItem('berkeley_user', JSON.stringify(emp));
    } else {
      alert('Invalid Password');
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
    // APPEND logic to prevent overwriting
    setStatementImages(prev => [...prev, ...newImages]);
    setCurrentStatementIndex(statementImages.length); 
    setShowStatementUpload(false);
    setShowStatementAnnotator(true);
  };

  const handleStatementAnnotationSave = (newAnns) => {
    setStatementAnnotations(prev => {
      const otherPages = prev.filter(a => a.pageIndex !== currentStatementIndex);
      const taggedNew = newAnns.map(a => ({ ...a, pageIndex: currentStatementIndex }));
      return [...otherPages, ...taggedNew];
    });
    setShowStatementAnnotator(false);
    setShowPreview(true);
  };

  const validateSubmission = () => {
    const cardExps = pendingExpenses.filter(e => e.payment_method === 'Corporate Credit Card');
    const taggedIds = new Set(statementAnnotations.map(a => a.expenseId));
    const missing = cardExps.filter(e => !taggedIds.has(e.id));
    
    if (missing.length > 0) {
      alert(`Missing Annotations: You have ${missing.length} credit card items not highlighted on any statement. Please annotate them before submitting.`);
      return false;
    }
    return true;
  };

  const handleFinalSubmit = async () => {
    if (!validateSubmission()) return;

    const officeData = OFFICES.find(o => o.code === user.office);
    const workflow = SENIOR_STAFF_ROUTING[user.id] || APPROVAL_WORKFLOWS[user.office];
    const special = SPECIAL_REVIEWERS[user.id];

    const newClaim = {
      user_id: user.id,
      user_name: user.name,
      office_code: user.office,
      office_name: officeData.name,
      currency: officeData.currency,
      total_amount: pendingExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0),
      status: workflow.selfSubmit ? 'Reviewing' : 'Level 1 Pending',
      level1_approver: workflow.level1,
      level1_name: workflow.level1Name,
      level2_approver: workflow.level2,
      level2_name: workflow.level2Name,
      finance_reviewer: special?.finalReviewer || 808,
      finance_reviewer_name: special?.finalReviewerName || 'Ong Yongle',
      created_at: new Date().toISOString(),
      statement_images: statementImages,
      annotations: statementAnnotations
    };

    const { data: claimData, error: claimError } = await supabase.from('claims').insert([newClaim]);
    
    if (!claimError && claimData?.[0]) {
      const claimId = claimData[0].id;
      await Promise.all(pendingExpenses.map(exp => 
        supabase.from('expenses').update({ claim_id: claimId }).eq('id', exp.id)
      ));
      alert('Claim submitted successfully!');
      setShowPreview(false);
      setStatementImages([]);
      setStatementAnnotations([]);
      fetchExpenses();
      fetchClaims();
    }
  };

  /* --- MODAL COMPONENTS --- */

  const AddExpenseModal = ({ editExpense, onClose }) => {
    const [formData, setFormData] = useState(editExpense || {
      date: new Date().toISOString().split('T')[0],
      category_code: 'A',
      subcategory: EXPENSE_CATEGORIES['A'].subcategories[0],
      description: '',
      currency: OFFICES.find(o => o.code === user.office).currency,
      amount: '',
      payment_method: 'Personal Pay',
      development: 'Non-Development',
      attendees: '',
      image_data: null
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      const payload = { ...formData, user_id: user.id, office_code: user.office };
      
      if (editExpense) {
        await supabase.from('expenses').update(payload).eq('id', editExpense.id);
      } else {
        await supabase.from('expenses').insert([payload]);
      }
      onClose();
      fetchExpenses();
    };

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
          <h2 className="text-2xl font-black mb-6">{editExpense ? 'Edit' : 'Add'} Expense</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Date</label>
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl mt-1" required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Payment</label>
                <select value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl mt-1">
                  <option>Personal Pay</option>
                  <option>Corporate Credit Card</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Category</label>
                <select value={formData.category_code} onChange={e => setFormData({...formData, category_code: e.target.value, subcategory: EXPENSE_CATEGORIES[e.target.value].subcategories[0]})} className="w-full p-3 bg-slate-50 rounded-xl mt-1">
                  {Object.entries(EXPENSE_CATEGORIES).map(([code, cat]) => <option key={code} value={code}>{cat.icon} {cat.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Development</label>
                <select value={formData.development} onChange={e => setFormData({...formData, development: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl mt-1">
                  <option>Non-Development</option>
                  {DEVELOPMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
              <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl mt-1" placeholder="What was this for?" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Currency</label>
                <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl mt-1">
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Amount</label>
                <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl mt-1" placeholder="0.00" required />
              </div>
            </div>

            {EXPENSE_CATEGORIES[formData.category_code].requiresAttendees && (
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Attendees (Internal & External)</label>
                <textarea value={formData.attendees} onChange={e => setFormData({...formData, attendees: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl mt-1" placeholder="List names here..." required />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Receipt Photo</label>
              <div className="mt-1 flex items-center gap-4">
                {formData.image_data && <img src={formData.image_data} className="w-16 h-16 object-cover rounded-xl" alt="Receipt" />}
                <input type="file" accept="image/*" onChange={async e => {
                  const comp = await compressImage(e.target.files[0]);
                  setFormData({...formData, image_data: comp});
                }} className="text-sm text-slate-500" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-8">
            <button type="button" onClick={onClose} className="flex-1 py-4 font-bold text-slate-400">Cancel</button>
            <button type="submit" className="flex-2 bg-blue-600 text-white py-4 px-8 rounded-2xl font-bold shadow-lg shadow-blue-200">Save Expense</button>
          </div>
        </form>
      </div>
    );
  };

  const PreviewClaimModal = () => (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-6 overflow-y-auto bg-slate-50/50">
          <h2 className="text-3xl font-black mb-8">Review Claim</h2>

          {/* GALLERY SECTION */}
          <div className="bg-white p-6 rounded-2xl mb-8 border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Credit Card Statements</h3>
            <div className="flex flex-wrap gap-4">
              {statementImages.map((img, idx) => (
                <div key={idx} className="relative group cursor-pointer" onClick={() => {
                  setCurrentStatementIndex(idx);
                  setShowStatementAnnotator(true);
                  setShowPreview(false);
                }}>
                  <img src={img} className="w-24 h-32 object-cover rounded-xl border-2 border-white shadow-sm hover:border-blue-500 transition-all" />
                  <div className="absolute top-1 right-1 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">Pg {idx+1}</div>
                  {statementAnnotations.some(a => a.pageIndex === idx) && (
                    <div className="absolute -bottom-2 -right-2 bg-green-500 text-white w-6 h-6 rounded-full border-4 border-white flex items-center justify-center">
                      <span className="text-[10px] font-bold">✓</span>
                    </div>
                  )}
                </div>
              ))}
              <button 
                onClick={() => setShowStatementUpload(true)}
                className="w-24 h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:bg-white hover:border-slate-500 transition-all"
              >
                <span className="text-3xl font-light">+</span>
                <span className="text-[10px] font-bold">ADD PAGE</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {pendingExpenses.map(exp => {
              const isTagged = statementAnnotations.some(a => a.expenseId === exp.id);
              return (
                <div key={exp.id} className={`p-4 rounded-2xl border bg-white flex items-center gap-4 transition-all ${exp.payment_method === 'Corporate Credit Card' && !isTagged ? 'border-red-200 bg-red-50/30 ring-1 ring-red-100' : 'border-slate-100'}`}>
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-2xl">
                    {EXPENSE_CATEGORIES[exp.category_code]?.icon || '📄'}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-800">{exp.description}</div>
                    <div className="text-xs font-medium text-slate-500">
                      {formatDate(exp.date)} • {exp.payment_method}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-blue-600">{formatCurrency(exp.amount, exp.currency)}</div>
                    {exp.payment_method === 'Corporate Credit Card' && (
                      <div className={`text-[10px] font-bold uppercase mt-1 ${isTagged ? 'text-green-500' : 'text-red-500'}`}>
                        {isTagged ? '● Tagged on CC' : '● Untagged'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="p-6 border-t bg-white flex gap-4">
          <button onClick={() => setShowPreview(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 transition-colors">Back to Drafts</button>
          <button onClick={handleFinalSubmit} className="flex-2 bg-blue-600 text-white py-4 px-12 rounded-2xl font-bold shadow-xl shadow-blue-200 active:scale-95 transition-transform">Submit to Approver</button>
        </div>
      </div>
    </div>
  );

  const StatementAnnotator = ({ image, expenses, existingAnnotations, onSave, onCancel }) => (
    <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col">
      <div className="flex justify-between items-center p-4 bg-slate-900/80 backdrop-blur-md text-white border-b border-white/10">
        <div className="font-bold">Annotate Statement (Page {currentStatementIndex + 1})</div>
        <button onClick={onCancel} className="bg-white/10 px-4 py-2 rounded-xl text-sm font-bold">Cancel</button>
      </div>
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-slate-800">
        <img src={image} className="max-w-full max-h-full object-contain" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full mx-4">
            <p className="text-sm font-bold mb-4 text-center text-slate-500">Tag Expenses to this Page:</p>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {expenses.filter(e => e.payment_method === 'Corporate Credit Card').map(e => (
                <button 
                  key={e.id} 
                  onClick={() => {
                    const newAnns = [...existingAnnotations.filter(a => a.expenseId !== e.id), { expenseId: e.id, pageIndex: currentStatementIndex }];
                    onSave(newAnns);
                    alert(`Tagged: ${e.description}`);
                  }}
                  className="w-full text-left p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <div className="font-bold text-slate-800 text-sm">{e.description}</div>
                  <div className="text-xs text-blue-600 font-bold mt-1">{e.currency} {e.amount}</div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-6">Annotations are automatically saved per page</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <form onSubmit={handleLogin} className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200 w-full max-w-sm border border-slate-100">
        <h1 className="text-3xl font-black mb-10 text-center text-slate-800 tracking-tight underline decoration-blue-500 underline-offset-8">BERKELEY</h1>
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Employee</label>
            <select name="employee" className="w-full p-4 bg-slate-50 border-0 rounded-2xl mt-2 focus:ring-2 focus:ring-blue-500 font-medium text-slate-700">
              {EMPLOYEES.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.office})</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
            <input name="password" type="password" placeholder="••••••••" required className="w-full p-4 bg-slate-50 border-0 rounded-2xl mt-2 focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white p-5 rounded-3xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all mt-4">Sign In</button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-sm font-black text-blue-600 uppercase tracking-tighter">Berkeley</h1>
          <p className="text-xs font-bold text-slate-400">{user.name} • {user.office}</p>
        </div>
        <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-800">Drafts</h2>
            <p className="text-sm font-medium text-slate-400">{pendingExpenses.length} items ready to submit</p>
          </div>
          <button onClick={() => setShowAddExpense(true)} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-blue-100 hover:scale-105 active:scale-95 transition-all">
            + New
          </button>
        </div>

        <div className="space-y-4">
          {pendingExpenses.map(exp => (
            <div key={exp.id} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center gap-5 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setEditingExpense(exp)}>
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl">
                {EXPENSE_CATEGORIES[exp.category_code]?.icon || '📄'}
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-800 text-lg">{exp.description}</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{exp.payment_method}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-blue-600">{formatCurrency(exp.amount, exp.currency)}</div>
              </div>
            </div>
          ))}
        </div>

        {pendingExpenses.length > 0 && (
          <div className="mt-12 space-y-4">
            <button onClick={() => setShowPreview(true)} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-lg shadow-2xl hover:bg-black transition-all">
              Submit Claim List
            </button>
            <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Always check annotations for CC items</p>
          </div>
        )}
      </main>

      {showAddExpense && <AddExpenseModal onClose={() => setShowAddExpense(false)} />}
      {editingExpense && <AddExpenseModal editExpense={editingExpense} onClose={() => setEditingExpense(null)} />}
      {showPreview && <PreviewClaimModal />}
      
      {showStatementUpload && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🧾</span>
            </div>
            <h3 className="text-2xl font-black mb-2">Upload Statement</h3>
            <p className="text-slate-400 font-medium mb-8 text-sm">Choose a photo of your credit card statement to begin tagging.</p>
            <input type="file" multiple accept="image/*" onChange={(e) => handleStatementUpload(e.target.files)} className="mb-8 block w-full text-sm font-bold text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-600 file:text-white" />
            <button onClick={() => setShowStatementUpload(false)} className="text-slate-400 font-black text-xs uppercase tracking-widest">Cancel</button>
          </div>
        </div>
      )}

      {showStatementAnnotator && (
        <StatementAnnotator 
          image={statementImages[currentStatementIndex]} 
          expenses={pendingExpenses} 
          existingAnnotations={statementAnnotations} 
          onSave={handleStatementAnnotationSave} 
          onCancel={() => { setShowStatementAnnotator(false); setShowPreview(true); }}
        />
      )}
    </div>
  );
};

export default App;