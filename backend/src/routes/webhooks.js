import { Router } from 'express';
import express from 'express';

const router = Router();

// Twilio SMS status callback webhook
router.post('/twilio/status', express.urlencoded({ extended: true }), (req, res) => {
  const { MessageSid, MessageStatus, To } = req.body;
  console.log(`📡 [Twilio Webhook] SMS to ${To} (SID: ${MessageSid}) status changed to: ${MessageStatus}`);
  // In production, update the status in a 'communications' database table
  res.sendStatus(200);
});

// Twilio Voice call status callback webhook
router.post('/twilio/call-status', express.urlencoded({ extended: true }), (req, res) => {
  const { CallSid, CallStatus, To, Duration } = req.body;
  console.log(`📡 [Twilio Webhook] Call to ${To} (SID: ${CallSid}) status: ${CallStatus}. Duration: ${Duration || 0}s`);
  // In production, update the status in a 'communications' database table
  res.sendStatus(200);
});

export default router;
