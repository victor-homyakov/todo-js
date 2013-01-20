/*  Prototype JavaScript framework, version 1.7.1.8
 *  (c) 2005-2010 Sam Stephenson
 *
 *  Prototype is freely distributable under the terms of an MIT-style license.
 *  For details, see the Prototype web site: http://www.prototypejs.org/
 *
 *--------------------------------------------------------------------------*/

var Prototype = {

  Version: '1.7.1.8',

  Browser: (function(){
    var ua = navigator.userAgent;
    var isOpera = Object.prototype.toString.call(window.opera) == '[object Opera]';
    return {
      IE:             !!window.attachEvent && !isOpera,
      Opera:          isOpera,
      WebKit:         ua.indexOf('AppleWebKit/') > -1,
      Gecko:          ua.indexOf('Gecko') > -1 && ua.indexOf('KHTML') === -1,
      MobileSafari:   /Apple.*Mobile/.test(ua)
    };
  })(),

  BrowserFeatures: {
    XPath: !!document.evaluate,

    SelectorsAPI: !!document.querySelector,

    ElementExtensions: (function() {
      var constructor = window.Element || window.HTMLElement;
      return !!(constructor && constructor.prototype);
    })(),
    SpecificElementExtensions: (function() {
      if (typeof window.HTMLDivElement !== 'undefined')
        return true;

      var div = document.createElement('div'),
          form = document.createElement('form'),
          isSupported = false;

      if (div['__proto__'] && (div['__proto__'] !== form['__proto__'])) {
        isSupported = true;
      }

      div = form = null;

      return isSupported;
    })()
  },

  ScriptFragment: '<script[^>]*>([\\S\\s]*?)<\/script\\s*>',
  JSONFilter: /^\/\*-secure-([\s\S]*)\*\/\s*$/,

  emptyFunction: function() { },

  K: function(x) { return x; }
};

if (Prototype.Browser.MobileSafari)
  Prototype.BrowserFeatures.SpecificElementExtensions = false;
/* Based on Alex Arnell's inheritance implementation. */

var Class = (function() {

  var IS_DONTENUM_BUGGY = (function(){
    for (var p in { toString: 1 }) {
      if (p === 'toString') return false;
    }
    return true;
  })();

  function Subclass() {}
  function create() {
    var parent = null, properties = $A(arguments);
    if (Object.isFunction(properties[0]))
      parent = properties.shift();

    function klass() {
      this.initialize.apply(this, arguments);
    }

    Object.extend(klass, Class.Methods);
    klass.superclass = parent;
    klass.subclasses = [];

    if (parent) {
      Subclass.prototype = parent.prototype;
      klass.prototype = new Subclass;
      parent.subclasses.push(klass);
    }

    for (var i = 0, length = properties.length; i < length; i++)
      klass.addMethods(properties[i]);

    if (!klass.prototype.initialize)
      klass.prototype.initialize = Prototype.emptyFunction;

    klass.prototype.constructor = klass;
    return klass;
  }

  function addMethods(source) {
    var ancestor   = this.superclass && this.superclass.prototype,
        properties = Object.keys(source);

    if (IS_DONTENUM_BUGGY) {
      if (source.toString != Object.prototype.toString)
        properties.push("toString");
      if (source.valueOf != Object.prototype.valueOf)
        properties.push("valueOf");
    }

    for (var i = 0, length = properties.length; i < length; i++) {
      var property = properties[i], value = source[property];
      if (ancestor && Object.isFunction(value) &&
          value.argumentNames()[0] == "$super") {
        var method = value;
        value = (function(m) {
          return function() { return ancestor[m].apply(this, arguments); };
        })(property).wrap(method);

        value.valueOf = (function(method) {
          return function() { return method.valueOf.call(method); };
        })(method);

        value.toString = (function(method) {
          return function() { return method.toString.call(method); };
        })(method);
      }
      this.prototype[property] = value;
    }

    return this;
  }

  return {
    create: create,
    Methods: {
      addMethods: addMethods
    }
  };
})();
(function() {

  var _toString = Object.prototype.toString,
      _hasOwnProperty = Object.prototype.hasOwnProperty,
      NULL_TYPE = 'Null',
      UNDEFINED_TYPE = 'Undefined',
      BOOLEAN_TYPE = 'Boolean',
      NUMBER_TYPE = 'Number',
      STRING_TYPE = 'String',
      OBJECT_TYPE = 'Object',
      FUNCTION_CLASS = '[object Function]',
      BOOLEAN_CLASS = '[object Boolean]',
      NUMBER_CLASS = '[object Number]',
      STRING_CLASS = '[object String]',
      ARRAY_CLASS = '[object Array]',
      DATE_CLASS = '[object Date]',
      NATIVE_JSON_STRINGIFY_SUPPORT = window.JSON &&
        typeof JSON.stringify === 'function' &&
        JSON.stringify(0) === '0' &&
        typeof JSON.stringify(Prototype.K) === 'undefined';



  var DONT_ENUMS = ['toString', 'toLocaleString', 'valueOf',
   'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'constructor'];

  var IS_DONTENUM_BUGGY = (function(){
    for (var p in { toString: 1 }) {
      if (p === 'toString') return false;
    }
    return true;
  })();

  function Type(o) {
    switch(o) {
      case null: return NULL_TYPE;
      case (void 0): return UNDEFINED_TYPE;
    }
    var type = typeof o;
    switch(type) {
      case 'boolean': return BOOLEAN_TYPE;
      case 'number':  return NUMBER_TYPE;
      case 'string':  return STRING_TYPE;
    }
    return OBJECT_TYPE;
  }

  function extend(destination, source) {
    for (var property in source)
      destination[property] = source[property];
    return destination;
  }

  function inspect(object) {
    try {
      if (isUndefined(object)) return 'undefined';
      if (object === null) return 'null';
      return object.inspect ? object.inspect() : String(object);
    } catch (e) {
      if (e instanceof RangeError) return '...';
      throw e;
    }
  }

  function toJSON(value) {
    return Str('', { '': value }, []);
  }

  function Str(key, holder, stack) {
    var value = holder[key];
    if (Type(value) === OBJECT_TYPE && typeof value.toJSON === 'function') {
      value = value.toJSON(key);
    }

    var _class = _toString.call(value);

    switch (_class) {
      case NUMBER_CLASS:
      case BOOLEAN_CLASS:
      case STRING_CLASS:
        value = value.valueOf();
    }

    switch (value) {
      case null: return 'null';
      case true: return 'true';
      case false: return 'false';
    }

    var type = typeof value;
    switch (type) {
      case 'string':
        return value.inspect(true);
      case 'number':
        return isFinite(value) ? String(value) : 'null';
      case 'object':

        for (var i = 0, length = stack.length; i < length; i++) {
          if (stack[i] === value) {
            throw new TypeError("Cyclic reference to '" + value + "' in object");
          }
        }
        stack.push(value);

        var partial = [];
        if (_class === ARRAY_CLASS) {
          for (var i = 0, length = value.length; i < length; i++) {
            var str = Str(i, value, stack);
            partial.push(typeof str === 'undefined' ? 'null' : str);
          }
          partial = '[' + partial.join(',') + ']';
        } else {
          var keys = Object.keys(value);
          for (var i = 0, length = keys.length; i < length; i++) {
            var key = keys[i], str = Str(key, value, stack);
            if (typeof str !== "undefined") {
               partial.push(key.inspect(true)+ ':' + str);
             }
          }
          partial = '{' + partial.join(',') + '}';
        }
        stack.pop();
        return partial;
    }
  }

  function stringify(object) {
    return JSON.stringify(object);
  }

  function toQueryString(object) {
    return $H(object).toQueryString();
  }

  function toHTML(object) {
    return object && object.toHTML ? object.toHTML() : String.interpret(object);
  }

  function keys(object) {
    if (Type(object) !== OBJECT_TYPE) { throw new TypeError(); }
    var results = [];
    for (var property in object) {
      if (_hasOwnProperty.call(object, property))
        results.push(property);
    }

    if (IS_DONTENUM_BUGGY) {
      for (var i = 0; property = DONT_ENUMS[i]; i++) {
        if (_hasOwnProperty.call(object, property))
          results.push(property);
      }
    }

    return results;
  }

  function values(object) {
    var results = [];
    for (var property in object)
      results.push(object[property]);
    return results;
  }

  function clone(object) {
    return extend({ }, object);
  }

  function isElement(object) {
    return !!(object && object.nodeType == 1);
  }

  function isArray(object) {
    return _toString.call(object) === ARRAY_CLASS;
  }

  var hasNativeIsArray = (typeof Array.isArray == 'function')
    && Array.isArray([]) && !Array.isArray({});

  if (hasNativeIsArray) {
    isArray = Array.isArray;
  }

  function isHash(object) {
    return object instanceof Hash;
  }

  function isFunction(object) {
    return _toString.call(object) === FUNCTION_CLASS;
  }

  function isString(object) {
    return _toString.call(object) === STRING_CLASS;
  }

  function isNumber(object) {
    return _toString.call(object) === NUMBER_CLASS;
  }

  function isDate(object) {
    return _toString.call(object) === DATE_CLASS;
  }

  function isUndefined(object) {
    return typeof object === "undefined";
  }

  extend(Object, {
    extend:        extend,
    inspect:       inspect,
    toJSON:        NATIVE_JSON_STRINGIFY_SUPPORT ? stringify : toJSON,
    toQueryString: toQueryString,
    toHTML:        toHTML,
    keys:          Object.keys || keys,
    values:        values,
    clone:         clone,
    isElement:     isElement,
    isArray:       isArray,
    isHash:        isHash,
    isFunction:    isFunction,
    isString:      isString,
    isNumber:      isNumber,
    isDate:        isDate,
    isUndefined:   isUndefined
  });
})();
Object.extend(Function.prototype, (function() {
  var slice = Array.prototype.slice;

  function update(array, args) {
    var arrayLength = array.length, length = args.length;
    while (length--) array[arrayLength + length] = args[length];
    return array;
  }

  function merge(array, args) {
    array = slice.call(array, 0);
    return update(array, args);
  }

  function argumentNames() {
    var names = this.toString().match(/^[\s\(]*function[^(]*\(([^)]*)\)/)[1]
      .replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, '')
      .replace(/\s+/g, '').split(',');
    return names.length == 1 && !names[0] ? [] : names;
  }

  function bind(context) {
    if (arguments.length < 2 && Object.isUndefined(arguments[0]))
      return this;

    if (!Object.isFunction(this))
      throw new TypeError("The object is not callable.");

    var nop = function() {};
    var __method = this, args = slice.call(arguments, 1);

    var bound = args.length ? function() { // FIX
      var a = arguments.length ? merge(args, arguments) : args;
      var c = this instanceof bound ? this : context;
      return __method.apply(c, a);
    } : function() {
      var c = this instanceof bound ? this : context;
      return __method.apply(c, arguments);
    };

    nop.prototype   = this.prototype;
    bound.prototype = new nop();

    bound.toString = function() { // FIX for debugger
      return __method.toString();
    };

    return bound;
  }

  function bindAsEventListener(context) {
    var __method = this, args = slice.call(arguments, 1);
    return args.length ? function(event) {
      var a = update([event || window.event], args);
      return __method.apply(context, a);
    } : function(event) {
      return __method.call(context, event || window.event);
    };
  }

  function curry() {
    if (!arguments.length) return this;
    var __method = this, args = slice.call(arguments, 0);
    return function() {
      var a = arguments.length ? merge(args, arguments) : args; // FIX
      return __method.apply(this, a);
    };
  }

  function delay(timeout) {
    var __method = this, args = slice.call(arguments, 1);
    timeout = timeout * 1000;
    return window.setTimeout(function() {
      return __method.apply(__method, args);
    }, timeout);
  }

  function defer() { // FIX
    return arguments.length
      ? this.delay.apply(this, update([0.01], arguments))
      : this.delay(0.01);
  }

  function wrap(wrapper) {
    var __method = this;
    return function() {
      var a = arguments.length ? update([__method.bind(this)], arguments) : [__method.bind(this)]; // FIX
      return wrapper.apply(this, a);
    };
  }

  function methodize() {
    if (this._methodized) return this._methodized;
    var __method = this;
    return this._methodized = function() {
      var a = arguments.length ? update([this], arguments) : [this]; // FIX
      return __method.apply(null, a);
    };
  }

  var extensions = {
    argumentNames:       argumentNames,
    bindAsEventListener: bindAsEventListener,
    curry:               curry,
    delay:               delay,
    defer:               defer,
    wrap:                wrap,
    methodize:           methodize
  };

  if (!Function.prototype.bind)
    extensions.bind = bind;

  return extensions;
})());



(function(proto) {


  function toISOString() {
    return this.getUTCFullYear() + '-' +
      (this.getUTCMonth() + 1).toPaddedString(2) + '-' +
      this.getUTCDate().toPaddedString(2) + 'T' +
      this.getUTCHours().toPaddedString(2) + ':' +
      this.getUTCMinutes().toPaddedString(2) + ':' +
      this.getUTCSeconds().toPaddedString(2) + 'Z';
  }


  function toJSON() {
    return this.toISOString();
  }

  if (!proto.toISOString) proto.toISOString = toISOString;
  if (!proto.toJSON) proto.toJSON = toJSON;

})(Date.prototype);


RegExp.prototype.match = RegExp.prototype.test;

RegExp.escape = function(str) {
  return String(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
};
var PeriodicalExecuter = Class.create({
  initialize: function(callback, frequency) {
    this.callback = callback;
    this.frequency = frequency;
    this.currentlyExecuting = false;

    this.registerCallback();
  },

  registerCallback: function() {
    this.timer = setInterval(this.onTimerEvent.bind(this), this.frequency * 1000);
  },

  execute: function() {
    this.callback(this);
  },

  stop: function() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  },

  onTimerEvent: function() {
    if (!this.currentlyExecuting) {
      try {
        this.currentlyExecuting = true;
        this.execute();
        this.currentlyExecuting = false;
      } catch(e) {
        this.currentlyExecuting = false;
        throw e;
      }
    }
  }
});
Object.extend(String, {
  interpret: function(value) {
    return value == null ? '' : String(value);
  },
  specialChar: {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '\\': '\\\\'
  }
});

Object.extend(String.prototype, (function() {
  var NATIVE_JSON_PARSE_SUPPORT = window.JSON &&
    typeof JSON.parse === 'function' &&
    JSON.parse('{"test": true}').test;

  var scriptFragmentMatchAll = new RegExp(Prototype.ScriptFragment, 'img'),
    scriptFragmentMatchOne = new RegExp(Prototype.ScriptFragment, 'im');

  function prepareReplacement(replacement) {
    if (Object.isFunction(replacement)) return replacement;
    var template = new Template(replacement);
    return function(match) { return template.evaluate(match); };
  }

  function gsub(pattern, replacement) {
    var result = '', source = this, match;
    replacement = prepareReplacement(replacement);

    if (Object.isString(pattern))
      pattern = RegExp.escape(pattern);

    if (!(pattern.length || pattern.source)) {
      replacement = replacement('');
      return replacement + source.split('').join(replacement) + replacement;
    }

    while (source.length > 0) {
      match = source.match(pattern);
      if (match && match[0].length > 0) {
        result += source.slice(0, match.index);
        result += String.interpret(replacement(match));
        source = source.slice(match.index + match[0].length);
      } else {
        result += source;
        source = '';
      }
    }
    return result;
  }

  function sub(pattern, replacement, count) {
    replacement = prepareReplacement(replacement);
    count = Object.isUndefined(count) ? 1 : count;

    return this.gsub(pattern, function(match) {
      if (--count < 0) return match[0];
      return replacement(match);
    });
  }

  function scan(pattern, iterator) {
    this.gsub(pattern, iterator);
    return String(this);
  }

  function truncate(length, truncation) {
    length = length || 30;
    truncation = Object.isUndefined(truncation) ? '...' : truncation;
    return this.length > length ?
      this.slice(0, length - truncation.length) + truncation : String(this);
  }

  function strip() {
    return this.replace(/^\s+/, '').replace(/\s+$/, '');
  }

  function stripTags() {
    return this.replace(/<\w+(\s+("[^"]*"|'[^']*'|[^>])+)?>|<\/\w+>/gi, '');
  }

  function stripScripts() {
    return this.replace(scriptFragmentMatchAll, '');
  }

  function extractScripts() {
    return (this.match(scriptFragmentMatchAll) || []).map(function(scriptTag) {
      return (scriptTag.match(scriptFragmentMatchOne) || ['', ''])[1];
    });
  }

  function evalScripts() {
    return this.extractScripts().map(function(script) { return eval(script); });
  }

  function escapeHTML() {
    return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function unescapeHTML() {
    return this.stripTags().replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
  }


  function toQueryParams(separator) {
    var match = this.strip().match(/([^?#]*)(#.*)?$/);
    if (!match) return { };

    return match[1].replace(/\+/g,' ').split(separator || '&').inject({ }, function(hash, pair) {
      if ((pair = pair.split('='))[0]) {
        var key = decodeURIComponent(pair.shift()),
            value = pair.length > 1 ? pair.join('=') : pair[0];

        if (value != undefined) value = decodeURIComponent(value);

        if (key in hash) {
          if (!Object.isArray(hash[key])) hash[key] = [hash[key]];
          hash[key].push(value);
        }
        else hash[key] = value;
      }
      return hash;
    });
  }

  function toArray() {
    return this.split('');
  }

  function succ() {
    return this.slice(0, this.length - 1) +
      String.fromCharCode(this.charCodeAt(this.length - 1) + 1);
  }

  function times(count) {
    return count < 1 ? '' : new Array(count + 1).join(this);
  }

  function camelize() {
    return this.replace(/-+(.)?/g, function(match, chr) {
      return chr ? chr.toUpperCase() : '';
    });
  }

  function capitalize() {
    return this.charAt(0).toUpperCase() + this.substring(1).toLowerCase();
  }

  function underscore() {
    return this.replace(/::/g, '/')
               .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
               .replace(/([a-z\d])([A-Z])/g, '$1_$2')
               .replace(/-/g, '_')
               .toLowerCase();
  }

  function dasherize() {
    return this.replace(/_/g, '-');
  }

  function inspect(useDoubleQuotes) {
    var escapedString = this.replace(/[\x00-\x1f\\]/g, function(character) {
      if (character in String.specialChar) {
        return String.specialChar[character];
      }
      return '\\u00' + character.charCodeAt().toPaddedString(2, 16);
    });
    if (useDoubleQuotes) return '"' + escapedString.replace(/"/g, '\\"') + '"';
    return "'" + escapedString.replace(/'/g, '\\\'') + "'";
  }

  function unfilterJSON(filter) {
    return this.replace(filter || Prototype.JSONFilter, '$1');
  }

  function isJSON() {
    var str = this;
    if (str.blank()) return false;
    str = str.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@');
    str = str.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']');
    str = str.replace(/(?:^|:|,)(?:\s*\[)+/g, '');
    return (/^[\],:{}\s]*$/).test(str);
  }

  function evalJSON(sanitize) {
    var json = this.unfilterJSON(),
        cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    if (cx.test(json)) {
      json = json.replace(cx, function (a) {
        return '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
      });
    }
    try {
      if (!sanitize || json.isJSON()) return eval('(' + json + ')');
    } catch (e) { }
    throw new SyntaxError('Badly formed JSON string: ' + this.inspect());
  }

  function parseJSON() {
    var json = this.unfilterJSON();
    return JSON.parse(json);
  }

  function include(pattern) {
    return this.indexOf(pattern) > -1;
  }

  function startsWith(pattern) {
    return this.lastIndexOf(pattern, 0) === 0;
  }

  function endsWith(pattern) {
    var d = this.length - pattern.length;
    return d >= 0 && this.indexOf(pattern, d) === d;
  }

  function empty() {
    return this == '';
  }

  function blank() {
    return (/^\s*$/).test(this);
  }

  function interpolate(object, pattern) {
    return new Template(this, pattern).evaluate(object);
  }

  return {
    gsub:           gsub,
    sub:            sub,
    scan:           scan,
    truncate:       truncate,
    strip:          String.prototype.trim || strip,
    stripTags:      stripTags,
    stripScripts:   stripScripts,
    extractScripts: extractScripts,
    evalScripts:    evalScripts,
    escapeHTML:     escapeHTML,
    unescapeHTML:   unescapeHTML,
    toQueryParams:  toQueryParams,
    parseQuery:     toQueryParams,
    toArray:        toArray,
    succ:           succ,
    times:          times,
    camelize:       camelize,
    capitalize:     capitalize,
    underscore:     underscore,
    dasherize:      dasherize,
    inspect:        inspect,
    unfilterJSON:   unfilterJSON,
    isJSON:         isJSON,
    evalJSON:       NATIVE_JSON_PARSE_SUPPORT ? parseJSON : evalJSON,
    include:        include,
    startsWith:     startsWith,
    endsWith:       endsWith,
    empty:          empty,
    blank:          blank,
    interpolate:    interpolate
  };
})());

var Template = Class.create({
  initialize: function(template, pattern) {
    this.template = template.toString();
    this.pattern = pattern || Template.Pattern;
  },

  evaluate: function(object) {
    if (object && Object.isFunction(object.toTemplateReplacements))
      object = object.toTemplateReplacements();

    return this.template.gsub(this.pattern, function(match) {
      if (object == null) return (match[1] + '');

      var before = match[1] || '';
      if (before == '\\') return match[2];

      var ctx = object, expr = match[3],
          pattern = /^([^.[]+|\[((?:.*?[^\\])?)\])(\.|\[|$)/;

      match = pattern.exec(expr);
      if (match == null) return before;

      while (match != null) {
        var comp = match[1].startsWith('[') ? match[2].replace(/\\\\]/g, ']') : match[1];
        ctx = ctx[comp];
        if (null == ctx || '' == match[3]) break;
        expr = expr.substring('[' == match[3] ? match[1].length : match[0].length);
        match = pattern.exec(expr);
      }

      return before + String.interpret(ctx);
    });
  }
});
Template.Pattern = /(^|.|\r|\n)(#\{(.*?)\})/;

var $break = { };

var Enumerable = (function() {

  var slice = Array.prototype.slice;

  function each(iterator, context) {
    try {
      this._each(iterator, context);
    } catch (e) {
      if (e != $break) throw e;
    }
    return this;
  }

  function eachSlice(number, iterator, context) {
    var index = -number, slices = [], array = this.toArray();
    if (number < 1) return array;
    while ((index += number) < array.length)
      slices.push(array.slice(index, index+number));
    return slices.collect(iterator, context);
  }

  function all(iterator, context) {
    iterator = iterator || Prototype.K;
    var result = true;
    this.each(function(value, index) {
      result = result && !!iterator.call(context, value, index, this);
      if (!result) throw $break;
    }, this);
    return result;
  }

  function any(iterator, context) {
    iterator = iterator || Prototype.K;
    var result = false;
    this.each(function(value, index) {
      if (result = !!iterator.call(context, value, index, this))
        throw $break;
    }, this);
    return result;
  }

  function collect(iterator, context) {
    iterator = iterator || Prototype.K;
    var results = [];
    this.each(function(value, index) {
      results.push(iterator.call(context, value, index, this));
    }, this);
    return results;
  }

  function detect(iterator, context) {
    var result;
    this.each(function(value, index) {
      if (iterator.call(context, value, index, this)) {
        result = value;
        throw $break;
      }
    }, this);
    return result;
  }

  function findAll(iterator, context) {
    var results = [];
    this.each(function(value, index) {
      if (iterator.call(context, value, index, this))
        results.push(value);
    }, this);
    return results;
  }

  function grep(filter, iterator, context) {
    iterator = iterator || Prototype.K;
    var results = [];

    if (Object.isString(filter))
      filter = new RegExp(RegExp.escape(filter));

    this.each(function(value, index) {
      if (filter.match(value))
        results.push(iterator.call(context, value, index, this));
    }, this);
    return results;
  }

  function include(object) {
    if (Object.isFunction(this.indexOf) && this.indexOf(object) != -1)
      return true;

    var found = false;
    this.each(function(value) {
      if (value == object) {
        found = true;
        throw $break;
      }
    });
    return found;
  }

  function inGroupsOf(number, fillWith) {
    fillWith = Object.isUndefined(fillWith) ? null : fillWith;
    return this.eachSlice(number, function(slice) {
      while(slice.length < number) slice.push(fillWith);
      return slice;
    });
  }

  function inject(memo, iterator, context) {
    this.each(function(value, index) {
      memo = iterator.call(context, memo, value, index, this);
    }, this);
    return memo;
  }

  function invoke(method) { // FIX
    var args = slice.call(arguments, 1);
    var fn = args.length
      ? function(value) { return value[method].apply(value, args); }
      : function(value) { return value[method](); };
    return this.map(fn);
  }

  function max(iterator, context) {
    iterator = iterator || Prototype.K;
    var result;
    this.each(function(value, index) {
      value = iterator.call(context, value, index, this);
      if (result == null || value >= result)
        result = value;
    }, this);
    return result;
  }

  function min(iterator, context) {
    iterator = iterator || Prototype.K;
    var result;
    this.each(function(value, index) {
      value = iterator.call(context, value, index, this);
      if (result == null || value < result)
        result = value;
    }, this);
    return result;
  }

  function partition(iterator, context) {
    iterator = iterator || Prototype.K;
    var trues = [], falses = [];
    this.each(function(value, index) {
      (iterator.call(context, value, index, this) ?
        trues : falses).push(value);
    }, this);
    return [trues, falses];
  }

  function pluck(property) {
    var results = [];
    this.each(function(value) {
      results.push(value[property]);
    });
    return results;
  }

  function reject(iterator, context) {
    var results = [];
    this.each(function(value, index) {
      if (!iterator.call(context, value, index, this))
        results.push(value);
    }, this);
    return results;
  }

  function sortBy(iterator, context) {
    return this.map(function(value, index) {
      return {
        value: value,
        criteria: iterator.call(context, value, index, this)
      };
    }, this).sort(function(left, right) {
      var a = left.criteria, b = right.criteria;
      return a < b ? -1 : a > b ? 1 : 0;
    }).pluck('value');
  }

  function toArray() {
    return this.map();
  }

  function zip() {
    var iterator = Prototype.K, args = $A(arguments);
    if (Object.isFunction(args.last()))
      iterator = args.pop();

    var collections = [this].concat(args).map($A);
    return this.map(function(value, index) {
      return iterator(collections.pluck(index));
    });
  }

  function size() {
    return this.toArray().length;
  }

  function inspect() {
    return '#<Enumerable:' + this.toArray().inspect() + '>';
  }









  return {
    each:       each,
    eachSlice:  eachSlice,
    all:        all,
    every:      all,
    any:        any,
    some:       any,
    collect:    collect,
    map:        collect,
    detect:     detect,
    findAll:    findAll,
    select:     findAll,
    filter:     findAll,
    grep:       grep,
    include:    include,
    member:     include,
    inGroupsOf: inGroupsOf,
    inject:     inject,
    invoke:     invoke,
    max:        max,
    min:        min,
    partition:  partition,
    pluck:      pluck,
    reject:     reject,
    sortBy:     sortBy,
    toArray:    toArray,
    entries:    toArray,
    zip:        zip,
    size:       size,
    inspect:    inspect,
    find:       detect
  };
})();

function $A(iterable) {
  if (!iterable) return [];
  if ('toArray' in Object(iterable)) return iterable.toArray();
  var length = iterable.length || 0, results = new Array(length);
  while (length--) results[length] = iterable[length];
  return results;
}


function $w(string) {
  if (!Object.isString(string)) return [];
  string = string.strip();
  return string ? string.split(/\s+/) : [];
}

Array.from = $A;


(function() {
  var arrayProto = Array.prototype,
      slice = arrayProto.slice,
      _each = arrayProto.forEach; // use native browser JS 1.6 implementation if available

  function each(iterator, context) {
    for (var i = 0, length = this.length >>> 0; i < length; i++) {
      if (i in this) iterator.call(context, this[i], i, this);
    }
  }
  if (!_each) _each = each;

  function clear() {
    this.length = 0;
    return this;
  }

  function first() {
    return this[0];
  }

  function last() {
    return this[this.length - 1];
  }

  function compact() {
    return this.select(function(value) {
      return value != null;
    });
  }

  function flatten() {
    return this.inject([], function(array, value) {
      if (Object.isArray(value))
        return array.concat(value.flatten());
      array.push(value);
      return array;
    });
  }

  function without() {
    var values = slice.call(arguments, 0);
    return this.select(function(value) {
      return !values.include(value);
    });
  }

  function reverse(inline) {
    return (inline === false ? this.toArray() : this)._reverse();
  }

  function uniq(sorted) {
    return this.inject([], function(array, value, index) {
      if (0 == index || (sorted ? array.last() != value : !array.include(value)))
        array.push(value);
      return array;
    });
  }

  function intersect(array) {
    return this.uniq().findAll(function(item) {
      return array.indexOf(item) !== -1;
    });
  }


  function clone() {
    return slice.call(this, 0);
  }

  function size() {
    return this.length;
  }

  function inspect() {
    return '[' + this.map(Object.inspect).join(', ') + ']';
  }

  function indexOf(item, i) {
    if (this == null) throw new TypeError();

    var array = Object(this), length = array.length >>> 0;
    if (length === 0) return -1;

    i = Number(i);
    if (isNaN(i)) {
      i = 0;
    } else if (i !== 0 && isFinite(i)) {
      i = (i > 0 ? 1 : -1) * Math.floor(Math.abs(i));
    }

    if (i > length) return -1;

    var k = i >= 0 ? i : Math.max(length - Math.abs(i), 0);
    for (; k < length; k++)
      if (k in array && array[k] === item) return k;
    return -1;
  }


  function lastIndexOf(item, i) {
    if (this == null) throw new TypeError();

    var array = Object(this), length = array.length >>> 0;
    if (length === 0) return -1;

    if (!Object.isUndefined(i)) {
      i = Number(i);
      if (isNaN(i)) {
        i = 0;
      } else if (i !== 0 && isFinite(i)) {
        i = (i > 0 ? 1 : -1) * Math.floor(Math.abs(i));
      }
    } else {
      i = length;
    }

    var k = i >= 0 ? Math.min(i, length - 1) :
     length - Math.abs(i);

    for (; k >= 0; k--)
      if (k in array && array[k] === item) return k;
    return -1;
  }

  function concat(_) {
    var array = [], items = slice.call(arguments, 0), item, n = 0;
    items.unshift(this);
    for (var i = 0, length = items.length; i < length; i++) {
      item = items[i];
      if (Object.isArray(item) && !('callee' in item)) {
        for (var j = 0, arrayLength = item.length; j < arrayLength; j++) {
          if (j in item) array[n] = item[j];
          n++;
        }
      } else {
        array[n++] = item;
      }
    }
    array.length = n;
    return array;
  }


  function wrapNative(method) {
    return function() {
      if (arguments.length === 0) {
        return method.call(this, Prototype.K);
      } else if (arguments[0] === undefined) {
        var args = slice.call(arguments, 1);
        args.unshift(Prototype.K);
        return method.apply(this, args);
      } else {
        return method.apply(this, arguments);
      }
    };
  }


  function map(iterator, context) {
    if (this == null) throw new TypeError();
    iterator = iterator || Prototype.K;

    var object = Object(this), results = [], n = 0;

    for (var i = 0, length = object.length >>> 0; i < length; i++) {
      if (i in object) {
        results[n] = iterator.call(context, object[i], i, object);
      }
      n++;
    }
    results.length = n;
    return results;
  }

  if (arrayProto.map) {
    map = wrapNative(Array.prototype.map);
  }

  function filter(iterator, context) {
    if (this == null || !Object.isFunction(iterator))
      throw new TypeError();

    var object = Object(this), results = [], value;

    for (var i = 0, length = object.length >>> 0; i < length; i++) {
      if (i in object) {
        value = object[i];
        if (iterator.call(context, value, i, object)) {
          results.push(value);
        }
      }
    }
    return results;
  }

  if (arrayProto.filter) {
    filter = Array.prototype.filter;
  }

  function some(iterator, context) {
    if (this == null) throw new TypeError();
    iterator = iterator || Prototype.K;

    var object = Object(this);
    for (var i = 0, length = object.length >>> 0; i < length; i++) {
      if (i in object && iterator.call(context, object[i], i, object)) {
        return true;
      }
    }

    return false;
  }

  if (arrayProto.some) {
    var some = wrapNative(Array.prototype.some);
  }


  function every(iterator, context) {
    if (this == null) throw new TypeError();
    iterator = iterator || Prototype.K;

    var object = Object(this);
    for (var i = 0, length = object.length >>> 0; i < length; i++) {
      if (i in object && !iterator.call(context, object[i], i, object)) {
        return false;
      }
    }

    return true;
  }

  if (arrayProto.every) {
    var every = wrapNative(Array.prototype.every);
  }

  var _reduce = arrayProto.reduce;
  var inject = _reduce ? function(memo, iterator, context) {
    return _reduce.call(this, iterator ? iterator.bind(context) : Prototype.K, memo);
  } : Enumerable.inject;

  Object.extend(arrayProto, Enumerable);

  if (!arrayProto._reverse)
    arrayProto._reverse = arrayProto.reverse;

  Object.extend(arrayProto, {
    _each:     _each,

    map:       map,
    collect:   map,
    select:    filter,
    filter:    filter,
    findAll:   filter,
    some:      some,
    any:       some,
    every:     every,
    all:       every,
    inject:    inject,

    clear:     clear,
    first:     first,
    last:      last,
    compact:   compact,
    flatten:   flatten,
    without:   without,
    reverse:   reverse,
    uniq:      uniq,
    intersect: intersect,
    clone:     clone,
    toArray:   clone,
    size:      size,
    inspect:   inspect
  });

  var CONCAT_ARGUMENTS_BUGGY = (function() {
    return [].concat(arguments)[0][0] !== 1;
  })(1,2);

  if (CONCAT_ARGUMENTS_BUGGY) arrayProto.concat = concat;

  if (!arrayProto.indexOf) arrayProto.indexOf = indexOf;
  if (!arrayProto.lastIndexOf) arrayProto.lastIndexOf = lastIndexOf;
})();
function $H(object) {
  return new Hash(object);
}

var Hash = Class.create(Enumerable, (function() {
  function initialize(object) {
    this._object = Object.isHash(object) ? object.toObject() : Object.clone(object);
  }



  function _each(iterator, context) {
    var i = 0;
    for (var key in this._object) {
      var value = this._object[key], pair = [key, value];
      pair.key = key;
      pair.value = value;
      iterator.call(context, pair, i);
      i++;
    }
  }

  function set(key, value) {
    return this._object[key] = value;
  }

  function get(key) {
    if (this._object[key] !== Object.prototype[key])
      return this._object[key];
  }

  function unset(key) {
    var value = this._object[key];
    delete this._object[key];
    return value;
  }

  function toObject() {
    return Object.clone(this._object);
  }



  function keys() {
    return this.pluck('key');
  }

  function values() {
    return this.pluck('value');
  }

  function index(value) {
    var match = this.detect(function(pair) {
      return pair.value === value;
    });
    return match && match.key;
  }

  function merge(object) {
    return this.clone().update(object);
  }

  function update(object) {
    return new Hash(object).inject(this, function(result, pair) {
      result.set(pair.key, pair.value);
      return result;
    });
  }

  function toQueryPair(key, value) {
    if (Object.isUndefined(value)) return key;

    value = encodeURIComponent(String.interpret(value));

    value = value.replace(/(%0D)?%0A/g, '%0D%0A'); // FIX
    value = value.replace(/%20/g, '+'); // FIX
    key = key.replace(/%20/g, '+'); // FIX
    return key + '=' + value;
  }

  function toQueryString() {
    return this.inject([], function(results, pair) {
      var key = encodeURIComponent(pair.key), values = pair.value;

      if (values && typeof values == 'object') {
        if (Object.isArray(values)) {
          var queryValues = [];
          for (var i = 0, len = values.length, value; i < len; i++) {
            value = values[i];
            queryValues.push(toQueryPair(key, value));
          }
          return results.concat(queryValues);
        }
      } else results.push(toQueryPair(key, values));
      return results;
    }).join('&');
  }

  function inspect() {
    return '#<Hash:{' + this.map(function(pair) {
      return pair.map(Object.inspect).join(': ');
    }).join(', ') + '}>';
  }

  function clone() {
    return new Hash(this);
  }

  return {
    initialize:             initialize,
    _each:                  _each,
    set:                    set,
    get:                    get,
    unset:                  unset,
    toObject:               toObject,
    toTemplateReplacements: toObject,
    keys:                   keys,
    values:                 values,
    index:                  index,
    merge:                  merge,
    update:                 update,
    toQueryString:          toQueryString,
    inspect:                inspect,
    toJSON:                 toObject,
    clone:                  clone
  };
})());

Hash.from = $H;
Object.extend(Number.prototype, (function() {
  function toColorPart() {
    return this.toPaddedString(2, 16);
  }

  function succ() {
    return this + 1;
  }

  function times(iterator, context) {
    $R(0, this, true).each(iterator, context);
    return this;
  }

  function toPaddedString(length, radix) {
    var string = this.toString(radix || 10);
    return '0'.times(length - string.length) + string;
  }

  function abs() {
    return Math.abs(this);
  }

  function round() {
    return Math.round(this);
  }

  function ceil() {
    return Math.ceil(this);
  }

  function floor() {
    return Math.floor(this);
  }

  return {
    toColorPart:    toColorPart,
    succ:           succ,
    times:          times,
    toPaddedString: toPaddedString,
    abs:            abs,
    round:          round,
    ceil:           ceil,
    floor:          floor
  };
})());

function $R(start, end, exclusive) {
  return new ObjectRange(start, end, exclusive);
}

var ObjectRange = Class.create(Enumerable, (function() {
  function initialize(start, end, exclusive) {
    this.start = start;
    this.end = end;
    this.exclusive = exclusive;
  }

  function _each(iterator, context) {
    var value = this.start, i;
    for (i = 0; this.include(value); i++) {
      iterator.call(context, value, i);
      value = value.succ();
    }
  }

  function include(value) {
    if (value < this.start)
      return false;
    if (this.exclusive)
      return value < this.end;
    return value <= this.end;
  }

  return {
    initialize: initialize,
    _each:      _each,
    include:    include
  };
})());



var Abstract = { };


var Try = {
  these: function() {
    var returnValue;

    for (var i = 0, length = arguments.length; i < length; i++) {
      var lambda = arguments[i];
      try {
        returnValue = lambda();
        break;
      } catch (e) { }
    }

    return returnValue;
  }
};

var Ajax = {
  getTransport: function() {
    return Try.these(
      function() {return new XMLHttpRequest();},
      function() {return new ActiveXObject('Msxml2.XMLHTTP');},
      function() {return new ActiveXObject('Microsoft.XMLHTTP');}
    ) || false;
  },

  activeRequestCount: 0
};

Ajax.Responders = {
  responders: [],

  _each: function(iterator, context) {
    this.responders._each(iterator, context);
  },

  register: function(responder) {
    if (!this.include(responder))
      this.responders.push(responder);
  },

  unregister: function(responder) {
    this.responders = this.responders.without(responder);
  },

  dispatch: function(callback, request, transport, json) {
    this.each(function(responder) {
      if (Object.isFunction(responder[callback])) {
        try {
          responder[callback].apply(responder, [request, transport, json]);
        } catch (e) { }
      }
    });
  }
};

Object.extend(Ajax.Responders, Enumerable);

Ajax.Responders.register({
  onCreate:   function() { Ajax.activeRequestCount++; },
  onComplete: function() { Ajax.activeRequestCount--; }
});
Ajax.Base = Class.create({
  initialize: function(options) {
    this.options = {
      method:       'post',
      asynchronous: true,
      contentType:  'application/x-www-form-urlencoded',
      encoding:     'UTF-8',
      parameters:   '',
      evalJSON:     true,
      evalJS:       true
    };
    Object.extend(this.options, options || { });

    this.options.method = this.options.method.toLowerCase();

    if (Object.isHash(this.options.parameters))
      this.options.parameters = this.options.parameters.toObject();
  }
});
Ajax.Request = Class.create(Ajax.Base, {
  _complete: false,

  initialize: function($super, url, options) {
    $super(options);
    this.transport = Ajax.getTransport();
    this.request(url);
  },

  request: function(url) {
    this.url = url;
    this.method = this.options.method;
    var params = Object.isString(this.options.parameters) ?
          this.options.parameters :
          Object.toQueryString(this.options.parameters);

    if (!['get', 'post'].include(this.method)) {
      params += (params ? '&' : '') + "_method=" + this.method;
      this.method = 'post';
    }

    if (params && this.method === 'get') {
      this.url += (this.url.include('?') ? '&' : '?') + params;
    }

    this.parameters = params.toQueryParams();

    try {
      var response = new Ajax.Response(this);
      if (this.options.onCreate) this.options.onCreate(response);
      Ajax.Responders.dispatch('onCreate', this, response);

      this.transport.open(this.method.toUpperCase(), this.url,
        this.options.asynchronous);

      if (this.options.asynchronous) this.respondToReadyState.bind(this).defer(1);

      this.transport.onreadystatechange = this.onStateChange.bind(this);
      this.setRequestHeaders();

      this.body = this.method == 'post' ? (this.options.postBody || params) : null;
      this.transport.send(this.body);

      /* Force Firefox to handle ready state 4 for synchronous requests */
      if (!this.options.asynchronous && this.transport.overrideMimeType)
        this.onStateChange();

    }
    catch (e) {
      this.dispatchException(e);
    }
  },

  onStateChange: function() {
    var readyState = this.transport.readyState;
    if (readyState > 1 && !((readyState == 4) && this._complete))
      this.respondToReadyState(readyState);
  },

  setRequestHeaders: function() {
    var headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Prototype-Version': Prototype.Version,
      'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
    };

    if (this.method == 'post') {
      headers['Content-Type'] = this.options.contentType +
        (this.options.encoding ? '; charset=' + this.options.encoding : '');

      /* Force "Connection: close" for older Mozilla browsers to work
       * around a bug where XMLHttpRequest sends an incorrect
       * Content-length header. See Mozilla Bugzilla #246651.
       */
      if (this.transport.overrideMimeType &&
          (navigator.userAgent.match(/Gecko\/(\d{4})/) || [0,2005])[1] < 2005)
            headers['Connection'] = 'close';
    }

    if (typeof this.options.requestHeaders == 'object') {
      var extras = this.options.requestHeaders;

      if (Object.isFunction(extras.push))
        for (var i = 0, length = extras.length; i < length; i += 2)
          headers[extras[i]] = extras[i+1];
      else
        $H(extras).each(function(pair) { headers[pair.key] = pair.value; });
    }

    for (var name in headers)
      if (headers[name])
        this.transport.setRequestHeader(name, headers[name]);
  },

  success: function() {
    var status = this.getStatus();
    return !status || (status >= 200 && status < 300) || status == 304;
  },

  getStatus: function() {
    try {
      if (this.transport.status === 1223) return 204;
      return this.transport.status || 0;
    } catch (e) { return 0; }
  },

  respondToReadyState: function(readyState) {
    var state = Ajax.Request.Events[readyState], response = new Ajax.Response(this);

    if (state == 'Complete') {
      try {
        this._complete = true;
        (this.options['on' + response.status]
         || this.options['on' + (this.success() ? 'Success' : 'Failure')]
         || Prototype.emptyFunction)(response, response.headerJSON);
      } catch (e) {
        this.dispatchException(e);
      }

      var contentType = response.getHeader('Content-Type');
      if (this.options.evalJS == 'force'
          || (this.options.evalJS && this.isSameOrigin() && contentType
          && contentType.match(/^\s*(text|application)\/(x-)?(java|ecma)script(;.*)?\s*$/i)))
        this.evalResponse();
    }

    try {
      (this.options['on' + state] || Prototype.emptyFunction)(response, response.headerJSON);
      Ajax.Responders.dispatch('on' + state, this, response, response.headerJSON);
    } catch (e) {
      this.dispatchException(e);
    }

    if (state == 'Complete') {
      this.transport.onreadystatechange = Prototype.emptyFunction;
    }
  },

  isSameOrigin: function() {
    var m = this.url.match(/^\s*https?:\/\/[^\/]*/);
    return !m || (m[0] == '#{protocol}//#{domain}#{port}'.interpolate({
      protocol: location.protocol,
      domain: document.domain,
      port: location.port ? ':' + location.port : ''
    }));
  },

  getHeader: function(name) {
    try {
      return this.transport.getResponseHeader(name) || null;
    } catch (e) { return null; }
  },

  evalResponse: function() {
    try {
      return eval((this.transport.responseText || '').unfilterJSON());
    } catch (e) {
      this.dispatchException(e);
    }
  },

  dispatchException: function(exception) {
    (this.options.onException || Prototype.emptyFunction)(this, exception);
    Ajax.Responders.dispatch('onException', this, exception);
  }
});

Ajax.Request.Events =
  ['Uninitialized', 'Loading', 'Loaded', 'Interactive', 'Complete'];








Ajax.Response = Class.create({
  initialize: function(request){
    this.request = request;
    var transport  = this.transport  = request.transport,
        readyState = this.readyState = transport.readyState;

    if ((readyState > 2 && !Prototype.Browser.IE) || readyState == 4) { // FIX
      this.status     = this.getStatus();
      this.statusText = this.getStatusText();
      this.headerJSON = this._getHeaderJSON();

      if (readyState == 4 || request.options.onInteractive)
        this.responseText = String.interpret(transport.responseText);

      if (readyState == 4) {
        var xml = transport.responseXML;
        this.responseXML  = Object.isUndefined(xml) ? null : xml;
        this.responseJSON = this._getResponseJSON();
      }
    }
  },

  status:      0,

  statusText: '',

  getStatus: Ajax.Request.prototype.getStatus,

  getStatusText: function() {
    try {
      return this.transport.statusText || '';
    } catch (e) { return ''; }
  },

  getHeader: Ajax.Request.prototype.getHeader,

  getAllHeaders: function() {
    try {
      return this.getAllResponseHeaders();
    } catch (e) { return null; }
  },

  getResponseHeader: function(name) {
    return this.transport.getResponseHeader(name);
  },

  getAllResponseHeaders: function() {
    return this.transport.getAllResponseHeaders();
  },

  _getHeaderJSON: function() {
    var json = this.getHeader('X-JSON');
    if (!json) return null;

    try {
      json = decodeURIComponent(escape(json));
    } catch(e) {
    }

    try {
      return json.evalJSON(this.request.options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  },

  _getResponseJSON: function() {
    var options = this.request.options;
    if (!options.evalJSON || (options.evalJSON != 'force' &&
      !(this.getHeader('Content-Type') || '').include('application/json')) ||
        this.responseText.blank())
          return null;
    try {
      return this.responseText.evalJSON(options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  }
});

Ajax.Updater = Class.create(Ajax.Request, {
  initialize: function($super, container, url, options) {
    this.container = {
      success: (container.success || container),
      failure: (container.failure || (container.success ? null : container))
    };

    options = Object.clone(options);
    var onComplete = options.onComplete;
    options.onComplete = (function(response, json) {
      this.updateContent(response.responseText);
      if (Object.isFunction(onComplete)) onComplete(response, json);
    }).bind(this);

    $super(url, options);
  },

  updateContent: function(responseText) {
    var receiver = this.container[this.success() ? 'success' : 'failure'],
        options = this.options;

    if (!options.evalScripts) responseText = responseText.stripScripts();

    if (receiver = $(receiver)) {
      if (options.insertion) {
        if (Object.isString(options.insertion)) {
          var insertion = { }; insertion[options.insertion] = responseText;
          receiver.insert(insertion);
        }
        else options.insertion(receiver, responseText);
      }
      else receiver.update(responseText);
    }
  }
});

Ajax.PeriodicalUpdater = Class.create(Ajax.Base, {
  initialize: function($super, container, url, options) {
    $super(options);
    this.onComplete = this.options.onComplete;

    this.frequency = (this.options.frequency || 2);
    this.decay = (this.options.decay || 1);

    this.updater = { };
    this.container = container;
    this.url = url;

    this.start();
  },

  start: function() {
    this.options.onComplete = this.updateComplete.bind(this);
    this.onTimerEvent();
  },

  stop: function() {
    this.updater.options.onComplete = undefined;
    clearTimeout(this.timer);
    (this.onComplete || Prototype.emptyFunction).apply(this, arguments);
  },

  updateComplete: function(response) {
    if (this.options.decay) {
      this.decay = (response.responseText == this.lastText ?
        this.decay * this.options.decay : 1);

      this.lastText = response.responseText;
    }
    this.timer = this.onTimerEvent.bind(this).delay(this.decay * this.frequency);
  },

  onTimerEvent: function() {
    this.updater = new Ajax.Updater(this.container, this.url, this.options);
  }
});

(function(GLOBAL) {

  var UNDEFINED;
  var SLICE = Array.prototype.slice;

  var DIV = document.createElement('div');


  function $(element) {
    if (arguments.length > 1) {
      for (var i = 0, elements = [], length = arguments.length; i < length; i++)
        elements.push($(arguments[i]));
      return elements;
    }

    if (Object.isString(element))
      element = document.getElementById(element);
    return Element.extend(element);
  }

  GLOBAL.$ = $;


  if (!GLOBAL.Node) GLOBAL.Node = {};

  if (!GLOBAL.Node.ELEMENT_NODE) {
    Object.extend(GLOBAL.Node, {
      ELEMENT_NODE:                1,
      ATTRIBUTE_NODE:              2,
      TEXT_NODE:                   3,
      CDATA_SECTION_NODE:          4,
      ENTITY_REFERENCE_NODE:       5,
      ENTITY_NODE:                 6,
      PROCESSING_INSTRUCTION_NODE: 7,
      COMMENT_NODE:                8,
      DOCUMENT_NODE:               9,
      DOCUMENT_TYPE_NODE:         10,
      DOCUMENT_FRAGMENT_NODE:     11,
      NOTATION_NODE:              12
    });
  }

  var ELEMENT_CACHE = {};

  function shouldUseCreationCache(tagName, attributes) {
    if (tagName === 'select') return false;
    if ('type' in attributes) return false;
    return true;
  }

  var HAS_EXTENDED_CREATE_ELEMENT_SYNTAX = Prototype.Browser.IE && (function(){
    try {
      var el = document.createElement('<input name="x">');
      return el.tagName.toLowerCase() === 'input' && el.name === 'x';
    }
    catch(err) {
      return false;
    }
  })();


  var oldElement = GLOBAL.Element;
  function Element(tagName, attributes) {
    attributes = attributes || {};
    tagName = tagName.toLowerCase();

    if (HAS_EXTENDED_CREATE_ELEMENT_SYNTAX && attributes.name) {
      tagName = '<' + tagName + ' name="' + attributes.name + '">';
      delete attributes.name;
      return Element.writeAttribute(document.createElement(tagName), attributes);
    }

    if (!ELEMENT_CACHE[tagName])
      ELEMENT_CACHE[tagName] = Element.extend(document.createElement(tagName));

    var node = shouldUseCreationCache(tagName, attributes) ?
     ELEMENT_CACHE[tagName].cloneNode(false) : document.createElement(tagName);

    return Element.writeAttribute(node, attributes);
  }

  GLOBAL.Element = Element;

  Object.extend(GLOBAL.Element, oldElement || {});
  if (oldElement) GLOBAL.Element.prototype = oldElement.prototype;

  Element.Methods = { ByTag: {}, Simulated: {} };

  var methods = {};

  var INSPECT_ATTRIBUTES = { id: 'id', className: 'class' };
  function inspect(element) {
    element = $(element);
    var result = '<' + element.tagName.toLowerCase();

    var attribute, value;
    for (var property in INSPECT_ATTRIBUTES) {
      attribute = INSPECT_ATTRIBUTES[property];
      value = (element[property] || '').toString();
      if (value) result += ' ' + attribute + '=' + value.inspect(true);
    }

    return result + '>';
  }

  methods.inspect = inspect;


  function visible(element) {
    return $(element).style.display !== 'none';
  }

  function toggle(element, bool) {
    element = $(element);
    if (Object.isUndefined(bool))
      bool = !Element.visible(element);
    Element[bool ? 'show' : 'hide'](element);

    return element;
  }

  function hide(element) {
    element = $(element);
    element.style.display = 'none';
    return element;
  }

  function show(element) {
    element = $(element);
    element.style.display = '';
    return element;
  }


  Object.extend(methods, {
    visible: visible,
    toggle:  toggle,
    hide:    hide,
    show:    show
  });


  function remove(element) {
    element = $(element);
    element.parentNode.removeChild(element);
    return element;
  }

  var SELECT_ELEMENT_INNERHTML_BUGGY = (function(){
    var el = document.createElement("select"),
        isBuggy = true;
    el.innerHTML = "<option value=\"test\">test</option>";
    if (el.options && el.options[0]) {
      isBuggy = el.options[0].nodeName.toUpperCase() !== "OPTION";
    }
    el = null;
    return isBuggy;
  })();

  var TABLE_ELEMENT_INNERHTML_BUGGY = (function(){
    try {
      var el = document.createElement("table");
      if (el && el.tBodies) {
        el.innerHTML = "<tbody><tr><td>test</td></tr></tbody>";
        var isBuggy = typeof el.tBodies[0] == "undefined";
        el = null;
        return isBuggy;
      }
    } catch (e) {
      return true;
    }
  })();

  var LINK_ELEMENT_INNERHTML_BUGGY = (function() {
    try {
      var el = document.createElement('div');
      el.innerHTML = "<link />";
      var isBuggy = (el.childNodes.length === 0);
      el = null;
      return isBuggy;
    } catch(e) {
      return true;
    }
  })();

  var ANY_INNERHTML_BUGGY = SELECT_ELEMENT_INNERHTML_BUGGY ||
   TABLE_ELEMENT_INNERHTML_BUGGY || LINK_ELEMENT_INNERHTML_BUGGY;

  var SCRIPT_ELEMENT_REJECTS_TEXTNODE_APPENDING = (function () {
    var s = document.createElement("script"),
        isBuggy = false;
    try {
      s.appendChild(document.createTextNode(""));
      isBuggy = !s.firstChild ||
        s.firstChild && s.firstChild.nodeType !== 3;
    } catch (e) {
      isBuggy = true;
    }
    s = null;
    return isBuggy;
  })();


  function updateNodes(element, nodes) {
    while (element.firstChild)
      element.removeChild(element.firstChild);
    for (var i = 0, node; node = nodes[i]; i++)
      element.appendChild(node);
  }

  function update(element, content) {
    element = $(element);

    var descendants = element.getElementsByTagName('*'),
     i = descendants.length;
    while (i--) purgeElement(descendants[i]);

    if (content && content.toElement)
      content = content.toElement();

    if (Object.isElement(content))
      return element.update().insert(content);


    content = Object.toHTML(content);
    var tagName = element.tagName.toUpperCase();

    if (tagName === 'SCRIPT' && SCRIPT_ELEMENT_REJECTS_TEXTNODE_APPENDING) {
      element.text = content;
      return element;
    }

    var strippedContent = content.stripScripts();
    if (ANY_INNERHTML_BUGGY) {
      if (tagName in INSERTION_TRANSLATIONS.tags) {
        updateNodes(element, getContentFromAnonymousElement(tagName, strippedContent));
      } else if (LINK_ELEMENT_INNERHTML_BUGGY && strippedContent.indexOf('<link') > -1) {
        updateNodes(element, getContentFromAnonymousElement(tagName, strippedContent, true));
      } else {
        element.innerHTML = strippedContent;
      }
    } else {
      element.innerHTML = strippedContent;
    }

    content.evalScripts.bind(content).defer();
    return element;
  }

  function replace(element, content) {
    element = $(element);

    if (content && content.toElement) {
      content = content.toElement();
    } else if (!Object.isElement(content)) {
      content = Object.toHTML(content);
      var range = element.ownerDocument.createRange();
      range.selectNode(element);
      content.evalScripts.bind(content).defer();
      content = range.createContextualFragment(content.stripScripts());
    }

    element.parentNode.replaceChild(content, element);
    return element;
  }

  var INSERTION_TRANSLATIONS = {
    before: function(element, node) {
      element.parentNode.insertBefore(node, element);
    },
    top: function(element, node) {
      element.insertBefore(node, element.firstChild);
    },
    bottom: function(element, node) {
      element.appendChild(node);
    },
    after: function(element, node) {
      element.parentNode.insertBefore(node, element.nextSibling);
    },

    tags: {
      TABLE:  ['<table>',                '</table>',                   1],
      TBODY:  ['<table><tbody>',         '</tbody></table>',           2],
      TR:     ['<table><tbody><tr>',     '</tr></tbody></table>',      3],
      TD:     ['<table><tbody><tr><td>', '</td></tr></tbody></table>', 4],
      SELECT: ['<select>',               '</select>',                  1]
    }
  };

  var tags = INSERTION_TRANSLATIONS.tags;

  Object.extend(tags, {
    THEAD: tags.TBODY,
    TFOOT: tags.TBODY,
    TH:    tags.TD
  });

  function replace_IE(element, content) {
    element = $(element);
    if (content && content.toElement)
      content = content.toElement();
    if (Object.isElement(content)) {
      element.parentNode.replaceChild(content, element);
      return element;
    }

    content = Object.toHTML(content);
    var parent = element.parentNode, tagName = parent.tagName.toUpperCase();

    if (tagName in INSERTION_TRANSLATIONS.tags) {
      var nextSibling = Element.next(element);
      var fragments = getContentFromAnonymousElement(
       tagName, content.stripScripts());

      parent.removeChild(element);

      var iterator;
      if (nextSibling)
        iterator = function(node) { parent.insertBefore(node, nextSibling); };
      else
        iterator = function(node) { parent.appendChild(node); };

      fragments.each(iterator);
    } else {
      element.outerHTML = content.stripScripts();
    }

    content.evalScripts.bind(content).defer();
    return element;
  }

  if ('outerHTML' in document.documentElement)
    replace = replace_IE;

  function isContent(content) {
    if (Object.isUndefined(content) || content === null) return false;

    if (Object.isString(content) || Object.isNumber(content)) return true;
    if (Object.isElement(content)) return true;
    if (content.toElement || content.toHTML) return true;

    return false;
  }

  function insertContentAt(element, content, position) {
    position   = position.toLowerCase();
    var method = INSERTION_TRANSLATIONS[position];

    if (content && content.toElement) content = content.toElement();
    if (Object.isElement(content)) {
      method(element, content);
      return element;
    }

    content = Object.toHTML(content);
    var tagName = ((position === 'before' || position === 'after') ?
     element.parentNode : element).tagName.toUpperCase();

    var childNodes = getContentFromAnonymousElement(tagName, content.stripScripts());

    if (position === 'top' || position === 'after') childNodes.reverse();

    for (var i = 0, node; node = childNodes[i]; i++)
      method(element, node);

    content.evalScripts.bind(content).defer();
  }

  function insert(element, insertions) {
    element = $(element);

    if (isContent(insertions))
      insertions = { bottom: insertions };

    for (var position in insertions)
      insertContentAt(element, insertions[position], position);

    return element;
  }

  function wrap(element, wrapper, attributes) {
    element = $(element);

    if (Object.isElement(wrapper)) {
      $(wrapper).writeAttribute(attributes || {});
    } else if (Object.isString(wrapper)) {
      wrapper = new Element(wrapper, attributes);
    } else {
      wrapper = new Element('div', wrapper);
    }

    if (element.parentNode)
      element.parentNode.replaceChild(wrapper, element);

    wrapper.appendChild(element);

    return wrapper;
  }

  function cleanWhitespace(element) {
    element = $(element);
    var node = element.firstChild;

    while (node) {
      var nextNode = node.nextSibling;
      if (node.nodeType === Node.TEXT_NODE && !/\S/.test(node.nodeValue))
        element.removeChild(node);
      node = nextNode;
    }
    return element;
  }

  function empty(element) {
    return $(element).innerHTML.blank();
  }

  function getContentFromAnonymousElement(tagName, html, force) {
    var t = INSERTION_TRANSLATIONS.tags[tagName], div = DIV;

    var workaround = !!t;
    if (!workaround && force) {
      workaround = true;
      t = ['', '', 0];
    }

    if (workaround) {
      div.innerHTML = '&#160;' + t[0] + html + t[1];
      div.removeChild(div.firstChild);
      for (var i = t[2]; i--; )
        div = div.firstChild;
    } else {
      div.innerHTML = html;
    }

    return $A(div.childNodes);
  }

  function clone(element, deep) {
    if (!(element = $(element))) return;
    var clone = element.cloneNode(deep);
    if (!HAS_UNIQUE_ID_PROPERTY) {
      clone._prototypeUID = UNDEFINED;
      if (deep) {
        var descendants = Element.select(clone, '*'),
         i = descendants.length;
        while (i--)
          descendants[i]._prototypeUID = UNDEFINED;
      }
    }
    return Element.extend(clone);
  }

  function purgeElement(element) {
    var uid = getUniqueElementID(element);
    if (uid) {
      Element.stopObserving(element);
      if (!HAS_UNIQUE_ID_PROPERTY)
        element._prototypeUID = UNDEFINED;
      delete Element.Storage[uid];
    }
  }

  function purgeCollection(elements) { // FIX
    var i = elements.length, element, uid;
    while (i--) {
      element = elements[i];
      uid = getUniqueElementID(element);
      if (uid) {
        Element.stopObserving(element);
        element._prototypeUID = UNDEFINED;
        delete Element.Storage[uid];
      }
    }
  }

  function purgeCollection_IE(elements) {
    var i = elements.length, element, uid;
    while (i--) {
      element = elements[i];
      uid = getUniqueElementID(element);
      delete Element.Storage[uid];
      delete Event.cache[uid];
    }
  }

  if (HAS_UNIQUE_ID_PROPERTY) {
    purgeCollection = purgeCollection_IE;
  }


  function purge(element) {
    if (!(element = $(element))) return;
    purgeElement(element);

    var descendants = element.getElementsByTagName('*'),
     i = descendants.length;

    while (i--) purgeElement(descendants[i]);

    return null;
  }

  Object.extend(methods, {
    remove:  remove,
    update:  update,
    replace: replace,
    insert:  insert,
    wrap:    wrap,
    cleanWhitespace: cleanWhitespace,
    empty:   empty,
    clone:   clone,
    purge:   purge
  });



  function recursivelyCollect(element, property, maximumLength) {
    element = $(element);
    maximumLength = maximumLength || -1;
    var elements = [];

    while (element = element[property]) {
      if (element.nodeType === Node.ELEMENT_NODE)
        elements.push(Element.extend(element));

      if (elements.length === maximumLength) break;
    }

    return elements;
  }


  function ancestors(element) {
    return recursivelyCollect(element, 'parentNode');
  }

  function descendants(element) {
    return Element.select(element, '*');
  }

  function firstDescendant(element) {
    element = $(element).firstChild;
    while (element && element.nodeType !== Node.ELEMENT_NODE)
      element = element.nextSibling;

    return $(element);
  }

  function lastDescendant(element) {
    element = $(element).lastChild;
    while (element && element.nodeType != 1) element = element.previousSibling;
    return $(element);
  }

  function immediateDescendants(element) {
    var results = [], child = $(element).firstChild;

    while (child) {
      if (child.nodeType === Node.ELEMENT_NODE)
        results.push(Element.extend(child));

      child = child.nextSibling;
    }

    return results;
  }

  function previousSiblings(element, maximumLength) {
    return recursivelyCollect(element, 'previousSibling', maximumLength);
  }

  function nextSiblings(element, maximumLength) {
    return recursivelyCollect(element, 'nextSibling', maximumLength);
  }

  function siblings(element) {
    element = $(element);
    var previous = previousSiblings(element),
     next = nextSiblings(element);
    return previous.reverse().concat(next);
  }

  function match(element, selector) {
    element = $(element);

    if (Object.isString(selector))
      return Prototype.Selector.match(element, selector);

    return selector.match(element);
  }


  function _recursivelyFind(element, property, expression, index) {
    element = $(element), expression = expression || 0, index = index || 0;
    if (Object.isNumber(expression)) {
      index = expression, expression = null;
    }

    var selector = Prototype.Selector;

    while (element = element[property]) {
      if (element.nodeType !== 1) continue;
      if (expression && !selector.match(element, expression))
        continue;
      if (--index >= 0) continue;

      return Element.extend(element);
    }
  }


  function up(element, expression, index) {
    element = $(element);
    if (arguments.length === 1) return $(element.parentNode);
    return _recursivelyFind(element, 'parentNode', expression, index);
  }

  function down(element, expression, index) {
    if (arguments.length === 1) return firstDescendant(element);
    element = $(element), expression = expression || 0, index = index || 0;

    if (Object.isNumber(expression))
      index = expression, expression = '*';

    var node = Prototype.Selector.select(expression, element)[index];
    return Element.extend(node);
  }

  function previous(element, expression, index) {
    return _recursivelyFind(element, 'previousSibling', expression, index);
  }

  function next(element, expression, index) {
    return _recursivelyFind(element, 'nextSibling', expression, index);
  }

  function select(element) {
    element = $(element);
    var expressions = SLICE.call(arguments, 1).join(', ');
    return Prototype.Selector.select(expressions, element);
  }

  function adjacent(element) {
    element = $(element);
    var expressions = SLICE.call(arguments, 1).join(', ');
    var siblings = Element.siblings(element), results = [];
    for (var i = 0, sibling; sibling = siblings[i]; i++) {
      if (Prototype.Selector.match(sibling, expressions))
        results.push(sibling);
    }

    return results;
  }

  function descendantOf_DOM(element, ancestor) {
    element = $(element), ancestor = $(ancestor);
    while (element = element.parentNode)
      if (element === ancestor) return true;
    return false;
  }

  function descendantOf_contains(element, ancestor) {
    element = $(element), ancestor = $(ancestor);
    if (!ancestor.contains) return descendantOf_DOM(element, ancestor);
    return ancestor.contains(element) && ancestor !== element;
  }

  function descendantOf_compareDocumentPosition(element, ancestor) {
    element = $(element), ancestor = $(ancestor);
    return (element.compareDocumentPosition(ancestor) & 8) === 8;
  }

  var descendantOf;
  if (DIV.compareDocumentPosition) {
    descendantOf = descendantOf_compareDocumentPosition;
  } else if (DIV.contains) {
    descendantOf = descendantOf_contains;
  } else {
    descendantOf = descendantOf_DOM;
  }


  Object.extend(methods, {
    recursivelyCollect:   recursivelyCollect,
    ancestors:            ancestors,
    descendants:          descendants,
    firstDescendant:      firstDescendant,
    immediateDescendants: immediateDescendants,
    previousSiblings:     previousSiblings,
    nextSiblings:         nextSiblings,
    siblings:             siblings,
    match:                match,
    up:                   up,
    down:                 down,
    previous:             previous,
    next:                 next,
    select:               select,
    adjacent:             adjacent,
    descendantOf:         descendantOf,

    getElementsBySelector: select,

    childElements:         immediateDescendants
  });


  var idCounter = 1;
  function identify(element) {
    element = $(element);
    var id = Element.readAttribute(element, 'id');
    if (id) return id;

    do { id = 'anonymous_element_' + idCounter++; } while ($(id));

    Element.writeAttribute(element, 'id', id);
    return id;
  }


  function readAttribute(element, name) {
    return $(element).getAttribute(name);
  }

  function readAttribute_IE(element, name) {
    element = $(element);

    var table = ATTRIBUTE_TRANSLATIONS.read;
    if (table.values[name])
      return table.values[name](element, name);

    if (table.names[name]) name = table.names[name];

    if (name.include(':')) {
      if (!element.attributes || !element.attributes[name]) return null;
      return element.attributes[name].value;
    }

    return element.getAttribute(name);
  }

  function readAttribute_Opera(element, name) {
    if (name === 'title') return element.title;
    return element.getAttribute(name);
  }

  var PROBLEMATIC_ATTRIBUTE_READING = (function() {
    DIV.setAttribute('onclick', Prototype.emptyFunction);
    var value = DIV.getAttribute('onclick');
    var isFunction = (typeof value === 'function');
    DIV.removeAttribute('onclick');
    return isFunction;
  })();

  if (PROBLEMATIC_ATTRIBUTE_READING) {
    readAttribute = readAttribute_IE;
  } else if (Prototype.Browser.Opera) {
    readAttribute = readAttribute_Opera;
  }


  function writeAttribute(element, name, value) {
    element = $(element);
    var attributes = {}, table = ATTRIBUTE_TRANSLATIONS.write;

    if (typeof name === 'object') {
      attributes = name;
    } else {
      attributes[name] = Object.isUndefined(value) ? true : value;
    }

    for (var attr in attributes) {
      name = table.names[attr] || attr;
      value = attributes[attr];
      if (table.values[attr])
        name = table.values[attr](element, value) || name;
      if (value === false || value === null)
        element.removeAttribute(name);
      else if (value === true)
        element.setAttribute(name, name);
      else element.setAttribute(name, value);
    }

    return element;
  }

  function hasAttribute(element, attribute) {
    attribute = ATTRIBUTE_TRANSLATIONS.has[attribute] || attribute;
    var node = $(element).getAttributeNode(attribute);
    return !!(node && node.specified);
  }

  GLOBAL.Element.Methods.Simulated.hasAttribute = hasAttribute;

  function classNames(element) {
    return $w($(element).className);
  }

  var regExpCache = {};
  function getRegExpForClassName(className) {
    if (regExpCache[className]) return regExpCache[className];

    var re = new RegExp("(^|\\s+)" + className + "(\\s+|$)");
    regExpCache[className] = re;
    return re;
  }

  function hasClassName(element, className) {
    if (!(element = $(element))) return;

    var elementClassName = element.className;

    if (elementClassName.length === 0) return false;
    if (elementClassName === className) return true;

    return getRegExpForClassName(className).test(elementClassName);
  }

  function addClassName(element, className) {
    if (!(element = $(element))) return;

    if (!hasClassName(element, className))
      element.className += (element.className ? ' ' : '') + className;

    return element;
  }

  function removeClassName(element, className) {
    if (!(element = $(element))) return;

    element.className = element.className.replace(
     getRegExpForClassName(className), ' ').strip();

    return element;
  }

  function toggleClassName(element, className, bool) {
    if (!(element = $(element))) return;

    if (Object.isUndefined(bool))
      bool = !hasClassName(element, className);

    var method = Element[bool ? 'addClassName' : 'removeClassName'];
    return method(element, className);
  }

  var ATTRIBUTE_TRANSLATIONS = {};

  var classProp = 'className', forProp = 'for';

  DIV.setAttribute(classProp, 'x');
  if (DIV.className !== 'x') {
    DIV.setAttribute('class', 'x');
    if (DIV.className === 'x')
      classProp = 'class';
  }

  var LABEL = document.createElement('label');
  LABEL.setAttribute(forProp, 'x');
  if (LABEL.htmlFor !== 'x') {
    LABEL.setAttribute('htmlFor', 'x');
    if (LABEL.htmlFor === 'x')
      forProp = 'htmlFor';
  }
  LABEL = null;

  function _getAttr(element, attribute) {
    return element.getAttribute(attribute);
  }

  function _getAttr2(element, attribute) {
    return element.getAttribute(attribute, 2);
  }

  function _getAttrNode(element, attribute) {
    var node = element.getAttributeNode(attribute);
    return node ? node.value : '';
  }

  function _getFlag(element, attribute) {
    return $(element).hasAttribute(attribute) ? attribute : null;
  }

  DIV.onclick = Prototype.emptyFunction;
  var onclickValue = DIV.getAttribute('onclick');

  var _getEv;

  if (String(onclickValue).indexOf('{') > -1) {
    _getEv = function(element, attribute) {
      var value = element.getAttribute(attribute);
      if (!value) return null;
      value = value.toString();
      value = value.split('{')[1];
      value = value.split('}')[0];
      return value.strip();
    };
  }
  else if (onclickValue === '') {
    _getEv = function(element, attribute) {
      var value = element.getAttribute(attribute);
      if (!value) return null;
      return value.strip();
    };
  }

  ATTRIBUTE_TRANSLATIONS.read = {
    names: {
      'class':     classProp,
      'className': classProp,
      'for':       forProp,
      'htmlFor':   forProp
    },

    values: {
      style: function(element) {
        return element.style.cssText.toLowerCase();
      },
      title: function(element) {
        return element.title;
      }
    }
  };

  ATTRIBUTE_TRANSLATIONS.write = {
    names: {
      className:   'class',
      htmlFor:     'for',
      cellpadding: 'cellPadding',
      cellspacing: 'cellSpacing'
    },

    values: {
      checked: function(element, value) {
        element.checked = !!value;
      },

      style: function(element, value) {
        element.style.cssText = value ? value : '';
      }
    }
  };

  ATTRIBUTE_TRANSLATIONS.has = { names: {} };

  Object.extend(ATTRIBUTE_TRANSLATIONS.write.names,
   ATTRIBUTE_TRANSLATIONS.read.names);

  var CAMEL_CASED_ATTRIBUTE_NAMES = $w('colSpan rowSpan vAlign dateTime ' +
   'accessKey tabIndex encType maxLength readOnly longDesc frameBorder');

  for (var i = 0, attr; attr = CAMEL_CASED_ATTRIBUTE_NAMES[i]; i++) {
    ATTRIBUTE_TRANSLATIONS.write.names[attr.toLowerCase()] = attr;
    ATTRIBUTE_TRANSLATIONS.has.names[attr.toLowerCase()]   = attr;
  }

  Object.extend(ATTRIBUTE_TRANSLATIONS.read.values, {
    href:        _getAttr2,
    src:         _getAttr2,
    type:        _getAttr,
    action:      _getAttrNode,
    disabled:    _getFlag,
    checked:     _getFlag,
    readonly:    _getFlag,
    multiple:    _getFlag,
    onload:      _getEv,
    onunload:    _getEv,
    onclick:     _getEv,
    ondblclick:  _getEv,
    onmousedown: _getEv,
    onmouseup:   _getEv,
    onmouseover: _getEv,
    onmousemove: _getEv,
    onmouseout:  _getEv,
    onfocus:     _getEv,
    onblur:      _getEv,
    onkeypress:  _getEv,
    onkeydown:   _getEv,
    onkeyup:     _getEv,
    onsubmit:    _getEv,
    onreset:     _getEv,
    onselect:    _getEv,
    onchange:    _getEv
  });


  Object.extend(methods, {
    identify:        identify,
    readAttribute:   readAttribute,
    writeAttribute:  writeAttribute,
    classNames:      classNames,
    hasClassName:    hasClassName,
    addClassName:    addClassName,
    removeClassName: removeClassName,
    toggleClassName: toggleClassName
  });


  function normalizeStyleName(style) {
    if (style === 'float' || style === 'styleFloat')
      return 'cssFloat';
    return style.camelize();
  }

  function normalizeStyleName_IE(style) {
    if (style === 'float' || style === 'cssFloat')
      return 'styleFloat';
    return style.camelize();
  }

  function setStyle(element, styles) {
    element = $(element);
    var elementStyle = element.style, match;

    if (Object.isString(styles)) {
      elementStyle.cssText += ';' + styles;
      if (styles.include('opacity')) {
        var opacity = styles.match(/opacity:\s*(\d?\.?\d*)/)[1];
        Element.setOpacity(element, opacity);
      }
      return element;
    }

    for (var property in styles) {
      if (property === 'opacity') {
        Element.setOpacity(element, styles[property]);
      } else {
        var value = styles[property];
        if (property === 'float' || property === 'cssFloat') {
          property = Object.isUndefined(elementStyle.styleFloat) ?
           'cssFloat' : 'styleFloat';
        }
        elementStyle[property] = value;
      }
    }

    return element;
  }


  function getStyle(element, style) { // FIX
    if (style === 'opacity') return getOpacity(element);

    element = $(element);
    style = normalizeStyleName(style);

    var value = element.style[style];
    if (!value || value === 'auto') {
      var css = document.defaultView.getComputedStyle(element, null);
      value = css ? css[style] : null;
    }

    return value === 'auto' ? null : value;
  }

  function getStyle_Opera(element, style) {
    switch (style) {
      case 'height': case 'width':
        if (!Element.visible(element)) return null;

        var dim = parseInt(getStyle(element, style), 10);

        if (dim !== element['offset' + style.capitalize()])
          return dim + 'px';

        return Element.measure(element, style);

      default: return getStyle(element, style);
    }
  }

  function getStyle_IE(element, style) {
    if (style === 'opacity') return getOpacity_IE(element);

    element = $(element);
    style = normalizeStyleName_IE(style);

    var value = element.style[style];
    if (!value && element.currentStyle) {
      value = element.currentStyle[style];
    }

    if (value === 'auto') {
      if ((style === 'width' || style === 'height') && (Element.getStyle(element, 'display') != 'none')) // FIX
        return Element.measure(element, style) + 'px';
      return null;
    }

    return value;
  }

  function stripAlphaFromFilter_IE(filter) {
    return (filter || '').replace(/alpha\([^\)]*\)/gi, '');
  }

  var STANDARD_CSS_OPACITY_SUPPORTED = (function() {
    DIV.style.cssText = "opacity:.55";
    return /^0.55/.test(DIV.style.opacity);
  })();

  function setOpacity(element, value) {
    element = $(element);
    if (value == 1 || value === '') value = '';
    else if (value < 0.00001) value = 0;
    element.style.opacity = value;
    return element;
  }

  var setOpacity_IE = STANDARD_CSS_OPACITY_SUPPORTED ? setOpacity : function(element, value) { // FIX
    element = $(element);
    var style = element.style;
    if (!element.currentStyle || !element.currentStyle.hasLayout)
      style.zoom = 1;

    var filter = Element.getStyle(element, 'filter');

    if (value == 1 || value === '') {
      filter = stripAlphaFromFilter_IE(filter);
      if (filter) style.filter = filter;
      else style.removeAttribute('filter');
      return element;
    }

    if (value < 0.00001) value = 0;

    style.filter = stripAlphaFromFilter_IE(filter) +
     'alpha(opacity=' + (value * 100) + ')';

    return element;
  };


  function getOpacity(element) { // FIX
    element = $(element);
    var value = element.style.opacity;
    if (!value || value === 'auto') {
      var css = document.defaultView.getComputedStyle(element, null);
      value = css ? css.opacity : null;
    }
    return value ? parseFloat(value) : 1.0;
  }

  var getOpacity_IE = STANDARD_CSS_OPACITY_SUPPORTED ? getOpacity : function(element) {
    var filter = Element.getStyle(element, 'filter');
    if (filter.length === 0) return 1.0;
    var match = (filter || '').match(/alpha\(opacity=(.*)\)/);
    if (match[1]) return parseFloat(match[1]) / 100;
    return 1.0;
  };


  Object.extend(methods, {
    setStyle:   setStyle,
    getStyle:   getStyle,
    setOpacity: setOpacity,
    getOpacity: getOpacity
  });

  if (Prototype.Browser.Opera) { // FIX
    methods.getStyle = getStyle_Opera;
  } else if ('styleFloat' in DIV.style) {
    methods.getStyle = getStyle_IE;
    methods.setOpacity = setOpacity_IE;
    methods.getOpacity = getOpacity_IE;
  }

  /*if (!('opacity' in DIV.style) && ('filter' in DIV.style)) { // FIX
    methods.setOpacity = setOpacity_IE;
    methods.getOpacity = getOpacity_IE;
  }*/

  GLOBAL.Element.Storage = { UID: 1 };

  function getUniqueElementID(element) {
    if (element === window) return 0;

    if (typeof element._prototypeUID === 'undefined')
      element._prototypeUID = Element.Storage.UID++;
    return element._prototypeUID;
  }

  function getUniqueElementID_IE(element) {
    if (element === window) return 0;
    if (element == document) return 1;
    return element.uniqueID;
  }

  var HAS_UNIQUE_ID_PROPERTY = ('uniqueID' in DIV);
  if (HAS_UNIQUE_ID_PROPERTY)
    getUniqueElementID = getUniqueElementID_IE;

  function getStorage(element) {
    if (!(element = $(element))) return;

    var uid = getUniqueElementID(element);

    if (!Element.Storage[uid])
      Element.Storage[uid] = $H();

    return Element.Storage[uid];
  }

  function store(element, key, value) {
    if (!(element = $(element))) return;
    var storage = getStorage(element);
    if (arguments.length === 2) {
      storage.update(key);
    } else {
      storage.set(key, value);
    }
    return element;
  }

  function retrieve(element, key, defaultValue) {
    if (!(element = $(element))) return;
    var storage = getStorage(element), value = storage.get(key);

    if (Object.isUndefined(value)) {
      storage.set(key, defaultValue);
      value = defaultValue;
    }

    return value;
  }


  Object.extend(methods, {
    getStorage: getStorage,
    store:      store,
    retrieve:   retrieve
  });


  var Methods = {}, ByTag = Element.Methods.ByTag,
   F = Prototype.BrowserFeatures;

  if (!F.ElementExtensions && ('__proto__' in DIV)) {
    GLOBAL.HTMLElement = {};
    GLOBAL.HTMLElement.prototype = DIV['__proto__'];
    F.ElementExtensions = true;
  }

  function checkElementPrototypeDeficiency(tagName) {
    if (typeof window.Element === 'undefined') return false;
    var proto = window.Element.prototype;
    if (proto) {
      var id = '_' + (Math.random() + '').slice(2),
       el = document.createElement(tagName);
      proto[id] = 'x';
      var isBuggy = (el[id] !== 'x');
      delete proto[id];
      el = null;
      return isBuggy;
    }

    return false;
  }

  var HTMLOBJECTELEMENT_PROTOTYPE_BUGGY =
   checkElementPrototypeDeficiency('object');

  function extendElementWith(element, methods) {
    for (var property in methods) {
      var value = methods[property];
      if (Object.isFunction(value) && !(property in element))
        element[property] = value.methodize();
    }
  }

  var EXTENDED = {};

  function extend(element) { // FIX
    if (!element) return element;
    if (element.nodeType !== Node.ELEMENT_NODE || element == window)
      return element;

    var uid = getUniqueElementID(element);
    if (uid in EXTENDED) return element;

    var methods = Object.clone(Methods),
     tagName = element.tagName.toUpperCase();

    if (ByTag[tagName]) Object.extend(methods, ByTag[tagName]);

    extendElementWith(element, methods);
    EXTENDED[uid] = true;
    return element;
  }

  function extend_IE8(element) { // FIX
    if (!element) return element;

    var t = element.tagName;
    if (t && (/^(?:object|applet|embed)$/i.test(t))) {
      var uid = getUniqueElementID(element);
      if (uid in EXTENDED) return element;

      extendElementWith(element, Element.Methods);
      extendElementWith(element, Element.Methods.Simulated);
      extendElementWith(element, Element.Methods.ByTag[t.toUpperCase()]);
      EXTENDED[uid] = true;
    }

    return element;
  }

  if (F.SpecificElementExtensions) {
    extend = HTMLOBJECTELEMENT_PROTOTYPE_BUGGY ? extend_IE8 : Prototype.K;
  }

  function addMethodsToTagName(tagName, methods) {
    tagName = tagName.toUpperCase();
    if (!ByTag[tagName]) ByTag[tagName] = {};
    Object.extend(ByTag[tagName], methods);
  }

  function mergeMethods(destination, methods, onlyIfAbsent) {
    if (Object.isUndefined(onlyIfAbsent)) onlyIfAbsent = false;
    for (var property in methods) {
      var value = methods[property];
      if (!Object.isFunction(value)) continue;
      if (!onlyIfAbsent || !(property in destination))
        destination[property] = value.methodize();
    }
  }

  function findDOMClass(tagName) {
    var klass;
    var trans = {
      "OPTGROUP": "OptGroup", "TEXTAREA": "TextArea", "P": "Paragraph",
      "FIELDSET": "FieldSet", "UL": "UList", "OL": "OList", "DL": "DList",
      "DIR": "Directory", "H1": "Heading", "H2": "Heading", "H3": "Heading",
      "H4": "Heading", "H5": "Heading", "H6": "Heading", "Q": "Quote",
      "INS": "Mod", "DEL": "Mod", "A": "Anchor", "IMG": "Image", "CAPTION":
      "TableCaption", "COL": "TableCol", "COLGROUP": "TableCol", "THEAD":
      "TableSection", "TFOOT": "TableSection", "TBODY": "TableSection", "TR":
      "TableRow", "TH": "TableCell", "TD": "TableCell", "FRAMESET":
      "FrameSet", "IFRAME": "IFrame"
    };
    if (trans[tagName]) klass = 'HTML' + trans[tagName] + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName.capitalize() + 'Element';
    if (window[klass]) return window[klass];

    var element = document.createElement(tagName),
     proto = element['__proto__'] || element.constructor.prototype;

    element = null;
    return proto;
  }

  function addMethods(methods) {
    if (arguments.length === 0) addFormMethods();

    if (arguments.length === 2) {
      var tagName = methods;
      methods = arguments[1];
    }

    if (!tagName) {
      Object.extend(Element.Methods, methods || {});
    } else {
      if (Object.isArray(tagName)) {
        for (var i = 0, tag; tag = tagName[i]; i++)
          addMethodsToTagName(tag, methods);
      } else {
        addMethodsToTagName(tagName, methods);
      }
    }

    var ELEMENT_PROTOTYPE = window.HTMLElement ? HTMLElement.prototype :
     Element.prototype;

    if (F.ElementExtensions) {
      mergeMethods(ELEMENT_PROTOTYPE, Element.Methods);
      mergeMethods(ELEMENT_PROTOTYPE, Element.Methods.Simulated, true);
    }

    if (F.SpecificElementExtensions) {
      for (var tag in Element.Methods.ByTag) {
        var klass = findDOMClass(tag);
        if (Object.isUndefined(klass)) continue;
        mergeMethods(klass.prototype, ByTag[tag]);
      }
    }

    Object.extend(Element, Element.Methods);
    Object.extend(Element, Element.Methods.Simulated);
    delete Element.ByTag;
    delete Element.Simulated;

    Element.extend.refresh();

    ELEMENT_CACHE = {};
  }

  Object.extend(GLOBAL.Element, {
    extend:     extend,
    addMethods: addMethods
  });

  if (extend === Prototype.K) {
    GLOBAL.Element.extend.refresh = Prototype.emptyFunction;
  } else {
    GLOBAL.Element.extend.refresh = function() {
      if (Prototype.BrowserFeatures.ElementExtensions) return;
      Object.extend(Methods, Element.Methods);
      Object.extend(Methods, Element.Methods.Simulated);

      EXTENDED = {};
    };
  }

  function addFormMethods() {
    Object.extend(Form, Form.Methods);
    Object.extend(Form.Element, Form.Element.Methods);
    Object.extend(Element.Methods.ByTag, {
      "FORM":     Object.clone(Form.Methods),
      "INPUT":    Object.clone(Form.Element.Methods),
      "SELECT":   Object.clone(Form.Element.Methods),
      "TEXTAREA": Object.clone(Form.Element.Methods),
      "BUTTON":   Object.clone(Form.Element.Methods)
    });
  }

  Element.addMethods(methods);

  function destroyCache_IE() {
    DIV = null;
    ELEMENT_CACHE = null;
  }

  if (window.attachEvent)
    window.attachEvent('onunload', destroyCache_IE);

})(this);

/*--------------------------------------------------------------------------*/

(function() {

  function toDecimal(pctString) {
    var match = pctString.match(/^(\d+)%?$/i);
    if (!match) return null;
    return (Number(match[1]) / 100);
  }

  function getRawStyle(element, style) {
    element = $(element);

    var value = element.style[style];
    if (!value || value === 'auto') {
      var css = document.defaultView.getComputedStyle(element, null);
      value = css ? css[style] : null;
    }

    if (style === 'opacity') return value ? parseFloat(value) : 1.0;
    return value === 'auto' ? null : value;
  }

  function getRawStyle_IE(element, style) {
    var value = element.style[style];
    if (!value && element.currentStyle) {
      value = element.currentStyle[style];
    }
    return value;
  }

  function getContentWidth(element, context) {
    var boxWidth = element.offsetWidth;

    var bl = getPixelValue(element, 'borderLeftWidth',  context) || 0;
    var br = getPixelValue(element, 'borderRightWidth', context) || 0;
    var pl = getPixelValue(element, 'paddingLeft',      context) || 0;
    var pr = getPixelValue(element, 'paddingRight',     context) || 0;

    return boxWidth - bl - br - pl - pr;
  }

  if ('currentStyle' in document.documentElement) {
    getRawStyle = getRawStyle_IE;
  }


  function getPixelValue(value, property, context) {
    var element = null;
    if (Object.isElement(value)) {
      element = value;
      value = getRawStyle(element, property);
    }

    if (value === null || Object.isUndefined(value)) {
      return null;
    }

    if ((/^(?:-)?\d+(\.\d+)?(px)?$/i).test(value)) {
      return window.parseFloat(value);
    }

    var isPercentage = value.include('%'), isViewport = (context === document.viewport);

    if (/\d/.test(value) && element && element.runtimeStyle && !(isPercentage && isViewport)) {
      var style = element.style.left, rStyle = element.runtimeStyle.left;
      element.runtimeStyle.left = element.currentStyle.left;
      element.style.left = value || 0;
      value = element.style.pixelLeft;
      element.style.left = style;
      element.runtimeStyle.left = rStyle;

      return value;
    }

    if (element && isPercentage) {
      context = context || element.parentNode;
      var decimal = toDecimal(value), whole = null;

      var isHorizontal = property.include('left') || property.include('right') ||
       property.include('width');

      var isVertical   = property.include('top') || property.include('bottom') ||
        property.include('height');

      if (context === document.viewport) {
        if (isHorizontal) {
          whole = document.viewport.getWidth();
        } else if (isVertical) {
          whole = document.viewport.getHeight();
        }
      } else {
        if (isHorizontal) {
          whole = $(context).measure('width');
        } else if (isVertical) {
          whole = $(context).measure('height');
        }
      }

      return (whole === null) ? 0 : whole * decimal;
    }

    return 0;
  }

  function toCSSPixels(number) {
    if (Object.isString(number) && number.endsWith('px'))
      return number;
    return number + 'px';
  }

  function isDisplayed(element) {
    while (element && element.parentNode) {
      var display = element.getStyle('display');
      if (display === 'none') {
        return false;
      }
      element = $(element.parentNode);
    }
    return true;
  }

  var hasLayout = Prototype.K;
  if ('currentStyle' in document.documentElement) {
    hasLayout = function(element) {
      if (!element.currentStyle.hasLayout) {
        element.style.zoom = 1;
      }
      return element;
    };
  }

  function cssNameFor(key) {
    if (key.include('border')) key = key + '-width';
    return key.camelize();
  }

  Element.Layout = Class.create(Hash, {
    initialize: function($super, element, preCompute) {
      $super();
      this.element = $(element);

      Element.Layout.PROPERTIES.each( function(property) {
        this._set(property, null);
      }, this);

      if (preCompute) {
        this._preComputing = true;
        this._begin();
        Element.Layout.PROPERTIES.each( this._compute, this );
        this._end();
        this._preComputing = false;
      }
    },

    _set: function(property, value) {
      return Hash.prototype.set.call(this, property, value);
    },

    set: function(property, value) {
      throw "Properties of Element.Layout are read-only.";
    },

    get: function($super, property) {
      var value = $super(property);
      return value === null ? this._compute(property) : value;
    },

    _begin: function() {
      if (this._isPrepared()) return;

      var element = this.element;
      if (isDisplayed(element)) {
        this._setPrepared(true);
        return;
      }


      var originalStyles = {
        position:   element.style.position   || '',
        width:      element.style.width      || '',
        visibility: element.style.visibility || '',
        display:    element.style.display    || ''
      };

      element.store('prototype_original_styles', originalStyles);

      var position = getRawStyle(element, 'position'), width = element.offsetWidth;

      if (width === 0 || width === null) {
        element.style.display = 'block';
        width = element.offsetWidth;
      }

      var context = (position === 'fixed') ? document.viewport :
       element.parentNode;

      var tempStyles = {
        visibility: 'hidden',
        display:    'block'
      };

      if (position !== 'fixed') tempStyles.position = 'absolute';

      element.setStyle(tempStyles);

      var positionedWidth = element.offsetWidth, newWidth;
      if (width && (positionedWidth === width)) {
        newWidth = getContentWidth(element, context);
      } else if (position === 'absolute' || position === 'fixed') {
        newWidth = getContentWidth(element, context);
      } else {
        var parent = element.parentNode, pLayout = $(parent).getLayout();

        newWidth = pLayout.get('width') -
         this.get('margin-left') -
         this.get('border-left') -
         this.get('padding-left') -
         this.get('padding-right') -
         this.get('border-right') -
         this.get('margin-right');
      }

      element.setStyle({ width: newWidth + 'px' });

      this._setPrepared(true);
    },

    _end: function() {
      var element = this.element;
      var originalStyles = element.retrieve('prototype_original_styles');
      element.store('prototype_original_styles', null);
      element.setStyle(originalStyles);
      this._setPrepared(false);
    },

    _compute: function(property) {
      var COMPUTATIONS = Element.Layout.COMPUTATIONS;
      if (!(property in COMPUTATIONS)) {
        throw "Property not found.";
      }

      return this._set(property, COMPUTATIONS[property].call(this, this.element));
    },

    _isPrepared: function() {
      return this.element.retrieve('prototype_element_layout_prepared', false);
    },

    _setPrepared: function(bool) {
      return this.element.store('prototype_element_layout_prepared', bool);
    },

    toObject: function() {
      var args = $A(arguments);
      var keys = (args.length === 0) ? Element.Layout.PROPERTIES :
       args.join(' ').split(' ');
      var obj = {};
      keys.each( function(key) {
        if (!Element.Layout.PROPERTIES.include(key)) return;
        var value = this.get(key);
        if (value != null) obj[key] = value;
      }, this);
      return obj;
    },

    toHash: function() {
      var obj = this.toObject.apply(this, arguments);
      return new Hash(obj);
    },

    toCSS: function() {
      var args = $A(arguments);
      var keys = (args.length === 0) ? Element.Layout.PROPERTIES :
       args.join(' ').split(' ');
      var css = {};

      keys.each( function(key) {
        if (!Element.Layout.PROPERTIES.include(key)) return;
        if (Element.Layout.COMPOSITE_PROPERTIES.include(key)) return;

        var value = this.get(key);
        if (value != null) css[cssNameFor(key)] = value + 'px';
      }, this);
      return css;
    },

    inspect: function() {
      return "#<Element.Layout>";
    }
  });

  Object.extend(Element.Layout, {
    PROPERTIES: $w('height width top left right bottom border-left border-right border-top border-bottom padding-left padding-right padding-top padding-bottom margin-top margin-bottom margin-left margin-right padding-box-width padding-box-height border-box-width border-box-height margin-box-width margin-box-height outline'),

    COMPOSITE_PROPERTIES: $w('padding-box-width padding-box-height margin-box-width margin-box-height border-box-width border-box-height'),

    COMPUTATIONS: {
      'height': function(element) {
        if (!this._preComputing) this._begin();

        var bHeight = this.get('border-box-height');
        if (bHeight <= 0) {
          if (!this._preComputing) this._end();
          return 0;
        }

        var bTop = this.get('border-top'),
         bBottom = this.get('border-bottom');

        var pTop = this.get('padding-top'),
         pBottom = this.get('padding-bottom');

        if (!this._preComputing) this._end();

        return bHeight - bTop - bBottom - pTop - pBottom;
      },

      'width': function(element) {
        if (!this._preComputing) this._begin();

        var bWidth = this.get('border-box-width');
        if (bWidth <= 0) {
          if (!this._preComputing) this._end();
          return 0;
        }

        var bLeft = this.get('border-left'),
         bRight = this.get('border-right');

        var pLeft = this.get('padding-left'),
         pRight = this.get('padding-right');

        if (!this._preComputing) this._end();

        return bWidth - bLeft - bRight - pLeft - pRight;
      },

      'padding-box-height': function(element) { // FIX
        if (!this._preComputing) this._begin();

        var bHeight = this.get('border-box-height');
        if (bHeight <= 0) {
          if (!this._preComputing) this._end();
          return 0;
        }

        var bTop = this.get('border-top'),
         bBottom = this.get('border-bottom');

        if (!this._preComputing) this._end();

        return bHeight - bTop - bBottom;
      },

      'padding-box-width': function(element) { // FIX
        if (!this._preComputing) this._begin();

        var bWidth = this.get('border-box-width');
        if (bWidth <= 0) {
          if (!this._preComputing) this._end();
          return 0;
        }

        var bLeft = this.get('border-left'),
         bRight = this.get('border-right');

        if (!this._preComputing) this._end();

        return bWidth - bLeft - bRight;
      },

      'border-box-height': function(element) {
        if (!this._preComputing) this._begin();
        var height = element.offsetHeight;
        if (!this._preComputing) this._end();
        return height;
      },

      'border-box-width': function(element) {
        if (!this._preComputing) this._begin();
        var width = element.offsetWidth;
        if (!this._preComputing) this._end();
        return width;
      },

      'margin-box-height': function(element) {
        var bHeight = this.get('border-box-height'),
         mTop = this.get('margin-top'),
         mBottom = this.get('margin-bottom');

        if (bHeight <= 0) return 0;

        return bHeight + mTop + mBottom;
      },

      'margin-box-width': function(element) {
        var bWidth = this.get('border-box-width'),
         mLeft = this.get('margin-left'),
         mRight = this.get('margin-right');

        if (bWidth <= 0) return 0;

        return bWidth + mLeft + mRight;
      },

      'top': function(element) {
        var offset = element.positionedOffset();
        return offset.top;
      },

      'bottom': function(element) {
        var offset = element.positionedOffset(),
         parent = element.getOffsetParent(),
         pHeight = parent.measure('height');

        var mHeight = this.get('border-box-height');

        return pHeight - mHeight - offset.top;
      },

      'left': function(element) {
        var offset = element.positionedOffset();
        return offset.left;
      },

      'right': function(element) {
        var offset = element.positionedOffset(),
         parent = element.getOffsetParent(),
         pWidth = parent.measure('width');

        var mWidth = this.get('border-box-width');

        return pWidth - mWidth - offset.left;
      },

      'padding-top': function(element) {
        return getPixelValue(element, 'paddingTop');
      },

      'padding-bottom': function(element) {
        return getPixelValue(element, 'paddingBottom');
      },

      'padding-left': function(element) {
        return getPixelValue(element, 'paddingLeft');
      },

      'padding-right': function(element) {
        return getPixelValue(element, 'paddingRight');
      },

      'border-top': function(element) {
        return getPixelValue(element, 'borderTopWidth');
      },

      'border-bottom': function(element) {
        return getPixelValue(element, 'borderBottomWidth');
      },

      'border-left': function(element) {
        return getPixelValue(element, 'borderLeftWidth');
      },

      'border-right': function(element) {
        return getPixelValue(element, 'borderRightWidth');
      },

      'margin-top': function(element) {
        return getPixelValue(element, 'marginTop');
      },

      'margin-bottom': function(element) {
        return getPixelValue(element, 'marginBottom');
      },

      'margin-left': function(element) {
        return getPixelValue(element, 'marginLeft');
      },

      'margin-right': function(element) {
        return getPixelValue(element, 'marginRight');
      },

      'outline': function(element) {
        return getPixelValue(element, 'outlineWidth');
      }
    }
  });

  if ('getBoundingClientRect' in document.documentElement) {
    Object.extend(Element.Layout.COMPUTATIONS, {
      'right': function(element) {
        var parent = hasLayout(element.getOffsetParent());
        var rect = element.getBoundingClientRect(),
         pRect = parent.getBoundingClientRect();

        return (pRect.right - rect.right).round();
      },

      'bottom': function(element) {
        var parent = hasLayout(element.getOffsetParent());
        var rect = element.getBoundingClientRect(),
         pRect = parent.getBoundingClientRect();

        return (pRect.bottom - rect.bottom).round();
      }
    });
  }

  Element.Offset = Class.create({
    initialize: function(left, top) {
      this.left = left.round();
      this.top  = top.round();

      this[0] = this.left;
      this[1] = this.top;
    },

    relativeTo: function(offset) {
      return new Element.Offset(
        this.left - offset.left,
        this.top  - offset.top
      );
    },

    inspect: function() {
      return "#<Element.Offset left: #{left} top: #{top}>".interpolate(this);
    },

    toString: function() {
      return "[#{left}, #{top}]".interpolate(this);
    },

    toArray: function() {
      return [this.left, this.top];
    }
  });

  function getLayout(element, preCompute) {
    return new Element.Layout(element, preCompute);
  }

  function measure(element, property) {
    return $(element).getLayout().get(property);
  }

  function getHeight(element) {
    return Element.getDimensions(element).height;
  }

  function getWidth(element) {
    return Element.getDimensions(element).width;
  }

  function getDimensions(element) {
    element = $(element);
    var display = Element.getStyle(element, 'display');

    if (display && display !== 'none') {
      return { width: element.offsetWidth, height: element.offsetHeight };
    }

    var style = element.style;
    var originalStyles = {
      visibility: style.visibility,
      position:   style.position,
      display:    style.display
    };

    var newStyles = {
      visibility: 'hidden',
      display:    'block'
    };

    if (originalStyles.position !== 'fixed')
      newStyles.position = 'absolute';

    Element.setStyle(element, newStyles);

    var dimensions = {
      width:  element.offsetWidth,
      height: element.offsetHeight
    };

    Element.setStyle(element, originalStyles);

    return dimensions;
  }

  function getOffsetParent(element) {
    element = $(element);

    if (isDocument(element) || isDetached(element) || isBody(element) || isHtml(element))
      return $(document.body);

    var isInline = (Element.getStyle(element, 'display') === 'inline');
    if (!isInline && element.offsetParent) return $(element.offsetParent);

    while ((element = element.parentNode) && element !== document.body) {
      if (Element.getStyle(element, 'position') !== 'static') {
        return isHtml(element) ? $(document.body) : $(element);
      }
    }

    return $(document.body);
  }


  function cumulativeOffset(element) {
    element = $(element);
    var valueT = 0, valueL = 0;
    if (element.parentNode) {
      do {
        valueT += element.offsetTop  || 0;
        valueL += element.offsetLeft || 0;
        element = element.offsetParent;
      } while (element);
    }
    return new Element.Offset(valueL, valueT);
  }

  function positionedOffset(element) {
    element = $(element);

    var layout = element.getLayout();

    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
      if (element) {
        if (isBody(element)) break;
        var p = Element.getStyle(element, 'position');
        if (p !== 'static') break;
      }
    } while (element);

    valueL -= layout.get('margin-left'); // FIX
    valueT -= layout.get('margin-top');

    return new Element.Offset(valueL, valueT);
  }

  function cumulativeScrollOffset(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.scrollTop  || 0;
      valueL += element.scrollLeft || 0;
      element = element.parentNode;
    } while (element);
    return new Element.Offset(valueL, valueT);
  }

  function viewportOffset(forElement) {
    var valueT = 0, valueL = 0, docBody = document.body;

    var element = $(forElement);
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      if (element.offsetParent == docBody &&
        Element.getStyle(element, 'position') == 'absolute') break;
    } while (element = element.offsetParent);

    element = forElement;
    do {
      if (element != docBody) {
        valueT -= element.scrollTop  || 0;
        valueL -= element.scrollLeft || 0;
      }
    } while (element = element.parentNode);
    return new Element.Offset(valueL, valueT);
  }

  function absolutize(element) {
    element = $(element);

    if (Element.getStyle(element, 'position') === 'absolute') {
      return element;
    }

    var offsetParent = getOffsetParent(element);
    var eOffset = element.viewportOffset(),
     pOffset = offsetParent.viewportOffset();

    var offset = eOffset.relativeTo(pOffset);
    var layout = element.getLayout();

    element.store('prototype_absolutize_original_styles', {
      position: element.getStyle('position'),
      left:     element.getStyle('left'),
      top:      element.getStyle('top'),
      width:    element.getStyle('width'),
      height:   element.getStyle('height')
    });

    element.setStyle({
      position: 'absolute',
      top:    offset.top + 'px',
      left:   offset.left + 'px',
      width:  layout.get('width') + 'px',
      height: layout.get('height') + 'px'
    });

    return element;
  }

  function relativize(element) {
    element = $(element);
    if (Element.getStyle(element, 'position') === 'relative') {
      return element;
    }

    var originalStyles =
     element.retrieve('prototype_absolutize_original_styles');

    if (originalStyles) element.setStyle(originalStyles);
    return element;
  }


  function scrollTo(element) {
    element = $(element);
    var pos = Element.cumulativeOffset(element);
    window.scrollTo(pos.left, pos.top);
    return element;
  }


  function makePositioned(element) {
    element = $(element);
    var position = Element.getStyle(element, 'position'), styles = {};
    if (position === 'static' || !position) {
      styles.position = 'relative';
      if (Prototype.Browser.Opera) {
        styles.top  = 0;
        styles.left = 0;
      }
      Element.setStyle(element, styles);
      Element.store(element, 'prototype_made_positioned', true);
    }
    return element;
  }

  function undoPositioned(element) {
    element = $(element);
    var storage = Element.getStorage(element),
     madePositioned = storage.get('prototype_made_positioned');

    if (madePositioned) {
      storage.unset('prototype_made_positioned');
      Element.setStyle(element, {
        position: '',
        top:      '',
        bottom:   '',
        left:     '',
        right:    ''
      });
    }
    return element;
  }

  function makeClipping(element) {
    element = $(element);

    var storage = Element.getStorage(element),
     madeClipping = storage.get('prototype_made_clipping');

    if (!Object.isString(madeClipping)) { // FIX
      var overflow = element.style.overflow || '';
      storage.set('prototype_made_clipping', overflow);
      if (overflow !== 'hidden')
        element.style.overflow = 'hidden';
    }

    return element;
  }

  function undoClipping(element) {
    element = $(element);
    var storage = Element.getStorage(element),
     overflow = storage.get('prototype_made_clipping');

    if (Object.isString(overflow)) { // FIX
      storage.unset('prototype_made_clipping');
      element.style.overflow = overflow;
    }

    return element;
  }

  function clonePosition(element, source, options) {
    options = Object.extend({
      setLeft:    true,
      setTop:     true,
      setWidth:   true,
      setHeight:  true,
      offsetTop:  0,
      offsetLeft: 0
    }, options || {});

    source  = $(source);
    element = $(element);
    var p, delta, layout, styles = {};

    if (options.setLeft || options.setTop) {
      p = Element.viewportOffset(source);
      delta = [0, 0];
      if (Element.getStyle(element, 'position') === 'absolute') {
        var parent = Element.getOffsetParent(element);
        if (parent !== document.body) delta = Element.viewportOffset(parent);
      }
    }

    if (options.setWidth || options.setHeight) {
      layout = Element.getLayout(source);
    }

    if (options.setLeft)
      styles.left = (p[0] - delta[0] + options.offsetLeft) + 'px';
    if (options.setTop)
      styles.top  = (p[1] - delta[1] + options.offsetTop)  + 'px';

    if (options.setWidth)
      styles.width  = layout.get('border-box-width')  + 'px';
    if (options.setHeight)
      styles.height = layout.get('border-box-height') + 'px';

    return Element.setStyle(element, styles);
  }


  if (Prototype.Browser.IE) {
    getOffsetParent = getOffsetParent.wrap(
      function(proceed, element) {
        element = $(element);

        if (isDocument(element) || isDetached(element) || isBody(element) || isHtml(element))
          return $(document.body);

        var position = element.getStyle('position');
        if (position !== 'static') return proceed(element);

        element.setStyle({ position: 'relative' });
        var value = proceed(element);
        element.setStyle({ position: position });
        return value;
      }
    );

    positionedOffset = positionedOffset.wrap(function(proceed, element) {
      element = $(element);
      if (!element.parentNode) return new Element.Offset(0, 0);
      var position = element.getStyle('position');
      if (position !== 'static') return proceed(element);

      var offsetParent = element.getOffsetParent();
      if (offsetParent && offsetParent.getStyle('position') === 'fixed')
        hasLayout(offsetParent);

      element.setStyle({ position: 'relative' });
      var value = proceed(element);
      element.setStyle({ position: position });
      return value;
    });
  } else if (Prototype.Browser.Webkit) {
    cumulativeOffset = function(element) {
      element = $(element);
      var valueT = 0, valueL = 0;
      do {
        valueT += element.offsetTop  || 0;
        valueL += element.offsetLeft || 0;
        if (element.offsetParent == document.body) {
          if (Element.getStyle(element, 'position') == 'absolute') break;
        }

        element = element.offsetParent;
      } while (element);

      return new Element.Offset(valueL, valueT);
    };
  }


  Element.addMethods({
    getLayout:              getLayout,
    measure:                measure,
    getWidth:               getWidth,
    getHeight:              getHeight,
    getDimensions:          getDimensions,
    getOffsetParent:        getOffsetParent,
    cumulativeOffset:       cumulativeOffset,
    positionedOffset:       positionedOffset,
    cumulativeScrollOffset: cumulativeScrollOffset,
    viewportOffset:         viewportOffset,
    absolutize:             absolutize,
    relativize:             relativize,
    scrollTo:               scrollTo,
    makePositioned:         makePositioned,
    undoPositioned:         undoPositioned,
    makeClipping:           makeClipping,
    undoClipping:           undoClipping,
    clonePosition:          clonePosition
  });

  function isBody(element) {
    return element.nodeName.toUpperCase() === 'BODY';
  }

  function isHtml(element) {
    return element.nodeName.toUpperCase() === 'HTML';
  }

  function isDocument(element) {
    return element.nodeType === Node.DOCUMENT_NODE;
  }

  function isDetached(element) {
    return element !== document.body &&
     !Element.descendantOf(element, document.body);
  }

  if ('getBoundingClientRect' in document.documentElement) {
    Element.addMethods({
      viewportOffset: function(element) {
        element = $(element);
        if (isDetached(element)) return new Element.Offset(0, 0);

        var rect = element.getBoundingClientRect(),
         docEl = document.documentElement;
        return new Element.Offset(rect.left - docEl.clientLeft,
         rect.top - docEl.clientTop);
      }
    });
  }


})();

(function() {

  var IS_OLD_OPERA = Prototype.Browser.Opera &&
   (window.parseFloat(window.opera.version()) < 9.5);
  var ROOT = null;
  function getRootElement() {
    if (ROOT) return ROOT;
    ROOT = IS_OLD_OPERA ? document.body : document.documentElement;
    return ROOT;
  }

  function getDimensions() {
    return { width: this.getWidth(), height: this.getHeight() };
  }

  function getWidth() {
    return getRootElement().clientWidth;
  }

  function getHeight() {
    return getRootElement().clientHeight;
  }

  function getScrollOffsets() {
    var x = window.pageXOffset || document.documentElement.scrollLeft ||
     document.body.scrollLeft;
    var y = window.pageYOffset || document.documentElement.scrollTop ||
     document.body.scrollTop;

    return new Element.Offset(x, y);
  }

  document.viewport = {
    getDimensions:    getDimensions,
    getWidth:         getWidth,
    getHeight:        getHeight,
    getScrollOffsets: getScrollOffsets
  };

})();
window.$$ = function() {
  var expression = $A(arguments).join(', ');
  return Prototype.Selector.select(expression, document);
};

Prototype.Selector = (function() {

  function select() {
    throw new Error('Method "Prototype.Selector.select" must be defined.');
  }

  function match() {
    throw new Error('Method "Prototype.Selector.match" must be defined.');
  }

  function find(elements, expression, index) {
    index = index || 0;
    var match = Prototype.Selector.match, length = elements.length, matchIndex = 0, i;

    for (i = 0; i < length; i++) {
      if (match(elements[i], expression) && index == matchIndex++) {
        return Element.extend(elements[i]);
      }
    }
  }

  function extendElements(elements) {
    for (var i = 0, length = elements.length; i < length; i++) {
      Element.extend(elements[i]);
    }
    return elements;
  }


  var K = Prototype.K;

  return {
    select: select,
    match: match,
    find: find,
    extendElements: (Element.extend === K) ? K : extendElements,
    extendElement: Element.extend
  };
})();
Prototype._original_property = window.NW;
/*
 * Copyright (C) 2007-2012 Diego Perini
 * All rights reserved.
 *
 * nwmatcher.js - A fast CSS selector engine and matcher
 *
 * Author: Diego Perini <diego.perini at gmail com>
 * Version: 1.2.5
 * Created: 20070722
 * Release: 20120101
 *
 * License:
 *  http://javascript.nwbox.com/NWMatcher/MIT-LICENSE
 * Download:
 *  http://javascript.nwbox.com/NWMatcher/nwmatcher.js
 */

(function(global) {

  var version = 'nwmatcher-1.2.5',

  Dom =
    typeof exports == 'object' ? exports :
    ((global.NW || (global.NW = { })) &&
    (global.NW.Dom || (global.NW.Dom = { }))),

  doc = global.document,
  root = doc.documentElement,

  slice = [ ].slice,
  string = { }.toString,

  isSingleMatch,
  isSingleSelect,

  lastSlice,
  lastContext,
  lastPosition,

  lastMatcher,
  lastSelector,

  lastPartsMatch,
  lastPartsSelect,

  prefixes = '[#.:]?',

  operators = '([~*^$|!]?={1})',

  whitespace = '[\\x20\\t\\n\\r\\f]*',

  combinators = '[\\x20]|[>+~][^>+~]',

  pseudoparms = '[-+]?\\d*n?[-+]?\\d*',

  quotedvalue = '"[^"]*"' + "|'[^']*'",

  skipround = '\\([^()]+\\)|\\(.*\\)',
  skipcurly = '\\{[^{}]+\\}|\\{.*\\}',
  skipsquare = '\\[[^[\\]]*\\]|\\[.*\\]',

  skipgroup = '\\[.*\\]|\\(.*\\)|\\{.*\\}',

  encoding = '(?:[-\\w]|[^\\x00-\\xa0]|\\\\.)',

  identifier = '(?:-?[_a-zA-Z]{1}[-\\w]*|[^\\x00-\\xa0]+|\\\\.+)+',

  attrcheck = '(' + quotedvalue + '|' + identifier + ')',
  attributes = whitespace + '(' + encoding + '+:?' + encoding + '+)' +
    whitespace + '(?:' + operators + whitespace + attrcheck + ')?' + whitespace,
  attrmatcher = attributes.replace(attrcheck, '([\\x22\\x27]*)((?:\\\\?.)*?)\\3'),

  pseudoclass = '((?:' +
    pseudoparms + '|' + quotedvalue + '|' +
    prefixes + '|' + encoding + '+|' +
    '\\[' + attributes + '\\]|' +
    '\\(.+\\)|' + whitespace + '|' +
    ',)+)',

  extensions = '.+',

  standardValidator =
    '(?=[\\x20\\t\\n\\r\\f]*[^>+~(){}<>])' +
    '(' +
    '\\*' +
    '|(?:' + prefixes + identifier + ')' +
    '|' + combinators +
    '|\\[' + attributes + '\\]' +
    '|\\(' + pseudoclass + '\\)' +
    '|\\{' + extensions + '\\}' +
    '|,' +
    ')+',

  extendedValidator = standardValidator.replace(pseudoclass, '.*'),

  reValidator = new RegExp(standardValidator, 'g'),

  reTrimSpaces = new RegExp('^' +
    whitespace + '|' + whitespace + '$', 'g'),

  reSimpleNot = new RegExp('^(' +
    '(?!:not)' +
    '(' + prefixes +
    '|' + identifier +
    '|\\([^()]*\\))+' +
    '|\\[' + attributes + '\\]' +
    ')$'),

  reSplitGroup = new RegExp('(' +
    '[^,\\\\\\[\\]]+' +
    '|' + skipsquare +
    '|' + skipround +
    '|' + skipcurly +
    '|\\\\.' +
    ')+', 'g'),

  reSplitToken = new RegExp('(' +
    '\\[' + attributes + '\\]|' +
    '\\(' + pseudoclass + '\\)|' +
    '[^\\x20>+~]|\\\\.)+', 'g'),

  reWhiteSpace = /[\x20\t\n\r\f]+/g,

  reOptimizeSelector = new RegExp(identifier + '|^$'),

  /*----------------------------- FEATURE TESTING ----------------------------*/

  isNative = (function() {
    var s = (doc.appendChild + '').replace(/appendChild/g, '');
    return function(object, method) {
      var m = object && object[method] || false;
      return m && typeof m != 'string' &&
        s == (m + '').replace(new RegExp(method, 'g'), '');
    };
  })(),

  NATIVE_FOCUS = isNative(doc, 'hasFocus'),
  NATIVE_QSAPI = isNative(doc, 'querySelector'),
  NATIVE_GEBID = isNative(doc, 'getElementById'),
  NATIVE_GEBTN = isNative(root, 'getElementsByTagName'),
  NATIVE_GEBCN = isNative(root, 'getElementsByClassName'),

  NATIVE_GET_ATTRIBUTE = isNative(root, 'getAttribute'),
  NATIVE_HAS_ATTRIBUTE = isNative(root, 'hasAttribute'),

  NATIVE_SLICE_PROTO =
    (function() {
      var isBuggy = false, id = root.id;
      root.id = 'length';
      try {
        isBuggy = !!slice.call(doc.childNodes, 0)[0];
      } catch(e) { }
      root.id = id;
      return isBuggy;
    })(),

  NATIVE_TRAVERSAL_API =
    'nextElementSibling' in root && 'previousElementSibling' in root,

  BUGGY_GEBID = NATIVE_GEBID ?
    (function() {
      var isBuggy = true, x = 'x' + String(+new Date),
        a = doc.createElementNS ? 'a' : '<a name="' + x + '">';
      (a = doc.createElement(a)).name = x;
      root.insertBefore(a, root.firstChild);
      isBuggy = !!doc.getElementById(x);
      root.removeChild(a);
      return isBuggy;
    })() :
    true,

  BUGGY_GEBTN = NATIVE_GEBTN ?
    (function() {
      var div = doc.createElement('div');
      div.appendChild(doc.createComment(''));
      return !!div.getElementsByTagName('*')[0];
    })() :
    true,

  BUGGY_GEBCN = NATIVE_GEBCN ?
    (function() {
      var isBuggy, div = doc.createElement('div'), test = '\u53f0\u5317';

      div.appendChild(doc.createElement('span')).
        setAttribute('class', test + 'abc ' + test);
      div.appendChild(doc.createElement('span')).
        setAttribute('class', 'x');

      isBuggy = !div.getElementsByClassName(test)[0];

      div.lastChild.className = test;
      return isBuggy || div.getElementsByClassName(test).length != 2;
    })() :
    true,

  BUGGY_GET_ATTRIBUTE = NATIVE_GET_ATTRIBUTE ?
    (function() {
      var input = doc.createElement('input');
      input.setAttribute('value', 5);
      return input.defaultValue != 5;
    })() :
    true,

  BUGGY_HAS_ATTRIBUTE = NATIVE_HAS_ATTRIBUTE ?
    (function() {
      var option = doc.createElement('option');
      option.setAttribute('selected', 'selected');
      return !option.hasAttribute('selected');
    })() :
    true,

  BUGGY_SELECTED =
    (function() {
      var select = doc.createElement('select');
      select.appendChild(doc.createElement('option'));
      return !select.firstChild.selected;
    })(),

  BUGGY_QUIRKS_GEBCN,
  BUGGY_QUIRKS_QSAPI,

  QUIRKS_MODE,
  XML_DOCUMENT,

  OPERA = /opera/i.test(string.call(global.opera)),

  OPERA_QSAPI = OPERA && parseFloat(opera.version()) >= 11,

  RE_BUGGY_QSAPI = NATIVE_QSAPI ?
    (function() {
      var pattern = [ ], div = doc.createElement('div'), element,

      expect = function(selector, context, element, n) {
        var result = false;
        context.appendChild(element);
        try { result = context.querySelectorAll(selector).length == n; } catch(e) { }
        while (context.firstChild) { context.removeChild(context.firstChild); }
        return result;
      };

      element = doc.createElement('p');
      element.setAttribute('class', '');
      expect('[class^=""]', div, element, 1) &&
        pattern.push('[*^$]=[\\x20\\t\\n\\r\\f]*(?:""|' + "'')");

      element = doc.createElement('option');
      element.setAttribute('selected', 'selected');
      expect(':checked', div, element, 0) &&
        pattern.push(':checked');

      element = doc.createElement('input');
      element.setAttribute('type', 'hidden');
      expect(':enabled', div, element, 1) &&
        pattern.push(':enabled', ':disabled');

      element = doc.createElement('link');
      element.setAttribute('href', 'x');
      expect(':link', div, element, 1) ||
        pattern.push(':link');

      if (BUGGY_HAS_ATTRIBUTE) {
        pattern.push('\\[[\\x20\\t\\n\\r\\f]*(?:checked|disabled|ismap|multiple|readonly|selected|value)');
      }

      return pattern.length ?
        new RegExp(pattern.join('|')) :
        { 'test': function() { return false; } };

    })() :
    true,

  RE_CLASS = new RegExp('(?:\\[[\\x20\\t\\n\\r\\f]*class\\b|\\.' + identifier + ')'),

  RE_SIMPLE_SELECTOR = new RegExp(
    !(BUGGY_GEBTN && BUGGY_GEBCN) ? !OPERA ?
      '^(?:\\*|[.#]?-?[_a-zA-Z]{1}' + encoding + '*)$' :
      '^(?:\\*|#-?[_a-zA-Z]{1}' + encoding + '*)$' :
      '^#?-?[_a-zA-Z]{1}' + encoding + '*$'),

  /*----------------------------- LOOKUP OBJECTS -----------------------------*/

  LINK_NODES = { 'a': 1, 'A': 1, 'area': 1, 'AREA': 1, 'link': 1, 'LINK': 1 },

  ATTR_BOOLEAN = {
    'checked': 1, 'disabled': 1, 'ismap': 1,
    'multiple': 1, 'readonly': 1, 'selected': 1
  },

  ATTR_DEFAULT = {
    value: 'defaultValue',
    checked: 'defaultChecked',
    selected: 'defaultSelected'
  },

  ATTR_URIDATA = {
    'action': 2, 'cite': 2, 'codebase': 2, 'data': 2, 'href': 2,
    'longdesc': 2, 'lowsrc': 2, 'src': 2, 'usemap': 2
  },

  HTML_TABLE = {
    'class': 0,
    'accept': 1, 'accept-charset': 1, 'align': 1, 'alink': 1, 'axis': 1,
    'bgcolor': 1, 'charset': 1, 'checked': 1, 'clear': 1, 'codetype': 1, 'color': 1,
    'compact': 1, 'declare': 1, 'defer': 1, 'dir': 1, 'direction': 1, 'disabled': 1,
    'enctype': 1, 'face': 1, 'frame': 1, 'hreflang': 1, 'http-equiv': 1, 'lang': 1,
    'language': 1, 'link': 1, 'media': 1, 'method': 1, 'multiple': 1, 'nohref': 1,
    'noresize': 1, 'noshade': 1, 'nowrap': 1, 'readonly': 1, 'rel': 1, 'rev': 1,
    'rules': 1, 'scope': 1, 'scrolling': 1, 'selected': 1, 'shape': 1, 'target': 1,
    'text': 1, 'type': 1, 'valign': 1, 'valuetype': 1, 'vlink': 1
  },

  XHTML_TABLE = {
    'accept': 1, 'accept-charset': 1, 'alink': 1, 'axis': 1,
    'bgcolor': 1, 'charset': 1, 'codetype': 1, 'color': 1,
    'enctype': 1, 'face': 1, 'hreflang': 1, 'http-equiv': 1,
    'lang': 1, 'language': 1, 'link': 1, 'media': 1, 'rel': 1,
    'rev': 1, 'target': 1, 'text': 1, 'type': 1, 'vlink': 1
  },

  /*-------------------------- REGULAR EXPRESSIONS ---------------------------*/

  Selectors = {
  },

  Operators = {
     '=': "n=='%m'",
    '^=': "n.indexOf('%m')==0",
    '*=': "n.indexOf('%m')>-1",
    '|=': "(n+'-').indexOf('%m-')==0",
    '~=': "(' '+n+' ').indexOf(' %m ')>-1",
    '$=': "n.substr(n.length-'%m'.length)=='%m'"
  },

  Optimize = {
    ID: new RegExp('^\\*?#(' + encoding + '+)|' + skipgroup),
    TAG: new RegExp('^(' + encoding + '+)|' + skipgroup),
    CLASS: new RegExp('^\\*?\\.(' + encoding + '+$)|' + skipgroup)
  },

  Patterns = {
    spseudos: /^\:((root|empty|nth-)?(?:(first|last|only)-)?(child)?-?(of-type)?)(?:\(([^\x29]*)\))?(.*)/,
    dpseudos: /^\:(link|visited|target|lang|not|active|focus|hover|checked|disabled|enabled|selected)(?:\((["']*)(.*?(\(.*\))?[^'"()]*?)\2\))?(.*)/,
    attribute: new RegExp('^\\[' + attrmatcher + '\\](.*)'),
    children: /^[\x20\t\n\r\f]*\>[\x20\t\n\r\f]*(.*)/,
    adjacent: /^[\x20\t\n\r\f]*\+[\x20\t\n\r\f]*(.*)/,
    relative: /^[\x20\t\n\r\f]*\~[\x20\t\n\r\f]*(.*)/,
    ancestor: /^[\x20\t\n\r\f]+(.*)/,
    universal: /^\*(.*)/,
    id: new RegExp('^#(' + encoding + '+)(.*)'),
    tagName: new RegExp('^(' + encoding + '+)(.*)'),
    className: new RegExp('^\\.(' + encoding + '+)(.*)')
  },

  /*------------------------------ UTIL METHODS ------------------------------*/

  concatList =
    function(data, elements) {
      var i = -1, element;
      if (!data.length && Array.slice)
        return Array.slice(elements);
      while ((element = elements[++i]))
        data[data.length] = element;
      return data;
    },

  concatCall =
    function(data, elements, callback) {
      var i = -1, element;
      while ((element = elements[++i])) {
        if (false === callback(data[data.length] = element)) { break; }
      }
      return data;
    },

  switchContext =
    function(from, force) {
      var div, oldDoc = doc;
      lastContext = from;
      doc = from.ownerDocument || from;
      if (force || oldDoc !== doc) {
        root = doc.documentElement;
        XML_DOCUMENT = doc.createElement('DiV').nodeName == 'DiV';

        QUIRKS_MODE = !XML_DOCUMENT &&
          typeof doc.compatMode == 'string' ?
          doc.compatMode.indexOf('CSS') < 0 :
          (function() {
            var style = doc.createElement('div').style;
            return style && (style.width = 1) && style.width == '1px';
          })();

        div = doc.createElement('div');
        div.appendChild(doc.createElement('p')).setAttribute('class', 'xXx');
        div.appendChild(doc.createElement('p')).setAttribute('class', 'xxx');

        BUGGY_QUIRKS_GEBCN =
          !XML_DOCUMENT && NATIVE_GEBCN && QUIRKS_MODE &&
          (div.getElementsByClassName('xxx').length != 2 ||
          div.getElementsByClassName('xXx').length != 2);

        BUGGY_QUIRKS_QSAPI =
          !XML_DOCUMENT && NATIVE_QSAPI && QUIRKS_MODE &&
          (div.querySelectorAll('[class~=xxx]').length != 2 ||
          div.querySelectorAll('.xXx').length != 2);

        Config.CACHING && Dom.setCache(true, doc);
      }
    },

  /*------------------------------ DOM METHODS -------------------------------*/

  byIdRaw =
    function(id, elements) {
      var i = -1, element = null;
      while ((element = elements[++i])) {
        if (element.getAttribute('id') == id) {
          break;
        }
      }
      return element;
    },

  _byId = !BUGGY_GEBID ?
    function(id, from) {
      id = id.replace(/\\/g, '');
      return from.getElementById && from.getElementById(id) ||
        byIdRaw(id, from.getElementsByTagName('*'));
    } :
    function(id, from) {
      var element = null;
      id = id.replace(/\\/g, '');
      if (XML_DOCUMENT || from.nodeType != 9) {
        return byIdRaw(id, from.getElementsByTagName('*'));
      }
      if ((element = from.getElementById(id)) &&
        element.name == id && from.getElementsByName) {
        return byIdRaw(id, from.getElementsByName(id));
      }
      return element;
    },

  byId =
    function(id, from) {
      switchContext(from || (from = doc));
      return _byId(id, from);
    },

  byTagRaw =
    function(tag, from) {
      var any = tag == '*', element = from, elements = [ ], next = element.firstChild;
      any || (tag = tag.toUpperCase());
      while ((element = next)) {
        if (element.tagName > '@' && (any || element.tagName.toUpperCase() == tag)) {
          elements[elements.length] = element;
        }
        if ((next = element.firstChild || element.nextSibling)) continue;
        while (!next && (element = element.parentNode) && element !== from) {
          next = element.nextSibling;
        }
      }
      return elements;
    },

  _byTag = !BUGGY_GEBTN && NATIVE_SLICE_PROTO ?
    function(tag, from) {
      return XML_DOCUMENT || from.nodeType == 11 ? byTagRaw(tag, from) :
        slice.call(from.getElementsByTagName(tag), 0);
    } :
    function(tag, from) {
      var i = -1, j = i, data = [ ],
        element, elements = from.getElementsByTagName(tag);
      if (tag == '*') {
        while ((element = elements[++i])) {
          if (element.nodeName > '@')
            data[++j] = element;
        }
      } else {
        while ((element = elements[++i])) {
          data[i] = element;
        }
      }
      return data;
    },

  byTag =
    function(tag, from) {
      switchContext(from || (from = doc));
      return _byTag(tag, from);
    },

  byName =
    function(name, from) {
      return select('[name="' + name.replace(/\\/g, '') + '"]', from);
    },

  byClassRaw =
    function(name, from) {
      var i = -1, j = i, data = [ ], element, elements = _byTag('*', from), n;
      name = ' ' + (QUIRKS_MODE ? name.toLowerCase() : name).replace(/\\/g, '') + ' ';
      while ((element = elements[++i])) {
        n = XML_DOCUMENT ? element.getAttribute('class') : element.className;
        if (n && n.length && (' ' + (QUIRKS_MODE ? n.toLowerCase() : n).
          replace(reWhiteSpace, ' ') + ' ').indexOf(name) > -1) {
          data[++j] = element;
        }
      }
      return data;
    },

  _byClass =
    function(name, from) {
      return (BUGGY_GEBCN || BUGGY_QUIRKS_GEBCN || XML_DOCUMENT || !from.getElementsByClassName) ?
        byClassRaw(name, from) : slice.call(from.getElementsByClassName(name.replace(/\\/g, '')), 0);
    },

  byClass =
    function(name, from) {
      switchContext(from || (from = doc));
      return _byClass(name, from);
    },

  contains = 'compareDocumentPosition' in root ?
    function(container, element) {
      return (container.compareDocumentPosition(element) & 16) == 16;
    } : 'contains' in root ?
    function(container, element) {
      return container !== element && container.contains(element);
    } :
    function(container, element) {
      while ((element = element.parentNode)) {
        if (element === container) return true;
      }
      return false;
    },

  getAttribute = !BUGGY_GET_ATTRIBUTE ?
    function(node, attribute) {
      return node.getAttribute(attribute) || '';
    } :
    function(node, attribute) {
      attribute = attribute.toLowerCase();
      if (ATTR_DEFAULT[attribute]) {
        return node[ATTR_DEFAULT[attribute]] || '';
      }
      return (
        ATTR_URIDATA[attribute] ? node.getAttribute(attribute, 2) || '' :
        ATTR_BOOLEAN[attribute] ? node.getAttribute(attribute) ? attribute : '' :
          ((node = node.getAttributeNode(attribute)) && node.value) || '');
    },

  hasAttribute = !BUGGY_HAS_ATTRIBUTE ?
    function(node, attribute) {
      return XML_DOCUMENT ?
        !!node.getAttribute(attribute) :
        node.hasAttribute(attribute);
    } :
    function(node, attribute) {
      attribute = attribute.toLowerCase();
      if (ATTR_DEFAULT[attribute]) {
        return !!node[ATTR_DEFAULT[attribute]];
      }
      node = node.getAttributeNode(attribute);
      return !!(node && (node.specified || node.nodeValue));
    },

  isEmpty =
    function(node) {
      node = node.firstChild;
      while (node) {
        if (node.nodeType == 3 || node.nodeName > '@') return false;
        node = node.nextSibling;
      }
      return true;
    },

  isLink =
    function(element) {
      return hasAttribute(element,'href') && LINK_NODES[element.nodeName];
    },

  nthElement =
    function(element, last) {
      var count = 1, succ = last ? 'nextSibling' : 'previousSibling';
      while ((element = element[succ])) {
        if (element.nodeName > '@') ++count;
      }
      return count;
    },

  nthOfType =
    function(element, last) {
      var count = 1, succ = last ? 'nextSibling' : 'previousSibling', type = element.nodeName;
      while ((element = element[succ])) {
        if (element.nodeName == type) ++count;
      }
      return count;
    },

  /*------------------------------- DEBUGGING --------------------------------*/

  configure =
    function(options) {
      for (var i in options) {
        Config[i] = !!options[i];
        if (i == 'SIMPLENOT') {
          matchContexts = { };
          matchResolvers = { };
          selectContexts = { };
          selectResolvers = { };
          Config['USE_QSAPI'] = false;
          reValidator = new RegExp(extendedValidator, 'g');
        } else if (i == 'USE_QSAPI') {
          Config[i] = !!options[i] && NATIVE_QSAPI;
          reValidator = new RegExp(standardValidator, 'g');
        }
      }
    },

  emit =
    function(message) {
      message = 'SYNTAX_ERR: ' + message + ' ';
      if (Config.VERBOSITY) {
        if (typeof global.DOMException != 'undefined') {
          throw { code: 12, message: message };
        } else {
          throw new Error(12, message);
        }
      } else {
        if (global.console && global.console.log) {
          global.console.log(message);
        } else {
          global.status += message;
        }
      }
    },

  Config = {

    CACHING: false,

    SHORTCUTS: false,

    SIMPLENOT: true,

    USE_HTML5: false,

    USE_QSAPI: NATIVE_QSAPI,

    VERBOSITY: true

  },

  /*---------------------------- COMPILER METHODS ----------------------------*/

  ACCEPT_NODE = 'r[r.length]=c[k];if(f&&false===f(c[k]))break;else continue main;',

  compile =
    function(selector, source, mode) {

      var parts = typeof selector == 'string' ? selector.match(reSplitGroup) : selector;

      typeof source == 'string' || (source = '');

      if (parts.length == 1) {
        source += compileSelector(parts[0], mode ? ACCEPT_NODE : 'f&&f(k);return true;');
      } else {
        var i = -1, seen = { }, token;
        while ((token = parts[++i])) {
          token = token.replace(reTrimSpaces, '');
          if (!seen[token] && (seen[token] = true)) {
            source += compileSelector(token, mode ? ACCEPT_NODE : 'f&&f(k);return true;');
          }
        }
      }

      if (mode) {
        return new Function('c,s,r,d,h,g,f',
          'var N,n,x=0,k=-1,e;main:while((e=c[++k])){' + source + '}return r;');
      } else {
        return new Function('e,s,r,d,h,g,f',
          'var N,n,x=0,k=e;' + source + 'return false;');
      }
    },

  compileSelector =
    function(selector, source) {

      var a, b, n, k = 0, expr, match, result, status, test, type;

      while (selector) {

        k++;

        if ((match = selector.match(Patterns.universal))) {
          expr = '';
        }

        else if ((match = selector.match(Patterns.id))) {
          source = 'if(' + (XML_DOCUMENT ?
            's.getAttribute(e,"id")' :
            '(e.submit?s.getAttribute(e,"id"):e.id)') +
            '=="' + match[1] + '"' +
            '){' + source + '}';
        }

        else if ((match = selector.match(Patterns.tagName))) {
          source = 'if(e.nodeName' + (XML_DOCUMENT ?
            '=="' + match[1] + '"' : '.toUpperCase()' +
            '=="' + match[1].toUpperCase() + '"') +
            '){' + source + '}';
        }

        else if ((match = selector.match(Patterns.className))) {
          source = 'if((n=' + (XML_DOCUMENT ?
            's.getAttribute(e,"class")' : 'e.className') +
            ')&&n.length&&(" "+' + (QUIRKS_MODE ? 'n.toLowerCase()' : 'n') +
            '.replace(' + reWhiteSpace + '," ")+" ").indexOf(" ' +
            (QUIRKS_MODE ? match[1].toLowerCase() : match[1]) + ' ")>-1' +
            '){' + source + '}';
        }

        else if ((match = selector.match(Patterns.attribute))) {

          expr = match[1].split(':');
          expr = expr.length == 2 ? expr[1] : expr[0] + '';

          if (match[2] && !Operators[match[2]]) {
            emit('Unsupported operator in attribute selectors "' + selector + '"');
            return '';
          }

          test = false;
          type = 'false';

          if (match[2] && match[4] && (type = Operators[match[2]])) {
            HTML_TABLE['class'] = QUIRKS_MODE ? 1 : 0;
            match[4] = match[4].replace(/\\([0-9a-f]{2,2})/, '\\x$1');
            test = (XML_DOCUMENT ? XHTML_TABLE : HTML_TABLE)[expr.toLowerCase()];
            type = type.replace(/\%m/g, test ? match[4].toLowerCase() : match[4]);
          } else if (match[2] == '!=' || match[2] == '=') {
            type = 'n' + match[2] + '="' + match[4] + '"';
          }

          expr = 'n=s.' + (match[2] ? 'get' : 'has') +
            'Attribute(e,"' + match[1] + '")' +
            (test ? '.toLowerCase();' : ';');

          source = expr + 'if(' + (match[2] ? type : 'n') + '){' + source + '}';
        }

        else if ((match = selector.match(Patterns.adjacent))) {
          source = NATIVE_TRAVERSAL_API ?
            'var N' + k + '=e;if(e&&(e=e.previousElementSibling)){' + source + '}e=N' + k + ';' :
            'var N' + k + '=e;while(e&&(e=e.previousSibling)){if(e.nodeName>"@"){' + source + 'break;}}e=N' + k + ';';
        }

        else if ((match = selector.match(Patterns.relative))) {
          source = NATIVE_TRAVERSAL_API ?
            ('var N' + k + '=e;e=e.parentNode.firstElementChild;' +
            'while(e&&e!==N' + k + '){' + source + 'e=e.nextElementSibling;}e=N' + k + ';') :
            ('var N' + k + '=e;e=e.parentNode.firstChild;' +
            'while(e&&e!==N' + k + '){if(e.nodeName>"@"){' + source + '}e=e.nextSibling;}e=N' + k + ';');
        }

        else if ((match = selector.match(Patterns.children))) {
          source = 'var N' + k + '=e;if(e&&e!==h&&e!==g&&(e=e.parentNode)){' + source + '}e=N' + k + ';';
        }

        else if ((match = selector.match(Patterns.ancestor))) {
          source = 'var N' + k + '=e;while(e&&e!==h&&e!==g&&(e=e.parentNode)){' + source + '}e=N' + k + ';';
        }

        else if ((match = selector.match(Patterns.spseudos)) && match[1]) {

          switch (match[2]) {

            case 'root':
              if (match[7]) {
                source = 'if(e===h||s.contains(h,e)){' + source + '}';
              } else {
                source = 'if(e===h){' + source + '}';
              }
              break;

            case 'empty':
              source = 'if(s.isEmpty(e)){' + source + '}';
              break;

            default:
              if (match[2] && match[6]) {
                if (match[6] == 'n') {
                  source = 'if(e!==h){' + source + '}';
                  break;
                } else if (match[6] == 'even') {
                  a = 2;
                  b = 0;
                } else if (match[6] == 'odd') {
                  a = 2;
                  b = 1;
                } else {
                  b = ((n = match[6].match(/(-?\d+)$/)) ? parseInt(n[1], 10) : 0);
                  a = ((n = match[6].match(/(-?\d*)n/)) ? parseInt(n[1], 10) : 0);
                  if (n && n[1] == '-') a = -1;
                }

                test =  b < 1 && a > 1 ? '(n-(' + b + '))%' + a + '==0' : a > +1 ?
                  (match[3] == 'last') ? '(n-(' + b + '))%' + a + '==0' :
                  'n>=' + b + '&&(n-(' + b + '))%' + a + '==0' : a < -1 ?
                  (match[3] == 'last') ? '(n-(' + b + '))%' + a + '==0' :
                  'n<=' + b + '&&(n-(' + b + '))%' + a + '==0' : a=== 0 ?
                  'n==' + b :
                  (match[3] == 'last') ?
                    a == -1 ? 'n>=' + b : 'n<=' + b :
                    a == -1 ? 'n<=' + b : 'n>=' + b;

                source =
                  'if(e!==h){' +
                    'n=s[' + (match[5] ? '"nthOfType"' : '"nthElement"') + ']' +
                      '(e,' + (match[3] == 'last' ? 'true' : 'false') + ');' +
                    'if(' + test + '){' + source + '}' +
                  '}';

              } else {
                a = match[3] == 'first' ? 'previous' : 'next';
                n = match[3] == 'only' ? 'previous' : 'next';
                b = match[3] == 'first' || match[3] == 'last';

                type = match[5] ? '&&n.nodeName!=e.nodeName' : '&&n.nodeName<"@"';

                source = 'if(e!==h){' +
                  ( 'n=e;while((n=n.' + a + 'Sibling)' + type + ');if(!n){' + (b ? source :
                    'n=e;while((n=n.' + n + 'Sibling)' + type + ');if(!n){' + source + '}') + '}' ) + '}';
              }
              break;
          }

        }

        else if ((match = selector.match(Patterns.dpseudos)) && match[1]) {

          switch (match[1]) {
            case 'not':
              expr = match[3].replace(reTrimSpaces, '');

              if (Config.SIMPLENOT && !reSimpleNot.test(expr)) {
                emit('Negation pseudo-class only accepts simple selectors "' + selector + '"');
                return '';
              } else {
                if ('compatMode' in doc) {
                  source = 'if(!' + compile([expr], '', false) + '(e,s,r,d,h,g)){' + source + '}';
                } else {
                  source = 'if(!s.match(e, "' + expr.replace(/\x22/g, '\\"') + '",g)){' + source +'}';
                }
              }
              break;

            case 'checked':
              test = 'if((typeof e.form!="undefined"&&(/^(?:radio|checkbox)$/i).test(e.type)&&e.checked)';
              source = (Config.USE_HTML5 ? test + '||(/^option$/i.test(e.nodeName)&&e.selected)' : test) + '){' + source + '}';
              break;
            case 'disabled':
              source = 'if(((typeof e.form!="undefined"&&!(/^hidden$/i).test(e.type))||s.isLink(e))&&e.disabled){' + source + '}';
              break;
            case 'enabled':
              source = 'if(((typeof e.form!="undefined"&&!(/^hidden$/i).test(e.type))||s.isLink(e))&&!e.disabled){' + source + '}';
              break;

            case 'lang':
              test = '';
              if (match[3]) test = match[3].substr(0, 2) + '-';
              source = 'do{(n=e.lang||"").toLowerCase();' +
                'if((n==""&&h.lang=="' + match[3].toLowerCase() + '")||' +
                '(n&&(n=="' + match[3].toLowerCase() +
                '"||n.substr(0,3)=="' + test.toLowerCase() + '")))' +
                '{' + source + 'break;}}while((e=e.parentNode)&&e!==g);';
              break;

            case 'target':
              n = doc.location ? doc.location.hash : '';
              if (n) {
                source = 'if(e.id=="' + n.slice(1) + '"){' + source + '}';
              }
              break;

            case 'link':
              source = 'if(s.isLink(e)&&!e.visited){' + source + '}';
              break;
            case 'visited':
              source = 'if(s.isLink(e)&&e.visited){' + source + '}';
              break;

            case 'active':
              if (XML_DOCUMENT) break;
              source = 'if(e===d.activeElement){' + source + '}';
              break;
            case 'hover':
              if (XML_DOCUMENT) break;
              source = 'if(e===d.hoverElement){' + source + '}';
              break;
            case 'focus':
              if (XML_DOCUMENT) break;
              source = NATIVE_FOCUS ?
                'if(e===d.activeElement&&d.hasFocus()&&(e.type||e.href)){' + source + '}' :
                'if(e===d.activeElement&&(e.type||e.href)){' + source + '}';
              break;

            case 'selected':
              expr = BUGGY_SELECTED ? '||(n=e.parentNode)&&n.options[n.selectedIndex]===e' : '';
              source = 'if(/^option$/i.test(e.nodeName)&&(e.selected' + expr + ')){' + source + '}';
              break;

            default:
              break;
          }

        }

        else {

          expr = false;
          status = true;

          for (expr in Selectors) {
            if ((match = selector.match(Selectors[expr].Expression)) && match[1]) {
              result = Selectors[expr].Callback(match, source);
              source = result.source;
              status = result.status;
              if (status) break;
            }
          }

          if (!status) {
            emit('Unknown pseudo-class selector "' + selector + '"');
            return '';
          }

          if (!expr) {
            emit('Unknown token in selector "' + selector + '"');
            return '';
          }

        }

        if (!match) {
          emit('Invalid syntax in selector "' + selector + '"');
          return '';
        }

        selector = match && match[match.length - 1];
      }

      return source;
    },

  /*----------------------------- QUERY METHODS ------------------------------*/

  match =
    function(element, selector, from, callback) {

      var parts;

      if (!(element && element.nodeName > '@')) {
        emit('Invalid element argument');
        return false;
      } else if (!selector || typeof selector != 'string') {
        emit('Invalid selector argument');
        return false;
      } else if (from && from.nodeType == 1 && !contains(from, element)) {
        return false;
      } else if (lastContext !== from) {
        switchContext(from || (from = element.ownerDocument));
      }

      selector = selector.replace(reTrimSpaces, '');

      Config.SHORTCUTS && (selector = NW.Dom.shortcuts(selector, element, from));

      if (lastMatcher != selector) {
        if ((parts = selector.match(reValidator)) && parts[0] == selector) {
          isSingleMatch = (parts = selector.match(reSplitGroup)).length < 2;
          lastMatcher = selector;
          lastPartsMatch = parts;
        } else {
          emit('The string "' + selector + '", is not a valid CSS selector');
          return false;
        }
      } else parts = lastPartsMatch;

      if (!matchResolvers[selector] || matchContexts[selector] !== from) {
        matchResolvers[selector] = compile(isSingleMatch ? [selector] : parts, '', false);
        matchContexts[selector] = from;
      }

      return matchResolvers[selector](element, Snapshot, [ ], doc, root, from, callback);
    },

  first =
    function(selector, from) {
      return select(selector, from, function() { return false; })[0] || null;
    },

  select =
    function(selector, from, callback) {

      var i, changed, element, elements, parts, token, original = selector;

      if (arguments.length === 0) {
        emit('Missing required selector parameters');
        return [ ];
      } else if (selector === '') {
        emit('Empty selector string');
        return [ ];
      } else if (typeof selector != 'string') {
        return [ ];
      } else if (from && !(/1|9|11/).test(from.nodeType)) {
        emit('Invalid context element');
        return [ ];
      } else if (lastContext !== from) {
        switchContext(from || (from = doc));
      }

      if (Config.CACHING && (elements = Dom.loadResults(original, from, doc, root))) {
        return callback ? concatCall([ ], elements, callback) : elements;
      }

      if (!OPERA_QSAPI && RE_SIMPLE_SELECTOR.test(selector)) {
        switch (selector.charAt(0)) {
          case '#':
            if ((element = _byId(selector.slice(1), from))) {
              elements = [ element ];
            } else elements = [ ];
            break;
          case '.':
            elements = _byClass(selector.slice(1), from);
            break;
          default:
            elements = _byTag(selector, from);
            break;
        }
      }

      else if (!XML_DOCUMENT && Config.USE_QSAPI &&
        !(BUGGY_QUIRKS_QSAPI && RE_CLASS.test(selector)) &&
        !RE_BUGGY_QSAPI.test(selector)) {
        try {
          elements = from.querySelectorAll(selector);
        } catch(e) { }
      }

      if (elements) {
        elements = callback ? concatCall([ ], elements, callback) :
          NATIVE_SLICE_PROTO ? slice.call(elements) : concatList([ ], elements);
        Config.CACHING && Dom.saveResults(original, from, doc, elements);
        return elements;
      }

      selector = selector.replace(reTrimSpaces, '');

      Config.SHORTCUTS && (selector = NW.Dom.shortcuts(selector, from));

      if ((changed = lastSelector != selector)) {
        if ((parts = selector.match(reValidator)) && parts[0] == selector) {
          isSingleSelect = (parts = selector.match(reSplitGroup)).length < 2;
          lastSelector = selector;
          lastPartsSelect = parts;
        } else {
          emit('The string "' + selector + '", is not a valid CSS selector');
          return [ ];
        }
      } else parts = lastPartsSelect;

      if (from.nodeType == 11) {

        elements = from.childNodes;

      } else if (!XML_DOCUMENT && isSingleSelect) {

        if (changed) {
          parts = selector.match(reSplitToken);
          token = parts[parts.length - 1];

          lastSlice = token.split(':not')[0];

          lastPosition = selector.length - token.length;
        }

        if ((parts = lastSlice.match(Optimize.ID)) && (token = parts[1])) {
          if ((element = _byId(token, from))) {
            if (match(element, selector)) {
              callback && callback(element);
              elements = [ element ];
            } else elements = [ ];
          }
        }

        else if ((parts = selector.match(Optimize.ID)) && (token = parts[1])) {
          if ((element = _byId(token, doc))) {
            if ('#' + token == selector) {
              callback && callback(element);
              elements = [ element ];
            }
            if (/[>+~]/.test(selector)) {
              from = element.parentNode;
            } else {
              selector = selector.replace('#' + token, '*');
              lastPosition -= token.length + 1;
              from = element;
            }
          } else elements = [ ];
        }

        if (elements) {
          Config.CACHING && Dom.saveResults(original, from, doc, elements);
          return elements;
        }

        if (!NATIVE_GEBCN && (parts = lastSlice.match(Optimize.TAG)) && (token = parts[1])) {
          if ((elements = _byTag(token, from)).length === 0) { return [ ]; }
          selector = selector.slice(0, lastPosition) + selector.slice(lastPosition).replace(token, '*');
        }

        else if ((parts = lastSlice.match(Optimize.CLASS)) && (token = parts[1])) {
          if ((elements = _byClass(token, from)).length === 0) { return [ ]; }
          if (reOptimizeSelector.test(selector.charAt(selector.indexOf(token) - 1))) {
            selector = selector.slice(0, lastPosition) + selector.slice(lastPosition).replace('.' + token, '');
          } else {
            selector = selector.slice(0, lastPosition) + selector.slice(lastPosition).replace('.' + token, '*');
          }
        }

        else if ((parts = selector.match(Optimize.CLASS)) && (token = parts[1])) {
          if ((elements = _byClass(token, from)).length === 0) { return [ ]; }
          for (i = 0, els = [ ]; elements.length > i; ++i) {
            els = concatList(els, elements[i].getElementsByTagName('*'));
          }
          elements = els;
          if (reOptimizeSelector.test(selector.charAt(selector.indexOf(token) - 1))) {
            selector = selector.slice(0, lastPosition) + selector.slice(lastPosition).replace('.' + token, '');
          } else {
            selector = selector.slice(0, lastPosition) + selector.slice(lastPosition).replace('.' + token, '*');
          }
        }

        else if (NATIVE_GEBCN && (parts = lastSlice.match(Optimize.TAG)) && (token = parts[1])) {
          if ((elements = _byTag(token, from)).length === 0) { return [ ]; }
          selector = selector.slice(0, lastPosition) + selector.slice(lastPosition).replace(token, '*');
        }

      }

      if (!elements) {
        elements = /^(?:applet|object)$/i.test(from.nodeName) ? from.childNodes : _byTag('*', from);
      }

      if (!selectResolvers[selector] || selectContexts[selector] !== from) {
        selectResolvers[selector] = compile(isSingleSelect ? [selector] : parts, '', true);
        selectContexts[selector] = from;
      }

      elements = selectResolvers[selector](elements, Snapshot, [ ], doc, root, from, callback);

      Config.CACHING && Dom.saveResults(original, from, doc, elements);

      return elements;
    },

  /*-------------------------------- STORAGE ---------------------------------*/

  matchContexts = { },
  matchResolvers = { },

  selectContexts = { },
  selectResolvers = { },

  Snapshot = {

    nthElement: nthElement,
    nthOfType: nthOfType,

    getAttribute: getAttribute,
    hasAttribute: hasAttribute,

    byClass: _byClass,
    byName: byName,
    byTag: _byTag,
    byId: _byId,

    contains: contains,
    isEmpty: isEmpty,
    isLink: isLink,

    select: select,
    match: match
  };

  Tokens = {
    prefixes: prefixes,
    encoding: encoding,
    operators: operators,
    whitespace: whitespace,
    identifier: identifier,
    attributes: attributes,
    combinators: combinators,
    pseudoclass: pseudoclass,
    pseudoparms: pseudoparms,
    quotedvalue: quotedvalue
  };

  /*------------------------------- PUBLIC API -------------------------------*/

  Dom.ACCEPT_NODE = ACCEPT_NODE;

  Dom.emit = emit;

  Dom.byId = byId;

  Dom.byTag = byTag;

  Dom.byName = byName;

  Dom.byClass = byClass;

  Dom.getAttribute = getAttribute;

  Dom.hasAttribute = hasAttribute;

  Dom.match = match;

  Dom.first = first;

  Dom.select = select;

  Dom.compile = compile;

  Dom.contains = contains;

  Dom.configure = configure;

  Dom.setCache = function() { return; };

  Dom.loadResults = function() { return; };

  Dom.saveResults = function() { return; };

  Dom.shortcuts = function(x) { return x; };

  Dom.Config = Config;

  Dom.Snapshot = Snapshot;

  Dom.Operators = Operators;

  Dom.Selectors = Selectors;

  Dom.Tokens = Tokens;

  Dom.registerOperator =
    function(symbol, resolver) {
      Operators[symbol] || (Operators[symbol] = resolver);
    };

  Dom.registerSelector =
    function(name, rexp, func) {
      Selectors[name] || (Selectors[name] = {
        Expression: rexp,
        Callback: func
      });
    };

  /*---------------------------------- INIT ----------------------------------*/

  switchContext(doc, true);

})(this);

(function(engine, selector) {
  var engSelect = engine.select, extend = Element.extend;

  function select(selector, context) {
    return engSelect(selector, context, extend);
  }

  engine.registerOperator('!=', 'n!="%m"');

  selector.engine = engine;
  selector.select = extend === Prototype.K ? engSelect : select;
  selector.match = engine.match;
  selector.configure = engine.configure;
})(NW.Dom, Prototype.Selector);

window.NW = Prototype._original_property;
delete Prototype._original_property;

var Form = {
  reset: function(form) {
    form = $(form);
    form.reset();
    return form;
  },

  serializeElements: function(elements, options) {
    if (typeof options != 'object') options = { hash: !!options };
    else if (Object.isUndefined(options.hash)) options.hash = true;
    var key, value, submitted = false, submit = options.submit, accumulator, initial;

    if (options.hash) {
      initial = {};
      accumulator = function(result, key, value) {
        if (key in result) {
          if (!Object.isArray(result[key])) result[key] = [result[key]];
          result[key].push(value);
        } else result[key] = value;
        return result;
      };
    } else {
      initial = '';
      accumulator = function(result, key, value) {
        value = encodeURIComponent(value);
        value = value.replace(/(%0D)?%0A/g, '%0D%0A');
        value = value.replace(/%20/g, '+');
        key = encodeURIComponent(key).replace(/%20/g, '+');
        return result + (result ? '&' : '') + key + '=' + value;
      };
    }

    return elements.inject(initial, function(result, element) {
      if (!element.disabled && element.name) {
        key = element.name; value = $(element).getValue();
        if (value != null && element.type != 'reset' && element.type != 'file' && (element.type != 'submit' || (!submitted &&
            submit !== false && (!submit || key == submit) && (submitted = true)))) {
          result = accumulator(result, key, value);
        }
      }
      return result;
    });
  }
};

Form.Methods = {
  serialize: function(form, options) {
    return Form.serializeElements(Form.getElements(form), options);
  },

  getElements: function(form) {
    var elements = $(form).getElementsByTagName('*');
    var element, results = [], serializers = Form.Element.Serializers;
    for (var i = 0; element = elements[i]; i++) {
      if (serializers[element.tagName.toLowerCase()])
        results.push(Element.extend(element));
    }
    return results;
  },

  getInputs: function(form, typeName, name) {
    form = $(form);
    var inputs = form.getElementsByTagName('input');

    if (!typeName && !name) return $A(inputs).map(Element.extend);

    for (var i = 0, matchingInputs = [], length = inputs.length; i < length; i++) {
      var input = inputs[i];
      if ((typeName && input.type != typeName) || (name && input.name != name))
        continue;
      matchingInputs.push(Element.extend(input));
    }

    return matchingInputs;
  },

  disable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('disable');
    return form;
  },

  enable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('enable');
    return form;
  },

  findFirstElement: function(form) {
    var elements = $(form).getElements().findAll(function(element) {
      return 'hidden' != element.type && !element.disabled;
    });
    var firstByIndex = elements.findAll(function(element) {
      return element.hasAttribute('tabIndex') && element.tabIndex >= 0;
    }).sortBy(function(element) { return element.tabIndex; }).first();

    return firstByIndex ? firstByIndex : elements.find(function(element) {
      return /^(?:input|select|textarea)$/i.test(element.tagName);
    });
  },

  focusFirstElement: function(form) {
    form = $(form);
    var element = form.findFirstElement();
    if (element) element.activate();
    return form;
  },

  request: function(form, options) {
    form = $(form), options = Object.clone(options || { });

    var params = options.parameters, action = form.readAttribute('action') || '';
    if (action.blank()) action = window.location.href;
    options.parameters = form.serialize(true);

    if (params) {
      if (Object.isString(params)) params = params.toQueryParams();
      Object.extend(options.parameters, params);
    }

    if (form.hasAttribute('method') && !options.method)
      options.method = form.method;

    return new Ajax.Request(action, options);
  }
};

/*--------------------------------------------------------------------------*/


Form.Element = {
  focus: function(element) {
    $(element).focus();
    return element;
  },

  select: function(element) {
    $(element).select();
    return element;
  }
};

Form.Element.Methods = {

  serialize: function(element) {
    element = $(element);
    if (!element.disabled && element.name) {
      var value = element.getValue();
      if (value != undefined) {
        var pair = { };
        pair[element.name] = value;
        return Object.toQueryString(pair);
      }
    }
    return '';
  },

  getValue: function(element) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    return Form.Element.Serializers[method](element);
  },

  setValue: function(element, value) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    Form.Element.Serializers[method](element, value);
    return element;
  },

  clear: function(element) {
    $(element).value = '';
    return element;
  },

  present: function(element) {
    return $(element).value != '';
  },

  activate: function(element) {
    element = $(element);
    try {
      element.focus();
      if (element.select && (element.tagName.toLowerCase() != 'input' ||
          !(/^(?:button|reset|submit)$/i.test(element.type))))
        element.select();
    } catch (e) { }
    return element;
  },

  disable: function(element) {
    element = $(element);
    element.disabled = true;
    return element;
  },

  enable: function(element) {
    element = $(element);
    element.disabled = false;
    return element;
  }
};

/*--------------------------------------------------------------------------*/

var Field = Form.Element;

var $F = Form.Element.Methods.getValue;

/*--------------------------------------------------------------------------*/

Form.Element.Serializers = (function() {
  function input(element, value) {
    switch (element.type.toLowerCase()) {
      case 'checkbox':
      case 'radio':
        return inputSelector(element, value);
      default:
        return valueSelector(element, value);
    }
  }

  function inputSelector(element, value) {
    if (Object.isUndefined(value))
      return element.checked ? element.value : null;
    else element.checked = !!value;
  }

  function valueSelector(element, value) {
    if (Object.isUndefined(value)) return element.value;
    else element.value = value;
  }

  function select(element, value) {
    if (Object.isUndefined(value))
      return (element.type === 'select-one' ? selectOne : selectMany)(element);

    var opt, currentValue, single = !Object.isArray(value);
    for (var i = 0, length = element.length; i < length; i++) {
      opt = element.options[i];
      currentValue = this.optionValue(opt);
      if (single) {
        if (currentValue == value) {
          opt.selected = true;
          return;
        }
      }
      else opt.selected = value.include(currentValue);
    }
  }

  function selectOne(element) {
    var index = element.selectedIndex;
    return index >= 0 ? optionValue(element.options[index]) : null;
  }

  function selectMany(element) {
    var length = element.length;
    if (!length) return null;

    for (var i = 0, values = []; i < length; i++) {
      var opt = element.options[i];
      if (opt.selected) values.push(optionValue(opt));
    }
    return values;
  }

  function optionValue(opt) {
    return Element.hasAttribute(opt, 'value') ? opt.value : opt.text;
  }

  return {
    input:         input,
    inputSelector: inputSelector,
    textarea:      valueSelector,
    select:        select,
    selectOne:     selectOne,
    selectMany:    selectMany,
    optionValue:   optionValue,
    button:        valueSelector
  };
})();

/*--------------------------------------------------------------------------*/


Abstract.TimedObserver = Class.create(PeriodicalExecuter, {
  initialize: function($super, element, frequency, callback) {
    $super(callback, frequency);
    this.element   = $(element);
    this.lastValue = this.getValue();
  },

  execute: function() {
    var value = this.getValue();
    if (Object.isString(this.lastValue) && Object.isString(value) ?
        this.lastValue != value : String(this.lastValue) != String(value)) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  }
});

Form.Element.Observer = Class.create(Abstract.TimedObserver, {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.Observer = Class.create(Abstract.TimedObserver, {
  getValue: function() {
    return Form.serialize(this.element);
  }
});

/*--------------------------------------------------------------------------*/

Abstract.EventObserver = Class.create({
  initialize: function(element, callback) {
    this.element  = $(element);
    this.callback = callback;

    this.lastValue = this.getValue();
    if (this.element.tagName.toLowerCase() == 'form')
      this.registerFormCallbacks();
    else
      this.registerCallback(this.element);
  },

  onElementEvent: function() {
    var value = this.getValue();
    if (this.lastValue != value) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  },

  registerFormCallbacks: function() {
    Form.getElements(this.element).each(this.registerCallback, this);
  },

  registerCallback: function(element) {
    if (element.type) {
      switch (element.type.toLowerCase()) {
        case 'checkbox':
        case 'radio':
          Event.observe(element, 'click', this.onElementEvent.bind(this));
          break;
        default:
          Event.observe(element, 'change', this.onElementEvent.bind(this));
          break;
      }
    }
  }
});

Form.Element.EventObserver = Class.create(Abstract.EventObserver, {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.EventObserver = Class.create(Abstract.EventObserver, {
  getValue: function() {
    return Form.serialize(this.element);
  }
});
(function(GLOBAL) {
  var DIV = document.createElement('div');
  var docEl = document.documentElement;
  var MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED = 'onmouseenter' in docEl
   && 'onmouseleave' in docEl;

  var Event = {
    KEY_BACKSPACE: 8,
    KEY_TAB:       9,
    KEY_RETURN:   13,
    KEY_ESC:      27,
    KEY_LEFT:     37,
    KEY_UP:       38,
    KEY_RIGHT:    39,
    KEY_DOWN:     40,
    KEY_DELETE:   46,
    KEY_HOME:     36,
    KEY_END:      35,
    KEY_PAGEUP:   33,
    KEY_PAGEDOWN: 34,
    KEY_INSERT:   45
  };


  var isIELegacyEvent = function(event) { return false; };

  if (window.attachEvent) {
    if (window.addEventListener) {
      isIELegacyEvent = function(event) {
        return !(event instanceof window.Event);
      };
    } else {
      isIELegacyEvent = function(event) { return true; };
    }
  }

  var _isButton;

  function _isButtonForDOMEvents(event, code) {
    return event.which ? (event.which === code + 1) : (event.button === code);
  }

  var legacyButtonMap = { 0: 1, 1: 4, 2: 2 };
  function _isButtonForLegacyEvents(event, code) {
    return event.button === legacyButtonMap[code];
  }

  function _isButtonForWebKit(event, code) {
    switch (code) {
      case 0: return event.which == 1 && !event.metaKey;
      case 1: return event.which == 2 || (event.which == 1 && event.metaKey);
      case 2: return event.which == 3;
      default: return false;
    }
  }

  if (window.attachEvent) {
    if (!window.addEventListener) {
      _isButton = _isButtonForLegacyEvents;
    } else {
      _isButton = function(event, code) {
        return isIELegacyEvent(event) ? _isButtonForLegacyEvents(event, code) :
         _isButtonForDOMEvents(event, code);
      };
    }
  } else if (Prototype.Browser.WebKit) {
    _isButton = _isButtonForWebKit;
  } else {
    _isButton = _isButtonForDOMEvents;
  }

  function isLeftClick(event)   { return _isButton(event, 0); }

  function isMiddleClick(event) { return _isButton(event, 1); }

  function isRightClick(event)  { return _isButton(event, 2); }

  function element(event) {
    return Element.extend(_element(event));
  }

  function _element(event) {
    event = Event.extend(event);

    var node = event.target, type = event.type,
     currentTarget = event.currentTarget;

    if (currentTarget && currentTarget.tagName) {
      if (type === 'load' || type === 'error' ||
        (type === 'click' && currentTarget.tagName.toLowerCase() === 'input'
          && currentTarget.type === 'radio'))
            node = currentTarget;
    }

    return node.nodeType == Node.TEXT_NODE ? node.parentNode : node;
  }

  function findElement(event, expression) {
    var element = _element(event), selector = Prototype.Selector;
    if (!expression) return Element.extend(element);
    while (element) {
      if (Object.isElement(element) && selector.match(element, expression))
        return Element.extend(element);
      element = element.parentNode;
    }
  }

  function pointer(event) {
    return { x: pointerX(event), y: pointerY(event) };
  }

  function pointerX(event) {
    var docElement = document.documentElement,
     body = document.body || { scrollLeft: 0 };

    return event.pageX || (event.clientX +
      (docElement.scrollLeft || body.scrollLeft) -
      (docElement.clientLeft || 0));
  }

  function pointerY(event) {
    var docElement = document.documentElement,
     body = document.body || { scrollTop: 0 };

    return event.pageY || (event.clientY +
       (docElement.scrollTop || body.scrollTop) -
       (docElement.clientTop || 0));
  }


  function stop(event) {
    Event.extend(event);
    event.preventDefault();
    event.stopPropagation();

    event.stopped = true;
  }


  Event.Methods = {
    isLeftClick:   isLeftClick,
    isMiddleClick: isMiddleClick,
    isRightClick:  isRightClick,

    element:     element,
    findElement: findElement,

    pointer:  pointer,
    pointerX: pointerX,
    pointerY: pointerY,

    stop: stop
  };

  var methods = Object.keys(Event.Methods).inject({ }, function(m, name) {
    m[name] = Event.Methods[name].methodize();
    return m;
  });

  if (window.attachEvent) {
    function _relatedTarget(event) {
      var element;
      switch (event.type) {
        case 'mouseover':
        case 'mouseenter':
          element = event.fromElement;
          break;
        case 'mouseout':
        case 'mouseleave':
          element = event.toElement;
          break;
        default:
          return null;
      }
      return Element.extend(element);
    }

    var additionalMethods = {
      stopPropagation: function() { this.cancelBubble = true; },
      preventDefault:  function() { this.returnValue = false; },
      inspect: function() { return '[object Event]'; }
    };

    Event.extend = function(event, element) {
      if (!event) return false;

      if (!isIELegacyEvent(event)) return event;

      if (event._extendedByPrototype) return event;
      event._extendedByPrototype = Prototype.emptyFunction;

      var pointer = Event.pointer(event);

      Object.extend(event, {
        target: event.srcElement || element,
        relatedTarget: _relatedTarget(event),
        pageX:  pointer.x,
        pageY:  pointer.y
      });

      Object.extend(event, methods);
      Object.extend(event, additionalMethods);

      return event;
    };
  } else {
    Event.extend = Prototype.K;
  }

  if (window.addEventListener) {
    Event.prototype = window.Event.prototype || document.createEvent('HTMLEvents').__proto__;
    Object.extend(Event.prototype, methods);
  }

  var EVENT_TRANSLATIONS = {
    mouseenter: 'mouseover',
    mouseleave: 'mouseout'
  };

  function getDOMEventName(eventName) {
    return EVENT_TRANSLATIONS[eventName] || eventName;
  }

  if (MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED)
    getDOMEventName = Prototype.K;

  function getUniqueElementID(element) {
    if (element === window) return 0;

    if (typeof element._prototypeUID === 'undefined')
      element._prototypeUID = Element.Storage.UID++;
    return element._prototypeUID;
  }

  function getUniqueElementID_IE(element) {
    if (element === window) return 0;
    if (element == document) return 1;
    return element.uniqueID;
  }

  if ('uniqueID' in DIV)
    getUniqueElementID = getUniqueElementID_IE;

  function isCustomEvent(eventName) {
    return eventName.include(':');
  }

  Event._isCustomEvent = isCustomEvent;

  function getRegistryForElement(element, uid) {
    var CACHE = GLOBAL.Event.cache;
    uid = uid || getUniqueElementID(element);
    if (!CACHE[uid]) CACHE[uid] = { element: element };
    return CACHE[uid];
  }


  function register(element, eventName, handler) {
    var registry = getRegistryForElement(element);
    if (!registry[eventName]) registry[eventName] = [];
    var entries = registry[eventName];

    var i = entries.length;
    while (i--)
      if (entries[i].handler === handler) return null;

    var uid = getUniqueElementID(element);
    var responder = GLOBAL.Event._createResponder(uid, eventName, handler);
    var entry = {
      responder: responder,
      handler:   handler
    };

    entries.push(entry);
    return entry;
  }

  function unregister(element, eventName, handler) {
    var registry = getRegistryForElement(element);
    var entries = registry[eventName];
    if (!entries) return;

    var i = entries.length, entry;
    while (i--) {
      if (entries[i].handler === handler) {
        entry = entries[i];
        break;
      }
    }

    if (!entry) return;

    var index = entries.indexOf(entry);
    entries.splice(index, 1);

    return entry;
  }


  function observe(element, eventName, handler) {
    element = $(element);
    var entry = register(element, eventName, handler);

    if (entry === null) return element;

    var responder = entry.responder;
    if (isCustomEvent(eventName))
      observeCustomEvent(element, eventName, responder);
    else
      observeStandardEvent(element, eventName, responder);

    return element;
  }

  function observeStandardEvent(element, eventName, responder) {
    var actualEventName = getDOMEventName(eventName);
    if (element.addEventListener) {
      element.addEventListener(actualEventName, responder, false);
    } else {
      element.attachEvent('on' + actualEventName, responder);
    }
  }

  function observeCustomEvent(element, eventName, responder) {
    if (element.addEventListener) {
      element.addEventListener('dataavailable', responder, false);
    } else {
      element.attachEvent('ondataavailable', responder);
      element.attachEvent('onlosecapture',   responder);
    }
  }

  function stopObserving(element, eventName, handler) {
    element = $(element);
    var handlerGiven = !Object.isUndefined(handler),
     eventNameGiven = !Object.isUndefined(eventName);

    if (!eventNameGiven && !handlerGiven) {
      stopObservingElement(element);
      return element;
    }

    if (!handlerGiven) {
      stopObservingEventName(element, eventName);
      return element;
    }

    var entry = unregister(element, eventName, handler);

    if (!entry) return element;
    removeEvent(element, eventName, entry.responder);
    return element;
  }

  function stopObservingStandardEvent(element, eventName, responder) {
    var actualEventName = getDOMEventName(eventName);
    if (element.removeEventListener) {
      element.removeEventListener(actualEventName, responder, false);
    } else {
      element.detachEvent('on' + actualEventName, responder);
    }
  }

  function stopObservingCustomEvent(element, eventName, responder) {
    if (element.removeEventListener) {
      element.removeEventListener('dataavailable', responder, false);
    } else {
      element.detachEvent('ondataavailable', responder);
      element.detachEvent('onlosecapture',   responder);
    }
  }



  function stopObservingElement(element) { // FIX
    var CACHE = GLOBAL.Event.cache, uid = getUniqueElementID(element);
    var registry = CACHE[uid];
    if (!registry) return;

    delete CACHE[uid];

    var entries, i;
    for (var eventName in registry) {
      if (eventName === 'element') continue;

      entries = registry[eventName];
      i = entries.length;
      while (i--)
        removeEvent(element, eventName, entries[i].responder);
    }
  }

  function stopObservingEventName(element, eventName) {
    var registry = getRegistryForElement(element);
    var entries = registry[eventName];
    if (!entries) return;
    delete registry[eventName];

    var i = entries.length;
    while (i--)
      removeEvent(element, eventName, entries[i].responder);
  }


  function removeEvent(element, eventName, handler) {
    if (isCustomEvent(eventName))
      stopObservingCustomEvent(element, eventName, handler);
    else
      stopObservingStandardEvent(element, eventName, handler);
  }



  function getFireTarget(element) {
    if (element !== document) return element;
    if (document.createEvent && !element.dispatchEvent)
      return document.documentElement;
    return element;
  }

  function fire(element, eventName, memo, bubble) {
    element = getFireTarget($(element));
    if (Object.isUndefined(bubble)) bubble = true;
    memo = memo || {};

    var event = fireEvent(element, eventName, memo, bubble);
    return Event.extend(event);
  }

  function fireEvent_DOM(element, eventName, memo, bubble) {
    var event = document.createEvent('HTMLEvents');
    event.initEvent('dataavailable', bubble, true);

    event.eventName = eventName;
    event.memo = memo;

    element.dispatchEvent(event);
    return event;
  }

  function fireEvent_IE(element, eventName, memo, bubble) {
    var event = document.createEventObject();
    event.eventType = bubble ? 'ondataavailable' : 'onlosecapture';

    event.eventName = eventName;
    event.memo = memo;

    element.fireEvent(event.eventType, event);
    return event;
  }

  var fireEvent = document.createEvent ? fireEvent_DOM : fireEvent_IE;



  Event.Handler = Class.create({
    initialize: function(element, eventName, selector, callback) {
      this.element   = $(element);
      this.eventName = eventName;
      this.selector  = selector;
      this.callback  = callback;
      this.handler   = this.handleEvent.bind(this);
      this.handler.toString = function() {
        return callback.toString();
      }
    },


    start: function() {
      Event.observe(this.element, this.eventName, this.handler);
      return this;
    },

    stop: function() {
      Event.stopObserving(this.element, this.eventName, this.handler);
      return this;
    },

    handleEvent: function(event) {
      var element = Event.findElement(event, this.selector);
      if (element) this.callback.call(this.element, event, element);
    }
  });

  function on(element, eventName, selector, callback) {
    element = $(element);
    if (Object.isFunction(selector) && Object.isUndefined(callback)) {
      callback = selector, selector = null;
    }

    return new Event.Handler(element, eventName, selector, callback).start();
  }

  Object.extend(Event, Event.Methods);

  Object.extend(Event, {
    fire:          fire,
    observe:       observe,
    stopObserving: stopObserving,
    on:            on
  });

  Element.addMethods({
    fire:          fire,

    observe:       observe,

    stopObserving: stopObserving,

    on:            on
  });

  Object.extend(document, {
    fire:          fire.methodize(),

    observe:       observe.methodize(),

    stopObserving: stopObserving.methodize(),

    on:            on.methodize(),

    loaded:        false
  });

  Event.dumpCache = function() { // FIX
    for (var e in Event.cache)
      console.log(e);
  };

  if (GLOBAL.Event) Object.extend(window.Event, Event);
  else GLOBAL.Event = Event;

  GLOBAL.Event.cache = {};

  function destroyCache_IE() {
    GLOBAL.Event.cache = null;
  }

  if (window.attachEvent)
    window.attachEvent('onunload', destroyCache_IE);

  DIV = null;
  docEl = null;
})(this);

(function(GLOBAL) {
  /* Code for creating leak-free event responders is based on work by
   John-David Dalton. */

  var docEl = document.documentElement;
  var MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED = 'onmouseenter' in docEl
    && 'onmouseleave' in docEl;

  function isSimulatedMouseEnterLeaveEvent(eventName) {
    return !MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED &&
     (eventName === 'mouseenter' || eventName === 'mouseleave');
  }

  function createResponder(uid, eventName, handler) {
    if (Event._isCustomEvent(eventName))
      return createResponderForCustomEvent(uid, eventName, handler);
    if (isSimulatedMouseEnterLeaveEvent(eventName))
      return createMouseEnterLeaveResponder(uid, eventName, handler);

    return function(event) {
      if (!Event.cache) return;

      var element = Event.cache[uid].element;
      Event.extend(event, element);
      handler.call(element, event);
    };
  }

  function createResponderForCustomEvent(uid, eventName, handler) {
    return function(event) {
      var element = Event.cache[uid].element;

      if (Object.isUndefined(event.eventName))
        return false;

      if (event.eventName !== eventName)
        return false;

      Event.extend(event, element);
      handler.call(element, event);
    };
  }

  function createMouseEnterLeaveResponder(uid, eventName, handler) {
    return function(event) {
      var element = Event.cache[uid].element;

      Event.extend(event, element);
      var parent = event.relatedTarget;

      while (parent && parent !== element) {
        try { parent = parent.parentNode; }
        catch(e) { parent = element; }
      }

      if (parent === element) return;
      handler.call(element, event);
    };
  }

  GLOBAL.Event._createResponder = createResponder;
  docEl = null;
})(this);

(function(GLOBAL) {
  /* Support for the DOMContentLoaded event is based on work by Dan Webb,
     Matthias Miller, Dean Edwards, John Resig, and Diego Perini. */

  var TIMER;

  function fireContentLoadedEvent() {
    if (document.loaded) return;
    if (TIMER) window.clearTimeout(TIMER);
    document.loaded = true;
    document.fire('dom:loaded');
  }

  function checkReadyState() {
    if (document.readyState === 'complete') {
      document.detachEvent('onreadystatechange', checkReadyState);
      fireContentLoadedEvent();
    }
  }

  function pollDoScroll() {
    try {
      document.documentElement.doScroll('left');
    } catch (e) {
      TIMER = pollDoScroll.defer();
      return;
    }

    fireContentLoadedEvent();
  }


  if (document.readyState === 'complete') {
    fireContentLoadedEvent();
    return;
  }

  if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', fireContentLoadedEvent, false);
  } else {
    document.attachEvent('onreadystatechange', checkReadyState);
    if (window == top) TIMER = pollDoScroll.defer();
  }

  Event.observe(window, 'load', fireContentLoadedEvent);
})(this);


Element.addMethods();
/*------------------------------- DEPRECATED -------------------------------*/
var Position = {
  includeScrollOffsets: false,

  prepare: function() {
    this.deltaX =  window.pageXOffset
                || document.documentElement.scrollLeft
                || document.body.scrollLeft
                || 0;
    this.deltaY =  window.pageYOffset
                || document.documentElement.scrollTop
                || document.body.scrollTop
                || 0;
  },

  within: function(element, x, y) {
    if (this.includeScrollOffsets)
      return this.withinIncludingScrolloffsets(element, x, y);
    this.xcomp = x;
    this.ycomp = y;
    this.offset = Element.cumulativeOffset(element);

    return (y >= this.offset[1] &&
            y <  this.offset[1] + element.offsetHeight &&
            x >= this.offset[0] &&
            x <  this.offset[0] + element.offsetWidth);
  },

  withinIncludingScrolloffsets: function(element, x, y) {
    var offsetcache = Element.cumulativeScrollOffset(element);

    this.xcomp = x + offsetcache[0] - this.deltaX;
    this.ycomp = y + offsetcache[1] - this.deltaY;
    this.offset = Element.cumulativeOffset(element);

    return (this.ycomp >= this.offset[1] &&
            this.ycomp <  this.offset[1] + element.offsetHeight &&
            this.xcomp >= this.offset[0] &&
            this.xcomp <  this.offset[0] + element.offsetWidth);
  },

  overlap: function(mode, element) {
    if (!mode) return 0;
    if (mode == 'vertical')
      return ((this.offset[1] + element.offsetHeight) - this.ycomp) /
        element.offsetHeight;
    if (mode == 'horizontal')
      return ((this.offset[0] + element.offsetWidth) - this.xcomp) /
        element.offsetWidth;
  },


  cumulativeOffset: Element.Methods.cumulativeOffset,

  positionedOffset: Element.Methods.positionedOffset,

  absolutize: function(element) {
    Position.prepare();
    return Element.absolutize(element);
  },

  relativize: function(element) {
    Position.prepare();
    return Element.relativize(element);
  },

  realOffset: Element.Methods.cumulativeScrollOffset,

  offsetParent: Element.Methods.getOffsetParent,

  page: Element.Methods.viewportOffset,

  clone: function(source, target, options) {
    return Element.clonePosition(target, source, options || {});
  }
};

/*--------------------------------------------------------------------------*/

if (!document.getElementsByClassName) document.getElementsByClassName = function(instanceMethods){
  function iter(name) {
    return name.blank() ? null : "[contains(concat(' ', @class, ' '), ' " + name + " ')]";
  }

  instanceMethods.getElementsByClassName = Prototype.BrowserFeatures.XPath ?
  function(element, className) {
    className = className.toString().strip();
    var cond = /\s/.test(className) ? $w(className).map(iter).join('') : iter(className);
    return cond ? document._getElementsByXPath('.//*' + cond, element) : [];
  } : function(element, className) {
    className = className.toString().strip();
    var elements = [], classNames = (/\s/.test(className) ? $w(className) : null);
    if (!classNames && !className) return elements;

    var nodes = $(element).getElementsByTagName('*');
    className = ' ' + className + ' ';

    for (var i = 0, child, cn; child = nodes[i]; i++) {
      if (child.className && (cn = ' ' + child.className + ' ') && (cn.include(className) ||
          (classNames && classNames.all(function(name) {
            return !name.toString().blank() && cn.include(' ' + name + ' ');
          }))))
        elements.push(Element.extend(child));
    }
    return elements;
  };

  return function(className, parentElement) {
    return $(parentElement || document.body).getElementsByClassName(className);
  };
}(Element.Methods);

/*--------------------------------------------------------------------------*/

(function() {
  window.Selector = Class.create({
    initialize: function(expression) {
      this.expression = expression.strip();
    },

    findElements: function(rootElement) {
      return Prototype.Selector.select(this.expression, rootElement);
    },

    match: function(element) {
      return Prototype.Selector.match(element, this.expression);
    },

    toString: function() {
      return this.expression;
    },

    inspect: function() {
      return "#<Selector: " + this.expression + ">";
    }
  });

  Object.extend(Selector, {
    matchElements: function(elements, expression) {
      var match = Prototype.Selector.match,
          results = [];

      for (var i = 0, length = elements.length; i < length; i++) {
        var element = elements[i];
        if (match(element, expression)) {
          results.push(Element.extend(element));
        }
      }
      return results;
    },

    findElement: function(elements, expression, index) {
      index = index || 0;
      var matchIndex = 0, element;
      for (var i = 0, length = elements.length; i < length; i++) {
        element = elements[i];
        if (Prototype.Selector.match(element, expression) && index === matchIndex++) {
          return Element.extend(element);
        }
      }
    },

    findChildElements: function(element, expressions) {
      var selector = expressions.toArray().join(', ');
      return Prototype.Selector.select(selector, element || document);
    }
  });
})();
// script.aculo.us builder.js v1.9.0, Thu Dec 23 16:54:48 -0500 2010

// Copyright (c) 2005-2010 Thomas Fuchs (http://script.aculo.us, http://mir.aculo.us)
//
// script.aculo.us is freely distributable under the terms of an MIT-style license.
// For details, see the script.aculo.us web site: http://script.aculo.us/

var Builder = {
  NODEMAP: {
    AREA: 'map',
    CAPTION: 'table',
    COL: 'table',
    COLGROUP: 'table',
    LEGEND: 'fieldset',
    OPTGROUP: 'select',
    OPTION: 'select',
    PARAM: 'object',
    TBODY: 'table',
    TD: 'table',
    TFOOT: 'table',
    TH: 'table',
    THEAD: 'table',
    TR: 'table'
  },
  node: function(elementName) {
    elementName = elementName.toUpperCase();

    // try innerHTML approach
    var parentTag = this.NODEMAP[elementName] || 'div';
    var parentElement = document.createElement(parentTag);
    try { // prevent IE "feature": http://dev.rubyonrails.org/ticket/2707
      parentElement.innerHTML = "<" + elementName + "></" + elementName + ">";
    } catch (e) {
    }
    var element = parentElement.firstChild || null;

    // see if browser added wrapping tags
    if (element && (element.tagName.toUpperCase() != elementName)) {
      element = element.getElementsByTagName(elementName)[0];
    }

    // fallback to createElement approach
    if (!element) {
      element = document.createElement(elementName);
    }

    // abort if nothing could be created
    if (!element) {
      return;
    }

    // attributes (or text)
    if (arguments[1]) {
      if (this._isStringOrNumber(arguments[1]) || (arguments[1] instanceof Array) || arguments[1].tagName) {
        this._children(element, arguments[1]);
      } else {
        var attrs = this._attributes(arguments[1]);
        if (attrs.length) {
          try { // prevent IE "feature": http://dev.rubyonrails.org/ticket/2707
            parentElement.innerHTML = "<" + elementName + " " + attrs + "></" + elementName + ">";
          } catch (e) {
          }
          element = parentElement.firstChild || null;
          // workaround firefox 1.0.X bug
          if (!element) {
            element = document.createElement(elementName);
            for (var attr in arguments[1]) {
              element[attr == 'class' ? 'className' : attr] = arguments[1][attr];
            }
          }
          if (element.tagName.toUpperCase() != elementName) {
            element = parentElement.getElementsByTagName(elementName)[0];
          }
        }
      }
    }

    // text, or array of children
    if (arguments[2]) {
      this._children(element, arguments[2]);
    }

    return $(element);
  },
  _text: function(text) {
    return document.createTextNode(text);
  },

  ATTR_MAP: {
    'className': 'class',
    'htmlFor': 'for'
  },

  _attributes: function(attributes) {
    var attrs = [];
    for (var attr in attributes) {
      attrs.push((attr in this.ATTR_MAP ? this.ATTR_MAP[attr] : attr) + '="' + attributes[attr].toString().escapeHTML().gsub(/"/, '&quot;') + '"');
    }
    return attrs.join(" ");
  },
  _children: function(element, children) {
    if (children.tagName) {
      element.appendChild(children);
      return;
    }
    if (typeof children == 'object') { // array can hold nodes and text
      children.flatten().each(function(e) {
        if (typeof e == 'object') {
          element.appendChild(e);
        } else if (Builder._isStringOrNumber(e)) {
          element.appendChild(Builder._text(e));
        }
      });
    } else if (Builder._isStringOrNumber(children)) {
      element.appendChild(Builder._text(children));
    }
  },
  _isStringOrNumber: function(param) {
    return (typeof param == 'string' || typeof param == 'number');
  },
  build: function(html) {
    var element = this.node('div');
    $(element).update(html.strip());
    return element.down();
  },
  dump: function(scope) {
    if (typeof scope != 'object' && typeof scope != 'function') {
      scope = window; //global scope
    }
    var tags = ("A ABBR ACRONYM ADDRESS APPLET AREA B BASE BASEFONT BDO BIG BLOCKQUOTE BODY " +
    "BR BUTTON CAPTION CENTER CITE CODE COL COLGROUP DD DEL DFN DIR DIV DL DT EM FIELDSET " +
    "FONT FORM FRAME FRAMESET H1 H2 H3 H4 H5 H6 HEAD HR HTML I IFRAME IMG INPUT INS ISINDEX " +
    "KBD LABEL LEGEND LI LINK MAP MENU META NOFRAMES NOSCRIPT OBJECT OL OPTGROUP OPTION P " +
    "PARAM PRE Q S SAMP SCRIPT SELECT SMALL SPAN STRIKE STRONG STYLE SUB SUP TABLE TBODY TD " +
    "TEXTAREA TFOOT TH THEAD TITLE TR TT U UL VAR").split(/\s+/);

    tags.each(function(tag) {
      scope[tag] = function() {
        return Builder.node.apply(Builder, [tag].concat($A(arguments)));
      };
    });
  }
};
// script.aculo.us effects.js v1.9.0, Thu Dec 23 16:54:48 -0500 2010

// Copyright (c) 2005-2010 Thomas Fuchs (http://script.aculo.us, http://mir.aculo.us)
// Contributors:
//  Justin Palmer (http://encytemedia.com/)
//  Mark Pilgrim (http://diveintomark.org/)
//  Martin Bialasinki
//
// script.aculo.us is freely distributable under the terms of an MIT-style license.
// For details, see the script.aculo.us web site: http://script.aculo.us/

// converts rgb() and #xxx to #xxxxxx format,
// returns self (or first argument) if not convertable
String.prototype.parseColor = function(defaultColor) {
  var color = '#', i;
  if (this.slice(0, 4) == 'rgb(') {
    var cols = this.slice(4, this.length - 1).split(',');
    for (i = 0; i < 3; i++) {
      color += parseInt(cols[i], 10).toColorPart();
    }
  } else if (this.slice(0, 1) == '#') {
    if (this.length == 4) {
      for (i = 1; i < 4; i++) {
        color += (this.charAt(i) + this.charAt(i)).toLowerCase();
      }
    } else if (this.length == 7) {
      color = this.toLowerCase();
    }
  }
  return (color.length == 7 ? color : (defaultColor || this));
};

/*--------------------------------------------------------------------------*/

Element.collectTextNodes = function(element) {
  return $A($(element).childNodes).collect(function(node) {
    return (node.nodeType == 3 ? node.nodeValue : (node.hasChildNodes() ? Element.collectTextNodes(node) : ''));
  }).flatten().join('');
};

Element.collectTextNodesIgnoreClass = function(element, className) {
  return $A($(element).childNodes).collect(function(node) {
    return (node.nodeType == 3 ? node.nodeValue : ((node.hasChildNodes() && !Element.hasClassName(node, className)) ? Element.collectTextNodesIgnoreClass(node, className) : ''));
  }).flatten().join('');
};

Element.setContentZoom = function(element, percent) {
  element = $(element);
  element.setStyle({
    fontSize: (percent / 100) + 'em'
  });
  if (Prototype.Browser.WebKit) {
    window.scrollBy(0, 0);
  }
  return element;
};

Element.getInlineOpacity = function(element) {
  return $(element).style.opacity || '';
};

Element.forceRerendering = function(element) {
  try {
    element = $(element);
    var n = document.createTextNode(' ');
    element.appendChild(n);
    element.removeChild(n);
  } catch (e) {
  }
  // other way: element.className = element.className;
};

/*--------------------------------------------------------------------------*/

var Effect = {
  _elementDoesNotExistError: {
    name: 'ElementDoesNotExistError',
    message: 'The specified DOM element does not exist, but is required for this effect to operate'
  },
  Transitions: {
    linear: Prototype.K,
    sinoidal: function(pos) {
      return (-Math.cos(pos * Math.PI) / 2) + 0.5;
    },
    reverse: function(pos) {
      return 1 - pos;
    },
    flicker: function(pos) {
      pos = ((-Math.cos(pos * Math.PI) / 4) + 0.75) + Math.random() / 4;
      return pos > 1 ? 1 : pos;
    },
    wobble: function(pos) {
      return (-Math.cos(pos * Math.PI * (9 * pos)) / 2) + 0.5;
    },
    pulse: function(pos, pulses) {
      return (-Math.cos((pos * ((pulses || 5) - 0.5) * 2) * Math.PI) / 2) + 0.5;
    },
    spring: function(pos) {
      return 1 - (Math.cos(pos * 4.5 * Math.PI) * Math.exp(-pos * 6));
    },
    none: function(pos) {
      return 0;
    },
    full: function(pos) {
      return 1;
    }
  },
  DefaultOptions: {
    duration: 1.0, // seconds
    fps: 100, // 100= assume 66fps max.
    sync: false, // true for combining
    from: 0.0,
    to: 1.0,
    delay: 0.0,
    queue: 'parallel'
  },
  hasLayout: Prototype.Browser.IE ? Prototype.K : function(element) {
    if (!element.currentStyle || !element.currentStyle.hasLayout) {
      element.style.zoom = 1;
      //element.setStyle({zoom: 1});
    }
    return element;
  },
  tagifyText: function(element) {
    var tagifyStyle = 'position:relative';
    if (Prototype.Browser.IE) {
      tagifyStyle += ';zoom:1';
    }

    element = $(element);
    $A(element.childNodes).each(function(child) {
      if (child.nodeType == 3) {
        child.nodeValue.toArray().each(function(character) {
          element.insertBefore(new Element('span', {
            style: tagifyStyle
          }).update(character == ' ' ? String.fromCharCode(160) : character), child);
        });
        Element.remove(child);
      }
    });
  },
  multiple: function(element, effect, options) {
    var elements;
    if (((typeof element == 'object') || Object.isFunction(element)) && (element.length)) {
      elements = element;
    } else {
      elements = $(element).childNodes;
    }

    options = Object.extend({
      speed: 0.1,
      delay: 0.0
    }, options || {});
    var masterDelay = options.delay;

    $A(elements).each(function(element, index) {
      new effect(element, Object.extend(options, {
        delay: index * options.speed + masterDelay
      }));
    });
  },
  PAIRS: {
    'slide': ['SlideDown', 'SlideUp'],
    'blind': ['BlindDown', 'BlindUp'],
    'appear': ['Appear', 'Fade']
  },
  toggle: function(element, effect, options) {
    element = $(element);
    effect = (effect || 'appear').toLowerCase();

    return Effect[Effect.PAIRS[effect][element.visible() ? 1 : 0]](element, Object.extend({
      queue: {
        position: 'end',
        scope: (element.id || 'global'),
        limit: 1
      }
    }, options || {}));
  }
};

Effect.DefaultOptions.transition = Effect.Transitions.sinoidal;

/* ------------- core effects ------------- */

Effect.ScopedQueue = Class.create(Enumerable, {
  initialize: function() {
    this.effects = [];
    this.interval = null;
  },
  _each: function(iterator) {
    this.effects._each(iterator);
  },
  add: function(effect) {
    var timestamp = new Date().getTime();

    var position = Object.isString(effect.options.queue) ? effect.options.queue : effect.options.queue.position;

    switch (position) {
    case 'front':
      // move unstarted effects after this effect
      this.effects.findAll(function(e) {
        return e.state == 'idle';
      }).each(function(e) {
        e.startOn += effect.finishOn;
        e.finishOn += effect.finishOn;
      });
      break;
    case 'with-last':
      timestamp = this.effects.pluck('startOn').max() || timestamp;
      break;
    case 'end':
      // start effect after last queued effect has finished
      timestamp = this.effects.pluck('finishOn').max() || timestamp;
      break;
    }

    effect.startOn += timestamp;
    effect.finishOn += timestamp;

    if (!effect.options.queue.limit || (this.effects.length < effect.options.queue.limit)) {
      this.effects.push(effect);
    }

    if (!this.interval) {
      this.interval = setInterval(this.loop.bind(this), 15);
    }
  },
  remove: function(effect) {
    this.effects = this.effects.reject(function(e) {
      return e == effect;
    });
    if (this.effects.length === 0) {
      clearInterval(this.interval);
      this.interval = null;
    }
  },
  loop: function() {
    var timePos = new Date().getTime();
    for (var i = 0, len = this.effects.length; i < len; i++) {
      this.effects[i] && this.effects[i].loop(timePos);
    }
  }
});

Effect.Queues = {
  instances: $H(),
  get: function(queueName) {
    if (!Object.isString(queueName)) {
      return queueName;
    }

    return this.instances.get(queueName) ||
    this.instances.set(queueName, new Effect.ScopedQueue());
  }
};
Effect.Queue = Effect.Queues.get('global');

Effect.Base = Class.create({
  position: null,
  start: function(options) {
    if (options && options.transition === false) {
      options.transition = Effect.Transitions.linear;
    }
    this.options = Object.extend(Object.extend({}, Effect.DefaultOptions), options || {});
    this.currentFrame = 0;
    this.state = 'idle';
    this.startOn = this.options.delay * 1000;
    this.finishOn = this.startOn + (this.options.duration * 1000);
    this.fromToDelta = this.options.to - this.options.from;
    this.totalTime = this.finishOn - this.startOn;
    this.totalFrames = this.options.fps * this.options.duration;

    this.event('beforeStart');
    if (!this.options.sync) {
      Effect.Queues.get(Object.isString(this.options.queue) ? 'global' : this.options.queue.scope).add(this);
    }
  },
  render: function(pos) {
    if (this.state === "idle") {
      this.state = "running";
      this.event('beforeSetup');
      if (this.setup) {
        this.setup();
      }
      this.event('afterSetup');
    }
    if (this.state === "running") {
      pos = (this.options.transition(pos) * this.fromToDelta) + this.options.from;
      this.position = pos;
      this.event('beforeUpdate');
      if (this.update) {
        this.update(pos);
      }
      this.event('afterUpdate');
    }
  },
  loop: function(timePos) {
    if (timePos >= this.startOn) {
      if (timePos >= this.finishOn) {
        this.render(1.0);
        this.cancel();
        this.event('beforeFinish');
        if (this.finish) {
          this.finish();
        }
        this.event('afterFinish');
        return;
      }
      var pos = (timePos - this.startOn) / this.totalTime, frame = (pos * this.totalFrames).round();
      if (frame > this.currentFrame) {
        this.render(pos);
        this.currentFrame = frame;
      }
    }
  },
  cancel: function() {
    if (!this.options.sync) {
      Effect.Queues.get(Object.isString(this.options.queue) ? 'global' : this.options.queue.scope).remove(this);
    }
    this.state = 'finished';
  },
  event: function(eventName) {
    var o = this.options, internalEventName = eventName + 'Internal';
    if (o[internalEventName]) {
      o[internalEventName](this);
    }
    if (o[eventName]) {
      o[eventName](this);
    }
  },
  inspect: function() {
    var data = $H();
    for (var property in this) {
      if (!Object.isFunction(this[property])) {
        data.set(property, this[property]);
      }
    }
    return '#<Effect:' + data.inspect() + ',options:' + $H(this.options).inspect() + '>';
  }
});

Effect.Parallel = Class.create(Effect.Base, {
  initialize: function(effects, options) {
    this.effects = effects || [];
    this.start(options);
  },
  update: function(position) {
    this.effects.invoke('render', position);
  },
  finish: function(position) {
    this.effects.each(function(effect) {
      effect.render(1.0);
      effect.cancel();
      effect.event('beforeFinish');
      if (effect.finish) {
        effect.finish(position);
      }
      effect.event('afterFinish');
    });
  }
});

Effect.Tween = Class.create(Effect.Base, {
  initialize: function(object, from, to, options, method) {
    object = Object.isString(object) ? $(object) : object;
    if (!method) { // if (arguments.length < 5)
      method = options;
      options = null;
    }
    this.method = Object.isFunction(method) ? method.bind(object) : Object.isFunction(object[method]) ? object[method].bind(object) : function(value) {
      object[method] = value;
    };
    this.start(Object.extend({
      from: from,
      to: to
    }, options || {}));
  },
  update: function(position) {
    this.method(position);
  }
});

Effect.Event = Class.create(Effect.Base, {
  initialize: function(options) {
    this.start(Object.extend({
      duration: 0
    }, options || {}));
  },
  update: Prototype.emptyFunction
});

Effect.Opacity = Class.create(Effect.Base, {
  initialize: function(element, options) {
    element = $(element);
    if (!element) {
      throw (Effect._elementDoesNotExistError);
    }
    // make this work on IE on elements without 'layout'
    this.element = Effect.hasLayout(element);
    options = Object.extend({
      from: element.getOpacity() || 0.0,
      to: 1.0
    }, options || {});
    this.start(options);
  },
  update: function(position) {
    Element.setOpacity(this.element, position);
  }
});

Effect.Move = Class.create(Effect.Base, {
  initialize: function(element, options) {
    this.element = $(element);
    if (!this.element) {
      throw (Effect._elementDoesNotExistError);
    }
    options = Object.extend({
      x: 0,
      y: 0,
      mode: 'relative'
    }, options || {});
    this.start(options);
  },
  setup: function() {
    this.element.makePositioned();
    this.originalLeft = parseFloat(this.element.getStyle('left') || '0');
    this.originalTop = parseFloat(this.element.getStyle('top') || '0');
    if (this.options.mode == 'absolute') {
      this.options.x = this.options.x - this.originalLeft;
      this.options.y = this.options.y - this.originalTop;
    }
  },
  update: function(position) {
    this.element.setStyle({
      left: (this.options.x * position + this.originalLeft).round() + 'px',
      top: (this.options.y * position + this.originalTop).round() + 'px'
    });
  }
});

// for backwards compatibility
Effect.MoveBy = function(element, toTop, toLeft, options) {
  return new Effect.Move(element, Object.extend({
    x: toLeft,
    y: toTop
  }, options || {}));
};

Effect.Scale = Class.create(Effect.Base, {
  initialize: function(element, percent, options) {
    this.element = $(element);
    if (!this.element) {
      throw (Effect._elementDoesNotExistError);
    }
    options = Object.extend({
      scaleX: true,
      scaleY: true,
      scaleContent: true,
      scaleFromCenter: false,
      scaleMode: 'box', // 'box' or 'contents' or { } with provided values
      scaleFrom: 100.0,
      scaleTo: percent
    }, options || {});
    this.start(options);
  },
  setup: function() {
    this.restoreAfterFinish = this.options.restoreAfterFinish || false;
    this.elementPositioning = this.element.getStyle('position');

    this.originalStyle = {};
    ['top', 'left', 'width', 'height', 'fontSize'].each(function(k) {
      this.originalStyle[k] = this.element.style[k];
    }, this);

    this.originalTop = this.element.offsetTop;
    this.originalLeft = this.element.offsetLeft;

    var fontSize = this.element.getStyle('font-size') || '100%';
    ['em', 'px', '%', 'pt'].each(function(fontSizeType) {
      if (fontSize.indexOf(fontSizeType) > 0) {
        this.fontSize = parseFloat(fontSize);
        this.fontSizeType = fontSizeType;
      }
    }, this);

    this.factor = (this.options.scaleTo - this.options.scaleFrom) / 100;

    this.dims = null;
    if (this.options.scaleMode == 'box') {
      this.dims = [this.element.offsetHeight, this.element.offsetWidth];
    }
    if (/^content/.test(this.options.scaleMode)) {
      this.dims = [this.element.scrollHeight, this.element.scrollWidth];
    }
    if (!this.dims) {
      this.dims = [this.options.scaleMode.originalHeight, this.options.scaleMode.originalWidth];
    }
  },
  update: function(position) {
    var currentScale = (this.options.scaleFrom / 100.0) + (this.factor * position);
    if (this.options.scaleContent && this.fontSize) {
      this.element.setStyle({
        fontSize: this.fontSize * currentScale + this.fontSizeType
      });
    }
    this.setDimensions(this.dims[0] * currentScale, this.dims[1] * currentScale);
  },
  finish: function(position) {
    if (this.restoreAfterFinish) {
      this.element.setStyle(this.originalStyle);
    }
  },
  setDimensions: function(height, width) {
    var d = {};
    if (this.options.scaleX) {
      d.width = width.round() + 'px';
    }
    if (this.options.scaleY) {
      d.height = height.round() + 'px';
    }
    if (this.options.scaleFromCenter) {
      var topd = (height - this.dims[0]) / 2;
      var leftd = (width - this.dims[1]) / 2;
      if (this.elementPositioning == 'absolute') {
        if (this.options.scaleY) {
          d.top = this.originalTop - topd + 'px';
        }
        if (this.options.scaleX) {
          d.left = this.originalLeft - leftd + 'px';
        }
      } else {
        if (this.options.scaleY) {
          d.top = -topd + 'px';
        }
        if (this.options.scaleX) {
          d.left = -leftd + 'px';
        }
      }
    }
    this.element.setStyle(d);
  }
});

Effect.Highlight = Class.create(Effect.Base, {
  initialize: function(element, options) {
    this.element = $(element);
    if (!this.element) {
      throw (Effect._elementDoesNotExistError);
    }
    options = Object.extend({
      startcolor: '#ffff99'
    }, options || {});
    this.start(options);
  },
  setup: function() {
    // Prevent executing on elements not in the layout flow
    if (this.element.getStyle('display') == 'none') {
      this.cancel();
      return;
    }
    // Disable background image during the effect
    this.oldStyle = {};
    if (!this.options.keepBackgroundImage) {
      this.oldStyle.backgroundImage = this.element.getStyle('background-image');
      this.element.setStyle({
        backgroundImage: 'none'
      });
    }
    if (!this.options.endcolor) {
      this.options.endcolor = this.element.getStyle('background-color').parseColor('#ffffff');
    }
    if (!this.options.restorecolor) {
      this.options.restorecolor = this.element.getStyle('background-color');
    }
    // init color calculations
    this._base = $R(0, 2).map(function(i) {
      return parseInt(this.options.startcolor.slice(i * 2 + 1, i * 2 + 3), 16);
    }, this);
    this._delta = $R(0, 2).map(function(i) {
      return parseInt(this.options.endcolor.slice(i * 2 + 1, i * 2 + 3), 16) - this._base[i];
    }, this);
  },
  update: function(position) {
    this.element.setStyle({
      backgroundColor: $R(0, 2).inject('#', function(m, v, i) {
        return m + ((this._base[i] + (this._delta[i] * position)).round().toColorPart());
      }, this)
    });
  },
  finish: function() {
    this.element.setStyle(Object.extend(this.oldStyle, {
      backgroundColor: this.options.restorecolor
    }));
  }
});

Effect.ScrollTo = function(element, options) {
  options = options || {};
  var scrollOffsets = document.viewport.getScrollOffsets(), elementOffsets = $(element).cumulativeOffset();

  if (options.offset) {
    elementOffsets[1] += options.offset;
  }

  return new Effect.Tween(null, scrollOffsets.top, elementOffsets[1], options, function(p) {
    scrollTo(scrollOffsets.left, p.round());
  });
};

/* ------------- combination effects ------------- */

Effect.Fade = function(element, options) {
  element = $(element);
  var oldOpacity = element.getInlineOpacity();
  options = Object.extend({
    from: element.getOpacity() || 1.0,
    to: 0.0,
    afterFinishInternal: function(effect) {
      if (effect.options.to != 0) {
        return;
      }
      effect.element.hide().setStyle({
        opacity: oldOpacity
      });
    }
  }, options || {});
  return new Effect.Opacity(element, options);
};

Effect.Appear = function(element, options) {
  element = $(element);
  options = Object.extend({
    from: (element.getStyle('display') == 'none' ? 0.0 : element.getOpacity() || 0.0),
    to: 1.0,
    // force Safari to render floated elements properly
    afterFinishInternal: function(effect) {
      effect.element.forceRerendering();
    },
    beforeSetup: function(effect) {
      effect.element.setOpacity(effect.options.from).show();
    }
  }, options || {});
  return new Effect.Opacity(element, options);
};

Effect.Puff = function(element, options) {
  element = $(element);
  var oldStyle = {
    opacity: element.getInlineOpacity(),
    position: element.getStyle('position'),
    top: element.style.top,
    left: element.style.left,
    width: element.style.width,
    height: element.style.height
  };
  return new Effect.Parallel([new Effect.Scale(element, 200, {
    sync: true,
    scaleFromCenter: true,
    scaleContent: true,
    restoreAfterFinish: true
  }), new Effect.Opacity(element, {
    sync: true,
    to: 0.0
  })], Object.extend({
    duration: 1.0,
    beforeSetupInternal: function(effect) {
      Element.absolutize(effect.effects[0].element);
    },
    afterFinishInternal: function(effect) {
      effect.effects[0].element.hide().setStyle(oldStyle);
    }
  }, options || {}));
};

Effect.BlindUp = function(element, options) {
  element = $(element);
  element.makeClipping();
  return new Effect.Scale(element, 0, Object.extend({
    scaleContent: false,
    scaleX: false,
    restoreAfterFinish: true,
    afterFinishInternal: function(effect) {
      effect.element.hide().undoClipping();
    }
  }, options || {}));
};

Effect.BlindDown = function(element, options) {
  element = $(element);
  var elementDimensions = element.getDimensions();
  return new Effect.Scale(element, 100, Object.extend({
    scaleContent: false,
    scaleX: false,
    scaleFrom: 0,
    scaleMode: {
      originalHeight: elementDimensions.height,
      originalWidth: elementDimensions.width
    },
    restoreAfterFinish: true,
    afterSetup: function(effect) {
      effect.element.makeClipping().setStyle({
        height: '0px'
      }).show();
    },
    afterFinishInternal: function(effect) {
      effect.element.undoClipping();
    }
  }, options || {}));
};

Effect.SwitchOff = function(element, options) {
  element = $(element);
  var oldOpacity = element.getInlineOpacity();
  return new Effect.Appear(element, Object.extend({
    duration: 0.4,
    from: 0,
    transition: Effect.Transitions.flicker,
    afterFinishInternal: function(effect) {
      new Effect.Scale(effect.element, 1, {
        duration: 0.3,
        scaleFromCenter: true,
        scaleX: false,
        scaleContent: false,
        restoreAfterFinish: true,
        beforeSetup: function(effect) {
          effect.element.makePositioned().makeClipping();
        },
        afterFinishInternal: function(effect) {
          effect.element.hide().undoClipping().undoPositioned().setStyle({
            opacity: oldOpacity
          });
        }
      });
    }
  }, options || {}));
};

Effect.DropOut = function(element, options) {
  element = $(element);
  var oldStyle = {
    top: element.getStyle('top'),
    left: element.getStyle('left'),
    opacity: element.getInlineOpacity()
  };
  return new Effect.Parallel([new Effect.Move(element, {
    x: 0,
    y: 100,
    sync: true
  }), new Effect.Opacity(element, {
    sync: true,
    to: 0.0
  })], Object.extend({
    duration: 0.5,
    beforeSetup: function(effect) {
      effect.effects[0].element.makePositioned();
    },
    afterFinishInternal: function(effect) {
      effect.effects[0].element.hide().undoPositioned().setStyle(oldStyle);
    }
  }, options || {}));
};

Effect.Shake = function(element, options) {
  element = $(element);
  options = Object.extend({
    distance: 20,
    duration: 0.5
  }, options || {});
  var distance = parseFloat(options.distance);
  var split = parseFloat(options.duration) / 10.0;
  var oldStyle = {
    top: element.getStyle('top'),
    left: element.getStyle('left')
  };
  return new Effect.Move(element, {
    x: distance,
    y: 0,
    duration: split,
    afterFinishInternal: function(effect) {
      new Effect.Move(effect.element, {
        x: -distance * 2,
        y: 0,
        duration: split * 2,
        afterFinishInternal: function(effect) {
          new Effect.Move(effect.element, {
            x: distance * 2,
            y: 0,
            duration: split * 2,
            afterFinishInternal: function(effect) {
              new Effect.Move(effect.element, {
                x: -distance * 2,
                y: 0,
                duration: split * 2,
                afterFinishInternal: function(effect) {
                  new Effect.Move(effect.element, {
                    x: distance * 2,
                    y: 0,
                    duration: split * 2,
                    afterFinishInternal: function(effect) {
                      new Effect.Move(effect.element, {
                        x: -distance,
                        y: 0,
                        duration: split,
                        afterFinishInternal: function(effect) {
                          effect.element.undoPositioned().setStyle(oldStyle);
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  });
};

Effect.SlideDown = function(element, options) {
  element = $(element).cleanWhitespace();
  // SlideDown need to have the content of the element wrapped in a container element with fixed height!
  var oldInnerBottom = element.down().getStyle('bottom');
  if (oldInnerBottom == "NaNpx") { // Opera 10.X
    oldInnerBottom = "";
  }
  var elementDimensions = element.getDimensions();
  return new Effect.Scale(element, 100, Object.extend({
    scaleContent: false,
    scaleX: false,
    scaleFrom: window.opera ? 0 : 1,
    scaleMode: {
      originalHeight: elementDimensions.height,
      originalWidth: elementDimensions.width
    },
    restoreAfterFinish: true,
    afterSetup: function(effect) {
      var element = effect.element;
      element.makePositioned().down().makePositioned();
      if (window.opera) {
        element.setStyle({
          top: ''
        });
      }
      element.makeClipping().setStyle({
        height: '0px'
      }).show();
    },
    afterUpdateInternal: function(effect) {
      effect.element.down().setStyle({
        bottom: (effect.dims[0] - effect.element.clientHeight) + 'px'
      });
    },
    afterFinishInternal: function(effect) {
      effect.element.undoClipping().undoPositioned();
      effect.element.down().undoPositioned().setStyle({
        bottom: oldInnerBottom
      });
    }
  }, options || {}));
};

Effect.SlideUp = function(element, options) {
  element = $(element).cleanWhitespace();
  var oldInnerBottom = element.down().getStyle('bottom');
  if (oldInnerBottom == "NaNpx") { // Opera 10.X
    oldInnerBottom = "";
  }
  var elementDimensions = element.getDimensions();
  return new Effect.Scale(element, window.opera ? 0 : 1, Object.extend({
    scaleContent: false,
    scaleX: false,
    scaleFrom: 100,
    //scaleMode: 'box',
    scaleMode: {
      originalHeight: elementDimensions.height,
      originalWidth: elementDimensions.width
    },
    restoreAfterFinish: true,
    afterSetup: function(effect) {
      var element = effect.element;
      element.makePositioned().down().makePositioned();
      if (window.opera) {
        element.setStyle({
          top: ''
        });
      }
      element.makeClipping().show();
    },
    afterUpdateInternal: function(effect) {
      effect.element.down().setStyle({
        bottom: (effect.dims[0] - effect.element.clientHeight) + 'px'
      });
    },
    afterFinishInternal: function(effect) {
      effect.element.hide().undoClipping().undoPositioned();
      effect.element.down().undoPositioned().setStyle({
        bottom: oldInnerBottom
      });
    }
  }, options || {}));
};

// Bug in opera makes the TD containing this element expand for a instance after finish
Effect.Squish = function(element) {
  return new Effect.Scale(element, window.opera ? 1 : 0, {
    restoreAfterFinish: true,
    beforeSetup: function(effect) {
      effect.element.makeClipping();
    },
    afterFinishInternal: function(effect) {
      effect.element.hide().undoClipping();
    }
  });
};

Effect.Grow = function(element, options) {
  element = $(element);
  options = Object.extend({
    direction: 'center',
    moveTransition: Effect.Transitions.sinoidal,
    scaleTransition: Effect.Transitions.sinoidal,
    opacityTransition: Effect.Transitions.full
  }, options || {});
  var oldStyle = {
    top: element.style.top,
    left: element.style.left,
    height: element.style.height,
    width: element.style.width,
    opacity: element.getInlineOpacity()
  };

  var dims = element.getDimensions();
  var initialMoveX, initialMoveY, moveX, moveY;

  switch (options.direction) {
  case 'top-left':
    initialMoveX = initialMoveY = moveX = moveY = 0;
    break;
  case 'top-right':
    initialMoveX = dims.width;
    initialMoveY = moveY = 0;
    moveX = -dims.width;
    break;
  case 'bottom-left':
    initialMoveX = moveX = 0;
    initialMoveY = dims.height;
    moveY = -dims.height;
    break;
  case 'bottom-right':
    initialMoveX = dims.width;
    initialMoveY = dims.height;
    moveX = -dims.width;
    moveY = -dims.height;
    break;
  case 'center':
    initialMoveX = dims.width / 2;
    initialMoveY = dims.height / 2;
    moveX = -dims.width / 2;
    moveY = -dims.height / 2;
    break;
  }

  return new Effect.Move(element, {
    x: initialMoveX,
    y: initialMoveY,
    duration: 0.01,
    beforeSetup: function(effect) {
      effect.element.hide().makeClipping().makePositioned();
    },
    afterFinishInternal: function(effect) {
      new Effect.Parallel([new Effect.Opacity(effect.element, {
        sync: true,
        to: 1.0,
        from: 0.0,
        transition: options.opacityTransition
      }), new Effect.Move(effect.element, {
        x: moveX,
        y: moveY,
        sync: true,
        transition: options.moveTransition
      }), new Effect.Scale(effect.element, 100, {
        scaleMode: {
          originalHeight: dims.height,
          originalWidth: dims.width
        },
        sync: true,
        scaleFrom: window.opera ? 1 : 0,
        transition: options.scaleTransition,
        restoreAfterFinish: true
      })], Object.extend({
        beforeSetup: function(effect) {
          effect.effects[0].element.setStyle({
            height: '0px'
          }).show();
        },
        afterFinishInternal: function(effect) {
          effect.effects[0].element.undoClipping().undoPositioned().setStyle(oldStyle);
        }
      }, options));
    }
  });
};

Effect.Shrink = function(element, options) {
  element = $(element);
  options = Object.extend({
    direction: 'center',
    moveTransition: Effect.Transitions.sinoidal,
    scaleTransition: Effect.Transitions.sinoidal,
    opacityTransition: Effect.Transitions.none
  }, options || {});
  var oldStyle = {
    top: element.style.top,
    left: element.style.left,
    height: element.style.height,
    width: element.style.width,
    opacity: element.getInlineOpacity()
  };

  var dims = element.getDimensions();
  var moveX, moveY;

  switch (options.direction) {
  case 'top-left':
    moveX = moveY = 0;
    break;
  case 'top-right':
    moveX = dims.width;
    moveY = 0;
    break;
  case 'bottom-left':
    moveX = 0;
    moveY = dims.height;
    break;
  case 'bottom-right':
    moveX = dims.width;
    moveY = dims.height;
    break;
  case 'center':
    moveX = dims.width / 2;
    moveY = dims.height / 2;
    break;
  }

  return new Effect.Parallel([new Effect.Opacity(element, {
    sync: true,
    to: 0.0,
    from: 1.0,
    transition: options.opacityTransition
  }), new Effect.Scale(element, window.opera ? 1 : 0, {
    sync: true,
    transition: options.scaleTransition,
    restoreAfterFinish: true
  }), new Effect.Move(element, {
    x: moveX,
    y: moveY,
    sync: true,
    transition: options.moveTransition
  })], Object.extend({
    beforeStartInternal: function(effect) {
      effect.effects[0].element.makePositioned().makeClipping();
    },
    afterFinishInternal: function(effect) {
      effect.effects[0].element.hide().undoClipping().undoPositioned().setStyle(oldStyle);
    }
  }, options));
};

Effect.Pulsate = function(element, options) {
  element = $(element);
  options = options || {};
  var oldOpacity = element.getInlineOpacity(), transition = options.transition || Effect.Transitions.linear, reverser = function(pos) {
    return 1 - transition((-Math.cos((pos * (options.pulses || 5) * 2) * Math.PI) / 2) + 0.5);
  };

  return new Effect.Opacity(element, Object.extend(Object.extend({
    duration: 2.0,
    from: 0,
    afterFinishInternal: function(effect) {
      effect.element.setStyle({
        opacity: oldOpacity
      });
    }
  }, options), {
    transition: reverser
  }));
};

Effect.Fold = function(element, options) {
  element = $(element);
  var oldStyle = {
    top: element.style.top,
    left: element.style.left,
    width: element.style.width,
    height: element.style.height
  };
  element.makeClipping();
  return new Effect.Scale(element, 5, Object.extend({
    scaleContent: false,
    scaleX: false,
    afterFinishInternal: function(effect) {
      new Effect.Scale(element, 1, {
        scaleContent: false,
        scaleY: false,
        afterFinishInternal: function(effect) {
          effect.element.hide().undoClipping().setStyle(oldStyle);
        }
      });
    }
  }, options || {}));
};

Effect.Morph = Class.create(Effect.Base, {
  initialize: function(element, options) {
    this.element = $(element);
    if (!this.element) {
      throw (Effect._elementDoesNotExistError);
    }
    options = Object.extend({
      style: {}
    }, options || {});

    if (!Object.isString(options.style)) {
      this.style = $H(options.style);
    } else if (options.style.include(':')) {
      this.style = options.style.parseStyle();
    } else {
      this.element.addClassName(options.style);
      this.style = $H(this.element.getStyles());
      this.element.removeClassName(options.style);
      var css = this.element.getStyles();
      this.style = this.style.reject(function(style) {
        return style.value == css[style.key];
      });
      options.afterFinishInternal = function(effect) {
        effect.element.addClassName(effect.options.style);
        effect.transforms.each(function(transform) {
          effect.element.style[transform.style] = '';
        });
      };
    }
    this.start(options);
  },

  setup: function() {
    function parseColor(color) {
      if (!color || ['rgba(0, 0, 0, 0)', 'transparent'].include(color)) {
        color = '#ffffff';
      }
      color = color.parseColor();
      return [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
      //return $R(0, 2).map(function(i) {return parseInt(color.slice(i * 2 + 1, i * 2 + 3), 16);});
    }
    this.transforms = this.style.map(function(pair) {
      var property = pair[0], value = pair[1], unit = null;

      if (value.parseColor('#zzzzzz') != '#zzzzzz') {
        value = value.parseColor();
        unit = 'color';
      } else if (property == 'opacity') {
        value = parseFloat(value);
        Effect.hasLayout(this.element);
      } else if (Element.CSS_LENGTH.test(value)) {
        var components = value.match(/^([\+\-]?[0-9\.]+)(.*)$/);
        value = parseFloat(components[1]);
        unit = (components.length == 3) ? components[2] : null;
      }

      var originalValue = this.element.getStyle(property);
      return {
        style: property.camelize(),
        originalValue: unit == 'color' ? parseColor(originalValue) : parseFloat(originalValue || 0),
        targetValue: unit == 'color' ? parseColor(value) : value,
        unit: unit
      };
    }, this).reject(function(transform) {
      return ((transform.originalValue == transform.targetValue) ||
      (transform.unit != 'color' &&
      (isNaN(transform.originalValue) || isNaN(transform.targetValue))));
    });
  },
  update: function(position) {
    var style = {}, transform, original, target, i = this.transforms.length;
    while (i--) {
      transform = this.transforms[i];
      original = transform.originalValue;
      target = transform.targetValue;
      style[transform.style] = transform.unit == 'color' ? '#' +
      (Math.round(original[0] + (target[0] - original[0]) * position)).toColorPart() +
      (Math.round(original[1] + (target[1] - original[1]) * position)).toColorPart() +
      (Math.round(original[2] + (target[2] - original[2]) * position)).toColorPart() : (original +
      (target - original) * position).toFixed(3) +
      (transform.unit === null ? '' : transform.unit);
    }
    this.element.setStyle(style, true);
  }
});

Effect.Transform = Class.create({
  initialize: function(tracks, options) {
    this.tracks = [];
    this.options = options || {};
    this.addTracks(tracks);
  },
  addTracks: function(tracks) {
    tracks.each(function(track) {
      track = $H(track);
      var data = track.values().first();
      this.tracks.push($H({
        ids: track.keys().first(),
        effect: Effect.Morph,
        options: {
          style: data
        }
      }));
    }, this);
    return this;
  },
  play: function() {
    return new Effect.Parallel(this.tracks.map(function(track) {
      var ids = track.get('ids'), effect = track.get('effect'), options = track.get('options');
      var elements = [$(ids) || $$(ids)].flatten();
      return elements.map(function(e) {
        return new effect(e, Object.extend({
          sync: true
        }, options));
      });
    }).flatten(), this.options);
  }
});

Element.CSS_PROPERTIES = $w('backgroundColor backgroundPosition borderBottomColor borderBottomStyle ' +
'borderBottomWidth borderLeftColor borderLeftStyle borderLeftWidth ' +
'borderRightColor borderRightStyle borderRightWidth borderSpacing ' +
'borderTopColor borderTopStyle borderTopWidth bottom clip color ' +
'fontSize fontWeight height left letterSpacing lineHeight ' +
'marginBottom marginLeft marginRight marginTop markerOffset maxHeight ' +
'maxWidth minHeight minWidth opacity outlineColor outlineOffset ' +
'outlineWidth paddingBottom paddingLeft paddingRight paddingTop ' +
'right textIndent top width wordSpacing zIndex');

Element.CSS_LENGTH = /^(([\+\-]?[0-9\.]+)(em|ex|px|in|cm|mm|pt|pc|\%))|0$/;

String.__parseStyleElement = document.createElement('div');
if (Prototype.Browser.WebKit) {
  String.prototype.parseStyle = function() {
    var style, styleRules = $H();
    style = new Element('div', {
      style: this
    }).style;

    Element.CSS_PROPERTIES.each(function(property) {
      if (style[property]) {
        styleRules.set(property, style[property]);
      }
    });

    return styleRules;
  };
} else if (Prototype.Browser.IE) {
  String.prototype.parseStyle = function() {
    var style, styleRules = $H();
    String.__parseStyleElement.innerHTML = '<div style="' + this + '"></div>';
    style = String.__parseStyleElement.childNodes[0].style;

    Element.CSS_PROPERTIES.each(function(property) {
      if (style[property]) {
        styleRules.set(property, style[property]);
      }
    });

    if (this.include('opacity')) {
      styleRules.set('opacity', this.match(/opacity:\s*((?:0|1)?(?:\.\d*)?)/)[1]);
    }

    return styleRules;
  };
} else {
  String.prototype.parseStyle = function() {
    var style, styleRules = $H();
    String.__parseStyleElement.innerHTML = '<div style="' + this + '"></div>';
    style = String.__parseStyleElement.childNodes[0].style;

    Element.CSS_PROPERTIES.each(function(property) {
      if (style[property]) {
        styleRules.set(property, style[property]);
      }
    });

    return styleRules;
  };
}

if (document.defaultView && document.defaultView.getComputedStyle) {
  Element.getStyles = function(element) {
    var css = document.defaultView.getComputedStyle($(element), null);
    return Element.CSS_PROPERTIES.inject({}, function(styles, property) {
      styles[property] = css[property];
      return styles;
    });
  };
} else {
  Element.getStyles = function(element) {
    element = $(element);
    var css = element.currentStyle, styles = Element.CSS_PROPERTIES.inject({}, function(results, property) {
      results[property] = css[property];
      return results;
    });
    if (!styles.opacity) {
      styles.opacity = element.getOpacity();
    }
    return styles;
  };
}

Effect.Methods = {
  morph: function(element, style, options) {
    element = $(element);
    new Effect.Morph(element, Object.extend({
      style: style
    }, options || {}));
    return element;
  },
  visualEffect: function(element, effect, options) {
    element = $(element);
    var s = effect.dasherize().camelize(), klass = s.charAt(0).toUpperCase() + s.substring(1);
    new Effect[klass](element, options);
    return element;
  },
  highlight: function(element, options) {
    element = $(element);
    new Effect.Highlight(element, options);
    return element;
  }
};

$w('fade appear grow shrink fold blindUp blindDown slideUp slideDown ' +
'pulsate shake puff squish switchOff dropOut').each(function(effect) {
  Effect.Methods[effect] = function(element, options) {
    element = $(element);
    Effect[effect.charAt(0).toUpperCase() + effect.substring(1)](element, options);
    return element;
  };
});

$w('getInlineOpacity forceRerendering setContentZoom collectTextNodes collectTextNodesIgnoreClass getStyles').each(function(f) {
  Effect.Methods[f] = Element[f];
});

Element.addMethods(Effect.Methods);
/*jshint evil:true */
// script.aculo.us controls.js v1.9.0 with fixes, Thu Dec 23 16:54:48 -0500 2010

// Copyright (c) 2005-2010 Thomas Fuchs (http://script.aculo.us, http://mir.aculo.us)
//           (c) 2005-2010 Ivan Krstic (http://blogs.law.harvard.edu/ivan)
//           (c) 2005-2010 Jon Tirsen (http://www.tirsen.com)
// Contributors:
//  Richard Livsey
//  Rahul Bhargava
//  Rob Wills
//
// script.aculo.us is freely distributable under the terms of an MIT-style license.
// For details, see the script.aculo.us web site: http://script.aculo.us/

// Autocompleter.Base handles all the autocompletion functionality
// that's independent of the data source for autocompletion. This
// includes drawing the autocompletion menu, observing keyboard
// and mouse events, and similar.
//
// Specific autocompleters need to provide, at the very least,
// a getUpdatedChoices function that will be invoked every time
// the text inside the monitored textbox changes. This method
// should get the text for which to provide autocompletion by
// invoking this.getToken(), NOT by directly accessing
// this.element.value. This is to allow incremental tokenized
// autocompletion. Specific auto-completion logic (AJAX, etc)
// belongs in getUpdatedChoices.
//
// Tokenized incremental autocompletion is enabled automatically
// when an autocompleter is instantiated with the 'tokens' option
// in the options parameter, e.g.:
// new Ajax.Autocompleter('id','upd', '/url/', { tokens: ',' });
// will incrementally autocomplete with a comma as the token.
// Additionally, ',' in the above example can be replaced with
// a token array, e.g. { tokens: [',', '\n'] } which
// enables autocompletion on multiple tokens. This is most
// useful when one of the tokens is \n (a newline), as it
// allows smart autocompletion after linebreaks.

if (typeof Effect == 'undefined') {
  throw ("controls.js requires including script.aculo.us' effects.js library");
}

var Autocompleter = {};
Autocompleter.Base = Class.create({
  DEFAULT_OPTIONS: {
    frequency: 0.4,
    minChars: 1,
    duration: 0,
    tokens: ['\n'],
    onShow: function(element, update) { // bound to this.options
      var style = update.style;
      if (!style.position || style.position == 'absolute') {
        style.position = 'absolute';
        try {
          var l = update.getLayout(), w = element.offsetWidth - l.get('border-left') - l.get('border-right') - l.get('padding-left') - l.get('padding-right');
          update.style.width = w + "px";
          update.clonePosition(element, {
            setHeight: false,
            setWidth: false,
            offsetTop: element.offsetHeight
          });
        } catch (ex) {
          // ignore IE errors
        }
      }
      if (this.duration) {
        Effect.Appear(update, {
          duration: this.duration
        });
      } else {
        update.show();
      }
    },
    onHide: function(element, update) { // bound to this.options
      if (this.duration) {
        Effect.Fade(update, {
          duration: this.duration
        });
      } else {
        update.hide();
      }
    }
  },

  baseInitialize: function(element, update, options) {
    element = $(element);
    this.element = element;
    this.update = $(update);
    this.updateHasFocus = false; // FIX
    this.hasFocus = false;
    this.changed = false;
    this.active = false;
    this.index = 0;
    this.entryCount = 0;
    this.oldElementValue = this.selectedValue = this.element.value;

    if (this.setOptions) {
      this.setOptions(options);
    } else {
      this.options = options || {};
    }

    var o = this.options;
    for (var property in this.DEFAULT_OPTIONS) {
      o[property] = o[property] || this.DEFAULT_OPTIONS[property];
    }

    o.paramName = o.paramName || this.element.name;
    o.restricted = !!o.restricted;

    var tokens = o.tokens;
    if (typeof(tokens) == 'string') {
      tokens = [tokens];
    }
    // Force carriage returns as token delimiters anyway
    if (!tokens.include('\n')) {
      tokens.push('\n');
    }
    o.tokens = tokens;

    this.observer = null;

    this.element.setAttribute('autocomplete', 'off');

    Element.hide(this.update);

    var prebind = $w('onFocus onBlur onKeyPress onKeyDown onMouseDown onMouseLeave fixIEOverlapping onObserverEvent hide onHover onClick');
    for (var i = 0, len = prebind.length; i < len; ++i) {
      this[prebind[i]] = this[prebind[i]].bind(this);
    }

    Event.observe(this.element, 'focus', this.onFocus);
    Event.observe(this.element, 'blur', this.onBlur);
    Event.observe(this.element, 'keypress', this.onKeyPress);
    Event.observe(this.element, 'keydown', this.onKeyDown);
    // lazy this.addObserversOnUpdate();
  },

  onMouseDown: function() {
    this.updateHasFocus = true;
  },

  onMouseLeave: function() {
    this.updateHasFocus = false;
  },

  addObserversOnUpdate: function() {
    if (!this.updateObserved) {
      // mouseup was not fired on scrollbar
      // mouseout has false positive when moving from ul to li
      Event.observe(this.update, "mousedown", this.onMouseDown);
      Event.observe(this.update, "mouseleave", this.onMouseLeave);
      // 'mouseover' == 'mouseenter' == this.onMouseDown
      Event.on(this.update, "mouseover", "li", this.onHover);
      Event.on(this.update, "click", "li", this.onClick);
      this.updateObserved = true;
    }
  },

  show: function() {
    this.addObserversOnUpdate();
    if (Element.getStyle(this.update, 'display') === 'none') {
      this.options.onShow(this.element, this.update);
    }
    if (!this.iefix && Prototype.Browser.IE6 && (Element.getStyle(this.update, 'position') === 'absolute')) {
      var id = this.update.id + '_iefix';
      Element.insert(this.update, {
        after: '<iframe id="' + id + '" ' +
        'style="display:none;position:absolute;filter:progid:DXImageTransform.Microsoft.Alpha(opacity=0);" ' +
        'src="javascript:false;" frameborder="0" scrolling="no"><\/iframe>'
      });
      this.iefix = $(id);
    }
    if (this.iefix) {
      setTimeout(this.fixIEOverlapping, 50);
    }
  },

  fixIEOverlapping: function() {
    var s = this.update.style;
    if (!s.zIndex) {
      s.zIndex = 2;
    }
    this.iefix.clonePosition(this.update, {
      setTop: (!s.height)
    }).setStyle({
      zIndex: s.zIndex - 1,
      display: ''
    });
  },

  hide: function() {
    this.stopIndicator();
    var e = this.element, o = this.options;
    if (!this.hasFocus && o.restricted && e.value) {
      e.value = this.selectedValue;
    }
    if (Element.getStyle(this.update, 'display') != 'none') {
      o.onHide(e, this.update);
    }
    if (this.iefix) {
      Element.hide(this.iefix);
    }
    this.updateHasFocus = false;
  },

  startIndicator: function() {
    if (this.options.indicator) {
      Element.show(this.options.indicator);
    }
  },

  stopIndicator: function() {
    if (this.options.indicator) {
      Element.hide(this.options.indicator);
    }
  },

  // KEY_RETURN, KEY_ESC in IE6-9 fires only keypress, keyup
  onKeyPress: function(event) {
    var keyCode = event.keyCode;
    if (this.active && !event.stopped) {
      switch (keyCode) {
      case Event.KEY_RETURN:
        this.selectEntry();
        // fall through
      case Event.KEY_ESC:
        this.hide();
        this.active = false;
        Event.stop(event);
        return;
      }
    }
  },

  // KEY_ESC in WebKit (Chrome, Midori, Safari) fires only keydown, keyup
  onKeyDown: function(event) {
    var keyCode = event.keyCode;
    if (this.active) {
      switch (keyCode) {
      case Event.KEY_RETURN:
        // should be processed in onKeyPress
        return;
      case Event.KEY_TAB:
        this.selectEntry();
        // fall through
      case Event.KEY_ESC:
        this.hide();
        this.active = false;
        Event.stop(event);
        return;
      case Event.KEY_PAGEUP:
      case Event.KEY_PAGEDOWN:
      case Event.KEY_END:
      case Event.KEY_HOME:
        // TODO use for entry navigation
        // KEY_HOME:this.markFirst() KEY_END:this.markLast()
      case Event.KEY_LEFT:
      case Event.KEY_RIGHT:
        return;
      case Event.KEY_UP:
        this.markPrevious();
        this.render();
        Event.stop(event);
        return;
      case Event.KEY_DOWN:
        this.markNext();
        this.render();
        Event.stop(event);
        return;
      }
    } else if (keyCode == Event.KEY_TAB || keyCode == Event.KEY_RETURN ||
        (keyCode >= Event.KEY_PAGEUP && keyCode <= Event.KEY_DOWN) ||
        (Prototype.Browser.WebKit && keyCode === 0)) {
        // KEY_PAGEUP: 33, KEY_PAGEDOWN: 34, KEY_END: 35, KEY_HOME: 36,
        // KEY_LEFT: 37, KEY_UP: 38, KEY_RIGHT: 39, KEY_DOWN: 40
      return;
    }

    this.changed = true;
    this.hasFocus = true;

    if (this.observer) {
      clearTimeout(this.observer);
    }
    this.observer = setTimeout(this.onObserverEvent, this.options.frequency * 1000);
  },

  activate: function() {
    this.changed = false;
    this.hasFocus = true;
    this.getUpdatedChoices();
  },

  onHover: function(event, element) {
    if (this.index != element.autocompleteIndex) {
      this.index = element.autocompleteIndex;
      this.render();
    }
    Event.stop(event);
  },

  onClick: function(event, element) {
    this.index = element.autocompleteIndex;
    this.selectEntry();
    this.hide();
  },

  onFocus: function(event) {
    //console.log("onFocus", this.active, this.hasFocus);
    if (!this.hasFocus) {
      this.oldElementValue = this.selectedValue = this.element.value;
    }
  },

  onBlur: function(event) {
    if (this.updateHasFocus) {
      // focus moved from this.element to scrollbar of this.update
      this.element.focus();
    } else {
      // needed to make click events working
      setTimeout(this.hide, 250);
      this.hasFocus = false;
      this.active = false;
    }
  },

  render: function() {
    if (this.entryCount > 0) {
      for (var i = 0; i < this.entryCount; i++) {
        //Element[(this.index == i) ? "addClassName" : "removeClassName"](this.getEntry(i), "selected");
        Element.toggleClassName(this.getEntry(i), "selected", (this.index == i));
      }
      if (this.hasFocus) {
        this.show();
        this.active = true;
      }
    } else {
      this.active = false;
      this.hide();
    }
  },

  markPrevious: function() {
    if (this.index > 0) {
      this.index--;
    } else {
      this.index = this.entryCount - 1;
    }
    this.getCurrentEntry().scrollIntoView(true);
  },

  markNext: function() {
    if (this.index < this.entryCount - 1) {
      this.index++;
    } else {
      this.index = 0;
    }
    this.getCurrentEntry().scrollIntoView(false);
  },

  getEntry: function(index) {
    var c = this.update.firstChild;
    return c ? c.childNodes[index] : undefined;
  },

  getCurrentEntry: function() {
    return this.getEntry(this.index);
  },

  selectEntry: function() {
    this.active = false;
    this.updateElement(this.getCurrentEntry());
  },

  updateElement: function(selectedElement) {
    var o = this.options;
    if (o.updateElement) {
      o.updateElement(selectedElement);
      return;
    }
    var value = '';
    if (o.select) {
      var nodes = $(selectedElement).select('.' + o.select) || [];
      if (nodes.length > 0) {
        value = Element.collectTextNodes(nodes[0]);
      }
    } else {
      value = Element.collectTextNodesIgnoreClass(selectedElement, 'informal');
    }

    var element = this.element, newValue = value;
    var bounds = this.changed ? this.getTokenBounds() : this.tokenBounds; // FIX
    if (bounds[0] != -1) {
      var v = element.value, before = v.substr(0, bounds[0]), after = v.substr(bounds[1]);
      var whitespace = v.substr(bounds[0]).match(/^\s+/);
      if (whitespace) {
        before += whitespace[0];
      }
      newValue = before + value + after;
    }
    element.value = this.oldElementValue = this.selectedValue = newValue;
    element.focus();

    if (o.afterUpdateElement) {
      o.afterUpdateElement(element, selectedElement);
    }
  },

  updateChoices: function(choices) {
    if (this.changed || !this.hasFocus) {
      return;
    }
    //if (!this.changed && this.hasFocus) {
    this.update.update(choices);
    Element.cleanWhitespace(this.update);

    var list = this.update.firstChild;
    if (list && list.childNodes) {
      Element.cleanWhitespace(list);
      this.entryCount = list.childNodes.length;
      for (var i = 0; i < this.entryCount; i++) {
        var entry = list.childNodes[i];
        entry.autocompleteIndex = i;
      }
    } else {
      this.entryCount = 0;
    }

    this.stopIndicator();
    this.index = 0;

    if (this.entryCount == 1 && this.options.autoSelect) {
      this.selectEntry();
      this.hide();
    } else {
      if (this.entryCount > 0) {
        this.getCurrentEntry().scrollIntoView();
      }
      this.render();
    }
    //}
  },

  onObserverEvent: function() {
    this.changed = false;
    if (this.getToken().length >= this.options.minChars) {
      this.getUpdatedChoices();
    } else {
      this.active = false;
      this.hide();
    }
    this.oldElementValue = this.element.value;
  },

  getToken: function() {
    var bounds = this.getTokenBounds();
    return this.element.value.substring(bounds[0], bounds[1]).strip();
  },

  getTokenBounds: function() {
    var value = this.element.value;
    if (value.strip().empty()) {
      return [-1, 0];
    }
    var diff = arguments.callee.getFirstDifferencePos(value, this.oldElementValue);
    var offset = (diff == this.oldElementValue.length ? 1 : 0);
    var prevTokenPos = -1, nextTokenPos = value.length;
    var tokenPos, tokens = this.options.tokens;
    for (var index = 0, len = tokens.length; index < len; ++index) {
      tokenPos = value.lastIndexOf(tokens[index], diff + offset - 1);
      if (tokenPos > prevTokenPos) {
        prevTokenPos = tokenPos;
      }
      tokenPos = value.indexOf(tokens[index], diff + offset);
      if (-1 != tokenPos && tokenPos < nextTokenPos) {
        nextTokenPos = tokenPos;
      }
    }
    this.tokenBounds = [prevTokenPos + 1, nextTokenPos];
    return this.tokenBounds;
  }
});

Autocompleter.Base.prototype.getTokenBounds.getFirstDifferencePos = function(newS, oldS) {
  var boundary = Math.min(newS.length, oldS.length);
  for (var index = 0; index < boundary; ++index) {
    if (newS[index] != oldS[index]) {
      return index;
    }
  }
  return boundary;
};

Ajax.Autocompleter = Class.create(Autocompleter.Base, {
  initialize: function(element, update, url, options) {
    this.baseInitialize(element, update, options);
    this.options.asynchronous = true;
    this.options.onComplete = this.onComplete.bind(this);
    this.options.defaultParams = this.options.parameters || null;
    this.url = url;
  },

  getUpdatedChoices: function() {
    this.startIndicator();
    var o = this.options, entry = encodeURIComponent(o.paramName) + '=' + encodeURIComponent(this.getToken());
    o.parameters = o.callback ? o.callback(this.element, entry) : entry;
    if (o.defaultParams) {
      o.parameters += '&' + o.defaultParams;
    }
    new Ajax.Request(this.url, o);
  },

  onComplete: function(request) {
    this.updateChoices(request.responseText);
  }
});

// The local array autocompleter. Used when you'd prefer to
// inject an array of autocompletion options into the page, rather
// than sending out Ajax queries, which can be quite slow sometimes.
//
// The constructor takes four parameters. The first two are, as usual,
// the id of the monitored textbox, and id of the autocompletion menu.
// The third is the array you want to autocomplete from, and the fourth
// is the options block.
//
// Extra local autocompletion options:
// - choices - How many autocompletion choices to offer
//
// - partialSearch - If false, the autocompleter will match entered
//                    text only at the beginning of strings in the
//                    autocomplete array. Defaults to true, which will
//                    match text at the beginning of any *word* in the
//                    strings in the autocomplete array. If you want to
//                    search anywhere in the string, additionally set
//                    the option fullSearch to true (default: off).
//
// - fullSearch - Search anywhere in autocomplete array strings.
//
// - partialChars - How many characters to enter before triggering
//                   a partial match (unlike minChars, which defines
//                   how many characters are required to do any match
//                   at all). Defaults to 2.
//
// - ignoreCase - Whether to ignore case when autocompleting.
//                 Defaults to true.
//
// It's possible to pass in a custom function as the 'selector'
// option, if you prefer to write your own autocompletion logic.
// In that case, the other options above will not apply unless
// you support them.

Autocompleter.Local = Class.create(Autocompleter.Base, {
  initialize: function(element, update, array, options) {
    this.baseInitialize(element, update, options);
    this.options.array = array;
  },

  getUpdatedChoices: function() {
    this.updateChoices(this.options.selector(this));
  },

  createEntry: function(elem, pos, len) {
    var pre = elem.substr(0, pos), match = elem.substr(pos, len), post = elem.substr(pos + len);
    return "<li>" + pre + "<strong>" + match + "<\/strong>" + post + "<\/li>";
  },

  selector: function(instance) {
    var ret = []; // Beginning matches
    var partial = []; // Inside matches
    var o = this.options, entry = o.ignoreCase ? this.getToken().toLowerCase() : this.getToken(), entrylen = entry.length;

    for (var i = 0; i < o.array.length && ret.length < o.choices; i++) {
      var elem = o.array[i], elem2 = o.ignoreCase ? elem.toLowerCase() : elem;
      var foundPos = elem2.indexOf(entry), li;

      while (foundPos != -1) {
        if (foundPos === 0) {
          li = this.createEntry(elem, 0, entrylen);
          // li = this.createEntry(elem, 0, elem.length > entrylen ? entrylen : elem.length);
          ret.push(li);
          break;
        } else if (o.partialSearch && entrylen >= o.partialChars && (o.fullSearch || (/\s/.test(elem.substr(foundPos - 1, 1)))) /* && foundPos != -1 */) {
          // partialSearch && fullSearch && found anywhere in string
          // or partialSearch && found at the beginning of word
          li = this.createEntry(elem, foundPos, entrylen);
          partial.push(li);
          break;
        }

        foundPos = elem2.indexOf(entry, foundPos + 1);
      }
    }
    if (partial.length) {
      ret = ret.concat(partial.slice(0, o.choices - ret.length));
    }
    return "<ul>" + ret.join('') + "<\/ul>";
  },

  setOptions: function(options) {
    this.options = Object.extend({
      choices: 10,
      partialSearch: true,
      partialChars: 2,
      ignoreCase: true,
      fullSearch: false,
      selector: this.selector.bind(this)
    }, options || {});
  }
});

// AJAX in-place editor and collection editor
// Full rewrite by Christophe Porteneuve <tdd@tddsworld.com> (April 2007).

// Use this if you notice weird scrolling problems on some browsers,
// the DOM might be a bit confused when this gets called so do this
// waits 1 ms (with setTimeout) until it does the activation
Field.scrollFreeActivate = function(field) {
  setTimeout(function() {
    Field.activate(field);
  }, 1);
};

Ajax.InPlaceEditor = Class.create({
  initialize: function(element, url, options) {
    this.url = url;
    this.element = element = $(element);
    this.prepareOptions();
    this._controls = {};
    Object.extend(this.options, options || {});
    if (!this.options.formId && this.element.id) {
      this.options.formId = this.element.id + '-inplaceeditor';
      if ($(this.options.formId)) {
        this.options.formId = '';
      }
    }
    if (this.options.externalControl) {
      this.options.externalControl = $(this.options.externalControl);
    }
    if (!this.options.externalControl) {
      this.options.externalControlOnly = false;
    }
    this._originalBackground = this.element.getStyle('background-color') || 'transparent';
    this.element.title = this.options.clickToEditText;
    this._boundCancelHandler = this.handleFormCancellation.bind(this);
    this._boundComplete = (this.options.onComplete || Prototype.emptyFunction).bind(this);
    this._boundFailureHandler = this.handleAJAXFailure.bind(this);
    this._boundSubmitHandler = this.handleFormSubmission.bind(this);
    this._boundWrapperHandler = this.wrapUp.bind(this);
    this.registerListeners();
  },
  checkForEscapeOrReturn: function(e) {
    if (!this._editing || e.ctrlKey || e.altKey || e.shiftKey) {
      return;
    }
    if (Event.KEY_ESC == e.keyCode) {
      this.handleFormCancellation(e);
    } else if (Event.KEY_RETURN == e.keyCode) {
      this.handleFormSubmission(e);
    }
  },
  createControl: function(mode, handler, extraClasses) {
    var control = this.options[mode + 'Control'];
    var text = this.options[mode + 'Text'];
    if ('button' == control) {
      var btn = document.createElement('input');
      btn.type = 'submit';
      btn.value = text;
      btn.className = 'editor_' + mode + '_button';
      if ('cancel' == mode) {
        btn.onclick = this._boundCancelHandler;
      }
      this._form.appendChild(btn);
      this._controls[mode] = btn;
    } else if ('link' == control) {
      var link = document.createElement('a');
      link.href = '#';
      link.appendChild(document.createTextNode(text));
      link.onclick = 'cancel' == mode ? this._boundCancelHandler : this._boundSubmitHandler;
      link.className = 'editor_' + mode + '_link';
      if (extraClasses) {
        link.className += ' ' + extraClasses;
      }
      this._form.appendChild(link);
      this._controls[mode] = link;
    }
  },
  createEditField: function() {
    var text = (this.options.loadTextURL ? this.options.loadingText : this.getText());
    var fld;
    if (1 >= this.options.rows && !(/\r|\n/.test(this.getText()))) {
      fld = document.createElement('input');
      fld.type = 'text';
      var size = this.options.size || this.options.cols || 0;
      if (0 < size) {
        fld.size = size;
      }
    } else {
      fld = document.createElement('textarea');
      fld.rows = (1 >= this.options.rows ? this.options.autoRows : this.options.rows);
      fld.cols = this.options.cols || 40;
    }
    fld.name = this.options.paramName;
    fld.value = text; // No HTML breaks conversion anymore
    fld.className = 'editor_field';
    if (this.options.submitOnBlur) {
      fld.onblur = this._boundSubmitHandler;
    }
    this._controls.editor = fld;
    if (this.options.loadTextURL) {
      this.loadExternalText();
    }
    this._form.appendChild(this._controls.editor);
  },
  createForm: function() {
    var ipe = this;
    function addText(mode, condition) {
      var text = ipe.options['text' + mode + 'Controls'];
      if (!text || condition === false) {
        return;
      }
      ipe._form.appendChild(document.createTextNode(text));
    }
    this._form = $(document.createElement('form'));
    this._form.id = this.options.formId;
    this._form.addClassName(this.options.formClassName);
    this._form.onsubmit = this._boundSubmitHandler;
    this.createEditField();
    if ('textarea' == this._controls.editor.tagName.toLowerCase()) {
      this._form.appendChild(document.createElement('br'));
    }
    if (this.options.onFormCustomization) {
      this.options.onFormCustomization(this, this._form);
    }
    addText('Before', this.options.okControl || this.options.cancelControl);
    this.createControl('ok', this._boundSubmitHandler);
    addText('Between', this.options.okControl && this.options.cancelControl);
    this.createControl('cancel', this._boundCancelHandler, 'editor_cancel');
    addText('After', this.options.okControl || this.options.cancelControl);
  },
  destroy: function() {
    if (this._oldInnerHTML) {
      this.element.innerHTML = this._oldInnerHTML;
    }
    this.leaveEditMode();
    this.unregisterListeners();
  },
  enterEditMode: function(e) {
    if (this._saving || this._editing) {
      return;
    }
    this._editing = true;
    this.triggerCallback('onEnterEditMode');
    if (this.options.externalControl) {
      this.options.externalControl.hide();
    }
    this.element.hide();
    this.createForm();
    this.element.parentNode.insertBefore(this._form, this.element);
    if (!this.options.loadTextURL) {
      this.postProcessEditField();
    }
    if (e) {
      Event.stop(e);
    }
  },
  enterHover: function(e) {
    if (this.options.hoverClassName) {
      this.element.addClassName(this.options.hoverClassName);
    }
    if (this._saving) {
      return;
    }
    this.triggerCallback('onEnterHover');
  },
  getText: function() {
    return this.element.innerHTML.unescapeHTML();
  },
  handleAJAXFailure: function(transport) {
    this.triggerCallback('onFailure', transport);
    if (this._oldInnerHTML) {
      this.element.innerHTML = this._oldInnerHTML;
      this._oldInnerHTML = null;
    }
  },
  handleFormCancellation: function(e) {
    this.wrapUp();
    if (e) {
      Event.stop(e);
    }
  },
  handleFormSubmission: function(e) {
    var form = this._form, value = $F(this._controls.editor);
    this.prepareSubmission();
    var params = this.options.callback(form, value) || '';
    if (Object.isString(params)) {
      params = params.toQueryParams();
    }
    params.editorId = this.element.id;
    var options = this.options.htmlResponse ? {evalScripts: true} : {method: 'get'};
    options = Object.extend(options, this.options.ajaxOptions);
    Object.extend(options, {
      parameters: params,
      onComplete: this._boundWrapperHandler,
      onFailure: this._boundFailureHandler
    });
    if (this.options.htmlResponse) {
      new Ajax.Updater({
        success: this.element
      }, this.url, options);
    } else {
      new Ajax.Request(this.url, options);
    }
    if (e) {
      Event.stop(e);
    }
  },
  leaveEditMode: function() {
    this.element.removeClassName(this.options.savingClassName);
    this.removeForm();
    this.leaveHover();
    this.element.style.backgroundColor = this._originalBackground;
    this.element.show();
    if (this.options.externalControl) {
      this.options.externalControl.show();
    }
    this._saving = false;
    this._editing = false;
    this._oldInnerHTML = null;
    this.triggerCallback('onLeaveEditMode');
  },
  leaveHover: function(e) {
    if (this.options.hoverClassName) {
      this.element.removeClassName(this.options.hoverClassName);
    }
    if (this._saving) {
      return;
    }
    this.triggerCallback('onLeaveHover');
  },
  loadExternalText: function() {
    this._form.addClassName(this.options.loadingClassName);
    this._controls.editor.disabled = true;
    var options = Object.extend({
      method: 'get'
    }, this.options.ajaxOptions);
    Object.extend(options, {
      parameters: 'editorId=' + encodeURIComponent(this.element.id),
      onComplete: Prototype.emptyFunction,
      onSuccess: (function(transport) {
        this._form.removeClassName(this.options.loadingClassName);
        var text = transport.responseText;
        if (this.options.stripLoadedTextTags) {
          text = text.stripTags();
        }
        this._controls.editor.value = text;
        this._controls.editor.disabled = false;
        this.postProcessEditField();
      }).bind(this),
      onFailure: this._boundFailureHandler
    });
    new Ajax.Request(this.options.loadTextURL, options);
  },
  postProcessEditField: function() {
    var fpc = this.options.fieldPostCreation;
    if (fpc) {
      $(this._controls.editor)['focus' == fpc ? 'focus' : 'activate']();
    }
  },
  prepareOptions: function() {
    this.options = Object.clone(Ajax.InPlaceEditor.DefaultOptions);
    Object.extend(this.options, Ajax.InPlaceEditor.DefaultCallbacks);
    [this._extraDefaultOptions].flatten().compact().each(function(defs) {
      Object.extend(this.options, defs);
    }, this);
  },
  prepareSubmission: function() {
    this._saving = true;
    this.removeForm();
    this.leaveHover();
    this.showSaving();
  },
  registerListeners: function() {
    this._listeners = {};
    var listener;
    $H(Ajax.InPlaceEditor.Listeners).each(function(pair) {
      listener = this[pair.value].bind(this);
      this._listeners[pair.key] = listener;
      if (!this.options.externalControlOnly) {
        this.element.observe(pair.key, listener);
      }
      if (this.options.externalControl) {
        this.options.externalControl.observe(pair.key, listener);
      }
    }, this);
  },
  removeForm: function() {
    if (!this._form) {
      return;
    }
    this._form.remove();
    this._form = null;
    this._controls = {};
  },
  showSaving: function() {
    this._oldInnerHTML = this.element.innerHTML;
    this.element.innerHTML = this.options.savingText;
    this.element.addClassName(this.options.savingClassName);
    this.element.style.backgroundColor = this._originalBackground;
    this.element.show();
  },
  triggerCallback: function(cbName, arg) {
    if ('function' == typeof this.options[cbName]) {
      this.options[cbName](this, arg);
    }
  },
  unregisterListeners: function() {
    $H(this._listeners).each(function(pair) {
      if (!this.options.externalControlOnly) {
        this.element.stopObserving(pair.key, pair.value);
      }
      if (this.options.externalControl) {
        this.options.externalControl.stopObserving(pair.key, pair.value);
      }
    }, this);
  },
  wrapUp: function(transport) {
    this.leaveEditMode();
    // Can't use triggerCallback due to backward compatibility: requires
    // binding + direct element
    this._boundComplete(transport, this.element);
  }
});

Ajax.InPlaceEditor.prototype.dispose = Ajax.InPlaceEditor.prototype.destroy;

Ajax.InPlaceCollectionEditor = Class.create(Ajax.InPlaceEditor, {
  initialize: function($super, element, url, options) {
    this._extraDefaultOptions = Ajax.InPlaceCollectionEditor.DefaultOptions;
    $super(element, url, options);
  },

  createEditField: function() {
    var list = document.createElement('select');
    list.name = this.options.paramName;
    list.size = 1;
    this._controls.editor = list;
    this._collection = this.options.collection || [];
    if (this.options.loadCollectionURL) {
      this.loadCollection();
    } else {
      this.checkForExternalText();
    }
    this._form.appendChild(this._controls.editor);
  },

  loadCollection: function() {
    this._form.addClassName(this.options.loadingClassName);
    this.showLoadingText(this.options.loadingCollectionText);
    var options = Object.extend({
      method: 'get'
    }, this.options.ajaxOptions);
    Object.extend(options, {
      parameters: 'editorId=' + encodeURIComponent(this.element.id),
      onComplete: Prototype.emptyFunction,
      onSuccess: (function(transport) {
        var js = transport.responseText.strip();
        // TODO: improve sanity check
        if (!(/^\[.*\]$/.test(js))) {
          throw ('Server returned an invalid collection representation.');
        }
        this._collection = eval(js);
        this.checkForExternalText();
      }).bind(this),
      onFailure: this.onFailure
    });
    new Ajax.Request(this.options.loadCollectionURL, options);
  },

  showLoadingText: function(text) {
    this._controls.editor.disabled = true;
    var tempOption = this._controls.editor.firstChild;
    if (!tempOption) {
      tempOption = document.createElement('option');
      tempOption.value = '';
      this._controls.editor.appendChild(tempOption);
      tempOption.selected = true;
    }
    tempOption.update((text || '').stripScripts().stripTags());
  },

  checkForExternalText: function() {
    this._text = this.getText();
    if (this.options.loadTextURL) {
      this.loadExternalText();
    } else {
      this.buildOptionList();
    }
  },

  loadExternalText: function() {
    this.showLoadingText(this.options.loadingText);
    var options = Object.extend({
      method: 'get'
    }, this.options.ajaxOptions);
    Object.extend(options, {
      parameters: 'editorId=' + encodeURIComponent(this.element.id),
      onComplete: Prototype.emptyFunction,
      onSuccess: (function(transport) {
        this._text = transport.responseText.strip();
        this.buildOptionList();
      }).bind(this),
      onFailure: this.onFailure
    });
    new Ajax.Request(this.options.loadTextURL, options);
  },

  buildOptionList: function() {
    this._form.removeClassName(this.options.loadingClassName);
    this._collection = this._collection.map(function(entry) {
      return 2 === entry.length ? entry : [entry, entry].flatten();
    });
    var marker = ('value' in this.options) ? this.options.value : this._text;
    var textFound = this._collection.any(function(entry) {
      return entry[0] == marker;
    }, this);
    this._controls.editor.update('');
    var option;
    this._collection.each(function(entry, index) {
      option = document.createElement('option');
      option.value = entry[0];
      option.selected = textFound ? entry[0] == marker : 0 == index;
      option.appendChild(document.createTextNode(entry[1]));
      this._controls.editor.appendChild(option);
    }, this);
    this._controls.editor.disabled = false;
    Field.scrollFreeActivate(this._controls.editor);
  }
});

Object.extend(Ajax.InPlaceEditor, {
  DefaultOptions: {
    ajaxOptions: {},
    autoRows: 3, // Use when multi-line w/ rows == 1
    cancelControl: 'link', // 'link'|'button'|false
    cancelText: 'cancel',
    clickToEditText: 'Click to edit',
    externalControl: null, // id|elt
    externalControlOnly: false,
    fieldPostCreation: 'activate', // 'activate'|'focus'|false
    formClassName: 'inplaceeditor-form',
    formId: null, // id|elt
    highlightColor: '#ffff99',
    highlightEndColor: '#ffffff',
    hoverClassName: '',
    htmlResponse: true,
    loadingClassName: 'inplaceeditor-loading',
    loadingText: 'Loading...',
    okControl: 'button', // 'link'|'button'|false
    okText: 'ok',
    paramName: 'value',
    rows: 1, // If 1 and multi-line, uses autoRows
    savingClassName: 'inplaceeditor-saving',
    savingText: 'Saving...',
    size: 0,
    stripLoadedTextTags: false,
    submitOnBlur: false,
    textAfterControls: '',
    textBeforeControls: '',
    textBetweenControls: ''
  },
  DefaultCallbacks: {
    callback: function(form) {
      return Form.serialize(form);
    },
    onComplete: function(transport, element) {
      // For backward compatibility, this one is bound to the IPE, and passes
      // the element directly.  It was too often customized, so we don't break it.
      new Effect.Highlight(element, {
        startcolor: this.options.highlightColor,
        keepBackgroundImage: true
      });
    },
    onEnterEditMode: null,
    onEnterHover: function(ipe) {
      ipe.element.style.backgroundColor = ipe.options.highlightColor;
      if (ipe._effect) {
        ipe._effect.cancel();
      }
    },
    onFailure: function(transport, ipe) {
      alert('Error communication with the server: ' + transport.responseText.stripTags());
    },
    onFormCustomization: null, // Takes the IPE and its generated form, after editor, before controls.
    onLeaveEditMode: null,
    onLeaveHover: function(ipe) {
      ipe._effect = new Effect.Highlight(ipe.element, {
        startcolor: ipe.options.highlightColor,
        endcolor: ipe.options.highlightEndColor,
        restorecolor: ipe._originalBackground,
        keepBackgroundImage: true
      });
    }
  },
  Listeners: {
    click: 'enterEditMode',
    keydown: 'checkForEscapeOrReturn',
    mouseover: 'enterHover',
    mouseout: 'leaveHover'
  }
});

Ajax.InPlaceCollectionEditor.DefaultOptions = {
  loadingCollectionText: 'Loading options...'
};

// Delayed observer, like Form.Element.Observer,
// but waits for delay after last key input
// Ideal for live-search fields

Form.Element.DelayedObserver = Class.create({
  initialize: function(element, delay, callback) {
    this.delay = delay || 0.5;
    this.element = $(element);
    this.callback = callback;
    this.timer = null;
    this.lastValue = $F(this.element);
    Event.observe(this.element, 'keyup', this.delayedListener.bind(this));
  },
  delayedListener: function(event) {
    if (this.lastValue == $F(this.element)) {
      return;
    }
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(this.onTimerEvent.bind(this), this.delay * 1000);
    this.lastValue = $F(this.element);
  },
  onTimerEvent: function() {
    this.timer = null;
    this.callback(this.element, $F(this.element));
  }
});
// script.aculo.us dragdrop.js v1.9.0 with fixes, Thu Dec 23 16:54:48 -0500 2010

// Copyright (c) 2005-2010 Thomas Fuchs (http://script.aculo.us, http://mir.aculo.us)
//
// script.aculo.us is freely distributable under the terms of an MIT-style license.
// For details, see the script.aculo.us web site: http://script.aculo.us/

if (Object.isUndefined(Effect)) {
  throw ("dragdrop.js requires including script.aculo.us' effects.js library");
}

var Droppables = {
  drops: [],

  remove: function(element) {
    this.drops = this.drops.reject(function(d) {
      return d.element == $(element);
    });
  },

  add: function(element) {
    element = $(element);
    var options = Object.extend({
      greedy: true,
      hoverclass: null,
      tree: false
    }, arguments[1] || {});

    // cache containers
    if (options.containment) {
      options._containers = [];
      var containment = options.containment;
      if (Object.isArray(containment)) {
        containment.each(function(c) {
          options._containers.push($(c));
        });
      } else {
        options._containers.push($(containment));
      }
    }

    if (options.accept) {
      options.accept = [options.accept].flatten();
    }

    Element.makePositioned(element); // fix IE
    options.element = element;

    this.drops.push(options);
  },

  findDeepestChild: function(drops) {
    var deepest = drops[0];

    for (var i = 1, len = drops.length; i < len; ++i) {
      if (Element.isParent(drops[i].element, deepest.element)) {
        deepest = drops[i];
      }
    }

    return deepest;
  },

  isContained: function(element, drop) {
    var containmentNode;
    if (drop.tree) {
      containmentNode = element.treeNode;
    } else {
      containmentNode = element.parentNode;
    }
    return drop._containers.detect(function(c) {
      return containmentNode == c;
    });
  },

  isAffected: function(point, element, drop) {
    return ((drop.element != element) &&
    ((!drop._containers) ||
    this.isContained(element, drop)) &&
    ((!drop.accept) ||
    ($w(element.className).detect(function(v) {
      return drop.accept.include(v);
    }))) &&
    Position.within(drop.element, point[0], point[1]));
  },

  deactivate: function(drop) {
    if (drop.hoverclass) {
      Element.removeClassName(drop.element, drop.hoverclass);
    }
    this.last_active = null;
  },

  activate: function(drop) {
    if (drop.hoverclass) {
      Element.addClassName(drop.element, drop.hoverclass);
    }
    this.last_active = drop;
  },

  show: function(point, element) {
    if (!this.drops.length) {
      return;
    }
    var drop, affected = [];

    this.drops.each(function(drop) {
      if (Droppables.isAffected(point, element, drop)) {
        affected.push(drop);
      }
    });

    if (affected.length > 0) {
      drop = Droppables.findDeepestChild(affected);
    }

    if (this.last_active && this.last_active != drop) {
      this.deactivate(this.last_active);
    }
    if (drop) {
      Position.within(drop.element, point[0], point[1]);
      if (drop.onHover) {
        drop.onHover(element, drop.element, Position.overlap(drop.overlap, drop.element));
      }
      if (drop != this.last_active) {
        Droppables.activate(drop);
      }
    }
  },

  fire: function(event, element) {
    if (!this.last_active) {
      return;
    }
    Position.prepare();

    if (this.isAffected([Event.pointerX(event), Event.pointerY(event)], element, this.last_active)) {
      if (this.last_active.onDrop) {
        this.last_active.onDrop(element, this.last_active.element, event);
        return true;
      }
    }
  },

  reset: function() {
    if (this.last_active) {
      this.deactivate(this.last_active);
    }
  }
};

var Draggables = {
  drags: [],
  observers: [],

  register: function(draggable) {
    if (this.drags.length === 0) {
      this.eventMouseUp = this.endDrag.bind(this);
      this.eventMouseMove = this.updateDrag.bind(this);
      this.eventKeypress = this.keyPress.bind(this);

      Event.observe(document, "mouseup", this.eventMouseUp);
      Event.observe(document, "mousemove", this.eventMouseMove);
      Event.observe(document, "keypress", this.eventKeypress);
    }
    this.drags.push(draggable);
  },

  unregister: function(draggable) {
    this.drags = this.drags.reject(function(d) {
      return d == draggable;
    });
    if (this.drags.length === 0) {
      Event.stopObserving(document, "mouseup", this.eventMouseUp);
      Event.stopObserving(document, "mousemove", this.eventMouseMove);
      Event.stopObserving(document, "keypress", this.eventKeypress);
    }
  },

  activate: function(draggable) {
    if (draggable.options.delay) {
      this._timeout = setTimeout((function() {
        Draggables._timeout = null;
        window.focus();
        Draggables.activeDraggable = draggable;
      }).bind(this), draggable.options.delay);
    } else {
      window.focus(); // allows keypress events if window isn't currently focused, fails for Safari
      this.activeDraggable = draggable;
    }
  },

  deactivate: function() {
    this.activeDraggable = null;
  },

  updateDrag: function(event) {
    if (!this.activeDraggable) {
      return;
    }
    var pointer = [Event.pointerX(event), Event.pointerY(event)];
    // Mozilla-based browsers fire successive mousemove events with
    // the same coordinates, prevent needless redrawing (moz bug?)
    if (this._lastPointer && (this._lastPointer.inspect() == pointer.inspect())) {
      return;
    }
    this._lastPointer = pointer;

    this.activeDraggable.updateDrag(event, pointer);
  },

  endDrag: function(event) {
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
    if (this.activeDraggable) {
      this._lastPointer = null;
      this.activeDraggable.endDrag(event);
      this.activeDraggable = null;
    }
  },

  keyPress: function(event) {
    if (this.activeDraggable) {
      this.activeDraggable.keyPress(event);
    }
  },

  addObserver: function(observer) {
    this.observers.push(observer);
    this._cacheObserverCallbacks();
  },

  removeObserver: function(element) { // element instead of observer fixes mem leaks
    this.observers = this.observers.reject(function(o) {
      return o.element == element;
    });
    this._cacheObserverCallbacks();
  },

  notify: function(eventName, draggable, event) { // 'onStart', 'onEnd', 'onDrag'
    if (this[eventName + 'Count'] > 0) {
      this.observers.each(function(o) {
        if (o[eventName]) {
          o[eventName](eventName, draggable, event);
        }
      });
    }
    if (draggable.options[eventName]) {
      draggable.options[eventName](draggable, event);
    }
  },

  _cacheObserverCallbacks: function() {
    ['onStart', 'onEnd', 'onDrag'].each(function(eventName) {
      Draggables[eventName + 'Count'] = Draggables.observers.select(function(o) {
        return o[eventName];
      }).length;
    });
  }
};

/*--------------------------------------------------------------------------*/

var Draggable = Class.create({
  initialize: function(element) {
    var defaults = {
      handle: false,
      reverteffect: function(element, top_offset, left_offset) {
        var dur = Math.sqrt(Math.abs(top_offset ^ 2) + Math.abs(left_offset ^ 2)) * 0.02;
        new Effect.Move(element, {
          x: -left_offset,
          y: -top_offset,
          duration: dur,
          queue: {
            scope: '_draggable',
            position: 'end'
          }
        });
      },
      endeffect: function(element) {
        var toOpacity = Object.isNumber(element._opacity) ? element._opacity : 1.0;
        new Effect.Opacity(element, {
          duration: 0.2,
          from: 0.7,
          to: toOpacity,
          queue: {
            scope: '_draggable',
            position: 'end'
          },
          afterFinish: function() {
            Draggable._dragging[element] = false;
          }
        });
      },
      zindex: 1000,
      revert: false,
      quiet: false,
      scroll: false,
      scrollSensitivity: 20,
      scrollSpeed: 15,
      snap: false, // false, or xy or [x,y] or function(x,y){ return [x,y] }
      delay: 0
    };

    if (!arguments[1] || Object.isUndefined(arguments[1].endeffect)) {
      Object.extend(defaults, {
        starteffect: function(element) {
          element._opacity = Element.getOpacity(element);
          Draggable._dragging[element] = true;
          new Effect.Opacity(element, {
            duration: 0.2,
            from: element._opacity,
            to: 0.7
          });
        }
      });
    }

    var options = Object.extend(defaults, arguments[1] || {});

    this.element = $(element);

    if (options.handle && Object.isString(options.handle)) {
      this.handle = this.element.down('.' + options.handle, 0);
    }
    this.handle = this.handle || $(options.handle) || this.element;

    if (options.scroll && !options.scroll.scrollTo && !options.scroll.outerHTML) {
      options.scroll = $(options.scroll);
      this._isScrollChild = Element.descendantOf(this.element, options.scroll);
    }

    Element.makePositioned(this.element); // fix IE
    this.options = options;
    this.dragging = false;

    this.eventMouseDown = this.initDrag.bind(this);
    Event.observe(this.handle, "mousedown", this.eventMouseDown);

    Draggables.register(this);
  },

  destroy: function() {
    Event.stopObserving(this.handle, "mousedown", this.eventMouseDown);
    Draggables.unregister(this);
  },

  currentDelta: function() {
    return ([parseInt(Element.getStyle(this.element, 'left') || '0', 10), parseInt(Element.getStyle(this.element, 'top') || '0', 10)]);
  },

  initDrag: function(event) {
    if (!Object.isUndefined(Draggable._dragging[this.element]) && Draggable._dragging[this.element]) {
      return;
    }
    if (Event.isLeftClick(event)) {
      // abort on form elements, fixes a Firefox issue
      var src = Event.element(event), tag_name = src.tagName.toUpperCase();
      if (tag_name && (tag_name == 'INPUT' || tag_name == 'SELECT' || tag_name == 'OPTION' || tag_name == 'BUTTON' || tag_name == 'TEXTAREA')) {
        return;
      }

      var pointer = [Event.pointerX(event), Event.pointerY(event)], pos = this.element.cumulativeOffset();
      this.offset = [pointer[0] - pos[0], pointer[1] - pos[1]];

      Draggables.activate(this);
      Event.stop(event);
    }
  },

  startDrag: function(event) {
    this.dragging = true;
    if (!this.delta) {
      this.delta = this.currentDelta();
    }

    if (this.options.zindex) {
      // FIXED z-index: auto -> z-index: 0
      //this.originalZ = parseInt(Element.getStyle(this.element, 'z-index') || 0, 10);
      this.originalZ = Element.getStyle(this.element, 'z-index');
      this.originalZ = this.originalZ ? parseInt(this.originalZ, 10) : "auto";
      this.element.style.zIndex = this.options.zindex;
    }

    if (this.options.ghosting) {
      this._clone = this.element.cloneNode(true);
      this._originallyAbsolute = (this.element.getStyle('position') == 'absolute');
      if (!this._originallyAbsolute) {
        Position.prepare();
        Element.absolutize(this.element);
      }
      this.element.parentNode.insertBefore(this._clone, this.element);
    }

    var s = this.options.scroll;
    if (s) {
      if (s == window) {
        s = this._getWindowScroll();
      }
      this.originalScrollLeft = s.scrollLeft;
      this.originalScrollTop = s.scrollTop;
    }

    Draggables.notify('onStart', this, event);

    if (this.options.starteffect) {
      this.options.starteffect(this.element);
    }
  },

  updateDrag: function(event, pointer) {
    if (!this.dragging) {
      this.startDrag(event);
    }

    if (!this.options.quiet) {
      Position.prepare();
      Droppables.show(pointer, this.element);
    }

    Draggables.notify('onDrag', this, event);

    this.draw(pointer);
    if (this.options.change) {
      this.options.change(this);
    }

    var s = this.options.scroll;
    if (s) {
      this.stopScrolling();

      var p, sensitivity = this.options.scrollSensitivity;
      if (s == window) {
        s = this._getWindowScroll();
        p = [s.scrollLeft, s.scrollTop];
      } else {
        p = Element.viewportOffset(s).toArray();
        p[0] += s.scrollLeft + Position.deltaX;
        p[1] += s.scrollTop + Position.deltaY;
      }
      p.push(p[0] + s.offsetWidth);
      p.push(p[1] + s.offsetHeight);

      p[0] = pointer[0] - (p[0] + sensitivity);
      p[1] = pointer[1] - (p[1] + sensitivity);
      p[2] = pointer[0] - (p[2] - sensitivity);
      p[3] = pointer[1] - (p[3] - sensitivity);

      var speed = [(p[0] < 0) ? p[0] : ((p[2] > 0) ? p[2] : 0), (p[1] < 0) ? p[1] : ((p[3] > 0) ? p[3] : 0)];
      this.startScrolling(speed);
    }

    // fix AppleWebKit rendering
    if (Prototype.Browser.WebKit) {
      window.scrollBy(0, 0);
    }

    Event.stop(event);
  },

  finishDrag: function(event, success) {
    this.dragging = false;

    if (this.options.quiet) {
      Position.prepare();
      Droppables.show([Event.pointerX(event), Event.pointerY(event)], this.element);
    }

    if (this.options.ghosting) {
      if (!this._originallyAbsolute) {
        Position.prepare();
        Element.relativize(this.element);
      }
      delete this._originallyAbsolute;
      Element.remove(this._clone);
      this._clone = null;
    }

    var dropped = false;
    if (success) {
      dropped = Droppables.fire(event, this.element);
      if (!dropped) {
        dropped = false;
      }
    }
    if (dropped && this.options.onDropped) {
      this.options.onDropped(this.element);
    }
    Draggables.notify('onEnd', this, event);

    var revert = this.options.revert;
    if (revert && Object.isFunction(revert)) {
      revert = revert(this.element);
    }

    var d = this.currentDelta();
    if (revert && this.options.reverteffect) {
      if (dropped == 0 || revert != 'failure') {
        this.options.reverteffect(this.element, d[1] - this.delta[1], d[0] - this.delta[0]);
      }
    } else {
      this.delta = d;
    }

    if (this.options.zindex) {
      this.element.style.zIndex = this.originalZ;
    }

    if (this.options.endeffect) {
      this.options.endeffect(this.element);
    }

    Draggables.deactivate(this);
    Droppables.reset();
  },

  keyPress: function(event) {
    if (event.keyCode == Event.KEY_ESC) {
      this.finishDrag(event, false);
      Event.stop(event);
    }
  },

  endDrag: function(event) {
    if (this.dragging) {
      this.stopScrolling();
      this.finishDrag(event, true);
      Event.stop(event);
    }
  },

  draw: function(point) {
    var pos = this.element.cumulativeOffset(), o = this.options;
    if (o.ghosting) {
      var r = Element.cumulativeScrollOffset(this.element);
      pos[0] += r[0] - Position.deltaX;
      pos[1] += r[1] - Position.deltaY;
    }

    var d = this.currentDelta();
    pos[0] -= d[0];
    pos[1] -= d[1];

    if (o.scroll && (o.scroll != window && this._isScrollChild)) {
      pos[0] -= o.scroll.scrollLeft - this.originalScrollLeft;
      pos[1] -= o.scroll.scrollTop - this.originalScrollTop;
    }

    var p = [point[0] - pos[0] - this.offset[0], point[1] - pos[1] - this.offset[1]];

    if (o.snap) {
      if (Object.isFunction(o.snap)) {
        p = o.snap(p[0], p[1], this);
      } else if (Object.isArray(o.snap)) {
        p[0] = (p[0] / o.snap[0]).round() * o.snap[0];
        p[1] = (p[1] / o.snap[1]).round() * o.snap[1];
      } else {
        p[0] = (p[0] / o.snap).round() * o.snap;
        p[1] = (p[1] / o.snap).round() * o.snap;
      }
    }

    var style = this.element.style;
    if ((!o.constraint) || (o.constraint == 'horizontal')) {
      style.left = p[0] + "px";
    }
    if ((!o.constraint) || (o.constraint == 'vertical')) {
      style.top = p[1] + "px";
    }

    if (style.visibility == "hidden") {
      style.visibility = ""; // fix gecko rendering
    }
  },

  stopScrolling: function() {
    if (this.scrollInterval) {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
      Draggables._lastScrollPointer = null;
    }
  },

  startScrolling: function(speed) {
    if (!(speed[0] || speed[1])) {
      return;
    }
    this.scrollSpeed = [speed[0] * this.options.scrollSpeed, speed[1] * this.options.scrollSpeed];
    this.lastScrolled = new Date();
    this.scrollInterval = setInterval(this.scroll.bind(this), 10);
  },

  scroll: function() {
    var current = new Date(), delta = (current - this.lastScrolled) / 1000, s = this.options.scroll;
    this.lastScrolled = current;
    if (s === window) {
      if (this.scrollSpeed[0] || this.scrollSpeed[1]) {
        s = this._getWindowScroll();
        window.scrollTo(s.scrollLeft + delta * this.scrollSpeed[0], s.scrollTop + delta * this.scrollSpeed[1]);
      }
    } else {
      s.scrollLeft += this.scrollSpeed[0] * delta;
      s.scrollTop += this.scrollSpeed[1] * delta;
    }

    Position.prepare();
    Droppables.show(Draggables._lastPointer, this.element);
    Draggables.notify('onDrag', this);
    if (this._isScrollChild) {
      Draggables._lastScrollPointer = Draggables._lastScrollPointer || $A(Draggables._lastPointer);
      Draggables._lastScrollPointer[0] += this.scrollSpeed[0] * delta;
      Draggables._lastScrollPointer[1] += this.scrollSpeed[1] * delta;
      if (Draggables._lastScrollPointer[0] < 0) {
        Draggables._lastScrollPointer[0] = 0;
      }
      if (Draggables._lastScrollPointer[1] < 0) {
        Draggables._lastScrollPointer[1] = 0;
      }
      this.draw(Draggables._lastScrollPointer);
    }

    if (this.options.change) {
      this.options.change(this);
    }
  },

  _getWindowScroll: function() {
    var T, L, W, H, w = window, d = w.document;

    if (d.documentElement && d.documentElement.scrollTop) {
      T = d.documentElement.scrollTop;
      L = d.documentElement.scrollLeft;
    } else if (d.body) {
      T = d.body.scrollTop;
      L = d.body.scrollLeft;
    }
    if (w.innerWidth) {
      W = w.innerWidth;
      H = w.innerHeight;
    } else if (d.documentElement && d.documentElement.clientWidth) {
      W = d.documentElement.clientWidth;
      H = d.documentElement.clientHeight;
    } else {
      W = d.body.offsetWidth;
      H = d.body.offsetHeight;
    }

    return {
      scrollTop: T,
      scrollLeft: L,
      offsetWidth: W,
      offsetHeight: H
    };
  }
});

Draggable._dragging = {};

/*--------------------------------------------------------------------------*/

var SortableObserver = Class.create({
  initialize: function(element, observer) {
    this.element = $(element);
    this.observer = observer;
    this.lastValue = Sortable.serialize(this.element);
  },

  onStart: function() {
    this.lastValue = Sortable.serialize(this.element);
  },

  onEnd: function() {
    Sortable.unmark();
    if (this.lastValue != Sortable.serialize(this.element)) {
      this.observer(this.element);
    }
  }
});

var Sortable = {
  SERIALIZE_RULE: /^[^_\-](?:[A-Za-z0-9\-\_]*)[_](.*)$/,

  sortables: {},

  _findRootElement: function(element) {
    while (element.tagName.toUpperCase() != "BODY") {
      if (element.id && Sortable.sortables[element.id]) {
        return element;
      }
      element = element.parentNode;
    }
  },

  options: function(element) {
    element = Sortable._findRootElement($(element));
    if (!element) {
      return;
    }
    return Sortable.sortables[element.id];
  },

  destroy: function(element) {
    element = $(element);
    var s = Sortable.sortables[element.id];

    if (s) {
      Draggables.removeObserver(s.element);
      s.droppables.each(function(d) {
        Droppables.remove(d);
      });
      s.draggables.invoke('destroy');

      delete Sortable.sortables[s.element.id];
    }
  },

  create: function(element) {
    element = $(element);
    var options = Object.extend({
      element: element,
      tag: 'li', // assumes li children, override with tag: 'tagname'
      dropOnEmpty: false,
      tree: false,
      treeTag: 'ul',
      overlap: 'vertical', // one of 'vertical', 'horizontal'
      constraint: 'vertical', // one of 'vertical', 'horizontal', false
      containment: element, // also takes array of elements (or id's); or false
      handle: false, // or a CSS class
      only: false,
      delay: 0,
      hoverclass: null,
      ghosting: false,
      quiet: false,
      scroll: false,
      scrollSensitivity: 20,
      scrollSpeed: 15,
      format: this.SERIALIZE_RULE,

      // these take arrays of elements or ids and can be
      // used for better initialization performance
      elements: false,
      handles: false,

      onChange: Prototype.emptyFunction,
      onUpdate: Prototype.emptyFunction
    }, arguments[1] || {});

    // clear any old sortable with same element
    this.destroy(element);

    // build options for the draggables
    var options_for_draggable = {
      revert: true,
      quiet: options.quiet,
      scroll: options.scroll,
      scrollSpeed: options.scrollSpeed,
      scrollSensitivity: options.scrollSensitivity,
      delay: options.delay,
      ghosting: options.ghosting,
      constraint: options.constraint,
      handle: options.handle
    };

    if (options.starteffect) {
      options_for_draggable.starteffect = options.starteffect;
    }

    if (options.reverteffect) {
      options_for_draggable.reverteffect = options.reverteffect;
    } else if (options.ghosting) {
      options_for_draggable.reverteffect = function(element) {
        element.style.top = 0;
        element.style.left = 0;
      };
    }

    if (options.endeffect) {
      options_for_draggable.endeffect = options.endeffect;
    }

    if (options.zindex) {
      options_for_draggable.zindex = options.zindex;
    }

    // build options for the droppables
    var options_for_droppable = {
      overlap: options.overlap,
      containment: options.containment,
      tree: options.tree,
      hoverclass: options.hoverclass,
      onHover: Sortable.onHover
    };

    var options_for_tree = {
      onHover: Sortable.onEmptyHover,
      overlap: options.overlap,
      containment: options.containment,
      hoverclass: options.hoverclass
    };

    // fix for gecko engine
    Element.cleanWhitespace(element);

    options.draggables = [];
    options.droppables = [];

    // drop on empty handling
    if (options.dropOnEmpty || options.tree) {
      Droppables.add(element, options_for_tree);
      options.droppables.push(element);
    }

    (options.elements || this.findElements(element, options) || []).each(function(e, i) {
      var handle = options.handles ? $(options.handles[i]) : (options.handle ? $(e).select('.' + options.handle)[0] : e);
      options.draggables.push(new Draggable(e, Object.extend(options_for_draggable, {
        handle: handle
      })));
      Droppables.add(e, options_for_droppable);
      if (options.tree) {
        e.treeNode = element;
      }
      options.droppables.push(e);
    });

    if (options.tree) {
      (Sortable.findTreeElements(element, options) || []).each(function(e) {
        Droppables.add(e, options_for_tree);
        e.treeNode = element;
        options.droppables.push(e);
      });
    }

    // keep reference
    this.sortables[element.identify()] = options;

    // for onupdate
    Draggables.addObserver(new SortableObserver(element, options.onUpdate));

  },

  // return all suitable-for-sortable elements in a guaranteed order
  findElements: function(element, options) {
    return Element.findChildren(element, options.only, options.tree ? true : false, options.tag);
  },

  findTreeElements: function(element, options) {
    return Element.findChildren(element, options.only, options.tree ? true : false, options.treeTag);
  },

  onHover: function(element, dropon, overlap) {
    if (Element.isParent(dropon, element)) {
      return;
    }
    var oldParentNode;

    if (overlap > 0.33 && overlap < 0.66 && Sortable.options(dropon).tree) {
      // do nothing
    } else if (overlap > 0.5) {
      Sortable.mark(dropon, 'before');
      if (dropon.previousSibling != element) {
        oldParentNode = element.parentNode;
        element.style.visibility = "hidden"; // fix gecko rendering
        dropon.parentNode.insertBefore(element, dropon);
        if (dropon.parentNode != oldParentNode) {
          Sortable.options(oldParentNode).onChange(element);
        }
        Sortable.options(dropon.parentNode).onChange(element);
      }
    } else {
      Sortable.mark(dropon, 'after');
      var nextElement = dropon.nextSibling || null;
      if (nextElement != element) {
        oldParentNode = element.parentNode;
        element.style.visibility = "hidden"; // fix gecko rendering
        dropon.parentNode.insertBefore(element, nextElement);
        if (dropon.parentNode != oldParentNode) {
          Sortable.options(oldParentNode).onChange(element);
        }
        Sortable.options(dropon.parentNode).onChange(element);
      }
    }
  },

  onEmptyHover: function(element, dropon, overlap) {
    var oldParentNode = element.parentNode;
    var droponOptions = Sortable.options(dropon);

    if (!Element.isParent(dropon, element)) {
      var children = Sortable.findElements(dropon, {
        tag: droponOptions.tag,
        only: droponOptions.only
      });
      var child = null;

      if (children) {
        var offset = Element.offsetSize(dropon, droponOptions.overlap) * (1.0 - overlap);

        for (var index = 0, len = children.length; index < len; index += 1) {
          var childOffset = Element.offsetSize(children[index], droponOptions.overlap);
          if (offset - childOffset >= 0) {
            offset -= childOffset;
          } else if (offset - (childOffset / 2) >= 0) {
            child = index + 1 < len ? children[index + 1] : null;
            break;
          } else {
            child = children[index];
            break;
          }
        }
      }

      dropon.insertBefore(element, child);

      Sortable.options(oldParentNode).onChange(element);
      droponOptions.onChange(element);
    }
  },

  unmark: function() {
    if (Sortable._marker) {
      Sortable._marker.hide();
    }
  },

  mark: function(dropon, position) {
    // mark on ghosting only
    var sortable = Sortable.options(dropon.parentNode);
    if (sortable && !sortable.ghosting) {
      return;
    }

    if (!Sortable._marker) {
      Sortable._marker = ($('dropmarker') || Element.extend(document.createElement('DIV'))).hide().addClassName('dropmarker').setStyle({
        position: 'absolute'
      });
      document.getElementsByTagName("body").item(0).appendChild(Sortable._marker);
    }
    var offsets = dropon.cumulativeOffset();
    Sortable._marker.setStyle({
      left: offsets[0] + 'px',
      top: offsets[1] + 'px'
    });

    if (position == 'after') {
      if (sortable.overlap == 'horizontal') {
        Sortable._marker.setStyle({
          left: (offsets[0] + dropon.clientWidth) + 'px'
        });
      } else {
        Sortable._marker.setStyle({
          top: (offsets[1] + dropon.clientHeight) + 'px'
        });
      }
    }

    Sortable._marker.show();
  },

  _tree: function(element, options, parent) {
    var children = Sortable.findElements(element, options) || [];

    for (var i = 0; i < children.length; ++i) {
      var match = children[i].id.match(options.format);

      if (!match) {
        continue;
      }

      var child = {
        id: encodeURIComponent(match ? match[1] : null),
        element: element,
        parent: parent,
        children: [],
        position: parent.children.length,
        container: $(children[i]).down(options.treeTag)
      };

      /* Get the element containing the children and recurse over it */
      if (child.container) {
        this._tree(child.container, options, child);
      }

      parent.children.push(child);
    }

    return parent;
  },

  tree: function(element) {
    element = $(element);
    var sortableOptions = this.options(element);
    var options = Object.extend({
      tag: sortableOptions.tag,
      treeTag: sortableOptions.treeTag,
      only: sortableOptions.only,
      name: element.id,
      format: sortableOptions.format
    }, arguments[1] || {});

    var root = {
      id: null,
      parent: null,
      children: [],
      container: element,
      position: 0
    };

    return Sortable._tree(element, options, root);
  },

  /* Construct a [i] index for a particular node */
  _constructIndex: function(node) {
    var index = '';
    do {
      if (node.id) {
        index = '[' + node.position + ']' + index;
      }
    } while ((node = node.parent) != null);
    return index;
  },

  sequence: function(element) {
    element = $(element);
    var options = Object.extend(this.options(element), arguments[1] || {});

    return $(this.findElements(element, options) || []).map(function(item) {
      return item.id.match(options.format) ? item.id.match(options.format)[1] : '';
    });
  },

  setSequence: function(element, new_sequence) {
    element = $(element);
    var options = Object.extend(this.options(element), arguments[2] || {});

    var nodeMap = {};
    this.findElements(element, options).each(function(n) {
      if (n.id.match(options.format)) {
        nodeMap[n.id.match(options.format)[1]] = [n, n.parentNode];
      }
      n.parentNode.removeChild(n);
    });

    new_sequence.each(function(ident) {
      var n = nodeMap[ident];
      if (n) {
        n[1].appendChild(n[0]);
        delete nodeMap[ident];
      }
    });
  },

  serialize: function(element) {
    element = $(element);
    var options = Object.extend(Sortable.options(element), arguments[1] || {});
    var name = encodeURIComponent((arguments[1] && arguments[1].name) ? arguments[1].name : element.id);

    if (options.tree) {
      return Sortable.tree(element, arguments[1]).children.map(function(item) {
        return [name + Sortable._constructIndex(item) + "[id]=" +
        encodeURIComponent(item.id)].concat(item.children.map(arguments.callee));
      }).flatten().join('&');
    } else {
      return Sortable.sequence(element, arguments[1]).map(function(item) {
        return name + "[]=" + encodeURIComponent(item);
      }).join('&');
    }
  }
};

// Returns true if child is contained within element
Element.isParent = function(child, element) {
  if (!child.parentNode || child == element) {
    return false;
  }
  if (child.parentNode == element) {
    return true;
  }
  return Element.isParent(child.parentNode, element);
};

Element.findChildren = function(element, only, recursive, tagName) {
  if (!element.hasChildNodes()) {
    return null;
  }
  tagName = tagName.toUpperCase();
  if (only) {
    only = [only].flatten();
  }
  var elements = [];
  $A(element.childNodes).each(function(e) {
    if (e.tagName && e.tagName.toUpperCase() == tagName &&
    (!only ||
    ($w(e.className).detect(function(v) {
      return only.include(v);
    })))) {
      elements.push(e);
    }
    if (recursive) {
      var grandchildren = Element.findChildren(e, only, recursive, tagName);
      if (grandchildren) {
        elements.push(grandchildren);
      }
    }
  });

  return (elements.length > 0 ? elements.flatten() : []);
};

Element.offsetSize = function(element, type) {
  return element['offset' + ((type == 'vertical' || type == 'height') ? 'Height' : 'Width')];
};
// script.aculo.us slider.js v1.9.0, Thu Dec 23 16:54:48 -0500 2010

// Copyright (c) 2005-2010 Marty Haught, Thomas Fuchs
//
// script.aculo.us is freely distributable under the terms of an MIT-style license.
// For details, see the script.aculo.us web site: http://script.aculo.us/

window.Control = window.Control || {};

// options:
//  axis: 'vertical', or 'horizontal' (default)
//
// callbacks:
//  onChange(value)
//  onSlide(value)
Control.Slider = Class.create({
  initialize: function(handle, track, options) {
    if (Object.isArray(handle)) {
      this.handles = handle.collect(function(e) {
        return $(e);
      });
    } else {
      this.handles = [$(handle)];
    }

    this.track = $(track);
    options = options || {};
    this.options = options;

    this.axis = options.axis || 'horizontal';
    this.increment = options.increment || 1;
    this.step = parseInt(options.step || '1', 10);
    this.range = options.range || $R(0, 1);

    this.value = 0; // assure backwards compat
    this.values = this.handles.map(function() {
      return 0;
    });
    this.spans = options.spans ? options.spans.map(function(s) {
      return $(s);
    }) : false;
    options.startSpan = $(options.startSpan || null);
    options.endSpan = $(options.endSpan || null);

    this.restricted = options.restricted || false;

    this.maximum = options.maximum || this.range.end;
    this.minimum = options.minimum || this.range.start;

    // Will be used to align the handle onto the track, if necessary
    this.alignX = parseInt(options.alignX || '0', 10);
    this.alignY = parseInt(options.alignY || '0', 10);

    this.trackLength = this.maximumOffset() - this.minimumOffset();
    this.handleLength = this.elementOffset(this.handles[0]);

    this.active = this.dragging = this.disabled = false;

    if (options.disabled) {
      this.setDisabled();
    }

    // Allowed values array
    this.allowedValues = options.values ? options.values.sortBy(Prototype.K) : false;
    if (this.allowedValues) {
      this.minimum = this.allowedValues.min();
      this.maximum = this.allowedValues.max();
    }

    this.eventMouseDown = this.startDrag.bind(this);
    this.eventMouseUp = this.endDrag.bind(this);
    this.eventMouseMove = this.update.bind(this);

    // Initialize handles in reverse (make sure first handle is active)
    var value = options.sliderValue;
    this.handles.each(function(h, i) {
      i = this.handles.length - 1 - i;
      this.setValue(parseFloat((Object.isArray(value) ? value[i] : value) || this.range.start), i);
      h.makePositioned().observe("mousedown", this.eventMouseDown);
    }, this);

    this.track.observe("mousedown", this.eventMouseDown);
    document.observe("mouseup", this.eventMouseUp);
    document.observe("mousemove", this.eventMouseMove);

    this.initialized = true;
  },
  dispose: function() {
    var slider = this;
    Event.stopObserving(this.track, "mousedown", this.eventMouseDown);
    Event.stopObserving(document, "mouseup", this.eventMouseUp);
    Event.stopObserving(document, "mousemove", this.eventMouseMove);
    this.handles.invoke("stopObserving", "mousedown", slider.eventMouseDown);
  },
  setDisabled: function() {
    this.disabled = true;
  },
  setEnabled: function() {
    this.disabled = false;
  },
  getNearestValue: function(value) {
    if (this.allowedValues) {
      if (value >= this.allowedValues.max()) {
        return (this.allowedValues.max());
      }
      if (value <= this.allowedValues.min()) {
        return (this.allowedValues.min());
      }

      var offset = Math.abs(this.allowedValues[0] - value);
      var newValue = this.allowedValues[0];
      this.allowedValues.each(function(v) {
        var currentOffset = Math.abs(v - value);
        if (currentOffset <= offset) {
          newValue = v;
          offset = currentOffset;
        }
      });
      return newValue;
    }
    return (value > this.range.end) ? this.range.end : ((value < this.range.start) ? this.range.start : value);
  },
  setValue: function(sliderValue, handleIdx) {
    if (!this.active) {
      this.activeHandleIdx = handleIdx || 0;
      this.activeHandle = this.handles[this.activeHandleIdx];
      this.updateStyles();
    }
    handleIdx = handleIdx || this.activeHandleIdx || 0;
    if (this.initialized && this.restricted) {
      if ((handleIdx > 0) && (sliderValue < this.values[handleIdx - 1])) {
        sliderValue = this.values[handleIdx - 1];
      }
      if ((handleIdx < (this.handles.length - 1)) && (sliderValue > this.values[handleIdx + 1])) {
        sliderValue = this.values[handleIdx + 1];
      }
    }
    sliderValue = this.getNearestValue(sliderValue);
    this.values[handleIdx] = sliderValue;
    this.value = this.values[0]; // assure backwards compat
    this.handles[handleIdx].style[this.isVertical() ? 'top' : 'left'] = this.translateToPx(sliderValue);

    this.drawSpans();
    if (!this.dragging || !this.event) {
      this.updateFinished();
    }
  },
  setValueBy: function(delta, handleIdx) {
    this.setValue(this.values[handleIdx || this.activeHandleIdx || 0] + delta, handleIdx || this.activeHandleIdx || 0);
  },
  translateToPx: function(value) {
    return Math.round(((this.trackLength - this.handleLength) / (this.range.end - this.range.start)) * (value - this.range.start)) + "px";
  },
  translateToValue: function(offset) {
    return ((offset / (this.trackLength - this.handleLength) * (this.range.end - this.range.start)) + this.range.start);
  },
  getRange: function(range) {
    var v = this.values.sortBy(Prototype.K);
    range = range || 0;
    return $R(v[range], v[range + 1]);
  },
  minimumOffset: function() {
    return (this.isVertical() ? this.alignY : this.alignX);
  },
  maximumOffset: function() {
    return this.elementOffset(this.track) - (this.isVertical() ? this.alignY : this.alignX);
  },
  elementOffset: function(e) {
    return (this.isVertical() ? (e.offsetHeight != 0 ? e.offsetHeight : e.style.height.replace(/px$/, "")) : (e.offsetWidth != 0 ? e.offsetWidth : e.style.width.replace(/px$/, "")));
  },
  isVertical: function() {
    return (this.axis == 'vertical');
  },
  drawSpans: function() {
    if (this.spans) {
      $R(0, this.spans.length - 1).each(function(r) {
        this.setSpan(this.spans[r], this.getRange(r));
      }, this);
    }
    if (this.options.startSpan) {
      this.setSpan(this.options.startSpan, $R(0, this.values.length > 1 ? this.getRange(0).min() : this.value));
    }
    if (this.options.endSpan) {
      this.setSpan(this.options.endSpan, $R(this.values.length > 1 ? this.getRange(this.spans.length - 1).max() : this.value, this.maximum));
    }
  },
  setSpan: function(span, range) {
    if (this.isVertical()) {
      span.style.top = this.translateToPx(range.start);
      span.style.height = this.translateToPx(range.end - range.start + this.range.start);
    } else {
      span.style.left = this.translateToPx(range.start);
      span.style.width = this.translateToPx(range.end - range.start + this.range.start);
    }
  },
  updateStyles: function() {
    this.handles.invoke('removeClassName', 'selected');
    Element.addClassName(this.activeHandle, 'selected');
  },
  startDrag: function(event) {
    if (Event.isLeftClick(event)) {
      if (!this.disabled) {
        this.active = true;

        var handle = Event.element(event), pointer = [Event.pointerX(event), Event.pointerY(event)], track = handle, offsets;
        if (track == this.track) {
          offsets = this.track.cumulativeOffset();
          this.event = event;
          this.setValue(this.translateToValue((this.isVertical() ? pointer[1] - offsets[1] : pointer[0] - offsets[0]) - (this.handleLength / 2)));
          offsets = this.activeHandle.cumulativeOffset();
          this.offsetX = (pointer[0] - offsets[0]);
          this.offsetY = (pointer[1] - offsets[1]);
        } else {
          // find the handle (prevents issues with Safari)
          while (!this.handles.include(handle) && handle.parentNode) {
            handle = handle.parentNode;
          }

          if (this.handles.include(handle)) {
            this.activeHandle = handle;
            this.activeHandleIdx = this.handles.indexOf(this.activeHandle);
            this.updateStyles();

            offsets = this.activeHandle.cumulativeOffset();
            this.offsetX = (pointer[0] - offsets[0]);
            this.offsetY = (pointer[1] - offsets[1]);
          }
        }
      }
      Event.stop(event);
    }
  },
  update: function(event) {
    if (this.active) {
      this.dragging = true;
      this.draw(event);
      if (Prototype.Browser.WebKit) {
        window.scrollBy(0, 0);
      }
      Event.stop(event);
    }
  },
  draw: function(event) {
    var offsets = this.track.cumulativeOffset(), pointer = [Event.pointerX(event) - this.offsetX - offsets[0], Event.pointerY(event) - this.offsetY - offsets[1]];
    this.event = event;
    this.setValue(this.translateToValue(this.isVertical() ? pointer[1] : pointer[0]));
    if (this.initialized && this.options.onSlide) {
      this.options.onSlide(this.values.length > 1 ? this.values : this.value, this);
    }
  },
  endDrag: function(event) {
    if (this.active && this.dragging) {
      this.finishDrag(event, true);
      Event.stop(event);
    }
    this.active = this.dragging = false;
  },
  finishDrag: function(event, success) {
    this.active = this.dragging = false;
    this.updateFinished();
  },
  updateFinished: function() {
    if (this.initialized && this.options.onChange) {
      this.options.onChange(this.values.length > 1 ? this.values : this.value, this);
    }
    this.event = null;
  }
});
// script.aculo.us sound.js v1.9.0, Thu Dec 23 16:54:48 -0500 2010

// Copyright (c) 2005-2010 Thomas Fuchs (http://script.aculo.us, http://mir.aculo.us)
//
// Based on code created by Jules Gravinese (http://www.webveteran.com/)
//
// script.aculo.us is freely distributable under the terms of an MIT-style license.
// For details, see the script.aculo.us web site: http://script.aculo.us/

var Sound = {
  tracks: {},
  enabled: true,
  html5audio: !!window.Audio && new Audio().canPlayType,
  enable: function() {
    Sound.enabled = true;
  },
  disable: function() {
    Sound.enabled = false;
  },
  createElement: Prototype.Browser.IE ? (function(options) {
    return new Element('bgsound', {
      id: 'sound_' + options.track + '_' + options.id,
      src: options.url,
      loop: 1,
      autostart: true
    });
  }) : (function(options) {
    return this.template.evaluate(options);
  }),
  play: function(url, options) {
    if (!Sound.enabled) {
      return;
    }
    options = Object.extend({
      track: 'global',
      url: url,
      replace: false
    }, options || {});

    var sound;
    if (options.replace && this.tracks[options.track]) {
      $R(0, this.tracks[options.track].id).each(function(id) {
        sound = $('sound_' + options.track + '_' + id);
        if (Prototype.Browser.IE) {
          // mute bgsound - sometimes it replays while removing
          sound.volume = -10000;
        }
        if (sound.Stop) {
          sound.Stop();
        } else if (sound.pause) {
          sound.pause();
        }
        sound.remove();
      });
      this.tracks[options.track] = null;
    }

    if (this.tracks[options.track]) {
      this.tracks[options.track].id++;
    } else {
      this.tracks[options.track] = {
        id: 0
      };
    }

    options.id = this.tracks[options.track].id;
    sound = this.createElement(options);
    $$('body')[0].insert(sound);
  }
};

if (false && Sound.html5audio) {
  // in Firefox and Opera html5audio does not support mp3
  Sound.template = new Template('<audio id="sound_#{track}_#{id}" src="#{url}" preload="auto" autobuffer="autobuffer" autoplay="autoplay"><\/audio>');
  // Empty audio tag doesn't work in some browsers
} else if (Prototype.Browser.Gecko && navigator.userAgent.indexOf("Win") > 0) {
  (function() {
    var plugins = navigator.plugins ? $A(navigator.plugins) : null;
    function plugin(name) {
      return plugins &&
      plugins.detect(function(p) {
        return p.name.indexOf(name) != -1;
      });
    }

    if (plugin('QuickTime')) {
      Sound.template = new Template('<object id="sound_#{track}_#{id}" width="0" height="0" type="audio/mpeg" data="#{url}"><\/object>');
    } else if (plugin('Windows Media')) {
      Sound.template = new Template('<object id="sound_#{track}_#{id}" type="application/x-mplayer2" data="#{url}"><\/object>');
    } else if (plugin('RealPlayer')) {
      Sound.template = new Template('<embed id="sound_#{track}_#{id}" type="audio/x-pn-realaudio-plugin" style="height:0" src="#{url}" loop="false" autostart="true" hidden="true"><\/embed>');
    } else {
      Sound.play = function() {
      };
    }
  })();
} else if (!Prototype.Browser.IE) {
  Sound.template = new Template('<embed id="sound_#{track}_#{id}" style="height:0" src="#{url}" loop="false" autostart="true" hidden="true"><\/embed>');
}

//  // Is the soundboard created yet?
//  if (!$(randID)) {
//      $$('body')[0].insert(new Element('div', {id: randID, style: 'visibility:hidden;'}));
//      // All sounds will play from this soundboard
//  }
//  // Remove the soundboard when leaving
//  window.onbeforeunload = function() {if ($(randID)) {document.body.removeChild($(randID));}}
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
