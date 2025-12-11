"""
Quick CLI to exercise scripts/ocr.py without running the Flask server.

Usage:
    python test.py /path/to/image.png
"""

import argparse
import json
import os
import sys

try:
    from werkzeug.datastructures import FileStorage
except Exception as exc:  # pragma: no cover
    print("Failed to import werkzeug (needed for FileStorage):", exc, file=sys.stderr)
    sys.exit(1)

from scripts.ocr import read_text_from_upload


def main():
    parser = argparse.ArgumentParser(description="Run EasyOCR on a local image via scripts/ocr.py")
    parser.add_argument("image_path", help="Path to the image file to OCR")
    args = parser.parse_args()

    if not os.path.isfile(args.image_path):
        print(f"Image not found: {args.image_path}", file=sys.stderr)
        return 1

    try:
        with open(args.image_path, "rb") as fh:
            upload = FileStorage(stream=fh, filename=os.path.basename(args.image_path))
            result = read_text_from_upload(upload)
    except Exception as exc:  # pragma: no cover - runtime guardrail
        print(json.dumps({"ok": False, "error": "exception", "message": str(exc)}, indent=2))
        return 1

    print(json.dumps(result, indent=2))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
