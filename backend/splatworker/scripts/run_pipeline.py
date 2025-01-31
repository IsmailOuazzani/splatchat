import sys
import logging
import subprocess
import tempfile
from pathlib import Path
import shutil
from slice_video import slice_video_to_frames
import simple_trainer
import tyro
from plyfile import PlyData
import numpy as np
from io import BytesIO


logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

def run_colmap(image_dir: Path, output_path: Path) -> Path:
    logging.info("Starting COLMAP processing...")

    colmap_dir = output_path
    colmap_dir.mkdir(parents=True, exist_ok=True)

    # ✅ FIX: Ensure images folder exists (symlink or copy)
    (colmap_dir / "images").symlink_to(image_dir, target_is_directory=True)

    subprocess.run(["colmap", "project_generator", "--output_path", str(colmap_dir / "proj.ini")], check=True)
    subprocess.run(["colmap", "feature_extractor", "--database_path", str(colmap_dir / "data.db"), "--image_path", str(colmap_dir / "images")], check=True)
    subprocess.run(["colmap", "sequential_matcher", "--database_path", str(colmap_dir / "data.db")], check=True)
    
    sparse_dir = colmap_dir / "sparse"
    sparse_dir.mkdir(parents=True, exist_ok=True)

    # subprocess.run(["colmap", "mapper", "--database_path", str(colmap_dir / "data.db"), "--image_path", str(colmap_dir / "images"), "--output_path", str(sparse_dir)], check=True)
    subprocess.run([
        "colmap", "mapper",
        "--database_path", str(colmap_dir / "data.db"),
        "--image_path", str(colmap_dir / "images"),
        "--output_path", str(sparse_dir),
        # "--Mapper.min_num_matches", "15",  # 🚀 Reduce minimum matches
        # # "--Mapper.ba_global_max_num_iterations", "1",  # 🚀 **DISABLE Global BA**
        # # "--Mapper.ba_local_max_num_iterations", "0",  # 🚀 **DISABLE Local BA**
        # "--Mapper.ba_refine_focal_length", "0",
        # "--Mapper.ba_refine_principal_point", "0",
        # "--Mapper.abs_pose_max_error", "10.0",  # 🚀 Accept worse poses faster
        # "--Mapper.tri_ignore_two_view_tracks", "1",
        # "--Mapper.max_reg_trials", "1",  # 🚀 Only try registering an image once
        # "--Mapper.init_max_reg_trials", "1",
        # "--Mapper.init_min_num_inliers", "50",  # 🚀 Reduce inlier requirement
        # "--Mapper.filter_max_reproj_error", "5.0"  # 🚀 Allow worse triangulations
    ], check=True)

    logging.info("COLMAP processing completed successfully.")
    return colmap_dir

def run_trainer(colmap_dir: Path, output_dir: Path) -> Path:
    logging.info("Starting training process...")

    sys.argv = [
        "simple_trainer.py",
        "default",
        "--data_dir", str(colmap_dir),  # ✅ FIX: Ensures trainer looks at correct `sparse` folder
        "--data_factor", "1",
        "--result_dir", str(output_dir)
    ]

    configs = {
        "default": (
            "Gaussian splatting training using densification heuristics from the original paper.",
            simple_trainer.Config(strategy=simple_trainer.DefaultStrategy(verbose=True)),
        ),
        "mcmc": (
            "Gaussian splatting training using densification from '3D Gaussian Splatting as Markov Chain Monte Carlo'.",
            simple_trainer.Config(
                init_opa=0.5, init_scale=0.1, opacity_reg=0.01, scale_reg=0.01,
                strategy=simple_trainer.MCMCStrategy(verbose=True)
            ),
        ),
    }

    cfg = tyro.extras.overridable_config_cli(configs)
    cfg.adjust_steps(cfg.steps_scaler)

    simple_trainer.main(0, 0, 1, cfg)

    logging.info("Training process completed successfully.")
    return output_dir


def process_ply_to_splat(ply_file_path: str):
    plydata = PlyData.read(ply_file_path)
    vert = plydata["vertex"]
    sorted_indices = np.argsort(
        -np.exp(vert["scale_0"] + vert["scale_1"] + vert["scale_2"])
        / (1 + np.exp(-vert["opacity"]))
    )
    buffer = BytesIO()
    for idx in sorted_indices:
        v = plydata["vertex"][idx]
        position = np.array([v["x"], v["y"], v["z"]], dtype=np.float32)
        scales = np.exp(
            np.array(
                [v["scale_0"], v["scale_1"], v["scale_2"]],
                dtype=np.float32,
            )
        )
        rot = np.array(
            [v["rot_0"], v["rot_1"], v["rot_2"], v["rot_3"]],
            dtype=np.float32,
        )
        SH_C0 = 0.28209479177387814
        color = np.array(
            [
                0.5 + SH_C0 * v["f_dc_0"],
                0.5 + SH_C0 * v["f_dc_1"],
                0.5 + SH_C0 * v["f_dc_2"],
                1 / (1 + np.exp(-v["opacity"])),
            ]
        )
        buffer.write(position.tobytes())
        buffer.write(scales.tobytes())
        buffer.write((color * 255).clip(0, 255).astype(np.uint8).tobytes())
        buffer.write(
            ((rot / np.linalg.norm(rot)) * 128 + 128)
            .clip(0, 255)
            .astype(np.uint8)
            .tobytes()
        )

    return buffer.getvalue()


def main(video_path: str, output_dir: Path) -> Path:
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_dir = Path(temp_dir)
        frames_dir, colmap_dir = temp_dir / "frames", temp_dir / "colmap"
        frames_dir.mkdir()

        logging.info(f"Processing video: {video_path}")

        slice_video_to_frames(video_path, str(frames_dir), target_frames=120, max_dimension=1280)

        colmap_output = run_colmap(frames_dir, colmap_dir)  
        trainer_path = run_trainer(colmap_output, output_dir)  

        ply_dir = trainer_path / "ply"
        ply_files = sorted(ply_dir.glob("*.ply"))  
        
        if not ply_files:
            logging.warning("No .ply files found in the output directory.")
            return None
        
        first_ply_file = ply_files[0].resolve()
        # output_file = first_ply_file 
        logging.info(f"Processing completed. First .ply file: {first_ply_file}")

        logging.info(f"Converting to .splat")
        splat_data = process_ply_to_splat(first_ply_file)
        output_file = first_ply_file.with_suffix(".splat")
        with open(output_file, "wb") as f:
            f.write(splat_data)
        logging.info(f"Saved {output_file}")
        return output_file

if __name__ == "__main__":
    print(main("../in/kitkat.mp4", Path("./test")))