/**
 * Список задач.
 *
 * HTML5 Drag&Drop на текущий момент имеет определённые проблемы почти в каждом браузере:
 * http://thinkjs.blogspot.com/2013/01/html5-draggable-contenteditable.html
 */
var Tickets = Class.create({
  prebind: ["onDomLoaded", "onLoadCreate", "onLoadSuccess", "onLoadComplete", "onLoadException"],

  states: ["todo", "inprogress", "done"],

  initialize: function (containerId, defaultJsonFile) {
    this.containerId = containerId;
    this.defaultJsonFile = defaultJsonFile || "tickets.json";
    this.storageKey = "tickets-" + containerId;
    this.eventHandlers = {};
    if (document.loaded) {
      this.onDomLoaded();
    } else {
      document.observe("dom:loaded", this.onDomLoaded);
    }
  },

  onDomLoaded: function () {
    this.observe();
    this.loadFromLocalStorage() || this.loadFromFile();
  },

  observe: function () {
    this.stopObserving();

    if (typeof (new Element("div")).dragDrop === "function") {
      // Allow to drag any element in IE, not only A and IMG
      this.eventHandlers.onSelectStart = document.on("selectstart", ".ticket", function (event, element) {
        event.stop();
        element.dragDrop();
      });
    }

    // TODO feature-test HTML5 d&d
    this.eventHandlers.onDragStart = document.on("dragstart", ".ticket", function (event, element) {
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("Text", element.identify());
    });

    this.eventHandlers.onDragOver = document.on("dragover", ".tickets", function (event, element) {
      event.stop();
      //element.addClassName("over");
      //event.dataTransfer.dropEffect = "copy";
    });

    this.eventHandlers.onDragEnter = document.on("dragenter", ".tickets", function (event, element) {
      event.stop();
      event.dataTransfer.dropEffect = "copy";
      //element.addClassName("over");
      // TODO replace highlight with CSS3 transition
      // this will also eliminate check for element.id !== "Trash"
      if (element.id !== "Trash") {
        element.highlight({
          queue: {
            scope: "tickets-highlight " + element.className,
            limit: 1
          }
        });
      }
    });

    //this.eventHandlers.onDragLeave = document.on("dragleave", ".tickets", function(event, element) {
    //element.removeClassName("over");
    //});

    this.eventHandlers.onDrop = document.on("drop", ".tickets", function (event, element) {
      event.stop();
      var id = event.dataTransfer.getData("Text");
      var previousContainer = $(id).up(".tickets");
      this.changeState(id, previousContainer, element);
      //element.removeClassName("over");
    }.bind(this));
    // FIXME use prebind

    if (Prototype.Browser.WebKit) {
      /*document.addEventListener("focus", function focusin(event) {
       var element = Event.findElement(event);
       if (element.attr("contenteditable")) {
       var e = element.up("[draggable]");
       if (e) {e.attr("draggable", false);}
       }
       }, true);*/
      this.eventHandlers.onEditableFocusWebKit = document.on("focusin", "[contenteditable]", function (event, element) {
        var e = element.up("[draggable]");
        if (e) {
          e/*.attr("draggable", false)*/.addClassName("draggable-disabled").removeAttribute("draggable");
        }
      });

      this.eventHandlers.onEditableBlurWebKit = document.on("focusout", "[contenteditable]", function (event, element) {
        var e = element.up(".draggable-disabled");
        if (e) {
          e/*.attr("draggable", true)*/.removeClassName("draggable-disabled").setAttribute("draggable", true);
        }
      });
    }

    // TODO periodical save while editing
    this.eventHandlers.onEditableBlur = document.on("focus:out", "[contenteditable]", function (event, element) {
      var e = element.up("[draggable],.draggable-disabled");
      if (e) {
        var name = element.innerText || element.textContent;
        var ticket = Ticket.fromElement(e);
        if (ticket.name !== name) {
          //console.log("save", name);
          ticket.name = name;
          this.saveToLocalStorage();
        }
      }
    }.bind(this));
  },

  stopObserving: function () {
    var handlers = this.eventHandlers;
    for (var name in handlers) {
      if (handlers[name]) {
        handlers[name].stop();
        handlers[name] = null;
      }
    }
  },

  /**
   * Загрузка из файла JSON.
   *
   * @param {String} [name] - путь/имя файла, this.defaultJsonFile по умолчанию
   * @param {Object} [options] - опции для Ajax.Request
   */
  loadFromFile: function (name, options) {
    options = Object.extend({
      method: "get",
      requestHeaders: {
        "X-Requested-With": null,
        "X-Prototype-Version": null
      },
      // from local file:// in Firefox JSON is sent as text/plain
      evalJSON: "force",
      onCreate: this.onLoadCreate,
      onSuccess: this.onLoadSuccess,
      onComplete: this.onLoadComplete,
      onException: this.onLoadException
    }, options || {});
    new Ajax.Request(name || this.defaultJsonFile, options);
  },

  onLoadCreate: function () {
    $(this.containerId).addClassName("loading");
  },

  onLoadSuccess: function (response) {
    this.loadFromJSON(response.responseJSON);
  },

  onLoadComplete: function (response) {
    $(this.containerId).removeClassName("loading");
  },

  onLoadException: function (request, exception) {
    var message = "Exception in loadFromFile(): " + exception.message;
    if (window.console && window.console.log) {
      console.log(message, exception);
    } else {
      alert(message);
    }
  },

  loadFromJSON: function (json, doNotSave) {
    this.states.each(function (state) {
      var stateContainer = this.containerForState(state).update();
      json[state].each(this.createTicket.curry(stateContainer));
    }, this);
    if (!doNotSave) {
      this.saveToLocalStorage();
    }
  },

  changeState: function (element, fromContainer, toContainer) {
    element = $(element);
    fromContainer = $(fromContainer);
    toContainer = $(toContainer);
    if (fromContainer !== toContainer) {
      toContainer.insert(element);
      this.saveToLocalStorage();
    }
  },

  containerForState: function (state) {
    return $(this.containerId).down("." + state);
  },

  stateForContainer: function (stateContainer) {
    stateContainer = $(stateContainer);
    return this.states.find(function (state) {
      return stateContainer.hasClassName(state);
    });
  },

  createTicket: function (stateContainer, data) {
    Element.insert(stateContainer, Ticket.fromJSON(data));
  },

  createTicketFromForm: function (form) {
    // TODO валидация данных: обязательность полей, уникальность идентификатора
    form = $(form);
    var data = form.serialize(true);
    if (!data.id || !data.name) {
      return;
    }
    this.createTicket(this.containerForState("todo"), data);
    form.reset();
    this.saveToLocalStorage();
  },

  saveToLocalStorage: function () {
    // TODO feature-test localStorage
    var data = {};
    this.states.each(function (state) {
      data[state] = this.containerForState(state).select(".ticket").map(Ticket.fromElement);
    }, this);
    localStorage.setItem(this.storageKey, Object.toJSON(data));
  },

  loadFromLocalStorage: function () {
    var jsonText = localStorage.getItem(this.storageKey);
    if (!jsonText) {
      return false;
    }
    this.loadFromJSON(jsonText.evalJSON(), true);
    return true;
  }
});
