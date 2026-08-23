#!/usr/bin/env node

/**
 * Script de récupération automatique des œuvres depuis les APIs des musées
 * Sources: The Met, Smithsonian, Wikidata, Rijksmuseum, Gallica
 * Filtrage: Domaine public (CC0, Public Domain)
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  OUTPUT_FILE: path.join(__dirname, '../gallery-data.json'),
  MAX_RETRIES: 3,
  TIMEOUT: 10000,
  BATCH_SIZE: 100
};

// Charger les données existantes
function loadExistingData() {
  try {
    if (fs.existsSync(CONFIG.OUTPUT_FILE)) {
      const data = fs.readFileSync(CONFIG.OUTPUT_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.log('Note: Using empty gallery');
  }
  return { artworks: [] };
}

// Fetch avec retry
async function fetchWithRetry(url, options = {}) {
  for (let i = 0; i < CONFIG.MAX_RETRIES; i++) {
    try {
      const response = await fetch(url, {
        timeout: CONFIG.TIMEOUT,
        headers: { 'User-Agent': 'Muselio/1.0' },
        ...options
      });

      if (!response.ok) {
        if (i === CONFIG.MAX_RETRIES - 1) throw new Error(`HTTP ${response.status}`);
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }

      return await response.json();
    } catch (e) {
      console.log(`  Retry ${i + 1}/${CONFIG.MAX_RETRIES}: ${e.message}`);
      if (i === CONFIG.MAX_RETRIES - 1) throw e;
    }
  }
}

/**
 * Fetch The Met Museum API
 * 375K+ œuvres en domaine public
 */
async function fetchMetMuseum() {
  console.log('\n🏛️  The Met Museum API');
  const artworks = [];

  try {
    // Chercher les IDs des objets du domaine public
    const searchUrl = 'https://collectionapi.metmuseum.org/public/collection/v1/search?q=public%20domain&limit=100';
    const searchData = await fetchWithRetry(searchUrl);

    if (!searchData.objectIDs || searchData.objectIDs.length === 0) {
      console.log('  ❌ No public domain objects found');
      return artworks;
    }

    console.log(`  📊 Found ${searchData.objectIDs.length} objects`);

    // Récupérer les détails pour un sample (limiter pour performance)
    const sampleSize = Math.min(50, searchData.objectIDs.length);
    for (let i = 0; i < sampleSize; i++) {
      const objectID = searchData.objectIDs[i];

      try {
        const detailUrl = `https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectID}`;
        const object = await fetchWithRetry(detailUrl);

        if (object.isPublicDomain && object.primaryImage) {
          artworks.push({
            id: `met-${objectID}`,
            title: object.title || 'Unknown',
            artist: object.artistDisplayName || 'Unknown',
            year: object.objectDate ? parseInt(object.objectDate) : null,
            image: object.primaryImage,
            museum: 'The Met Museum',
            url: object.objectURL,
            description: object.medium || '',
            source: 'met_museum',
            license: 'public_domain'
          });
        }
      } catch (e) {
        // Continue si un objet échoue
      }
    }

    console.log(`  ✅ Fetched ${artworks.length} artworks`);
  } catch (e) {
    console.error(`  ❌ Error: ${e.message}`);
  }

  return artworks;
}

/**
 * Fetch Smithsonian API
 * 2M+ objets en domaine public
 */
async function fetchSmithsonian() {
  console.log('\n🏢 Smithsonian API');
  const artworks = [];

  try {
    const apiKey = process.env.SMITHSONIAN_API_KEY || 'open';
    const baseUrl = `https://api.si.edu/openaccess/api/v1.0`;

    // Rechercher les œuvres d'art du domaine public
    const searchUrl = `${baseUrl}/search?api_key=${apiKey}&q=public%20domain%20art&rows=100`;
    const response = await fetchWithRetry(searchUrl);

    if (!response.response || !response.response.rows) {
      console.log('  ❌ No data returned');
      return artworks;
    }

    console.log(`  📊 Found ${response.response.rows.length} objects`);

    for (const item of response.response.rows) {
      if (item.id && item.title) {
        artworks.push({
          id: `si-${item.id}`,
          title: item.title,
          artist: item.peopleTag ? item.peopleTag[0] : 'Unknown',
          year: item.dateText ? parseInt(item.dateText) : null,
          image: item.images && item.images.length > 0 ? item.images[0] : null,
          museum: 'Smithsonian Institution',
          url: item.url || '',
          description: item.summary || '',
          source: 'smithsonian',
          license: 'public_domain'
        });
      }
    }

    console.log(`  ✅ Fetched ${artworks.length} artworks`);
  } catch (e) {
    console.error(`  ❌ Error: ${e.message}`);
  }

  return artworks;
}

/**
 * Fetch Wikidata
 * Données ouvertes, domaine public
 */
async function fetchWikidata() {
  console.log('\n📚 Wikidata API');
  const artworks = [];

  try {
    const sparqlQuery = `
      SELECT ?item ?itemLabel ?creatorLabel ?date ?image WHERE {
        ?item wdt:P31 wd:Q3305213 .
        ?item wdt:P571 ?date .
        ?item wdt:P18 ?image .
        ?item wdt:P170 ?creator .
        FILTER(YEAR(?date) < 1930)
        SERVICE wikibase:label {
          bd:serviceParam wikibase:language "en" .
          ?item rdfs:label ?itemLabel .
          ?creator rdfs:label ?creatorLabel .
        }
      }
      LIMIT 100
    `;

    const encodedQuery = encodeURIComponent(sparqlQuery);
    const url = `https://query.wikidata.org/sparql?query=${encodedQuery}&format=json`;

    const response = await fetchWithRetry(url);

    if (!response.results || !response.results.bindings) {
      console.log('  ❌ No data returned');
      return artworks;
    }

    console.log(`  📊 Found ${response.results.bindings.length} objects`);

    for (const binding of response.results.bindings) {
      const year = binding.date ? parseInt(binding.date.value.split('-')[0]) : null;

      artworks.push({
        id: `wikidata-${binding.item.value.split('/').pop()}`,
        title: binding.itemLabel.value,
        artist: binding.creatorLabel ? binding.creatorLabel.value : 'Unknown',
        year: year,
        image: binding.image ? binding.image.value : null,
        museum: 'Wikidata / Wikimedia Commons',
        url: binding.item.value,
        description: '',
        source: 'wikidata',
        license: 'cc0'
      });
    }

    console.log(`  ✅ Fetched ${artworks.length} artworks`);
  } catch (e) {
    console.error(`  ❌ Error: ${e.message}`);
  }

  return artworks;
}

/**
 * Filtrer domaine public
 */
function filterPublicDomain(artwork) {
  // Vérifier la licence
  if (!['public_domain', 'cc0', 'cc-by'].includes(artwork.license || 'public_domain')) {
    return false;
  }

  // Vérifier l'année (avant 1930 pour USA)
  if (artwork.year && artwork.year > 1930) {
    return false;
  }

  // Vérifier qu'on a une image
  if (!artwork.image) {
    return false;
  }

  return true;
}

/**
 * Dédupliquer les œuvres
 */
function deduplicateArtworks(allArtworks) {
  const seen = new Set();
  const unique = [];

  for (const artwork of allArtworks) {
    // Utiliser titre + artiste comme clé de déduplication
    const key = `${artwork.title.toLowerCase()}-${artwork.artist.toLowerCase()}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(artwork);
    }
  }

  return unique;
}

/**
 * Enrichir les métadonnées
 */
function enrichMetadata(artworks) {
  return artworks.map(artwork => ({
    ...artwork,
    id: artwork.id || `${artwork.source}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    verified: true
  }));
}

/**
 * Sauvegarder les données
 */
function saveArtworks(artworks) {
  const output = { artworks };

  fs.writeFileSync(
    CONFIG.OUTPUT_FILE,
    JSON.stringify(output, null, 2),
    'utf-8'
  );

  console.log(`\n✅ Saved ${artworks.length} artworks to ${CONFIG.OUTPUT_FILE}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🎨 Muselio - Automated Artwork Fetcher');
  console.log('=====================================\n');

  try {
    // Charger les données existantes
    const existing = loadExistingData();
    console.log(`📦 Starting with ${existing.artworks.length} existing artworks\n`);

    // Récupérer depuis toutes les sources
    console.log('📥 Fetching from APIs...\n');
    const metArtworks = await fetchMetMuseum();
    const smithsonianArtworks = await fetchSmithsonian();
    const wikidataArtworks = await fetchWikidata();

    // Combiner toutes les œuvres
    let allArtworks = [
      ...metArtworks,
      ...smithsonianArtworks,
      ...wikidataArtworks
    ];

    console.log(`\n📊 Total fetched: ${allArtworks.length} artworks`);

    // Filtrer domaine public
    allArtworks = allArtworks.filter(filterPublicDomain);
    console.log(`✅ After public domain filter: ${allArtworks.length} artworks`);

    // Dédupliquer
    allArtworks = deduplicateArtworks(allArtworks);
    console.log(`✅ After deduplication: ${allArtworks.length} artworks`);

    // Enrichir
    allArtworks = enrichMetadata(allArtworks);

    // Combiner avec les données existantes (nouvelles d'abord)
    const combined = [...allArtworks];
    const existingIds = new Set(combined.map(a => a.id));

    for (const artwork of existing.artworks) {
      if (!existingIds.has(artwork.id)) {
        combined.push(artwork);
      }
    }

    console.log(`\n📚 Final collection: ${combined.length} artworks`);

    // Sauvegarder
    saveArtworks(combined);

    console.log('\n✨ Update complete!');
  } catch (e) {
    console.error('\n❌ Fatal error:', e.message);
    process.exit(1);
  }
}

main();
