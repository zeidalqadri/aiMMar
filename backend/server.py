from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Versioning Models
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

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Session Management Endpoints
@api_router.post("/sessions", response_model=NoteSession)
async def create_session(input: SessionCreate):
    session_dict = input.dict()
    session_obj = NoteSession(**session_dict)
    
    # Create initial version
    initial_version = ChatVersion(
        version_number=1,
        chatHistory=session_obj.chatHistory,
        livingDocument=session_obj.livingDocument,
        modelUsed=session_obj.context.selectedModel,
        checkpoint_name="Initial Version",
        auto_checkpoint=False
    )
    session_obj.versions = [initial_version]
    
    await db.sessions.insert_one(session_obj.dict())
    return session_obj

@api_router.get("/sessions", response_model=List[NoteSession])
async def get_sessions():
    sessions = await db.sessions.find().to_list(1000)
    return [NoteSession(**session) for session in sessions]

@api_router.get("/sessions/{session_id}", response_model=NoteSession)
async def get_session(session_id: str):
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return NoteSession(**session)

@api_router.put("/sessions/{session_id}", response_model=NoteSession)
async def update_session(session_id: str, session_update: dict):
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Update session fields
    update_dict = {
        "lastModified": datetime.utcnow(),
        **session_update
    }
    
    await db.sessions.update_one({"id": session_id}, {"$set": update_dict})
    updated_session = await db.sessions.find_one({"id": session_id})
    return NoteSession(**updated_session)

@api_router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    result = await db.sessions.delete_one({"id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted successfully"}

# Versioning Endpoints
@api_router.post("/sessions/{session_id}/versions", response_model=ChatVersion)
async def create_version(session_id: str, version_input: VersionCreate):
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session_obj = NoteSession(**session)
    
    # Create new version
    new_version_number = session_obj.current_version + 1
    new_version = ChatVersion(
        version_number=new_version_number,
        chatHistory=session_obj.chatHistory,
        livingDocument=session_obj.livingDocument,
        modelUsed=session_obj.context.selectedModel,
        checkpoint_name=version_input.checkpoint_name,
        auto_checkpoint=version_input.auto_checkpoint
    )
    
    # Add to versions list
    session_obj.versions.append(new_version)
    session_obj.current_version = new_version_number
    
    # Update in database
    await db.sessions.update_one(
        {"id": session_id}, 
        {"$set": {
            "versions": [v.dict() for v in session_obj.versions],
            "current_version": new_version_number
        }}
    )
    
    return new_version

@api_router.get("/sessions/{session_id}/versions", response_model=List[ChatVersion])
async def get_versions(session_id: str):
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session_obj = NoteSession(**session)
    return session_obj.versions

@api_router.post("/sessions/{session_id}/restore")
async def restore_version(version_restore: VersionRestore):
    session = await db.sessions.find_one({"id": version_restore.session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session_obj = NoteSession(**session)
    
    # Find the version to restore
    target_version = None
    for version in session_obj.versions:
        if version.id == version_restore.version_id:
            target_version = version
            break
    
    if not target_version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # Create a checkpoint of current state before restoring
    current_checkpoint = ChatVersion(
        version_number=session_obj.current_version + 1,
        chatHistory=session_obj.chatHistory,
        livingDocument=session_obj.livingDocument,
        modelUsed=session_obj.context.selectedModel,
        checkpoint_name=f"Auto-backup before restore to v{target_version.version_number}",
        auto_checkpoint=True
    )
    session_obj.versions.append(current_checkpoint)
    
    # Restore to target version
    session_obj.chatHistory = target_version.chatHistory
    session_obj.livingDocument = target_version.livingDocument
    session_obj.context.selectedModel = target_version.modelUsed
    session_obj.current_version = current_checkpoint.version_number
    
    # Update in database
    await db.sessions.update_one(
        {"id": version_restore.session_id}, 
        {"$set": {
            "chatHistory": [chat.dict() for chat in session_obj.chatHistory],
            "livingDocument": session_obj.livingDocument,
            "context": session_obj.context.dict(),
            "versions": [v.dict() for v in session_obj.versions],
            "current_version": session_obj.current_version,
            "lastModified": datetime.utcnow()
        }}
    )
    
    return {"message": f"Session restored to version {target_version.version_number}"}

@api_router.post("/sessions/{session_id}/switch-model")
async def switch_model(model_switch: ModelSwitch):
    session = await db.sessions.find_one({"id": model_switch.session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session_obj = NoteSession(**session)
    
    # Create checkpoint if requested
    if model_switch.create_checkpoint:
        checkpoint = ChatVersion(
            version_number=session_obj.current_version + 1,
            chatHistory=session_obj.chatHistory,
            livingDocument=session_obj.livingDocument,
            modelUsed=session_obj.context.selectedModel,
            checkpoint_name=f"Before model switch to {model_switch.new_model}",
            auto_checkpoint=True
        )
        session_obj.versions.append(checkpoint)
        session_obj.current_version = checkpoint.version_number
    
    # Switch model
    session_obj.context.selectedModel = model_switch.new_model
    
    # Update in database
    update_dict = {
        "context": session_obj.context.dict(),
        "lastModified": datetime.utcnow()
    }
    
    if model_switch.create_checkpoint:
        update_dict["versions"] = [v.dict() for v in session_obj.versions]
        update_dict["current_version"] = session_obj.current_version
    
    await db.sessions.update_one(
        {"id": model_switch.session_id}, 
        {"$set": update_dict}
    )
    
    return {"message": f"Model switched to {model_switch.new_model}"}

@api_router.delete("/sessions/{session_id}/versions/{version_id}")
async def delete_version(session_id: str, version_id: str):
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session_obj = NoteSession(**session)
    
    # Don't allow deletion of the initial version
    if len(session_obj.versions) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the only version")
    
    # Find and remove the version
    session_obj.versions = [v for v in session_obj.versions if v.id != version_id]
    
    # Update in database
    await db.sessions.update_one(
        {"id": session_id}, 
        {"$set": {"versions": [v.dict() for v in session_obj.versions]}}
    )
    
    return {"message": "Version deleted successfully"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
