# https://www.geeksforgeeks.org/python/python-opencv-cv2-rectangle-method/
import cv2

class Cover:
    def __init__(self, image_path):
        self.image_path = image_path
        self.output_path = ""
        self.rectangles = None
        self.color = [0, 0, 0]

    def set_rectangles(self, rectangles):
        self.rectangles = rectangles
    
    def get_rectangles(self):
        return self.rectangles
    
    def set_output_path(self, output_path):
        self.output_path = output_path
    
    def preview(self, face_rectangles=None, text_rectangles=None):
        """
        Preview what will be covered with colored borders
        
        Args:
            face_rectangles: List of [x, y, w, h] for faces (green borders)
            text_rectangles: List of [x, y, w, h] for text (blue borders)
        """
        image = cv2.imread(self.image_path)
        if image is None:
            print(f"ERROR: Could not load image from {self.image_path}")
            return
        if not self.output_path:
            print("ERROR: Output path is not set. Use set_output_path() before calling preview()")
            return
        
        # Draw green borders for faces
        if face_rectangles:
            for rectangle in face_rectangles:
                x, y, w, h = rectangle
                cv2.rectangle(image, (x, y), (x + w, y + h), (0, 255, 0), 3)  # Green, 3px thick
        
        # Draw blue borders for text
        if text_rectangles:
            for rectangle in text_rectangles:
                x, y, w, h = rectangle
                cv2.rectangle(image, (x, y), (x + w, y + h), (255, 0, 0), 3)  # Blue, 3px thick
        
        cv2.imwrite(self.output_path, image)
        print(f"Preview saved to {self.output_path}")
        print(f"  Green borders: {len(face_rectangles) if face_rectangles else 0} faces")
        print(f"  Blue borders: {len(text_rectangles) if text_rectangles else 0} texts")
        return image
    
    def cover(self):
        image = cv2.imread(self.image_path)
        if image is None:
            print(f"ERROR: Could not load image from {self.image_path}")
            return
        if not self.output_path:
            print("ERROR: Output path is not set. Use set_output_path() before calling cover()")
            return

        height, width = image.shape[:2]
        for rectangle in self.rectangles:
            x, y, w, h = rectangle
            cv2.rectangle(image, (x, y), (x + w, y + h), self.color, -1)
        cv2.imwrite(self.output_path, image)
        print(f"Image covered and saved to {self.output_path}")
        return image