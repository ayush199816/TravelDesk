const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 Checking for available browsers...');

const possiblePaths = [
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/snap/bin/chromium',
  '/usr/local/bin/chromium',
  '/usr/local/bin/google-chrome'
];

console.log('\n📁 Checking browser paths:');
possiblePaths.forEach(path => {
  try {
    if (fs.existsSync(path)) {
      console.log(`✅ Found: ${path}`);
      try {
        const version = execSync(`${path} --version`, { encoding: 'utf8' });
        console.log(`   Version: ${version.trim()}`);
      } catch (err) {
        console.log(`   Could not get version`);
      }
    } else {
      console.log(`❌ Not found: ${path}`);
    }
  } catch (err) {
    console.log(`❌ Error checking ${path}: ${err.message}`);
  }
});

console.log('\n📦 Checking Puppeteer browser cache:');
try {
  const cachePath = '/opt/render/.cache/puppeteer';
  if (fs.existsSync(cachePath)) {
    console.log(`✅ Cache directory exists: ${cachePath}`);
    const contents = fs.readdirSync(cachePath);
    console.log('Contents:', contents);
  } else {
    console.log(`❌ Cache directory not found: ${cachePath}`);
  }
} catch (err) {
  console.log(`❌ Error checking cache: ${err.message}`);
}

console.log('\n🌍 Environment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('RENDER:', process.env.RENDER);
console.log('PUPPETEER_CACHE_DIR:', process.env.PUPPETEER_CACHE_DIR);
