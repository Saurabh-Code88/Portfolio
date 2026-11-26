"""Regenerate the 1080p seamless background without modifying the supplied source.
Usage: python scripts/prepare-space-video.py /absolute/path/to/ffmpeg
Requires FFmpeg with libx264, libvpx-vp9 and libwebp encoders.
The verified source is 20 seconds at 30 FPS. Output starts at source t=2;
its final two seconds dissolve source t=18..20 into t=0..2, joining t=2.
"""
from pathlib import Path
import subprocess
import sys

ffmpeg = sys.argv[1]
root = Path(__file__).resolve().parent.parent
assets = root / "public" / "backgrounds"
source = assets / "space-background.mp4"
subprocess.run([
    ffmpeg, "-hide_banner", "-loglevel", "warning", "-y", "-i", str(source),
    "-filter_complex",
    "[0:v]split=2[tail][head];"
    "[tail]trim=start=2:end=20,setpts=PTS-STARTPTS[t];"
    "[head]trim=start=0:end=2,setpts=PTS-STARTPTS[h];"
    "[t][h]xfade=transition=fade:duration=2:offset=16,format=yuv420p,split=2[m][w]",
    "-map", "[m]", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "22",
    "-movflags", "+faststart", str(assets / "space-background-loop.mp4"),
    "-map", "[w]", "-an", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "32",
    "-row-mt", "1", "-cpu-used", "4", str(assets / "space-background-loop.webm"),
], check=True)
for name, scale in [("poster", "1920:1080"), ("mobile", "768:432")]:
    subprocess.run([
        ffmpeg, "-hide_banner", "-loglevel", "warning", "-y", "-ss", "2", "-i", str(source),
        "-frames:v", "1", "-vf", "scale=" + scale, "-c:v", "libwebp", "-quality", "85",
        str(assets / ("space-background-" + name + ".webp")),
    ], check=True)
for path in sorted(assets.glob("space-background*")):
    print(f"{path.name}: {path.stat().st_size:,} bytes")
