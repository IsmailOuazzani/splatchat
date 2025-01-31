import pandas as pd
import json

USERS_DB: str = "users.jsonl"
CONVERSATIONS_DIRECTORY: str = "conversations"

def load_users() -> pd.DataFrame:
    """Load users from the CSV file into a DataFrame."""
    lines = []
    with open(USERS_DB, "r+") as f:
        lines = f.read().splitlines()
    line_dicts = [json.loads(line) for line in lines]
    return pd.DataFrame(line_dicts)

def load_conversation(conversation_id: str) -> pd.DataFrame:
    """Load a conversation from the JSONL file into a DataFrame."""
    lines = []
    with open(f"{CONVERSATIONS_DIRECTORY}/{conversation_id}.jsonl") as f:
        lines = f.read().splitlines()
    lines = [line for line in lines if line]
    line_dicts = [json.loads(line) for line in lines]
    return pd.DataFrame(line_dicts)

def write_text_message(conversation_id: str, sender: str, message: str) -> None:
    """Write a text message to the JSONL file."""
    with open(f"{CONVERSATIONS_DIRECTORY}/{conversation_id}.jsonl", "a") as file:
        file.write("\n"+json.dumps({"sender": sender, "type": "text", "message": message}))

def write_splat_message(conversation_id: str, sender: str, preview: str, url: str) -> None:
    """Write a splat message to the JSONL file."""
    with open(f"{CONVERSATIONS_DIRECTORY}/{conversation_id}.jsonl", "a") as file:
        file.write("\n"+json.dumps({"sender": sender, "type": "splat", "preview": preview, "url": url}))
    
def check_credentials(username: str, password: str) -> bool:
    """Check if the username and password match an existing user."""
    users = load_users()
    return not users[(users["username"] == username) & (users["password"] == password)].empty