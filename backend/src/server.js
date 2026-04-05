import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initializeSchema } from './db/schema.js';
import { verifyToken } from './middleware/auth.js';
import { setupSocketIO } from './services/socket.js';

// Routes
import authRoutes from './routes/auth.js';
import vendorRoutes from './routes/vendors.js';
import beneficiaryRoutes from './routes/beneficiaries.js';
import distributionRoutes from './routes/distribution.js';
import analyticsRoutes from './routes/analytics.js';
import alertRoutes from './routes/alerts.js';
import webhookRoutes from './routes/webhooks.js';
import grievancesRoutes from './routes/grievances.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// Initialize DB schema
initializeSchema();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Aahar AI Backend', timestamp: new Date().toISOString() });
});

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);

// Protected routes
app.use('/api/vendors', verifyToken, vendorRoutes);
app.use('/api/beneficiaries', verifyToken, beneficiaryRoutes);
app.use('/api/distribution', verifyToken, distributionRoutes);
app.use('/api/analytics', verifyToken, analyticsRoutes);
app.use('/api/alerts', verifyToken, alertRoutes);
app.use('/api/grievances', verifyToken, grievancesRoutes);

// Setup Socket.io
setupSocketIO(io);

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Aahar AI Backend running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Socket.io ready`);
  console.log(`📊 API docs: http://localhost:${PORT}/api/health\n`);
});
