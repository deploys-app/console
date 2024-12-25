REGISTRY=registry.deploys.app/deploys-app/console
TAG=$(shell git rev-parse HEAD)

.PHONY: build
build:
	buildctl build \
		--frontend dockerfile.v0 \
		--local dockerfile=. \
		--local context=. \
		--output type=image,name=$(REGISTRY):$(TAG),push=true
