#!/usr/bin/env python3
"""Verifica contraste WCAG 2.x entre pares de colores.

Uso:
  python contrast_check.py "#1f2937" "#ffffff"
  python contrast_check.py "#1f2937:#ffffff" "#6b7280:#f9fafb" "rgb(99,102,241):#fff"

Acepta #rgb, #rrggbb, rgb(r,g,b). Cada par es texto:fondo (o dos argumentos sueltos).
Reporta ratio y si pasa AA / AAA para texto normal y grande (>=24px o >=18.66px bold).
"""
import re
import sys


def parse(color: str) -> tuple[float, float, float]:
    c = color.strip().lower()
    m = re.fullmatch(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)", c)
    if m:
        return tuple(int(v) / 255 for v in m.groups())
    c = c.lstrip("#")
    if len(c) == 3:
        c = "".join(ch * 2 for ch in c)
    if not re.fullmatch(r"[0-9a-f]{6}", c):
        raise ValueError(f"Color no reconocido: {color!r}")
    return tuple(int(c[i:i + 2], 16) / 255 for i in (0, 2, 4))


def luminance(rgb: tuple[float, float, float]) -> float:
    def lin(v: float) -> float:
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(v) for v in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(fg: str, bg: str) -> float:
    l1, l2 = sorted((luminance(parse(fg)), luminance(parse(bg))), reverse=True)
    return (l1 + 0.05) / (l2 + 0.05)


def pairs(args: list[str]) -> list[tuple[str, str]]:
    if all(":" in a for a in args):
        return [tuple(a.split(":", 1)) for a in args]  # type: ignore[misc]
    if len(args) % 2:
        raise SystemExit("Pasa pares texto fondo, o usa el formato texto:fondo")
    return list(zip(args[::2], args[1::2]))


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    ok = "✓"
    no = "✗"
    failed = False
    print(f"{'texto':<20}{'fondo':<20}{'ratio':>7}   AA   AA-grande   AAA")
    for fg, bg in pairs(sys.argv[1:]):
        r = ratio(fg, bg)
        aa, aa_large, aaa = r >= 4.5, r >= 3, r >= 7
        failed |= not aa
        print(f"{fg:<20}{bg:<20}{r:>6.2f}:1  {ok if aa else no}    {ok if aa_large else no}          {ok if aaa else no}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
