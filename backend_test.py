#!/usr/bin/env python3
import requests
import json
import time
import uuid
from datetime import datetime

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://1b0a2511-3534-469b-ab29-6101faa9a591.preview.emergentagent.com/api"

# Test data
def create_test_session_data():
    return {
        "context": {
            "title": "Test Session",
            "goal": "Testing the versioning system",
            "keywords": "test, versioning, api",
            "selectedModel": "gpt-4"
        },
        "chatHistory": [
            {
                "id": str(uuid.uuid4()),
                "role": "user",
                "text": "Hello, this is a test message"
            }
        ],
        "livingDocument": "# Test Document\nThis is a test document for versioning."
    }

def print_separator():
    print("\n" + "="*80 + "\n")

def test_session_management():
    print_separator()
    print("TESTING SESSION MANAGEMENT APIs")
    print_separator()
    
    # 1. Create a new session
    print("1. Testing POST /api/sessions - Create new session")
    session_data = create_test_session_data()
    response = requests.post(f"{BACKEND_URL}/sessions", json=session_data)
    
    if response.status_code == 200:
        print(f"✅ Successfully created session: {response.status_code}")
        session = response.json()
        session_id = session["id"]
        print(f"Session ID: {session_id}")
        
        # Verify initial version was created
        assert len(session["versions"]) == 1, "Initial version not created"
        assert session["current_version"] == 1, "Current version not set to 1"
        print("✅ Initial version automatically created")
    else:
        print(f"❌ Failed to create session: {response.status_code}")
        print(response.text)
        return None
    
    # 2. Get all sessions
    print("\n2. Testing GET /api/sessions - Get all sessions")
    response = requests.get(f"{BACKEND_URL}/sessions")
    
    if response.status_code == 200:
        sessions = response.json()
        print(f"✅ Successfully retrieved {len(sessions)} sessions")
    else:
        print(f"❌ Failed to get sessions: {response.status_code}")
        print(response.text)
    
    # 3. Get specific session
    print("\n3. Testing GET /api/sessions/{session_id} - Get specific session")
    response = requests.get(f"{BACKEND_URL}/sessions/{session_id}")
    
    if response.status_code == 200:
        retrieved_session = response.json()
        print(f"✅ Successfully retrieved session: {retrieved_session['id']}")
        assert retrieved_session["id"] == session_id, "Retrieved session ID doesn't match"
    else:
        print(f"❌ Failed to get session: {response.status_code}")
        print(response.text)
    
    # 4. Update session
    print("\n4. Testing PUT /api/sessions/{session_id} - Update session")
    update_data = {
        "livingDocument": "# Updated Test Document\nThis document has been updated.",
        "chatHistory": [
            {
                "id": str(uuid.uuid4()),
                "role": "user",
                "text": "Hello, this is a test message"
            },
            {
                "id": str(uuid.uuid4()),
                "role": "model",
                "text": "Hello! How can I help you with testing today?"
            }
        ]
    }
    
    response = requests.put(f"{BACKEND_URL}/sessions/{session_id}", json=update_data)
    
    if response.status_code == 200:
        updated_session = response.json()
        print(f"✅ Successfully updated session")
        assert updated_session["livingDocument"] == update_data["livingDocument"], "Living document not updated"
        assert len(updated_session["chatHistory"]) == 2, "Chat history not updated"
    else:
        print(f"❌ Failed to update session: {response.status_code}")
        print(response.text)
    
    return session_id

def test_versioning_apis(session_id):
    if not session_id:
        print("❌ Cannot test versioning APIs without a valid session ID")
        return
    
    print_separator()
    print("TESTING VERSIONING APIs")
    print_separator()
    
    # 1. Create checkpoint (version)
    print("1. Testing POST /api/sessions/{session_id}/versions - Create checkpoint")
    version_data = {
        "session_id": session_id,
        "checkpoint_name": "Test Checkpoint 1",
        "auto_checkpoint": False
    }
    
    response = requests.post(f"{BACKEND_URL}/sessions/{session_id}/versions", json=version_data)
    
    if response.status_code == 200:
        version = response.json()
        version_id = version["id"]
        print(f"✅ Successfully created checkpoint: {version['checkpoint_name']}")
        print(f"Version ID: {version_id}")
        assert version["version_number"] == 2, "Version number should be 2"
    else:
        print(f"❌ Failed to create checkpoint: {response.status_code}")
        print(response.text)
        version_id = None
    
    # 2. Get all versions for session
    print("\n2. Testing GET /api/sessions/{session_id}/versions - Get all versions")
    response = requests.get(f"{BACKEND_URL}/sessions/{session_id}/versions")
    
    if response.status_code == 200:
        versions = response.json()
        print(f"✅ Successfully retrieved {len(versions)} versions")
        assert len(versions) >= 2, "Should have at least 2 versions (initial + checkpoint)"
    else:
        print(f"❌ Failed to get versions: {response.status_code}")
        print(response.text)
    
    # 3. Update session again to create more content
    print("\n3. Updating session to create more content for versioning tests")
    update_data = {
        "livingDocument": "# Second Update\nThis document has been updated again.",
        "chatHistory": [
            {
                "id": str(uuid.uuid4()),
                "role": "user",
                "text": "Hello, this is a test message"
            },
            {
                "id": str(uuid.uuid4()),
                "role": "model",
                "text": "Hello! How can I help you with testing today?"
            },
            {
                "id": str(uuid.uuid4()),
                "role": "user",
                "text": "Let's test versioning"
            }
        ]
    }
    
    response = requests.put(f"{BACKEND_URL}/sessions/{session_id}", json=update_data)
    
    if response.status_code == 200:
        print(f"✅ Successfully updated session with more content")
    else:
        print(f"❌ Failed to update session: {response.status_code}")
        print(response.text)
    
    # 4. Create another checkpoint
    print("\n4. Creating another checkpoint for testing")
    version_data = {
        "session_id": session_id,
        "checkpoint_name": "Test Checkpoint 2",
        "auto_checkpoint": False
    }
    
    response = requests.post(f"{BACKEND_URL}/sessions/{session_id}/versions", json=version_data)
    
    if response.status_code == 200:
        version2 = response.json()
        version2_id = version2["id"]
        print(f"✅ Successfully created second checkpoint: {version2['checkpoint_name']}")
        print(f"Version 2 ID: {version2_id}")
        assert version2["version_number"] == 3, "Version number should be 3"
    else:
        print(f"❌ Failed to create second checkpoint: {response.status_code}")
        print(response.text)
        version2_id = None
    
    # 5. Test model switching with checkpoint
    print("\n5. Testing POST /api/sessions/{session_id}/switch-model - Switch model with checkpoint")
    model_switch_data = {
        "session_id": session_id,
        "new_model": "gpt-3.5-turbo",
        "create_checkpoint": True
    }
    
    response = requests.post(f"{BACKEND_URL}/sessions/{session_id}/switch-model", json=model_switch_data)
    
    if response.status_code == 200:
        print(f"✅ Successfully switched model: {response.json()['message']}")
        
        # Verify a new checkpoint was created
        response = requests.get(f"{BACKEND_URL}/sessions/{session_id}/versions")
        if response.status_code == 200:
            versions = response.json()
            print(f"After model switch, session has {len(versions)} versions")
            assert len(versions) >= 4, "Should have at least 4 versions after model switch"
            latest_version = versions[-1]
            assert "Before model switch to" in latest_version["checkpoint_name"], "Model switch checkpoint not created"
            print(f"✅ Model switch checkpoint created: {latest_version['checkpoint_name']}")
        else:
            print(f"❌ Failed to verify model switch checkpoint: {response.status_code}")
    else:
        print(f"❌ Failed to switch model: {response.status_code}")
        print(response.text)
    
    # 6. Test version restoration
    print("\n6. Testing POST /api/sessions/{session_id}/restore - Restore version")
    if version_id:
        restore_data = {
            "session_id": session_id,
            "version_id": version_id
        }
        
        response = requests.post(f"{BACKEND_URL}/sessions/{session_id}/restore", json=restore_data)
        
        if response.status_code == 200:
            print(f"✅ Successfully restored version: {response.json()['message']}")
            
            # Verify auto-checkpoint was created before restoration
            response = requests.get(f"{BACKEND_URL}/sessions/{session_id}/versions")
            if response.status_code == 200:
                versions = response.json()
                latest_version = versions[-1]
                assert "Auto-backup before restore" in latest_version["checkpoint_name"], "Auto-backup not created"
                print(f"✅ Auto-backup created before restoration: {latest_version['checkpoint_name']}")
            else:
                print(f"❌ Failed to verify auto-backup: {response.status_code}")
        else:
            print(f"❌ Failed to restore version: {response.status_code}")
            print(response.text)
    else:
        print("❌ Cannot test version restoration without a valid version ID")
    
    # 7. Test version deletion
    print("\n7. Testing DELETE /api/sessions/{session_id}/versions/{version_id} - Delete version")
    if version2_id:
        response = requests.delete(f"{BACKEND_URL}/sessions/{session_id}/versions/{version2_id}")
        
        if response.status_code == 200:
            print(f"✅ Successfully deleted version: {response.json()['message']}")
            
            # Verify version was deleted
            response = requests.get(f"{BACKEND_URL}/sessions/{session_id}/versions")
            if response.status_code == 200:
                versions = response.json()
                version_ids = [v["id"] for v in versions]
                assert version2_id not in version_ids, "Version was not deleted"
                print(f"✅ Version deletion verified")
            else:
                print(f"❌ Failed to verify version deletion: {response.status_code}")
        else:
            print(f"❌ Failed to delete version: {response.status_code}")
            print(response.text)
    else:
        print("❌ Cannot test version deletion without a valid version ID")
    
    # 8. Test cannot delete only remaining version
    print("\n8. Testing cannot delete only remaining version")
    # First delete all but one version
    response = requests.get(f"{BACKEND_URL}/sessions/{session_id}/versions")
    if response.status_code == 200:
        versions = response.json()
        # Keep the first version, delete all others
        for version in versions[1:]:
            delete_response = requests.delete(f"{BACKEND_URL}/sessions/{session_id}/versions/{version['id']}")
            if delete_response.status_code == 200:
                print(f"Deleted version {version['version_number']} for test setup")
    
    # Now try to delete the last remaining version
    response = requests.get(f"{BACKEND_URL}/sessions/{session_id}/versions")
    if response.status_code == 200:
        versions = response.json()
        if len(versions) == 1:
            last_version_id = versions[0]["id"]
            response = requests.delete(f"{BACKEND_URL}/sessions/{session_id}/versions/{last_version_id}")
            
            if response.status_code == 400:
                print(f"✅ Correctly prevented deletion of only remaining version")
            else:
                print(f"❌ Should not allow deletion of only remaining version: {response.status_code}")
        else:
            print(f"❌ Setup failed: Could not reduce to single version for testing")
    else:
        print(f"❌ Failed to get versions for deletion test: {response.status_code}")

def test_session_deletion(session_id):
    print_separator()
    print("TESTING SESSION DELETION")
    print_separator()
    
    # Delete session
    print("Testing DELETE /api/sessions/{session_id} - Delete session")
    response = requests.delete(f"{BACKEND_URL}/sessions/{session_id}")
    
    if response.status_code == 200:
        print(f"✅ Successfully deleted session: {response.json()['message']}")
        
        # Verify session was deleted
        response = requests.get(f"{BACKEND_URL}/sessions/{session_id}")
        if response.status_code == 404:
            print(f"✅ Session deletion verified - 404 Not Found response")
        else:
            print(f"❌ Session still exists after deletion: {response.status_code}")
    else:
        print(f"❌ Failed to delete session: {response.status_code}")
        print(response.text)

def run_all_tests():
    print("Starting backend API tests for versioning system...")
    print(f"Backend URL: {BACKEND_URL}")
    
    # Test session management APIs
    session_id = test_session_management()
    
    if session_id:
        # Test versioning APIs
        test_versioning_apis(session_id)
        
        # Test session deletion
        test_session_deletion(session_id)
    
    print_separator()
    print("All tests completed!")

if __name__ == "__main__":
    run_all_tests()