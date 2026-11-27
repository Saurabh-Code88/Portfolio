"""Create chronological random-access derivatives; preserve the original footage.
Usage: python scripts/prepare-space-video.py /absolute/path/to/ffmpeg
Requires libx264, libvpx-vp9 and libwebp. No crossfade, reversal, trimming or upscaling.
"""
from pathlib import Path
import subprocess
import sys

ffmpeg = sys.argv[1]
assets = Path(__file__).resolve().parent.parent / "public" / "backgrounds"
source = assets / "space-background.mp4"
for extension, codec in [
    ("mp4", ["-c:v", "libx264", "-preset", "medium", "-crf", "22", "-g", "15",
             "-keyint_min", "15", "-sc_threshold", "0", "-bf", "0", "-movflags", "+faststart"]),
    ("webm", ["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "32", "-g", "15",
              "-row-mt", "1", "-cpu-used", "4", "-auto-alt-ref", "0", "-lag-in-frames", "0"]),
]:
    subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "warning", "-y", "-i", str(source),
                    "-an", "-threads", "4", *codec, str(assets / ("space-background-scrub." + extension))], check=True)
for name, scale in [("poster", "1920:1080"), ("mobile", "768:432")]:
    subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "warning", "-y", "-i", str(source),
                    "-frames:v", "1", "-vf", "scale=" + scale, "-c:v", "libwebp", "-quality", "85",
                    str(assets / ("space-background-" + name + ".webp"))], check=True)
for path in sorted(assets.glob("space-background*")):
    print(f"{path.name}: {path.stat().st_size:,} bytes")
