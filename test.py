from cover import Cover
from face_detection import FaceDetection
from text_detection import TextDetection

# Step 1: Detect all faces
face_detector = FaceDetection("images/austrianID.png")
faces = face_detector.detect()

# Step 2: Detect ALL text with grouping parameters
text_detector = TextDetection("images/austrianID.png")

# Adjust grouping: lower width_ths = more text grouping (try 0.3 to 1.0)
text_detector.set_grouping_params(width_ths=0.3, paragraph=True)

all_texts = text_detector.detect(only_sensitive=False)

# Step 3: Preview what will be detected (green=faces, blue=text)
cover = Cover("images/austrianID.png")
cover.set_output_path("output/preview.png")
cover.preview(face_rectangles=faces, text_rectangles=all_texts)

# Step 4: Cover all detected regions
cover.set_rectangles(faces + all_texts)
cover.set_output_path("output/covered_all.png")
cover.cover()