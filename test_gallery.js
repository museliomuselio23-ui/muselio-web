// Test script — vérifie que tout fonctionne
console.log("🧪 TEST GALLERY v31");

// Test 1 : Fichiers critiques
const files = [
  'index.html',
  'sw.js',
  'manifest.json',
  'i18n.js',
  'galerie/nude-local.json',
  'galerie/nude-musees.json',
  'img/femmes/cma101646.jpg'
];

Promise.all(files.map(f => 
  fetch(f, {method: 'HEAD'}).then(r => ({file: f, ok: r.ok, status: r.status}))
)).then(results => {
  console.log("\n📁 FICHIERS:");
  results.forEach(r => {
    const status = r.ok ? '✅' : '❌';
    console.log(`  ${status} ${r.file} (${r.status})`);
  });
  
  // Test 2 : SW version
  fetch('sw.js').then(r => r.text()).then(text => {
    const match = text.match(/const CACHE = 'muselio-shell-v(\d+)'/);
    const version = match ? match[1] : 'unknown';
    console.log(`\n⚙️  SERVICE WORKER: v${version}`);
  });
  
  // Test 3 : JSON schemas
  Promise.all([
    fetch('galerie/nude-local.json').then(r => r.json()),
    fetch('galerie/nude-musees.json').then(r => r.json())
  ]).then(([nude, museums]) => {
    console.log(`\n📊 CATALOGUES:`);
    console.log(`  • Nude local: ${nude.count || 0} items`);
    console.log(`  • Nude museums: ${museums.count || 0} items`);
    console.log(`  TOTAL: ${(nude.count || 0) + (museums.count || 0)} nus`);
  });
});
