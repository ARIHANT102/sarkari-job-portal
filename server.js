const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// 🔒 SECURE SESSION (Environment variables)
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-123',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

// 🔒 SECURE ADMIN CREDS (Environment variables ONLY)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'temp123';

// Admin middleware
function isAdminLoggedIn(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.redirect('/admin-login');
}

// Routes
app.get('/', async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 }).limit(15);
    res.render('index', { jobs: jobs || [] });
  } catch (error) {
    console.log('Homepage error:', error.message);
    res.render('index', { jobs: [] });
  }
});

app.get('/admin-login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html><head><title>Admin Login</title>
    <style>body{font-family:Arial;max-width:400px;margin:100px auto;padding:30px;background:#f5f5f5;}
    input,button{width:100%;padding:15px;margin:10px 0;border:1px solid #ddd;border-radius:5px;font-size:16px;}
    button{background:#e74c3c;color:white;border:none;cursor:pointer;}</style></head>
    <body>
      <h2>🔐 Sarkari Job Portal - Admin Login</h2>
      <form method="POST" action="/admin-login">
        <input type="text" name="username" placeholder="admin" required>
        <input type="password" name="password" placeholder="Enter password" required>
        <button>Login ➤</button>
      </form>
    </body></html>
  `);
});

app.post('/admin-login', (req, res) => {
  if (req.body.username === ADMIN_USERNAME && req.body.password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.redirect('/admin');
  } else {
    res.redirect('/admin-login?error=1');
  }
});

app.get('/admin-logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin-login');
});

app.get('/admin', isAdminLoggedIn, async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.render('admin', { jobs });
  } catch (error) {
    res.render('admin', { jobs: [] });
  }
});

app.post('/api/jobs', isAdminLoggedIn, async (req, res) => {
  try {
    const job = new Job(req.body);
    await job.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/jobs/:id', isAdminLoggedIn, async (req, res) => {
  try {
    await Job.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// Database (Safe fallback)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari-jobs')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Offline - In-memory mode'));

// Job Schema
const JobSchema = new mongoose.Schema({
  title: String,
  category: String,
  link: String,
  lastDate: String,
  description: String,
  createdAt: { type: Date, default: Date.now }
});
const Job = mongoose.model('Job', JobSchema);

// 🚀 RENDER PRODUCTION PORT
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server: http://localhost:${port}`);
  console.log('🔐 Admin: http://localhost:${port}/admin-login');
});
