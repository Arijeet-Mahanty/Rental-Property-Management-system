/**
 * RentRoll - Properties API Routes
 */
const express = require('express');
const router = express.Router();
const db = require('../../database/db');
const { authenticateToken, requireLandlord } = require('../middleware/auth');

/**
 * GET /api/properties
 * Returns all properties owned by the authenticated landlord.
 */
router.get('/', authenticateToken, requireLandlord, async (req, res) => {
  try {
    const properties = await db.getProperties(req.user.id);
    return res.json({ success: true, data: properties });
  } catch (err) {
    console.error('[Properties List Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch properties.' });
  }
});

/**
 * POST /api/properties
 * Creates a new rental property.
 */
router.post('/', authenticateToken, requireLandlord, async (req, res) => {
  try {
    const { name, address, city, state, zip_code, property_type } = req.body;

    if (!name || !address || !city || !state || !zip_code) {
      return res.status(400).json({
        success: false,
        message: 'Name, address, city, state, and zip code are required.'
      });
    }

    const newProp = await db.createProperty({
      landlord_id: req.user.id,
      name,
      address,
      city,
      state,
      zip_code,
      property_type
    });

    return res.status(201).json({
      success: true,
      message: 'Property created successfully.',
      data: newProp
    });
  } catch (err) {
    console.error('[Create Property Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to create property.' });
  }
});

/**
 * GET /api/properties/:id
 * Fetches a single property with unit details.
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const prop = await db.getPropertyById(req.params.id);
    if (!prop) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }
    return res.json({ success: true, data: prop });
  } catch (err) {
    console.error('[Get Property Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve property.' });
  }
});

/**
 * DELETE /api/properties/:id
 * Removes a property and cascades to units.
 */
router.delete('/:id', authenticateToken, requireLandlord, async (req, res) => {
  try {
    const success = await db.deleteProperty(req.params.id, req.user.id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Property not found or unauthorized.' });
    }
    return res.json({ success: true, message: 'Property deleted successfully.' });
  } catch (err) {
    console.error('[Delete Property Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete property.' });
  }
});

module.exports = router;
