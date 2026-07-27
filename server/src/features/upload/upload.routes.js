import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../../shared/middleware/auth.js';

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Disk Storage setup
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `${uuidv4()}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
});

function getFileType(mimeType, filename) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  
  const ext = path.extname(filename).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) return 'image';
  if (['.mp4', '.webm', '.mov', '.avi', '.mkv'].includes(ext)) return 'video';
  if (['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(ext)) return 'audio';

  return 'document';
}

router.use(requireAuth);

// POST /api/upload - Single or multiple file upload
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileType = getFileType(req.file.mimetype, req.file.originalname);
    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
      ok: true,
      attachment: {
        url: fileUrl,
        filename: req.file.originalname,
        fileType,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/upload/multiple - Up to 5 files at once
router.post('/multiple', upload.array('files', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const attachments = req.files.map((file) => ({
      url: `/uploads/${file.filename}`,
      filename: file.originalname,
      fileType: getFileType(file.mimetype, file.originalname),
      mimeType: file.mimetype,
      size: file.size,
    }));

    res.json({ ok: true, attachments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
