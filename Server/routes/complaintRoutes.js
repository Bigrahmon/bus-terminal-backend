import express from 'express';
import { submitComplaint, getComplaints } from '../controllers/complaintController.js';

const router = express.Router();

router.post('/', submitComplaint);
router.get('/', getComplaints);

export default router;
