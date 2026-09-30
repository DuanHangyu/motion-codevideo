"""Procedural soundtrack + SFX + voice-over mix for the 30s Opus 5.5 reel.

Everything is synthesized from raw waveforms (no samples). 120 BPM, D minor.
Outputs:
  public/audio/mix.wav        final stereo mix (music + sfx + VO, ducked)
  src/audio-events.json       beat/hit times the visuals sync to
"""
import json
import pathlib
import subprocess

import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, sosfilt, sosfilt_zi

ROOT = pathlib.Path(__file__).parent.parent
TIMELINE = json.loads((ROOT / "src" / "timeline.json").read_text())
SR = 48000
DUR = TIMELINE["durationSec"]
N = SR * DUR
BEAT = 60 / TIMELINE["bpm"]
RNG = np.random.default_rng(55)

# ── helpers ────────────────────────────────────────────────────────────────


def buf():
    return np.zeros((N, 2), dtype=np.float64)


def t_axis(n):
    return np.arange(n) / SR


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def place(dst, sig, start, gain=1.0, pan=0.0):
    """Add mono or stereo `sig` into dst at `start` seconds, equal-power pan."""
    i = int(round(start * SR))
    if i >= N:
        return
    if sig.ndim == 1:
        ang = (pan + 1) * np.pi / 4
        sig = np.stack([sig * np.cos(ang), sig * np.sin(ang)], axis=1)
    n = min(len(sig), N - i)
    if i < 0:
        sig, n, i = sig[-i:], min(len(sig) + i, N), 0
    dst[i : i + n] += sig[:n] * gain


def filt(x, kind, freq, order=2):
    sos = butter(order, freq, btype=kind, fs=SR, output="sos")
    return sosfilt(sos, x, axis=0)


def sweep_lp(x, f_start, f_end, chunk=256, curve=2.0):
    """Time-varying low-pass (chunked biquad with carried state)."""
    out = np.empty_like(x)
    mono = x.ndim == 1
    xs = x[:, None] if mono else x
    ys = np.empty_like(xs)
    n = len(xs)
    zi = None
    for s in range(0, n, chunk):
        p = (s / max(n - 1, 1)) ** curve
        f = f_start * (f_end / f_start) ** p
        sos = butter(2, min(f, SR * 0.45), btype="lowpass", fs=SR, output="sos")
        if zi is None:
            zi = np.stack([sosfilt_zi(sos)] * xs.shape[1], axis=-1) * 0
        ys[s : s + chunk], zi = sosfilt(sos, xs[s : s + chunk], axis=0, zi=zi)
    out = ys[:, 0] if mono else ys
    return out


def saw(freq, n, phase=0.0):
    ph = (np.cumsum(np.full(n, freq) if np.isscalar(freq) else freq) / SR + phase) % 1.0
    return 2 * ph - 1


def env_adsr(n, a, d, s, r):
    e = np.full(n, s)
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    na = min(na, n)
    e[:na] = np.linspace(0, 1, na, endpoint=False)
    e[na : na + nd] = np.linspace(1, s, len(e[na : na + nd]))
    if nr:
        e[-nr:] *= np.linspace(1, 0, min(nr, n))
    return e


def make_ir(seconds=2.4, decay=3.2, bright=6000):
    n = int(seconds * SR)
    t = t_axis(n)
    ir = RNG.standard_normal((n, 2)) * np.exp(-decay * t)[:, None]
    ir = filt(ir, "lowpass", bright)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    return ir / np.sqrt((ir**2).sum(axis=0))


def reverb(x, ir):
    return np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)


# ── instruments ───────────────────────────────────────────────────────────


def kick(hard=1.0):
    n = int(0.55 * SR)
    t = t_axis(n)
    f = 44 + 150 * np.exp(-t / 0.035) * hard
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.28)
    click = filt(RNG.standard_normal(n) * np.exp(-t / 0.004), "highpass", 1500) * 0.35
    return np.tanh(1.6 * (body + click))


def clap():
    n = int(0.4 * SR)
    t = t_axis(n)
    noise = RNG.standard_normal(n)
    e = np.zeros(n)
    for k, off in enumerate([0, 0.011, 0.022]):
        i = int(off * SR)
        e[i:] += np.exp(-(t[: n - i]) / (0.012 if k < 2 else 0.14))
    body = filt(noise * e, "bandpass", [900, 5200])
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) * 0.4
    return body + tone


def hat(open_=False):
    n = int((0.25 if open_ else 0.07) * SR)
    t = t_axis(n)
    x = filt(RNG.standard_normal(n), "highpass", 7500)
    return x * np.exp(-t / (0.09 if open_ else 0.018))


def pluck(m, length=0.3, bright=4200):
    n = int(length * SR)
    t = t_axis(n)
    f = midi(m)
    x = 0.6 * saw(f, n) + 0.4 * saw(f * 1.004, n, 0.3)
    x = sweep_lp(x, bright, 300, chunk=128, curve=0.5)
    return x * np.exp(-t / 0.11)


def pad_voice(m, n, detune=0.12):
    f = midi(m)
    l = sum(saw(f * 2 ** (d / 12), n, RNG.random()) for d in (-detune, 0.0, detune * 0.7))
    r = sum(saw(f * 2 ** (d / 12), n, RNG.random()) for d in (detune, 0.0, -detune * 0.6))
    return np.stack([l, r], axis=1) / 3


def bass_note(m, length, cutoff=700):
    n = int(length * SR)
    t = t_axis(n)
    f = midi(m)
    x = 0.55 * saw(f, n) + 0.8 * np.sin(2 * np.pi * f * t)
    x = filt(x, "lowpass", cutoff)
    return np.tanh(1.5 * x) * env_adsr(n, 0.004, 0.08, 0.75, 0.03)


def impact(length=3.0, pitch=58):
    n = int(length * SR)
    t = t_axis(n)
    f = pitch * np.exp(-t / 1.2) + 26
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.9)
    crack = filt(RNG.standard_normal(n), "bandpass", [300, 9000]) * np.exp(-t / 0.08)
    return np.tanh(1.8 * boom) + 0.5 * crack


def riser(length, f0=200, f1=4200):
    n = int(length * SR)
    p = np.linspace(0, 1, n)
    noise = RNG.standard_normal((n, 2))
    x = sweep_lp(noise, f0, f1, curve=1.6)
    x = filt(x, "highpass", 150)
    tone = saw(np.linspace(midi(50), midi(74), n), n) * 0.12
    return (x + tone[:, None]) * (p**2.2)[:, None]


def rev_cymbal(length=1.2):
    n = int(length * SR)
    p = np.linspace(0, 1, n)
    x = filt(RNG.standard_normal((n, 2)), "highpass", 4000)
    return x * (p**3)[:, None]


def whoosh(length=0.45, up=True):
    n = int(length * SR)
    p = np.linspace(0, 1, n)
    x = RNG.standard_normal((n, 2))
    x = sweep_lp(x, 400 if up else 6000, 6000 if up else 400, curve=1.0)
    return x * np.sin(np.pi * p)[:, None] ** 1.5


def blip(freq=1500, length=0.12):
    n = int(length * SR)
    t = t_axis(n)
    return np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.03)


def zap(f0, f1, length=0.28):
    n = int(length * SR)
    t = t_axis(n)
    f = np.geomspace(f0, f1, n)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12)


def tick():
    n = int(0.018 * SR)
    t = t_axis(n)
    return filt(RNG.standard_normal(n), "bandpass", [2000, 9000]) * np.exp(-t / 0.003)


def bell(m, length=3.5):
    n = int(length * SR)
    t = t_axis(n)
    f = midi(m)
    x = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t / (1.6 / k)) for k, a in [(1, 1), (2.01, 0.5), (3.0, 0.25), (4.2, 0.12)])
    return x * env_adsr(n, 0.002, 0.0, 1.0, 0.2)


# ── arrangement ───────────────────────────────────────────────────────────

# i–VI–III–VII in D minor, one chord per bar (2s)
CHORDS = [
    [50, 57, 60, 64, 65],  # Dm(add9)
    [46, 53, 57, 60, 62],  # Bbmaj9
    [41, 53, 57, 60, 67],  # F(add9)
    [48, 55, 59, 62, 64],  # C / G-ish color
]
ROOTS = [38, 34, 41, 36]
BAR = BEAT * 4


def chord_at(t):
    return int(t // BAR) % 4


def section(t):
    for name, (a, b) in TIMELINE["scenes"].items():
        if a <= t < b:
            return name
    return "finale"


drums, bass, pads, arps, sfx, fx_send = buf(), buf(), buf(), buf(), buf(), buf()
events = {"kicks": [], "claps": [], "hats": [], "hits": [], "ticks": [], "stutters": []}

# Kick pattern
for b in range(int(DUR / BEAT)):
    t = b * BEAT
    sec = section(t)
    if sec == "opener" and t < 4.0:
        continue
    if sec == "opener":  # heartbeat pulse building into genesis
        if b % 2 == 0:
            place(drums, filt(kick(0.6), "lowpass", 300), t, 0.55)
            events["kicks"].append(round(t, 3))
        continue
    if sec == "finale" and t >= 28.0:
        continue
    gain = {"genesis": 0.72, "world": 0.85}.get(sec, 1.0)
    k = kick(1.0)
    if sec == "genesis":
        k = filt(k, "lowpass", 900)
    place(drums, k, t, gain)
    events["kicks"].append(round(t, 3))

# Claps on 2 & 4 from the world section, hats on offbeats from genesis
for b in range(int(DUR / BEAT)):
    t = b * BEAT
    sec = section(t)
    if sec in ("world", "materials", "code", "cuts") or (sec == "finale" and t < 28):
        if b % 4 in (1, 3) and not (sec == "world" and t < 12):
            place(drums, clap(), t, 0.5, pan=0.05)
            place(fx_send, clap(), t, 0.25)
            events["claps"].append(round(t, 3))
    if sec in ("genesis", "world", "materials", "code", "cuts"):
        place(drums, hat(open_=(sec in ("materials", "cuts") and b % 2 == 1)), t + BEAT / 2, 0.22, pan=0.3)
        events["hats"].append(round(t + BEAT / 2, 3))
        if sec in ("materials", "cuts"):
            for q in (0.25, 0.75):
                place(drums, hat(), t + BEAT * q, 0.1, pan=-0.3)

# Snare roll into the drop
for i in range(16):
    t = 13.0 + i * (1.0 / 16)
    place(drums, clap(), t, 0.12 + 0.4 * (i / 15) ** 2, pan=(i % 2) * 0.2 - 0.1)

# Bass: 8th notes from genesis
for s in range(int(DUR / (BEAT / 2))):
    t = s * BEAT / 2
    sec = section(t)
    if sec in ("opener",) or (sec == "finale" and t >= 28):
        continue
    root = ROOTS[chord_at(t)]
    if sec == "genesis" and s % 2 == 1:
        continue
    note = root + (12 if (sec in ("materials", "cuts") and s % 4 == 3) else 0)
    cutoff = {"genesis": 380, "world": 520, "materials": 1100, "code": 650, "cuts": 1300, "finale": 900}[sec]
    place(bass, bass_note(note, BEAT / 2 * 0.92, cutoff), t, 0.42)

# Pads: one chord per bar, whole piece, filter opens by section
for bar in range(int(DUR / BAR) + 1):
    t0 = bar * BAR
    if t0 >= DUR:
        break
    n = int(BAR * SR) + int(0.6 * SR)
    chord = CHORDS[bar % 4]
    x = sum(pad_voice(m, n) for m in chord) / len(chord)
    sec = section(t0)
    lo, hi = {"opener": (300, 1400), "genesis": (500, 1600), "world": (800, 2600), "materials": (2200, 3800), "code": (900, 1400), "cuts": (2600, 4200), "finale": (2400, 1200)}[sec]
    x = sweep_lp(x, lo, hi, curve=1.0)
    x *= env_adsr(n, 0.35 if sec == "opener" else 0.05, 0.3, 0.85, 0.6)[:, None]
    g = {"opener": 0.5, "code": 0.35, "finale": 0.6}.get(sec, 0.42)
    place(pads, x, t0, g)

# Long final chord that rings out
n = int(5.5 * SR)
final = sum(pad_voice(m, n, 0.18) for m in [38, 50, 57, 62, 64, 69, 72]) / 7
final = sweep_lp(final, 3200, 500, curve=0.7) * env_adsr(n, 0.01, 0.8, 0.6, 2.0)[:, None]
place(pads, final, 25.0, 0.7)

# Arp: 16th plucks cycling chord tones (+ ping-pong delay)
for s in range(int(DUR / (BEAT / 4))):
    t = s * BEAT / 4
    sec = section(t)
    if sec in ("opener", "code") or t >= 28.5:
        if not (sec == "opener" and t >= 2.0 and s % 2 == 0):
            continue
    chord = CHORDS[chord_at(t)]
    pattern = [0, 2, 3, 4, 1, 3, 4, 2]
    m = chord[pattern[s % 8]] + 12
    bright = {"opener": 1800, "genesis": 2600, "world": 3500, "materials": 5200, "cuts": 6000, "finale": 4000}.get(sec, 3000)
    g = {"opener": 0.1, "genesis": 0.16}.get(sec, 0.2)
    p = pluck(m, 0.28, bright)
    place(arps, p, t, g, pan=0.35 if s % 2 else -0.35)
    for k, (dt, pan) in enumerate([(0.375, 0.7), (0.75, -0.7), (1.125, 0.7)]):
        place(arps, p, t + dt, g * 0.38 * 0.55**k, pan=pan)

# "Code" section: typing ticks
code_a, code_b = TIMELINE["scenes"]["code"]
t = code_a + 0.1
while t < code_b - 0.1:
    place(sfx, tick(), t, 0.18 + 0.12 * RNG.random(), pan=RNG.uniform(-0.4, 0.4))
    events["ticks"].append(round(t, 3))
    t += 0.045 + 0.05 * RNG.random()

# "Cuts" section: stutter stabs on every 16th of every cut + whoosh per cut
cuts_a, cuts_b = TIMELINE["scenes"]["cuts"]
for i in range(int((cuts_b - cuts_a) / (BEAT / 2))):
    t = cuts_a + i * BEAT / 2
    chord = CHORDS[chord_at(t)]
    n = int(0.11 * SR)
    stab = sum(pad_voice(m + 12, n, 0.2) for m in chord[1:]) / 4
    stab = filt(stab, "lowpass", 5000) * env_adsr(n, 0.002, 0.05, 0.6, 0.04)[:, None]
    place(sfx, stab, t, 0.55)
    place(sfx, stab, t + BEAT / 4, 0.3)
    place(sfx, whoosh(0.2, up=i % 2 == 0), t - 0.1, 0.25)
    events["stutters"].append(round(t, 3))

# Transitions / hits
vo = TIMELINE["vo"]
place(sfx, impact(3.5, 50), 0.35, 0.55)  # opening boom on "嘿"
events["hits"].append(0.35)
place(sfx, riser(1.8, 300, 5000), 4.2, 0.35)
place(sfx, rev_cymbal(1.0), 5.0, 0.3)
place(sfx, impact(2.0, 70), 6.0, 0.5)
events["hits"].append(6.0)
# genesis sfx synced to 点 / 线 / 面
place(sfx, blip(1760), vo["l2"] + 0.516, 0.35)
place(sfx, zap(300, 2400), vo["l2"] + 1.436, 0.3)
place(sfx, whoosh(0.6), vo["l2"] + 2.4, 0.35)
place(sfx, whoosh(0.8), 9.6, 0.35)
place(sfx, impact(1.8, 64), 10.0, 0.45)
events["hits"].append(10.0)
place(sfx, riser(1.6, 250, 7000), 12.4, 0.45)
place(sfx, rev_cymbal(1.2), 12.8, 0.4)
place(sfx, impact(3.0, 55), 14.0, 0.8)
events["hits"].append(14.0)
for w, dt in (("光影", 0.0946), ("材质", 0.742), ("镜头", 1.4227)):
    place(sfx, zap(2400, 600, 0.2), vo["l4"] + dt, 0.18)
place(sfx, whoosh(0.5, up=False), 17.75, 0.4)
place(sfx, impact(1.6, 80), 18.0, 0.45)
events["hits"].append(18.0)
place(sfx, zap(200, 3200, 0.5), 20.35, 0.3)
place(sfx, riser(1.2, 400, 8000), 20.9, 0.4)
place(sfx, impact(1.6, 72), 22.0, 0.5)
events["hits"].append(22.0)
place(sfx, riser(1.5, 300, 9000), 23.5, 0.5)
place(sfx, rev_cymbal(1.4), 23.6, 0.5)
place(sfx, impact(5.0, 48), 25.0, 1.0)
events["hits"].append(25.0)
FINAL_HIT = vo["l7"] + 3.45  # on "创造"
for m, dt in [(74, 0.0), (81, 0.09), (86, 0.18)]:
    place(sfx, bell(m), FINAL_HIT + dt, 0.14)
place(sfx, impact(2.5, 40), FINAL_HIT, 0.35)
events["hits"].append(round(FINAL_HIT, 3))

# ── mix bus ───────────────────────────────────────────────────────────────

# Sidechain: duck pads/bass/arps under every kick
sc = np.ones(N)
for tk in events["kicks"]:
    i = int(tk * SR)
    n = min(int(0.32 * SR), N - i)
    sc[i : i + n] = np.minimum(sc[i : i + n], 1 - 0.6 * np.exp(-np.arange(n) / (0.09 * SR)))
sc = sc[:, None]

ir_big = make_ir(2.8, 2.4, 7000)
ir_small = make_ir(0.9, 6.0, 5000)
music = drums + bass * sc + pads * sc + arps * sc * 0.9 + sfx
music += reverb(pads * 0.25 + arps * 0.55 + sfx * 0.35 + fx_send, ir_big) * 0.45

# Voice-over: decode, clean, place
vo_bus = buf()
vo_env = np.zeros(N)
for line_id, start in vo.items():
    path = ROOT / "public" / "audio" / "vo" / f"{line_id}.mp3"
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        check=True, capture_output=True,
    ).stdout
    v = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    v = filt(v, "highpass", 90)
    v = v + 0.25 * filt(v, "bandpass", [2500, 6000])  # presence
    v = v / (np.abs(v).max() + 1e-9) * 0.9
    place(vo_bus, v, start, 1.0)
    i = int(start * SR)
    vo_env[i : i + len(v)] = np.maximum(vo_env[i : i + len(v)], 1.0)

vo_bus = vo_bus + reverb(vo_bus, ir_small) * 0.12

# Smooth VO gate → music ducking (-6.5 dB while she talks)
k = int(0.12 * SR)
vo_env = np.convolve(vo_env, np.ones(k) / k, mode="same")
duck = (1 - 0.53 * vo_env)[:, None]

# music tail fades over the last 0.8s; VO is never faded
fade = np.ones(N)
fade[-int(0.8 * SR) :] = np.linspace(1, 0, int(0.8 * SR)) ** 2
mix = music * 0.55 * duck * fade[:, None] + vo_bus * 0.95
mix = filt(mix, "highpass", 28)
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
mix = mix / np.abs(mix).max() * 0.94

out = ROOT / "public" / "audio" / "mix.wav"
sf.write(out, mix.astype(np.float32), SR, subtype="PCM_24")
(ROOT / "src" / "audio-events.json").write_text(json.dumps(events))
print("wrote", out, "peak", float(np.abs(mix).max()), {k: len(v) for k, v in events.items()})
