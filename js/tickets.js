// TODO редактировать - contenteditable
// TODO удалять
// TODO feature-test HTML5 d&d

/**
 * Карточка задачи.
 */
var Ticket = Class.create({
  template: new Template('<div class="ticket #{type}" draggable="true"><span>#{id}</span> <span contenteditable="true">#{name}</span></div>'),

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
    if ( typeof (new Element("div")).dragDrop === "function") {
      // Allow to drag any element in IE, not only A and IMG
      document.on("selectstart", ".ticket", function(event, element) {
        event.stop();
        //console.log("selectstart", event, element);
        element.dragDrop();
      });
    }

    this.onDragStart = this.onDragStart || document.on("dragstart", ".ticket", function(event, element) {
      //console.log("dragstart", event, element);
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("Text", element.identify());
    });

    this.onDragOver = this.onDragOver || document.on("dragover", ".tickets", function(event, element) {
      //console.log("dragover", event, element);
      event.stop();
      //element.addClassName("over");
      //event.dataTransfer.dropEffect = "copy";
    });

    this.onDragEnter = this.onDragEnter || document.on("dragenter", ".tickets", function(event, element) {
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

    //this.onDragLeave = this.onDragLeave || document.on("dragleave", ".tickets", function(event, element) {
    //element.removeClassName("over");
    //});

    this.onDrop = this.onDrop || document.on("drop", ".tickets", function(event, element) {
      event.stop();
      var id = event.dataTransfer.getData("Text");
      var previousContainer = $(id).up(".tickets");
      //console.log("drop", id, "from", previousContainer, "to", element);
      this.changeState(id, previousContainer, element);
      //element.removeClassName("over");
    }.bind(this));
    // FIXME use prebind

    // http://stackoverflow.com/questions/6399131/html5-draggable-and-contenteditable-not-working-together/
    // onfocus="this.parentNode.draggable = false;"
    // onblur="this.parentNode.draggable = true;"

    /*
    document.on("focusin", "[contenteditable]", function(event, element) {
      console.log("focusin", element);
      //document.designMode = "on";
    });

    document.on("focusout", "[contenteditable]", function(event, element) {
      console.log("focusout", element);
      // TODO save
      //document.designMode = "off";
    });
    */
  },

  stopObserving: function() {
    $w("onDragStart onDragOver onDragEnter onDrop").each(function(name) {
      //console.log(name, this[name]);
      this[name].stop();
      this[name] = null;
    }, this);
  },

  /**
   * Загрузка из файла JSON.
   *
   * @param {String} name
   * @param {Object} options
   */
  loadFromFile: function(name, options) {
    options = Object.extend({
      method: "get",
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
    this.loadFromJSON(response.responseJSON);
  },

  onLoadComplete: function(response) {
    $(this.containerId).removeClassName("loading");
  },

  onLoadException: function(request, exception) {
    console.log("Exception in load()", exception.message, exception);
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
