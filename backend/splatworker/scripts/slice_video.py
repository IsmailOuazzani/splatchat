import cv2
import os

def slice_video_to_frames(video_path, output_folder, target_frames, max_dimension=1280):
    # Open the video file
    video = cv2.VideoCapture(video_path)

    # Get the total number of frames in the video
    total_frames = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = video.get(cv2.CAP_PROP_FPS)  # Frames per second
    print(f"Total frames: {total_frames}, FPS: {fps}")

    # Calculate the maximum frame skip to hit the target number of frames
    frame_skip = max(1, total_frames // target_frames)

    print(f"Frame skip to achieve target: {frame_skip}")

    # Create the output folder if it doesn't exist
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    frame_count = 0
    saved_frame_count = 0

    while True:
        ret, frame = video.read()
        if not ret:
            break

        # Resize the frame if the largest dimension exceeds the max_dimension
        height, width = frame.shape[:2]
        while max(height, width) > max_dimension:
            # Resize by a factor of 2 (halving the dimensions)
            new_width = width // 2
            new_height = height // 2
            frame = cv2.resize(frame, (new_width, new_height))
            height, width = frame.shape[:2]

        # Save frames at the calculated skip interval
        if frame_count % frame_skip == 0:
            frame_filename = os.path.join(output_folder, f"frame_{saved_frame_count:04d}.jpg")
            cv2.imwrite(frame_filename, frame)
            saved_frame_count += 1

        frame_count += 1

    # Release the video capture object
    video.release()
    print(f"Extracted {saved_frame_count} frames to {output_folder}")

# # Example usage
# video_path = 'kitkat.mp4'
# output_folder = 'images'
# target_frames = 80

# slice_video_to_frames(video_path, output_folder, target_frames)
