import 'dotenv/config';
import db from './database.js';
import { initializeSchema } from './schema.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

console.log('🌱 Seeding database...\n');

// Initialize schema
initializeSchema();
console.log('✅ Schema created');

const hash = (pw) => bcrypt.hashSync(pw, 10);
const now = new Date();
const month = now.getMonth() + 1;
const year = now.getFullYear();

// 1. Seed Admins
db.prepare(`INSERT OR IGNORE INTO admins (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)`)
  .run('admin', 'admin@aahar.gov.in', hash('admin123'), 'System Administrator', 'super_admin');
db.prepare(`INSERT OR IGNORE INTO admins (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)`)
  .run('district_admin', 'dadmin@aahar.gov.in', hash('admin123'), 'District Administrator', 'admin');
console.log('✅ Admins seeded');

// 2. Seed Commodities
const commodities = [
  ['Rice', 'kg', 3.0, 'essential'],
  ['Wheat', 'kg', 2.0, 'essential'],
  ['Sugar', 'kg', 13.5, 'essential'],
  ['Kerosene', 'litre', 25.0, 'fuel'],
  ['Dal', 'kg', 15.0, 'essential'],
];
const insertCommodity = db.prepare(`INSERT OR IGNORE INTO commodities (name, unit, price_per_unit, category) VALUES (?, ?, ?, ?)`);
for (const c of commodities) insertCommodity.run(...c);
console.log('✅ Commodities seeded');

// 3. Seed Vendors
const vendors = [
  ['VND001', 'Rajesh Kumar', '9876543210', 'rajesh@email.com', hash('vendor123'), 'Kumar Ration Store', 'Sector 15, Noida', 'Gautam Buddha Nagar', 'LIC-2024-001'],
  ['VND002', 'Priya Sharma', '9876543211', 'priya@email.com', hash('vendor123'), 'Sharma Fair Price Shop', 'MG Road, Lucknow', 'Lucknow', 'LIC-2024-002'],
  ['VND003', 'Anil Verma', '9876543212', 'anil@email.com', hash('vendor123'), 'Verma Ration Depot', 'Civil Lines, Agra', 'Agra', 'LIC-2024-003'],
  ['VND004', 'Meena Devi', '9876543213', 'meena@email.com', hash('vendor123'), 'Devi Public Distribution', 'Rajpur Road, Dehradun', 'Dehradun', 'LIC-2024-004'],
  ['VND005', 'Suresh Patel', '9876543214', 'suresh@email.com', hash('vendor123'), 'Patel Ration Center', 'Station Road, Varanasi', 'Varanasi', 'LIC-2024-005'],
];
const insertVendor = db.prepare(`INSERT OR IGNORE INTO vendors (vendor_code, name, phone, email, password_hash, shop_name, location, district, license_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
for (const v of vendors) insertVendor.run(...v);
console.log('✅ Vendors seeded');

// 4. Seed Beneficiaries (40 per vendor = 200 total)
const firstNames = ['Amit', 'Sunita', 'Ravi', 'Kavita', 'Mohan', 'Geeta', 'Vikas', 'Anita', 'Deepak', 'Pooja', 'Sanjay', 'Rekha', 'Manoj', 'Savitri', 'Ashok', 'Kajal', 'Neha', 'Ram', 'Shyam', 'Radha', 'Arjun', 'Seema', 'Tara'];
const lastNames = ['Singh', 'Gupta', 'Yadav', 'Mishra', 'Tiwari', 'Pandey', 'Chauhan', 'Jain', 'Agrawal', 'Dubey', 'Joshi', 'Sharma', 'Patel'];
const cardTypes = ['AAY', 'PHH', 'BPL', 'APL'];

const insertBeneficiary = db.prepare(`INSERT OR IGNORE INTO beneficiaries (name, ration_card_no, card_type, phone, address, family_size, vendor_id) VALUES (?, ?, ?, ?, ?, ?, ?)`);

let beneficiaryCount = 0;
for (let vendorId = 1; vendorId <= 5; vendorId++) {
  for (let j = 0; j < 40; j++) {
    const fn = firstNames[(vendorId * 3 + j) % firstNames.length];
    const ln = lastNames[(vendorId + j) % lastNames.length];
    const name = `${fn} ${ln}`;
    const cardNo = `RC-${String(vendorId).padStart(2, '0')}-${String(j + 1).padStart(4, '0')}`;
    const cardType = cardTypes[j % cardTypes.length];
    const phone = `98${String(10000000 + vendorId * 100 + j).slice(0, 8)}`;
    const familySize = 2 + (j % 5);
    insertBeneficiary.run(name, cardNo, cardType, phone, `Ward ${j + 1}`, familySize, vendorId);
    beneficiaryCount++;
  }
}
console.log(`✅ ${beneficiaryCount} Beneficiaries seeded`);

// 5. Seed Entitlement Rules
const entitlementRules = [
  // card_type, commodity_id, qty_per_person, max_cap
  ['AAY', 1, 5.0, 8],   // Rice 5kg/person
  ['AAY', 2, 5.0, 8],   // Wheat 5kg/person
  ['AAY', 3, 1.0, 8],   // Sugar 1kg/person
  ['AAY', 5, 1.0, 8],   // Dal 1kg/person
  ['PHH', 1, 5.0, 8],
  ['PHH', 2, 5.0, 8],
  ['PHH', 3, 1.0, 8],
  ['PHH', 5, 0.5, 8],
  ['BPL', 1, 3.0, 6],
  ['BPL', 2, 3.0, 6],
  ['BPL', 3, 0.5, 6],
  ['APL', 1, 2.0, 5],
  ['APL', 2, 2.0, 5],
];
const insertRule = db.prepare(`INSERT OR IGNORE INTO entitlement_rules (card_type, commodity_id, qty_per_person, max_family_cap) VALUES (?, ?, ?, ?)`);
for (const r of entitlementRules) insertRule.run(...r);
console.log('✅ Entitlement rules seeded');

// 6. Seed Vendor Stock
const allCommodityIds = db.prepare('SELECT id FROM commodities').all().map(c => c.id);
const allVendorIds = db.prepare('SELECT id FROM vendors').all().map(v => v.id);

const insertStock = db.prepare(`INSERT OR IGNORE INTO vendor_stock (vendor_id, commodity_id, allocated_qty, distributed_qty, remaining_qty, month, year) VALUES (?, ?, ?, ?, ?, ?, ?)`);

for (const vid of allVendorIds) {
  for (const cid of allCommodityIds) {
    const allocated = 200 + Math.floor(Math.random() * 300); // 200-500 units
    const distributed = Math.floor(allocated * (0.2 + Math.random() * 0.5)); // 20-70% distributed
    insertStock.run(vid, cid, allocated, distributed, allocated - distributed, month, year);
  }
}
console.log('✅ Vendor stock seeded');

// 7. Seed some distribution history
const insertDist = db.prepare(`INSERT OR IGNORE INTO distributions (transaction_id, vendor_id, beneficiary_id, commodity_id, quantity, entitlement, status, month, year, distributed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const insertMonthlyStatus = db.prepare(`INSERT OR REPLACE INTO beneficiary_monthly_status (beneficiary_id, commodity_id, month, year, entitled_qty, collected_qty, status) VALUES (?, ?, ?, ?, ?, ?, ?)`);

let distCount = 0;
// For each vendor, distribute to some beneficiaries
for (let vid = 1; vid <= 5; vid++) {
  const bens = db.prepare('SELECT * FROM beneficiaries WHERE vendor_id = ?').all(vid);
  // First 15 beneficiaries have collected
  for (let i = 0; i < 15 && i < bens.length; i++) {
    const ben = bens[i];
    const rules = db.prepare('SELECT er.*, c.name as commodity_name FROM entitlement_rules er JOIN commodities c ON c.id = er.commodity_id WHERE er.card_type = ?').all(ben.card_type);
    
    for (const rule of rules) {
      const entitled = Math.min(rule.qty_per_person * ben.family_size, rule.qty_per_person * rule.max_family_cap);
      const txnId = `TXN-${uuidv4().slice(0, 8).toUpperCase()}`;
      const distDate = new Date(year, month - 1, 1 + Math.floor(Math.random() * 28));
      
      insertDist.run(txnId, vid, ben.id, rule.commodity_id, entitled, entitled, 'completed', month, year, distDate.toISOString());
      insertMonthlyStatus.run(ben.id, rule.commodity_id, month, year, entitled, entitled, 'collected');
      distCount++;
    }
  }
  
  // Next 10 have partial collection
  for (let i = 15; i < 25 && i < bens.length; i++) {
    const ben = bens[i];
    const rules = db.prepare('SELECT er.*, c.name as commodity_name FROM entitlement_rules er JOIN commodities c ON c.id = er.commodity_id WHERE er.card_type = ?').all(ben.card_type);
    
    // Only collect first commodity
    if (rules.length > 0) {
      const rule = rules[0];
      const entitled = Math.min(rule.qty_per_person * ben.family_size, rule.qty_per_person * rule.max_family_cap);
      const txnId = `TXN-${uuidv4().slice(0, 8).toUpperCase()}`;
      const distDate = new Date(year, month - 1, 1 + Math.floor(Math.random() * 28));
      
      insertDist.run(txnId, vid, ben.id, rule.commodity_id, entitled, entitled, 'completed', month, year, distDate.toISOString());
      insertMonthlyStatus.run(ben.id, rule.commodity_id, month, year, entitled, entitled, 'collected');
      distCount++;
    }
    // Mark remaining as pending
    for (let r = 1; r < rules.length; r++) {
      const rule = rules[r];
      const entitled = Math.min(rule.qty_per_person * ben.family_size, rule.qty_per_person * rule.max_family_cap);
      insertMonthlyStatus.run(ben.id, rule.commodity_id, month, year, entitled, 0, 'pending');
    }
  }
  
  // Remaining are fully pending
  for (let i = 25; i < bens.length; i++) {
    const ben = bens[i];
    const rules = db.prepare('SELECT * FROM entitlement_rules WHERE card_type = ?').all(ben.card_type);
    for (const rule of rules) {
      const entitled = Math.min(rule.qty_per_person * ben.family_size, rule.qty_per_person * rule.max_family_cap);
      insertMonthlyStatus.run(ben.id, rule.commodity_id, month, year, entitled, 0, 'pending');
    }
  }
}
console.log(`✅ ${distCount} Distribution records seeded`);

// 8. Seed AI Alerts
const alertData = [
  ['stock_mismatch', 'high', 'Stock Discrepancy Detected', 'Vendor VND001 shows 15kg rice unaccounted. Allocated: 350kg, Distributed: 180kg, Remaining shows 155kg instead of 170kg.', 1],
  ['unserved_beneficiaries', 'medium', 'Low Distribution Rate', 'Vendor VND003 has served only 40% of beneficiaries this month. 6 beneficiaries pending.', 3],
  ['distribution_irregularity', 'critical', 'Unusual Distribution Pattern', 'Vendor VND002 distributed 50kg sugar to single beneficiary RC-02-0003. Max entitlement is 8kg.', 2],
  ['demand_spike', 'low', 'Demand Increase Predicted', 'Based on seasonal trends, wheat demand expected to increase 25% next month in Agra district.', 3],
  ['suspicious_pattern', 'high', 'Multiple Rapid Distributions', 'Vendor VND005 completed 8 distributions within 5 minutes. Pattern suggests possible bypass.', 5],
];
const insertAlert = db.prepare(`INSERT INTO ai_alerts (alert_type, severity, title, message, vendor_id) VALUES (?, ?, ?, ?, ?)`);
for (const a of alertData) insertAlert.run(...a);
console.log('✅ AI alerts seeded');

// 9. Seed Grievances
db.exec('DELETE FROM grievances');
const insertGrievance = db.prepare(`
  INSERT INTO grievances (beneficiary_id, vendor_id, issue_type, description, status)
  VALUES (?, ?, ?, ?, ?)
`);

// Give some dummy grievances tied to vendor 1, 2, and 5
insertGrievance.run(1, 1, 'under_weighing', 'Vendor is giving 2kg less rice than entitled.', 'pending');
insertGrievance.run(2, 1, 'bad_behavior', 'Vendor was very rude and asked to come next week.', 'resolved');
insertGrievance.run(41, 2, 'stock_unavailability', 'Said shop is out of sugar, but app shows stock is available.', 'pending');
insertGrievance.run(45, 2, 'overcharging', 'Asking for Rs 2 extra per kg of Kerosene.', 'investigating');
insertGrievance.run(161, 5, 'biometric_failure', 'Fingerprint machine always broken, denies ration.', 'pending');
insertGrievance.run(162, 5, 'under_weighing', 'Wheat gave was mixed with stones.', 'pending');

console.log('✅ Grievances seeded');

console.log('\n🎉 Database seeded successfully!');
console.log(`   📊 Summary:`);
console.log(`   - 2 Admins`);
console.log(`   - ${commodities.length} Commodities`);
console.log(`   - ${vendors.length} Vendors`);
console.log(`   - ${beneficiaryCount} Beneficiaries`);
console.log(`   - ${distCount} Distribution records`);
console.log(`   - ${alertData.length} AI alerts`);

db.close();
