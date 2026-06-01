const cheerio = require('cheerio');
const fs = require('fs');

const html = fs.readFileSync('C:\\Users\\Edson Calixto\\.gemini\\antigravity-ide\\brain\\2579a8c2-bea5-4f4c-9dd0-b0b341359254\\.system_generated\\steps\\349\\content.md', 'utf8');
const $ = cheerio.load(html);

const title = $('h1').text().trim();
const ps = [];
$('p').each((i, el) => {
    ps.push($(el).text().trim());
});

console.log({ title });
console.log("Paragraphs:", ps.filter(p => p.length > 20).slice(0, 10));
