"""Attach source text to the single-file corpus and record supplemental provenance."""
from pathlib import Path
import hashlib
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
supplemental = ROOT / 'knowledge' / 'source-documents' / 'supplemental'
supplemental.mkdir(parents=True, exist_ok=True)
sources = [
    (Path(r'C:\Users\boyer\Downloads\portfoliobuildbundle.md'), 'portfoliobuildbundle.md'),
    (Path(r'C:\Users\boyer\Downloads\portfolioquestionnaire.html'), 'portfolioquestionnaire.html'),
    (Path(r'C:\Users\boyer\Downloads\Projects\portfolio\data.js'), 'older-portfolio-data.js'),
    (Path(r'C:\Users\boyer\Downloads\Projects\portfolio\README.md'), 'older-portfolio-README.md'),
    (Path(r'C:\Users\boyer\Downloads\Projects\joshboyer-blog\src\pages\about.astro'), 'older-blog-about.astro'),
    (Path(r'C:\Users\boyer\Downloads\Projects\joshboyer-blog\src\pages\experience.astro'), 'older-blog-experience.astro'),
    (Path(r'C:\Users\boyer\Downloads\Projects\joshboyer-blog\src\consts.ts'), 'older-blog-consts.ts'),
]
index = []
for source, name in sources:
    target = supplemental / name
    if target.exists() and target.read_bytes() != source.read_bytes():
        raise RuntimeError(f'Existing supplemental file differs: {target}')
    shutil.copy2(source, target)
    index.append({'source': str(source), 'path': target.relative_to(ROOT).as_posix(), 'bytes': target.stat().st_size, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
(ROOT / 'knowledge' / 'supplemental-sources.json').write_text(json.dumps({'capturedOn': '2026-10-18', 'files': index}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

target = ROOT / 'JOSH-BOYER-PORTFOLIO-CORPUS.md'
text = target.read_text(encoding='utf-8')
marker = '\n## Appendix A — Current website case studies, full extracted text\n'
if marker in text:
    text = text.split(marker)[0]
site_text = (ROOT / 'knowledge' / 'career' / 'SITE-CONTENT-EXTRACT.md').read_text(encoding='utf-8')
cases = site_text.split('## project-nexus', 1)[1].split('## Home, Projects and About', 1)[0]
cases = '## project-nexus' + cases
cases = re.sub(r'^## (project-[^\n]+)', r'### \1', cases, flags=re.MULTILINE)
text += marker + '\nThe following text is extracted from the imported HTML templates. It preserves the current source wording, including archived projects. Where it conflicts with a correction above, the correction remains explicit rather than silently rewriting the source. Navigation labels are retained.\n\n' + cases.strip() + '\n'

bundle = (supplemental / 'portfoliobuildbundle.md').read_text(encoding='utf-8')
questionnaire = bundle.split('## Appendix A — Raw questionnaire transcript (verbatim source)', 1)[1]
questionnaire = questionnaire.split('\n---\n', 1)[0]
text += '\n## Appendix B — Older questionnaire answers, as preserved in the build bundle\n\nSource: S7. This reproduces the source file\'s questionnaire section; it is not a freshly retrieved intake-system export. Spelling and older assertions are retained. The corrected renewal figures, unresolved HQ year, implementation limits and private historical scale figures must be interpreted using Section 13.\n\n' + questionnaire.strip() + '\n'

dataset = json.loads((ROOT / 'dist' / 'career-evidence.v3.json').read_text(encoding='utf-8'))
text += '\n## Appendix C — Reusable résumé evidence, with stable identifiers\n\nSource: S2, dataset `2026-10-15.3`. These are the exact prewritten résumé statements from the structured dataset. Active status controls current selection, not whether historical evidence is retained.\n'
for chunk in dataset['chunks']:
    text += '\n### ' + chunk['id'] + '\n\n'
    text += '**Title:** ' + chunk['title'] + '  \n**Period:** ' + chunk['period'] + '  \n**Current selection:** ' + ('active' if chunk.get('active', True) else 'archived/inactive') + '\n\n'
    text += chunk['resumeText'] + '\n\n'
    text += '**Evidence references:** ' + ', '.join('`' + v + '`' for v in chunk['sourceRefs']) + '.\n'
    for note in chunk.get('qualificationNotes', []):
        text += '\n- ' + note
    text += '\n'

text += '\n## Appendix D — Compact term reference\n\n**P&C:** property and casualty insurance. **BMS:** broker management system. **NOC:** network operations centre. **API:** application programming interface. **XML:** a structured data format. **REST/SOAP:** interface styles used to exchange data. **ETL:** extract, transform and load data between systems. **SQL:** database query language. **Underwriting:** deciding whether and on what terms to accept a risk. **Adjudication:** applying coverage and benefit rules to a claim. **Endorsement:** a policy change. **Reconciliation:** checking that related records and totals agree. **Provenance:** the source trail behind a statement.\n'
target.write_text(text, encoding='utf-8')
print(json.dumps({'corpus': str(target), 'words': len(text.split()), 'bytes': target.stat().st_size, 'supplementalSources': len(index)}))
