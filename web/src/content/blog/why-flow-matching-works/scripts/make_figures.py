#!/usr/bin/env python3
"""Self-contained figure generator for this blog post.

No third-party dependencies (pure Python stdlib). Regenerate the SVGs with:

    python3 make_figures.py

It writes two files under ../images/:
  - sd3-rank-vs-steps.svg      slope chart of SD3 Table 1 rankings (5 vs 50 steps)
  - logitnormal-sampling.svg   SD3 logit-normal timestep sampling densities

All underlying data is embedded below and also printed to stdout when run, so
the post is fully reproducible without any external files.
"""

import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(os.path.dirname(HERE), "images")

# ---------------------------------------------------------------------------
# DATA 1 — SD3 Table 1 global ranking (lower = better).
# Source: Esser et al., 2024, "Scaling Rectified Flow Transformers ...",
#         arXiv:2403.03206, Table 1 (rank averaged over 5 / 50 sampling steps).
# Each entry: label, rank@5steps, rank@50steps, color, width, dashed, bold
# ---------------------------------------------------------------------------
RANKS = [
    ("rf/lognorm(0.00, 1.00)", 1.25, 1.50, "#5b5bd6", 3.0, False, True),
    ("eps/linear (old baseline)", 4.25, 2.75, "#e5484d", 2.4, False, False),
    ("rf/lognorm(0.50, 0.60)", 8.50, 1.00, "#d9730d", 2.0, False, False),
    ("edm(0.00, 0.60)", 13.25, 3.25, "#12a794", 2.0, False, False),
    ("rf (uniform)", 6.50, 5.75, "#9aa0a6", 1.8, False, False),
    ("v/linear", 5.75, 7.75, "#9aa0a6", 1.8, True, False),
]

# ---------------------------------------------------------------------------
# DATA 2 — logit-normal timestep sampler pi_ln(t; m, s) used/compared in SD3.
# Density of t when logit(t) = ln(t/(1-t)) ~ Normal(m, s^2):
#   f(t) = 1/(s*sqrt(2pi)) * exp(-(logit(t)-m)^2 / (2 s^2)) / (t*(1-t))
# t = 0 is clean data, t = 1 is pure noise (matches x_t=(1-t)x0+t*eps here).
# ---------------------------------------------------------------------------
LOGNORM = [
    ("m=0.00, s=1.00  (SD3 default)", 0.00, 1.00, "#5b5bd6", 3.0, False),
    ("m=0.50, s=0.60", 0.50, 0.60, "#d9730d", 2.0, False),
    ("m=1.00, s=0.60", 1.00, 0.60, "#12a794", 2.0, False),
    ("m=0.50, s=1.00", 0.50, 1.00, "#e5484d", 2.0, False),
    ("uniform (reference)", None, None, "#9aa0a6", 1.8, True),
]


def logit_normal_density(t, m, s):
    if t <= 0.0 or t >= 1.0:
        return 0.0
    logit = math.log(t / (1.0 - t))
    coef = 1.0 / (s * math.sqrt(2.0 * math.pi))
    return coef * math.exp(-((logit - m) ** 2) / (2.0 * s * s)) / (t * (1.0 - t))


def esc(x):
    return round(float(x), 2)


# ---------------------------------------------------------------------------
# Figure 1 — slope chart of rankings.
# ---------------------------------------------------------------------------
def make_rank_chart():
    W, H = 720, 560
    x5, x50 = 210, 520
    y_top, y_bot = 100, 455  # rank 1 -> y_top, rank 20 -> y_bot
    r_min, r_max = 1.0, 20.0

    def ry(rank):
        return y_top + (rank - r_min) / (r_max - r_min) * (y_bot - y_top)

    s = []
    s.append(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
        "font-family=\"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif\">"
    )
    s.append(f'<rect x="8" y="8" width="{W-16}" height="{H-16}" rx="16" fill="#ffffff" stroke="#e5e7eb"/>')
    s.append('<text x="36" y="40" font-size="19" font-weight="700" fill="#1c1c1e">SD3: how sampling steps reshuffle the ranking</text>')
    s.append('<text x="36" y="64" font-size="12.5" fill="#6b7280">Higher = better (rank 1 = best). RF leads at few steps; eps/linear and EDM catch up at many steps.</text>')
    s.append(f'<text x="{x5}" y="90" font-size="13" font-weight="600" fill="#374151" text-anchor="middle">5 steps</text>')
    s.append(f'<text x="{x50}" y="90" font-size="13" font-weight="600" fill="#374151" text-anchor="middle">50 steps</text>')
    s.append(f'<line x1="{x5}" y1="{y_top}" x2="{x5}" y2="{y_bot}" stroke="#eceded" stroke-width="1"/>')
    s.append(f'<line x1="{x50}" y1="{y_top}" x2="{x50}" y2="{y_bot}" stroke="#eceded" stroke-width="1"/>')
    s.append('<text x="150" y="106" font-size="11" fill="#9aa0a6">better</text>')

    # draw non-highlighted first, highlighted last (on top)
    order = sorted(RANKS, key=lambda e: e[6])
    for label, r5, r50, color, width, dashed, bold in order:
        y5, y50 = round(ry(r5), 1), round(ry(r50), 1)
        dash = ' stroke-dasharray="5 4"' if dashed else ""
        s.append(f'<line x1="{x5}" y1="{y5}" x2="{x50}" y2="{y50}" stroke="{color}" stroke-width="{width}"{dash}/>')
        rr = 4.5 if bold else (4 if width >= 2.4 else 3.5)
        s.append(f'<circle cx="{x5}" cy="{y5}" r="{rr}" fill="{color}"/>')
        s.append(f'<circle cx="{x50}" cy="{y50}" r="{rr}" fill="{color}"/>')
        fw = ' font-weight="700"' if bold else ""
        s.append(f'<text x="204" y="{y5+4}" font-size="11" fill="{color}" text-anchor="end"{fw}>{esc(r5)}</text>')
        s.append(f'<text x="527" y="{y50+4}" font-size="11" fill="{color}" text-anchor="start"{fw}>{esc(r50)}</text>')

    # legend (2 columns x 3 rows), in table order
    lx1, lx2 = 40, 390
    rows = [(490, RANKS[0], RANKS[1]), (513, RANKS[2], RANKS[3]), (536, RANKS[4], RANKS[5])]
    s.append('<g font-size="12" fill="#374151">')
    for y, left, right in rows:
        for lx, e in ((lx1, left), (lx2, right)):
            label, _, _, color, width, dashed, _ = e
            dash = ' stroke-dasharray="5 4"' if dashed else ""
            s.append(f'<line x1="{lx}" y1="{y}" x2="{lx+26}" y2="{y}" stroke="{color}" stroke-width="{width}"{dash}/>')
            s.append(f'<text x="{lx+34}" y="{y+4}">{label}</text>')
    s.append("</g>")
    s.append("</svg>\n")
    return "\n".join(s)


# ---------------------------------------------------------------------------
# Figure 2 — logit-normal sampling densities.
# ---------------------------------------------------------------------------
def make_lognorm_chart():
    W, H = 720, 500
    left, right, top, bot = 64, 690, 92, 420
    y_max = 3.6
    n = 240

    def px(t):
        return left + t * (right - left)

    def py(v):
        return bot - (v / y_max) * (bot - top)

    s = []
    s.append(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
        "font-family=\"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif\">"
    )
    s.append(f'<rect x="8" y="8" width="{W-16}" height="{H-16}" rx="16" fill="#ffffff" stroke="#e5e7eb"/>')
    s.append('<text x="36" y="40" font-size="19" font-weight="700" fill="#1c1c1e">SD3 logit-normal timestep sampling</text>')
    s.append('<text x="36" y="63" font-size="12.5" fill="#6b7280">Density of the sampled timestep t. Higher = trained more often there. t=0 clean data, t=1 pure noise.</text>')

    # axes
    s.append(f'<line x1="{left}" y1="{bot}" x2="{right}" y2="{bot}" stroke="#c9cdd2" stroke-width="1"/>')
    s.append(f'<line x1="{left}" y1="{top}" x2="{left}" y2="{bot}" stroke="#c9cdd2" stroke-width="1"/>')
    # x ticks
    for tv in (0.0, 0.25, 0.5, 0.75, 1.0):
        xx = round(px(tv), 1)
        s.append(f'<line x1="{xx}" y1="{bot}" x2="{xx}" y2="{bot+5}" stroke="#c9cdd2" stroke-width="1"/>')
        s.append(f'<text x="{xx}" y="{bot+20}" font-size="11" fill="#6b7280" text-anchor="middle">{tv:g}</text>')
    s.append(f'<text x="{(left+right)/2}" y="{bot+40}" font-size="12" fill="#374151" text-anchor="middle">timestep t  (0 = clean  →  1 = noise)</text>')
    # y ticks
    for vv in (0, 1, 2, 3):
        yy = round(py(vv), 1)
        s.append(f'<line x1="{left-5}" y1="{yy}" x2="{left}" y2="{yy}" stroke="#c9cdd2" stroke-width="1"/>')
        s.append(f'<text x="{left-9}" y="{yy+4}" font-size="11" fill="#6b7280" text-anchor="end">{vv}</text>')
    s.append(f'<text x="20" y="{(top+bot)/2}" font-size="12" fill="#374151" text-anchor="middle" transform="rotate(-90 20 {(top+bot)/2})">sampling density</text>')

    # curves
    for label, m, sd, color, width, dashed in LOGNORM:
        pts = []
        for i in range(n + 1):
            t = i / n
            if m is None:  # uniform
                v = 1.0
            else:
                v = logit_normal_density(t, m, sd)
            v = min(v, y_max)  # clip for display
            pts.append(f"{round(px(t),1)},{round(py(v),1)}")
        dash = ' stroke-dasharray="6 4"' if dashed else ""
        s.append(f'<polyline points="{" ".join(pts)}" fill="none" stroke="{color}" stroke-width="{width}"{dash}/>')

    # legend (top-right)
    ly = 104
    s.append('<g font-size="12" fill="#374151">')
    for label, m, sd, color, width, dashed in LOGNORM:
        dash = ' stroke-dasharray="6 4"' if dashed else ""
        s.append(f'<line x1="470" y1="{ly}" x2="496" y2="{ly}" stroke="{color}" stroke-width="{width}"{dash}/>')
        s.append(f'<text x="504" y="{ly+4}">{label}</text>')
        ly += 22
    s.append("</g>")
    s.append("</svg>\n")
    return "\n".join(s)


def main():
    print("=== DATA 1: SD3 Table 1 ranking (lower is better) ===")
    print(f"{'variant':28s} {'5 steps':>8s} {'50 steps':>9s}")
    for label, r5, r50, *_ in RANKS:
        print(f"{label:28s} {r5:8.2f} {r50:9.2f}")
    print("\n=== DATA 2: logit-normal params pi_ln(t; m, s) ===")
    for label, m, sd, *_ in LOGNORM:
        print(f"{label:32s} m={m}  s={sd}")

    os.makedirs(IMAGES, exist_ok=True)
    out1 = os.path.join(IMAGES, "sd3-rank-vs-steps.svg")
    out2 = os.path.join(IMAGES, "logitnormal-sampling.svg")
    with open(out1, "w", encoding="utf-8") as f:
        f.write(make_rank_chart())
    with open(out2, "w", encoding="utf-8") as f:
        f.write(make_lognorm_chart())
    print(f"\nWrote {out1}\nWrote {out2}")


if __name__ == "__main__":
    main()
