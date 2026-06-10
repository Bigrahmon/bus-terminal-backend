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
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
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
