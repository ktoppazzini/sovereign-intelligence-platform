import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';

const imagePath = path.resolve('Reform Report Dec 19.jpeg');

async function extractText() {
  try {
    console.log('Starting OCR extraction...');
    const { data: { text } } = await Tesseract.recognize(
      imagePath,
      'eng',
      { logger: m => console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`) }
    );

    console.log('\n=== EXTRACTED TEXT ===\n');
    console.log(text);

    // Save to file for reference
    fs.writeFileSync('extracted-reform-text.txt', text);
    console.log('\n✓ Text saved to extracted-reform-text.txt');

  } catch (err) {
    console.error('OCR Error:', err);
  }
}

extractText();
