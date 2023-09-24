import { join } from 'path';

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Changes the cache location for Puppeteer.
    cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
    // executablePath: '/Users/incognito/dev/bin/brave',
    defaultProduct: 'firefox',
};