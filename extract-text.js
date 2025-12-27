import Tesseract from 'tesseract.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const imagePath = path.join(__dirname, 'Reform Report Dec 19.jpeg');

console.log('Starting OCR extraction from:', imagePath);
console.log('---START OF TEXT EXTRACTION---\n');

Tesseract.recognize(
  imagePath,
  'eng',
  { logger: m => {
    if (m.status === 'recognizing text') {
      process.stdout.write(`\rProgress: ${(m.progress * 100).toFixed(1)}%`);
    }
  }}
)
.then(({ data: { text } }) => {
  console.log('\n\n---EXTRACTED TEXT---\n');
  console.log(text);
  console.log('\n---END OF TEXT EXTRACTION---');
  process.exit(0);
})
.catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
