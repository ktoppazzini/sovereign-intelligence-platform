const fs = require('fs');
const path = require('path');

// Try using a PDF library if available, otherwise show file info
const pdfPath = path.join(__dirname, 'Reform Report Hindi Dec 19 2025.pdf');

if (fs.existsSync(pdfPath)) {
  const stats = fs.statSync(pdfPath);
  console.log('PDF found:', pdfPath);
  console.log('File size:', stats.size, 'bytes');
  console.log('\nTo extract text, install: npm install pdfjs-dist');
  console.log('PDF extraction requires a PDF library installation');
} else {
  console.log('PDF not found at:', pdfPath);
}
