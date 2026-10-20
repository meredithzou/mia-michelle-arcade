#!/usr/bin/env python3
from pathlib import Path
import re,sys
root=Path(__file__).resolve().parent.parent
needed=["index.html","site-config.js","styles/base.css","themes/pastel-rainbow/theme.css","AGENTS.md","PROJECT_BRIEF.md","games/chicken-jockey-dash/index.html","games/chinese-checkers/index.html","assets/chicken-jockey-preview.png","assets/chinese-checkers-preview.png"]
errors=[f"Missing {p}" for p in needed if not (root/p).is_file()]
home=(root/"index.html").read_text() if (root/"index.html").exists() else ""
for link in re.findall(r'(?:href|src)=["\']([^"\']+)["\']',home):
    if link.startswith(("http:","https:","mailto:","#","data:")):continue
    if not (root/link.split("#")[0].split("?")[0]).is_file():errors.append(f"Broken homepage link: {link}")
# Validate each independent game even when it has no homepage card yet.
for page in (root/"games").glob("*/index.html"):
    for link in re.findall(r'(?:href|src)=["\']([^"\']+)["\']',page.read_text()):
        if link.startswith(("http:","https:","mailto:","#","data:")):continue
        if not (page.parent/link.split("#")[0].split("?")[0]).is_file():
            errors.append(f"Broken game link in {page.relative_to(root)}: {link}")
for s in ("Mia and Michelle","Chicken Jockey Dash","Chinese Checkers","Pick a game","Made with ChatGPT"):
    if s not in home:errors.append(f"Missing homepage text: {s}")
if errors:
    print("\n".join(errors));sys.exit(1)
print("Site checks passed")
