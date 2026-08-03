# N2 2013-12 review queue

Status: `needs_review`; this package is not eligible for auto-pass or production seed yet.

## Blocking items

1. **Cloudinary upload blocked** — Cloudinary Asset Management MCP rejected local `file://` sources with `Unsupported source URL`. No media URL was fabricated. All five `storyAudio` values remain `null` in the draft JSON. Upload through a reachable HTTP-accessible staging endpoint or a supported Cloudinary upload path, then read back every asset.
2. **OCR uncertainty** — review the explicit uncertainty register in `ocr/questions-pages-07-11.md`, `ocr/questions-pages-12-17.md`, and `ocr/answers-transcript-pages-01-13.md`.
3. **Choukai 問題4** — original printed choices are audio-only and the repository requires exactly four choices; the draft uses an empty fourth choice and records this modeling exception.
4. **Choukai 問題5 answer key** — source answer page has obscured/misaligned labels; the mapping used in the draft must be confirmed against the original answer sheet.
5. **Audio boundary QA** — boundaries have ASR marker + silence evidence and are not equal-duration splits, but should be spot-checked at clip edges before auto-pass.

## Non-blocking source notes

- PDFs are image-only scans; OCR artifacts preserve provenance and uncertainty instead of silently correcting text.
- Blue Chinese watermark/overlay text is excluded from exam content.
- No image crops were identified in the OCR pages, so no image assets were generated.
- No Drive, Cloudinary, production database, merge, or deployment mutation was performed.

## Required before auto-pass

- Resolve all OCR ambiguity against the highest-resolution source.
- Upload five per-mondai clips into `jlpt-exam/data/n2-2013-12` and verify URLs/readback.
- Replace the five `storyAudio: null` values with verified Cloudinary URLs.
- Re-run package validator, lint/build gates, and seed dry-run/import review.
- Obtain explicit approval before merge or production seed.

Source manifests:
- `audio-segmentation-manifest.md`
- `cloudinary-upload-results.json`
- `source-sha256.txt`
- `asr-timestamps.json`
- `asr-timestamps.log`
