const express = require('express');
const session = require('express-session');

// In-memory fallback (MongoDB later)
let jobs = [];

const app = express();

// Session middleware FIRST
app.use(session({
  secret: process.env.SESSION_SECRET || 'sarkari123',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }  // Render needs this
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function isAdminLoggedIn(req, res, next) {
  if (req.session?.isAdmin) return next();
  res.redirect('/admin-login');
}

// Routes - NO MONGO DB BLOCKING
app.get('/', (req, res) => {
  res.render('index', { jobs: jobs.slice(0, 15) });
});

app.get('/admin-login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html><head><title>Admin Login</title>
    <style>body{font-family:Arial;max-width:400px;margin:100px auto;padding:30px;background:#f5f5f5;}
    input,button{width:100%;padding:15px;margin:10px 0;border:1px solid #ddd;border-radius:5px;font-size:16px;}
    button{background:#e74c3c;color:white;border:none;cursor:pointer;}
    .debug{color:#666;}</style></head>
    <body>
      <h2>🔐 Sarkari Job Portal Login</h2>
      <p class="debug"><strong>Username:</strong> admin</p>
      <p class="debug"><strong>Password:</strong> ${process.env.ADMIN_PASSWORD ? '✅ ENV Set' : 'admin123'}</p>
      <form method="POST" action="/admin-login">
        <input type="text" name="username" placeholder="admin" required>
        <input type="password" name="password" placeholder="Enter password" required>
        <button>Login ➤</button>
      </form>
    </body></html>
  `);
});

app.post('/admin-login', (req, res) => {
  console.log('Login attempt:', req.body.username, 'Password:', req.body.password ? '****' : 'empty');
  console.log('Expected password:', ADMIN_PASSWORD ? '****' : 'none');
  
  if (req.body.username === ADMIN_USERNAME && req.body.password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    console.log('✅ LOGIN SUCCESS');
    res.redirect('/admin');
  } else {
    console.log('❌ LOGIN FAILED');
    res.redirect('/admin-login?error=1');
  }
});

app.get('/admin-logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin-login');
});

app.get('/admin', isAdminLoggedIn, (req, res) => {
  res.render('admin', { jobs });
});

app.post('/api/jobs', isAdminLoggedIn, (req, res) => {
  jobs.unshift({ ...req.body, _id: Date.now().toString() });
  res.json({ success: true });
});

app.delete('/api/jobs/:id', isAdminLoggedIn, (req, res) => {
  jobs = jobs.filter(job => job._id !== req.params.id);
  res.json({ success: true });
});

// Render port
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server: port ${port}`);
  console.log('🔐 Login: http://localhost:${port}/admin-login');
  console.log('👤 admin / ${process.env.ADMIN_PASSWORD || "admin123"}');
});
