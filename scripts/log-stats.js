#!/usr/bin/env node

/**
 * Affiche les statistiques de la galerie
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../gallery-data.json');

function logStats() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const artworks = data.artworks || [];

  console.log('\n📊 GALLERY STATISTICS');
  console.log('====================\n');

  // Compteurs
  console.log(`📚 Total artworks: ${artworks.length}`);

  // Par source
  const bySource = {};
  const byMuseum = {};
  const byLicense = {};
  let minYear = 9999;
  let maxYear = 0;
  let imagesCount = 0;

  for (const artwork of artworks) {
    bySource[artwork.source] = (bySource[artwork.source] || 0) + 1;
    byMuseum[artwork.museum] = (byMuseum[artwork.museum] || 0) + 1;
    byLicense[artwork.license] = (byLicense[artwork.license] || 0) + 1;

    if (artwork.image) imagesCount++;
    if (artwork.year) {
      minYear = Math.min(minYear, artwork.year);
      maxYear = Math.max(maxYear, artwork.year);
    }
  }

  // Source breakdown
  console.log('\n📍 By Source:');
  Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .forEach(([source, count]) => {
      console.log(`  • ${source}: ${count}`);
    });

  // Museum breakdown
  console.log('\n🏛️  By Museum:');
  Object.entries(byMuseum)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([museum, count]) => {
      console.log(`  • ${museum}: ${count}`);
    });

  // License breakdown
  console.log('\n📜 By License:');
  Object.entries(byLicense)
    .sort((a, b) => b[1] - a[1])
    .forEach(([license, count]) => {
      console.log(`  • ${license}: ${count}`);
    });

  // Coverage
  console.log('\n📊 Coverage:');
  console.log(`  • With images: ${imagesCount}/${artworks.length} (${Math.round(imagesCount/artworks.length*100)}%)`);
  console.log(`  • Date range: ${minYear === 9999 ? 'N/A' : minYear} - ${maxYear || 'N/A'}`);

  console.log('\n✅ Statistics logged\n');
}

logStats();
