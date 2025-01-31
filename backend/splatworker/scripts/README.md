## Running COLMAP
```bash
docker build -t colmap .
docker run --rm -it --gpus all -v <data>:/data colmap bash
```

Run commands in `script.sh` to process data with COLMAP.

#### Useful debugging for colmap
```bash
apt install sqlite3
sqlite3 colmap/data.db
SELECT COUNT(*) FROM keypoints;
SELECT * FROM keypoints LIMIT 10;
SELECT * FROM images;
SELECT COUNT(*) FROM matches;
.quit
```