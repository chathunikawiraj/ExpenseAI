import React, { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { AppShell } from '../components/layout/AppShell';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Camera,
  Trash2,
  Calendar,
  DollarSign,
  Store,
  RefreshCw,
} from 'lucide-react';
import { receiptsApi, transactionsApi } from '../services/apiService';
import { getAccessToken } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { dashboardQueryKeys } from '../services/dashboardQueryKeys';
import type { PaymentMethod } from '../types';

export const ReceiptScannerPage: React.FC = () => {
  const { showToast } = useToast();
  const { reload: reloadNotifications } = useNotifications();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoriesQuery = useQuery({
    queryKey: dashboardQueryKeys.categories(user?.id ?? ''),
    queryFn: () => transactionsApi.getCategories(),
    enabled: Boolean(user?.id),
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Extracted OCR fields
  const [extractedVendor, setExtractedVendor] = useState('');
  const [extractedAmount, setExtractedAmount] = useState('');
  const [extractedDate, setExtractedDate] = useState('');
  const [extractedCategory, setExtractedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('OTHER');
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [receiptConfirmed, setReceiptConfirmed] = useState(false);
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  // Magic byte validation helper
  const validateMagicBytes = async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (!reader.result || typeof reader.result === 'string') {
          resolve(false);
          return;
        }
        const arr = new Uint8Array(reader.result as ArrayBuffer).subarray(0, 4);
        let header = '';
        for (let i = 0; i < arr.length; i++) {
          header += arr[i].toString(16).padStart(2, '0');
        }

        // Check JPEG (ffd8ff) or PNG (89504e47)
        const isJpeg = header.startsWith('ffd8ff');
        const isPng = header.startsWith('89504e47');
        resolve(isJpeg || isPng);
      };
      reader.readAsArrayBuffer(file.slice(0, 4));
    });
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    if (isScanning || isSavingExpense) return;

    // 5 MB limit check (FR-18)
    if (file.size > 5 * 1024 * 1024) {
      showToast('File size exceeds the 5 MB maximum limit.', 'error');
      return;
    }

    // Content-based magic bytes validation (FR-18)
    const isValidImage = await validateMagicBytes(file);
    if (!isValidImage) {
      showToast('Invalid file content. Only real JPG and PNG images are supported.', 'error');
      return;
    }

    if (!getAccessToken()) {
      showToast('Sign in before uploading a receipt.', 'error');
      return;
    }

    const previousFile = selectedFile;
    const previousOcrSuccess = ocrSuccess;
    const currentReceiptId = receiptId;
    setSelectedFile(file);
    setIsScanning(true);

    try {
      const res = currentReceiptId
        ? await receiptsApi.replaceReceiptImage(currentReceiptId, file)
        : await receiptsApi.uploadAndOcr(file);
      setReceiptId(res.receiptId);
      setReceiptConfirmed(Boolean(res.receipt.expenseId));
      setOcrSuccess(res.ocrStatus === 'SUCCEEDED');
      setExtractedVendor(res.extracted.vendor || '');
      setExtractedAmount(res.extracted.amount?.toString() || '');
      setExtractedDate(res.extracted.date || '');
      setExtractedCategory(res.extracted.suggestedCategoryId || '');
      setPreviewUrl(URL.createObjectURL(file));
      showToast(
        res.manualEntryRequired
          ? 'Receipt uploaded. OCR was incomplete; enter the missing details manually.'
          : 'Receipt scanned. Review the extracted fields before saving.',
        res.manualEntryRequired ? 'info' : 'success',
      );
    } catch (cause) {
      setSelectedFile(previousFile);
      setOcrSuccess(previousOcrSuccess);
      showToast(cause instanceof Error ? cause.message : 'Receipt scanning failed. Enter the details manually.', 'error');
    } finally {
      setIsScanning(false);
      setIsReviewModalOpen(true);
    }
  };

  const handleViewReceipt = async () => {
    if (!receiptId) return;
    try {
      const image = await receiptsApi.getReceiptImage(receiptId);
      setPreviewUrl(URL.createObjectURL(image));
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not load the uploaded receipt.', 'error');
    }
  };

  const handleDeleteReceipt = async () => {
    if (receiptId) {
      try {
        await receiptsApi.deleteReceipt(receiptId);
      } catch (cause) {
        showToast(cause instanceof Error ? cause.message : 'Could not delete the receipt.', 'error');
        return;
      }
    }
    setReceiptId(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setReceiptConfirmed(false);
    showToast('Receipt removed. Any confirmed expense remains unchanged.', 'success');
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptId) {
      showToast('Upload the receipt before confirming the expense.', 'error');
      return;
    }
    if (!extractedCategory) {
      showToast('Select an expense category before confirming.', 'error');
      return;
    }

    const amount = Number(extractedAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Enter a valid receipt amount before saving.', 'error');
      return;
    }

    setIsSavingExpense(true);
    try {
      const result = await receiptsApi.confirmExpense(receiptId, {
        title: extractedVendor.trim(),
        amount,
        date: extractedDate,
        categoryId: extractedCategory,
        paymentMethod,
        description: description.trim() || undefined,
      });
      if (user?.id) {
        void queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.financial(user.id),
        });
      }
      reloadNotifications();
      setReceiptConfirmed(true);
      const formattedAmount = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: user?.currency ?? 'LKR',
      }).format(amount);
      showToast(`Expense for "${extractedVendor}" (${formattedAmount}) saved!`, 'success');
      setIsReviewModalOpen(false);
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not save this receipt expense.', 'error');
    } finally {
      setIsSavingExpense(false);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight flex items-center gap-2">
          <span>Receipt Scanner</span>
          <Sparkles className="w-6 h-6 text-primary" />
        </h1>
        <p className="text-xs text-navy-muted">
          Instant OCR extraction of vendor, total amount, and date with automated category matching (FR-18 to FR-22).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Upload Drop Zone Card */}
        <div className="lg:col-span-7 bg-white rounded-4xl p-8 shadow-comet flex flex-col items-center text-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept="image/png, image/jpeg, image/jpg"
            className="hidden"
          />

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-purple-200 hover:border-primary rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer bg-[#F8F9FE] hover:bg-primary-light/30 transition-all duration-200 group"
          >
            <div className="w-16 h-16 rounded-3xl bg-white shadow-comet flex items-center justify-center text-primary group-hover:scale-110 transition-transform mb-4">
              <UploadCloud className="w-8 h-8 stroke-[2]" />
            </div>

            <h3 className="text-base font-bold text-navy">
              Drag & Drop your receipt here
            </h3>
            <p className="text-xs text-navy-muted mt-1 max-w-xs">
              Supports JPG, JPEG, and PNG up to 5 MB with strict magic-byte verification.
            </p>

            <button
              type="button"
              className="mt-6 px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow transition-all"
            >
              {receiptId ? 'Replace Stored Receipt Image' : 'Browse Receipt Image'}
            </button>
          </div>

          {/* Upload and OCR progress */}
          {isScanning && (
            <div className="w-full mt-6 bg-[#F8F9FE] p-4 rounded-2xl border border-purple-100 flex flex-col gap-2">
              <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Uploading receipt and running OCR...
              </div>
              <div
                role="progressbar"
                aria-label="Uploading receipt and running OCR"
                className="w-full bg-gray-200 h-2 rounded-full overflow-hidden"
              >
                <div className="bg-primary h-full w-1/3 animate-pulse rounded-full" />
              </div>
            </div>
          )}
        </div>

        {/* Live Preview & Status Card */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-4xl p-6 shadow-comet flex flex-col">
            <h3 className="text-sm font-bold text-navy mb-4 flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              Receipt Preview & Validation
            </h3>

            {previewUrl ? (
              <div className="flex flex-col gap-4">
                <div className="w-full h-72 rounded-3xl overflow-hidden bg-gray-50 border border-purple-100 flex items-center justify-center relative">
                  <img
                    src={previewUrl}
                    alt="Receipt preview"
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void handleDeleteReceipt();
                    }}
                    className="absolute top-3 right-3 p-2 bg-white/90 text-rose-500 rounded-full shadow-md hover:bg-rose-50"
                    title="Delete stored receipt"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {receiptId && (
                  <button
                    type="button"
                    onClick={() => void handleViewReceipt()}
                    className="w-full py-2 text-xs font-semibold text-primary hover:text-primary-hover"
                  >
                    Load secure stored image
                  </button>
                )}

                {selectedFile && (
                  <p className="text-[11px] text-navy-muted truncate">
                    {selectedFile.name}
                    {receiptConfirmed ? ' · Expense confirmed' : ''}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(true)}
                  className="w-full py-3 bg-navy text-white hover:bg-navy-dark text-xs font-bold rounded-full transition-all shadow-sm"
                >
                  {receiptConfirmed ? 'View Confirmed Expense Details' : 'Review Extracted Details'}
                </button>
              </div>
            ) : (
              <div className="h-64 border border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-center p-4">
                <FileText className="w-10 h-10 text-gray-300 mb-2" />
                <span className="text-xs font-semibold text-navy-muted">No image uploaded yet</span>
                <p className="text-[11px] text-navy-muted/70 mt-1 max-w-[200px]">
                  The uploaded image stays private and is attached only after you confirm the expense.
                </p>
              </div>
            )}
          </div>

          {/* Receipt privacy and manual-entry guidance */}
          <div className="bg-card-blue rounded-3xl p-5 shadow-comet">
            <h4 className="text-xs font-bold text-navy flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Review before saving
            </h4>
            <p className="text-[11px] text-navy/80 mt-1">
              OCR suggestions can be incomplete. Edit every field as needed; an expense is created only after you confirm.
            </p>
          </div>
        </div>
      </div>

      {/* Review & Edit Extracted Data Modal (FR-20) */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={ocrSuccess ? 'Confirm Extracted Receipt Data' : 'Manual Expense Entry (Image Attached)'}
        subtitle="Review and edit the fields before saving to your records."
      >
        <form onSubmit={handleSaveExpense} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-navy mb-1 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-primary" />
              Vendor / Merchant Name
            </label>
            <input
              type="text"
              required
              value={extractedVendor}
              onChange={(e) => setExtractedVendor(e.target.value)}
              placeholder="e.g. Apple Fifth Ave"
              className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-navy mb-1 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-primary" />
                Total Amount
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={extractedAmount}
                onChange={(e) => setExtractedAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-navy mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Transaction Date
              </label>
              <input
                type="date"
                required
                value={extractedDate}
                onChange={(e) => setExtractedDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-navy mb-1">Suggested Category</label>
            <select
              value={extractedCategory}
              onChange={(e) => setExtractedCategory(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
            >
              <option value="" disabled>
                {categoriesQuery.isLoading ? 'Loading categories...' : 'Select a category'}
              </option>
              {(categoriesQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {categoriesQuery.isError && (
              <p className="mt-1 text-[11px] text-rose-600">Could not load categories. Close and retry after reconnecting.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-navy mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
              >
                <option value="CASH">Cash</option>
                <option value="CREDIT_CARD">Credit card</option>
                <option value="DEBIT_CARD">Debit card</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-navy mb-1">Description (optional)</label>
              <input
                type="text"
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsReviewModalOpen(false)}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-navy text-xs font-bold rounded-full transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingExpense || isScanning || receiptConfirmed || !receiptId || !categoriesQuery.data?.length}
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow transition-all disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingExpense ? 'Saving...' : receiptConfirmed ? 'Expense Confirmed' : 'Confirm & Save Expense'}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
};
