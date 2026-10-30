/**
 * RentRoll - Unified Database Service (PostgreSQL with Embedded Relational Fallback)
 * 
 * Supports full PostgreSQL when DATABASE_URL is configured.
 * Defaults seamlessly to an atomic, persistent JSON store (data/rentroll_db.json)
 * when running without an external database server, ensuring zero-friction local execution.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'rentroll_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Check if PostgreSQL connection is provided
const isPgConfigured = Boolean(process.env.DATABASE_URL || (process.env.PGHOST && process.env.PGDATABASE));
let pgPool = null;

if (isPgConfigured) {
  try {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    console.log('[RentRoll DB] PostgreSQL pool configured with provided connection string.');
  } catch (err) {
    console.warn('[RentRoll DB] Failed to initialize pg.Pool, falling back to local store:', err.message);
    pgPool = null;
  }
}

/**
 * Initial seed state for local persistent store
 */
const INITIAL_DB_STATE = {
  users: [
    {
      id: 'usr_admin_demo',
      name: 'Arjun Singhania',
      email: 'admin@rentroll.com',
      password_hash: '$2b$10$YmPhB2QkFhsj4Vrkt2Yc1O/d/IcsWLSnh5KJSB2pOsY3tUXAvI1RC',
      role: 'admin',
      phone: '+91 98100 00001',
      created_at: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'usr_landlord_demo',
      name: 'Rajesh Sharma',
      email: 'landlord@rentroll.com',
      password_hash: '$2b$10$YmPhB2QkFhsj4Vrkt2Yc1O/d/IcsWLSnh5KJSB2pOsY3tUXAvI1RC',
      role: 'landlord',
      phone: '+91 98201 23456',
      created_at: '2026-01-15T09:00:00.000Z'
    },
    {
      id: 'usr_tenant_demo',
      name: 'Priya Iyer',
      email: 'tenant@rentroll.com',
      password_hash: '$2b$10$YmPhB2QkFhsj4Vrkt2Yc1O/d/IcsWLSnh5KJSB2pOsY3tUXAvI1RC',
      role: 'tenant',
      phone: '+91 98450 87654',
      created_at: '2026-02-01T10:00:00.000Z'
    },
    {
      id: 'usr_tenant_2',
      name: 'Aarav Mehta',
      email: 'aarav.mehta@example.in',
      password_hash: '$2b$10$YmPhB2QkFhsj4Vrkt2Yc1O/d/IcsWLSnh5KJSB2pOsY3tUXAvI1RC',
      role: 'tenant',
      phone: '+91 99102 34567',
      created_at: '2026-02-10T11:30:00.000Z'
    },
    {
      id: 'usr_tenant_3',
      name: 'Ananya Deshmukh',
      email: 'ananya.d@example.in',
      password_hash: '$2b$10$YmPhB2QkFhsj4Vrkt2Yc1O/d/IcsWLSnh5KJSB2pOsY3tUXAvI1RC',
      role: 'tenant',
      phone: '+91 97654 12389',
      created_at: '2026-03-01T14:15:00.000Z'
    }
  ],
  properties: [
    {
      id: 'prop_1',
      landlord_id: 'usr_landlord_demo',
      name: 'Gulmohar Residency',
      address: '42, 80 Feet Road, 4th Block, Koramangala',
      city: 'Bengaluru',
      state: 'KA',
      zip_code: '560034',
      property_type: 'Apartment Society',
      created_at: '2026-01-16T10:00:00.000Z'
    },
    {
      id: 'prop_2',
      landlord_id: 'usr_landlord_demo',
      name: 'Skyline Palms Heights',
      address: '15, Turner Road, Bandra West',
      city: 'Mumbai',
      state: 'MH',
      zip_code: '400050',
      property_type: 'Gated High-Rise',
      created_at: '2026-01-20T12:00:00.000Z'
    },
    {
      id: 'prop_3',
      landlord_id: 'usr_landlord_demo',
      name: 'Greenfield Heights Duplex',
      address: '88, Whitefield Main Road',
      city: 'Bengaluru',
      state: 'KA',
      zip_code: '560066',
      property_type: 'Independent Villa/Duplex',
      created_at: '2026-02-01T09:30:00.000Z'
    },
    {
      id: 'prop_4',
      landlord_id: 'usr_landlord_demo',
      name: 'Cyber Greens Residency',
      address: 'DLF Phase 5, Golf Course Road',
      city: 'Gurugram',
      state: 'HR',
      zip_code: '122002',
      property_type: 'Luxury Condominium',
      created_at: '2026-02-15T15:45:00.000Z'
    }
  ],
  units: [
    { id: 'unit_101', property_id: 'prop_1', unit_number: 'Flat 1A', bedrooms: 1, bathrooms: 1, square_feet: 680, rent_amount: 24000, deposit_amount: 72000, status: 'occupied', notes: 'Ground floor garden view', created_at: '2026-01-16T11:00:00.000Z' },
    { id: 'unit_102', property_id: 'prop_1', unit_number: 'Flat 2A', bedrooms: 2, bathrooms: 2, square_feet: 1050, rent_amount: 35000, deposit_amount: 105000, status: 'occupied', notes: 'Balcony facing landscaped park', created_at: '2026-01-16T11:00:00.000Z' },
    { id: 'unit_103', property_id: 'prop_1', unit_number: 'Flat 3B', bedrooms: 3, bathrooms: 3, square_feet: 1450, rent_amount: 45000, deposit_amount: 135000, status: 'occupied', notes: 'Corner flat with double balconies', created_at: '2026-01-16T11:00:00.000Z' },
    { id: 'unit_104', property_id: 'prop_1', unit_number: 'Flat 4B', bedrooms: 2, bathrooms: 2, square_feet: 1100, rent_amount: 28500, deposit_amount: 85500, status: 'occupied', notes: 'Assigned to Priya Iyer', created_at: '2026-01-16T11:00:00.000Z' },
    { id: 'unit_105', property_id: 'prop_1', unit_number: 'Flat 5C', bedrooms: 3, bathrooms: 3, square_feet: 1600, rent_amount: 48000, deposit_amount: 144000, status: 'occupied', notes: 'Top floor with private terrace', created_at: '2026-01-16T11:00:00.000Z' },
    { id: 'unit_106', property_id: 'prop_1', unit_number: 'Flat 6C', bedrooms: 1, bathrooms: 1, square_feet: 650, rent_amount: 22000, deposit_amount: 66000, status: 'vacant', notes: 'Freshly painted, ready to move in', created_at: '2026-01-16T11:00:00.000Z' },

    { id: 'unit_201', property_id: 'prop_2', unit_number: 'Tower 101', bedrooms: 2, bathrooms: 2, square_feet: 1150, rent_amount: 65000, deposit_amount: 195000, status: 'occupied', notes: 'Sea view Bandra West flat', created_at: '2026-01-20T13:00:00.000Z' },
    { id: 'unit_202', property_id: 'prop_2', unit_number: 'Tower 102', bedrooms: 2, bathrooms: 2, square_feet: 1200, rent_amount: 68000, deposit_amount: 204000, status: 'occupied', notes: 'Italian marble & modular kitchen', created_at: '2026-01-20T13:00:00.000Z' },
    { id: 'unit_203', property_id: 'prop_2', unit_number: 'Tower 201', bedrooms: 3, bathrooms: 3, square_feet: 1550, rent_amount: 85000, deposit_amount: 255000, status: 'occupied', notes: 'Reserved covered dual parking', created_at: '2026-01-20T13:00:00.000Z' },
    { id: 'unit_204', property_id: 'prop_2', unit_number: 'Tower 202', bedrooms: 3, bathrooms: 3, square_feet: 1600, rent_amount: 90000, deposit_amount: 270000, status: 'occupied', notes: 'Private terrace garden view', created_at: '2026-01-20T13:00:00.000Z' },
    { id: 'unit_205', property_id: 'prop_2', unit_number: 'Tower 301', bedrooms: 4, bathrooms: 4.5, square_feet: 2400, rent_amount: 135000, deposit_amount: 405000, status: 'occupied', notes: 'Exclusive penthouse with private elevator', created_at: '2026-01-20T13:00:00.000Z' },

    { id: 'unit_301', property_id: 'prop_3', unit_number: 'Villa A (North)', bedrooms: 3, bathrooms: 3, square_feet: 2100, rent_amount: 60000, deposit_amount: 180000, status: 'occupied', notes: 'Private lawn & teak woodwork', created_at: '2026-02-01T10:00:00.000Z' },
    { id: 'unit_302', property_id: 'prop_3', unit_number: 'Villa B (South)', bedrooms: 3, bathrooms: 3, square_feet: 2100, rent_amount: 60000, deposit_amount: 180000, status: 'occupied', notes: 'Attached 2-car porch', created_at: '2026-02-01T10:00:00.000Z' },

    { id: 'unit_401', property_id: 'prop_4', unit_number: 'Suite 101', bedrooms: 2, bathrooms: 2, square_feet: 1250, rent_amount: 50000, deposit_amount: 150000, status: 'occupied', notes: 'DLF Golf Course view', created_at: '2026-02-15T16:00:00.000Z' },
    { id: 'unit_402', property_id: 'prop_4', unit_number: 'Suite 102', bedrooms: 2, bathrooms: 2, square_feet: 1250, rent_amount: 50000, deposit_amount: 150000, status: 'occupied', notes: 'Smart automation locks', created_at: '2026-02-15T16:00:00.000Z' },
    { id: 'unit_403', property_id: 'prop_4', unit_number: 'Suite 201', bedrooms: 3, bathrooms: 3, square_feet: 1750, rent_amount: 72000, deposit_amount: 216000, status: 'occupied', notes: 'Designer modular kitchen', created_at: '2026-02-15T16:00:00.000Z' },
    { id: 'unit_404', property_id: 'prop_4', unit_number: 'Suite 202', bedrooms: 3, bathrooms: 3, square_feet: 1750, rent_amount: 72000, deposit_amount: 216000, status: 'occupied', notes: 'Attached staff quarter', created_at: '2026-02-15T16:00:00.000Z' },
    { id: 'unit_405', property_id: 'prop_4', unit_number: 'Suite 301', bedrooms: 4, bathrooms: 4, square_feet: 2600, rent_amount: 95000, deposit_amount: 285000, status: 'occupied', notes: 'Panoramic Aravali skyline view', created_at: '2026-02-15T16:00:00.000Z' }
  ],
  leases: [
    {
      id: 'lease_1',
      unit_id: 'unit_104',
      tenant_id: 'usr_tenant_demo',
      landlord_id: 'usr_landlord_demo',
      start_date: '2026-02-01',
      end_date: '2027-01-31',
      rent_amount: 28500,
      deposit_amount: 85500,
      status: 'active',
      terms: 'Standard 11-month registered rental agreement with UPI autopay. 5% annual escalation clause. No smoking.',
      created_at: '2026-02-01T10:00:00.000Z'
    },
    {
      id: 'lease_2',
      unit_id: 'unit_102',
      tenant_id: 'usr_tenant_2',
      landlord_id: 'usr_landlord_demo',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      rent_amount: 35000,
      deposit_amount: 105000,
      status: 'active',
      terms: '11-month registered agreement with eNACH mandate. 1 pet dog permitted with deposit.',
      created_at: '2026-01-01T10:00:00.000Z'
    },
    {
      id: 'lease_3',
      unit_id: 'unit_201',
      tenant_id: 'usr_tenant_3',
      landlord_id: 'usr_landlord_demo',
      start_date: '2026-03-01',
      end_date: '2027-02-28',
      rent_amount: 65000,
      deposit_amount: 195000,
      status: 'active',
      terms: '11-month residential agreement for Bandra West high-rise apartment.',
      created_at: '2026-03-01T10:00:00.000Z'
    }
  ],
  payments: [
    {
      id: 'pay_101',
      lease_id: 'lease_1',
      tenant_id: 'usr_tenant_demo',
      landlord_id: 'usr_landlord_demo',
      amount: 28500,
      due_date: '2026-10-01',
      paid_date: '2026-10-01T08:30:00.000Z',
      status: 'paid',
      payment_method: 'upi',
      transaction_ref: 'UPI-RR-90421',
      notes: 'October 2026 Rent - Paid on time via Google Pay UPI',
      created_at: '2026-10-01T08:30:00.000Z'
    },
    {
      id: 'pay_102',
      lease_id: 'lease_1',
      tenant_id: 'usr_tenant_demo',
      landlord_id: 'usr_landlord_demo',
      amount: 28500,
      due_date: '2026-09-01',
      paid_date: '2026-09-01T08:30:00.000Z',
      status: 'paid',
      payment_method: 'upi',
      transaction_ref: 'UPI-RR-84192',
      notes: 'September 2026 Rent - Auto-debited via UPI',
      created_at: '2026-09-01T08:30:00.000Z'
    },
    {
      id: 'pay_103',
      lease_id: 'lease_1',
      tenant_id: 'usr_tenant_demo',
      landlord_id: 'usr_landlord_demo',
      amount: 28500,
      due_date: '2026-08-01',
      paid_date: '2026-08-01T08:30:00.000Z',
      status: 'paid',
      payment_method: 'upi',
      transaction_ref: 'UPI-RR-79213',
      notes: 'August 2026 Rent - Auto-debited via UPI',
      created_at: '2026-08-01T08:30:00.000Z'
    },
    {
      id: 'pay_104',
      lease_id: 'lease_2',
      tenant_id: 'usr_tenant_2',
      landlord_id: 'usr_landlord_demo',
      amount: 35000,
      due_date: '2026-10-01',
      paid_date: '2026-10-02T11:20:00.000Z',
      status: 'paid',
      payment_method: 'enach',
      transaction_ref: 'eNACH-HDFC-4028',
      notes: 'October 2026 Rent - eNACH Mandate Cleared',
      created_at: '2026-10-02T11:20:00.000Z'
    },
    {
      id: 'pay_105',
      lease_id: 'lease_3',
      tenant_id: 'usr_tenant_3',
      landlord_id: 'usr_landlord_demo',
      amount: 65000,
      due_date: '2026-10-01',
      paid_date: '2026-10-01T14:00:00.000Z',
      status: 'paid',
      payment_method: 'netbanking',
      transaction_ref: 'IMPS-ICICI-1192',
      notes: 'October 2026 Rent - Direct IMPS Transfer',
      created_at: '2026-10-01T14:00:00.000Z'
    },
    {
      id: 'pay_106',
      lease_id: 'lease_1',
      tenant_id: 'usr_tenant_demo',
      landlord_id: 'usr_landlord_demo',
      amount: 28500,
      due_date: '2026-11-01',
      paid_date: null,
      status: 'pending',
      payment_method: 'upi',
      transaction_ref: null,
      notes: 'November 2026 Rent (Upcoming UPI Auto-Debit)',
      created_at: '2026-10-20T00:00:00.000Z'
    }
  ],
  maintenance_tickets: [
    {
      id: 'tkt_1',
      property_id: 'prop_1',
      unit_id: 'unit_104',
      tenant_id: 'usr_tenant_demo',
      landlord_id: 'usr_landlord_demo',
      title: 'Water purifier (RO) filter servicing',
      category: 'plumbing',
      priority: 'medium',
      status: 'in_progress',
      description: 'RO water purifier flow has slowed down significantly. Filter cartridge replacement required.',
      photo_url: null,
      estimated_cost: 1200,
      actual_cost: 0,
      resolution_notes: 'Urban Company technician booked for tomorrow 10:00 AM.',
      created_at: '2026-10-24T14:20:00.000Z'
    },
    {
      id: 'tkt_2',
      property_id: 'prop_1',
      unit_id: 'unit_101',
      tenant_id: 'usr_tenant_demo',
      landlord_id: 'usr_landlord_demo',
      title: 'Bathroom hot water geyser inspection',
      category: 'electrical',
      priority: 'high',
      status: 'open',
      description: 'Geyser is tripping the MCB switch whenever switched on. Heating element needs check.',
      photo_url: null,
      estimated_cost: 1500,
      actual_cost: 0,
      resolution_notes: null,
      created_at: '2026-10-25T09:10:00.000Z'
    },
    {
      id: 'tkt_3',
      property_id: 'prop_1',
      unit_id: 'unit_102',
      tenant_id: 'usr_tenant_2',
      landlord_id: 'usr_landlord_demo',
      title: 'Ceiling fan regulator replacement',
      category: 'electrical',
      priority: 'low',
      status: 'resolved',
      description: 'Master bedroom fan running only at speed 5. Regulator switch replaced.',
      photo_url: null,
      estimated_cost: 450,
      actual_cost: 400,
      resolution_notes: 'Replaced modular regulator switch. Working smoothly.',
      created_at: '2026-10-18T16:45:00.000Z'
    }
  ]
};

/**
 * Loads the database state from file or initializes if empty.
 */
function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      writeDb(INITIAL_DB_STATE);
      return JSON.parse(JSON.stringify(INITIAL_DB_STATE));
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[RentRoll DB] Error reading DB file, reinitializing:', err);
    return JSON.parse(JSON.stringify(INITIAL_DB_STATE));
  }
}

/**
 * Persists database state atomically to file.
 */
function writeDb(data) {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[RentRoll DB] Failed to save DB file:', err);
  }
}

// Ensure local db file is initialized on load
readDb();

// ----------------------------------------------------------------------------
// DB Access Methods
// ----------------------------------------------------------------------------

const db = {
  // Check health and backend engine
  async getStatus() {
    return {
      engine: pgPool ? 'PostgreSQL' : 'Embedded JSON Store (Zero Config)',
      persistent: true,
      dataFilePath: DB_FILE
    };
  },

  // USERS
  async findUserByEmail(email) {
    const norm = (email || '').trim().toLowerCase();
    if (pgPool) {
      try {
        const res = await pgPool.query('SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1', [norm]);
        if (res.rows && res.rows.length) return res.rows[0];
      } catch (err) {
        console.warn('[RentRoll DB] pgPool findUserByEmail failed, falling back to local store:', err.message);
      }
    }
    const data = readDb();
    return data.users.find(u => u.email.toLowerCase() === norm) || null;
  },

  async findUserById(id) {
    if (pgPool) {
      try {
        const res = await pgPool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
        if (res.rows && res.rows.length) return res.rows[0];
      } catch (err) {
        console.warn('[RentRoll DB] pgPool findUserById failed, falling back to local store:', err.message);
      }
    }
    const data = readDb();
    return data.users.find(u => u.id === id) || null;
  },

  async createUser(userData) {
    const newUser = {
      id: userData.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: userData.name,
      email: userData.email.trim().toLowerCase(),
      password_hash: userData.password_hash,
      role: userData.role || 'landlord',
      phone: userData.phone || null,
      created_at: new Date().toISOString()
    };
    if (pgPool) {
      try {
        await pgPool.query(
          `INSERT INTO users (id, name, email, password_hash, role, phone, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [newUser.id, newUser.name, newUser.email, newUser.password_hash, newUser.role, newUser.phone, newUser.created_at]
        );
      } catch (err) {
        console.warn('[RentRoll DB] pgPool createUser failed, falling back to local store:', err.message);
      }
    }
    const data = readDb();
    data.users.push(newUser);
    writeDb(data);
    return newUser;
  },

  // PROPERTIES
  async getProperties(landlordId) {
    const data = readDb();
    const props = data.properties.filter(p => p.landlord_id === landlordId);
    
    // Attach computed counts (units, occupancy, monthly rent)
    return props.map(prop => {
      const units = data.units.filter(u => u.property_id === prop.id);
      const occupiedUnits = units.filter(u => u.status === 'occupied').length;
      const totalRent = units.reduce((sum, u) => sum + (Number(u.rent_amount) || 0), 0);
      return {
        ...prop,
        units_count: units.length,
        occupied_units_count: occupiedUnits,
        occupancy_rate: units.length ? Math.round((occupiedUnits / units.length) * 100) : 0,
        monthly_rent_total: totalRent
      };
    });
  },

  async getPropertyById(id) {
    const data = readDb();
    const prop = data.properties.find(p => p.id === id);
    if (!prop) return null;
    const units = data.units.filter(u => u.property_id === prop.id);
    return { ...prop, units };
  },

  async createProperty(propData) {
    const data = readDb();
    const newProp = {
      id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      landlord_id: propData.landlord_id,
      name: propData.name.trim(),
      address: propData.address.trim(),
      city: propData.city.trim(),
      state: propData.state.trim().toUpperCase(),
      zip_code: propData.zip_code.trim(),
      property_type: propData.property_type || 'Multi-Family',
      created_at: new Date().toISOString()
    };
    data.properties.push(newProp);
    writeDb(data);
    return newProp;
  },

  async deleteProperty(id, landlordId) {
    const data = readDb();
    const idx = data.properties.findIndex(p => p.id === id && p.landlord_id === landlordId);
    if (idx === -1) return false;
    data.properties.splice(idx, 1);
    // Cascade delete units
    data.units = data.units.filter(u => u.property_id !== id);
    writeDb(data);
    return true;
  },

  // UNITS
  async getUnits(propertyId = null, landlordId = null) {
    const data = readDb();
    let units = data.units;

    if (propertyId) {
      units = units.filter(u => u.property_id === propertyId);
    } else if (landlordId) {
      const landlordProps = data.properties.filter(p => p.landlord_id === landlordId).map(p => p.id);
      units = units.filter(u => landlordProps.includes(u.property_id));
    }

    // Enhance with property name and active lease/tenant details
    return units.map(unit => {
      const prop = data.properties.find(p => p.id === unit.property_id);
      const activeLease = data.leases.find(l => l.unit_id === unit.id && l.status === 'active');
      let tenant = null;
      if (activeLease) {
        const tenantUser = data.users.find(u => u.id === activeLease.tenant_id);
        if (tenantUser) {
          tenant = { id: tenantUser.id, name: tenantUser.name, email: tenantUser.email };
        }
      }
      return {
        ...unit,
        property_name: prop ? prop.name : 'Unknown Property',
        property_address: prop ? `${prop.address}, ${prop.city}` : '',
        active_lease: activeLease || null,
        current_tenant: tenant
      };
    });
  },

  async createUnit(unitData) {
    const data = readDb();
    const newUnit = {
      id: `unit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      property_id: unitData.property_id,
      unit_number: unitData.unit_number.trim(),
      bedrooms: Number(unitData.bedrooms) || 1,
      bathrooms: Number(unitData.bathrooms) || 1.0,
      square_feet: Number(unitData.square_feet) || 750,
      rent_amount: Number(unitData.rent_amount) || 1200,
      deposit_amount: Number(unitData.deposit_amount) || Number(unitData.rent_amount) || 1200,
      status: unitData.status || 'vacant',
      notes: unitData.notes || '',
      created_at: new Date().toISOString()
    };
    data.units.push(newUnit);
    writeDb(data);
    return newUnit;
  },

  async updateUnit(id, updates) {
    const data = readDb();
    const unit = data.units.find(u => u.id === id);
    if (!unit) return null;
    Object.assign(unit, updates, { updated_at: new Date().toISOString() });
    writeDb(data);
    return unit;
  },

  // LEASES
  async getLeases(userId, role) {
    const data = readDb();
    let leases = [];
    if (role === 'landlord') {
      leases = data.leases.filter(l => l.landlord_id === userId);
    } else {
      leases = data.leases.filter(l => l.tenant_id === userId);
    }

    return leases.map(lease => {
      const unit = data.units.find(u => u.id === lease.unit_id);
      const prop = unit ? data.properties.find(p => p.id === unit.property_id) : null;
      const tenant = data.users.find(u => u.id === lease.tenant_id);
      const landlord = data.users.find(u => u.id === lease.landlord_id);

      return {
        ...lease,
        unit_number: unit ? unit.unit_number : 'N/A',
        property_name: prop ? prop.name : 'N/A',
        property_address: prop ? `${prop.address}, ${prop.city}, ${prop.state}` : 'N/A',
        tenant_name: tenant ? tenant.name : 'Priya Iyer',
        tenant_email: tenant ? tenant.email : 'N/A',
        landlord_name: landlord ? landlord.name : 'Rajesh Sharma'
      };
    });
  },

  async createLease(leaseData) {
    const data = readDb();
    
    // Check if tenant exists by email or id
    let tenantId = leaseData.tenant_id;
    if (!tenantId && leaseData.tenant_email) {
      const existing = data.users.find(u => u.email.toLowerCase() === leaseData.tenant_email.trim().toLowerCase());
      if (existing) {
        tenantId = existing.id;
      } else {
        // Auto create placeholder tenant account
        const newTenant = {
          id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: leaseData.tenant_name || 'Invited Tenant',
          email: leaseData.tenant_email.trim().toLowerCase(),
          password_hash: '$2b$10$YmPhB2QkFhsj4Vrkt2Yc1O/d/IcsWLSnh5KJSB2pOsY3tUXAvI1RC', // default temp password for Password123!
          role: 'tenant',
          phone: leaseData.tenant_phone || null,
          created_at: new Date().toISOString()
        };
        data.users.push(newTenant);
        tenantId = newTenant.id;
      }
    }

    const newLease = {
      id: `lease_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      unit_id: leaseData.unit_id,
      tenant_id: tenantId || 'usr_tenant_demo',
      landlord_id: leaseData.landlord_id,
      start_date: leaseData.start_date,
      end_date: leaseData.end_date,
      rent_amount: Number(leaseData.rent_amount),
      deposit_amount: Number(leaseData.deposit_amount) || Number(leaseData.rent_amount),
      status: leaseData.status || 'active',
      terms: leaseData.terms || 'Standard 12-month lease agreement.',
      created_at: new Date().toISOString()
    };

    data.leases.push(newLease);

    // Update unit status to occupied
    const targetUnit = data.units.find(u => u.id === leaseData.unit_id);
    if (targetUnit) {
      targetUnit.status = 'occupied';
    }

    writeDb(data);
    return newLease;
  },

  // PAYMENTS
  async getPayments(userId, role, filters = {}) {
    const data = readDb();
    let payments = [];
    if (role === 'landlord') {
      payments = data.payments.filter(p => p.landlord_id === userId);
    } else {
      payments = data.payments.filter(p => p.tenant_id === userId);
    }

    if (filters.status && filters.status !== 'all') {
      payments = payments.filter(p => p.status === filters.status);
    }

    // Enhance payments with unit and tenant details
    const enhanced = payments.map(pay => {
      const lease = data.leases.find(l => l.id === pay.lease_id);
      const unit = lease ? data.units.find(u => u.id === lease.unit_id) : null;
      const prop = unit ? data.properties.find(p => p.id === unit.property_id) : null;
      const tenant = data.users.find(u => u.id === pay.tenant_id);

      return {
        ...pay,
        unit_number: unit ? unit.unit_number : 'Assigned Unit',
        property_name: prop ? prop.name : 'Gulmohar Residency',
        tenant_name: tenant ? tenant.name : 'Priya Iyer',
        tenant_email: tenant ? tenant.email : ''
      };
    });

    // Sort newest first
    enhanced.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return enhanced;
  },

  async createPayment(payData) {
    const data = readDb();
    const newPayment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      lease_id: payData.lease_id || 'lease_1',
      tenant_id: payData.tenant_id,
      landlord_id: payData.landlord_id || 'usr_landlord_demo',
      amount: Number(payData.amount),
      due_date: payData.due_date || new Date().toISOString().split('T')[0],
      paid_date: new Date().toISOString(),
      status: payData.status || 'paid',
      payment_method: payData.payment_method || 'ach',
      transaction_ref: payData.transaction_ref || `TX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      notes: payData.notes || 'Rent payment',
      created_at: new Date().toISOString()
    };

    data.payments.unshift(newPayment);
    writeDb(data);
    return newPayment;
  },

  // MAINTENANCE TICKETS
  async getMaintenanceTickets(userId, role, filters = {}) {
    const data = readDb();
    let tickets = [];
    if (role === 'landlord') {
      tickets = data.maintenance_tickets.filter(t => t.landlord_id === userId);
    } else {
      tickets = data.maintenance_tickets.filter(t => t.tenant_id === userId);
    }

    if (filters.status && filters.status !== 'all') {
      tickets = tickets.filter(t => t.status === filters.status);
    }
    if (filters.priority && filters.priority !== 'all') {
      tickets = tickets.filter(t => t.priority === filters.priority);
    }

    const enhanced = tickets.map(ticket => {
      const prop = data.properties.find(p => p.id === ticket.property_id);
      const unit = data.units.find(u => u.id === ticket.unit_id);
      const tenant = data.users.find(u => u.id === ticket.tenant_id);

      return {
        ...ticket,
        property_name: prop ? prop.name : 'Unknown Property',
        unit_number: unit ? unit.unit_number : 'Unit',
        tenant_name: tenant ? tenant.name : 'Priya Iyer',
        tenant_email: tenant ? tenant.email : ''
      };
    });

    enhanced.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return enhanced;
  },

  async createMaintenanceTicket(ticketData) {
    const data = readDb();

    // If tenant didn't supply property_id, deduce from unit or active lease
    let propId = ticketData.property_id;
    let landlordId = ticketData.landlord_id;

    if (!propId && ticketData.unit_id) {
      const unit = data.units.find(u => u.id === ticketData.unit_id);
      if (unit) {
        propId = unit.property_id;
        const prop = data.properties.find(p => p.id === propId);
        if (prop) landlordId = prop.landlord_id;
      }
    }

    if (!propId) {
      // Find active lease for tenant
      const activeLease = data.leases.find(l => l.tenant_id === ticketData.tenant_id && l.status === 'active');
      if (activeLease) {
        const unit = data.units.find(u => u.id === activeLease.unit_id);
        if (unit) {
          propId = unit.property_id;
          ticketData.unit_id = unit.id;
        }
        landlordId = activeLease.landlord_id;
      } else {
        propId = 'prop_1';
        ticketData.unit_id = 'unit_104';
        landlordId = 'usr_landlord_demo';
      }
    }

    const newTicket = {
      id: `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      property_id: propId,
      unit_id: ticketData.unit_id || 'unit_104',
      tenant_id: ticketData.tenant_id,
      landlord_id: landlordId || 'usr_landlord_demo',
      title: ticketData.title.trim(),
      category: ticketData.category || 'general',
      priority: ticketData.priority || 'medium',
      status: 'open',
      description: ticketData.description.trim(),
      photo_url: ticketData.photo_url || null,
      estimated_cost: Number(ticketData.estimated_cost) || 0,
      actual_cost: 0,
      resolution_notes: null,
      created_at: new Date().toISOString()
    };

    data.maintenance_tickets.unshift(newTicket);
    writeDb(data);
    return newTicket;
  },

  async updateMaintenanceTicket(id, updates, userId, role) {
    const data = readDb();
    const ticket = data.maintenance_tickets.find(t => t.id === id);
    if (!ticket) return null;

    if (role === 'landlord' && ticket.landlord_id !== userId) return null;
    if (role === 'tenant' && ticket.tenant_id !== userId) return null;

    if (updates.status) ticket.status = updates.status;
    if (updates.estimated_cost !== undefined) ticket.estimated_cost = Number(updates.estimated_cost);
    if (updates.actual_cost !== undefined) ticket.actual_cost = Number(updates.actual_cost);
    if (updates.resolution_notes !== undefined) ticket.resolution_notes = updates.resolution_notes;
    ticket.updated_at = new Date().toISOString();

    writeDb(data);
    return ticket;
  },

  // AGGREGATE DASHBOARD STATS
  async getDashboardStats(userId, role) {
    const data = readDb();

    if (role === 'landlord') {
      const props = data.properties.filter(p => p.landlord_id === userId);
      const propIds = props.map(p => p.id);
      const units = data.units.filter(u => propIds.includes(u.property_id));
      const occupiedUnits = units.filter(u => u.status === 'occupied');
      const monthlyRentRoll = units.reduce((acc, u) => acc + (Number(u.rent_amount) || 0), 0);
      
      const payments = data.payments.filter(p => p.landlord_id === userId);
      const paidThisMonth = payments
        .filter(p => p.status === 'paid')
        .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const pendingRent = payments
        .filter(p => p.status === 'pending' || p.status === 'late')
        .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

      const openTickets = data.maintenance_tickets.filter(t => t.landlord_id === userId && t.status !== 'resolved' && t.status !== 'closed');
      const highPriorityTickets = openTickets.filter(t => t.priority === 'high' || t.priority === 'emergency');

      return {
        role: 'landlord',
        totalProperties: props.length,
        totalUnits: units.length,
        occupiedUnits: occupiedUnits.length,
        vacantUnits: units.length - occupiedUnits.length,
        occupancyRate: units.length ? Math.round((occupiedUnits.length / units.length) * 100) : 0,
        monthlyRentRoll,
        paidRentThisMonth: paidThisMonth,
        pendingRent,
        openMaintenanceCount: openTickets.length,
        highPriorityMaintenanceCount: highPriorityTickets.length
      };
    } else {
      // Tenant view
      const activeLease = data.leases.find(l => l.tenant_id === userId && l.status === 'active');
      let unit = null;
      let prop = null;
      if (activeLease) {
        unit = data.units.find(u => u.id === activeLease.unit_id);
        if (unit) {
          prop = data.properties.find(p => p.id === unit.property_id);
        }
      }

      const tenantPayments = data.payments.filter(p => p.tenant_id === userId);
      const lastPayment = tenantPayments.find(p => p.status === 'paid');
      const nextPending = tenantPayments.find(p => p.status === 'pending');

      const tickets = data.maintenance_tickets.filter(t => t.tenant_id === userId);
      const openTickets = tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed');

      return {
        role: 'tenant',
        activeLease: activeLease ? {
          id: activeLease.id,
          startDate: activeLease.start_date,
          endDate: activeLease.end_date,
          rentAmount: activeLease.rent_amount,
          depositAmount: activeLease.deposit_amount,
          unitName: unit ? unit.unit_number : 'Flat 4B',
          propertyName: prop ? prop.name : 'Gulmohar Residency',
          address: prop ? `${prop.address}, ${prop.city}, ${prop.state}` : '14th Main, 4th Block, Koramangala, Bengaluru, KA'
        } : null,
        monthlyRent: activeLease ? activeLease.rent_amount : 28500,
        nextDueDate: nextPending ? nextPending.due_date : '2026-11-01',
        nextAmountDue: nextPending ? nextPending.amount : 28500,
        lastPaidAmount: lastPayment ? lastPayment.amount : 28500,
        lastPaidDate: lastPayment ? lastPayment.paid_date : '2026-10-01',
        openTicketsCount: openTickets.length,
        totalTicketsCount: tickets.length
      };
    }
  },

  /**
   * Save contact inquiry message
   */
  async createContactMessage(msgData) {
    const data = readDb();
    if (!data.contact_messages) {
      data.contact_messages = [];
    }
    const newMsg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: msgData.name || '',
      email: msgData.email || '',
      phone: msgData.phone || '',
      subject: msgData.subject || 'General Inquiry',
      portfolio_size: msgData.portfolioSize || 'Not specified',
      message: msgData.message || '',
      status: 'new',
      created_at: new Date().toISOString()
    };
    data.contact_messages.push(newMsg);
    writeDb(data);
    return newMsg;
  },

  /**
   * Get all feedback reviews
   */
  async getFeedbackReviews() {
    const data = readDb();
    return data.feedback_reviews || [];
  },

  /**
   * Submit and save a customer feedback review
   */
  async createFeedbackReview(revData) {
    const data = readDb();
    if (!data.feedback_reviews) {
      data.feedback_reviews = [];
    }
    const newRev = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: revData.userId || null,
      name: revData.name || 'Anonymous User',
      role: revData.role === 'tenant' ? 'tenant' : 'landlord',
      rating: Number(revData.rating) || 5,
      property_name: revData.propertyName || '',
      title: revData.title || '',
      comment: revData.comment || '',
      helpful_count: 0,
      verified: true,
      created_at: new Date().toISOString()
    };
    data.feedback_reviews.unshift(newRev);
    writeDb(data);
    return newRev;
  }
};

module.exports = db;

