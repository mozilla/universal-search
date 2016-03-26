DIST := dist
FILEBASE := universal-search
S3_BUCKET_NAME := universal-search
S3_BUCKET_REGION := us-west-2
S3_HOSTNAME := https://s3-$(S3_BUCKET_REGION).amazonaws.com
VERSION := `cat install.rdf | tr '\n' ' ' | sed "s/.*<em:version>\(.*\)<\/em:version>.*/\1/"`
PWD := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
FILENAME := $(FILEBASE)-$(VERSION).xpi
SIGNED_FILENAME := universal_search_addon-$(VERSION)-fx.xpi
UPDATE_FILENAME := $(FILEBASE).xpi
XPI := $(PWD)/$(DIST)/$(FILENAME)

.PHONY: all build sign tag upload require-amo-env require-aws-env

all:
	@$(MAKE) build
	@$(MAKE) sign
	@$(MAKE) tag
	@$(MAKE) upload

build:
	@mkdir -p $(DIST)
	@rm -f $(XPI)
	@zip -r $(XPI) . -x "$(DIST)/*" ".git/*" "Makefile" > /dev/null
	@echo "Built: $(XPI)"

sign: require-amo-env
	@jpm sign --api-key="$(AMO_JWT_ISSUER)" --api-secret="$(AMO_JWT_SECRET)" --xpi="$(XPI)"
	@rm -f $(XPI)
	@mv $(SIGNED_FILENAME) $(XPI)
	@echo "Signed: $(XPI)"

tag:
	@git tag -m "Generated tag for version $(VERSION)" $(VERSION)
	@echo "Tagged: $(VERSION)"

upload: require-aws-env
	@aws --quiet s3 cp $(XPI) s3://$(S3_BUCKET_NAME)/$(FILENAME)
	@aws --quiet s3 cp s3://$(S3_BUCKET_NAME)/$(FILENAME) s3://$(S3_BUCKET_NAME)/$(UPDATE_FILENAME)
	@echo "Uploaded: $(S3_HOSTNAME)/$(S3_BUCKET_NAME)/$(FILENAME)"
	@echo "Updated: $(S3_HOSTNAME)/$(S3_BUCKET_NAME)/$(UPDATE_FILENAME)"

require-amo-env:
ifndef AMO_JWT_ISSUER
	$(error AMO_JWT_ISSUER is undefined)
endif
ifndef AMO_JWT_SECRET
	$(error AMO_JWT_SECRET is undefined)
endif

require-aws-env:
ifndef AWS_ACCESS_KEY_ID
	$(error AWS_KEY is undefined)
endif
ifndef AWS_SECRET_ACCESS_KEY
	$(error AWS_SECRET is undefined)
endif
