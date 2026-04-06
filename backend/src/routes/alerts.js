import { Router } from 'express';
import db from '../db/database.js';
import { adminOnly } from '../middleware/rbac.js';
import { runAnomalyDetection, runDemandPrediction } from '../services/ai.js';

const router = Router();

// GET /api/alerts
router.get('/', adminOnly, (req, res) => {
  try {
    const { resolved, severity, type } = req.query;
    const lim = parseInt(req.query.limit) || 1000;
    let where = 'WHERE 1=1';
    const params = [];

    if (resolved !== undefined) {
      where += ' AND is_resolved = ?';
      params.push(resolved === 'true' ? 1 : 0);
    }
    if (severity) { where += ' AND severity = ?'; params.push(severity); }
    if (type) { where += ' AND alert_type = ?'; params.push(type); }

    const alerts = db.prepare(`
      SELECT a.*, v.shop_name as vendor_name, v.vendor_code
      FROM ai_alerts a LEFT JOIN vendors v ON v.id = a.vendor_id
      ${where}
      ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, created_at DESC
      LIMIT ?
    `).all(...params, lim);

    const summary = db.prepare(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN is_resolved=0 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN severity='critical' AND is_resolved=0 THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN severity='high' AND is_resolved=0 THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN severity='medium' AND is_resolved=0 THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN severity='low' AND is_resolved=0 THEN 1 ELSE 0 END) as low
      FROM ai_alerts
    `).get();

    res.json({ alerts, summary });
  } catch (err) {
    console.error('Get alerts error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/alerts/:id/resolve
router.put('/:id/resolve', adminOnly, (req, res) => {
  try {
    const alert = db.prepare('SELECT a.*, v.email as vendor_email, v.shop_name FROM ai_alerts a LEFT JOIN vendors v ON v.id = a.vendor_id WHERE a.id = ?').get(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found.' });
    
    db.prepare('UPDATE ai_alerts SET is_resolved=1, resolved_by=?, resolved_at=CURRENT_TIMESTAMP WHERE id=?')
      .run(req.user.id, alert.id);

    // Trigger Email Notification Sequence
    if (alert.vendor_email) {
      const subject = `Notice: Alert Resolved - ${alert.title}`;
      const body = `Dear ${alert.shop_name} team,\n\nAn alert regarding your shop generated on ${new Date(alert.created_at).toLocaleDateString()} has been reviewed and resolved by the administration team.\n\n--- ALERT REPORT ---\nType: ${alert.alert_type}\nSeverity: ${alert.severity}\nDescription: ${alert.message}\n--------------------\n\nPlease retain this report for your records and ensure strict compliance moving forward.\n\nRegards,\nAahar AI Administration Team`;
      
      console.log(`\n📧 [MOCK EMAIL DISPATCH TO: ${alert.vendor_email}]`);
      console.log(`Subject: ${subject}`);
      console.log(`Body:\n${body}\n`);
    }

    res.json({ message: 'Alert resolved and report emailed successfully.' });
  } catch (err) {
    console.error('Resolve alert error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/alerts/run-detection
router.post('/run-detection', adminOnly, (req, res) => {
  try {
    const newAlerts = runAnomalyDetection();
    if (req.app.get('io')) {
      req.app.get('io').to('admin').emit('alerts:new', { alerts: newAlerts });
    }
    res.json({ message: `Detection completed. ${newAlerts.length} new alerts.`, alerts: newAlerts });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/alerts/predict-demand
router.post('/predict-demand', adminOnly, (req, res) => {
  try {
    const predictions = runDemandPrediction();
    res.json(predictions);
  } catch (err) {
    console.error('Demand prediction error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
