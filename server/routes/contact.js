/**
 * RentRoll - Contact Inquiries API Route
 * Handles landing page contact inquiries and demo requests
 */
const express = require('express');
const router = express.Router();
const db = require('../../database/db');

// POST /api/contact - Submit a contact message or demo request
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, portfolioSize, message } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Your name is required.'
      });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required.'
      });
    }

    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a message with at least 5 characters.'
      });
    }

    const savedMessage = await db.createContactMessage({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? String(phone).trim() : '',
      subject: subject ? String(subject).trim() : 'General Inquiry',
      portfolioSize: portfolioSize ? String(portfolioSize).trim() : 'Not specified',
      message: message.trim()
    });

    console.log(`[Contact API] Received inquiry from ${savedMessage.name} <${savedMessage.email}> - "${savedMessage.subject}"`);

    return res.status(201).json({
      success: true,
      message: 'Thank you for contacting RentRoll! Our specialist team will reach out to you within 2 business hours.',
      inquiryId: savedMessage.id
    });
  } catch (err) {
    console.error('[Contact API Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while submitting your inquiry. Please try again or email support@rentroll.io directly.'
    });
  }
});

module.exports = router;
