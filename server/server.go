package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"resume-fire/internal/resume"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

var s3Client *s3.Client

func init() {
	accessKey := os.Getenv("SPACES_KEY")
	secretKey := os.Getenv("SPACES_SECRET")
	region := "nyc3"
	endpoint := fmt.Sprintf("https://%s.digitaloceanspaces.com", region)

	credsProvider := credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion("nyc3"),
		// config.WithEndpointResolverWithOptions(customResolver),
		config.WithCredentialsProvider(credsProvider))
	if err != nil {
		panic(fmt.Sprintf("failed loading config, %v", err))
	}
	s3Client = s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
		o.UsePathStyle = *aws.Bool(true)
	})
}

func uploadImageToBucket(resume *resume.Resume, prefix string) (*string, error) {
	resumePng, err := resume.Png()
	if err != nil {
		return nil, fmt.Errorf("ERROR: failed to convert resume to PNG: %w", err)
	}
	objectKey := aws.String(prefix + "/" + uuid.New().String())
	fmt.Sprintf("Uploading image %s", *objectKey)
	uploader := manager.NewUploader(s3Client)
	_, err = uploader.Upload(context.TODO(), &s3.PutObjectInput{
		Bucket:      aws.String("resume-fire"),
		Key:         objectKey,
		Body:        bytes.NewReader(resumePng),
		ContentType: aws.String("image/png"),
	})
	if err != nil {
		return nil, fmt.Errorf("ERROR: failed to upload image: %w", err)
	}
	return objectKey, nil
}

func getPresignedUrl(objectKey *string) (*string, error) {
	presignClient := s3.NewPresignClient(s3Client)
	presignedUrl, err := presignClient.PresignGetObject(context.TODO(), &s3.GetObjectInput{
		Bucket: aws.String("resume-fire"),
		Key:    objectKey,
	}, s3.WithPresignExpires(time.Hour*72))

	if err != nil {
		return nil, fmt.Errorf("ERROR: failed to get presigned URL for object %s, %w", *objectKey, err)
	}
	return &presignedUrl.URL, nil
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

	objectKey, err := uploadImageToBucket(resume, "guest")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	presignedUrl, err := getPresignedUrl(objectKey)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Location", *presignedUrl)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
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
