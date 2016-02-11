DIST := dist
FILEBASE := universal-search
VERSION := `cat install.rdf | tr '\n' ' ' | sed "s/.*<em:version>\(.*\)<\/em:version>.*/\1/"`
PWD := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
XPI := $(PWD)/$(DIST)/$(FILEBASE)-$(VERSION).xpi

.PHONY: all build

all:
	@$(MAKE) build

build:
	@mkdir -p $(DIST)
	@rm -rf $(XPI)
	@zip -r $(XPI) . -x "$(DIST)/*" "Makefile" > /dev/null
	@echo "Add-on built at $(XPI)"
