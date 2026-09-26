#!/usr/bin/env python3
"""Revisa los textos de una interfaz contra las reglas de references/microcopy.md y la voz de la marca.

Uso:
  python copy_lint.py src/ --voice voice.json               # .tsx .jsx .ts .js .vue .svelte .html
  python copy_lint.py messages/es.json --voice voice.json   # archivos de traducción (planos o anidados)
  python copy_lint.py library.es.json --variant usted       # bibliotecas con variantes {tu, usted}
Opciones:
  --voice voice.json   tratamiento, palabras prohibidas, glosario, exclamaciones, emojis y límites
  --variant tu|usted   en JSON con variantes, revisa solo esa (por defecto: ambas, cada una con su registro)
  --strict             sale con 1 también si hay advertencias (por defecto solo con errores)
  --json               salida en JSON (para CI o para otra herramienta)

Es heurístico: encuentra lo evidente (botones genéricos, errores sin salida, mezcla de tú y usted…).
No sustituye leer los textos en contexto.
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from dataclasses import asdict, dataclass
from pathlib import Path

SOURCE_EXT = {".tsx", ".jsx", ".ts", ".js", ".vue", ".svelte", ".html", ".htm"}
SKIP_DIRS = {"node_modules", ".git", "dist", "build", ".next", "coverage", ".turbo", "out"}

DEFAULT_LIMITS = {"boton_palabras": 3, "boton_caracteres": 24, "toast_caracteres": 80, "titulo_caracteres": 60}

GENERIC_BUTTONS = {"aceptar", "ok", "okay", "enviar", "continuar", "siguiente", "si", "no", "submit", "procesar",
                   "confirmar", "aqui", "click aqui", "clic aqui", "haz click aqui", "haga click aqui", "listo", "ir"}
# Una "salida" es una acción (reintentar, revisar…), la tranquilidad de que no se perdió nada,
# o, en validaciones, decir qué se espera (debe tener, mínimo, ej., aceptamos…).
WAY_OUT = re.compile(r"(int[eé]nt|reint[eé]nt|revis|vuelv|verific|prueb|av[ií]s[aá]nos|av[ií]senos|contact|p[ií]de|solic[ií]t|elig|elij|escrib|us[ae]\b|"
                     r"se enviar|sigue aqu|se conserv|se guarda|reconect|espera|puedes|puede |comprim|cambi[ae]|elimin[ae]|limpi|"
                     r"debe|deben|tiene \d|tiene[ns]? (entre|de|al menos)|m[ií]nimo|m[aá]ximo|\bej\.|a partir|aceptamos|¿quieres|¿desea|abrir)", re.I)
ERROR_HINT = re.compile(r"\b(error|fall[óo]|no se pudo|no pudimos|no se guard|rechaz|inv[aá]lid)", re.I)
TECH = re.compile(r"(\berror\s*\d{3}\b|\bexception\b|\bnull\b|\bundefined\b|\bNaN\b|\[object|stack trace|\bHTTP\s*\d{3}\b|\bE\d{4}\b)", re.I)
BLAME = re.compile(r"\b(inv[aá]lid[oa]s?|incorrect[oa]s?|ilegal(es)?|err[oó]ne[oa]s?|has fallado|fallaste|no v[aá]lid[oa]s?)\b", re.I)
CUTESY = re.compile(r"\b(oops+|ups+|uy|ay no|whoops)\b", re.I)
VAGUE_CONFIRM = re.compile(r"¿\s*(est[aá]s?|est[aá]n?)\s+segur[oa]s?", re.I)
CLICK_HERE = re.compile(r"\b(haz|haga|da|de)?\s*(click|clic)\s+aqu[ií]\b", re.I)
REDUNDANT = re.compile(r"\b(exitosamente|con [eé]xito|satisfactoriamente)\b", re.I)
EMOJI = re.compile("[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F2FF]")
TU = re.compile(r"\b(t[uú]|tus|te|ti|contigo|puedes|quieres|tienes|necesitas|revisa|escribe|elige|intenta|int[eé]ntalo|vuelve|usa|haz|"
                r"p[ií]dele|av[ií]sanos|presiona|crea|sube|borra|compr[ií]melo|ingresa|selecciona|verifica|espera|b[oó]rralos|explores)\b", re.I)
USTED = re.compile(r"\b(usted|ustedes|desea|revise|escriba|elija|intente|int[eé]ntelo|vuelva|haga|solicite|solic[ií]telo|av[ií]senos|"
                   r"presione|cree|suba|borre|compr[ií]malo|ingrese|seleccione|verifique|comun[ií]quese|contacte|espere|explore)\b", re.I)
SMALL = {"de", "del", "la", "las", "el", "los", "y", "o", "a", "en", "con", "por", "para", "un", "una", "al", "e", "u"}


@dataclass
class Finding:
    where: str
    severity: str  # "error" | "aviso"
    rule: str
    text: str
    hint: str


def fold(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").lower().strip()


def strip_icu(s: str) -> str:
    """Quita la sintaxis ICU y deja texto legible: {n} → X, plurales → sus ramas."""
    s = re.sub(r"\{\s*\w+\s*,\s*(plural|select|selectordinal)\s*,", " ", s)
    branch = r"(=\d+|zero|one|two|few|many|other|\w+)" if re.search(r",\s*select\s*,", s) else r"(=\d+|zero|one|two|few|many|other)"
    s = re.sub(branch + r"\s*\{", " ", s)
    s = re.sub(r"\{[^{}]*\}", "X", s)
    return re.sub(r"[{}#]", " ", s).strip()


def kind_from_key(key: str) -> str:
    """Tipo de texto según los segmentos de la clave ("acciones.guardar", "form.submit_button")."""
    segs = [x for x in re.split(r"[.\[\]]", key.lower()) if x and x not in ("tu", "usted")]
    last = segs[-1] if segs else ""
    has = lambda names: any(x in names for x in segs)
    if has({"acciones", "actions", "action", "cta", "botones", "buttons", "button", "boton", "btn"}) or re.search(r"(^|_)(cta|boton|button|btn)$", last):
        return "boton"
    if has({"toasts", "toast", "snackbar"}):
        return "toast"
    if has({"errores", "errors", "error", "validacion", "validation"}):
        return "error"
    if re.search(r"(^|_)(titulo|title|heading)$", last):
        return "titulo"
    return "texto"


def check(text: str, kind: str, where: str, voice: dict, register: str | None) -> list[Finding]:
    out: list[Finding] = []
    raw = text.strip()
    t = strip_icu(raw)
    if len(re.findall(r"[A-Za-zÁÉÍÓÚáéíóúÑñ]", t)) < 2:
        return out
    f = lambda sev, rule, hint: out.append(Finding(where, sev, rule, raw, hint))
    limits = {**DEFAULT_LIMITS, **(voice.get("limites") or {})}
    folded = fold(t)
    words = t.split()

    if kind == "boton":
        if folded.rstrip(".!") in GENERIC_BUTTONS:
            f("error", "boton-generico", "El botón debe decir el resultado: verbo + objeto (\"Guardar cambios\", \"Enviar a Ana\").")
        content_words = [w for w in words if fold(w) not in SMALL]  # "Guardar y crear otra" cuenta 3
        if len(content_words) > limits["boton_palabras"] or len(t) > limits["boton_caracteres"]:
            f("aviso", "boton-largo", f"Botón de {len(content_words)} palabras / {len(t)} caracteres; máximo {limits['boton_palabras']} / {limits['boton_caracteres']}.")
        if t.endswith("."):
            f("aviso", "punto-final", "Los botones no llevan punto final.")
    if kind == "toast" and len(t) > limits["toast_caracteres"]:
        f("aviso", "toast-largo", f"Toast de {len(t)} caracteres; máximo {limits['toast_caracteres']}. Deja solo qué quedó hecho.")
    if kind == "titulo" and len(t) > limits["titulo_caracteres"]:
        f("aviso", "titulo-largo", f"Título de {len(t)} caracteres; máximo {limits['titulo_caracteres']}.")

    if VAGUE_CONFIRM.search(t):
        f("error", "confirmacion-vaga", "Pregunta por la consecuencia: \"¿Eliminar Grupo Norte para siempre?\". Si es reversible, no confirmes: ofrece Deshacer.")
    if CLICK_HERE.search(t):
        f("error", "click-aqui", "El enlace debe describir su destino (\"Descarga la factura\"); \"aquí\" no se entiende fuera de contexto.")
    if TECH.search(t):
        f("error", "codigo-tecnico", "Nada de códigos o términos técnicos: di qué pasó en lenguaje humano y qué hacer.")
    is_error = kind == "error" or bool(ERROR_HINT.search(t))
    if is_error and len(words) > 2 and not WAY_OUT.search(t):
        f("aviso", "error-sin-salida", "Todo error termina con qué hacer ahora (reintentar, revisar, a quién pedirlo) o con la tranquilidad de que no se perdió nada.")
    if BLAME.search(t):
        f("aviso", "culpa-al-usuario", "Evita \"inválido/incorrecto\": di qué se espera, con ejemplo (\"El RFC tiene 12 o 13 caracteres\").")
    if CUTESY.search(t):
        f("error" if is_error else "aviso", "tono-en-error", "Nada de \"Oops/Ups\": el error no es gracioso para quien lo sufre.")
    if REDUNDANT.search(t):
        f("aviso", "redundante", "\"Exitosamente\" sobra: \"Guardado\" o \"Se envió a Ana\" dicen lo mismo.")

    excl = voice.get("exclamaciones", "solo_exito")
    if "!!" in t or (is_error and "!" in t) or (excl == "nunca" and "!" in t):
        f("aviso", "exclamacion", "Sin exclamaciones en errores (ni dobles en ningún lado).")
    if voice.get("emojis") is False and EMOJI.search(t):
        f("aviso", "emoji", "La voz de la marca no usa emojis.")
    caps = [w for w in re.findall(r"\b[A-ZÁÉÍÓÚÑ]{3,}\b", t)]
    if len(caps) >= 2 and len(caps) >= len(words) * 0.6:
        f("aviso", "mayusculas", "No escribas en mayúsculas sostenidas: se lee como grito y cuesta más leer.")
    if kind in ("boton", "titulo") and len(words) >= 2:
        content = [w for w in words[1:] if fold(w) not in SMALL and re.match(r"[A-Za-zÁÉÍÓÚÑáéíóúñ]", w)]
        if content and all(w[0].isupper() for w in content) and not all(w.isupper() for w in content):
            f("aviso", "mayuscula-de-titulo", "En español, mayúscula solo al inicio: \"Nueva cotización\", no \"Nueva Cotización\" (salvo nombres propios).")

    if register == "tu" and USTED.search(t):
        f("aviso", "registro", f"Usa usted (\"{USTED.search(t).group(0)}\") en un producto de tú.")
    if register == "usted" and TU.search(t):
        f("aviso", "registro", f"Usa tú (\"{TU.search(t).group(0)}\") en un producto de usted.")

    for bad in voice.get("nunca", []) or []:
        if fold(bad) and fold(bad) in folded:
            f("error", "prohibida", f"La voz de la marca prohíbe \"{bad}\".")
    for avoid, use in (voice.get("glosario") or {}).items():
        if re.search(rf"\b{re.escape(fold(avoid))}s?\b", folded):
            f("aviso", "glosario", f"Usa \"{use}\" en lugar de \"{avoid}\": un solo nombre para lo mismo.")
    return out


# ---------------- Extracción ----------------
def walk_json(node, path=""):
    if isinstance(node, dict):
        if set(node) >= {"tu"} or set(node) >= {"usted"}:
            for variant in ("tu", "usted"):
                if isinstance(node.get(variant), str):
                    yield f"{path}.{variant}", node[variant], variant
            return
        for k, v in node.items():
            if k.startswith("_") or k in ("uso", "nota", "description"):
                continue
            yield from walk_json(v, f"{path}.{k}" if path else k)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from walk_json(v, f"{path}[{i}]")
    elif isinstance(node, str):
        yield path, node, None


def line_of(src: str, idx: int) -> int:
    return src.count("\n", 0, idx) + 1


def extract_source(src: str, ext: str):
    """Devuelve (línea, texto, tipo). Heurístico: botones, nodos de texto, atributos visibles, toasts y diálogos."""
    items = []
    # Los comentarios no son texto de interfaz; se reemplazan por espacios para conservar los números de línea.
    blank = lambda m: re.sub(r"[^\n]", " ", m.group(0))
    src_nc = re.sub(r"/\*.*?\*/|<!--.*?-->", blank, src, flags=re.S)
    if ext != ".html" and ext != ".htm":
        src_nc = re.sub(r"(?<![:\"'`\\])//[^\n]*", blank, src_nc)
    code = src_nc
    if ext in (".html", ".htm", ".vue", ".svelte"):
        # Los nodos de texto no se buscan dentro de <script>/<style>, pero sí sus llamadas a toast/confirm.
        markup = re.sub(r"<(script|style)\b.*?</\1>", lambda m: "\n" * m.group(0).count("\n"), src_nc, flags=re.S | re.I)
    elif ext in (".tsx", ".jsx"):
        markup = src_nc
    else:
        markup = ""  # .ts/.js sin JSX: solo toasts, diálogos y concatenaciones
    TAG = r"(?:[^>{}]|\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})*"  # atributos, incluso con {() => …} anidados
    for m in re.finditer(r"<(button|Button)\b" + TAG + r">(.*?)</\1>", markup, re.S):
        inner = re.sub(r"<(kbd|Kbd)\b.*?</\1>", " ", m.group(2), flags=re.S)
        inner = re.sub(r"<[^>]+>|\{[^{}]*\}", " ", inner)
        inner = re.sub(r"\s+", " ", inner).strip()
        if inner:
            items.append((line_of(src, m.start()), inner, "boton"))
    for m in re.finditer(r"<(h[1-3])\b" + TAG + r">(.*?)</\1>", markup, re.S | re.I):
        inner = re.sub(r"\s+", " ", re.sub(r"<[^>]+>|\{[^{}]*\}", " ", m.group(2))).strip()
        if inner:
            items.append((line_of(src, m.start()), inner, "titulo"))
    button_spans = [(m.start(), m.end()) for m in re.finditer(r"<(button|Button|h[1-3])\b.*?</\1>", markup, re.S)]
    for m in re.finditer(r">([^<>{}]*[A-Za-zÁÉÍÓÚáéíóúÑñ][^<>{}]*)<", markup):
        if any(a <= m.start() < b for a, b in button_spans):
            continue
        txt = re.sub(r"\s+", " ", m.group(1)).strip()
        if txt and not re.search(r"[=;(){}|&]|=>", txt):
            items.append((line_of(src, m.start()), txt, "texto"))
    for m in re.finditer(r"\b(placeholder|title|aria-label|alt|label)=\"([^\"{}$]+)\"", markup):
        items.append((line_of(src, m.start()), m.group(2), "texto"))
    for m in re.finditer(r"\btoast(?:\.\w+)?\(\s*([\"'`])((?:(?!\1).)+)\1", code):
        if "${" not in m.group(2):
            items.append((line_of(src, m.start()), m.group(2), "toast"))
    for m in re.finditer(r"(?<![\w.])(?:window\.)?(confirm|alert)\(\s*([\"'`])((?:(?!\2).)+)\2", code):
        items.append((line_of(src, m.start()), m.group(3), "dialogo"))
    for m in re.finditer(r"([\"'])[A-Za-zÁÉÍÓÚáéíóúÑñ][^\"'\n]*\s\1\s*\+\s*[A-Za-z_]", code):
        items.append((line_of(src, m.start()), m.group(0), "concat"))
    return items


def lint_file(path: Path, voice: dict, variant: str | None) -> list[Finding]:
    findings: list[Finding] = []
    register_default = voice.get("tratamiento")
    if path.suffix == ".json":
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            return [Finding(str(path), "error", "json", "", f"No es JSON válido: {e}")]
        for key, text, var in walk_json(data):
            if variant and var and var != variant:
                continue
            findings += check(text, kind_from_key(key), f"{path}:{key}", voice, var or register_default)
        return findings
    src = path.read_text(encoding="utf-8", errors="ignore")
    seen_tu = seen_usted = None
    for line, text, kind in extract_source(src, path.suffix):
        where = f"{path}:{line}"
        if kind == "dialogo":
            findings.append(Finding(where, "aviso", "dialogo-nativo", text,
                                    "confirm()/alert() interrumpe y no se puede diseñar: aplica y ofrece Deshacer, o usa un diálogo con la consecuencia concreta."))
            findings += check(text, "texto", where, voice, register_default)
            continue
        if kind == "concat":
            findings.append(Finding(where, "aviso", "concatenacion", text,
                                    "No concatenes frases: no se pueden traducir ni pluralizar. Usa un mensaje ICU completo con variables."))
            continue
        findings += check(text, kind, where, voice, register_default)
        plain = strip_icu(text)
        if TU.search(plain) and not seen_tu:
            seen_tu = (where, TU.search(plain).group(0))
        if USTED.search(plain) and not seen_usted:
            seen_usted = (where, USTED.search(plain).group(0))
    if not register_default and seen_tu and seen_usted:
        findings.append(Finding(str(path), "aviso", "registro-mixto", "",
                                f"Mezcla tú (\"{seen_tu[1]}\", {seen_tu[0]}) y usted (\"{seen_usted[1]}\", {seen_usted[0]}). Elige uno para todo el producto."))
    return findings


def iter_files(targets: list[str]):
    for t in targets:
        p = Path(t)
        if p.is_dir():
            for f in sorted(p.rglob("*")):
                if f.is_file() and (f.suffix in SOURCE_EXT or f.suffix == ".json") and not any(d in SKIP_DIRS for d in f.parts):
                    if f.suffix == ".json" and f.name in ("package.json", "package-lock.json", "tsconfig.json", "components.json"):
                        continue
                    yield f
        elif p.is_file():
            yield p
        else:
            print(f"✗ No existe: {t}", file=sys.stderr)


def main(argv: list[str]) -> int:
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 1
    voice: dict = {}
    variant = None
    strict = as_json = False
    targets: list[str] = []
    it = iter(argv)
    for a in it:
        if a == "--voice":
            voice = {k: v for k, v in json.loads(Path(next(it)).read_text(encoding="utf-8")).items() if not k.startswith("_")}
        elif a == "--variant":
            variant = next(it)
        elif a == "--strict":
            strict = True
        elif a == "--json":
            as_json = True
        else:
            targets.append(a)
    findings = [f for p in iter_files(targets) for f in lint_file(p, voice, variant)]
    errors = sum(f.severity == "error" for f in findings)
    warns = len(findings) - errors
    if as_json:
        print(json.dumps([asdict(f) for f in findings], ensure_ascii=False, indent=2))
    else:
        for f in findings:
            label = "ERROR" if f.severity == "error" else "aviso"
            shown = f' "{f.text[:70]}{"…" if len(f.text) > 70 else ""}"' if f.text else ""
            print(f"{f.where}  [{label}] {f.rule}{shown}\n    → {f.hint}")
        print(f"\n{errors} error{'es' if errors != 1 else ''}, {warns} aviso{'s' if warns != 1 else ''}.")
    return 1 if errors or (strict and warns) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
