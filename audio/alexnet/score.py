"""Procedural score + SFX + voice-over mix for the AlexNet lesson. No samples: every sound is synthesised.

Reads  src/alexnet/generated/timeline.json, public/alexnet/vo/*.mp3
Writes public/alexnet/mix.wav (+ mix.m4a for the preview player), src/alexnet/generated/audio.json
"""
import json
import pathlib
import subprocess

import numpy as np
import soundfile as sf
from scipy.signal import butter, oaconvolve, sosfilt

ROOT = pathlib.Path(__file__).parent.parent.parent
TL = json.loads((ROOT / "src" / "alexnet" / "generated" / "timeline.json").read_text())
SR = 44100
DUR = TL["duration"] + 0.5
N = int(DUR * SR)
RNG = np.random.default_rng(2012)
LINES = {l["id"]: l for l in TL["lines"]}
SCENES = {s["id"]: s for s in TL["scenes"]}


def cue(line_id, phrase=None):
    """Same semantics as cue() in src/alexnet/lib/timeline.ts."""
    l = LINES[line_id]
    if phrase is None:
        return l["start"]
    idx = l["text"].index(phrase)
    w = l["words"][0]
    for c in l["words"]:
        if c["i"] <= idx:
            w = c
    return w["t"] + w["d"] * min(1, max(0, idx - w["i"]) / max(1, len(w["text"])))


def end(line_id):
    return LINES[line_id]["end"]


# ── dsp helpers ────────────────────────────────────────────────────────────


def tax(n):
    return np.arange(n, dtype=np.float32) / SR


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def place(dst, sig, start, gain=1.0, pan=0.0):
    i = int(round(start * SR))
    if sig.ndim == 1:
        a = (pan + 1) * np.pi / 4
        sig = np.stack([sig * np.cos(a), sig * np.sin(a)], axis=1)
    if i < 0:
        sig, i = sig[-i:], 0
    n = min(len(sig), len(dst) - i)
    if n > 0:
        dst[i : i + n] += (sig[:n] * gain).astype(np.float32)


def filt(x, kind, f, order=2):
    return sosfilt(butter(order, f, btype=kind, fs=SR, output="sos"), x, axis=0).astype(np.float32)


def saw(f, n, ph=0.0):
    p = (np.cumsum(np.full(n, f, dtype=np.float64)) / SR + ph) % 1.0
    return (2 * p - 1).astype(np.float32)


def env(n, a, r):
    e = np.ones(n, dtype=np.float32)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    e[:na] = np.linspace(0, 1, na) ** 2
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e


def ir(seconds=3.2, decay=2.2, bright=5000):
    n = int(seconds * SR)
    x = RNG.standard_normal((n, 2)).astype(np.float32) * np.exp(-decay * tax(n))[:, None]
    x = filt(x, "lowpass", bright)
    return x / np.sqrt((x**2).sum(axis=0))


IR_HALL = ir()
IR_ROOM = ir(1.0, 6.0, 6000)


def reverb(x, h=IR_HALL):
    return np.stack([oaconvolve(x[:, c], h[:, c])[: len(x)] for c in range(2)], axis=1).astype(np.float32)


# ── instruments ────────────────────────────────────────────────────────────


def pad_chord(notes, dur, cutoff, detune=0.08):
    n = int(dur * SR)
    L = np.zeros(n, np.float32)
    R = np.zeros(n, np.float32)
    for m in notes:
        f = midi(m)
        for d, pan in ((-detune, -0.6), (0.0, 0.0), (detune, 0.6)):
            s = saw(f * 2 ** (d / 12), n, RNG.random()) * 0.33
            L += s * (1 - pan) * 0.5
            R += s * (1 + pan) * 0.5
    x = np.stack([L, R], axis=1) / len(notes)
    x = filt(x, "lowpass", cutoff, order=4)
    return x * env(n, min(2.0, dur * 0.4), min(2.5, dur * 0.45))[:, None]


def bell(m, length=2.6, bright=1.0):
    n = int(length * SR)
    t = tax(n)
    f = midi(m)
    x = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (1.6 + k * 0.9)) for k, a in ((1, 1), (2.0, 0.35 * bright), (3.01, 0.12 * bright), (4.2, 0.05 * bright)))
    return (x * env(n, 0.004, 0.1)).astype(np.float32)


def sub(m, dur):
    n = int(dur * SR)
    t = tax(n)
    x = np.sin(2 * np.pi * midi(m) * t) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.07 * t))
    return (x * env(n, 3, 3)).astype(np.float32)


def kick(soft=1.0):
    n = int(0.5 * SR)
    t = tax(n)
    f = 46 + 120 * np.exp(-t / 0.03)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22)
    return np.tanh(1.4 * x * soft).astype(np.float32)


def hat(length=0.06):
    n = int(length * SR)
    return (filt(RNG.standard_normal(n).astype(np.float32), "highpass", 8000) * np.exp(-tax(n) / 0.015)).astype(np.float32)


def whoosh(length=1.0, up=True):
    n = int(length * SR)
    p = np.linspace(0, 1, n, dtype=np.float32)
    x = RNG.standard_normal((n, 2)).astype(np.float32)
    lo = filt(x, "lowpass", 900)
    hi = filt(x, "bandpass", [1500, 7000])
    k = p if up else 1 - p
    y = lo * (1 - k)[:, None] + hi * k[:, None]
    return y * (np.clip(np.sin(np.pi * p), 0, 1) ** 1.6)[:, None]


def riser(length=2.5):
    n = int(length * SR)
    p = np.linspace(0, 1, n, dtype=np.float32)
    noise = filt(RNG.standard_normal((n, 2)).astype(np.float32), "bandpass", [600, 6000])
    f = np.geomspace(midi(45), midi(69), n)
    tone = (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)).astype(np.float32)
    return (noise * 0.6 + tone[:, None] * 0.25) * (p**2.4)[:, None]


def impact(length=3.5, pitch=52):
    n = int(length * SR)
    t = tax(n)
    f = pitch * np.exp(-t / 1.0) + 28
    boom = np.tanh(1.6 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.9))
    crack = filt(RNG.standard_normal(n).astype(np.float32), "bandpass", [400, 8000]) * np.exp(-t / 0.06)
    return (boom + 0.35 * crack).astype(np.float32)


def blip(freq=1320, length=0.16):
    n = int(length * SR)
    t = tax(n)
    return (np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.035) + 0.3 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-t / 0.02)).astype(np.float32)


def tick():
    n = int(0.02 * SR)
    return (filt(RNG.standard_normal(n).astype(np.float32), "bandpass", [2500, 9000]) * np.exp(-tax(n) / 0.004)).astype(np.float32)


def clock_tick(high=True):
    n = int(0.05 * SR)
    t = tax(n)
    return (np.sin(2 * np.pi * (2400 if high else 1800) * t) * np.exp(-t / 0.008)).astype(np.float32)


def zap(f0, f1, length=0.35):
    n = int(length * SR)
    f = np.geomspace(f0, f1, n)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tax(n) / 0.12)).astype(np.float32)


def shimmer(length=3.0, root=84):
    n = int(length * SR)
    out = np.zeros((n, 2), np.float32)
    for k in range(14):
        m = root + [0, 7, 12, 4, 9, 14, 19][k % 7]
        place(out, bell(m, 1.6, 0.4), k * length / 16, 0.25, pan=RNG.uniform(-0.8, 0.8))
    return out


# ── chapter moods ──────────────────────────────────────────────────────────
# chords are semitone offsets from `root`; one chord per `bar` seconds
MOODS = {
    "open":   dict(root=50, chords=[[0, 7, 12, 15], [-4, 3, 8, 12], [-7, 0, 5, 12], [-2, 5, 10, 14]], bar=6.0, cut=1300, arp=0.0, pulse=0.0, gain=0.9),
    "pixels": dict(root=52, chords=[[0, 7, 11, 14], [-3, 4, 9, 12], [-7, 0, 7, 11], [-5, 2, 7, 11]], bar=5.0, cut=1700, arp=0.35, pulse=0.0, gain=0.8),
    "hand":   dict(root=48, chords=[[0, 7, 10, 15], [-4, 3, 7, 12], [-2, 5, 10, 14], [-5, 2, 7, 10]], bar=6.0, cut=1200, arp=0.2, pulse=0.0, gain=0.8),
    "neuron": dict(root=53, chords=[[0, 7, 12, 16], [-5, 2, 7, 11], [-3, 4, 9, 12], [-7, 0, 5, 9]], bar=5.0, cut=1900, arp=0.45, pulse=0.0, gain=0.8),
    "conv":   dict(root=45, chords=[[0, 7, 12, 15], [-4, 3, 8, 12], [-2, 5, 10, 15], [-5, 2, 7, 10]], bar=6.0, cut=1400, arp=0.3, pulse=0.0, gain=0.8),
    "relu":   dict(root=55, chords=[[0, 7, 11, 16], [-3, 4, 9, 14], [-5, 2, 7, 12], [-7, 0, 5, 9]], bar=4.0, cut=2400, arp=0.55, pulse=0.0, gain=0.75),
    "hier":   dict(root=50, chords=[[0, 7, 14, 16], [-3, 4, 11, 14], [-5, 2, 9, 12], [-8, -1, 7, 11]], bar=5.0, cut=2200, arp=0.5, pulse=0.0, gain=0.8),
    "arch":   dict(root=45, chords=[[0, 7, 12, 15], [-4, 3, 8, 12], [-7, 0, 5, 12], [-2, 5, 10, 14]], bar=4.0, cut=2600, arp=0.6, pulse=1.0, gain=0.85),
    "keys":   dict(root=52, chords=[[0, 7, 12, 16], [-3, 4, 9, 12], [-7, 0, 5, 12], [-5, 2, 7, 11]], bar=4.0, cut=2400, arp=0.55, pulse=0.7, gain=0.8),
    "impact": dict(root=50, chords=[[0, 7, 12, 16], [-5, 2, 7, 11], [-3, 4, 9, 12], [-7, 0, 5, 12]], bar=4.0, cut=3200, arp=0.7, pulse=1.0, gain=0.9),
    "legacy": dict(root=48, chords=[[0, 7, 12, 16], [-3, 4, 9, 12], [-7, 0, 5, 9], [-5, 2, 7, 11]], bar=6.0, cut=2000, arp=0.35, pulse=0.0, gain=0.85),
}


def chapter_music(sid):
    s = SCENES[sid]
    m = MOODS[sid]
    t0, t1 = s["start"], s["end"] + 2.5
    n = int((t1 - t0) * SR)
    pads = np.zeros((n, 2), np.float32)
    arps = np.zeros((n, 2), np.float32)
    drums = np.zeros((n, 2), np.float32)
    bar = m["bar"]
    nbars = int(np.ceil((t1 - t0) / bar))
    for b in range(nbars):
        chord = [m["root"] + c for c in m["chords"][b % len(m["chords"])]]
        place(pads, pad_chord(chord, bar + 2.0, m["cut"] * (0.85 + 0.3 * RNG.random())), b * bar, 0.5)
        # arpeggio: sparse 8ths of chord tones up an octave
        steps = int(bar / (bar / 8))
        for k in range(steps):
            if RNG.random() > m["arp"]:
                continue
            note = chord[[1, 2, 3, 2, 0, 3, 1, 2][k % 8]] + 12 + (12 if RNG.random() < 0.25 else 0)
            tt = b * bar + k * bar / 8
            place(arps, bell(note, 2.2, 0.8), tt, 0.13, pan=RNG.uniform(-0.6, 0.6))
            place(arps, bell(note, 2.2, 0.5), tt + bar / 8 * 1.5, 0.05, pan=RNG.uniform(-0.8, 0.8))
    place(pads, np.repeat(sub(m["root"] - 12, t1 - t0)[:, None], 2, axis=1), 0, 0.22)
    if m["pulse"]:
        beat = bar / 4
        for k in range(int((t1 - t0) / beat)):
            place(drums, filt(kick(), "lowpass", 400), k * beat, 0.32 * m["pulse"])
            place(drums, hat(), k * beat + beat / 2, 0.05 * m["pulse"], pan=0.3)
    music = pads + arps + drums * 0.9
    music += reverb(pads * 0.4 + arps * 0.8) * 0.5
    # fade the chapter's music in and out so neighbouring chapters cross-fade
    fade = np.ones(n, np.float32)
    fi, fo = int(2.0 * SR), int(3.0 * SR)
    fade[:fi] = np.linspace(0, 1, fi) ** 1.5
    fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
    return music * fade[:, None] * m["gain"], t0


music = np.zeros((N, 2), np.float32)
for sid in SCENES:
    buf, t0 = chapter_music(sid)
    place(music, buf, t0)
    print("music", sid)

# ── automation on the music bed ────────────────────────────────────────────
auto = np.ones(N, np.float32)


def dip(a, b, level, ramp=0.6):
    """Lower the music between a and b (seconds) to `level`."""
    i0, i1, r = int(a * SR), int(b * SR), int(ramp * SR)
    seg = np.full(max(0, i1 - i0), level, np.float32)
    if len(seg) > 2 * r:
        seg[:r] = np.linspace(1, level, r)
        seg[-r:] = np.linspace(level, 1, r)
    auto[i0:i1] = np.minimum(auto[i0:i1], seg)


# the "stop and think" pause: music almost vanishes, a clock ticks
dip(end("c5") - 0.4, cue("c6") + 0.8, 0.15)
# the opening is sparse until the scoreboard
dip(0, cue("o3") - 0.5, 0.65, 1.5)
music *= auto[:, None]

# ── sound effects ──────────────────────────────────────────────────────────
sfx = np.zeros((N, 2), np.float32)

# every chapter card: a breath of air + a low hit as the shutters part
for s in TL["scenes"]:
    if not s["num"]:
        continue
    place(sfx, whoosh(1.1, up=True), s["start"] - 0.25, 0.22)
    place(sfx, impact(2.5, 60), s["start"] + 0.05, 0.28)
    place(sfx, shimmer(2.0, 81), s["start"] + 0.1, 0.35)

# prologue
place(sfx, impact(4.0, 44), 0.05, 0.35)
place(sfx, shimmer(3.0, 76), cue("o1", "图像识别") - 0.2, 0.4)
for i in range(5):
    place(sfx, blip(990 + i * 110), cue("o2", "允许") + i * 0.32, 0.16)
place(sfx, blip(1760), cue("o2", "猜中"), 0.22)
for i in range(4):
    place(sfx, tick(), cue("o3") + 0.2 + i * 0.18, 0.3)
place(sfx, riser(1.8), cue("o4", "15.3") - 1.8, 0.35)
place(sfx, impact(4.0, 50), cue("o4", "15.3"), 0.75)
place(sfx, whoosh(0.8), cue("o6", "AlexNet") - 0.9, 0.3)
place(sfx, impact(4.5, 42), cue("o6", "AlexNet") + 0.3, 0.6)
for k, ph in enumerate(("为什么会", "为什么要", "改变")):
    place(sfx, bell(76 + k * 3, 2.5), cue("o7", ph), 0.18)

# pixels
place(sfx, whoosh(1.2), cue("p2", "一大堆") - 1.0, 0.35)
for i in range(30):
    place(sfx, tick(), cue("p2", "一大堆") + i * 0.03, 0.12 + 0.1 * RNG.random(), pan=RNG.uniform(-0.6, 0.6))
place(sfx, whoosh(1.4, up=False), cue("p3") - 0.3, 0.25)
place(sfx, zap(300, 1500, 0.5), cue("p3", "每个数字") + 0.4, 0.15)
place(sfx, blip(660), cue("p5", "挪动"), 0.15)
place(sfx, zap(1200, 300, 0.6), cue("p5", "七成"), 0.18)
place(sfx, shimmer(2.5, 86), cue("p7", "找到"), 0.3)

# hand-crafted features
for i in range(4):
    place(sfx, blip(880 + 220 * i), cue("h1") + i * 0.35, 0.12)
place(sfx, zap(2000, 500, 0.4), cue("h2", "统计") + 0.3, 0.12)
place(sfx, zap(600, 180, 0.9), cue("h5", "越来越慢"), 0.22)
place(sfx, impact(2.0, 70), cue("h6", "在于"), 0.25)
place(sfx, riser(2.0), cue("h7", "自己学会") - 2.0, 0.25)
place(sfx, shimmer(3.0, 84), cue("h7", "自己学会"), 0.45)

# neuron
for i in range(4):
    place(sfx, blip(700 + 120 * i, 0.12), cue("n2", "接收") + i * 0.15, 0.12)
place(sfx, zap(400, 1200, 0.4), cue("n2", "全部加起来"), 0.15)
for i in range(6):
    place(sfx, whoosh(0.5), cue("n4", "再把许多层") + 0.6 + i * 3.3, 0.08)
place(sfx, zap(900, 220, 0.6), cue("n5", "猜错了"), 0.2)
for i in range(40):
    place(sfx, tick(), cue("n6", "每一步") - 0.4 + i * 0.14 * (1 + i / 50), 0.1 * (1 - i / 45))
place(sfx, whoosh(1.5, up=False), cue("n7") + 0.2, 0.25)
place(sfx, bell(64, 3.0), cue("n8", "为什么"), 0.2)

# convolution
place(sfx, whoosh(2.4), cue("c1", "全连接") - 0.6, 0.25)
place(sfx, impact(2.5, 62), cue("c2", "一亿五千万"), 0.35)
place(sfx, zap(1500, 200, 0.7), cue("c3", "换一张"), 0.15)
t, k = end("c5") + 0.2, 0
while t < cue("c6") - 0.2:  # the clock in the "think" pause
    place(sfx, clock_tick(k % 2 == 0), t, 0.25)
    t += 0.5
    k += 1
place(sfx, shimmer(3.0, 79), cue("c6"), 0.35)
place(sfx, blip(1500, 0.2), cue("c7", "局部连接"), 0.15)
place(sfx, blip(1800, 0.2), cue("c8", "权重共享"), 0.15)
slide = cue("c9", "一格一格")
t = slide
while t < cue("c11"):
    place(sfx, tick(), t, 0.22)
    place(sfx, blip(2200, 0.06), t + 0.02, 0.05)
    t += 0.85
place(sfx, whoosh(3.0), cue("c11"), 0.25)
place(sfx, shimmer(3.0, 88), cue("c12", "勾勒"), 0.3)
place(sfx, blip(1320), cue("c13", "三万五千"), 0.2)
place(sfx, impact(3.0, 48), cue("c13", "四百多亿"), 0.45)
place(sfx, bell(72, 2.5), cue("c14", "邮政编码"), 0.15)

# relu
place(sfx, zap(500, 1800, 0.3), cue("r1", "激活函数"), 0.16)
place(sfx, impact(1.5, 80), cue("r2", "只相当于一层"), 0.2)
place(sfx, zap(300, 1600, 0.8), cue("r3", "弯曲"), 0.16)
for i in range(8):
    place(sfx, blip(1200 * 0.86**i, 0.15), cue("r6", "每穿过一层") + 0.3 + i * 0.55, 0.15 * 0.85**i)
for i in range(8):
    place(sfx, blip(1200, 0.15), cue("r8", "只需要") - 0.6 + i * 0.55, 0.13)
place(sfx, zap(150, 3000, 0.4), cue("r7", "ReLU"), 0.25)
place(sfx, impact(3.0, 56), cue("r9", "六倍"), 0.45)
place(sfx, shimmer(3.0, 84), cue("r10"), 0.3)

# hierarchy
for i in range(4):
    place(sfx, blip(990, 0.12), cue("f1", "只保留") - 0.2 + i * 0.8, 0.14)
for i in range(5):
    place(sfx, impact(0.8, 90), cue("f3", "然后再来") - 0.8 + i * 0.55, 0.12)
place(sfx, riser(1.6), cue("f3", "神奇") - 1.2, 0.25)
place(sfx, whoosh(2.0), cue("f4", "真实的卷积核") - 0.6, 0.35)
place(sfx, shimmer(4.0, 81), cue("f4", "真实的卷积核") + 0.4, 0.4)
for ph in ("从边缘", "到纹理", "到眼睛", "整个物体"):
    place(sfx, bell(76, 2.0), cue("f6", ph), 0.12)

# architecture
for i in range(12):
    place(sfx, tick(), SCENES["arch"]["start"] + 0.6 + i * 0.22, 0.2)
place(sfx, whoosh(1.0), cue("a3"), 0.2)
place(sfx, impact(2.5, 64), cue("a8", "超过百分之九十五"), 0.3)
place(sfx, riser(3.4), cue("a9") + 0.2, 0.45)
place(sfx, whoosh(3.0), cue("a9") + 0.3, 0.3)
place(sfx, impact(4.5, 46), cue("a10", "虎斑猫"), 0.7)
for i, m in enumerate((74, 79, 83, 86)):
    place(sfx, bell(m, 3.5), cue("a10", "虎斑猫") + i * 0.08, 0.16)
place(sfx, shimmer(3.0, 86), cue("a11", "猫的脸"), 0.3)

# three keys
for i in range(3):
    place(sfx, impact(1.4, 70 + i * 6), cue("k1") + 1.5 + i * 0.25, 0.15)
place(sfx, whoosh(3.0, up=False), cue("k2") + 0.4, 0.3)
for i in range(60):
    place(sfx, tick(), cue("k2", "超过一千四百万") - 0.3 + i * 0.03, 0.08)
for i in range(16):
    place(sfx, blip(400 + 30 * i, 0.08), cue("k4", "天生擅长") - 0.3 + i * 0.06, 0.06)
place(sfx, zap(1200, 200, 0.6), cue("k5", "一劈两半"), 0.25)
place(sfx, impact(1.5, 70), cue("k5", "一劈两半") + 0.3, 0.2)
for i in range(6):
    place(sfx, tick(), cue("k6") + i * (cue("k7") - cue("k6")) / 6, 0.2)
place(sfx, whoosh(1.6), cue("k7", "分了工") - 0.4, 0.25)
for i in range(10):
    place(sfx, tick(), cue("k9", "随机裁剪") + i * 0.45, 0.18)
place(sfx, impact(2.0, 66), cue("k9", "两千多倍"), 0.25)
t = cue("k10", "休息") - 0.2
while t < cue("k11", "这就好像"):
    place(sfx, blip(1700, 0.05), t, 0.06, pan=RNG.uniform(-0.5, 0.5))
    t += 0.55
place(sfx, shimmer(3.0, 81), cue("k11", "集合在一起"), 0.3)

# impact
place(sfx, impact(4.0, 48), cue("i1", "15.3%"), 0.55)
for i in range(8):
    place(sfx, blip(880 + 60 * i, 0.12), cue("i2", "第二年") + 0.2 + i * 0.12, 0.1)
for ph in ("19层", "22层", "2015年"):
    place(sfx, impact(1.4, 72), cue("i3", ph), 0.18)
place(sfx, shimmer(3.0, 88), cue("i3", "比人类"), 0.3)
for ph in ("语音识别", "机器翻译", "大语言模型"):
    place(sfx, whoosh(1.0), cue("i4", ph) - 0.6, 0.16)

# legacy
for i in range(5):
    place(sfx, bell(72 + [0, 4, 7, 11, 14][i], 2.0), cue("e2", "卷积") + i * 0.3, 0.1)
place(sfx, whoosh(1.4), cue("e2", "都能找到"), 0.2)
place(sfx, zap(800, 200, 0.4), cue("e3", "变成了") - 0.3, 0.14)
place(sfx, shimmer(3.0, 84), cue("e3", "让数据"), 0.3)
for ph in ("足够多的数据", "足够强的算力", "合适的网络结构"):
    place(sfx, impact(1.5, 72), cue("e4", ph), 0.15)
for ph in ("Alex Krizhevsky", "Ilya", "Geoffrey"):
    place(sfx, bell(79, 2.0), cue("e6", ph), 0.12)
for i, m in enumerate((72, 76, 79, 84)):
    place(sfx, bell(m, 4.0), cue("e6", "诺贝尔") + i * 0.12, 0.13)
place(sfx, riser(2.5), cue("e8") - 1.0, 0.2)
place(sfx, impact(6.0, 40), cue("e8") + 1.5, 0.35)
# a long resolving chord under the final line + credits
n = int(9.0 * SR)
final = pad_chord([48, 55, 60, 64, 67, 72], 9.0, 2400, 0.12)
place(sfx, final + reverb(final) * 0.6, cue("e8") + 1.2, 0.55)

sfx = sfx + reverb(sfx, IR_HALL) * 0.25
print("sfx done")

# ── voice-over bus + ducking ───────────────────────────────────────────────
vo = np.zeros((N, 2), np.float32)
gate = np.zeros(N, np.float32)
for l in TL["lines"]:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(ROOT / "public" / "alexnet" / "vo" / f"{l['id']}.mp3"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        check=True, capture_output=True,
    ).stdout
    v = np.frombuffer(raw, dtype=np.float32).copy()
    v = filt(v, "highpass", 80)
    v = v + 0.18 * filt(v, "bandpass", [2500, 6500])  # a little presence
    v = v / (np.abs(v).max() + 1e-9) * 0.85
    place(vo, v, l["start"] - 0.1)  # mp3 starts ~0.1s before the first word boundary
    i = int((l["start"] - 0.1) * SR)
    gate[i : i + len(v)] = 1.0
vo = vo + reverb(vo, IR_ROOM) * 0.06

k = int(0.25 * SR)
gate = np.convolve(gate, np.ones(k, np.float32) / k, mode="same").astype(np.float32)
duck = (1 - 0.62 * gate)[:, None]

mix = music * 0.42 * duck + sfx * 0.55 * (1 - 0.35 * gate)[:, None] + vo * 1.0
mix = filt(mix, "highpass", 25)
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
tail = int(2.0 * SR)
mix[-tail:] *= np.linspace(1, 0, tail)[:, None] ** 2
assert np.isfinite(mix).all(), "non-finite samples in mix"
mix = (mix / np.abs(mix).max() * 0.9).astype(np.float32)

out = ROOT / "public" / "alexnet" / "mix.wav"
raw = ROOT / "out" / "alexnet-mix-raw.wav"
raw.parent.mkdir(exist_ok=True)
sf.write(raw, mix, SR, subtype="FLOAT")

# loudness-normalise to -16 LUFS / -1.5 dBTP (two-pass loudnorm)
meas = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(raw), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
j = json.loads(meas[meas.rindex("{") : meas.rindex("}") + 1])
af = f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true"
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(raw), "-af", af, "-ar", "48000", "-c:a", "pcm_s24le", str(out)], check=True)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(out), "-c:a", "aac", "-b:a", "192k", str(out.with_suffix(".m4a"))], check=True)
(ROOT / "src" / "alexnet" / "generated" / "audio.json").write_text(json.dumps({"mix": "alexnet/mix.m4a"}))
print("wrote", out, "measured", j["input_i"], "LUFS")
