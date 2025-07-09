#!/usr/bin/env python3
"""
Setup script for NeonDB backend configuration.
This script helps configure the aiMMar backend to use NeonDB.
"""

import os
import sys
from pathlib import Path

def create_env_template():
    """Create a .env template file with NeonDB configuration."""
    env_template = """# NeonDB Configuration
# Replace with your actual NeonDB connection string
DATABASE_URL=postgresql://username:password@ep-example.us-east-1.aws.neon.tech/dbname?sslmode=require

# Server Configuration
PORT=8000
HOST=0.0.0.0

# CORS Configuration (add your frontend URLs)
ALLOWED_ORIGINS=http://localhost:3000,https://aimmar.zeidgeist.com
"""
    
    env_path = Path(__file__).parent / '.env'
    
    if env_path.exists():
        print(f"✅ .env file already exists at {env_path}")
        return
    
    with open(env_path, 'w') as f:
        f.write(env_template)
    
    print(f"✅ Created .env template at {env_path}")
    print("📝 Please update the DATABASE_URL with your actual NeonDB connection string")

def check_requirements():
    """Check if all required packages are installed."""
    try:
        import fastapi
        import uvicorn
        import sqlalchemy
        import asyncpg
        import alembic
        print("✅ All required packages are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing package: {e.name}")
        print("📦 Please install requirements: pip install -r requirements.txt")
        return False

def print_neondb_setup_instructions():
    """Print instructions for setting up NeonDB."""
    print("\n🚀 NeonDB Setup Instructions:")
    print("=" * 50)
    print("1. Go to https://neon.tech and create a free account")
    print("2. Create a new project")
    print("3. Copy the connection string from your project dashboard")
    print("4. Update the DATABASE_URL in the .env file")
    print("5. The connection string should look like:")
    print("   postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require")
    print("\n📋 Next Steps:")
    print("1. Update .env with your NeonDB connection string")
    print("2. Run: python -m uvicorn server:app --reload")
    print("3. Your backend will be available at http://localhost:8000")
    print("4. Update frontend .env.local with: NEXT_PUBLIC_BACKEND_URL=http://localhost:8000")

def main():
    """Main setup function."""
    print("🔧 Setting up aiMMar Backend with NeonDB")
    print("=" * 40)
    
    # Create .env template
    create_env_template()
    
    # Check requirements
    if not check_requirements():
        return
    
    # Print setup instructions
    print_neondb_setup_instructions()
    
    print("\n✨ Setup complete! Follow the instructions above to configure NeonDB.")

if __name__ == "__main__":
    main()