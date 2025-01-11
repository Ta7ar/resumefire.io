import werkzeug
import fitz
from io import BytesIO
from PIL import Image
from typing import List, Dict, Tuple
import pytesseract
import numpy as np
import cv2
import pandas as pd
from typing import TypedDict, Tuple
import uuid

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

ParsedPageInfo = TypedDict(
    "ParsedPageInfo",
    {"dimensions": Tuple[int, int], "boxes": List[Tuple[int, int, int, int]]},
)

PAGE_LIMIT = 2
BRANDING = "anonymized using resumefire.io"


class ResumePageLimitException(ValueError):
    """Raised when resume exceeds page limit"""


class Resume:
    def __init__(self, resume_filepath: werkzeug.datastructures.FileStorage) -> None:
        resume: List[fitz.Page] = fitz.open("pdf", resume_filepath.read())
        if len(resume) > PAGE_LIMIT:
            raise ResumePageLimitException("Resume cannot have more than 2 pages")

        self.pages: List[np.ndarray] = self.__parse(resume)
        # self.uuid: str = str(uuid.uuid4())

    def __get_text_bounding_boxes(self, img: np.ndarray) -> List[Tuple]:
        blurred: np.ndarray = cv2.GaussianBlur(img, (3, 3), 0)
        thresholded: np.ndarray = cv2.threshold(blurred, 0, 255, cv2.THRESH_OTSU)[1]
        image_data: pd.DataFrame = pytesseract.image_to_data(
            thresholded, output_type=pytesseract.Output.DATAFRAME, config="--psm 6"
        )
        image_data = image_data.loc[
            (image_data["level"] == 5)
            & (image_data["conf"] >= 66)
            & (str(image_data["text"]).strip() != "")
        ]
        image_data = image_data[["left", "top", "width", "height"]]
        bounding_boxes = list(image_data.itertuples(index=False, name=None))
        return bounding_boxes

    def __parse(self, pages: List[fitz.Page], dpi=200):

        # convert pdf to jpeg and save them into temp memory
        img_bytes_io_array: List[BytesIO] = []
        for page in pages:
            pix: fitz.Pixmap = page.get_pixmap(dpi=dpi)
            img_bytes_io = BytesIO()
            pix.pil_save(img_bytes_io, format="jpeg")
            img_bytes_io_array.append(img_bytes_io)

        # read in the image bytes, detect the bounding boxes
        pages: List[np.ndarray] = []
        for page_num, img_bytes_io in enumerate(img_bytes_io_array):
            bytes_as_np_array: np.ndarray = np.frombuffer(
                img_bytes_io.getvalue(), dtype=np.uint8
            )
            img_bytes_io.close()
            page_image: np.ndarray = cv2.imdecode(
                bytes_as_np_array, cv2.IMREAD_GRAYSCALE
            )
            pages.append(page_image)
            # bounding_boxes = self.__get_text_bounding_boxes(page_image)
            # pages.append({
            #     "dimensions": page_image.shape,
            #     "boxes": bounding_boxes
            # })
        return pages

    def detect_bounding_boxes(self) -> List[ParsedPageInfo]:
        return [
            {"boxes": self.__get_text_bounding_boxes(page), "dimensions": page.shape}
            for page in self.pages
        ]

    def __brand(self):
        text_width, text_height = cv2.getTextSize(
            BRANDING, cv2.FONT_HERSHEY_SIMPLEX, 1, 1
        )[0]

        # Get the dimensions of the text
        height, width = self.pages[0].shape

        # Calculate the bottom-right corner coordinates
        x = width - text_width - 50
        y = height - text_height - 50

        for image in self.pages:
            cv2.putText(
                image,
                BRANDING,
                (x, y),
                cv2.FONT_HERSHEY_DUPLEX,
                1,
                (0, 0, 0),
                1,
                cv2.LINE_AA,
            )

    def __redact_bounding_boxes(
        self, selected_bounding_boxes: List[Tuple[int, int, int, int]]
    ):

        # TODO: support multiple pages in future
        image = self.pages[0]
        for bbox in selected_bounding_boxes:
            pt1, pt2 = (bbox[0], bbox[1]), (bbox[0] + bbox[2], bbox[1] + bbox[3])
            cv2.rectangle(image, pt1, pt2, (0, 0, 0), -1)

        cv2.imwrite("./redacted.jpg", image)

    def redact(self, selected_bounding_boxes: List[Tuple[int, int, int, int]]):
        # branding
        self.__brand()

        # redact selected
        self.__redact_bounding_boxes(selected_bounding_boxes)

    # def save_to_disk(self):
    #     for page_num, img_bytes_io in enumerate(img_bytes_io_array):
    #         image = Image.open(img_bytes_io)
    #         image.save(f"resume-{page_num}.jpeg", format="jpeg")
