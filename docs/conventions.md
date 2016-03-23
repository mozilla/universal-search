# Code conventions

- lib/universal-search.js loads code into windows and constructs the object graph
- use constructors to assign dependencies to the object, and bind `this` to callbacks
- use `init` for initialization work other than dependency injection
- use `destroy` to unset anything that could leak memory
- leading underscore in prototype methods indicates private API
- event naming convention: hyphenated lower case.
	- we don't need to namespace it to individual items because it's such a small list of events. just keep it simple.
