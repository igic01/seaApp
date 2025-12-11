import os
import tempfile
import threading
import warnings
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
                with warnings.catch_warnings():
                    warnings.filterwarnings(
                        "ignore",
                        message=".*pin_memory.*",
                        category=UserWarning,
                    )
                    _reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    return _reader


def _save_upload_to_temp(upload):
    if not upload:
        return None
    _, ext = os.path.splitext(upload.filename or "")
    suffix = ext if ext else ".png"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    upload.save(tmp.name)
    return tmp.name


def _load_reader_or_error():
    reader = _get_reader()
    if reader is None:
        return {"ok": False, "status": 500, "error": "easyocr-not-initialized"}
    return reader


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

    temp_path = _save_upload_to_temp(upload)
    try:
        if not temp_path:
            return {"ok": False, "status": 400, "error": "missing-image"}

        reader = _load_reader_or_error()
        if not isinstance(reader, easyocr.Reader):
            return reader

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


def read_text_boxes(upload) -> Dict[str, Union[int, bool, str, List[Dict[str, Union[str, float]]]]]:
    """
    Run OCR and return bounding boxes with text and confidence.
    Each box is described by x, y, width, height in image pixel space.
    """
    if easyocr is None:
        return {"ok": False, "status": 500, "error": "easyocr-not-installed"}

    if not upload:
        return {"ok": False, "status": 400, "error": "missing-image"}

    temp_path = _save_upload_to_temp(upload)
    try:
        if not temp_path:
            return {"ok": False, "status": 400, "error": "missing-image"}

        reader = _load_reader_or_error()
        if not isinstance(reader, easyocr.Reader):
            return reader

        with _reader_lock:
            detections = reader.readtext(temp_path, detail=1)

        boxes = []
        for det in detections:
            if not det or len(det) < 2:
                continue
            coords, text = det[0], det[1]
            conf = det[2] if len(det) > 2 else None
            if not coords or len(coords) < 4:
                continue
            xs = [p[0] for p in coords]
            ys = [p[1] for p in coords]
            x_min, x_max = min(xs), max(xs)
            y_min, y_max = min(ys), max(ys)
            width = max(0, x_max - x_min)
            height = max(0, y_max - y_min)
            boxes.append(
                {
                    "x": float(x_min),
                    "y": float(y_min),
                    "width": float(width),
                    "height": float(height),
                    "text": str(text) if text is not None else "",
                    "confidence": float(conf) if conf is not None else None,
                }
            )

        return {"ok": True, "status": 200, "boxes": boxes}
    except Exception as exc:  # pragma: no cover - runtime guardrail
        return {
            "ok": False,
            "status": 500,
            "error": "ocr-boxes-failed",
            "message": str(exc),
        }
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
