import path from 'node:path';
import sharp from 'sharp';
import { AuthError } from './auth.service';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 40_000_000;

export type ReceiptImageFormat = 'jpg' | 'png';

export const validateReceiptImage = async (
  file: Pick<Express.Multer.File, 'originalname' | 'mimetype' | 'size' | 'buffer'>
): Promise<ReceiptImageFormat> => {
  if (file.size > MAX_FILE_SIZE || file.buffer.length > MAX_FILE_SIZE) {
    throw new AuthError('Receipt file exceeds the 5 MB limit.', 413, 'RECEIPT_TOO_LARGE');
  }
  if (!file.buffer.length) {
    throw new AuthError('Receipt image is empty.', 400, 'INVALID_RECEIPT_IMAGE');
  }

  const extension = path.extname(file.originalname).toLowerCase();
  if (extension !== '.jpg' && extension !== '.jpeg' && extension !== '.png') {
    throw new AuthError(
      'Only JPG, JPEG, and PNG receipt images are supported.',
      400,
      'INVALID_RECEIPT_TYPE'
    );
  }

  const jpegSignature =
    file.buffer.length >= 3 &&
    file.buffer[0] === 0xff &&
    file.buffer[1] === 0xd8 &&
    file.buffer[2] === 0xff;
  const pngSignature =
    file.buffer.length >= 8 &&
    file.buffer[0] === 0x89 &&
    file.buffer.subarray(1, 4).toString('ascii') === 'PNG' &&
    file.buffer[4] === 0x0d &&
    file.buffer[5] === 0x0a &&
    file.buffer[6] === 0x1a &&
    file.buffer[7] === 0x0a;

  if (!jpegSignature && !pngSignature) {
    throw new AuthError('Invalid receipt image content.', 400, 'INVALID_RECEIPT_IMAGE');
  }

  const signatureFormat = jpegSignature ? 'jpg' : 'png';
  const extensionMatches =
    signatureFormat === 'png'
      ? extension === '.png'
      : extension === '.jpg' || extension === '.jpeg';
  if (!extensionMatches) {
    throw new AuthError(
      'The receipt image content does not match its file extension.',
      400,
      'INVALID_RECEIPT_IMAGE'
    );
  }

  const mimeMatches =
    file.mimetype === 'application/octet-stream' ||
    (signatureFormat === 'png'
      ? file.mimetype === 'image/png'
      : file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg');
  if (!mimeMatches) {
    throw new AuthError(
      'The receipt image content does not match its media type.',
      400,
      'INVALID_RECEIPT_IMAGE'
    );
  }

  try {
    const image = sharp(file.buffer, {
      failOn: 'error',
      limitInputPixels: MAX_IMAGE_PIXELS,
    });
    const metadata = await image.metadata();
    if (
      (metadata.format !== 'jpeg' && metadata.format !== 'png') ||
      !metadata.width ||
      !metadata.height ||
      metadata.width * metadata.height > MAX_IMAGE_PIXELS ||
      (signatureFormat === 'png' && metadata.format !== 'png') ||
      (signatureFormat === 'jpg' && metadata.format !== 'jpeg')
    ) {
      throw new Error('Unsupported or mismatched image format.');
    }

    await sharp(file.buffer, {
      failOn: 'error',
      limitInputPixels: MAX_IMAGE_PIXELS,
    }).stats();
  } catch {
    throw new AuthError(
      'The uploaded file is not a valid, readable receipt image.',
      400,
      'INVALID_RECEIPT_IMAGE'
    );
  }

  return signatureFormat;
};
