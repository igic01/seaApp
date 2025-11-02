# https://www.jaided.ai/easyocr/documentation/
# https://medium.com/@adityamahajan.work/easyocr-a-comprehensive-guide-5ff1cb850168

import easyocr
from regex_detection import RegexDetection

class TextDetection:
    def __init__(self, image_path):
        self.image_path = image_path
        self.languages = ['en']  # Default to English
        self.reader = None
        self.regex = RegexDetection()
        self.width_ths = 0.5  # Lower = more horizontal grouping (default: 0.5)
        self.paragraph = True  # Group text into larger blocks
    
    def set_languages(self, languages):
        self.languages = languages
    
    def set_grouping_params(self, width_ths=0.5, paragraph=True):
        """
        Set EasyOCR text grouping parameters
        
        Args:
            width_ths: Width threshold for grouping (0.0-1.0). Lower = more grouping
            paragraph: If True, groups text into larger blocks
        """
        self.width_ths = width_ths
        self.paragraph = paragraph
    
    def detect(self, only_sensitive=False):
        """
        Detect text in image
        
        Args:
            only_sensitive: If True, only return text containing email/iban/phone
        
        Returns:
            List of [x, y, w, h] coordinates
        """
        self.reader = easyocr.Reader(self.languages, gpu=False)
        results = self.reader.readtext(
            self.image_path,
            width_ths=self.width_ths,
            paragraph=self.paragraph
        )
        
        # Convert EasyOCR format to [x, y, w, h] format
        text_boxes = []
        for result in results:
            # Handle both formats: with or without confidence
            if len(result) == 3:
                bbox, text, confidence = result
            else:
                bbox, text = result
            
            # If only_sensitive is True, check if text contains sensitive data
            if only_sensitive and not self.regex.contains_sensitive(text):
                continue  # Skip non-sensitive text
            
            # bbox is [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
            # Convert to [x, y, w, h]
            x_coords = [point[0] for point in bbox]
            y_coords = [point[1] for point in bbox]
            
            x = int(min(x_coords))
            y = int(min(y_coords))
            w = int(max(x_coords) - min(x_coords))
            h = int(max(y_coords) - min(y_coords))
            
            text_boxes.append([x, y, w, h])
            print(f"  Detected: '{text}' at ({x}, {y}) size {w}x{h}")
        
        print(f"Detected {len(text_boxes)} text region(s)")
        
        return text_boxes

