import db from '../db/database.js';

export function runAnomalyDetection() {
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  const newAlerts = [];

  const addAlert = (type, severity, title, message, vendorId, data = null) => {
    // Prevent duplicate alert spam
    const exists = db.prepare(`
      SELECT id FROM ai_alerts WHERE alert_type = ? AND vendor_id = ? AND is_resolved = 0
    `).get(type, vendorId);
    
    if (!exists) {
      db.prepare(`
        INSERT INTO ai_alerts (alert_type, severity, title, message, vendor_id, data) 
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(type, severity, title, message, vendorId, data ? JSON.stringify(data) : null);
      
      newAlerts.push({ type, severity, title, message, vendorId });
    }
  };

  const vendors = db.prepare('SELECT * FROM vendors WHERE is_active = 1').all();

  // 1. Stock checks
  const stocks = db.prepare(`
    SELECT vs.*, v.vendor_code, v.shop_name,
      (SELECT COALESCE(SUM(d.quantity), 0) FROM distributions d 
       WHERE d.vendor_id = vs.vendor_id AND d.commodity_id = vs.commodity_id AND d.month = vs.month AND d.year = vs.year AND d.status = 'completed'
      ) as actual_distributed
    FROM vendor_stock vs
    JOIN vendors v ON v.id = vs.vendor_id
    WHERE vs.month = ? AND vs.year = ?
  `).all(month, year);

  for (const s of stocks) {
    const expectedRemaining = s.allocated_qty - s.actual_distributed;
    const discrepancy = Math.abs(expectedRemaining - s.remaining_qty);
    
    // Stock Mismatch Detection
    if (discrepancy > 5) {
      addAlert('stock_mismatch', discrepancy > 20 ? 'critical' : 'high',
        `Stock Discrepancy: ${s.shop_name}`,
        `Vendor ${s.vendor_code} shows ${discrepancy.toFixed(1)}kg discrepancy. Expected remaining: ${expectedRemaining.toFixed(1)}, but inventory cache shows: ${s.remaining_qty.toFixed(1)}.`,
        s.vendor_id
      );
    }
    
    // Over-distribution detection
    if (s.distributed_qty > s.allocated_qty) {
      addAlert('distribution_irregularity', 'critical',
        `Over-distribution: ${s.shop_name}`,
        `Distributed ${s.distributed_qty} exceeds allocated ${s.allocated_qty} quota.`,
        s.vendor_id
      );
    }

    // Zero distribution alert
    if (s.allocated_qty > 0 && s.actual_distributed === 0 && new Date().getDate() > 5) {
      addAlert('unserved_beneficiaries', 'medium',
        `Zero Distribution: ${s.shop_name}`,
        `No transactions logged this month despite having active stock.`,
        s.vendor_id
      );
    }

    // Stock update inconsistency
    if (Math.abs(s.distributed_qty - s.actual_distributed) > 1) {
      addAlert('stock_mismatch', 'high',
        `Inconsistent Stock Sync: ${s.shop_name}`,
        `Total transactions (${s.actual_distributed.toFixed(1)}) mismatch vendor's general ledger (${s.distributed_qty.toFixed(1)}).`,
        s.vendor_id
      );
    }
  }

  for (const v of vendors) {
    // High Pending Beneficiaries
    const total = db.prepare('SELECT COUNT(*) as c FROM beneficiaries WHERE vendor_id = ? AND is_active = 1').get(v.id).c;
    const served = db.prepare(`SELECT COUNT(DISTINCT beneficiary_id) as c FROM distributions WHERE vendor_id = ? AND month = ? AND year = ?`).get(v.id, month, year).c;
    const rate = total > 0 ? (served / total) * 100 : 100;

    if (rate < 50 && total > 0) {
      addAlert('unserved_beneficiaries', rate < 25 ? 'high' : 'medium',
        `High Pending Beneficiaries: ${v.shop_name}`,
        `Only ${rate.toFixed(0)}% beneficiaries served (${served}/${total}). Users unserved beyond expected time.`,
        v.id
      );
    }

    // Duplicate distribution alert
    const duplicates = db.prepare(`
      SELECT beneficiary_id, commodity_id, COUNT(*) as count 
      FROM distributions 
      WHERE vendor_id = ? AND month = ? AND year = ? AND status = 'completed'
      GROUP BY beneficiary_id, commodity_id
      HAVING count > 1
    `).all(v.id, month, year);

    if (duplicates.length > 0) {
      addAlert('distribution_irregularity', 'critical',
        `Duplicate Distributions Detected: ${v.shop_name}`,
        `Beneficiaries caught trying to collect ration quotas more than once this month (${duplicates.length} instances).`,
        v.id
      );
    }

    // Unusual distribution pattern (too many in one minute)
    const spikes = db.prepare(`
      SELECT substr(distributed_at, 1, 16) as minute, COUNT(*) as txn_count
      FROM distributions
      WHERE vendor_id = ? AND month = ? AND year = ?
      GROUP BY minute
      HAVING txn_count > 5
    `).all(v.id, month, year);

    if (spikes.length > 0) {
      addAlert('suspicious_pattern', 'high',
        `Unusual Rate of Transactions: ${v.shop_name}`,
        `Recorded massive spike: ${spikes[0].txn_count} transactions fired within exactly one minute.`,
        v.id
      );
    }

    // Suspicious beneficiary detection
    const sharedPhones = db.prepare(`
      SELECT phone, COUNT(*) as count 
      FROM beneficiaries 
      WHERE vendor_id = ? AND is_active = 1 AND phone IS NOT NULL AND phone != '' AND length(phone) > 5
      GROUP BY phone 
      HAVING count > 2
    `).all(v.id);

    if (sharedPhones.length > 0) {
      addAlert('suspicious_pattern', 'medium',
        `Suspicious Duplicate Accounts: ${v.shop_name}`,
        `Found ${sharedPhones.length} inactive or fake accounts sharing duplicate credentials.`,
        v.id
      );
    }
  }

  return newAlerts;
}

export function runDemandPrediction() {
  const commodities = db.prepare("SELECT * FROM commodities WHERE name IN ('Rice', 'Wheat', 'Sugar')").all();
  const predictions = {};

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  for (const c of commodities) {
    const key = c.name.toLowerCase();
    predictions[key] = [];

    // Get historical distribution data grouped by month
    const history = db.prepare(`
      SELECT month, year, SUM(quantity) as total
      FROM distributions 
      WHERE commodity_id = ? AND status = 'completed'
      GROUP BY year, month ORDER BY year, month
    `).all(c.id);

    // If we have minimal or no history, provide a synthetic baseline
    let dataPoints = history.map((h, i) => ({ x: i + 1, y: h.total }));
    if (dataPoints.length === 0) {
       // Mock fallback baseline if completely new DB
       dataPoints = [
         { x: 1, y: key === 'rice' ? 500 : key === 'wheat' ? 300 : 100 },
         { x: 2, y: key === 'rice' ? 520 : key === 'wheat' ? 310 : 105 },
       ];
    } else if (dataPoints.length === 1) {
       dataPoints.push({ x: 2, y: dataPoints[0].y * 1.05 });
    }

    // Linear Regression Calculation
    const n = dataPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
        sumX += dataPoints[i].x;
        sumY += dataPoints[i].y;
        sumXY += dataPoints[i].x * dataPoints[i].y;
        sumX2 += dataPoints[i].x * dataPoints[i].x;
    }

    const denominator = (n * sumX2 - sumX * sumX);
    const m = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
    const b = (sumY - m * sumX) / n;

    const nextXStart = n + 1;
    
    for (let i = 0; i < 4; i++) {
      let predMonth = currentMonth + i + 1;
      let predYear = currentYear;
      if (predMonth > 12) {
        predMonth -= 12;
        predYear += 1;
      }
      
      const targetX = nextXStart + i;
      const predictedVal = Math.max(0, Math.round(m * targetX + b));
      predictions[key].push(predictedVal);

      // Store in database
      db.prepare(`
        INSERT INTO demand_predictions (commodity, month, year, predicted_value) 
        VALUES (?, ?, ?, ?)
      `).run(key, predMonth, predYear, predictedVal);
    }
  }

  return predictions;
}
