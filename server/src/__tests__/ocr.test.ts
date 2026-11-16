import { ocrService } from '../services/ocr.service';

describe('OCR Receipt Extraction Heuristics (FR-19)', () => {
  test('extracts vendor, total amount, and suggests category accurately', () => {
    const rawReceiptText = `
      APPLE STORE FIFTH AVENUE
      767 5th Ave, New York, NY
      09/07/2026
      Item: MacBook Pro 16" M4
      SUBTOTAL: $ 1,280.50
      TOTAL AMOUNT: $1280.50
      VISA CARD ENDING IN 798
    `;

    // Access private parser method
    const parsed = (ocrService as any).parseReceiptText(rawReceiptText);

    expect(parsed.success).toBe(true);
    expect(parsed.vendor).toContain('APPLE STORE');
    expect(parsed.amount).toBe(1280.50);
    expect(parsed.suggestedCategoryId).toBe('cat_07'); // Shopping & Tech
  });

  test('suggests Food & Dining category when restaurant keywords appear', () => {
    const cafeText = `
      Green Garden Bistro Cafe
      2 Avocado Toast
      1 Espresso
      Total: $ 34.50
      Date: 2026-09-06
    `;

    const parsed = (ocrService as any).parseReceiptText(cafeText);
    expect(parsed.amount).toBe(34.50);
    expect(parsed.suggestedCategoryId).toBe('cat_01'); // Food
  });
});
