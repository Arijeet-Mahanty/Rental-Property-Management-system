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

// POST /api/feedback - Submit a new review
router.post('/', async (req, res) => {
  try {
    const { name, role, rating, propertyName, title, comment } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
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
      name: name.trim(),
      role: role === 'tenant' ? 'tenant' : 'landlord',
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
