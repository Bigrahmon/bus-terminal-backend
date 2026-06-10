import express from 'express';
import { getRoutes, searchTrips, getTripSeats } from '../controllers/tripController.js';

const router = express.Router();

router.get('/routes', getRoutes);
router.get('/trips', searchTrips);
router.get('/trips/:tripId/seats', getTripSeats);

export default router;
