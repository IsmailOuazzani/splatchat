import runpod
import base64
import uuid
from pathlib import Path
from run_pipeline import main
#TODO: add logging of request ID to root logger

def handler(event):
    print(event)
    try:
        video_base64 = event['input']['file']['content']
        video_bytes = base64.b64decode(video_base64)

        unique_id = str(uuid.uuid4())
        video_path = Path(f"{unique_id}.mp4")
        output_dir = Path(f"output_{unique_id}")
        output_dir.mkdir(parents=True, exist_ok=True)

        with open(video_path, "wb") as video_file:
            video_file.write(video_bytes)

        ply_path = main(str(video_path), output_dir)

        if not ply_path or not ply_path.exists():
            return {
                "status": "error",
                "message": "PLY file was not generated."
            }

        with open(ply_path, "rb") as ply_file:
            ply_content = ply_file.read()
        
        ply_base64 = base64.b64encode(ply_content).decode('utf-8')

        return {
            "status": "success",
            "file_content": ply_base64,
            "filename": ply_path.name
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

if __name__ == '__main__':
    runpod.serverless.start({'handler': handler})
