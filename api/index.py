"""
Vercel Serverless Function wrapper for FastAPI
"""
import sys
import os
from pathlib import Path

# Ajouter le chemin du backend au PYTHONPATH
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

# Importer l'application FastAPI
from fastapi_app import app
from mangum import Mangum

# Wrapper Mangum pour adapter FastAPI à AWS Lambda/Vercel
handler = Mangum(app, lifespan="off")

