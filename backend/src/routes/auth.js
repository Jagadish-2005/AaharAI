import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/database.js';
import { generateToken } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/admin/login
router.post('/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (!bcrypt.compareSync(password, admin.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Update last login
    db.prepare('UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(admin.id);

    const token = generateToken({
      id: admin.id,
      username: admin.username,
      role: admin.role,
      type: 'admin'
    });

    res.json({
      token,
      user: {
        id: admin.id,
        username: admin.username,
        fullName: admin.full_name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/auth/vendor/login
router.post('/vendor/login', (req, res) => {
  try {
    const { vendorCode, password } = req.body;
    if (!vendorCode || !password) {
      return res.status(400).json({ error: 'Vendor code and password are required.' });
    }

    const vendor = db.prepare('SELECT * FROM vendors WHERE vendor_code = ? AND is_active = 1').get(vendorCode);
    if (!vendor) {
      return res.status(401).json({ error: 'Invalid credentials or account disabled.' });
    }

    if (!bcrypt.compareSync(password, vendor.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Update last login
    db.prepare('UPDATE vendors SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(vendor.id);

    const token = generateToken({
      id: vendor.id,
      vendorCode: vendor.vendor_code,
      role: 'vendor',
      type: 'vendor'
    });

    res.json({
      token,
      user: {
        id: vendor.id,
        vendorCode: vendor.vendor_code,
        name: vendor.name,
        shopName: vendor.shop_name,
        location: vendor.location,
        district: vendor.district,
        role: 'vendor'
      }
    });
  } catch (err) {
    console.error('Vendor login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/auth/beneficiary/login
router.post('/beneficiary/login', (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    const beneficiary = db.prepare('SELECT id, name, ration_card_no, phone FROM beneficiaries WHERE phone = ? AND is_active = 1').get(phone);
    if (!beneficiary) {
      return res.status(401).json({ error: 'Invalid credentials or account disabled.' });
    }

    const token = generateToken({
      id: beneficiary.id,
      rationCardNo: beneficiary.ration_card_no,
      role: 'beneficiary',
      type: 'beneficiary'
    });

    res.json({
      token,
      user: {
        id: beneficiary.id,
        name: beneficiary.name,
        rationCardNo: beneficiary.ration_card_no,
        phone: beneficiary.phone,
        role: 'beneficiary'
      }
    });
  } catch (err) {
    console.error('Beneficiary login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/auth/me - Get current user info
router.get('/me', (req, res) => {
  // This is used after verifyToken middleware
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  if (req.user.type === 'admin') {
    const admin = db.prepare('SELECT id, username, email, full_name, role FROM admins WHERE id = ?').get(req.user.id);
    return res.json({ user: admin, type: 'admin' });
  } else if (req.user.type === 'beneficiary') {
    const beneficiary = db.prepare(`
      SELECT b.id, b.name, b.ration_card_no as rationCardNo, b.phone, b.address, b.family_size, b.card_type, v.shop_name as vendor_shop_name
      FROM beneficiaries b
      LEFT JOIN vendors v ON v.id = b.vendor_id
      WHERE b.id = ?
    `).get(req.user.id);
    return res.json({ user: { ...beneficiary, role: 'beneficiary' }, type: 'beneficiary' });
  } else {
    const vendor = db.prepare('SELECT id, vendor_code, name, shop_name, location, district, phone FROM vendors WHERE id = ?').get(req.user.id);
    return res.json({ user: vendor, type: 'vendor' });
  }
});

export default router;
