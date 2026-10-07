"""One-off script to generate simple solid-colour placeholder PWA icons (no PIL dependency).
Run: python3 scripts/gen-icon.py
Replace public/icons/*.png with real branded icons before shipping past Phase 0.
"""
import struct
import zlib
import os

def write_png(path, size, rgb):
    width = height = size
    r, g, b = rgb

    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data +
                struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff))

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)  # 8-bit, truecolor
    raw = b""
    for _y in range(height):
        raw += b"\x00" + bytes([r, g, b]) * width
    idat = zlib.compress(raw, 9)
    png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(png)

if __name__ == "__main__":
    indigo = (79, 70, 229)  # matches theme_color #4f46e5
    write_png("public/icons/icon-192.png", 192, indigo)
    write_png("public/icons/icon-512.png", 512, indigo)
    print("Generated placeholder icons.")
