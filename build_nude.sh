#!/bin/bash
# Scraper Nudités Musées (Bash + curl)

echo "🎨 Scraper Nudités — Domaine Public"
echo "========================================="

NUDE_JSON="galerie/nude-musees.json"
IMG_DIR="img/nude"
mkdir -p "$IMG_DIR"

# Fonction pour télécharger une image
download_img() {
    local url="$1"
    local name="$2"
    if [ -z "$url" ] || [ -z "$name" ]; then return 1; fi
    
    local outfile="$IMG_DIR/$name"
    curl -s --max-time 10 -L -o "$outfile" "$url" 2>/dev/null
    if [ -f "$outfile" ] && [ -s "$outfile" ]; then
        echo "$outfile"
        return 0
    fi
    return 1
}

# Met Museum API
echo -e "\n1️⃣  MET MUSEUM (API)"
echo "================================================"

# Chercher "nude" + "female figure"
# Note: Met API limite sans clé → on prend les 5 premiers résultats
for q in "nude%20female" "venus" "nymph%20bathing"; do
    echo "Recherche: $q"
    
    search_url="https://collectionapi.metmuseum.org/public/collection/v1/search?q=$q&isPublicDomain=true&hasImages=true"
    
    # Récupérer les IDs (limité à 5)
    ids=$(curl -s "$search_url" | grep -o '"objectID":[0-9]*' | head -5 | cut -d: -f2)
    
    for id in $ids; do
        detail_url="https://collectionapi.metmuseum.org/public/collection/v1/objects/$id"
        
        # Récupérer les détails
        obj=$(curl -s "$detail_url")
        title=$(echo "$obj" | grep -o '"title":"[^"]*' | head -1 | cut -d: -f2 | sed 's/"//g')
        artist=$(echo "$obj" | grep -o '"artistDisplayName":"[^"]*' | head -1 | cut -d: -f2 | sed 's/"//g')
        img_url=$(echo "$obj" | grep -o '"primaryImage":"[^"]*' | head -1 | cut -d: -f2 | sed 's/"//g')
        
        if [ -n "$img_url" ] && [ -n "$title" ]; then
            echo -n "  $title... "
            img_file="met_${id}.jpg"
            if download_img "$img_url" "$img_file"; then
                echo "✓"
            else
                echo "✗ (image échec)"
            fi
        fi
    done
done

echo -e "\n✅ Scrape terminé"
echo "📁 Images stockées: $IMG_DIR/"
