import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { storageService } from '../services/storage.service';
import { ocrService } from '../services/ocr.service';
import { dbStore, DBReceipt } from '../data/store';

export class ReceiptController {
  // POST /receipts (Upload and OCR - FR-18, FR-19, FR-20, FR-21)
  static async uploadAndOcr(req: AuthenticatedRequest, res: Response): Promise<void> {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No receipt file provided.' });
      return;
    }

    // 1. Validate file size up to 5 MB (FR-18)
    if (file.size > 5 * 1024 * 1024) {
      res.status(400).json({ error: 'File size exceeds maximum 5 MB limit (FR-18).' });
      return;
    }

    // 2. Magic byte content verification (FR-18: not by extension alone)
    const headerHex = file.buffer.subarray(0, 4).toString('hex');
    const isJpeg = headerHex.startsWith('ffd8ff');
    const isPng = headerHex.startsWith('89504e47');
    if (!isJpeg && !isPng) {
      res.status(400).json({ error: 'Invalid file format. Only authentic JPG and PNG image files are supported (FR-18).' });
      return;
    }

    try {
      // 3. Store file (Cloudinary or local disk fallback)
      const { url, key } = await storageService.uploadFile(file);

      // 4. Run OCR with 30s timeout guard (FR-19, FR-21)
      const ocrResult = await ocrService.processReceipt(file.buffer, file.originalname);

      const receiptRecord: DBReceipt = {
        id: `rec_${Date.now()}`,
        fileUrl: url,
        fileKey: key,
        ocrVendor: ocrResult.vendor,
        ocrDate: ocrResult.date ? new Date(ocrResult.date) : null,
        ocrAmount: ocrResult.amount,
        ocrStatus: ocrResult.success ? 'SUCCESS' : 'FAILED',
        rawOcrText: ocrResult.rawText,
        uploadedAt: new Date(),
      };

      dbStore.receipts.push(receiptRecord);

      // Return extracted pre-filled fields (FR-20: user confirms before saving expense)
      res.status(200).json({
        receiptId: receiptRecord.id,
        fileUrl: receiptRecord.fileUrl,
        extracted: {
          vendor: ocrResult.vendor,
          date: ocrResult.date,
          amount: ocrResult.amount,
          suggestedCategoryId: ocrResult.suggestedCategoryId,
          success: ocrResult.success,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Receipt processing failed' });
    }
  }

  // DELETE /receipts/:id (FR-22)
  static async deleteReceipt(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const index = dbStore.receipts.findIndex((r) => r.id === id);

    if (index === -1) {
      res.status(404).json({ error: 'Receipt record not found.' });
      return;
    }

    const receipt = dbStore.receipts[index];
    if (receipt.fileKey) {
      await storageService.deleteFile(receipt.fileKey);
    }

    dbStore.receipts.splice(index, 1);
    res.status(200).json({ message: 'Receipt and stored file removed (FR-22).' });
  }
}
