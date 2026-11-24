import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';
import {
  associateReceipt,
  removeReceipt,
  serveReceiptFile,
  uploadReceipt,
} from '../controllers/receipts.controller';
import { receiptUploadDirectory } from '../services/receipts.service';

fs.mkdirSync(receiptUploadDirectory, { recursive: true });
fs.mkdirSync(path.join(receiptUploadDirectory, 'tmp'), { recursive: true });

const upload = multer({
  dest: path.join(receiptUploadDirectory, 'tmp'),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

const router = Router();
router.use(authenticate);
router.post('/', upload.single('receipt'), uploadReceipt);
router.patch('/:id/associate', associateReceipt);
router.get('/:id/file', serveReceiptFile);
router.delete('/:id', removeReceipt);

export default router;
