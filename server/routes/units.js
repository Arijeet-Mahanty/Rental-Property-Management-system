/**
 * RentRoll - Units API Routes
 */
const express = require('express');
const router = express.Router();
const db = require('../../database/db');
const { authenticateToken, requireLandlord } = require('../middleware/auth');

/**
 * GET /api/units
 * Lists units. Filterable by property_id.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { propertyId } = req.query;
    const landlordId = req.user.role === 'landlord' ? req.user.id : null;
    const units = await db.getUnits(propertyId, landlordId);
    return res.json({ success: true, data: units });
  } catch (err) {
    console.error('[Units List Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve units.' });
  }
});

/**
 * POST /api/units
 * Creates a new unit under a property.
 */
router.post('/', authenticateToken, requireLandlord, async (req, res) => {
  try {
    const { property_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, deposit_amount, status, notes } = req.body;

    if (!property_id || !unit_number || !rent_amount) {
      return res.status(400).json({
        success: false,
        message: 'Property, unit number, and rent amount are required.'
      });
    }

    const newUnit = await db.createUnit({
      property_id,
      unit_number,
      bedrooms,
      bathrooms,
      square_feet,
      rent_amount,
      deposit_amount,
      status,
      notes
    });

    return res.status(201).json({
      success: true,
      message: 'Unit created successfully.',
      data: newUnit
    });
  } catch (err) {
    console.error('[Create Unit Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to create unit.' });
  }
});

/**
 * PUT /api/units/:id
 * Updates unit attributes (status, rent, notes).
 */
router.put('/:id', authenticateToken, requireLandlord, async (req, res) => {
  try {
    const updated = await db.updateUnit(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Unit not found.' });
    }
    return res.json({ success: true, message: 'Unit updated successfully.', data: updated });
  } catch (err) {
    console.error('[Update Unit Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to update unit.' });
  }
});

module.exports = router;
