package resume

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"io"
	"log"
	"mime/multipart"
	"time"

	"github.com/klippa-app/go-pdfium"
	"github.com/klippa-app/go-pdfium/requests"
	"github.com/klippa-app/go-pdfium/single_threaded"
	"github.com/otiai10/gosseract/v2"

	"golang.org/x/image/font"
	"golang.org/x/image/font/gofont/goregular"
	"golang.org/x/image/font/opentype"
	"golang.org/x/image/math/fixed"
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

var PageLimitExceedError = errors.New("only single page resumes are supported")

// type PageLimitExceedError struct {
// 	pageCount int
// }

// func (e *PageLimitExceedError) Error() string {
// 	return fmt.Sprintf("number of pages (%d) exceeds limit (1)", e.pageCount)
// }

var confiThreshold float64 = 66
var brandColor color.RGBA = color.RGBA{218, 60, 63, 255}

type Resume struct {
	image.RGBA
}

func NewResume(file *multipart.File) (*Resume, error) {
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

	// TODO: support 2 page Resumes in the future
	if getPageCount.PageCount > 1 {
		return nil, PageLimitExceedError
	}

	// Always close the document, this will release its resources.
	defer instance.FPDF_CloseDocument(&requests.FPDF_CloseDocument{
		Document: doc.Document,
	})

	var renderRequests []requests.RenderPageInDPI

	for i := 0; i < getPageCount.PageCount; i++ {
		renderRequests = append(renderRequests, requests.RenderPageInDPI{
			DPI: 140,
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
		return nil, fmt.Errorf("ERROR: failed to render pages in DPI: %w", err)
	}

	image := pagesRender.Result.Image

	return &Resume{
		RGBA: *image,
	}, nil
}

func (r *Resume) Png() ([]byte, error) {
	buffer := new(bytes.Buffer)
	if err := png.Encode(buffer, r); err != nil {
		return nil, err
	}

	return buffer.Bytes(), nil
}

type pageScan struct {
	PageDimensions    [2]int   `json:"dimensions"`
	WordBoundingBoxes [][4]int `json:"boxes"`
}

func (r *Resume) GetWordsBoundingBoxes() (*pageScan, error) {
	client := gosseract.NewClient()
	defer client.Close()

	if err := client.SetPageSegMode(gosseract.PSM_SINGLE_BLOCK); err != nil {
		return nil, err
	}

	pngBytes, err := r.Png()
	if err != nil {
		return nil, err
	}

	if err := client.SetImageFromBytes(pngBytes); err != nil {
		return nil, err
	}

	bboxes, err := client.GetBoundingBoxes(gosseract.RIL_WORD)
	if err != nil {
		return nil, err
	}

	height := r.Bounds().Dy()
	width := r.Bounds().Dx()

	res := pageScan{
		PageDimensions:    [2]int{height, width},
		WordBoundingBoxes: make([][4]int, 0, len(bboxes)),
	}

	for _, boundingBox := range bboxes {
		if boundingBox.Confidence < confiThreshold {
			continue
		}
		box := boundingBox.Box
		boxArr := [4]int{box.Min.X, box.Min.Y, box.Dx(), box.Dy()}
		res.WordBoundingBoxes = append(res.WordBoundingBoxes, boxArr)
	}

	return &res, nil
}

func (r *Resume) Redact(boxes [][4]int) error {
	for _, box := range boxes {
		// 0 -> x, 1 -> y, 2 -> w, 3 -> h
		rectToDraw := image.Rect(box[0], box[1], box[0]+box[2], box[1]+box[3])
		draw.Draw(r, rectToDraw, image.NewUniform(brandColor), image.Point{X: 0, Y: 0}, draw.Src)
	}
	return nil
}

func (r *Resume) AddLabel(x int, y int, label string) error {

	f, err := opentype.Parse(goregular.TTF)
	if err != nil {
		return err
	}

	face, err := opentype.NewFace(f, &opentype.FaceOptions{
		Size: float64(24), // Size of font in pt
		DPI:  72,
	})
	if err != nil {
		return err
	}

	point := fixed.Point26_6{fixed.I(x), fixed.I(y)}
	d := &font.Drawer{
		Dst:  r,
		Src:  image.NewUniform(brandColor),
		Face: face,
		Dot:  point,
	}
	d.DrawString(label)
	return nil
}
