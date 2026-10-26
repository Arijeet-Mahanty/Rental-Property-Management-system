/**
 * RentRoll - Dashboard Analytics & Metrics API Routes
 */
const express = require('express');
const router = express.Router();
const db = require('../../database/db');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/dashboard/stats
 * Aggregated live KPI metrics for Landlords and Tenants.
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await db.getDashboardStats(req.user.id, req.user.role);
    return res.json({ success: true, data: stats });
  } catch (err) {
    console.error('[Dashboard Stats Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve dashboard metrics.' });
  }
});

module.exports = router;
