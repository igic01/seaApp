# https://www.geeksforgeeks.org/python/face-detection-using-cascade-classifier-using-opencv-python/

import cv2

class FaceDetection:
    def __init__(self, image_path):
        self.image_path = image_path
        self.scale_factor = 1.1
        self.min_neighbors = 5
    
    def set_scale_factor(self, scale_factor):
        self.scale_factor = scale_factor
    
    def set_min_neighbors(self, min_neighbors):
        self.min_neighbors = min_neighbors
    
    def detect(self):
        image = cv2.imread(self.image_path)
        if image is None:
            print(f"ERROR: Could not load image from {self.image_path}")
            return []
        
        # face_cascade = cv2.CascadeClassifier("/content/haarcascade_frontalface_default.xml")
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        
        if face_cascade.empty():
            print("ERROR: Could not load Haar Cascade classifier")
            return []
        
        # Detect faces and return as list of [x, y, w, h]
        faces = face_cascade.detectMultiScale(
            image.copy(),
            scaleFactor=self.scale_factor,
            minNeighbors=self.min_neighbors
        )
        
        # Convert to list format
        face_list = [list(face) for face in faces]
        
        print(f"Detected {len(face_list)} face(s)")
        
        return face_list
