import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// GET /api/grievances/mine (Vendor fetching their own inbox)
router.get('/mine', (req, res) => {
  try {
    const grievancesQuery = `
      SELECT 
        id, issue_type, description, status, created_at,
        beneficiary_name, ration_card_number, source_type
      FROM (
        SELECT 
          g.id, g.issue_type, g.description, g.status, g.created_at,
          b.name as beneficiary_name, b.ration_card_number,
          'grievance' as source_type
        FROM grievances g
        JOIN beneficiaries b ON g.beneficiary_id = b.id
        WHERE g.vendor_id = ?
        
        UNION ALL
        
        SELECT
          id, alert_type as issue_type, message as description, 'resolved' as status, resolved_at as created_at,
          'Aahar Admin Bot' as beneficiary_name, 'SYSTEM ACTION' as ration_card_number,
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
    const grievancesQuery = `
      SELECT 
        g.id, g.issue_type, g.description, g.status, g.created_at,
        b.name as beneficiary_name, b.ration_card_number,
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
        ration_card_number: r.ration_card_number
      });
    });

    res.json({ vendorsWithGrievances: Object.values(grouped) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch grievances' });
  }
});

export default router;
