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
  { code: 'LON', name: 'MENA (London)', currency: 'GBP', companyName: 'Berkeley London Residential Ltd' },
  { code: 'MYS', name: 'Malaysia', currency: 'MYR', companyName: 'Berkeley (Singapore)' },
  { code: 'SIN', name: 'Singapore', currency: 'SGD', companyName: 'Berkeley (Singapore)' },
  { code: 'BKK', name: 'Bangkok', currency: 'THB', companyName: 'Berkeley (Thailand)' },
  { code: 'DXB', name: 'Dubai', currency: 'AED', companyName: 'Berkeley London Residential Ltd' },
  { code: 'ADM', name: 'Admin', currency: 'GBP', companyName: 'Berkeley Group', isAdmin: true }
];

const DEVELOPMENTS = [
  '250 City Road', 'Abbey Barn Park', 'Alexandra Gate', 'Bankside Gardens', 'Bath Riverside',
  'Beaufort Park', 'Bermondsey Place', 'Bow Common', 'Camden', 'Carnwath Road',
  'Chelsea Creek', 'Cranleigh', 'Eden Grove', 'Foal Hurst Green', 'Glasswater Locks',
  'Grand Union', 'Green Park Village', 'Guildford', 'Hareshill, Fleet', 'Hartland Village',
  'Heron Wharf', 'Hertford Locks', 'Highwood Village', 'Hildenborough', 'Horlicks Quarter',
  'Kidbrooke Village', "King's Road Park", 'London Dock', 'Milton Keynes',
  'Office - Bangkok', 'Office - Beijing', 'Office - Chengdu', 'Office - Hong Kong',
  'Office - MENA', 'Office - Shanghai', 'Office - Shenzhen', 'Office - Singapore',
  'Oval Village',
  'Parkside Collection', 'Plumstead', 'Prince of Wales Drive', 'Reading Riverworks', "Regent's View",
  'Royal Arsenal Riverside', 'Silkstream', 'South Quay Plaza', 'Spring Hill', 'Sunningdale Park',
  'Sutton', 'The Exchange', 'The Green Quarter', 'Trent Park', 'Trillium',
  'TwelveTrees Park', 'Wallingford', 'Wandsworth Mills', 'West End Gate', 'White City',
  'Winterbrook', 'Woodberry Down'
];

// --- FOREX RATE HELPERS ---
// Financial year starts in May. Before May = previous year. May onwards = current year.
const getFinancialYear = () => {
  const now = new Date();
  return now.getMonth() >= 4 ? now.getFullYear() : now.getFullYear() - 1;
};

const calculateForexRate = (foreignAmount, reimbursementAmount) => {
  const foreign = parseFloat(foreignAmount);
  const reimburse = parseFloat(reimbursementAmount);
  if (!foreign || !reimburse || foreign === 0) return null;
  return reimburse / foreign; // Rate = SGD per 1 unit of foreign currency
};

const EMPLOYEES = [
  // Beijing
  { id: 101, name: 'Fang Yi', office: 'BEJ', role: 'employee', reimburseCurrency: 'CNY', claimName: 'Fang Yi', password: 'berkeley123' },
  { id: 102, name: 'Caroline Zhu', office: 'BEJ', role: 'admin', reimburseCurrency: 'CNY', claimName: 'Caroline', password: 'berkeley123' },
  { id: 103, name: 'Even Huang', office: 'BEJ', role: 'employee', reimburseCurrency: 'CNY', claimName: 'Even', password: 'berkeley123' },
  { id: 104, name: 'Charrisa Xia', office: 'BEJ', role: 'employee', reimburseCurrency: 'CNY', claimName: 'Charrisa', password: 'berkeley123' },
  { id: 105, name: 'Alice Kong', office: 'BEJ', role: 'employee', reimburseCurrency: 'CNY', claimName: 'Alice', password: 'berkeley123' },
  // Chengdu
  { id: 201, name: 'Suki Li', office: 'CHE', role: 'employee', reimburseCurrency: 'CNY', claimName: 'Suki Li', password: 'berkeley123' },
  { id: 202, name: 'Icey Zuo', office: 'CHE', role: 'employee', reimburseCurrency: 'CNY', claimName: 'Icey', password: 'berkeley123' },
  { id: 203, name: 'Dora Ji', office: 'CHE', role: 'employee', reimburseCurrency: 'CNY', claimName: 'Dora', password: 'berkeley123' },
  // Shanghai
  { id: 301, name: 'Ariel Tang', office: 'SHA', role: 'employee', reimburseCurrency: 'CNY', claimName: 'Ariel', password: 'berkeley123' },
  { id: 302, name: 'Eddy Tao', office: 'SHA', role: 'manager', reimburseCurrency: 'CNY', claimName: 'Eddy', password: 'berkeley123', dashboardOffices: ['BEJ', 'CHE', 'SHA', 'SHE'] },
  { id: 303, name: 'Elsa Huang', office: 'SHA', role: 'employee', reimburseCurrency: 'CNY', claimName: 'Elsa', password: 'berkeley123' },
  { id: 304, name: 'Terence Li', office: 'SHA', role: 'employee', reimburseCurrency: 'CNY', claimName: 'Terence', password: 'berkeley123' },
  { id: 305, name: 'Johnnie Huang', office: 'SHA', role: 'employee', reimburseCurrency: 'CNY', claimName: 'Johnnie', password: 'berkeley123' },
  { id: 306, name: 'Cathy Liu', office: 'SHA', role: 'admin', reimburseCurrency: 'CNY', claimName: 'Cathy Liu', password: 'berkeley123' },
  { id: 307, name: 'Amy Wang', office: 'SHA', role: 'employee', reimburseCurrency: 'CNY', claimName: 'Amy', password: 'berkeley123' },
  { id: 308, name: 'Echo Yu', office: 'SHA', role: 'employee', reimburseCurrency: 'CNY', claimName: 'Echo', password: 'berkeley123' },
  // Shenzhen
  { id: 401, name: 'Ryan Lee', office: 'SHE', role: 'employee', reimburseCurrency: 'CNY', claimName: 'Ryan', password: 'berkeley123', dashboardOffices: ['CHE', 'SHE'] },
  { id: 402, name: 'Simon Wong', office: 'SHE', role: 'employee', reimburseCurrency: 'CNY', claimName: 'Simon', password: 'berkeley123' },
  { id: 403, name: 'Zayn Huang', office: 'SHE', role: 'employee', reimburseCurrency: 'CNY', claimName: 'Zayn', password: 'berkeley123' },
  { id: 404, name: 'Jade Shen', office: 'SHE', role: 'employee', reimburseCurrency: 'CNY', claimName: 'Jade', password: 'berkeley123' },
  // Hong Kong
  { id: 501, name: 'Kate Tai', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD', claimName: 'Kate', password: 'berkeley123' },
  { id: 502, name: 'Anthony Jurenko', office: 'HKG', role: 'manager', reimburseCurrency: 'HKD', claimName: 'Anthony', password: 'berkeley123', dashboardOffices: ['HKG'] },
  { id: 503, name: 'Suki Fong', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD', claimName: 'Suki Fong', password: 'berkeley123' },
  { id: 504, name: 'Ron Chung', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD', claimName: 'Ron', password: 'berkeley123' },
  { id: 505, name: 'Cherry Lai', office: 'HKG', role: 'admin', reimburseCurrency: 'HKD', claimName: 'Cherry', password: 'berkeley123' },
  { id: 506, name: 'Jacky Khor', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD', claimName: 'Jacky', password: 'berkeley123' },
  { id: 507, name: 'Michelle Shum', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD', claimName: 'Michelle', password: 'berkeley123' },
  { id: 508, name: 'Jennifer Wong', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD', claimName: 'Jennifer', password: 'berkeley123' },
  { id: 509, name: 'Annabelle Yiu', office: 'HKG', role: 'employee', reimburseCurrency: 'HKD', claimName: 'Annabelle', password: 'berkeley123' },
  // London
  { id: 601, name: 'Mouna', office: 'LON', role: 'employee', reimburseCurrency: 'GBP', claimName: 'Mouna', password: 'berkeley123', mileageRate: 0.45, mileageUnit: 'miles' },
  { id: 602, name: 'Farah', office: 'LON', role: 'employee', reimburseCurrency: 'GBP', claimName: 'Farah', password: 'berkeley123' },
  // Malaysia
  { id: 701, name: 'Joanne Chee', office: 'MYS', role: 'employee', reimburseCurrency: 'MYR', claimName: 'Joanne', password: 'berkeley123', mileageRate: 0.80, mileageUnit: 'km' },
  // Singapore
  { id: 801, name: 'John Yan', office: 'SIN', role: 'manager', reimburseCurrency: 'SGD', claimName: 'John', password: 'berkeley123' },
  { id: 802, name: 'Janice Zhu', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', claimName: 'Janice', password: 'berkeley123' },
  { id: 803, name: 'Karen Chia', office: 'SIN', role: 'manager', reimburseCurrency: 'SGD', claimName: 'Karen', password: 'berkeley123', dashboardOffices: ['SIN', 'BKK', 'MYS'] },
  { id: 804, name: 'Cathy He', office: 'SIN', role: 'manager', reimburseCurrency: 'SGD', claimName: 'Cathy He', password: 'berkeley123' },
  { id: 805, name: 'Ann Low', office: 'SIN', role: 'admin', reimburseCurrency: 'SGD', claimName: 'Ann', password: 'berkeley123' },
  { id: 806, name: 'Praba', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', claimName: 'Praba', password: 'berkeley123' },
  { id: 807, name: 'Weiyu', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', claimName: 'Weiyu', password: 'berkeley123' },
  { id: 808, name: 'Ong Yongle', office: 'SIN', role: 'finance', reimburseCurrency: 'SGD', claimName: 'Yongle', password: 'berkeley123' },
  { id: 809, name: 'William Swinburn', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', claimName: 'William', password: 'berkeley123' },
  { id: 810, name: 'Fiolita', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', claimName: 'Fiolita', password: 'berkeley123' },
  { id: 811, name: 'Ng Ziyao', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', claimName: 'Zi Yao', password: 'berkeley123' },
  { id: 812, name: 'Kareen Ng', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', claimName: 'Kareen', password: 'berkeley123' },
  { id: 813, name: 'Danny Tan', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', claimName: 'Danny', password: 'berkeley123' },
  { id: 814, name: 'Foo Chin Yee', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', claimName: 'Chin Yee', password: 'berkeley123' },
  { id: 815, name: 'Jeslyn Yap', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', claimName: 'Jeslyn', password: 'berkeley123' },
  { id: 816, name: 'Humphrey Perrins', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', claimName: 'Humphrey', password: 'berkeley123' },
  { id: 817, name: 'Tay Ruo Fan', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', claimName: 'Ruo Fan', password: 'berkeley123' },
  { id: 818, name: 'May', office: 'SIN', role: 'employee', reimburseCurrency: 'SGD', claimName: 'May', password: 'berkeley123' },
  // Bangkok
  { id: 901, name: 'Sutanya Jaruphiboon', office: 'BKK', role: 'employee', reimburseCurrency: 'THB', claimName: 'Praew', password: 'berkeley123' },
  { id: 902, name: 'Chayasid Jongpipattanachoke', office: 'BKK', role: 'employee', reimburseCurrency: 'THB', claimName: 'Pjay', password: 'berkeley123' },
  { id: 903, name: 'Juthamas Leewanun', office: 'BKK', role: 'employee', reimburseCurrency: 'THB', claimName: 'Art', password: 'berkeley123' },
  { id: 904, name: 'Norakamol Seninvinin', office: 'BKK', role: 'employee', reimburseCurrency: 'THB', claimName: 'Nora', password: 'berkeley123' },
  { id: 905, name: 'Warahnooch Achariyapradit', office: 'BKK', role: 'admin', reimburseCurrency: 'THB', claimName: 'Bow', password: 'berkeley123' },
  // Dubai / MENA
  { id: 1001, name: 'Christopher Frame', office: 'DXB', role: 'manager', reimburseCurrency: 'AED', claimName: 'Christopher', password: 'berkeley123', dashboardOffices: ['DXB', 'LON'] },
  { id: 1002, name: 'Christine Dimaranan', office: 'DXB', role: 'admin', reimburseCurrency: 'AED', claimName: 'Christine', password: 'berkeley123' },
  { id: 1003, name: 'Nathan Abrahams', office: 'DXB', role: 'employee', reimburseCurrency: 'AED', claimName: 'Nathan', password: 'berkeley123' },
  { id: 1004, name: 'Leila Kadiri', office: 'DXB', role: 'employee', reimburseCurrency: 'AED', claimName: 'Leila', password: 'berkeley123' },
  { id: 1005, name: 'Yasseen Jebara', office: 'DXB', role: 'employee', reimburseCurrency: 'AED', claimName: 'Yasseen', password: 'berkeley123' },
  { id: 1006, name: 'Adham Abu-Salim', office: 'DXB', role: 'employee', reimburseCurrency: 'AED', claimName: 'Adham', password: 'berkeley123' },
  { id: 1007, name: 'Olivia Wyatt', office: 'DXB', role: 'employee', reimburseCurrency: 'AED', claimName: 'Olivia', password: 'berkeley123' },
  { id: 1008, name: 'Keisha Whitehorne', office: 'DXB', role: 'employee', reimburseCurrency: 'AED', claimName: 'Keisha', password: 'berkeley123' },
  // Group Finance
  { id: 9001, name: 'Finance', office: 'ADM', role: 'group_finance', reimburseCurrency: 'GBP', claimName: 'Finance', password: 'berkeley123' },
  { id: 9002, name: 'CSC China', office: 'ADM', role: 'group_finance', reimburseCurrency: 'CNY', claimName: 'CSC', password: 'berkeley123', reportOffices: ['BEJ', 'CHE', 'SHA', 'SHE'] }
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
// PDF version: completely removes return reason lines (they're only for app workflow)
const formatAdminNotesHTML = (notes, forPDF = false) => {
  if (!notes) return '';
  const lines = notes.split('\n').filter(l => l.trim());
  // For PDF: remove return reason lines entirely
  const filteredLines = forPDF ? lines.filter(l => !l.includes('[R]:') && !l.includes('[RETURN]:')) : lines;
  if (filteredLines.length === 0) return '';
  // Strip markers for display
  const cleaned = filteredLines.join('\n').replace(/ \[R\]:/g, ':').replace(/ \[RETURN\]:/g, ':');
  const reviewerColors = { 'Ann': '#2563eb', 'John': '#059669', 'Emma': '#7c3aed', 'Cathy': '#dc2626', 'default': '#d97706' };
  const parts = cleaned.split(/(?=\b(?:Ann|John|Emma|Cathy|[A-Z][a-z]+):)/g).filter(p => p.trim());
  if (parts.length <= 1) return '<span style="color:#d97706;">' + cleaned + '</span>';
  return parts.map((part, idx) => {
    const match = part.match(/^([A-Z][a-z]+):\s*/);
    const reviewer = match ? match[1] : 'default';
    const color = reviewerColors[reviewer] || reviewerColors['default'];
    const content = match ? reviewer + ':</strong> ' + part.replace(match[0], '') : '</strong>' + part;
    if (idx === 0) return '<span style="color:' + color + ';"><strong>' + content + '</span>';
    return '<div style="color:' + color + ';margin-top:2px;"><strong>' + content + '</div>';
  }).join('');
};

// Format admin notes with different colors for different reviewers (React for UI)
const formatAdminNotesReact = (notes) => {
  if (!notes) return null;
  // Strip [R] and [RETURN] markers for clean display
  const cleaned = notes.replace(/ \[R\]:/g, ':').replace(/ \[RETURN\]:/g, ':');
  const reviewerColors = { 'Ann': 'text-blue-600', 'John': 'text-green-600', 'Emma': 'text-purple-600', 'Cathy': 'text-red-600', 'default': 'text-amber-700' };
  const parts = cleaned.split(/(?=\b(?:Ann|John|Emma|Cathy|[A-Z][a-z]+):)/g).filter(p => p.trim());
  if (parts.length <= 1) return cleaned;
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
  'BEJ': { level1: 102, level2: 103, level1Name: 'Caroline Zhu', level2Name: 'Even Huang' },
  'SHE': { level1: 102, level2: 401, level1Name: 'Caroline Zhu', level2Name: 'Ryan Lee' },
  'SHA': { level1: 306, level2: 303, level1Name: 'Cathy Liu', level2Name: 'Elsa Huang' },
  'CHE': { level1: 306, level2: 302, level1Name: 'Cathy Liu', level2Name: 'Eddy Tao' },
  'SIN': { level1: 805, level2: 803, level1Name: 'Ann Low', level2Name: 'Karen Chia' },
  'BKK': { level1: 905, level2: 803, level1Name: 'Bow', level2Name: 'Karen Chia' },
  'MYS': { level1: 805, level2: 803, level1Name: 'Ann Low', level2Name: 'Karen Chia' },
  'DXB': { level1: 1002, level2: 1001, level1Name: 'Christine Dimaranan', level2Name: 'Christopher Frame' },
  'LON': { level1: 1002, level2: 1001, level1Name: 'Christine Dimaranan', level2Name: 'Christopher Frame' },
  'HKG': { level1: 505, level2: 502, level1Name: 'Cherry Lai', level2Name: 'Anthony Jurenko' }
};

const SPECIAL_REVIEWERS = {
  // BEJ: Even can't approve himself
  103: { finalReviewer: 302, finalReviewerName: 'Eddy Tao' },
  // CHE: Icey/Dora → Suki instead of Eddy
  202: { finalReviewer: 201, finalReviewerName: 'Suki Li' },
  203: { finalReviewer: 201, finalReviewerName: 'Suki Li' },
  // SHA: Johnnie → Eddy, Echo → Johnnie
  305: { finalReviewer: 302, finalReviewerName: 'Eddy Tao' },
  308: { finalReviewer: 305, finalReviewerName: 'Johnnie Huang' },
  // SHE: Ryan → Eddy (can't approve himself)
  401: { finalReviewer: 302, finalReviewerName: 'Eddy Tao' },
  // HKG
  503: { finalReviewer: 806, finalReviewerName: 'Praba' },
  504: { finalReviewer: 811, finalReviewerName: 'Ng Ziyao' },
  // SIN
  806: { finalReviewer: 801, finalReviewerName: 'John Yan' },
  810: { finalReviewer: 806, finalReviewerName: 'Praba' },
  811: { finalReviewer: 808, finalReviewerName: 'Ong Yongle' },
  813: { finalReviewer: 811, finalReviewerName: 'Ng Ziyao' },
  817: { finalReviewer: 811, finalReviewerName: 'Ng Ziyao' },
  818: { finalReviewer: 806, finalReviewerName: 'Praba' },
  // BKK
  904: { finalReviewer: 806, finalReviewerName: 'Praba' },
};

const SENIOR_STAFF_ROUTING = {
  // Managers → Kareen → Cathy He
  302: { level1: 812, level2: 804, level1Name: 'Kareen Ng', level2Name: 'Cathy He' },
  502: { level1: 812, level2: 804, level1Name: 'Kareen Ng', level2Name: 'Cathy He' },
  1001: { level1: 812, level2: 804, level1Name: 'Kareen Ng', level2Name: 'Cathy He' },
  // Jeslyn → Kareen → Cathy He
  815: { level1: 812, level2: 804, level1Name: 'Kareen Ng', level2Name: 'Cathy He' },
  // Other managers → Ann → Cathy He
  801: { level1: 805, level2: 804, level1Name: 'Ann Low', level2Name: 'Cathy He' },
  803: { level1: 805, level2: 804, level1Name: 'Ann Low', level2Name: 'Cathy He' },
  808: { level1: 805, level2: 804, level1Name: 'Ann Low', level2Name: 'Cathy He' },
  // Admins → their approver (single level)
  102: { level1: 103, level2: null, level1Name: 'Even Huang', level2Name: null, singleLevel: true },
  306: { level1: 303, level2: null, level1Name: 'Elsa Huang', level2Name: null, singleLevel: true },
  505: { level1: 502, level2: null, level1Name: 'Anthony Jurenko', level2Name: null, singleLevel: true },
  805: { level1: 803, level2: null, level1Name: 'Karen Chia', level2Name: null, singleLevel: true },
  905: { level1: 803, level2: null, level1Name: 'Karen Chia', level2Name: null, singleLevel: true },
  1002: { level1: 1001, level2: null, level1Name: 'Christopher Frame', level2Name: null, singleLevel: true },
  // Kareen → Cathy He (single level)
  812: { level1: 804, level2: null, level1Name: 'Cathy He', level2Name: null, singleLevel: true },
  // Cathy He → Kareen → Paul (external)
  804: { level1: 812, level2: null, level1Name: 'Kareen Ng', level2Name: null, singleLevel: true, externalApproval: 'Paul' },
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
  if (claim.status === 'submitted_to_finance') return '📤 Submitted for Payment';
  if (claim.status === 'paid') return '💰 Paid';
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
  const [showMileageModal, setShowMileageModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingReturnedClaimId, setEditingReturnedClaimId] = useState(null); // Track which returned claim we're editing
  const [activeClaimTab, setActiveClaimTab] = useState('current'); // 'current' or claim.id — lifted to parent
  const [showStatementUpload, setShowStatementUpload] = useState(false);
  const [showStatementAnnotator, setShowStatementAnnotator] = useState(false);
  const [statementImages, setStatementImages] = useState([]); 
  const [originalStatementImages, setOriginalStatementImages] = useState([]); // Store original images for re-annotation 
  const [currentStatementIndex, setCurrentStatementIndex] = useState(0);
  const [annotatedStatements, setAnnotatedStatements] = useState([]);
  const [statementAnnotations, setStatementAnnotations] = useState([]);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [activeTab, setActiveTab] = useState('my_expenses');
  
  // Default admin accounts to appropriate tab
  useEffect(() => {
    if (currentUser?.role === 'group_finance') setActiveTab('finance');
  }, [currentUser]);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingClaim, setEditingClaim] = useState(null);
  const [backchargeFromDate, setBackchargeFromDate] = useState('');
  const [backchargeToDate, setBackchargeToDate] = useState('');
  const [showBackchargeReport, setShowBackchargeReport] = useState(false);
  const [showRequestChanges, setShowRequestChanges] = useState(false);
  const [showPreviousReview, setShowPreviousReview] = useState(null);
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
        
        // Migrate receiptPreview3 if it's base64
        if (exp.receiptPreview3 && !isStorageUrl(exp.receiptPreview3)) {
          const url = await uploadImageToStorage(exp.receiptPreview3, currentUser.id, 'receipt3');
          updated.receiptPreview3 = url;
        }
        
        // Migrate receiptPreview4 if it's base64
        if (exp.receiptPreview4 && !isStorageUrl(exp.receiptPreview4)) {
          const url = await uploadImageToStorage(exp.receiptPreview4, currentUser.id, 'receipt4');
          updated.receiptPreview4 = url;
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
      
      // Branch: save to claims table (returned claim) or user_drafts (current draft)
      if (editingReturnedClaimId) {
        // SAFEGUARD: Never overwrite a returned claim with empty expenses
        if (migratedExpenses.length === 0) {
          console.warn('⚠️ Blocked saving empty expenses to returned claim', editingReturnedClaimId);
          setSavingStatus('saved');
          return true;
        }
        // Save edits back to the returned claim in claims table
        const total = migratedExpenses.reduce((sum, e) => sum + parseFloat(e.reimbursementAmount || e.amount || 0), 0);
        const claimUpdate = {
          expenses: migratedExpenses,
          total_amount: total,
          item_count: migratedExpenses.length,
        };
        if (migratedStatements?.length > 0) {
          claimUpdate.annotated_statements = migratedStatements;
          claimUpdate.annotated_statement = migratedStatements[0];
        }
        if (migratedOriginals?.length > 0) claimUpdate.original_statements = migratedOriginals;
        if (annotationsToSave?.length > 0) claimUpdate.statement_annotations = annotationsToSave;
        
        let result = await supabase.from('claims').update(claimUpdate).eq('id', editingReturnedClaimId);
        // Progressive fallback for missing columns
        if (result.error) { delete claimUpdate.statement_annotations; result = await supabase.from('claims').update(claimUpdate).eq('id', editingReturnedClaimId); }
        if (result.error) { delete claimUpdate.original_statements; result = await supabase.from('claims').update(claimUpdate).eq('id', editingReturnedClaimId); }
        if (result.error) { delete claimUpdate.annotated_statements; delete claimUpdate.annotated_statement; result = await supabase.from('claims').update(claimUpdate).eq('id', editingReturnedClaimId); }
        if (result.error) throw result.error;
        
        // Update local claims cache
        setClaims(prev => prev.map(c => c.id === editingReturnedClaimId ? { ...c, ...claimUpdate } : c));
      } else {
        // Save current drafts to user_drafts
        const expensesJson = JSON.stringify(migratedExpenses);
        const statementsJson = JSON.stringify(migratedStatements);
        const annotationsJson = JSON.stringify(annotationsToSave || []);
        const originalsJson = JSON.stringify(migratedOriginals);
        
        console.log(`💾 Saving drafts: ${Math.round((expensesJson.length + statementsJson.length + annotationsJson.length + originalsJson.length) / 1024)}KB`);
        
        const draftData = { 
          user_id: currentUser.id, 
          expenses: expensesJson, 
          statements: statementsJson, 
          annotations: annotationsJson,
          originals: originalsJson,
          updated_at: new Date().toISOString() 
        };
        
        const { data: existing, error: selectError } = await supabase.from('user_drafts').select('id').eq('user_id', currentUser.id);
        if (selectError) throw selectError;
        
        let result;
        if (existing && existing.length > 0) {
          result = await supabase.from('user_drafts').update(draftData).eq('user_id', currentUser.id);
        } else {
          result = await supabase.from('user_drafts').insert([draftData]);
        }
        if (result.error) throw result.error;
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
      const matchedExp = expenseList.find((other, otherIdx) => 
        otherIdx !== idx &&
        parseFloat(other.amount) === parseFloat(exp.amount) &&
        other.date === exp.date &&
        other.currency === exp.currency
      );
      
      if (matchedExp) {
        return { ...exp, isPotentialDuplicate: true, duplicateMatchRef: matchedExp.ref, duplicateMatchMerchant: matchedExp.merchant };
      }
      if (exp.isPotentialDuplicate && !matchedExp) {
        return { ...exp, isPotentialDuplicate: false, duplicateMatchRef: null, duplicateMatchMerchant: null };
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
    // NOTE: We intentionally do NOT load returned claim expenses into the expenses state.
    // Returned claims keep their expenses in claim.expenses, and are displayed via the tab system.
    // This keeps current drafts separate from returned claims.
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
  
  // Dynamic duplicate check: enrich a claim's expenses with duplicate info by scanning ALL claims
  const enrichWithDuplicates = (claimExpenses, claimId) => {
    if (!claimExpenses || !claims) return claimExpenses;
    const otherClaims = claims.filter(c => c.id !== claimId);
    return claimExpenses.map(exp => {
      const amt = parseFloat(exp.amount);
      const date = exp.date;
      const currency = exp.currency;
      if (!amt || !date || !currency) return exp;
      
      // Check against all other claims' expenses
      for (const claim of otherClaims) {
        const match = (claim.expenses || []).find(e => 
          parseFloat(e.amount) === amt && e.date === date && e.currency === currency
        );
        if (match) {
          return { ...exp, isPotentialDuplicate: true, duplicateMatchLabel: `${claim.claim_number} (item ${match.ref})` };
        }
      }
      
      // Also check within same claim (internal duplicates)
      const internalMatch = claimExpenses.find(e => 
        e.id !== exp.id && parseFloat(e.amount) === amt && e.date === date && e.currency === currency
      );
      if (internalMatch) {
        return { ...exp, isPotentialDuplicate: true, duplicateMatchRef: internalMatch.ref, duplicateMatchMerchant: internalMatch.merchant };
      }
      
      return { ...exp, isPotentialDuplicate: false, duplicateMatchLabel: null, duplicateMatchRef: null };
    });
  };
  

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
        if (exp.isPotentialDuplicate) warnings.push('<span style="color:orange;font-weight:bold;">⚠ DUPLICATE with ' + (exp.duplicateMatchLabel || '?') + '?</span>');
        if (exp.adminNotes) { const pdfNotes = formatAdminNotesHTML(exp.adminNotes, true); if (pdfNotes) warnings.push('<div style="background:#fff8e1;padding:2px 4px;border-radius:3px;">📝 ' + pdfNotes + '</div>'); }
        // Add per pax info if applicable
        // Add per pax info BEFORE comments if applicable
        if (pax > 0) warnings.unshift('<span style="color:#7c3aed;">' + pax + ' pax: ' + reimburseCurrency + ' ' + fmtAmt(perPax) + ' (£' + fmtAmt(perPaxGBP) + ')/pax</span>');
        
        // Mileage route info for category H
        const mileageInfo = exp.category === 'H' && exp.mileageDistance 
          ? '<br>' + (exp.mileageFrom || '') + ' → ' + (exp.mileageTo || '') + ' | ' + exp.mileageDistance + ' ' + (exp.mileageUnit || 'km') + ' @ ' + reimburseCurrency + ' ' + (exp.mileageRate ? exp.mileageRate.toFixed(2) : fmtAmt(claimAmt / parseFloat(exp.mileageDistance))) + '/' + (exp.mileageUnit || 'km')
          : '';
        
        return '<tr>' +
          '<td style="text-align:center;">' + exp.seqRef + '</td>' +
          '<td style="text-align:center;">' + formatDDMMYYYY(new Date(exp.date)) + '</td>' +
          '<td>' + cat.name + '</td>' +
          '<td>' + (exp.category === 'H' && mileageInfo ? mileageInfo.replace(/^<br>/, '') : (exp.description || '')) + (exp.category !== 'H' && mileageInfo ? mileageInfo : '') + (warnings.length > 0 ? '<br>' + warnings.join('<br>') : '') + '</td>' +
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
    const receiptsHTML = expensesWithRefs.filter(exp => exp.category !== 'H').map(exp => {
      const cat = EXPENSE_CATEGORIES[exp.category] || { name: 'Unknown' };
      const pax = parseInt(exp.numberOfPax) || 0;
      const claimAmt = parseFloat(exp.reimbursementAmount || exp.amount);
      const perPax = pax > 0 ? claimAmt / pax : 0;
      const perPaxGBP = pax > 0 ? toGBP(perPax, reimburseCurrency) : 0;
      const isOld = isOlderThan2Months(exp.date);
      const oldBadge = isOld ? '<br><span style="background:#ffcdd2;color:#c62828;padding:2px 6px;border-radius:3px;font-weight:bold;">⚠ >2 MONTHS OLD</span>' : '';
      const dupBadge = exp.isPotentialDuplicate ? '<br><span style="background:#fff3e0;color:#e65100;padding:2px 6px;border-radius:3px;font-weight:bold;">⚠ DUPLICATE with ' + (exp.duplicateMatchLabel || exp.duplicateMatchRef || '?') + '?</span>' : '';
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
      
      // Receipt sizing - handle up to 4 receipts
      const receipts = [exp.receiptPreview, exp.receiptPreview2, exp.receiptPreview3, exp.receiptPreview4].filter(Boolean);
      const receiptCount = receipts.length;
      const baseHeight = matchStmtImg ? 130 : 200;
      const availableHeight = baseHeight - heightPenalty;
      
      let receiptContent = '';
      if (receiptCount === 0) {
        receiptContent = '<div style="background:#f5f5f5;padding:30px;text-align:center;color:#999;">No receipt</div>';
      } else if (receiptCount <= 2) {
        // Stack vertically
        const perH = receiptCount === 1 ? availableHeight : Math.floor(availableHeight * 0.48);
        receiptContent = receipts.map((img, i) => '<div style="' + (i > 0 ? 'margin-top:4px;border-top:2px dashed #ccc;padding-top:4px;' : '') + '"><img src="' + img + '" style="max-width:100%;max-height:' + perH + 'mm;object-fit:contain;display:block;" /></div>').join('');
      } else {
        // 2x2 grid for 3-4 receipts
        const perH = Math.floor(availableHeight * 0.46);
        receiptContent = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">' + receipts.map(img => '<div><img src="' + img + '" style="max-width:100%;max-height:' + perH + 'mm;object-fit:contain;display:block;" /></div>').join('') + '</div>';
      }
      const stmtContent = matchStmtImg ? '<div style="flex:1;max-width:48%;border-left:3px solid #ff9800;padding-left:8px;"><div style="background:#ff9800;color:white;padding:5px 10px;font-weight:bold;font-size:9px;margin-bottom:8px;border-radius:4px;">💳 Matched Statement ' + (matchStmtIdx + 1) + '</div><img src="' + matchStmtImg + '" style="max-width:100%;max-height:' + (160 - heightPenalty) + 'mm;object-fit:contain;border:1px solid #ddd;" /></div>' : '';
      const contentHTML = matchStmtImg ? '<div style="display:flex;gap:10px;align-items:flex-start;"><div style="flex:1;max-width:50%;">' + receiptContent + '</div>' + stmtContent + '</div>' : receiptContent;
      return '<div class="page receipt-page"><div class="receipt-header"><div class="receipt-ref">' + exp.seqRef + '</div><div class="receipt-info"><strong>' + exp.merchant + '</strong> | ' + formatDDMMYYYY(new Date(exp.date)) + '<br>' + cat.name + ' | ' + exp.currency + ' ' + fmtAmt(exp.amount) + (exp.isForeignCurrency ? ' → ' + reimburseCurrency + ' ' + fmtAmt(exp.reimbursementAmount) + (exp.forexRate ? ' (1 ' + exp.currency + ' = ' + exp.forexRate.toFixed(4) + ' ' + reimburseCurrency + ')' : '') : '') + '<br>' + (exp.description || '') + oldBadge + dupBadge + paxInfo + (exp.attendees ? '<br>' + exp.attendees.replace(/\n/g, ', ') : '') + (() => { const _n = exp.adminNotes ? formatAdminNotesHTML(exp.adminNotes, true) : ''; return _n ? '<br><div style="background:#fff8e1;padding:2px 4px;border-radius:3px;">📝 ' + _n + '</div>' : ''; })() + backchargeHTML + '</div></div>' + contentHTML + '</div>';
    }).join('');

    // Statement pages - only include if there are foreign currency expenses without inline matched statements
    const foreignExps = expensesWithRefs.filter(e => e.isForeignCurrency);
    const allForeignMatched = foreignExps.length > 0 && foreignExps.every(exp => {
      const ann = annotations ? annotations.find(a => a.ref === exp.ref || a.ref === String(exp.seqRef)) : null;
      const stIdx = ann ? (ann.statementIndex || 0) : (exp.statementIndex !== undefined ? exp.statementIndex : -1);
      return stIdx >= 0 && statementsArray[stIdx];
    });
    const statementsHTML = allForeignMatched ? '' : statementsArray.map((img, idx) => '<div class="page statement-page"><div class="statement-header">Credit Card/Bank Statement ' + (statementsArray.length > 1 ? (idx + 1) + ' of ' + statementsArray.length : '') + '</div><img src="' + img + '" class="statement-img" /></div>').join('');

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
      '.receipt-header{background:#1565c0;color:#fff;padding:12px;display:flex;align-items:flex-start;border-radius:4px;margin-bottom:10px;}' +
      '.receipt-ref{font-size:28px;font-weight:bold;margin-right:15px;}' +
      '.receipt-info{font-size:13px;line-height:1.7;}' +
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
      await generatePDFFromHTML(enrichWithDuplicates(claim.expenses || [], claim.id), claim.user_name, emp?.office, claim.claim_number, claim.submitted_at, statements, emp?.reimburseCurrency || claim.currency, claim.level2_approved_by, claim.level2_approved_at, claim.annotations || []);
    } catch (err) { alert('❌ Failed'); }
    setDownloading(false);
  };

  const handleDownloadPreviewPDF = async () => {
    setDownloading(true);
    try {
      // Generate draft claim number: ClaimName - YYYY - XX (what it will be on submit)
      const year = getFinancialYear();
      const claimName = currentUser.claimName || currentUser.name.trim().split(' ').pop();
      const userClaimsThisYear = claims.filter(c => 
        c.user_id === currentUser.id && 
        c.claim_number && 
        c.claim_number.includes(`${claimName} - ${year} -`)
      );
      const nextSeq = userClaimsThisYear.length + 1;
      const draftClaimNumber = `${claimName} - ${year} - ${String(nextSeq).padStart(2, '0')} (Draft)`;
      await generatePDFFromHTML(pendingExpenses, currentUser.name, currentUser.office, draftClaimNumber, new Date().toISOString(), annotatedStatements, getUserReimburseCurrency(currentUser), null, null, statementAnnotations);
    } catch (err) { alert('❌ Failed'); }
    setDownloading(false);
  };
  
  // Load returned claim data for editing/preview
  // Load a returned claim's data into working state (expenses, statements, annotations)
  // Called on tab switch AND on preview click
  const loadReturnedClaimIntoState = (claim) => {
    if (!claim) return;
    
    // Load expenses into state
    let processed = (claim.expenses || []).map(e => ({ ...e, status: 'draft' }));
    processed = sortAndReassignRefs(processed);
    processed = markDuplicatePairs(processed);
    setExpenses(processed);
    
    // Track which returned claim we're editing
    setEditingReturnedClaimId(claim.id);
    
    // Restore statement annotations with full position data
    // Prefer statement_annotations (has xPct/yPct/widthPct/heightPct for box positions)
    // Fall back to expenses' embedded statementIndex (only has ref + page number, no positions)
    if (claim.statement_annotations && claim.statement_annotations.length > 0) {
      setStatementAnnotations(claim.statement_annotations);
    } else {
      const restoredAnnotations = (claim.expenses || [])
        .filter(e => e.statementIndex !== undefined && e.statementIndex >= 0)
        .map(e => ({ ref: e.ref, statementIndex: e.statementIndex }));
      if (restoredAnnotations.length > 0) {
        setStatementAnnotations(restoredAnnotations);
      } else {
        setStatementAnnotations([]);
      }
    }
    
    // Load ORIGINAL statements (clean, without annotations baked in) for re-annotation
    // If original_statements exists, use it; otherwise fall back to annotated_statements
    if (claim.original_statements && claim.original_statements.length > 0) {
      setOriginalStatementImages(claim.original_statements);
      setStatementImages(claim.original_statements);
      // For display, use annotated versions if available
      if (claim.annotated_statements) {
        setAnnotatedStatements(claim.annotated_statements);
      } else if (claim.annotated_statement) {
        setAnnotatedStatements([claim.annotated_statement]);
      } else {
        setAnnotatedStatements(claim.original_statements);
      }
    } else if (claim.annotated_statements) {
      // Fallback for old data that doesn't have original_statements
      setAnnotatedStatements(claim.annotated_statements);
      setStatementImages(claim.annotated_statements);
      setOriginalStatementImages(claim.annotated_statements);
    } else if (claim.annotated_statement) {
      setAnnotatedStatements([claim.annotated_statement]);
      setStatementImages([claim.annotated_statement]);
      setOriginalStatementImages([claim.annotated_statement]);
    }
  };
  
  // Load returned claim into state AND open preview
  const loadReturnedClaimForEdit = (claim) => {
    loadReturnedClaimIntoState(claim);
    setShowPreview(true);
  };
  
  // Switch to a returned claim tab — load its data into state
  const switchToReturnedTab = async (claim) => {
    // Save current state first
    // saveToServer will branch to claims table or user_drafts based on editingReturnedClaimId
    await saveToServer(expenses, annotatedStatements, statementAnnotations, originalStatementImages);
    
    setActiveClaimTab(claim.id);
    loadReturnedClaimIntoState(claim);
  };
  
  // Switch back to current draft tab — save returned claim changes, then reload drafts
  const switchToCurrentDraftTab = async () => {
    // Save returned claim changes first
    if (editingReturnedClaimId) {
      await saveToServer(expenses, annotatedStatements, statementAnnotations, originalStatementImages);
    }
    setActiveClaimTab('current');
    setEditingReturnedClaimId(null);
    await loadFromServer();
  };
  
  // Handle closing preview - if on returned claim tab, keep state; otherwise if was editing returned via old flow, reload drafts
  const handleClosePreview = async () => {
    setShowPreview(false);
    
    // If we were editing a returned claim via old "Preview" button flow (not tab),
    // and we're on current draft tab, reload drafts
    if (editingReturnedClaimId && activeClaimTab === 'current') {
      setEditingReturnedClaimId(null);
      await loadFromServer();
    }
    // If on returned claim tab, keep the state as-is
  };
  
  const handleSubmitClaim = async () => {
    setLoading(true);
    setSavingStatus('saving');
    
    try {
      // Use tracked editingReturnedClaimId if available, otherwise find any returned claim
      const returned = editingReturnedClaimId 
        ? claims.find(c => c.id === editingReturnedClaimId)
        : claims.find(c => c.user_id === currentUser.id && c.status === 'changes_requested');
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
        
        // Save annotation positions for re-annotation on return
        if (statementAnnotations && statementAnnotations.length > 0) {
          updateData.statement_annotations = statementAnnotations;
        }
        
        console.log('Attempting to update claim:', returned.id, 'with data keys:', Object.keys(updateData));
        
        let result = await supabase.from('claims').update(updateData).eq('id', returned.id);
        
        // If failed, progressively remove optional columns and retry
        if (result.error) {
          console.log('Update failed, trying without statement_annotations:', result.error);
          delete updateData.statement_annotations;
          result = await supabase.from('claims').update(updateData).eq('id', returned.id);
        }
        
        if (result.error) {
          console.log('Still failing, trying without original_statements:', result.error);
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
        // Generate claim number: ClaimName - YYYY - XX (sequential per employee per year)
        const year = getFinancialYear();
        const claimName = currentUser.claimName || currentUser.name.trim().split(' ').pop();
        
        // Count existing claims for this user in this year
        const userClaimsThisYear = claims.filter(c => 
          c.user_id === currentUser.id && 
          c.claim_number && 
          c.claim_number.includes(`${claimName} - ${year} -`)
        );
        
        // Next sequence number (1-based)
        const nextSeq = userClaimsThisYear.length + 1;
        const claimNumber = `${claimName} - ${year} - ${String(nextSeq).padStart(2, '0')}`;

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
        
        // Save annotation positions for re-annotation on return
        if (statementAnnotations && statementAnnotations.length > 0) {
          insertData.statement_annotations = statementAnnotations;
        }
        
        console.log('Attempting to create claim with data keys:', Object.keys(insertData));
        
        let result = await supabase.from('claims').insert([insertData]);
        
        // If failed, progressively remove optional columns and retry
        if (result.error) {
          console.log('Insert failed, trying without statement_annotations:', result.error);
          delete insertData.statement_annotations;
          result = await supabase.from('claims').insert([insertData]);
        }
        
        if (result.error) {
          console.log('Still failing, trying without original_statements:', result.error);
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
      setEditingReturnedClaimId(null); // Clear tracked returned claim
      setActiveClaimTab('current'); // Switch back to current draft tab
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
      
      // Helper: strip return reasons from expenses on final approval (keep only notes)
      const stripReturnReasons = (expenses) => {
        return (expenses || []).map(exp => {
          if (!exp.adminNotes) return exp;
          const lines = exp.adminNotes.split('\n').filter(line => !line.includes('[R]:') && !line.includes('[RETURN]:'));
          return { ...exp, adminNotes: lines.join('\n') || null };
        });
      };
      
      const isFinalApproval = (level === 1 && isSingleLevel) || level === 2;
      
      if (level === 1) {
        if (isSingleLevel) {
          const updateData = { 
            status: 'approved', 
            level1_approved_by: currentUser.name, 
            level1_approved_at: new Date().toISOString(),
            level2_approved_by: externalNote || currentUser.name,
            level2_approved_at: new Date().toISOString()
          };
          if (isFinalApproval) updateData.expenses = stripReturnReasons(claim.expenses);
          const { error } = await supabase.from('claims').update(updateData).eq('id', claim.id);
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
        const updateData = { 
          status: 'approved', 
          level2_approved_by: currentUser.name, 
          level2_approved_at: new Date().toISOString() 
        };
        if (isFinalApproval) updateData.expenses = stripReturnReasons(claim.expenses);
        const { error } = await supabase.from('claims').update(updateData).eq('id', claim.id);
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
      // Get existing claim to append to review history
      const existingClaim = claims.find(c => c.id === claimId);
      const existingHistory = existingClaim?.review_history || [];
      
      // Build new review entry
      const newReviewEntry = {
        comment: comment,
        flagged: flaggedExpenses,
        reviewer: currentUser.name,
        date: new Date().toISOString()
      };
      
      // Append to history
      const updatedHistory = [...existingHistory, newReviewEntry];
      
      // Build comment with flagged refs (for backwards compatibility)
      const flaggedText = flaggedExpenses.length > 0 
        ? `[Flagged: ${flaggedExpenses.join(', ')}] ` 
        : '';
      const fullComment = flaggedText + comment;
      
      // Try with review_history first, fall back without if column doesn't exist
      let updateData = { 
        status: 'changes_requested', 
        admin_comment: fullComment,  // Keep for backwards compatibility
        reviewed_by: currentUser.name,
        approval_level: 1,
        review_history: updatedHistory
      };
      
      // Only add flagged_expenses if there are any
      if (flaggedExpenses.length > 0) {
        updateData.flagged_expenses = flaggedExpenses;
      }
      
      let result = await supabase.from('claims').update(updateData).eq('id', claimId);
      
      // If failed, retry without review_history (column may not exist)
      if (result.error) {
        delete updateData.review_history;
        result = await supabase.from('claims').update(updateData).eq('id', claimId);
      }
      
      // If still failed and we tried flagged_expenses, retry without it
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

  const handleSaveAdminEdits = async (claim, editedExpenses, hasDeletedItems = false) => {
    setLoading(true);
    try {
      // Sort by date and reassign sequential refs
      const sorted = [...editedExpenses].sort((a, b) => new Date(a.date) - new Date(b.date));
      const renumbered = sorted.map((exp, idx) => ({ ...exp, ref: String(idx + 1) }));
      
      const newTotal = renumbered.reduce((sum, e) => sum + parseFloat(e.reimbursementAmount || e.amount || 0), 0);
      
      const updateData = { 
        expenses: renumbered, 
        total_amount: newTotal,
        item_count: renumbered.length,
        edited_by: currentUser.name 
      };
      
      // If items were deleted, remap statement annotations to new ref numbers
      if (hasDeletedItems && claim.statement_annotations) {
        // Build mapping: old ref → new ref based on expense id matching
        const refMap = {};
        renumbered.forEach(exp => {
          // Find original expense by id to get old ref
          const original = (claim.expenses || []).find(e => e.id === exp.id);
          if (original && original.ref !== exp.ref) {
            refMap[original.ref] = exp.ref;
          }
        });
        
        // Update annotations: remap refs, remove annotations for deleted expenses
        const survivingIds = new Set(renumbered.map(e => e.id));
        const updatedAnnotations = claim.statement_annotations
          .filter(a => {
            // Keep annotation if its expense still exists
            const origExp = (claim.expenses || []).find(e => e.ref === a.ref || String(e.ref) === String(a.ref));
            return origExp && survivingIds.has(origExp.id);
          })
          .map(a => {
            const newRef = refMap[a.ref] || refMap[String(a.ref)];
            return newRef ? { ...a, ref: newRef } : a;
          });
        
        updateData.statement_annotations = updatedAnnotations;
      }
      
      const { data, error } = await supabase.from('claims').update(updateData).eq('id', claim.id);
      if (error) {
        // Fallback without annotations if column doesn't exist
        if (updateData.statement_annotations) {
          delete updateData.statement_annotations;
          const retry = await supabase.from('claims').update(updateData).eq('id', claim.id);
          if (retry.error) throw new Error(retry.error.message || 'Database error');
        } else {
          throw new Error(error.message || 'Database error');
        }
      }
      await loadClaims();
      setSelectedClaim(prev => prev ? { ...prev, expenses: renumbered, total_amount: newTotal, edited_by: currentUser.name } : null);
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
      alert('✅ Marked as submitted for payment');
    } catch (err) { console.error('Mark submitted error:', err); alert('❌ Failed'); }
    setLoading(false);
  };

  const handleMarkPaid = async (claimId) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('claims').update({ 
        status: 'paid',
        paid_by: currentUser.name,
        paid_at: new Date().toISOString()
      }).eq('id', claimId);
      if (error) throw error;
      await loadClaims();
      alert('✅ Marked as paid');
    } catch (err) { console.error('Mark paid error:', err); alert('❌ Failed'); }
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
    const [receiptPreview3, setReceiptPreview3] = useState(editExpense?.receiptPreview3 || null);
    const [receiptPreview4, setReceiptPreview4] = useState(editExpense?.receiptPreview4 || null);
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
      backcharges: editExpense.backcharges || [],
      mileageDistance: editExpense.mileageDistance || ''
    } : { 
      merchant: '', 
      amount: '', 
      currency: userOffice?.currency || 'SGD', 
      date: new Date().toISOString().split('T')[0], 
      category: '', 
      description: '', 
      attendeesList: [],
      numberOfPax: '', 
      reimbursementAmount: '', 
      hasBackcharge: false, 
      backcharges: [],
      mileageDistance: ''
    });
    const isForeignCurrency = formData.currency !== userReimburseCurrency;
    const isCNY = formData.currency === 'CNY';
    const [duplicateWarning, setDuplicateWarning] = useState(null);
    const [duplicateMatchLabel, setDuplicateMatchLabel] = useState(null); // Short label for badge e.g. "Ariel - 2026 - 01 (item 3)"

    // Calculate forex rate from entered amounts
    const calculatedRate = isForeignCurrency && formData.amount && formData.reimbursementAmount 
      ? calculateForexRate(formData.amount, formData.reimbursementAmount) 
      : null;

    // Duplicate Check Effect (Scans Drafts AND History)
    useEffect(() => {
        if (!formData.amount || !formData.date || !formData.currency) return;
        
        // 1. Scan Past Claims (History) - across ALL employees
        let matchInfo = null;
        for (const claim of existingClaims) {
          const match = (claim.expenses || []).find(e => 
            e.amount === parseFloat(formData.amount) && 
            e.date === formData.date && 
            e.currency === formData.currency &&
            e.id !== editExpense?.id
          );
          if (match) {
            matchInfo = { source: 'history', claimNumber: claim.claim_number, claimant: claim.user_name, ref: match.ref, merchant: match.merchant };
            break;
          }
        }

        // 2. Scan Current Drafts (Pending)
        if (!matchInfo) {
          const foundInDrafts = expenses.filter(e => e.id !== editExpense?.id).find(e => 
            parseFloat(e.amount) === parseFloat(formData.amount) && 
            e.date === formData.date && 
            e.currency === formData.currency
          );
          if (foundInDrafts) {
            matchInfo = { source: 'drafts', ref: foundInDrafts.ref, merchant: foundInDrafts.merchant };
          }
        }

        if (matchInfo) {
          const detail = matchInfo.source === 'history' 
            ? `⚠️ Possible Duplicate: Matches ${matchInfo.claimant}'s ${matchInfo.claimNumber} (item ${matchInfo.ref} - ${matchInfo.merchant})`
            : `⚠️ Possible Duplicate: Matches item ${matchInfo.ref} (${matchInfo.merchant}) in current drafts`;
          const shortLabel = matchInfo.source === 'history'
            ? `${matchInfo.claimNumber} (item ${matchInfo.ref})`
            : `item ${matchInfo.ref}`;
          setDuplicateWarning(detail);
          setDuplicateMatchLabel(shortLabel);
        } else {
          setDuplicateWarning(null);
          setDuplicateMatchLabel(null);
        }
    }, [formData.amount, formData.date, formData.currency, existingClaims, expenses, editExpense]);

    const [isUploading, setIsUploading] = useState(false);
    
    const handleFileChange = async (e, receiptNum = 1) => { 
      const file = e.target.files?.[0]; 
      if (!file) return;
      setIsUploading(true);
      const setters = { 1: setReceiptPreview, 2: setReceiptPreview2, 3: setReceiptPreview3, 4: setReceiptPreview4 };
      const setter = setters[receiptNum] || setReceiptPreview;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const imageUrl = await uploadImageToStorage(event.target.result, currentUser.id, 'receipt');
          setter(imageUrl);
          if (receiptNum === 1) setStep(2);
        } catch (err) {
          console.error('Upload failed:', err);
          const compressed = await compressImage(event.target.result);
          setter(compressed);
          if (receiptNum === 1) setStep(2);
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
          newExpenses = expenses.map(e => e.id === editExpense.id ? { ...e, ...formData, attendees: attendeesForSave, amount: parseFloat(formData.amount), reimbursementAmount: isForeignCurrency ? parseFloat(formData.reimbursementAmount) : parseFloat(formData.amount), receiptPreview: receiptPreview || e.receiptPreview, receiptPreview2: receiptPreview2 || e.receiptPreview2, receiptPreview3: receiptPreview3 || e.receiptPreview3, receiptPreview4: receiptPreview4 || e.receiptPreview4, isForeignCurrency, isPotentialDuplicate: !!duplicateWarning, duplicateMatchLabel: duplicateMatchLabel || null, forexRate, updatedAt: new Date().toISOString() } : e);
          newExpenses = sortAndReassignRefs(newExpenses);
          setExpenses(newExpenses);
        } else { 
          const newExpense = { id: Date.now(), ref: 'temp', ...formData, attendees: attendeesForSave, amount: parseFloat(formData.amount) || 0, reimbursementAmount: isForeignCurrency ? (parseFloat(formData.reimbursementAmount) || 0) : (parseFloat(formData.amount) || 0), receiptPreview: receiptPreview || null, receiptPreview2: receiptPreview2 || null, receiptPreview3: receiptPreview3 || null, receiptPreview4: receiptPreview4 || null, status: 'draft', isForeignCurrency: isForeignCurrency || false, isOld: isOlderThan2Months(formData.date), createdAt: new Date().toISOString(), isPotentialDuplicate: !!duplicateWarning, duplicateMatchLabel: duplicateMatchLabel || null, forexRate };
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
    
    const canSave = formData.merchant && formData.amount && formData.date && formData.category && formData.description && (!needsAttendees || (attendeeCount > 0 && formData.numberOfPax)) && (!isForeignCurrency || formData.reimbursementAmount) && backchargeValid && attendeePaxMatch;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 flex justify-between items-center"><div><h2 className="text-lg font-bold">{editExpense ? '✏️ Edit' : '📸 Add'} Expense</h2><p className="text-blue-100 text-sm">Reimburse in {userReimburseCurrency}</p></div><button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20">✕</button></div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {step === 1 && (<div className="space-y-3">{isUploading ? (<div className="text-center py-12"><div className="text-4xl mb-2 animate-pulse">☁️</div><p className="font-semibold text-blue-700">Uploading...</p><p className="text-xs text-slate-500">Please wait</p></div>) : (<><label className="block border-3 border-dashed border-blue-400 bg-blue-50 rounded-2xl p-6 text-center cursor-pointer hover:border-blue-500"><input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, 1)} className="hidden" /><div className="text-4xl mb-2">📷</div><p className="font-semibold text-blue-700">Take Photo</p><p className="text-xs text-slate-500">Open camera</p></label><label className="block border-3 border-dashed border-green-400 bg-green-50 rounded-2xl p-6 text-center cursor-pointer hover:border-green-500"><input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 1)} className="hidden" /><div className="text-4xl mb-2">🖼️</div><p className="font-semibold text-green-700">Choose from Gallery</p><p className="text-xs text-slate-500">Select existing photo</p></label></>)}</div>)}
            {step === 2 && (
              <div className="space-y-4">
                {duplicateWarning && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 text-sm font-bold animate-pulse">{duplicateWarning}</div>}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { num: 1, preview: receiptPreview, setPreview: setReceiptPreview, label: 'Receipt 1', required: true },
                    { num: 2, preview: receiptPreview2, setPreview: setReceiptPreview2, label: 'Receipt 2' },
                    { num: 3, preview: receiptPreview3, setPreview: setReceiptPreview3, label: 'Receipt 3' },
                    { num: 4, preview: receiptPreview4, setPreview: setReceiptPreview4, label: 'Receipt 4' },
                  ].map(({ num, preview, setPreview, label, required }) => (
                    <div key={num}><p className="text-xs font-semibold text-slate-500 mb-1">{label} {!required && <span className="text-slate-400">Optional</span>}</p>
                    {preview ? (<div className="relative"><img src={preview} alt={label} className="w-full h-28 object-cover bg-slate-100 rounded-lg cursor-pointer" onClick={() => setShowFullImage(preview)} /><button onClick={() => setPreview(null)} className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full text-xs">✕</button></div>
                    ) : (<div className="flex gap-1"><label className="flex-1 border-2 border-dashed border-slate-300 rounded-lg p-3 text-center cursor-pointer hover:border-blue-400"><input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, num)} className="hidden" /><span className="text-lg">📷</span></label><label className="flex-1 border-2 border-dashed border-slate-300 rounded-lg p-3 text-center cursor-pointer hover:border-green-400"><input type="file" accept="image/*" onChange={(e) => handleFileChange(e, num)} className="hidden" /><span className="text-lg">📁</span></label></div>)}
                    </div>
                  ))}
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
                  <select className={`p-3 border-2 rounded-xl bg-white text-sm ${!formData.category ? 'border-red-400' : 'border-slate-200'}`} value={formData.category} onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}>
                    <option value="">— Select Category —</option>
                    <optgroup label="Travel">
                      {Object.entries(EXPENSE_CATEGORIES).filter(([k,v]) => v.group === 'TRAVEL' && k !== 'H').map(([key, val]) => <option key={key} value={key}>{val.icon} {val.name}</option>)}
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
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 flex justify-between items-center shrink-0"><div><h2 className="text-lg font-bold">📋 Preview</h2><p className="text-blue-200 text-sm">{userReimburseCurrency}</p></div><div className="flex items-center gap-2"><button onClick={handleDownloadPreviewPDF} disabled={downloading} className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold text-sm">📥 PDF</button><button onClick={handleClosePreview} className="w-8 h-8 rounded-full bg-white/20">✕</button></div></div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto border-2 border-slate-300 rounded-xl p-6">
              <div className="text-center mb-6"><h1 className="text-xl font-bold">Berkeley International Expense Claim Form</h1><p className="text-sm text-slate-500">{getCompanyName(currentUser.office)}</p></div>
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm"><div><span className="text-slate-500">Name:</span> <strong>{currentUser.name}</strong></div><div><span className="text-slate-500">Currency:</span> <strong className="text-green-700">{userReimburseCurrency}</strong></div></div>
              {workflow && (<div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm"><p className="font-semibold text-blue-800">Approval: {workflow.selfSubmit ? `Direct Save → ${workflow.externalApproval || 'External'}` : workflow.singleLevel ? (workflow.externalApproval ? `${workflow.level1Name} → ${workflow.externalApproval}` : `${workflow.level1Name} (Final)`) : `${workflow.level1Name} → ${workflow.level2Name}`}</p></div>)}
              <table className="w-full text-sm"><tbody>{Object.entries(EXPENSE_CATEGORIES).filter(([cat, _]) => getCategoryTotal(cat) > 0).map(([cat, catData]) => (<tr key={cat} className="border-b"><td className="py-2 font-bold text-blue-700 w-10">{catData.icon}</td><td className="py-2">{catData.name}<span className="text-slate-400 text-xs ml-2">GL {catData.gl}</span></td><td className="py-2 text-right font-medium">{userReimburseCurrency} {getCategoryTotal(cat).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>))}</tbody></table>
              <div className="bg-blue-50 p-4 rounded-xl mt-4 flex justify-between items-center"><span className="font-bold text-lg">Total</span><span className="font-bold text-2xl text-blue-700">{formatCurrency(reimbursementTotal, userReimburseCurrency)}</span></div>
              <h3 className="font-bold mt-6 mb-3">Receipts ({pendingExpenses.length})</h3>
              <div className="grid grid-cols-3 gap-3">{pendingExpenses.map(exp => (<div key={exp.id} className="border rounded-lg overflow-hidden"><div className="bg-blue-100 p-1 flex justify-between text-xs"><span className="font-bold text-blue-700">{exp.ref}</span><div className="flex gap-1">{exp.isForeignCurrency && <span>💳</span>}{[exp.receiptPreview2, exp.receiptPreview3, exp.receiptPreview4].some(Boolean) && <span>📑{[exp.receiptPreview, exp.receiptPreview2, exp.receiptPreview3, exp.receiptPreview4].filter(Boolean).length}</span>}</div></div>{exp.receiptPreview ? (<img src={exp.receiptPreview} alt={exp.ref} className="w-full h-16 object-cover cursor-pointer" onClick={() => setViewImg(exp.receiptPreview)} />) : (<div className="w-full h-16 bg-slate-100 flex items-center justify-center">📄</div>)}<div className="p-1 bg-slate-50 text-xs"><p className="truncate">{exp.merchant}</p><p className="text-green-700 font-bold">{formatCurrency(exp.reimbursementAmount || exp.amount, userReimburseCurrency)}</p></div></div>))}</div>
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
          <div className="p-4 border-t bg-slate-50 flex gap-3 shrink-0"><button onClick={handleClosePreview} className="flex-1 py-3 rounded-xl border-2 font-semibold">← Back</button><button onClick={handleSubmitClaim} disabled={!canSubmit || loading} className={`flex-[2] py-3 rounded-xl font-semibold ${canSubmit && !loading ? 'bg-green-600 text-white' : 'bg-slate-300 text-slate-500'}`}>{editingReturnedClaimId ? (loading ? '⏳...' : '🔄 Address & Resubmit') : submitButtonText}</button></div>
        </div>
        {viewImg && <ImageViewer src={viewImg} onClose={() => setViewImg(null)} />}
      </div>
    );
  };

  // ============ COMBINED REVIEW MODAL ============
  const ReviewModal = ({ claim, onClose }) => {
    const rawSorted = [...(claim.expenses || [])].sort((a, b) => {
      const numA = parseInt(a.ref); const numB = parseInt(b.ref);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return (a.ref || '999').localeCompare(b.ref || '999', undefined, { numeric: true });
    });
    // Dynamic duplicate check against ALL claims
    const sortedExpenses = enrichWithDuplicates(rawSorted, claim.id);
    const [notes, setNotes] = useState({}); // idx -> note text (internal, persists in PDF)
    const [returnReasons, setReturnReasons] = useState({}); // idx -> return reason (triggers Return button)
    const [addressed, setAddressed] = useState({}); // idx -> true (marks previous return as addressed, stripped on final approval)
    const [editingPrevNotes, setEditingPrevNotes] = useState({}); // idx -> true when editing previous notes
    const [editedPrevNotes, setEditedPrevNotes] = useState({}); // idx -> edited adminNotes string
    const [expenseEdits, setExpenseEdits] = useState({}); // idx -> { field: value } for editing approved claims
    const [deletedExpenses, setDeletedExpenses] = useState(new Set()); // idx of expenses to remove
    
    const getExpField = (idx, field, defaultVal) => expenseEdits[idx]?.[field] !== undefined ? expenseEdits[idx][field] : defaultVal;
    const setExpField = (idx, field, value) => setExpenseEdits(prev => ({ ...prev, [idx]: { ...(prev[idx] || {}), [field]: value } }));
    const [saving, setSaving] = useState(false);
    const [showApproveConfirm, setShowApproveConfirm] = useState(false);
    const reviewerFirstName = currentUser.name.split(' ')[0];
    
    const hasAnyReturnReason = Object.values(returnReasons).some(v => v?.trim());
    const itemsWithReasons = Object.entries(returnReasons).filter(([_, v]) => v?.trim()).map(([idx]) => sortedExpenses[parseInt(idx)]?.ref).filter(Boolean);
    
    const isAlreadyApproved = claim.status === 'approved' || claim.status === 'submitted_to_finance' || claim.status === 'paid';
    const isEditable = claim.status === 'submitted_to_finance'; // Only editable during finance review
    
    const approveButtonText = (() => {
      if (isAlreadyApproved) return isEditable ? (deletedExpenses.size > 0 ? `💾 Save (${deletedExpenses.size} removed)` : '💾 Save Changes') : '💾 Save Notes';
      const workflow = SENIOR_STAFF_ROUTING[claim.user_id];
      const isSingleLevel = workflow?.singleLevel;
      const level = claim.approval_level || 1;
      if (level === 1 && isSingleLevel) return workflow?.externalApproval ? '✓ Approve (→ Chairman)' : '✓ Final Approve';
      if (level === 1) return '✓ Approve → L2';
      return '✓ Final Approve';
    })();
    
    // Helper: get base notes for an expense (use edited version if available, preserve return lines)
    const getBaseNotes = (exp, idx) => {
      if (editedPrevNotes[idx] === undefined) return exp.adminNotes || '';
      const allLines = (exp.adminNotes || '').split('\n').filter(l => l.trim());
      const returnLines = allLines.filter(l => l.includes('[R]:') || l.includes('[RETURN]:'));
      const editedNoteLines = editedPrevNotes[idx].split('\n').filter(l => l.trim());
      return [...returnLines, ...editedNoteLines].join('\n');
    };
    
    // Build updated expenses with current notes/edits
    const buildUpdatedExpenses = () => {
      return sortedExpenses.map((exp, idx) => {
        if (deletedExpenses.has(idx)) return null; // Mark for removal
        let updated = { ...exp };
        // Apply field edits (for approved claims)
        if (expenseEdits[idx]) {
          const edits = expenseEdits[idx];
          if (edits.merchant !== undefined) updated.merchant = edits.merchant;
          if (edits.description !== undefined) updated.description = edits.description;
          if (edits.category !== undefined) updated.category = edits.category;
          if (edits.reimbursementAmount !== undefined) {
            updated.reimbursementAmount = parseFloat(edits.reimbursementAmount) || 0;
          }
        }
        // Apply notes
        const parts = [];
        const note = notes[idx]?.trim();
        if (note) parts.push(`${reviewerFirstName}: ${note}`);
        if (addressed[idx]) parts.push(`${reviewerFirstName} [R]: ✓ Addressed`);
        const base = getBaseNotes(updated, idx);
        if (parts.length > 0) {
          const newNotes = parts.join('\n');
          updated.adminNotes = base ? `${base}\n${newNotes}` : newNotes;
        } else if (editedPrevNotes[idx] !== undefined) {
          updated.adminNotes = base;
        }
        return updated;
      }).filter(Boolean); // Remove deleted expenses
    };
    
    const handleSaveAndApprove = async () => {
      setSaving(true);
      const updatedExpenses = buildUpdatedExpenses();
      await handleSaveAdminEdits(claim, updatedExpenses, deletedExpenses.size > 0);
      if (!isAlreadyApproved) {
        await handleApprove(claim);
      } else {
        alert('✅ Changes saved');
      }
      setSaving(false);
      onClose();
    };
    
    const handleSaveAndReturn = async () => {
      setSaving(true);
      const updatedExpensesBase = buildUpdatedExpenses();
      // Also append return reasons
      const updatedExpenses = updatedExpensesBase.map((exp, idx) => {
        const reason = returnReasons[idx]?.trim();
        if (reason) {
          const existing = exp.adminNotes || '';
          const returnNote = `${reviewerFirstName} [R]: ${reason}`;
          return { ...exp, adminNotes: existing ? `${existing}\n${returnNote}` : returnNote };
        }
        return exp;
      });
      await handleSaveAdminEdits(claim, updatedExpenses, deletedExpenses.size > 0);
      const allReasons = Object.entries(returnReasons)
        .filter(([_, v]) => v?.trim())
        .map(([idx, v]) => `Item ${sortedExpenses[parseInt(idx)]?.ref}: ${v.trim()}`)
        .join('\n');
      
      await handleRequestChanges(claim.id, allReasons, itemsWithReasons);
      setSaving(false);
      onClose();
    };
    
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-5 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-lg">📋 Review: {claim.user_name}</h2>
              <p className="text-blue-200 text-sm">{claim.claim_number} • {claim.currency} • Level {claim.approval_level || 1}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 text-lg">✕</button>
          </div>
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-200px)]">
            {isAlreadyApproved && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 mb-3 text-sm text-amber-800">
                {isEditable ? '✏️ This claim is submitted for payment. You can edit expenses, add notes, or return it.' : '📁 This claim is finalized. You can add notes or return it for changes.'}
              </div>
            )}
            {sortedExpenses.map((exp, idx) => {
              const cat = EXPENSE_CATEGORIES[exp.category] || {};
              const isOld = isOlderThan2Months(exp.date);
              const isApproaching = isApproaching2Months(exp.date);
              const daysLeft = getDaysUntil2Months(exp.date);
              const paxCount = parseInt(exp.numberOfPax) || 0;
              const isEntertaining = cat.requiresAttendees;
              const perPax = isEntertaining && paxCount > 0 ? (parseFloat(exp.reimbursementAmount || exp.amount) / paxCount) : 0;
              const isDiffCurrency = exp.isForeignCurrency || (exp.currency !== claim.currency);
              
              return (
                <div key={idx} className={`border-2 rounded-xl p-4 mb-3 ${deletedExpenses.has(idx) ? 'border-red-400 bg-red-100 opacity-50' : exp.isPotentialDuplicate ? 'border-red-400 bg-red-50' : isOld ? 'border-red-300 bg-red-50' : isApproaching ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
                  {deletedExpenses.has(idx) ? (
                    <div className="flex justify-between items-center py-2">
                      <span className="line-through text-red-600 font-semibold">{exp.ref} — {exp.merchant} — {formatCurrency(exp.reimbursementAmount || exp.amount, claim.currency)}</span>
                      <button onClick={() => setDeletedExpenses(prev => { const n = new Set(prev); n.delete(idx); return n; })} className="bg-white text-blue-600 px-3 py-1 rounded-lg text-xs font-semibold border border-blue-300">↩ Undo</button>
                    </div>
                  ) : (<>
                  {/* Header: Ref + Vendor + Date + Amount */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-blue-600 text-white font-bold px-3 py-1 rounded-lg text-sm">{exp.ref}</span>
                        {isEditable ? (
                          <input className="font-bold text-slate-800 border-b border-slate-300 bg-transparent text-sm px-1" value={getExpField(idx, 'merchant', exp.merchant)} onChange={e => setExpField(idx, 'merchant', e.target.value)} />
                        ) : (
                          <span className="font-bold text-slate-800">{exp.merchant}</span>
                        )}
                        <span className="text-slate-500 text-sm">{formatShortDate(exp.date)}</span>
                      </div>
                      {/* Badges */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {exp.isPotentialDuplicate && <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded font-semibold">⚠️ Duplicate{exp.duplicateMatchLabel ? ` with ${exp.duplicateMatchLabel}` : exp.duplicateMatchRef ? ` with item ${exp.duplicateMatchRef}` : ''}?</span>}
                        {isOld && <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded font-semibold">🚨 &gt;2 Months</span>}
                        {isApproaching && <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded">⏰ {daysLeft}d left</span>}
                      </div>
                    </div>
                    {isEditable ? (
                      <div className="ml-3 flex items-center gap-1">
                        <span className="text-green-700 font-bold">{claim.currency}</span>
                        <input type="number" step="0.01" className="font-bold text-green-700 text-lg w-24 text-right border-b border-green-300 bg-transparent" 
                          value={getExpField(idx, 'reimbursementAmount', exp.reimbursementAmount || exp.amount)} 
                          onChange={e => setExpField(idx, 'reimbursementAmount', e.target.value)} 
                        />
                      </div>
                    ) : (
                      <span className="font-bold text-green-700 text-lg ml-3 whitespace-nowrap">{formatCurrency(exp.reimbursementAmount || exp.amount, claim.currency)}</span>
                    )}
                  </div>
                  
                  {/* Details grid */}
                  <div className="text-sm text-slate-600 space-y-1 mb-3 bg-slate-50 rounded-lg p-3">
                    <div><span className="font-semibold text-slate-500">Category:</span> {isEditable ? (
                      <select className="ml-1 border border-slate-300 rounded px-1 py-0.5 text-sm bg-white" value={getExpField(idx, 'category', exp.category)} onChange={e => setExpField(idx, 'category', e.target.value)}>
                        {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.name}</option>)}
                      </select>
                    ) : <span>{cat.icon} {cat.name}</span>}</div>
                    <div><span className="font-semibold text-slate-500">Description:</span> {isEditable ? (
                      <input className="ml-1 w-full border-b border-slate-300 bg-transparent text-sm" value={getExpField(idx, 'description', exp.description || '')} onChange={e => setExpField(idx, 'description', e.target.value)} />
                    ) : <span>{exp.description || '—'}</span>}</div>
                    <div><span className="font-semibold text-slate-500">Receipt amount:</span> {exp.currency} {parseFloat(exp.amount).toFixed(2)}{isDiffCurrency && <span> → <strong>{claim.currency} {parseFloat(exp.reimbursementAmount || exp.amount).toFixed(2)}</strong></span>}</div>
                    {isDiffCurrency && exp.forexRate && <div><span className="font-semibold text-slate-500">FX Rate:</span> 1 {exp.currency} = {exp.forexRate.toFixed(4)} {claim.currency}</div>}
                    {paxCount > 0 && <div><span className="font-semibold text-slate-500">Pax:</span> 👥 {paxCount}{isEntertaining && perPax > 0 && <span> • 💰 {claim.currency} {perPax.toFixed(2)}/pax</span>}</div>}
                    {exp.attendees && <div><span className="font-semibold text-slate-500">Attendees:</span> {exp.attendees.replace(/\n/g, ', ')}</div>}
                    {exp.mileageDistance && <div><span className="font-semibold text-slate-500">Mileage:</span> {exp.mileageFrom && <span>{exp.mileageFrom} → {exp.mileageTo} | </span>}{exp.mileageDistance} {exp.mileageUnit || 'km'}</div>}
                  </div>
                  
                  {/* Previous notes and return reasons - shown separately */}
                  {exp.adminNotes && (() => {
                    const lines = exp.adminNotes.split('\n').filter(l => l.trim());
                    const returnLines = lines.filter(l => l.includes('[R]:') || l.includes('[RETURN]:'));
                    const noteLines = lines.filter(l => !l.includes('[R]:') && !l.includes('[RETURN]:'));
                    const cleanLine = (l) => l.replace(/ \[R\]:/g, ':').replace(/ \[RETURN\]:/g, ':');
                    return (<>
                      {returnLines.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-2">
                          <p className="text-xs font-semibold text-red-600 mb-1">🔄 Previous return reason:</p>
                          {returnLines.map((line, li) => (
                            <div key={li} className="flex items-center gap-2 text-xs text-red-700">
                              <span className={`flex-1 ${addressed[idx] ? 'line-through opacity-50' : ''}`}>{cleanLine(line)}</span>
                              {!addressed[idx] ? (
                                <button 
                                  onClick={() => setAddressed(prev => ({ ...prev, [idx]: true }))}
                                  className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded hover:bg-green-200 flex-shrink-0"
                                >✓</button>
                              ) : (
                                <span className="px-2 py-0.5 bg-green-200 text-green-800 text-xs font-semibold rounded flex-shrink-0">✓ Addressed</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {noteLines.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-xs font-semibold text-blue-600">📝 Previous notes:</p>
                            <button 
                              onClick={() => {
                                if (editingPrevNotes[idx]) {
                                  setEditingPrevNotes(prev => ({ ...prev, [idx]: false }));
                                } else {
                                  setEditingPrevNotes(prev => ({ ...prev, [idx]: true }));
                                  if (editedPrevNotes[idx] === undefined) {
                                    setEditedPrevNotes(prev => ({ ...prev, [idx]: noteLines.join('\n') }));
                                  }
                                }
                              }}
                              className="text-xs text-blue-500 hover:text-blue-700 font-semibold"
                            >{editingPrevNotes[idx] ? 'Done' : '✏️ Edit'}</button>
                          </div>
                          {editingPrevNotes[idx] ? (
                            <textarea 
                              className="w-full p-2 border border-blue-300 rounded text-xs text-blue-700 bg-white resize-y min-h-[60px]"
                              value={editedPrevNotes[idx] ?? noteLines.join('\n')}
                              onChange={e => setEditedPrevNotes(prev => ({ ...prev, [idx]: e.target.value }))}
                            />
                          ) : (
                            <div className="text-xs text-blue-700">{(editedPrevNotes[idx] !== undefined ? editedPrevNotes[idx] : noteLines.join('\n')).split('\n').map((line, li) => <div key={li}>{line}</div>)}</div>
                          )}
                        </div>
                      )}
                    </>);
                  })()}
                  
                  {/* Notes input (internal audit trail) */}
                  <div className="flex gap-2 items-start mb-2">
                    <span className="text-xs font-semibold text-blue-600 whitespace-nowrap pt-2 w-20">📝 Notes:</span>
                    <input 
                      className="flex-1 p-2 border-2 border-blue-200 bg-blue-50 rounded-lg text-sm" 
                      placeholder="Internal note for audit trail..." 
                      value={notes[idx] || ''} 
                      onChange={e => setNotes(prev => ({ ...prev, [idx]: e.target.value }))} 
                    />
                  </div>
                  
                  {/* Return reason input */}
                  <div className="flex gap-2 items-start">
                    <span className="text-xs font-semibold text-red-600 whitespace-nowrap pt-2 w-20">🔄 Return:</span>
                    <input 
                      className={`flex-1 p-2 border-2 rounded-lg text-sm ${returnReasons[idx]?.trim() ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'}`}
                      placeholder="Return reason (e.g. wrong date, missing receipt)..." 
                      value={returnReasons[idx] || ''} 
                      onChange={e => setReturnReasons(prev => ({ ...prev, [idx]: e.target.value }))} 
                    />
                  </div>
                  {isEditable && !deletedExpenses.has(idx) && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <button onClick={() => setDeletedExpenses(prev => new Set([...prev, idx]))} className="text-xs text-red-500 hover:text-red-700 font-semibold">🗑️ Remove this expense</button>
                    </div>
                  )}
                </>)}
                </div>
              );
            })}
          </div>
          
          {/* Bottom buttons */}
          <div className="p-4 border-t bg-slate-50 flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-slate-300 font-semibold text-slate-600">Cancel</button>
            <button 
              onClick={handleSaveAndReturn} 
              disabled={!hasAnyReturnReason || saving}
              className={`flex-1 py-3 rounded-xl font-semibold ${hasAnyReturnReason && !saving ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              {saving ? '⏳...' : `🔄 Return (${itemsWithReasons.length} item${itemsWithReasons.length !== 1 ? 's' : ''})`}
            </button>
            <button 
              onClick={() => { if (hasAnyReturnReason) { setShowApproveConfirm(true); } else { handleSaveAndApprove(); }}}
              disabled={saving}
              className="flex-[1.5] py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50"
            >
              {saving ? '⏳...' : approveButtonText}
            </button>
          </div>
          
          {/* Confirm approve/save with return reasons dialog */}
          {showApproveConfirm && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-6 rounded-2xl">
              <div className="bg-white rounded-xl p-6 max-w-sm shadow-xl">
                <h3 className="font-bold text-lg mb-2">⚠️ {isAlreadyApproved ? 'Save with return reasons?' : 'Approve with return reasons?'}</h3>
                <p className="text-sm text-slate-600 mb-4">You have return reasons on items {itemsWithReasons.join(', ')}. {isAlreadyApproved ? 'Saving will keep the notes but NOT return the claim.' : 'Approving will save your notes but NOT return the claim to the employee.'}</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowApproveConfirm(false)} className="flex-1 py-2 rounded-lg border-2 font-semibold text-sm">Cancel</button>
                  <button onClick={() => { setShowApproveConfirm(false); handleSaveAndApprove(); }} className="flex-1 py-2 rounded-lg bg-green-600 text-white font-semibold text-sm">Yes, {isAlreadyApproved ? 'Save' : 'Approve'}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  const MyExpensesTab = () => {
    const myClaims = claims.filter(c => c.user_id === currentUser.id);
    const returnedClaims = myClaims.filter(c => c.status === 'changes_requested');
    const userReimburseCurrency = getUserReimburseCurrency(currentUser);
    // activeClaimTab is from parent state
    const [showReviewPopup, setShowReviewPopup] = useState(null);
    const [resubmitClaim, setResubmitClaim] = useState(null);
    
    // Sort by date for sequential display
    const sortedExpenses = [...pendingExpenses].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Look up returned claim for banner/flagged info
    const activeReturnedClaim = returnedClaims.find(c => c.id === activeClaimTab);
    
    return (
      <div className="space-y-4">
        {/* Tab system for current vs returned claims */}
        {returnedClaims.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="flex overflow-x-auto">
              <button
                onClick={() => switchToCurrentDraftTab()}
                className={`flex-shrink-0 px-4 py-3 text-sm font-semibold border-b-2 ${activeClaimTab === 'current' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
              >
                📝 Current Draft
              </button>
              {returnedClaims.map(claim => (
                <button
                  key={claim.id}
                  onClick={() => switchToReturnedTab(claim)}
                  className={`flex-shrink-0 px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 ${activeClaimTab === claim.id ? 'border-amber-500 text-amber-600 bg-amber-50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                >
                  <span>🔄 {claim.claim_number}</span>
                  <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded">Returned</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Show returned claim info banner if viewing a returned claim */}
        {activeReturnedClaim && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-amber-800">🔄 {activeReturnedClaim.claim_number} - Returned for Changes</h3>
                <p className="text-xs text-amber-600 mt-1">From: {activeReturnedClaim.reviewed_by}</p>
              </div>
              <button 
                onClick={() => setShowReviewPopup(activeReturnedClaim)}
                className="bg-amber-600 text-white px-3 py-2 rounded-lg text-sm font-semibold"
              >
                📋 View Comments
              </button>
            </div>
            {(activeReturnedClaim.flagged_expenses || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {activeReturnedClaim.flagged_expenses.map(ref => (
                  <span key={ref} className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">🚩 {ref}</span>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Review Comments Popup */}
        {/* Review History Popup for Employee */}
        {showReviewPopup && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setShowReviewPopup(null)}>
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">📋 Review History</h3>
                <button onClick={() => setShowReviewPopup(null)} className="text-2xl text-slate-400">×</button>
              </div>
              <p className="text-sm text-slate-500 mb-3">{showReviewPopup.claim_number}</p>
              <div className="space-y-3">
                {/* Show review_history if available */}
                {(showReviewPopup.review_history && showReviewPopup.review_history.length > 0) ? (
                  showReviewPopup.review_history.map((entry, idx) => (
                    <div key={idx} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-semibold text-amber-800">Review #{idx + 1}</span>
                        <span className="text-xs text-slate-400">{new Date(entry.date).toLocaleDateString()}</span>
                      </div>
                      {(entry.flagged || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {entry.flagged.map(ref => (<span key={ref} className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">🚩 {ref}</span>))}
                        </div>
                      )}
                      <p className="text-amber-700 text-sm whitespace-pre-wrap">{entry.comment}</p>
                      <p className="text-xs text-slate-500 mt-2">— {entry.reviewer}</p>
                    </div>
                  ))
                ) : (
                  /* Fallback for old claims without review_history */
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    {(showReviewPopup.flagged_expenses || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {showReviewPopup.flagged_expenses.map(ref => (<span key={ref} className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">🚩 {ref}</span>))}
                      </div>
                    )}
                    <p className="text-amber-700 text-sm whitespace-pre-wrap">{showReviewPopup.admin_comment}</p>
                    <p className="text-xs text-slate-500 mt-2">— {showReviewPopup.reviewed_by}</p>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setShowReviewPopup(null)}
                className="w-full mt-4 bg-slate-100 text-slate-700 py-2 rounded-lg font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4"><div className="bg-white rounded-2xl shadow-lg p-6 text-center"><div className="text-4xl font-bold text-slate-800">{sortedExpenses.length}</div><div className="text-sm text-slate-500">{activeClaimTab === 'current' ? 'Pending' : 'In Claim'}</div></div><div className="bg-white rounded-2xl shadow-lg p-6 text-center"><div className="text-2xl font-bold text-green-600">{formatCurrency(reimbursementTotal, userReimburseCurrency)}</div><div className="text-sm text-slate-500">To Reimburse</div></div></div>
        <div className="bg-white rounded-2xl shadow-lg p-6"><div className="flex flex-wrap gap-3"><button onClick={() => setShowAddExpense(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg">📸 Add Receipt</button>{currentUser.mileageRate && <button onClick={() => setShowMileageModal(true)} className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg">📍 Mileage</button>}{pendingExpenses.length > 0 && (<button onClick={() => setShowPreview(true)} className="border-2 border-green-500 text-green-600 px-6 py-3 rounded-xl font-semibold">📋 Preview ({pendingExpenses.length})</button>)}{activeClaimTab === 'current' && <button onClick={handleManualSync} disabled={loading} className="border-2 border-slate-300 text-slate-600 px-4 py-3 rounded-xl font-semibold">{loading ? '⏳' : '🔄'} Sync</button>}</div></div>
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-800 mb-4">{activeClaimTab === 'current' ? '📋 Pending Expenses (sorted by date)' : `📋 ${activeReturnedClaim?.claim_number} Expenses`}</h3>
          {sortedExpenses.some(exp => isOlderThan2Months(exp.date)) && (
            <div className="bg-red-100 border-2 border-red-400 rounded-xl p-3 mb-4">
              <p className="text-red-700 font-semibold text-sm">🚨 Some receipts are over 2 months old and may not be reimbursable!</p>
            </div>
          )}
          {sortedExpenses.some(exp => isApproaching2Months(exp.date)) && !sortedExpenses.some(exp => isOlderThan2Months(exp.date)) && (
            <div className="bg-amber-100 border-2 border-amber-400 rounded-xl p-3 mb-4">
              <p className="text-amber-700 font-semibold text-sm">⏰ Some receipts are approaching 2 months old - submit soon!</p>
            </div>
          )}
          {sortedExpenses.length === 0 ? (<div className="text-center py-12 text-slate-400">📭 No {activeClaimTab === 'current' ? 'pending' : ''} expenses</div>) : (
            <div className="space-y-2">{sortedExpenses.map((exp, idx) => {
              const flaggedRefs = activeReturnedClaim?.flagged_expenses || [];
              const isOld = isOlderThan2Months(exp.date); 
              const isApproaching = isApproaching2Months(exp.date); 
              const daysLeft = getDaysUntil2Months(exp.date);
              const isFlagged = flaggedRefs.includes(exp.ref);
              const cat = EXPENSE_CATEGORIES[exp.category];
              return (<div key={exp.id || idx} className={`flex items-center justify-between p-3 rounded-xl border-2 ${isFlagged ? 'bg-red-50 border-red-500 ring-2 ring-red-300' : exp.isPotentialDuplicate ? 'bg-orange-50 border-orange-400' : isOld ? 'bg-red-50 border-red-300' : isApproaching ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${isFlagged ? 'bg-red-500 text-white' : 'bg-blue-100 text-blue-700'}`}>{isFlagged && '🚩 '}{exp.ref}</span>
                    <span className="font-semibold text-sm">{exp.merchant}</span>
                    <span className="text-xs text-slate-400">{formatShortDate(exp.date)}</span>
                    {isFlagged && <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded animate-pulse">⚠️ Needs Attention</span>}
                    {exp.isPotentialDuplicate && <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded">⚠️ Duplicate{exp.duplicateMatchLabel ? ` with ${exp.duplicateMatchLabel}` : exp.duplicateMatchRef ? ` with item ${exp.duplicateMatchRef}` : ''}?</span>}
                    {isOld && <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded animate-pulse">🚨 &gt;2 Months</span>}
                    {isApproaching && <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded">⏰ {daysLeft}d left</span>}
                    {exp.isForeignCurrency && <span className="text-amber-600 text-xs">💳</span>}
                    {[exp.receiptPreview2, exp.receiptPreview3, exp.receiptPreview4].some(Boolean) && <span className="text-slate-500 text-xs">📑{[exp.receiptPreview, exp.receiptPreview2, exp.receiptPreview3, exp.receiptPreview4].filter(Boolean).length}</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{cat?.icon} {cat?.name} • {exp.description}</p>
                  {exp.adminNotes && <div className="text-xs mt-1 bg-amber-50 border border-amber-200 px-2 py-1 rounded"><span className="font-semibold">📋 Review:</span><div dangerouslySetInnerHTML={{ __html: formatAdminNotesReact(exp.adminNotes) }} /></div>}
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
          {(() => {
            const fy = getFinancialYear();
            const fyClaims = myClaims.filter(c => c.status !== 'changes_requested' && c.claim_number?.includes(`- ${fy} -`));
            const fyTotal = fyClaims.reduce((s, c) => s + parseFloat(c.total_amount || 0), 0);
            const fyPaid = fyClaims.filter(c => c.status === 'paid' || c.status === 'approved' || c.status === 'submitted_to_finance').reduce((s, c) => s + parseFloat(c.total_amount || 0), 0);
            return (
              <div className="flex gap-3 mb-4">
                <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-blue-700">{fyClaims.length}</div>
                  <div className="text-xs text-blue-500">Claims FY{fy}</div>
                </div>
                <div className="flex-1 bg-green-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-green-700">{formatCurrency(fyTotal, getUserReimburseCurrency(currentUser))}</div>
                  <div className="text-xs text-green-500">Total FY{fy}</div>
                </div>
                <div className="flex-1 bg-purple-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-purple-700">{formatCurrency(fyPaid, getUserReimburseCurrency(currentUser))}</div>
                  <div className="text-xs text-purple-500">Approved/Paid</div>
                </div>
              </div>
            );
          })()}
          <h3 className="font-bold text-slate-800 mb-4">📁 My Claims</h3>
          {myClaims.filter(c => c.status !== 'changes_requested').length === 0 ? <p className="text-center text-slate-400 py-8">None</p> : (<div className="space-y-2">{myClaims.filter(c => c.status !== 'changes_requested').map(claim => (<div key={claim.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border"><div><span className="font-semibold">{claim.claim_number}</span><span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${claim.status === 'approved' || claim.status === 'paid' || claim.status === 'submitted_to_finance' ? 'bg-green-100 text-green-700' : claim.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{getClaimStatusText(claim)}</span></div><div className="flex items-center gap-3"><span className="font-bold">{formatCurrency(claim.total_amount, claim.currency)}</span><button onClick={() => handleDownloadPDF(claim)} className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm">📥</button></div></div>))}</div>)}
        </div>
        
        {/* Resubmit Claim Modal */}
        {resubmitClaim && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setResubmitClaim(null)}>
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">🔄 Resubmit {resubmitClaim.claim_number}</h3>
                <button onClick={() => setResubmitClaim(null)} className="text-2xl text-slate-400">×</button>
              </div>
              
              <div className="mb-4">
                <p className="font-semibold text-amber-800 mb-2">Review History:</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(resubmitClaim.review_history && resubmitClaim.review_history.length > 0) ? (
                    resubmitClaim.review_history.map((entry, idx) => (
                      <div key={idx} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-semibold text-amber-800">Review #{idx + 1}</span>
                          <span className="text-xs text-slate-400">{new Date(entry.date).toLocaleDateString()}</span>
                        </div>
                        {(entry.flagged || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1">
                            {entry.flagged.map(ref => (<span key={ref} className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">🚩 {ref}</span>))}
                          </div>
                        )}
                        <p className="text-amber-700 text-sm">{entry.comment}</p>
                        <p className="text-xs text-slate-500 mt-1">— {entry.reviewer}</p>
                      </div>
                    ))
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      {(resubmitClaim.flagged_expenses || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {resubmitClaim.flagged_expenses.map(ref => (<span key={ref} className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">🚩 {ref}</span>))}
                        </div>
                      )}
                      <p className="text-amber-700 text-sm">{resubmitClaim.admin_comment}</p>
                      <p className="text-xs text-slate-500 mt-1">— {resubmitClaim.reviewed_by}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-blue-800 text-sm">
                  <strong>Before resubmitting:</strong> Make sure you've addressed all flagged items. 
                  The reviewer will see this is a resubmission and check their previous comments.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setResubmitClaim(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    setLoading(true);
                    try {
                      // Save current expense state to claim first (in case user made edits)
                      await saveToServer(expenses, annotatedStatements, statementAnnotations, originalStatementImages);
                      
                      // Update status back to pending_review
                      const workflow = getApprovalWorkflow(currentUser.id, currentUser.office);
                      const isSelfSubmit = workflow?.selfSubmit === true;
                      const statusUpdate = { 
                        status: isSelfSubmit ? 'approved' : 'pending_review', 
                        approval_level: isSelfSubmit ? 2 : 1,
                      };
                      if (isSelfSubmit) {
                        statusUpdate.level2_approved_by = workflow?.externalApproval || 'Self-Approved';
                        statusUpdate.level2_approved_at = new Date().toISOString();
                      }
                      
                      const { error } = await supabase.from('claims')
                        .update(statusUpdate)
                        .eq('id', resubmitClaim.id);
                      
                      if (error) throw error;
                      
                      // Clean up and switch back
                      setEditingReturnedClaimId(null);
                      setActiveClaimTab('current');
                      setResubmitClaim(null);
                      await loadClaims();
                      await loadFromServer();
                      alert('✅ Claim resubmitted successfully!');
                    } catch (err) {
                      console.error('Resubmit error:', err);
                      alert('❌ Failed to resubmit. Please try again.');
                    }
                    setLoading(false);
                  }}
                  disabled={loading}
                  className="flex-[2] py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50"
                >
                  {loading ? '⏳ Submitting...' : '✅ Confirm Resubmit'}
                </button>
              </div>
            </div>
          </div>
        )}
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
    const [includeDrafts, setIncludeDrafts] = useState(false); // Include unsaved drafts for forecasting
    const [allDrafts, setAllDrafts] = useState([]); // Drafts from all users
    const [loadingDrafts, setLoadingDrafts] = useState(false);
    
    // Fetch all user drafts when toggle is enabled
    useEffect(() => {
      if (!includeDrafts) { setAllDrafts([]); return; }
      const fetchDrafts = async () => {
        setLoadingDrafts(true);
        try {
          const { data, error } = await supabase.from('user_drafts').select('*');
          if (!error && data) {
            const draftClaims = data.filter(d => d.expenses).map(d => {
              const emp = EMPLOYEES.find(e => e.id === d.user_id);
              if (!emp) return null;
              try {
                const expenses = JSON.parse(d.expenses);
                if (!Array.isArray(expenses) || expenses.length === 0) return null;
                const total = expenses.reduce((sum, e) => sum + parseFloat(e.reimbursementAmount || e.amount || 0), 0);
                return {
                  id: 'draft_' + d.user_id,
                  claim_number: (emp.claimName || emp.name) + ' (Draft)',
                  user_id: d.user_id,
                  user_name: emp.name,
                  office: OFFICES.find(o => o.code === emp.office)?.name,
                  office_code: emp.office,
                  currency: emp.reimburseCurrency,
                  total_amount: total,
                  item_count: expenses.length,
                  status: 'draft',
                  expenses: expenses,
                  submitted_at: d.updated_at
                };
              } catch { return null; }
            }).filter(Boolean);
            setAllDrafts(draftClaims);
          }
        } catch (err) { console.error('Failed to fetch drafts:', err); }
        setLoadingDrafts(false);
      };
      fetchDrafts();
    }, [includeDrafts]);
    const [expandedGL, setExpandedGL] = useState(null);
    const [expandedEmployee, setExpandedEmployee] = useState(null);
    const [expandedLate, setExpandedLate] = useState(null);
    const [migrating, setMigrating] = useState(false);
    const [migrationLog, setMigrationLog] = useState([]);
    
    // Find claims with large base64 data (likely need migration)
    const claimsNeedingMigration = claims.filter(c => {
      if (!c || !c.expenses) return false;
      const expStr = JSON.stringify(c.expenses);
      // If expenses data > 100KB, it likely has base64 images
      return expStr.length > 100000;
    });
    
    // Calculate total base64 data size
    const totalBase64Size = claimsNeedingMigration.reduce((sum, c) => {
      return sum + JSON.stringify(c.expenses || []).length;
    }, 0);
    
    // Migration function
    const migrateClaimToStorage = async (claim) => {
      try {
        const expenses = claim.expenses || [];
        let migratedCount = 0;
        
        const migratedExpenses = await Promise.all(expenses.map(async (exp) => {
          let updated = { ...exp };
          
          // Migrate receiptPreview if base64
          if (exp.receiptPreview && !isStorageUrl(exp.receiptPreview)) {
            const url = await uploadImageToStorage(exp.receiptPreview, claim.user_id, 'receipt');
            if (isStorageUrl(url)) {
              updated.receiptPreview = url;
              migratedCount++;
            }
          }
          
          // Migrate receiptPreview2 if base64
          if (exp.receiptPreview2 && !isStorageUrl(exp.receiptPreview2)) {
            const url = await uploadImageToStorage(exp.receiptPreview2, claim.user_id, 'receipt2');
            if (isStorageUrl(url)) {
              updated.receiptPreview2 = url;
              migratedCount++;
            }
          }
          
          return updated;
        }));
        
        // Update claim in database
        const { error } = await supabase.from('claims')
          .update({ expenses: migratedExpenses })
          .eq('id', claim.id);
        
        if (error) throw error;
        
        return { success: true, migratedCount };
      } catch (err) {
        return { success: false, error: err.message };
      }
    };
    
    const runMigration = async () => {
      setMigrating(true);
      setMigrationLog([]);
      
      for (const claim of claimsNeedingMigration) {
        setMigrationLog(prev => [...prev, `⏳ Migrating ${claim.claim_number}...`]);
        
        const result = await migrateClaimToStorage(claim);
        
        if (result.success) {
          setMigrationLog(prev => [...prev, `✅ ${claim.claim_number}: ${result.migratedCount} images migrated`]);
        } else {
          setMigrationLog(prev => [...prev, `❌ ${claim.claim_number}: ${result.error}`]);
        }
      }
      
      setMigrationLog(prev => [...prev, `🎉 Migration complete! Refreshing data...`]);
      await loadClaims();
      setMigrating(false);
    };
    
    // Safety check - ensure claims is an array
    const allClaims = Array.isArray(claims) ? claims : [];
    
    // Combine submitted claims with drafts when enabled
    const claimsPool = includeDrafts ? [...allClaims, ...allDrafts] : allClaims;
    
    // Get relevant claims based on filters
    const relevantClaims = claimsPool.filter(c => {
      if (!c) return false;
      
      // Office scope: CSC China only sees China offices
      if (currentUser.reportOffices && !currentUser.reportOffices.includes(c.office_code)) return false;
      
      const isApproved = c.status === 'approved' || c.status === 'paid' || c.status === 'submitted_to_finance';
      const isDraft = c.status === 'draft';
      // Include ALL non-rejected statuses when includePending is checked
      const isPendingOrInProgress = c.status === 'pending_review' || 
                                     c.status === 'pending_level2' || 
                                     c.status === 'changes_requested';
      
      if (!includePending && !includeDrafts && !isApproved) return false;
      if (isDraft && !includeDrafts) return false;
      if (!isApproved && !isDraft && !isPendingOrInProgress) return false;
      if (!includePending && isPendingOrInProgress) return false;
      
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
      if (currentUser.reportOffices && !currentUser.reportOffices.includes(claim.office_code)) return;
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
          lateCount: 0,
          lateItems: [], // Detailed late items for dropdown
          claimsList: [] // All claims for dropdown
        };
      }
      employeeData[empId].totalClaims++;
      employeeData[empId].claimsList.push({ 
        claimNumber: claim.claim_number, 
        submittedAt: claim.submitted_at, 
        status: claim.status,
        itemCount: (claim.expenses || []).length,
        total: claim.total_amount,
        currency: claim.currency
      });
      
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
            if (monthsDiff > 2) {
              employeeData[empId].lateCount++;
              employeeData[empId].lateItems.push({
                claimNumber: claim.claim_number,
                ref: exp.ref,
                merchant: exp.merchant,
                date: exp.date,
                description: exp.description,
                amount: parseFloat(exp.reimbursementAmount || exp.amount) || 0,
                currency: claim.currency,
                adminNotes: exp.adminNotes,
                monthsLate: Math.floor(monthsDiff)
              });
            }
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
      // Format status for CSV
      const fmtStatus = (s) => s === 'approved' ? 'Approved' : s === 'paid' ? 'Paid' : s === 'submitted_to_finance' ? 'Submitted for Payment' : s === 'pending_review' ? 'Pending L1' : s === 'pending_level2' ? 'Pending L2' : s === 'changes_requested' ? 'Returned' : s === 'draft' ? 'Draft' : s;
      
      let csvContent = '';
      let filename = '';
      
      if (reportType === 'backcharge') {
        filename = `backcharge_report_${dateFrom}_to_${dateTo}.csv`;
        csvContent = 'Development,Claimant,Office,Date,Merchant,Category,Percentage,Amount (Local),Amount (GBP),Status\n';
        Object.entries(backchargeData).forEach(([dev, data]) => {
          data.items.forEach(item => {
            csvContent += `"${dev}","${item.claimant}","${item.office}","${item.date}","${item.merchant}","${item.category || ''}","${item.percentage}%","${item.currency} ${item.amount.toFixed(2)}","${item.gbpAmount.toFixed(2)}","${fmtStatus(item.status)}"\n`;
          });
        });
      } else if (reportType === 'gl') {
        filename = `gl_report_${dateFrom}_to_${dateTo}.csv`;
        csvContent = 'GL Code,Category,Claim Number,Office,Claimant,Date,Merchant,Amount (Local),Amount (GBP),Status,Description\n';
        Object.entries(glData).forEach(([gl, data]) => {
          data.items.forEach(item => {
            csvContent += `"${gl}","${data.name}","${item.claimNumber || ''}","${item.office}","${item.claimant}","${item.date}","${item.merchant}","${item.currency} ${item.amount.toFixed(2)}","${item.gbpAmount.toFixed(2)}","${fmtStatus(item.status)}","${(item.description || '').replace(/"/g, '""')}"\n`;
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
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
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
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includePending} onChange={e => setIncludePending(e.target.checked)} className="rounded" />
              <span>Include pending claims</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeDrafts} onChange={e => setIncludeDrafts(e.target.checked)} className="rounded" />
              <span>Include unsaved drafts {loadingDrafts && '⏳'}{!loadingDrafts && includeDrafts && allDrafts.length > 0 && `(${allDrafts.length})`}</span>
            </label>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(currentUser.reportOffices ? ['gl', 'submissions'] : ['gl', 'backcharge', 'submissions', 'late', 'migrate']).map(type => (
              <button 
                key={type}
                onClick={() => setReportType(type)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold ${reportType === type ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} ${type === 'migrate' && claimsNeedingMigration.length > 0 ? 'ring-2 ring-red-400' : ''}`}
              >
                {type === 'backcharge' ? '📊 Backcharges' : type === 'gl' ? '📋 GL Report' : type === 'submissions' ? '📅 Submissions' : type === 'late' ? '⚠️ Late Submitters' : `🔧 Migrate${claimsNeedingMigration.length > 0 ? ` (${claimsNeedingMigration.length})` : ''}`}
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
                          <span className={item.status === 'approved' ? 'text-green-600' : item.status === 'pending_level2' ? 'text-blue-600' : 'text-amber-600'}>
                            £{item.gbpAmount.toFixed(2)} {item.status === 'pending_review' ? '(L1)' : item.status === 'pending_level2' ? '(L2)' : item.status === 'changes_requested' ? '(returned)' : item.status === 'draft' ? '(draft)' : ''}
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
                  <div key={empId}>
                    <div 
                      className="p-3 flex justify-between items-center cursor-pointer hover:bg-green-50"
                      onClick={() => setExpandedEmployee(expandedEmployee === empId ? null : empId)}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs transition-transform ${expandedEmployee === empId ? 'rotate-90' : ''}`}>▶</span>
                        <span className="font-semibold">{data.name}</span>
                        <span className="text-xs text-slate-400">{data.office}</span>
                      </div>
                      <div className="text-right text-xs">
                        <div className="text-slate-600">
                          In range: <strong className="text-blue-600">{data.claimsInRange}</strong> / {data.totalClaims} total
                        </div>
                        <div className="text-slate-400">Latest: {formatDateShort(data.lastSubmission)}</div>
                      </div>
                    </div>
                    {expandedEmployee === empId && (
                      <div className="bg-green-50 px-6 pb-3">
                        {data.claimsList.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || '')).map((cl, ci) => (
                          <div key={ci} className="flex justify-between items-center py-1.5 border-b border-green-200 last:border-0 text-sm">
                            <div>
                              <span className="font-medium">{cl.claimNumber}</span>
                              <span className="text-xs text-slate-500 ml-2">{cl.itemCount} items</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className={`px-2 py-0.5 rounded-full font-semibold ${
                                cl.status === 'approved' ? 'bg-green-100 text-green-700' : 
                                cl.status === 'paid' ? 'bg-green-200 text-green-800' : 
                                cl.status === 'submitted_to_finance' ? 'bg-purple-100 text-purple-700' : 
                                cl.status === 'pending_review' ? 'bg-amber-100 text-amber-700' : 
                                cl.status === 'pending_level2' ? 'bg-blue-100 text-blue-700' : 
                                cl.status === 'changes_requested' ? 'bg-red-100 text-red-700' :
                                cl.status === 'draft' ? 'bg-slate-100 text-slate-600' :
                                'bg-slate-100 text-slate-600'
                              }`}>{
                                cl.status === 'approved' ? '✅ Approved' : 
                                cl.status === 'paid' ? '💰 Paid' : 
                                cl.status === 'submitted_to_finance' ? '📤 Submitted' : 
                                cl.status === 'pending_review' ? '⏳ Pending L1' : 
                                cl.status === 'pending_level2' ? '⏳ Pending L2' : 
                                cl.status === 'changes_requested' ? '🔄 Returned' :
                                cl.status === 'draft' ? '📝 Draft' :
                                cl.status
                              }</span>
                              <span className="text-slate-400">{formatDateShort(cl.submittedAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                  <div key={empId}>
                    <div 
                      className="p-3 flex justify-between items-center cursor-pointer hover:bg-red-50"
                      onClick={() => setExpandedLate(expandedLate === empId ? null : empId)}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs transition-transform ${expandedLate === empId ? 'rotate-90' : ''}`}>▶</span>
                        <span className="font-semibold">{data.name}</span>
                        <span className="text-xs text-slate-400">{data.office}</span>
                      </div>
                      <div className="text-right">
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">
                          {data.lateCount} late receipt{data.lateCount !== 1 ? 's' : ''}
                        </span>
                        <div className="text-xs text-slate-400 mt-1">{data.totalClaims} total claims</div>
                      </div>
                    </div>
                    {expandedLate === empId && (
                      <div className="bg-red-50 px-6 pb-3">
                        {data.lateItems.map((item, i) => {
                          const cleanNotes = item.adminNotes ? item.adminNotes.replace(/ \[R\]:/g, ':').replace(/ \[RETURN\]:/g, ':') : '';
                          return (
                            <div key={i} className="py-2 border-b border-red-200 last:border-0 text-sm">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="bg-red-200 text-red-800 text-xs px-1.5 py-0.5 rounded font-bold">{item.ref}</span>
                                    <span className="font-medium">{item.merchant}</span>
                                    <span className="text-xs text-slate-400">{formatShortDate(item.date)}</span>
                                    <span className="bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded">{item.monthsLate}mo late</span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">{item.claimNumber}</p>
                                  {item.description && <p className="text-xs text-slate-600 mt-0.5">{item.description}</p>}
                                  {cleanNotes && <p className="text-xs text-amber-700 mt-0.5 bg-amber-50 px-2 py-0.5 rounded">📋 {cleanNotes.split('\n').join(' | ')}</p>}
                                </div>
                                <span className="font-bold text-red-700 text-sm ml-2 whitespace-nowrap">{item.currency} {item.amount.toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Migration Panel */}
        {reportType === 'migrate' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="bg-orange-50 p-4 border-b">
              <h3 className="font-bold text-orange-800">🔧 Data Migration Tool</h3>
              <p className="text-xs text-orange-600">Migrate base64 images to Storage to reduce database egress</p>
            </div>
            <div className="p-4 space-y-4">
              {claimsNeedingMigration.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-green-700 font-semibold">All claims are optimized!</p>
                  <p className="text-sm text-slate-500">No base64 images found in database</p>
                </div>
              ) : (
                <>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-red-800">{claimsNeedingMigration.length} claims need migration</p>
                        <p className="text-sm text-red-600">~{(totalBase64Size / 1024 / 1024).toFixed(1)} MB of base64 data in database</p>
                      </div>
                      <button
                        onClick={runMigration}
                        disabled={migrating}
                        className="bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                      >
                        {migrating ? '⏳ Migrating...' : '🚀 Start Migration'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-600">Claims to migrate:</p>
                    {claimsNeedingMigration.map(claim => (
                      <div key={claim.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                        <div>
                          <span className="font-medium">{claim.claim_number}</span>
                          <span className="text-xs text-slate-400 ml-2">{claim.user_name}</span>
                        </div>
                        <span className="text-xs text-red-600 font-mono">
                          {(JSON.stringify(claim.expenses).length / 1024 / 1024).toFixed(1)} MB
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              
              {migrationLog.length > 0 && (
                <div className="bg-slate-900 text-green-400 rounded-lg p-4 font-mono text-xs max-h-48 overflow-y-auto">
                  {migrationLog.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              )}
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="font-semibold text-blue-800">What this does:</p>
                <ul className="text-blue-700 text-xs mt-1 space-y-1">
                  <li>• Extracts base64 images from old claims</li>
                  <li>• Compresses and uploads them to Storage bucket</li>
                  <li>• Replaces base64 with URLs in database</li>
                  <li>• Reduces database size and egress bandwidth</li>
                </ul>
              </div>
            </div>
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

  // ============ FINANCE REVIEW TAB ============
  const FinanceReviewTab = () => {
    const [expandedSection, setExpandedSection] = useState('submitted'); // drafts, review, submitted, paid
    const [expandedOffice, setExpandedOffice] = useState(null);
    const [showDupModal, setShowDupModal] = useState(null);
    const [dupTargets, setDupTargets] = useState([]);
    const [dupBusy, setDupBusy] = useState(false);
    
    const handleDuplicate = async () => {
      if (!showDupModal || dupTargets.length === 0) return;
      setDupBusy(true);
      let ok = 0;
      for (const tid of dupTargets) {
        try {
          const emp = EMPLOYEES.find(e => e.id === tid);
          if (!emp) continue;
          const year = getFinancialYear();
          const cn = emp.claimName || emp.name.trim().split(' ').pop();
          const existing = claims.filter(c => c.user_id === tid && c.claim_number?.includes(`${cn} - ${year} -`));
          const num = `${cn} - ${year} - ${String(existing.length + 1).padStart(2, '0')}`;
          const wf = getApprovalWorkflow(tid, emp.office);
          const exps = (showDupModal.expenses || []).map((e, i) => ({ ...e, id: Date.now() + i, adminNotes: null, isPotentialDuplicate: false, duplicateMatchLabel: null, duplicateMatchRef: null, ref: String(i + 1) }));
          const total = exps.reduce((s, e) => s + parseFloat(e.reimbursementAmount || e.amount || 0), 0);
          const ins = { claim_number: num, user_id: tid, user_name: emp.name, office: OFFICES.find(o => o.code === emp.office)?.name, office_code: emp.office, currency: showDupModal.currency, total_amount: total, item_count: exps.length, status: 'pending_review', approval_level: 1, level1_approver: wf?.level1, level2_approver: wf?.level2, expenses: exps, submitted_at: new Date().toISOString() };
          let r = await supabase.from('claims').insert([ins]);
          if (!r.error) ok++;
        } catch (err) { console.error(err); }
      }
      await loadClaims();
      setDupBusy(false); setShowDupModal(null); setDupTargets([]);
      alert(`✅ Duplicated to ${ok}/${dupTargets.length} employee(s)`);
    };
    
    // Fetch all user drafts
    const [draftUsers, setDraftUsers] = useState([]);
    const [loadingDrafts, setLoadingDrafts] = useState(true);
    useEffect(() => {
      const fetchDrafts = async () => {
        setLoadingDrafts(true);
        try {
          const { data, error } = await supabase.from('user_drafts').select('*');
          if (!error && data) {
            const parsed = data.filter(d => d.expenses).map(d => {
              const emp = EMPLOYEES.find(e => e.id === d.user_id);
              if (!emp) return null;
              try {
                const expenses = JSON.parse(d.expenses);
                if (!Array.isArray(expenses) || expenses.length === 0) return null;
                const total = expenses.reduce((sum, e) => sum + parseFloat(e.reimbursementAmount || e.amount || 0), 0);
                return { user_id: d.user_id, name: emp.name, office_code: emp.office, office: OFFICES.find(o => o.code === emp.office)?.name, currency: emp.reimburseCurrency, count: expenses.length, total, updatedAt: d.updated_at };
              } catch { return null; }
            }).filter(Boolean);
            // Apply office scope for CSC China
            const scoped = currentUser.reportOffices ? parsed.filter(d => currentUser.reportOffices.includes(d.office_code)) : parsed;
            setDraftUsers(scoped);
          }
        } catch (err) { console.error(err); }
        setLoadingDrafts(false);
      };
      fetchDrafts();
    }, []);
    
    const officeFilter = (c) => !currentUser.reportOffices || currentUser.reportOffices.includes(c.office_code);
    const pendingClaims = claims.filter(c => (c.status === 'pending_review' || c.status === 'pending_level2' || c.status === 'changes_requested') && officeFilter(c));
    const submittedClaims = claims.filter(c => (c.status === 'submitted_to_finance' || c.status === 'approved') && officeFilter(c));
    const paidClaims = claims.filter(c => c.status === 'paid' && officeFilter(c));
    
    // Group by office
    const groupByOffice = (claimList) => {
      const grouped = {};
      claimList.forEach(c => {
        const office = c.office_code || 'Unknown';
        if (!grouped[office]) grouped[office] = [];
        grouped[office].push(c);
      });
      return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
    };
    
    const renderClaimRow = (claim, showDup = true) => (
      <div key={claim.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-sm">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{claim.user_name}</span>
            <span className="text-xs text-slate-400">{claim.claim_number}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              claim.status === 'pending_review' ? 'bg-amber-100 text-amber-700' :
              claim.status === 'pending_level2' ? 'bg-blue-100 text-blue-700' :
              claim.status === 'changes_requested' ? 'bg-red-100 text-red-700' :
              claim.status === 'approved' ? 'bg-green-100 text-green-700' :
              claim.status === 'submitted_to_finance' ? 'bg-purple-100 text-purple-700' :
              claim.status === 'paid' ? 'bg-green-200 text-green-800' :
              'bg-slate-100 text-slate-600'
            }`}>{
              claim.status === 'pending_review' ? 'L1' :
              claim.status === 'pending_level2' ? 'L2' :
              claim.status === 'changes_requested' ? 'Returned' :
              claim.status === 'approved' ? 'Approved' :
              claim.status === 'submitted_to_finance' ? 'Submitted' :
              claim.status === 'paid' ? 'Paid' : claim.status
            }</span>
          </div>
          <p className="text-xs text-slate-400">{(claim.expenses || []).length} items • {formatShortDate(claim.submitted_at)}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="font-bold text-sm">{formatCurrency(claim.total_amount, claim.currency)}</span>
          <button onClick={() => handleDownloadPDF(claim)} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">📥</button>
          {!currentUser.reportOffices && claim.status === 'submitted_to_finance' && <button onClick={() => setEditingClaim(claim)} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">✏️</button>}
          {!currentUser.reportOffices && claim.status === 'submitted_to_finance' && <button onClick={() => handleMarkPaid(claim.id)} disabled={loading} className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold disabled:opacity-50">✓</button>}
          {!currentUser.reportOffices && currentUser.id === 9001 && showDup && <button onClick={() => { setShowDupModal(claim); setDupTargets([]); }} className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">📋</button>}
        </div>
      </div>
    );
    
    const renderSection = (title, icon, color, claimList, key) => {
      const isOpen = expandedSection === key;
      const grouped = groupByOffice(claimList);
      return (
        <div className={`bg-white rounded-2xl shadow-sm border-2 ${isOpen ? `border-${color}-300` : 'border-slate-200'}`}>
          <button onClick={() => setExpandedSection(isOpen ? null : key)} className="w-full p-4 flex justify-between items-center text-left">
            <div className="flex items-center gap-2">
              <span className={`text-sm transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
              <span className="text-lg">{icon}</span>
              <span className="font-bold">{title}</span>
              <span className={`bg-${color}-100 text-${color}-700 text-xs px-2 py-0.5 rounded-full font-bold`}>{claimList.length}</span>
            </div>
            <span className="font-bold text-slate-500 text-sm">
              {formatCurrency(claimList.reduce((s, c) => s + parseFloat(c.total_amount || 0), 0), 'GBP')}
            </span>
          </button>
          {isOpen && (
            <div className="px-4 pb-4">
              {grouped.length === 0 ? (
                <p className="text-center text-slate-400 py-4 text-sm">None</p>
              ) : grouped.map(([office, officeClaims]) => {
                const officeName = OFFICES.find(o => o.code === office)?.name || office;
                const officeKey = `${key}_${office}`;
                return (
                  <div key={office} className="mb-2">
                    <button onClick={() => setExpandedOffice(expandedOffice === officeKey ? null : officeKey)} className="w-full flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs transition-transform ${expandedOffice === officeKey ? 'rotate-90' : ''}`}>▶</span>
                        <span>{officeName}</span>
                        <span className="text-xs font-normal text-slate-400">({officeClaims.length})</span>
                      </div>
                      <span className="text-xs">{formatCurrency(officeClaims.reduce((s, c) => s + parseFloat(c.total_amount || 0), 0), officeClaims[0]?.currency || 'SGD')}</span>
                    </button>
                    {expandedOffice === officeKey && (
                      <div className="mt-1 ml-4 space-y-1">
                        {officeClaims.sort((a, b) => (b.submitted_at || '').localeCompare(a.submitted_at || '')).map(claim => renderClaimRow(claim))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    };
    
    return (
      <div className="space-y-3">
        {/* Pending Drafts - users with unsaved expenses */}
        <div className={`bg-white rounded-2xl shadow-sm border-2 ${expandedSection === 'drafts' ? 'border-slate-300' : 'border-slate-200'}`}>
          <button onClick={() => setExpandedSection(expandedSection === 'drafts' ? null : 'drafts')} className="w-full p-4 flex justify-between items-center text-left">
            <div className="flex items-center gap-2">
              <span className={`text-sm transition-transform ${expandedSection === 'drafts' ? 'rotate-90' : ''}`}>▶</span>
              <span className="text-lg">📝</span>
              <span className="font-bold">Pending Drafts</span>
              <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">{loadingDrafts ? '...' : draftUsers.length}</span>
            </div>
            <span className="text-xs text-slate-400">Saved but not submitted</span>
          </button>
          {expandedSection === 'drafts' && (
            <div className="px-4 pb-4">
              {loadingDrafts ? <p className="text-center text-slate-400 py-4 text-sm">Loading...</p> : draftUsers.length === 0 ? <p className="text-center text-slate-400 py-4 text-sm">No pending drafts</p> : (
                (() => {
                  const grouped = {};
                  draftUsers.forEach(d => { if (!grouped[d.office_code]) grouped[d.office_code] = []; grouped[d.office_code].push(d); });
                  return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0])).map(([office, users]) => {
                    const officeName = OFFICES.find(o => o.code === office)?.name || office;
                    const officeKey = `drafts_${office}`;
                    return (
                      <div key={office} className="mb-2">
                        <button onClick={() => setExpandedOffice(expandedOffice === officeKey ? null : officeKey)} className="w-full flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs transition-transform ${expandedOffice === officeKey ? 'rotate-90' : ''}`}>▶</span>
                            <span>{officeName}</span>
                            <span className="text-xs font-normal text-slate-400">({users.length})</span>
                          </div>
                        </button>
                        {expandedOffice === officeKey && (
                          <div className="mt-1 ml-4 space-y-1">
                            {users.sort((a, b) => a.name.localeCompare(b.name)).map(u => (
                              <div key={u.user_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-sm">
                                <div>
                                  <span className="font-semibold">{u.name}</span>
                                  <span className="text-xs text-slate-400 ml-2">{u.count} item{u.count !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-sm">{formatCurrency(u.total, u.currency)}</span>
                                  <p className="text-xs text-slate-400">{formatShortDate(u.updatedAt)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()
              )}
            </div>
          )}
        </div>
        
        {renderSection('Under Review', '⏳', 'amber', pendingClaims, 'review')}
        {renderSection('Submitted for Payment', '📤', 'purple', submittedClaims, 'submitted')}
        {renderSection('Paid Claims', '💰', 'green', paidClaims, 'paid')}
        
        {/* Duplicate Modal */}
        {showDupModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setShowDupModal(null)}>
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="bg-purple-600 text-white p-4">
                <h3 className="font-bold">📋 Duplicate Claim</h3>
                <p className="text-purple-200 text-sm">{showDupModal.claim_number} • {showDupModal.user_name}</p>
              </div>
              <div className="p-4 overflow-y-auto max-h-[50vh]">
                <p className="text-sm text-slate-600 mb-3">Select employees to copy this claim to:</p>
                <div className="space-y-1">
                  {OFFICES.filter(o => !o.isAdmin).map(office => {
                    const emps = EMPLOYEES.filter(e => e.office === office.code && e.role !== 'group_finance');
                    if (!emps.length) return null;
                    return (
                      <div key={office.code}>
                        <p className="text-xs font-bold text-slate-400 mt-2 mb-1">{office.name}</p>
                        {emps.sort((a,b) => a.name.localeCompare(b.name)).map(emp => (
                          <label key={emp.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-purple-50 cursor-pointer text-sm">
                            <input type="checkbox" checked={dupTargets.includes(emp.id)} onChange={e => {
                              if (e.target.checked) setDupTargets(prev => [...prev, emp.id]);
                              else setDupTargets(prev => prev.filter(id => id !== emp.id));
                            }} className="rounded" />
                            <span>{emp.name}</span>
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="p-4 border-t flex gap-3">
                <button onClick={() => setShowDupModal(null)} className="flex-1 py-2 rounded-lg border-2 font-semibold text-sm">Cancel</button>
                <button onClick={handleDuplicate} disabled={dupTargets.length === 0 || dupBusy} className={`flex-[2] py-2 rounded-lg font-semibold text-sm ${dupTargets.length > 0 && !dupBusy ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                  {dupBusy ? '⏳...' : `Duplicate to ${dupTargets.length}`}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {editingClaim && <ReviewModal claim={editingClaim} onClose={() => { setEditingClaim(null); loadClaims(); }} />}
      </div>
    );
  };
  
  const ReviewClaimsTab = () => {
    const reviewableClaims = getReviewableClaims();
    const claimsForSubmission = getClaimsForSubmission();
    const [showDupModal, setShowDupModal] = useState(null); // claim to duplicate
    const [dupTargets, setDupTargets] = useState([]); // selected employee IDs
    const [dupBusy, setDupBusy] = useState(false);
    
    const handleDuplicate = async () => {
      if (!showDupModal || dupTargets.length === 0) return;
      setDupBusy(true);
      let ok = 0;
      for (const tid of dupTargets) {
        try {
          const emp = EMPLOYEES.find(e => e.id === tid);
          if (!emp) continue;
          const year = getFinancialYear();
          const cn = emp.claimName || emp.name.trim().split(' ').pop();
          const existing = claims.filter(c => c.user_id === tid && c.claim_number?.includes(`${cn} - ${year} -`));
          const num = `${cn} - ${year} - ${String(existing.length + 1).padStart(2, '0')}`;
          const wf = getApprovalWorkflow(tid, emp.office);
          const exps = (showDupModal.expenses || []).map((e, i) => ({
            ...e, id: Date.now() + i, adminNotes: null, isPotentialDuplicate: false,
            duplicateMatchLabel: null, duplicateMatchRef: null, ref: String(i + 1)
          }));
          const total = exps.reduce((s, e) => s + parseFloat(e.reimbursementAmount || e.amount || 0), 0);
          const ins = {
            claim_number: num, user_id: tid, user_name: emp.name,
            office: OFFICES.find(o => o.code === emp.office)?.name, office_code: emp.office,
            currency: showDupModal.currency, total_amount: total, item_count: exps.length,
            status: 'pending_review', approval_level: 1,
            level1_approver: wf?.level1, level2_approver: wf?.level2,
            expenses: exps, submitted_at: new Date().toISOString(),
            annotated_statements: showDupModal.annotated_statements,
            annotated_statement: showDupModal.annotated_statement,
            original_statements: showDupModal.original_statements,
            statement_annotations: showDupModal.statement_annotations
          };
          let r = await supabase.from('claims').insert([ins]);
          if (r.error) { delete ins.statement_annotations; delete ins.original_statements; delete ins.annotated_statements; delete ins.annotated_statement; r = await supabase.from('claims').insert([ins]); }
          if (!r.error) ok++;
        } catch (err) { console.error(err); }
      }
      await loadClaims();
      setDupBusy(false); setShowDupModal(null); setDupTargets([]);
      alert(`✅ Duplicated to ${ok}/${dupTargets.length} employee(s)`);
    };
    
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
          {/* Country Head Dashboard */}
          {currentUser.dashboardOffices && (() => {
            const offices = currentUser.dashboardOffices;
            const fy = getFinancialYear();
            const fyStart = new Date(fy, 4, 1); // May 1
            const now = new Date();
            const months = [];
            let d = new Date(fyStart);
            while (d <= now) { months.push(new Date(d)); d.setMonth(d.getMonth() + 1); }
            const monthNames = months.map(m => m.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }));
            
            // Get approved claims for these offices
            const dashClaims = claims.filter(c => offices.includes(c.office_code) && 
              (c.status === 'approved' || c.status === 'paid' || c.status === 'submitted_to_finance' || c.status === 'pending_review' || c.status === 'pending_level2'));
            
            // Build GL × month matrix
            const glMonthly = {};
            dashClaims.forEach(c => {
              (c.expenses || []).forEach(exp => {
                const cat = EXPENSE_CATEGORIES[exp.category];
                if (!cat) return;
                const gl = cat.gl;
                const group = cat.group;
                const amt = parseFloat(exp.reimbursementAmount || exp.amount || 0);
                const gbp = toGBP(amt, c.currency || 'GBP');
                const expDate = new Date(exp.date);
                const monthIdx = months.findIndex(m => m.getMonth() === expDate.getMonth() && m.getFullYear() === expDate.getFullYear());
                if (monthIdx < 0) return;
                
                if (!glMonthly[group]) glMonthly[group] = { name: group, months: new Array(months.length).fill(0) };
                glMonthly[group].months[monthIdx] += gbp;
              });
            });
            
            const groupNames = { 'TRAVEL': 'Travel', 'SUBSISTENCE': 'Subsistence & Welfare', 'ENTERTAINING': 'Business Entertaining', 'OFFICE': 'Office Costs', 'MARKETING': 'Marketing & Events', 'LEGAL': 'Legal & Professional' };
            
            return (
              <div className="bg-white rounded-2xl shadow-lg p-4 border-2 border-blue-300">
                <h3 className="font-bold text-blue-700 mb-2">📊 Office Dashboard — {offices.map(o => OFFICES.find(of => of.code === o)?.name).join(', ')}</h3>
                <p className="text-xs text-slate-500 mb-3">FY{fy} • GBP equivalent • Includes pending claims</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="text-left p-2 border">Category</th>
                        {monthNames.map((m, i) => <th key={i} className="text-right p-2 border min-w-[70px]">{m}</th>)}
                        <th className="text-right p-2 border font-bold bg-blue-100">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(glMonthly).sort((a, b) => a[0].localeCompare(b[0])).map(([group, data]) => {
                        const rowTotal = data.months.reduce((s, v) => s + v, 0);
                        return (
                          <tr key={group} className="hover:bg-slate-50">
                            <td className="p-2 border font-semibold text-slate-700">{groupNames[group] || group}</td>
                            {data.months.map((val, i) => <td key={i} className="text-right p-2 border text-slate-600">{val > 0 ? `£${val.toFixed(0)}` : ''}</td>)}
                            <td className="text-right p-2 border font-bold text-blue-700">£{rowTotal.toFixed(0)}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-blue-100 font-bold">
                        <td className="p-2 border">TOTAL</td>
                        {months.map((_, i) => {
                          const colTotal = Object.values(glMonthly).reduce((s, d) => s + d.months[i], 0);
                          return <td key={i} className="text-right p-2 border">£{colTotal.toFixed(0)}</td>;
                        })}
                        <td className="text-right p-2 border text-blue-800">£{Object.values(glMonthly).reduce((s, d) => s + d.months.reduce((a, b) => a + b, 0), 0).toFixed(0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
          
          <h3 className="font-bold mb-4">📊 To Review ({reviewableClaims.length})</h3>
          {reviewableClaims.length === 0 ? <div className="text-center py-12 text-slate-400">✅ Nothing to review</div> : (<div className="space-y-2">{reviewableClaims.map(claim => {
            // Show "Resubmission" badge whenever claim has been returned, regardless of who's viewing
            const isResubmission = (claim.review_history && claim.review_history.length > 0) || !!claim.admin_comment;
            return (<div key={claim.id} onClick={() => setSelectedClaim(claim)} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer hover:border-blue-300 ${isResubmission ? 'bg-amber-50 border-amber-200' : 'bg-slate-50'}`}><div><div className="flex items-center gap-2 flex-wrap"><span className="font-semibold">{claim.user_name}</span><span className={`text-xs px-2 py-0.5 rounded-full ${claim.approval_level === 2 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>L{claim.approval_level || 1}</span>{isResubmission && <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">🔄 Resubmission</span>}</div><p className="text-sm text-slate-500">{claim.claim_number} • {claim.office}</p></div><span className="font-bold">{formatCurrency(claim.total_amount, claim.currency)}</span></div>);
          })}</div>)}
        </div>
        {selectedClaim && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setSelectedClaim(null)}><div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}><div className="p-6 border-b flex justify-between"><div><div className="flex items-center gap-2"><h2 className="text-xl font-bold">{selectedClaim.user_name}</h2>{((selectedClaim.review_history && selectedClaim.review_history.length > 0) || selectedClaim.admin_comment) && <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-semibold">🔄 Resubmission</span>}</div><p className="text-sm text-slate-500">{selectedClaim.claim_number} • Level {selectedClaim.approval_level || 1}</p></div><button onClick={() => setSelectedClaim(null)} className="text-2xl text-slate-400">×</button></div><div className="p-6"><button onClick={() => handleDownloadPDF(selectedClaim)} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold mb-4">📥 Download PDF</button>{enrichWithDuplicates([...(selectedClaim.expenses || [])].sort((a, b) => { const numA = parseInt(a.ref); const numB = parseInt(b.ref); if (!isNaN(numA) && !isNaN(numB)) return numA - numB; return (a.ref || '999').localeCompare(b.ref || '999', undefined, { numeric: true }); }), selectedClaim.id).map((exp, i) => { const isOld = isOlderThan2Months(exp.date); const isApproaching = isApproaching2Months(exp.date); const daysLeft = getDaysUntil2Months(exp.date); const paxCount = parseInt(exp.numberOfPax) || 0; const isEntertaining = EXPENSE_CATEGORIES[exp.category]?.requiresAttendees; const perPaxAmount = isEntertaining && paxCount > 0 ? (parseFloat(exp.reimbursementAmount || exp.amount) / paxCount) : 0; return (<div key={i} className={`py-3 border-b ${isOld ? 'bg-red-50' : isApproaching ? 'bg-amber-50' : ''}`}><div className="flex justify-between items-start"><div className="flex-1"><div className="flex items-center gap-2 flex-wrap"><span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-bold">{exp.ref}</span><span className="font-semibold">{exp.merchant}</span>{exp.isPotentialDuplicate && <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded">⚠️ Duplicate{exp.duplicateMatchLabel ? ' with ' + exp.duplicateMatchLabel : exp.duplicateMatchRef ? ' with item ' + exp.duplicateMatchRef : ''}?</span>}{isOld && <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded animate-pulse">🚨 &gt;2 Months</span>}{isApproaching && <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded">⏰ {daysLeft}d left</span>}{paxCount > 0 && <span className="bg-purple-100 text-purple-600 text-xs px-2 py-0.5 rounded">👥 {paxCount} pax</span>}{isEntertaining && paxCount > 0 && <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-0.5 rounded">💰 {selectedClaim.currency} {perPaxAmount.toFixed(2)}/pax</span>}</div><p className="text-xs text-slate-500 mt-1">{exp.description}</p>{exp.isForeignCurrency && exp.forexRate && <p className="text-xs text-amber-600 mt-1">💱 Rate: 1 {exp.currency} = {exp.forexRate.toFixed(4)} {selectedClaim.currency}</p>}{exp.adminNotes && <div className="text-xs mt-1 bg-amber-50 px-2 py-1 rounded"><span className="font-semibold">📋 Review:</span><div dangerouslySetInnerHTML={{ __html: formatAdminNotesReact(exp.adminNotes) }} /></div>}</div><span className="font-bold text-green-700 ml-2">{formatCurrency(exp.reimbursementAmount || exp.amount, selectedClaim.currency)}</span></div></div>); })}</div><div className="p-4 border-t bg-slate-50 space-y-3"><div className="flex gap-3"><button onClick={() => setEditingClaim(selectedClaim)} className="flex-[2] py-3 rounded-xl bg-blue-600 text-white font-semibold">📋 Review</button>{(selectedClaim.admin_comment || (selectedClaim.review_history && selectedClaim.review_history.length > 0)) && <button onClick={() => setShowPreviousReview(selectedClaim)} className="flex-1 py-3 rounded-xl bg-blue-100 text-blue-700 font-semibold border-2 border-blue-200">📋 History</button>}</div></div></div></div>)}
        {/* Previous Review Popup */}
        {/* Previous Review History Popup */}
        {showPreviousReview && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setShowPreviousReview(null)}><div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-auto p-6" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg">📋 Review History</h3><button onClick={() => setShowPreviousReview(null)} className="text-2xl text-slate-400">×</button></div>
        <p className="text-sm text-slate-500 mb-3">{showPreviousReview.claim_number}</p>
        <div className="space-y-3">
          {/* Show review_history if available */}
          {(showPreviousReview.review_history && showPreviousReview.review_history.length > 0) ? (
            showPreviousReview.review_history.map((entry, idx) => (
              <div key={idx} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-amber-800">Review #{idx + 1}</span>
                  <span className="text-xs text-slate-400">{new Date(entry.date).toLocaleDateString()}</span>
                </div>
                {(entry.flagged || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {entry.flagged.map(ref => (<span key={ref} className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">🚩 {ref}</span>))}
                  </div>
                )}
                <p className="text-amber-700 text-sm whitespace-pre-wrap">{entry.comment}</p>
                <p className="text-xs text-slate-500 mt-2">— {entry.reviewer}</p>
              </div>
            ))
          ) : (
            /* Fallback for old claims without review_history */
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              {(showPreviousReview.flagged_expenses || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {showPreviousReview.flagged_expenses.map(ref => (<span key={ref} className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">🚩 {ref}</span>))}
                </div>
              )}
              <p className="text-amber-700 text-sm whitespace-pre-wrap">{showPreviousReview.admin_comment}</p>
              <p className="text-xs text-slate-500 mt-2">— {showPreviousReview.reviewed_by}</p>
            </div>
          )}
        </div>
        <button onClick={() => setShowPreviousReview(null)} className="w-full mt-4 bg-slate-100 text-slate-700 py-2 rounded-lg font-semibold">Close</button></div></div>)}
        
        {/* Submitted for Payment - editable by admin */}
        {(currentUser.role === 'admin' || currentUser.role === 'group_finance') && (() => {
          const submittedClaims = claims.filter(c => 
            c.status === 'submitted_to_finance' && 
            (currentUser.role === 'group_finance' ? (!currentUser.reportOffices || currentUser.reportOffices.includes(c.office_code)) : c.office_code === currentUser.office)
          ).sort((a, b) => new Date(b.submitted_to_finance_at || b.submitted_at || 0) - new Date(a.submitted_to_finance_at || a.submitted_at || 0));
          
          return submittedClaims.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-6 mt-4 border-2 border-amber-300">
              <h3 className="font-bold mb-4 text-amber-700">📝 Submitted for Payment ({submittedClaims.length})</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {submittedClaims.map(claim => (
                  <div key={claim.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{claim.user_name}</span>
                        <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">{claim.claim_number}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatShortDate(claim.submitted_to_finance_at || claim.submitted_at)} • {(claim.expenses || []).length} items
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="font-bold text-amber-700 text-sm mr-1">{formatCurrency(claim.total_amount, claim.currency)}</span>
                      <button onClick={() => handleDownloadPDF(claim)} className="bg-green-100 text-green-700 px-2 py-1.5 rounded-lg text-xs">📥</button>
                      {!currentUser.reportOffices && <button onClick={() => setEditingClaim(claim)} className="bg-blue-100 text-blue-700 px-2 py-1.5 rounded-lg text-xs">✏️</button>}
                      {!currentUser.reportOffices && <button onClick={() => handleMarkPaid(claim.id)} disabled={loading} className="bg-green-600 text-white px-2 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50">✓ Paid</button>}
                      {currentUser.id === 9001 && <button onClick={() => { setShowDupModal(claim); setDupTargets([]); }} className="bg-purple-100 text-purple-700 px-2 py-1.5 rounded-lg text-xs">📋</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null;
        })()}
        
        {/* Paid Claims Archive - read only */}
        {(currentUser.role === 'admin' || currentUser.role === 'group_finance') && (() => {
          const paidClaims = claims.filter(c => 
            c.status === 'paid' && 
            (currentUser.role === 'group_finance' ? (!currentUser.reportOffices || currentUser.reportOffices.includes(c.office_code)) : c.office_code === currentUser.office)
          ).sort((a, b) => new Date(b.paid_at || b.submitted_at || 0) - new Date(a.paid_at || a.submitted_at || 0));
          
          return (
            <div className="bg-white rounded-2xl shadow-lg p-6 mt-4">
              <h3 className="font-bold mb-4">📁 Paid Claims ({paidClaims.length})</h3>
              {paidClaims.length === 0 ? (
                <p className="text-center text-slate-400 py-4">No paid claims yet</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {paidClaims.map(claim => (
                    <div key={claim.id} className="flex items-center justify-between p-3 rounded-xl bg-green-50 border border-green-200">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{claim.user_name}</span>
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">{claim.claim_number}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Paid: {formatShortDate(claim.paid_at)} • {(claim.expenses || []).length} items
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="font-bold text-green-700 text-sm mr-1">{formatCurrency(claim.total_amount, claim.currency)}</span>
                        <button onClick={() => handleDownloadPDF(claim)} className="bg-green-100 text-green-700 px-2 py-1.5 rounded-lg text-xs">📥</button>
                        {currentUser.id === 9001 && <button onClick={() => { setShowDupModal(claim); setDupTargets([]); }} className="bg-purple-100 text-purple-700 px-2 py-1.5 rounded-lg text-xs">📋</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
        
        {/* Duplicate Claim Modal */}
        {showDupModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setShowDupModal(null)}>
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="bg-purple-600 text-white p-4">
                <h3 className="font-bold">📋 Duplicate Claim</h3>
                <p className="text-purple-200 text-sm">{showDupModal.claim_number} • {showDupModal.user_name}</p>
              </div>
              <div className="p-4 overflow-y-auto max-h-[50vh]">
                <p className="text-sm text-slate-600 mb-3">Select employees to copy this claim to:</p>
                <div className="space-y-1">
                  {OFFICES.filter(o => !o.isAdmin).map(office => {
                    const emps = EMPLOYEES.filter(e => e.office === office.code && e.role !== 'group_finance');
                    if (!emps.length) return null;
                    return (
                      <div key={office.code}>
                        <p className="text-xs font-bold text-slate-400 mt-2 mb-1">{office.name}</p>
                        {emps.sort((a,b) => a.name.localeCompare(b.name)).map(emp => (
                          <label key={emp.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-purple-50 cursor-pointer text-sm">
                            <input type="checkbox" checked={dupTargets.includes(emp.id)} onChange={e => {
                              if (e.target.checked) setDupTargets(prev => [...prev, emp.id]);
                              else setDupTargets(prev => prev.filter(id => id !== emp.id));
                            }} className="rounded" />
                            <span>{emp.name}</span>
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="p-4 border-t flex gap-3">
                <button onClick={() => setShowDupModal(null)} className="flex-1 py-2 rounded-lg border-2 font-semibold text-sm">Cancel</button>
                <button onClick={handleDuplicate} disabled={dupTargets.length === 0 || dupBusy} className={`flex-[2] py-2 rounded-lg font-semibold text-sm ${dupTargets.length > 0 && !dupBusy ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                  {dupBusy ? '⏳...' : `Duplicate to ${dupTargets.length} employee${dupTargets.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {editingClaim && <ReviewModal claim={editingClaim} onClose={() => { setEditingClaim(null); loadClaims(); }} />}
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
      {canReview && (<div className="bg-white border-b sticky top-14 z-30"><div className="max-w-3xl mx-auto flex">{currentUser?.role !== 'group_finance' && <button onClick={() => setActiveTab('my_expenses')} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${activeTab === 'my_expenses' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>📋 My Expenses</button>}<button onClick={() => setActiveTab('review')} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${activeTab === 'review' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>👀 Review{getReviewableClaims().length > 0 && <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">{getReviewableClaims().length}</span>}</button>{currentUser?.role === 'group_finance' && <button onClick={() => setActiveTab('finance')} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${activeTab === 'finance' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500'}`}>📊 Finance</button>}</div></div>)}
      <main className="max-w-3xl mx-auto p-4 pb-20">{activeTab === 'finance' && currentUser?.role === 'group_finance' ? <FinanceDashboard /> : activeTab === 'review' && currentUser?.role === 'group_finance' ? <FinanceReviewTab /> : canReview && activeTab === 'review' ? <ReviewClaimsTab /> : <MyExpensesTab />}</main>
      {(showAddExpense || editingExpense) && <AddExpenseModal editExpense={editingExpense} existingClaims={claims} expenses={expenses} onClose={() => { setShowAddExpense(false); setEditingExpense(null); }} />}
      {showMileageModal && currentUser.mileageRate && (() => {
        const MileageModalInner = () => {
          const [from, setFrom] = useState('');
          const [to, setTo] = useState('');
          const [distance, setDistance] = useState('');
          const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
          const [saving, setSaving] = useState(false);
          const unit = currentUser.mileageUnit || 'km';
          const rate = currentUser.mileageRate;
          const currency = currentUser.reimburseCurrency || getUserReimburseCurrency(currentUser);
          const amount = distance ? (parseFloat(distance) * rate).toFixed(2) : '';
          const canSave = from.trim() && to.trim() && distance && date;
          
          const handleSave = async () => {
            setSaving(true);
            const description = `Business Mileage Claim`;
            const newExpense = {
              id: Date.now(), ref: 'temp', merchant: `Mileage: ${from.trim()} → ${to.trim()}`,
              amount: parseFloat(amount), currency, reimbursementAmount: parseFloat(amount),
              date, category: 'H', description,
              mileageDistance: distance, mileageFrom: from.trim(), mileageTo: to.trim(), mileageUnit: unit, mileageRate: rate,
              receiptPreview: null, receiptPreview2: null, receiptPreview3: null, receiptPreview4: null,
              status: 'draft', isForeignCurrency: false, createdAt: new Date().toISOString()
            };
            const newExpenses = sortAndReassignRefs([...expenses, newExpense]);
            const processed = markDuplicatePairs(newExpenses);
            setExpenses(processed);
            await saveToServer(processed, annotatedStatements, statementAnnotations, originalStatementImages);
            setSaving(false);
            setShowMileageModal(false);
          };
          
          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-5 flex justify-between items-center">
                  <div><h2 className="text-lg font-bold">📍 Business Mileage</h2><p className="text-green-100 text-sm">{currency} {rate.toFixed(2)} per {unit}</p></div>
                  <button onClick={() => setShowMileageModal(false)} className="w-8 h-8 rounded-full bg-white/20">✕</button>
                </div>
                <div className="p-6 space-y-4">
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Date *</label><input type="date" className="w-full p-3 border-2 border-slate-200 rounded-xl" value={date} onChange={e => setDate(e.target.value)} /></div>
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">From *</label><input type="text" className="w-full p-3 border-2 border-slate-200 rounded-xl" placeholder="e.g. Home TW18 4AB" value={from} onChange={e => setFrom(e.target.value)} /></div>
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">To *</label><input type="text" className="w-full p-3 border-2 border-slate-200 rounded-xl" placeholder="e.g. Guildford site GU1 4AF" value={to} onChange={e => setTo(e.target.value)} /></div>
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Distance ({unit}) *</label><input type="number" step="0.1" className="w-full p-3 border-2 border-green-300 rounded-xl bg-green-50" placeholder={`Total ${unit}`} value={distance} onChange={e => setDistance(e.target.value)} /></div>
                  {amount && (
                    <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center">
                      <p className="text-sm text-slate-600">{distance} {unit} × {rate.toFixed(2)} =</p>
                      <p className="text-2xl font-bold text-green-700">{currency} {amount}</p>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t flex gap-3">
                  <button onClick={() => setShowMileageModal(false)} className="flex-1 py-3 rounded-xl border-2 font-semibold">Cancel</button>
                  <button onClick={handleSave} disabled={!canSave || saving} className={`flex-[2] py-3 rounded-xl font-semibold ${canSave && !saving ? 'bg-green-600 text-white' : 'bg-slate-300 text-slate-500'}`}>{saving ? '⏳...' : '💾 Save'}</button>
                </div>
              </div>
            </div>
          );
        };
        return <MileageModalInner />;
      })()}
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