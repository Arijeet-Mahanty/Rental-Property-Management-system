-- ============================================================================
-- RentRoll — PostgreSQL Seed Data (Phase 3)
-- Realistic portfolio for Indian rental market (Rajesh Sharma & Priya Iyer)
-- Passwords below are bcrypt-hashed for 'Password123!'
-- Hash: $2b$10$YmPhB2QkFhsj4Vrkt2Yc1O/d/IcsWLSnh5KJSB2pOsY3tUXAvI1RC
-- ============================================================================

-- 1. SEED USERS (Indian personas only)
INSERT INTO users (id, name, email, password_hash, role, phone, created_at)
VALUES 
('usr_admin_demo', 'Arjun Singhania', 'admin@rentroll.com', '$2b$10$YmPhB2QkFhsj4Vrkt2Yc1O/d/IcsWLSnh5KJSB2pOsY3tUXAvI1RC', 'admin', '+91 98100 00001', '2026-01-01 00:00:00+00'),
('usr_landlord_demo', 'Rajesh Sharma', 'landlord@rentroll.com', '$2b$10$YmPhB2QkFhsj4Vrkt2Yc1O/d/IcsWLSnh5KJSB2pOsY3tUXAvI1RC', 'landlord', '+91 98201 23456', '2026-01-15 09:00:00+00'),
('usr_tenant_demo', 'Priya Iyer', 'tenant@rentroll.com', '$2b$10$YmPhB2QkFhsj4Vrkt2Yc1O/d/IcsWLSnh5KJSB2pOsY3tUXAvI1RC', 'tenant', '+91 98450 87654', '2026-02-01 10:00:00+00'),
('usr_tenant_2', 'Aarav Mehta', 'aarav.mehta@example.in', '$2b$10$YmPhB2QkFhsj4Vrkt2Yc1O/d/IcsWLSnh5KJSB2pOsY3tUXAvI1RC', 'tenant', '+91 99102 34567', '2026-02-10 11:30:00+00'),
('usr_tenant_3', 'Ananya Deshmukh', 'ananya.d@example.in', '$2b$10$YmPhB2QkFhsj4Vrkt2Yc1O/d/IcsWLSnh5KJSB2pOsY3tUXAvI1RC', 'tenant', '+91 97654 12389', '2026-03-01 14:15:00+00'),
('usr_tenant_4', 'Vikram Malhotra', 'vikram.m@example.in', '$2b$10$YmPhB2QkFhsj4Vrkt2Yc1O/d/IcsWLSnh5KJSB2pOsY3tUXAvI1RC', 'tenant', '+91 98111 22334', '2026-03-10 16:00:00+00'),
('usr_landlord_2', 'Sunita Kulkarni', 'sunita.k@example.in', '$2b$10$YmPhB2QkFhsj4Vrkt2Yc1O/d/IcsWLSnh5KJSB2pOsY3tUXAvI1RC', 'landlord', '+91 98220 99887', '2026-01-10 08:30:00+00')
ON CONFLICT (id) DO NOTHING;

-- 2. SEED PROPERTIES (Indian Cities)
INSERT INTO properties (id, landlord_id, name, address, city, state, zip_code, property_type, created_at)
VALUES
('prop_1', 'usr_landlord_demo', 'Gulmohar Residency', '42, 80 Feet Road, 4th Block, Koramangala', 'Bengaluru', 'KA', '560034', 'Apartment Society', '2026-01-16 10:00:00+00'),
('prop_2', 'usr_landlord_demo', 'Skyline Palms Heights', '15, Turner Road, Bandra West', 'Mumbai', 'MH', '400050', 'Gated High-Rise', '2026-01-20 12:00:00+00'),
('prop_3', 'usr_landlord_demo', 'Greenfield Heights Duplex', '88, Whitefield Main Road', 'Bengaluru', 'KA', '560066', 'Independent Villa/Duplex', '2026-02-01 09:30:00+00'),
('prop_4', 'usr_landlord_demo', 'Cyber Greens Residency', 'DLF Phase 5, Golf Course Road', 'Gurugram', 'HR', '122002', 'Luxury Condominium', '2026-02-15 15:45:00+00')
ON CONFLICT (id) DO NOTHING;

-- 3. SEED UNITS (INR Rental Values)
INSERT INTO units (id, property_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, deposit_amount, status, notes, created_at)
VALUES
-- Gulmohar Residency (Bengaluru)
('unit_101', 'prop_1', 'Flat 1A', 1, 1.0, 680, 24000.00, 72000.00, 'occupied', 'Ground floor garden view', '2026-01-16 11:00:00+00'),
('unit_102', 'prop_1', 'Flat 2A', 2, 2.0, 1050, 35000.00, 105000.00, 'occupied', 'Balcony facing landscaped park', '2026-01-16 11:00:00+00'),
('unit_103', 'prop_1', 'Flat 3B', 3, 3.0, 1450, 45000.00, 135000.00, 'occupied', 'Corner flat with double balconies', '2026-01-16 11:00:00+00'),
('unit_104', 'prop_1', 'Flat 4B', 2, 2.0, 1100, 28500.00, 85500.00, 'occupied', 'Assigned to Priya Iyer', '2026-01-16 11:00:00+00'),
('unit_105', 'prop_1', 'Flat 5C', 3, 3.0, 1600, 48000.00, 144000.00, 'occupied', 'Top floor with private terrace', '2026-01-16 11:00:00+00'),
('unit_106', 'prop_1', 'Flat 6C', 1, 1.0, 650, 22000.00, 66000.00, 'vacant', 'Freshly painted, ready to move in', '2026-01-16 11:00:00+00'),

-- Skyline Palms Heights (Mumbai)
('unit_201', 'prop_2', 'Tower 101', 2, 2.0, 1150, 65000.00, 195000.00, 'occupied', 'Sea view Bandra West flat', '2026-01-20 13:00:00+00'),
('unit_202', 'prop_2', 'Tower 102', 2, 2.0, 1200, 68000.00, 204000.00, 'occupied', 'Italian marble & modular kitchen', '2026-01-20 13:00:00+00'),
('unit_203', 'prop_2', 'Tower 201', 3, 3.0, 1550, 85000.00, 255000.00, 'occupied', 'Reserved covered dual parking', '2026-01-20 13:00:00+00'),
('unit_204', 'prop_2', 'Tower 202', 3, 3.0, 1600, 90000.00, 270000.00, 'occupied', 'Private terrace garden view', '2026-01-20 13:00:00+00'),
('unit_205', 'prop_2', 'Tower 301', 4, 4.5, 2400, 135000.00, 405000.00, 'occupied', 'Exclusive penthouse with private elevator', '2026-01-20 13:00:00+00'),

-- Greenfield Heights Duplex (Bengaluru)
('unit_301', 'prop_3', 'Villa A (North)', 3, 3.0, 2100, 60000.00, 180000.00, 'occupied', 'Private lawn & teak woodwork', '2026-02-01 10:00:00+00'),
('unit_302', 'prop_3', 'Villa B (South)', 3, 3.0, 2100, 60000.00, 180000.00, 'occupied', 'Attached 2-car porch', '2026-02-01 10:00:00+00'),

-- Cyber Greens Residency (Gurugram)
('unit_401', 'prop_4', 'Suite 101', 2, 2.0, 1250, 50000.00, 150000.00, 'occupied', 'DLF Golf Course view', '2026-02-15 16:00:00+00'),
('unit_402', 'prop_4', 'Suite 102', 2, 2.0, 1250, 50000.00, 150000.00, 'occupied', 'Smart automation locks', '2026-02-15 16:00:00+00'),
('unit_403', 'prop_4', 'Suite 201', 3, 3.0, 1750, 72000.00, 216000.00, 'occupied', 'Designer modular kitchen', '2026-02-15 16:00:00+00'),
('unit_404', 'prop_4', 'Suite 202', 3, 3.0, 1750, 72000.00, 216000.00, 'occupied', 'Attached staff quarter', '2026-02-15 16:00:00+00'),
('unit_405', 'prop_4', 'Suite 301', 4, 4.0, 2600, 95000.00, 285000.00, 'occupied', 'Panoramic Aravali skyline view', '2026-02-15 16:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- 4. SEED LEASES
INSERT INTO leases (id, unit_id, tenant_id, landlord_id, start_date, end_date, rent_amount, deposit_amount, status, terms, created_at)
VALUES
('lease_1', 'unit_104', 'usr_tenant_demo', 'usr_landlord_demo', '2026-02-01', '2027-01-31', 28500.00, 85500.00, 'active', 'Standard 11-month registered rental agreement with UPI autopay. 5% annual escalation clause. No smoking.', '2026-02-01 10:00:00+00'),
('lease_2', 'unit_102', 'usr_tenant_2', 'usr_landlord_demo', '2026-01-01', '2026-12-31', 35000.00, 105000.00, 'active', '11-month registered agreement with eNACH mandate. 1 pet dog permitted with deposit.', '2026-01-01 10:00:00+00'),
('lease_3', 'unit_201', 'usr_tenant_3', 'usr_landlord_demo', '2026-03-01', '2027-02-28', 65000.00, 195000.00, 'active', '11-month residential agreement for Bandra West high-rise apartment.', '2026-03-01 10:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- 5. SEED PAYMENTS (UPI, eNACH, IMPS)
INSERT INTO payments (id, lease_id, tenant_id, landlord_id, amount, due_date, paid_date, status, payment_method, transaction_ref, notes, created_at)
VALUES
('pay_101', 'lease_1', 'usr_tenant_demo', 'usr_landlord_demo', 28500.00, '2026-10-01', '2026-10-01', 'paid', 'upi', 'UPI-RR-90421', 'October 2026 Rent - Paid on time via Google Pay UPI', '2026-10-01 08:30:00+00'),
('pay_102', 'lease_1', 'usr_tenant_demo', 'usr_landlord_demo', 28500.00, '2026-09-01', '2026-09-01', 'paid', 'upi', 'UPI-RR-84192', 'September 2026 Rent - Auto-debited via UPI', '2026-09-01 08:30:00+00'),
('pay_103', 'lease_1', 'usr_tenant_demo', 'usr_landlord_demo', 28500.00, '2026-08-01', '2026-08-01', 'paid', 'upi', 'UPI-RR-79213', 'August 2026 Rent - Auto-debited via UPI', '2026-08-01 08:30:00+00'),
('pay_104', 'lease_2', 'usr_tenant_2', 'usr_landlord_demo', 35000.00, '2026-10-01', '2026-10-02', 'paid', 'enach', 'eNACH-HDFC-4028', 'October 2026 Rent - eNACH Mandate Cleared', '2026-10-02 11:20:00+00'),
('pay_105', 'lease_3', 'usr_tenant_3', 'usr_landlord_demo', 65000.00, '2026-10-01', '2026-10-01', 'paid', 'netbanking', 'IMPS-ICICI-1192', 'October 2026 Rent - Direct IMPS Transfer', '2026-10-01 14:00:00+00'),
('pay_106', 'lease_1', 'usr_tenant_demo', 'usr_landlord_demo', 28500.00, '2026-11-01', NULL, 'pending', 'upi', NULL, 'November 2026 Rent (Upcoming UPI Auto-Debit)', '2026-10-20 00:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- 6. SEED MAINTENANCE TICKETS
INSERT INTO maintenance_tickets (id, property_id, unit_id, tenant_id, landlord_id, title, category, priority, status, description, estimated_cost, actual_cost, resolution_notes, created_at)
VALUES
('tkt_1', 'prop_1', 'unit_104', 'usr_tenant_demo', 'usr_landlord_demo', 'Water purifier (RO) filter servicing', 'plumbing', 'medium', 'in_progress', 'RO water purifier flow has slowed down significantly. Filter cartridge replacement required.', 1200.00, 0.00, 'Urban Company technician booked for tomorrow 10:00 AM.', '2026-10-24 14:20:00+00'),
('tkt_2', 'prop_1', 'unit_101', 'usr_tenant_demo', 'usr_landlord_demo', 'Bathroom hot water geyser inspection', 'electrical', 'high', 'open', 'Geyser is tripping the MCB switch whenever switched on. Heating element needs check.', 1500.00, 0.00, NULL, '2026-10-25 09:10:00+00'),
('tkt_3', 'prop_1', 'unit_102', 'usr_tenant_2', 'usr_landlord_demo', 'Ceiling fan regulator replacement', 'electrical', 'low', 'resolved', 'Master bedroom fan running only at speed 5. Regulator switch replaced.', 450.00, 400.00, 'Replaced modular regulator switch. Working smoothly.', '2026-10-18 16:45:00+00')
ON CONFLICT (id) DO NOTHING;
