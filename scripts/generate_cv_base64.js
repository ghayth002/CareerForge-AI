const fs = require('fs');
const path = require('path');

const cvPath = path.join(__dirname, '../My_CV.pdf');
const b64 = fs.readFileSync(cvPath).toString('base64');
const content = `window.BASE_CV_BASE64 = "${b64}";\n`;

fs.writeFileSync(path.join(__dirname, '../dashboard/public/cv_base64.js'), content, 'utf8');
fs.writeFileSync(path.join(__dirname, '../public/cv_base64.js'), content, 'utf8');
console.log('cv_base64.js generated successfully! Length:', b64.length);
