import { Router } from 'express';
import db from '../db/database.js';
import { vendorOnly } from '../middleware/rbac.js';
import { generateOTP, verifyOTP } from '../services/otp.js';
import { v4 as uuidv4 } from 'uuid';
import { sendOTPNotification } from '../services/sms.js';

const router = Router();

// POST /api/distribution/generate-otp - Generate OTP for a beneficiary (Vendor only)
router.post('/generate-otp', vendorOnly, async (req, res) => {
  try {
    const { beneficiaryId, lang = 'en', useVoice = false } = req.body;
    const vendorId = req.user.id;

    if (!beneficiaryId) {
      return res.status(400).json({ error: 'Beneficiary ID is required.' });
    }

    // Verify beneficiary belongs to this vendor
    const beneficiary = db.prepare('SELECT * FROM beneficiaries WHERE id = ? AND vendor_id = ? AND is_active = 1')
      .get(beneficiaryId, vendorId);

    if (!beneficiary) {
      return res.status(404).json({ error: 'Beneficiary not found or not assigned to your shop.' });
    }

    // Get shop name for messaging
    const vendor = db.prepare('SELECT shop_name FROM vendors WHERE id = ?').get(vendorId);

    // Calculate available ration to display in SMS
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const entitlements = db.prepare(`
      SELECT er.*, c.name as commodity_name, c.unit,
        COALESCE(bms.collected_qty, 0) as collected_qty
      FROM entitlement_rules er
      JOIN commodities c ON c.id = er.commodity_id
      LEFT JOIN beneficiary_monthly_status bms ON bms.beneficiary_id = ? AND bms.commodity_id = er.commodity_id AND bms.month = ? AND bms.year = ?
      WHERE er.card_type = ?
    `).all(beneficiaryId, month, year, beneficiary.card_type);

    let rationSummary = '';
    for (const e of entitlements) {
      const entitled = Math.min(e.qty_per_person * beneficiary.family_size, e.qty_per_person * e.max_family_cap);
      const remainingQty = Math.max(0, entitled - e.collected_qty);
      if (remainingQty > 0) {
        rationSummary += `${remainingQty}${e.unit} ${e.commodity_name}, `;
      }
    }
    rationSummary = rationSummary ? rationSummary.slice(0, -2) : 'No pending ration';

    // Generate OTP
    const otpData = generateOTP(beneficiaryId, vendorId);

    // Send SMS / Voice Call
    const simulatedMessage = `Hello ${beneficiary.name}, your Aahar AI ration OTP is ${otpData.otp}. Available: ${rationSummary}. Visit ${vendor.shop_name} to collect.`;
    await sendOTPNotification(beneficiary.phone, {
      name: beneficiary.name,
      otp: otpData.otp,
      rationQty: rationSummary,
      shopName: vendor.shop_name
    }, useVoice, lang);

    res.json({
      message: 'OTP generated and sent successfully.',
      otpId: otpData.id,
      beneficiary: {
        id: beneficiary.id,
        name: beneficiary.name,
        rationCard: beneficiary.ration_card_no,
        phone: beneficiary.phone
      },
      expiresAt: otpData.expiresAt,
      // For demo purposes, we still return it so the UI can auto-fill instead of actually waiting for the SMS
      otp: otpData.otp,
      simulatedMessage: (useVoice ? '(Ringing...) ' : '') + simulatedMessage
    });
  } catch (err) {
    console.error('Generate OTP error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/distribution/verify-otp - Verify OTP (Vendor only)
router.post('/verify-otp', vendorOnly, (req, res) => {
  try {
    const { beneficiaryId, otp } = req.body;
    const vendorId = req.user.id;

    if (!beneficiaryId || !otp) {
      return res.status(400).json({ error: 'Beneficiary ID and OTP are required.' });
    }

    const result = verifyOTP(beneficiaryId, vendorId, otp);
    if (!result.valid) {
      return res.status(400).json({ error: result.error });
    }

    // Get beneficiary entitlements for distribution
    const beneficiary = db.prepare('SELECT * FROM beneficiaries WHERE id = ?').get(beneficiaryId);
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    const entitlements = db.prepare(`
      SELECT er.*, c.name as commodity_name, c.unit,
        COALESCE(bms.collected_qty, 0) as collected_qty,
        COALESCE(bms.status, 'pending') as collection_status
      FROM entitlement_rules er
      JOIN commodities c ON c.id = er.commodity_id
      LEFT JOIN beneficiary_monthly_status bms ON bms.beneficiary_id = ? AND bms.commodity_id = er.commodity_id AND bms.month = ? AND bms.year = ?
      WHERE er.card_type = ?
    `).all(beneficiaryId, month, year, beneficiary.card_type);

    const entitlementDetails = entitlements.map(e => {
      const entitled = Math.min(e.qty_per_person * beneficiary.family_size, e.qty_per_person * e.max_family_cap);
      return {
        commodityId: e.commodity_id,
        commodityName: e.commodity_name,
        unit: e.unit,
        entitledQty: entitled,
        collectedQty: e.collected_qty,
        remainingQty: Math.max(0, entitled - e.collected_qty),
        status: e.collection_status
      };
    }).filter(e => e.remainingQty > 0); // Only show items not yet fully collected

    res.json({
      verified: true,
      otpId: result.otpId,
      beneficiary: {
        id: beneficiary.id,
        name: beneficiary.name,
        rationCard: beneficiary.ration_card_no,
        cardType: beneficiary.card_type,
        familySize: beneficiary.family_size
      },
      entitlements: entitlementDetails
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/distribution/distribute - Process distribution (Vendor only)
router.post('/distribute', vendorOnly, (req, res) => {
  try {
    const { beneficiaryId, otpId, items } = req.body;
    const vendorId = req.user.id;
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    if (!beneficiaryId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Beneficiary ID and distribution items are required.' });
    }

    // Verify beneficiary
    const beneficiary = db.prepare('SELECT * FROM beneficiaries WHERE id = ? AND vendor_id = ? AND is_active = 1')
      .get(beneficiaryId, vendorId);
    if (!beneficiary) {
      return res.status(404).json({ error: 'Beneficiary not found.' });
    }

    const transactions = [];
    const errors = [];

    const insertDist = db.prepare(`
      INSERT INTO distributions (transaction_id, vendor_id, beneficiary_id, commodity_id, quantity, entitlement, otp_id, status, month, year)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)
    `);

    const updateStock = db.prepare(`
      UPDATE vendor_stock 
      SET distributed_qty = distributed_qty + ?, remaining_qty = remaining_qty - ?, updated_at = CURRENT_TIMESTAMP
      WHERE vendor_id = ? AND commodity_id = ? AND month = ? AND year = ? AND remaining_qty >= ?
    `);

    const upsertMonthly = db.prepare(`
      INSERT INTO beneficiary_monthly_status (beneficiary_id, commodity_id, month, year, entitled_qty, collected_qty, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(beneficiary_id, commodity_id, month, year)
      DO UPDATE SET collected_qty = collected_qty + ?, status = ?
    `);

    // Use a transaction for atomicity
    const distributeTransaction = db.transaction(() => {
      for (const item of items) {
        const { commodityId, quantity } = item;

        // Get entitlement rule
        const rule = db.prepare('SELECT * FROM entitlement_rules WHERE card_type = ? AND commodity_id = ?')
          .get(beneficiary.card_type, commodityId);
        
        if (!rule) {
          errors.push(`No entitlement rule for commodity ${commodityId}`);
          continue;
        }

        const maxEntitled = Math.min(rule.qty_per_person * beneficiary.family_size, rule.qty_per_person * rule.max_family_cap);

        // Check what's already collected
        const existing = db.prepare('SELECT collected_qty FROM beneficiary_monthly_status WHERE beneficiary_id = ? AND commodity_id = ? AND month = ? AND year = ?')
          .get(beneficiaryId, commodityId, month, year);
        
        const alreadyCollected = existing ? existing.collected_qty : 0;
        const remaining = maxEntitled - alreadyCollected;

        if (remaining <= 0) {
          errors.push(`Commodity ${commodityId}: already fully collected.`);
          continue;
        }

        const actualQty = Math.min(quantity, remaining);

        // Check vendor stock
        const stockResult = updateStock.run(actualQty, actualQty, vendorId, commodityId, month, year, actualQty);
        if (stockResult.changes === 0) {
          errors.push(`Commodity ${commodityId}: insufficient stock.`);
          continue;
        }

        // Record transaction
        const txnId = `TXN-${uuidv4().slice(0, 8).toUpperCase()}`;
        insertDist.run(txnId, vendorId, beneficiaryId, commodityId, actualQty, maxEntitled, otpId || null, month, year);

        // Update monthly status
        const newCollected = alreadyCollected + actualQty;
        const newStatus = newCollected >= maxEntitled ? 'collected' : 'partial';
        
        if (existing) {
          upsertMonthly.run(beneficiaryId, commodityId, month, year, maxEntitled, actualQty, newStatus, actualQty, newStatus);
        } else {
          db.prepare(`INSERT INTO beneficiary_monthly_status (beneficiary_id, commodity_id, month, year, entitled_qty, collected_qty, status) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(beneficiaryId, commodityId, month, year, maxEntitled, actualQty, newStatus);
        }

        transactions.push({
          transactionId: txnId,
          commodityId,
          quantity: actualQty,
          entitled: maxEntitled,
          status: 'completed'
        });
      }
    });

    distributeTransaction();

    // Mark OTP as used
    if (otpId) {
      db.prepare('UPDATE otps SET is_used = 1 WHERE id = ?').run(otpId);
    }

    // Emit real-time event
    if (req.app.get('io')) {
      const io = req.app.get('io');
      
      // Emit to admin dashboard
      io.to('admin').emit('distribution:completed', {
        vendorId,
        beneficiaryId,
        beneficiaryName: beneficiary.name,
        transactions,
        timestamp: new Date().toISOString()
      });

      // Emit updated stock to vendor room
      const updatedStock = db.prepare(`
        SELECT vs.*, c.name as commodity_name, c.unit 
        FROM vendor_stock vs 
        JOIN commodities c ON c.id = vs.commodity_id 
        WHERE vs.vendor_id = ? AND vs.month = ? AND vs.year = ?
      `).all(vendorId, month, year);

      io.to(`vendor:${vendorId}`).emit('stock:updated', { stock: updatedStock });
      io.to('admin').emit('stock:updated', { vendorId, stock: updatedStock });
    }

    res.json({
      message: 'Distribution completed successfully.',
      transactions,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error('Distribution error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/distribution/history - Get distribution history
router.get('/history', (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE d.month = ? AND d.year = ?';
    const params = [month, year];

    if (req.user.role === 'vendor') {
      whereClause += ' AND d.vendor_id = ?';
      params.push(req.user.id);
    } else if (req.query.vendor_id) {
      whereClause += ' AND d.vendor_id = ?';
      params.push(req.query.vendor_id);
    }

    const distributions = db.prepare(`
      SELECT d.*, b.name as beneficiary_name, b.ration_card_no, c.name as commodity_name, c.unit, v.shop_name as vendor_name
      FROM distributions d
      JOIN beneficiaries b ON b.id = d.beneficiary_id
      JOIN commodities c ON c.id = d.commodity_id
      JOIN vendors v ON v.id = d.vendor_id
      ${whereClause}
      ORDER BY d.distributed_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const { total } = db.prepare(`SELECT COUNT(*) as total FROM distributions d ${whereClause}`).get(...params);

    res.json({ distributions, total, page, limit, month, year });
  } catch (err) {
    console.error('Distribution history error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/distribution/vendor-stock - Get current vendor's stock (Vendor only)
router.get('/vendor-stock', vendorOnly, (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const stock = db.prepare(`
      SELECT vs.*, c.name as commodity_name, c.unit, c.price_per_unit
      FROM vendor_stock vs
      JOIN commodities c ON c.id = vs.commodity_id
      WHERE vs.vendor_id = ? AND vs.month = ? AND vs.year = ?
    `).all(req.user.id, month, year);

    res.json({ stock, month, year });
  } catch (err) {
    console.error('Vendor stock error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/distribution/vendor-dashboard - Vendor dashboard data
router.get('/vendor-dashboard', vendorOnly, (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const vendorId = req.user.id;

    // Stock summary
    const stock = db.prepare(`
      SELECT vs.*, c.name as commodity_name, c.unit
      FROM vendor_stock vs
      JOIN commodities c ON c.id = vs.commodity_id
      WHERE vs.vendor_id = ? AND vs.month = ? AND vs.year = ?
    `).all(vendorId, month, year);

    // Beneficiary stats
    const totalBeneficiaries = db.prepare('SELECT COUNT(*) as count FROM beneficiaries WHERE vendor_id = ? AND is_active = 1').get(vendorId).count;

    const servedBeneficiaries = db.prepare(`
      SELECT COUNT(DISTINCT d.beneficiary_id) as count 
      FROM distributions d 
      WHERE d.vendor_id = ? AND d.month = ? AND d.year = ? AND d.status = 'completed'
    `).get(vendorId, month, year).count;

    // Today's distributions
    const today = new Date().toISOString().split('T')[0];
    const todayDistributions = db.prepare(`
      SELECT COUNT(*) as count FROM distributions 
      WHERE vendor_id = ? AND date(distributed_at) = ? AND status = 'completed'
    `).get(vendorId, today).count;

    // Recent activity
    const recentActivity = db.prepare(`
      SELECT d.*, b.name as beneficiary_name, b.ration_card_no, c.name as commodity_name, c.unit
      FROM distributions d
      JOIN beneficiaries b ON b.id = d.beneficiary_id
      JOIN commodities c ON c.id = d.commodity_id
      WHERE d.vendor_id = ? AND d.month = ? AND d.year = ?
      ORDER BY d.distributed_at DESC
      LIMIT 10
    `).all(vendorId, month, year);

    res.json({
      stock,
      totalBeneficiaries,
      servedBeneficiaries,
      pendingBeneficiaries: totalBeneficiaries - servedBeneficiaries,
      todayDistributions,
      recentActivity,
      month,
      year
    });
  } catch (err) {
    console.error('Vendor dashboard error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
