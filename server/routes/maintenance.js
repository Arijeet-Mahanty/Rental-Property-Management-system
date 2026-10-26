/**
 * RentRoll - Maintenance Tickets API Routes
 */
const express = require('express');
const router = express.Router();
const db = require('../../database/db');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/maintenance
 * Returns maintenance tickets for landlord's portfolio or tenant's unit.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, priority } = req.query;
    const tickets = await db.getMaintenanceTickets(req.user.id, req.user.role, { status, priority });
    return res.json({ success: true, data: tickets });
  } catch (err) {
    console.error('[Maintenance List Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve maintenance tickets.' });
  }
});

/**
 * POST /api/maintenance
 * Submits a new repair ticket.
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, priority, unit_id, property_id } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required.'
      });
    }

    const newTicket = await db.createMaintenanceTicket({
      tenant_id: req.user.role === 'tenant' ? req.user.id : 'usr_tenant_demo',
      landlord_id: req.user.role === 'landlord' ? req.user.id : 'usr_landlord_demo',
      unit_id,
      property_id,
      title,
      description,
      category: category || 'general',
      priority: priority || 'medium'
    });

    return res.status(201).json({
      success: true,
      message: 'Maintenance ticket submitted successfully.',
      data: newTicket
    });
  } catch (err) {
    console.error('[Create Maintenance Ticket Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit maintenance ticket.' });
  }
});

/**
 * PUT /api/maintenance/:id
 * Updates ticket status, notes, and costs.
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await db.updateMaintenanceTicket(
      req.params.id,
      req.body,
      req.user.id,
      req.user.role
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Ticket not found or unauthorized.' });
    }

    return res.json({
      success: true,
      message: 'Ticket updated successfully.',
      data: updated
    });
  } catch (err) {
    console.error('[Update Maintenance Ticket Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to update ticket.' });
  }
});

module.exports = router;
