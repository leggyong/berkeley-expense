import React, { useState, useEffect, useRef } from 'react';

/*
 * ============================================
 * BERKELEY INTERNATIONAL EXPENSE MANAGEMENT SYSTEM
 * Version: 2.1 - Editable Annotations + 54 Developments
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
// OFFICES
// ============================================
const OFFICES = [
  { code: 'BEJ', name: 'Beijing', currency: 'CNY', country: 'China', companyName: 'Berkeley Real Estate Consulting (Beijing) Co., Ltd.' },
  { code: 'CHE', name: 'Chengdu', currency: 'CNY', country: 'China', companyName: 'Berkeley Real Estate Consulting (Beijing) Co., Ltd. Chengdu Branch' },
  { code: 'SHA', name: 'Shanghai', currency: 'CNY', country: 'China', companyName: 'Berkeley Real Estate Consulting (Beijing) Co., Ltd. Shanghai Branch' },
  { code: 'SHE', name: 'Shenzhen', currency: 'CNY', country: 'China', companyName: 'Berkeley Real Estate Consulting (Beijing) Co., Ltd. Shenzhen Branch' },
  { code: 'HKG', name: 'Hong Kong', currency: 'HKD', country: 'Hong Kong', companyName: 'Berkeley (Hong Kong) Limited' },
  { code: 'LON', name: 'London', currency: 'GBP', country: 'UK', companyName: 'Berkeley London Residential Ltd' },
  { code: 'MYS', name: 'Malaysia', currency: 'MYR', country: 'Malaysia', companyName: 'Berkeley (Singapore)' },
  { code: 'SIN', name: 'Singapore', currency: 'SGD', country: 'Singapore', companyName: 'Berkeley (Singapore)' },
  { code: 'BKK', name: 'Bangkok', currency: 'THB', country: 'Thailand', companyName: 'Berkeley (Thailand)' },
  { code: 'DXB', name: 'Dubai', currency: 'AED', country: 'UAE', companyName: 'Berkeley London Residential Ltd' }
];

// ============================================
// DEVELOPMENTS FOR BACKCHARGING (54 developments)
// ============================================
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

// ============================================
// APPROVAL WORKFLOWS
// ============================================
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

// ============================================
// EMPLOYEES (Emma Fowler removed)
// ============================================
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

// ============================================
// EXPENSE CATEGORIES
// ============================================
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

const getApprovalWorkflow = (employeeId, officeCode) => {
  const specialReview = SPECIAL_REVIEWERS[employeeId];
  const officeWorkflow = APPROVAL_WORKFLOWS[officeCode];
  if (specialReview) {
    return { level1: officeWorkflow?.level1, level1Name: officeWorkflow?.level1Name, level2: specialReview.finalReviewer, level2Name: specialReview.finalReviewerName };
  }
  return officeWorkflow;
};

const canUserReviewClaim = (userId, claim) => {
  const claimant = EMPLOYEES.find(e => e.id === claim.user_id);
  if (!claimant) return false;
  const workflow = getApprovalWorkflow(claim.user_id, claimant.office);
  if (!workflow) return false;
  const currentLevel = claim.approval_level || 1;
  if (currentLevel === 1 && workflow.level1 === userId) return true;
  if (currentLevel === 2 && workflow.level2 === userId) return true;
  const user = EMPLOYEES.find(e => e.id === userId);
  if (user?.role === 'finance') return true;
  return false;
};

// ============================================
// IMAGE VIEWER COMPONENT
// ============================================
const ImageViewer = ({ src, onClose }) => (
  <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4" onClick={onClose}>
    <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white w-12 h-12 rounded-full text-2xl">✕</button>
    <img src={src} alt="Full size" className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
  </div>
);

// ============================================
// STATEMENT ANNOTATION COMPONENT - Draggable & Resizable
// ============================================
const StatementAnnotator = ({ image, expenses, existingAnnotations = [], onSave, onCancel }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [annotations, setAnnotations] = useState(existingAnnotations);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
  const [baseImage, setBaseImage] = useState(null);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const maxWidth = Math.min(800, window.innerWidth - 100);
      const scale = Math.min(maxWidth / img.width, 1);
      setImgDimensions({ width: img.width * scale, height: img.height * scale, scale });
      setBaseImage(img);
      setImageLoaded(true);
    };
    img.src = image;
  }, [image]);

  // Redraw canvas
  useEffect(() => {
    if (!imageLoaded || !baseImage) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = imgDimensions.width;
    canvas.height = imgDimensions.height;
    ctx.drawImage(baseImage, 0, 0, imgDimensions.width, imgDimensions.height);
    
    annotations.forEach(ann => {
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 3;
      ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
      ctx.fillStyle = '#ff6600';
      const labelWidth = Math.max(35, ann.ref.length * 12);
      ctx.fillRect(ann.x, ann.y - 22, labelWidth, 22);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(ann.ref, ann.x + 5, ann.y - 6);
      // Resize handle
      ctx.fillStyle = '#ff6600';
      ctx.fillRect(ann.x + ann.width - 8, ann.y + ann.height - 8, 8, 8);
    });
  }, [annotations, imageLoaded, baseImage, imgDimensions]);

  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const findAnnotationAt = (pos) => {
    for (let i = annotations.length - 1; i >= 0; i--) {
      const ann = annotations[i];
      if (pos.x >= ann.x && pos.x <= ann.x + ann.width && pos.y >= ann.y && pos.y <= ann.y + ann.height) {
        return { ann, index: i, isResize: pos.x >= ann.x + ann.width - 12 && pos.y >= ann.y + ann.height - 12 };
      }
    }
    return null;
  };

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    const found = findAnnotationAt(pos);
    
    if (found) {
      if (found.isResize) {
        setResizing({ index: found.index, startX: pos.x, startY: pos.y, startW: found.ann.width, startH: found.ann.height });
      } else {
        setDragging({ index: found.index, offsetX: pos.x - found.ann.x, offsetY: pos.y - found.ann.y });
      }
    } else if (selectedLabel) {
      // Place new annotation
      const newAnn = { ref: selectedLabel, x: pos.x - 50, y: pos.y - 15, width: 100, height: 30 };
      setAnnotations(prev => [...prev.filter(a => a.ref !== selectedLabel), newAnn]);
      setSelectedLabel(null);
    }
  };

  const handleMouseMove = (e) => {
    const pos = getMousePos(e);
    if (dragging !== null) {
      setAnnotations(prev => prev.map((a, i) => i === dragging.index ? { ...a, x: pos.x - dragging.offsetX, y: pos.y - dragging.offsetY } : a));
    } else if (resizing !== null) {
      const dx = pos.x - resizing.startX;
      const dy = pos.y - resizing.startY;
      setAnnotations(prev => prev.map((a, i) => i === resizing.index ? { ...a, width: Math.max(50, resizing.startW + dx), height: Math.max(20, resizing.startH + dy) } : a));
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setResizing(null);
  };

  const removeAnnotation = (ref) => {
    setAnnotations(prev => prev.filter(a => a.ref !== ref));
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    const annotatedImage = canvas.toDataURL('image/png');
    onSave(annotatedImage, annotations);
  };

  const foreignExpenses = expenses.filter(e => e.isForeignCurrency);
  const untaggedExpenses = foreignExpenses.filter(e => !annotations.some(a => a.ref === e.ref));

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col z-[100]">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-lg font-bold">📝 Annotate Credit Card Statement</h2>
          <p className="text-amber-100 text-sm">Select a label, click to place. Drag to move, drag corner to resize.</p>
        </div>
        <button onClick={onCancel} className="w-8 h-8 rounded-full bg-white/20">✕</button>
      </div>

      <div className="flex-1 overflow-auto p-4" ref={containerRef}>
        <div className="max-w-4xl mx-auto">
          {/* Label buttons */}
          <div className="bg-white rounded-xl p-4 mb-4">
            <p className="font-semibold mb-3">Select expense label to place:</p>
            <div className="flex flex-wrap gap-2">
              {foreignExpenses.map(exp => {
                const isPlaced = annotations.some(a => a.ref === exp.ref);
                const isSelected = selectedLabel === exp.ref;
                return (
                  <button
                    key={exp.ref}
                    onClick={() => setSelectedLabel(isSelected ? null : exp.ref)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isSelected ? 'bg-orange-500 text-white ring-2 ring-orange-300' :
                      isPlaced ? 'bg-green-100 text-green-700 border-2 border-green-400' :
                      'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {exp.ref} - {exp.merchant}
                    {isPlaced && <span className="ml-2 cursor-pointer" onClick={(e) => { e.stopPropagation(); removeAnnotation(exp.ref); }}>✕</span>}
                  </button>
                );
              })}
            </div>
            
            {untaggedExpenses.length > 0 && (
              <div className="mt-3 bg-amber-50 border border-amber-300 rounded-lg p-3">
                <p className="text-amber-800 text-sm font-medium">⚠️ {untaggedExpenses.length} expense(s) not yet tagged: {untaggedExpenses.map(e => e.ref).join(', ')}</p>
              </div>
            )}
            
            {selectedLabel && (
              <p className="mt-3 text-orange-600 font-medium">👆 Click on the statement image to place {selectedLabel}</p>
            )}
          </div>

          {/* Canvas */}
          <div className="bg-white rounded-xl p-4 overflow-auto">
            {imageLoaded && (
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className={`border-2 ${selectedLabel ? 'border-orange-400 cursor-crosshair' : dragging || resizing ? 'cursor-move' : 'border-slate-300'} rounded-lg`}
                style={{ cursor: dragging ? 'move' : resizing ? 'se-resize' : selectedLabel ? 'crosshair' : 'default' }}
              />
            )}
          </div>

          <p className="text-white/60 text-sm mt-3 text-center">💡 Tip: Drag boxes to move them. Drag the orange corner to resize.</p>
        </div>
      </div>

      <div className="bg-slate-100 p-4 flex gap-3 justify-end shrink-0">
        <button onClick={onCancel} className="px-6 py-3 rounded-xl border-2 border-slate-300 font-semibold text-slate-600">Cancel</button>
        <button onClick={handleSave} className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold">
          Save Annotations ✓
        </button>
      </div>
    </div>
  );
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
  const [showStatementAnnotator, setShowStatementAnnotator] = useState(false);
  const [creditCardStatement, setCreditCardStatement] = useState(null);
  const [statementImageData, setStatementImageData] = useState(null);
  const [annotatedStatementImage, setAnnotatedStatementImage] = useState(null);
  const [statementAnnotations, setStatementAnnotations] = useState([]);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [activeTab, setActiveTab] = useState('my_expenses');
  const [previewPage, setPreviewPage] = useState(0);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingClaim, setEditingClaim] = useState(null);
  const [showRequestChanges, setShowRequestChanges] = useState(false);
  const [changeRequestComment, setChangeRequestComment] = useState('');
  const [viewingImage, setViewingImage] = useState(null);
  
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

  useEffect(() => {
    if (currentUser) {
      const returnedClaims = claims.filter(c => c.user_id === currentUser.id && c.status === 'changes_requested');
      if (returnedClaims.length > 0) {
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

  const getReviewableClaims = () => {
    if (!currentUser) return [];
    return claims.filter(c => {
      if (c.status !== 'pending_review' && c.status !== 'pending_level2') return false;
      return canUserReviewClaim(currentUser.id, c);
    });
  };

  // ============================================
  // PDF GENERATION
  // ============================================
  const generatePDFFromHTML = async (expenseList, userName, officeCode, claimNumber, submittedDate, creditCardStatementImg, reimburseCurrency) => {
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

    const totalAmount = expenseList.reduce((sum, e) => sum + parseFloat(e.reimbursementAmount || e.amount || 0), 0);
    const claimMonth = expenseList.length > 0 ? getMonthYear(expenseList[0].date) : '';

    let receiptsHTML = '';
    for (const exp of expenseList) {
      const backchargeHTML = exp.hasBackcharge && exp.backcharges?.length > 0 ? `
        <div style="margin-top: 8px; padding: 8px; background: #e3f2fd; border-radius: 4px;">
          <span style="color: #1565c0; font-weight: bold;">📊 Backcharges:</span><br>
          ${exp.backcharges.map(bc => `<span style="color: #1976d2;">${bc.development}: ${bc.percentage}%</span>`).join(' | ')}
        </div>
      ` : '';

      receiptsHTML += `
        <div class="page receipt-page">
          <div class="receipt-header">
            <div class="receipt-ref">${exp.ref}</div>
            <div class="receipt-info">
              <strong>${exp.merchant}</strong><br>
              <span style="color: #ccc;">Date:</span> ${formatShortDate(exp.date)}<br>
              <span style="color: #ccc;">Original:</span> ${formatCurrency(exp.amount, exp.currency)}<br>
              ${exp.isForeignCurrency ? `<span style="color: #90caf9;">Reimburse:</span> ${formatCurrency(exp.reimbursementAmount, reimburseCurrency)}<br>` : ''}
              <span style="color: #ccc;">Description:</span> ${exp.description || ''}
              ${exp.adminNotes ? `<br><span style="color: #ffeb3b;">Admin Notes:</span> ${exp.adminNotes}` : ''}
            </div>
          </div>
          ${exp.receiptPreview ? `<img src="${exp.receiptPreview}" class="receipt-img" />` : '<div class="no-receipt">No receipt image</div>'}
          ${backchargeHTML}
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
          .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header h1 { font-size: 16px; font-weight: bold; margin-bottom: 3px; }
          .header .company { font-size: 11px; color: #666; }
          .info-box { border: 1px solid #000; margin-bottom: 15px; }
          .info-row { display: flex; border-bottom: 1px solid #000; }
          .info-row:last-child { border-bottom: none; }
          .info-cell { flex: 1; padding: 5px 8px; border-right: 1px solid #000; }
          .info-cell:last-child { border-right: none; }
          .info-label { font-size: 9px; color: #666; }
          .info-value { font-weight: bold; }
          .expenses-section { border: 1px solid #000; margin-bottom: 15px; }
          .section-header { background: #f0f0f0; padding: 5px 8px; font-weight: bold; border-bottom: 1px solid #000; font-size: 11px; }
          .category-header { background: #f8f8f8; padding: 4px 8px; font-weight: bold; font-size: 10px; border-bottom: 1px solid #ccc; text-decoration: underline; }
          .expense-row { display: flex; border-bottom: 1px solid #ddd; }
          .col-cat { width: 25px; padding: 3px 5px; font-weight: bold; }
          .col-name { width: 100px; padding: 3px 5px; text-decoration: underline; }
          .col-detail { flex: 1; padding: 3px 5px; }
          .col-amount { width: 80px; padding: 3px 5px; text-align: right; }
          .sub-row { display: flex; padding-left: 125px; border-bottom: 1px solid #eee; }
          .total-row { display: flex; background: #f0f0f0; border-top: 2px solid #000; padding: 8px; }
          .total-row .label { flex: 1; font-weight: bold; font-size: 11px; }
          .total-row .amount { width: 100px; text-align: right; font-weight: bold; font-size: 11px; border: 1px solid #000; padding: 3px 8px; }
          .signature-section { margin-top: 20px; }
          .sig-row { display: flex; margin-bottom: 15px; gap: 20px; }
          .sig-field { flex: 1; }
          .sig-label { font-size: 9px; margin-bottom: 3px; }
          .sig-line { border-bottom: 1px solid #000; height: 20px; }
          .receipt-page { padding: 10mm; }
          .receipt-header { background: #333; color: white; padding: 12px; margin-bottom: 10px; display: flex; align-items: center; }
          .receipt-ref { font-size: 28px; font-weight: bold; margin-right: 20px; min-width: 50px; }
          .receipt-info { font-size: 11px; line-height: 1.6; }
          .receipt-img { max-width: 100%; max-height: 200mm; object-fit: contain; display: block; margin: 0 auto; }
          .no-receipt { background: #f5f5f5; padding: 50px; text-align: center; color: #999; }
          .statement-page { padding: 10mm; }
          .statement-header { background: #ff9800; color: white; padding: 12px; margin-bottom: 10px; text-align: center; }
          .statement-img { max-width: 100%; max-height: 250mm; object-fit: contain; display: block; margin: 0 auto; }
          @media print { .page { padding: 10mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
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
            <div class="category-header">Motor Vehicle Expenditure</div>
            ${['A', 'B', 'C', 'D'].map(cat => {
              const category = EXPENSE_CATEGORIES[cat];
              return `
                <div class="expense-row">
                  <div class="col-cat">${cat}.</div>
                  <div class="col-name">${category.name}</div>
                  <div class="col-detail"></div>
                  <div class="col-amount"></div>
                </div>
                ${category.subcategories.map(sub => `
                  <div class="sub-row">
                    <div class="col-detail">${sub}</div>
                    <div class="col-amount">${reimburseCurrency} ${getSubcategoryTotal(cat, sub).toFixed(2)}</div>
                  </div>
                `).join('')}
              `;
            }).join('')}
            <div class="category-header">Business Expenditure</div>
            ${['E', 'F', 'G', 'H', 'I', 'J'].map(cat => {
              const category = EXPENSE_CATEGORIES[cat];
              if (!category) return '';
              return `
                <div class="expense-row">
                  <div class="col-cat">${cat}.</div>
                  <div class="col-name">${category.name}</div>
                  <div class="col-detail"></div>
                  <div class="col-amount"></div>
                </div>
                ${category.subcategories.map(sub => `
                  <div class="sub-row">
                    <div class="col-detail">${sub}</div>
                    <div class="col-amount">${reimburseCurrency} ${getSubcategoryTotal(cat, sub).toFixed(2)}</div>
                  </div>
                `).join('')}
              `;
            }).join('')}
          </div>
          <div class="total-row">
            <div class="label">Total expenses claimed</div>
            <div class="amount">${reimburseCurrency} ${totalAmount.toFixed(2)}</div>
          </div>
          <div class="signature-section">
            <div class="sig-row">
              <div class="sig-field"><div class="sig-label">Signature of Claimant:</div><div class="sig-line" style="font-style: italic; padding-top: 5px;">${userName}</div></div>
              <div class="sig-field"><div class="sig-label">Date:</div><div class="sig-line" style="padding-top: 5px;">${formatDate(submittedDate || new Date().toISOString())}</div></div>
            </div>
            <div class="sig-row">
              <div class="sig-field"><div class="sig-label">Authorised:</div><div class="sig-line"></div></div>
              <div class="sig-field"><div class="sig-label">Date:</div><div class="sig-line"></div></div>
            </div>
          </div>
        </div>
        
        ${receiptsHTML}
        
        ${creditCardStatementImg ? `
        <div class="page statement-page">
          <div class="statement-header">
            <h2 style="font-size: 14px; margin: 0;">💳 Credit Card Statement</h2>
          </div>
          <img src="${creditCardStatementImg}" class="statement-img" />
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
      await generatePDFFromHTML(claim.expenses || [], claim.user_name, employee?.office, claim.claim_number, claim.submitted_at, claim.annotated_statement, employee?.reimburseCurrency || claim.currency);
    } catch (err) {
      alert('❌ Failed');
    }
    setDownloading(false);
  };

  const handleDownloadPreviewPDF = async () => {
    setDownloading(true);
    try {
      await generatePDFFromHTML(pendingExpenses, currentUser.name, currentUser.office, `DRAFT-${Date.now().toString().slice(-6)}`, new Date().toISOString(), annotatedStatementImage, getUserReimburseCurrency(currentUser));
    } catch (err) {
      alert('❌ Failed');
    }
    setDownloading(false);
  };

  // ============================================
  // LOGIN
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
        setLoginError('Incorrect password.');
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800">Berkeley Expenses</h1>
            <p className="text-slate-500 text-sm mt-2">
              {loginStep === 'select' ? 'Select your name' : `Welcome, ${selectedEmployee?.name.split(' ')[0]}`}
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
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800"><strong>{selectedEmployee?.name}</strong><br/>
                <span className="text-blue-600">{getUserOffice(selectedEmployee)?.name} • {selectedEmployee?.reimburseCurrency}</span></p>
              </div>
              <input type="password" className="w-full p-4 border-2 border-slate-200 rounded-xl text-lg focus:border-blue-500 outline-none" placeholder="Enter password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleLogin()} autoFocus />
              {loginError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">⚠️ {loginError}</div>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setLoginStep('select'); setSelectedEmployee(null); }} className="flex-1 py-3 rounded-xl border-2 border-slate-300 font-semibold text-slate-600">← Back</button>
                <button onClick={handleLogin} className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg">Login 🔐</button>
              </div>
              <p className="text-center text-xs text-slate-400 mt-4">Default: <code className="bg-slate-100 px-2 py-1 rounded">berkeley123</code></p>
            </div>
          )}
          <p className="text-center text-xs text-slate-400 mt-8">v2.1</p>
        </div>
      </div>
    );
  }

  // ============================================
  // ADD/EDIT EXPENSE MODAL
  // ============================================
  const AddExpenseModal = ({ editExpense = null, onClose }) => {
    const [step, setStep] = useState(editExpense ? 2 : 1);
    const [receiptPreview, setReceiptPreview] = useState(editExpense?.receiptPreview || null);
    const [showFullImage, setShowFullImage] = useState(false);
    const userReimburseCurrency = getUserReimburseCurrency(currentUser);
    
    const [formData, setFormData] = useState(editExpense ? {
      merchant: editExpense.merchant || '',
      amount: editExpense.amount || '',
      currency: editExpense.currency || userOffice?.currency || 'SGD',
      date: editExpense.date || new Date().toISOString().split('T')[0],
      category: editExpense.category || 'C',
      subcategory: editExpense.subcategory || 'Taxis',
      description: editExpense.description || '',
      attendees: editExpense.attendees || '',
      reimbursementAmount: editExpense.reimbursementAmount || '',
      reimbursementCurrency: userReimburseCurrency,
      hasBackcharge: editExpense.hasBackcharge || false,
      backcharges: editExpense.backcharges || []
    } : {
      merchant: '', amount: '', currency: userOffice?.currency || 'SGD',
      date: new Date().toISOString().split('T')[0], category: 'C', subcategory: 'Taxis',
      description: '', attendees: '', reimbursementAmount: '', reimbursementCurrency: userReimburseCurrency,
      hasBackcharge: false, backcharges: []
    });

    const isForeignCurrency = formData.currency !== userReimburseCurrency;

    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setReceiptPreview(reader.result);
        reader.readAsDataURL(file);
        setStep(2);
      }
    };

    const addBackcharge = () => {
      setFormData(prev => ({ ...prev, backcharges: [...prev.backcharges, { development: '', percentage: '' }] }));
    };

    const updateBackcharge = (idx, field, value) => {
      setFormData(prev => ({ ...prev, backcharges: prev.backcharges.map((bc, i) => i === idx ? { ...bc, [field]: value } : bc) }));
    };

    const removeBackcharge = (idx) => {
      setFormData(prev => ({ ...prev, backcharges: prev.backcharges.filter((_, i) => i !== idx) }));
    };

    const backchargeTotal = formData.backcharges.reduce((sum, bc) => sum + (parseFloat(bc.percentage) || 0), 0);
    const backchargeValid = !formData.hasBackcharge || (formData.backcharges.length > 0 && backchargeTotal >= 99.5 && backchargeTotal <= 100.5);

    const handleSave = () => {
      if (editExpense) {
        setExpenses(prev => prev.map(e => e.id === editExpense.id ? {
          ...e, ...formData,
          amount: parseFloat(formData.amount),
          reimbursementAmount: isForeignCurrency ? parseFloat(formData.reimbursementAmount) : parseFloat(formData.amount),
          reimbursementCurrency: userReimburseCurrency,
          receiptPreview: receiptPreview || e.receiptPreview,
          isForeignCurrency
        } : e));
      } else {
        const ref = getNextRef(formData.category);
        const newExpense = {
          id: Date.now(), ref, ...formData,
          amount: parseFloat(formData.amount),
          reimbursementAmount: isForeignCurrency ? parseFloat(formData.reimbursementAmount) : parseFloat(formData.amount),
          reimbursementCurrency: userReimburseCurrency,
          receiptPreview,
          status: 'draft', isForeignCurrency, isOld: isOlderThan2Months(formData.date),
          createdAt: new Date().toISOString()
        };
        setExpenses(prev => [...prev, newExpense]);
      }
      onClose();
    };

    const needsAttendees = EXPENSE_CATEGORIES[formData.category]?.requiresAttendees;
    const canSave = formData.merchant && formData.amount && formData.date && formData.description && 
      (!needsAttendees || formData.attendees) && (!isForeignCurrency || formData.reimbursementAmount) && backchargeValid;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">{editExpense ? '✏️ Edit' : '📸 Add'} Expense</h2>
              <p className="text-blue-100 text-sm">Reimburse in {userReimburseCurrency}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20">✕</button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {step === 1 && (
              <label className="block border-3 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-500">
                <input type="file" accept="image/*,application/pdf" capture="environment" onChange={handleFileChange} className="hidden" />
                <div className="text-5xl mb-4">📸</div>
                <p className="font-semibold">Take photo or upload receipt</p>
              </label>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {receiptPreview && (
                  <div className="relative">
                    <img src={receiptPreview} alt="Receipt" className="w-full h-40 object-contain bg-slate-100 rounded-xl cursor-pointer" onClick={() => setShowFullImage(true)} />
                    <div className="absolute bottom-2 right-2 flex gap-2">
                      <button onClick={() => setShowFullImage(true)} className="bg-black/60 text-white px-3 py-1 rounded-lg text-xs">🔍 View</button>
                      <button onClick={() => { setStep(1); setReceiptPreview(null); }} className="bg-white/90 px-3 py-1 rounded-lg text-xs">📷 Change</button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Merchant *</label>
                  <input type="text" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none" value={formData.merchant} onChange={e => setFormData(prev => ({ ...prev, merchant: e.target.value }))} />
                </div>

                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-600 uppercase">💵 Original Expense</p>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" step="0.01" className="p-3 border-2 border-slate-200 rounded-xl" placeholder="Amount" value={formData.amount} onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))} />
                    <select className="p-3 border-2 border-slate-200 rounded-xl bg-white" value={formData.currency} onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {isForeignCurrency && (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
                    <p className="text-sm font-bold text-amber-800 mb-2">💳 Foreign Currency</p>
                    <input type="number" step="0.01" className="w-full p-3 border-2 border-amber-300 rounded-xl bg-white" placeholder={`Amount in ${userReimburseCurrency}`} value={formData.reimbursementAmount} onChange={e => setFormData(prev => ({ ...prev, reimbursementAmount: e.target.value }))} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <input type="date" className="p-3 border-2 border-slate-200 rounded-xl" value={formData.date} onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))} />
                  <select className="p-3 border-2 border-slate-200 rounded-xl bg-white" value={formData.category} onChange={e => setFormData(prev => ({ ...prev, category: e.target.value, subcategory: EXPENSE_CATEGORIES[e.target.value].subcategories[0] }))}>
                    {Object.entries(EXPENSE_CATEGORIES).map(([key, val]) => <option key={key} value={key}>{val.icon} {key}. {val.name}</option>)}
                  </select>
                </div>

                <select className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white" value={formData.subcategory} onChange={e => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}>
                  {EXPENSE_CATEGORIES[formData.category].subcategories.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                </select>

                <input type="text" className="w-full p-3 border-2 border-slate-200 rounded-xl" placeholder="Description *" value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} />

                {needsAttendees && (
                  <textarea className="w-full p-3 border-2 border-slate-200 rounded-xl resize-none" rows={2} placeholder="Attendees (Name & Company) *" value={formData.attendees} onChange={e => setFormData(prev => ({ ...prev, attendees: e.target.value }))} />
                )}

                {/* Backcharging */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input type="checkbox" checked={formData.hasBackcharge} onChange={e => setFormData(prev => ({ ...prev, hasBackcharge: e.target.checked, backcharges: e.target.checked ? prev.backcharges : [] }))} className="w-5 h-5" />
                    <span className="font-semibold text-blue-800">📊 Backcharge to Development(s)</span>
                  </label>

                  {formData.hasBackcharge && (
                    <div className="space-y-3">
                      {formData.backcharges.map((bc, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <select className="flex-1 p-2 border rounded-lg text-sm bg-white" value={bc.development} onChange={e => updateBackcharge(idx, 'development', e.target.value)}>
                            <option value="">Select development</option>
                            {DEVELOPMENTS.map(dev => <option key={dev} value={dev}>{dev}</option>)}
                          </select>
                          <input type="number" step="0.1" className="w-20 p-2 border rounded-lg text-center text-sm" placeholder="%" value={bc.percentage} onChange={e => updateBackcharge(idx, 'percentage', e.target.value)} />
                          <span className="text-sm">%</span>
                          <button onClick={() => removeBackcharge(idx)} className="text-red-500 p-1">✕</button>
                        </div>
                      ))}
                      <button onClick={addBackcharge} className="text-blue-600 text-sm font-medium">+ Add Development</button>
                      {formData.backcharges.length > 0 && (
                        <div className={`text-sm font-medium p-2 rounded ${backchargeValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          Total: {backchargeTotal.toFixed(1)}% {backchargeValid ? '✓' : '(~100% required)'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-slate-50">
            {step === 2 && (
              <div className="flex gap-3">
                {!editExpense && <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border-2 border-slate-300 font-semibold">← Back</button>}
                <button onClick={handleSave} disabled={!canSave} className={`${editExpense ? 'w-full' : 'flex-[2]'} py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50`}>
                  {editExpense ? '💾 Save' : 'Save ✓'}
                </button>
              </div>
            )}
          </div>
        </div>
        {showFullImage && receiptPreview && <ImageViewer src={receiptPreview} onClose={() => setShowFullImage(false)} />}
      </div>
    );
  };

  // ============================================
  // STATEMENT UPLOAD
  // ============================================
  const StatementUploadModal = () => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);

    const handleFileChange = (e) => {
      const f = e.target.files[0];
      if (f) {
        setFile(f);
        if (f.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => setPreview(reader.result);
          reader.readAsDataURL(f);
        }
      }
    };

    const handleContinue = () => {
      setCreditCardStatement(file);
      setStatementImageData(preview);
      setShowStatementUpload(false);
      setShowStatementAnnotator(true);
    };

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
          <div className="bg-amber-500 text-white p-5">
            <h2 className="text-lg font-bold">💳 Upload Statement</h2>
          </div>
          <div className="p-6">
            <label className={`block border-3 border-dashed rounded-2xl p-6 text-center cursor-pointer ${file ? 'border-green-400 bg-green-50' : 'border-slate-300'}`}>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              {file ? (
                <div>
                  <span className="text-3xl">✅</span>
                  <p className="font-semibold text-green-700 mt-2">{file.name}</p>
                  {preview && <img src={preview} alt="Preview" className="mt-3 max-h-32 mx-auto rounded" />}
                </div>
              ) : (
                <div><span className="text-4xl">📄</span><p className="font-semibold mt-2">Upload statement image</p></div>
              )}
            </label>
          </div>
          <div className="p-4 border-t flex gap-3">
            <button onClick={() => setShowStatementUpload(false)} className="flex-1 py-3 rounded-xl border-2 font-semibold">Cancel</button>
            <button onClick={handleContinue} disabled={!file} className="flex-[2] py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50">Annotate →</button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // PREVIEW MODAL
  // ============================================
  const PreviewClaimModal = () => {
    const userReimburseCurrency = getUserReimburseCurrency(currentUser);
    const groupedExpenses = pendingExpenses.reduce((acc, exp) => { if (!acc[exp.category]) acc[exp.category] = []; acc[exp.category].push(exp); return acc; }, {});
    const canSubmit = !hasForeignCurrency || (hasForeignCurrency && annotatedStatementImage);
    const getCategoryTotal = (cat) => (groupedExpenses[cat] || []).reduce((sum, e) => sum + parseFloat(e.reimbursementAmount || e.amount || 0), 0);
    const pages = ['Summary', 'Receipts'];
    const workflow = getApprovalWorkflow(currentUser.id, currentUser.office);
    const [viewImg, setViewImg] = useState(null);

    // Check for untagged foreign currency expenses
    const untaggedExpenses = foreignCurrencyExpenses.filter(e => !statementAnnotations.some(a => a.ref === e.ref));

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-lg font-bold">📋 Preview</h2>
              <p className="text-blue-200 text-sm">{pages[previewPage]} • {userReimburseCurrency}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleDownloadPreviewPDF} disabled={downloading} className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold text-sm">📥 PDF</button>
              <button onClick={() => { setShowPreview(false); setPreviewPage(0); }} className="w-8 h-8 rounded-full bg-white/20">✕</button>
            </div>
          </div>

          <div className="bg-slate-100 px-4 py-2 flex gap-2 shrink-0">
            {pages.map((page, idx) => <button key={idx} onClick={() => setPreviewPage(idx)} className={`px-4 py-2 rounded-lg text-sm font-medium ${previewPage === idx ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>{page}</button>)}
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
                {workflow && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm">
                    <p className="font-semibold text-blue-800">Approval: {workflow.level1Name} → {workflow.level2Name}</p>
                  </div>
                )}
                <table className="w-full text-sm">
                  <tbody>
                    {Object.keys(EXPENSE_CATEGORIES).map(cat => (
                      <tr key={cat} className="border-b">
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

            {previewPage === 1 && (
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {pendingExpenses.map(exp => (
                    <div key={exp.id} className="border-2 border-slate-300 rounded-lg overflow-hidden">
                      <div className="bg-blue-100 p-2 flex justify-between">
                        <span className="font-bold text-blue-700">{exp.ref}</span>
                        <div className="flex gap-1">
                          {exp.isForeignCurrency && <span>💳</span>}
                          {exp.hasBackcharge && <span>📊</span>}
                        </div>
                      </div>
                      {exp.receiptPreview ? (
                        <img src={exp.receiptPreview} alt={exp.ref} className="w-full h-24 object-cover cursor-pointer" onClick={() => setViewImg(exp.receiptPreview)} />
                      ) : (
                        <div className="w-full h-24 bg-slate-100 flex items-center justify-center text-3xl">📄</div>
                      )}
                      <div className="p-2 bg-slate-50 text-xs">
                        <p className="text-slate-500">{formatShortDate(exp.date)}</p>
                        <p className="truncate font-medium">{exp.merchant}</p>
                        <p className="text-green-700 font-bold">{formatCurrency(exp.reimbursementAmount || exp.amount, userReimburseCurrency)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {hasForeignCurrency && !annotatedStatementImage && (
                  <div className="mt-6 bg-red-50 border-2 border-red-300 rounded-xl p-4">
                    <p className="text-red-800 font-bold">❌ CREDIT CARD STATEMENT REQUIRED</p>
                    <button onClick={() => { setShowPreview(false); setShowStatementUpload(true); }} className="mt-3 bg-amber-500 text-white px-4 py-2 rounded-lg font-semibold">📎 Upload & Annotate</button>
                  </div>
                )}

                {annotatedStatementImage && (
                  <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex justify-between items-start">
                      <p className="text-green-800 font-semibold">✅ Annotated Statement</p>
                      <button 
                        onClick={() => { setShowPreview(false); setShowStatementAnnotator(true); }} 
                        className="text-blue-600 text-sm font-medium hover:underline"
                      >
                        ✏️ Edit Annotations
                      </button>
                    </div>
                    <img src={annotatedStatementImage} alt="Statement" className="mt-2 max-h-40 rounded cursor-pointer" onClick={() => setViewImg(annotatedStatementImage)} />
                    
                    {untaggedExpenses.length > 0 && (
                      <div className="mt-3 bg-amber-100 border border-amber-300 rounded-lg p-3">
                        <p className="text-amber-800 text-sm font-medium">⚠️ Untagged expenses: {untaggedExpenses.map(e => e.ref).join(', ')}</p>
                        <button onClick={() => { setShowPreview(false); setShowStatementAnnotator(true); }} className="text-amber-700 text-sm underline mt-1">Click to add tags</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-slate-50 flex gap-3 shrink-0">
            <button onClick={() => { setShowPreview(false); setPreviewPage(0); }} className="flex-1 py-3 rounded-xl border-2 font-semibold">← Back</button>
            <button onClick={async () => { await handleSubmitClaim(); setShowPreview(false); setPreviewPage(0); }} disabled={!canSubmit || loading} className={`flex-[2] py-3 rounded-xl font-semibold ${canSubmit && !loading ? 'bg-green-600 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
              {loading ? '⏳...' : canSubmit ? 'Submit ✓' : '⚠️ Upload Statement'}
            </button>
          </div>
        </div>
        {viewImg && <ImageViewer src={viewImg} onClose={() => setViewImg(null)} />}
      </div>
    );
  };

  // ============================================
  // SUBMIT CLAIM
  // ============================================
  const handleSubmitClaim = async () => {
    setLoading(true);
    try {
      const returnedClaim = claims.find(c => c.user_id === currentUser.id && c.status === 'changes_requested');
      const workflow = getApprovalWorkflow(currentUser.id, currentUser.office);
      
      if (returnedClaim) {
        await supabase.from('claims').update({
          total_amount: reimbursementTotal,
          item_count: pendingExpenses.length,
          status: 'pending_review',
          approval_level: 1,
          expenses: pendingExpenses,
          annotated_statement: annotatedStatementImage
        }).eq('id', returnedClaim.id);
      } else {
        const claimNumber = `EXP-2026-${String(claims.length + 1).padStart(3, '0')}`;
        await supabase.from('claims').insert([{
          claim_number: claimNumber, 
          user_id: currentUser.id, 
          user_name: currentUser.name,
          office: userOffice?.name,
          office_code: currentUser.office,
          currency: getUserReimburseCurrency(currentUser),
          total_amount: reimbursementTotal, 
          item_count: pendingExpenses.length,
          status: 'pending_review',
          approval_level: 1,
          level1_approver: workflow?.level1,
          level2_approver: workflow?.level2,
          credit_card_statement: creditCardStatement?.name || null,
          annotated_statement: annotatedStatementImage,
          expenses: pendingExpenses
        }]);
      }
      setExpenses([]); 
      setCreditCardStatement(null); 
      setAnnotatedStatementImage(null);
      setStatementAnnotations([]);
      setStatementImageData(null);
      await loadClaims(); 
      alert('✅ Submitted!');
    } catch { alert('❌ Failed'); }
    setLoading(false);
  };

  // ============================================
  // ADMIN ACTIONS
  // ============================================
  const handleApprove = async (claim) => { 
    setLoading(true);
    const currentLevel = claim.approval_level || 1;
    if (currentLevel === 1) {
      await supabase.from('claims').update({ status: 'pending_level2', approval_level: 2, level1_approved_by: currentUser.name }).eq('id', claim.id);
    } else {
      await supabase.from('claims').update({ status: 'approved', level2_approved_by: currentUser.name }).eq('id', claim.id);
    }
    await loadClaims(); 
    setSelectedClaim(null); 
    setLoading(false);
    alert(currentLevel === 1 ? '✅ → Next reviewer' : '✅ Final Approval');
  };
  
  const handleReject = async (id) => { 
    setLoading(true); 
    await supabase.from('claims').update({ status: 'rejected', reviewed_by: currentUser.name }).eq('id', id); 
    await loadClaims(); 
    setSelectedClaim(null); 
    setLoading(false); 
  };

  const handleRequestChanges = async (claimId, comment) => {
    setLoading(true);
    await supabase.from('claims').update({ status: 'changes_requested', admin_comment: comment, reviewed_by: currentUser.name }).eq('id', claimId);
    await loadClaims();
    setSelectedClaim(null);
    setShowRequestChanges(false);
    setChangeRequestComment('');
    setLoading(false);
    alert('✅ Sent back');
  };

  // Edit Claim Modal
  const EditClaimModal = ({ claim, onClose }) => {
    const [editedExpenses, setEditedExpenses] = useState(claim.expenses || []);
    const [saving, setSaving] = useState(false);

    const updateExpense = (idx, field, value) => {
      setEditedExpenses(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
    };

    const handleSaveEdits = async () => {
      setSaving(true);
      const newTotal = editedExpenses.reduce((sum, e) => sum + parseFloat(e.reimbursementAmount || e.amount || 0), 0);
      await supabase.from('claims').update({ expenses: editedExpenses, total_amount: newTotal, edited_by: currentUser.name }).eq('id', claim.id);
      await loadClaims();
      setSaving(false);
      onClose();
      alert('✅ Saved');
    };

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="bg-purple-600 text-white p-5 flex justify-between">
            <h2 className="font-bold">✏️ Edit: {claim.user_name}</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20">✕</button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {editedExpenses.map((exp, idx) => (
              <div key={idx} className="border-2 rounded-xl p-4 mb-4">
                <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-lg">{exp.ref}</span>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <input type="text" className="p-2 border rounded-lg text-sm" placeholder="Merchant" value={exp.merchant} onChange={e => updateExpense(idx, 'merchant', e.target.value)} />
                  <input type="number" className="p-2 border rounded-lg text-sm" placeholder="Amount" value={exp.reimbursementAmount || exp.amount} onChange={e => updateExpense(idx, 'reimbursementAmount', parseFloat(e.target.value))} />
                  <input type="text" className="p-2 border rounded-lg text-sm col-span-2" placeholder="Description" value={exp.description} onChange={e => updateExpense(idx, 'description', e.target.value)} />
                  <input type="text" className="p-2 border border-amber-300 bg-amber-50 rounded-lg text-sm col-span-2" placeholder="Admin notes" value={exp.adminNotes || ''} onChange={e => updateExpense(idx, 'adminNotes', e.target.value)} />
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 font-semibold">Cancel</button>
            <button onClick={handleSaveEdits} disabled={saving} className="flex-[2] py-3 rounded-xl bg-purple-600 text-white font-semibold disabled:opacity-50">{saving ? '⏳' : '💾 Save'}</button>
          </div>
        </div>
      </div>
    );
  };

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
        {returnedClaims.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4">
            <h3 className="font-bold text-amber-800 mb-2">⚠️ Changes Requested</h3>
            {returnedClaims.map(claim => (
              <div key={claim.id} className="bg-white rounded-lg p-3 mb-2">
                <p className="font-semibold">{claim.claim_number}</p>
                <p className="text-sm text-amber-700">"{claim.admin_comment}"</p>
              </div>
            ))}
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
            <button onClick={() => setShowAddExpense(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg">📸 Add Receipt</button>
            {pendingExpenses.length > 0 && (
              <button onClick={() => setShowPreview(true)} className="border-2 border-green-500 text-green-600 px-6 py-3 rounded-xl font-semibold">📋 Preview ({pendingExpenses.length})</button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-800 mb-4">📋 Pending</h3>
          {pendingExpenses.length === 0 ? (
            <div className="text-center py-12 text-slate-400">📭 No pending</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(groupedExpenses).sort().map(([cat, exps]) => (
                <div key={cat}>
                  <p className="text-xs font-semibold text-slate-500 mb-2">{EXPENSE_CATEGORIES[cat]?.icon} {cat}. {EXPENSE_CATEGORIES[cat]?.name}</p>
                  {exps.map(exp => (
                    <div key={exp.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">{exp.ref}</span>
                          <span className="font-semibold">{exp.merchant}</span>
                          {exp.isForeignCurrency && <span className="text-amber-600 text-xs">💳</span>}
                          {exp.hasBackcharge && <span className="text-blue-600 text-xs">📊</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{exp.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-700">{formatCurrency(exp.reimbursementAmount || exp.amount, userReimburseCurrency)}</span>
                        <button onClick={() => setEditingExpense(exp)} className="text-blue-500 p-2">✏️</button>
                        <button onClick={() => setExpenses(prev => prev.filter(e => e.id !== exp.id))} className="text-red-500 p-2">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-800 mb-4">📁 My Claims</h3>
          {myClaims.filter(c => c.status !== 'changes_requested').length === 0 ? <p className="text-center text-slate-400 py-8">None</p> : (
            <div className="space-y-2">
              {myClaims.filter(c => c.status !== 'changes_requested').map(claim => (
                <div key={claim.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border">
                  <div>
                    <span className="font-semibold">{claim.claim_number}</span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${claim.status === 'approved' ? 'bg-green-100 text-green-700' : claim.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{claim.status}</span>
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
    const reviewableClaims = getReviewableClaims();

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold mb-4">📊 To Review ({reviewableClaims.length})</h3>
          {reviewableClaims.length === 0 ? <div className="text-center py-12 text-slate-400">✅ Nothing</div> : (
            <div className="space-y-2">
              {reviewableClaims.map(claim => (
                <div key={claim.id} onClick={() => setSelectedClaim(claim)} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border cursor-pointer hover:border-blue-300">
                  <div>
                    <span className="font-semibold">{claim.user_name}</span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${claim.approval_level === 2 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>L{claim.approval_level || 1}</span>
                    <p className="text-sm text-slate-500">{claim.office}</p>
                  </div>
                  <span className="font-bold">{formatCurrency(claim.total_amount, claim.currency)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedClaim && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setSelectedClaim(null)}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b flex justify-between">
                <div><h2 className="text-xl font-bold">{selectedClaim.user_name}</h2><p className="text-sm text-slate-500">{selectedClaim.claim_number}</p></div>
                <button onClick={() => setSelectedClaim(null)} className="text-2xl text-slate-400">×</button>
              </div>
              <div className="p-6">
                <button onClick={() => handleDownloadPDF(selectedClaim)} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold mb-4">📥 Download PDF</button>
                {selectedClaim.expenses?.map((exp, i) => (
                  <div key={i} className="flex justify-between py-2 border-b">
                    <span><span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded mr-2">{exp.ref}</span>{exp.merchant}</span>
                    <span className="font-semibold">{formatCurrency(exp.reimbursementAmount || exp.amount, selectedClaim.currency)}</span>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t bg-slate-50 space-y-3">
                <div className="flex gap-3">
                  <button onClick={() => setEditingClaim(selectedClaim)} className="flex-1 py-3 rounded-xl bg-purple-500 text-white font-semibold">✏️ Edit</button>
                  <button onClick={() => setShowRequestChanges(true)} className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-semibold">📝 Return</button>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleReject(selectedClaim.id)} disabled={loading} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold disabled:opacity-50">Reject</button>
                  <button onClick={() => handleApprove(selectedClaim)} disabled={loading} className="flex-[2] py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50">
                    {(selectedClaim.approval_level || 1) === 1 ? 'Approve →' : 'Final ✓'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {editingClaim && <EditClaimModal claim={editingClaim} onClose={() => setEditingClaim(null)} />}
        
        {showRequestChanges && selectedClaim && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full">
              <div className="bg-amber-500 text-white p-5"><h2 className="font-bold">📝 Request Changes</h2></div>
              <div className="p-6"><textarea className="w-full p-3 border-2 rounded-xl" rows={4} placeholder="What needs fixing?" value={changeRequestComment} onChange={(e) => setChangeRequestComment(e.target.value)} /></div>
              <div className="p-4 border-t flex gap-3">
                <button onClick={() => setShowRequestChanges(false)} className="flex-1 py-3 rounded-xl border-2 font-semibold">Cancel</button>
                <button onClick={() => handleRequestChanges(selectedClaim.id, changeRequestComment)} disabled={!changeRequestComment.trim()} className="flex-[2] py-3 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50">Send 📤</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const canReview = currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'finance' || getReviewableClaims().length > 0;

  const handleStatementAnnotationSave = (annotatedImage, annotations) => {
    setAnnotatedStatementImage(annotatedImage);
    setStatementAnnotations(annotations);
    setShowStatementAnnotator(false);
    setShowPreview(true);
  };

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
            <button onClick={() => { setCurrentUser(null); setExpenses([]); setCreditCardStatement(null); setAnnotatedStatementImage(null); setStatementAnnotations([]); setStatementImageData(null); setActiveTab('my_expenses'); }} className="bg-white/10 px-3 py-2 rounded-lg text-xs font-medium">Logout</button>
          </div>
        </div>
      </header>

      {canReview && (
        <div className="bg-white border-b sticky top-14 z-30">
          <div className="max-w-3xl mx-auto flex">
            <button onClick={() => setActiveTab('my_expenses')} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${activeTab === 'my_expenses' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>📋 My Expenses</button>
            <button onClick={() => setActiveTab('review')} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${activeTab === 'review' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
              👀 Review
              {getReviewableClaims().length > 0 && <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">{getReviewableClaims().length}</span>}
            </button>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto p-4 pb-20">
        {canReview && activeTab === 'review' ? <ReviewClaimsTab /> : <MyExpensesTab />}
      </main>

      {(showAddExpense || editingExpense) && <AddExpenseModal editExpense={editingExpense} onClose={() => { setShowAddExpense(false); setEditingExpense(null); }} />}
      {showPreview && <PreviewClaimModal />}
      {showStatementUpload && <StatementUploadModal />}
      {showStatementAnnotator && statementImageData && (
        <StatementAnnotator 
          image={statementImageData}
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
