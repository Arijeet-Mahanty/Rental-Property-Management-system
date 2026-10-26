-- ============================================================================
-- RentRoll — PostgreSQL Seed Data (Phase 2)
-- Realistic mock portfolio for Landlord (Marcus Vance) and Tenant (Elena Rostova)
-- Passwords below are bcrypt-hashed for 'Password123!'
-- Hash: $2a$10$wN7KjZq09uP6VfW4uY4mQ.Hh39gD7e8M5rM6S0r3oT9L7pUqg2n7e
-- ============================================================================

-- 1. SEED USERS
INSERT INTO users (id, name, email, password_hash, role, phone, created_at)
VALUES 
('usr_landlord_demo', 'Marcus Vance', 'landlord@rentroll.com', '$2a$10$0d2m0qL1b/JbOQW5G5f7j.6V1XqY1qjZ7n4qT9L7pUqg2n7e4qTm', 'landlord', '(555) 234-5678', '2026-01-15 09:00:00+00'),
('usr_tenant_demo', 'Elena Rostova', 'tenant@rentroll.com', '$2a$10$0d2m0qL1b/JbOQW5G5f7j.6V1XqY1qjZ7n4qT9L7pUqg2n7e4qTm', 'tenant', '(555) 876-5432', '2026-02-01 10:00:00+00'),
('usr_tenant_2', 'Liam Chen', 'liam.chen@example.com', '$2a$10$0d2m0qL1b/JbOQW5G5f7j.6V1XqY1qjZ7n4qT9L7pUqg2n7e4qTm', 'tenant', '(555) 345-6789', '2026-02-10 11:30:00+00'),
('usr_tenant_3', 'Sophia Rodriguez', 'sophia.r@example.com', '$2a$10$0d2m0qL1b/JbOQW5G5f7j.6V1XqY1qjZ7n4qT9L7pUqg2n7e4qTm', 'tenant', '(555) 456-7890', '2026-03-01 14:15:00+00')
ON CONFLICT (id) DO NOTHING;

-- 2. SEED PROPERTIES
INSERT INTO properties (id, landlord_id, name, address, city, state, zip_code, property_type, created_at)
VALUES
('prop_1', 'usr_landlord_demo', 'Oakwood Manor Apartments', '742 Evergreen Terrace', 'Springfield', 'OR', '97477', 'Apartment Building', '2026-01-16 10:00:00+00'),
('prop_2', 'usr_landlord_demo', 'Highland Lofts', '1280 Beacon Street', 'Brookline', 'MA', '02446', 'Multi-Family', '2026-01-20 12:00:00+00'),
('prop_3', 'usr_landlord_demo', 'Maple Court Duplex', '452 Maple Ridge Rd', 'Austin', 'TX', '78704', 'Duplex/Triplex', '2026-02-01 09:30:00+00'),
('prop_4', 'usr_landlord_demo', 'Sunset Palms Residences', '901 Ocean Drive', 'Santa Monica', 'CA', '90401', 'Multi-Family', '2026-02-15 15:45:00+00')
ON CONFLICT (id) DO NOTHING;

-- 3. SEED UNITS
INSERT INTO units (id, property_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, deposit_amount, status, notes, created_at)
VALUES
-- Oakwood Manor (6 units)
('unit_101', 'prop_1', 'Apt 1A', 1, 1.0, 680, 1450.00, 1450.00, 'occupied', 'Ground floor patio view', '2026-01-16 11:00:00+00'),
('unit_102', 'prop_1', 'Apt 2A', 2, 1.5, 920, 1850.00, 1850.00, 'occupied', 'Balcony facing courtyard', '2026-01-16 11:00:00+00'),
('unit_103', 'prop_1', 'Apt 3B', 2, 2.0, 1050, 2100.00, 2100.00, 'occupied', 'Corner unit with bay windows', '2026-01-16 11:00:00+00'),
('unit_104', 'prop_1', 'Apt 4B', 2, 1.5, 950, 1650.00, 1650.00, 'occupied', 'Assigned to Elena Rostova', '2026-01-16 11:00:00+00'),
('unit_105', 'prop_1', 'Apt 5C', 3, 2.0, 1250, 2400.00, 2400.00, 'occupied', 'Top floor penthouse feel', '2026-01-16 11:00:00+00'),
('unit_106', 'prop_1', 'Apt 6C', 1, 1.0, 650, 1400.00, 1400.00, 'vacant', 'Freshly painted, ready to lease', '2026-01-16 11:00:00+00'),

-- Highland Lofts (5 units)
('unit_201', 'prop_2', 'Loft 101', 1, 1.0, 800, 2200.00, 2200.00, 'occupied', 'Exposed brick & high ceilings', '2026-01-20 13:00:00+00'),
('unit_202', 'prop_2', 'Loft 102', 1, 1.5, 870, 2350.00, 2350.00, 'occupied', 'Stainless steel appliances', '2026-01-20 13:00:00+00'),
('unit_203', 'prop_2', 'Loft 201', 2, 2.0, 1150, 2900.00, 2900.00, 'occupied', 'Master suite lofted', '2026-01-20 13:00:00+00'),
('unit_204', 'prop_2', 'Loft 202', 2, 2.0, 1200, 3100.00, 3100.00, 'occupied', 'Private rooftop terrace access', '2026-01-20 13:00:00+00'),
('unit_205', 'prop_2', 'Loft 301', 3, 2.5, 1450, 3800.00, 3800.00, 'occupied', 'Large industrial windows', '2026-01-20 13:00:00+00'),

-- Maple Court Duplex (2 units)
('unit_301', 'prop_3', 'Unit A (North)', 3, 2.0, 1380, 2500.00, 2500.00, 'occupied', 'Fenced private backyard', '2026-02-01 10:00:00+00'),
('unit_302', 'prop_3', 'Unit B (South)', 3, 2.0, 1380, 2500.00, 2500.00, 'occupied', 'Attached 1-car garage', '2026-02-01 10:00:00+00'),

-- Sunset Palms (5 units)
('unit_401', 'prop_4', 'Suite 1', 1, 1.0, 720, 2100.00, 2100.00, 'occupied', 'Poolside entrance', '2026-02-15 16:00:00+00'),
('unit_402', 'prop_4', 'Suite 2', 1, 1.0, 720, 2100.00, 2100.00, 'occupied', 'Hardwood flooring', '2026-02-15 16:00:00+00'),
('unit_403', 'prop_4', 'Suite 3', 2, 2.0, 1100, 2800.00, 2800.00, 'occupied', 'Ocean breeze balcony', '2026-02-15 16:00:00+00'),
('unit_404', 'prop_4', 'Suite 4', 2, 2.0, 1100, 2800.00, 2800.00, 'occupied', 'Renovated quartz countertops', '2026-02-15 16:00:00+00'),
('unit_405', 'prop_4', 'Suite 5', 3, 2.5, 1400, 3450.00, 3450.00, 'occupied', 'Dual parking spaces', '2026-02-15 16:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- 4. SEED LEASES
INSERT INTO leases (id, unit_id, tenant_id, landlord_id, start_date, end_date, rent_amount, deposit_amount, status, terms, created_at)
VALUES
('lease_1', 'unit_104', 'usr_tenant_demo', 'usr_landlord_demo', '2026-02-01', '2027-01-31', 1650.00, 1650.00, 'active', 'Standard 12-month lease with autopay ACH discount. No smoking.', '2026-02-01 10:00:00+00'),
('lease_2', 'unit_102', 'usr_tenant_2', 'usr_landlord_demo', '2026-01-01', '2026-12-31', 1850.00, 1850.00, 'active', '12-month lease. 1 small dog approved with pet deposit.', '2026-01-01 10:00:00+00'),
('lease_3', 'unit_201', 'usr_tenant_3', 'usr_landlord_demo', '2026-03-01', '2027-02-28', 2200.00, 2200.00, 'active', '12-month commercial-residential loft agreement.', '2026-03-01 10:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- 5. SEED PAYMENTS (LEDGER)
INSERT INTO payments (id, lease_id, tenant_id, landlord_id, amount, due_date, paid_date, status, payment_method, transaction_ref, notes, created_at)
VALUES
('pay_101', 'lease_1', 'usr_tenant_demo', 'usr_landlord_demo', 1650.00, '2026-10-01', '2026-10-01', 'paid', 'ach', 'ACH-RR-90421', 'October 2026 Rent - Paid on time', '2026-10-01 08:30:00+00'),
('pay_102', 'lease_1', 'usr_tenant_demo', 'usr_landlord_demo', 1650.00, '2026-09-01', '2026-09-01', 'paid', 'ach', 'ACH-RR-84192', 'September 2026 Rent - Auto withdrawal', '2026-09-01 08:30:00+00'),
('pay_103', 'lease_1', 'usr_tenant_demo', 'usr_landlord_demo', 1650.00, '2026-08-01', '2026-08-01', 'paid', 'ach', 'ACH-RR-79213', 'August 2026 Rent - Auto withdrawal', '2026-08-01 08:30:00+00'),
('pay_104', 'lease_2', 'usr_tenant_2', 'usr_landlord_demo', 1850.00, '2026-10-01', '2026-10-02', 'paid', 'credit_card', 'CC-STRIPE-4028', 'October 2026 Rent', '2026-10-02 11:20:00+00'),
('pay_105', 'lease_3', 'usr_tenant_3', 'usr_landlord_demo', 2200.00, '2026-10-01', '2026-10-01', 'paid', 'bank_transfer', 'WIRE-BTR-1192', 'October 2026 Rent', '2026-10-01 14:00:00+00'),
('pay_106', 'lease_1', 'usr_tenant_demo', 'usr_landlord_demo', 1650.00, '2026-11-01', NULL, 'pending', 'ach', NULL, 'November 2026 Rent (Upcoming)', '2026-10-20 00:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- 6. SEED MAINTENANCE TICKETS
INSERT INTO maintenance_tickets (id, property_id, unit_id, tenant_id, landlord_id, title, category, priority, status, description, estimated_cost, actual_cost, resolution_notes, created_at)
VALUES
('tkt_1', 'prop_1', 'unit_104', 'usr_tenant_demo', 'usr_landlord_demo', 'Low hot water pressure in master shower', 'plumbing', 'high', 'in_progress', 'The hot water tap in the master bathroom shower has noticeably lower pressure since yesterday evening.', 180.00, 0.00, 'Plumber scheduled for tomorrow morning 9:00 AM.', '2026-10-24 14:20:00+00'),
('tkt_2', 'prop_2', 'unit_201', 'usr_tenant_3', 'usr_landlord_demo', 'HVAC heat pump making rhythmic clicking noise', 'hvac', 'medium', 'open', 'When the heat turns on, there is a rhythmic click from the ceiling vent. Still heating fine.', 150.00, 0.00, NULL, '2026-10-25 09:10:00+00'),
('tkt_3', 'prop_1', 'unit_102', 'usr_tenant_2', 'usr_landlord_demo', 'Kitchen garbage disposal jam cleared', 'appliance', 'low', 'resolved', 'Disposal humming but not spinning after dinner.', 75.00, 65.00, 'Cleared small coin obstruction using hex key wrench. Motor running smoothly.', '2026-10-18 16:45:00+00')
ON CONFLICT (id) DO NOTHING;
