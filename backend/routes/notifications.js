const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const { sendEmail } = require('../services/emailService');
const { runReminders } = require('../services/reminderService');

// Get current user's notifications
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user._id,
      organization: req.user.organization._id
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get unread notification count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user._id,
      organization: req.user.organization._id,
      isRead: false
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark a notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark all notifications as read
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, organization: req.user.organization._id, isRead: false },
      { isRead: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send a test email to the current user or a provided email address
router.post('/test-email', auth, async (req, res) => {
  try {
    const toEmail = req.body.to || req.user.email;

    if (!toEmail) {
      return res.status(400).json({ message: 'No recipient email provided' });
    }

    const result = await sendEmail({
      to: toEmail,
      subject: 'DMC Station - Test Email',
      text: 'This is a test email from DMC Station. If you received this, your Brevo SMTP configuration is working correctly.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #667eea;">DMC Station - Test Email</h2>
          <p style="font-size: 16px; color: #333;">This is a test email from DMC Station.</p>
          <p style="font-size: 16px; color: #333;">If you received this, your Brevo SMTP configuration is working correctly.</p>
          <p style="font-size: 14px; color: #999; margin-top: 30px;">Sent at ${new Date().toLocaleString()}</p>
        </div>
      `
    });

    if (!result.success) {
      return res.status(500).json({
        message: 'Failed to send test email',
        error: result.reason
      });
    }

    res.json({
      message: 'Test email sent successfully',
      to: toEmail,
      messageId: result.messageId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Manually trigger reminder checks (admin/ops only - useful for testing)
router.post('/run-now', auth, async (req, res) => {
  try {
    await runReminders();
    res.json({ message: 'Reminder checks executed manually' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
