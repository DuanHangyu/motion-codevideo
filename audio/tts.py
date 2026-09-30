"""Generate female voice-over lines + word boundaries (edge-tts, zh-CN-XiaoxiaoNeural).

Writes public/audio/vo/<id>.mp3 and public/audio/vo/lines.json (word timings, seconds).
Line start times live in src/timeline.json so audio + visuals share one source of truth.
"""
import asyncio
import json
import os
import pathlib

import edge_tts

ROOT = pathlib.Path(__file__).parent.parent
VOICE = "zh-CN-XiaoxiaoNeural"
PROXY = os.environ.get("TTS_PROXY")  # e.g. http://127.0.0.1:7897 if the direct route fails
OUT = ROOT / "public" / "audio" / "vo"

# (id, rate, pitch, text)
LINES = [
    ("l1", "+6%", "+2Hz", "嘿，我是 Opus 5.5，你现在看到的每一帧画面都是我做的。"),
    ("l2", "+10%", "+0Hz", "从一个点，到一条线，再到一个面。"),
    ("l3", "+6%", "+0Hz", "然后，展开一整个立体世界。"),
    ("l4", "+12%", "+0Hz", "光影、材质、镜头，全部实时计算。"),
    ("l5", "+14%", "+0Hz", "没有摄像机，没有素材库，只有代码。"),
    ("l6", "+10%", "+0Hz", "每一次转场，都踩在节拍上。"),
    ("l7", "+12%", "+2Hz", "我是 Opus 5.5。下一帧，我们一起创造。"),
]


async def synth(line_id, rate, pitch, text):
    comm = edge_tts.Communicate(
        text, VOICE, rate=rate, pitch=pitch, proxy=PROXY, boundary="WordBoundary"
    )
    audio = bytearray()
    words = []
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            words.append(
                {
                    "t": round(chunk["offset"] / 1e7, 4),
                    "d": round(chunk["duration"] / 1e7, 4),
                    "text": chunk["text"],
                }
            )
    if not audio:
        raise RuntimeError(f"no audio returned for {line_id}")
    (OUT / f"{line_id}.mp3").write_bytes(bytes(audio))
    return words


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    meta = []
    for line_id, rate, pitch, text in LINES:
        words = await synth(line_id, rate, pitch, text)
        end = words[-1]["t"] + words[-1]["d"] if words else 0
        meta.append({"id": line_id, "text": text, "speechEnd": round(end, 3), "words": words})
        print(f"{line_id}  speech {end:.2f}s  {text}")
    (OUT / "lines.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1))


asyncio.run(main())
