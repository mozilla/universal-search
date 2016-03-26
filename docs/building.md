# Building

A Makefile is included to automate the building, signing, tagging, and uploading of new versions of the add-on.


## Prerequisites

[jpm](https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/jpm) and [awscli](https://aws.amazon.com/cli/) must each be installed to sign and upload the addon, respectively. Additionally, several environment variables must be set to authenticate to [AMO](https://addons.mozilla.org/) and [AWS](https://aws.amazon.com/):

* `AMO_JWT_ISSUER`, which can be obtained at the [AMO Developer Hub](https://addons.mozilla.org/en-US/developers/addon/api/key/). This should follow the form `user:######-###`.
* `AMO_JWT_SECRET`, which can be obtained at the [AMO Developer Hub](https://addons.mozilla.org/en-US/developers/addon/api/key/).
* `AWS_ACCESS_KEY_ID`, an IAM access key with write permissions to the appropriate S3 bucket.
* `AWS_SECRET_ACCESS_KEY`, an IAM secret for the above key.

These variables are included in an `.env.dist` file, which can be copied to `.env` and populated. `source` this file before running any make commands, e.g.:

```shell
source .env && make
```


## Usage

Makefile commands can be run in this way:

```shell
make <command>
```


### `build`

The `build` command zips the contents of the current directory (excluding some unnecessary files), moves it to a `dist` directory, and gives it a filename based on the version number (inferred from `install.rdf`) with a `.xpi` extension.

On successful completion, the makefile will print the path to the built file:

```shell
$ make build
Built: /Projects/universal-search/addon/dist/universal-search-0.1.xpi
```


### `sign`

The `sign` command uploads an add-on built with `build` to AMO, validates it, and signs it. This requires the `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` environment variables, which which can be obtained at the [AMO Developer Hub](https://addons.mozilla.org/en-US/developers/addon/api/key/).

On successful completion, the makefile will print the path to the signed file

```shell
$ make sign
Signed: /Projects/universal-search/addon/dist/universal-search-0.1.xpi
```


### `tag`

The `tag` command creates a git tag based on the version number (inferred from `install.rdf`).

On successful completion, the makefile will print the new tag

```shell
$ make tag
Tagged: 0.1
```


### `upload`

The `upload` command uploads an add-on built with `build` to S3 and copies it to the `updateURL`, which will trigger an update to add-on users. This requires the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` and `AMO_JWT_SECRET`, which must have permission to write to the S3 bucket.

On successful completion, the makefile will print URLs to the uploaded and updated files:

```shell
$ make upload
Uploaded: https://s3-us-west-2.amazonaws.com/universal-search/universal-search-0.1.xpi
Updated: https://s3-us-west-2.amazonaws.com/universal-search/universal-search.xpi
```


### `all`

To run `build`, `sign`, `tag`, and `upload` in succession, omit any command. This will be the most common operation.

```shell
$ make
Built: /Projects/universal-search/addon/dist/universal-search-0.1.xpi
Signed: /Projects/universal-search/addon/dist/universal-search-0.1.xpi
Tagged: 0.1
Uploaded: https://s3-us-west-2.amazonaws.com/universal-search/universal-search-0.1.xpi
Updated: https://s3-us-west-2.amazonaws.com/universal-search/universal-search.xpi
```
