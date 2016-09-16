# Changelog

## 1.0.10

**Date:** 2016/09/16

**Download:** [`universal-search-1.0.10.xpi`](https://s3-us-west-2.amazonaws.com/universal-search/universal-search-1.0.10.xpi)

**Summary:** Marks Universal Search as [multiprocess-compatible](https://wiki.mozilla.org/Electrolysis).

- [Mark addon as multiprocess compatible](https://github.com/mozilla/universal-search/commit/c0d2cfc74ebbf01f6c4bdbc231ab87853f4c6864)([issue #291](https://github.com/mozilla/universal-search/issues/291))

## 1.0.9

**Date:** 2016/08/29

**Download:** [`universal-search-1.0.9.xpi`](https://s3-us-west-2.amazonaws.com/universal-search/universal-search-1.0.9.xpi)

**Summary:** Fixes Universal Search on Nightly, broken ~30 days ago due to new one off search UI in Nightly. For this point release, those new buttons are disabled. [Issue #304](https://github.com/mozilla/universal-search/issues/304) tracks work needed to re-enable one-off searches in the awesomebar.

- [Unable to browse the web with Universal Search enabled and latest Nightly](https://github.com/mozilla/universal-search/commit/03aeb87dc82e9b4b4dbe63a2f04f024aad447beb)([issue #286](https://github.com/mozilla/universal-search/issues/286))
- [Key focus broken on Nightly](https://github.com/mozilla/universal-search/commit/03aeb87dc82e9b4b4dbe63a2f04f024aad447beb)([issue #292](https://github.com/mozilla/universal-search/issues/292))
- [Mouse focus broken on Nightly](https://github.com/mozilla/universal-search/commit/03aeb87dc82e9b4b4dbe63a2f04f024aad447beb)([issue #293](https://github.com/mozilla/universal-search/issues/293))
- [Mouse focus broken on Nightly](https://github.com/mozilla/universal-search/commit/03aeb87dc82e9b4b4dbe63a2f04f024aad447beb)([issue #293](https://github.com/mozilla/universal-search/issues/293))
- [Nightly breakage: stop using popupshowing event](https://github.com/mozilla/universal-search/commit/03aeb87dc82e9b4b4dbe63a2f04f024aad447beb)([issue #295](https://github.com/mozilla/universal-search/issues/295))
- [Nightly error: `property handleEvent is not callable`](https://github.com/mozilla/universal-search/commit/03aeb87dc82e9b4b4dbe63a2f04f024aad447beb)([issue #298](https://github.com/mozilla/universal-search/issues/298))


## 1.0.8

**Date:** 2016/07/22

**Download:** [`universal-search-1.0.8.xpi`](https://s3-us-west-2.amazonaws.com/universal-search/universal-search-1.0.8.xpi)

- [Don't unload Console.jsm when uninstalling or upgrading](https://github.com/mozilla/universal-search/commit/e02583298d3d79e368c625932b29b47eaa13bd80)([issue #267](https://github.com/mozilla/universal-search/issues/267))
  - This bug may have caused any number of odd things to happen after uninstalling or upgrading the Universal Search add-on, but before restarting Firefox.


## 1.0.7

**Date:** 2016/07/18

**Download:** [`universal-search-1.0.7.xpi`](https://s3-us-west-2.amazonaws.com/universal-search/universal-search-1.0.7.xpi)

- [Fix metrics reporting of recommendation type](https://github.com/mozilla/universal-search/commit/2ae3f504d4e91a68b2afe7cb9b03ba690b7f2ff9) ([issue #263](https://github.com/mozilla/universal-search/issues/263))
- [Change XUL event handlers to avoid empty awesomebar popup in Nightly](https://github.com/mozilla/universal-search/commit/0b1f54f24c0ef71fb170c7bf82893d1938c7e710) ([issue #164](https://github.com/mozilla/universal-search/issues/164))
- [Don't show the recommendation if it duplicates another visible result](https://github.com/mozilla/universal-search/commit/d0beb2fd3f510a1ed95ffc3bb5cc39551ed8a1e3) ([issue #12](https://github.com/mozilla/universal-search/issues/12))
- [Correctly color titles in Linux](https://github.com/mozilla/universal-search/commit/0ea68bc51a89e85cd12c5b99b3cf4fc7fe9e5936) ([issue #182](https://github.com/mozilla/universal-search/issues/182))
- [Fix type-checking bug that sometimes left a stale recommendation visible](https://github.com/mozilla/universal-search/commit/36a8bf55d797a5b63db62772fe3ff722707cbd9d) ([issue #181](https://github.com/mozilla/universal-search/issues/181))


## 1.0.6

**Date:** 2016/05/05

**Download:** [`universal-search-1.0.6.xpi`](https://s3-us-west-2.amazonaws.com/universal-search/universal-search-1.0.6.xpi)

- [Implement client-side metrics](https://github.com/mozilla/universal-search/commit/59f7f323113904ebb76de55f6fbbe57c159944d6) ([issue #18](https://github.com/mozilla/universal-search/issues/18))
- [Guard against `recommendation.el` being undefined](https://github.com/mozilla/universal-search/commit/8ce801c305a6917a691cc5fb0ec97a60b4b28437)
