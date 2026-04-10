#!/usr/bin/env node
/**
 * Import venues from a JSON file to the server.
 * Usage: node scripts/import-json.js venues.json [--server URL]
 */
const http = require('http');
const https = require('https');
const fs = require('fs');

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const serverUrl = args.includes('--server') ? args[args.indexOf('--server') + 1] : 'http://localhost:3000';

if (!file) {
  console.error('Usage: node scripts/import-json.js <file.json> [--server URL]');
  process.exit(1);
}

const venues = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log(`Importing ${venues.length} venues from ${file} to ${serverUrl}...`);

const BATCH = 500;
async function run() {
  for (let i = 0; i < venues.length; i += BATCH) {
    const batch = venues.slice(i, i + BATCH);
    const url = new URL(`${serverUrl}/api/venues/bulk`);
    const payload = JSON.stringify({ venues: batch });
    const transport = url.protocol === 'https:' ? https : http;

    const result = await new Promise((resolve, reject) => {
      const req = transport.request({
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(new Error(data.substring(0, 200))); } });
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    console.log(`  Batch ${Math.floor(i/BATCH)+1}: ${result.message}`);
  }
}

run().catch(console.error);
