"""Run a real pretrained AlexNet on the cat photo and export every asset the video needs.

Outputs (public/alexnet/):
  cat.jpg              square crop of the source photo (1024px)
  cat224.png           network input
  hog.png              HOG visualisation (the "hand-designed feature" chapter)
  edges.png            Sobel vertical-edge feature map (the convolution chapter)
  shift_diff.png       |cat - cat shifted 6px| (the "same cat, different numbers" beat)
  filters.png          8x8 atlas of the 64 real conv1 kernels (11x11x3)
  fmap_<layer>.png     atlas of the most active channels per conv layer (after ReLU)
  gradcam.png          Grad-CAM heat map for the top class
  data.json            pixel grids, kernel stats, predictions, layer shapes
"""
import json
import pathlib

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from skimage.feature import hog
from torchvision.models import AlexNet_Weights, alexnet

ROOT = pathlib.Path(__file__).parent.parent
SRC = ROOT / "data" / "alexnet" / "cat_src.jpg"
OUT = ROOT / "public" / "alexnet"
OUT.mkdir(parents=True, exist_ok=True)

# ── image prep ─────────────────────────────────────────────────────────────
src = Image.open(SRC).convert("RGB")
W, H = src.size
side = int(W * 0.94)
cx, cy = int(W * 0.515), int(H * 0.42)
box = (max(0, cx - side // 2), max(0, cy - side // 2))
crop = src.crop((box[0], box[1], box[0] + side, box[1] + side))
crop.resize((1024, 1024), Image.LANCZOS).save(OUT / "cat.jpg", quality=92)
cat224 = crop.resize((224, 224), Image.LANCZOS)
cat224.save(OUT / "cat224.png")

arr224 = np.asarray(cat224).astype(np.float32) / 255.0
gray224 = arr224 @ np.array([0.299, 0.587, 0.114], dtype=np.float32)


def save_gray(a, path, size=None, lo=None, hi=None):
    lo = a.min() if lo is None else lo
    hi = a.max() if hi is None else hi
    img = Image.fromarray((np.clip((a - lo) / (hi - lo + 1e-9), 0, 1) * 255).astype(np.uint8))
    if size:
        img = img.resize((size, size), Image.LANCZOS)
    img.save(path)


# HOG of the cat (classic hand-crafted feature)
gray448 = np.asarray(crop.resize((448, 448), Image.LANCZOS).convert("L")).astype(np.float32) / 255
_, hog_img = hog(gray448, orientations=9, pixels_per_cell=(14, 14), cells_per_block=(2, 2), visualize=True)
save_gray(hog_img ** 0.5, OUT / "hog.png", lo=0, hi=np.percentile(hog_img ** 0.5, 99.7))

# Sobel vertical-edge kernel convolved over the cat (what one hand-picked kernel "sees")
SOBEL = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float32)
g = torch.from_numpy(gray448)[None, None]
edge = F.conv2d(g, torch.from_numpy(SOBEL)[None, None], padding=1)[0, 0].numpy()
save_gray(np.abs(edge) ** 0.7, OUT / "edges.png", lo=0, hi=np.percentile(np.abs(edge) ** 0.7, 99.5))

# Shift by a few pixels: almost every number changes
shift = 6
a = gray448
diff = np.abs(a[:, shift:] - a[:, :-shift])
diff = np.pad(diff, ((0, 0), (0, shift)))
save_gray(diff ** 0.6, OUT / "shift_diff.png", lo=0, hi=np.percentile(diff ** 0.6, 99.5))
changed = float((diff > 2 / 255).mean())

# Pixel grids for the 3D scenes
def grid(img, n):
    return np.asarray(img.resize((n, n), Image.BOX)).astype(int)

rgb64 = grid(cat224, 64)  # heightfield columns
gray28 = np.asarray(cat224.resize((28, 28), Image.BOX).convert("L")).astype(int)  # convolution demo

# ── the real network ───────────────────────────────────────────────────────
weights = AlexNet_Weights.IMAGENET1K_V1
net = alexnet(weights=weights).eval()
cats = weights.meta["categories"]
x = weights.transforms()(crop).unsqueeze(0)

acts = {}
conv_idx = {0: "conv1", 3: "conv2", 6: "conv3", 8: "conv4", 10: "conv5"}
h = x
for i, layer in enumerate(net.features):
    h = layer(h)
    if i - 1 in conv_idx and isinstance(layer, torch.nn.ReLU):
        acts[conv_idx[i - 1]] = h.detach()[0]
with torch.no_grad():
    logits = net(x)[0]
probs = logits.softmax(0)
top = probs.topk(5)
preds = [{"label": cats[i], "p": round(float(p), 4)} for p, i in zip(top.values, top.indices)]
print("top-5:", preds)

# conv1 kernels → 8×8 atlas, each 11×11 upscaled ×6, per-filter contrast normalisation
wts = net.features[0].weight.detach().numpy()  # 64,3,11,11
TILE, PAD = 66, 6
atlas = np.full((8 * (TILE + PAD) + PAD, 8 * (TILE + PAD) + PAD, 3), 10, dtype=np.uint8)
sat = []
for k in range(64):
    f = wts[k].transpose(1, 2, 0)
    f = (f - f.min()) / (f.max() - f.min() + 1e-9)
    sat.append(float(np.abs(f - f.mean(axis=2, keepdims=True)).mean()))
    tile = np.asarray(Image.fromarray((f * 255).astype(np.uint8)).resize((TILE, TILE), Image.NEAREST))
    r, c = divmod(k, 8)
    y0, x0 = PAD + r * (TILE + PAD), PAD + c * (TILE + PAD)
    atlas[y0 : y0 + TILE, x0 : x0 + TILE] = tile
Image.fromarray(atlas).save(OUT / "filters.png")


def colormap(v):
    """Black → deep blue → cyan → white, the video's activation palette."""
    stops = np.array([[5, 7, 13], [20, 40, 110], [40, 200, 255], [240, 250, 255]], dtype=np.float32)
    v = np.clip(v, 0, 1) * (len(stops) - 1)
    i = np.minimum(v.astype(int), len(stops) - 2)
    t = (v - i)[..., None]
    return (stops[i] * (1 - t) + stops[i + 1] * t).astype(np.uint8)


fmaps = {}
for name, a in acts.items():
    c, hh, ww = a.shape
    score = a.mean(dim=(1, 2))
    order = score.argsort(descending=True)[:16].tolist()
    tile = 128
    sheet = np.zeros((4 * tile + 5 * 4, 4 * tile + 5 * 4, 3), dtype=np.uint8)
    sheet[:] = (5, 7, 13)
    for j, ch in enumerate(order):
        m = a[ch].numpy()
        m = m / (m.max() + 1e-9)
        img = Image.fromarray(colormap(m ** 0.8)).resize((tile, tile), Image.NEAREST if hh < 30 else Image.BILINEAR)
        r, cc = divmod(j, 4)
        sheet[4 + r * (tile + 4) : 4 + r * (tile + 4) + tile, 4 + cc * (tile + 4) : 4 + cc * (tile + 4) + tile] = np.asarray(img)
    Image.fromarray(sheet).save(OUT / f"fmap_{name}.png")
    fmaps[name] = {"channels": c, "size": hh}

# Grad-CAM on conv5 for the top class
feat = net.features[:11](x)  # conv5 pre-ReLU
feat.retain_grad()
out = net.classifier(torch.flatten(net.avgpool(net.features[11:](feat)), 1))
out[0, top.indices[0]].backward()
wcam = feat.grad[0].mean(dim=(1, 2))
cam = F.relu((wcam[:, None, None] * feat[0]).sum(0)).detach()
cam = F.interpolate(cam[None, None], size=(512, 512), mode="bicubic", align_corners=False)[0, 0].numpy()
cam = np.clip(cam / cam.max(), 0, 1)
heat = np.stack([np.clip(cam * 2.2, 0, 1) * 255, np.clip(cam * 1.4 - 0.25, 0, 1) * 220, np.clip(cam - 0.6, 0, 1) * 300], axis=-1)
Image.fromarray(np.concatenate([heat, (cam ** 0.8 * 235)[..., None]], axis=-1).astype(np.uint8), "RGBA").save(OUT / "gradcam.png")

# Parameter counts of the torchvision model, per layer
params = {n: int(p.numel()) for n, p in net.named_parameters()}

data = {
    "rgb64": rgb64.reshape(-1, 3).tolist(),
    "gray28": gray28.reshape(-1).tolist(),
    "eyePatch": (gray224[96:101, 70:75] * 255).astype(int).tolist(),
    "shiftChanged": round(changed, 4),
    "filterSaturation": [round(s, 4) for s in sat],
    "preds": preds,
    "fmaps": fmaps,
    "params": params,
    "classes": cats,
}
(OUT / "data.json").write_text(json.dumps(data))
print("changed by shift:", changed, "| fmaps:", fmaps)
print("total params:", sum(params.values()))
