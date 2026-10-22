# JoshBoyer.ca

Version: 1.0 | Imported: 2026-10-18

Josh Boyer's confirmed portfolio, copied from the October 15 visual revision. The original source folder remains intact.

Start with **[JOSH-BOYER-PORTFOLIO-CORPUS.md](JOSH-BOYER-PORTFOLIO-CORPUS.md)** for the consolidated career and portfolio knowledge.

## Run the site

```powershell
npm start
```

Open <http://127.0.0.1:4183/#home>. The server serves only `dist/`; local knowledge and conversations are outside the web root. `npm test` runs the imported motion/evidence regression suite. `npm run check` checks JavaScript syntax.

## Files

- `dist/`: exact imported website, including assets, résumé builder, career guide and evidence datasets.
- `tests/`: the visual revision's original tests and accepted evidence hashes.
- `knowledge/career/`: chronological accounts, corrections and structured career evidence.
- `knowledge/source-documents/`: readable original project documents.
- `knowledge/source-catalogue.json`: original paths, archive paths and SHA-256 file fingerprints for every preserved document occurrence.
- `knowledge/archive/objects/`: deduplicated original documents, stored by their SHA-256 fingerprint.
- `knowledge/conversations/`: captured portfolio conversation messages and coverage records.
- `knowledge/import-manifest.json`: provenance and exact imported-file fingerprints.
- `tools/`: import, extraction and preservation scripts.

The imported site has 16 case templates. LOWKEY and Workshop42 templates remain in its history; current featured placement uses NEXUS as the sole independent capstone.

The original source README and historical status documents are preserved under `knowledge/source-documents/`. Some contain superseded status statements; the current files and dated corrections take precedence.
