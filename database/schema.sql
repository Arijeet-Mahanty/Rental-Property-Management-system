-- ============================================================================
-- RentRoll — PostgreSQL Database Schema (Phase 2)
-- Multi-Tenant Property Management for Independent Landlords and Tenants
-- ============================================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if re-initializing (in reverse dependency order)
DROP TABLE IF EXISTS maintenance_tickets CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS leases CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ----------------------------------------------------------------------------
-- 1. USERS TABLE
-- Stores landlords and tenants with bcrypt hashed credentials and role scopes
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('landlord', 'tenant')),
    phone VARCHAR(30),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ----------------------------------------------------------------------------
-- 2. PROPERTIES TABLE
-- Landlord portfolio properties (single-family, multi-family, commercial)
-- ----------------------------------------------------------------------------
CREATE TABLE properties (
    id VARCHAR(64) PRIMARY KEY,
    landlord_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    property_type VARCHAR(50) DEFAULT 'Multi-Family' CHECK (property_type IN ('Single-Family', 'Multi-Family', 'Apartment Building', 'Duplex/Triplex', 'Townhouse', 'Condo')),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_properties_landlord ON properties(landlord_id);

-- ----------------------------------------------------------------------------
-- 3. UNITS TABLE
-- Individual rental units within a property
-- ----------------------------------------------------------------------------
CREATE TABLE units (
    id VARCHAR(64) PRIMARY KEY,
    property_id VARCHAR(64) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    unit_number VARCHAR(50) NOT NULL,
    bedrooms INT DEFAULT 1 CHECK (bedrooms >= 0),
    bathrooms NUMERIC(3, 1) DEFAULT 1.0 CHECK (bathrooms >= 0),
    square_feet INT CHECK (square_feet > 0),
    rent_amount NUMERIC(10, 2) NOT NULL CHECK (rent_amount >= 0),
    deposit_amount NUMERIC(10, 2) DEFAULT 0 CHECK (deposit_amount >= 0),
    status VARCHAR(30) DEFAULT 'vacant' CHECK (status IN ('occupied', 'vacant', 'maintenance')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_units_property ON units(property_id);
CREATE INDEX idx_units_status ON units(status);

-- ----------------------------------------------------------------------------
-- 4. LEASES TABLE
-- Legal rental agreements binding a tenant to a unit
-- ----------------------------------------------------------------------------
CREATE TABLE leases (
    id VARCHAR(64) PRIMARY KEY,
    unit_id VARCHAR(64) NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    landlord_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rent_amount NUMERIC(10, 2) NOT NULL CHECK (rent_amount >= 0),
    deposit_amount NUMERIC(10, 2) DEFAULT 0 CHECK (deposit_amount >= 0),
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'expired', 'terminated')),
    terms TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_lease_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_leases_unit ON leases(unit_id);
CREATE INDEX idx_leases_tenant ON leases(tenant_id);
CREATE INDEX idx_leases_landlord ON leases(landlord_id);
CREATE INDEX idx_leases_status ON leases(status);

-- ----------------------------------------------------------------------------
-- 5. PAYMENTS TABLE
-- Rent collection ledger, transaction history, and payment tracking
-- ----------------------------------------------------------------------------
CREATE TABLE payments (
    id VARCHAR(64) PRIMARY KEY,
    lease_id VARCHAR(64) REFERENCES leases(id) ON DELETE SET NULL,
    tenant_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    landlord_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    paid_date DATE,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'late', 'failed')),
    payment_method VARCHAR(50) DEFAULT 'ach' CHECK (payment_method IN ('ach', 'credit_card', 'cash', 'check', 'bank_transfer')),
    transaction_ref VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_lease ON payments(lease_id);
CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_landlord ON payments(landlord_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_due_date ON payments(due_date);

-- ----------------------------------------------------------------------------
-- 6. MAINTENANCE_TICKETS TABLE
-- Tenant-initiated repairs and landlord work-order triage
-- ----------------------------------------------------------------------------
CREATE TABLE maintenance_tickets (
    id VARCHAR(64) PRIMARY KEY,
    property_id VARCHAR(64) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    unit_id VARCHAR(64) NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    landlord_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest_control', 'general')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'emergency')),
    status VARCHAR(30) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    description TEXT NOT NULL,
    photo_url TEXT,
    estimated_cost NUMERIC(10, 2) DEFAULT 0,
    actual_cost NUMERIC(10, 2) DEFAULT 0,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_maintenance_property ON maintenance_tickets(property_id);
CREATE INDEX idx_maintenance_unit ON maintenance_tickets(unit_id);
CREATE INDEX idx_maintenance_tenant ON maintenance_tickets(tenant_id);
CREATE INDEX idx_maintenance_landlord ON maintenance_tickets(landlord_id);
CREATE INDEX idx_maintenance_status ON maintenance_tickets(status);
CREATE INDEX idx_maintenance_priority ON maintenance_tickets(priority);
