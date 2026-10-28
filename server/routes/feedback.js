/**
 * RentRoll - Customer Feedback & Reviews API Route
 * Handles fetching verified customer testimonials and submitting new feedback
 */
const express = require('express');
const router = express.Router();
const db = require('../../database/db');

// GET /api/feedback - Retrieve custom customer reviews
router.get('/', async (req, res) => {
  try {
    const reviews = await db.getFeedbackReviews();
    return res.json({
      success: true,
      reviews
    });
  } catch (err) {
    console.error('[Feedback API Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve feedback reviews.'
    });
  }
});

// POST /api/feedback - Submit a new review (Authenticated Landlords & Tenants Only)
router.post('/', async (req, res) => {
  try {
    // 1. Verify user authentication via Bearer token or HttpOnly cookie
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'rentroll_phase2_jwt_secret_secure_key_2026';
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[1] && parts[1] !== 'null' && parts[1] !== 'undefined') {
        token = parts[1].trim();
      }
    }

    if (!token && req.cookies && req.cookies.token && req.cookies.token !== 'null' && req.cookies.token !== 'undefined') {
      token = req.cookies.token.trim();
    }

    let authUser = null;
    if (token) {
      try {
        authUser = jwt.verify(token, JWT_SECRET);
      } catch (tokenErr) {
        // Token invalid or expired
      }
    }

    // Require authenticated session
    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Only logged-in landlords and tenants can submit reviews.'
      });
    }

    const { rating, propertyName, title, comment } = req.body;
    const authorName = (authUser.name || req.body.name || '').trim();
    const authorRole = (authUser.role === 'tenant' ? 'tenant' : 'landlord');

    if (!authorName) {
      return res.status(400).json({
        success: false,
        message: 'Name is required to submit a review.'
      });
    }

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A short review headline is required.'
      });
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide feedback of at least 10 characters.'
      });
    }

    const review = await db.createFeedbackReview({
      userId: authUser.id,
      name: authorName,
      role: authorRole,
      rating: Number(rating) || 5,
      propertyName: propertyName ? String(propertyName).trim() : '',
      title: title.trim(),
      comment: comment.trim()
    });

    console.log(`[Feedback API] New review posted by ${review.name} (${review.role}): "${review.title}"`);

    return res.status(201).json({
      success: true,
      message: 'Thank you for your feedback! Your review has been submitted.',
      review
    });
  } catch (err) {
    console.error('[Feedback API Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit feedback review.'
    });
  }
});

module.exports = router;
