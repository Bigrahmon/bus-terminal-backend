import express from 'express';
import { getRoutes, searchTrips, getTripSeats, trackTrip, createRoute, updateRoute, deleteRoute } from '../controllers/tripController.js';

const router = express.Router();

router.get('/routes', getRoutes);
router.post('/routes', createRoute);
router.put('/routes/:routeId', updateRoute);
router.delete('/routes/:routeId', deleteRoute);
router.get('/trips', searchTrips);
router.get('/trips/track/:trackingCode', trackTrip);
router.get('/trips/:tripId/seats', getTripSeats);

export default router;
