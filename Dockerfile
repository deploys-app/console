FROM golang:1.21.1

ENV CGO_ENABLED=0
WORKDIR /workspace
ADD go.mod go.sum ./
#ADD vendor vendor
#RUN go build ./vendor/...
RUN go mod download
ADD . .
RUN go build -o .build/console -ldflags "-w -s" .

FROM gcr.io/distroless/static

WORKDIR /app

COPY --from=0 --link /workspace/.build/* ./
ENTRYPOINT ["/app/console"]
