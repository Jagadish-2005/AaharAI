import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/database.js';
import { adminOnly } from '../middleware/rbac.js';

const router = Router();

// GET /api/vendors - List all vendors (Admin only)
router.get('/', adminOnly, (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const vendors = db.prepare(`
      SELECT v.*,
        (SELECT COUNT(*) FROM beneficiaries b WHERE b.vendor_id = v.id AND b.is_active = 1) as beneficiary_count,
        (SELECT COALESCE(SUM(vs.allocated_qty), 0) FROM vendor_stock vs WHERE vs.vendor_id = v.id AND vs.month = ? AND vs.year = ?) as total_allocated,
        (SELECT COALESCE(SUM(vs.distributed_qty), 0) FROM vendor_stock vs WHERE vs.vendor_id = v.id AND vs.month = ? AND vs.year = ?) as total_distributed,
        (SELECT COALESCE(SUM(vs.remaining_qty), 0) FROM vendor_stock vs WHERE vs.vendor_id = v.id AND vs.month = ? AND vs.year = ?) as total_remaining,
        (SELECT COUNT(*) FROM distributions d WHERE d.vendor_id = v.id AND d.month = ? AND d.year = ?) as distribution_count
      FROM vendors v
      ORDER BY v.created_at DESC
    `).all(month, year, month, year, month, year, month, year);

    // Remove password hash
    const safeVendors = vendors.map(({ password_hash, ...v }) => v);
    res.json({ vendors: safeVendors, month, year });
  } catch (err) {
    console.error('Get vendors error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/vendors/:id - Get vendor details (Admin only)
router.get('/:id', adminOnly, (req, res) => {
  try {
    const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found.' });

    const { password_hash, ...safeVendor } = vendor;
    
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Get stock details
    const stock = db.prepare(`
      SELECT vs.*, c.name as commodity_name, c.unit 
      FROM vendor_stock vs 
      JOIN commodities c ON c.id = vs.commodity_id 
      WHERE vs.vendor_id = ? AND vs.month = ? AND vs.year = ?
    `).all(vendor.id, month, year);

    // Get recent distributions
    const recentDistributions = db.prepare(`
      SELECT d.*, b.name as beneficiary_name, b.ration_card_no, c.name as commodity_name, c.unit
      FROM distributions d
      JOIN beneficiaries b ON b.id = d.beneficiary_id
      JOIN commodities c ON c.id = d.commodity_id
      WHERE d.vendor_id = ? AND d.month = ? AND d.year = ?
      ORDER BY d.distributed_at DESC
      LIMIT 20
    `).all(vendor.id, month, year);

    // Get beneficiary stats
    const beneficiaryStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN bms.status = 'collected' THEN 1 ELSE 0 END) as collected,
        SUM(CASE WHEN bms.status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN bms.status = 'partial' THEN 1 ELSE 0 END) as partial
      FROM beneficiaries b
      LEFT JOIN beneficiary_monthly_status bms ON bms.beneficiary_id = b.id AND bms.month = ? AND bms.year = ?
      WHERE b.vendor_id = ? AND b.is_active = 1
    `).get(month, year, vendor.id);

    res.json({ vendor: safeVendor, stock, recentDistributions, beneficiaryStats, month, year });
  } catch (err) {
    console.error('Get vendor detail error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/vendors - Create vendor (Admin only)
router.post('/', adminOnly, (req, res) => {
  try {
    const { vendorCode, name, phone, email, password, shopName, location, district, licenseNo } = req.body;
    
    if (!vendorCode || !name || !phone || !password || !shopName || !location || !district || !licenseNo) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    
    const result = db.prepare(`
      INSERT INTO vendors (vendor_code, name, phone, email, password_hash, shop_name, location, district, license_no) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(vendorCode, name, phone, email || null, passwordHash, shopName, location, district, licenseNo);

    res.status(201).json({ id: result.lastInsertRowid, vendorCode, message: 'Vendor created successfully.' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Vendor code or license already exists.' });
    }
    console.error('Create vendor error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/vendors/:id/toggle - Toggle vendor active status (Admin only)
router.put('/:id/toggle', adminOnly, (req, res) => {
  try {
    const vendor = db.prepare('SELECT id, is_active FROM vendors WHERE id = ?').get(req.params.id);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found.' });

    const newStatus = vendor.is_active ? 0 : 1;
    db.prepare('UPDATE vendors SET is_active = ? WHERE id = ?').run(newStatus, vendor.id);

    res.json({ message: `Vendor ${newStatus ? 'activated' : 'deactivated'}.`, is_active: newStatus });
  } catch (err) {
    console.error('Toggle vendor error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
