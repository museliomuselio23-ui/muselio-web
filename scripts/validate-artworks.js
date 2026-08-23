#!/usr/bin/env node

/**
 * Valide les données des œuvres
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../gallery-data.json');

function validateArtworks() {
  console.log('\n🔍 Validating artworks...\n');

  let data;
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (e) {
    console.error('❌ Invalid JSON:', e.message);
    process.exit(1);
  }

  const artworks = data.artworks || [];
  const errors = [];
  const warnings = [];

  for (let i = 0; i < artworks.length; i++) {
    const artwork = artworks[i];

    // Vérifications obligatoires
    if (!artwork.id) errors.push(`[${i}] Missing id`);
    if (!artwork.title) errors.push(`[${i}] Missing title`);
    if (!artwork.artist) warnings.push(`[${i}] Missing artist`);
    if (!artwork.image) errors.push(`[${i}] Missing image URL`);
    if (!artwork.museum) errors.push(`[${i}] Missing museum`);

    // Vérifications de format
    if (artwork.image && !artwork.image.startsWith('http')) {
      errors.push(`[${i}] Invalid image URL format`);
    }

    // Vérifications domaine public
    if (artwork.year && artwork.year > 1930) {
      warnings.push(`[${i}] "${artwork.title}" might not be public domain (year: ${artwork.year})`);
    }
  }

  // Report
  console.log(`📊 Total artworks: ${artworks.length}`);
  console.log(`✅ Valid: ${artworks.length - errors.length}`);

  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`);
    errors.slice(0, 5).forEach(e => console.log(`  • ${e}`));
    if (errors.length > 5) console.log(`  ... and ${errors.length - 5} more`);
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${warnings.length}):`);
    warnings.slice(0, 5).forEach(w => console.log(`  • ${w}`));
    if (warnings.length > 5) console.log(`  ... and ${warnings.length - 5} more`);
  }

  if (errors.length === 0) {
    console.log('\n✅ All validations passed!');
    return true;
  } else {
    console.log('\n❌ Validation failed!');
    process.exit(1);
  }
}

validateArtworks();
