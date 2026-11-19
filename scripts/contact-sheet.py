# -*- coding: utf-8 -*-
"""v5 预览总览图：5 分区 × 亮/暗，两张拼版（亮一套、暗一套）。"""
import os
from PIL import Image, ImageDraw, ImageFont

SHOTS = os.path.join("prototype", "shots-v5")
PANES = [
    ("today", "今天"),
    ("capture", "记一条"),
    ("todo", "待办"),
    ("memory", "记忆"),
    ("health", "库健康"),
]
W = 480
GAP = 48
PAD = 40

def font(size):
    for p in ("C:/Windows/Fonts/msyh.ttc", "C:/Windows/Fonts/segoeui.ttf"):
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

def compose(theme, title, out):
    cols = []
    for pid, label in PANES:
        img = Image.open(os.path.join(SHOTS, f"{pid}-{theme}.png")).convert("RGB")
        if img.width != W:
            img = img.resize((W, int(img.height * W / img.width)))
        cols.append((label, img))
    # 两列布局：5 项 → 3 + 2
    split = 3
    groups = [cols[:split], cols[split:]]
    col_w = W
    canvas_w = PAD * 2 + col_w * 2 + GAP
    header_h = 96
    ys = [header_h, header_h]
    row_imgs = []
    for gi, group in enumerate(groups):
        y = ys[gi]
        for label, img in group:
            row_imgs.append((gi, y, label, img))
            y += img.height + 28
        ys[gi] = y
    canvas_h = max(ys) + PAD
    bg = (20, 21, 24) if theme == "dark" else (238, 240, 244)
    fg = (235, 238, 242) if theme == "dark" else (24, 28, 36)
    canvas = Image.new("RGB", (canvas_w, canvas_h), bg)
    d = ImageDraw.Draw(canvas)
    d.text((PAD, 28), title, font=font(34), fill=fg)
    d.text((PAD, 70), "记忆库 v5 · 卡片仪表盘 · 颜色全部来自宿主真实 token（明暗自动跟随）",
           font=font(16), fill=(150, 156, 166))
    for gi, y, label, img in row_imgs:
        x = PAD + gi * (col_w + GAP)
        d.text((x, y - 24), label, font=font(18), fill=fg)
        canvas.paste(img, (x, y))
    canvas.save(out)
    print(out, canvas.size)

compose("light", "v5 预览 · 浅色主题", os.path.join(SHOTS, "overview-light.png"))
compose("dark", "v5 预览 · 深色主题", os.path.join(SHOTS, "overview-dark.png"))
