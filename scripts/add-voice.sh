#!/usr/bin/env bash
# Usage: scripts/add-voice.sh <video.mp4> <voice.(wav|mp3|m4a)> <out.mp4>
# Lays a voice recording over a video. If the voice is longer than the video, the last frame is held;
# if it is shorter, the video simply continues in silence. Loudness is normalised.
set -euo pipefail
video="$1"; voice="$2"; out="$3"
vd=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$video")
ad=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$voice")
pad=$(python3 -c "print(max(0, float('$ad') - float('$vd')))")
ffmpeg -y -loglevel error -i "$video" -i "$voice" \
  -filter_complex "[0:v]tpad=stop_mode=clone:stop_duration=${pad}[v];[1:a]loudnorm=I=-16:TP=-1.5:LRA=11[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -pix_fmt yuv420p -crf 20 -c:a aac -b:a 160k -movflags +faststart "$out"
echo "wrote $out"
