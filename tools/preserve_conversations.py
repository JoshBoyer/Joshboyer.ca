"""Export public conversation messages from discovered portfolio logs."""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'knowledge' / 'conversations'
discovery = json.loads((OUT / 'local-discovery.json').read_text(encoding='utf-8'))
index = []

def redact(text):
    return re.sub(r'\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}', '[REDACTED CREDENTIAL]', text)

for entry in discovery['conversations']:
    source = Path(entry['path'])
    # This current conversation is still being written; preserve its user request separately.
    if entry['metadata'].get('id') == '01a14e8d-b54a-7223-9107-2112b720ea46':
        continue
    records = []
    metadata = {key: entry['metadata'].get(key) for key in ('id', 'cwd', 'originator', 'source', 'forked_from_id')}
    with source.open(encoding='utf-8') as handle:
        for number, line in enumerate(handle, 1):
            try:
                item = json.loads(line)
            except ValueError:
                continue
            payload = item.get('payload', {})
            if item.get('type') != 'response_item' or payload.get('type') != 'message':
                continue
            role = payload.get('role')
            channel = payload.get('channel')
            if role not in ('user', 'assistant') or channel == 'analysis':
                continue
            content = []
            for part in payload.get('content', []):
                text = part.get('text')
                if text:
                    content.append(redact(text))
                elif part.get('type') in ('input_image', 'image'):
                    content.append('[Image attachment; original media not embedded in text export.]')
            if content:
                records.append({'timestamp': item.get('timestamp'), 'sourceLine': number, 'role': role, 'channel': channel, 'text': '\n\n'.join(content)})
    target = OUT / 'local' / (metadata['id'] + '.json')
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps({'source': str(source), 'metadata': metadata, 'scope': 'Public user/assistant text; tool logs, private reasoning and binary attachments omitted.', 'messages': records}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    index.append({'source': str(source), 'path': target.relative_to(ROOT).as_posix(), 'id': metadata['id'], 'messages': len(records), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
(OUT / 'local-index.json').write_text(json.dumps({'capturedOn': '2026-10-18', 'conversations': index}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'conversations': len(index), 'messages': sum(x['messages'] for x in index)}))
