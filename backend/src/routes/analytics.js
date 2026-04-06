import { Router } from 'express';
import db from '../db/database.js';
import { adminOnly } from '../middleware/rbac.js';

const router = Router();

// GET /api/analytics/dashboard - Admin dashboard overview
router.get('/dashboard', adminOnly, (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Overall stats
    const totalVendors = db.prepare('SELECT COUNT(*) as count FROM vendors WHERE is_active = 1').get().count;
    const totalBeneficiaries = db.prepare('SELECT COUNT(*) as count FROM beneficiaries WHERE is_active = 1').get().count;
    
    const totalDistributions = db.prepare(`
      SELECT COUNT(*) as count FROM distributions WHERE month = ? AND year = ? AND status = 'completed'
    `).get(month, year).count;

    const servedBeneficiaries = db.prepare(`
      SELECT COUNT(DISTINCT beneficiary_id) as count FROM distributions WHERE month = ? AND year = ? AND status = 'completed'
    `).get(month, year).count;

    const totalActiveAlerts = db.prepare('SELECT COUNT(*) as count FROM ai_alerts WHERE is_resolved = 0').get().count;

    // Stock overview
    const stockOverview = db.prepare(`
      SELECT c.name as commodity, c.unit,
        SUM(vs.allocated_qty) as total_allocated,
        SUM(vs.distributed_qty) as total_distributed,
        SUM(vs.remaining_qty) as total_remaining,
        ROUND(SUM(vs.distributed_qty) * 100.0 / NULLIF(SUM(vs.allocated_qty), 0), 1) as distribution_pct
      FROM vendor_stock vs
      JOIN commodities c ON c.id = vs.commodity_id
      WHERE vs.month = ? AND vs.year = ?
      GROUP BY vs.commodity_id
      ORDER BY c.name
    `).all(month, year);

    // Vendor performance
    const vendorPerformance = db.prepare(`
      SELECT v.id, v.vendor_code, v.shop_name, v.district,
        (SELECT COUNT(*) FROM beneficiaries b WHERE b.vendor_id = v.id AND b.is_active = 1) as total_beneficiaries,
        (SELECT COUNT(DISTINCT d.beneficiary_id) FROM distributions d WHERE d.vendor_id = v.id AND d.month = ? AND d.year = ? AND d.status = 'completed') as served,
        (SELECT COUNT(*) FROM distributions d WHERE d.vendor_id = v.id AND d.month = ? AND d.year = ?) as transactions
      FROM vendors v
      WHERE v.is_active = 1
      ORDER BY served DESC
    `).all(month, year, month, year);

    // Daily distribution trend (current month)
    const dailyTrend = db.prepare(`
      SELECT date(distributed_at) as date, COUNT(*) as count, SUM(quantity) as total_qty
      FROM distributions
      WHERE month = ? AND year = ? AND status = 'completed'
      GROUP BY date(distributed_at)
      ORDER BY date
    `).all(month, year);

    // Active alerts
    const activeAlerts = db.prepare(`
      SELECT * FROM ai_alerts WHERE is_resolved = 0 ORDER BY 
        CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        created_at DESC
      LIMIT 10
    `).all();

    // District-wise breakdown
    const districtBreakdown = db.prepare(`
      SELECT v.district,
        COUNT(DISTINCT v.id) as vendors,
        COUNT(DISTINCT b.id) as beneficiaries,
        (SELECT COUNT(DISTINCT d.beneficiary_id) FROM distributions d 
         JOIN vendors v2 ON v2.id = d.vendor_id 
         WHERE v2.district = v.district AND d.month = ? AND d.year = ?) as served
      FROM vendors v
      LEFT JOIN beneficiaries b ON b.vendor_id = v.id AND b.is_active = 1
      WHERE v.is_active = 1
      GROUP BY v.district
    `).all(month, year);

    res.json({
      overview: {
        totalVendors,
        totalBeneficiaries,
        totalDistributions,
        servedBeneficiaries,
        pendingBeneficiaries: totalBeneficiaries - servedBeneficiaries,
        distributionRate: totalBeneficiaries > 0 ? Math.round(servedBeneficiaries / totalBeneficiaries * 100) : 0,
        totalActiveAlerts
      },
      stockOverview,
      vendorPerformance,
      dailyTrend,
      activeAlerts,
      districtBreakdown,
      month,
      year
    });
  } catch (err) {
    console.error('Dashboard analytics error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/analytics/trend - Distribution trends
router.get('/trend', adminOnly, (req, res) => {
  try {
    // Last 6 months trend
    const trends = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();

      const stats = db.prepare(`
        SELECT 
          COUNT(*) as distributions,
          COUNT(DISTINCT beneficiary_id) as beneficiaries_served,
          COALESCE(SUM(quantity), 0) as total_quantity
        FROM distributions 
        WHERE month = ? AND year = ? AND status = 'completed'
      `).get(m, y);

      trends.push({
        month: m,
        year: y,
        label: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        ...stats
      });
    }

    res.json({ trends });
  } catch (err) {
    console.error('Trend analytics error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
