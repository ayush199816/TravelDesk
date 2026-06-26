const cron = require('node-cron');
const Lead = require('../models/Lead');
const Quote = require('../models/Quote');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendEmail } = require('./emailService');

const REMINDER_HOUR = parseInt(process.env.REMINDER_HOUR) || 9;
const TIMEZONE = 'Asia/Kolkata';

const getISTDateRange = (daysOffset = 0) => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;

  const start = new Date(`${year}-${month}-${day}T00:00:00+05:30`);
  start.setDate(start.getDate() + daysOffset);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const createNotification = async (data) => {
  const existing = await Notification.findOne({
    user: data.user,
    type: data.type,
    relatedId: data.relatedId,
    isRead: false
  });

  if (existing) {
    return existing;
  }

  const notification = new Notification(data);
  await notification.save();
  return notification;
};

const sendReminderEmail = async (user, notification) => {
  if (!user.email) return { success: false, reason: 'no_email' };

  const subject = notification.title;
  const text = notification.message;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">${notification.title}</h2>
      <p style="font-size: 16px; color: #555;">${notification.message}</p>
      <p style="font-size: 14px; color: #999;">DMC Station Reminder</p>
    </div>
  `;

  const result = await sendEmail({ to: user.email, subject, text, html });

  if (result.success) {
    notification.isEmailSent = true;
    notification.emailSentAt = new Date();
    await notification.save();
  }

  return result;
};

const checkFollowUpReminders = async () => {
  const { start, end } = getISTDateRange(0);

  const leads = await Lead.find({
    nextFollowUpDate: { $gte: start, $lt: end }
  }).populate('assignedTo organization');

  for (const lead of leads) {
    if (!lead.assignedTo) continue;

    const title = 'Follow-up Reminder';
    const message = `Follow-up is due today for lead ${lead.name} (${lead.leadNumber}).`;

    const notification = await createNotification({
      user: lead.assignedTo._id,
      organization: lead.organization._id,
      type: 'followup',
      title,
      message,
      relatedId: lead._id,
      relatedModel: 'Lead',
      scheduledAt: lead.nextFollowUpDate
    });

    await sendReminderEmail(lead.assignedTo, notification);
  }
};

const checkTripReminders = async () => {
  const { start, end } = getISTDateRange(2);

  const quotes = await Quote.find({
    travelStartDate: { $gte: start, $lt: end }
  }).populate('createdBy organization');

  for (const quote of quotes) {
    if (!quote.createdBy) continue;

    const title = 'Trip Reminder';
    const message = `Trip for quote ${quote.quoteNumber} is starting in 2 days (${formatDate(quote.travelStartDate)}).`;

    const notification = await createNotification({
      user: quote.createdBy._id,
      organization: quote.organization._id,
      type: 'trip_reminder',
      title,
      message,
      relatedId: quote._id,
      relatedModel: 'Quote',
      scheduledAt: quote.travelStartDate
    });

    await sendReminderEmail(quote.createdBy, notification);
  }
};

const runReminders = async () => {
  console.log('Running reminder checks...', new Date().toISOString());
  try {
    await checkFollowUpReminders();
    await checkTripReminders();
    console.log('Reminder checks completed.');
  } catch (error) {
    console.error('Reminder check error:', error);
  }
};

const startReminderScheduler = () => {
  // Run every day at the configured hour in IST
  const cronExpression = `0 ${REMINDER_HOUR} * * *`;
  console.log(`Reminder scheduler starting. Will run daily at ${REMINDER_HOUR}:00 IST (${TIMEZONE})`);

  const task = cron.schedule(cronExpression, runReminders, {
    timezone: TIMEZONE,
    scheduled: true
  });

  // Add error handling
  task.on('error', (err) => {
    console.error('Cron task error:', err);
  });

  // Log next execution time
  console.log('Next reminder execution:', task.nextDates().toString());

  // Also run once on startup for testing (optional)
  // setTimeout(runReminders, 5000);
};

module.exports = {
  startReminderScheduler,
  runReminders,
  checkFollowUpReminders,
  checkTripReminders
};
