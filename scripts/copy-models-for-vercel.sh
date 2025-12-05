#!/bin/bash
# Script pour copier les modèles ML vers le dossier api/ pour Vercel

echo "📦 Copie des modèles ML pour Vercel..."

# Créer le dossier api/models s'il n'existe pas
mkdir -p api/models

# Copier les modèles
if [ -d "backend/models" ]; then
    cp backend/models/*.pkl api/models/ 2>/dev/null || echo "⚠️  Aucun fichier .pkl trouvé dans backend/models"
    echo "✅ Modèles copiés vers api/models/"
else
    echo "⚠️  Le dossier backend/models n'existe pas"
fi

echo "✅ Terminé!"

