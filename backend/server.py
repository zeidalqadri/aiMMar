from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Text, DateTime, Integer, JSON, select, update, delete
from dotenv import load_dotenv
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import json

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Database setup
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

# Convert postgresql:// to postgresql+asyncpg:// for asyncpg driver
if DATABASE_URL.startswith('postgresql://'):
    DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+asyncpg://', 1)

# Create async engine
engine = create_async_engine(DATABASE_URL, echo=True)
async_session = async_sessionmaker(engine, expire_on_commit=False)

# Database Models
class Base(DeclarativeBase):
    pass

class StatusCheckDB(Base):
    __tablename__ = "status_checks"
    
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_name: Mapped[str] = mapped_column(String)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class NoteSessionDB(Base):
    __tablename__ = "note_sessions"
    
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    last_modified: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    context: Mapped[dict] = mapped_column(JSON)
    chat_history: Mapped[list] = mapped_column(JSON, default=list)
    living_document: Mapped[str] = mapped_column(Text, default="")
    current_version: Mapped[int] = mapped_column(Integer, default=1)
    versions: Mapped[list] = mapped_column(JSON, default=list)

# Dependency to get database session
async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()

# Pydantic Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class ImageFile(BaseModel):
    name: str
    type: str
    size: int
    base64: str

class ChatEntry(BaseModel):
    id: str
    role: str  # 'user' or 'model'
    text: str
    image: Optional[ImageFile] = None

class NoteContext(BaseModel):
    title: str
    goal: str
    keywords: str
    selectedModel: str

class ChatVersion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    version_number: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    chatHistory: List[ChatEntry]
    livingDocument: str
    modelUsed: str
    checkpoint_name: Optional[str] = None
    auto_checkpoint: bool = True

class NoteSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lastModified: datetime = Field(default_factory=datetime.utcnow)
    context: NoteContext
    chatHistory: List[ChatEntry]
    livingDocument: str
    current_version: int = 1
    versions: List[ChatVersion] = []

class SessionCreate(BaseModel):
    context: NoteContext
    chatHistory: List[ChatEntry] = []
    livingDocument: str = ""

class VersionCreate(BaseModel):
    session_id: str
    checkpoint_name: Optional[str] = None
    auto_checkpoint: bool = True

class ModelSwitch(BaseModel):
    session_id: str
    new_model: str
    create_checkpoint: bool = True

class VersionRestore(BaseModel):
    session_id: str
    version_id: str

# Create FastAPI app
app = FastAPI(title="aiMMar Backend", version="2.0.0")

# CORS middleware
allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,https://018d0cbe.aimmar.pages.dev').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create router
api_router = APIRouter(prefix="/api")

# Routes
@api_router.get("/")
async def root():
    return {"message": "aiMMar Backend v2.0 - NeonDB Edition"}

@api_router.get("/health")
async def health_check():
    """Health check endpoint for Cloud Run"""
    return {"status": "healthy", "service": "aiMMar Backend", "version": "2.0.0"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate, db: AsyncSession = Depends(get_db)):
    status_obj = StatusCheckDB(client_name=input.client_name)
    db.add(status_obj)
    await db.commit()
    await db.refresh(status_obj)
    return StatusCheck(
        id=status_obj.id,
        client_name=status_obj.client_name,
        timestamp=status_obj.timestamp
    )

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StatusCheckDB))
    status_checks = result.scalars().all()
    return [StatusCheck(
        id=sc.id,
        client_name=sc.client_name,
        timestamp=sc.timestamp
    ) for sc in status_checks]

# Session Management Endpoints
@api_router.post("/sessions", response_model=NoteSession)
async def create_session(input: SessionCreate, db: AsyncSession = Depends(get_db)):
    # Create initial version
    initial_version = ChatVersion(
        version_number=1,
        chatHistory=input.chatHistory,
        livingDocument=input.livingDocument,
        modelUsed=input.context.selectedModel,
        checkpoint_name="Initial Version",
        auto_checkpoint=False
    )
    
    session_obj = NoteSessionDB(
        context=input.context.model_dump(),
        chat_history=[entry.model_dump() for entry in input.chatHistory],
        living_document=input.livingDocument,
        current_version=1,
        versions=[initial_version.model_dump()]
    )
    
    db.add(session_obj)
    await db.commit()
    await db.refresh(session_obj)
    
    return NoteSession(
        id=session_obj.id,
        lastModified=session_obj.last_modified,
        context=NoteContext(**session_obj.context),
        chatHistory=[ChatEntry(**entry) for entry in session_obj.chat_history],
        livingDocument=session_obj.living_document,
        current_version=session_obj.current_version,
        versions=[ChatVersion(**version) for version in session_obj.versions]
    )

@api_router.get("/sessions", response_model=List[NoteSession])
async def get_sessions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(NoteSessionDB))
    sessions = result.scalars().all()
    return [NoteSession(
        id=session.id,
        lastModified=session.last_modified,
        context=NoteContext(**session.context),
        chatHistory=[ChatEntry(**entry) for entry in session.chat_history],
        livingDocument=session.living_document,
        current_version=session.current_version,
        versions=[ChatVersion(**version) for version in session.versions]
    ) for session in sessions]

@api_router.get("/sessions/{session_id}", response_model=NoteSession)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(NoteSessionDB).where(NoteSessionDB.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return NoteSession(
        id=session.id,
        lastModified=session.last_modified,
        context=NoteContext(**session.context),
        chatHistory=[ChatEntry(**entry) for entry in session.chat_history],
        livingDocument=session.living_document,
        current_version=session.current_version,
        versions=[ChatVersion(**version) for version in session.versions]
    )

@api_router.put("/sessions/{session_id}", response_model=NoteSession)
async def update_session(session_id: str, session_update: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(NoteSessionDB).where(NoteSessionDB.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Update session fields
    update_dict = {
        "last_modified": datetime.utcnow(),
        **session_update
    }
    
    await db.execute(
        update(NoteSessionDB)
        .where(NoteSessionDB.id == session_id)
        .values(**update_dict)
    )
    await db.commit()
    
    # Fetch updated session
    result = await db.execute(select(NoteSessionDB).where(NoteSessionDB.id == session_id))
    updated_session = result.scalar_one()
    
    return NoteSession(
        id=updated_session.id,
        lastModified=updated_session.last_modified,
        context=NoteContext(**updated_session.context),
        chatHistory=[ChatEntry(**entry) for entry in updated_session.chat_history],
        livingDocument=updated_session.living_document,
        current_version=updated_session.current_version,
        versions=[ChatVersion(**version) for version in updated_session.versions]
    )

@api_router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(delete(NoteSessionDB).where(NoteSessionDB.id == session_id))
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.commit()
    return {"message": "Session deleted successfully"}

# Versioning Endpoints
@api_router.post("/sessions/{session_id}/versions", response_model=ChatVersion)
async def create_version(session_id: str, version_input: VersionCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(NoteSessionDB).where(NoteSessionDB.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Create new version
    new_version_number = session.current_version + 1
    new_version = ChatVersion(
        version_number=new_version_number,
        chatHistory=[ChatEntry(**entry) for entry in session.chat_history],
        livingDocument=session.living_document,
        modelUsed=session.context['selectedModel'],
        checkpoint_name=version_input.checkpoint_name,
        auto_checkpoint=version_input.auto_checkpoint
    )
    
    # Add to versions list
    versions = session.versions.copy()
    versions.append(new_version.model_dump())
    
    # Update in database
    await db.execute(
        update(NoteSessionDB)
        .where(NoteSessionDB.id == session_id)
        .values(versions=versions, current_version=new_version_number)
    )
    await db.commit()
    
    return new_version

@api_router.get("/sessions/{session_id}/versions", response_model=List[ChatVersion])
async def get_versions(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(NoteSessionDB).where(NoteSessionDB.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return [ChatVersion(**version) for version in session.versions]

@api_router.post("/sessions/{session_id}/restore")
async def restore_version(version_restore: VersionRestore, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(NoteSessionDB).where(NoteSessionDB.id == version_restore.session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Find the version to restore
    target_version = None
    for version in session.versions:
        if version['id'] == version_restore.version_id:
            target_version = ChatVersion(**version)
            break
    
    if not target_version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # Create a checkpoint of current state before restoring
    current_checkpoint = ChatVersion(
        version_number=session.current_version + 1,
        chatHistory=[ChatEntry(**entry) for entry in session.chat_history],
        livingDocument=session.living_document,
        modelUsed=session.context['selectedModel'],
        checkpoint_name=f"Auto-backup before restore to v{target_version.version_number}",
        auto_checkpoint=True
    )
    
    versions = session.versions.copy()
    versions.append(current_checkpoint.model_dump())
    
    # Restore to target version
    context = session.context.copy()
    context['selectedModel'] = target_version.modelUsed
    
    await db.execute(
        update(NoteSessionDB)
        .where(NoteSessionDB.id == version_restore.session_id)
        .values(
            chat_history=[entry.model_dump() for entry in target_version.chatHistory],
            living_document=target_version.livingDocument,
            context=context,
            versions=versions,
            current_version=current_checkpoint.version_number,
            last_modified=datetime.utcnow()
        )
    )
    await db.commit()
    
    return {"message": f"Session restored to version {target_version.version_number}"}

@api_router.post("/sessions/{session_id}/switch-model")
async def switch_model(model_switch: ModelSwitch, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(NoteSessionDB).where(NoteSessionDB.id == model_switch.session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    update_dict = {"last_modified": datetime.utcnow()}
    
    # Create checkpoint if requested
    if model_switch.create_checkpoint:
        checkpoint = ChatVersion(
            version_number=session.current_version + 1,
            chatHistory=[ChatEntry(**entry) for entry in session.chat_history],
            livingDocument=session.living_document,
            modelUsed=session.context['selectedModel'],
            checkpoint_name=f"Before model switch to {model_switch.new_model}",
            auto_checkpoint=True
        )
        
        versions = session.versions.copy()
        versions.append(checkpoint.model_dump())
        update_dict["versions"] = versions
        update_dict["current_version"] = checkpoint.version_number
    
    # Switch model
    context = session.context.copy()
    context['selectedModel'] = model_switch.new_model
    update_dict["context"] = context
    
    await db.execute(
        update(NoteSessionDB)
        .where(NoteSessionDB.id == model_switch.session_id)
        .values(**update_dict)
    )
    await db.commit()
    
    return {"message": f"Model switched to {model_switch.new_model}"}

@api_router.delete("/sessions/{session_id}/versions/{version_id}")
async def delete_version(session_id: str, version_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(NoteSessionDB).where(NoteSessionDB.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Don't allow deletion of the initial version
    if len(session.versions) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the only version")
    
    # Find and remove the version
    versions = [v for v in session.versions if v['id'] != version_id]
    
    await db.execute(
        update(NoteSessionDB)
        .where(NoteSessionDB.id == session_id)
        .values(versions=versions)
    )
    await db.commit()
    
    return {"message": "Version deleted successfully"}

# Include router
app.include_router(api_router)

# Database initialization
async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# Startup event
@app.on_event("startup")
async def startup():
    await init_db()
    logging.info("Database initialized")

# Shutdown event
@app.on_event("shutdown")
async def shutdown():
    await engine.dispose()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv('PORT', 8000))
    host = os.getenv('HOST', '0.0.0.0')
    uvicorn.run(app, host=host, port=port)
