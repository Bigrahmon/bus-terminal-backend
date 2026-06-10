import express from 'express';
import { holdSeat, createBooking, getBooking, getUserBookings } from '../controllers/bookingController.js';

const router = express.Router();

router.post('/seats/hold', holdSeat);
router.post('/bookings', createBooking);
router.get('/bookings/:bookingCode', getBooking);
router.get('/user/:userId/bookings', getUserBookings);

export default router;
