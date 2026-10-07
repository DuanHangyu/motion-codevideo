"""Voice-over for the AlexNet lesson (edge-tts, zh-CN-XiaoxiaoNeural) + the master timeline.

Reads  src/alexnet/script.json
Writes public/alexnet/vo/<line>.mp3          one file per line (cached by text hash)
       src/alexnet/generated/timeline.json  absolute scene/line/word times — the single
                                            source of truth for visuals, subtitles and music
"""
import asyncio
import hashlib
import json
import os
import pathlib

import edge_tts

ROOT = pathlib.Path(__file__).parent.parent.parent
SCRIPT = json.loads((ROOT / "src" / "alexnet" / "script.json").read_text())
VO_DIR = ROOT / "public" / "alexnet" / "vo"
CACHE = VO_DIR / "cache.json"
GEN = ROOT / "src" / "alexnet" / "generated"
PROXY = os.environ.get("TTS_PROXY")
FPS = 30


def locate(text: str, words: list[dict]) -> list[dict]:
    """Attach the character offset of each spoken word inside the display text."""
    pos = 0
    for w in words:
        i = text.find(w["text"], pos)
        if i < 0:
            i = pos  # TTS normalised the token (e.g. punctuation); keep order
        w["i"] = i
        pos = i + len(w["text"]) if i >= pos else pos
    return words


async def synth(line_id: str, text: str, rate: str) -> list[dict]:
    comm = edge_tts.Communicate(text, SCRIPT["voice"], rate=rate, proxy=PROXY, boundary="WordBoundary")
    audio = bytearray()
    words = []
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            words.append({"t": round(chunk["offset"] / 1e7, 3), "d": round(chunk["duration"] / 1e7, 3), "text": chunk["text"]})
    if not audio or not words:
        raise RuntimeError(f"edge-tts returned nothing for {line_id}")
    (VO_DIR / f"{line_id}.mp3").write_bytes(bytes(audio))
    return words


async def main() -> None:
    VO_DIR.mkdir(parents=True, exist_ok=True)
    GEN.mkdir(parents=True, exist_ok=True)
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    rate = SCRIPT["rate"]

    for scene in SCRIPT["scenes"]:
        for line in scene["lines"]:
            key = hashlib.sha1(f"{SCRIPT['voice']}|{rate}|{line['text']}".encode()).hexdigest()
            hit = cache.get(line["id"])
            if hit and hit["key"] == key and (VO_DIR / f"{line['id']}.mp3").exists():
                continue
            for attempt in range(4):
                try:
                    words = await synth(line["id"], line["text"], rate)
                    break
                except Exception as err:  # flaky network: retry a few times, then fail loudly
                    if attempt == 3:
                        raise
                    print(f"retry {line['id']}: {err}")
                    await asyncio.sleep(2)
            cache[line["id"]] = {"key": key, "words": words}
            print(f"{line['id']:>4}  {words[-1]['t'] + words[-1]['d']:5.2f}s  {line['text'][:40]}")
            CACHE.write_text(json.dumps(cache, ensure_ascii=False))

    # Lay the lines end to end: scene lead → line, gap → … → tail.
    t = 0.0
    scenes, lines = [], []
    for scene in SCRIPT["scenes"]:
        start = t
        t += scene["lead"]
        for line in scene["lines"]:
            words = locate(line["text"], [dict(w) for w in cache[line["id"]]["words"]])
            end = words[-1]["t"] + words[-1]["d"]
            lines.append({
                "id": line["id"], "scene": scene["id"], "text": line["text"], "start": round(t, 3), "end": round(t + end, 3),
                "words": [{"t": round(t + w["t"], 3), "d": w["d"], "i": w["i"], "text": w["text"]} for w in words],
            })
            t += end + line.get("gap", SCRIPT["defaultGap"])
        t += scene["tail"]
        t = round(t * FPS) / FPS  # scene cuts land exactly on frames
        scenes.append({k: scene[k] for k in ("id", "num", "title", "en")} | {"start": round(start, 3), "end": round(t, 3)})

    timeline = {"fps": FPS, "duration": round(t, 3), "scenes": scenes, "lines": lines}
    (GEN / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=1))
    chars = sum(len(l["text"]) for l in lines)
    print(f"\n{len(lines)} lines · {chars} chars · total {t / 60:.0f}m{t % 60:04.1f}s")
    for s in scenes:
        print(f"  {s['id']:>7}  {s['start']:7.2f} → {s['end']:7.2f}  ({s['end'] - s['start']:5.1f}s)  {s['title']}")


asyncio.run(main())
