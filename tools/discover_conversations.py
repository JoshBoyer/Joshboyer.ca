"""Locate portfolio-related local conversation logs by recorded workspace metadata."""
from pathlib import Path
import json
import os

BASE = Path(r'C:\Users\boyer\.codex')
found = []
counts = {}
for folder in ('sessions', 'archived_sessions'):
    count = 0
    for directory, _, names in os.walk(BASE / folder):
        for name in names:
            if not name.endswith('.jsonl'):
                continue
            path = Path(directory) / name
            count += 1
            try:
                with path.open(encoding='utf-8') as handle:
                    first = json.loads(handle.readline())
                payload = first.get('payload', {})
                cwd = str(payload.get('cwd', ''))
                if any(term in cwd.lower() for term in ('2026-10-13\\task-7', '2026-10-13/task-7', 'portfolio', 'joshboyer')):
                    found.append({'path': str(path), 'bytes': path.stat().st_size, 'metadata': payload})
            except (OSError, ValueError):
                pass
    counts[folder] = count
target = Path(__file__).resolve().parents[1] / 'knowledge' / 'conversations' / 'local-discovery.json'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps({'scannedFiles': counts, 'conversations': found}, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'scanned': counts, 'matches': [{'path': x['path'], 'bytes': x['bytes'], 'cwd': x['metadata'].get('cwd'), 'id': x['metadata'].get('id')} for x in found]}, ensure_ascii=False))
