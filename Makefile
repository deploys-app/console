REGISTRY=asia-southeast1-docker.pkg.dev/deploys-app/internal/
IMAGE_NAME=console
COMMIT_SHA=$(shell git rev-parse HEAD)

build:
	buildctl build \
        --frontend dockerfile.v0 \
        --local dockerfile=. \
        --local context=. \
        --output type=image,name=$(REGISTRY)$(IMAGE_NAME):$(COMMIT_SHA),push=true
