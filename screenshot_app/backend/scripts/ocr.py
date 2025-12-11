import os
import tempfile
import threading
from typing import Dict, List, Tuple, Union

try:
    import easyocr
except ImportError:
    easyocr = None

_reader_lock = threading.Lock()
_reader = None


def _get_reader():
    """
    Lazily instantiate the EasyOCR reader once, guarded by a lock.
    GPU is disabled to avoid extra setup requirements.
    """
    global _reader
    if _reader is None and easyocr is not None:
        with _reader_lock:
            if _reader is None:
                _reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    return _reader


def read_text_from_upload(upload) -> Dict[str, Union[int, bool, str, List[str]]]:
    """
    Run OCR on an uploaded file-like object (Flask FileStorage).
    Returns a response dict with keys:
      ok: bool
      status: HTTP-like status code
      text: combined text (when ok=True)
      lines: list of detected lines (when ok=True)
      error/message: diagnostics (when ok=False)
    """
    if easyocr is None:
        return {"ok": False, "status": 500, "error": "easyocr-not-installed"}

    if not upload:
        return {"ok": False, "status": 400, "error": "missing-image"}

    if upload.filename == "":
        return {"ok": False, "status": 400, "error": "empty-image"}

    temp_path = None
    try:
        _, ext = os.path.splitext(upload.filename)
        suffix = ext if ext else ".png"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            upload.save(tmp.name)
            temp_path = tmp.name

        reader = _get_reader()
        if reader is None:
            return {"ok": False, "status": 500, "error": "easyocr-not-initialized"}

        with _reader_lock:
            detected_lines: List[str] = reader.readtext(temp_path, detail=0)

        text = "\n".join(line.strip() for line in detected_lines if str(line).strip())
        return {
            "ok": True,
            "status": 200,
            "text": text,
            "lines": detected_lines,
        }
    except Exception as exc:  # pragma: no cover - runtime guardrail
        return {
            "ok": False,
            "status": 500,
            "error": "ocr-failed",
            "message": str(exc),
        }
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
