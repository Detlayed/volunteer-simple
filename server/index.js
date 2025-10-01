require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fetch = require('node-fetch');
const db = require('./db');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change';

function authMiddleware(req, res, next){
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).json({ error: 'No auth' });
  const parts = auth.split(' ');
  if(parts.length!==2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid auth' });
  const token = parts[1];
  try{
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  }catch(e){ return res.status(401).json({ error: 'Invalid token' }); }
}

// Signup
app.post('/api/signup', async (req,res)=>{
  const { email, password, fullName, iin, phone, city } = req.body || {};
  if(!email || !password) return res.status(400).json({ error: 'email/password required' });
  const existing = await db.getUserByEmail(email);
  if(existing) return res.status(400).json({ error: 'exists' });
  const hash = await bcrypt.hash(password, 10);
  const user = await db.createUser({ email, password_hash: hash, full_name: fullName||'', iin: iin||'', phone: phone||'', city: city||'' });
  const token = jwt.sign({ id: user.id, email: user.email, role: 'volunteer' }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name, phone: user.phone, city: user.city } });
});

// Login
app.post('/api/login', async (req,res)=>{
  const { email, password } = req.body || {};
  if(!email || !password) return res.status(400).json({ error: 'email/password required' });
  const user = await db.getUserByEmail(email);
  if(!user) return res.status(400).json({ error: 'invalid' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if(!ok) return res.status(400).json({ error: 'invalid' });
  const token = jwt.sign({ id: user.id, email: user.email, role: 'volunteer' }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name, phone: user.phone, city: user.city } });
});

// Create request (public)
app.post('/api/requests', async (req,res)=>{
  const { name, city, address, contact, desc } = req.body || {};
  if(!name || !contact || !desc) return res.status(400).json({ error: 'name/contact/desc required' });
  // server-side geocode
  let coords = null;
  try{
    if(address || city){
      const q = [address, city].filter(Boolean).join(', ');
      const nomUrl = 'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(q + ', Казахстан');
      const r = await fetch(nomUrl, { headers: { 'User-Agent': 'volunteer-simple/1.0 (+https://example.org)' } });
      if(r.ok){
        const j = await r.json();
        if(j && j.length>0){ coords = [parseFloat(j[0].lat), parseFloat(j[0].lon)]; }
      }
    }
  }catch(e){ console.warn('geocode failed', e); }
  const created = new Date().toISOString();
  const reqRow = await db.createRequest({ name, city, address, contact, descr: desc, coords: JSON.stringify(coords), status: 'new', created });
  res.json({ ok:true, id: reqRow.id, coords });
});

// List requests (auth required)
app.get('/api/requests', authMiddleware, async (req,res)=>{
  const items = await db.listRequests();
  // parse coords
  items.forEach(it => { try{ it.coords = JSON.parse(it.coords); }catch(e){ it.coords = null; } });
  res.json({ ok:true, data: items });
});

// Update request status (auth required)
app.put('/api/requests/:id/status', authMiddleware, async (req,res)=>{
  const id = req.params.id;
  const { status } = req.body || {};
  if(!status) return res.status(400).json({ error: 'status required' });
  const updated = await db.updateRequestStatus(id, status);
  res.json({ ok:true, updated });
});

app.listen(PORT, ()=> console.log('server started', PORT));
