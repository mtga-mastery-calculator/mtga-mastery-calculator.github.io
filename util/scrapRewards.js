const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');

const url = 'https://magic.wizards.com/en/mtgarena/drop-rates';
// DSK https://web.archive.org/web/20241105235140/https://magic.wizards.com/en/mtgarena/drop-rates (60)
// BLB https://web.archive.org/web/20240831232557/https://magic.wizards.com/en/mtgarena/drop-rates (60)
// OTJ https://web.archive.org/web/20240721180320/https://magic.wizards.com/en/mtgarena/drop-rates (110)
// MKM https://web.archive.org/web/20240322165651/https://magic.wizards.com/en/mtgarena/drop-rates (70)
// LCI https://web.archive.org/web/20240102213410/https://magic.wizards.com/en/mtgarena/drop-rates (90)


fetch(url)
  .then(response => response.text())
  .then(html => {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    let tableFound = false;

    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
      if (headers.includes('Set Mastery Pass')) {
        const masteryPassIndex = headers.indexOf('Set Mastery Pass');
        tableFound = true;
        const rows = Array.from(table.querySelectorAll('tr')).slice(1); // Skip header row
        const data = rows.map(row => {
          const cells = row.querySelectorAll('td');
          return [ parseInt(cells[0].textContent.trim()), cells[masteryPassIndex].textContent.trim()];
        });
        const processedData = [];
        data.forEach(([level, reward], i) => {
          if (!isNaN(level) && level != i + 1) {
            console.log("Level mismatch", level, i + 1);
          }
          const split = reward.split(/, (?=[^,]*\b(?:Gems|Gold|Orb|Sleeve|Avatar|Companion|Pet|CS|ICR)\b)/).flatMap(s => s.split(/(?<=Orbs?) & /));
          processedData.push(split.map(reward => {
            let count = 1;
            let item = reward;
            let set;
            

          const match = reward.match(/^(\d+)(?:x)?\s+(.*)$/);
          if (match) {
            count = parseInt(match[1]);
            item = match[2];
          }
          const setMatch = item.match(/^(\w{3}) (Booster)$/);
          if (setMatch) [, set, item] = setMatch;
          const styleMatch = item.match(/^(.* CS)(?::| -) (.*)$/);
          if (styleMatch) [, item, set] = styleMatch;
          const emoteMatch = item.match(/^(.* Emote) - (.*)$/);
          if (emoteMatch) [, item, set] = emoteMatch;
          const cardMatch = item.match(/^(.* Card)(?: –| -) (.*)$/); // OTJ
          if (cardMatch) [, item, set] = cardMatch;


          return set ? [ count, item, set ] : [ count, item ];
          }));
        });

        console.log(JSON.stringify(processedData));
      }
    });

    if (!tableFound) {
      console.log('No table found with "set mastery pass" column header.');
    }
  })
  .catch(error => {
    console.error('Error fetching the webpage:', error);
  });
