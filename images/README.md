# Images Folder

This folder is for storing your input images for text detection.

## Quick Start

1. **Place your images here** (e.g., `sample.jpg`, `document.png`, etc.)

2. **Edit `text_detection.py`** (in the root folder):
   ```python
   IMAGE_PATH = "images/your_image.jpg"  # Change this
   MIN_CONFIDENCE = 0.6                   # Adjust if needed
   ```

3. **Run the script**:
   ```bash
   venv\Scripts\Activate.ps1
   python text_detection.py
   ```

4. **Check output**: `output_text_detection.jpg`

## Tips

- **Confidence too low?** Increase `MIN_CONFIDENCE` to 0.7 or 0.8
- **Missing text?** Decrease `MIN_CONFIDENCE` to 0.5 or 0.4
- **Different language?** Change `LANGUAGES = ['de']` for German, etc.

## Supported Image Formats

- JPG/JPEG
- PNG
- BMP
- TIFF
