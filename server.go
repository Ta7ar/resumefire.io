package main

import (
	"encoding/json"
	"fmt"
	"image/png"
	"log"
	"net/http"
	"os"
	"resume-fire/internal/resume"
)

func generateBoundingBoxesHandler(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "text/plain") // Set a header
	err := r.ParseMultipartForm(5 << 20)         // 5 MB max memory
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	file, _, err := r.FormFile("resume-file")
	defer file.Close()
	if err != nil {
		if err == http.ErrMissingFile {
			http.Error(w, "Multipart file 'resume-file' is missing", http.StatusBadRequest)
		} else {
			http.Error(w, fmt.Sprintf("Error retrieving file: %v", err), http.StatusInternalServerError)
		}
		return
	}
	resume, err := resume.NewResume(&file)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	boundingBoxes, err := resume.GetWordsBoundingBoxes()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(boundingBoxes); err != nil {
		// In case of an encoding error, log it and potentially send an error response.
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func redactBoundingBoxesHandler(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(5 << 20) // 5 MB max memory
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	selectedBoxesFormVal := r.FormValue("selected-bounding-boxes")
	if selectedBoxesFormVal == "" {
		http.Error(w, fmt.Errorf("`selected-bounding-boxes` must be a valid json array").Error(), http.StatusBadRequest)
		return
	}
	var selectedBoxes [][4]int
	if err := json.Unmarshal([]byte(selectedBoxesFormVal), &selectedBoxes); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	file, _, err := r.FormFile("resume-file")
	defer file.Close()
	if err != nil {
		if err == http.ErrMissingFile {
			http.Error(w, "Multipart file 'resume-file' is missing", http.StatusBadRequest)
		} else {
			http.Error(w, fmt.Sprintf("Error retrieving file: %v", err), http.StatusInternalServerError)
		}
		return
	}

	// TODO: caching opportunity here by saving the resumeImage temporarily in memory when bounding boxes were first generated
	// resource: https://www.alexedwards.net/blog/implementing-an-in-memory-cache-in-go#:~:text=Not%20sure%20how%20to%20structure,be%20found%20in%20this%20gist.
	resume, err := resume.NewResume(&file)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	resume.Redact(selectedBoxes)

	height := resume.Bounds().Dy()

	resume.AddLabel(50, height-50, "anonymized using resumefire.io")

	outputFile, err := os.Create("redacted.png")
	if err != nil {
		log.Fatal(err)
	}
	defer outputFile.Close()

	if err := png.Encode(outputFile, resume); err != nil {
		log.Fatal(err)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
}

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/resume/bounding-boxes/generate", generateBoundingBoxesHandler)
	mux.HandleFunc("POST /api/resume/bounding-boxes/redact", redactBoundingBoxesHandler)

	err := http.ListenAndServe(":8080", mux)
	fmt.Println("server started on port 8080")
	if err != nil {
		log.Fatal(err)
	}

}
