import db from './src/db/database.js';

try {
  const grievances = db.prepare('SELECT * FROM grievances').all();
  console.log('Total Grievances:', grievances.length);
  if (grievances.length > 0) {
    console.log(JSON.stringify(grievances, null, 2));
  }
  
  const beneficiaries = db.prepare('SELECT id, name, vendor_id FROM beneficiaries LIMIT 5').all();
  console.log('\n--- SAMPLE BENEFICIARIES ---');
  console.log(JSON.stringify(beneficiaries, null, 2));
} catch (err) {
  console.error(err);
}
