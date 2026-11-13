"""Decode Symbian .mbm multi-bitmap files (as used by the N-Gage game) to PNG.

Usage: python scripts/mbm.py <file.mbm> <out dir> [first-last]
Handles the formats the game uses: 12-bit colour with 12-bit RLE (compression 2) and
1-bit masks, plain or byte-RLE (compression 0 / 1). A colour bitmap followed by a mask
of the same size is written as one PNG with transparency.
"""
import os
import struct
import sys
import zlib


def png(path, w, h, rows):
    """rows: list of bytes objects, RGBA per pixel."""
    raw = b"".join(b"\0" + r for r in rows)
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    open(path, "wb").write(data)


def read_all(path):
    b = open(path, "rb").read()
    trailer = struct.unpack("<I", b[16:20])[0]
    n = struct.unpack("<I", b[trailer:trailer + 4])[0]
    offs = struct.unpack("<%dI" % n, b[trailer + 4:trailer + 4 + 4 * n])
    out = []
    for o in offs:
        length, hlen, w, h, tw, th, bpp, col, pal, comp = struct.unpack("<10I", b[o:o + 40])
        data = b[o + hlen:o + length]
        out.append(dict(w=w, h=h, bpp=bpp, comp=comp, data=data))
    return out


def stride(w, bpp):
    bits = w * (16 if bpp == 12 else bpp)
    return ((bits + 31) // 32) * 4


def unrle12(d):
    out = bytearray()
    for i in range(0, len(d) - 1, 2):
        v = d[i] | d[i + 1] << 8
        out += struct.pack("<H", v & 0x0FFF) * ((v >> 12) + 1)
    return bytes(out)


def unrle8(d):
    out = bytearray()
    i = 0
    while i < len(d):
        n = d[i] - 256 if d[i] > 127 else d[i]
        i += 1
        if n >= 0:
            out += bytes([d[i]]) * (n + 1)
            i += 1
        else:
            out += d[i:i - n]
            i += -n
    return bytes(out)


def pixels(bm):
    d = bm["data"]
    if bm["comp"] == 2:
        d = unrle12(d)
    elif bm["comp"] == 1:
        d = unrle8(d)
    return d


def colour_rows(bm, mask=None):
    w, h = bm["w"], bm["h"]
    d, s = pixels(bm), stride(w, 12)
    md, ms = (pixels(mask), stride(w, 1)) if mask else (None, 0)
    rows = []
    for y in range(h):
        r = bytearray()
        for x in range(w):
            p = y * s + x * 2
            v = d[p] | d[p + 1] << 8 if p + 1 < len(d) else 0
            red, green, blue = (v >> 8 & 15) * 17, (v >> 4 & 15) * 17, (v & 15) * 17
            a = 255
            if md is not None:
                q = y * ms + x // 8
                a = 255 if q < len(md) and md[q] >> (x % 8) & 1 else 0
            r += bytes((red, green, blue, a))
        rows.append(bytes(r))
    return rows


def main():
    src, outdir = sys.argv[1], sys.argv[2]
    lo, hi = (map(int, sys.argv[3].split("-")) if len(sys.argv) > 3 else (0, 10 ** 9))
    os.makedirs(outdir, exist_ok=True)
    bms = read_all(src)
    i = 0
    while i < len(bms):
        bm = bms[i]
        nxt = bms[i + 1] if i + 1 < len(bms) else None
        has_mask = nxt and nxt["bpp"] == 1 and (nxt["w"], nxt["h"]) == (bm["w"], bm["h"]) and bm["bpp"] == 12
        if bm["bpp"] == 12 and lo <= i <= hi:
            png(os.path.join(outdir, f"{i:03d}_{bm['w']}x{bm['h']}.png"), bm["w"], bm["h"], colour_rows(bm, nxt if has_mask else None))
        i += 2 if has_mask else 1
    print(f"{len(bms)} bitmaps in {src}")


if __name__ == "__main__":
    main()
