package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"image"
	"image/png"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"resume-fire/internal/resume"
	"time"

	"github.com/klippa-app/go-pdfium"
	"github.com/klippa-app/go-pdfium/requests"
	"github.com/klippa-app/go-pdfium/single_threaded"
	"github.com/otiai10/gosseract/v2"
)

var pool pdfium.Pool
var instance pdfium.Pdfium

func init() {
	// Init the PDFium library and return the instance to open documents.
	pool = single_threaded.Init(single_threaded.Config{})

	var err error
	instance, err = pool.GetInstance(time.Second * 30)
	if err != nil {
		log.Fatal(err)
	}
}

type pageLimitExceedError struct {
	pageCount int
}

func (e *pageLimitExceedError) Error() string {
	return fmt.Sprintf("number of pages (%d) exceeds limit (2)", e.pageCount)
}

func pdfToRgbaImage(file *multipart.File) (*image.RGBA, error) {
	buf := new(bytes.Buffer)
	// Load the PDF file into a byte array.
	_, err := io.Copy(buf, *file)
	if err != nil {
		return nil, err
	}
	pdfBytes := buf.Bytes()

	// Open the PDF using PDFium (and claim a worker)
	doc, err := instance.OpenDocument(&requests.OpenDocument{
		File: &pdfBytes,
	})
	if err != nil {
		return nil, err
	}

	getPageCount, err := instance.FPDF_GetPageCount(&requests.FPDF_GetPageCount{
		Document: doc.Document,
	})

	if err != nil {
		return nil, err
	}

	if getPageCount.PageCount > 2 {
		return nil, &pageLimitExceedError{
			pageCount: getPageCount.PageCount,
		}
	}

	// Always close the document, this will release its resources.
	defer instance.FPDF_CloseDocument(&requests.FPDF_CloseDocument{
		Document: doc.Document,
	})

	var renderRequests []requests.RenderPageInDPI

	for i := 0; i < getPageCount.PageCount; i++ {
		renderRequests = append(renderRequests, requests.RenderPageInDPI{
			DPI: 200,
			Page: requests.Page{
				ByIndex: &requests.PageByIndex{
					Document: doc.Document,
					Index:    i,
				},
			},
		})
	}

	pagesRender, err := instance.RenderPagesInDPI(&requests.RenderPagesInDPI{
		Pages: renderRequests,
	})

	defer pagesRender.Cleanup()

	if err != nil {
		return nil, err
	}

	return pagesRender.Result.Image, nil
}

func generateBoundingBoxes(file *image.RGBA) ([]gosseract.BoundingBox, error) {
	client := gosseract.NewClient()
	defer client.Close()

	buffer := new(bytes.Buffer)
	if err := png.Encode(buffer, file); err != nil {
		return nil, err
	}

	if err := client.SetPageSegMode(gosseract.PSM_SINGLE_BLOCK); err != nil {
		return nil, err
	}

	if err := client.SetImageFromBytes(buffer.Bytes()); err != nil {
		return nil, err
	}

	return client.GetBoundingBoxes(gosseract.RIL_WORD)
}

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
	resumeImage, err := resume.NewResumeImage(&file)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	boundingBoxes, err := resumeImage.GetWordsBoundingBoxes()
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

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/generate-bounding-boxes", generateBoundingBoxesHandler)

	err := http.ListenAndServe(":8080", mux)
	fmt.Println("server started on port 8080")
	if err != nil {
		log.Fatal(err)
	}

}
