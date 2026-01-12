const express = require('express');
const session = require('express-session');  // ← FIXED!
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// FIXED SESSION MIDDLEWARE
app.use(session({
  secret: 'sarkari-job-portal-2026',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'sarkari123';

// Check admin login
function isAdminLoggedIn(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.redirect('/admin-login');
}

// Admin login page
app.get('/admin-login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html><head><title>Admin Login</title>
    <style>body{font-family:Arial;max-width:400px;margin:100px auto;padding:30px;background:#f5f5f5;}
    input,button{width:100%;padding:15px;margin:10px 0;border:1px solid #ddd;border-radius:5px;font-size:16px;}
    button{background:#e74c3c;color:white;border:none;cursor:pointer;}</style></head>
    <body>
      <h2>🔐 Sarkari Job Portal Login</h2>
      <form method="POST" action="/admin-login">
        <input type="text" name="username" placeholder="admin" required>
        <input type="password" name="password" placeholder="sarkari123" required>
        <button>Login ➤</button>
      </form>
    </body></html>
  `);
});

// Process login
app.post('/admin-login', (req, res) => {
  if (req.body.username === ADMIN_USERNAME && req.body.password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.redirect('/admin');
  } else {
    res.redirect('/admin-login');
  }
});

// Logout
app.get('/admin-logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin-login');
});

// Database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Database Connected!'))
  .catch(err => console.log('❌ Database Error'));

// Job model
const JobSchema = new mongoose.Schema({
  title: String, category: String, link: String, lastDate: String, description: String,
  createdAt: { type: Date, default: Date.now }
});
const Job = mongoose.model('Job', JobSchema);

// Routes
app.get('/', async (req, res) => {
  const jobs = await Job.find().sort({ createdAt: -1 }).limit(15);
  res.render('index', { jobs: jobs || [] });
});

app.get('/admin', isAdminLoggedIn, async (req, res) => {
  const jobs = await Job.find().sort({ createdAt: -1 });
  res.render('admin', { jobs });
});

app.post('/api/jobs', isAdminLoggedIn, async (req, res) => {
  const job = new Job(req.body);
  await job.save();
  res.json({ success: true });
});

app.delete('/api/jobs/:id', isAdminLoggedIn, async (req, res) => {
  await Job.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.listen(3000, () => {
  console.log('🚀 http://localhost:3000');
  console.log('🔐 http://localhost:3000/admin-login');
  console.log('👤 admin / sarkari123');
});
