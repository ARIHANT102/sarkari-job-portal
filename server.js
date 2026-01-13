const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');

const app = express();

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://sarkariuser:Sarkari123456@YOUR-CLUSTER.mongodb.net/sarkari_jobs', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected!'))
.catch(err => console.log('❌ MongoDB Error:', err));

// ✅ UPDATED SCHEMA - impDate + Multiple Links
const jobSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    impDate: { type: Date, required: true },           // Changed from lastDate
    primaryLink: { type: String, required: true },
    secondaryLinkName: String,
    secondaryLink: String,
    description: String,
    createdAt: { type: Date, default: Date.now }
});

const Job = mongoose.model('Job', jobSchema);

app.use(session({
    secret: 'sarkari-job-portal-2026',
    resave: false,
    saveUninitialized: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

function requireAdmin(req, res, next) {
    if (req.session.isAdmin) return next();
    res.redirect('/admin-login');
}

// Routes
app.get('/', async (req, res) => {
    try {
        const jobs = await Job.find().sort({ createdAt: -1 }).limit(12);
        res.render('index', { jobs });
    } catch (err) {
        res.render('index', { jobs: [] });
    }
});

app.get('/admin-login', (req, res) => {
    res.render('login');
});

app.post('/admin-login', (req, res) => {
    if (req.body.username === ADMIN_USER && req.body.password === ADMIN_PASS) {
        req.session.isAdmin = true;
        res.redirect('/admin');
    } else {
        res.render('login', { error: '❌ Wrong credentials!' });
    }
});

app.get('/admin-logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin-login');
});

app.get('/admin', requireAdmin, async (req, res) => {
    try {
        const jobs = await Job.find().sort({ createdAt: -1 });
        res.render('admin', { jobs });
    } catch (err) {
        res.render('admin', { jobs: [] });
    }
});

app.post('/api/jobs', requireAdmin, async (req, res) => {
    try {
        const job = new Job(req.body);
        await job.save();
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

app.delete('/api/jobs/:id', requireAdmin, async (req, res) => {
    try {
        await Job.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ success: false });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`🚀 SARKARI JOB PORTAL on port ${port}`);
});
