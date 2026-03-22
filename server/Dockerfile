FROM golang:1.24-bookworm AS build

ARG PDFIUM_VERSION=7557
ARG PDFIUM_URL=https://github.com/bblanchon/pdfium-binaries/releases/download/chromium
ENV PDFIUM_PATH=/opt/pdfium

RUN apt-get update \
    && apt-get install -y \
    libtesseract-dev \
    libleptonica-dev \
    pkg-config \
    wget \
    tar \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
    
WORKDIR ${PDFIUM_PATH}
RUN wget --quiet $PDFIUM_URL/$PDFIUM_VERSION/pdfium-linux-x64.tgz \
    && tar -xvzf pdfium-linux-x64.tgz \
    && rm pdfium-linux-x64.tgz

RUN mkdir "/opt/pdfium/pkgconfig/" \
 && echo "\n" \
"prefix=${PDFIUM_PATH}\n" \
"libdir=${PDFIUM_PATH}/lib\n" \
"includedir=${PDFIUM_PATH}/include\n" \
"Name: PDFium\n" \
"Description: PDFium\n" \
"Version: ${PDFIUM_VERSION}\n" \
"Requires:\n" \
"Libs: -L\${libdir} -lpdfium\n" \
"Cflags: -I\${includedir}\n" > ${PDFIUM_PATH}/pkgconfig/pdfium.pc

ENV LD_LIBRARY_PATH=${LD_LIBRARY_PATH}:${PDFIUM_PATH}/lib
ENV PKG_CONFIG_PATH=${PKG_CONFIG_PATH}:${PDFIUM_PATH}/pkgconfig

ENV TESSDATA_PREFIX=/usr/share/tessdata_best
RUN mkdir -p $TESSDATA_PREFIX

RUN wget -P $TESSDATA_PREFIX https://github.com/tesseract-ocr/tessdata_best/raw/main/eng.traineddata

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build -o /usr/local/bin/app

FROM debian:bookworm-slim

RUN useradd -ms /bin/bash appuser

WORKDIR /app

ENV PDFIUM_PATH=/opt/pdfium
# ENV TESSDATA_PREFIX=/usr/share/tesseract-ocr/5.00/tessdata/
ENV LD_LIBRARY_PATH=$LD_LIBRARY_PATH:${PDFIUM_PATH}/lib

RUN apt-get update && apt-get install -y \
    libtesseract5 \
    liblept5 \
    tesseract-ocr-eng \
    ca-certificates \
    libglib2.0-0 \
    # tesseract-ocr \ 
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --chown=appuser:appuser --chmod=755 --from=build ${PDFIUM_PATH} ${PDFIUM_PATH}
COPY --chown=appuser:appuser --chmod=755 --from=build /usr/local/bin/app /usr/local/bin/app

ENV TESSDATA_PREFIX=/usr/share/tessdata_best
ENV OEM_LSTM_ONLY=1 

COPY --chown=appuser:appuser --chmod=755 --from=build $TESSDATA_PREFIX $TESSDATA_PREFIX

USER appuser

CMD ["/usr/local/bin/app"]