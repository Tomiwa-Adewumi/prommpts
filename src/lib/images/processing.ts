export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface ProcessedImageResult {
  file: File;
  preview: string;
  metadata: {
    width: number;
    height: number;
    fileSize: number;
    format: string;
  };
}

export class ImageProcessor {
  static async processImage(
    file: File,
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedImageResult> {
    const {
      maxWidth = 2048,
      maxHeight = 2048,
      quality = 0.9,
      format = 'webp'
    } = options;

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate new dimensions
          let { width, height } = img;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }

          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;

          // Draw and compress image
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to process image'));
                return;
              }

              const processedFile = new File(
                [blob],
                `processed_${file.name.split('.')[0]}.${format}`,
                { type: `image/${format}` }
              );

              const preview = URL.createObjectURL(blob);

              resolve({
                file: processedFile,
                preview,
                metadata: {
                  width,
                  height,
                  fileSize: blob.size,
                  format
                }
              });
            },
            `image/${format}`,
            quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  static async generateThumbnail(file: File, size: number = 400): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          // Set canvas to square thumbnail size
          canvas.width = size;
          canvas.height = size;

          // Calculate crop dimensions for center crop
          const { width, height } = img;
          const minDimension = Math.min(width, height);
          const x = (width - minDimension) / 2;
          const y = (height - minDimension) / 2;

          // Draw cropped and resized image
          ctx?.drawImage(
            img,
            x, y, minDimension, minDimension,
            0, 0, size, size
          );

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to generate thumbnail'));
                return;
              }
              resolve(URL.createObjectURL(blob));
            },
            'image/webp',
            0.8
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image for thumbnail'));
      img.src = URL.createObjectURL(file);
    });
  }

  static validateImageFile(file: File): { valid: boolean; error?: string } {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 20 * 1024 * 1024; // 20MB

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size too large. Maximum size is 20MB.'
      };
    }

    return { valid: true };
  }
}