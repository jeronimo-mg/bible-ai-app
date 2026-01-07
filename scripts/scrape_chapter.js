const axios = require('axios');
const cheerio = require('cheerio');

const url = 'https://www.churchofjesuschrist.org/study/scriptures/nt/matt/1?lang=por';

async function fetchChapter() {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        console.log('Page Title:', $('title').text());

        // Find verses by looking for paragraphs with ids starting with 'p'
        const verses = $('p[id^="p"]');
        console.log('Number of potential verses found:', verses.length);

        verses.slice(0, 10).each((i, el) => {
            console.log(`Verse[${$(el).attr('id')}]: ${$(el).text().trim()}`);
        });

    } catch (error) {
        console.error('Error fetching:', error);
    }
}

fetchChapter();
