import json

with open('galerie-libre.json') as f:
    data = json.load(f)

artists = ["Bouguereau", "Cabanel", "Modigliani"]
keywords = ["nude", "naked", "venus", "vénus", "bather", "baigneuse", "baigneur", "odalisque", "nymph", "nymphe", "bathing", "bijin", "courtesan", "courtisane", "geisha"]
exclude = ["nymphea", "nymphéa", "water lil", "nénuphar", "waterlil"]

count = 0
by_cat = {}

for item in data.get('items', []):
    artist = item.get('artist', '').lower()
    title = item.get('title', '').lower()
    cat = item.get('cat', 'unknown')
    
    # Check artist
    artist_match = any(a.lower() in artist for a in artists)
    
    # Check keywords
    keyword_match = any(kw.lower() in title for kw in keywords)
    
    # Check exclusions
    excluded = any(ex.lower() in title for ex in exclude)
    
    if (artist_match or keyword_match) and not excluded:
        count += 1
        by_cat[cat] = by_cat.get(cat, 0) + 1

print(f"📊 Parcours 'Histoire du nu': {count} œuvres (Artvee)")
print(f"\nRépartition par catégorie:")
for cat, cnt in sorted(by_cat.items(), key=lambda x: -x[1]):
    print(f"  {cat}: {cnt}")
