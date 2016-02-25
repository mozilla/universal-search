# universal-search

## Local Development

### First-time Setup

The add-on setup steps come from the [extension dev page] on MDN. Look there for more details.

1. Clone this repo locally: `git clone git@github.com:mozilla/universal-search`
1. Install the [devprefs add-on] to enable some Firefox prefs useful for add-on development.
1. Create a [proxy file] to link your local copy of the code to your add-on development profile.

[extension dev page]: https://developer.mozilla.org/en-US/Add-ons/Setting_up_extension_development_environment
[devprefs add-on]: https://add-ons.mozilla.org/en-US/firefox/add-on/devprefs/
[proxy file]: https://developer.mozilla.org/en-US/Add-ons/Setting_up_extension_development_environment#Firefox_extension_proxy_file

## Building the Add-ons

To build the add-on XPI:

```bash
make
```

The add-on will be built into a `dist` directory.

## Contributing

If you'd like to get involved, take a look at our [help wanted] bugs, or say hello on IRC (#testpilot on Mozilla IRC) or on our [mailing list].

By participating in this project, you agree to abide by our [code of conduct](./CODE_OF_CONDUCT.md).

[help wanted]: https://github.com/mozilla/universal-search/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22
[mailing list]: https://mail.mozilla.org/listinfo/testpilot-dev

## Coding conventions

- lib/universal-search.js loads code into windows and constructs the object graph
- use constructors to assign dependencies to the object, and bind `this` to callbacks
- use `init` for initialization work other than dependency injection
- use `destroy` to unset anything that could leak memory
- leading underscore in prototype methods indicates private API
- event naming convention: hyphenated lower case.
	- we don't need to namespace it to individual items because it's such a small list of events. just keep it simple.

