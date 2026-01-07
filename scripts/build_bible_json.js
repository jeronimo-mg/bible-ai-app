const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const baseUrl = 'https://www.churchofjesuschrist.org/study/scriptures/nt';
const bookCode = 'matt';
const bookName = 'Mateus';
const chapterCount = 28;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchChapter(chapterNum) {
    const url = `${baseUrl}/${bookCode}/${chapterNum}?lang=por`;
    console.log(`Fetching ${url}...`);
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const verses = [];

        $('p[id^="p"]').each((i, el) => {
            let text = $(el).text().trim();
            // Remove the verse number if it's at the start (optional, but clean)
            // Actually keep it as is, or split it.
            // The format is "1 Text...".
            verses.push(text);
        });
        return verses;
    } catch (error) {
        console.error(`Error fetching chapter ${chapterNum}:`, error.message);
        return [];
    }
}

async function buildBible() {
    const bookData = {
        name: bookName,
        chapters: []
    };

    for (let c = 1; c <= chapterCount; c++) {
        const verses = await fetchChapter(c);
        bookData.chapters.push(verses);
        await sleep(500); // polite crawling
    }

    const fullData = {
        books: [bookData]
    };

    const outputPath = path.join(__dirname, '../assets/bible_data.json');
    fs.writeFileSync(outputPath, JSON.stringify(fullData, null, 2));
    console.log(`Saved bible data to ${outputPath}`);
}

buildBible();
