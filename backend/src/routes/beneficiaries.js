import { Router } from 'express';
import db from '../db/database.js';
import { adminOnly, vendorOnly } from '../middleware/rbac.js';

const router = Router();

// GET /api/beneficiaries - List beneficiaries
// Admin: sees all. Vendor: sees only assigned.
router.get('/', (req, res) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE b.is_active = 1';
    const params = [];

    // Vendor can only see their own beneficiaries
    if (req.user.role === 'vendor') {
      whereClause += ' AND b.vendor_id = ?';
      params.push(req.user.id);
    } else if (req.query.vendor_id) {
      whereClause += ' AND b.vendor_id = ?';
      params.push(req.query.vendor_id);
    }

    if (search) {
      whereClause += ' AND (b.name LIKE ? OR b.ration_card_no LIKE ? OR b.phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM beneficiaries b ${whereClause}`;
    const { total } = db.prepare(countQuery).get(...params);

    // Get beneficiaries with their monthly status
    const query = `
      SELECT b.*, v.shop_name as vendor_shop_name, v.vendor_code,
        (SELECT GROUP_CONCAT(
          json_object(
            'commodity_id', bms.commodity_id, 
            'commodity_name', c.name,
            'entitled', bms.entitled_qty, 
            'collected', bms.collected_qty, 
            'status', bms.status
          )
        )
        FROM beneficiary_monthly_status bms
        JOIN commodities c ON c.id = bms.commodity_id
        WHERE bms.beneficiary_id = b.id AND bms.month = ${month} AND bms.year = ${year}
        ) as monthly_status_json
      FROM beneficiaries b
      JOIN vendors v ON v.id = b.vendor_id
      ${whereClause}
      ORDER BY b.name ASC
      LIMIT ? OFFSET ?
    `;

    const beneficiaries = db.prepare(query).all(...params, parseInt(limit), offset);

    // Parse monthly status JSON
    const parsed = beneficiaries.map(b => {
      let monthlyStatus = [];
      if (b.monthly_status_json) {
        try {
          monthlyStatus = b.monthly_status_json.split(',{').map((s, i) => {
            if (i > 0) s = '{' + s;
            return JSON.parse(s);
          });
        } catch {
          monthlyStatus = [];
        }
      }

      // Determine overall collection status
      let overallStatus = 'pending';
      if (monthlyStatus.length > 0) {
        const allCollected = monthlyStatus.every(s => s.status === 'collected');
        const anyCollected = monthlyStatus.some(s => s.status === 'collected' || s.status === 'partial');
        if (allCollected) overallStatus = 'collected';
        else if (anyCollected) overallStatus = 'partial';
      }

      return {
        ...b,
        monthly_status_json: undefined,
        monthlyStatus,
        overallStatus
      };
    });

    // Optionally filter by status
    let result = parsed;
    if (status && status !== 'all') {
      result = parsed.filter(b => b.overallStatus === status);
    }

    res.json({ 
      beneficiaries: result, 
      total, 
      page: parseInt(page), 
      limit: parseInt(limit),
      month, year 
    });
  } catch (err) {
    console.error('Get beneficiaries error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/beneficiaries/:id - Get single beneficiary
router.get('/:id', (req, res) => {
  try {
    const beneficiary = db.prepare(`
      SELECT b.*, v.shop_name, v.vendor_code, v.name as vendor_name
      FROM beneficiaries b
      JOIN vendors v ON v.id = b.vendor_id
      WHERE b.id = ?
    `).get(req.params.id);

    if (!beneficiary) return res.status(404).json({ error: 'Beneficiary not found.' });

    // Vendor can only see their own
    if (req.user.role === 'vendor' && beneficiary.vendor_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Get entitlements and collection status
    const entitlements = db.prepare(`
      SELECT er.*, c.name as commodity_name, c.unit,
        COALESCE(bms.collected_qty, 0) as collected_qty,
        COALESCE(bms.status, 'pending') as collection_status
      FROM entitlement_rules er
      JOIN commodities c ON c.id = er.commodity_id
      LEFT JOIN beneficiary_monthly_status bms ON bms.beneficiary_id = ? AND bms.commodity_id = er.commodity_id AND bms.month = ? AND bms.year = ?
      WHERE er.card_type = ?
    `).all(beneficiary.id, month, year, beneficiary.card_type);

    // Calculate entitled quantities
    const entitlementDetails = entitlements.map(e => ({
      commodityId: e.commodity_id,
      commodityName: e.commodity_name,
      unit: e.unit,
      entitledQty: Math.min(e.qty_per_person * beneficiary.family_size, e.qty_per_person * e.max_family_cap),
      collectedQty: e.collected_qty,
      remainingQty: Math.max(0, Math.min(e.qty_per_person * beneficiary.family_size, e.qty_per_person * e.max_family_cap) - e.collected_qty),
      status: e.collection_status
    }));

    // Get distribution history
    const distributions = db.prepare(`
      SELECT d.*, c.name as commodity_name, c.unit
      FROM distributions d
      JOIN commodities c ON c.id = d.commodity_id
      WHERE d.beneficiary_id = ?
      ORDER BY d.distributed_at DESC
      LIMIT 20
    `).all(beneficiary.id);

    res.json({ beneficiary, entitlements: entitlementDetails, distributions, month, year });
  } catch (err) {
    console.error('Get beneficiary error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/beneficiaries/lookup/:rationCard - Lookup by ration card
router.get('/lookup/:rationCard', (req, res) => {
  try {
    const beneficiary = db.prepare(`
      SELECT b.*, v.shop_name, v.vendor_code
      FROM beneficiaries b
      JOIN vendors v ON v.id = b.vendor_id
      WHERE b.ration_card_no = ? AND b.is_active = 1
    `).get(req.params.rationCard);

    if (!beneficiary) return res.status(404).json({ error: 'Beneficiary not found.' });

    if (req.user.role === 'vendor' && beneficiary.vendor_id !== req.user.id) {
      return res.status(403).json({ error: 'This beneficiary is not assigned to your shop.' });
    }

    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const entitlements = db.prepare(`
      SELECT er.*, c.name as commodity_name, c.unit,
        COALESCE(bms.collected_qty, 0) as collected_qty,
        COALESCE(bms.status, 'pending') as collection_status
      FROM entitlement_rules er
      JOIN commodities c ON c.id = er.commodity_id
      LEFT JOIN beneficiary_monthly_status bms ON bms.beneficiary_id = ? AND bms.commodity_id = er.commodity_id AND bms.month = ? AND bms.year = ?
      WHERE er.card_type = ?
    `).all(beneficiary.id, month, year, beneficiary.card_type);

    const entitlementDetails = entitlements.map(e => ({
      commodityId: e.commodity_id,
      commodityName: e.commodity_name,
      unit: e.unit,
      entitledQty: Math.min(e.qty_per_person * beneficiary.family_size, e.qty_per_person * e.max_family_cap),
      collectedQty: e.collected_qty,
      remainingQty: Math.max(0, Math.min(e.qty_per_person * beneficiary.family_size, e.qty_per_person * e.max_family_cap) - e.collected_qty),
      status: e.collection_status
    }));

    res.json({ beneficiary, entitlements: entitlementDetails, month, year });
  } catch (err) {
    console.error('Lookup beneficiary error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
