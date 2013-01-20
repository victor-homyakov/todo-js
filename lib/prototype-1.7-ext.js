/**
 * Dynamic loading of CSS and JavaScript files.
 *
 * Examples:
 * var css = Include("css/style.css");
 * Element.remove(css);
 * Include("js/controls.js", callback);
 * var js = Include.js("dyna.php");
 * if(Include.findcss("css/style.css")) alert("CSS is already loaded");
 * if(Include.findjs("js/controls.js")) alert("JS is already loaded");
 *
 * @param {String} url - file URL
 * @param {Function} onload - onload callback for JavaScript
 */
var Include = function(url, onload) {
  if (url.endsWith(".css")) {
    return Include.css(url);
  } else if (url.endsWith(".js")) {
    return Include.js(url, onload);
  } else {
    throw new Error("Unknown file extension in URL '" + url + "'. Only .css and .js are recognized automatically. Either add known extension or call Include.css(cssUrl)/Include.js(jsUrl) explicitly.");
  }
};

Object.extend(Include, {
  head: function() {
    return document.head || document.getElementsByTagName("head")[0];
    // head = head || document.documentElement;
  },
  isCssText: function(css) {
    return (/[\s\S]+\{[\s\S]+\:[\s\S]+\}/).test(css);
  },
  css: function(content, media) {
    return this.isCssText(content) ? this.cssText(content) : this.cssUrl(content, media);
  },
  /**
   * Creates a link to the style sheet and adds it to the document.
   *
   * @param {String} url - the URL of CSS
   * @param {String} media - CSS media (optional, default "all")
   * @return {Element} the LINK element
   */
  cssUrl: function(url, media) {
    // TODO check if CSS is not found on server (404 Not Found)
    var css = this.findcss(url);
    if (!css) {
      media = media || "all";
      css = new Element("link", {
        rel: "stylesheet",
        type: "text/css",
        media: media,
        href: url
      });
      /*css = document.createElement("link");
       css.setAttribute("rel", "stylesheet");
       css.setAttribute("type", "text/css");
       css.setAttribute("media", media);
       css.setAttribute("href", url);*/
      this.head().appendChild(css);
    }
    return css;
  },
  /**
   * Creates a style sheet with the given CSS text and adds it to the document.
   *
   * @param {String} text - the CSS text
   * @return {Element} the STYLE element
   */
  cssText: function(text) {
    var p = document.createElement("p");
    p.innerHTML = 'x<style type="text/css">' + text + '<\/style>';
    return this.head().appendChild(p.lastChild);
    /*
     var css = new Element("style", {
     type: "text/css"
     });
     //var css = document.createElement("style");
     //css.type = "text/css"; // css.setAttribute("type", "text/css");
     if (css.styleSheet) { // IE
     css.styleSheet.cssText = text;
     } else { // W3C
     css.appendChild(document.createTextNode(text));
     }
     this.head().appendChild(css);
     return css;
     */
  },
  js: function(url, onload) {
    var js = this.findjs(url);
    if (js) {
      if (onload) {
        onload();
      }
    } else {
      js = new Element("script", {
        type: "text/javascript",
        src: url
      });
      //js = document.createElement("script");
      //js.setAttribute("type", "text/javascript");
      //js.setAttribute("src", url);
      if (onload) {
        js.onload = onload;
        if (Prototype.Browser.IE) {
          js.onreadystatechange = function onreadystatechange() { // this === js
            var rs = this.readyState; // js.readyState
            if (rs === "complete" || rs === "loaded") {
              // cleanup
              this.onload = this.onreadystatechange = null;
              //alert("Ready state: " + rs);
              onload();
            }
          };
        }
      }
      this.head().appendChild(js);
    }
    return js;
  },
  findcss: function(url) {
    return $$('link[href="' + url + '"]')[0];
  },
  findjs: function(url) {
    return $$('script[src="' + url + '"]')[0];
  }
});
//  if (head) {
//    var script = document.createElement("script");
//    script.type = "text/javascript";
//    script.src = "script.js";
//    script.setAttribute('charset', 'utf8');
//    head.appendChild(script);
//    document.body.appendChild(script);
//  }
(function () {
  var IS_DONTENUM_BUGGY = (function () {
    for (var p in {
      toString: 1
    }) {
      if (p === 'toString') {
        return false;
      }
    }
    return true;
  })(), DEFAULT_TOSTRING = Object.prototype.toString, DEFAULT_VALUEOF = Object.prototype.valueOf;

  var module_reserved_names = 'selfExtended|selfIncluded|extend|include';
  var module_reserved_names_extend = new RegExp('^(?:' + module_reserved_names + '|prototype|superclass|subclasses|ancestors)$');
  var module_reserved_names_include = new RegExp('^(?:' + module_reserved_names + '|constructor)$');

  function clearModuleNames(module, extend) {
    if (!module) {
      return [];
    }
    var reserved = extend ? module_reserved_names_extend : module_reserved_names_include;
    var names = Object.keys(module).select(function (value) {
      return !reserved.test(value);
    });

    if (IS_DONTENUM_BUGGY) {
      // Note: property constructor|toString|valueOf may be already present in names
      // They will be duplicated - better than no properties and faster than check for duplicates
      if (extend && !Object.isUndefined(module.constructor)) {
        names.push("constructor");
      }
      if (module.toString != DEFAULT_TOSTRING) {
        names.push("toString");
      }
      if (module.valueOf != DEFAULT_VALUEOF) {
        names.push("valueOf");
      }
    }
    return names;
  }

  /**
   * Extend `this` with `module`.
   * Invoke callback `module.selfExtended(this)` after extension.
   *
   * @param {Object} module
   */
  function extendWithModule(module) {
    //if(isObject(module))
    var names = clearModuleNames(module, true);
    for (var i = 0, length = names.length; i < length; i++) {
      this[names[i]] = module[names[i]];
    }
    if (module.selfExtended) {
      module.selfExtended(this);
    }
  }

  function findClassWithMethod(name, klasses) {
    for (var i = 0, l = klasses.length; i < l; i++) {
      if (name in klasses[i].prototype) {
        return klasses[i];
      }
    }
  }

  function wrap(superMethod, method) {
    var wrappedMethod = superMethod.wrap(method);
    wrappedMethod.valueOf = method.valueOf.bind(method);
    wrappedMethod.toString = method.toString.bind(method);
    return wrappedMethod;
  }

  function bindSuper(method, name, klass) {
    if (name in klass.prototype) {
      // bind $super to the method of previously included module
      method = wrap((function (m) {
        return function () {
          return m.apply(this, arguments);
        };
      })(klass.prototype[name]), method);
    } else {
      var ancestor = findClassWithMethod(name, klass.ancestors);
      if (ancestor) {
        // bind $super to the method of ancestor module
        method = wrap((function (p, n) {
          return function () {
            return p[n].apply(this, arguments);
          };
        })(ancestor.prototype, name), method);
      }
    }
    return method;
  }

  /**
   * Include `module` into `this.prototype`.
   * Invoke callback `module.selfIncluded(this)` after inclusion.
   *
   * @param {Object} module
   */
  function includeModule(module) {
    var names = clearModuleNames(module, false), name, method;
    for (var i = 0, length = names.length; i < length; i++) {
      name = names[i];
      method = module[name];
      if (Object.isFunction(method) && method.argumentNames()[0] == "$super") {
        method = bindSuper(method, name, this);
      }
      this.prototype[name] = method;
    }
    if (module.selfIncluded) {
      module.selfIncluded(this);
    }
  }

  /**
   * Extend the class-level with the given objects (modules).
   *
   * NOTE: this method _WILL_OVERWRITE_ the existing itersecting entries
   *
   * NOTE: this method _WILL_NOT_OVERWRITE_ the class prototype and
   * the class 'ancestors' and 'superclass' attributes. If one of those
   * exists in one of the received modules, the attribute will be
   * skipped
   *
   * @param {Object} module ... - module to extend with
   * @return Class the klass
   */
  function extend(module) {
    $A(arguments).each(extendWithModule, this);
    return this;
  }

  /**
   * Extend the class prototype with the given objects (modules).
   *
   * NOTE: this method _WILL_OVERWRITE_ the existing itersecting entries
   * NOTE: this method _WILL_NOT_OVERWRITE_ the 'klass' attribute of the klass.prototype
   *
   * @param {Object} module ... - module to include into prototype
   * @return Class the klass
   */
  function include(module) {
    $A(arguments).each(includeModule, this);
    return this;
  }

  function toString() {
    return "Class {" + clearModuleNames(this.prototype).join(", ") + "}";
  }

  Object.extend(Class.Methods, {
    extend: extend,
    include: include,
    // addMethods: include,
    clearModuleNames: clearModuleNames,
    toString: toString
  });

  function Subclass() {
    // empty
  }

  Class.create = function () {
    var modules = $A(arguments), parent = Object.isFunction(modules[0]) ? modules.shift() : null;
    var i, length = modules.length;

    function klass() {
      var prebind = this.prebind, methodName, method;
      if (prebind && Object.isArray(prebind)) {
        for (var i = 0, length = prebind.length; i < length; i++) {
          methodName = prebind[i];
          method = this[methodName];
          if (!method) {
            throw new Error("Method '" + methodName + "' not found in Class - cannot make prebind.");
          } else if (!Object.isFunction(method)) {
            throw new Error("Property '" + methodName + "' of Class is not a function - cannot make prebind.");
          } else {
            this[methodName] = method.bind(this);
          }
        }
      }
      this.initialize.apply(this, arguments);
    }

    Object.extend(klass, Class.Methods);
    klass.superclass = parent;
    klass.subclasses = [];

    if (parent) {
      Subclass.prototype = parent.prototype;
      klass.prototype = new Subclass();
      parent.subclasses.push(klass);
    }

    // collecting the list of ancestors
    klass.ancestors = [];
    while (parent) {
      klass.ancestors.push(parent);
      parent = parent.superclass;
    }

    // handling the module injections
    for (i = 0; i < length; i++) {
      if (Object.isArray(modules[i].extend)) {
        klass.extend.apply(klass, modules[i].extend);
      }
      if (Object.isArray(modules[i].include)) {
        klass.include.apply(klass, modules[i].include);
      }
    }

    modules.each(includeModule, klass);
    //for (i = 0; i < length; i++) {klass.includeModule(modules[i]);}
    //klass.include.apply(klass, modules);

    // default initialize method
    if (!klass.prototype.initialize) {
      klass.prototype.initialize = Prototype.emptyFunction;
    }

    klass.prototype.constructor = klass;
    return klass;
  };

  // add new class methods to already existing classes
  [PeriodicalExecuter, Template, Hash, ObjectRange, //
    Ajax.Base, Ajax.Request, Ajax.Response, Ajax.Updater, Ajax.PeriodicalUpdater, //
    Element.Layout, Element.Offset, Abstract.TimedObserver, Form.Element.Observer, //
    Form.Observer, Abstract.EventObserver, Form.Element.EventObserver, //
    Form.EventObserver, Event.Handler].each(function (module) {
      Object.extend(module, Class.Methods);
    });
})();
Prototype.HTML5Features = (function() {
  var n = navigator, w = window, SessionStorage = false; // d = document, e;
  try {
    SessionStorage = !!w.sessionStorage;
  } catch (e) {
    // "Operation is not supported" code: "9"
    // nsresult: "0x80530009 (NS_ERROR_DOM_NOT_SUPPORTED_ERR)"
    // in Firefox 3.6 for local file
  }

  return {
    ApplicationCache: !!w.applicationCache,
    //Audio: !!(e = d.createElement("audio") && e.canPlayType),
    Audio: !!window.Audio && new Audio().canPlayType,
    //Canvas: !!(e = d.createElement("canvas") && e.getContext && e.getContext("2d")),
    GeoLocation: !!n.geolocation,
    History: !!(w.history && history.pushState),
    LocalStorage: !!w.localStorage,
    OpenDatabase: !!w.openDatabase,
    PostMessage: !!w.postMessage,
    SessionStorage: SessionStorage,
    Touch: !!w.ontouchstart,
    Worker: !!w.Worker
  };
})();

/**
 * Extension for Prototype.Browser: IE6 sniffing.
 */
if (Object.isUndefined(Prototype.Browser.IE6)) {
  // IE7+ may return "MSIE 6.0" but will have XMLHttpRequest
  Prototype.Browser.IE6 = (navigator.appName.indexOf("Microsoft Internet Explorer") != -1 && navigator.appVersion.indexOf("MSIE 6.0") != -1 && !window.XMLHttpRequest);
  //Prototype.Browser.IE = /*@cc_on!@*/false;
  //Prototype.Browser.IE6 = false /*@cc_on || @_jscript_version < 5.7 @*/;
  //Prototype.Browser.IE7 = false /*@cc_on || @_jscript_version == 5.7 @*/;
  //Prototype.Browser.IEgte7 = false /*@cc_on || @_jscript_version >= 5.7 @*/;
}

if (Prototype.Browser.IE6) {
  try {
    document.execCommand("BackgroundImageCache", false, true);
  } catch (e) {
    // ignore
  }
}
/**
 * Extensions for Math, Number: constrain, random.
 */
(function() {
  /**
   * Constrain number. Order of min and max arguments does not matter. Usage:
   *   Math.constrain(x, 0, 100) // return 0 if x<0, 100 if x>100, x otherwise
   *   Math.constrain(x, 100, 0) // the same
   *   x.constrain(xmin, xmax)
   *
   * @param {Number} number
   * @param {Number} min - minimum bound
   * @param {Number} max - maximum bound
   * @return number between minimum and maximum bound (both inclusive)
   */
  function constrain(number, min, max) {
    return min > max ? constrain(number, max, min) : number > max ? max : number < min ? min : parseFloat(number);
  }


  Math.constrain = constrain;
  Number.prototype.constrain = function(min, max) {
    //return min > max ? constrain(this, max, min) : this > max ? max : this < min ? min : parseFloat(this);
    return constrain(this, min, max);
  };

  var original_random = Math.random;
  /**
   * Extended random number generator. Usage:
   *   Math.random() // same as original random, return float between 0 and 1
   *   Math.random(100) // return integer between 0 and 100 (both inclusive)
   *   Math.random(1, 12) // return integer between 1 and 12 (both inclusive)
   *
   * @param {Number} min - minimum value (2 arguments) or maximum value (1 argument)
   * @param {Number} max - maximum value (2 arguments)
   * @return float [0, 1) for no args, integer [0, min] for 1 arg, integer [min, max] for 2 args
   */
  Math.random = function(min, max) {
    var l = arguments.length, r = original_random();
    return l === 0 ? r : ~~(l === 1 ? (r * (min + 1)) : (r * (max - min + 1) + ~~min));
  };
})();

/**
 * Convert number to pixel value. Convert negative numbers to 0px.
 *
 * @param {Number} number
 */
Number.toPx = function(number) {
  return number > 0 ? (number + "px") : "0px";
  //return (number > 0 ? number : 0) + "px";
};
Number.prototype.toPx = function() {
  return Number.toPx(this);
};


/**
 * Correct null and undefined values.
 *
 * @param {Object} value
 * @param {String} [fix=""] - default value for null or undefined
 */
String.interpret = function(value, fix) {
  return value == null ? fix || "" : (typeof (value) == "string" ? value : "" + value);
};

/**
 * Capitalizes the first letter of a string.
 */
String.prototype.capitalize1st = function() {
  return this.charAt(0).toUpperCase() + this.substring(1);
};


/**
 * Checks whether this is a leap year or not.
 *
 * @param {Number} year
 * @return {Boolean} true if this is a leap year
 */
Date.isLeapYear = function(year) {
  //(year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
};


/**
 * Simplify usage of generic slice on array-like objects.
 *
 * @param {Array|Arguments|NodeList} array - array-like object (usually Arguments or NodeList)
 * @param {Number} [begin=0] - start index (inclusive)
 * @param {Number} [end=array.length] - end index (exclusive)
 * @return {Array} Array which contains items of original object
 */
Array.slice = function(array, begin, end) {
  return Array.prototype.slice.call(array, begin || 0, end || array.length);
};
/**
 * Create a periodical execution of the function with the given timeout in seconds.
 *
 * @param {Number} interval - execution interval in seconds, default 1s
 */
Function.prototype.periodical = function(interval) {
  var args = Array.slice(arguments, 1);
  var timer = new Number(setInterval(this.bind.apply(this, [this].concat(args)), 1000 * (interval || 1)));
  timer.stop = function() {
    clearInterval(this);
  };
  return timer;
};

/**
 * Chain the given function after the current one. Usage:
 *   someFunction.chain(afterFinish)();
 *
 * @param {Function} func - function to execute after the current one
 */
Function.prototype.chain = function(func) {
  var args = Array.slice(arguments, 1), current = this;
  return function() {
    var result = current.apply(current, arguments);
    func.apply(func, args);
    return result;
  };
};

/**
 * Debouncing function from John Hann.
 * http://unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/
 *
 * Debouncing ensures that function is invoked exactly once for an event that may be happening
 * several times over an extended period. As long as the events are occurring fast enough to happen
 * at least once in every detection period, the function will not be invoked.
 *
 * @param {Number} threshold - the detection period in seconds, default 0.1s
 * @param {Boolean} execAsap - whether the signal should happen at the beginning of the detection
 *   period (true) or the end (false)
 *
 * Example uses:
 *
 * // using debounce in a constructor or initialization function to debounce
 * // focus events for a widget (onFocus is the original handler):
 * this.debouncedOnFocus = this.onFocus.debounce(0.5, false);
 * this.inputNode.observe('focus', this.debouncedOnFocus);
 *
 * // to coordinate the debounce of a method for all objects of a certain class, do this:
 * MyClass.prototype.someMethod = function () {
 *   // do something here, but only once
 * }.debounce(0.1, true); // execute at start and use a 100 msec detection period
 *
 * // wait until the user is done moving the mouse, then execute
 * // (using the stand-alone version)
 * document.on('mousemove', function (e) {
 *   // do something here, but only once after mouse cursor stops
 * }.debounce(0.25, false));
 */
Function.prototype.debounce = function(threshold, execAsap) {
  threshold = threshold || 0.1;
  var func = this, timeout;

  return function debounced() {
    var context = this, args = arguments;

    if (timeout) {
      clearTimeout(timeout);
    } else if (execAsap) {
      func.apply(context, args);
    }

    function delayed() {
      if (!execAsap) {
        func.apply(context, args);
      }
      timeout = null;
    }

    timeout = delayed.delay(threshold);
  };
};

/**
 * Limit the rate at which function is executed.
 *
 * @param {Number} delay - A zero-or-greater delay in seconds. For event callbacks, values
 *   around 100 or 250 (or even higher) are most useful. Default is 0.1s.
 * @param {Boolean} noTrailing - Optional, defaults to false. If noTrailing is true, callback will
 *   only execute every `delay` milliseconds while the throttled-function is being called. If
 *   noTrailing is false or unspecified, callback will be executed one final time after the last
 *   throttled-function call (after the throttled-function has not been called for `delay`
 *   milliseconds, the internal counter is reset).
 */
Function.prototype.throttle = function(delay, noTrailing) {
  delay = 1000 * (delay || 0.1);
  var func = this, timeout, lastExec = 0;

  return function wrapper() {
    var context = this, args = arguments, elapsed = +new Date() - lastExec;

    function exec() {
      lastExec = +new Date();
      func.apply(context, args);
    }

    if (timeout) {
      clearTimeout(timeout);
    }

    if (elapsed > delay) {
      exec();
    } else if (noTrailing !== true) {
      // In trailing throttle mode, since `delay` time has not been
      // exceeded, schedule `func` to execute `delay - elapsed` ms
      // after most recent execution.
      timeout = setTimeout(exec, delay - elapsed);
    }
  };
};

Function.prototype.defer = function() {
  var method = this, args = arguments;
  return window.setTimeout(function() {
    return method.apply(method, args);
  }, 10);
};

Function.prototype.wait = function(context) {
  var method = this, args = Array.slice(arguments, 1);
  //var fn = args.length ? function() {return method.apply(context, args);} : function() {return method.call(context);};
  //return window.setTimeout(fn, 10);
  return window.setTimeout(function() {
    return method.apply(context, args);
  }, 10);
};
/**
 * Extensions for Object: type detection methods, conversion from HTML-escaped JSON.
 */
(function() {
  var _toString = Object.prototype.toString;

  function isBoolean(object) {
    return typeof object === "boolean" || _toString.call(object) === "[object Boolean]";
  }

  function isObject(object) {
    return typeof object === "object";
  }

  /**
   * Evaluate HTML-escaped JSON string.
   *
   * Pre-process JSON string (unescape HTML-escaped quotes, double quotes, ampersands;
   * escape CRs, LFs in multiline values) and return evaluated object.
   *
   * @param {String} s - HTML-escaped JSON string
   */
  function fromJSON(s) {
    return s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/&amp;/g, "&").evalJSON();
  }

  Object.extend(Object, {
    isBoolean: isBoolean,
    isObject: isObject,
    fromJSON: fromJSON
  });
})();

/**
 * Provide the XMLHttpRequest for IE.
 * Fix IE XMLHttpRequest doesn't working for local pages ("file:" protocol).
 *
 * http://blogs.msdn.com/xmlteam/archive/2006/10/23/using-the-right-version-of-msxml-in-internet-explorer.aspx
 *
 * @return {Function} XMLHttpRequest
 */
Ajax.getTransport = function() {
  var XMLHttpFactories = [
  function() {
    return new XMLHttpRequest();
  },
  function() {
    return new ActiveXObject("Msxml2.XMLHTTP.6.0");
  },
  function() {
    return new ActiveXObject("Msxml2.XMLHTTP.3.0");
  },
  function() {
    return new ActiveXObject("Msxml2.XMLHTTP");
  },
  function() {
    return new XMLHttpRequest();
  }];

  var factory, transport, i = (Prototype.Browser.IE && location.protocol === "file:") ? 1 : 0;
  while (i < XMLHttpFactories.length) {
    try {
      factory = XMLHttpFactories[i++];
      transport = factory();
      // Use memoization to cache the factory
      Ajax.getTransport = factory;
      return transport;
    } catch (e) {
      // ignore
    }
  }

  return null;
};


Ajax.Responders.register({
  onCreate: function(request) {
    request.createdTime = new Date().getTime();
  }
});


Ajax.Request.addMethods({
  aborted: false,
  abortedState: false,

  /**
   * Abort request.
   */
  abort: function() {
    if (this._complete) {
      return false;
    }
    this.transport.onreadystatechange = Prototype.emptyFunction;
    this.aborted = true;
    this.abortedState = this.transport.readyState;

    try {
      this.transport.abort();
    } catch (e) {
      this.dispatchException(e);
      return false;
    }

    this.respondToReadyState(this.transport.readyState);
    return true;
  },

  success: function() {
    var status = this.getStatus();
    return !status || !this.aborted && (status >= 200 && status < 300 || status == 304);
  },

  isScriptContentType: function(response) {
    var contentType = response.getHeader('Content-Type');
    return contentType && contentType.match(/^\s*(text|application)\/(x-)?(java|ecma)script(;.*)?\s*$/i);
  },

  /**
   * Allows additional Ajax.Responders `onAbort`, `onSuccess` and `onFailure`.
   *
   * Full list of guaranteed responders:
   * `onCreate`, `onException`, `onAbort`, `onSuccess`, `onFailure`, `onComplete`.
   *
   * @param {Number} readyState
   */
  respondToReadyState: function(readyState) {
    if (this._complete) {
      return;
    }
    var state = Ajax.Request.Events[readyState], callbacks = [], response = new Ajax.Response(this);

    if (this.aborted) {
      state = 'Complete';
      callbacks.push('Abort');
      this._complete = true;
      //callbacks.push('Failure');
    } else if (state == 'Complete') {
      this._complete = true;
      callbacks.push(response.status);
      callbacks.push(this.success() ? 'Success' : 'Failure');

      // avoid memory leak in MSIE: clean up
      this.transport.onreadystatechange = Prototype.emptyFunction;

      if (this.options.evalJS == 'force' || (this.options.evalJS && this.isSameOrigin() && this.isScriptContentType(response))) {
        this.evalResponse();
      }
    }

    callbacks.push(state);
    callbacks.each(function(state) {
      try {
        (this.options['on' + state] || Prototype.emptyFunction)(response, response.headerJSON);
        Ajax.Responders.dispatch('on' + state, this, response, response.headerJSON);
      } catch (e) {
        this.dispatchException(e);
      }
    }, this);
  }
});


Ajax.Response.addMethods({
  initialize: function(request) {
    this.request = request;
    this.transport = request.transport;
    this.readyState = this.transport.readyState;
    this.aborted = request.aborted;

    if (this.aborted) {
      this.readyState = request.abortedState; // ? this.transport.readyState;
      this.status = (this.readyState == 2 || this.readyState == 3) ? this.getStatus() : 0;
    } else if ((this.readyState > 2 && !Prototype.Browser.IE) || this.readyState == 4) {
      this.status = this.getStatus();
      this.statusText = this.getStatusText();
      this.headerJSON = this._getHeaderJSON();

      if (this.readyState == 4 || request.options.onInteractive) {
        this.responseText = String.interpret(this.transport.responseText);
      }

      if (this.readyState == 4) {
        var xml = this.transport.responseXML;
        this.responseXML = Object.isUndefined(xml) ? null : xml;
        this.responseJSON = this._getResponseJSON();
      }
    }
  }
});


/**
 * Options:
 *   evalScripts - evaluate scripts in response (default true)
 *   clearTarget - clear container before request (default true)
 *   showLoading - show loading state on container (default true)
 *   loadingClass - CSS class for loading state (default "loading")
 */
Ajax.Updater.addMethods({
  initialize: function($super, container, url, options) {
    this.container = {
      success: (container.success || container),
      failure: (container.failure || (container.success ? null : container))
    };

    options = Object.extend({
      evalScripts: true,
      clearTarget: true,
      showLoading: true,
      loadingClass: "loading"
    }, Object.clone(options));

    options._onCreate = options.onCreate || Prototype.emptyFunction;
    options._onComplete = options.onComplete || Prototype.emptyFunction;
    options.onCreate = this.onCreate.bind(this);
    options.onComplete = this.onComplete.bind(this);

    $super(url, options);
  },

  onCreate: function(response) {
    var target = $(this.container.success), o = this.options;
    if (target) {
      if (o.clearTarget) {
        target.update();
      }
      if (o.showLoading) {
        target.addClassName(o.loadingClass);
      }
    }
    o._onCreate(response);
  },

  onComplete: function(response, json) {
    if (this.updateAllowed()) {
      this.updateContent(response.responseText);
    }
    var target = $(this.container.success), o = this.options;
    if (target && o.showLoading) {
      target.removeClassName(o.loadingClass);
    }
    o._onComplete(response, json);
  },

  updateAllowed: function() {
    if (this.aborted) {
      return false;
    }

    var receiver = $(this.container[this.success() ? 'success' : 'failure']);
    if (!receiver || this.createdTime < receiver.retrieve("ajax_updater_time", 0)) {
      return false;
    }

    receiver.store("ajax_updater_time", this.createdTime);
    return true;
  }
});


/**
 * Periodically performs an Ajax request.
 *
 * @param {String} url
 * @param {Object} options - parameters:
 *   period          - period between requests in seconds (optional, default = 2s)
 *   initialDelay    - delay before first request in seconds (optional, default = 0.01s)
 *   onBeforeRequest - called before each request,
 *                     request will be skipped if callback returns false
 *   onComplete      - called after each successful request
 */
Ajax.PeriodicalRequest = Class.create(Ajax.Base, {
  prebind: ["start", "requestComplete"],
  initialize: function($super, url, options) {
    $super(options);
    var o = this.options;
    this.period = o.period || 2;
    this.request = {};
    this.url = url;
    this.onBeforeRequest = o.onBeforeRequest || Prototype.emptyFunction;
    this.onComplete = o.onComplete || Prototype.emptyFunction;
    o.onComplete = this.requestComplete;
    this.timer = this.start.delay(o.initialDelay || 0.01);
  },

  /**
   * Ajax.PeriodicalRequest#start() -> undefined
   *
   * Starts the periodical request (if it had previously been stopped with
   * Ajax.PeriodicalRequest#stop).
   *
   * Request will be skipped if the `onBeforeRequest` callback returned false.
   */
  start: function() {
    if (this.onBeforeRequest() === false) {
      this.request = {};
      this.requestComplete(this.request);
    } else {
      this.request = new Ajax.Request(this.url, this.options);
    }
  },

  /**
   * Ajax.PeriodicalRequest#stop() -> undefined
   *
   * Stops the periodical request.
   *
   * Also calls the `onComplete` callback, if one has been defined.
   */
  stop: function() {
    if (this.request.options) {
      this.request.options.onComplete = undefined;
    }
    clearTimeout(this.timer);
    this.onComplete.apply(this, arguments);
  },

  requestComplete: function(response) {
    this.timer = this.start.delay(this.period);
  }
});

/**
 * Null-safe Element.remove.
 * Recursive cleanWhitespace.
 * Extensions for Element:
 *   fitToParent, isVisible, insertInto, getOuterHTML, getScrollParent, moveBy, load, attr.
 * Requires element-style.js.
 */
(function () {
  function fitToParent(element, wgap, hgap) {
    element = $(element);
    if (element) {
      // FIXME bug in IE for absolutely positioned elements eo = element.*Offset() gives wrong result
      var p = element.up() /* , pd = p.getDimensions(),*/;
      //var po = p.cumulativeOffset(), eo = element.cumulativeOffset();
      var po = p.viewportOffset(), eo = element.viewportOffset();
      var w = po.left + p.getIntStyles("border-left-width", "padding-left", "width") - (eo.left + element.getIntStyles("border-left-width", "border-right-width", "padding-left", "padding-right", "margin-right") + (wgap || 0));
      var h = po.top + p.getIntStyles("border-top-width", "padding-top", "height") - (eo.top + element.getIntStyles("border-top-width", "border-bottom-width", "padding-top", "padding-bottom", "margin-bottom") + (hgap || 0));
      element.setStyle({
        width: w + "px",
        height: h + "px"
      });
    }
    return element;
  }

  function remove(element) {
    element = $(element);
    var parent = element.parentNode;
    if (parent) {
      parent.removeChild(element);
    }
    return element;
  }

  // var getStyle = Element.getStyle;
  var getStyle = Prototype.Browser.IE ? (function getStyleIE(element, style) {
    return element.style[style] || (element.currentStyle ? element.currentStyle[style] : null);
  }) : (function getStyleDOM(element, style) {
    var value = element.style[style];
    if (!value || value == 'auto') {
      var css = document.defaultView.getComputedStyle(element, null);
      return css ? css[style] : null;
    }
    return value;
  });

  /**
   * Test if element is visible. Element is not visible if:
   *   - element is detached from document;
   *   - element or one of its parent nodes has style display:none;
   *   - element or one of its parent nodes has style visibility:hidden
   *
   * @param {HTMLElement,String} element
   * @return {Boolean} false if element is not visible
   */
  function isVisible(element) {
    if (element === window) {
      // assume window is always visible
      return true;
    }
    element = $(element);
    //return (element.offsetWidth && element.offsetHeight) || (element.clientWidth && element.clientHeight);
    if (!element) {
      return false;
    }
    while (true) {
      if (element === document.body || element === document.documentElement || element === window) {
        return true;
      }
      var parent = element.parentNode;
      if (!parent || getStyle(element, 'display') === 'none' || getStyle(element, 'visibility') === 'hidden') {
        return false;
      }
      element = parent;
    }
  }

  function insertInto(element, target, position) {
    element = $(element);
    var insertion = {};
    insertion[position || "bottom"] = element;
    Element.insert(target, insertion);
    return element;
  }

  /**
   * Recursive cleanWhitespace.
   * FIXME invoke cleanWhitespace recursively only for nested block elements
   * div|dl|fieldset|form|h[1-6]|ol|p|ul
   * table|tbody|td|tfoot|th|thead|tr
   *
   * @param {Element/String} element
   * @param {Boolean} recursive
   */
  function cleanWhitespace(element, recursive) {
    element = $(element);
    var node = element.firstChild;
    while (node) {
      var nextNode = node.nextSibling;
      if (node.nodeType == 3 && !(/\S/).test(node.nodeValue)) {
        element.removeChild(node);
      } else if (recursive && node.nodeType == 1) {
        cleanWhitespace(node, true);
      }
      node = nextNode;
    }
    return element;
  }

  function getOuterHTML(element) {
    return $(element).outerHTML;
  }

  function getSimulatedOuterHTML(element) {
    element = $(element);
    var attrs = [], tag = element.tagName.toLowerCase(), outerHTML = '<' + tag;

    for (var a, i = 0, len = element.attributes.length; i < len; ++i) {
      a = element.attributes[i];
      attrs.push(a.nodeName + '="' + a.nodeValue + '"');
    }
    if (attrs.length > 0) {
      outerHTML += ' ' + attrs.join(' ');
    }

    if (/*element.childNodes.length === 0 && */
      (/br|hr|img|input|link|meta|param/).test(tag)) {
      outerHTML += '>';
    } else {
      outerHTML += '>' + element.innerHTML + '<' + '/' + tag + '>';
    }
    return outerHTML;
  }

  function getScrollParent(element) {
    for (var parent = element.parentNode; parent; parent = parent.parentNode) {
      //var o = Element.getStyle(parent, "overflow");
      //if (!o || o == "scroll") {return parent;}
      if (parent.scrollHeight > parent.offsetHeight) {
        parent = $(parent);
        var overflow = Element.getStyle(parent, "overflow");
        if (!overflow || overflow == "scroll") {
          // overflow:auto, overflow:scroll
          return parent;
        }
      }
    }
    return $(document.documentElement || document.body);
  }

  function moveBy(element, dx, dy) {
    element = $(element);
    if (element) {
      var left, top;
      if (dx) {
        left = (/^(-?\d+(\.\d+)?)(.+)$/).exec(element.getStyle("left"));
      }
      if (dy) {
        top = (/^(-?\d+(\.\d+)?)(.+)$/).exec(element.getStyle("top"));
      }
      if (dx && left) {
        element.style.left = dx + parseFloat(left[1]) + left[3];
      }
      if (dy && top) {
        element.style.top = dy + parseFloat(top[1]) + top[3];
      }
      /*
       if (dx || dy) {
       var offset = element.positionedOffset();
       if (dx && offset.left) {
       element.style.left = dx + offset.left + "px";
       }
       if (dy && offset.top) {
       element.style.top = dy + offset.top + "px";
       }
       }
       */
    }
    return element;
  }

  function load(element, url, options) {
    element = $(element);
    new Ajax.Updater(element, url, options);
    return element;
  }

  function attr(element, name, value) {
    if (arguments.length === 3 || typeof name === 'object') {
      return Element.writeAttribute(element, name, value);
    } else {
      return Element.readAttribute(element, name);
    }
  }


  Object.extend(Element.Methods, {
    fitToParent: fitToParent,
    remove: remove,
    isVisible: isVisible,
    insertInto: insertInto,
    cleanWhitespace: cleanWhitespace,
    getOuterHTML: document.createElement("a").outerHTML ? getOuterHTML : getSimulatedOuterHTML,
    getScrollParent: getScrollParent,
    moveBy: moveBy,
    load: load,
    attr: attr
  });
})();


Element.focus = function (element) {
  element = $(element);
  if (element && element.focus) {
    try {
      element.focus();
    } catch (e) {
      // IE can throw error for invisible element
    }
  }
  return element;
};


/**
 * Smooth update of DOM subtree.
 */
(function () {
  var ELEMENT = Node.ELEMENT_NODE, TEXT = Node.TEXT_NODE;

  // TODO compare all attributes?
  function compareElements(e1, e2) {
    return e1.tagName === e2.tagName && e1.id === e2.id;
  }

  function fillSrcAttributes(attributes, attrs) {
    for (var i = 0, len = attributes.length; i < len; ++i) {
      var attr = attributes[i];
      if (attr.nodeValue) {
        attrs[attr.nodeName] = attr.nodeValue;
      }
    }
    return len;
  }

  function fillDstAttributes(attributes, attrs) {
    for (var i = 0, len = attributes.length; i < len; ++i) {
      // clear existing dst attributes
      // when corresponding src attribute is undefined
      attrs[attributes[i].nodeName] = null;
    }
    return len;
  }

  function writeAttributes(element, attributes) {
    for (var attr in attributes) {
      var value = attributes[attr];
      if (attr === "checked") {
        element.checked = !!value;
      } else if (attr === "style" && value) {
        element.style.cssText = value/* || "" */;
      } else if (value === false || value === null) {
        element.removeAttribute(attr);
      } else if (value === true) {
        element.setAttribute(attr, attr);
      } else {
        element.setAttribute(attr, value);
      }
    }
  }

  function copyAttributes(src, dst) {
    var attrs = {};
    var len = fillDstAttributes(dst.attributes, attrs) + fillSrcAttributes(src.attributes, attrs);
    if (len > 0) {
      //Element.writeAttribute(dst, attrs);
      writeAttributes(dst, attrs);
    }
  }

  function updateElementNode(sNode, dNode, options) {
    copyAttributes(sNode, dNode);
    // recursion
    if (options.deferred) {
      updateNodes.defer(sNode, dNode, options);
    } else {
      updateNodes(sNode, dNode, options);
    }
    return {
      s: sNode.nextSibling,
      d: dNode.nextSibling
    };
  }

  function updateTextNode(sNode, dNode) {
    if (dNode.nodeValue !== sNode.nodeValue) {
      // replace node value
      dNode.nodeValue = sNode.nodeValue;
    }
    return {
      s: sNode.nextSibling,
      d: dNode.nextSibling
    };
  }

  /**
   * Replace dst.dNode with src.sNode.
   *
   * @param {Node} src - source tree
   * @param {Node} sNode - node in source tree (will be removed and purged)
   * @param {Node} dst - destination tree
   * @param {Node} dNode - node in destination tree (will be moved to src)
   */
  function replaceNode(src, sNode, dst, dNode) {
    //var sNext = sNode.nextSibling;
    var next = {
      s: sNode.nextSibling,
      d: dNode.nextSibling
    };
    src.removeChild(sNode);
    if (dNode.nodeType === ELEMENT) {
      Element.purge(dNode);
    }
    dst.replaceChild(sNode, dNode);
    //return {s: sNext, d: sNode.nextSibling};
    return next;
  }

  function removeDstNode(src, sNode, dst, dNode) {
    var next = dNode.nextSibling;
    if (dNode.nodeType === ELEMENT) {
      Element.purge(dNode);
    }
    dst.removeChild(dNode);
    return {
      s: sNode,
      d: next
    };
  }

  //before: dst.insertBefore(node, element);
  //top: element.insertBefore(node, element.firstChild);
  //bottom: element.appendChild(node);
  //after: dst.insertBefore(node, element.nextSibling);

  /**
   * Copy contents of node.
   *
   * @param {Node} src - source node
   * @param {Node} dst - destination node
   * @param {Object} options - options (unused)
   */
  function updateNodes(src, dst, options) {
    // do not use innerHTML - looking into each nodeType/nodeValue is much faster
    // if (dst.innerHTML === src.innerHTML) {return;}

    var node = {
      s: src.firstChild,
      d: dst.firstChild
    }, next, dType;

    while (node.d && node.s) {
      // skip nodes other than element and text
      dType = node.d.nodeType;
      if (dType !== ELEMENT && dType !== TEXT) {
        node.d = node.d.nextSibling;
        continue;
      }

      switch (node.s.nodeType) {
        case ELEMENT:
          if (dType === ELEMENT) {
            if (compareElements(node.s, node.d)) {
              // node.s -> node.d
              node = updateElementNode(node.s, node.d, options);
              break;
            }

            // guess node insertion
            next = node.s.nextSibling;
            if (next && next.nodeType === ELEMENT && compareElements(next, node.d)) {
              // node.s -> before node.d
              // node.s.next -> node.d
              src.removeChild(node.s);
              dst.insertBefore(node.s, node.d);
              node = updateElementNode(next, node.d, options);
              break;
            }
          }

          // guess node deletion
          next = node.d.nextSibling;
          if (next && next.nodeType === ELEMENT && compareElements(node.s, next)) {
            // node.s -> node.d.next
            // delete node.d
            node = removeDstNode(src, node.s, dst, node.d);
            node = updateElementNode(node.s, node.d, options);
            break;
          }

          // node.s -> node.d
          node = replaceNode(src, node.s, dst, node.d);
          break;

        case TEXT:
          if (dType === TEXT) {
            // node.s.nodeValue -> node.d.nodeValue
            node = updateTextNode(node.s, node.d);
            /*
             if (node.d.nodeValue !== node.s.nodeValue) {
             node.d.nodeValue = node.s.nodeValue;
             }
             node.s = node.s.nextSibling;
             node.d = node.d.nextSibling;
             */
          } else {
            // node.s -> node.d
            node = replaceNode(src, node.s, dst, node.d);
          }
          break;

        default:
          node.s = node.s.nextSibling;
          break;
      }
    }

    while (node.d) {
      // trim extra destination nodes
      node = removeDstNode(src, node.s, dst, node.d);
    }

    while (node.s) {
      // append extra source nodes
      next = node.s.nextSibling;
      src.removeChild(node.s);
      dst.appendChild(node.s);
      node.s = next;
    }

    node.d = node.s = next = null;
    src = null;
  }

  function updateSmoothly(element, content, options) {
    element = $(element);
    if (content && content.toElement) {
      content = content.toElement();
      // content is Element now
    } else if (!Object.isElement(content)) {
      content = Object.toHTML(content);
      // content is String now
      content.evalScripts.bind(content).defer();
      content = content.stripScripts();
    }
    content = new Element("div").update(content);
    //options = options || {};
    updateNodes(content, element, options || {});
    //if (!options.deferred) {content.innerHTML = '';}
    //content = null;
    return element;
  }


  Element.Methods.updateSmoothly = updateSmoothly;
})();

/**
 * Optimization of Element.next, Element.previous, Element.up.
 */
(function() {
  // Use the Element Traversal API if available
  var nextElement = 'nextElementSibling', previousElement = 'previousElementSibling';
  var parentElement = 'parentElement', childElements = 'children';

  // Fall back to the DOM Level 1 API
  var root = document.documentElement;
  if (!(nextElement in root)) {
    nextElement = 'nextSibling';
  }
  if (!(previousElement in root)) {
    previousElement = 'previousSibling';
  }
  if (!(parentElement in root)) {
    parentElement = 'parentNode';
  }
  if (!(childElements in root)) {
    childElements = 'childNodes';
  }

  var EmptySelector = {
    match: function() {
      return true;
    }
  };

  /**
   * Traverse elements.
   *
   * @param {Element} element - element to traverse from
   * @param {String} method - traversal method (next|previous)(Element)?Sibling, parent(Element|Node)
   * @param {String} expression - CSS expression
   * @param {Number} [index=0] - index (starting from 0)
   */
  function traverse(element, method, expression, index) {
    element = $(element);
    if (Object.isNumber(expression)) {
      index = expression;
      expression = null;
    }
    if (!Object.isNumber(index)) {
      index = 0;
    }
    var node = element[method], selector = expression ? Prototype.Selector : EmptySelector;
    while (node) {
      if (node.nodeType === 1 && selector.match(node, expression) && (index-- === 0)) {
        return Element.extend(node);
      }
      node = node[method];
    }
    //return undefined;
  }

  function next(element, expression, index) {
    return traverse(element, nextElement, expression, index);
  }

  function previous(element, expression, index) {
    return traverse(element, previousElement, expression, index);
  }

  function up(element, expression, index) {
    return (arguments.length == 1) ? Element.extend($(element).parentNode) : traverse(element, parentElement, expression, index);
  }

  Object.extend(Element.Methods, {
    next: next,
    previous: previous,
    up: up
  });
})();


/**
 * Extensions for Element:
 *   lastDescendant, getFocusableElements, getSuccessfulElements.
 */
(function() {
  function lastDescendant(element) {
    element = $(element).lastChild;
    while (element && element.nodeType != 1) {
      element = element.previousSibling;
    }
    return $(element);
  }

  function isFocusable(element) {
    var tagName = element.tagName;
    return tagName && !element.disabled && "hidden" != element.type &&
    (/^(?:a|input|select|textarea|button)$/i).test(tagName);
  }

  /**
   * Element#getFocusableElements(@root) -> Array
   *
   * Return array of elements which under some circumstances may have focus.
   *
   * @param {Element} root
   */
  // TODO focusable: area|frame|iframe|label|html|object
  function getFocusableElements(root) {
    var elements = $(root).getElementsByTagName('*'), element, arr = [], i = 0;
    while (element = elements[i++]) {
      if (isFocusable(element)) {
        arr.push(Element.extend(element));
      }
    }
    return arr;
  }

  function getFirstFocusableElement(root) {
    var focusableElements = getFocusableElements(root);
    if (focusableElements.length > 0) {
      return focusableElements.find(function(el) {
        return el.autofocus; // el.hasAttribute("autofocus")
      }) || focusableElements.find(function(el) {
        return el.tabIndex == 1;
      }) || focusableElements.first();
    }
  }

  /**
   * Element#getSuccessfulElements(@form) -> Array
   *
   * @param {Element} form
   */
  function getSuccessfulElements(form) {
    var elements = $(form).getElementsByTagName('*'), element, arr = [], i = 0;
    var serializers = Field.Serializers;
    while (element = elements[i++]) {
      if (!element.disabled && element.name && serializers[element.tagName.toLowerCase()]) {
        arr.push(Element.extend(element));
      }
    }
    return arr;
  }

  Object.extend(Element.Methods, {
    lastDescendant: lastDescendant,
    getFocusableElements: getFocusableElements,
    getFirstFocusableElement: getFirstFocusableElement,
    getSuccessfulElements: getSuccessfulElements
  });
})();

/**
 * Extensions for Element: calculate element margins/borders/paddings as numbers.
 *
 * @deprecated use Element#measure() or Element.Layout.
 */
(function() {
  function parseIntStyle(value) {
    value = parseInt(value || 0, 10);
    return isNaN(value) ? 0 : value;
  }

  /**
   * Return sum of integer style values.
   *
   * @param {Element/String} element
   * @param {String} style ... - name(s) of style property (properties)
   * @return {Number} value or 0 if value cannot be computed/parsed
   */
  var getIntStyles = function(element, style) { // stub
    return 0;
  };

  /**
   * Return integer value of style property.
   *
   * @param {Element/String} element
   * @param {String} style - name of style property
   * @return {Number} value or 0 if value cannot be computed/parsed
   */
  var getIntStyle = function(element, style) { // stub
    return 0;
  };

  // browser-specific integer style retrieval
  if (document.defaultView && document.defaultView.getComputedStyle) { // W3C
    getIntStyles = function(element) {
      element = $(element);
      var arg, value, style = element.style, css, sum = 0;
      for (var i = 1, len = arguments.length; i < len; ++i) {
        arg = arguments[i].camelize();
        value = style[arg];
        if (!value || value == 'auto') {
          css = css || document.defaultView.getComputedStyle(element, null);
          value = css ? css[arg] : 0;
        }
        sum += parseIntStyle(value);
      }
      return sum;
    };
    getIntStyle = function(element, style) {
      element = $(element);
      style = style.camelize();
      var value = element.style[style];
      if (!value || value == 'auto') {
        var css = document.defaultView.getComputedStyle(element, null);
        value = css ? css[style] : 0;
      }
      return parseIntStyle(value);
    };
  } else if (document.documentElement.currentStyle) { // IE
    getIntStyles = function(element) {
      element = $(element);
      var arg, value, style = element.style, currentStyle = element.currentStyle, display = style.display || currentStyle.display, sum = 0;
      for (var i = 1, len = arguments.length; i < len; ++i) {
        arg = arguments[i].camelize();
        value = style[arg] || currentStyle[arg];
        if (value == 'auto') {
          if ((arg == 'width' || arg == 'height' || arg == 'left' || arg == 'top') && (display != 'none')) {
            sum += parseIntStyle(element['offset' + arg.capitalize()]);
          }
        } else {
          sum += parseIntStyle(value);
        }
      }
      return sum;
    };
    getIntStyle = function(element, style) {
      element = $(element);
      style = style.camelize();
      var value = element.style[style] || element.currentStyle[style];
      if (value == 'auto') {
        if ((style == 'width' || style == 'height' || style == 'left' || style == 'top') && (Element.getStyle(element, 'display') != 'none')) {
          return parseIntStyle(element['offset' + style.capitalize()]);
        }
        return 0;
      }
      return parseIntStyle(value);
    };
  }

  /**
   * Return full padding width (margin + border + padding) of element.
   *
   * @param {Element/String} element
   * @return {Number} full padding width
   */
  function getFullPaddingWidth(element) {
    //element = $(element);
    //return getFullPadding(element, "left") + getFullPadding(element, "right");
    return getIntStyles(element, "padding-left", "border-left-width", "margin-left", "padding-right", "border-right-width", "margin-right");
  }

  /**
   * Return full padding height (margin + border + padding) of element.
   *
   * @param {Element/String} element
   * @return {Number} full padding height
   */
  function getFullPaddingHeight(element) {
    //element = $(element);
    //return getFullPadding(element, "top") + getFullPadding(element, "bottom");
    return getIntStyles(element, "padding-top", "border-top-width", "margin-top", "padding-bottom", "border-bottom-width", "margin-bottom");
  }

  Object.extend(Element.Methods, {
    getIntStyle: getIntStyle,
    getIntStyles: getIntStyles,
    getFullPaddingWidth: getFullPaddingWidth,
    getFullPaddingHeight: getFullPaddingHeight
  });
})();

/**
 * Extensions for Element of type IMG or CANVAS: rotate and scale image.
 *
 * Rotate image (IMG or CANVAS element).
 * Usage: $("idImage").rotate(180); $("idImage").rotateLeft(45); $("idImage").rotateRight();
 * Invoked on: Image, Canvas
 */
(function() {
  function init(e) {
    e = $(e);
    if (!e.original) {
      e.original = {
        w: e.width,
        h: e.height,
        angle: 0,
        zoom: 1,
        img: new Image(),
        loaded: false
      };
      e.original.img.onload = (function() {
        this.loaded = true;
      }).bind(e.original);
      e.original.img.src = e.src;
    }
    return e;
  }

  function call(callback, e) {
    if (Object.isFunction(callback)) {
      //callback.defer(e);
      callback(e);
    }
  }

  function updateSize(e, w, h) {
    // TODO remove debug messages
    if (!w || !h) {
      if (window.console && console.log) {
        console.log("Image#updateSize: w=" + w + " h=" + h);
        if (window.printStackTrace) {
          console.log("Stack trace:\n" + window.printStackTrace().join('\n'));
        }
      } else {
        alert("Image#updateSize: w=" + w + " h=" + h);
        if (window.printStackTrace) {
          alert("Stack trace:\n" + window.printStackTrace().join('\n'));
        }
      }
    }

    e.width = w;
    e.style.width = w + "px";
    e.height = h;
    e.style.height = h + "px";
    return e;
  }

  function updateAngle(e, angle, absolute) {
    e.original.angle = (angle + 360 + (absolute ? 0 : e.original.angle)) % 360;
    return e;
  }

  function updateImgIe(e, callback) {
    var rotation = Math.PI * e.original.angle / 180;
    var costheta = Math.cos(rotation), sintheta = Math.sin(rotation);
    /*var canvas = new Element("img", {
     id: e.id,
     src: e.src,
     height: e.height,
     width: e.width,
     style: "filter:progid:DXImageTransform.Microsoft.Matrix(M11=" + costheta + ",M12=" + (-sintheta) + ",M21=" + sintheta + ",M22=" + costheta + ",SizingMethod='auto expand')"
     });
     canvas.angle = e.angle;
     e.replace(canvas);*/
    e.style.filter = "progid:DXImageTransform.Microsoft.Matrix(M11=" + costheta + ",M12=" + (-sintheta) + ",M21=" + sintheta + ",M22=" + costheta + ",SizingMethod='auto expand')";
    call(callback, e);
    return e;
  }

  function updateCanvas(canvas, callback) {
    if (!canvas.original.loaded) { // canvas.original.img.complete
      updateCanvas.defer(canvas, callback);
      return canvas;
    }
    var rotation = Math.PI * canvas.original.angle / 180;
    var costheta = Math.cos(rotation), sintheta = Math.sin(rotation);
    var w = canvas.original.w * canvas.original.zoom, h = canvas.original.h * canvas.original.zoom;
    var cw = costheta * w, ch = costheta * h, sw = sintheta * w, sh = sintheta * h;
    updateSize(canvas, Math.abs(cw) + Math.abs(sh), Math.abs(ch) + Math.abs(sw));

    var context = canvas.getContext("2d");
    context.save();
    if (rotation <= Math.PI / 2) {
      context.translate(sh, 0);
    } else if (rotation <= Math.PI) {
      context.translate(canvas.width, -ch);
    } else if (rotation <= 1.5 * Math.PI) {
      context.translate(-cw, canvas.height);
    } else {
      context.translate(0, -sw);
    }
    context.rotate(rotation);
    context.drawImage(canvas.original.img, 0, 0, w, h);
    context.restore();
    call(callback, canvas);
    return canvas;
  }

  function rotateImgIe(e, angle, absolute, callback) {
    return updateImgIe(updateAngle(init(e), angle, absolute), callback);
  }

  function rotateImg(e, angle, absolute, callback) {
    e = init(e);
    if (angle === 0) { // do not create canvas
      call(callback, e);
      return e;
    }
    var canvas = new Element("canvas", {
      id: e.id,
      className: e.className
    });
    canvas.original = e.original;
    updateCanvas(updateAngle(canvas, angle, absolute), callback);

    //e.replace(canvas);
    var p = e.parentNode;
    if (p) {
      p.replaceChild(canvas, e);
    }
    return canvas;
  }

  function rotateCanvas(e, angle, absolute, callback) {
    return updateCanvas(updateAngle(init(e), angle, absolute), callback);
  }

  function rotateLeft(e, angle) {
    return $(e).rotate(-1 * (angle || 90));
  }
  function rotateRight(e, angle) {
    return $(e).rotate(angle || 90);
  }

  function zoomImg(e, zoom) {
    e = init(e);
    e.original.zoom = zoom;
    return updateSize(e, e.original.w * zoom, e.original.h * zoom);
  }

  function zoomCanvas(e, zoom) {
    e = init(e);
    e.original.zoom = zoom;
    return updateCanvas(e);
  }

  function zoomAndRotateImgIe(e, zoom, angle, absolute, callback) {
    return updateImgIe(updateAngle(zoomImg(e, zoom), angle, absolute), callback);
  }

  function zoomAndRotateImg(e, zoom, angle, absolute, callback) {
    if (angle === 0) { // zoom only - do not create canvas
      zoomImg(e, zoom);
      call(callback, e);
      return e;
    }
    e = init(e);
    e.original.zoom = zoom;
    var canvas = new Element("canvas", {
      id: e.id,
      className: e.className
    });
    canvas.original = e.original;
    updateCanvas(updateAngle(canvas, angle, absolute), callback);

    //e.replace(canvas);
    var p = e.parentNode;
    if (p) {
      p.replaceChild(canvas, e);
    }
    return canvas;
  }

  function zoomAndRotateCanvas(e, zoom, angle, absolute, callback) {
    e = init(e);
    e.original.zoom = zoom;
    return updateCanvas(updateAngle(e, angle, absolute), callback);
  }

  if (Prototype.Browser.IE) {
    Element.addMethods("IMG", {
      zoom: zoomImg,
      rotate: rotateImgIe,
      rotateLeft: rotateLeft,
      rotateRight: rotateRight,
      zoomAndRotate: zoomAndRotateImgIe
    });
  } else {
    Element.addMethods("IMG", {
      zoom: zoomImg,
      rotate: rotateImg,
      rotateLeft: rotateLeft,
      rotateRight: rotateRight,
      zoomAndRotate: zoomAndRotateImg
    });
    Element.addMethods("CANVAS", {
      zoom: zoomCanvas,
      rotate: rotateCanvas,
      rotateLeft: rotateLeft,
      rotateRight: rotateRight,
      zoomAndRotate: zoomAndRotateCanvas
    });
  }
})();

/**
 * Extensions for Form: submit, disable buttons, deserialize.
 */
Object.extend(Form.Methods, {
  /**
   * Form#disableButtons(@form, selector) -> Form
   * Disable all buttons (to prevent accidental submission).
   *
   * @param {Form} form
   * @param {String} selector - optional selector for elements to be disabled
   */
  disableButtons: function(form, selector) {
    form = $(form);
    selector = selector || "input[type=button],input[type=reset],input[type=submit],button";
    //form.select(selector).invoke("disable");
    form.select(selector).each(function(f) {
      f.store("original-disabled", f.disabled).disabled = true;
    });
    return form;
  },
  /**
   * Form#restoreDisabledButtons(@form, selector) -> Form
   * Restore original state of buttons after Form#disableButtons.
   *
   * @param {Form} form
   * @param {String} selector - optional selector for elements to be restored
   */
  restoreDisabledButtons: function(form, selector) {
    form = $(form);
    selector = selector || "input[type=button],input[type=reset],input[type=submit],button";
    form.select(selector).each(function(f) {
      f.disabled = !!f.retrieve("original-disabled");
    });
    return form;
  },

  /**
   * Form#deserialize(@form, source) -> Form
   * Fill form with values of a given object or query string.
   * Each property name of `source` is compared to name attribute of a form element.
   *
   * Examples:
   *   $("form").deserialize("name1=value1&name2=value2");
   *   $("form").deserialize(Object.fromJSON('\u007B"name1":"value1","name2":"value2"}'));
   *
   * @param {Form} form - form element to fill with values
   * @param {Object/String} source - source object where field values are taken from
   *   (may be object or query string)
   */
  deserialize: function(form, source) {
    if (!(form = $(form))) {
      throw new Error("HTMLElement is required");
    }
    //source = Object.isString(source) ? (source.isJSON() ? Object.fromJSON(source) : source.toQueryParams()) : source;
    source = Object.isString(source) ? source.toQueryParams() : source;
    form.getElements().each(function(element) {
      var name = element.name; // element.name element.readAttribute("name") element.getAttribute("name")
      if (name && !Object.isUndefined(source[name])) { // && name in source
        element.setValue(source[name]);
      }
    });
    return form;
  }
});


/**
 * Extensions for Field (Form.Element): clear, setDisabled.
 */
Object.extend(Form.Element.Methods, {
  /**
   * Override default clear method.
   *
   * Examples:
   *   $("form").getElements().invoke("clear");
   *
   * @param {Field|HTMLInputElement|HTMLSelectElement|HTMLButtonElement} element - field to clear
   */
  clear: function(element) {
    element = $(element);
    var t = element.type, tag = element.tagName.toLowerCase();
    // if (t == "text" || t == "password" || t == "hidden" || tag == "textarea")
    /*if ((/^(?:text|password|hidden)$/i).test(t) || tag == "textarea") {
     element.value = "";
     } else*/
    if (t === "checkbox" || t === "radio") {
      element.checked = false;
    } else if (tag === "select") {
      element.selectedIndex = -1;
    } else if ((/^(?:button|image|reset|submit)$/i).test(t) || tag === "button") {
      // do nothing
    } else {
      // default for all other fields
      element.value = "";
    }
    return element;
  },
  /**
   * Disable/enable field.
   *
   * @param {Field|HTMLInputElement|HTMLSelectElement|HTMLButtonElement} element
   * @param {Boolean} disabled
   */
  setDisabled: function(element, disabled) {
    element = $(element);
    element.disabled = !!disabled;
    return element;
  }
});

/**
 * Fix textarea line breaks.
 * For line break $(textarea).value returns \r\n in IE and Opera, \n in other browsers.
 * Field.getValue(textarea) will always return \r\n.
 */
(function() {
  var TEXTAREA = document.createElement("textarea");
  TEXTAREA.value = '\n';
  if (TEXTAREA.value !== '\r\n') {
    //alert("Fix textarea \\r\\n line breaks");
    Form.Element.Serializers.textarea = function(element, value) {
      if (Object.isUndefined(value)) {
        return element.value.replace(/\r?\n/g, '\r\n');
      } else {
        element.value = value;
      }
    };
  }
  TEXTAREA = null;
})();


document.on("click", "form input[type=image]", function(event, image) {
  var name = image.name, form = event.findElement("form"), data = false;
  if (name) {
    var offset = image.cumulativeOffset();
    data = {};
    data[name + ".x"] = Math.round(event.pageX - offset.left);
    data[name + ".y"] = Math.round(event.pageY - offset.top);
    //alert(Object.toJSON(data));
  }
  form.store("form:submit-button", data);
});

/**
 * Register the name and value of pressed submit button.
 *
 * @param {Event} event
 * @param {Element} submit button
 */
document.on("click", "form input[type=submit], form button[type=submit], form button:not([type])", function(event, button) {
  var name = button.name, form = event.findElement("form"), data = false;
  if (name) {
    data = {};
    data[name] = button.value;
  }
  form.store("form:submit-button", data);
});

/**
 * Save/restore/clear state of form fields.
 *
 * Form has a state if it has an id. Field has a state if it has a name
 * (field should be sent to the server) or id (field is used somewhere in scripts).
 *
 * Requires: prototype-1.7.js, prototype-1.7-ext.js (events-custom.js, prototype.js).
 */
(function() {
  var h5 = Prototype.HTML5Features || {}, storage = h5.LocalStorage ? {
    getKey: function(form) {
      // var href = window.location.hostname + window.location.pathname + window.location.search;
      return "form-state-" + form.id + "-" + window.location.pathname;
    },
    setItem: function(form, string) {
      try {
        window.localStorage.setItem(this.getKey(form), string);
      } catch (e) {
        // QUOTA_EXCEEDED_ERR
      }
    },
    getItem: function(form) {
      return window.localStorage.getItem(this.getKey(form)) || "{}";
    },
    removeItem: function(form) {
      window.localStorage.removeItem(this.getKey(form));
    }
  } : {
    setItem: function() {
    },
    getItem: function() {
      return {};
    },
    removeItem: function() {
    }
  };

  var lastState = "";

  /*function getStatefulFields(form) {
   return form.getElements().findAll(function(f) {
   //return f.type != 'file' && f.type != 'button' && f.type != 'submit' && f.type != 'reset';
   return (f.name || f.id) && !((/^(?:button|submit|reset|file)$/i).test(f.type));
   });
   }
   function getStatefulFields(form) {
   var elements = Form.getElements(form), stateful = [];
   for (var i = 0, len = elements.length; i < len; ++i) {
   var f = elements[i];
   if ((f.name || f.id) && !((/^(?:button|submit|reset|file)$/i).test(f.type))) {
   stateful.push(f);
   }
   }
   return stateful;
   }*/
  function getStatefulFields(form) {
    var elements = $(form).getElementsByTagName('*');
    var element, stateful = [], serializers = Form.Element.Serializers;
    for (var i = 0; element = elements[i]; i++) {
      if ((element.name || element.id) &&
      serializers[element.tagName.toLowerCase()] &&
      !((/^(?:button|submit|reset|file)$/i).test(element.type))) {
        stateful.push(Element.extend(element));
      }
    }
    return stateful;
  }

  function saveState(form) {
    var state = {};
    form = $(form);
    getStatefulFields(form).each(function(f) {
      var value = $F(f);
      if (value) {
        state[f.name || f.id] = value;
      }
    });

    var stateStr = Object.toJSON(state);
    if (lastState !== stateStr) {
      storage.setItem(form, stateStr);
      lastState = stateStr;
      //alert("Saved state\n" + stateStr);
      //console.log("Saved state", state);
    }
    //return state;
    return form;
  }

  function restoreState(form) {
    form = $(form);
    var stateStr = storage.getItem(form), state = stateStr.evalJSON();
    getStatefulFields(form).each(function(f) {
      var value = state[f.name || f.id];
      f.setValue(Object.isUndefined(value) ? "" : value);
    });
    lastState = stateStr;
    //alert("Restored state\n" + stateStr);
    //console.log("Restored state", state);
    //return state;
    return form;
  }

  function clearState(form) {
    form = $(form);
    storage.removeItem(form);
    //alert("Cleared state " + form.id);
    //console.log("Cleared state", form);
    return form;
  }

  Object.extend(Form.Methods, {
    saveState: saveState,
    restoreState: restoreState,
    clearState: clearState
  });
})();
(function(GLOBAL) {
  function setup(context, eventName) {
    context._observers = context._observers || {};
    context._observers[eventName] = context._observers[eventName] || [];
  }

  GLOBAL.Mixin = GLOBAL.Mixin || {};
  GLOBAL.Mixin.Observable = {
    stopObserving: function(eventName, observer) {
      if (eventName) {
        setup(this, eventName);
        this._observers[eventName] = observer ? this._observers[eventName].without(observer) : [];
      } else {
        this._observers = {};
      }
    },

    observe: function(eventName, observer) {
      if (typeof(eventName) === 'string' && Object.isFunction(observer)) {
        setup(this, eventName);
        var observers = this._observers[eventName];
        if (!observers.include(observer)) {
          observers.push(observer);
        }
      } else {
        for (var e in eventName) {
          this.observe(e, eventName[e]);
        }
      }
    },

    observeOnce: function(eventName, observer) {
      if (typeof(eventName) === 'string' && Object.isFunction(observer)) {
        var inner_observer = (function() {
          observer.apply(this, arguments);
          this.stopObserving(eventName, inner_observer);
        }).bind(this);
        // inlined this.observe(eventName, inner_observer);
        setup(this, eventName);
        this._observers[eventName].push(inner_observer);
      } else {
        for (var e in eventName) {
          this.observeOnce(e, eventName[e]);
        }
      }
    },

    notify: function(eventName) {
      var args = $A(arguments).slice(1);

      setup(this, eventName);
      // Find event observers in this._observers, this and this.options.
      // Original array will be modified after observeOnce calls.
      var observers = this._observers[eventName].clone();
      if (Object.isFunction(this[eventName])) {
        observers.unshift(this[eventName]);
      }
      if (this.options && Object.isFunction(this.options[eventName])) {
        observers.unshift(this.options[eventName]);
      }

      var result = [];
      try {
        for (var i = 0, len = observers.length; i < len; ++i) {
          result.push(observers[i].apply(this, args) || null);
        }
      } catch (e) {
        if (e === $break) {
          return false;
        } else {
          throw e;
        }
      }
      return result;
    }
  };
})(this);
//function getDocumentSelection() {
//  var t = '';
//  if (window.getSelection) {
//    t = window.getSelection();
//  } else if (document.getSelection) {
//    t = document.getSelection();
//  } else if (document.selection) {
//    t = document.selection.createRange().text;
//  }
//  return t;
//}
//
//function selectElement(id) {
//  var range;
//  if (document.selection) {
//    range = document.body.createTextRange();
//    range.moveToElementText(document.all[id]);
//    range.select();
//  } else if (window.getSelection) {
//    range = document.createRange();
//    range.selectNodeContents(document.getElementById(id));
//    var selection = window.getSelection();
//    selection.removeAllRanges();
//    selection.addRange(range);
//  }
//}

/**
 * Clear text selection, if any. Useful while dragging or shift-clicking.
 */
document.clearSelection = function() {
  var selection = window.getSelection ? window.getSelection() : document.selection;
  if (selection) {
    if (selection.empty) {
      selection.empty();
    }
    if (selection.removeAllRanges) {
      selection.removeAllRanges();
    }
  }
};

// TODO simulate "change" events in non-IE non-Opera browsers
// on "select" when pressing up-down keys?
// onkeydown="window.setTimeout(function(e0){return function() {changeIt(e0)}}(this),0)"

// TODO simulate "change" events in IE browsers
// on "radio" with "propertychange" event

/**
 * Extensions for Event.
 */
Object.extend(Event, {
  KEY_ENTER: 13,
  KEY_SHIFT: 16,
  KEY_CTRL: 17,
  KEY_ALT: 18,
  KEY_SPACE: 32,

  KEY_0: 48,
  KEY_1: 49,
  KEY_2: 50,
  KEY_3: 51,
  KEY_4: 52,
  KEY_5: 53,
  KEY_6: 54,
  KEY_7: 55,
  KEY_8: 56,
  KEY_9: 57,

  KEY_F1: 112,
  KEY_F2: 113,
  KEY_F3: 114,
  KEY_F4: 115,
  KEY_F5: 116,
  KEY_F6: 117,
  KEY_F7: 118,
  KEY_F8: 119,
  KEY_F9: 120,
  KEY_F10: 121,
  KEY_F11: 122,
  KEY_F12: 123,

  /**
   * Faster than findElement if you need to find element only by tag name.
   *
   * @param {Event} event - event
   * @param {String} tagName - name of the tag to find
   * @return {Element}
   */
  findElementByTag: function (/*Event*/event, tagName) {
    tagName = tagName.toLowerCase();
    var element = Event.element(event);
    while (element) {
      if (element.nodeType === 1 && element.tagName && element.tagName.toLowerCase() === tagName) {
        return Element.extend(element);
      }
      element = element.parentNode;
    }
  },

  /**
   * Observe the first occurrence of event and remove observer after that.
   *
   * @param {Element,String} element
   * @param {String} eventName
   * @param {Function} handler
   */
  observeOnce: function (element, eventName, handler) {
    var internalHandler = function () {
      handler.apply(this, arguments);
      Element.stopObserving(element, eventName, internalHandler);
    };
    return Element.observe(element, eventName, internalHandler);
  },

  /*isSupported: function (eventName, element) {
   element = element || document.documentElement;
   return ("on" + eventName) in element;
   },*/

  /**
   * Technique from Juriy Zaytsev
   * http://perfectionkills.com/detecting-event-support-without-browser-sniffing/
   *
   * @param {String} eventName
   * @param {HTMLElement} [element]
   * @return {Boolean} true if event is supported
   *
   * Examples:
   *
   *     if (Event.isSupported("click")) ; // test click on div element
   *     if (Event.isSupported("submit")) ; // test submit on form element
   *     if (Event.isSupported("submit", "div")) ; // test submit on div element
   *     if (Event.isSupported("unload", window)) ; // test window unload event
   *
   * Note that `isSupported` can give false positives when passed augmented host objects, e.g.:
   *
   *     someElement.onfoo = function(){ };
   *     Event.isSupported('foo', someElement); // true (even if "foo" is not supported)
   *
   * Also note that in Gecko clients (those that utilize `setAttribute`-based detection)
   *
   *     Event.isSupported('foo', someElement);
   *
   * might create `someElement.foo` property (if "foo" event is supported) which apparently
   * can not be deleted - `isEventSupported` sets such property to `undefined` value,
   * but can not fully remove it.
   */
  isSupported: (function (undef) {

    var TAGNAMES = {
      'select': 'input',
      'change': 'input',
      'submit': 'form',
      'reset': 'form',
      'error': 'img',
      'load': 'img',
      'abort': 'img'
    };

    function isEventSupported(eventName, element) {
      //element = element || document.createElement(TAGNAMES[eventName] || 'div');
      if (!element || Object.isString(element)) {
        element = document.createElement(element || TAGNAMES[eventName] || 'div');
      }
      eventName = 'on' + eventName;
      var isSupported = (eventName in element);

      if (!isSupported) {
        // if it has no `setAttribute` (i.e. doesn't implement Node interface), try generic element
        if (!element.setAttribute) {
          element = document.createElement('div');
        }
        if (element.setAttribute && element.removeAttribute) {
          element.setAttribute(eventName, '');
          //element.setAttribute(eventName, 'return;');
          isSupported = typeof element[eventName] == 'function';

          // if property was created, "remove it" (by setting value to `undefined`)
          if (typeof element[eventName] != 'undefined') {
            element[eventName] = undef;
          }
          element.removeAttribute(eventName);
        }
      }

      element = null;
      return isSupported;
    }

    return isEventSupported;
  })()
});

Element.Methods.observeOnce = Event.observeOnce;
document.observeOnce = Event.observeOnce.methodize();


/**
 * Event.simulate(element, eventName, options) -> Element
 *
 * $('foo').simulate('click'); // => fires "click" event on an element with id=foo
 *
 * @param {Element} element - element to fire event on
 * @param {String} eventName - name of event to fire
 *   (only HTMLEvents, MouseEvents and partly KeyEvents interfaces are supported)
 * @param {Object} options - optional object to fine-tune event properties
 *   - pointerX, pointerY, ctrlKey, etc.
 */
(function () {
  var defaultOptions = {
    pointerX: 0,
    pointerY: 0,
    button: 0,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    keyCode: 0,
    charCode: 0,
    bubbles: true,
    cancelable: true
  };

  function createEventIE(options, element) {
    return Object.extend(document.createEventObject(), Object.extend(options, {
      detail: 0,
      screenX: options.pointerX,
      screenY: options.pointerY,
      clientX: options.pointerX,
      clientY: options.pointerY,
      relatedTarget: element
    }));
  }

  function createEventUnsupported() {
    throw new Error('This browser does not support neither document.createEvent() nor document.createEventObject()');
  }

  var createEventOther = document.createEventObject ? createEventIE : createEventUnsupported;

  var eventHandlers = {
    "HTMLEvents": {
      name: /^(?:load|unload|abort|error|select|input|change|submit|reset|focus|blur|resize|scroll)$/,
      createEvent: document.createEvent ? function (options, element, eventName) {
        var event = document.createEvent("HTMLEvents");
        event.initEvent(eventName, options.bubbles, options.cancelable);
        return event;
      } : createEventOther
    },
    "MouseEvents": {
      name: /^(?:click|dblclick|mouse(?:down|up|over|move|out))$/,
      createEvent: document.createEvent ? function (options, element, eventName) {
        var event = document.createEvent("MouseEvents");
        event.initMouseEvent(eventName, options.bubbles, options.cancelable, document.defaultView,
          options.button, options.pointerX, options.pointerY, options.pointerX, options.pointerY,
          options.ctrlKey, options.altKey, options.shiftKey, options.metaKey, options.button, element);
        return event;
      } : createEventOther
    }

    // keypress simulation doesn't work in latest versions of Chrome, Firefox, Opera
    /*"KeyEvents": {
     name: /^(?:keydown|keypress|keyup)$/,
     createEvent: document.createEvent ? function (options, element, eventName) {
     var event;
     try {
     event = document.createEvent("KeyEvents");
     event.initKeyEvent(eventName, options.bubbles, options.cancelable, window,
     options.ctrlKey, options.altKey, options.shiftKey, options.metaKey,
     options.keyCode, options.charCode);
     } catch (e4) {
     //try {
     //  event = document.createEvent("KeyboardEvents");
     //  event.initKeyboardEvent(eventName, options.bubbles, options.cancelable, window,
     //    options.charArg, options.keyArg, options.location || 0, "");
     //  // location: 0=standard, 1=left, 2=right, 3=numpad, 4=mobile, 5=joystick
     //  // modifiersList: space-separated Shift, Control, Alt, etc.
     //} catch (e3) {
     //}
     try {
     event = document.createEvent("Events");
     } catch (e2) {
     event = document.createEvent("UIEvents");
     } finally {
     event.initEvent(eventName, true, true);
     try {
     Object.extend(event, options);
     } catch (e1) {
     // ignore
     }
     }
     }
     return event;
     } : createEventOther
     }*/
    /*"TextEvent": {
     name: /^textInput$/,
     createEvent: document.createEvent ? function (options, element, eventName) {
     var event = document.createEvent("TextEvent");
     event.initTextEvent(eventName, options.bubbles, options.cancelable, document.defaultView, options.charCode);
     return event;
     } : createEventOther
     }*/
  };

  function dispatchEvent(element, event, eventName) {
    if (event) {
      if (element.dispatchEvent) {
        element.dispatchEvent(event);
      } else if (element.fireEvent) {
        // IE-specific sourceIndex makes sure element is in the document
        // if (element.sourceIndex > 0)
        element.fireEvent('on' + eventName, event);
      }
    }
    return element;
  }

  function simulate(element, eventName, options) {
    for (var eventType in eventHandlers) {
      if (eventHandlers[eventType].name.test(eventName)) {
        element = $(element);
        options = Object.extend(Object.clone(defaultOptions), options || {});
        var event = eventHandlers[eventType].createEvent(options, element, eventName);
        return dispatchEvent(element, event, eventName);
      }
    }
    //throw new SyntaxError('Only HTMLEvents, MouseEvents and KeyEvents interfaces are supported');
    throw new SyntaxError('Unsupported event "' + eventName +
      '". Only HTMLEvents and MouseEvents interfaces are supported');
  }

  Event.simulate = simulate;
  Element.Methods.simulate = simulate;
})();


/**
 * Make change and submit events bubble in all browsers.
 */
(function () {
  var EMULATED_SUBMIT = "emulated:submit", EMULATED_CHANGE = "emulated:change";

  function notForm(element) {
    return !Object.isElement(element) || element.nodeName.toUpperCase() !== "FORM";
  }

  function notField(element) {
    if (!Object.isElement(element)) {
      return true;
    }
    var name = element.nodeName.toUpperCase();
    return !(name === "INPUT" || name === "SELECT" || name === "TEXTAREA");
  }

  //var div = document.createElement("div");
  var submitBubbles = Event.isSupported("submit", "div");
  var changeBubbles = Event.isSupported("change", "div");
  //div = null;

  // is the handler being attached to an element that doesn't support this event?
  // "submit" not on HTMLFormElement => "emulated:submit"
  // "change" not on Field => "emulated:change"
  function correctEventName(eventName, element) {
    if (!submitBubbles && eventName === "submit" && notForm(element)) {
      return EMULATED_SUBMIT;
    } else if (!changeBubbles && eventName === "change" && notField(element)) {
      return EMULATED_CHANGE;
    }
    return eventName;
  }

  if (!submitBubbles || !changeBubbles) {
    // augment the Event.Handler class to observe custom events when needed
    Event.Handler.prototype.initialize = Event.Handler.prototype.initialize.wrap(function (initialize, element, eventName, selector, callback) {
      element = $(element);
      initialize(element, correctEventName(eventName, element), selector, callback);
    });
    // augment the Event.observe method
    Event.observe = Event.observe.wrap(function (observe, element, eventName, handler) {
      element = $(element);
      return observe(element, correctEventName(eventName, element), handler);
    });
    Element.Methods.observe = Event.observe;
    document.observe = Event.observe.methodize();
  }

  if (!submitBubbles) {
    // discover forms on the page by observing focus events which always bubble
    document.on("focusin", "form", function (focusEvent, form) {
      // special handler for the real "submit" event (one-time operation)
      if (!form.retrieve(EMULATED_SUBMIT)) {
        form.observe("submit", function (submitEvent) {
          var emulated = form.fire(EMULATED_SUBMIT, submitEvent, true);
          // if custom event received preventDefault, cancel the real one too
          if (emulated.returnValue === false) {
            submitEvent.preventDefault();
          }
        });
        form.store(EMULATED_SUBMIT, true);
      }
    });
  }

  if (!changeBubbles) {
    // discover form inputs on the page
    document.on("focusin", "input, select, textarea", function (focusEvent, input) {
      // special handler for real "change" events
      if (!input.retrieve(EMULATED_CHANGE)) {
        input.observe("change", function (changeEvent) {
          input.fire(EMULATED_CHANGE, changeEvent, true);
        });
        input.store(EMULATED_CHANGE, true);
      }
    });
  }
})();


Event.click = Element.click = function (element) {
  element = $(element);
  if (element.click) {
    element.click();
  } else {
    element.simulate("click");
  }
};

/**
 * Custom events:
 *   focus:in, focus:out,
 *   mouse:wheel
 *   resize:start, resize:continued, resize:end
 */
/**
 * Bubbling focus:in and focus:out events.
 * Usage:
 *   document.on("focus:in", selector, focusHandler); // on focus
 *   document.on("focus:out", selector, blurHandler); // on blur
 *
 * Unified cross-browser mouse:wheel event.
 * Usage:
 *   document.on("mouse:wheel", selector, mouseWheelHandler);
 */
(function() {
  function focusin(event) {
    Event.findElement(event).fire("focus:in");
  }

  function focusout(event) {
    Event.findElement(event).fire("focus:out");
  }

  if (document.addEventListener) {
    document.addEventListener("focus", focusin, true);
    document.addEventListener("blur", focusout, true);
  } else {
    document.observe("focusin", focusin);
    document.observe("focusout", focusout);
  }

  function wheel(event) {
    var delta;
    if (event.wheelDelta) { // IE & Opera
      delta = event.wheelDelta / 120;
    } else if (event.detail) { // W3C
      delta = -event.detail / 3;
    } else {
      return;
    }

    var customEvent = Event.findElement(event).fire("mouse:wheel", {
      delta: delta
    });
    if (customEvent.stopped) {
      Event.stop(event);
      return false;
    }
  }

  document.observe("mousewheel", wheel);
  document.observe("DOMMouseScroll", wheel);
})();


/**
 * Window resizing events: resize:start, resize:continued, resize:end.
 *
 * Event resize:continued will fire with interval >= delayRC milliseconds and
 * only if window size is actually changed (e.g. no repeated events with same window size).
 *
 * Event resize:end will fire once after resize:continued if window dimensions stay unchanged for
 * delayRE milliseconds.
 *
 * Each event will provide actual window dimensions as additional parameter.
 */
/*
 (function() {
 var timerRC = null, timerRE = null, delayRC = 200, delayRE = 500, dimensions = {};

 function fireResizeContinued() {
 var dims = document.viewport.getDimensions();
 if (dims.width !== dimensions.width || dims.height !== dimensions.height) {
 dimensions = dims;
 document.fire("resize:continued", dimensions);
 }
 timerRC = setTimeout(fireResizeContinued, delayRC);
 }

 function fireResizeEnd() {
 clearTimeout(timerRC);
 timerRC = null;
 timerRE = null;
 document.viewport.isResizing = false;
 document.fire("resize:end", document.viewport.getDimensions());
 }

 function resizeListener() {
 //console.log("resizeListener - isResizing", document.viewport.isResizing);
 if (!document.viewport.isResizing) {
 dimensions = document.viewport.getDimensions();
 document.viewport.isResizing = true;
 document.fire("resize:start", dimensions);
 timerRC = setTimeout(fireResizeContinued, delayRC);
 }
 if (timerRE) {
 //console.log("clearTimeout(timerRE)");
 clearTimeout(timerRE);
 }
 timerRE = setTimeout(fireResizeEnd, delayRE);
 }

 Event.observe((document.onresize ? document : window), "resize", resizeListener);
 })();
 */
Element.addMethods();
