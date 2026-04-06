import db from './src/db/database.js';

try {
  const grievances = db.prepare('SELECT * FROM grievances').all();
  console.log('--- GRIEVANCES ---');
  console.log(JSON.stringify(grievances, null, 2));
  
  const beneficiaries = db.prepare('SELECT id, name, vendor_id FROM beneficiaries').all();
  console.log('\n--- BENEFICIARIES ---');
  console.log(JSON.stringify(beneficiaries, null, 2));
  
  const vendors = db.prepare('SELECT id, shop_name FROM vendors').all();
  console.log('\n--- VENDORS ---');
  console.log(JSON.stringify(vendors, null, 2));
} catch (err) {
  console.error(err);
}
