import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// GET /api/grievances/mine (Vendor fetching their own inbox)
router.get('/mine', (req, res) => {
  try {
    const grievancesQuery = `
      SELECT 
        id, issue_type, description, status, created_at,
        beneficiary_name, ration_card_no, source_type
      FROM (
        SELECT 
          g.id, g.issue_type, g.description, g.status, g.created_at,
          b.name as beneficiary_name, b.ration_card_no,
          'grievance' as source_type
        FROM grievances g
        JOIN beneficiaries b ON g.beneficiary_id = b.id
        WHERE g.vendor_id = ?
        
        UNION ALL
        
        SELECT
          id, alert_type as issue_type, message as description, 'resolved' as status, resolved_at as created_at,
          'Aahar Admin Bot' as beneficiary_name, 'SYSTEM ACTION' as ration_card_no,
          'alert' as source_type
        FROM ai_alerts
        WHERE vendor_id = ? AND is_resolved = 1
      )
      ORDER BY created_at DESC
    `;
    const records = db.prepare(grievancesQuery).all(req.user.id, req.user.id);
    res.json({ grievances: records });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch your grievances' });
  }
});

// GET /api/grievances (Grouped by vendor for Admin)
router.get('/', (req, res) => {
  try {
    console.log('GET /api/grievances - Admin fetching all grievances');
    const grievancesQuery = `
      SELECT 
        g.id, g.issue_type, g.description, g.status, g.created_at,
        b.name as beneficiary_name, b.ration_card_no,
        v.id as vendor_id, v.shop_name, v.vendor_code
      FROM grievances g
      JOIN beneficiaries b ON g.beneficiary_id = b.id
      JOIN vendors v ON g.vendor_id = v.id
      ORDER BY g.created_at DESC
    `;
    
    const records = db.prepare(grievancesQuery).all();
    
    // Group vendor wise
    const grouped = {};
    records.forEach(r => {
      if (!grouped[r.vendor_id]) {
        grouped[r.vendor_id] = {
          vendor_id: r.vendor_id,
          shop_name: r.shop_name,
          vendor_code: r.vendor_code,
          grievances: []
        };
      }
      grouped[r.vendor_id].grievances.push({
        id: r.id,
        issue_type: r.issue_type,
        description: r.description,
        status: r.status,
        created_at: r.created_at,
        beneficiary_name: r.beneficiary_name,
        ration_card_no: r.ration_card_no
      });
    });

    const result = Object.values(grouped);
    console.log(`GET /api/grievances - Returning ${result.length} vendors with grievances`);
    res.json({ vendorsWithGrievances: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch grievances' });
  }
});

// POST /api/grievances
router.post('/', (req, res) => {
  try {
    if (req.user.type !== 'beneficiary') {
      return res.status(403).json({ error: 'Only beneficiaries can submit grievances.' });
    }

    const { issue_type, description } = req.body;
    if (!issue_type || !description) {
      return res.status(400).json({ error: 'Issue type and description are required.' });
    }

    const beneficiary = db.prepare('SELECT vendor_id FROM beneficiaries WHERE id = ?').get(req.user.id);
    if (!beneficiary) {
      return res.status(404).json({ error: 'Beneficiary not found.' });
    }

    const info = db.prepare(`
      INSERT INTO grievances (beneficiary_id, vendor_id, issue_type, description, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).run(req.user.id, beneficiary.vendor_id, issue_type, description);

    // Broadcast to admin dashboard
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('grievance:new');
    }

    res.status(201).json({ message: 'Grievance submitted successfully.', grievanceId: info.lastInsertRowid });
  } catch (err) {
    console.error('Submit grievance error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
