// TODO удалять
// TODO feature-test HTML5 d&d

/**
 * Карточка задачи.
 */
var Ticket = Class.create({
  template: new Template('<div class="ticket #{type}" draggable="true"><div>#{id}<\/div><div contenteditable="true">#{name}<\/div><\/div>'),

  initialize: function(id, name, type) {
    this.id = id;
    this.name = name;
    this.type = (type == "bug") ? "bug" : "task";
  },

  /*toString: function() {
   return "Ticket #{id} (#{type}): #{name}".interpolate(this);
   },*/

  toElement: function() {
    return new Element("div").update(this.toHTML()).down().store(Ticket.STORAGE_KEY, this);
  },

  toHTML: function() {
    return this.template.evaluate(this);
  }
});

Object.extend(Ticket, {
  STORAGE_KEY: "ticket",

  fromJSON: function(json) {
    return new Ticket(json.id, json.name, json.type);
  },

  fromElement: function(element) {
    return $(element).retrieve(Ticket.STORAGE_KEY);
  }
});

/**
 * Список задач.
 *
 * HTML5 Drag&Drop на текущий момент имеет определённые проблемы почти в каждом браузере:
 * http://thinkjs.blogspot.com/2013/01/html5-draggable-contenteditable.html
 */
var Tickets = Class.create({
  prebind: ["onDomLoaded", "onLoadCreate", "onLoadSuccess", "onLoadComplete", "onLoadException"],

  states: ["todo", "inprogress", "done"],

  initialize: function(containerId) {
    this.containerId = containerId;
    this.storageKey = "tickets-" + containerId;
    if (document.loaded) {
      this.onDomLoaded();
    } else {
      document.observe("dom:loaded", this.onDomLoaded);
    }
  },

  onDomLoaded: function() {
    this.observe();
    this.loadFromLocalStorage() || this.loadFromFile("tickets.json");
  },

  observe: function() {
    this.stopObserving();

    if ( typeof (new Element("div")).dragDrop === "function") {
      // Allow to drag any element in IE, not only A and IMG
      document.on("selectstart", ".ticket", function(event, element) {
        event.stop();
        //console.log("selectstart", event, element);
        element.dragDrop();
      });
    }

    this.onDragStart = document.on("dragstart", ".ticket", function(event, element) {
      //console.log("dragstart", event, element);
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("Text", element.identify());
    });

    this.onDragOver = document.on("dragover", ".tickets", function(event, element) {
      //console.log("dragover", event, element);
      event.stop();
      //element.addClassName("over");
      //event.dataTransfer.dropEffect = "copy";
    });

    this.onDragEnter = document.on("dragenter", ".tickets", function(event, element) {
      //console.log("dragenter", event, element);
      event.stop();
      event.dataTransfer.dropEffect = "copy";
      //element.addClassName("over");
      // TODO replace highlight with CSS3 transition
      element.highlight({
        queue: {
          scope: "tickets-highlight " + element.className,
          limit: 1
        }
      });
    });

    //this.onDragLeave = document.on("dragleave", ".tickets", function(event, element) {
    //element.removeClassName("over");
    //});

    this.onDrop = document.on("drop", ".tickets", function(event, element) {
      event.stop();
      var id = event.dataTransfer.getData("Text");
      var previousContainer = $(id).up(".tickets");
      //console.log("drop", id, "from", previousContainer, "to", element);
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
      this.onEditableFocusWebKit = document.on("focusin", "[contenteditable]", function(event, element) {
        var e = element.up("[draggable]");
        if (e) {
          e/*.attr("draggable", false)*/.addClassName("draggable-disabled").removeAttribute("draggable");
        }
        //console.log("focusin", element, e);
      });

      this.onEditableBlurWebKit = document.on("focusout", "[contenteditable]", function(event, element) {
        var e = element.up(".draggable-disabled");
        if (e) {
          e/*.attr("draggable", true)*/.removeClassName("draggable-disabled").setAttribute("draggable", true);
        }
        //console.log("focusout", element, e);
      });
    }

    // TODO periodical save while editing
    this.onEditableBlur = document.on("focus:out", "[contenteditable]", function(event, element) {
      var e = element.up("[draggable],.draggable-disabled");
      if (e) {
        var name = element.innerText || element.textContent;
        var ticket = Ticket.fromElement(e);
        if (ticket.name !== name) {
          console.log("save", name);
          ticket.name = name;
          this.saveToLocalStorage();
        }
      }
    }.bind(this));
  },

  stopObserving: function() {
    $w("onDragStart onDragOver onDragEnter onDrop onEditableFocusWebKit onEditableBlurWebKit onEditableBlur").each(function(name) {
      //console.log(name, this[name]);
      if (this[name]) {
        this[name].stop();
        this[name] = null;
      }
    }, this);
  },

  /**
   * Загрузка из файла JSON.
   *
   * @param {String} name
   * @param {Object} [options]
   */
  loadFromFile: function(name, options) {
    options = Object.extend({
      method: "get",
      requestHeaders: {
        "X-Requested-With": null,
        "X-Prototype-Version": null
      },
      onCreate: this.onLoadCreate,
      onSuccess: this.onLoadSuccess,
      onComplete: this.onLoadComplete,
      onException: this.onLoadException
    }, options || {});
    new Ajax.Request(name, options);
  },

  onLoadCreate: function() {
    $(this.containerId).addClassName("loading");
  },

  onLoadSuccess: function(response) {
    // TODO maybe explicit fromJSON() for non-json response types
    // when json is sent as text/plain etc.
    this.loadFromJSON(response.responseJSON);
  },

  onLoadComplete: function(response) {
    $(this.containerId).removeClassName("loading");
  },

  onLoadException: function(request, exception) {
    console.log("Exception in loadFromFile():", exception.message, exception);
  },

  loadFromJSON: function(json, doNotSave) {
    this.states.each(function(state) {
      var stateContainer = this.containerForState(state).update();
      //json[state].map(Ticket.fromJSON).each(Element.insert.curry(stateContainer));
      json[state].each(this.createTicket.curry(stateContainer));
    }, this);
    if (!doNotSave) {
      this.saveToLocalStorage();
    }
  },

  changeState: function(element, fromContainer, toContainer) {
    element = $(element);
    fromContainer = $(fromContainer);
    toContainer = $(toContainer);
    if (fromContainer === toContainer) {
      return;
    }
    //console.log("changeState", element, fromContainer, toContainer);
    toContainer.insert(element);
    this.saveToLocalStorage();
  },

  containerForState: function(state) {
    return $(this.containerId).down("." + state);
  },

  stateForContainer: function(stateContainer) {
    stateContainer = $(stateContainer);
    return this.states.find(function(state) {
      return stateContainer.hasClassName(state);
    });
  },

  createTicket: function(stateContainer, data) {
    Element.insert(stateContainer, Ticket.fromJSON(data));
  },

  createTicketFromForm: function(form) {
    // TODO валидация данных: обязательность полей, уникальность идентификатора
    form = $(form);
    var data = form.serialize(true);
    if (!data.id || !data.name) {
      return;
    }
    //console.log("createTicketFromForm", data);
    this.createTicket(this.containerForState("todo"), data);
    form.reset();
    this.saveToLocalStorage();
  },

  saveToLocalStorage: function() {
    // TODO feature-test localStorage
    var data = {};
    this.states.each(function(state) {
      data[state] = this.containerForState(state).select(".ticket").map(Ticket.fromElement);
    }, this);
    localStorage.setItem(this.storageKey, Object.toJSON(data));
  },

  loadFromLocalStorage: function() {
    var jsonText = localStorage.getItem(this.storageKey);
    if (!jsonText) {
      return false;
    }
    this.loadFromJSON(jsonText.evalJSON(), true);
    return true;
  }
});
