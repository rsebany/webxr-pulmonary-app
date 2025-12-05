# Déploiement sur Vercel

Ce projet peut être déployé sur Vercel avec le frontend React et le backend FastAPI.

## Structure du projet

- **Frontend**: React + Vite dans `frontend/`
- **Backend**: FastAPI dans `backend/` (déployé via serverless functions dans `api/`)

## Prérequis

1. Compte Vercel (gratuit)
2. Git repository (GitHub, GitLab, ou Bitbucket)

## Étapes de déploiement

### 1. Préparer le projet localement

```bash
# Installer les dépendances frontend
cd frontend
npm install

# Tester le build
npm run build
```

### 2. Déployer sur Vercel

#### Option A: Via l'interface Vercel (recommandé)

1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez sur "New Project"
3. Importez votre repository Git
4. Configurez le projet:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. Ajoutez les variables d'environnement:
   - `VITE_API_URL` = `/api` (pour utiliser les serverless functions)

6. Cliquez sur "Deploy"

#### Option B: Via CLI Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer
vercel

# Suivre les instructions
```

### 3. Configuration des serverless functions

Les routes API FastAPI seront automatiquement disponibles sous `/api/*`.

Vercel détectera automatiquement:
- `api/index.py` comme serverless function Python
- `api/requirements.txt` pour les dépendances Python

### 4. Variables d'environnement

Dans le dashboard Vercel, ajoutez:

- `VITE_API_URL` = `/api` (pour le frontend)

### 5. Copier les modèles ML

Les modèles ML doivent être copiés dans le dossier `api/` ou `backend/models/` pour être accessibles par les serverless functions.

**Option 1**: Copier les modèles dans `api/`
```bash
mkdir -p api/models
cp backend/models/*.pkl api/models/
```

**Option 2**: Utiliser un service de stockage (S3, etc.) et charger les modèles depuis là

## Structure des routes

- Frontend: `/` (toutes les routes React)
- API: `/api/*` (toutes les routes FastAPI)

Exemples:
- `/api/health` → Health check
- `/api/auth/login` → Login
- `/api/predict` → Prédiction FVC
- `/api/analyze-dicom` → Analyse DICOM

## Limitations Vercel

⚠️ **Important**: Les serverless functions Vercel ont des limitations:

1. **Taille maximale**: 50MB par fonction (incluant les dépendances)
2. **Timeout**: 10 secondes (gratuit) ou 60 secondes (Pro)
3. **Mémoire**: 1024MB maximum
4. **Fichiers volumineux**: Les uploads DICOM peuvent être limités

### Solutions alternatives pour les gros fichiers:

- Utiliser un service de stockage (S3, Cloudinary, etc.)
- Traiter les fichiers DICOM par chunks
- Utiliser un service backend séparé (Railway, Render, etc.) pour le backend

## Dépannage

### Erreur: Module not found
- Vérifiez que `api/requirements.txt` contient toutes les dépendances
- Les dépendances doivent être dans `api/requirements.txt`, pas seulement `backend/requirements.txt`

### Erreur: Models not found
- Copiez les fichiers `.pkl` dans `api/models/`
- Ou modifiez le chemin dans `fastapi_app.py` pour pointer vers un service de stockage

### Erreur: CORS
- Le CORS est déjà configuré dans `fastapi_app.py` avec `allow_origins=["*"]`
- Vérifiez que les requêtes utilisent `/api` et non `http://localhost:8000`

## Support

Pour plus d'informations:
- [Documentation Vercel](https://vercel.com/docs)
- [Vercel Python Runtime](https://vercel.com/docs/concepts/functions/serverless-functions/runtimes/python)

