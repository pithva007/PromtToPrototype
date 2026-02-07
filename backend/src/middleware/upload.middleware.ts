import multer from 'multer';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../utils/validators';

/**
 * Multer configuration for file uploads
 * Uses memory storage (stores files in Buffer)
 */
const storage = multer.memoryStorage();

/**
 * File filter to validate MIME type
 */
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PNG, JPG, and WebP are allowed.'));
  }
};

/**
 * Multer upload middleware
 */
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});
