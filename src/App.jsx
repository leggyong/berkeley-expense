import React, { useState, useEffect, useRef } from 'react';

/*
 * BERKELEY INTERNATIONAL EXPENSE MANAGEMENT SYSTEM
 * Version: 7.0 - Ultra Simple (Server Only, No localStorage)
 * 
 * HOW IT WORKS:
 * 1. Load from server on login
 * 2. Save to server immediately after each add/edit/delete
 * 3. No localStorage, no complex sync, no race conditions
 * 4. What you see is what's on the server
 */

const SUPABASE_URL = 'https://wlhoyjsicvkncfjbexoi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsaG95anNpY3ZrbmNmamJleG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNzIyMzcsImV4cCI6MjA4NTg0ODIzN30.AB-W5DjcmCl6fnWiQ2reD0rgDIJiMCGymc994fSJplw';

// --- DATABASE CLIENT ---
const supabase = {
  from: (table) => {
    const headers = { 
      'apikey': SUPABASE_ANON_KEY, 
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 
      'Content-Type': 'application/json', 
      'Prefer': 'return=representation' 
    };
    
    return {
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

// --- FOREX RATE HELPERS ---
const calculateForexRate = (foreignAmount, reimbursementAmount) => {
  const foreign = parseFloat(foreignAmount);
  const reimburse = parseFloat(reimbursementAmount);
  if (!foreign || !reimburse || foreign === 0) return null;
  return reimburse / foreign; // Rate = SGD per 1 unit of foreign currency
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
  { id: 1008, name: 'Keisha Latoya Whitehorne', office: 'DXB', role: 'employee', reimburseCurrency: 'AED', password: 'berkeley123' }
];

const EXPENSE_CATEGORIES = {
  A: { name: 'Petrol Expenditure', subcategories: ['Full Petrol Allowance', 'Business Mileage Return'], icon: '⛽', requiresAttendees: false },
  B: { name: 'Parking', subcategories: ['Off-Street Parking'], icon: '🅿️', requiresAttendees: false },
  C: { name: 'Travel Expenses', subcategories: ['Public Transport', 'Taxis', 'Tolls', 'Congestion Charging', 'Subsistence'], icon: '🚕', requiresAttendees: false },
  D: { name: 'Vehicle Repairs', subcategories: ['Repairs', 'Parts'], icon: '🔧', requiresAttendees: false },
  E: { name: 'Entertaining', subcategories: ['Customers - Meals/Drinks', 'Customers - Accommodation', 'Customers - Others', 'Employees (only) - Meals/Drinks', 'Employees (only) - Accommodation', 'Employees (only) - Others'], icon: '🍽️', requiresAttendees: true },
  F: { name: 'Welfare', subcategories: ['Hotel Accommodation', 'Gifts to Employees', 'Corporate Gifts'], icon: '🏨', requiresAttendees: false, giftSubcategories: ['Gifts to Employees', 'Corporate Gifts'] },
  G: { name: 'Subscriptions', subcategories: ['Professional', 'Non-Professional', 'Newspapers & Magazines'], icon: '📰', requiresAttendees: false },
  H: { name: 'Computer Costs', subcategories: ['All Items'], icon: '💻', requiresAttendees: false },
  I: { name: 'WIP', subcategories: ['All Items'], icon: '📦', requiresAttendees: false },
  J: { name: 'Other', subcategories: ['Miscellaneous Vatable Items'], icon: '📋', requiresAttendees: false }
};

const CURRENCIES = ['AED', 'CNY', 'EUR', 'GBP', 'HKD', 'MYR', 'SGD', 'THB', 'TWD', 'USD'];

const formatCurrency = (amount, currency) => `${currency} ${parseFloat(amount || 0).toFixed(2)}`;
const formatDate = (dateStr) => { if (!dateStr) return ''; const d = new Date(dateStr); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
const formatShortDate = (dateStr) => { if (!dateStr) return ''; const d = new Date(dateStr); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }); };
const getMonthYear = (dateStr) => { if (!dateStr) return ''; const d = new Date(dateStr); return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }); };
const isOlderThan2Months = (dateStr) => { const d = new Date(dateStr); const t = new Date(); t.setMonth(t.getMonth() - 2); return d < t; };

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
  818: { finalReviewer: 801, finalReviewerName: 'Prabakaran Rajinderan' },
  810: { finalReviewer: 801, finalReviewerName: 'Prabakaran Rajinderan' },
  503: { finalReviewer: 801, finalReviewerName: 'Prabakaran Rajinderan' },
  1004: { finalReviewer: 801, finalReviewerName: 'Christopher James Mclean Frame' },
  1007: { finalReviewer: 801, finalReviewerName: 'Christopher James Mclean Frame' },
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

const getApprovalWorkflow = (employeeId, officeCode) => {
  if (SENIOR_STAFF_ROUTING[employeeId]) return SENIOR_STAFF_ROUTING[employeeId];
  const special = SPECIAL_REVIEWERS[employeeId];
  const office = APPROVAL_WORKFLOWS[officeCode];
  if (special && office) return { level1: office.level1, level1Name: office.level1Name, level2: special.finalReviewer, level2Name: special.finalReviewerName };
  return office;
};

const canUserReviewClaim = (userId, claim) => {
  if (!claim) return false;
  const level = claim.approval_level || 1;
  if (level === 1 && claim.level1_approver === userId) return true;
  if (level === 2 && claim.level2_approver === userId) return true;
  return false;
};

const getApproverName = (approverId) => {
  const emp = EMPLOYEES.find(e => e.id === approverId);
  return emp ? emp.name.split(' ').slice(0, 2).join(' ') : 'Reviewer';
};

const getClaimStatusText = (claim) => {
  if (claim.status === 'approved') return '✅ Approved';
  if (claim.status === 'submitted_to_finance') return '📤 Submitted to Finance';
  if (claim.status === 'rejected') return 'Rejected';
  if (claim.status === 'changes_requested') return 'Changes Requested';
  if (claim.status === 'pending_review') {
    const approverName = getApproverName(claim.level1_approver);
    return `Pending ${approverName}'s Review`;
  }
  if (claim.status === 'pending_level2') {
    const approverName = getApproverName(claim.level2_approver);
    return `Pending ${approverName}'s Review`;
  }
  return claim.status;
};

const ImageViewer = ({ src, onClose }) => (
  <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4" onClick={onClose}>
    <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white w-12 h-12 rounded-full text-2xl">✕</button>
    <img src={src} alt="Full size" className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
  </div>
);

const StatementAnnotator = ({ images, initialIndex = 0, expenses, existingAnnotations = [], onSave, onCancel }) => {
  const canvasRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
  const [baseImage, setBaseImage] = useState(null);
  const [annotatedImages, setAnnotatedImages] = useState({}); // Store annotated versions per index
  const [saving, setSaving] = useState(false); // Loading state for save button
  
  // Store annotations PER statement index
  const [annotationsByStatement, setAnnotationsByStatement] = useState(() => {
    // Initialize from existingAnnotations, grouping by statementIndex
    const grouped = {};
    existingAnnotations.forEach(a => {
      const idx = a.statementIndex || 0;
      if (!grouped[idx]) grouped[idx] = [];
      grouped[idx].push(a);
    });
    return grouped;
  });

  const image = images[currentIndex];
  
  // Get current statement's annotations (in pixels for display)
  const [currentAnnotations, setCurrentAnnotations] = useState([]);

  useEffect(() => {
    setImageLoaded(false);
    const img = new Image();
    img.onload = () => {
      const maxW = Math.min(800, window.innerWidth - 40);
      const scale = Math.min(maxW / img.width, 1);
      setImgDimensions({ width: img.width * scale, height: img.height * scale, scale });
      setBaseImage(img);
      setImageLoaded(true);
    };
    img.src = image;
  }, [image]);

  // Convert annotations for current statement from percentages to pixels when image loads or statement changes
  useEffect(() => {
    if (imageLoaded && imgDimensions.width > 0) {
      const statementAnns = annotationsByStatement[currentIndex] || [];
      const pixelAnnotations = statementAnns.map(a => {
        if (a.xPct !== undefined) {
          return {
            ref: a.ref,
            x: a.xPct * imgDimensions.width,
            y: a.yPct * imgDimensions.height,
            width: a.widthPct * imgDimensions.width,
            height: a.heightPct * imgDimensions.height
          };
        }
        return a;
      });
      setCurrentAnnotations(pixelAnnotations);
    }
  }, [currentIndex, annotationsByStatement, imageLoaded, imgDimensions]);

  useEffect(() => {
    if (!imageLoaded || !baseImage) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = imgDimensions.width;
    canvas.height = imgDimensions.height;
    ctx.drawImage(baseImage, 0, 0, imgDimensions.width, imgDimensions.height);
    currentAnnotations.forEach(ann => {
      ctx.strokeStyle = '#ff6600'; ctx.lineWidth = 3;
      ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
      ctx.fillStyle = '#ff6600';
      ctx.fillRect(ann.x, ann.y - 22, Math.max(35, ann.ref.length * 12), 22);
      ctx.fillStyle = 'white'; ctx.font = 'bold 14px Arial';
      ctx.fillText(ann.ref, ann.x + 5, ann.y - 6);
      ctx.fillStyle = '#ff6600';
      const hs = 10;
      ctx.fillRect(ann.x - hs/2, ann.y - hs/2, hs, hs);
      ctx.fillRect(ann.x + ann.width - hs/2, ann.y - hs/2, hs, hs);
      ctx.fillRect(ann.x - hs/2, ann.y + ann.height - hs/2, hs, hs);
      ctx.fillRect(ann.x + ann.width - hs/2, ann.y + ann.height - hs/2, hs, hs);
    });
  }, [currentAnnotations, imageLoaded, baseImage, imgDimensions]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: x - rect.left, y: y - rect.top };
  };

  const findAnnotationAt = (pos) => {
    const hs = 15;
    for (let i = currentAnnotations.length - 1; i >= 0; i--) {
      const a = currentAnnotations[i];
      if (Math.abs(pos.x - a.x) < hs && Math.abs(pos.y - a.y) < hs) return { ann: a, index: i, corner: 'tl' };
      if (Math.abs(pos.x - (a.x + a.width)) < hs && Math.abs(pos.y - a.y) < hs) return { ann: a, index: i, corner: 'tr' };
      if (Math.abs(pos.x - a.x) < hs && Math.abs(pos.y - (a.y + a.height)) < hs) return { ann: a, index: i, corner: 'bl' };
      if (Math.abs(pos.x - (a.x + a.width)) < hs && Math.abs(pos.y - (a.y + a.height)) < hs) return { ann: a, index: i, corner: 'br' };
      if (pos.x >= a.x && pos.x <= a.x + a.width && pos.y >= a.y && pos.y <= a.y + a.height) return { ann: a, index: i, corner: null };
    }
    return null;
  };

  const handleStart = (e) => {
    const pos = getPos(e);
    const found = findAnnotationAt(pos);
    if (found) {
      if (found.corner) setResizing({ index: found.index, corner: found.corner, startX: pos.x, startY: pos.y, origAnn: { ...found.ann } });
      else setDragging({ index: found.index, offsetX: pos.x - found.ann.x, offsetY: pos.y - found.ann.y });
    } else if (selectedLabel) {
      setCurrentAnnotations(prev => [...prev.filter(a => a.ref !== selectedLabel), { ref: selectedLabel, x: pos.x - 50, y: pos.y - 15, width: 100, height: 30 }]);
      setSelectedLabel(null);
    }
  };

  const handleMove = (e) => {
    const pos = getPos(e);
    if (dragging !== null) {
      setCurrentAnnotations(prev => prev.map((a, i) => i === dragging.index ? { ...a, x: pos.x - dragging.offsetX, y: pos.y - dragging.offsetY } : a));
    } else if (resizing !== null) {
      const { index, corner, startX, startY, origAnn } = resizing;
      const dx = pos.x - startX, dy = pos.y - startY;
      setCurrentAnnotations(prev => prev.map((a, i) => {
        if (i !== index) return a;
        let n = { ...a };
        if (corner === 'br') { n.width = Math.max(40, origAnn.width + dx); n.height = Math.max(20, origAnn.height + dy); }
        else if (corner === 'bl') { n.x = origAnn.x + dx; n.width = Math.max(40, origAnn.width - dx); n.height = Math.max(20, origAnn.height + dy); }
        else if (corner === 'tr') { n.y = origAnn.y + dy; n.width = Math.max(40, origAnn.width + dx); n.height = Math.max(20, origAnn.height - dy); }
        else if (corner === 'tl') { n.x = origAnn.x + dx; n.y = origAnn.y + dy; n.width = Math.max(40, origAnn.width - dx); n.height = Math.max(20, origAnn.height - dy); }
        return n;
      }));
    }
  };

  const handleEnd = () => { setDragging(null); setResizing(null); };
  const removeAnnotation = (ref) => setCurrentAnnotations(prev => prev.filter(a => a.ref !== ref));
  
  // Save current statement's annotations before switching
  const saveCurrentToState = () => {
    if (imgDimensions.width > 0) {
      // Convert to percentages and store
      const asPercent = currentAnnotations.map(a => ({
        ref: a.ref,
        statementIndex: currentIndex,
        xPct: a.x / imgDimensions.width,
        yPct: a.y / imgDimensions.height,
        widthPct: a.width / imgDimensions.width,
        heightPct: a.height / imgDimensions.height
      }));
      setAnnotationsByStatement(prev => ({ ...prev, [currentIndex]: asPercent }));
      
      // Save annotated image
      if (canvasRef.current) {
        setAnnotatedImages(prev => ({ ...prev, [currentIndex]: canvasRef.current.toDataURL('image/png') }));
      }
    }
  };

  // Switch to different statement
  const switchStatement = (newIndex) => {
    if (newIndex === currentIndex) return;
    saveCurrentToState();
    setCurrentIndex(newIndex);
  };
  
  // Final save - combine all annotations from all statements
  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    
    try {
      // First save current statement
      saveCurrentToState();
      
      // Collect all annotations from all statements
      const allAnnotations = [];
      const finalAnnotatedImages = { ...annotatedImages };
      
      // Add current statement's annotated image
      if (canvasRef.current) {
        finalAnnotatedImages[currentIndex] = canvasRef.current.toDataURL('image/png');
      }
      
      // Convert current annotations to percent format
      const currentAsPercent = currentAnnotations.map(a => ({
        ref: a.ref,
        statementIndex: currentIndex,
        xPct: a.x / imgDimensions.width,
        yPct: a.y / imgDimensions.height,
        widthPct: a.width / imgDimensions.width,
        heightPct: a.height / imgDimensions.height
      }));
      
      // Merge: use annotationsByStatement for other statements, currentAsPercent for current
      Object.keys(annotationsByStatement).forEach(idx => {
        if (parseInt(idx) !== currentIndex) {
          allAnnotations.push(...annotationsByStatement[idx]);
        }
      });
      allAnnotations.push(...currentAsPercent);
      
      await onSave(finalAnnotatedImages, allAnnotations);
    } catch (err) {
      console.error('Save annotation error:', err);
      alert('Failed to save annotations');
      setSaving(false);
    }
  };

  // Get ALL tagged refs across ALL statements for the expense list display
  const allTaggedRefs = new Set();
  Object.values(annotationsByStatement).forEach(anns => {
    anns.forEach(a => allTaggedRefs.add(a.ref));
  });
  currentAnnotations.forEach(a => allTaggedRefs.add(a.ref));

  const foreignExpenses = expenses.filter(e => e.isForeignCurrency);
  const untaggedExpenses = foreignExpenses.filter(e => !allTaggedRefs.has(e.ref));

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col z-[100]">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-3 flex justify-between items-center shrink-0">
        <div><h2 className="text-base font-bold">📝 Annotate Statement</h2><p className="text-amber-100 text-xs">Select label → tap on statement</p></div>
        <button onClick={onCancel} className="w-8 h-8 rounded-full bg-white/20">✕</button>
      </div>
      {/* Statement selector tabs */}
      {images.length > 1 && (
        <div className="bg-slate-700 p-2 flex gap-2 overflow-x-auto shrink-0">
          {images.map((img, idx) => {
            const hasAnnotations = (annotationsByStatement[idx] && annotationsByStatement[idx].length > 0) || 
                                   (idx === currentIndex && currentAnnotations.length > 0);
            return (
              <button 
                key={idx} 
                onClick={() => switchStatement(idx)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                  currentIndex === idx 
                    ? 'bg-amber-500 text-white' 
                    : hasAnnotations
                      ? 'bg-green-600 text-white' 
                      : 'bg-slate-600 text-slate-200'
                }`}
              >
                <span>📄 Statement {idx + 1}</span>
                {hasAnnotations && currentIndex !== idx && <span>✓</span>}
              </button>
            );
          })}
        </div>
      )}
      <div className="bg-white p-3 shrink-0 max-h-[35vh] overflow-auto">
        <p className="font-semibold mb-2 text-sm">Select expense to place:</p>
        <div className="flex flex-wrap gap-2">
          {foreignExpenses.map(exp => {
            const isOnCurrentStatement = currentAnnotations.some(a => a.ref === exp.ref);
            const isOnOtherStatement = !isOnCurrentStatement && allTaggedRefs.has(exp.ref);
            const isPlaced = isOnCurrentStatement || isOnOtherStatement;
            const isSelected = selectedLabel === exp.ref;
            return (
              <button key={exp.ref} onClick={() => setSelectedLabel(isSelected ? null : exp.ref)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium text-left ${
                  isSelected ? 'bg-orange-500 text-white ring-2 ring-orange-300' : 
                  isOnCurrentStatement ? 'bg-green-100 text-green-700 border-2 border-green-400' : 
                  isOnOtherStatement ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' :
                  'bg-slate-100 text-slate-700'
                }`}>
                <div className="font-bold">{exp.ref} - {exp.merchant}</div>
                <div className={`text-[10px] ${
                  isSelected ? 'text-orange-100' : 
                  isOnCurrentStatement ? 'text-green-600' : 
                  isOnOtherStatement ? 'text-blue-500' :
                  'text-slate-500'
                }`}>
                  {exp.currency} {parseFloat(exp.amount).toFixed(2)} → SGD {parseFloat(exp.reimbursementAmount || exp.amount).toFixed(2)}
                  {isOnOtherStatement && ' (other stmt)'}
                </div>
                {isOnCurrentStatement && <span className="ml-1 text-xs" onClick={(e) => { e.stopPropagation(); removeAnnotation(exp.ref); }}>✕</span>}
              </button>
            );
          })}
        </div>
        {untaggedExpenses.length > 0 && <div className="mt-2 bg-amber-50 border border-amber-300 rounded-lg p-2"><p className="text-amber-800 text-xs">⚠️ Untagged: {untaggedExpenses.map(e => e.ref).join(', ')}</p></div>}
        {selectedLabel && <p className="mt-2 text-orange-600 font-medium text-xs">👆 Tap image to place {selectedLabel}</p>}
      </div>
      <div className="flex-1 overflow-auto bg-slate-800 p-2" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
        {imageLoaded && (
          <canvas ref={canvasRef}
            onMouseDown={(e) => { e.preventDefault(); handleStart(e); }}
            onMouseMove={(e) => { e.preventDefault(); handleMove(e); }}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={(e) => {
              if (selectedLabel) { e.preventDefault(); handleStart(e); return; }
              const pos = getPos(e);
              const found = findAnnotationAt(pos);
              if (found) { e.preventDefault(); handleStart(e); }
            }}
            onTouchMove={(e) => {
              if (dragging !== null || resizing !== null) {
                e.preventDefault();
                handleMove(e);
              }
            }}
            onTouchEnd={handleEnd}
            className={`border-2 ${selectedLabel ? 'border-orange-400' : 'border-slate-500'} rounded-lg`}
            style={{ display: 'block' }}
          />
        )}
      </div>
      <div className="bg-slate-100 p-3 flex gap-3 justify-end shrink-0">
        <button onClick={onCancel} disabled={saving} className="px-4 py-2 rounded-xl border-2 border-slate-300 font-semibold text-sm disabled:opacity-50">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-green-600 text-white font-semibold text-sm disabled:opacity-50">{saving ? '💾 Saving...' : 'Save ✓'}</button>
      </div>
    </div>
  );
};

const StatementUploadModal = ({ existingImages, onClose, onContinue }) => {
    const [localStatements, setLocalStatements] = useState([...existingImages]);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef(null);
    const triggerFileSelect = () => { if (fileInputRef.current) fileInputRef.current.click(); };

    const handleFileSelect = (e) => { 
      const file = e.target.files[0]; 
      if (!file) return;
      setIsProcessing(true);
      // Convert to base64 for persistence across devices
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        setLocalStatements(prev => [...prev, base64]);
        setIsProcessing(false);
      };
      reader.onerror = () => {
        alert("Failed to read file.");
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeStatement = (idx) => setLocalStatements(prev => prev.filter((_, i) => i !== idx));
    const handleContinueInternal = () => { onContinue(localStatements); };
    
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="bg-amber-500 text-white p-5 shrink-0"><h2 className="text-lg font-bold">💳 Upload Credit Card Statements</h2><p className="text-amber-100 text-sm">You can upload multiple statements</p></div>
          <div className="p-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-3 mb-4">
              {localStatements.map((img, idx) => (
                <div key={idx} className="relative border-2 border-green-400 rounded-lg overflow-hidden">
                  <img src={img} alt={`Statement ${idx + 1}`} className="w-full h-24 object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                  <div className="w-full h-24 bg-slate-200 items-center justify-center text-slate-500 text-xs" style={{display: 'none'}}>Image unavailable</div>
                  <button onClick={() => removeStatement(idx)} className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full text-xs">✕</button>
                  <div className="absolute bottom-0 left-0 right-0 bg-green-600 text-white text-xs text-center py-1">Statement {idx + 1}</div>
                </div>
              ))}
              <div onClick={triggerFileSelect} className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-amber-400 flex flex-col items-center justify-center min-h-[96px] bg-slate-50">
                {isProcessing ? <span className="text-sm font-semibold text-amber-600 animate-pulse">Loading...</span> : <><span className="text-3xl">➕</span><span className="text-xs text-slate-500 mt-1">Add Statement</span></>}
              </div>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} disabled={isProcessing} />
            </div>
            {localStatements.length === 0 && (<div className="text-center py-8 text-slate-400"><p>📄 No statements uploaded yet</p><p className="text-sm">Tap the + box to add one</p></div>)}
          </div>
          <div className="p-4 border-t flex gap-3 shrink-0"><button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 font-semibold">Cancel</button><button onClick={handleContinueInternal} disabled={localStatements.length === 0 || isProcessing} className="flex-[2] py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50">{isProcessing ? 'Please wait...' : `Annotate (${localStatements.length}) →`}</button></div>
        </div>
      </div>
    );
};

export default function BerkeleyExpenseSystem() {
  const [currentUser, setCurrentUser] = useState(() => { try { const saved = localStorage.getItem('berkeley_current_user'); return saved ? JSON.parse(saved) : null; } catch (e) { return null; } });
  const [expenses, setExpenses] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState(null); // 'saving', 'saved', null
  const [downloading, setDownloading] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showStatementUpload, setShowStatementUpload] = useState(false);
  const [showStatementAnnotator, setShowStatementAnnotator] = useState(false);
  const [statementImages, setStatementImages] = useState([]); 
  const [originalStatementImages, setOriginalStatementImages] = useState([]); // Store original images for re-annotation 
  const [currentStatementIndex, setCurrentStatementIndex] = useState(0);
  const [annotatedStatements, setAnnotatedStatements] = useState([]);
  const [statementAnnotations, setStatementAnnotations] = useState([]);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [activeTab, setActiveTab] = useState('my_expenses');
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingClaim, setEditingClaim] = useState(null);
  const [backchargeFromDate, setBackchargeFromDate] = useState('');
  const [backchargeToDate, setBackchargeToDate] = useState('');
  const [showBackchargeReport, setShowBackchargeReport] = useState(false);
  const [showRequestChanges, setShowRequestChanges] = useState(false);
  const [changeRequestComment, setChangeRequestComment] = useState('');
  const [viewingImage, setViewingImage] = useState(null);
  const [loginStep, setLoginStep] = useState('select');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- ULTRA-SIMPLE SYNC (Server Only, No localStorage) ---
  // Version 7.0: Dead simple - just save to server, load from server
  
  const saveToServer = async (expensesToSave, statementsToSave, annotationsToSave, originalsToSave) => {
    if (!currentUser) return false;
    
    setSavingStatus('saving');
    
    try {
      const draftData = { 
        user_id: currentUser.id, 
        expenses: JSON.stringify(expensesToSave || []), 
        statements: JSON.stringify(statementsToSave || []), 
        annotations: JSON.stringify(annotationsToSave || []),
        originals: JSON.stringify(originalsToSave || []),
        updated_at: new Date().toISOString() 
      };
      
      // Check if record exists
      const { data: existing } = await supabase.from('user_drafts').select('id').eq('user_id', currentUser.id);
      
      if (existing && existing.length > 0) {
        await supabase.from('user_drafts').update(draftData).eq('user_id', currentUser.id);
      } else {
        await supabase.from('user_drafts').insert([draftData]);
      }
      
      setSavingStatus('saved');
      setTimeout(() => setSavingStatus(null), 1500);
      return true;
    } catch (err) { 
      console.error('Save failed:', err);
      setSavingStatus('error');
      setTimeout(() => setSavingStatus(null), 3000);
      return false;
    }
  };

  const loadFromServer = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.from('user_drafts').select('*').eq('user_id', currentUser.id);
      
      if (!error && data && data.length > 0) {
        const draft = data[0];
        
        if (draft.expenses) {
          try {
            const parsed = JSON.parse(draft.expenses);
            if (Array.isArray(parsed)) setExpenses(parsed);
          } catch (e) { console.error('Parse expenses error:', e); }
        }
        
        if (draft.statements) {
          try {
            const parsed = JSON.parse(draft.statements);
            if (Array.isArray(parsed)) setAnnotatedStatements(parsed);
          } catch (e) { console.error('Parse statements error:', e); }
        }
        
        if (draft.annotations) {
          try {
            const parsed = JSON.parse(draft.annotations);
            if (Array.isArray(parsed)) setStatementAnnotations(parsed);
          } catch (e) { console.error('Parse annotations error:', e); }
        }
        
        if (draft.originals) {
          try {
            const parsed = JSON.parse(draft.originals);
            if (Array.isArray(parsed)) setOriginalStatementImages(parsed);
          } catch (e) { console.error('Parse originals error:', e); }
        }
      }
    } catch (err) { 
      console.error('Load failed:', err); 
    }
    
    setLoading(false);
  };

  // Load from server when user logs in
  useEffect(() => { 
    if (currentUser) {
      loadFromServer();
    }
  }, [currentUser]);

  // Manual refresh button
  const handleManualSync = async () => { 
    await loadFromServer();
    await loadClaims();
    alert('✅ Refreshed from server!');
  };

  // Delete expense and save immediately
  const handleDeleteExpense = async (expenseId) => {
    const newExpenses = sortAndReassignRefs(expenses.filter(e => e.id !== expenseId));
    setExpenses(newExpenses);
    await saveToServer(newExpenses, annotatedStatements, statementAnnotations, originalStatementImages);
  };

  const clearDraftStorage = async () => {
    if (currentUser) {
      try { await supabase.from('user_drafts').delete().eq('user_id', currentUser.id); } catch (err) {}
    }
  };

  const loadClaims = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('claims').select('*');
      if (!error && data) setClaims(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { if (currentUser) loadClaims(); }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      const returned = claims.filter(c => c.user_id === currentUser.id && c.status === 'changes_requested');
      if (returned.length > 0 && returned[0].expenses) setExpenses(returned[0].expenses.map(e => ({ ...e, status: 'draft' })));
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
  
  const sortAndReassignRefs = (expenseList) => {
    try {
      if (!expenseList || !Array.isArray(expenseList) || expenseList.length === 0) return expenseList || [];
      const sorted = [...expenseList].sort((a, b) => {
        const dateA = a?.date ? new Date(a.date) : new Date();
        const dateB = b?.date ? new Date(b.date) : new Date();
        return dateA - dateB;
      });
      const categoryCount = {};
      return sorted.map(exp => {
        if (!exp) return exp;
        const cat = exp.category || 'C';
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        return { ...exp, ref: `${cat}${categoryCount[cat]}` };
      });
    } catch (err) { return expenseList || []; }
  };
  const getReviewableClaims = () => { if (!currentUser) return []; return claims.filter(c => (c.status === 'pending_review' || c.status === 'pending_level2') && canUserReviewClaim(currentUser.id, c)); };
  
  const generatePDFFromHTML = async (expenseList, userName, officeCode, claimNumber, submittedDate, statementImgs, reimburseCurrency, level2ApprovedBy, level2ApprovedAt) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert('Please allow popups'); return; }
    const office = OFFICES.find(o => o.code === officeCode);
    const companyName = office?.companyName || 'Berkeley';
    const groupedExpenses = expenseList.reduce((acc, exp) => { if (!acc[exp.category]) acc[exp.category] = []; acc[exp.category].push(exp); return acc; }, {});
    const getSubcategoryTotal = (cat, subcat) => (groupedExpenses[cat] || []).filter(e => e.subcategory === subcat).reduce((sum, e) => sum + parseFloat(e.reimbursementAmount || e.amount || 0), 0);
    const totalAmount = expenseList.reduce((sum, e) => sum + parseFloat(e.reimbursementAmount || e.amount || 0), 0);
    const claimMonth = submittedDate ? getMonthYear(submittedDate) : getMonthYear(new Date().toISOString());
    const travelExpenses = expenseList.filter(e => ['A', 'B', 'C', 'D'].includes(e.category));
    const entertainingExpenses = expenseList.filter(e => ['E', 'F'].includes(e.category));
    const otherExpenses = expenseList.filter(e => ['G', 'H', 'I', 'J'].includes(e.category));

    const travelSub = { parking: travelExpenses.filter(e => e.subcategory === 'Off-Street Parking').reduce((s,e) => s + parseFloat(e.reimbursementAmount||e.amount||0), 0), publicTransport: travelExpenses.filter(e => e.subcategory === 'Public Transport').reduce((s,e) => s + parseFloat(e.reimbursementAmount||e.amount||0), 0), taxis: travelExpenses.filter(e => e.subcategory === 'Taxis').reduce((s,e) => s + parseFloat(e.reimbursementAmount||e.amount||0), 0), tolls: travelExpenses.filter(e => e.subcategory === 'Tolls').reduce((s,e) => s + parseFloat(e.reimbursementAmount||e.amount||0), 0), congestion: travelExpenses.filter(e => e.subcategory === 'Congestion Charging').reduce((s,e) => s + parseFloat(e.reimbursementAmount||e.amount||0), 0), subsistence: travelExpenses.filter(e => e.subcategory === 'Subsistence').reduce((s,e) => s + parseFloat(e.reimbursementAmount||e.amount||0), 0), repairs: travelExpenses.filter(e => e.subcategory === 'Repairs').reduce((s,e) => s + parseFloat(e.reimbursementAmount||e.amount||0), 0), parts: travelExpenses.filter(e => e.subcategory === 'Parts').reduce((s,e) => s + parseFloat(e.reimbursementAmount||e.amount||0), 0) };
    const travelTotal = Object.values(travelSub).reduce((s,v) => s + v, 0);
    const entSub = { 
      empMeals: entertainingExpenses.filter(e => e.category === 'E' && (e.subcategory === 'Employees (only) - Meals/Drinks' || e.subcategory === 'Employees - Meals/Drinks' || e.subcategory?.includes('Employees (Staff only)'))).reduce((s,e) => s + parseFloat(e.reimbursementAmount||e.amount||0), 0), 
      empAccom: entertainingExpenses.filter(e => e.category === 'E' && (e.subcategory === 'Employees (only) - Accommodation' || e.subcategory === 'Employees - Accommodation')).reduce((s,e) => s + parseFloat(e.reimbursementAmount||e.amount||0), 0),
      empOther: entertainingExpenses.filter(e => e.category === 'E' && (e.subcategory === 'Employees (only) - Others' || e.subcategory === 'Employees - Others')).reduce((s,e) => s + parseFloat(e.reimbursementAmount||e.amount||0), 0),
      custMeals: entertainingExpenses.filter(e => e.category === 'E' && (e.subcategory === 'Customers - Meals/Drinks' || e.subcategory?.includes('Customers'))).reduce((s,e) => s + parseFloat(e.reimbursementAmount||e.amount||0), 0), 
      custAccom: entertainingExpenses.filter(e => e.category === 'E' && e.subcategory === 'Customers - Accommodation').reduce((s,e) => s + parseFloat(e.reimbursementAmount||e.amount||0), 0),
      custOther: entertainingExpenses.filter(e => e.category === 'E' && e.subcategory === 'Customers - Others').reduce((s,e) => s + parseFloat(e.reimbursementAmount||e.amount||0), 0),
      hotels: entertainingExpenses.filter(e => e.subcategory === 'Hotel Accommodation').reduce((s,e) => s + parseFloat(e.reimbursementAmount||e.amount||0), 0), 
      empGifts: entertainingExpenses.filter(e => e.subcategory === 'Gifts to Employees').reduce((s,e) => s + parseFloat(e.reimbursementAmount||e.amount||0), 0), 
      corpGifts: entertainingExpenses.filter(e => e.subcategory === 'Corporate Gifts').reduce((s,e) => s + parseFloat(e.reimbursementAmount||e.amount||0), 0) 
    };
    const entTotal = Object.values(entSub).reduce((s,v) => s + v, 0);
    const othSub = { professional: otherExpenses.filter(e => e.subcategory === 'Professional').reduce((s,e) => s + parseFloat(e.reimbursementAmount||e.amount||0), 0), nonProfessional: otherExpenses.filter(e => e.subcategory === 'Non-Professional').reduce((s,e) => s + parseFloat(e.reimbursementAmount||e.amount||0), 0), publications: otherExpenses.filter(e => e.subcategory === 'Newspapers & Magazines').reduce((s,e) => s + parseFloat(e.reimbursementAmount||e.amount||0), 0), computer: otherExpenses.filter(e => e.category === 'H').reduce((s,e) => s + parseFloat(e.reimbursementAmount||e.amount||0), 0), wip: otherExpenses.filter(e => e.category === 'I').reduce((s,e) => s + parseFloat(e.reimbursementAmount||e.amount||0), 0), other: otherExpenses.filter(e => e.category === 'J').reduce((s,e) => s + parseFloat(e.reimbursementAmount||e.amount||0), 0) };
    const othTotal = Object.values(othSub).reduce((s,v) => s + v, 0);

    let receiptsHTML = '';
    for (const exp of expenseList) {
      const imgs = [exp.receiptPreview, exp.receiptPreview2].filter(Boolean);
      const isCNY = exp.currency === 'CNY';
      const isOld = isOlderThan2Months(exp.date);
      const adminNotesHTML = exp.adminNotes ? `<br><span style="color:#d97706;font-style:italic;">Notes: ${exp.adminNotes}</span>` : '';
      const oldWarningHTML = isOld ? `<br><span style="background:#fff3cd;color:#856404;padding:2px 6px;border-radius:4px;font-weight:bold;font-size:9px;">⚠️ >2 MONTHS OLD</span>` : '';
      const duplicateHTML = exp.isPotentialDuplicate ? `<br><span style="background:#fef2f2;color:#dc2626;padding:2px 6px;border-radius:4px;font-weight:bold;font-size:9px;">⚠️ DUPLICATE${exp.duplicateInfo ? ` - ${exp.duplicateInfo}` : ''}</span>` : '';
      const paxCount = parseInt(exp.numberOfPax) || 0;
      const isEntertaining = ['E', 'F'].includes(exp.category);
      const perPaxAmount = isEntertaining && paxCount > 0 ? (parseFloat(exp.reimbursementAmount || exp.amount) / paxCount) : 0;
      const perPaxHTML = isEntertaining && paxCount > 0 ? `<br><span style="color:#6366f1;font-weight:bold;font-size:9px;">👥 ${paxCount} pax • ${reimburseCurrency} ${perPaxAmount.toFixed(2)} per pax</span>` : '';
      const attendeesHTML = exp.attendees ? `<br><span style="color:#059669;font-size:9px;">Attendees: ${exp.attendees.replace(/\n/g, ', ')}</span>` : '';
      const backchargeHTML = exp.hasBackcharge && exp.backcharges?.length > 0 ? `<div class="backcharge-inline"><strong style="color:#1565c0;">📊 Backcharges:</strong> ${exp.backcharges.map(bc => `${bc.development}: ${bc.percentage}%`).join(' | ')}</div>` : '';
      
      // Forex rate info
      const forexRateHTML = exp.isForeignCurrency && exp.forexRate ? `<br><span style="color:#d97706;font-weight:bold;font-size:9px;">💱 Rate: 1 ${exp.currency} = ${exp.forexRate.toFixed(4)} ${reimburseCurrency}</span>` : '';
      
      receiptsHTML += `<div class="page receipt-page"><div class="receipt-header"><div class="receipt-ref">${exp.ref}</div><div class="receipt-info"><strong>${exp.merchant}</strong><br>Date: ${formatShortDate(exp.date)} | Original: ${formatCurrency(exp.amount, exp.currency)}${exp.isForeignCurrency ? ` | Reimburse: ${formatCurrency(exp.reimbursementAmount, reimburseCurrency)}` : ''}<br>${exp.description || ''}${oldWarningHTML}${duplicateHTML}${forexRateHTML}${perPaxHTML}${attendeesHTML}${adminNotesHTML}</div></div>${imgs.map((img, idx) => `<div>${imgs.length > 1 && isCNY ? `<p style="font-size:9px;color:#666;margin:2px 0;">${idx === 0 ? '发票 Fapiao' : '小票 Xiaopiao'}</p>` : ''}<img src="${img}" class="receipt-img" /></div>`).join('')}${imgs.length === 0 ? '<div class="no-receipt">No receipt image</div>' : ''}${backchargeHTML}</div>`;
    }

    const travelDetailHTML = travelExpenses.length > 0 ? `<div class="page"><h2 class="detail-title">Travel Expense Detail</h2><div class="detail-info">Name: <strong>${userName}</strong></div><p class="detail-note">Please do not include any travel expenses associated with Employee Entertaining. (See Staff Entertaining)</p><table class="detail-table"><thead><tr><th>Receipt No.</th><th>B<br>Parking</th><th colspan="5">C - Travel Expenses</th><th colspan="2">D - Motor Vehicles</th><th>Full Description</th></tr><tr><th>VAT</th><th>Parking</th><th>Public Transport</th><th>Taxis</th><th>Tolls</th><th>Cong.Chg</th><th>Subsistence</th><th>Repairs</th><th>Parts</th><th></th></tr></thead><tbody>${travelExpenses.map((exp, idx) => `<tr><td>${idx + 1}</td><td>${exp.subcategory === 'Off-Street Parking' ? (exp.reimbursementAmount||exp.amount) : ''}</td><td>${exp.subcategory === 'Public Transport' ? (exp.reimbursementAmount||exp.amount) : ''}</td><td>${exp.subcategory === 'Taxis' ? (exp.reimbursementAmount||exp.amount) : ''}</td><td>${exp.subcategory === 'Tolls' ? (exp.reimbursementAmount||exp.amount) : ''}</td><td>${exp.subcategory === 'Congestion Charging' ? (exp.reimbursementAmount||exp.amount) : ''}</td><td>${exp.subcategory === 'Subsistence' ? (exp.reimbursementAmount||exp.amount) : ''}</td><td>${exp.subcategory === 'Repairs' ? (exp.reimbursementAmount||exp.amount) : ''}</td><td>${exp.subcategory === 'Parts' ? (exp.reimbursementAmount||exp.amount) : ''}</td><td class="desc">${exp.ref} - ${exp.description || ''}${isOlderThan2Months(exp.date) ? ' ⚠️ (>2 Months Old)' : ''}${exp.adminNotes ? `<br><span style="color:#d97706;">Notes: ${exp.adminNotes}</span>` : ''}</td></tr>`).join('')}<tr class="subtotal-row"><td><strong>SUBTOTAL</strong></td><td><strong>${travelSub.parking||''}</strong></td><td><strong>${travelSub.publicTransport||''}</strong></td><td><strong>${travelSub.taxis||''}</strong></td><td><strong>${travelSub.tolls||''}</strong></td><td><strong>${travelSub.congestion||''}</strong></td><td><strong>${travelSub.subsistence||''}</strong></td><td><strong>${travelSub.repairs||''}</strong></td><td><strong>${travelSub.parts||''}</strong></td><td><strong>TOTAL: ${reimburseCurrency} ${travelTotal.toFixed(2)}</strong></td></tr></tbody></table></div>` : '';
    const entertainingDetailHTML = entertainingExpenses.length > 0 ? `<div class="page"><h2 class="detail-title">Entertaining and Welfare Detail</h2><div class="detail-info">Name: <strong>${userName}</strong></div><p class="detail-note">PLEASE ENSURE A FULL LIST OF GUESTS ENTERTAINED ARE SUPPLIED WITH EACH RECEIPT STATING WHO THEY ARE EMPLOYED BY.</p><table class="detail-table"><thead><tr><th>Receipt No.</th><th colspan="3">E - Employee Entertaining</th><th colspan="3">E - Business / Client Entertaining</th><th colspan="3">F - Welfare</th><th>Full Description</th></tr><tr><th></th><th>Meals/Drinks</th><th>Accom</th><th>Other</th><th>Meals/Drinks</th><th>Accom</th><th>Other</th><th>Hotels</th><th>Emp Gifts</th><th>Corp Gifts</th><th></th></tr></thead><tbody>${entertainingExpenses.map((exp, idx) => { const isEmpMeals = exp.subcategory === 'Employees (only) - Meals/Drinks' || exp.subcategory === 'Employees - Meals/Drinks' || exp.subcategory?.includes('Employees (Staff only)'); const isEmpAccom = exp.subcategory === 'Employees (only) - Accommodation' || exp.subcategory === 'Employees - Accommodation'; const isEmpOther = exp.subcategory === 'Employees (only) - Others' || exp.subcategory === 'Employees - Others'; const isCustMeals = exp.subcategory === 'Customers - Meals/Drinks' || exp.subcategory?.includes('Customers'); const isCustAccom = exp.subcategory === 'Customers - Accommodation'; const isCustOther = exp.subcategory === 'Customers - Others'; const pax = parseInt(exp.numberOfPax) || 0; const pp = pax > 0 ? (parseFloat(exp.reimbursementAmount||exp.amount)/pax).toFixed(2) : 0; return `<tr><td>${idx+1}</td><td>${isEmpMeals && exp.category === 'E' ? (exp.reimbursementAmount||exp.amount) : ''}</td><td>${isEmpAccom && exp.category === 'E' ? (exp.reimbursementAmount||exp.amount) : ''}</td><td>${isEmpOther && exp.category === 'E' ? (exp.reimbursementAmount||exp.amount) : ''}</td><td>${isCustMeals && exp.category === 'E' ? (exp.reimbursementAmount||exp.amount) : ''}</td><td>${isCustAccom && exp.category === 'E' ? (exp.reimbursementAmount||exp.amount) : ''}</td><td>${isCustOther && exp.category === 'E' ? (exp.reimbursementAmount||exp.amount) : ''}</td><td>${exp.subcategory === 'Hotel Accommodation' ? (exp.reimbursementAmount||exp.amount) : ''}</td><td>${exp.subcategory === 'Gifts to Employees' ? (exp.reimbursementAmount||exp.amount) : ''}</td><td>${exp.subcategory === 'Corporate Gifts' ? (exp.reimbursementAmount||exp.amount) : ''}</td><td class="desc">${exp.ref} - ${formatShortDate(exp.date)}, ${exp.description || ''} ${exp.attendees ? `(${exp.attendees})` : ''} ${pax > 0 ? `(${reimburseCurrency} ${pp}/pax)` : ''}${isOlderThan2Months(exp.date) ? ' ⚠️ (>2 Months Old)' : ''}${exp.adminNotes ? `<br><span style="color:#d97706;">Notes: ${exp.adminNotes}</span>` : ''}</td></tr>`; }).join('')}<tr class="subtotal-row"><td><strong>SUBTOTAL</strong></td><td><strong>${entSub.empMeals||''}</strong></td><td><strong>${entSub.empAccom||''}</strong></td><td><strong>${entSub.empOther||''}</strong></td><td><strong>${entSub.custMeals||''}</strong></td><td><strong>${entSub.custAccom||''}</strong></td><td><strong>${entSub.custOther||''}</strong></td><td><strong>${entSub.hotels||''}</strong></td><td><strong>${entSub.empGifts||''}</strong></td><td><strong>${entSub.corpGifts||''}</strong></td><td><strong>TOTAL: ${reimburseCurrency} ${entTotal.toFixed(2)}</strong></td></tr></tbody></table></div>` : '';
    const otherDetailHTML = otherExpenses.length > 0 ? `<div class="page"><h2 class="detail-title">Other Expense Detail</h2><div class="detail-info">Name: <strong>${userName}</strong></div><table class="detail-table"><thead><tr><th>Receipt No.</th><th colspan="3">G - Subscriptions</th><th>H - Computer</th><th>I - WIP</th><th>J - Other</th><th>Full Description</th></tr><tr><th></th><th>Professional</th><th>Non-Professional</th><th>Publications</th><th>Costs</th><th>Costs</th><th>Vatable</th><th></th></tr></thead><tbody>${otherExpenses.map((exp, idx) => `<tr><td>${idx+1}</td><td>${exp.subcategory === 'Professional' ? (exp.reimbursementAmount||exp.amount) : ''}</td><td>${exp.subcategory === 'Non-Professional' ? (exp.reimbursementAmount||exp.amount) : ''}</td><td>${exp.subcategory === 'Newspapers & Magazines' ? (exp.reimbursementAmount||exp.amount) : ''}</td><td>${exp.category === 'H' ? (exp.reimbursementAmount||exp.amount) : ''}</td><td>${exp.category === 'I' ? (exp.reimbursementAmount||exp.amount) : ''}</td><td>${exp.category === 'J' ? (exp.reimbursementAmount||exp.amount) : ''}</td><td class="desc">${exp.ref} - ${exp.description || ''}${isOlderThan2Months(exp.date) ? ' ⚠️ (>2 Months Old)' : ''}${exp.adminNotes ? `<br><span style="color:#d97706;">Notes: ${exp.adminNotes}</span>` : ''}</td></tr>`).join('')}<tr class="subtotal-row"><td><strong>SUBTOTAL</strong></td><td><strong>${othSub.professional||''}</strong></td><td><strong>${othSub.nonProfessional||''}</strong></td><td><strong>${othSub.publications||''}</strong></td><td><strong>${othSub.computer||''}</strong></td><td><strong>${othSub.wip||''}</strong></td><td><strong>${othSub.other||''}</strong></td><td><strong>TOTAL: ${reimburseCurrency} ${othTotal.toFixed(2)}</strong></td></tr></tbody></table></div>` : '';
    const backchargeExpenses = expenseList.filter(e => e.hasBackcharge && e.backcharges?.length > 0);
    const backchargeSummary = {};
    backchargeExpenses.forEach(exp => {
      const expAmount = parseFloat(exp.reimbursementAmount || exp.amount) || 0;
      exp.backcharges.forEach(bc => {
        const dev = bc.development;
        const pct = parseFloat(bc.percentage) || 0;
        const amt = (expAmount * pct / 100);
        if (!backchargeSummary[dev]) { backchargeSummary[dev] = { total: 0, items: [] }; }
        backchargeSummary[dev].total += amt;
        backchargeSummary[dev].items.push({ ref: exp.ref, merchant: exp.merchant, date: exp.date, amount: amt, percentage: pct });
      });
    });
    const backchargeReportHTML = Object.keys(backchargeSummary).length > 0 ? `<div class="page"><h2 class="detail-title">📊 Backcharge Summary Report</h2><div class="detail-info">Claimant: <strong>${userName}</strong> | Claim: <strong>${claimNumber || 'DRAFT'}</strong></div><div class="backcharge-section"><div class="backcharge-header">Expenses to be Backcharged by Development</div><table class="backcharge-table"><thead><tr><th>Development</th><th>Receipt Ref</th><th>Merchant</th><th>Date</th><th>%</th><th style="text-align:right;">Amount (${reimburseCurrency})</th></tr></thead><tbody>${Object.entries(backchargeSummary).map(([dev, data]) => data.items.map((item, idx) => `<tr><td>${idx === 0 ? `<strong>${dev}</strong>` : ''}</td><td>${item.ref}</td><td>${item.merchant}</td><td>${formatShortDate(item.date)}</td><td>${item.percentage}%</td><td class="amount">${item.amount.toFixed(2)}</td></tr>`).join('') + `<tr style="background:#e1bee7;"><td colspan="5"><strong>Subtotal: ${dev}</strong></td><td class="amount"><strong>${data.total.toFixed(2)}</strong></td></tr>`).join('')}<tr style="background:#9c27b0;color:white;"><td colspan="5"><strong>TOTAL BACKCHARGES</strong></td><td class="amount"><strong>${Object.values(backchargeSummary).reduce((sum, d) => sum + d.total, 0).toFixed(2)}</strong></td></tr></tbody></table></div></div>` : '';
    const statementsArray = Array.isArray(statementImgs) ? statementImgs : (statementImgs ? [statementImgs] : []);
    const statementsHTML = statementsArray.map((img, idx) => `<div class="page statement-page"><div class="statement-container"><div class="statement-header-inline">💳 Credit Card Statement ${statementsArray.length > 1 ? `(${idx + 1} of ${statementsArray.length})` : ''}</div><img src="${img}" class="statement-img" /></div></div>`).join('');

    const html = `<!DOCTYPE html><html><head><title>Expense Claim - ${claimNumber || 'Draft'}</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:10px;color:#000;}@page{margin:8mm;size:A4;}.page{page-break-after:always;padding:5mm 8mm;height:277mm;overflow:hidden;}.page:last-child{page-break-after:avoid;}.header{text-align:center;margin-bottom:15px;border-bottom:2px solid #000;padding-bottom:10px;}.header h1{font-size:16px;font-weight:bold;margin-bottom:3px;}.header .company{font-size:11px;color:#666;}.info-box{border:1px solid #000;margin-bottom:15px;}.info-row{display:flex;border-bottom:1px solid #000;}.info-row:last-child{border-bottom:none;}.info-cell{flex:1;padding:5px 8px;border-right:1px solid #000;}.info-cell:last-child{border-right:none;}.info-label{font-size:9px;color:#666;}.info-value{font-weight:bold;}.expenses-section{border:1px solid #000;margin-bottom:15px;}.section-header{background:#f0f0f0;padding:5px 8px;font-weight:bold;border-bottom:1px solid #000;font-size:11px;}.category-header{background:#f8f8f8;padding:4px 8px;font-weight:bold;font-size:10px;border-bottom:1px solid #ccc;text-decoration:underline;}.expense-row{display:flex;border-bottom:1px solid #ddd;}.col-cat{width:25px;padding:3px 5px;font-weight:bold;}.col-name{width:100px;padding:3px 5px;text-decoration:underline;}.col-detail{flex:1;padding:3px 5px;}.col-amount{width:80px;padding:3px 5px;text-align:right;}.sub-row{display:flex;padding-left:125px;border-bottom:1px solid #eee;}.total-row{display:flex;background:#f0f0f0;border-top:2px solid #000;padding:8px;}.total-row .label{flex:1;font-weight:bold;font-size:11px;}.total-row .amount{width:100px;text-align:right;font-weight:bold;font-size:11px;border:1px solid #000;padding:3px 8px;}.signature-section{margin-top:20px;}.sig-row{display:flex;margin-bottom:15px;gap:20px;}.sig-field{flex:1;}.sig-label{font-size:9px;margin-bottom:3px;}.sig-line{border-bottom:1px solid #000;height:20px;}.receipt-page{padding:5mm 8mm;}.receipt-header{background:#333;color:white;padding:8px;margin-bottom:5px;display:flex;align-items:flex-start;}.receipt-ref{font-size:20px;font-weight:bold;margin-right:12px;min-width:40px;}.receipt-info{font-size:9px;line-height:1.4;}.receipt-img{max-width:100%;max-height:200mm;object-fit:contain;display:block;margin:0 auto;}.no-receipt{background:#f5f5f5;padding:20px;text-align:center;color:#999;}.backcharge-inline{background:#e3f2fd;border:1px solid #1976d2;padding:6px 8px;margin-top:5px;border-radius:4px;font-size:9px;}.statement-page{padding:5mm;}.statement-container{}.statement-header-inline{background:#ff9800;color:white;padding:5px 10px;font-size:11px;font-weight:bold;text-align:center;margin:0;}.statement-img{max-width:100%;max-height:265mm;object-fit:contain;display:block;margin:0 auto;}.detail-title{font-size:14px;text-align:center;margin-bottom:15px;font-weight:bold;}.detail-info{margin-bottom:10px;}.detail-note{font-style:italic;margin-bottom:15px;font-size:9px;text-decoration:underline;}.detail-table{width:100%;border-collapse:collapse;font-size:9px;}.detail-table th,.detail-table td{border:1px solid #999;padding:4px;text-align:center;}.detail-table th{background:#e0e0e0;font-weight:bold;}.detail-table td.desc{text-align:left;color:#1976d2;}.subtotal-row{background:#fff3cd;}.subtotal-row td{font-weight:bold;}.backcharge-section{margin-top:15px;border:2px solid #9c27b0;}.backcharge-header{background:#9c27b0;color:white;padding:8px;font-weight:bold;font-size:12px;}.backcharge-table{width:100%;border-collapse:collapse;font-size:10px;}.backcharge-table th,.backcharge-table td{border:1px solid #999;padding:6px;text-align:left;}.backcharge-table th{background:#e1bee7;}.backcharge-table .amount{text-align:right;font-weight:bold;}@media print{.page{padding:5mm;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head><body>
    <div class="page"><div class="header"><h1>Motor & Expense Claim Form</h1><div class="company">${companyName}</div></div><div class="info-box"><div class="info-row"><div class="info-cell"><span class="info-label">Name</span><br><span class="info-value">${userName}</span></div><div class="info-cell"><span class="info-label">Month</span><br><span class="info-value">${claimMonth}</span></div></div><div class="info-row"><div class="info-cell"><span class="info-label">Claim Number</span><br><span class="info-value">${claimNumber || 'DRAFT'}</span></div><div class="info-cell"><span class="info-label">Reimbursement Currency</span><br><span class="info-value">${reimburseCurrency}</span></div></div></div><div class="expenses-section"><div class="section-header">Expenses claim</div><div class="category-header">Motor Vehicle Expenditure</div>${['A','B','C','D'].map(cat => { const c = EXPENSE_CATEGORIES[cat]; return `<div class="expense-row"><div class="col-cat">${cat}.</div><div class="col-name">${c.name}</div><div class="col-detail"></div><div class="col-amount"></div></div>${c.subcategories.map(sub => `<div class="sub-row"><div class="col-detail">${sub}</div><div class="col-amount">${reimburseCurrency} ${getSubcategoryTotal(cat,sub).toFixed(2)}</div></div>`).join('')}`; }).join('')}<div class="category-header">Business Expenditure</div>${['E','F','G','H','I','J'].map(cat => { const c = EXPENSE_CATEGORIES[cat]; return `<div class="expense-row"><div class="col-cat">${cat}.</div><div class="col-name">${c.name}</div><div class="col-detail"></div><div class="col-amount"></div></div>${c.subcategories.map(sub => `<div class="sub-row"><div class="col-detail">${sub}</div><div class="col-amount">${reimburseCurrency} ${getSubcategoryTotal(cat,sub).toFixed(2)}</div></div>`).join('')}`; }).join('')}</div><div class="total-row"><div class="label">Total expenses claimed</div><div class="amount">${reimburseCurrency} ${totalAmount.toFixed(2)}</div></div><div class="signature-section"><div class="sig-row"><div class="sig-field"><div class="sig-label">Signature of Claimant:</div><div class="sig-line" style="font-style:italic;padding-top:5px;">${userName}</div></div><div class="sig-field"><div class="sig-label">Date:</div><div class="sig-line" style="padding-top:5px;">${formatDate(submittedDate || new Date().toISOString())}</div></div></div><div class="sig-row"><div class="sig-field"><div class="sig-label">Authorised:</div><div class="sig-line" style="font-style:italic;padding-top:5px;">${level2ApprovedBy || ''}</div></div><div class="sig-field"><div class="sig-label">Date:</div><div class="sig-line" style="padding-top:5px;">${level2ApprovedAt ? formatDate(level2ApprovedAt) : ''}</div></div></div></div></div>
    ${travelDetailHTML}${entertainingDetailHTML}${otherDetailHTML}${backchargeReportHTML}${receiptsHTML}${statementsHTML}
    <script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);};</script></body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleDownloadPDF = async (claim) => {
    setDownloading(true);
    try {
      const emp = EMPLOYEES.find(e => e.id === claim.user_id);
      const statements = claim.annotated_statements || (claim.annotated_statement ? [claim.annotated_statement] : []);
      await generatePDFFromHTML(claim.expenses || [], claim.user_name, emp?.office, claim.claim_number, claim.submitted_at, statements, emp?.reimburseCurrency || claim.currency, claim.level2_approved_by, claim.level2_approved_at);
    } catch (err) { alert('❌ Failed'); }
    setDownloading(false);
  };

  const handleDownloadPreviewPDF = async () => {
    setDownloading(true);
    try {
      await generatePDFFromHTML(pendingExpenses, currentUser.name, currentUser.office, `DRAFT-${Date.now().toString().slice(-6)}`, new Date().toISOString(), annotatedStatements, getUserReimburseCurrency(currentUser), null, null);
    } catch (err) { alert('❌ Failed'); }
    setDownloading(false);
  };
  const handleSubmitClaim = async () => {
    setLoading(true);
    setSavingStatus('saving');
    
    try {
      const returned = claims.find(c => c.user_id === currentUser.id && c.status === 'changes_requested');
      const workflow = getApprovalWorkflow(currentUser.id, currentUser.office);
      const isSelfSubmit = workflow?.selfSubmit === true;
      
      if (returned) {
        const updateData = { 
          total_amount: reimbursementTotal, 
          item_count: pendingExpenses.length, 
          status: isSelfSubmit ? 'approved' : 'pending_review', 
          approval_level: isSelfSubmit ? 2 : 1, 
          expenses: pendingExpenses,
          annotated_statement: annotatedStatements[0] || null
        };
        if (isSelfSubmit) {
          updateData.level2_approved_by = workflow?.externalApproval || 'Self-Approved';
          updateData.level2_approved_at = new Date().toISOString();
        }
        if (annotatedStatements.length > 0) updateData.annotated_statements = annotatedStatements;
        const result = await supabase.from('claims').update(updateData).eq('id', returned.id);
        if (result.error) throw new Error('Failed to update claim');
      } else {
        const year = new Date().getFullYear();
        const firstName = currentUser.name.trim().split(' ')[0];
        const userClaimsThisYear = claims.filter(c => c.user_id === currentUser.id && new Date(c.created_at).getFullYear() === year);
        const count = userClaimsThisYear.length + 1;
        const claimNumber = `${firstName}-${year}-${String(count).padStart(2, '0')}`;

        const insertData = {
          claim_number: claimNumber, 
          user_id: currentUser.id, 
          user_name: currentUser.name,
          office: userOffice?.name, 
          office_code: currentUser.office,
          currency: getUserReimburseCurrency(currentUser), 
          total_amount: reimbursementTotal, 
          item_count: pendingExpenses.length, 
          status: isSelfSubmit ? 'approved' : 'pending_review', 
          approval_level: isSelfSubmit ? 2 : 1,
          level1_approver: workflow?.level1, 
          level2_approver: workflow?.level2,
          annotated_statement: annotatedStatements[0] || null,
          expenses: pendingExpenses,
          submitted_at: new Date().toISOString()
        };
        if (isSelfSubmit) {
          insertData.level1_approved_by = currentUser.name;
          insertData.level1_approved_at = new Date().toISOString();
          insertData.level2_approved_by = workflow?.externalApproval || 'Self-Approved';
          insertData.level2_approved_at = new Date().toISOString();
        }
        if (annotatedStatements.length > 0) insertData.annotated_statements = annotatedStatements;
        const result = await supabase.from('claims').insert([insertData]);
        if (result.error) throw new Error('Failed to create claim');
      }
      
      // Clear drafts on server
      await supabase.from('user_drafts').update({ 
        expenses: JSON.stringify([]), 
        statements: JSON.stringify([]), 
        annotations: JSON.stringify([]),
        originals: JSON.stringify([]),
        updated_at: new Date().toISOString() 
      }).eq('user_id', currentUser.id);
      
      // Clear local state
      setExpenses([]); 
      setAnnotatedStatements([]); 
      setStatementAnnotations([]); 
      setStatementImages([]);
      setOriginalStatementImages([]);
      setShowPreview(false); // Close preview modal
      
      await loadClaims(); 
      setSavingStatus('saved');
      
      if (isSelfSubmit) alert(`✅ Saved! Please download the PDF and send to ${workflow?.externalApproval || 'Chairman'} for approval.`);
      else alert('✅ Submitted!');
    } catch (err) { 
      console.error('Submit error:', err); 
      alert(`❌ Failed to submit: ${err.message || 'Unknown error'}`);
      setSavingStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (claim) => {
    setLoading(true);
    try {
      const level = claim.approval_level || 1;
      const workflow = SENIOR_STAFF_ROUTING[claim.user_id];
      const isSingleLevel = workflow?.singleLevel === true;
      const externalNote = workflow?.externalApproval;
      
      if (level === 1) {
        if (isSingleLevel) {
          const { error } = await supabase.from('claims').update({ 
            status: 'approved', 
            level1_approved_by: currentUser.name, 
            level1_approved_at: new Date().toISOString(),
            level2_approved_by: externalNote || currentUser.name,
            level2_approved_at: new Date().toISOString()
          }).eq('id', claim.id);
          if (error) throw error;
          await loadClaims();
          setSelectedClaim(null);
          if (externalNote) alert(`✅ Approved! Please download the PDF and email to ${externalNote} for signature.`);
          else alert('✅ Final Approval Complete!');
        } else {
          const { error } = await supabase.from('claims').update({ 
            status: 'pending_level2', 
            approval_level: 2, 
            level1_approved_by: currentUser.name, 
            level1_approved_at: new Date().toISOString() 
          }).eq('id', claim.id);
          if (error) throw error;
          await loadClaims();
          setSelectedClaim(null);
          alert('✅ Approved → Sent to Level 2 reviewer');
        }
      } else {
        const { error } = await supabase.from('claims').update({ 
          status: 'approved', 
          level2_approved_by: currentUser.name, 
          level2_approved_at: new Date().toISOString() 
        }).eq('id', claim.id);
        if (error) throw error;
        await loadClaims();
        setSelectedClaim(null);
        alert('✅ Final Approval Complete!');
      }
    } catch (err) { console.error('Approve error:', err); alert('❌ Failed to approve. Please try again.'); }
    setLoading(false);
  };

  const handleReject = async (id) => { 
    setLoading(true);
    try {
      const { error } = await supabase.from('claims').update({ 
        status: 'changes_requested', 
        admin_comment: 'Rejected - Please review and resubmit with corrections.',
        reviewed_by: currentUser.name,
        approval_level: 1
      }).eq('id', id);
      if (error) throw error;
      await loadClaims(); 
      setSelectedClaim(null);
      alert('📤 Sent back to employee for revisions');
    } catch (err) { console.error('Reject error:', err); alert('❌ Failed. Please try again.'); }
    setLoading(false);
  };

  const handleRequestChanges = async (claimId, comment) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('claims').update({ 
        status: 'changes_requested', 
        admin_comment: comment, 
        reviewed_by: currentUser.name,
        approval_level: 1
      }).eq('id', claimId);
      if (error) throw error;
      await loadClaims(); 
      setSelectedClaim(null); 
      setShowRequestChanges(false); 
      setChangeRequestComment('');
      alert('📤 Sent back to employee');
    } catch (err) { console.error('Request changes error:', err); alert('❌ Failed. Please try again.'); }
    setLoading(false);
  };

  const handleSaveAdminEdits = async (claim, editedExpenses) => {
    setLoading(true);
    try {
      const newTotal = editedExpenses.reduce((sum, e) => sum + parseFloat(e.reimbursementAmount || e.amount || 0), 0);
      const { error } = await supabase.from('claims').update({ 
        expenses: editedExpenses, 
        total_amount: newTotal, 
        edited_by: currentUser.name 
      }).eq('id', claim.id);
      if (error) throw error;
      await loadClaims();
      setSelectedClaim(prev => prev ? { ...prev, expenses: editedExpenses, total_amount: newTotal, edited_by: currentUser.name } : null);
      setEditingClaim(null);
      alert('✅ Changes saved');
    } catch (err) { console.error('Save error:', err); alert('❌ Failed to save'); }
    setLoading(false);
  };

  const handleMarkSubmitted = async (claimId) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('claims').update({ 
        status: 'submitted_to_finance',
        submitted_to_finance_by: currentUser.name,
        submitted_to_finance_at: new Date().toISOString()
      }).eq('id', claimId);
      if (error) throw error;
      await loadClaims();
      alert('✅ Marked as submitted');
    } catch (err) { console.error('Mark submitted error:', err); alert('❌ Failed'); }
    setLoading(false);
  };

  const getClaimsForSubmission = () => {
    if (!currentUser) return [];
    return claims.filter(c => c.status === 'approved' && c.level1_approver === currentUser.id);
  };

  // --- UI RENDER ---
  if (!currentUser) {
    const handleSelectEmployee = (e) => { const user = EMPLOYEES.find(emp => emp.id === parseInt(e.target.value)); if (user) { setSelectedEmployee(user); setLoginStep('password'); setLoginError(''); setPasswordInput(''); } };
    const handleLogin = () => { 
      if (passwordInput === selectedEmployee.password) { 
        setCurrentUser(selectedEmployee);
        localStorage.setItem('berkeley_current_user', JSON.stringify(selectedEmployee));
        setLoginStep('select'); setSelectedEmployee(null); setPasswordInput(''); setLoginError(''); 
      } else { setLoginError('Incorrect password.'); } 
    };
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8"><h1 className="text-2xl font-bold text-slate-800">Berkeley Expenses</h1><p className="text-slate-500 text-sm mt-2">{loginStep === 'select' ? 'Select your name' : `Welcome, ${selectedEmployee?.name.split(' ')[0]}`}</p></div>
          {loginStep === 'select' && (
            <select className="w-full p-4 border-2 border-slate-200 rounded-xl text-base focus:border-blue-500 outline-none bg-white" onChange={handleSelectEmployee} defaultValue="">
              <option value="" disabled>-- Select your name --</option>
              {OFFICES.map(office => { const emps = EMPLOYEES.filter(e => e.office === office.code).sort((a,b) => a.name.localeCompare(b.name)); if (!emps.length) return null; return (<optgroup key={office.code} label={`📍 ${office.name} (${office.currency})`}>{emps.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}</optgroup>); })}
            </select>
          )}
          {loginStep === 'password' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4"><p className="text-sm text-blue-800"><strong>{selectedEmployee?.name}</strong><br/><span className="text-blue-600">{getUserOffice(selectedEmployee)?.name} • {selectedEmployee?.reimburseCurrency}</span></p></div>
              <input type="password" className="w-full p-4 border-2 border-slate-200 rounded-xl text-lg focus:border-blue-500 outline-none" placeholder="Enter password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleLogin()} autoFocus />
              {loginError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">⚠️ {loginError}</div>}
              <div className="flex gap-3 pt-2"><button onClick={() => { setLoginStep('select'); setSelectedEmployee(null); }} className="flex-1 py-3 rounded-xl border-2 border-slate-300 font-semibold text-slate-600">← Back</button><button onClick={handleLogin} className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg">Login 🔐</button></div>
            </div>
          )}
          <p className="text-center text-xs text-slate-400 mt-8">v4.3 (Aggressive Dup Check)</p>
        </div>
      </div>
    );
  }

  const AddExpenseModal = ({ editExpense = null, existingClaims = [], expenses = [], onClose }) => {
    const [step, setStep] = useState(editExpense ? 2 : 1);
    const [receiptPreview, setReceiptPreview] = useState(editExpense?.receiptPreview || null);
    const [receiptPreview2, setReceiptPreview2] = useState(editExpense?.receiptPreview2 || null);
    const [showFullImage, setShowFullImage] = useState(null);
    const userReimburseCurrency = getUserReimburseCurrency(currentUser);
    const [formData, setFormData] = useState(editExpense ? { merchant: editExpense.merchant || '', amount: editExpense.amount || '', currency: editExpense.currency || userOffice?.currency || 'SGD', date: editExpense.date || new Date().toISOString().split('T')[0], category: editExpense.category || 'C', subcategory: editExpense.subcategory || 'Taxis', description: editExpense.description || '', attendees: editExpense.attendees || '', numberOfPax: editExpense.numberOfPax || '', reimbursementAmount: editExpense.reimbursementAmount || '', hasBackcharge: editExpense.hasBackcharge || false, backcharges: editExpense.backcharges || [] } : { merchant: '', amount: '', currency: userOffice?.currency || 'SGD', date: new Date().toISOString().split('T')[0], category: 'C', subcategory: 'Taxis', description: '', attendees: '', numberOfPax: '', reimbursementAmount: '', hasBackcharge: false, backcharges: [] });
    const isForeignCurrency = formData.currency !== userReimburseCurrency;
    const isCNY = formData.currency === 'CNY';
    const [duplicateWarning, setDuplicateWarning] = useState(null);

    // Calculate forex rate from entered amounts
    const calculatedRate = isForeignCurrency && formData.amount && formData.reimbursementAmount 
      ? calculateForexRate(formData.amount, formData.reimbursementAmount) 
      : null;

    // Duplicate Check Effect (Scans Drafts AND History)
    useEffect(() => {
        if (!formData.amount || !formData.date || !formData.currency) return;
        
        // 1. Scan Past Claims (History)
        const foundInHistory = existingClaims.flatMap(c => c.expenses || []).find(e => 
            e.amount === parseFloat(formData.amount) && 
            e.date === formData.date && 
            e.currency === formData.currency &&
            e.id !== editExpense?.id
        );

        // 2. Scan Current Drafts (Pending)
        const foundInDrafts = expenses.filter(e => e.id !== editExpense?.id).find(e => 
            parseFloat(e.amount) === parseFloat(formData.amount) && 
            e.date === formData.date && 
            e.currency === formData.currency
        );

        if (foundInHistory || foundInDrafts) {
            setDuplicateWarning(`⚠️ Possible Duplicate: Found matching amount/date in ${foundInHistory ? 'History' : 'Current Drafts'}.`);
        } else {
            setDuplicateWarning(null);
        }
    }, [formData.amount, formData.date, formData.currency, existingClaims, expenses, editExpense]);

    const handleFileChange = (e, isSecond = false) => { 
      const file = e.target.files?.[0]; 
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => { 
        if (isSecond) setReceiptPreview2(event.target.result); 
        else { setReceiptPreview(event.target.result); setStep(2); }
      };
      reader.readAsDataURL(file);
    };
    const addBackcharge = () => setFormData(prev => ({ ...prev, backcharges: [...prev.backcharges, { development: '', percentage: '' }] }));
    const updateBackcharge = (idx, field, value) => setFormData(prev => ({ ...prev, backcharges: prev.backcharges.map((bc, i) => i === idx ? { ...bc, [field]: value } : bc) }));
    const removeBackcharge = (idx) => setFormData(prev => ({ ...prev, backcharges: prev.backcharges.filter((_, i) => i !== idx) }));
    const backchargeTotal = formData.backcharges.reduce((sum, bc) => sum + (parseFloat(bc.percentage) || 0), 0);
    const backchargeValid = !formData.hasBackcharge || (formData.backcharges.length > 0 && backchargeTotal >= 99.5 && backchargeTotal <= 100.5);
    
    // Check if this expense type needs attendees - exclude gifts
    const isGift = EXPENSE_CATEGORIES[formData.category]?.giftSubcategories?.includes(formData.subcategory);
    const needsAttendees = EXPENSE_CATEGORIES[formData.category]?.requiresAttendees && !isGift;
    const paxCount = parseInt(formData.numberOfPax) || 0;
    const attendeeLines = formData.attendees ? formData.attendees.split('\n').filter(line => line.trim().length > 0) : [];
    const attendeeCount = attendeeLines.length;
    const attendeePaxMatch = !needsAttendees || (paxCount > 0 && paxCount === attendeeCount);

    const handleSave = async () => {
      // BLOCKER POPUP logic
      if (duplicateWarning) {
        const confirmSave = window.confirm("⚠️ DUPLICATE DETECTED\n\nWe found another expense with the same Date, Amount, and Currency.\n\nAre you sure you want to save this?");
        if (!confirmSave) return;
      }

      try {
        const forexRate = isForeignCurrency ? calculatedRate : null;
        
        let newExpenses;
        if (editExpense) { 
          newExpenses = expenses.map(e => e.id === editExpense.id ? { ...e, ...formData, amount: parseFloat(formData.amount), reimbursementAmount: isForeignCurrency ? parseFloat(formData.reimbursementAmount) : parseFloat(formData.amount), receiptPreview: receiptPreview || e.receiptPreview, receiptPreview2: receiptPreview2 || e.receiptPreview2, isForeignCurrency, isPotentialDuplicate: !!duplicateWarning, forexRate, updatedAt: new Date().toISOString() } : e);
          newExpenses = sortAndReassignRefs(newExpenses);
          setExpenses(newExpenses);
        } else { 
          const newExpense = { id: Date.now(), ref: 'temp', ...formData, amount: parseFloat(formData.amount) || 0, reimbursementAmount: isForeignCurrency ? (parseFloat(formData.reimbursementAmount) || 0) : (parseFloat(formData.amount) || 0), receiptPreview: receiptPreview || null, receiptPreview2: receiptPreview2 || null, status: 'draft', isForeignCurrency: isForeignCurrency || false, isOld: isOlderThan2Months(formData.date), createdAt: new Date().toISOString(), isPotentialDuplicate: !!duplicateWarning, forexRate };
          newExpenses = sortAndReassignRefs([...expenses, newExpense]);
          setExpenses(newExpenses);
        }
        
        // IMMEDIATELY save to server
        await saveToServer(newExpenses, annotatedStatements, statementAnnotations, originalStatementImages);
        
        onClose();
      } catch (err) { 
        console.error('Save error:', err);
        alert('❌ Error saving expense. Please try again.'); 
      }
    };
    
    const canSave = formData.merchant && formData.amount && formData.date && formData.description && (!needsAttendees || (formData.attendees && formData.numberOfPax)) && (!isForeignCurrency || formData.reimbursementAmount) && backchargeValid && attendeePaxMatch;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 flex justify-between items-center"><div><h2 className="text-lg font-bold">{editExpense ? '✏️ Edit' : '📸 Add'} Expense</h2><p className="text-blue-100 text-sm">Reimburse in {userReimburseCurrency}</p></div><button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20">✕</button></div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {step === 1 && (<div className="space-y-3"><label className="block border-3 border-dashed border-blue-400 bg-blue-50 rounded-2xl p-6 text-center cursor-pointer hover:border-blue-500"><input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, false)} className="hidden" /><div className="text-4xl mb-2">📷</div><p className="font-semibold text-blue-700">Take Photo</p><p className="text-xs text-slate-500">Open camera</p></label><label className="block border-3 border-dashed border-green-400 bg-green-50 rounded-2xl p-6 text-center cursor-pointer hover:border-green-500"><input type="file" accept="image/*" onChange={(e) => handleFileChange(e, false)} className="hidden" /><div className="text-4xl mb-2">🖼️</div><p className="font-semibold text-green-700">Choose from Gallery</p><p className="text-xs text-slate-500">Select existing photo</p></label></div>)}
            {step === 2 && (
              <div className="space-y-4">
                {duplicateWarning && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 text-sm font-bold animate-pulse">{duplicateWarning}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs font-semibold text-slate-500 mb-1">Receipt 1 {isCNY && '(发票)'}</p>{receiptPreview ? (<div className="relative"><img src={receiptPreview} alt="Receipt" className="w-full h-28 object-cover bg-slate-100 rounded-lg cursor-pointer" onClick={() => setShowFullImage(receiptPreview)} /><button onClick={() => setReceiptPreview(null)} className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full text-xs">✕</button></div>) : (<label className="block border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400"><input type="file" accept="image/*" onChange={(e) => handleFileChange(e, false)} className="hidden" /><span className="text-2xl">📷</span></label>)}</div>
                  <div><p className="text-xs font-semibold text-slate-500 mb-1">Receipt 2 {isCNY && '(小票)'} <span className="text-slate-400">Optional</span></p>{receiptPreview2 ? (<div className="relative"><img src={receiptPreview2} alt="Receipt 2" className="w-full h-28 object-cover bg-slate-100 rounded-lg cursor-pointer" onClick={() => setShowFullImage(receiptPreview2)} /><button onClick={() => setReceiptPreview2(null)} className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full text-xs">✕</button></div>) : (<label className="block border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400"><input type="file" accept="image/*" onChange={(e) => handleFileChange(e, true)} className="hidden" /><span className="text-2xl">➕</span></label>)}</div>
                </div>
                <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Merchant *</label><input type="text" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none" value={formData.merchant} onChange={e => setFormData(prev => ({ ...prev, merchant: e.target.value }))} /></div>
                <div className="bg-slate-50 rounded-xl p-4 space-y-3"><p className="text-xs font-semibold text-slate-600 uppercase">💵 Original Expense</p><div className="grid grid-cols-2 gap-4"><input type="number" step="0.01" className="p-3 border-2 border-slate-200 rounded-xl" placeholder="Amount" value={formData.amount} onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))} /><select className="p-3 border-2 border-slate-200 rounded-xl bg-white" value={formData.currency} onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div></div>
                {isForeignCurrency && (<div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
                  <p className="text-sm font-bold text-amber-800 mb-2">💳 Credit Card Statement Amount</p>
                  <p className="text-xs text-amber-600 mb-2">Enter the {userReimburseCurrency} amount shown on your card statement</p>
                  <input type="number" step="0.01" className="w-full p-3 border-2 border-amber-300 rounded-xl bg-white" placeholder={`Amount in ${userReimburseCurrency}`} value={formData.reimbursementAmount} onChange={e => setFormData(prev => ({ ...prev, reimbursementAmount: e.target.value }))} />
                  
                  {/* Forex Rate Display */}
                  {calculatedRate && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-amber-200">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-600">Exchange Rate:</span>
                        <span className="font-bold text-slate-800">1 {formData.currency} = {calculatedRate.toFixed(4)} {userReimburseCurrency}</span>
                      </div>
                    </div>
                  )}
                </div>)}
                <div className="grid grid-cols-2 gap-4"><input type="date" className="p-3 border-2 border-slate-200 rounded-xl" value={formData.date} onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))} /><select className="p-3 border-2 border-slate-200 rounded-xl bg-white" value={formData.category} onChange={e => setFormData(prev => ({ ...prev, category: e.target.value, subcategory: EXPENSE_CATEGORIES[e.target.value].subcategories[0] }))}>{Object.entries(EXPENSE_CATEGORIES).map(([key, val]) => <option key={key} value={key}>{val.icon} {key}. {val.name}</option>)}</select></div>
                <select className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white" value={formData.subcategory} onChange={e => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}>{EXPENSE_CATEGORIES[formData.category].subcategories.map(sub => <option key={sub} value={sub}>{sub}</option>)}</select>
                <input type="text" className="w-full p-3 border-2 border-slate-200 rounded-xl" placeholder="Description *" value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} />
                {needsAttendees && (
                  <div className="space-y-3">
                    <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Number of Pax *</label><input type="number" min="1" className="w-full p-3 border-2 border-slate-200 rounded-xl" placeholder="e.g. 4" value={formData.numberOfPax} onChange={e => setFormData(prev => ({ ...prev, numberOfPax: e.target.value }))} /></div>
                    <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Attendees *</label><textarea className="w-full p-3 border-2 border-slate-200 rounded-xl resize-none" rows={3} placeholder="Enter each attendee on a new line:&#10;John Smith - Berkeley&#10;Jane Doe - ABC Corp" value={formData.attendees} onChange={e => setFormData(prev => ({ ...prev, attendees: e.target.value }))} /></div>
                    <div className={`text-xs font-bold text-center p-2 rounded ${attendeePaxMatch ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {attendeePaxMatch ? `✅ Pax Check Passed (${paxCount} pax = ${attendeeCount} names)` : `⚠️ Pax Mismatch: ${paxCount} pax indicated vs ${attendeeCount} names listed`}
                    </div>
                  </div>
                )}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <label className="flex items-center gap-2 cursor-pointer mb-3"><input type="checkbox" checked={formData.hasBackcharge} onChange={e => setFormData(prev => ({ ...prev, hasBackcharge: e.target.checked, backcharges: e.target.checked ? prev.backcharges : [] }))} className="w-5 h-5" /><span className="font-semibold text-blue-800">📊 Backcharge to Development(s)</span></label>
                  {formData.hasBackcharge && (<div className="space-y-3">{formData.backcharges.map((bc, idx) => (<div key={idx} className="flex gap-2 items-center"><select className="flex-1 p-2 border rounded-lg text-sm bg-white" value={bc.development} onChange={e => updateBackcharge(idx, 'development', e.target.value)}><option value="">Select development</option>{DEVELOPMENTS.map(dev => <option key={dev} value={dev}>{dev}</option>)}</select><input type="number" step="0.1" className="w-20 p-2 border rounded-lg text-center text-sm" placeholder="%" value={bc.percentage} onChange={e => updateBackcharge(idx, 'percentage', e.target.value)} /><span className="text-sm">%</span><button onClick={() => removeBackcharge(idx)} className="text-red-500 p-1">✕</button></div>))}<button onClick={addBackcharge} className="text-blue-600 text-sm font-medium">+ Add Development</button>
                    <div className={`text-xs font-bold text-center p-2 rounded ${backchargeValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {backchargeValid ? `✅ Total: ${backchargeTotal.toFixed(1)}%` : `⚠️ Total must be 100% (Current: ${backchargeTotal.toFixed(1)}%)`}
                    </div>
                  </div>)}
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t bg-slate-50">{step === 2 && (<div className="flex gap-3">{!editExpense && <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border-2 border-slate-300 font-semibold">← Back</button>}<button onClick={handleSave} disabled={!canSave} className={`${editExpense ? 'w-full' : 'flex-[2]'} py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50`}>{editExpense ? '💾 Save' : 'Save ✓'}</button></div>)}</div>
        </div>
        {showFullImage && <ImageViewer src={showFullImage} onClose={() => setShowFullImage(null)} />}
      </div>
    );
  };
  
  const PreviewClaimModal = () => {
    const userReimburseCurrency = getUserReimburseCurrency(currentUser);
    const groupedExpenses = pendingExpenses.reduce((acc, exp) => { if (!acc[exp.category]) acc[exp.category] = []; acc[exp.category].push(exp); return acc; }, {});
    const getCategoryTotal = (cat) => (groupedExpenses[cat] || []).reduce((sum, e) => sum + parseFloat(e.reimbursementAmount || e.amount || 0), 0);
    const workflow = getApprovalWorkflow(currentUser.id, currentUser.office);
    const [viewImg, setViewImg] = useState(null);
    const untaggedExpenses = foreignCurrencyExpenses.filter(e => !statementAnnotations.some(a => a.ref === e.ref));
    // Can submit only if: no foreign currency OR (has statement AND no untagged expenses)
    const canSubmit = !hasForeignCurrency || (hasForeignCurrency && annotatedStatements.length > 0 && untaggedExpenses.length === 0);
    const submitButtonText = loading ? '⏳...' : !hasForeignCurrency ? 'Submit ✓' : annotatedStatements.length === 0 ? '⚠️ Upload Statement' : untaggedExpenses.length > 0 ? `⚠️ ${untaggedExpenses.length} Untagged` : 'Submit ✓';
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 flex justify-between items-center shrink-0"><div><h2 className="text-lg font-bold">📋 Preview</h2><p className="text-blue-200 text-sm">{userReimburseCurrency}</p></div><div className="flex items-center gap-2"><button onClick={handleDownloadPreviewPDF} disabled={downloading} className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold text-sm">📥 PDF</button><button onClick={() => setShowPreview(false)} className="w-8 h-8 rounded-full bg-white/20">✕</button></div></div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto border-2 border-slate-300 rounded-xl p-6">
              <div className="text-center mb-6"><h1 className="text-xl font-bold">Motor & Expense Claim Form</h1><p className="text-sm text-slate-500">{getCompanyName(currentUser.office)}</p></div>
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm"><div><span className="text-slate-500">Name:</span> <strong>{currentUser.name}</strong></div><div><span className="text-slate-500">Currency:</span> <strong className="text-green-700">{userReimburseCurrency}</strong></div></div>
              {workflow && (<div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm"><p className="font-semibold text-blue-800">Approval: {workflow.selfSubmit ? `Direct Save → ${workflow.externalApproval || 'External'}` : workflow.singleLevel ? (workflow.externalApproval ? `${workflow.level1Name} → ${workflow.externalApproval}` : `${workflow.level1Name} (Final)`) : `${workflow.level1Name} → ${workflow.level2Name}`}</p></div>)}
              <table className="w-full text-sm"><tbody>{Object.keys(EXPENSE_CATEGORIES).map(cat => (<tr key={cat} className="border-b"><td className="py-2 font-bold text-blue-700 w-8">{cat}.</td><td className="py-2">{EXPENSE_CATEGORIES[cat].name}</td><td className="py-2 text-right font-medium">{userReimburseCurrency} {getCategoryTotal(cat).toFixed(2)}</td></tr>))}</tbody></table>
              <div className="bg-blue-50 p-4 rounded-xl mt-4 flex justify-between items-center"><span className="font-bold text-lg">Total</span><span className="font-bold text-2xl text-blue-700">{formatCurrency(reimbursementTotal, userReimburseCurrency)}</span></div>
              <h3 className="font-bold mt-6 mb-3">Receipts ({pendingExpenses.length})</h3>
              <div className="grid grid-cols-3 gap-3">{pendingExpenses.map(exp => (<div key={exp.id} className="border rounded-lg overflow-hidden"><div className="bg-blue-100 p-1 flex justify-between text-xs"><span className="font-bold text-blue-700">{exp.ref}</span><div className="flex gap-1">{exp.isForeignCurrency && <span>💳</span>}{exp.receiptPreview2 && <span>📑</span>}</div></div>{exp.receiptPreview ? (<img src={exp.receiptPreview} alt={exp.ref} className="w-full h-16 object-cover cursor-pointer" onClick={() => setViewImg(exp.receiptPreview)} />) : (<div className="w-full h-16 bg-slate-100 flex items-center justify-center">📄</div>)}<div className="p-1 bg-slate-50 text-xs"><p className="truncate">{exp.merchant}</p><p className="text-green-700 font-bold">{formatCurrency(exp.reimbursementAmount || exp.amount, userReimburseCurrency)}</p></div></div>))}</div>
              {hasForeignCurrency && annotatedStatements.length === 0 && (<div className="mt-4 bg-red-50 border-2 border-red-300 rounded-xl p-4"><p className="text-red-800 font-bold">❌ Statement(s) Required</p><button onClick={() => { setShowPreview(false); setShowStatementUpload(true); }} className="mt-2 bg-amber-500 text-white px-4 py-2 rounded-lg font-semibold text-sm">📎 Upload Statements</button></div>)}
              {annotatedStatements.length > 0 && (<div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4"><div className="flex justify-between items-start"><p className="text-green-800 font-semibold">✅ {annotatedStatements.length} Statement(s) Annotated</p><div className="flex gap-2"><button onClick={() => { 
                // Use original images but keep existing annotations (positions now stored as %)
                setStatementImages([...originalStatementImages]); 
                setCurrentStatementIndex(0); 
                setShowPreview(false); 
                setShowStatementAnnotator(true); 
              }} className="text-purple-600 text-sm font-semibold" disabled={originalStatementImages.length === 0}>✏️ Edit Tags</button><button onClick={() => { setShowPreview(false); setShowStatementUpload(true); }} className="text-blue-600 text-sm">➕ Add Statement</button></div></div><div className="flex gap-2 mt-2 overflow-x-auto">{annotatedStatements.map((img, idx) => (<img key={idx} src={img} alt={`Statement ${idx+1}`} className="h-20 rounded cursor-pointer border-2 border-green-300" onClick={() => setViewImg(img)} />))}</div>{untaggedExpenses.length > 0 && (<div className="mt-2 bg-amber-100 border border-amber-300 rounded-lg p-2"><p className="text-amber-800 text-sm">⚠️ Untagged: {untaggedExpenses.map(e => e.ref).join(', ')}</p></div>)}</div>)}
            </div>
          </div>
          <div className="p-4 border-t bg-slate-50 flex gap-3 shrink-0"><button onClick={() => setShowPreview(false)} className="flex-1 py-3 rounded-xl border-2 font-semibold">← Back</button><button onClick={handleSubmitClaim} disabled={!canSubmit || loading} className={`flex-[2] py-3 rounded-xl font-semibold ${canSubmit && !loading ? 'bg-green-600 text-white' : 'bg-slate-300 text-slate-500'}`}>{submitButtonText}</button></div>
        </div>
        {viewImg && <ImageViewer src={viewImg} onClose={() => setViewImg(null)} />}
      </div>
    );
  };

  const EditClaimModal = ({ claim, onClose }) => {
    const [editedExpenses, setEditedExpenses] = useState(claim.expenses || []);
    const [newComments, setNewComments] = useState({}); // Track new comments per expense index
    const [saving, setSaving] = useState(false);
    const reviewerFirstName = currentUser.name.split(' ')[0];
    
    const updateExpense = (idx, field, value) => setEditedExpenses(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
    const updateNewComment = (idx, value) => setNewComments(prev => ({ ...prev, [idx]: value }));
    
    const handleSaveEdits = async () => { 
      setSaving(true);
      
      // Append new comments with reviewer name to adminNotes
      const expensesWithComments = editedExpenses.map((exp, idx) => {
        const newComment = newComments[idx]?.trim();
        if (newComment) {
          const commentWithName = `${reviewerFirstName}: ${newComment}`;
          const existingNotes = exp.adminNotes || '';
          const updatedNotes = existingNotes 
            ? `${existingNotes}\n${commentWithName}` 
            : commentWithName;
          return { ...exp, adminNotes: updatedNotes };
        }
        return exp;
      });
      
      await handleSaveAdminEdits(claim, expensesWithComments);
      setSaving(false); 
      onClose(); 
    };
    
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="bg-purple-600 text-white p-5 flex justify-between"><h2 className="font-bold">✏️ Edit: {claim.user_name}</h2><button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20">✕</button></div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">{editedExpenses.map((exp, idx) => (<div key={idx} className={`border-2 rounded-xl p-4 mb-4 ${exp.isPotentialDuplicate ? 'border-red-400 bg-red-50' : ''}`}>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-lg">{exp.ref}</span>
              {exp.isPotentialDuplicate && <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded font-semibold">⚠️ Potential Duplicate</span>}
              {exp.numberOfPax && <span className="bg-purple-100 text-purple-600 text-xs px-2 py-1 rounded">👥 {exp.numberOfPax} pax</span>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input className="p-2 border rounded-lg text-sm" placeholder="Merchant" value={exp.merchant} onChange={e => updateExpense(idx, 'merchant', e.target.value)} />
              <input type="number" className="p-2 border rounded-lg text-sm" placeholder="Amount" value={exp.reimbursementAmount || exp.amount} onChange={e => updateExpense(idx, 'reimbursementAmount', parseFloat(e.target.value))} />
              <input className="p-2 border rounded-lg text-sm col-span-2" placeholder="Description" value={exp.description} onChange={e => updateExpense(idx, 'description', e.target.value)} />
              {exp.attendees && <div className="col-span-2 bg-slate-50 p-2 rounded-lg text-xs text-slate-600">👥 {exp.attendees.replace(/\n/g, ', ')}</div>}
              {exp.adminNotes && (
                <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  <p className="text-xs font-semibold text-amber-700 mb-1">📝 Previous Comments:</p>
                  <p className="text-sm text-amber-800 whitespace-pre-line">{exp.adminNotes}</p>
                </div>
              )}
              <div className="col-span-2 flex gap-2 items-center">
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">{reviewerFirstName}:</span>
                <input 
                  className="flex-1 p-2 border-2 border-amber-300 bg-amber-50 rounded-lg text-sm" 
                  placeholder="Add comment..." 
                  value={newComments[idx] || ''} 
                  onChange={e => updateNewComment(idx, e.target.value)} 
                />
              </div>
            </div>
          </div>))}</div>
          <div className="p-4 border-t flex gap-3"><button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 font-semibold">Cancel</button><button onClick={handleSaveEdits} disabled={saving} className="flex-[2] py-3 rounded-xl bg-purple-600 text-white font-semibold disabled:opacity-50">{saving ? '⏳' : '💾 Save Changes'}</button></div>
        </div>
      </div>
    );
  };
  const MyExpensesTab = () => {
    const myClaims = claims.filter(c => c.user_id === currentUser.id);
    const returnedClaims = myClaims.filter(c => c.status === 'changes_requested');
    const userReimburseCurrency = getUserReimburseCurrency(currentUser);
    const groupedExpenses = pendingExpenses.reduce((acc, exp) => { if (!acc[exp.category]) acc[exp.category] = []; acc[exp.category].push(exp); return acc; }, {});
    return (
      <div className="space-y-4">
        {returnedClaims.length > 0 && (<div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4"><h3 className="font-bold text-amber-800 mb-2">⚠️ Changes Requested</h3>{returnedClaims.map(claim => (<div key={claim.id} className="bg-white rounded-lg p-3 mb-2"><p className="font-semibold">{claim.claim_number}</p><p className="text-sm text-amber-700">"{claim.admin_comment}"</p></div>))}</div>)}
        <div className="grid grid-cols-2 gap-4"><div className="bg-white rounded-2xl shadow-lg p-6 text-center"><div className="text-4xl font-bold text-slate-800">{pendingExpenses.length}</div><div className="text-sm text-slate-500">Pending</div></div><div className="bg-white rounded-2xl shadow-lg p-6 text-center"><div className="text-2xl font-bold text-green-600">{formatCurrency(reimbursementTotal, userReimburseCurrency)}</div><div className="text-sm text-slate-500">To Reimburse</div></div></div>
        <div className="bg-white rounded-2xl shadow-lg p-6"><div className="flex flex-wrap gap-3"><button onClick={() => setShowAddExpense(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg">📸 Add Receipt</button>{pendingExpenses.length > 0 && (<button onClick={() => setShowPreview(true)} className="border-2 border-green-500 text-green-600 px-6 py-3 rounded-xl font-semibold">📋 Preview ({pendingExpenses.length})</button>)}<button onClick={handleManualSync} disabled={loading} className="border-2 border-slate-300 text-slate-600 px-4 py-3 rounded-xl font-semibold">{loading ? '⏳' : '🔄'} Sync</button></div></div>
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-800 mb-4">📋 Pending</h3>
          {pendingExpenses.length === 0 ? (<div className="text-center py-12 text-slate-400">📭 No pending</div>) : (
            <div className="space-y-2">{Object.entries(groupedExpenses).sort().map(([cat, exps]) => (<div key={cat}><p className="text-xs font-semibold text-slate-500 mb-2">{EXPENSE_CATEGORIES[cat]?.icon} {cat}. {EXPENSE_CATEGORIES[cat]?.name}</p>{exps.map(exp => (<div key={exp.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border mb-2"><div className="flex-1"><div className="flex items-center gap-2 flex-wrap"><span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">{exp.ref}</span><span className="font-semibold text-sm">{exp.merchant}</span>{exp.isForeignCurrency && <span className="text-amber-600 text-xs">💳</span>}{exp.receiptPreview2 && <span className="text-slate-500 text-xs">📑</span>}</div><p className="text-xs text-slate-500 mt-1">{exp.description}</p>{exp.isForeignCurrency && exp.forexRate && <p className="text-xs text-amber-600 mt-0.5">💱 {exp.currency} → {userReimburseCurrency} @ {exp.forexRate.toFixed(4)}</p>}</div><div className="flex items-center gap-2"><span className="font-bold text-green-700">{formatCurrency(exp.reimbursementAmount || exp.amount, userReimburseCurrency)}</span><button onClick={() => setEditingExpense(exp)} className="text-blue-500 p-2">✏️</button><button onClick={() => handleDeleteExpense(exp.id)} className="text-red-500 p-2">🗑️</button></div></div>))}</div>))}</div>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-800 mb-4">📁 My Claims</h3>
          {myClaims.filter(c => c.status !== 'changes_requested').length === 0 ? <p className="text-center text-slate-400 py-8">None</p> : (<div className="space-y-2">{myClaims.filter(c => c.status !== 'changes_requested').map(claim => (<div key={claim.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border"><div><span className="font-semibold">{claim.claim_number}</span><span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${claim.status === 'approved' ? 'bg-green-100 text-green-700' : claim.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{getClaimStatusText(claim)}</span></div><div className="flex items-center gap-3"><span className="font-bold">{formatCurrency(claim.total_amount, claim.currency)}</span><button onClick={() => handleDownloadPDF(claim)} className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm">📥</button></div></div>))}</div>)}
        </div>
      </div>
    );
  };

  const ReviewClaimsTab = () => {
    const reviewableClaims = getReviewableClaims();
    const claimsForSubmission = getClaimsForSubmission();
    const getBackchargeReport = () => {
      if (!backchargeFromDate || !backchargeToDate) return null;
      const fromDate = new Date(backchargeFromDate);
      const toDate = new Date(backchargeToDate);
      toDate.setHours(23, 59, 59, 999);
      const officeApprovedClaims = claims.filter(c => {
        if (c.status !== 'approved' && c.status !== 'submitted_to_finance') return false;
        if (c.office_code !== currentUser.office) return false;
        const approvedDate = c.level2_approved_at ? new Date(c.level2_approved_at) : null;
        if (!approvedDate) return false;
        return approvedDate >= fromDate && approvedDate <= toDate;
      });
      const backchargeSummary = {};
      let grandTotal = 0;
      officeApprovedClaims.forEach(claim => {
        const expenses = claim.expenses || [];
        expenses.forEach(exp => {
          if (exp.hasBackcharge && exp.backcharges?.length > 0) {
            const expAmount = parseFloat(exp.reimbursementAmount || exp.amount) || 0;
            exp.backcharges.forEach(bc => {
              const dev = bc.development;
              const pct = parseFloat(bc.percentage) || 0;
              const amt = (expAmount * pct / 100);
              if (!backchargeSummary[dev]) { backchargeSummary[dev] = { total: 0, items: [] }; }
              backchargeSummary[dev].total += amt;
              backchargeSummary[dev].items.push({ claimNumber: claim.claim_number, claimant: claim.user_name, ref: exp.ref, merchant: exp.merchant, date: exp.date, approvedDate: claim.level2_approved_at, amount: amt, percentage: pct });
              grandTotal += amt;
            });
          }
        });
      });
      return { summary: backchargeSummary, grandTotal, claimCount: officeApprovedClaims.length };
    };
    const backchargeData = showBackchargeReport ? getBackchargeReport() : null;
    const generateBackchargeReportPDF = () => {
      if (!backchargeData) return;
      const { summary, grandTotal } = backchargeData;
      const office = OFFICES.find(o => o.code === currentUser.office);
      const currency = office?.currency || 'SGD';
      const printWindow = window.open('', '_blank');
      const html = `<!DOCTYPE html><html><head><title>Backcharge Report - ${office?.name}</title><style>body{font-family:Arial,sans-serif;font-size:11px;padding:20mm;}h1{text-align:center;color:#9c27b0;margin-bottom:5px;}.subtitle{text-align:center;color:#666;margin-bottom:20px;}table{width:100%;border-collapse:collapse;margin-top:15px;}th,td{border:1px solid #999;padding:6px;text-align:left;}th{background:#e1bee7;font-weight:bold;}.dev-header{background:#9c27b0;color:white;font-weight:bold;}.subtotal{background:#f3e5f5;font-weight:bold;}.grand-total{background:#9c27b0;color:white;font-weight:bold;font-size:12px;}.amount{text-align:right;}@media print{body{padding:10mm;}}</style></head><body><h1>📊 Backcharge Report</h1><div class="subtitle">${office?.name} | ${formatDate(backchargeFromDate)} to ${formatDate(backchargeToDate)}</div><table><thead><tr><th>Development</th><th>Claim #</th><th>Claimant</th><th>Ref</th><th>Merchant</th><th>Date</th><th>%</th><th class="amount">Amount (${currency})</th></tr></thead><tbody>${Object.entries(summary).map(([dev, data]) => `<tr class="dev-header"><td colspan="8">${dev}</td></tr>` + data.items.map(item => `<tr><td></td><td>${item.claimNumber}</td><td>${item.claimant}</td><td>${item.ref}</td><td>${item.merchant}</td><td>${formatShortDate(item.date)}</td><td>${item.percentage}%</td><td class="amount">${item.amount.toFixed(2)}</td></tr>`).join('') + `<tr class="subtotal"><td colspan="7">Subtotal: ${dev}</td><td class="amount">${data.total.toFixed(2)}</td></tr>`).join('')}<tr class="grand-total"><td colspan="7">TOTAL BACKCHARGES</td><td class="amount">${grandTotal.toFixed(2)}</td></tr></tbody></table><script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);};</script></body></html>`;
      printWindow.document.write(html);
      printWindow.document.close();
    };
    const BACKCHARGE_REPORT_ADMINS = [805, 306, 102, 1002, 505];
    const canGenerateBackchargeReport = BACKCHARGE_REPORT_ADMINS.includes(currentUser.id);
    return (
      <div className="space-y-4">
        {canGenerateBackchargeReport && (<div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-purple-300"><h3 className="font-bold mb-4 text-purple-700">📊 Backcharge Report Generator</h3><div className="flex flex-wrap gap-3 items-end mb-4"><div><label className="block text-xs text-slate-500 mb-1">From Date</label><input type="date" value={backchargeFromDate} onChange={(e) => setBackchargeFromDate(e.target.value)} className="border-2 rounded-lg px-3 py-2 text-sm" /></div><div><label className="block text-xs text-slate-500 mb-1">To Date</label><input type="date" value={backchargeToDate} onChange={(e) => setBackchargeToDate(e.target.value)} className="border-2 rounded-lg px-3 py-2 text-sm" /></div><button onClick={() => setShowBackchargeReport(true)} disabled={!backchargeFromDate || !backchargeToDate} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">Generate Report</button></div>{showBackchargeReport && backchargeData && (<div className="border-2 border-purple-200 rounded-xl p-4 bg-purple-50"><div className="flex justify-between items-center mb-3"><h4 className="font-bold text-purple-800">Report: {formatDate(backchargeFromDate)} - {formatDate(backchargeToDate)}</h4><div className="flex gap-2"><button onClick={generateBackchargeReportPDF} className="bg-green-600 text-white px-3 py-1 rounded text-sm">📥 Download PDF</button><button onClick={() => setShowBackchargeReport(false)} className="text-slate-500 text-sm">✕ Close</button></div></div>{Object.keys(backchargeData.summary).length === 0 ? (<p className="text-center text-slate-500 py-4">No backcharges found in this period.</p>) : (<div className="space-y-3">{Object.entries(backchargeData.summary).map(([dev, data]) => (<div key={dev} className="bg-white rounded-lg p-3 border"><div className="flex justify-between items-center"><span className="font-semibold text-purple-700">{dev}</span><span className="font-bold">{formatCurrency(data.total, OFFICES.find(o => o.code === currentUser.office)?.currency || 'SGD')}</span></div><div className="text-xs text-slate-500 mt-1">{data.items.length} expense(s)</div></div>))}<div className="bg-purple-700 text-white rounded-lg p-3 flex justify-between"><span className="font-bold">TOTAL BACKCHARGES</span><span className="font-bold">{formatCurrency(backchargeData.grandTotal, OFFICES.find(o => o.code === currentUser.office)?.currency || 'SGD')}</span></div></div>)}</div>)}</div>)}
        {claimsForSubmission.length > 0 && (<div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-green-300"><h3 className="font-bold mb-4 text-green-700">📤 For Submission ({claimsForSubmission.length})</h3><div className="space-y-2">{claimsForSubmission.map(claim => (<div key={claim.id} className="flex items-center justify-between p-4 rounded-xl bg-green-50 border border-green-200"><div className="flex-1"><div className="flex items-center gap-2"><span className="font-semibold">{claim.user_name}</span><span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Approved</span></div><p className="text-sm text-slate-500">{claim.claim_number} • {claim.office}</p></div><div className="flex items-center gap-2"><span className="font-bold text-green-700">{formatCurrency(claim.total_amount, claim.currency)}</span><button onClick={() => handleDownloadPDF(claim)} className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm">📥</button><button onClick={() => handleMarkSubmitted(claim.id)} disabled={loading} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">✓ Submitted</button></div></div>))}</div></div>)}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold mb-4">📊 To Review ({reviewableClaims.length})</h3>
          {reviewableClaims.length === 0 ? <div className="text-center py-12 text-slate-400">✅ Nothing to review</div> : (<div className="space-y-2">{reviewableClaims.map(claim => (<div key={claim.id} onClick={() => setSelectedClaim(claim)} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border cursor-pointer hover:border-blue-300"><div><span className="font-semibold">{claim.user_name}</span><span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${claim.approval_level === 2 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>L{claim.approval_level || 1}</span><p className="text-sm text-slate-500">{claim.office}</p></div><span className="font-bold">{formatCurrency(claim.total_amount, claim.currency)}</span></div>))}</div>)}
        </div>
        {selectedClaim && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setSelectedClaim(null)}><div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}><div className="p-6 border-b flex justify-between"><div><h2 className="text-xl font-bold">{selectedClaim.user_name}</h2><p className="text-sm text-slate-500">{selectedClaim.claim_number} • Level {selectedClaim.approval_level || 1}</p></div><button onClick={() => setSelectedClaim(null)} className="text-2xl text-slate-400">×</button></div><div className="p-6"><button onClick={() => handleDownloadPDF(selectedClaim)} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold mb-4">📥 Download PDF</button>{selectedClaim.expenses?.map((exp, i) => (<div key={i} className="py-3 border-b"><div className="flex justify-between items-start"><div className="flex-1"><div className="flex items-center gap-2 flex-wrap"><span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-bold">{exp.ref}</span><span className="font-semibold">{exp.merchant}</span>{exp.isPotentialDuplicate && <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded">⚠️ Duplicate?</span>}{exp.numberOfPax && <span className="bg-purple-100 text-purple-600 text-xs px-2 py-0.5 rounded">👥 {exp.numberOfPax} pax</span>}</div><p className="text-xs text-slate-500 mt-1">{exp.description}</p>{exp.isForeignCurrency && exp.forexRate && <p className="text-xs text-amber-600 mt-1">💱 Rate: 1 {exp.currency} = {exp.forexRate.toFixed(4)} {selectedClaim.currency}</p>}{exp.adminNotes && <p className="text-xs text-amber-600 mt-1 bg-amber-50 px-2 py-1 rounded">📝 Notes: {exp.adminNotes}</p>}</div><span className="font-bold text-green-700 ml-2">{formatCurrency(exp.reimbursementAmount || exp.amount, selectedClaim.currency)}</span></div></div>))}</div><div className="p-4 border-t bg-slate-50 space-y-3"><div className="flex gap-3"><button onClick={() => setEditingClaim(selectedClaim)} className="flex-1 py-3 rounded-xl bg-purple-500 text-white font-semibold">✏️ Edit / Add Notes</button><button onClick={() => setShowRequestChanges(true)} className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-semibold">📝 Return</button></div><div className="flex gap-3"><button onClick={() => handleReject(selectedClaim.id)} disabled={loading} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold disabled:opacity-50">↩️ Reject</button><button onClick={() => handleApprove(selectedClaim)} disabled={loading} className="flex-[2] py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50">{(() => { const workflow = SENIOR_STAFF_ROUTING[selectedClaim.user_id]; const isSingleLevel = workflow?.singleLevel; const level = selectedClaim.approval_level || 1; if (level === 1 && isSingleLevel) return workflow?.externalApproval ? '✓ Approve (→ Chairman)' : '✓ Final Approve'; if (level === 1) return '✓ Approve → L2'; return '✓ Final Approve'; })()}</button></div></div></div></div>)}
        {editingClaim && <EditClaimModal claim={editingClaim} onClose={() => setEditingClaim(null)} />}
        {showRequestChanges && selectedClaim && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl max-w-md w-full"><div className="bg-amber-500 text-white p-5"><h2 className="font-bold">📝 Request Changes</h2></div><div className="p-6"><textarea className="w-full p-3 border-2 rounded-xl" rows={4} placeholder="What needs fixing?" value={changeRequestComment} onChange={(e) => setChangeRequestComment(e.target.value)} /></div><div className="p-4 border-t flex gap-3"><button onClick={() => setShowRequestChanges(false)} className="flex-1 py-3 rounded-xl border-2 font-semibold">Cancel</button><button onClick={() => handleRequestChanges(selectedClaim.id, changeRequestComment)} disabled={!changeRequestComment.trim()} className="flex-[2] py-3 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50">Send 📤</button></div></div></div>)}
      </div>
    );
  };

  const canReview = currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'finance' || getReviewableClaims().length > 0 || getClaimsForSubmission().length > 0;
  
  const handleStatementAnnotationSave = async (annotatedImagesObj, newAnnotations) => { 
    // annotatedImagesObj is an object with keys being statement indices
    // Convert to array, filling in original images for any not annotated
    const newAnnotated = statementImages.map((origImg, idx) => 
      annotatedImagesObj[idx] || annotatedStatements[idx] || origImg
    );
    setAnnotatedStatements(newAnnotated);
    setStatementAnnotations(newAnnotations);
    
    // Save to server immediately
    await saveToServer(expenses, newAnnotated, newAnnotations, originalStatementImages);
    
    setShowStatementAnnotator(false); 
    setShowPreview(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 py-3 shadow-lg sticky top-0 z-40">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm flex items-center gap-2">
              Berkeley Expenses
              {savingStatus === 'saving' && <span className="text-yellow-400 text-xs animate-pulse">💾 Saving...</span>}
              {savingStatus === 'saved' && <span className="text-green-400 text-xs">✓ Saved</span>}
              {savingStatus === 'error' && <span className="text-red-400 text-xs">⚠️ Error</span>}
            </div>
            <div className="text-xs text-slate-400">{userOffice?.name} • {getUserReimburseCurrency(currentUser)}</div>
          </div>
          <div className="flex items-center gap-3"><div className="text-right hidden sm:block"><div className="text-sm font-medium">{currentUser.name.split(' ').slice(0, 2).join(' ')}</div><div className="text-xs text-slate-400 capitalize">{currentUser.role}</div></div><button onClick={() => { localStorage.removeItem('berkeley_current_user'); setCurrentUser(null); setExpenses([]); setAnnotatedStatements([]); setStatementAnnotations([]); setStatementImages([]); setOriginalStatementImages([]); setActiveTab('my_expenses'); }} className="bg-white/10 px-3 py-2 rounded-lg text-xs font-medium">Logout</button></div>
        </div>
      </header>
      {canReview && (<div className="bg-white border-b sticky top-14 z-30"><div className="max-w-3xl mx-auto flex"><button onClick={() => setActiveTab('my_expenses')} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${activeTab === 'my_expenses' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>📋 My Expenses</button><button onClick={() => setActiveTab('review')} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${activeTab === 'review' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>👀 Review{getReviewableClaims().length > 0 && <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">{getReviewableClaims().length}</span>}</button></div></div>)}
      <main className="max-w-3xl mx-auto p-4 pb-20">{canReview && activeTab === 'review' ? <ReviewClaimsTab /> : <MyExpensesTab />}</main>
      {(showAddExpense || editingExpense) && <AddExpenseModal editExpense={editingExpense} existingClaims={claims} expenses={expenses} onClose={() => { setShowAddExpense(false); setEditingExpense(null); }} />}
      {showPreview && <PreviewClaimModal />}
      {showStatementUpload && (
        <StatementUploadModal 
          existingImages={originalStatementImages}
          onClose={() => setShowStatementUpload(false)}
          onContinue={(imgs) => {
            setStatementImages(imgs);
            // Save originals for re-annotation later
            setOriginalStatementImages(imgs);
            if (imgs.length > 0) {
              setCurrentStatementIndex(0);
              setShowStatementUpload(false); 
              setShowStatementAnnotator(true);
            }
          }}
        />
      )}
      {showStatementAnnotator && statementImages.length > 0 && (
        <StatementAnnotator 
          images={statementImages} 
          initialIndex={currentStatementIndex}
          expenses={pendingExpenses} 
          existingAnnotations={statementAnnotations} 
          onSave={handleStatementAnnotationSave} 
          onCancel={() => { setShowStatementAnnotator(false); setShowPreview(true); }} 
        />
      )}
      {viewingImage && <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} />}
    </div>
  );
}