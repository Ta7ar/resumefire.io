from flask import Flask, request, abort
from resume_parser import Resume

app = Flask(__name__)

@app.post("/api/generate-bounding-boxes")
def generate_bounding_boxes():
    resume_file = request.files["resume-file"]
    resume = Resume(resume_file)
    if len(resume.pages) > 2:
        return "Resume cannot have more than 2 pages", 400
    return resume.parse()