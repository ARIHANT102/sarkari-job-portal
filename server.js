const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');

const app = express();

// MIDDLEWARE - MUST BE FIRST
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

// YOUR MONGODB CONNECTION - FIXED
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://lbabu0229_db_user:v5RrK2rstSRIMJea@job-portal-cluster.fdz9oqh.mongodb.net/sarkari_jobs?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected Successfully!'))
.catch(err => console.log('❌ MongoDB Error:', err.message));

// JOB SCHEMA - NEW FIELDS
const jobSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    impDate: { type: Date, required: true },
    primaryLink: { type: String, required: true },
    secondaryLinkName: { type: String },
    secondaryLink: { type: String },
    description: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const Job = mongoose.model('Job', jobSchema);

// SESSION
app.use(session({
    secret: 'sarkari-job-portal-secret-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// ADMIN MIDDLEWARE
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

function requireAdmin(req, res, next) {
    if (req.session.isAdmin) {
        return next();
    }
    res.redirect('/admin-login');
}

// ROUTES
app.get('/', async (req, res) => {
    try {
        const jobs = await Job.find().sort({ createdAt: -1 }).limit(12);
        res.render('index', { jobs });
    } catch (error) {
        console.error('Homepage error:', error);
        res.render('index', { jobs: [] });
    }
});

// Admin Login
app.get('/admin-login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/admin-login', (req, res) => {
    if (req.body.username === ADMIN_USER && req.body.password === ADMIN_PASS) {
        req.session.isAdmin = true;
        res.redirect('/admin');
    } else {
        res.render('login', { error: '❌ Invalid credentials! Try: admin / admin123' });
    }
});

app.get('/admin-logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin-login');
});

// Admin Dashboard
app.get('/admin', requireAdmin, async (req, res) => {
    try {
        const jobs = await Job.find().sort({ createdAt: -1 });
        res.render('admin', { jobs });
    } catch (error) {
        console.error('Admin error:', error);
        res.render('admin', { jobs: [] });
    }
});

// Add Job API
app.post('/api/jobs', requireAdmin, async (req, res) => {
    try {
        const job = new Job({
            title: req.body.title,
            category: req.body.category,
            impDate: new Date(req.body.impDate),
            primaryLink: req.body.primaryLink,
            secondaryLinkName: req.body.secondaryLinkName,
            secondaryLink: req.body.secondaryLink,
            description: req.body.description
        });
        await job.save();
        res.json({ success: true, message: 'Job added successfully!' });
    } catch (error) {
        console.error('Add job error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Delete Job API
app.delete('/api/jobs/:id', requireAdmin, async (req, res) => {
    try {
        await Job.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Job deleted!' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// 404 Handler
app.use((req, res) => {
    res.status(404).send(`
        <h1 style="text-align: center; padding: 50px; color: #dc3545;">
            404 - Page Not Found 🚫
        </h1>
        <p style="text-align: center;">
            <a href="/">← Go Home</a> | 
            <a href="/admin-login">Admin Login</a>
        </p>
    `);
});

// Global Error Handler - LAST
app.use((err, req, res, next) => {
    console.error('🚨 SERVER ERROR:', err.stack);
    res.status(500).send(`
        <h1 style="text-align: center; padding: 50px; color: #dc3545;">
            Internal Server Error 😵
        </h1>
        <p style="text-align: center;">Check server logs for details</p>
    `);
});

// START SERVER
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 SARKARI JOB PORTAL running on port ${port}`);
    console.log(`📱 Home: http://localhost:${port}`);
    console.log(`🔐 Admin: http://localhost:${port}/admin-login`);
});
