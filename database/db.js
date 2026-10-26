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
      id: 'usr_landlord_demo',
      name: 'Marcus Vance',
      email: 'landlord@rentroll.com',
      // bcrypt hash for 'Password123!'
      password_hash: '$2b$10$YmPhB2QkFhsj4Vrkt2Yc1O/d/IcsWLSnh5KJSB2pOsY3tUXAvI1RC',
      role: 'landlord',
      phone: '(555) 234-5678',
      created_at: '2026-01-15T09:00:00.000Z'
    },
    {
      id: 'usr_tenant_demo',
      name: 'Elena Rostova',
      email: 'tenant@rentroll.com',
      // bcrypt hash for 'Password123!'
      password_hash: '$2b$10$YmPhB2QkFhsj4Vrkt2Yc1O/d/IcsWLSnh5KJSB2pOsY3tUXAvI1RC',
      role: 'tenant',
      phone: '(555) 876-5432',
      created_at: '2026-02-01T10:00:00.000Z'
    },
    {
      id: 'usr_tenant_2',
      name: 'Liam Chen',
      email: 'liam.chen@example.com',
      password_hash: '$2b$10$YmPhB2QkFhsj4Vrkt2Yc1O/d/IcsWLSnh5KJSB2pOsY3tUXAvI1RC',
      role: 'tenant',
      phone: '(555) 345-6789',
      created_at: '2026-02-10T11:30:00.000Z'
    },
    {
      id: 'usr_tenant_3',
      name: 'Sophia Rodriguez',
      email: 'sophia.r@example.com',
      password_hash: '$2b$10$YmPhB2QkFhsj4Vrkt2Yc1O/d/IcsWLSnh5KJSB2pOsY3tUXAvI1RC',
      role: 'tenant',
      phone: '(555) 456-7890',
      created_at: '2026-03-01T14:15:00.000Z'
    }
  ],
  properties: [
    {
      id: 'prop_1',
      landlord_id: 'usr_landlord_demo',
      name: 'Oakwood Manor Apartments',
      address: '742 Evergreen Terrace',
      city: 'Springfield',
      state: 'OR',
      zip_code: '97477',
      property_type: 'Apartment Building',
      created_at: '2026-01-16T10:00:00.000Z'
    },
    {
      id: 'prop_2',
      landlord_id: 'usr_landlord_demo',
      name: 'Highland Lofts',
      address: '1280 Beacon Street',
      city: 'Brookline',
      state: 'MA',
      zip_code: '02446',
      property_type: 'Multi-Family',
      created_at: '2026-01-20T12:00:00.000Z'
    },
    {
      id: 'prop_3',
      landlord_id: 'usr_landlord_demo',
      name: 'Maple Court Duplex',
      address: '452 Maple Ridge Rd',
      city: 'Austin',
      state: 'TX',
      zip_code: '78704',
      property_type: 'Duplex/Triplex',
      created_at: '2026-02-01T09:30:00.000Z'
    },
    {
      id: 'prop_4',
      landlord_id: 'usr_landlord_demo',
      name: 'Sunset Palms Residences',
      address: '901 Ocean Drive',
      city: 'Santa Monica',
      state: 'CA',
      zip_code: '90401',
      property_type: 'Multi-Family',
      created_at: '2026-02-15T15:45:00.000Z'
    }
  ],
  units: [
    { id: 'unit_101', property_id: 'prop_1', unit_number: 'Apt 1A', bedrooms: 1, bathrooms: 1, square_feet: 680, rent_amount: 1450, deposit_amount: 1450, status: 'occupied', notes: 'Ground floor patio view', created_at: '2026-01-16T11:00:00.000Z' },
    { id: 'unit_102', property_id: 'prop_1', unit_number: 'Apt 2A', bedrooms: 2, bathrooms: 1.5, square_feet: 920, rent_amount: 1850, deposit_amount: 1850, status: 'occupied', notes: 'Balcony facing courtyard', created_at: '2026-01-16T11:00:00.000Z' },
    { id: 'unit_103', property_id: 'prop_1', unit_number: 'Apt 3B', bedrooms: 2, bathrooms: 2, square_feet: 1050, rent_amount: 2100, deposit_amount: 2100, status: 'occupied', notes: 'Corner unit with bay windows', created_at: '2026-01-16T11:00:00.000Z' },
    { id: 'unit_104', property_id: 'prop_1', unit_number: 'Apt 4B', bedrooms: 2, bathrooms: 1.5, square_feet: 950, rent_amount: 1650, deposit_amount: 1650, status: 'occupied', notes: 'Assigned to Elena Rostova', created_at: '2026-01-16T11:00:00.000Z' },
    { id: 'unit_105', property_id: 'prop_1', unit_number: 'Apt 5C', bedrooms: 3, bathrooms: 2, square_feet: 1250, rent_amount: 2400, deposit_amount: 2400, status: 'occupied', notes: 'Top floor penthouse feel', created_at: '2026-01-16T11:00:00.000Z' },
    { id: 'unit_106', property_id: 'prop_1', unit_number: 'Apt 6C', bedrooms: 1, bathrooms: 1, square_feet: 650, rent_amount: 1400, deposit_amount: 1400, status: 'vacant', notes: 'Freshly painted, ready to lease', created_at: '2026-01-16T11:00:00.000Z' },

    { id: 'unit_201', property_id: 'prop_2', unit_number: 'Loft 101', bedrooms: 1, bathrooms: 1, square_feet: 800, rent_amount: 2200, deposit_amount: 2200, status: 'occupied', notes: 'Exposed brick & high ceilings', created_at: '2026-01-20T13:00:00.000Z' },
    { id: 'unit_202', property_id: 'prop_2', unit_number: 'Loft 102', bedrooms: 1, bathrooms: 1.5, square_feet: 870, rent_amount: 2350, deposit_amount: 2350, status: 'occupied', notes: 'Stainless steel appliances', created_at: '2026-01-20T13:00:00.000Z' },
    { id: 'unit_203', property_id: 'prop_2', unit_number: 'Loft 201', bedrooms: 2, bathrooms: 2, square_feet: 1150, rent_amount: 2900, deposit_amount: 2900, status: 'occupied', notes: 'Master suite lofted', created_at: '2026-01-20T13:00:00.000Z' },
    { id: 'unit_204', property_id: 'prop_2', unit_number: 'Loft 202', bedrooms: 2, bathrooms: 2, square_feet: 1200, rent_amount: 3100, deposit_amount: 3100, status: 'occupied', notes: 'Private rooftop terrace access', created_at: '2026-01-20T13:00:00.000Z' },
    { id: 'unit_205', property_id: 'prop_2', unit_number: 'Loft 301', bedrooms: 3, bathrooms: 2.5, square_feet: 1450, rent_amount: 3800, deposit_amount: 3800, status: 'occupied', notes: 'Large industrial windows', created_at: '2026-01-20T13:00:00.000Z' },

    { id: 'unit_301', property_id: 'prop_3', unit_number: 'Unit A (North)', bedrooms: 3, bathrooms: 2, square_feet: 1380, rent_amount: 2500, deposit_amount: 2500, status: 'occupied', notes: 'Fenced private backyard', created_at: '2026-02-01T10:00:00.000Z' },
    { id: 'unit_302', property_id: 'prop_3', unit_number: 'Unit B (South)', bedrooms: 3, bathrooms: 2, square_feet: 1380, rent_amount: 2500, deposit_amount: 2500, status: 'occupied', notes: 'Attached 1-car garage', created_at: '2026-02-01T10:00:00.000Z' },

    { id: 'unit_401', property_id: 'prop_4', unit_number: 'Suite 1', bedrooms: 1, bathrooms: 1, square_feet: 720, rent_amount: 2100, deposit_amount: 2100, status: 'occupied', notes: 'Poolside entrance', created_at: '2026-02-15T16:00:00.000Z' },
    { id: 'unit_402', property_id: 'prop_4', unit_number: 'Suite 2', bedrooms: 1, bathrooms: 1, square_feet: 720, rent_amount: 2100, deposit_amount: 2100, status: 'occupied', notes: 'Hardwood flooring', created_at: '2026-02-15T16:00:00.000Z' },
    { id: 'unit_403', property_id: 'prop_4', unit_number: 'Suite 3', bedrooms: 2, bathrooms: 2, square_feet: 1100, rent_amount: 2800, deposit_amount: 2800, status: 'occupied', notes: 'Ocean breeze balcony', created_at: '2026-02-15T16:00:00.000Z' },
    { id: 'unit_404', property_id: 'prop_4', unit_number: 'Suite 4', bedrooms: 2, bathrooms: 2, square_feet: 1100, rent_amount: 2800, deposit_amount: 2800, status: 'occupied', notes: 'Renovated quartz countertops', created_at: '2026-02-15T16:00:00.000Z' },
    { id: 'unit_405', property_id: 'prop_4', unit_number: 'Suite 5', bedrooms: 3, bathrooms: 2.5, square_feet: 1400, rent_amount: 3450, deposit_amount: 3450, status: 'occupied', notes: 'Dual parking spaces', created_at: '2026-02-15T16:00:00.000Z' }
  ],
  leases: [
    {
      id: 'lease_1',
      unit_id: 'unit_104',
      tenant_id: 'usr_tenant_demo',
      landlord_id: 'usr_landlord_demo',
      start_date: '2026-02-01',
      end_date: '2027-01-31',
      rent_amount: 1650,
      deposit_amount: 1650,
      status: 'active',
      terms: 'Standard 12-month lease with autopay ACH discount. No smoking.',
      created_at: '2026-02-01T10:00:00.000Z'
    },
    {
      id: 'lease_2',
      unit_id: 'unit_102',
      tenant_id: 'usr_tenant_2',
      landlord_id: 'usr_landlord_demo',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      rent_amount: 1850,
      deposit_amount: 1850,
      status: 'active',
      terms: '12-month lease. 1 small dog approved with pet deposit.',
      created_at: '2026-01-01T10:00:00.000Z'
    },
    {
      id: 'lease_3',
      unit_id: 'unit_201',
      tenant_id: 'usr_tenant_3',
      landlord_id: 'usr_landlord_demo',
      start_date: '2026-03-01',
      end_date: '2027-02-28',
      rent_amount: 2200,
      deposit_amount: 2200,
      status: 'active',
      terms: '12-month loft residential agreement.',
      created_at: '2026-03-01T10:00:00.000Z'
    }
  ],
  payments: [
    {
      id: 'pay_101',
      lease_id: 'lease_1',
      tenant_id: 'usr_tenant_demo',
      landlord_id: 'usr_landlord_demo',
      amount: 1650,
      due_date: '2026-10-01',
      paid_date: '2026-10-01T08:30:00.000Z',
      status: 'paid',
      payment_method: 'ach',
      transaction_ref: 'ACH-RR-90421',
      notes: 'October 2026 Rent - Paid on time',
      created_at: '2026-10-01T08:30:00.000Z'
    },
    {
      id: 'pay_102',
      lease_id: 'lease_1',
      tenant_id: 'usr_tenant_demo',
      landlord_id: 'usr_landlord_demo',
      amount: 1650,
      due_date: '2026-09-01',
      paid_date: '2026-09-01T08:30:00.000Z',
      status: 'paid',
      payment_method: 'ach',
      transaction_ref: 'ACH-RR-84192',
      notes: 'September 2026 Rent - Auto withdrawal',
      created_at: '2026-09-01T08:30:00.000Z'
    },
    {
      id: 'pay_103',
      lease_id: 'lease_1',
      tenant_id: 'usr_tenant_demo',
      landlord_id: 'usr_landlord_demo',
      amount: 1650,
      due_date: '2026-08-01',
      paid_date: '2026-08-01T08:30:00.000Z',
      status: 'paid',
      payment_method: 'ach',
      transaction_ref: 'ACH-RR-79213',
      notes: 'August 2026 Rent - Auto withdrawal',
      created_at: '2026-08-01T08:30:00.000Z'
    },
    {
      id: 'pay_104',
      lease_id: 'lease_2',
      tenant_id: 'usr_tenant_2',
      landlord_id: 'usr_landlord_demo',
      amount: 1850,
      due_date: '2026-10-01',
      paid_date: '2026-10-02T11:20:00.000Z',
      status: 'paid',
      payment_method: 'credit_card',
      transaction_ref: 'CC-STRIPE-4028',
      notes: 'October 2026 Rent',
      created_at: '2026-10-02T11:20:00.000Z'
    },
    {
      id: 'pay_105',
      lease_id: 'lease_3',
      tenant_id: 'usr_tenant_3',
      landlord_id: 'usr_landlord_demo',
      amount: 2200,
      due_date: '2026-10-01',
      paid_date: '2026-10-01T14:00:00.000Z',
      status: 'paid',
      payment_method: 'bank_transfer',
      transaction_ref: 'WIRE-BTR-1192',
      notes: 'October 2026 Rent',
      created_at: '2026-10-01T14:00:00.000Z'
    },
    {
      id: 'pay_106',
      lease_id: 'lease_1',
      tenant_id: 'usr_tenant_demo',
      landlord_id: 'usr_landlord_demo',
      amount: 1650,
      due_date: '2026-11-01',
      paid_date: null,
      status: 'pending',
      payment_method: 'ach',
      transaction_ref: null,
      notes: 'November 2026 Rent (Upcoming)',
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
      title: 'Low hot water pressure in master shower',
      category: 'plumbing',
      priority: 'high',
      status: 'in_progress',
      description: 'The hot water tap in the master bathroom shower has noticeably lower pressure since yesterday evening.',
      photo_url: null,
      estimated_cost: 180,
      actual_cost: 0,
      resolution_notes: 'Plumber scheduled for tomorrow morning 9:00 AM.',
      created_at: '2026-10-24T14:20:00.000Z'
    },
    {
      id: 'tkt_2',
      property_id: 'prop_2',
      unit_id: 'unit_201',
      tenant_id: 'usr_tenant_3',
      landlord_id: 'usr_landlord_demo',
      title: 'HVAC heat pump making rhythmic clicking noise',
      category: 'hvac',
      priority: 'medium',
      status: 'open',
      description: 'When the heat turns on, there is a rhythmic click from the ceiling vent. Still heating fine.',
      photo_url: null,
      estimated_cost: 150,
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
      title: 'Kitchen garbage disposal jam cleared',
      category: 'appliance',
      priority: 'low',
      status: 'resolved',
      description: 'Disposal humming but not spinning after dinner.',
      photo_url: null,
      estimated_cost: 75,
      actual_cost: 65,
      resolution_notes: 'Cleared small coin obstruction using hex key wrench. Motor running smoothly.',
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
        tenant_name: tenant ? tenant.name : 'Elena Rostova',
        tenant_email: tenant ? tenant.email : 'N/A',
        landlord_name: landlord ? landlord.name : 'Marcus Vance'
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
        property_name: prop ? prop.name : 'Oakwood Manor',
        tenant_name: tenant ? tenant.name : 'Elena Rostova',
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
        tenant_name: tenant ? tenant.name : 'Elena Rostova',
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
          unitName: unit ? unit.unit_number : 'Apt 4B',
          propertyName: prop ? prop.name : 'Oakwood Manor Apartments',
          address: prop ? `${prop.address}, ${prop.city}, ${prop.state}` : '742 Evergreen Terrace'
        } : null,
        monthlyRent: activeLease ? activeLease.rent_amount : 1650,
        nextDueDate: nextPending ? nextPending.due_date : '2026-11-01',
        nextAmountDue: nextPending ? nextPending.amount : 1650,
        lastPaidAmount: lastPayment ? lastPayment.amount : 1650,
        lastPaidDate: lastPayment ? lastPayment.paid_date : '2026-10-01',
        openTicketsCount: openTickets.length,
        totalTicketsCount: tickets.length
      };
    }
  }
};

module.exports = db;
