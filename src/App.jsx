import React, { useState, useEffect, useRef } from 'react';

/*
 * BERKELEY INTERNATIONAL EXPENSE MANAGEMENT SYSTEM
 * Version: 4.8.1 - COMPLETE PRODUCTION BUILD
 * - Reverted to Full v4.3 Core (Employee List, Senior Routing, Backcharges)
 * - Restored: Full professional PDF HTML Template
 * - Feature: Enhanced Statement Gallery (Tap thumbnail to re-annotate)
 * - Guard: Strict Submission Guard (Blocks untagged CC expenses)
 */

const SUPABASE_URL = 'https://wlhoyjsicvkncfjbexoi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsaG95anNpY3ZrbmNmamJleG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNzIyMzcsImV4cCI6MjA4NTg0ODIzN30.AB-W5DjcmCl6fnWiQ2reD0rgDIJiMCGymc994fSJplw';

// --- DATABASE CLIENT ---
const headers = { 
  'apikey': SUPABASE_ANON_KEY, 
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 
  'Content-Type': 'application/json', 
  'Prefer': 'return=representation' 
};

const supabase = {
  from: (table) => ({
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
  E: { name: 'Entertaining', subcategories: ['Customers (Staff & Customers)', 'Employees (Staff only)'], icon: '🍽️', requiresAttendees: true },
  F: { name: 'Welfare', subcategories: ['Hotel Accommodation', 'Gifts to Employees', 'Corporate Gifts'], icon: '🏨', requiresAttendees: true },
  G: { name: 'Subscriptions', subcategories: ['Professional', 'Non-Professional', 'Newspapers & Magazines'], icon: '📰', requiresAttendees: false },
  H: { name: 'Computer Costs', subcategories: ['All Items'], icon: '💻', requiresAttendees: false },
  I: { name: 'WIP', subcategories: ['All Items'], icon: '📦', requiresAttendees: false },
  J: { name: 'Other', subcategories: ['Miscellaneous Vatable Items'], icon: '📋', requiresAttendees: false }
};

const CURRENCIES = ['SGD', 'HKD', 'CNY', 'THB', 'AED', 'GBP', 'USD', 'EUR', 'MYR', 'JPY', 'SAR'];

const formatCurrency = (amount, currency) => `${currency} ${parseFloat(amount || 0).toFixed(2)}`;
const formatDate = (dateStr) => { if (!dateStr) return ''; const d = new Date(dateStr); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
const formatShortDate = (dateStr) => { if (!dateStr) return ''; const d = new Date(dateStr); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }); };
const getMonthYear = (dateStr) => { if (!dateStr) return ''; const d = new Date(dateStr); return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }); };

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
  803: { level1: 805, level2: 804, level1Name: 'Ann Low Mei Yen', level2Name: 'Karen Chia Pei Ru' },
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

// --- PDF COMPONENT (RESTORED FROM v4.3) ---
const generatePDFFromHTML = (expenseList, userName, officeCode, claimNumber, submittedDate, statementImgs, reimburseCurrency, level2ApprovedBy, level2ApprovedAt) => {
  const office = OFFICES.find(o => o.code === officeCode);
  const printWindow = window.open('', '_blank');
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Berkeley Claim - ${claimNumber}</title>
        <style>
          body { font-family: 'Helvetica', sans-serif; margin: 40px; color: #333; }
          .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
          .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
          .claim-info { font-size: 14px; text-align: right; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
          th { background: #f4f4f4; border: 1px solid #ddd; padding: 10px; text-align: left; text-transform: uppercase; font-size: 10px; }
          td { border: 1px solid #ddd; padding: 10px; vertical-align: top; }
          .total-row { font-weight: bold; background: #eee; font-size: 13px; }
          .approvals { margin-top: 50px; display: grid; grid-template-cols: 1fr 1fr; gap: 40px; }
          .approval-box { border-top: 1px solid #000; padding-top: 10px; font-size: 12px; }
          .page-break { page-break-before: always; }
          .img-container { text-align: center; margin-bottom: 30px; }
          .img-container img { max-width: 100%; max-height: 850px; border: 1px solid #eee; }
          .backcharge-tag { display: inline-block; background: #000; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 9px; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Staff Expense Claim Form</h1>
            <p><strong>${office?.companyName || 'Berkeley International'}</strong></p>
          </div>
          <div class="claim-info">
            <p><strong>Name:</strong> ${userName}</p>
            <p><strong>Claim No:</strong> ${claimNumber}</p>
            <p><strong>Date:</strong> ${new Date(submittedDate).toLocaleDateString()}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Ref</th>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Original Amount</th>
              <th>Reimbursement (${reimburseCurrency})</th>
            </tr>
          </thead>
          <tbody>
            ${expenseList.map(exp => `
              <tr>
                <td>${exp.ref}</td>
                <td>${formatShortDate(exp.date)}</td>
                <td>${EXPENSE_CATEGORIES[exp.category]?.name}</td>
                <td>
                  <strong>${exp.merchant}</strong><br/>
                  ${exp.description}
                  ${exp.hasBackcharge ? `<br/><span class="backcharge-tag">BC: ${exp.backcharges?.[0]?.development}</span>` : ''}
                </td>
                <td>${exp.currency} ${exp.amount}</td>
                <td>${parseFloat(exp.reimbursementAmount || exp.amount).toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="5" style="text-align: right">GRAND TOTAL:</td>
              <td>${reimburseCurrency} ${expenseList.reduce((sum, e) => sum + parseFloat(e.reimbursementAmount || e.amount || 0), 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="approvals">
          <div class="approval-box">Employee Signature / Date</div>
          <div class="approval-box">
            Authorized by: ${level2ApprovedBy || '________________'}<br/>
            Date: ${level2ApprovedAt ? new Date(level2ApprovedAt).toLocaleDateString() : '________________'}
          </div>
        </div>

        ${statementImgs.map((img, idx) => `
          <div class="page-break"></div>
          <div class="img-container">
            <p><strong>CC Statement Page ${idx + 1}</strong></p>
            <img src="${img}" />
          </div>
        `).join('')}

        ${expenseList.filter(e => e.receiptPreview).map(e => `
          <div class="page-break"></div>
          <div class="img-container">
            <p><strong>Receipt: ${e.ref} (${e.merchant})</strong></p>
            <img src="${e.receiptPreview}" />
          </div>
        `).join('')}
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 500);
};

const ImageViewer = ({ src, onClose }) => (
  <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4" onClick={onClose}>
    <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white w-12 h-12 rounded-full text-2xl">✕</button>
    <img src={src} alt="Full size" className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
  </div>
);

const StatementAnnotator = ({ image, expenses, existingAnnotations = [], onSave, onCancel, pageIndex }) => {
  const canvasRef = useRef(null);
  const [annotations, setAnnotations] = useState(existingAnnotations);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
  const [baseImage, setBaseImage] = useState(null);

  useEffect(() => {
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

  useEffect(() => {
    if (!imageLoaded || !baseImage) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = imgDimensions.width;
    canvas.height = imgDimensions.height;
    ctx.drawImage(baseImage, 0, 0, imgDimensions.width, imgDimensions.height);
    annotations.forEach(ann => {
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
  }, [annotations, imageLoaded, baseImage, imgDimensions]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: x - rect.left, y: y - rect.top };
  };

  const findAnnotationAt = (pos) => {
    const hs = 15;
    for (let i = annotations.length - 1; i >= 0; i--) {
      const a = annotations[i];
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
      setAnnotations(prev => [...prev.filter(a => a.ref !== selectedLabel), { ref: selectedLabel, x: pos.x - 50, y: pos.y - 15, width: 100, height: 30, pageIndex }]);
      setSelectedLabel(null);
    }
  };

  const handleMove = (e) => {
    const pos = getPos(e);
    if (dragging !== null) {
      setAnnotations(prev => prev.map((a, i) => i === dragging.index ? { ...a, x: pos.x - dragging.offsetX, y: pos.y - dragging.offsetY } : a));
    } else if (resizing !== null) {
      const { index, corner, startX, startY, origAnn } = resizing;
      const dx = pos.x - startX, dy = pos.y - startY;
      setAnnotations(prev => prev.map((a, i) => {
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
  const removeAnnotation = (ref) => setAnnotations(prev => prev.filter(a => a.ref !== ref));
  const handleSave = () => onSave(canvasRef.current.toDataURL('image/png'), annotations);

  const foreignExpenses = expenses.filter(e => e.isForeignCurrency);

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col z-[100]">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-3 flex justify-between items-center shrink-0">
        <div><h2 className="text-base font-bold">📝 Annotate Page {pageIndex + 1}</h2></div>
        <button onClick={onCancel} className="w-8 h-8 rounded-full bg-white/20">✕</button>
      </div>
      <div className="bg-white p-3 shrink-0 max-h-[35vh] overflow-auto">
        <p className="font-semibold mb-2 text-sm">Select label to place:</p>
        <div className="flex flex-wrap gap-2">
          {foreignExpenses.map(exp => {
            const isPlaced = annotations.some(a => a.ref === exp.ref);
            const isSelected = selectedLabel === exp.ref;
            return (
              <button key={exp.ref} onClick={() => setSelectedLabel(isSelected ? null : exp.ref)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium text-left ${isSelected ? 'bg-orange-500 text-white ring-2 ring-orange-300' : isPlaced ? 'bg-green-100 text-green-700 border-2 border-green-400' : 'bg-slate-100 text-slate-700'}`}>
                <div className="font-bold">{exp.ref} - {exp.merchant}</div>
                <div className={`text-[10px] ${isSelected ? 'text-orange-100' : isPlaced ? 'text-green-600' : 'text-slate-500'}`}>
                  {exp.currency} ${exp.amount} → ${exp.reimbursementAmount}
                </div>
                {isPlaced && <span className="ml-1 text-xs" onClick={(e) => { e.stopPropagation(); removeAnnotation(exp.ref); }}>✕</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-slate-800 p-2">
        {imageLoaded && (
          <canvas ref={canvasRef}
            onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd} onMouseLeave={handleEnd}
            onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
            className={`border-2 ${selectedLabel ? 'border-orange-400' : 'border-slate-500'} rounded-lg mx-auto`}
          />
        )}
      </div>
      <div className="bg-slate-100 p-3 flex gap-3 justify-end shrink-0">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl border-2 border-slate-300 font-semibold text-sm">Cancel</button>
        <button onClick={handleSave} className="px-4 py-2 rounded-xl bg-green-600 text-white font-semibold text-sm">Save ✓</button>
      </div>
    </div>
  );
};

const StatementUploadModal = ({ existingImages, onClose, onContinue, onEditExisting }) => {
    const [localStatements, setLocalStatements] = useState([...existingImages]);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => { 
      const file = e.target.files[0]; 
      if (!file) return;
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        setLocalStatements(prev => [...prev, event.target.result]);
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="bg-amber-500 text-white p-5 shrink-0">
            <h2 className="text-lg font-bold">💳 Credit Card Statements</h2>
            <p className="text-amber-100 text-sm">Tap a page thumbnail to re-annotate tags</p>
          </div>
          <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
            <div className="grid grid-cols-2 gap-4">
              {localStatements.map((img, idx) => (
                <div key={idx} className="relative group border-2 border-white rounded-xl overflow-hidden shadow cursor-pointer" onClick={() => onEditExisting(idx, localStatements)}>
                  <img src={img} className="w-full h-32 object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold">RE-ANNOTATE</div>
                  <button onClick={(e) => { e.stopPropagation(); setLocalStatements(prev => prev.filter((_, i) => i !== idx)); }} className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full text-xs">✕</button>
                  <div className="absolute bottom-0 left-0 right-0 bg-amber-600 text-white text-[10px] font-bold text-center py-1">Page {idx + 1}</div>
                </div>
              ))}
              <div onClick={() => fileInputRef.current.click()} className="border-3 border-dashed border-slate-300 rounded-xl h-32 flex flex-col items-center justify-center bg-white hover:border-amber-400 cursor-pointer">
                {isProcessing ? <span className="animate-pulse">Loading...</span> : <><span className="text-3xl">➕</span><span className="text-xs font-bold text-slate-400">Add Page</span></>}
              </div>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
            </div>
          </div>
          <div className="p-4 border-t bg-white flex gap-3 shrink-0">
            <button onClick={onClose} className="flex-1 py-3 border-2 rounded-xl font-bold">Cancel</button>
            <button onClick={() => onContinue(localStatements)} className="flex-[2] py-3 bg-green-600 text-white rounded-xl font-bold">Finish Upload →</button>
          </div>
        </div>
      </div>
    );
};

export default function BerkeleyExpenseSystem() {
  const [currentUser, setCurrentUser] = useState(() => { try { const saved = localStorage.getItem('berkeley_current_user'); return saved ? JSON.parse(saved) : null; } catch (e) { return null; } });
  const [expenses, setExpenses] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showStatementUpload, setShowStatementUpload] = useState(false);
  const [showStatementAnnotator, setShowStatementAnnotator] = useState(false);
  const [statementImages, setStatementImages] = useState([]); 
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

  const loadDrafts = async () => {
    if (!currentUser) return;
    const { data } = await supabase.from('user_drafts').select('*').eq('user_id', currentUser.id);
    if (data?.[0]) {
      if (data[0].expenses) setExpenses(JSON.parse(data[0].expenses));
      if (data[0].statements) setAnnotatedStatements(JSON.parse(data[0].statements));
    }
  };

  useEffect(() => { loadDrafts(); }, [currentUser]);

  const saveDrafts = async () => {
    if (!currentUser) return;
    const draftData = { user_id: currentUser.id, expenses: JSON.stringify(expenses), statements: JSON.stringify(annotatedStatements), updated_at: new Date().toISOString() };
    const { data } = await supabase.from('user_drafts').select('id').eq('user_id', currentUser.id);
    if (data?.length > 0) await supabase.from('user_drafts').update(draftData).eq('user_id', currentUser.id);
    else await supabase.from('user_drafts').insert([draftData]);
  };

  useEffect(() => { const t = setTimeout(saveDrafts, 1000); return () => clearTimeout(t); }, [expenses, annotatedStatements]);

  const loadClaims = async () => {
    setLoading(true);
    const { data } = await supabase.from('claims').select('*');
    if (data) setClaims(data);
    setLoading(false);
  };

  useEffect(() => { if (currentUser) loadClaims(); }, [currentUser]);

  const userOffice = OFFICES.find(o => o.code === currentUser?.office);
  const getUserReimburseCurrency = (user) => user?.reimburseCurrency || OFFICES.find(o => o.code === user?.office)?.currency;
  const pendingExpenses = expenses.filter(e => e.status === 'draft');
  const reimbursementTotal = pendingExpenses.reduce((sum, e) => sum + parseFloat(e.reimbursementAmount || e.amount || 0), 0);
  const foreignCurrencyExpenses = pendingExpenses.filter(e => e.isForeignCurrency);
  const hasForeignCurrency = foreignCurrencyExpenses.length > 0;

  const handleLogin = () => { 
    if (passwordInput === selectedEmployee.password) { 
      setCurrentUser(selectedEmployee);
      localStorage.setItem('berkeley_current_user', JSON.stringify(selectedEmployee));
      setLoginStep('select'); setPasswordInput(''); 
    } else { setLoginError('Incorrect password.'); } 
  };

  const handleDownloadPDF = async (claim) => {
    setDownloading(true);
    const emp = EMPLOYEES.find(e => e.id === claim.user_id);
    generatePDFFromHTML(claim.expenses || [], claim.user_name, emp?.office, claim.claim_number, claim.submitted_at, claim.annotated_statements || [], claim.currency, claim.level2_approved_by, claim.level2_approved_at);
    setDownloading(false);
  };

  const handleDownloadPreviewPDF = async () => {
    setDownloading(true);
    generatePDFFromHTML(pendingExpenses, currentUser.name, currentUser.office, 'DRAFT', new Date().toISOString(), annotatedStatements, getUserReimburseCurrency(currentUser), null, null);
    setDownloading(false);
  };

  const handleSubmitClaim = async () => {
    // --- SUBMISSION GUARD ---
    const untaggedRefs = foreignCurrencyExpenses.filter(e => !statementAnnotations.some(a => a.ref === e.ref)).map(e => e.ref);
    if (untaggedRefs.length > 0) {
      alert(`⚠️ SUBMISSION BLOCKED\n\nCC items must be tagged on the statement.\nMissing: ${untaggedRefs.join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      const workflow = getApprovalWorkflow(currentUser.id, currentUser.office);
      const isSelfSubmit = workflow?.selfSubmit === true;
      const claimData = { 
        claim_number: `${currentUser.name.split(' ')[0]}-${new Date().getFullYear()}-${Date.now().toString().slice(-3)}`, 
        user_id: currentUser.id, 
        user_name: currentUser.name, 
        office_code: currentUser.office, 
        currency: getUserReimburseCurrency(currentUser), 
        total_amount: reimbursementTotal, 
        status: isSelfSubmit ? 'approved' : 'pending_review', 
        approval_level: isSelfSubmit ? 2 : 1, 
        level1_approver: workflow?.level1, 
        level2_approver: workflow?.level2, 
        expenses: pendingExpenses, 
        annotated_statements: annotatedStatements, 
        submitted_at: new Date().toISOString() 
      };
      await supabase.from('claims').insert([claimData]);
      setExpenses([]); setAnnotatedStatements([]); setStatementAnnotations([]);
      await loadClaims(); alert('✅ Submitted!'); 
    } catch (err) { alert(`❌ Failed: ${err.message}`); }
    setLoading(false);
    setShowPreview(false);
  };

  const AddExpenseModal = ({ editExpense = null, expenses = [], onClose }) => {
    const [step, setStep] = useState(editExpense ? 2 : 1);
    const [receiptPreview, setReceiptPreview] = useState(editExpense?.receiptPreview || null);
    const userReimburseCurrency = getUserReimburseCurrency(currentUser);
    const [formData, setFormData] = useState(editExpense || { merchant: '', amount: '', currency: userOffice?.currency || 'SGD', date: new Date().toISOString().split('T')[0], category: 'C', description: '', reimbursementAmount: '', hasBackcharge: false, backcharges: [] });
    
    const isForeignCurrency = formData.currency !== userReimburseCurrency;
    const [duplicateWarning, setDuplicateWarning] = useState(null);

    useEffect(() => {
        if (!formData.amount || !formData.date || !formData.currency) return;
        const found = expenses.filter(e => e.id !== editExpense?.id).find(e => parseFloat(e.amount) === parseFloat(formData.amount) && e.date === formData.date && e.currency === formData.currency);
        if (found) setDuplicateWarning(`⚠️ Duplicate amount/date detected.`);
        else setDuplicateWarning(null);
    }, [formData.amount, formData.date, formData.currency]);

    const handleSave = () => {
      if (duplicateWarning && !window.confirm("Duplicate detected. Save anyway?")) return;
      const data = { ...formData, id: editExpense?.id || Date.now(), reimbursementAmount: isForeignCurrency ? parseFloat(formData.reimbursementAmount) : parseFloat(formData.amount), receiptPreview, status: 'draft', isForeignCurrency };
      setExpenses(prev => sortAndReassignRefs(editExpense ? prev.map(e => e.id === editExpense.id ? data : e) : [...prev, data]));
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
          <div className="bg-blue-600 text-white p-5 flex justify-between">
            <h2 className="font-bold">{editExpense ? 'Edit' : 'Add'} Expense</h2>
            <button onClick={onClose}>✕</button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {step === 1 ? (
              <div className="space-y-4">
                <button onClick={() => setStep(2)} className="w-full p-8 border-2 border-dashed rounded-xl text-center">📸 Skip Photo / Continue</button>
                <input type="file" onChange={(e) => { const r = new FileReader(); r.onload = (ev) => { setReceiptPreview(ev.target.result); setStep(2); }; r.readAsDataURL(e.target.files[0]); }} />
              </div>
            ) : (
              <div className="space-y-4">
                {duplicateWarning && <div className="bg-red-50 text-red-600 p-2 text-xs font-bold rounded">{duplicateWarning}</div>}
                <input className="w-full p-3 border rounded-xl" placeholder="Merchant" value={formData.merchant} onChange={e => setFormData({...formData, merchant: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" className="p-3 border rounded-xl" placeholder="Amount" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                  <select className="p-3 border rounded-xl" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {isForeignCurrency && <input type="number" className="w-full p-3 border-amber-400 bg-amber-50 rounded-xl" placeholder={`Amount in ${userReimburseCurrency}`} value={formData.reimbursementAmount} onChange={e => setFormData({...formData, reimbursementAmount: e.target.value})} />}
                <div className="grid grid-cols-2 gap-4">
                  <input type="date" className="p-3 border rounded-xl" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  <select className="p-3 border rounded-xl" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.name}</option>)}
                  </select>
                </div>
                <textarea className="w-full p-3 border rounded-xl" placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
            )}
          </div>
          <div className="p-4 border-t bg-slate-50">
            {step === 2 && (
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 border rounded-xl">Back</button>
                <button onClick={handleSave} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold">Save ✓</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const sortAndReassignRefs = (list) => {
    const sorted = [...list].sort((a,b) => new Date(a.date) - new Date(b.date));
    const counts = {};
    return sorted.map(e => { counts[e.category] = (counts[e.category] || 0) + 1; return { ...e, ref: `${e.category}${counts[e.category]}` }; });
  };

  const ReviewClaimsTab = () => {
    const reviewable = claims.filter(c => (c.status === 'pending_review' || c.status === 'pending_level2') && canUserReviewClaim(currentUser.id, c));
    return (
      <div className="space-y-4">
        {reviewable.length === 0 ? <p className="text-center py-12 text-slate-400">No pending reviews</p> : reviewable.map(claim => (
          <div key={claim.id} onClick={() => setSelectedClaim(claim)} className="bg-white p-4 rounded-xl shadow-md border cursor-pointer hover:border-blue-400">
            <div className="font-bold text-slate-800">{claim.user_name}</div>
            <div className="text-xs text-slate-400">{claim.claim_number}</div>
            <div className="font-bold text-blue-600 mt-1">{formatCurrency(claim.total_amount, claim.currency)}</div>
          </div>
        ))}
        {selectedClaim && (
           <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
             <div className="bg-white rounded-2xl w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl">
               <div className="p-4 border-b flex justify-between items-center"><b>Review Claim</b><button onClick={() => setSelectedClaim(null)}>✕</button></div>
               <div className="p-4 overflow-auto flex-1 bg-slate-50">
                 <button className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl mb-4" onClick={() => handleDownloadPDF(selectedClaim)}>📥 Download Claim PDF</button>
                 {selectedClaim.expenses?.map((e, idx) => (
                   <div key={idx} className="p-3 border-b text-sm flex justify-between bg-white rounded-lg mb-1 shadow-sm">
                     <span>{e.ref} - {e.merchant}</span>
                     <b>{formatCurrency(e.reimbursementAmount || e.amount, selectedClaim.currency)}</b>
                   </div>
                 ))}
               </div>
               <div className="p-4 flex gap-3">
                 <button className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl" onClick={() => handleReject(selectedClaim.id)}>Reject</button>
                 <button className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl" onClick={() => handleApprove(selectedClaim)}>Approve</button>
               </div>
             </div>
           </div>
        )}
      </div>
    );
  };

  const handleApprove = async (claim) => {
    const level = claim.approval_level || 1;
    await supabase.from('claims').update({ 
        status: level === 1 ? 'pending_level2' : 'approved', 
        approval_level: level === 1 ? 2 : 2,
        level2_approved_by: currentUser.name, 
        level2_approved_at: new Date().toISOString() 
    }).eq('id', claim.id);
    await loadClaims(); setSelectedClaim(null);
  };

  const handleReject = async (id) => {
    await supabase.from('claims').update({ status: 'changes_requested' }).eq('id', id);
    await loadClaims(); setSelectedClaim(null);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <h1 className="text-3xl font-black text-center mb-8 text-slate-800">Berkeley <span className="text-blue-600">Expenses</span></h1>
          {loginStep === 'select' ? (
            <select className="w-full p-4 border-2 rounded-xl" onChange={(e) => { setSelectedEmployee(EMPLOYEES.find(emp => emp.id === parseInt(e.target.value))); setLoginStep('password'); }}>
              <option value="">-- Select Your Name --</option>
              {EMPLOYEES.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          ) : (
            <div className="space-y-4">
              <p className="font-bold text-center">{selectedEmployee.name}</p>
              <input type="password" placeholder="Password" className="w-full p-4 border-2 rounded-xl" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleLogin()} autoFocus />
              <button onClick={handleLogin} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold">Unlock</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-40 flex justify-between items-center shadow-lg">
        <div><div className="text-[10px] text-blue-400 font-black uppercase">Berkeley Group</div><div className="font-bold">{currentUser.name}</div></div>
        <button className="bg-white/10 px-4 py-2 rounded-lg text-xs font-bold" onClick={() => { localStorage.clear(); window.location.reload(); }}>Logout</button>
      </header>
      <div className="bg-white border-b sticky top-[60px] z-30 flex shadow-sm">
        <button onClick={() => setActiveTab('my_expenses')} className={`flex-1 py-4 text-xs font-bold uppercase border-b-4 transition-all ${activeTab === 'my_expenses' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>My Drafts</button>
        <button onClick={() => setActiveTab('review')} className={`flex-1 py-4 text-xs font-bold uppercase border-b-4 transition-all ${activeTab === 'review' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>Review Claims</button>
      </div>
      <main className="max-w-3xl mx-auto p-4">
        {activeTab === 'my_expenses' ? (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-2xl shadow-md flex gap-3">
              <button onClick={() => setShowAddExpense(true)} className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-black shadow-lg">Add Receipt</button>
              <button onClick={() => setShowPreview(true)} disabled={pendingExpenses.length === 0} className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black">Submit Claim</button>
            </div>
            <div className="space-y-2">
              {pendingExpenses.map(exp => (
                <div key={exp.id} className="bg-white p-4 rounded-xl border flex justify-between items-center shadow-sm">
                  <div>
                    <div className="font-bold text-slate-800"><span className="text-blue-600 mr-1">{exp.ref}</span> {exp.merchant}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-black">{exp.description}</div>
                  </div>
                  <div className="text-right font-black text-green-700">{formatCurrency(exp.reimbursementAmount || exp.amount, getUserReimburseCurrency(currentUser))}</div>
                </div>
              ))}
            </div>
          </div>
        ) : <ReviewClaimsTab />}
      </main>
      
      {showAddExpense && <AddExpenseModal onClose={() => setShowAddExpense(false)} expenses={expenses} />}
      
      {showPreview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center"><b>Preview Claim Package</b><button onClick={() => setShowPreview(false)}>✕</button></div>
            <div className="p-6 overflow-auto flex-1 bg-slate-50">
               <div className="bg-white p-5 rounded-2xl shadow-sm mb-6 flex justify-between items-center"><b>Total Amount:</b><b className="text-2xl text-blue-600">{formatCurrency(reimbursementTotal, getUserReimburseCurrency(currentUser))}</b></div>
               {hasForeignCurrency && (
                  <div className={`p-5 rounded-2xl border-4 mb-6 transition-all ${annotatedStatements.length > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-300 shadow-lg'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <div className="font-bold text-sm">{annotatedStatements.length > 0 ? '✅ Statement Attached' : '❌ Statement Required'}</div>
                      <button className="bg-amber-500 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg" onClick={() => { setShowPreview(false); setShowStatementUpload(true); }}>{annotatedStatements.length > 0 ? 'Edit Tags' : 'Manage Statement'}</button>
                    </div>
                  </div>
               )}
            </div>
            <div className="p-5 border-t bg-white flex gap-3">
               <button className="flex-1 py-4 border-2 rounded-2xl font-bold text-slate-400" onClick={() => setShowPreview(false)}>Back</button>
               <button className={`flex-[2] py-4 rounded-2xl font-bold text-white shadow-xl ${(!hasForeignCurrency || annotatedStatements.length > 0) ? 'bg-green-600' : 'bg-slate-300 opacity-50'}`} onClick={handleSubmitClaim}>Confirm & Submit ✓</button>
            </div>
          </div>
        </div>
      )}

      {showStatementUpload && (
        <StatementUploadModal 
          existingImages={statementImages} 
          onClose={() => setShowStatementUpload(false)} 
          onContinue={(imgs) => { setStatementImages(imgs); setAnnotatedStatements(imgs); setShowStatementUpload(false); setShowPreview(true); }}
          onEditExisting={(idx, imgs) => { setStatementImages(imgs); setCurrentStatementIndex(idx); setShowStatementUpload(false); setShowStatementAnnotator(true); }}
        />
      )}

      {showStatementAnnotator && (
        <StatementAnnotator 
          image={statementImages[currentStatementIndex]} 
          expenses={pendingExpenses} 
          existingAnnotations={statementAnnotations.filter(a => a.pageIndex === currentStatementIndex)} 
          pageIndex={currentStatementIndex}
          onSave={(img, anns) => { 
            const newAnns = [...statementAnnotations.filter(a => a.pageIndex !== currentStatementIndex), ...anns];
            const newAnnotated = [...annotatedStatements];
            newAnnotated[currentStatementIndex] = img;
            setStatementAnnotations(newAnns);
            setAnnotatedStatements(newAnnotated);
            setShowStatementAnnotator(false);
            setShowPreview(true);
          }}
          onCancel={() => { setShowStatementAnnotator(false); setShowPreview(true); }}
        />
      )}
    </div>
  );
}

const formatShortDate = (dateStr) => { if (!dateStr) return ''; const d = new Date(dateStr); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }); };