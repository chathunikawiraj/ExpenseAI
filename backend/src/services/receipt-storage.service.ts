import fs from 'node:fs/promises';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import type { ReceiptStorageProvider } from '@prisma/client';
import { env } from '../config/env';
import type { ReceiptImageFormat } from './receipt-file-validation.service';

const uploadsDirectory = path.resolve(process.cwd(), 'uploads');
const cloudinaryConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME &&
  env.CLOUDINARY_API_KEY &&
  env.CLOUDINARY_API_SECRET
);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

export interface StoredReceiptObject {
  provider: ReceiptStorageProvider;
  storageKey: string;
  storageFormat: string;
}

export const uploadReceiptObject = async (
  receiptId: string,
  buffer: Buffer,
  format: ReceiptImageFormat
): Promise<StoredReceiptObject> => {
  if (cloudinaryConfigured) {
    const result = await new Promise<{ public_id: string; format: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'expenseai/receipts',
          public_id: receiptId,
          resource_type: 'image',
          type: 'authenticated',
          overwrite: false,
          unique_filename: false,
        },
        (error, uploaded) => {
          if (error || !uploaded) {
            reject(error ?? new Error('Cloudinary returned no uploaded receipt.'));
            return;
          }
          resolve({ public_id: uploaded.public_id, format: uploaded.format });
        }
      );
      stream.end(buffer);
    });

    return {
      provider: 'CLOUDINARY',
      storageKey: result.public_id,
      storageFormat: result.format,
    };
  }

  await fs.mkdir(uploadsDirectory, { recursive: true });
  const extension = format === 'jpg' ? 'jpg' : 'png';
  const storageKey = `${receiptId}.${extension}`;
  await fs.writeFile(path.join(uploadsDirectory, storageKey), buffer, { flag: 'wx' });
  return {
    provider: 'LOCAL',
    storageKey,
    storageFormat: extension,
  };
};

export const deleteReceiptObject = async (
  provider: ReceiptStorageProvider,
  storageKey: string,
  storageFormat: string | null
): Promise<void> => {
  if (storageKey.startsWith('legacy:')) {
    const receiptId = storageKey.slice('legacy:'.length);
    const entries = await fs.readdir(uploadsDirectory).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    const legacyFile = entries.find((entry) => entry.startsWith(`${receiptId}.`));
    if (legacyFile) await fs.unlink(path.join(uploadsDirectory, legacyFile));
    return;
  }

  if (provider === 'CLOUDINARY') {
    if (!storageFormat) throw new Error('Cloudinary receipt format is missing.');
    const result = await cloudinary.uploader.destroy(storageKey, {
      resource_type: 'image',
      type: 'authenticated',
      invalidate: true,
    });
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error(`Cloudinary receipt deletion failed: ${result.result}`);
    }
    return;
  }

  const safeKey = path.basename(storageKey);
  if (safeKey !== storageKey) throw new Error('Unsafe local receipt storage key.');
  await fs.unlink(path.join(uploadsDirectory, safeKey)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error;
  });
};

export const createReceiptViewUrl = (
  provider: ReceiptStorageProvider,
  storageKey: string,
  storageFormat: string | null
): string | null => {
  if (provider !== 'CLOUDINARY') return null;
  if (!storageFormat) throw new Error('Cloudinary receipt format is missing.');

  return cloudinary.utils.private_download_url(storageKey, storageFormat, {
    expires_at: Math.floor(Date.now() / 1000) + 300,
  });
};

export const getLocalReceiptPath = async (
  receiptId: string,
  storageKey: string | null
): Promise<string | null> => {
  let candidate: string;
  if (storageKey) {
    candidate = path.basename(storageKey);
    if (candidate !== storageKey) throw new Error('Unsafe local receipt storage key.');
  } else {
    const entries = await fs.readdir(uploadsDirectory).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    const legacyFile = entries.find((entry) => entry.startsWith(`${receiptId}.`));
    if (!legacyFile) return null;
    candidate = legacyFile;
  }

  const filePath = path.join(uploadsDirectory, candidate);
  try {
    await fs.access(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
  return filePath;
};
