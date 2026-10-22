"""Verify preserved bytes, document links and the imported HTTP serving boundary."""
from pathlib import Path
import hashlib
import json
import re
import socket
import subprocess
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

manifest = read_json(ROOT / 'knowledge' / 'import-manifest.json')
destination_errors = [x['path'] for x in manifest['siteFiles'] if sha(ROOT / x['path']) != x['sha256']]
source_errors = [x['source'] for x in manifest['siteFiles'] if sha(Path(x['source'])) != x['sha256']]
catalogue = read_json(ROOT / 'knowledge' / 'source-catalogue.json')
archive_errors = [x['sourceRelativePath'] for x in catalogue['files'] if sha(ROOT / x['archivePath']) != x['sha256']]
history = read_json(ROOT / 'knowledge' / 'conversations' / 'portfolio-redesign-complete.json')
local = read_json(ROOT / 'knowledge' / 'conversations' / 'local-index.json')
corpus = (ROOT / 'JOSH-BOYER-PORTFOLIO-CORPUS.md').read_text(encoding='utf-8')
html = (ROOT / 'dist' / 'index.html').read_text(encoding='utf-8')
references = re.findall(r'(?:src|href)="([^"#]+)"', html)
missing_references = sorted({v for v in references if not re.match(r'^[a-z]+:', v, re.I) and not (ROOT / 'dist' / v.split('#')[0].split('?')[0].lstrip('/')).exists()})
http = {'verified': False}
probe = socket.socket()
try:
    probe.bind(('127.0.0.1', 4183))
except OSError:
    http['reason'] = 'Port 4183 is already in use; did not interrupt existing listener.'
    probe.close()
else:
    probe.close()
    process = subprocess.Popen(['node', 'serve.cjs'], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        for _ in range(50):
            try:
                with urllib.request.urlopen('http://127.0.0.1:4183/', timeout=1) as response:
                    body = response.read()
                break
            except (urllib.error.URLError, TimeoutError):
                if process.poll() is not None:
                    raise RuntimeError(process.stderr.read().decode('utf-8', errors='replace'))
                time.sleep(.1)
        else:
            raise RuntimeError('Imported server did not become ready')
        assert hashlib.sha256(body).hexdigest() == sha(ROOT / 'dist' / 'index.html')
        routes = {}
        for route in ('/resume', '/career-guide', '/career-evidence.v3.json', '/knowledge/source-catalogue.json', '/../JOSH-BOYER-PORTFOLIO-CORPUS.md', '/%2e%2e%2fJOSH-BOYER-PORTFOLIO-CORPUS.md'):
            try:
                with urllib.request.urlopen('http://127.0.0.1:4183' + route, timeout=2) as response:
                    routes[route] = response.status
            except urllib.error.HTTPError as error:
                routes[route] = error.code
        assert routes['/resume'] == routes['/career-guide'] == routes['/career-evidence.v3.json'] == 200
        assert all(status in (403, 404) for route, status in routes.items() if 'CORPUS' in route or '/knowledge/' in route)
        http = {'verified': True, 'homeMatchesImportedFile': True, 'routes': routes, 'temporaryServerStopped': True}
    finally:
        process.terminate()
        process.wait(timeout=5)

result = {'checkedOn': '2026-10-18', 'copiedFiles': len(manifest['siteFiles']), 'destinationHashMismatches': destination_errors, 'sourceHashChanges': source_errors, 'archivedDocumentOccurrences': len(catalogue['files']), 'archiveHashMismatches': archive_errors, 'missingHtmlReferences': missing_references, 'professionalAndPersonalCaseTemplates': len(re.findall(r'<template\s+id="project-', html)), 'historyPaginationComplete': history['completePagination'], 'implementationHistoryTurns': sum(len(p['turns']) for p in history['pages']), 'localConversationSessions': len(local['conversations']), 'localConversationMessages': sum(x['messages'] for x in local['conversations']), 'corpusWords': len(corpus.split()), 'http': http}
(ROOT / 'knowledge' / 'verification.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result))
assert not destination_errors and not source_errors and not archive_errors and not missing_references
