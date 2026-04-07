const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// ===== MONGODB CONNECTION =====
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err.message));

// ===== CONTACT MESSAGE SCHEMA =====
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  subject: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});

const Contact = mongoose.model('Contact', contactSchema);

// ===== ROUTES =====

// POST /api/contact — Save contact message
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Basic validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email.' });
    }
    if (message.length < 10) {
      return res.status(400).json({ error: 'Message is too short.' });
    }

    const contact = new Contact({ name, email, subject, message });
    await contact.save();

    console.log(`📩 New message from ${name} <${email}> — ${subject}`);
    res.status(201).json({ success: true, message: 'Message received!' });

  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// GET /api/messages — View all messages (protected by secret key)
app.get('/api/admin/messages', async (req, res) => {
  const secret = req.headers['x-admin-key'];

  if (secret !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
// ADMIN STATS ROUTE
app.get('/api/admin/stats', async (req, res) => {
  const secret = req.headers['x-admin-key'];

  if (secret !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const totalLeads = await Contact.countDocuments();
    const unreadLeads = await Contact.countDocuments({ read: false });

    res.json({
      totalVisitors: 0, // optional (you can improve later)
      totalLeads,
      unreadLeads,
      dailyVisitors: [],
      deviceBreakdown: []
    });

  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/health — Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Serve index.html for all non-API routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📁 Serving portfolio from /public`);
});

module.exports = app;
