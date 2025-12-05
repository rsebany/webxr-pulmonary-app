# Script PowerShell pour copier les modèles ML vers le dossier api/ pour Vercel

Write-Host "📦 Copie des modèles ML pour Vercel..." -ForegroundColor Cyan

# Créer le dossier api/models s'il n'existe pas
if (-not (Test-Path "api/models")) {
    New-Item -ItemType Directory -Path "api/models" | Out-Null
}

# Copier les modèles
if (Test-Path "backend/models") {
    $pklFiles = Get-ChildItem -Path "backend/models" -Filter "*.pkl"
    if ($pklFiles.Count -gt 0) {
        Copy-Item -Path "backend/models/*.pkl" -Destination "api/models/" -Force
        Write-Host "✅ Modèles copiés vers api/models/" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Aucun fichier .pkl trouvé dans backend/models" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Le dossier backend/models n'existe pas" -ForegroundColor Yellow
}

Write-Host "✅ Terminé!" -ForegroundColor Green

