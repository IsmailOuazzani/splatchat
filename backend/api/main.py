from fastapi import FastAPI, HTTPException, Depends, Header, File, UploadFile, Form
from fastapi.staticfiles import StaticFiles
import uuid
from pydantic import BaseModel
import runpod 
from pathlib import Path
import base64
from fastapi.middleware.cors import CORSMiddleware
import ffmpeg
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
runpod.api_key = os["RUNPOD_API_KEY"]
RUNPOD_ENDPOINT_ID = "50kuuew0qyb2yx"

MAX_VIDEO_SIZE_MB = 10
MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024

splats_dir = "splats" #TODO: auth through middleware
app.mount("/splats", StaticFiles(directory=splats_dir), name="splats")

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


def compress_video(input_path: Path, output_path: Path):
    (
        ffmpeg
        .input(str(input_path))
        .output(str(output_path), vcodec='libx264', crf=28, preset='slow', maxrate='1M', bufsize='2M')
        .run(overwrite_output=True)
    )

@app.post("/send_splat")
async def send_splat(
    file: UploadFile = File(...), 
    conversation_ids: list[str] = Form(...),
    username: str = Depends(get_current_user)
):
    print(f"Received splat request from {username} for {conversation_ids}")
    video_name = uuid.uuid4()
    video_extension = file.filename.split(".")[-1]
    
    video_file = Path("data") / f"{video_name}.{video_extension}"
    with video_file.open("wb") as f:
        f.write(file.file.read())

    max_size_bytes = 10 * 1024 * 1024
    if video_file.stat().st_size > max_size_bytes:
        compressed_file = Path("data") / f"{video_name}_compressed.{video_extension}"
        subprocess.run([
            "ffmpeg",
            "-y",                  
            "-i", str(video_file),
            "-vcodec", "libx264",
            "-crf", "30",         
            "-preset", "faster",  
            str(compressed_file)
        ], check=True)
        if compressed_file.stat().st_size > max_size_bytes:
            return {"message": "Video is too large even after compression."}
        final_file = compressed_file
    else:
        final_file = video_file

    video_string = base64.b64encode(final_file.read_bytes()).decode("utf-8")
    print(f"Num bytes to send to runpod: {len(video_string)}")

    preview_image = Path(splats_dir) / f"{video_name}.jpg"
    subprocess.run([
        "ffmpeg",
        "-y",
        "-i", str(final_file),
        "-vf", "select=eq(n\,0)",  # Select only the first frame
        "-q:v", "2",               # High-quality output
        str(preview_image)
    ], check=True)

    input_data = {
        "file": {
            "name": f"{video_name}.{video_extension}",
            "content": video_string
        }
    }
    runpod_response = runpod.Endpoint(RUNPOD_ENDPOINT_ID).run(request_input=input_data)
    output = runpod_response.output(timeout=400)

    if output["status"] != "success":
        print(f"RunPod error: {output}")

    splat_content = output["file_content"]
    splat_name = f"{video_name}.splat"
    splat_path = Path(splats_dir) / splat_name
    splat_path.write_bytes(base64.b64decode(splat_content))

    # For conversation_ids submitted as a single list, ensure they are split correctly
    conversation_ids = conversation_ids[0].split(",")
    
    for conversation_id in conversation_ids:
        write_splat_message(
            conversation_id, 
            username,
            preview=f"http://10.0.0.26:8000/splats/{video_name}.jpg",
            url=f"http://10.0.0.26:8000/splats/{splat_name}"
        )

    return {
        "message": f"File {file.filename} of size {file.size} compressed (if needed) and uploaded successfully"
    }
