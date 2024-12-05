from flask import Flask, request, abort
from resume_parser import Resume

app = Flask(__name__)

@app.post("/api/generate-bounding-boxes")
def generate_bounding_boxes():
    resume_file = request.files["resume-file"]
    try:
        resume = Resume(resume_file)
        return resume.pages
    except ValueError as e:
        return e, 400
    
@app.post("/api/generate-redacted-pdf")
def generate_redacted_resume():
    bounding_boxes = request.get_json()
    return bounding_boxes