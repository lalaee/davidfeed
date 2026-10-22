#!/usr/bin/env python3
"""Scan cloned repos for buildable Xcode targets, without invoking xcodebuild."""
import json, os, re, sys, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPOS = os.path.join(ROOT, "repos")

KIND = {}
with open(os.path.join(ROOT, "repos.tsv")) as f:
    for line in f:
        k, slug = line.rstrip("\n").split("\t")
        KIND[slug.split("/")[-1]] = (k, slug)

SKIP_DIR = {".git", ".build", "DerivedData", "Pods", "Carthage", "build", "node_modules"}

def walk(base):
    for dirpath, dirnames, filenames in os.walk(base):
        dirnames[:] = [d for d in dirnames
                       if d not in SKIP_DIR and not d.endswith(".xcodeproj")
                       and not d.endswith(".xcworkspace") and not d.endswith(".xcassets")]
        yield dirpath, dirnames, filenames

def find_containers(repo_dir):
    """Return (kind, path) for each .xcworkspace / .xcodeproj, preferring a workspace
    over the .xcodeproj sitting beside it."""
    ws, pj = [], []
    for dirpath, dirnames, _ in os.walk(repo_dir):
        base = os.path.basename(dirpath)
        if base in SKIP_DIR:
            dirnames[:] = []
            continue
        for d in list(dirnames):
            p = os.path.join(dirpath, d)
            if d.endswith(".xcworkspace"):
                if not dirpath.endswith(".xcodeproj"):
                    ws.append(p)
                dirnames.remove(d)
            elif d.endswith(".xcodeproj"):
                pj.append(p)
                dirnames.remove(d)
            elif d in SKIP_DIR:
                dirnames.remove(d)
    ws_parents = {os.path.dirname(w) for w in ws}
    out = [("workspace", w) for w in ws]
    out += [("project", p) for p in pj if os.path.dirname(p) not in ws_parents]
    return out

def pbx_for(kind, path):
    if kind == "project":
        return os.path.join(path, "project.pbxproj")
    # workspace: take the first project it references that lives beside it
    d = os.path.dirname(path)
    for entry in sorted(os.listdir(d)):
        if entry.endswith(".xcodeproj"):
            return os.path.join(d, entry, "project.pbxproj")
    return None

APP_RE = re.compile(r'productType = "com\.apple\.product-type\.application"')
SDK_RE = re.compile(r'SDKROOT = ([\w."$()/]+)')
DEP_RE = re.compile(r'IPHONEOS_DEPLOYMENT_TARGET = ([\d.]+)')
NAME_RE = re.compile(r'productName = ("?)([^";]+)\1;')

def inspect(pbx):
    info = {"is_app": False, "sdks": [], "min_ios": None, "product_names": []}
    if not pbx or not os.path.exists(pbx):
        return info
    try:
        with open(pbx, "r", errors="replace") as f:
            src = f.read()
    except OSError:
        return info
    info["is_app"] = bool(APP_RE.search(src))
    info["sdks"] = sorted(set(SDK_RE.findall(src)))
    deps = sorted(set(DEP_RE.findall(src)), key=lambda v: [int(x) for x in v.split(".")])
    info["min_ios"] = deps[0] if deps else None
    info["product_names"] = sorted(set(n for _, n in NAME_RE.findall(src)))
    return info

def shared_schemes(kind, path):
    """Schemes checked into the repo. Falls back to [] (xcodebuild will autocreate)."""
    roots = []
    if kind == "project":
        roots.append(os.path.join(path, "xcshareddata", "xcschemes"))
    else:
        roots.append(os.path.join(path, "xcshareddata", "xcschemes"))
        d = os.path.dirname(path)
        for entry in os.listdir(d):
            if entry.endswith(".xcodeproj"):
                roots.append(os.path.join(d, entry, "xcshareddata", "xcschemes"))
    names = []
    for r in roots:
        if os.path.isdir(r):
            for f in sorted(os.listdir(r)):
                if f.endswith(".xcscheme"):
                    names.append(f[:-len(".xcscheme")])
    return sorted(set(names))

entries = []
for repo in sorted(os.listdir(REPOS)):
    rd = os.path.join(REPOS, repo)
    if not os.path.isdir(rd):
        continue
    kind, slug = KIND.get(repo, ("?", repo))
    for ckind, cpath in sorted(find_containers(rd), key=lambda t: t[1]):
        info = inspect(pbx_for(ckind, cpath))
        rel = os.path.relpath(cpath, REPOS)
        base = os.path.basename(cpath).rsplit(".", 1)[0]
        schemes = shared_schemes(ckind, cpath)
        # candidate scheme: a shared scheme matching the container name, else container name
        cand = base if (base in schemes or not schemes) else schemes[0]
        ios_ok = any("iphone" in s.lower() for s in info["sdks"]) or not info["sdks"]
        entries.append({
            "id": repo + "/" + base if base != repo else repo,
            "repo": repo,
            "slug": slug,
            "repo_kind": kind,
            "container_kind": ckind,
            "path": rel,
            "scheme": cand,
            "shared_schemes": schemes,
            "is_app": info["is_app"],
            "sdks": info["sdks"],
            "min_ios": info["min_ios"],
            "ios": bool(ios_ok),
        })

# de-duplicate ids
seen = {}
for e in entries:
    if e["id"] in seen:
        seen[e["id"]] += 1
        e["id"] = f'{e["id"]}~{seen[e["id"]]}'
    else:
        seen[e["id"]] = 1

# DeckHost is generated by this toolkit, not cloned — it hosts the repos that ship
# source files but no runnable app of their own.
if os.path.isdir(os.path.join(ROOT, "DeckHost", "DeckHost.xcodeproj")):
    entries.append({
        "id": "DeckHost", "repo": "DeckHost", "slug": "previewdeck/DeckHost",
        "repo_kind": "host", "container_kind": "project",
        "path": os.path.relpath(os.path.join(ROOT, "DeckHost", "DeckHost.xcodeproj"), REPOS),
        "scheme": "DeckHost", "shared_schemes": ["DeckHost"],
        "is_app": True, "sdks": ["iphoneos"], "min_ios": "26.0", "ios": True,
    })

out = os.path.join(ROOT, "catalog.json")
tmp = out + ".tmp"
with open(tmp, "w") as f:
    json.dump(entries, f, indent=1)
os.replace(tmp, out)

apps = [e for e in entries if e["is_app"] and e["ios"]]
print(f"containers: {len(entries)}   iOS apps: {len(apps)}")
from collections import Counter
c = Counter(e["repo"] for e in apps)
for r, n in c.most_common():
    print(f"  {n:4d}  {r}")
