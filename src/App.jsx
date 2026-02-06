import React, { useState, useEffect } from 'react';

/*
 * ============================================
 * BERKELEY INTERNATIONAL EXPENSE MANAGEMENT SYSTEM
 * Version: 1.5 - With PDF Download & Receipt Images
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
// PDF GENERATION FUNCTION
// ============================================
const generatePDF = async (expenseList, userName, officeName, claimNumber, submittedDate, creditCardStatementName) => {
  // Dynamically load jsPDF
  const { jsPDF } = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  
  // Group expenses by category
  const groupedExpenses = expenseList.reduce((acc, exp) => {
    if (!acc[exp.category]) acc[exp.category] = [];
    acc[exp.category].push(exp);
    return acc;
  }, {});

  // Calculate totals
  const getSubcategoryTotal = (cat, subcat) => {
    return (groupedExpenses[cat] || [])
      .filter(e => e.subcategory === subcat)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const getCategoryTotal = (cat) => {
    return (groupedExpenses[cat] || []).reduce((sum, e) => sum + e.amount, 0);
  };

  const totalAmount = expenseList.reduce((sum, e) => sum + e.amount, 0);
  const currencies = [...new Set(expenseList.map(e => e.currency))];
  const claimMonth = expenseList.length > 0 ? getMonthYear(expenseList[0].date) : '';

  // ===== PAGE 1: Summary =====
  let y = margin;
  
  // Header with logo placeholder
  doc.setFillColor(26, 35, 126); // Dark blue
  doc.rect(margin, y, contentWidth, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('B', margin + 8, y + 16);
  doc.setFontSize(14);
  doc.text('Motor & Expense Claim Form', margin + 25, y + 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Berkeley London Residential Ltd', margin + 25, y + 20);
  y += 30;

  // Employee Info Box
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(150, 150, 150);
  doc.rect(margin, y, contentWidth, 25);
  doc.line(margin + contentWidth/2, y, margin + contentWidth/2, y + 25);
  doc.line(margin, y + 12.5, margin + contentWidth, y + 12.5);
  
  doc.setFontSize(10);
  doc.text('Name:', margin + 3, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 51, 153);
  doc.text(userName, margin + 25, y + 8);
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text('Office:', margin + 3, y + 20);
  doc.setFont('helvetica', 'bold');
  doc.text(officeName, margin + 25, y + 20);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Month:', margin + contentWidth/2 + 3, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.text(claimMonth, margin + contentWidth/2 + 25, y + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Claim #:', margin + contentWidth/2 + 3, y + 20);
  doc.setFont('helvetica', 'bold');
  doc.text(claimNumber || 'DRAFT', margin + contentWidth/2 + 25, y + 20);
  
  y += 30;

  // Expenses Table Header
  doc.setFillColor(200, 200, 200);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text('Expenses Claim', margin + contentWidth/2 - 15, y + 5.5);
  y += 8;

  // Motor Vehicle Expenditure Section
  doc.setFillColor(230, 230, 230);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Motor Vehicle Expenditure', margin + 3, y + 5);
  y += 7;

  const drawExpenseRow = (code, category, subcategory, amount, isSubRow = false) => {
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, y, contentWidth, 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    
    if (!isSubRow) {
      doc.text(code, margin + 2, y + 4);
      doc.setTextColor(0, 51, 153);
      doc.text(category, margin + 12, y + 4);
    }
    doc.setTextColor(0, 0, 0);
    doc.text(subcategory, margin + 55, y + 4);
    doc.text(amount.toFixed(2), margin + contentWidth - 25, y + 4, { align: 'right' });
    y += 6;
  };

  drawExpenseRow('A.', 'Petrol Expenditure', 'Full Petrol Allowance / Fuel Card', getCategoryTotal('A'));
  drawExpenseRow('', '', 'Business Mileage Return', 0, true);
  drawExpenseRow('B.', 'Parking', 'Off-Street Parking', getCategoryTotal('B'));
  drawExpenseRow('C.', 'Travel Expenses', 'Public Transport', getSubcategoryTotal('C', 'Public Transport'));
  drawExpenseRow('', '', 'Taxis', getSubcategoryTotal('C', 'Taxis'), true);
  drawExpenseRow('', '', 'Tolls', getSubcategoryTotal('C', 'Tolls'), true);
  drawExpenseRow('', '', 'Congestion Charging', getSubcategoryTotal('C', 'Congestion Charging'), true);
  drawExpenseRow('', '', 'Subsistence', getSubcategoryTotal('C', 'Subsistence'), true);
  drawExpenseRow('D.', 'Vehicle Repairs', 'Repairs', getSubcategoryTotal('D', 'Repairs'));
  drawExpenseRow('', '', 'Parts', getSubcategoryTotal('D', 'Parts'), true);

  // Business Expenditure Section
  doc.setFillColor(230, 230, 230);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Business Expenditure', margin + 3, y + 5);
  y += 7;

  drawExpenseRow('E.', 'Entertaining', 'Customers (Staff & Customers)', getSubcategoryTotal('E', 'Customers (Staff & Customers)'));
  drawExpenseRow('', '', 'Employees Only', getSubcategoryTotal('E', 'Employees Only'), true);
  drawExpenseRow('F.', 'Welfare', 'Hotel Accommodation', getSubcategoryTotal('F', 'Hotel Accommodation'));
  drawExpenseRow('', '', 'Gifts to Employees', getSubcategoryTotal('F', 'Gifts to Employees'), true);
  drawExpenseRow('', '', 'Corporate Gifts', getSubcategoryTotal('F', 'Corporate Gifts'), true);
  drawExpenseRow('G.', 'Subscriptions', 'Professional / Non-Professional', getCategoryTotal('G'));
  drawExpenseRow('H.', 'Computer Costs', 'All items', getCategoryTotal('H'));
  drawExpenseRow('I.', 'WIP / Other', 'All items', getCategoryTotal('I'));

  // Total Row
  doc.setFillColor(220, 235, 250);
  doc.rect(margin, y, contentWidth, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Total expenses claimed', margin + 3, y + 7);
  doc.setTextColor(0, 51, 153);
  doc.text(`${currencies[0] || 'AED'} ${totalAmount.toFixed(2)}`, margin + contentWidth - 25, y + 7, { align: 'right' });
  y += 15;

  // Signature Section
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Signature of Claimant:', margin, y + 5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(0, 51, 153);
  doc.text(userName, margin + 40, y + 5);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text('Date:', margin + 100, y + 5);
  doc.text(submittedDate || formatDate(new Date().toISOString()), margin + 115, y + 5);
  
  y += 12;
  doc.text('Authorised:', margin, y + 5);
  doc.setDrawColor(150, 150, 150);
  doc.line(margin + 25, y + 6, margin + 80, y + 6);

  // ===== PAGE 2: Travel Expense Detail =====
  doc.addPage();
  y = margin;

  doc.setFillColor(26, 35, 126);
  doc.rect(margin, y, contentWidth, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Travel Expense Detail', margin + contentWidth/2, y + 8, { align: 'center' });
  y += 15;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${userName}`, margin, y);
  y += 8;

  // Travel table header
  const travelCols = ['Ref', 'B.Parking', 'Pub.Trans', 'Taxis', 'Tolls', 'Cong', 'Subsist', 'Repairs', 'Parts', 'Description'];
  const travelColWidths = [12, 18, 18, 18, 15, 15, 18, 18, 15, 45];
  
  doc.setFillColor(200, 200, 200);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  let xPos = margin;
  travelCols.forEach((col, i) => {
    doc.text(col, xPos + 1, y + 5);
    xPos += travelColWidths[i];
  });
  y += 7;

  // Travel expenses rows
  const travelExpenses = [...(groupedExpenses['B'] || []), ...(groupedExpenses['C'] || []), ...(groupedExpenses['D'] || [])];
  doc.setFont('helvetica', 'normal');
  
  travelExpenses.forEach(exp => {
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, y, contentWidth, 6);
    xPos = margin;
    doc.setFontSize(7);
    
    doc.setTextColor(0, 51, 153);
    doc.setFont('helvetica', 'bold');
    doc.text(exp.ref, xPos + 1, y + 4);
    xPos += travelColWidths[0];
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(exp.category === 'B' ? exp.amount.toFixed(2) : '', xPos + 1, y + 4);
    xPos += travelColWidths[1];
    doc.text(exp.subcategory === 'Public Transport' ? exp.amount.toFixed(2) : '', xPos + 1, y + 4);
    xPos += travelColWidths[2];
    doc.text(exp.subcategory === 'Taxis' ? exp.amount.toFixed(2) : '', xPos + 1, y + 4);
    xPos += travelColWidths[3];
    doc.text(exp.subcategory === 'Tolls' ? exp.amount.toFixed(2) : '', xPos + 1, y + 4);
    xPos += travelColWidths[4];
    doc.text(exp.subcategory === 'Congestion Charging' ? exp.amount.toFixed(2) : '', xPos + 1, y + 4);
    xPos += travelColWidths[5];
    doc.text(exp.subcategory === 'Subsistence' ? exp.amount.toFixed(2) : '', xPos + 1, y + 4);
    xPos += travelColWidths[6];
    doc.text(exp.subcategory === 'Repairs' ? exp.amount.toFixed(2) : '', xPos + 1, y + 4);
    xPos += travelColWidths[7];
    doc.text(exp.subcategory === 'Parts' ? exp.amount.toFixed(2) : '', xPos + 1, y + 4);
    xPos += travelColWidths[8];
    doc.text(exp.description?.substring(0, 30) || '', xPos + 1, y + 4);
    
    y += 6;
  });

  // ===== PAGE 3: Entertaining & Welfare Detail =====
  doc.addPage();
  y = margin;

  doc.setFillColor(26, 35, 126);
  doc.rect(margin, y, contentWidth, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Entertaining and Welfare Detail', margin + contentWidth/2, y + 8, { align: 'center' });
  y += 15;

  // Warning box
  doc.setFillColor(255, 250, 230);
  doc.setDrawColor(255, 180, 0);
  doc.rect(margin, y, contentWidth, 10, 'FD');
  doc.setTextColor(150, 100, 0);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('PLEASE ENSURE A FULL LIST OF GUESTS ENTERTAINED ARE SUPPLIED WITH EACH RECEIPT', margin + 3, y + 6);
  y += 13;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${userName}`, margin, y);
  y += 8;

  // Entertaining table header
  const entCols = ['Ref', 'Emp.Meals', 'Bus.Meals', 'Hotels', 'Emp.Gifts', 'Corp.Gifts', 'Description/Attendees'];
  const entColWidths = [12, 20, 20, 18, 20, 20, 70];
  
  doc.setFillColor(200, 200, 200);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  xPos = margin;
  entCols.forEach((col, i) => {
    doc.text(col, xPos + 1, y + 5);
    xPos += entColWidths[i];
  });
  y += 7;

  // Entertaining expenses rows
  const entertainingExpenses = [...(groupedExpenses['E'] || []), ...(groupedExpenses['F'] || [])];
  doc.setFont('helvetica', 'normal');
  
  entertainingExpenses.forEach(exp => {
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, y, contentWidth, 6);
    xPos = margin;
    doc.setFontSize(7);
    
    const isEmployeeEntertaining = exp.category === 'E' && exp.subcategory?.includes('Employee');
    const isBusinessEntertaining = exp.category === 'E' && exp.subcategory?.includes('Customer');
    const isHotel = exp.category === 'F' && exp.subcategory?.includes('Hotel');
    const isEmployeeGift = exp.category === 'F' && exp.subcategory?.includes('Gifts to Employees');
    const isCorporateGift = exp.category === 'F' && exp.subcategory?.includes('Corporate');
    
    doc.setTextColor(0, 51, 153);
    doc.setFont('helvetica', 'bold');
    doc.text(exp.ref, xPos + 1, y + 4);
    xPos += entColWidths[0];
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(isEmployeeEntertaining ? exp.amount.toFixed(2) : '', xPos + 1, y + 4);
    xPos += entColWidths[1];
    doc.text(isBusinessEntertaining ? exp.amount.toFixed(2) : '', xPos + 1, y + 4);
    xPos += entColWidths[2];
    doc.text(isHotel ? exp.amount.toFixed(2) : '', xPos + 1, y + 4);
    xPos += entColWidths[3];
    doc.text(isEmployeeGift ? exp.amount.toFixed(2) : '', xPos + 1, y + 4);
    xPos += entColWidths[4];
    doc.text(isCorporateGift ? exp.amount.toFixed(2) : '', xPos + 1, y + 4);
    xPos += entColWidths[5];
    
    const descText = `${exp.merchant}${exp.attendees ? ' - ' + exp.attendees : ''}`;
    doc.text(descText.substring(0, 45), xPos + 1, y + 4);
    
    y += 6;
  });

  // ===== PAGE 4+: Receipt Images =====
  // Add each receipt image on its own page
  for (const exp of expenseList) {
    doc.addPage();
    y = margin;

    // Header for receipt page
    doc.setFillColor(26, 35, 126);
    doc.rect(margin, y, contentWidth, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(exp.ref, margin + 10, y + 14);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${exp.merchant} | ${formatCurrency(exp.amount, exp.currency)} | ${formatShortDate(exp.date)}`, margin + 35, y + 10);
    doc.text(exp.description || '', margin + 35, y + 16);
    y += 25;

    // Try to add the receipt image
    if (exp.receiptPreview) {
      try {
        // Calculate image dimensions to fit the page
        const maxWidth = contentWidth;
        const maxHeight = pageHeight - y - margin - 10;
        
        // Add the image
        doc.addImage(exp.receiptPreview, 'JPEG', margin, y, maxWidth, maxHeight, undefined, 'FAST');
      } catch (err) {
        // If image fails, show placeholder
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, y, contentWidth, 100, 'F');
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(14);
        doc.text('Receipt image not available', margin + contentWidth/2, y + 50, { align: 'center' });
      }
    } else {
      // No image - show placeholder
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, contentWidth, 100, 'F');
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(14);
      doc.text('Receipt image not available', margin + contentWidth/2, y + 50, { align: 'center' });
    }
  }

  // If there's a credit card statement, add a note page
  if (creditCardStatementName) {
    doc.addPage();
    y = margin;
    
    doc.setFillColor(255, 180, 0);
    doc.rect(margin, y, contentWidth, 15, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Credit Card Statement', margin + contentWidth/2, y + 10, { align: 'center' });
    y += 20;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Attached file: ${creditCardStatementName}`, margin, y);
    doc.text('(Statement uploaded separately)', margin, y + 8);
  }

  // Save the PDF
  const fileName = `${claimNumber || 'ExpenseClaim'}_${userName.replace(/\s+/g, '_')}_${formatDate(submittedDate || new Date().toISOString()).replace(/\s+/g, '')}.pdf`;
  doc.save(fileName);
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

  useEffect(() => {
    if (currentUser) {
      loadClaims();
    }
  }, [currentUser]);

  // Derived values
  const getUserOffice = (user) => OFFICES.find(o => o.code === user?.office);
  const userOffice = getUserOffice(currentUser);
  const pendingExpenses = expenses.filter(e => e.status === 'draft');
  
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
  // DOWNLOAD PDF HANDLER
  // ============================================
  const handleDownloadPDF = async (claim) => {
    setDownloading(true);
    try {
      const employee = EMPLOYEES.find(e => e.id === claim.user_id);
      const office = OFFICES.find(o => employee && o.code === employee.office);
      await generatePDF(
        claim.expenses || [],
        claim.user_name,
        office?.name || claim.office,
        claim.claim_number,
        claim.submitted_at,
        claim.credit_card_statement
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
      await generatePDF(
        pendingExpenses,
        currentUser.name,
        userOffice?.name,
        draftClaimNumber,
        new Date().toISOString(),
        creditCardStatement?.name
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
            Berkeley International Expense Management System v1.5
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
        const reader = new FileReader();
        reader.onloadend = () => {
          setReceiptPreview(reader.result);
        };
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
  // PREVIEW CLAIM MODAL
  // ============================================
  const PreviewClaimModal = () => {
    const groupedExpenses = pendingExpenses.reduce((acc, exp) => {
      if (!acc[exp.category]) acc[exp.category] = [];
      acc[exp.category].push(exp);
      return acc;
    }, {});

    const canSubmit = !hasForeignCurrency || (hasForeignCurrency && creditCardStatement);
    
    const getSubcategoryTotal = (cat, subcat) => {
      return (groupedExpenses[cat] || [])
        .filter(e => e.subcategory === subcat)
        .reduce((sum, e) => sum + e.amount, 0);
    };

    const getCategoryTotal = (cat) => {
      return (groupedExpenses[cat] || []).reduce((sum, e) => sum + e.amount, 0);
    };

    const claimMonth = pendingExpenses.length > 0 ? getMonthYear(pendingExpenses[0].date) : getMonthYear(new Date().toISOString());

    const pages = ['Summary', 'Travel Detail', 'Entertaining Detail', 'Receipts'];

    const travelExpenses = [...(groupedExpenses['B'] || []), ...(groupedExpenses['C'] || []), ...(groupedExpenses['D'] || [])];
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

                <div className="border-2 border-slate-400 mb-4">
                  <div className="bg-slate-200 p-2 font-bold text-center border-b border-slate-400">Expenses claim</div>
                  
                  <div className="border-b border-slate-400">
                    <div className="bg-slate-100 p-2 font-semibold border-b border-slate-300">Motor Vehicle Expenditure</div>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <td className="p-2 w-8">A.</td>
                          <td className="p-2 text-blue-700">Petrol Expenditure</td>
                          <td className="p-2">Full Petrol Allowance / Fuel Card</td>
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
                          <td className="p-2 text-blue-700">Travel Expenses</td>
                          <td className="p-2">Taxis</td>
                          <td className="p-2 text-right">{getSubcategoryTotal('C', 'Taxis').toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="p-2"></td>
                          <td className="p-2"></td>
                          <td className="p-2">Public Transport / Tolls / Subsistence</td>
                          <td className="p-2 text-right">{(getSubcategoryTotal('C', 'Public Transport') + getSubcategoryTotal('C', 'Tolls') + getSubcategoryTotal('C', 'Subsistence')).toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-2">D.</td>
                          <td className="p-2 text-blue-700">Vehicle Repairs</td>
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
                          <td className="p-2">Subscriptions / Computer / WIP</td>
                          <td className="p-2 text-right">{(getCategoryTotal('G') + getCategoryTotal('H') + getCategoryTotal('I')).toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

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
                          <th className="border p-2">Parking</th>
                          <th className="border p-2">Pub.Trans</th>
                          <th className="border p-2">Taxis</th>
                          <th className="border p-2">Tolls</th>
                          <th className="border p-2">Subsist.</th>
                          <th className="border p-2">Repairs</th>
                          <th className="border p-2">Parts</th>
                          <th className="border p-2">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {travelExpenses.map(exp => (
                          <tr key={exp.id}>
                            <td className="border p-2 font-bold text-blue-700">{exp.ref}</td>
                            <td className="border p-2 text-right">{exp.category === 'B' ? exp.amount.toFixed(2) : ''}</td>
                            <td className="border p-2 text-right">{exp.subcategory === 'Public Transport' ? exp.amount.toFixed(2) : ''}</td>
                            <td className="border p-2 text-right">{exp.subcategory === 'Taxis' ? exp.amount.toFixed(2) : ''}</td>
                            <td className="border p-2 text-right">{exp.subcategory === 'Tolls' ? exp.amount.toFixed(2) : ''}</td>
                            <td className="border p-2 text-right">{exp.subcategory === 'Subsistence' ? exp.amount.toFixed(2) : ''}</td>
                            <td className="border p-2 text-right">{exp.subcategory === 'Repairs' ? exp.amount.toFixed(2) : ''}</td>
                            <td className="border p-2 text-right">{exp.subcategory === 'Parts' ? exp.amount.toFixed(2) : ''}</td>
                            <td className="border p-2">{exp.description}</td>
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
                  <div className="bg-amber-50 p-2 text-amber-800 text-xs font-semibold">⚠️ PLEASE ENSURE A FULL LIST OF GUESTS ARE SUPPLIED WITH EACH RECEIPT</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-200">
                          <th className="border p-2">Ref</th>
                          <th className="border p-2">Emp.Meals</th>
                          <th className="border p-2">Bus.Meals</th>
                          <th className="border p-2">Hotels</th>
                          <th className="border p-2">Gifts</th>
                          <th className="border p-2">Description/Attendees</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entertainingExpenses.map(exp => (
                          <tr key={exp.id}>
                            <td className="border p-2 font-bold text-blue-700">{exp.ref}</td>
                            <td className="border p-2 text-right">{exp.category === 'E' && exp.subcategory?.includes('Employee') ? exp.amount.toFixed(2) : ''}</td>
                            <td className="border p-2 text-right">{exp.category === 'E' && exp.subcategory?.includes('Customer') ? exp.amount.toFixed(2) : ''}</td>
                            <td className="border p-2 text-right">{exp.category === 'F' && exp.subcategory?.includes('Hotel') ? exp.amount.toFixed(2) : ''}</td>
                            <td className="border p-2 text-right">{exp.category === 'F' && !exp.subcategory?.includes('Hotel') ? exp.amount.toFixed(2) : ''}</td>
                            <td className="border p-2">{exp.merchant}{exp.attendees ? ` - ${exp.attendees}` : ''}</td>
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
                    <p className="text-sm text-slate-600 mb-4">
                      {pendingExpenses.length} receipt images will be included in the PDF, each on its own page with the reference label.
                    </p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {pendingExpenses.map(exp => (
                        <div key={exp.id} className="border-2 border-slate-300 rounded-lg overflow-hidden">
                          <div className="bg-blue-100 p-2 flex justify-between items-center">
                            <span className="font-bold text-blue-700 text-lg">{exp.ref}</span>
                            <span className="text-xs text-slate-600">{formatCurrency(exp.amount, exp.currency)}</span>
                          </div>
                          {exp.receiptPreview ? (
                            <img src={exp.receiptPreview} alt={exp.ref} className="w-full h-32 object-cover" />
                          ) : (
                            <div className="w-full h-32 bg-slate-100 flex items-center justify-center">
                              <span className="text-4xl">📄</span>
                            </div>
                          )}
                          <div className="p-2 bg-slate-50 text-xs">
                            <p className="font-medium truncate">{exp.merchant}</p>
                            <p className="text-slate-500 truncate">{exp.description}</p>
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
  // SUBMIT CLAIM
  // ============================================
  const handleSubmitClaim = async () => {
    setLoading(true);
    try {
      const claimNumber = `EXP-2026-${String(claims.length + 1).padStart(3, '0')}`;
      
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
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="text-4xl font-bold text-slate-800">{pendingExpenses.length}</div>
            <div className="text-sm text-slate-500 mt-1">Pending Receipts</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            {Object.keys(expensesByCurrency).length === 0 ? (
              <div className="text-3xl font-bold text-blue-600">{formatCurrency(0, userOffice?.currency)}</div>
            ) : (
              Object.entries(expensesByCurrency).map(([currency, data]) => (
                <div key={currency} className="text-2xl font-bold text-blue-600">
                  {formatCurrency(data.total, currency)}
                </div>
              ))
            )}
            <div className="text-sm text-slate-500 mt-1">Total Amount</div>
          </div>
        </div>

        {hasForeignCurrency && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-xl">💳</span>
            <div>
              <strong className="text-amber-800">Foreign Currency Expenses</strong>
              <p className="text-sm text-amber-700 mt-1">You MUST upload your credit card statement before submitting.</p>
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
                        claim.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {claim.status === 'pending_review' ? 'Pending' : claim.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{claim.item_count} items • {formatDate(claim.submitted_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-slate-800">{formatCurrency(claim.total_amount, claim.currency)}</div>
                    <button
                      onClick={() => handleDownloadPDF(claim)}
                      disabled={downloading}
                      className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1"
                    >
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
      await supabase.from('claims').update({ 
        status: 'approved', 
        reviewed_by: currentUser.name,
        reviewed_at: new Date().toISOString()
      }).eq('id', claimId);
      await loadClaims();
      setSelectedClaim(null);
      setLoading(false);
    };

    const handleReject = async (claimId) => {
      setLoading(true);
      await supabase.from('claims').update({ 
        status: 'rejected', 
        reviewed_by: currentUser.name,
        reviewed_at: new Date().toISOString()
      }).eq('id', claimId);
      await loadClaims();
      setSelectedClaim(null);
      setLoading(false);
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-lg p-5 text-center">
            <div className="text-3xl font-bold text-amber-500">{pendingClaims.length}</div>
            <div className="text-xs text-slate-500 mt-1">Pending</div>
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
                      <span className="font-semibold text-slate-800">{claim.user_name}</span>
                      <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">Pending</span>
                    </div>
                    <p className="text-sm text-slate-500">{claim.office} • {claim.item_count} items</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-slate-800">{formatCurrency(claim.total_amount, claim.currency)}</div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownloadPDF(claim); }}
                      disabled={downloading}
                      className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg text-sm font-medium"
                    >
                      📥 PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
                    onClick={() => handleDownloadPDF(claim)}
                    disabled={downloading}
                    className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg text-sm font-medium"
                  >
                    📥 PDF
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

                <button
                  onClick={() => handleDownloadPDF(selectedClaim)}
                  disabled={downloading}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  {downloading ? '⏳ Generating...' : '📥 Download PDF with Receipts'}
                </button>

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
                    Reject
                  </button>
                  <button onClick={() => handleApprove(selectedClaim.id)} disabled={loading} className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold shadow-lg disabled:opacity-50">
                    Approve ✓
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

      {canReview && (
        <div className="bg-white border-b border-slate-200 sticky top-14 z-30">
          <div className="max-w-3xl mx-auto flex">
            <button onClick={() => setActiveTab('my_expenses')} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'my_expenses' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
              📋 My Expenses
            </button>
            <button onClick={() => setActiveTab('review')} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'review' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
              👀 Review
              {getVisibleClaims().filter(c => c.status === 'pending_review').length > 0 && (
                <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {getVisibleClaims().filter(c => c.status === 'pending_review').length}
                </span>
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
