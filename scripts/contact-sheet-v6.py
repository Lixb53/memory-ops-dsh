# -*- coding: utf-8 -*-
"""v6 总览：裁掉空白，5 分区并排 × 亮/暗两张拼版。"""
import os
from PIL import Image, ImageChops, ImageDraw, ImageFont

SRC = os.path.join("design", "shots-v6")
PANES = [("today", "今天"), ("capture", "记一条"), ("todo", "待办"),
         ("memory", "记忆"), ("health", "库健康")]

def font(size):
    for p in ("C:/Windows/Fonts/msyh.ttc",):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def trim(img):
    """按背景色裁掉四周空白（背景是纯色）。"""
    bg = Image.new("RGB", img.size, img.getpixel((2, 2)))
    diff = ImageChops.difference(img, bg)
    bbox = diff.getbbox()
    return img.crop((0, 0, img.width, min(img.height, bbox[3] + 28))) if bbox else img

def compose(theme_suffix, out, title):
    imgs = []
    for pid, label in PANES:
        im = Image.open(os.path.join(SRC, f"{pid}{theme_suffix}.png")).convert("RGB")
        im = trim(im)
        h = 1500
        w = int(im.width * h / im.height)
        imgs.append((label, im.resize((w, h))))
    pad, gap = 48, 36
    total_w = pad * 2 + sum(w for _, w in [(l, i.width) for l, i in imgs]) + gap * (len(imgs) - 1)
    header = 110
    canvas = Image.new("RGB", (total_w, header + h + pad),
                       (14, 14, 16) if theme_suffix else (230, 232, 238))
    fg = (235, 238, 242) if theme_suffix else (24, 28, 36)
    d = ImageDraw.Draw(canvas)
    d.text((pad, 30), title, font=font(34), fill=fg)
    d.text((pad, 74), "v6 · 密排档案台（Data-Dense Ledger）— 单条 KPI 账带 / 36px 台账行 / 数字右对齐基线 / 等宽元信息 · 颜色全部来自宿主真实 token",
           font=font(15), fill=(150, 156, 166))
    x = pad
    for label, im in imgs:
        d.text((x, header - 26), label, font=font(17), fill=fg)
        canvas.paste(im, (x, header))
        x += im.width + gap
    canvas.save(out)
    print(out, canvas.size)

compose("", os.path.join(SRC, "v6-overview-light.png"), "记忆库 v6 · 浅色")
compose("-dark", os.path.join(SRC, "v6-overview-dark.png"), "记忆库 v6 · 深色")
