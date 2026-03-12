import * as fs from 'fs';

const html = fs.readFileSync('nepsealpha_shivm.html', 'utf8');

// The price is typically inside `<span style="font-size: 2rem;"> 670 </span>`
const ltpMatch = html.match(/style="font-size:\s*2rem;"[^>]*>\s*([\d.,]+)\s*<\/span>/) ||
                 html.match(/<span[^>]*style="color:\s*rgb\(220,\s*53,\s*69\);"\s*[^>]*>\s*<i[^>]*><\/i>\s*<em[^>]*>\s*([-+\d.,]+)%\s*<\/em>/)

// Let's just find the text surrounding "Manufacturing And Processing"
const indexOfSector = html.indexOf("Manufacturing And Processing");
const surrounding = html.substring(indexOfSector - 1500, indexOfSector + 500);
console.log(surrounding);

// Let's find "Volume:"
const indexOfVol = html.indexOf("Volume:");
const surroundingVol = html.substring(indexOfVol - 200, indexOfVol + 200);
console.log("VOLUME HTML:\n", surroundingVol);

