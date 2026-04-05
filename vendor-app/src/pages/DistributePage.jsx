import { MessageSquare, Clock, CheckCircle, RefreshCw, Package, Search, Target, PartyPopper, MessageCircle, Phone, Mail } from 'lucide-react';
import { useState, useRef } from 'react';
import api from '../services/api';

export default function DistributePage() {
  const [step, setStep] = useState(1); // 1=search, 2=otp, 3=distribute, 4=done
  const [rationCard, setRationCard] = useState('');
  const [beneficiary, setBeneficiary] = useState(null);
  const [entitlements, setEntitlements] = useState([]);
  const [otpData, setOtpData] = useState(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState('en');
  const [useVoice, setUseVoice] = useState(false);
  const otpRefs = useRef([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.lookupBeneficiary(rationCard.trim());
      setBeneficiary(data.beneficiary);
      setEntitlements(data.entitlements);
      // Auto-generate OTP
      const otpRes = await api.generateOTP(data.beneficiary.id, lang, useVoice);
      setOtpData(otpRes);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    setError('');
    setLoading(true);
    try {
      const otpString = otp.join('');
      if (otpString.length !== 6) { setError('Please enter complete OTP'); setLoading(false); return; }
      const data = await api.verifyOTP(beneficiary.id, otpString);
      setEntitlements(data.entitlements);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDistribute = async () => {
    setError('');
    setLoading(true);
    try {
      const items = entitlements
        .filter(e => e.remainingQty > 0)
        .map(e => ({ commodityId: e.commodityId, quantity: e.remainingQty }));

      if (items.length === 0) { setError('No items to distribute'); setLoading(false); return; }

      const data = await api.distribute(beneficiary.id, otpData?.otpId, items);
      setResult(data);
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setRationCard('');
    setBeneficiary(null);
    setEntitlements([]);
    setOtpData(null);
    setOtp(['', '', '', '', '', '']);
    setResult(null);
    setError('');
  };

  return (
    <>
      <div className="page-header">
        <h2><Package size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Distribute</h2>
        <div className="subtitle">Process ration distribution with OTP verification</div>
      </div>
      <div className="page-body">
        {/* Step Indicator */}
        <div className="step-indicator">
          {[
            { num: 1, label: 'Lookup' },
            { num: 2, label: 'Verify OTP' },
            { num: 3, label: 'Distribute' },
            { num: 4, label: 'Complete' }
          ].map((s, i) => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className={`step ${step === s.num ? 'active' : step > s.num ? 'done' : ''}`}>
                <div className="step-number">{step > s.num ? '✓' : s.num}</div>
                <span className="step-label">{s.label}</span>
              </div>
              {i < 3 && <div className={`step-line ${step > s.num ? 'done' : ''}`}></div>}
            </div>
          ))}
        </div>

        {error && <div className="login-error" style={{ maxWidth: 520, margin: '0 auto 20px' }}>⚠️ {error}</div>}

        {/* Step 1: Lookup */}
        {step === 1 && (
          <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
            <div className="card-header"><h3><Search size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Find Beneficiary</h3></div>
            <div className="card-body">
              <form onSubmit={handleSearch}>
                <div className="form-group">
                  <label className="form-label">Ration Card Number</label>
                  <input
                    id="ration-card-input"
                    className="form-input"
                    type="text"
                    placeholder="e.g. RC-01-0001"
                    value={rationCard}
                    onChange={e => setRationCard(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="grid-2" style={{ marginBottom: 16 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Language</label>
                    <select className="form-input" value={lang} onChange={e => setLang(e.target.value)}>
                      <option value="en">English (India)</option>
                      <option value="hi">Hindi (हिंदी)</option>
                      <option value="ta">Tamil (தமிழ்)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Delivery Method</label>
                    <select className="form-input" value={useVoice ? 'voice' : 'sms'} onChange={e => setUseVoice(e.target.value === 'voice')}>
                      <option value="sms">SMS Text Message</option>
                      <option value="voice">Automated Phone Call</option>
                    </select>
                  </div>
                </div>
                <button id="lookup-btn" className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                  {loading ? <><Clock size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Searching...</> : <><Search size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Lookup & Generate OTP</>}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Step 2: OTP Verification */}
        {step === 2 && beneficiary && (
          <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
            <div className="card-header"><h3>🔐 OTP Verification</h3></div>
            <div className="card-body" style={{ textAlign: 'center' }}>
              <div style={{ background: 'var(--primary-50)', padding: 16, borderRadius: 'var(--radius-sm)', marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{beneficiary.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {beneficiary.ration_card_no} • {beneficiary.card_type} • {beneficiary.family_size} members
                </div>
              </div>

              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>Enter the 6-digit OTP sent to beneficiary</p>
              
              {otpData?.simulatedMessage && (
                <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', padding: '12px 16px', borderRadius: 12, textAlign: 'left', marginBottom: 20, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: -10, left: 16, background: '#4f46e5', color: 'white', fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase' }}>
                    {useVoice ? <><Phone size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Call Simulator</> : <><MessageCircle size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> SMS Simulator</>}
                  </div>
                  <span style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>{useVoice ? <MessageSquare size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> : <Mail size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} />}</span>
                  <p style={{ margin: 0, fontSize: 14, color: '#3730a3', lineHeight: 1.5, wordBreak: 'break-word' }}>
                    {otpData.simulatedMessage}
                  </p>
                </div>
              )}


              <div className="otp-container">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    className="otp-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                  />
                ))}
              </div>

              <button id="verify-otp-btn" className="btn btn-primary btn-lg" onClick={handleVerifyOTP} disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
                {loading ? <><Clock size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Verifying...</> : <><CheckCircle size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Verify OTP</>}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Distribute */}
        {step === 3 && beneficiary && (
          <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
            <div className="card-header"><h3><Package size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Confirm Distribution</h3></div>
            <div className="card-body">
              <div style={{ background: 'var(--primary-50)', padding: 16, borderRadius: 'var(--radius-sm)', marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{beneficiary.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {beneficiary.ration_card_no} • Card: {beneficiary.card_type} • Family: {beneficiary.family_size}
                </div>
              </div>

              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Items to Distribute:</h4>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Commodity</th>
                      <th>Entitled</th>
                      <th>Already Collected</th>
                      <th>To Distribute</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entitlements.map(e => (
                      <tr key={e.commodityId}>
                        <td style={{ fontWeight: 600 }}>{e.commodityName}</td>
                        <td>{e.entitledQty} {e.unit}</td>
                        <td>{e.collectedQty} {e.unit}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: e.remainingQty > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                            {e.remainingQty} {e.unit}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button id="distribute-btn" className="btn btn-accent btn-lg" onClick={handleDistribute} disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 20 }}>
                {loading ? <><Clock size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Processing...</> : <><Target size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Confirm & Distribute</>}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && result && (
          <div className="card" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
            <div className="card-body" style={{ padding: 40 }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}><PartyPopper size={64} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Distribution Complete!</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                {result.transactions?.length || 0} items distributed to {beneficiary?.name}
              </p>
              
              {result.transactions?.map(t => (
                <div key={t.transactionId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600 }}>TXN: {t.transactionId}</span>
                  <span className="badge badge-success"><CheckCircle size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> {t.quantity} units</span>
                </div>
              ))}

              <button className="btn btn-primary btn-lg" onClick={resetFlow} style={{ width: '100%', justifyContent: 'center', marginTop: 24 }}>
                <RefreshCw size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> New Distribution
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
