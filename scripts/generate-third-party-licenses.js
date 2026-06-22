const fs = require('fs');
const path = require('path');
const licenseChecker = require('license-checker');

const OUTPUT_PATH = path.join(__dirname, '../license/THIRD_PARTY_LICENSES.md');
const PROJECT_ROOT = path.join(__dirname, '..');

const spdxUrls = {
  '0BSD': 'https://spdx.org/licenses/0BSD.html',
  'Apache-2.0': 'https://spdx.org/licenses/Apache-2.0.html',
  'Apache 2.0': 'https://spdx.org/licenses/Apache-2.0.html',
  'Apache*': 'https://spdx.org/licenses/Apache-2.0.html',
  'Apache-Style': 'https://spdx.org/licenses/Apache-2.0.html',
  '(Apache-2.0 OR MPL-1.1)': 'https://spdx.org/licenses/Apache-2.0.html',
  'Artistic-2.0': 'https://spdx.org/licenses/Artistic-2.0.html',
  'BSD': 'https://spdx.org/licenses/BSD-2-Clause.html',
  'BSD*': 'https://spdx.org/licenses/BSD-2-Clause.html',
  'BSD-2-Clause': 'https://spdx.org/licenses/BSD-2-Clause.html',
  '(BSD-2-Clause OR WTFPL)': 'https://spdx.org/licenses/BSD-2-Clause.html',
  'BSD-3-Clause': 'https://spdx.org/licenses/BSD-3-Clause.html',
  '(BSD-3-Clause OR GPL-2.0)': 'https://spdx.org/licenses/BSD-3-Clause.html',
  '(AFL-2.1 OR BSD-3-Clause)': 'https://spdx.org/licenses/BSD-3-Clause.html',
  'BlueOak-1.0.0': 'https://spdx.org/licenses/BlueOak-1.0.0.html',
  'CC-BY-3.0': 'https://spdx.org/licenses/CC-BY-3.0.html',
  'CC-BY-4.0': 'https://spdx.org/licenses/CC-BY-4.0.html',
  'CC0-1.0': 'https://spdx.org/licenses/CC0-1.0.html',
  'ISC': 'https://spdx.org/licenses/ISC.html',
  'MIT': 'https://spdx.org/licenses/MIT.html',
  'MIT*': 'https://spdx.org/licenses/MIT.html',
  'MIT-0': 'https://spdx.org/licenses/MIT-0.html',
  'MIT, CC-BY-SA-4.0': 'https://spdx.org/licenses/MIT.html',
  '(MIT AND BSD-3-Clause)': 'https://spdx.org/licenses/MIT.html',
  '(MIT AND CC-BY-3.0)': 'https://spdx.org/licenses/MIT.html',
  '(MIT AND Zlib)': 'https://spdx.org/licenses/MIT.html',
  '(MIT OR Apache-2.0)': 'https://spdx.org/licenses/MIT.html',
  '(MIT OR CC0-1.0)': 'https://spdx.org/licenses/MIT.html',
  '(MIT OR GPL-3.0-or-later)': 'https://spdx.org/licenses/MIT.html',
  '(WTFPL OR MIT)': 'https://spdx.org/licenses/MIT.html',
  'MPL-2.0': 'https://spdx.org/licenses/MPL-2.0.html',
  'Python-2.0': 'https://spdx.org/licenses/Python-2.0.html',
  'Unlicense': 'https://spdx.org/licenses/Unlicense.html',
  '(Unlicense OR Apache-2.0)': 'https://spdx.org/licenses/Unlicense.html',
  'UNLICENSED': '',
  'WTFPL': 'https://spdx.org/licenses/WTFPL.html',
  'Public Domain': '',
};

function getLicenseUrl(license, repository) {
  if (typeof license !== 'string') return repository || '';
  if (license.startsWith('Custom: ')) {
    return license.slice('Custom: '.length).trim();
  }
  const mapped = spdxUrls[license];
  if (mapped !== undefined) return mapped;
  return repository || '';
}

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

licenseChecker.init({ start: PROJECT_ROOT }, (err, data) => {
  if (err) {
    console.error('Error running license-checker:', err);
    process.exit(1);
  }

  const rows = Object.entries(data).map(([pkgAtVersion, info]) => {
    const lastAt = pkgAtVersion.lastIndexOf('@');
    const name = pkgAtVersion.slice(0, lastAt);
    const version = pkgAtVersion.slice(lastAt + 1);
    const rawLicense = info.licenses;
    const license = Array.isArray(rawLicense) ? rawLicense.join(', ') : (rawLicense || 'Unknown');
    const licenseUrl = getLicenseUrl(license, info.repository);
    return { name, version, license, licenseUrl };
  });

  rows.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  const lines = [];
  lines.push('# Third-Party Licenses');
  lines.push('');
  lines.push('This file lists the third-party npm packages distributed with this project (the runtime dependency closure of `package.json`) and their licenses, in fulfillment of the attribution requirements of those licenses.');
  lines.push('');
  lines.push('Generated from the installed environment. Total packages: **' + rows.length + '**.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Package | Version | License | URL |');
  lines.push('|---|---|---|---|');

  for (const row of rows) {
    const urlCell = row.licenseUrl ? `[${row.licenseUrl}](${row.licenseUrl})` : '';
    lines.push(`| ${row.name} | ${row.version} | ${row.license} | ${urlCell} |`);
  }

  const output = lines.join('\n') + '\n';
  fs.writeFileSync(OUTPUT_PATH, output);
  console.log(`Written ${rows.length} packages to ${OUTPUT_PATH}`);
});
