import db from './database.js';

export function initializeSchema() {
  db.exec(`
    -- Admins table
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'admin' CHECK(role IN ('admin', 'super_admin')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    );

    -- Vendors table
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      shop_name TEXT NOT NULL,
      location TEXT NOT NULL,
      district TEXT NOT NULL,
      license_no TEXT UNIQUE NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    );

    -- Commodities table
    CREATE TABLE IF NOT EXISTS commodities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      unit TEXT NOT NULL DEFAULT 'kg',
      price_per_unit REAL NOT NULL DEFAULT 0,
      category TEXT DEFAULT 'essential'
    );

    -- Beneficiaries table
    CREATE TABLE IF NOT EXISTS beneficiaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      ration_card_no TEXT UNIQUE NOT NULL,
      card_type TEXT NOT NULL CHECK(card_type IN ('AAY', 'PHH', 'APL', 'BPL')),
      phone TEXT,
      address TEXT,
      family_size INTEGER DEFAULT 1,
      vendor_id INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id)
    );

    -- Vendor stock allocation
    CREATE TABLE IF NOT EXISTS vendor_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_id INTEGER NOT NULL,
      commodity_id INTEGER NOT NULL,
      allocated_qty REAL NOT NULL DEFAULT 0,
      distributed_qty REAL NOT NULL DEFAULT 0,
      remaining_qty REAL NOT NULL DEFAULT 0,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id),
      FOREIGN KEY (commodity_id) REFERENCES commodities(id),
      UNIQUE(vendor_id, commodity_id, month, year)
    );

    -- OTP table
    CREATE TABLE IF NOT EXISTS otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      beneficiary_id INTEGER NOT NULL,
      vendor_id INTEGER NOT NULL,
      otp_code TEXT NOT NULL,
      is_used INTEGER DEFAULT 0,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id),
      FOREIGN KEY (vendor_id) REFERENCES vendors(id)
    );

    -- Distribution transactions
    CREATE TABLE IF NOT EXISTS distributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT UNIQUE NOT NULL,
      vendor_id INTEGER NOT NULL,
      beneficiary_id INTEGER NOT NULL,
      commodity_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      entitlement REAL NOT NULL,
      otp_id INTEGER,
      status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed', 'reversed')),
      distributed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id),
      FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id),
      FOREIGN KEY (commodity_id) REFERENCES commodities(id),
      FOREIGN KEY (otp_id) REFERENCES otps(id)
    );

    -- Beneficiary monthly status
    CREATE TABLE IF NOT EXISTS beneficiary_monthly_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      beneficiary_id INTEGER NOT NULL,
      commodity_id INTEGER NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      entitled_qty REAL NOT NULL DEFAULT 0,
      collected_qty REAL NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'partial', 'collected')),
      FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id),
      FOREIGN KEY (commodity_id) REFERENCES commodities(id),
      UNIQUE(beneficiary_id, commodity_id, month, year)
    );

    -- AI alerts
    CREATE TABLE IF NOT EXISTS ai_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_type TEXT NOT NULL CHECK(alert_type IN ('stock_mismatch', 'unserved_beneficiaries', 'distribution_irregularity', 'demand_spike', 'suspicious_pattern')),
      severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      vendor_id INTEGER,
      data TEXT,
      is_resolved INTEGER DEFAULT 0,
      resolved_by INTEGER,
      resolved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id)
    );

    -- Notifications log
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('sms', 'voice', 'push')),
      recipient_phone TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'sent' CHECK(status IN ('pending', 'sent', 'delivered', 'failed')),
      related_type TEXT,
      related_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Entitlement rules
    CREATE TABLE IF NOT EXISTS entitlement_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_type TEXT NOT NULL,
      commodity_id INTEGER NOT NULL,
      qty_per_person REAL NOT NULL,
      max_family_cap INTEGER DEFAULT 10,
      FOREIGN KEY (commodity_id) REFERENCES commodities(id),
      UNIQUE(card_type, commodity_id)
    );

    -- Demand predictions
    CREATE TABLE IF NOT EXISTS demand_predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      commodity TEXT NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      predicted_value REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Grievances
    CREATE TABLE IF NOT EXISTS grievances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      beneficiary_id INTEGER NOT NULL,
      vendor_id INTEGER NOT NULL,
      issue_type TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id),
      FOREIGN KEY (vendor_id) REFERENCES vendors(id)
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_beneficiaries_vendor ON beneficiaries(vendor_id);
    CREATE INDEX IF NOT EXISTS idx_distributions_vendor ON distributions(vendor_id);
    CREATE INDEX IF NOT EXISTS idx_distributions_beneficiary ON distributions(beneficiary_id);
    CREATE INDEX IF NOT EXISTS idx_distributions_month ON distributions(month, year);
    CREATE INDEX IF NOT EXISTS idx_vendor_stock_vendor ON vendor_stock(vendor_id);
    CREATE INDEX IF NOT EXISTS idx_ai_alerts_vendor ON ai_alerts(vendor_id);
    CREATE INDEX IF NOT EXISTS idx_otps_beneficiary ON otps(beneficiary_id);
  `);
}
