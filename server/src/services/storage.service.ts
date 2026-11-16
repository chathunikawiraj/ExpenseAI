import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';

export interface StorageService {
  uploadFile(file: Express.Multer.File): Promise<{ url: string; key: string }>;
  deleteFile(key: string): Promise<void>;
}

export class CloudinaryOrLocalDiskStorage implements StorageService {
  private useCloudinary: boolean;
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.resolve(__dirname, '../../uploads');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }

    if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
      });
      this.useCloudinary = true;
    } else {
      this.useCloudinary = false;
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<{ url: string; key: string }> {
    if (this.useCloudinary) {
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'expenseai_receipts' },
          (error, result) => {
            if (error || !result) {
              reject(error || new Error('Cloudinary upload failed'));
            } else {
              resolve({ url: result.secure_url, key: result.public_id });
            }
          }
        ).end(file.buffer);
      });
    }

    // Local Disk Fallback
    const filename = `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
    const filePath = path.join(this.uploadsDir, filename);
    await fs.promises.writeFile(filePath, file.buffer);

    return {
      url: `/uploads/${filename}`,
      key: filename,
    };
  }

  async deleteFile(key: string): Promise<void> {
    if (this.useCloudinary) {
      await cloudinary.uploader.destroy(key);
      return;
    }
    const filePath = path.join(this.uploadsDir, key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}

export const storageService = new CloudinaryOrLocalDiskStorage();
