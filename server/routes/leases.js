/**
 * RentRoll - Leases API Routes
 */
const express = require('express');
const router = express.Router();
const db = require('../../database/db');
const { authenticateToken, requireLandlord } = require('../middleware/auth');

/**
 * GET /api/leases
 * Lists leases for landlord or tenant.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const leases = await db.getLeases(req.user.id, req.user.role);
    return res.json({ success: true, data: leases });
  } catch (err) {
    console.error('[Leases List Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve leases.' });
  }
});

/**
 * POST /api/leases
 * Creates a lease agreement and links tenant to unit.
 */
router.post('/', authenticateToken, requireLandlord, async (req, res) => {
  try {
    const { unit_id, tenant_email, tenant_name, tenant_phone, start_date, end_date, rent_amount, deposit_amount, terms } = req.body;

    if (!unit_id || !start_date || !end_date || !rent_amount) {
      return res.status(400).json({
        success: false,
        message: 'Unit, start date, end date, and rent amount are required.'
      });
    }

    const newLease = await db.createLease({
      unit_id,
      tenant_email,
      tenant_name,
      tenant_phone,
      landlord_id: req.user.id,
      start_date,
      end_date,
      rent_amount,
      deposit_amount,
      terms
    });

    return res.status(201).json({
      success: true,
      message: 'Lease agreement created successfully.',
      data: newLease
    });
  } catch (err) {
    console.error('[Create Lease Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to create lease.' });
  }
});

module.exports = router;
