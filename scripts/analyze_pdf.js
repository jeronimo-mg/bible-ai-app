const fs = require('fs');
const pdfLib = require('pdf-parse');

// Basic handling for default export if necessary
const pdf = pdfLib.default || pdfLib;

console.log('Type of pdf export:', typeof pdf);

const dataBuffer = fs.readFileSync('C:/Users/jeron/.gemini/antigravity/scratch/IAbiblia/new-testament-83291-por.pdf');

if (typeof pdf === 'function') {
    pdf(dataBuffer).then(function (data) {
        console.log('Number of pages:', data.numpages);
        console.log('First 2000 chars of text:');
        console.log(data.text.substring(0, 2000));
    }).catch(err => {
        console.error('Error:', err);
    });
} else {
    console.error('pdf-parse export is not a function:', pdf);
}
