"""Preserve the chosen portfolio and its project evidence without changing sources."""
from pathlib import Path
import collections
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r'C:\Users\boyer\Documents\Codex\2026-10-13\task-7')
SITE = SOURCE / 'portfolio-visual-update'
DATE = '2026-10-18'
SKIP = {'.git', 'node_modules', '.local', '.wrangler', '.next', '.cache', 'vendor', '__pycache__'}

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def copy_checked(source, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and digest(source) != digest(target):
        raise RuntimeError(f'Refusing to overwrite different existing content: {target}')
    if not target.exists():
        shutil.copy2(source, target)

def main():
    imported = []
    for folder in ('dist', 'tests', 'about-desk-prepared'):
        for path in sorted((SITE / folder).rglob('*')):
            if path.is_file():
                target = ROOT / path.relative_to(SITE)
                copy_checked(path, target)
                imported.append({'source': str(path), 'path': target.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': digest(path)})
    for name in ('serve.cjs', 'manifest.json'):
        path = SITE / name
        copy_checked(path, ROOT / name)
        imported.append({'source': str(path), 'path': name, 'bytes': path.stat().st_size, 'sha256': digest(path)})
    archive = ROOT / 'knowledge' / 'archive'
    records = []
    unique = {}
    for path in sorted(SOURCE.rglob('*')):
        if not path.is_file():
            continue
        rel = path.relative_to(SOURCE)
        if any(part in SKIP or part.startswith('.library') for part in rel.parts):
            continue
        if path.suffix.lower() not in {'.md', '.txt', '.json', '.pdf', '.docx'}:
            continue
        if path.name in {'package-lock.json', 'package.json', 'tsconfig.json', 'components.json', 'pnpm-lock.yaml'}:
            continue
        if any(part in {'dist', 'public'} for part in rel.parts) and not ('evidence' in path.name.lower() or path.suffix.lower() in {'.md', '.txt'}):
            continue
        if path.stat().st_size > 20_000_000:
            continue
        sha = digest(path)
        key = sha + path.suffix.lower()
        target = archive / 'objects' / key
        copy_checked(path, target)
        unique[key] = path.stat().st_size
        records.append({'source': str(path), 'sourceRelativePath': rel.as_posix(), 'archivePath': target.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': sha})
    write_json(ROOT / 'knowledge' / 'source-catalogue.json', {'version': 1, 'capturedOn': DATE, 'sourceRoot': str(SOURCE), 'scope': 'Project documents and evidence snapshots; generated dependency caches, credentials and repository internals excluded.', 'files': records})
    curated = ROOT / 'knowledge' / 'source-documents'
    for folder in ('portfolio-islands', 'portfolio-visual-update', 'portfolio-sites-candidate'):
        for path in sorted((SOURCE / folder).glob('*.md')):
            copy_checked(path, curated / folder / path.name)
    for path in (SITE / 'dist').glob('career-evidence*.json'):
        copy_checked(path, ROOT / 'knowledge' / 'career' / path.name)
    for name in ('EARLY-CAREER-ACCOUNT.md', 'GRENVILLE-ACCOUNT.md', 'CAREER-EVIDENCE.md', 'CAREER-STORY-REVISION.md', 'HERO-MILESTONES.md'):
        copy_checked(SOURCE / 'portfolio-islands' / name, ROOT / 'knowledge' / 'career' / name)
    write_json(ROOT / 'knowledge' / 'import-manifest.json', {'version': 1, 'capturedOn': DATE, 'source': str(SITE), 'destination': str(ROOT), 'siteFiles': imported, 'archivedDocumentOccurrences': len(records), 'uniqueArchiveObjects': len(unique), 'uniqueArchiveBytes': sum(unique.values()), 'sourceUnchanged': True})
    print(json.dumps({'siteFiles': len(imported), 'siteBytes': sum(x['bytes'] for x in imported), 'documentOccurrences': len(records), 'uniqueDocuments': len(unique), 'archiveBytes': sum(unique.values())}))

if __name__ == '__main__':
    main()
