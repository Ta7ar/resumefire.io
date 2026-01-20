import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type Dimensions = [height: number, width: number];

export type BoundingBox = [x: number, y: number, w: number, h: number];

@Injectable({
  providedIn: 'root',
})
export class ResumeService {
  // resume?: File;
  constructor(private httpClient: HttpClient) {}

  getBoundingBoxes(resume: File): Observable<{ dimensions: Dimensions, boxes: BoundingBox[] }> {
    const formdata = new FormData();
    formdata.append('resume-file', resume);
    return this.httpClient.post<{ dimensions: Dimensions, boxes: BoundingBox[] }>(
      "/api/resume/bounding-boxes/generate", formdata
    );
  }

  postBoundingBoxes(resume: File, boundingBoxes: BoundingBox[]): Observable<HttpResponse<any>>{
    const formdata = new FormData();
    formdata.append('resume-file', resume);
    formdata.append('selected-bounding-boxes', JSON.stringify(boundingBoxes));
    return this.httpClient.post(
      "/api/resume/bounding-boxes/redact", formdata, {
        observe: "response"
      }
    )
  }
}
