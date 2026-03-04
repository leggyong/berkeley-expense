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
    
    // Separate headers for updates - use minimal return to avoid timeout with large data
    const updateHeaders = { 
      'apikey': SUPABASE_ANON_KEY, 
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 
      'Content-Type': 'application/json', 
      'Prefer': 'return=minimal' 
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
            const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}`, { method: 'PATCH', headers: updateHeaders, body: JSON.stringify(updates) });
            // With return=minimal, we don't get data back, just check if successful
            if (res.ok) {
              return { data: null, error: null };
            } else {
              const errorData = await res.json();
              return { data: null, error: errorData };
            }
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
  },
  // Supabase Storage API
  storage: {
    from: (bucket) => ({
      upload: async (path, file, options = {}) => {
        try {
          const headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          };
          // If file is a Blob/File, upload directly. If base64, convert first.
          let body = file;
          let contentType = options.contentType || 'image/jpeg';
          
          if (typeof file === 'string' && file.startsWith('data:')) {
            // Convert base64 to blob
            const response = await fetch(file);
            body = await response.blob();
            contentType = body.type || 'image/jpeg';
          }
          
          headers['Content-Type'] = contentType;
          
          const res = await fetch(
            `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`,
            { method: 'POST', headers, body }
          );
          
          if (res.ok) {
            const data = await res.json();
            return { data: { path }, error: null };
          } else {
            // If file exists, try upsert
            if (res.status === 400) {
              const upsertRes = await fetch(
                `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`,
                { method: 'PUT', headers, body }
              );
              if (upsertRes.ok) {
                return { data: { path }, error: null };
              }
            }
            const errorData = await res.json();
            return { data: null, error: errorData };
          }
        } catch (e) {
          console.error('Storage upload error:', e);
          return { data: null, error: e };
        }
      },
      getPublicUrl: (path) => {
        return { data: { publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}` } };
      },
      remove: async (paths) => {
        try {
          const headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          };
          const res = await fetch(
            `${SUPABASE_URL}/storage/v1/object/${bucket}`,
            { method: 'DELETE', headers, body: JSON.stringify({ prefixes: paths }) }
          );
          return { error: res.ok ? null : await res.json() };
        } catch (e) {
          return { error: e };
        }
      }
    })
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
  { id: 1008, name: 'Keisha Latoya Whitehorne', office: 'DXB', role: 'employee', reimburseCurrency: 'AED', password: 'berkeley123' },
  // Group Finance - UK-based reviewer
  { id: 9001, name: 'Emma Fowler', office: 'LON', role: 'group_finance', reimburseCurrency: 'GBP', password: 'berkeley123' }
];

// Emma Fowler's restructured categories aligned with IFS accounting (Feb 2026)
// GL codes updated from Berkeley_International_Expense_Claim_Form.xlsx
const EXPENSE_CATEGORIES = {
  // TRAVEL (GL 3341)
  'A': { name: 'Flights', icon: '✈️', gl: '3341', group: 'TRAVEL', requiresAttendees: false, example: 'Air China: Return flights from SH to BJ for UK Bridge event 01-04Feb26' },
  'B': { name: 'Accommodation', icon: '🏨', gl: '3341', group: 'TRAVEL', requiresAttendees: false, example: 'St Regis: 1 night hotel room fee for Bangkok office visit 06-07Feb26' },
  'C': { name: 'Taxis', icon: '🚕', gl: '3341', group: 'TRAVEL', requiresAttendees: false, example: 'Uber: DB office to La Cantine restaurant to meet Knight Frank for lunch' },
  'D': { name: 'Public Transport', icon: '🚇', gl: '3341', group: 'TRAVEL', requiresAttendees: false, example: 'South West Trains: Waterloo to Staines for Eden Grove site visit' },
  'E': { name: 'Parking and Tolls', icon: '🅿️', gl: '3341', group: 'TRAVEL', requiresAttendees: false, example: 'HKRI Taikoo Hui: All day car parking for Cozee capital event' },
  'F': { name: 'Visas & Tourist Fees', icon: '📋', gl: '3341', group: 'TRAVEL', requiresAttendees: false, example: 'Visit Saudi: e-visa for Saudi trip to attend Cityscape event Feb26' },
  'G': { name: 'Car Hire & Petrol', icon: '🚗', gl: '3341', group: 'TRAVEL', requiresAttendees: false, example: 'Day hire for Sutton, Guildford, Eden Grove site visits - 4 Berkeley staff share 17Feb26' },
  'H': { name: 'Business Mileage', icon: '📍', gl: '3341', group: 'TRAVEL', requiresAttendees: false, example: 'Round trip from home TW18 4AB to Guildford site GU1 4AF for meeting with client = 41.4 miles' },
  
  // SUBSISTENCE, WELFARE & EMPLOYEE ENTERTAINING (GL 3962)
  'I': { name: 'Meals for Self Whilst Travelling', icon: '🍽️', gl: '3962', group: 'SUBSISTENCE', requiresAttendees: false, example: 'Dinner for self on arrival in Istanbul for Piccadilly Estates event 17Feb26' },
  'J': { name: 'Meals with Other Berkeley Employees', icon: '👥', gl: '3962', group: 'SUBSISTENCE', requiresAttendees: true, example: 'BJ office team lunch for Lunar New Year 14Feb26 - 5 persons' },
  'K': { name: 'Hotel Laundry', icon: '👔', gl: '3962', group: 'SUBSISTENCE', requiresAttendees: false, example: 'Suit dry cleaned on working day 6 of a 2 week trip 08-21Feb26' },
  'L': { name: 'Team Activity', icon: '🎯', gl: '3962', group: 'SUBSISTENCE', requiresAttendees: false, example: 'Office xmas social - escape room hire 06Jan26' },
  'M': { name: 'Gifts for Employees', icon: '🎁', gl: '3962', group: 'SUBSISTENCE', requiresAttendees: false, example: 'InterFlora: Get well soon flowers for Joe Bloggs' },
  'N': { name: 'Medical Welfare', icon: '🏥', gl: '3962', group: 'SUBSISTENCE', requiresAttendees: false, example: 'Karama Medical: Blood tests for Jordan visa for Amman showcase 07-08Feb26' },
  
  // BUSINESS ENTERTAINING (GL 3822)
  'O': { name: 'Meals with Non-Berkeley Persons', icon: '🍷', gl: '3822', group: 'ENTERTAINING', requiresAttendees: true, example: 'Dinner with Eric Tai from CBRE - 2 persons' },
  'P': { name: 'Gifts to Non-Berkeley Persons/Co\'s', icon: '🎀', gl: '3822', group: 'ENTERTAINING', requiresAttendees: false, example: 'Office opening gift of champagne for Knight Frank' },
  
  // OFFICE COSTS (Various GL codes per Emma's Excel)
  'Q': { name: 'Pantry Supplies for Staff Consumption', icon: '☕', gl: '3962', group: 'OFFICE', requiresAttendees: false, example: 'Nespresso: coffee capsules; M&S: Fruit and milk for week ending 13Feb26' },
  'R': { name: 'Catering Supplies for External Visitors', icon: '🥐', gl: '3822', group: 'OFFICE', requiresAttendees: false, example: 'Drinks to top-up office visitors fridge' },
  'S': { name: 'Stationery', icon: '📝', gl: '3848', group: 'OFFICE', requiresAttendees: false, example: 'A4 & A3 printing paper, post-it notes, batteries' },
  'T': { name: 'Cleaning Supplies', icon: '🧹', gl: '3544', group: 'OFFICE', requiresAttendees: false, example: 'Hand soap, dishwasher tablets and bin bags' },
  'U': { name: 'Computer/IT Accessories', icon: '💻', gl: '3654', group: 'OFFICE', requiresAttendees: false, example: 'Apple: Work iPad replacement charger due to damaged cable' },
  'V': { name: 'Repairs & Maintenance', icon: '🔧', gl: '3584', group: 'OFFICE', requiresAttendees: false, example: 'Labour to hang picture and fix shelf in main reception' },
  'W': { name: 'Postage, Couriers, Import Duty', icon: '📦', gl: '3840', group: 'OFFICE', requiresAttendees: false, example: 'Logos courier: Documents to CSC on 19Jan26' },
  'X': { name: 'Flowers for Office', icon: '🌸', gl: '3970', group: 'OFFICE', requiresAttendees: false, example: 'Orchids for office for Chinese New Year' },
  'Y': { name: 'Telephone/Mobile', icon: '📱', gl: '3532', group: 'OFFICE', requiresAttendees: false, example: 'Mobile SIM card for UK trip 02-05Feb26' },
  
  // MARKETING & EVENTS (GL 3872 per Emma's Excel)
  'MA': { name: 'Marketing Supplies/Prints/Branded Goods', icon: '🖨️', gl: '3872', group: 'MARKETING', requiresAttendees: false, example: 'Urgent print run for additional factsheets for JLL event 06Feb26' },
  'MB': { name: 'Marketing Subscriptions', icon: '📊', gl: '3872', group: 'MARKETING', requiresAttendees: false, example: 'Adslibrary: AI ad monitoring for month of Jan26' },
  'MC': { name: 'Marketing Event Costs', icon: '🎪', gl: '3872', group: 'MARKETING', requiresAttendees: false, example: 'Benham & Reeves education seminar catering 07Feb26 - to recharge to White City Living' },
  'MD': { name: 'Agent Incentive Awards', icon: '🏆', gl: '3872', group: 'MARKETING', requiresAttendees: false, example: 'E-gift card purchased for Rising Star award winner, Max Alliance' },
  'ME': { name: 'Advertising', icon: '📺', gl: '3872', group: 'MARKETING', requiresAttendees: false, example: 'Google advertising for Jan26' },
  'MF': { name: 'Individual Event Attendance Ticket', icon: '🎟️', gl: '3872', group: 'MARKETING', requiresAttendees: false, example: 'BMCC attendance ticket - Post budget market outlook event on 15Jan26' },
  
  // LEGAL & PROFESSIONAL FEES (GL codes per Emma's Excel)
  'LA': { name: 'Non-Marketing Subscriptions', icon: '📰', gl: '3940', group: 'LEGAL', requiresAttendees: false, example: 'Financial Times: Annual subscription 01Jan26-31Dec26' },
  'LB': { name: 'Professional Membership Fees', icon: '🎓', gl: '3940', group: 'LEGAL', requiresAttendees: false, example: 'Chartered Accountant membership renewal 2026 - Joe Bloggs' },
  'LC': { name: 'Legal Fees - General Business', icon: '⚖️', gl: '3764', group: 'LEGAL', requiresAttendees: false, example: 'Business Profile purchase for Knight Century, Malaysia' },
  'LD': { name: 'Legal Fees - Employee Related', icon: '👤', gl: '3764', group: 'LEGAL', requiresAttendees: false, example: 'MOM: Work pass issuance for new hire Joe Bloggs' },
  
  // OTHER
  'Z': { name: 'Other', icon: '❓', gl: '', group: 'OTHER', requiresAttendees: false, example: 'Should only be used if agreed with Group as no other categorisation available' }
};

// Category groups for PDF summary display
const CATEGORY_GROUPS = {
  'TRAVEL': { name: 'Travel', gl: '3341' },
  'SUBSISTENCE': { name: 'Subsistence, Welfare & Employee Entertaining', gl: '3962' },
  'ENTERTAINING': { name: 'Business Entertaining', gl: '3822' },
  'OFFICE': { name: 'Office Costs', gl: 'Various' },
  'MARKETING': { name: 'Marketing & Events', gl: '3822' },
  'LEGAL': { name: 'Legal & Professional', gl: 'Various' },
  'OTHER': { name: 'Other', gl: 'TBC' }
};

// Currencies sorted alphabetically with expanded list per Emma's request
const CURRENCIES = [
  'AED', 'AUD', 'BHD', 'CNY', 'EGP', 'EUR', 'GBP', 'HKD', 'IDR', 'INR',
  'JOD', 'JPY', 'KWD', 'MYR', 'NGN', 'OMR', 'PHP', 'QAR', 'SAR', 'SGD',
  'THB', 'TRY', 'TWD', 'USD', 'VND'
];

// Format admin notes with different colors for different reviewers (HTML for PDF)
const formatAdminNotesHTML = (notes) => {
  if (!notes) return '';
  const reviewerColors = { 'Ann': '#2563eb', 'John': '#059669', 'Emma': '#7c3aed', 'Cathy': '#dc2626', 'default': '#d97706' };
  const parts = notes.split(/(?=\b(?:Ann|John|Emma|Cathy|[A-Z][a-z]+):)/g).filter(p => p.trim());
  if (parts.length <= 1) return '<span style="color:#d97706;">' + notes + '</span>';
  // First part inline, subsequent parts on new lines
  return parts.map((part, idx) => {
    const match = part.match(/^([A-Z][a-z]+):\s*/);
    const reviewer = match ? match[1] : 'default';
    const color = reviewerColors[reviewer] || reviewerColors['default'];
    const content = match ? reviewer + ':</strong> ' + part.replace(match[0], '') : '</strong>' + part;
    // First item inline (span), rest on new lines (div)
    if (idx === 0) return '<span style="color:' + color + ';"><strong>' + content + '</span>';
    return '<div style="color:' + color + ';margin-top:2px;"><strong>' + content + '</div>';
  }).join('');
};

// Format admin notes with different colors for different reviewers (React for UI)
const formatAdminNotesReact = (notes) => {
  if (!notes) return null;
  const reviewerColors = { 'Ann': 'text-blue-600', 'John': 'text-green-600', 'Emma': 'text-purple-600', 'Cathy': 'text-red-600', 'default': 'text-amber-700' };
  const parts = notes.split(/(?=\b(?:Ann|John|Emma|Cathy|[A-Z][a-z]+):)/g).filter(p => p.trim());
  if (parts.length <= 1) return notes;
  return parts.map((part, idx) => {
    const match = part.match(/^([A-Z][a-z]+):\s*/);
    const reviewer = match ? match[1] : 'default';
    const colorClass = reviewerColors[reviewer] || reviewerColors['default'];
    const content = match ? part.replace(match[0], '') : part;
    return `<div class="${colorClass}">${match ? '<strong>' + reviewer + ':</strong> ' : ''}${content}</div>`;
  }).join('');
};

// GBP conversion rates (approximate)
const GBP_RATES = { 'GBP': 1, 'SGD': 0.58, 'USD': 0.79, 'EUR': 0.86, 'CNY': 0.11, 'HKD': 0.10, 'AED': 0.22, 'THB': 0.023, 'MYR': 0.18, 'AUD': 0.52, 'JPY': 0.0053 };
const toGBP = (amt, cur) => {
  if (!amt || isNaN(parseFloat(amt))) return 0;
  if (cur === 'GBP') return parseFloat(amt);
  const rate = GBP_RATES[cur] || 0.5;
  return parseFloat(amt) * rate;
};

const formatCurrency = (amount, currency) => {
  const num = parseFloat(amount || 0);
  return `${currency} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const formatDate = (dateStr) => { if (!dateStr) return ''; const d = new Date(dateStr); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
const formatShortDate = (dateStr) => { if (!dateStr) return ''; const d = new Date(dateStr); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }); };
const getMonthYear = (dateStr) => { if (!dateStr) return ''; const d = new Date(dateStr); return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }); };
const isOlderThan2Months = (dateStr) => { const d = new Date(dateStr); const t = new Date(); t.setMonth(t.getMonth() - 2); return d < t; };
const isApproaching2Months = (dateStr) => { 
  const d = new Date(dateStr); 
  const now = new Date(); 
  const sixWeeksAgo = new Date(); 
  sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42); // 6 weeks = 42 days
  const twoMonthsAgo = new Date(); 
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  return d < sixWeeksAgo && d >= twoMonthsAgo; // Between 6 weeks and 2 months old
};
const getDaysUntil2Months = (dateStr) => {
  const d = new Date(dateStr);
  const twoMonthsFromReceipt = new Date(d);
  twoMonthsFromReceipt.setMonth(twoMonthsFromReceipt.getMonth() + 2);
  const now = new Date();
  const diffTime = twoMonthsFromReceipt - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Image compression utility - reduces file size while maintaining readability
const compressImage = (dataUrl, maxWidth = 1200, quality = 0.7) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // Scale down if larger than maxWidth
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to JPEG with compression
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      
      // Log compression stats
      const originalSize = Math.round(dataUrl.length / 1024);
      const compressedSize = Math.round(compressedDataUrl.length / 1024);
      console.log(`📦 Image compressed: ${originalSize}KB → ${compressedSize}KB (${Math.round((1 - compressedSize/originalSize) * 100)}% reduction)`);
      
      resolve(compressedDataUrl);
    };
    img.onerror = () => resolve(dataUrl); // Return original if compression fails
    img.src = dataUrl;
  });
};

// Upload image to Supabase Storage and return URL
const uploadImageToStorage = async (dataUrl, userId, type = 'receipt') => {
  try {
    // First compress the image
    const compressed = await compressImage(dataUrl);
    
    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const filename = `${userId}/${type}_${timestamp}_${random}.jpg`;
    
    // Upload to storage bucket named 'receipts'
    const { data, error } = await supabase.storage.from('Receipts').upload(filename, compressed);
    
    if (error) {
      console.error('Storage upload failed:', error);
      // Fallback: return compressed base64 if storage fails
      return compressed;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage.from('Receipts').getPublicUrl(filename);
    console.log(`☁️ Image uploaded to storage: ${filename}`);
    
    return urlData.publicUrl;
  } catch (err) {
    console.error('Upload error:', err);
    // Fallback: return compressed base64 if upload fails
    return await compressImage(dataUrl);
  }
};

// Check if a string is a storage URL (not base64)
const isStorageUrl = (str) => {
  return str && typeof str === 'string' && (str.startsWith('http://') || str.startsWith('https://'));
};

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
    if (!image) {
      console.error('No image at index', currentIndex);
      return;
    }
    setImageLoaded(false);
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Handle CORS for storage URLs
    img.onload = () => {
      const maxW = Math.min(800, window.innerWidth - 40);
      const scale = Math.min(maxW / img.width, 1);
      setImgDimensions({ width: img.width * scale, height: img.height * scale, scale });
      setBaseImage(img);
      setImageLoaded(true);
    };
    img.onerror = (err) => {
      console.error('Failed to load statement image:', image, err);
      // Show error state
      alert('Failed to load statement image. Please try re-uploading.');
      setImageLoaded(false);
    };
    img.src = image;
  }, [image, currentIndex]);

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

// Request Changes Modal - Separate component to prevent focus loss
const RequestChangesModal = ({ claim, onClose, onSubmit }) => {
  const [comment, setComment] = useState('');
  const [flaggedExpenses, setFlaggedExpenses] = useState([]);
  
  const sortedExpenses = [...(claim.expenses || [])].sort((a, b) => {
    const refA = a.ref || '999';
    const refB = b.ref || '999';
    // Try pure numeric sort first
    const numA = parseInt(refA);
    const numB = parseInt(refB);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    // Fall back to alphanumeric sort (category letter + number)
    const catA = refA.charAt(0);
    const catB = refB.charAt(0);
    if (catA !== catB) return catA.localeCompare(catB);
    return (parseInt(refA.slice(1)) || 0) - (parseInt(refB.slice(1)) || 0);
  });
  
  const toggleFlag = (ref) => {
    setFlaggedExpenses(prev => 
      prev.includes(ref) ? prev.filter(r => r !== ref) : [...prev, ref]
    );
  };
  
  const handleSubmit = () => {
    onSubmit(comment, flaggedExpenses);
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-amber-500 text-white p-5">
          <h2 className="font-bold">📝 Request Changes</h2>
          <p className="text-amber-100 text-sm">Select items that need attention and add your comments</p>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-xs font-semibold text-slate-500 mb-2">Tap items that need fixing:</p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {sortedExpenses.map(exp => (
              <button
                key={exp.ref}
                onClick={() => toggleFlag(exp.ref)}
                className={`p-2 rounded-lg text-xs font-bold border-2 transition-all ${
                  flaggedExpenses.includes(exp.ref) 
                    ? 'bg-amber-500 text-white border-amber-500' 
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-amber-300'
                }`}
              >
                {exp.ref}
              </button>
            ))}
          </div>
          {flaggedExpenses.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-4">
              <p className="text-xs text-amber-700">
                <strong>Flagged:</strong> {flaggedExpenses.sort().join(', ')}
              </p>
            </div>
          )}
          <textarea 
            className="w-full p-3 border-2 rounded-xl text-sm" 
            rows={4} 
            placeholder="What needs fixing? Be specific about each flagged item..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            autoFocus
          />
        </div>
        <div className="p-4 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 font-semibold">Cancel</button>
          <button 
            onClick={handleSubmit}
            disabled={!comment.trim()}
            className="flex-[2] py-3 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50"
          >
            Send 📤
          </button>
        </div>
      </div>
    </div>
  );
};

const StatementUploadModal = ({ existingImages, userId, onClose, onContinue }) => {
    const [localStatements, setLocalStatements] = useState([...existingImages]);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef(null);
    const triggerFileSelect = () => { if (fileInputRef.current) fileInputRef.current.click(); };

    const handleFileSelect = async (e) => { 
      const file = e.target.files[0]; 
      if (!file) return;
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          // Upload to Supabase Storage
          const imageUrl = await uploadImageToStorage(event.target.result, userId, 'statement');
          setLocalStatements(prev => [...prev, imageUrl]);
        } catch (err) {
          console.error('Upload failed:', err);
          // Fallback to compressed base64
          const compressed = await compressImage(event.target.result);
          setLocalStatements(prev => [...prev, compressed]);
        }
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
          <div className="bg-amber-500 text-white p-5 shrink-0"><h2 className="text-lg font-bold">💳 Upload Credit Card/Bank Statements</h2><p className="text-amber-100 text-sm">You can upload multiple statements</p></div>
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
      // MIGRATE: Convert any base64 images to storage URLs before saving
      const migratedExpenses = await Promise.all((expensesToSave || []).map(async (exp) => {
        let updated = { ...exp };
        
        // Migrate receiptPreview if it's base64 (not a URL)
        if (exp.receiptPreview && !isStorageUrl(exp.receiptPreview)) {
          console.log(`🔄 Migrating receipt ${exp.ref || exp.id} to storage...`);
          const url = await uploadImageToStorage(exp.receiptPreview, currentUser.id, 'receipt');
          updated.receiptPreview = url;
        }
        
        // Migrate receiptPreview2 if it's base64
        if (exp.receiptPreview2 && !isStorageUrl(exp.receiptPreview2)) {
          const url = await uploadImageToStorage(exp.receiptPreview2, currentUser.id, 'receipt2');
          updated.receiptPreview2 = url;
        }
        
        return updated;
      }));
      
      // Migrate statements
      const migratedStatements = await Promise.all((statementsToSave || []).map(async (img) => {
        if (img && !isStorageUrl(img)) {
          console.log('🔄 Migrating statement to storage...');
          return await uploadImageToStorage(img, currentUser.id, 'statement');
        }
        return img;
      }));
      
      // Migrate originals
      const migratedOriginals = await Promise.all((originalsToSave || []).map(async (img) => {
        if (img && !isStorageUrl(img)) {
          console.log('🔄 Migrating original to storage...');
          return await uploadImageToStorage(img, currentUser.id, 'original');
        }
        return img;
      }));
      
      // Update local state with migrated data
      if (migratedExpenses.length > 0) setExpenses(migratedExpenses);
      if (migratedStatements.length > 0) setAnnotatedStatements(migratedStatements);
      if (migratedOriginals.length > 0) setOriginalStatementImages(migratedOriginals);
      
      // Check data size after migration
      const expensesJson = JSON.stringify(migratedExpenses);
      const statementsJson = JSON.stringify(migratedStatements);
      const annotationsJson = JSON.stringify(annotationsToSave || []);
      const originalsJson = JSON.stringify(migratedOriginals);
      const totalSize = expensesJson.length + statementsJson.length + annotationsJson.length + originalsJson.length;
      
      console.log(`💾 Saving data: ${Math.round(totalSize / 1024)}KB`);
      
      const draftData = { 
        user_id: currentUser.id, 
        expenses: expensesJson, 
        statements: statementsJson, 
        annotations: annotationsJson,
        originals: originalsJson,
        updated_at: new Date().toISOString() 
      };
      
      // Check if record exists
      const { data: existing, error: selectError } = await supabase.from('user_drafts').select('id').eq('user_id', currentUser.id);
      
      if (selectError) {
        console.error('Select error:', selectError);
        throw selectError;
      }
      
      let result;
      if (existing && existing.length > 0) {
        result = await supabase.from('user_drafts').update(draftData).eq('user_id', currentUser.id);
      } else {
        result = await supabase.from('user_drafts').insert([draftData]);
      }
      
      if (result.error) {
        console.error('Save error:', result.error);
        throw result.error;
      }
      
      setSavingStatus('saved');
      setTimeout(() => setSavingStatus(null), 1500);
      return true;
    } catch (err) { 
      console.error('Save failed:', err);
      setSavingStatus('error');
      // Show error to user if it's a data size issue
      if (err.message?.includes('too large') || err.code === '54000') {
        alert('⚠️ Error: Too much data. Try removing some old receipts first.');
      }
      setTimeout(() => setSavingStatus(null), 3000);
      return false;
    }
  };

  // Sort expenses by date and assign sequential refs (1, 2, 3...)
  const sortAndReassignRefs = (expenseList) => {
    try {
      if (!expenseList || !Array.isArray(expenseList) || expenseList.length === 0) return expenseList || [];
      const sorted = [...expenseList].sort((a, b) => {
        const dateA = a?.date ? new Date(a.date) : new Date();
        const dateB = b?.date ? new Date(b.date) : new Date();
        return dateA - dateB;
      });
      // Use sequential numbering (1, 2, 3...) sorted by date
      return sorted.map((exp, idx) => {
        if (!exp) return exp;
        return { ...exp, ref: String(idx + 1) };
      });
    } catch (err) { return expenseList || []; }
  };

  // Function to scan all expenses and mark duplicates (pairs)
  const markDuplicatePairs = (expenseList) => {
    if (!expenseList || expenseList.length < 2) return expenseList;
    
    return expenseList.map((exp, idx) => {
      // Check if any OTHER expense has same amount, date, currency
      const hasDuplicate = expenseList.some((other, otherIdx) => 
        otherIdx !== idx &&
        parseFloat(other.amount) === parseFloat(exp.amount) &&
        other.date === exp.date &&
        other.currency === exp.currency
      );
      
      if (hasDuplicate && !exp.isPotentialDuplicate) {
        return { ...exp, isPotentialDuplicate: true };
      }
      return exp;
    });
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
            if (Array.isArray(parsed)) {
              // Reassign sequential refs AND re-check duplicates on load
              let processed = sortAndReassignRefs(parsed);
              processed = markDuplicatePairs(processed);
              setExpenses(processed);
            }
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
      if (returned.length > 0 && returned[0].expenses) {
        // Reassign sequential refs and check duplicates when loading returned claims
        let processed = returned[0].expenses.map(e => ({ ...e, status: 'draft' }));
        processed = sortAndReassignRefs(processed);
        processed = markDuplicatePairs(processed);
        setExpenses(processed);
        
        // Restore statementAnnotations from expenses' embedded statementIndex
        const restoredAnnotations = returned[0].expenses
          .filter(e => e.statementIndex !== undefined && e.statementIndex >= 0)
          .map(e => ({ ref: e.ref, statementIndex: e.statementIndex }));
        if (restoredAnnotations.length > 0) {
          setStatementAnnotations(restoredAnnotations);
        }
        
        // Load ORIGINAL statements (clean, without annotations baked in) for re-annotation
        // If original_statements exists, use it; otherwise fall back to annotated_statements
        if (returned[0].original_statements && returned[0].original_statements.length > 0) {
          setOriginalStatementImages(returned[0].original_statements);
          setStatementImages(returned[0].original_statements);
          // For display, use annotated versions if available
          if (returned[0].annotated_statements) {
            setAnnotatedStatements(returned[0].annotated_statements);
          } else if (returned[0].annotated_statement) {
            setAnnotatedStatements([returned[0].annotated_statement]);
          } else {
            setAnnotatedStatements(returned[0].original_statements);
          }
        } else if (returned[0].annotated_statements) {
          // Fallback for old data that doesn't have original_statements
          setAnnotatedStatements(returned[0].annotated_statements);
          setOriginalStatementImages(returned[0].annotated_statements);
        } else if (returned[0].annotated_statement) {
          setAnnotatedStatements([returned[0].annotated_statement]);
          setOriginalStatementImages([returned[0].annotated_statement]);
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
  
  const getReviewableClaims = () => { if (!currentUser) return []; return claims.filter(c => (c.status === 'pending_review' || c.status === 'pending_level2') && canUserReviewClaim(currentUser.id, c)); };
  

  const generatePDFFromHTML = async (expenseList, userName, officeCode, claimNumber, submittedDate, statementImgs, reimburseCurrency, level2ApprovedBy, level2ApprovedAt, annotations = []) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert('Please allow popups'); return; }
    const office = OFFICES.find(o => o.code === officeCode);
    const companyName = office?.companyName || 'Berkeley';
    
    // Sort expenses by date and assign sequential refs
    const sortedExpenses = [...expenseList].sort((a, b) => new Date(a.date) - new Date(b.date));
    const expensesWithRefs = sortedExpenses.map((exp, idx) => ({ ...exp, seqRef: idx + 1 }));
    
    // Date range
    const dates = expensesWithRefs.map(e => new Date(e.date)).filter(d => !isNaN(d));
    const oldestDate = dates.length > 0 ? new Date(Math.min(...dates)) : null;
    const newestDate = dates.length > 0 ? new Date(Math.max(...dates)) : null;
    const formatDDMMYYYY = (d) => d ? d.toLocaleDateString('en-GB') : '';
    const isOldestOver2Months = oldestDate ? isOlderThan2Months(oldestDate.toISOString()) : false;
    
    // Calculate totals by category
    const getCategoryTotal = (catKey) => expensesWithRefs.filter(e => e.category === catKey).reduce((sum, e) => sum + parseFloat(e.reimbursementAmount || e.amount || 0), 0);
    const totalAmount = expensesWithRefs.reduce((sum, e) => sum + parseFloat(e.reimbursementAmount || e.amount || 0), 0);
    
    // Format amount with comma separator
    const fmtAmt = (amt) => parseFloat(amt || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    // GBP conversion rate (approximate - would need real FX rates)
    const GBP_RATES = { 'SGD': 0.58, 'USD': 0.79, 'EUR': 0.86, 'CNY': 0.11, 'HKD': 0.10, 'AED': 0.22, 'THB': 0.023, 'MYR': 0.18, 'AUD': 0.52, 'JPY': 0.0053 };
    const toGBP = (amt, cur) => {
      const rate = GBP_RATES[cur] || 0.5;
      return parseFloat(amt || 0) * rate;
    };
    const totalGBP = toGBP(totalAmount, reimburseCurrency);

    // Build category summary rows - FIXED: SGD in middle, GL on right
    const buildCategorySummary = () => {
      const groups = [
        { name: 'TRAVEL', cats: ['A','B','C','D','E','F','G','H'] },
        { name: 'SUBSISTENCE, WELFARE & EMPLOYEE ENTERTAINING', cats: ['I','J','K','L','M','N'] },
        { name: 'BUSINESS ENTERTAINING', cats: ['O','P'] },
        { name: 'OFFICE COSTS', cats: ['Q','R','S','T','U','V','W','X','Y'] },
        { name: 'MARKETING & EVENTS', cats: ['MA','MB','MC','MD','ME','MF'] },
        { name: 'LEGAL & PROFESSIONAL FEES', cats: ['LA','LB','LC','LD'] },
        { name: 'OTHER', cats: ['Z'] }
      ];
      
      let html = '';
      groups.forEach(grp => {
        // Group header
        html += '<tr class="group-row"><td><strong>' + grp.name + '</strong></td><td></td><td></td></tr>';
        // Category rows - amount in middle, GL on right
        grp.cats.forEach(catKey => {
          const cat = EXPENSE_CATEGORIES[catKey];
          if (!cat) return;
          const amt = getCategoryTotal(catKey);
          html += '<tr><td style="padding-left:20px;">' + cat.name.toUpperCase() + '</td><td style="text-align:right;">' + fmtAmt(amt) + '</td><td style="text-align:right;color:#666;">GL ' + cat.gl + '</td></tr>';
        });
      });
      return html;
    };

    // Build detail table - FIXED: always show currency in receipt column, add per pax rates
    const buildDetailTable = () => {
      return expensesWithRefs.map(exp => {
        const cat = EXPENSE_CATEGORIES[exp.category] || { name: 'Unknown' };
        const originalAmt = parseFloat(exp.amount || 0);
        const claimAmt = parseFloat(exp.reimbursementAmount || exp.amount || 0);
        const originalCurrency = exp.currency || reimburseCurrency;
        const fxRate = exp.isForeignCurrency && originalAmt > 0 ? (claimAmt / originalAmt).toFixed(6) : '';
        const gbpApprox = toGBP(claimAmt, reimburseCurrency);
        const isOld = isOlderThan2Months(exp.date);
        const pax = parseInt(exp.numberOfPax) || 0;
        const perPax = pax > 0 ? claimAmt / pax : 0;
        const perPaxGBP = pax > 0 ? toGBP(perPax, reimburseCurrency) : 0;
        const warnings = [];
        if (isOld) warnings.push('<span style="color:red;font-weight:bold;">⚠ >2 MONTHS</span>');
        if (exp.isPotentialDuplicate) warnings.push('<span style="color:orange;font-weight:bold;">⚠ DUPLICATE?</span>');
        if (exp.adminNotes) warnings.push('<div style="background:#fff8e1;padding:2px 4px;border-radius:3px;">📝 ' + formatAdminNotesHTML(exp.adminNotes) + '</div>');
        // Add per pax info if applicable
        // Add per pax info BEFORE comments if applicable
        if (pax > 0) warnings.unshift('<span style="color:#7c3aed;">' + pax + ' pax: ' + reimburseCurrency + ' ' + fmtAmt(perPax) + ' (£' + fmtAmt(perPaxGBP) + ')/pax</span>');
        
        return '<tr>' +
          '<td style="text-align:center;">' + exp.seqRef + '</td>' +
          '<td style="text-align:center;">' + formatDDMMYYYY(new Date(exp.date)) + '</td>' +
          '<td>' + cat.name + '</td>' +
          '<td>' + (exp.description || '') + (warnings.length > 0 ? '<br>' + warnings.join('<br>') : '') + '</td>' +
          '<td style="text-align:right;">' + originalCurrency + ' ' + fmtAmt(originalAmt) + '</td>' +
          '<td style="text-align:right;">' + fmtAmt(claimAmt) + '</td>' +
          '<td style="text-align:right;">' + fxRate + '</td>' +
          '<td style="text-align:right;">£' + fmtAmt(gbpApprox) + '</td>' +
        '</tr>';
      }).join('');
    };

    // Backcharge summary
    const backchargeExpenses = expensesWithRefs.filter(e => e.hasBackcharge && e.backcharges?.length > 0);
    const backchargeSummary = {};
    backchargeExpenses.forEach(exp => {
      const expAmount = parseFloat(exp.reimbursementAmount || exp.amount) || 0;
      exp.backcharges.forEach(bc => {
        const dev = bc.development;
        const pct = parseFloat(bc.percentage) || 0;
        const amt = (expAmount * pct / 100);
        if (!backchargeSummary[dev]) { backchargeSummary[dev] = { total: 0, items: [] }; }
        backchargeSummary[dev].total += amt;
        backchargeSummary[dev].items.push({ ref: exp.seqRef, date: exp.date, amount: amt, percentage: pct });
      });
    });

    // Statement array (declared early so receiptsHTML can use it)
    const statementsArray = Array.isArray(statementImgs) ? statementImgs : (statementImgs ? [statementImgs] : []);

    // Receipt pages - with matched statement shown beside receipt for foreign currency expenses
    const receiptsHTML = expensesWithRefs.map(exp => {
      const cat = EXPENSE_CATEGORIES[exp.category] || { name: 'Unknown' };
      const pax = parseInt(exp.numberOfPax) || 0;
      const claimAmt = parseFloat(exp.reimbursementAmount || exp.amount);
      const perPax = pax > 0 ? claimAmt / pax : 0;
      const perPaxGBP = pax > 0 ? toGBP(perPax, reimburseCurrency) : 0;
      const isOld = isOlderThan2Months(exp.date);
      const oldBadge = isOld ? '<br><span style="background:#ffcdd2;color:#c62828;padding:2px 6px;border-radius:3px;font-weight:bold;">⚠ >2 MONTHS OLD</span>' : '';
      const dupBadge = exp.isPotentialDuplicate ? '<br><span style="background:#fff3e0;color:#e65100;padding:2px 6px;border-radius:3px;font-weight:bold;">⚠ DUPLICATE?</span>' : '';
      // FIXED: backcharge with white background and dark text for visibility
      const backchargeHTML = exp.hasBackcharge && exp.backcharges?.length > 0 ? '<div style="background:#fff;border:2px solid #9c27b0;color:#6a1b9a;padding:4px 8px;margin-top:5px;font-size:10px;border-radius:4px;"><strong>📊 Backcharge:</strong> ' + exp.backcharges.map(bc => bc.development + ': ' + bc.percentage + '%').join(' | ') + '</div>' : '';
      const paxInfo = pax > 0 ? '<br>👥 ' + pax + ' pax: ' + reimburseCurrency + ' ' + fmtAmt(perPax) + ' (£' + fmtAmt(perPaxGBP) + ')/pax' : '';
      // Find matching statement - check both annotations array AND embedded statementIndex
      const annotationMatch = annotations ? annotations.find(a => a.ref === exp.ref || a.ref === String(exp.seqRef)) : null;
      const matchStmtIdx = annotationMatch ? (annotationMatch.statementIndex || 0) : (exp.statementIndex !== undefined ? exp.statementIndex : -1);
      const matchStmtImg = matchStmtIdx >= 0 && statementsArray[matchStmtIdx] ? statementsArray[matchStmtIdx] : null;
      
      // Auto-resize: reduce heights when there's long content
      const notesLen = (exp.adminNotes || '').length;
      const attendeesLen = (exp.attendees || '').length;
      const heightPenalty = Math.min(50, Math.floor(notesLen / 50) * 10 + Math.floor(attendeesLen / 100) * 10 + (exp.hasBackcharge ? 10 : 0));
      
      // Receipt sizing - proportionate for both receipts
      const hasReceipt1 = !!exp.receiptPreview;
      const hasReceipt2 = !!exp.receiptPreview2;
      const hasTwoReceipts = hasReceipt1 && hasReceipt2;
      const baseHeight = matchStmtImg ? 130 : 200;
      const availableHeight = baseHeight - heightPenalty;
      // If only receipt 2, give it full height. If both, split proportionally.
      const firstH = hasTwoReceipts ? Math.floor(availableHeight * 0.55) : availableHeight;
      const secondH = hasTwoReceipts ? Math.floor(availableHeight * 0.40) : (hasReceipt2 && !hasReceipt1 ? availableHeight : 0);
      
      const receiptContent = (exp.receiptPreview ? '<img src="' + exp.receiptPreview + '" style="max-width:100%;max-height:' + firstH + 'mm;object-fit:contain;display:block;" />' : (hasReceipt2 ? '' : '<div style="background:#f5f5f5;padding:30px;text-align:center;color:#999;">No receipt</div>')) + (exp.receiptPreview2 ? '<div style="' + (hasReceipt1 ? 'margin-top:6px;border-top:2px dashed #ccc;padding-top:6px;' : '') + '"><img src="' + exp.receiptPreview2 + '" style="max-width:100%;max-height:' + secondH + 'mm;object-fit:contain;display:block;" /></div>' : '');
      const stmtContent = matchStmtImg ? '<div style="flex:1;max-width:48%;border-left:3px solid #ff9800;padding-left:8px;"><div style="background:#ff9800;color:white;padding:5px 10px;font-weight:bold;font-size:9px;margin-bottom:8px;border-radius:4px;">💳 Matched Statement ' + (matchStmtIdx + 1) + '</div><img src="' + matchStmtImg + '" style="max-width:100%;max-height:' + (160 - heightPenalty) + 'mm;object-fit:contain;border:1px solid #ddd;" /></div>' : '';
      const contentHTML = matchStmtImg ? '<div style="display:flex;gap:10px;align-items:flex-start;"><div style="flex:1;max-width:50%;">' + receiptContent + '</div>' + stmtContent + '</div>' : receiptContent;
      return '<div class="page receipt-page"><div class="receipt-header"><div class="receipt-ref">' + exp.seqRef + '</div><div class="receipt-info"><strong>' + exp.merchant + '</strong> | ' + formatDDMMYYYY(new Date(exp.date)) + '<br>' + cat.name + ' | ' + exp.currency + ' ' + fmtAmt(exp.amount) + (exp.isForeignCurrency ? ' → ' + reimburseCurrency + ' ' + fmtAmt(exp.reimbursementAmount) : '') + '<br>' + (exp.description || '') + oldBadge + dupBadge + paxInfo + (exp.attendees ? '<br>' + exp.attendees.replace(/\n/g, ', ') : '') + (exp.adminNotes ? '<br><div style="background:#fff8e1;padding:2px 4px;border-radius:3px;">📝 ' + formatAdminNotesHTML(exp.adminNotes) + '</div>' : '') + backchargeHTML + '</div></div>' + contentHTML + '</div>';
    }).join('');

    // Statement pages (statementsArray already declared above)
    const statementsHTML = statementsArray.map((img, idx) => '<div class="page statement-page"><div class="statement-header">Credit Card/Bank Statement ' + (statementsArray.length > 1 ? (idx + 1) + ' of ' + statementsArray.length : '') + '</div><img src="' + img + '" class="statement-img" /></div>').join('');

    // Backcharge report
    const backchargeReportHTML = Object.keys(backchargeSummary).length > 0 ? '<div class="page"><h2 style="text-align:center;color:#9c27b0;">Backcharge Summary</h2><table class="detail-table"><thead><tr><th>Development</th><th>Line #</th><th>Date</th><th>%</th><th style="text-align:right;">Amount</th></tr></thead><tbody>' + Object.entries(backchargeSummary).map(([dev, data]) => data.items.map((item, idx) => '<tr><td>' + (idx === 0 ? '<strong>' + dev + '</strong>' : '') + '</td><td>' + item.ref + '</td><td>' + formatDDMMYYYY(new Date(item.date)) + '</td><td>' + item.percentage + '%</td><td style="text-align:right;">' + fmtAmt(item.amount) + '</td></tr>').join('') + '<tr style="background:#e1bee7;"><td colspan="4"><strong>Subtotal</strong></td><td style="text-align:right;"><strong>' + fmtAmt(data.total) + '</strong></td></tr>').join('') + '</tbody></table></div>' : '';

    const html = '<!DOCTYPE html><html><head><title>Expense Claim</title><style>' +
      '*{margin:0;padding:0;box-sizing:border-box;}' +
      'body{font-family:Arial,sans-serif;font-size:9px;}' +
      '@page{margin:8mm;size:A4;}' +
      '.page{page-break-after:always;padding:3mm;}' +
      '.page:last-child{page-break-after:avoid;}' +
      'h1{text-align:center;font-size:12px;font-weight:bold;margin-bottom:8px;}' +
      '.info-table{width:100%;border-collapse:collapse;margin-bottom:6px;}' +
      '.info-table td{padding:3px 6px;border:1px solid #ccc;font-size:9px;}' +
      '.info-table .label{background:#f5f5f5;font-weight:bold;width:40%;}' +
      '.info-table .value{background:#fffde7;}' +
      '.summary-table{width:100%;border-collapse:collapse;margin-top:6px;}' +
      '.summary-table th,.summary-table td{padding:2px 4px;border:1px solid #ccc;font-size:8px;}' +
      '.summary-table th{background:#e0e0e0;text-align:left;}' +
      '.group-row td{background:#f5f5f5;font-weight:bold;}' +
      '.total-row td{background:#000;color:#fff;font-weight:bold;}' +
      '.detail-table{width:100%;border-collapse:collapse;font-size:8px;}' +
      '.detail-table th,.detail-table td{border:1px solid #ccc;padding:3px;}' +
      '.detail-table th{background:#e8eaf6;text-align:left;}' +
      '.receipt-page{padding:5mm;}' +
      '.receipt-header{background:#1565c0;color:#fff;padding:10px;display:flex;align-items:flex-start;border-radius:4px;margin-bottom:10px;}' +
      '.receipt-ref{font-size:24px;font-weight:bold;margin-right:15px;}' +
      '.receipt-info{font-size:10px;line-height:1.6;}' +
      '.receipt-img{max-width:100%;max-height:220mm;object-fit:contain;display:block;margin:0 auto;}' +
      '.no-receipt{background:#f5f5f5;padding:40px;text-align:center;color:#999;}' +
      '.statement-page{padding:5mm;}' +
      '.statement-header{background:#ff9800;color:#fff;padding:8px;text-align:center;font-weight:bold;}' +
      '.statement-img{max-width:100%;max-height:260mm;object-fit:contain;display:block;margin:0 auto;border:1px solid #ccc;}' +
      '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}' +
      '</style></head><body>' +
      
      // PAGE 1: Summary - FIXED: removed e-signature, compact to fit 1 page
      '<div class="page">' +
      '<h1>BERKELEY INTERNATIONAL EMPLOYEE EXPENSE CLAIM FORM</h1>' +
      '<table class="info-table">' +
      '<tr><td class="label">EMPLOYEE FULL NAME</td><td class="value">' + userName + '</td></tr>' +
      '<tr><td class="label">OFFICE MAKING PAYMENT</td><td class="value">' + (office?.name || '') + '</td></tr>' +
      '<tr><td class="label">CURRENCY OF PAYMENT</td><td class="value">' + reimburseCurrency + '</td></tr>' +
      '<tr><td class="label">DATE OF SUBMISSION BY CLAIMANT (dd/mm/yyyy)</td><td class="value">' + formatDDMMYYYY(new Date(submittedDate || new Date())) + '</td></tr>' +
      '</table>' +
      '<table class="info-table">' +
      '<tr><td class="label">PRINT APPROVERS NAME</td><td class="value">' + (level2ApprovedBy || '') + '</td></tr>' +
      '<tr><td class="label">DATE OF APPROVAL (dd/mm/yyyy)</td><td class="value">' + (level2ApprovedAt ? formatDDMMYYYY(new Date(level2ApprovedAt)) : '') + '</td></tr>' +
      '</table>' +
      '<table class="info-table" style="margin-top:6px;">' +
      '<tr><td class="label">DATE OF OLDEST EXPENSE CLAIMED <span style="color:red;font-size:7px;">(Red if >2months old)</span></td><td class="value" style="' + (isOldestOver2Months ? 'background:#ffcdd2;color:red;' : '') + '">' + formatDDMMYYYY(oldestDate) + '</td></tr>' +
      '<tr><td class="label">DATE OF NEWEST EXPENSE CLAIMED</td><td class="value">' + formatDDMMYYYY(newestDate) + '</td></tr>' +
      '</table>' +
      // FIXED: 3 columns - Category | Amount (with currency header) | GL Code
      '<table class="summary-table">' +
      '<thead><tr><th style="background:#e0e0e0;">CLAIM SUMMARY</th><th style="text-align:right;background:#e0e0e0;">' + reimburseCurrency + '</th><th style="text-align:right;background:#e0e0e0;"></th></tr></thead>' +
      '<tbody>' + buildCategorySummary() + '</tbody>' +
      '<tfoot><tr class="total-row"><td>CLAIM TOTAL</td><td style="text-align:right;">' + fmtAmt(totalAmount) + '</td><td></td></tr></tfoot>' +
      '</table>' +
      '</div>' +
      
      // PAGE 2: Detail - FIXED: totals with currency and commas
      (expensesWithRefs.length > 0 ? '<div class="page">' +
      '<h2 style="text-align:center;margin-bottom:8px;font-size:11px;">Expense Claim Detail</h2>' +
      '<p style="margin-bottom:8px;font-size:9px;">Name: <strong>' + userName + '</strong> | Claim: <strong>' + (claimNumber || 'DRAFT') + '</strong> | ' + expensesWithRefs.length + ' items</p>' +
      '<table class="detail-table">' +
      '<thead><tr>' +
      '<th style="width:3%;">REF</th>' +
      '<th style="width:8%;">RECEIPT<br>DATE</th>' +
      '<th style="width:14%;">CATEGORY</th>' +
      '<th style="width:30%;">DESCRIPTION OF EXPENSE BEING CLAIMED</th>' +
      '<th style="width:12%;text-align:right;">TOTAL SHOWN<br>ON THE RECEIPT<br><small>(Original currency)</small></th>' +
      '<th style="width:12%;text-align:right;">TOTAL IN CLAIM<br>CURRENCY<br><small>(As per bank or<br>card statement)</small></th>' +
      '<th style="width:9%;text-align:right;">FX RATE</th>' +
      '<th style="width:12%;text-align:right;">GBP<br>APPROX</th>' +
      '</tr></thead>' +
      '<tbody>' + buildDetailTable() + '</tbody>' +
      '<tfoot><tr style="background:#1565c0;color:#fff;font-weight:bold;">' +
      '<td colspan="4">TOTAL</td>' +
      '<td></td>' +
      '<td style="text-align:right;">' + reimburseCurrency + ' ' + fmtAmt(totalAmount) + '</td>' +
      '<td></td>' +
      '<td style="text-align:right;">£' + fmtAmt(totalGBP) + '</td>' +
      '</tr></tfoot>' +
      '</table></div>' : '') +
      
      backchargeReportHTML + receiptsHTML + statementsHTML +
      '<script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);};<\/script>' +
      '</body></html>';
    
    printWindow.document.write(html);
    printWindow.document.close();
  };


  const handleDownloadPDF = async (claim) => {
    setDownloading(true);
    try {
      const emp = EMPLOYEES.find(e => e.id === claim.user_id);
      const statements = claim.annotated_statements || (claim.annotated_statement ? [claim.annotated_statement] : []);
      await generatePDFFromHTML(claim.expenses || [], claim.user_name, emp?.office, claim.claim_number, claim.submitted_at, statements, emp?.reimburseCurrency || claim.currency, claim.level2_approved_by, claim.level2_approved_at, claim.annotations || []);
    } catch (err) { alert('❌ Failed'); }
    setDownloading(false);
  };

  const handleDownloadPreviewPDF = async () => {
    setDownloading(true);
    try {
      // Generate claim number based on oldest expense date
      const oldestDate = pendingExpenses.length > 0 
        ? new Date(pendingExpenses.reduce((min, e) => e.date < min ? e.date : min, pendingExpenses[0]?.date))
        : new Date();
      const lastName = currentUser.name.trim().split(' ').pop();
      const draftClaimNumber = `${lastName} - ${oldestDate.getFullYear()} - ${String(oldestDate.getMonth() + 1).padStart(2, '0')}`;
      await generatePDFFromHTML(pendingExpenses, currentUser.name, currentUser.office, draftClaimNumber, new Date().toISOString(), annotatedStatements, getUserReimburseCurrency(currentUser), null, null, statementAnnotations);
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
      
      // Embed statement annotation info into each expense
      const expensesWithAnnotations = pendingExpenses.map(exp => {
        const annotation = statementAnnotations.find(a => a.ref === exp.ref);
        if (annotation) {
          return { ...exp, statementIndex: annotation.statementIndex || 0 };
        }
        return exp;
      });
      
      if (returned) {
        // Validate returned claim has an ID
        if (!returned.id) {
          throw new Error('Returned claim has no ID');
        }
        
        const updateData = { 
          total_amount: reimbursementTotal, 
          item_count: pendingExpenses.length, 
          status: isSelfSubmit ? 'approved' : 'pending_review', 
          approval_level: isSelfSubmit ? 2 : 1, 
          expenses: expensesWithAnnotations,
          annotated_statement: annotatedStatements[0] || null
        };
        if (isSelfSubmit) {
          updateData.level2_approved_by = workflow?.externalApproval || 'Self-Approved';
          updateData.level2_approved_at = new Date().toISOString();
        }
        if (annotatedStatements && annotatedStatements.length > 0) {
          updateData.annotated_statements = annotatedStatements;
        }
        
        // Try to save original_statements (may not exist in DB yet)
        if (originalStatementImages && originalStatementImages.length > 0) {
          updateData.original_statements = originalStatementImages;
        }
        
        console.log('Attempting to update claim:', returned.id, 'with data keys:', Object.keys(updateData));
        
        let result = await supabase.from('claims').update(updateData).eq('id', returned.id);
        
        // If failed, progressively remove optional columns and retry
        if (result.error) {
          console.log('Update failed, trying without original_statements:', result.error);
          delete updateData.original_statements;
          result = await supabase.from('claims').update(updateData).eq('id', returned.id);
        }
        
        if (result.error) {
          console.log('Still failing, trying without annotated_statements:', result.error);
          delete updateData.annotated_statements;
          result = await supabase.from('claims').update(updateData).eq('id', returned.id);
        }
        
        if (result.error) {
          console.log('Still failing, trying without annotated_statement:', result.error);
          delete updateData.annotated_statement;
          result = await supabase.from('claims').update(updateData).eq('id', returned.id);
        }
        
        if (result.error) {
          console.error('All update attempts failed:', result.error);
          throw new Error(`Failed to update claim: ${result.error.message || result.error.code || JSON.stringify(result.error)}`);
        }
      } else {
        // Use oldest expense date for claim number (consistent with draft preview)
        const oldestExpenseDate = pendingExpenses.reduce((oldest, exp) => {
          const d = new Date(exp.date);
          return !oldest || d < oldest ? d : oldest;
        }, null) || new Date();
        
        const year = oldestExpenseDate.getFullYear();
        const month = String(oldestExpenseDate.getMonth() + 1).padStart(2, '0');
        const lastName = currentUser.name.trim().split(' ').pop();
        
        // Check if user already has a claim for this month and add suffix if needed
        const baseClaimNumber = `${lastName} - ${year} - ${month}`;
        const existingClaims = claims.filter(c => 
          c.user_id === currentUser.id && 
          c.claim_number && 
          c.claim_number.startsWith(baseClaimNumber)
        );
        
        // Generate unique claim number
        let claimNumber = baseClaimNumber;
        if (existingClaims.length > 0) {
          // Find highest suffix
          let maxSuffix = 0;
          existingClaims.forEach(c => {
            const match = c.claim_number.match(new RegExp(`${baseClaimNumber}(-(\\d+))?$`));
            if (match) {
              const suffix = match[2] ? parseInt(match[2]) : 1;
              maxSuffix = Math.max(maxSuffix, suffix);
            }
          });
          claimNumber = `${baseClaimNumber}-${maxSuffix + 1}`;
        }

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
          expenses: expensesWithAnnotations,
          submitted_at: new Date().toISOString()
        };
        if (isSelfSubmit) {
          insertData.level1_approved_by = currentUser.name;
          insertData.level1_approved_at = new Date().toISOString();
          insertData.level2_approved_by = workflow?.externalApproval || 'Self-Approved';
          insertData.level2_approved_at = new Date().toISOString();
        }
        if (annotatedStatements && annotatedStatements.length > 0) insertData.annotated_statements = annotatedStatements;
        
        // Try with original_statements first (may not exist in DB yet)
        if (originalStatementImages && originalStatementImages.length > 0) {
          insertData.original_statements = originalStatementImages;
        }
        
        console.log('Attempting to create claim with data keys:', Object.keys(insertData));
        
        let result = await supabase.from('claims').insert([insertData]);
        
        // If failed, progressively remove optional columns and retry
        if (result.error) {
          console.log('Insert failed, trying without original_statements:', result.error);
          delete insertData.original_statements;
          result = await supabase.from('claims').insert([insertData]);
        }
        
        if (result.error) {
          console.log('Still failing, trying without annotated_statements:', result.error);
          delete insertData.annotated_statements;
          result = await supabase.from('claims').insert([insertData]);
        }
        
        if (result.error) {
          console.log('Still failing, trying without annotated_statement:', result.error);
          delete insertData.annotated_statement;
          result = await supabase.from('claims').insert([insertData]);
        }
        
        if (result.error) {
          console.error('All insert attempts failed:', result.error);
          throw new Error(`Failed to create claim: ${result.error.message || result.error.code || JSON.stringify(result.error)}`);
        }
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

  const handleRequestChanges = async (claimId, comment, flaggedExpenses = []) => {
    setLoading(true);
    try {
      // Build comment with flagged refs
      const flaggedText = flaggedExpenses.length > 0 
        ? `[Flagged: ${flaggedExpenses.join(', ')}] ` 
        : '';
      const fullComment = flaggedText + comment;
      
      // Try with flagged_expenses first, fall back without if column doesn't exist
      const updateData = { 
        status: 'changes_requested', 
        admin_comment: fullComment,
        reviewed_by: currentUser.name,
        approval_level: 1
      };
      
      // Only add flagged_expenses if there are any
      if (flaggedExpenses.length > 0) {
        updateData.flagged_expenses = flaggedExpenses;
      }
      
      let result = await supabase.from('claims').update(updateData).eq('id', claimId);
      
      // If failed and we tried flagged_expenses, retry without it
      if (result.error && flaggedExpenses.length > 0) {
        delete updateData.flagged_expenses;
        result = await supabase.from('claims').update(updateData).eq('id', claimId);
      }
      
      if (result.error) throw result.error;
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
      const { data, error } = await supabase.from('claims').update({ 
        expenses: editedExpenses, 
        total_amount: newTotal, 
        edited_by: currentUser.name 
      }).eq('id', claim.id);
      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message || 'Database error');
      }
      await loadClaims();
      setSelectedClaim(prev => prev ? { ...prev, expenses: editedExpenses, total_amount: newTotal, edited_by: currentUser.name } : null);
      setLoading(false);
      return { success: true };
    } catch (err) { 
      console.error('Save error:', err); 
      setLoading(false);
      return { success: false, error: err.message || 'Unknown error' };
    }
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
          <p className="text-center text-xs text-slate-400 mt-8">Berkeley International</p>
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
    
    // Parse existing attendees string into structured array
    const parseAttendeesToArray = (attendeesStr) => {
      if (!attendeesStr) return [];
      return attendeesStr.split('\n').filter(line => line.trim()).map(line => {
        const parts = line.split(' - ');
        return { name: parts[0]?.trim() || '', company: parts[1]?.trim() || '' };
      });
    };
    
    const [formData, setFormData] = useState(editExpense ? { 
      merchant: editExpense.merchant || '', 
      amount: editExpense.amount || '', 
      currency: editExpense.currency || userOffice?.currency || 'SGD', 
      date: editExpense.date || new Date().toISOString().split('T')[0], 
      category: editExpense.category || 'C', 
      description: editExpense.description || '', 
      attendeesList: parseAttendeesToArray(editExpense.attendees),
      numberOfPax: editExpense.numberOfPax || '', 
      reimbursementAmount: editExpense.reimbursementAmount || '', 
      hasBackcharge: editExpense.hasBackcharge || false, 
      backcharges: editExpense.backcharges || [] 
    } : { 
      merchant: '', 
      amount: '', 
      currency: userOffice?.currency || 'SGD', 
      date: new Date().toISOString().split('T')[0], 
      category: 'C', 
      description: '', 
      attendeesList: [],
      numberOfPax: '', 
      reimbursementAmount: '', 
      hasBackcharge: false, 
      backcharges: [] 
    });
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

    const [isUploading, setIsUploading] = useState(false);
    
    const handleFileChange = async (e, isSecond = false) => { 
      const file = e.target.files?.[0]; 
      if (!file) return;
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          // Upload to Supabase Storage (falls back to compressed base64 if storage fails)
          const imageUrl = await uploadImageToStorage(event.target.result, currentUser.id, 'receipt');
          if (isSecond) setReceiptPreview2(imageUrl); 
          else { setReceiptPreview(imageUrl); setStep(2); }
        } catch (err) {
          console.error('Upload failed:', err);
          // Fallback to compressed base64
          const compressed = await compressImage(event.target.result);
          if (isSecond) setReceiptPreview2(compressed); 
          else { setReceiptPreview(compressed); setStep(2); }
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    };
    const addBackcharge = () => setFormData(prev => ({ ...prev, backcharges: [...prev.backcharges, { development: '', percentage: '' }] }));
    const updateBackcharge = (idx, field, value) => setFormData(prev => ({ ...prev, backcharges: prev.backcharges.map((bc, i) => i === idx ? { ...bc, [field]: value } : bc) }));
    const removeBackcharge = (idx) => setFormData(prev => ({ ...prev, backcharges: prev.backcharges.filter((_, i) => i !== idx) }));
    const backchargeTotal = formData.backcharges.reduce((sum, bc) => sum + (parseFloat(bc.percentage) || 0), 0);
    const backchargeValid = !formData.hasBackcharge || (formData.backcharges.length > 0 && backchargeTotal >= 99.5 && backchargeTotal <= 100.5);
    
    // Structured attendee functions (like backcharges)
    const addAttendee = () => setFormData(prev => ({ ...prev, attendeesList: [...prev.attendeesList, { name: '', company: '' }] }));
    const updateAttendee = (idx, field, value) => setFormData(prev => ({ ...prev, attendeesList: prev.attendeesList.map((att, i) => i === idx ? { ...att, [field]: value } : att) }));
    const removeAttendee = (idx) => setFormData(prev => ({ ...prev, attendeesList: prev.attendeesList.filter((_, i) => i !== idx) }));
    
    // Convert attendeesList to string format for storage
    const attendeesString = formData.attendeesList.map(att => `${att.name}${att.company ? ' - ' + att.company : ''}`).join('\n');
    
    // Check if this expense type needs attendees
    const needsAttendees = EXPENSE_CATEGORIES[formData.category]?.requiresAttendees;
    const paxCount = parseInt(formData.numberOfPax) || 0;
    const attendeeCount = formData.attendeesList.filter(att => att.name.trim()).length;
    const attendeePaxMatch = !needsAttendees || (paxCount > 0 && paxCount === attendeeCount);

    const handleSave = async () => {
      // BLOCKER POPUP logic
      if (duplicateWarning) {
        const confirmSave = window.confirm("⚠️ DUPLICATE DETECTED\n\nWe found another expense with the same Date, Amount, and Currency.\n\nAre you sure you want to save this?");
        if (!confirmSave) return;
      }

      try {
        const forexRate = isForeignCurrency ? calculatedRate : null;
        // Convert structured attendees to string for storage
        const attendeesForSave = attendeesString;
        
        let newExpenses;
        if (editExpense) { 
          newExpenses = expenses.map(e => e.id === editExpense.id ? { ...e, ...formData, attendees: attendeesForSave, amount: parseFloat(formData.amount), reimbursementAmount: isForeignCurrency ? parseFloat(formData.reimbursementAmount) : parseFloat(formData.amount), receiptPreview: receiptPreview || e.receiptPreview, receiptPreview2: receiptPreview2 || e.receiptPreview2, isForeignCurrency, isPotentialDuplicate: !!duplicateWarning, forexRate, updatedAt: new Date().toISOString() } : e);
          newExpenses = sortAndReassignRefs(newExpenses);
          setExpenses(newExpenses);
        } else { 
          const newExpense = { id: Date.now(), ref: 'temp', ...formData, attendees: attendeesForSave, amount: parseFloat(formData.amount) || 0, reimbursementAmount: isForeignCurrency ? (parseFloat(formData.reimbursementAmount) || 0) : (parseFloat(formData.amount) || 0), receiptPreview: receiptPreview || null, receiptPreview2: receiptPreview2 || null, status: 'draft', isForeignCurrency: isForeignCurrency || false, isOld: isOlderThan2Months(formData.date), createdAt: new Date().toISOString(), isPotentialDuplicate: !!duplicateWarning, forexRate };
          // If this is a duplicate, also mark the matching expense as duplicate
          let existingExpenses = [...expenses];
          if (duplicateWarning) {
            existingExpenses = expenses.map(e => {
              if (parseFloat(e.amount) === parseFloat(formData.amount) && e.date === formData.date && e.currency === formData.currency) {
                return { ...e, isPotentialDuplicate: true };
              }
              return e;
            });
          }
          newExpenses = sortAndReassignRefs([...existingExpenses, newExpense]);
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
    
    const canSave = formData.merchant && formData.amount && formData.date && formData.description && (!needsAttendees || (attendeeCount > 0 && formData.numberOfPax)) && (!isForeignCurrency || formData.reimbursementAmount) && backchargeValid && attendeePaxMatch;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 flex justify-between items-center"><div><h2 className="text-lg font-bold">{editExpense ? '✏️ Edit' : '📸 Add'} Expense</h2><p className="text-blue-100 text-sm">Reimburse in {userReimburseCurrency}</p></div><button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20">✕</button></div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {step === 1 && (<div className="space-y-3">{isUploading ? (<div className="text-center py-12"><div className="text-4xl mb-2 animate-pulse">☁️</div><p className="font-semibold text-blue-700">Uploading...</p><p className="text-xs text-slate-500">Please wait</p></div>) : (<><label className="block border-3 border-dashed border-blue-400 bg-blue-50 rounded-2xl p-6 text-center cursor-pointer hover:border-blue-500"><input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, false)} className="hidden" /><div className="text-4xl mb-2">📷</div><p className="font-semibold text-blue-700">Take Photo</p><p className="text-xs text-slate-500">Open camera</p></label><label className="block border-3 border-dashed border-green-400 bg-green-50 rounded-2xl p-6 text-center cursor-pointer hover:border-green-500"><input type="file" accept="image/*" onChange={(e) => handleFileChange(e, false)} className="hidden" /><div className="text-4xl mb-2">🖼️</div><p className="font-semibold text-green-700">Choose from Gallery</p><p className="text-xs text-slate-500">Select existing photo</p></label></>)}</div>)}
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
                  <p className="text-sm font-bold text-amber-800 mb-2">💳 Bank or Card Statement Amount</p>
                  <p className="text-xs text-amber-600 mb-2">Enter the {userReimburseCurrency} amount shown on your bank or card statement</p>
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
                {/* Category Guidelines - Collapsible */}
                <details className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <summary className="font-semibold text-blue-800 cursor-pointer text-sm">📋 Category Guidelines (click to expand)</summary>
                  <div className="mt-3 text-xs text-slate-700 space-y-2">
                    <p><strong>🚕 Taxis:</strong> Uber, Grab, cabs - Include pickup/dropoff locations</p>
                    <p><strong>✈️ Flights:</strong> Business travel only - Include route and purpose</p>
                    <p><strong>🚇 Public Transport:</strong> Trains, tubes, buses for business</p>
                    <p><strong>🅿️ Parking & Tolls:</strong> Business-related parking fees</p>
                    <p><strong>📋 Visas & Tourist Fees:</strong> Work travel permits only</p>
                    <p><strong>🚗 Car Hire & Petrol:</strong> Business trips - Include mileage/route</p>
                    <p><strong>📍 Business Mileage:</strong> Personal car for business - £0.45/mile first 10k</p>
                    <p><strong>🍽️ Meals Self:</strong> When travelling for work</p>
                    <p><strong>👥 Meals with Berkeley:</strong> Internal team meals - List all attendees</p>
                    <p><strong>🍷 Meals with Non-Berkeley:</strong> Client entertainment - List all attendees & companies</p>
                    <p><strong>👔 Hotel Laundry:</strong> Only for trips 5+ days</p>
                    <p><strong>🎯 Team Activity:</strong> Team building events - Need prior approval</p>
                    <p><strong>🎁 Staff Gifts:</strong> Max £50 per person - Birthdays/leaving</p>
                    <p><strong>☕ Pantry Supplies:</strong> Coffee, milk, snacks for office</p>
                    <p><strong>🖨️ Marketing:</strong> Prints, branded goods, event costs</p>
                  </div>
                </details>
                <div className="grid grid-cols-2 gap-4">
                  <input type="date" className="p-3 border-2 border-slate-200 rounded-xl" value={formData.date} onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))} />
                  <select className="p-3 border-2 border-slate-200 rounded-xl bg-white text-sm" value={formData.category} onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}>
                    <optgroup label="Travel">
                      {Object.entries(EXPENSE_CATEGORIES).filter(([k,v]) => v.group === 'TRAVEL').map(([key, val]) => <option key={key} value={key}>{val.icon} {val.name}</option>)}
                    </optgroup>
                    <optgroup label="Subsistence & Welfare">
                      {Object.entries(EXPENSE_CATEGORIES).filter(([k,v]) => v.group === 'SUBSISTENCE').map(([key, val]) => <option key={key} value={key}>{val.icon} {val.name}</option>)}
                    </optgroup>
                    <optgroup label="Business Entertaining">
                      {Object.entries(EXPENSE_CATEGORIES).filter(([k,v]) => v.group === 'ENTERTAINING').map(([key, val]) => <option key={key} value={key}>{val.icon} {val.name}</option>)}
                    </optgroup>
                    <optgroup label="Office Costs">
                      {Object.entries(EXPENSE_CATEGORIES).filter(([k,v]) => v.group === 'OFFICE').map(([key, val]) => <option key={key} value={key}>{val.icon} {val.name}</option>)}
                    </optgroup>
                    <optgroup label="Marketing & Events">
                      {Object.entries(EXPENSE_CATEGORIES).filter(([k,v]) => v.group === 'MARKETING').map(([key, val]) => <option key={key} value={key}>{val.icon} {val.name}</option>)}
                    </optgroup>
                    <optgroup label="Legal & Professional">
                      {Object.entries(EXPENSE_CATEGORIES).filter(([k,v]) => v.group === 'LEGAL').map(([key, val]) => <option key={key} value={key}>{val.icon} {val.name}</option>)}
                    </optgroup>
                    <optgroup label="Other">
                      {Object.entries(EXPENSE_CATEGORIES).filter(([k,v]) => v.group === 'OTHER').map(([key, val]) => <option key={key} value={key}>{val.icon} {val.name}</option>)}
                    </optgroup>
                  </select>
                </div>
                <textarea className="w-full p-3 border-2 border-slate-200 rounded-xl resize-none" rows="2" placeholder={EXPENSE_CATEGORIES[formData.category]?.example || 'Description *'} value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} />
                {needsAttendees && (
                  <div className="space-y-3">
                    <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Number of Pax *</label><input type="number" min="1" className="w-full p-3 border-2 border-slate-200 rounded-xl" placeholder="e.g. 4" value={formData.numberOfPax} onChange={e => setFormData(prev => ({ ...prev, numberOfPax: e.target.value }))} /></div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Attendees (Name & Company/OpCo) *</label>
                      <div className="space-y-2">
                        {formData.attendeesList.map((att, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input type="text" className="flex-1 p-2 border rounded-lg text-sm" placeholder="Name" value={att.name} onChange={e => updateAttendee(idx, 'name', e.target.value)} />
                            <input type="text" className="flex-1 p-2 border rounded-lg text-sm" placeholder="Company/OpCo" value={att.company} onChange={e => updateAttendee(idx, 'company', e.target.value)} />
                            <button onClick={() => removeAttendee(idx)} className="text-red-500 p-1 hover:bg-red-50 rounded">✕</button>
                          </div>
                        ))}
                        <button onClick={addAttendee} className="text-blue-600 text-sm font-medium hover:text-blue-800">+ Add Attendee</button>
                      </div>
                    </div>
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
              <div className="text-center mb-6"><h1 className="text-xl font-bold">Berkeley International Expense Claim Form</h1><p className="text-sm text-slate-500">{getCompanyName(currentUser.office)}</p></div>
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm"><div><span className="text-slate-500">Name:</span> <strong>{currentUser.name}</strong></div><div><span className="text-slate-500">Currency:</span> <strong className="text-green-700">{userReimburseCurrency}</strong></div></div>
              {workflow && (<div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm"><p className="font-semibold text-blue-800">Approval: {workflow.selfSubmit ? `Direct Save → ${workflow.externalApproval || 'External'}` : workflow.singleLevel ? (workflow.externalApproval ? `${workflow.level1Name} → ${workflow.externalApproval}` : `${workflow.level1Name} (Final)`) : `${workflow.level1Name} → ${workflow.level2Name}`}</p></div>)}
              <table className="w-full text-sm"><tbody>{Object.entries(EXPENSE_CATEGORIES).filter(([cat, _]) => getCategoryTotal(cat) > 0).map(([cat, catData]) => (<tr key={cat} className="border-b"><td className="py-2 font-bold text-blue-700 w-10">{catData.icon}</td><td className="py-2">{catData.name}<span className="text-slate-400 text-xs ml-2">GL {catData.gl}</span></td><td className="py-2 text-right font-medium">{userReimburseCurrency} {getCategoryTotal(cat).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>))}</tbody></table>
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
    // Sort expenses by ref (A1, A2, B1, B2, etc.) for consistent ordering with expense claim form
    const sortedExpenses = [...(claim.expenses || [])].sort((a, b) => {
      const refA = a.ref || '999';
      const refB = b.ref || '999';
      // Try pure numeric sort first
      const numA = parseInt(refA);
      const numB = parseInt(refB);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      // Fall back to alphanumeric sort
      return refA.localeCompare(refB, undefined, { numeric: true });
    });
    const [editedExpenses, setEditedExpenses] = useState(sortedExpenses);
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
      
      const result = await handleSaveAdminEdits(claim, expensesWithComments);
      setSaving(false);
      
      if (result.success) {
        alert('✅ Changes saved');
        onClose();
      } else {
        alert(`❌ Failed to save: ${result.error}`);
        // Don't close modal on error so user can retry
      }
    };
    
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="bg-purple-600 text-white p-5 flex justify-between"><h2 className="font-bold">✏️ Edit: {claim.user_name}</h2><button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20">✕</button></div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">{editedExpenses.map((exp, idx) => {
            const isOld = isOlderThan2Months(exp.date);
            const isApproaching = isApproaching2Months(exp.date);
            const daysLeft = getDaysUntil2Months(exp.date);
            const paxCount = parseInt(exp.numberOfPax) || 0;
            const isEntertaining = EXPENSE_CATEGORIES[exp.category]?.requiresAttendees;
            const perPaxAmount = isEntertaining && paxCount > 0 ? (parseFloat(exp.reimbursementAmount || exp.amount) / paxCount) : 0;
            return (<div key={idx} className={`border-2 rounded-xl p-4 mb-4 ${exp.isPotentialDuplicate ? 'border-red-400 bg-red-50' : isOld ? 'border-red-400 bg-red-50' : isApproaching ? 'border-amber-400 bg-amber-50' : ''}`}>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-lg">{exp.ref}</span>
              {exp.isPotentialDuplicate && <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded font-semibold">⚠️ Potential Duplicate</span>}
              {isOld && <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded font-semibold animate-pulse">🚨 &gt;2 Months Old</span>}
              {isApproaching && <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded font-semibold">⏰ {daysLeft}d until 2 months</span>}
              {paxCount > 0 && <span className="bg-purple-100 text-purple-600 text-xs px-2 py-1 rounded">👥 {paxCount} pax</span>}
              {isEntertaining && paxCount > 0 && <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-1 rounded font-semibold">💰 {claim.currency} {perPaxAmount.toFixed(2)}/pax</span>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input className="p-2 border rounded-lg text-sm" placeholder="Merchant" value={exp.merchant} onChange={e => updateExpense(idx, 'merchant', e.target.value)} />
              <input type="number" className="p-2 border rounded-lg text-sm" placeholder="Amount" value={exp.reimbursementAmount || exp.amount} onChange={e => updateExpense(idx, 'reimbursementAmount', parseFloat(e.target.value))} />
              <input className="p-2 border rounded-lg text-sm col-span-2" placeholder="Description" value={exp.description} onChange={e => updateExpense(idx, 'description', e.target.value)} />
              {exp.attendees && <div className="col-span-2 bg-slate-50 p-2 rounded-lg text-xs text-slate-600">👥 {exp.attendees.replace(/\n/g, ', ')}</div>}
              {exp.adminNotes && (
                <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  <p className="text-xs font-semibold text-amber-700 mb-1">📝 Previous Comments:</p>
                  <div className="text-sm" dangerouslySetInnerHTML={{ __html: formatAdminNotesReact(exp.adminNotes) }} />
                </div>
              )}
              <div className="col-span-2 flex gap-2 items-start">
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap pt-2">{reviewerFirstName}:</span>
                <textarea 
                  className="flex-1 p-2 border-2 border-amber-300 bg-amber-50 rounded-lg text-sm min-h-[40px] resize-y" 
                  placeholder="Add comment..." 
                  rows={1}
                  value={newComments[idx] || ''} 
                  onChange={e => updateNewComment(idx, e.target.value)} 
                />
                <button 
                  onClick={() => updateNewComment(idx, '✓ Addressed')}
                  className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded hover:bg-green-200"
                  title="Mark as addressed"
                >
                  ✓
                </button>
                <button 
                  onClick={() => updateNewComment(idx, '⚠️ Still needs fix')}
                  className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded hover:bg-red-200"
                  title="Still needs attention"
                >
                  ⚠️
                </button>
              </div>
            </div>
          </div>);})}</div>
          <div className="p-4 border-t flex gap-3"><button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 font-semibold">Cancel</button><button onClick={handleSaveEdits} disabled={saving} className="flex-[2] py-3 rounded-xl bg-purple-600 text-white font-semibold disabled:opacity-50">{saving ? '⏳' : '💾 Save Changes'}</button></div>
        </div>
      </div>
    );
  };
  const MyExpensesTab = () => {
    const myClaims = claims.filter(c => c.user_id === currentUser.id);
    const returnedClaims = myClaims.filter(c => c.status === 'changes_requested');
    const userReimburseCurrency = getUserReimburseCurrency(currentUser);
    // Sort by date for sequential display (same order as PDF)
    const sortedExpenses = [...pendingExpenses].sort((a, b) => new Date(a.date) - new Date(b.date));
    return (
      <div className="space-y-4">
        {returnedClaims.length > 0 && (<div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4">
          <h3 className="font-bold text-amber-800 mb-2">⚠️ Changes Requested</h3>
          {returnedClaims.map(claim => {
            const flaggedRefs = claim.flagged_expenses || [];
            return (
              <div key={claim.id} className="bg-white rounded-lg p-3 mb-2">
                <p className="font-semibold">{claim.claim_number}</p>
                {flaggedRefs.length > 0 && (
                  <div className="flex flex-wrap gap-1 my-2">
                    {flaggedRefs.map(ref => (
                      <span key={ref} className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                        🚩 {ref}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-sm text-amber-700">"{claim.admin_comment}"</p>
                <p className="text-xs text-slate-500 mt-1">From: {claim.reviewed_by}</p>
              </div>
            );
          })}
        </div>)}
        <div className="grid grid-cols-2 gap-4"><div className="bg-white rounded-2xl shadow-lg p-6 text-center"><div className="text-4xl font-bold text-slate-800">{pendingExpenses.length}</div><div className="text-sm text-slate-500">Pending</div></div><div className="bg-white rounded-2xl shadow-lg p-6 text-center"><div className="text-2xl font-bold text-green-600">{formatCurrency(reimbursementTotal, userReimburseCurrency)}</div><div className="text-sm text-slate-500">To Reimburse</div></div></div>
        <div className="bg-white rounded-2xl shadow-lg p-6"><div className="flex flex-wrap gap-3"><button onClick={() => setShowAddExpense(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg">📸 Add Receipt</button>{pendingExpenses.length > 0 && (<button onClick={() => setShowPreview(true)} className="border-2 border-green-500 text-green-600 px-6 py-3 rounded-xl font-semibold">📋 Preview ({pendingExpenses.length})</button>)}<button onClick={handleManualSync} disabled={loading} className="border-2 border-slate-300 text-slate-600 px-4 py-3 rounded-xl font-semibold">{loading ? '⏳' : '🔄'} Sync</button></div></div>
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-800 mb-4">📋 Pending Expenses (sorted by date)</h3>
          {/* Warning banner for approaching/expired receipts */}
          {pendingExpenses.some(exp => isOlderThan2Months(exp.date)) && (
            <div className="bg-red-100 border-2 border-red-400 rounded-xl p-3 mb-4">
              <p className="text-red-700 font-semibold text-sm">🚨 Some receipts are over 2 months old and may not be reimbursable!</p>
            </div>
          )}
          {pendingExpenses.some(exp => isApproaching2Months(exp.date)) && !pendingExpenses.some(exp => isOlderThan2Months(exp.date)) && (
            <div className="bg-amber-100 border-2 border-amber-400 rounded-xl p-3 mb-4">
              <p className="text-amber-700 font-semibold text-sm">⏰ Some receipts are approaching 2 months old - submit soon!</p>
            </div>
          )}
          {pendingExpenses.length === 0 ? (<div className="text-center py-12 text-slate-400">📭 No pending</div>) : (
            <div className="space-y-2">{sortedExpenses.map((exp, idx) => {
              const flaggedRefs = returnedClaims.flatMap(c => c.flagged_expenses || []);
              const isOld = isOlderThan2Months(exp.date); 
              const isApproaching = isApproaching2Months(exp.date); 
              const daysLeft = getDaysUntil2Months(exp.date);
              const isFlagged = flaggedRefs.includes(exp.ref);
              const cat = EXPENSE_CATEGORIES[exp.category];
              return (<div key={exp.id} className={`flex items-center justify-between p-3 rounded-xl border-2 ${isFlagged ? 'bg-red-50 border-red-500 ring-2 ring-red-300' : exp.isPotentialDuplicate ? 'bg-orange-50 border-orange-400' : isOld ? 'bg-red-50 border-red-300' : isApproaching ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${isFlagged ? 'bg-red-500 text-white' : 'bg-blue-100 text-blue-700'}`}>{isFlagged && '🚩 '}{exp.ref}</span>
                    <span className="font-semibold text-sm">{exp.merchant}</span>
                    <span className="text-xs text-slate-400">{formatShortDate(exp.date)}</span>
                    {isFlagged && <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded animate-pulse">⚠️ Needs Attention</span>}
                    {exp.isPotentialDuplicate && <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded">⚠️ Duplicate?</span>}
                    {isOld && <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded animate-pulse">🚨 &gt;2 Months</span>}
                    {isApproaching && <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded">⏰ {daysLeft}d left</span>}
                    {exp.isForeignCurrency && <span className="text-amber-600 text-xs">💳</span>}
                    {exp.receiptPreview2 && <span className="text-slate-500 text-xs">📑</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{cat?.icon} {cat?.name} • {exp.description}</p>
                  {exp.adminNotes && <div className="text-xs mt-1 bg-amber-50 border border-amber-200 px-2 py-1 rounded"><span className="font-semibold">📝 Notes:</span><div dangerouslySetInnerHTML={{ __html: formatAdminNotesReact(exp.adminNotes) }} /></div>}
                  {exp.isForeignCurrency && exp.forexRate && <p className="text-xs text-amber-600 mt-0.5">💱 {exp.currency} → {userReimburseCurrency} @ {exp.forexRate.toFixed(4)}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-green-700">{formatCurrency(exp.reimbursementAmount || exp.amount, userReimburseCurrency)}</span>
                  <button onClick={() => setEditingExpense(exp)} className="text-blue-500 p-2">✏️</button>
                  <button onClick={() => handleDeleteExpense(exp.id)} className="text-red-500 p-2">🗑️</button>
                  </div>
                </div>); 
              })}</div>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-800 mb-4">📁 My Claims</h3>
          {myClaims.filter(c => c.status !== 'changes_requested').length === 0 ? <p className="text-center text-slate-400 py-8">None</p> : (<div className="space-y-2">{myClaims.filter(c => c.status !== 'changes_requested').map(claim => (<div key={claim.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border"><div><span className="font-semibold">{claim.claim_number}</span><span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${claim.status === 'approved' ? 'bg-green-100 text-green-700' : claim.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{getClaimStatusText(claim)}</span></div><div className="flex items-center gap-3"><span className="font-bold">{formatCurrency(claim.total_amount, claim.currency)}</span><button onClick={() => handleDownloadPDF(claim)} className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm">📥</button></div></div>))}</div>)}
        </div>
      </div>
    );
  };

  // ============ EMMA'S FINANCE DASHBOARD ============
  const FinanceDashboard = () => {
    const [dateFrom, setDateFrom] = useState(() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 3); // Default 3 months back
      return d.toISOString().split('T')[0];
    });
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
    const [reportType, setReportType] = useState('gl');
    const [includePending, setIncludePending] = useState(true); // Default ON for forecasting
    const [expandedGL, setExpandedGL] = useState(null);
    
    // Safety check - ensure claims is an array
    const allClaims = Array.isArray(claims) ? claims : [];
    
    // Get relevant claims based on filters
    const relevantClaims = allClaims.filter(c => {
      if (!c) return false;
      const isApproved = c.status === 'approved';
      // Include ALL non-rejected statuses when includePending is checked
      const isPendingOrInProgress = c.status === 'pending_review' || 
                                     c.status === 'pending_level2' || 
                                     c.status === 'changes_requested';
      
      if (!includePending && !isApproved) return false;
      if (includePending && !isApproved && !isPendingOrInProgress) return false;
      
      // Date filter based on submission date
      const subDate = c.submitted_at?.split('T')[0];
      if (subDate && dateFrom && subDate < dateFrom) return false;
      if (subDate && dateTo && subDate > dateTo) return false;
      return true;
    });
    
    // Backcharge Report: Group by development
    const backchargeData = {};
    relevantClaims.forEach(claim => {
      if (!claim) return;
      (claim.expenses || []).forEach(exp => {
        if (!exp) return;
        if (exp.hasBackcharge && exp.backcharges?.length > 0) {
          exp.backcharges.forEach(bc => {
            if (!bc) return;
            const dev = bc.development || 'Unassigned';
            if (!backchargeData[dev]) backchargeData[dev] = { items: [], total: 0 };
            const amt = (parseFloat(exp.reimbursementAmount || exp.amount) || 0) * ((parseFloat(bc.percentage) || 0) / 100);
            const gbpAmt = toGBP(amt, claim.currency || 'GBP');
            backchargeData[dev].items.push({
              claimNumber: claim.claim_number || '-',
              claimant: claim.user_name || 'Unknown',
              office: claim.office_code || '-',
              date: exp.date,
              merchant: exp.merchant || '-',
              category: exp.category,
              percentage: bc.percentage || 0,
              amount: amt,
              gbpAmount: gbpAmt,
              currency: claim.currency || 'GBP',
              status: claim.status || 'unknown'
            });
            backchargeData[dev].total += gbpAmt;
          });
        }
      });
    });
    
    // GL Report: Group by GL code WITH office breakdown
    const glData = {};
    relevantClaims.forEach(claim => {
      if (!claim) return;
      (claim.expenses || []).forEach(exp => {
        if (!exp) return;
        const cat = EXPENSE_CATEGORIES[exp.category];
        const gl = cat?.gl || '9999';
        const glName = cat?.name || exp.category || 'Unknown';
        const office = claim.office_code || 'Unknown';
        
        if (!glData[gl]) glData[gl] = { name: glName, items: [], totalGBP: 0, byOffice: {} };
        if (!glData[gl].byOffice[office]) glData[gl].byOffice[office] = { items: [], totalGBP: 0 };
        
        const amt = parseFloat(exp.reimbursementAmount || exp.amount) || 0;
        const gbpAmt = toGBP(amt, claim.currency || 'GBP');
        
        const itemData = {
          claimNumber: claim.claim_number || '-',
          claimant: claim.user_name || 'Unknown',
          office: office,
          date: exp.date,
          merchant: exp.merchant || '-',
          description: exp.description || '-',
          amount: amt,
          currency: claim.currency || 'GBP',
          gbpAmount: gbpAmt,
          status: claim.status
        };
        
        glData[gl].items.push(itemData);
        glData[gl].totalGBP += gbpAmt;
        glData[gl].byOffice[office].items.push(itemData);
        glData[gl].byOffice[office].totalGBP += gbpAmt;
      });
    });
    
    // Submissions Report: Per employee with date range totals
    const employeeData = {};
    const submissionsInRange = relevantClaims.length;
    
    allClaims.forEach(claim => {
      if (!claim) return;
      const empId = claim.user_id;
      if (!empId) return;
      if (!employeeData[empId]) {
        employeeData[empId] = { 
          name: claim.user_name || 'Unknown', 
          office: claim.office_code || '-',
          lastSubmission: null,
          lastExpenseDate: null,
          totalClaims: 0,
          claimsInRange: 0,
          lateCount: 0
        };
      }
      employeeData[empId].totalClaims++;
      
      // Check if this claim is in the date range
      const subDate = claim.submitted_at?.split('T')[0];
      if (subDate && dateFrom && dateTo && subDate >= dateFrom && subDate <= dateTo) {
        employeeData[empId].claimsInRange++;
      }
      
      if (!employeeData[empId].lastSubmission || claim.submitted_at > employeeData[empId].lastSubmission) {
        employeeData[empId].lastSubmission = claim.submitted_at;
      }
      
      // Find latest expense date and count late expenses
      (claim.expenses || []).forEach(exp => {
        if (!exp) return;
        if (!employeeData[empId].lastExpenseDate || exp.date > employeeData[empId].lastExpenseDate) {
          employeeData[empId].lastExpenseDate = exp.date;
        }
        // Check if expense was >2 months old at submission
        if (claim.submitted_at && exp.date) {
          try {
            const expDate = new Date(exp.date);
            const subDateObj = new Date(claim.submitted_at);
            const monthsDiff = (subDateObj - expDate) / (1000 * 60 * 60 * 24 * 30);
            if (monthsDiff > 2) employeeData[empId].lateCount++;
          } catch (e) { /* ignore */ }
        }
      });
    });
    
    // Late submitters - ALL who have ever submitted late, sorted descending
    const lateSubmitters = Object.entries(employeeData)
      .filter(([_, data]) => data.lateCount > 0)
      .sort((a, b) => b[1].lateCount - a[1].lateCount);
    
    const formatDateShort = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-';
    
    // Export to Excel/CSV function
    const handleExport = () => {
      let csvContent = '';
      let filename = '';
      
      if (reportType === 'backcharge') {
        filename = `backcharge_report_${dateFrom}_to_${dateTo}.csv`;
        csvContent = 'Development,Claimant,Office,Date,Merchant,Category,Percentage,Amount (Local),Amount (GBP),Status\n';
        Object.entries(backchargeData).forEach(([dev, data]) => {
          data.items.forEach(item => {
            csvContent += `"${dev}","${item.claimant}","${item.office}","${item.date}","${item.merchant}","${item.category || ''}","${item.percentage}%","${item.currency} ${item.amount.toFixed(2)}","£${item.gbpAmount.toFixed(2)}","${item.status}"\n`;
          });
        });
      } else if (reportType === 'gl') {
        filename = `gl_report_${dateFrom}_to_${dateTo}.csv`;
        csvContent = 'GL Code,Category,Office,Claimant,Date,Merchant,Description,Amount (Local),Amount (GBP),Status\n';
        Object.entries(glData).forEach(([gl, data]) => {
          data.items.forEach(item => {
            csvContent += `"${gl}","${data.name}","${item.office}","${item.claimant}","${item.date}","${item.merchant}","${item.description}","${item.currency} ${item.amount.toFixed(2)}","£${item.gbpAmount.toFixed(2)}","${item.status}"\n`;
          });
        });
      } else if (reportType === 'submissions') {
        filename = `submissions_report_${dateFrom}_to_${dateTo}.csv`;
        csvContent = 'Employee,Office,Claims in Range,Total Claims,Last Submission,Last Expense Date\n';
        Object.entries(employeeData).forEach(([_, data]) => {
          csvContent += `"${data.name}","${data.office}","${data.claimsInRange}","${data.totalClaims}","${formatDateShort(data.lastSubmission)}","${formatDateShort(data.lastExpenseDate)}"\n`;
        });
      } else if (reportType === 'late') {
        filename = `late_submitters_${dateFrom}_to_${dateTo}.csv`;
        csvContent = 'Employee,Office,Late Expenses,Total Claims\n';
        lateSubmitters.forEach(([_, data]) => {
          csvContent += `"${data.name}","${data.office}","${data.lateCount}","${data.totalClaims}"\n`;
        });
      }
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    };
    
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold mb-2">📊 Finance Dashboard</h2>
              <p className="text-purple-100 text-sm">Group finance reporting and analysis</p>
            </div>
            <button 
              onClick={handleExport}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
            >
              📥 Export CSV
            </button>
          </div>
        </div>
        
        {/* Date Range & Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includePending} onChange={e => setIncludePending(e.target.checked)} className="rounded" />
              <span>Include pending claims (forecasting)</span>
            </label>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['gl', 'backcharge', 'submissions', 'late'].map(type => (
              <button 
                key={type}
                onClick={() => setReportType(type)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold ${reportType === type ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {type === 'backcharge' ? '📊 Backcharges' : type === 'gl' ? '📋 GL Report' : type === 'submissions' ? '📅 Submissions' : '⚠️ Late Submitters'}
              </button>
            ))}
          </div>
        </div>
        
        {/* GL Report with Office Breakdown */}
        {reportType === 'gl' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="bg-blue-50 p-4 border-b flex justify-between items-center">
              <div>
                <h3 className="font-bold text-blue-800">📋 GL Account Report</h3>
                <p className="text-xs text-blue-600">{Object.keys(glData).length} GL codes • {relevantClaims.length} claims • Total: £{Object.values(glData).reduce((s, d) => s + d.totalGBP, 0).toFixed(2)}</p>
              </div>
            </div>
            {Object.keys(glData).length === 0 ? (
              <p className="p-4 text-center text-slate-400">No expenses in selected period</p>
            ) : (
              <div className="divide-y">
                {Object.entries(glData).sort((a, b) => b[1].totalGBP - a[1].totalGBP).map(([gl, data]) => (
                  <div key={gl}>
                    <div 
                      className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50"
                      onClick={() => setExpandedGL(expandedGL === gl ? null : gl)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{expandedGL === gl ? '▼' : '▶'}</span>
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{gl}</span>
                        <span className="text-sm font-medium">{data.name}</span>
                        <span className="text-xs text-slate-400">({data.items.length} items)</span>
                      </div>
                      <span className="font-bold text-blue-600">£{data.totalGBP.toFixed(2)}</span>
                    </div>
                    {expandedGL === gl && (
                      <div className="bg-slate-50 px-4 py-2 border-t">
                        <p className="text-xs font-semibold text-slate-600 mb-2">Breakdown by Office:</p>
                        {Object.entries(data.byOffice).sort((a, b) => b[1].totalGBP - a[1].totalGBP).map(([office, officeData]) => (
                          <div key={office} className="flex justify-between py-1 text-sm border-b border-slate-200 last:border-0">
                            <span className="text-slate-700">{office}</span>
                            <span className="font-semibold text-slate-800">£{officeData.totalGBP.toFixed(2)} <span className="text-slate-400 font-normal">({officeData.items.length})</span></span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Backcharge Report */}
        {reportType === 'backcharge' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="bg-purple-50 p-4 border-b">
              <h3 className="font-bold text-purple-800">📊 Backcharge Report</h3>
              <p className="text-xs text-purple-600">{Object.keys(backchargeData).length} developments • {relevantClaims.length} claims</p>
            </div>
            {Object.keys(backchargeData).length === 0 ? (
              <p className="p-4 text-center text-slate-400">No backcharges in selected period</p>
            ) : (
              <div className="divide-y">
                {Object.entries(backchargeData).sort((a, b) => b[1].total - a[1].total).map(([dev, data]) => (
                  <div key={dev} className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-slate-800">{dev}</span>
                      <span className="font-bold text-purple-600">£{data.total.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-slate-500 space-y-1">
                      {data.items.slice(0, 5).map((item, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{item.claimant} • {item.merchant} ({item.percentage}%)</span>
                          <span className={item.status === 'approved' ? 'text-green-600' : 'text-amber-600'}>
                            £{item.gbpAmount.toFixed(2)} {item.status !== 'approved' && '(pending)'}
                          </span>
                        </div>
                      ))}
                      {data.items.length > 5 && <div className="text-slate-400">+{data.items.length - 5} more items</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Submissions Report */}
        {reportType === 'submissions' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="bg-green-50 p-4 border-b">
              <h3 className="font-bold text-green-800">📅 Submissions Report</h3>
              <p className="text-xs text-green-600">
                <strong>{submissionsInRange} claims</strong> in selected period • {Object.keys(employeeData).length} employees total
              </p>
            </div>
            <div className="divide-y">
              {Object.entries(employeeData)
                .sort((a, b) => (b[1].lastSubmission || '').localeCompare(a[1].lastSubmission || ''))
                .map(([empId, data]) => (
                  <div key={empId} className="p-3 flex justify-between items-center">
                    <div>
                      <span className="font-semibold">{data.name}</span>
                      <span className="text-xs text-slate-400 ml-2">{data.office}</span>
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-slate-600">
                        In range: <strong className="text-blue-600">{data.claimsInRange}</strong> / {data.totalClaims} total
                      </div>
                      <div className="text-slate-400">Latest: {formatDateShort(data.lastSubmission)}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
        
        {/* Late Submitters - No threshold, all who submitted late */}
        {reportType === 'late' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="bg-red-50 p-4 border-b">
              <h3 className="font-bold text-red-800">⚠️ Late Submitters</h3>
              <p className="text-xs text-red-600">Employees who have submitted expenses &gt;2 months after receipt date (sorted by count)</p>
            </div>
            {lateSubmitters.length === 0 ? (
              <p className="p-4 text-center text-slate-400">No late submitters found</p>
            ) : (
              <div className="divide-y">
                {lateSubmitters.map(([empId, data]) => (
                  <div key={empId} className="p-3 flex justify-between items-center">
                    <div>
                      <span className="font-semibold">{data.name}</span>
                      <span className="text-xs text-slate-400 ml-2">{data.office}</span>
                    </div>
                    <div className="text-right">
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">
                        {data.lateCount} late receipt{data.lateCount !== 1 ? 's' : ''}
                      </span>
                      <div className="text-xs text-slate-400 mt-1">{data.totalClaims} total claims</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
            <div className="text-2xl font-bold text-slate-800">{relevantClaims.length}</div>
            <div className="text-xs text-slate-500">Claims in Period</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
            <div className="text-2xl font-bold text-green-600">£{relevantClaims.reduce((s, c) => s + toGBP(c?.total_amount || 0, c?.currency || 'GBP'), 0).toFixed(0)}</div>
            <div className="text-xs text-slate-500">Total (GBP)</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
            <div className="text-2xl font-bold text-purple-600">£{Object.values(backchargeData || {}).reduce((s, d) => s + (d?.total || 0), 0).toFixed(0)}</div>
            <div className="text-xs text-slate-500">Backcharges</div>
          </div>
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
        {selectedClaim && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setSelectedClaim(null)}><div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}><div className="p-6 border-b flex justify-between"><div><h2 className="text-xl font-bold">{selectedClaim.user_name}</h2><p className="text-sm text-slate-500">{selectedClaim.claim_number} • Level {selectedClaim.approval_level || 1}</p></div><button onClick={() => setSelectedClaim(null)} className="text-2xl text-slate-400">×</button></div><div className="p-6"><button onClick={() => handleDownloadPDF(selectedClaim)} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold mb-4">📥 Download PDF</button>{[...(selectedClaim.expenses || [])].sort((a, b) => { const numA = parseInt(a.ref); const numB = parseInt(b.ref); if (!isNaN(numA) && !isNaN(numB)) return numA - numB; return (a.ref || '999').localeCompare(b.ref || '999', undefined, { numeric: true }); }).map((exp, i) => { const isOld = isOlderThan2Months(exp.date); const isApproaching = isApproaching2Months(exp.date); const daysLeft = getDaysUntil2Months(exp.date); const paxCount = parseInt(exp.numberOfPax) || 0; const isEntertaining = EXPENSE_CATEGORIES[exp.category]?.requiresAttendees; const perPaxAmount = isEntertaining && paxCount > 0 ? (parseFloat(exp.reimbursementAmount || exp.amount) / paxCount) : 0; return (<div key={i} className={`py-3 border-b ${isOld ? 'bg-red-50' : isApproaching ? 'bg-amber-50' : ''}`}><div className="flex justify-between items-start"><div className="flex-1"><div className="flex items-center gap-2 flex-wrap"><span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-bold">{exp.ref}</span><span className="font-semibold">{exp.merchant}</span>{exp.isPotentialDuplicate && <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded">⚠️ Duplicate?</span>}{isOld && <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded animate-pulse">🚨 &gt;2 Months</span>}{isApproaching && <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded">⏰ {daysLeft}d left</span>}{paxCount > 0 && <span className="bg-purple-100 text-purple-600 text-xs px-2 py-0.5 rounded">👥 {paxCount} pax</span>}{isEntertaining && paxCount > 0 && <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-0.5 rounded">💰 {selectedClaim.currency} {perPaxAmount.toFixed(2)}/pax</span>}</div><p className="text-xs text-slate-500 mt-1">{exp.description}</p>{exp.isForeignCurrency && exp.forexRate && <p className="text-xs text-amber-600 mt-1">💱 Rate: 1 {exp.currency} = {exp.forexRate.toFixed(4)} {selectedClaim.currency}</p>}{exp.adminNotes && <div className="text-xs mt-1 bg-amber-50 px-2 py-1 rounded"><span className="font-semibold">📝 Notes:</span><div dangerouslySetInnerHTML={{ __html: formatAdminNotesReact(exp.adminNotes) }} /></div>}</div><span className="font-bold text-green-700 ml-2">{formatCurrency(exp.reimbursementAmount || exp.amount, selectedClaim.currency)}</span></div></div>); })}</div><div className="p-4 border-t bg-slate-50 space-y-3"><div className="flex gap-3"><button onClick={() => setEditingClaim(selectedClaim)} className="flex-1 py-3 rounded-xl bg-purple-500 text-white font-semibold">✏️ Edit / Add Notes</button><button onClick={() => setShowRequestChanges(true)} className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-semibold">📝 Return</button></div><div className="flex gap-3"><button onClick={() => handleReject(selectedClaim.id)} disabled={loading} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold disabled:opacity-50">↩️ Reject</button><button onClick={() => handleApprove(selectedClaim)} disabled={loading} className="flex-[2] py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50">{(() => { const workflow = SENIOR_STAFF_ROUTING[selectedClaim.user_id]; const isSingleLevel = workflow?.singleLevel; const level = selectedClaim.approval_level || 1; if (level === 1 && isSingleLevel) return workflow?.externalApproval ? '✓ Approve (→ Chairman)' : '✓ Final Approve'; if (level === 1) return '✓ Approve → L2'; return '✓ Final Approve'; })()}</button></div></div></div></div>)}
        {editingClaim && <EditClaimModal claim={editingClaim} onClose={() => setEditingClaim(null)} />}
        {showRequestChanges && selectedClaim && (
          <RequestChangesModal 
            claim={selectedClaim} 
            onClose={() => { setShowRequestChanges(false); setChangeRequestComment(''); }}
            onSubmit={(comment, flaggedExpenses) => {
              handleRequestChanges(selectedClaim.id, comment, flaggedExpenses);
            }}
          />
        )}
      </div>
    );
  };

  const canReview = currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'finance' || currentUser.role === 'group_finance' || getReviewableClaims().length > 0 || getClaimsForSubmission().length > 0;
  
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
      {canReview && (<div className="bg-white border-b sticky top-14 z-30"><div className="max-w-3xl mx-auto flex"><button onClick={() => setActiveTab('my_expenses')} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${activeTab === 'my_expenses' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>📋 My Expenses</button><button onClick={() => setActiveTab('review')} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${activeTab === 'review' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>👀 Review{getReviewableClaims().length > 0 && <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">{getReviewableClaims().length}</span>}</button>{currentUser?.role === 'group_finance' && <button onClick={() => setActiveTab('finance')} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${activeTab === 'finance' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500'}`}>📊 Finance</button>}</div></div>)}
      <main className="max-w-3xl mx-auto p-4 pb-20">{activeTab === 'finance' && currentUser?.role === 'group_finance' ? <FinanceDashboard /> : canReview && activeTab === 'review' ? <ReviewClaimsTab /> : <MyExpensesTab />}</main>
      {(showAddExpense || editingExpense) && <AddExpenseModal editExpense={editingExpense} existingClaims={claims} expenses={expenses} onClose={() => { setShowAddExpense(false); setEditingExpense(null); }} />}
      {showPreview && <PreviewClaimModal />}
      {showStatementUpload && (
        <StatementUploadModal 
          existingImages={originalStatementImages}
          userId={currentUser?.id}
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