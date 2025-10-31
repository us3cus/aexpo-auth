import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';

export const uploadConfig: MulterOptions = {
  storage: memoryStorage(),
  fileFilter: (req, file, callback) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return callback(new Error('Only image files are allowed!'), false);
    }
    callback(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB (before compression)
  },
};
