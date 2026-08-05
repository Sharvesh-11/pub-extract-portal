import fs from 'fs';
import path from 'path';
import { config } from './config';

export interface StorageProvider {
  saveFile(fileName: string, buffer: Buffer): Promise<string>;
  getFileBuffer(filePath: string): Promise<Buffer>;
  deleteFile(filePath: string): Promise<void>;
}

export class LocalStorageProvider implements StorageProvider {
  constructor() {
    if (!fs.existsSync(path.resolve(process.cwd(), config.uploadDir))) {
      fs.mkdirSync(path.resolve(process.cwd(), config.uploadDir), { recursive: true });
    }
  }

  async saveFile(fileName: string, buffer: Buffer): Promise<string> {
    const filePath = path.resolve(process.cwd(), config.uploadDir, fileName);
    await fs.promises.writeFile(filePath, buffer);
    return filePath;
  }

  async getFileBuffer(filePath: string): Promise<Buffer> {
    return await fs.promises.readFile(filePath);
  }

  async deleteFile(filePath: string): Promise<void> {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}

export const storage: StorageProvider = new LocalStorageProvider();
