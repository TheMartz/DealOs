#!/usr/bin/env python3
"""Analiza eventos de ux-tracker (producción) y los compara contra el diseño medido con flow_meter.js.

Uso:
  python ux_metrics.py eventos.jsonl --design ux/baseline/          # reportes de flow_meter como diseño
  python ux_metrics.py export.csv --design design.json --since 2026-08-01 --device touch
  python ux_metrics.py eventos.json --json                           # salida para otra herramienta
  python ux_metrics.py --demo demo.jsonl [--design-out design.json]  # datos de ejemplo realistas

Entradas: JSONL, arreglo JSON o CSV con los campos de ux-tracker (event, task, ts, duration_ms, clicks,
keys, fields, modals, navigations, errors, undos, shortcuts, ci, device, version, last_step, reason).
Acepta exportaciones con los campos dentro de "properties" (PostHog, Segment).

Diseño (--design): un design.json {tarea: {ci, overhead, frequency}} o reportes report.json de
flow_meter (archivo o carpeta; la tarea es el nombre del archivo). Del reporte se usa el "CI
comparable": lo que se puede observar en campo (sin decisiones ni scrolls).

Mismas definiciones que assets/metrics/dashboard.html:
  iniciadas = completadas + abandonadas · éxito = completadas / iniciadas
  CI real = mediana del CI de las completadas · overhead real = mediana de (CI − 2·campos)
"""
from __future__ import annotations

import csv
import json
import math
import random
import statistics
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

BUDGET = {"diaria": 5, "semanal": 8, "mensual": 12}
NUM = ("duration_ms", "clicks", "keys", "fields", "modals", "navigations", "errors", "undos", "shortcuts", "ci")
MIN_SAMPLE = 30


# ---------------- Carga ----------------
def normalize(e: dict) -> dict | None:
    if isinstance(e.get("properties"), dict):
        e = {**e["properties"], **{k: v for k, v in e.items() if k != "properties"}}
    name = e.get("event") or e.get("name")
    if name not in ("ux_task_completed", "ux_task_abandoned") or not e.get("task"):
        return None
    out = {"event": name, "task": str(e["task"]), "device": e.get("device") or "mouse", "version": e.get("version") or "",
           "last_step": e.get("last_step") or None, "reason": e.get("reason") or None}
    ts = e.get("ts") or e.get("timestamp")
    try:
        out["ts"] = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    for k in NUM:
        try:
            out[k] = float(e.get(k) or 0)
        except (TypeError, ValueError):
            out[k] = 0.0
    return out


def load_events(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    rows: list[dict] = []
    if path.suffix == ".csv":
        rows = list(csv.DictReader(text.splitlines()))
    elif text.lstrip().startswith("["):
        rows = json.loads(text)
    else:
        rows = [json.loads(l) for l in text.splitlines() if l.strip()]
    return [n for n in (normalize(r) for r in rows) if n]


def load_design(target: str | None) -> dict:
    if not target:
        return {}
    p = Path(target)
    files = sorted(p.glob("*.json")) if p.is_dir() else [p]
    design = {}
    for f in files:
        data = json.loads(f.read_text(encoding="utf-8"))
        if "totals" in data and "steps" in data:  # report.json de flow_meter
            t = data["totals"]
            comparable = t["click"] + t["key"] + 2 * t["field"] + 2 * t["modal"] + 3 * t["navigation"]
            key = Path(data["file"]).stem if data.get("file") else (f.stem if f.stem != "report" else f.parent.name)
            design[key] = {
                "ci": comparable, "overhead": comparable - 2 * t.get("essentialFields", 0), "frequency": data.get("frequency")}
        else:
            design.update({k: v for k, v in data.items() if not k.startswith("_")})
    return design


# ---------------- Cálculo ----------------
def n0(v: float) -> str:
    """Redondeo .5 hacia arriba (igual que Math.round del tablero; Python redondea al par)."""
    return str(math.floor(v + 0.5))


def p0(v: float) -> str:
    return f"{math.floor(v * 100 + 0.5)}%"

def pct(values: list[float], q: float) -> float | None:
    if not values:
        return None
    v = sorted(values)
    i = (len(v) - 1) * q
    lo, hi = math.floor(i), math.ceil(i)
    return v[lo] + (v[hi] - v[lo]) * (i - lo)


def week_of(d: datetime) -> str:
    monday = (d - timedelta(days=d.weekday())).date()
    return monday.isoformat()


def task_stats(evs: list[dict], d: dict) -> dict:
    done = [e for e in evs if e["event"] == "ux_task_completed"]
    lost = [e for e in evs if e["event"] == "ux_task_abandoned"]
    freq = d.get("frequency")
    steps = Counter(e["last_step"] or "sin paso marcado" for e in lost)
    by_dev = {dev: [e["ci"] for e in done if e["device"] == dev] for dev in ("mouse", "touch")}
    return {
        "started": len(evs), "completed": len(done),
        "success": len(done) / len(evs) if evs else None,
        "time_p50": pct([e["duration_ms"] / 1000 for e in done], .5), "time_p90": pct([e["duration_ms"] / 1000 for e in done], .9),
        "ci_p50": pct([e["ci"] for e in done], .5), "ci_p90": pct([e["ci"] for e in done], .9),
        "overhead_p50": pct([e["ci"] - 2 * e["fields"] for e in done], .5),
        "ci_design": d.get("ci"), "overhead_design": d.get("overhead"), "frequency": freq, "budget": BUDGET.get(freq) if freq else d.get("budget"),
        "top_abandon": steps.most_common(1)[0] if steps else None, "abandon_steps": steps.most_common(),
        "undo_rate": sum(e["undos"] > 0 for e in done) / len(done) if done else None,
        "shortcut_rate": sum(e["shortcuts"] > 0 for e in done) / len(done) if done else None,
        "error_rate": sum(e["errors"] > 0 for e in evs) / len(evs) if evs else None,
        "ci_mouse": pct(by_dev["mouse"], .5), "ci_touch": pct(by_dev["touch"], .5), "n_touch": len(by_dev["touch"]),
        "distribution": sorted(Counter(round(e["ci"]) for e in done).items()),
    }


def summarize(events: list[dict], design: dict) -> dict:
    by_task: dict[str, list[dict]] = defaultdict(list)
    for e in events:
        by_task[e["task"]].append(e)
    tasks = []
    for task, evs in sorted(by_task.items(), key=lambda kv: -len(kv[1])):
        d = design.get(task, {})
        t = {"task": task, **task_stats(evs, d)}
        weeks: dict[str, dict] = {}
        for w in sorted({week_of(e["ts"]) for e in evs}):
            we = [e for e in evs if week_of(e["ts"]) == w]
            wd = [e for e in we if e["event"] == "ux_task_completed"]
            weeks[w] = {"n": len(we), "ci": pct([e["ci"] for e in wd], .5), "success": len(wd) / len(we) if we else None,
                        "time": pct([e["duration_ms"] / 1000 for e in wd], .5), "versions": sorted({e["version"] for e in we if e["version"]})}
        t["weeks"] = weeks
        t["by_version"] = by_version(evs)
        # "Estado actual" = la última versión si tiene muestra suficiente; si no, todo el periodo.
        latest = t["by_version"][-1] if t["by_version"] else None
        if latest and len(t["by_version"]) > 1 and latest["n"] >= MIN_SAMPLE:
            t["current_version"] = latest["version"]
            t["current"] = task_stats([e for e in evs if e["version"] == latest["version"]], d)
        else:
            t["current_version"] = None
            t["current"] = task_stats(evs, d)
        tasks.append(t)
    for t in tasks:
        t["insights"] = insights(t)
    span = (min(e["ts"] for e in events), max(e["ts"] for e in events)) if events else (None, None)
    return {"from": span[0].date().isoformat() if span[0] else None, "to": span[1].date().isoformat() if span[1] else None, "events": len(events), "tasks": tasks}


def by_version(evs: list[dict]) -> list[dict]:
    """Versiones en orden de aparición, con mediana de CI y éxito: el antes/después de cada release."""
    order: list[str] = []
    for e in sorted(evs, key=lambda e: e["ts"]):
        if e["version"] and e["version"] not in order:
            order.append(e["version"])
    out = []
    for v in order:
        ve = [e for e in evs if e["version"] == v]
        done = [e for e in ve if e["event"] == "ux_task_completed"]
        out.append({"version": v, "n": len(ve), "ci": pct([e["ci"] for e in done], .5), "success": len(done) / len(ve) if ve else None})
    return out


def insights(t: dict) -> list[tuple[str, str]]:
    """(gravedad, texto). Gravedad: 'critico' | 'atencion' | 'bien' | 'info'. Mismas reglas que el tablero.
    El estado actual se juzga sobre la versión vigente (t["current"]); mezclar versiones distorsiona."""
    out: list[tuple[str, str]] = []
    if t["started"] < MIN_SAMPLE:
        return [("info", f"Solo {t['started']} tareas en el periodo: espera al menos {MIN_SAMPLE} antes de sacar conclusiones.")]
    c = t["current"]
    where = f" en la versión {t['current_version']}" if t.get("current_version") else ""
    if c["ci_design"] and c["ci_p50"] is not None:
        gap = c["ci_p50"] / c["ci_design"] - 1
        if gap > 0.25 and c["ci_p50"] - c["ci_design"] >= 1:
            out.append(("critico", f"El CI real{where} ({n0(c['ci_p50'])}) está {p0(gap)} arriba del diseñado ({n0(c['ci_design'])}): la gente no toma la ruta corta. "
                                   "Corre la persona novata en esta tarea para ver dónde se desvía."))
        elif gap <= 0.15:
            out.append(("bien", f"El CI real{where} ({n0(c['ci_p50'])}) está cerca del diseñado ({n0(c['ci_design'])}): la ruta corta se encuentra."))
    if c["budget"] and c["overhead_p50"] is not None and c["overhead_p50"] > c["budget"]:
        out.append(("atencion", f"El overhead real{where} ({c['overhead_p50']:.1f}) excede el presupuesto de uso {c['frequency'] or ''} ({c['budget']})."))
    if c["success"] is not None and c["success"] < 0.9 and c["top_abandon"]:
        step, n = c["top_abandon"]
        lost = c["started"] - c["completed"]
        out.append(("critico" if c["success"] < 0.8 else "atencion",
                    f"1 de cada {round(1 / (1 - c['success']))} no termina{where} ({p0(c['success'])} de éxito); {p0(n / lost)} de los abandonos ocurre en «{step}»."))
    if c["undo_rate"] and c["undo_rate"] > 0.1:
        out.append(("atencion", f"{p0(c['undo_rate'])} de las tareas usa Deshacer: algún default o etiqueta lleva al error."))
    if c["frequency"] == "diaria" and c["shortcut_rate"] is not None and c["shortcut_rate"] < 0.05:
        out.append(("info", f"Solo {p0(c['shortcut_rate'])} usa atajos en una tarea diaria: hazlos visibles en botones y tooltips."))
    if c["ci_touch"] and c["ci_mouse"] and c["n_touch"] >= 15 and c["ci_touch"] > c["ci_mouse"] * 1.3:
        out.append(("atencion", f"En táctil cuesta {p0(c['ci_touch'] / c['ci_mouse'] - 1)} más ({n0(c['ci_touch'])} vs {n0(c['ci_mouse'])}): "
                                "revisa acciones que dependen de hover y targets pequeños."))
    vs = t.get("by_version") or []
    if len(vs) >= 2 and vs[-1]["n"] >= 15 and vs[-2]["n"] >= 15 and vs[-2]["ci"]:
        prev, last = vs[-2], vs[-1]
        change = last["ci"] / prev["ci"] - 1
        if abs(change) >= 0.1 and abs(last["ci"] - prev["ci"]) >= 1:
            out.append(("bien" if change < 0 else "critico",
                        f"Desde la versión {last['version']} el CI {'bajó' if change < 0 else 'subió'} {p0(abs(change))} ({n0(prev['ci'])} → {n0(last['ci'])})"
                        + (f" y el éxito pasó de {p0(prev['success'])} a {p0(last['success'])}." if prev["success"] is not None else ".")))
        return out
    ws = [w for w in t["weeks"].values() if w["ci"] is not None]
    if len(ws) >= 4:
        before = statistics.median([w["ci"] for w in ws[-4:-2]])
        after = statistics.median([w["ci"] for w in ws[-2:]])
        if before and abs(after / before - 1) >= 0.1 and abs(after - before) >= 1:
            out.append(("bien" if after < before else "critico",
                        f"El CI {'bajó' if after < before else 'subió'} {p0(abs(after / before - 1))} en las últimas 2 semanas ({n0(before)} → {n0(after)})."))
    return out


# ---------------- Salida ----------------
def fmt(v, kind="n"):
    if v is None:
        return "—"
    return {"pct": p0(v), "s": f"{n0(v)} s", "n": n0(v), "n1": f"{v:.1f}"}[kind]


def render(s: dict) -> str:
    icon = {"critico": "🔴", "atencion": "🟡", "bien": "🟢", "info": "ℹ️"}
    L = [f"# Métricas de interacción · {s['from']} → {s['to']}", "", f"{s['events']} eventos. La tabla y los hallazgos muestran el estado actual (versión vigente con al menos {MIN_SAMPLE} tareas); la tendencia, todo el periodo.", "",
         "| Tarea | Iniciadas | Éxito | Tiempo p50 / p90 | CI real p50 | CI diseñado | Overhead real / presupuesto | Abandono principal | Deshacer | Atajos |",
         "|---|---|---|---|---|---|---|---|---|---|"]
    for t in s["tasks"]:
        c = t["current"]  # estado actual: versión vigente si tiene muestra suficiente (igual que el tablero)
        over = fmt(c["overhead_p50"], "n1") + (f" / {c['budget']}" + (" ⚠️" if c["overhead_p50"] and c["overhead_p50"] > c["budget"] else "") if c["budget"] else "")
        lost = max(1, c["started"] - c["completed"])
        ab = f"{c['top_abandon'][0]} ({p0(c['top_abandon'][1] / lost)})" if c["top_abandon"] else "—"
        name = t["task"] + (f" · {t['current_version']}" if t.get("current_version") else "")
        L.append(f"| {name} | {c['started']} | {fmt(c['success'], 'pct')} | {fmt(c['time_p50'], 's')} / {fmt(c['time_p90'], 's')} | "
                 f"{fmt(c['ci_p50'])} | {fmt(c['ci_design'])} | {over} | {ab} | {fmt(c['undo_rate'], 'pct')} | {fmt(c['shortcut_rate'], 'pct')} |")
    L += ["", "## Hallazgos", ""]
    for t in s["tasks"]:
        for sev, text in t["insights"]:
            L.append(f"- {icon[sev]} **{t['task']}**: {text}")
    weeks = sorted({w for t in s["tasks"] for w in t["weeks"]})
    if weeks:
        L += ["", "## CI real por semana (mediana)", "", "| Semana | " + " | ".join(t["task"] for t in s["tasks"]) + " |",
              "|---|" + "---|" * len(s["tasks"])]
        for w in weeks:
            L.append(f"| {w} | " + " | ".join(fmt(t["weeks"].get(w, {}).get("ci")) for t in s["tasks"]) + " |")
    L += ["", "_CI real = clicks + teclas + 2·campos + 2·modales + 3·pantallas (sin decisiones ni scrolls, que no se observan en campo). "
               "CI diseñado = el mismo cálculo sobre el flujo óptimo de flow_meter._"]
    return "\n".join(L) + "\n"


# ---------------- Datos de ejemplo ----------------
def demo(seed: int = 7) -> tuple[list[dict], dict]:
    """8 semanas, 3 tareas. Historia: la versión 2.4.0 (semana 5) movió el estado a la fila y bajó el CI de registrar;
    buscar-cliente se diseñó para ⌘K pero la gente filtra con scroll; en táctil todo cuesta más."""
    rnd = random.Random(seed)
    start = datetime(2026, 7, 27, tzinfo=timezone.utc)
    design = {"registrar-cotizacion": {"ci": 9, "overhead": 5, "frequency": "diaria"},
              "marcar-ganada": {"ci": 2, "overhead": 2, "frequency": "diaria"},
              "buscar-cliente": {"ci": 4, "overhead": 2, "frequency": "semanal"}}
    spec = {
        "registrar-cotizacion": {"per_week": 92, "fields": 2, "steps": ["cliente", "monto", "estado"]},
        "marcar-ganada": {"per_week": 58, "fields": 0, "steps": ["buscar", "estado"]},
        "buscar-cliente": {"per_week": 38, "fields": 1, "steps": ["buscar", "resultados"]},
    }
    events = []
    for week in range(8):
        new = week >= 4
        version = "2.4.0" if new else "2.3.2"
        for task, sp in spec.items():
            for _ in range(int(sp["per_week"] * rnd.uniform(0.85, 1.15))):
                touch = rnd.random() < 0.3
                ts = start + timedelta(days=week * 7 + rnd.randint(0, 4), hours=rnd.randint(8, 18), minutes=rnd.randint(0, 59))
                if task == "registrar-cotizacion":
                    clicks = rnd.choice([3, 3, 4, 4, 5]) if new else rnd.choice([4, 5, 5, 6, 7])
                    navs = 0 if new else rnd.choice([1, 1, 2])
                    keys, modals = rnd.choice([1, 2, 2, 3]), (0 if new else rnd.choice([0, 1]))
                    success = 0.935 if new else 0.87
                    dur = rnd.lognormvariate(math.log(26 if new else 38), 0.35)
                    shortcut_p, undo_p = (0.13 if new else 0.04), 0.07
                    lost_steps = ["cliente", "cliente", "monto", "estado"] if new else ["cliente", "monto", "estado", "estado", "estado"]
                elif task == "marcar-ganada":
                    clicks, navs, keys, modals = rnd.choice([2, 3, 3, 3, 4]), rnd.choice([0, 0, 0, 1]), rnd.choice([0, 0, 1]), 0
                    success, dur, shortcut_p, undo_p = 0.97, rnd.lognormvariate(math.log(9), 0.4), 0.08, 0.06
                    lost_steps = ["buscar", "buscar", "estado"]
                else:
                    uses_palette = rnd.random() < 0.18
                    clicks = rnd.choice([1, 2]) if uses_palette else rnd.choice([3, 4, 5, 6])
                    navs, keys, modals = 0, (2 if uses_palette else rnd.choice([0, 1])), (1 if uses_palette else 0)
                    success, dur, shortcut_p, undo_p = 0.9, rnd.lognormvariate(math.log(14), 0.5), (1 if uses_palette else 0), 0.01
                    lost_steps = ["resultados", "resultados", "buscar"]
                if touch:
                    clicks += rnd.choice([1, 2, 2, 3])
                    dur *= 1.25
                fields = sp["fields"]
                completed = rnd.random() < (success - (0.04 if touch else 0))
                shortcuts = 1 if (not touch and rnd.random() < shortcut_p) else 0
                undos = 1 if rnd.random() < undo_p else 0
                errors = 1 if rnd.random() < 0.04 else 0
                if not completed:
                    clicks = max(1, clicks - rnd.randint(0, 2))
                ci = clicks + keys + 2 * fields + 2 * modals + 3 * navs
                e = {"event": "ux_task_completed" if completed else "ux_task_abandoned", "task": task,
                     "ts": ts.isoformat().replace("+00:00", "Z"), "duration_ms": round(dur * 1000), "clicks": clicks, "keys": keys,
                     "fields": fields, "modals": modals, "navigations": navs, "errors": errors, "undos": undos if completed else 0,
                     "shortcuts": shortcuts, "ci": ci, "device": "touch" if touch else "mouse",
                     "viewport": "390x844" if touch else "1440x900", "version": version,
                     "last_step": None if completed else rnd.choice(lost_steps)}
                if not completed:
                    e["reason"] = rnd.choice(["timeout", "pagehide", "cancel"])
                events.append(e)
    events.sort(key=lambda e: e["ts"])
    return events, design


def main(argv: list[str]) -> int:
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 1
    opts, pos, it = {}, [], iter(argv)
    for a in it:
        if a in ("--design", "--since", "--until", "--device", "--demo", "--design-out"):
            opts[a[2:]] = next(it)
        elif a == "--json":
            opts["json"] = True
        else:
            pos.append(a)
    if "demo" in opts:
        events, design = demo()
        Path(opts["demo"]).write_text("\n".join(json.dumps(e, ensure_ascii=False) for e in events) + "\n", encoding="utf-8")
        if "design-out" in opts:
            Path(opts["design-out"]).write_text(json.dumps(design, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"✓ {len(events)} eventos de ejemplo en {opts['demo']}" + (f" y diseño en {opts['design-out']}" if "design-out" in opts else ""))
        return 0
    events = [e for p in pos for e in load_events(Path(p))]
    if "since" in opts:
        events = [e for e in events if e["ts"].date().isoformat() >= opts["since"]]
    if "until" in opts:
        events = [e for e in events if e["ts"].date().isoformat() <= opts["until"]]
    if "device" in opts:
        events = [e for e in events if e["device"] == opts["device"]]
    if not events:
        print("✗ No hay eventos ux_task_completed / ux_task_abandoned en la entrada (o en el filtro).", file=sys.stderr)
        return 1
    s = summarize(events, load_design(opts.get("design")))
    if opts.get("json"):
        print(json.dumps(s, ensure_ascii=False, indent=2, default=str))
    else:
        print(render(s))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
