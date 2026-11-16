import { Router } from 'express';
import multer from 'multer';
import { ReceiptController } from '../controllers/receipt.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max (FR-18)
});

router.post('/receipts', authenticate, upload.single('receipt'), ReceiptController.uploadAndOcr);
router.delete('/receipts/:id', authenticate, ReceiptController.deleteReceipt);

export default router;
