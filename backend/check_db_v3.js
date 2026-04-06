import db from './src/db/database.js';

try {
  const ids = [76, 78];
  const b = db.prepare('SELECT * FROM beneficiaries WHERE id IN (76, 78)').all();
  console.log('--- TARGET BENEFICIARIES ---');
  console.log(JSON.stringify(b, null, 2));
  
  const vendors = db.prepare('SELECT * FROM vendors WHERE id IN (SELECT vendor_id FROM beneficiaries WHERE id IN (76, 78))').all();
  console.log('\n--- TARGET VENDORS ---');
  console.log(JSON.stringify(vendors, null, 2));

  // Run the ACTUAL query that the admin dashboard uses
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
    console.log('\n--- ADMIN QUERY RESULT COUNT ---');
    console.log(records.length);
    if (records.length > 0) {
      console.log('First record sample:', JSON.stringify(records[0], null, 2));
    }

} catch (err) {
  console.error(err);
}
