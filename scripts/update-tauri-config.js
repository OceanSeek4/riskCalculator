#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '../src-tauri/tauri.conf.json');

// Get port from environment variables
const devPort = process.env.VITE_DEV_PORT || '1420';
const devUrl = `http://localhost:${devPort}`;

console.log(`Updating Tauri config to use port ${devPort}`);

try {
  // Read current config
  const configContent = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(configContent);
  
  // Update devUrl
  config.build.devUrl = devUrl;
  
  // Write updated config
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  console.log(`✅ Tauri config updated: devUrl = ${devUrl}`);
} catch (error) {
  console.error('❌ Failed to update Tauri config:', error.message);
  process.exit(1);
}