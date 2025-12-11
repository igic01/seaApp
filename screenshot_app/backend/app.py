import os
import threading
from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
import webview

from scripts.ocr import read_text_from_upload

# --- Paths ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIST = os.path.join(BASE_DIR, "..", "frontend", "dist")

app = Flask(
    __name__,
    static_folder=FRONTEND_DIST,
    static_url_path=""
)
cors = CORS(app, resources={r"/api/*": {"origins": "*"}})

# --- React static files ---

@app.route("/")
def index():
    # Serve the main React HTML file
    return send_from_directory(FRONTEND_DIST, "index.html")


@app.route("/<path:path>")
def static_proxy(path):
    """
    Serve JS/CSS/assets from the dist folder.
    If the file doesn't exist, fall back to index.html
    so React Router still works.
    """
    file_path = os.path.join(FRONTEND_DIST, path)
    if os.path.isfile(file_path):
        return send_from_directory(FRONTEND_DIST, path)
    return send_from_directory(FRONTEND_DIST, "index.html")


# --- Example API endpoint (Python backend) ---

@app.route("/api/hello")
def hello():
    return jsonify({"message": "Hello from Python backend!"})


@app.route("/api/ocr", methods=["POST"])
def extract_text():
    """
    Accept an uploaded image, run OCR via EasyOCR, and return the detected text.
    """
    if "image" not in request.files:
        return jsonify({"error": "missing-image"}), 400

    upload = request.files["image"]
    result = read_text_from_upload(upload)

    status = result.pop("status", 200 if result.get("ok") else 500)
    return jsonify(result), status


def start_flask():
    # Start the backend server
    app.run(host="127.0.0.1", port=5000, debug=False)


if __name__ == "__main__":
    # Start Flask in the background
    t = threading.Thread(target=start_flask, daemon=True)
    t.start()

    # Open native window pointing to our backend (which serves React)
    webview.create_window("Screenshot App", "http://127.0.0.1:5173")
    webview.start()
