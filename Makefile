REGISTRY=asia-southeast1-docker.pkg.dev/deploys-app/internal/
IMAGE_NAME=console
COMMIT_SHA=$(shell git rev-parse HEAD)
DEPLOY_CLUSTER=cluster-rcf2
DEPLOY_NAMESPACE=deployer
DEPLOY_NAME=console

.PHONY: build deploy

build:
	buildctl build \
		--frontend dockerfile.v0 \
		--local dockerfile=. \
		--local context=. \
		--output type=image,name=$(REGISTRY)$(IMAGE_NAME):$(COMMIT_SHA),push=true

deploy: build
	kubectl set image --context $(DEPLOY_CLUSTER) -n $(DEPLOY_NAMESPACE) deployment/$(DEPLOY_NAME) app=$(REGISTRY)$(IMAGE_NAME):$(COMMIT_SHA)
