import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { randomUUID } from 'crypto';
import { extname } from 'path';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class AzureBlobService {
  private readonly logger = new Logger(AzureBlobService.name);
  private containerClient: ContainerClient;

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_STORAGE_CONTAINER || 'products';

    if (!connectionString) {
      this.logger.warn('AZURE_STORAGE_CONNECTION_STRING not set — image uploads disabled');
      return;
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerClient = blobServiceClient.getContainerClient(containerName);

    // Ensure container exists with public blob access
    this.containerClient
      .createIfNotExists({ access: 'blob' })
      .then(() => this.logger.log(`Container "${containerName}" ready`))
      .catch((err) => this.logger.error(`Failed to ensure container: ${err.message}`));
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    if (!this.containerClient) {
      throw new InternalServerErrorException('Image upload is not configured (Azure Storage not set up)');
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new InternalServerErrorException(
        `Unsupported file type: ${file.mimetype}. Allowed: jpeg, png, gif, webp, svg`,
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      throw new InternalServerErrorException(
        `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB`,
      );
    }

    const ext = extname(file.originalname).toLowerCase() || '.jpg';
    const blobName = `${randomUUID()}${ext}`;
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

    try {
      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: { blobContentType: file.mimetype },
      });

      this.logger.log(`Uploaded blob: ${blobName} (${file.size} bytes)`);
      return blockBlobClient.url;
    } catch (error) {
      this.logger.error(`Upload failed: ${error.message}`);
      throw new InternalServerErrorException(`Failed to upload image: ${error.message}`);
    }
  }

  async deleteFile(blobUrl: string): Promise<void> {
    try {
      // Extract just the blob name from the full URL
      const url = new URL(blobUrl);
      const blobName = url.pathname.split('/').slice(2).join('/');
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.deleteIfExists();
      this.logger.log(`Deleted blob: ${blobName}`);
    } catch {
      // Non-fatal — log but do not throw
      this.logger.warn(`Could not delete old blob from URL: ${blobUrl}`);
    }
  }
}
