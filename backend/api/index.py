import sys
import os

# Add the parent directory to the path to import from server.py
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the FastAPI app from server.py
try:
    from server import app
    print("Successfully imported FastAPI app from server.py")
except ImportError as e:
    print(f"Failed to import from server.py: {e}")
    # Fallback: create a minimal app if server.py import fails
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    
    app = FastAPI(title="aiMMar Backend", version="1.0.0")
    
    # Configure CORS for frontend integration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "https://018d0cbe.aimmar.pages.dev"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    @app.get("/")
    async def root():
        return {"message": "aiMMar Backend API - Fallback", "status": "running"}
    
    @app.get("/health")
    async def health():
        return {"status": "healthy"}

# For Vercel serverless functions, we need to export the app
# The app is already configured with CORS and all routes from server.py 