from flask import Flask, request, abort
from resume_parser import Resume, ResumePageLimitException
from operator import itemgetter
import json

app = Flask(__name__)

# resume_storage = ResumeTempStorage()


@app.post("/api/generate-bounding-boxes")
def generate_bounding_boxes():
    resume_file = request.files["resume-file"]
    try:
        resume = Resume(resume_file)
        return resume.detect_bounding_boxes()

    except ResumePageLimitException as e:
        return e, 400
    except Exception as e:
        return e, 500


@app.post("/api/generate-redacted-pdf")
def generate_redacted_resume():
    resume_file = request.files["resume-file"]
    selected_bounding_boxes = json.loads(request.form["selected-bounding-boxes"]) 
    try:
        resume = Resume(resume_file)
        resume.redact(selected_bounding_boxes)

    except ResumePageLimitException as e:
        return e, 400
    except Exception as e:
        return e, 500
    

