import { Router } from 'express';
import type { RequestHandler } from 'express';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import {
  associateReceipt,
  confirmReceipt,
  readReceipt,
  removeReceipt,
  replaceReceiptImage,
  serveReceiptFile,
  uploadReceipt,
} from '../controllers/receipts.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import {
  associateReceiptSchema,
  confirmReceiptSchema,
  receiptIdSchema,
} from '../validators/receipt.validator';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 10, parts: 12 },
});

const receiptUploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (request) => request.authUser?.userId ?? request.ip ?? 'unknown',
  message: {
    error: 'Too many receipt uploads. Please try again later.',
    code: 'RECEIPT_UPLOAD_RATE_LIMITED',
  },
});

const parseReceiptUpload: RequestHandler = (req, res, next) => {
  upload.single('receipt')(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === 'LIMIT_FILE_SIZE';
      res.status(tooLarge ? 413 : 400).json({
        error: tooLarge ? 'Receipt file exceeds the 5 MB limit.' : 'Invalid receipt upload.',
        code: tooLarge ? 'RECEIPT_TOO_LARGE' : 'INVALID_RECEIPT_UPLOAD',
      });
      return;
    }
    next(error);
  });
};

const router = Router();
router.use(authenticate);
router.param('id', (req, res, next, id) => {
  if (!receiptIdSchema.safeParse(id).success) {
    res.status(400).json({ error: 'Receipt ID must be a valid UUID.', code: 'INVALID_RECEIPT_ID' });
    return;
  }
  next();
});

router.post(['/', '/scan'], receiptUploadRateLimit, parseReceiptUpload, uploadReceipt);
router.post('/confirm', validateBody(confirmReceiptSchema), confirmReceipt);
router.get('/:id/file', serveReceiptFile);
router.get('/:id/view', serveReceiptFile);
router.get('/:id', readReceipt);
router.put('/:id', receiptUploadRateLimit, parseReceiptUpload, replaceReceiptImage);
router.patch('/:id/associate', validateBody(associateReceiptSchema), associateReceipt);
router.delete('/:id', removeReceipt);

export default router;
