import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';

// Routes
import authRoutes from './routes/authRoutes.js';
import tripRoutes from './routes/tripRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';

// Services
import { releaseExpiredHolds } from './services/seatService.js';
import { sendUpcomingTripReminders } from './services/reminderService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ── CORS: allow browsers opening HTML from file:// and any localhost port ──
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    // and any localhost / 127.0.0.1 / null (file://) origin
    if (
      !origin ||
      origin === 'null' ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ) {
      callback(null, true);
    } else {
      // For production: allow the deployed front-end domain too
      callback(null, true); // accept everything for now — tighten later
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', tripRoutes); // /api/routes, /api/trips
app.use('/api', bookingRoutes); // /api/seats/hold, /api/bookings
app.use('/api/complaints', complaintRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Riderr Backend is running' });
});

// Cron Job: Release expired seat holds every minute
cron.schedule('* * * * *', async () => {
  console.log('Running cron job: Releasing expired seat holds and sending reminders...');
  await releaseExpiredHolds();
  await sendUpcomingTripReminders();
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
