from fastapi import FastAPI, HTTPException, Depends, Header, File, UploadFile, Form, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import uuid
from pydantic import BaseModel
import runpod 
from pathlib import Path
import base64
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import json
import os
from dotenv import  load_dotenv
from db import (check_credentials, 
                load_users, 
                load_conversation, 
                write_text_message,
                write_splat_message)


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["GET, POST", "OPTIONS"],
    allow_headers=["*"],
)

load_dotenv()
runpod.api_key = os.environ["RUNPOD_API_KEY"]
RUNPOD_ENDPOINT_ID = "50kuuew0qyb2yx"

MAX_VIDEO_SIZE_MB = 10
MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024

SPLATS_DIR = "splats" #TODO: auth through middleware
app.mount("/splats", StaticFiles(directory=SPLATS_DIR), name="splats")

VIDEO_DIR = Path("data")

TOKEN_FILE = Path("tokens.json")

# Ensure token file exists
if not TOKEN_FILE.exists():
    TOKEN_FILE.write_text(json.dumps({}))

def load_tokens():
    """Load tokens from JSON file."""
    with TOKEN_FILE.open("r") as f:
        return json.load(f)

def save_tokens(tokens):
    """Save tokens to JSON file."""
    with TOKEN_FILE.open("w") as f:
        json.dump(tokens, f)

def store_token(token: str, username: str):
    """Store token persistently."""
    tokens = load_tokens()
    tokens[token] = username
    save_tokens(tokens)

def get_user_from_token(token: str) -> str:
    """Retrieve the username from the token storage."""
    tokens = load_tokens()
    if token in tokens:
        return tokens[token]
    raise HTTPException(status_code=401, detail="Invalid or expired token")

def remove_token(token: str):
    """Remove token on logout."""
    tokens = load_tokens()
    if token in tokens:
        del tokens[token]
        save_tokens(tokens)

def get_current_user(authorization: str = Header(None)) -> str:
    """Validate the token from the Authorization header."""
    if authorization is None:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    if authorization.startswith("Bearer "):
        token = authorization[len("Bearer "):]
    else:
        raise HTTPException(status_code=401, detail="Invalid Authorization format")

    return get_user_from_token(token)


@app.get("/")
async def root():
    # Keeping this route for network testing
    return {"message": "API is live"}


class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/login")
async def login(request: LoginRequest) -> dict:
    """Login endpoint to authenticate users and issue tokens."""
    username = request.username
    password = request.password
    if check_credentials(username, password):
        token = str(uuid.uuid4())  
        store_token(token, username) 
        return {"message": "Login successful", "token": token}
    raise HTTPException(status_code=401, detail="Invalid credentials")


@app.get("/users")
async def users() -> list[str]:
    usernames = load_users().username
    return usernames.to_list()

@app.get("/conversations/{conversation_id}")
async def conversations(conversation_id: str) -> list[dict]:
    print(conversation_id)
    conversation = load_conversation(conversation_id=conversation_id)
    return conversation.to_dict(orient="records")

@app.get("/me")
async def me(username: str = Depends(get_current_user)):
    users = load_users()
    user = users[users["username"] == username]
    return user.to_dict(orient="records")[0]

@app.get("/send_message")
async def send_message(conversation_id: str, message: str, username: str = Depends(get_current_user)):
    write_text_message(conversation_id, username, message)
    return {"message": "Message sent successfully"}


@app.get("/videos/{filename}")
async def get_video(filename: str, x_api_key: str = Header(None)):
    if x_api_key != os.environ.get("SPLATCHAT_API_KEY"):
        raise HTTPException(status_code=401, detail="Invalid or missing API key.")
    
    file_path = VIDEO_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found.")
    
    return FileResponse(file_path, media_type="video/mp4")    

def video_to_splat(video_filename: str, username: str, conversation_ids: list[str]):
    input_data = {"filename": video_filename}
    runpod_response = runpod.Endpoint(RUNPOD_ENDPOINT_ID).run(request_input=input_data)
    output = runpod_response.output(timeout=800) # TODO: implement myself with exponential backoff

    preview_filename = f"{video_filename}.jpg"
    preview_image = Path(SPLATS_DIR) / preview_filename
    video_file = Path("data") / video_filename

    # Generate preview image
    subprocess.run([
        "ffmpeg",
        "-y",
        "-i", str(video_file),
        "-vf", "select=eq(n\,0)",  
        "-q:v", "2",
        str(preview_image)
    ], check=True)

    # Save splat file
    splat_content = output["file_content"]
    splat_name = f"{video_filename}.splat"
    splat_path = Path(SPLATS_DIR) / splat_name
    splat_path.write_bytes(base64.b64decode(splat_content))

    # Update conversations
    for conversation_id in conversation_ids:
        write_splat_message(conversation_id, username, preview=preview_filename, url=splat_name)

@app.post("/send_splat")
async def send_splat(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    conversation_ids: list[str] = Form(...),
    username: str = Depends(get_current_user)
):
    print(f"Received splat request from {username} for {conversation_ids}")

    video_name = uuid.uuid4()
    video_extension = file.filename.split(".")[-1]
    video_filename = f"{video_name}.{video_extension}"
    video_file = Path("data") / video_filename

    with video_file.open("wb") as f:
        f.write(file.file.read())

    conversation_ids = conversation_ids[0].split(",")
    background_tasks.add_task(video_to_splat, video_filename, username, conversation_ids)

    return {"message": f"File {file.filename} uploaded. Processing will happen in the background."}
