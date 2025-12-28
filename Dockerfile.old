FROM golang:latest

RUN apt-get update -qq

RUN apt-get install -y -qq libtesseract-dev libleptonica-dev
ENV TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata/
RUN apt-get install -y -qq tesseract-ocr-eng 

WORKDIR /app
COPY go.mod ./
COPY go.sum ./
RUN go get github.com/otiai10/gosseract/v2
RUN go mod download
COPY *.go ./
RUN go build -o /server

# Download and install nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | PROFILE="${BASH_ENV}" bash
RUN echo node > .nvmrc
RUN nvm install

# Install pdfium
RUN mkdir /opt/pdfium
RUN tar -xvzf pdfium-linux-x64.tgz -C /opt/pdfium

RUN touch /usr/lib/pkgconfig/pdfium.pc
# TODO update prefix, libdir, includedir

RUN export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/opt/pdfium/lib

EXPOSE 443 80

CMD [ "/server" ]