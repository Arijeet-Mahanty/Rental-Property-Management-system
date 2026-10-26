/**
 * RentRoll - Payments & Ledger API Routes
 */
const express = require('express');
const router = express.Router();
const db = require('../../database/db');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/payments
 * Returns payment transactions ledger, filterable by status.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    const payments = await db.getPayments(req.user.id, req.user.role, { status });
    return res.json({ success: true, data: payments });
  } catch (err) {
    console.error('[Payments List Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve payments ledger.' });
  }
});

/**
 * POST /api/payments
 * Records a payment (Landlord logging offline check/cash or Tenant paying online).
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { lease_id, amount, payment_method, notes, tenant_id, due_date } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid payment amount is required.'
      });
    }

    const payerId = req.user.role === 'tenant' ? req.user.id : (tenant_id || 'usr_tenant_demo');
    const landlordId = req.user.role === 'landlord' ? req.user.id : 'usr_landlord_demo';

    const newPayment = await db.createPayment({
      lease_id: lease_id || 'lease_1',
      tenant_id: payerId,
      landlord_id: landlordId,
      amount: Number(amount),
      due_date: due_date || new Date().toISOString().split('T')[0],
      payment_method: payment_method || (req.user.role === 'tenant' ? 'ach' : 'check'),
      notes: notes || (req.user.role === 'tenant' ? 'Online Rent Payment' : 'Manual Payment Recorded')
    });

    return res.status(201).json({
      success: true,
      message: 'Payment recorded successfully.',
      data: newPayment
    });
  } catch (err) {
    console.error('[Create Payment Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to record payment.' });
  }
});

module.exports = router;
