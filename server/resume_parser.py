import werkzeug
import fitz
from io import BytesIO
from PIL import Image
from typing import List, Dict, Tuple
import pytesseract
import numpy as np
import cv2
import pandas as pd

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

class Resume:
    def __init__(self, resume_filepath: werkzeug.datastructures.FileStorage) -> None:
        self.pages: List[fitz.Page] = fitz.open("pdf", resume_filepath.read())

    def _get_text_bounding_boxes(self, img: np.ndarray) -> List[Tuple]:
        blurred: np.ndarray = cv2.GaussianBlur(img, (3,3), 0)
        thresholded: np.ndarray = cv2.threshold(blurred, 0, 255, cv2.THRESH_OTSU)[1]
        image_data: pd.DataFrame = pytesseract.image_to_data(thresholded, output_type=pytesseract.Output.DATAFRAME, config='--psm 6')
        image_data = image_data.loc[(image_data['level'] == 5) & (image_data['conf'] >= 66) & (str(image_data["text"]).strip() != "")]
        image_data = image_data[["left", "top", "width", "height"]]
        bounding_boxes = list(image_data.itertuples(index=False, name=None))
        return bounding_boxes

    def parse(self, dpi=200):

        # convert pdf to jpeg and save them into temp memory
        img_bytes_io_array: List[BytesIO] = []
        for page in self.pages:
            pix: fitz.Pixmap = page.get_pixmap(dpi=dpi)
            img_bytes_io = BytesIO()
            pix.pil_save(img_bytes_io, format="jpeg")
            img_bytes_io_array.append(img_bytes_io)
        
        # read in the image bytes, detect the bounding boxes
        pages: List[Dict] = []
        for page_num, img_bytes_io in enumerate(img_bytes_io_array):
            bytes_as_np_array: np.ndarray = np.frombuffer(img_bytes_io.getvalue(), dtype=np.uint8)
            img_bytes_io.close()
            page_image: np.ndarray = cv2.imdecode(bytes_as_np_array, cv2.IMREAD_GRAYSCALE)
            bounding_boxes = self._get_text_bounding_boxes(page_image)
            pages.append({
                "dimensions": page_image.shape,
                "boxes": bounding_boxes
            })
        return pages

    # def save_to_disk(self):
    #     for page_num, img_bytes_io in enumerate(img_bytes_io_array):
    #         image = Image.open(img_bytes_io)
    #         image.save(f"resume-{page_num}.jpeg", format="jpeg")
