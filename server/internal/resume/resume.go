package resume

import (
	"bytes"
	"encoding/csv"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"io"
	"log"
	"mime/multipart"
	"os/exec"
	"strconv"
	"time"

	"github.com/disintegration/imaging"
	"github.com/klippa-app/go-pdfium"
	"github.com/klippa-app/go-pdfium/requests"
	"github.com/klippa-app/go-pdfium/single_threaded"

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

var BRAND_COLOR color.RGBA = color.RGBA{218, 60, 63, 255}

const (
	CONFIDENCE_THRESHOLD = 66
	TESS_TSV_LEFT        = 6
	TESS_TSV_TOP         = 7
	TESS_TSV_WIDTH       = 8
	TESS_TSV_HEIGHT      = 9
	TESS_TSV_CONF        = 10
)

type Resume struct {
	image.NRGBA
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
			DPI: 600,
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
	resizedImage := imaging.Resize(image, 1200, 0, imaging.Lanczos)

	return &Resume{
		NRGBA: *resizedImage,
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
	pngBytes, err := r.Png()
	if err != nil {
		return nil, err
	}

	cmd := exec.Command("tesseract", "stdin", "stdout", "--oem", "1", "tsv")
	cmd.Stdin = bytes.NewReader(pngBytes)

	var out bytes.Buffer
	cmd.Stdout = &out

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("Error running Tesseract: %w", err)
	}

	reader := csv.NewReader(&out)
	reader.Comma = '\t'

	records, err := reader.ReadAll()
	if err != nil {
		return nil, err
	}

	height := r.Bounds().Dy()
	width := r.Bounds().Dx()

	res := pageScan{
		PageDimensions:    [2]int{height, width},
		WordBoundingBoxes: make([][4]int, 0, len(records)),
	}

	for _, record := range records {
		conf, err := strconv.ParseFloat(record[TESS_TSV_CONF], 64)
		if err == nil && conf > CONFIDENCE_THRESHOLD {
			x, _ := strconv.Atoi(record[TESS_TSV_LEFT])
			y, _ := strconv.Atoi(record[TESS_TSV_TOP])
			dx, _ := strconv.Atoi(record[TESS_TSV_WIDTH])
			dy, _ := strconv.Atoi(record[TESS_TSV_HEIGHT])

			boundingBox := [4]int{x, y, dx, dy}
			res.WordBoundingBoxes = append(res.WordBoundingBoxes, boundingBox)
		}
	}

	return &res, nil
}

func (r *Resume) Redact(boxes [][4]int) error {
	for _, box := range boxes {
		// 0 -> x, 1 -> y, 2 -> w, 3 -> h
		rectToDraw := image.Rect(box[0], box[1], box[0]+box[2], box[1]+box[3])
		draw.Draw(r, rectToDraw, image.NewUniform(BRAND_COLOR), image.Point{X: 0, Y: 0}, draw.Src)
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
		Src:  image.NewUniform(BRAND_COLOR),
		Face: face,
		Dot:  point,
	}
	d.DrawString(label)
	return nil
}
