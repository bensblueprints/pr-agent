import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const PUBS_PATH = path.join(__dirname, '..', '..', 'public', 'data', 'publications.json');

router.get('/', (req, res) => {
  try {
    const data = fs.readFileSync(PUBS_PATH, 'utf8');
    res.json(JSON.parse(data));
  } catch {
    res.json([]);
  }
});

export default router;
