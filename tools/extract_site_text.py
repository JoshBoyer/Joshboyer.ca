"""Create a readable evidence extraction from the exact imported site."""
from html.parser import HTMLParser
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

class Text(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.output = []
        self.skip = 0
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.skip += 1
        if tag in ('p', 'div', 'section', 'article', 'li', 'h1', 'h2', 'h3', 'h4', 'summary', 'dt', 'dd', 'br'):
            self.output.append('\n')
    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.skip -= 1
        if tag in ('p', 'div', 'section', 'article', 'li', 'h1', 'h2', 'h3', 'h4', 'summary', 'dt', 'dd'):
            self.output.append('\n')
    def handle_data(self, data):
        if not self.skip:
            self.output.append(data)

def extract(fragment):
    p = Text()
    p.feed(fragment)
    return '\n\n'.join(line for line in (re.sub(r'\s+', ' ', v).strip() for v in ''.join(p.output).splitlines()) if line)

html = (ROOT / 'dist' / 'index.html').read_text(encoding='utf-8')
output = ['# Imported portfolio text', '', 'Version: 1.0 | Captured: 2026-10-18', '', 'Source: `dist/index.html`; text extraction retains archived case templates as evidence.', '']
for match in re.finditer(r'<template\s+id="(project-[^"]+)"[^>]*>([\s\S]*?)</template>', html):
    output.extend(['## ' + match[1], '', extract(match[2]), ''])
non_templates = re.sub(r'<template\b[\s\S]*?</template>', '', html)
output.extend(['## Home, Projects and About', '', extract(non_templates), ''])
target = ROOT / 'knowledge' / 'career' / 'SITE-CONTENT-EXTRACT.md'
target.write_text('\n'.join(output), encoding='utf-8')
print(str(target))
