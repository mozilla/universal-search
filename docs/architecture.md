# Architecture

Universal Search attempts to provide a destination recommendation for in-process search queries made in the browser's URL bar:

![Screenshot of Universal Search](images/screenshot.png)

This is made possible by two components: a Firefox add-on and a hosted server that makes those recommendations.


## Firefox Add-on

When the add-on is loaded, a [`WindowWatcher` object ](https://github.com/mozilla/universal-search/blob/master/lib/window-watcher.js) initializes the add-on in each existing browser window, and adds event listeners that do the same for subsequently-opened windows. In initiaization, a [`UniversalSearch` singleton](https://github.com/mozilla/universal-search/blob/master/lib/universal-search.js) is attached to each window (at `window.universalSearch`). It:

- Hides the distinct search field, effectively unifying the URL bar and search field.
- Loads Universal Search stylesheets into the XUL DOM.
- Imports a number of dependency modules.
- Creates and manages a graph of objects to manage various elements of the search lifecycle:


### Add-on Object Graph

- A [`RecommendationServer` object](https://github.com/mozilla/universal-search/blob/master/lib/recommendation-server.js) manages a connection to our [recommendation server](https://github.com/mozilla/universal-search-recommendation) and a method to query it.
- A [`Recommendation` object](https://github.com/mozilla/universal-search/blob/master/lib/ui/recommendation.js) is created to manage the XUL UI and events for recommendations made by the server.
- A [`RecommendationRow` object](https://github.com/mozilla/universal-search/blob/master/lib/ui/recommendation-row.js) is created and inserted into the XUL DOM for each `Recommendation` object.
- [`Urlbar`](https://github.com/mozilla/universal-search/blob/master/lib/ui/urlbar.js) and [`Popup`](https://github.com/mozilla/universal-search/blob/master/lib/ui/popup.js) objects abstract the XUL urlbar and popup, intercept events on them, and delegate those events to the appropriate objects.
- A [`HighlightManager` object](https://github.com/mozilla/universal-search/blob/master/lib/ui/highlight-manager.js) manages the selection and deselection of our injected recommendation in the context of other items: bookmarks, history items, and search suggestions.


### Search lifecycle

The net effect of this:

- When a user types into the address bar, that text is sent to our recommendation server.
- If our server is able to do so, it returns a JSON object containing a recommendation.
- That recommendation is parsed for content, translated into an XUL `<hbox>` element, and is inserted to the top of the popup.
- The user is able to interact with that recommendation as if it were any other item in the popup.


## Recommendation Server

[Full documentation for the recommendation server](https://github.com/mozilla/universal-search-recommendation/blob/master/README.md) is hosted in its own repository.


### Speed and Caching

For a good user experience in this setting, speed is paramount; a recommendation that is slow to arrive feels worse than one that isn't shown at all.

Therefore, recommendations are not determined in the request-response cycle; if the user asks for a recommendation that is not available, the server returns `202`, and the recommendation is determined by a worker process and is stored for future use.
