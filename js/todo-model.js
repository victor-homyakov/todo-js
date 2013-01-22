/**
 * Карточка задачи.
 */
var Ticket = Class.create({
  template: new Template('<div class="ticket #{type}" draggable="true"><span class="id">#{id}</span> <span>#{name}</span></div>'),

  /*initialize: function(json) {
   this.id = json.id;
   this.name = json.name;
   this.type = (json.type == "bug") ? "bug" : "task";
   },*/

  initialize: function(id, name, type) {
    this.id = id;
    this.name = name;
    this.type = (type == "bug") ? "bug" : "task";
  },

  /*toString: function() {
   return "Ticket #{id} (#{type}): #{name}".interpolate(this);
   },*/

  toHTML: function() {
    return this.template.evaluate(this);
  }
});

Object.extend(Ticket, {
  fromJSON: function(json) {
    return new Ticket(json.id, json.name, json.type);
  },
  idFromElement: function(element) {
    element = $(element).down(".id");
    return element.innerText || element.textContent;
  }
});

/**
 * Возможны две реализации:
 *
 * 1. Три коллекции (под одной на состояния todo, in progress, done). Изменение состояния реализуется
 *    перемещением соответствующего Ticket из одной коллекции в другую.
 *
 * 2. Одна коллекция. Состояние запоминается в дополнительном поле каждого объекта Ticket.
 */
var Tickets = Class.create({
  prebind: ["onLoadCreate", "onLoadSuccess", "onLoadComplete", "onLoadException"],

  states: ["todo", "inprogress", "done"],
  todo: [],
  inprogress: [],
  done: [],

  initialize: function(containerId) {
    this.containerId = containerId;
    if (document.loaded) {
      this.observe();
    } else {
      document.observe("dom:loaded", this.observe.bind(this));
    }
  },

  observe: function() {
    if ( typeof (new Element("div")).dragDrop === "function") {
      document.on("selectstart", ".ticket", function(event, element) {
        // Allow to drag any element in IE, not only A and IMG
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
  },

  stopObserving: function() {
    $w("onDragStart onDragOver onDragEnter onDrop").each(function(name) {
      //console.log(name, this[name]);
      this[name].stop();
      this[name] = null;
    }, this);
  },

  /**
   * Загрузка из JSON.
   *
   * @param {String} name
   * @param {Object} options
   */
  load: function(name, options) {
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
    //console.log(response.responseJSON);
    this.loadFromJSON(response.responseJSON);
  },

  onLoadComplete: function(response) {
    $(this.containerId).removeClassName("loading");
  },

  onLoadException: function(request, exception) {
    console.log("Exception in load()", exception.message, exception);
  },

  loadFromJSON: function(json) {
    // можно создавать новые полноценные объекты Ticket,
    // а можно просто сменить прототип, т.к. поля полностью совпадают
    //ticket.__proto__ = Ticket.prototype;
    this.states.each(function(state) {
      this[state] = json[state].map(Ticket.fromJSON);
    }, this);
    this.render();
  },

  changeState: function(element, fromContainer, toContainer) {
    element = $(element);
    var ticketId = Ticket.idFromElement(element);
    var fromState = this.stateForContainer(fromContainer);
    var toState = this.stateForContainer(toContainer);
    if (fromState === toState) {
      return;
    }
    var ticket;
    for (var i = 0, len = this[fromState].length; i < len; ++i) {
      if (this[fromState][i].id === ticketId) {
        ticket = this[fromState].splice(i, 1)[0];
        break;
      }
    }
    /*var ticket = this[fromState].find(function(t) {
     return t.id === ticketId;
     });*/
    console.log("changeState", ticketId, ticket, fromState, toState);
    if (ticket) {
      element.remove();
      this[toState].push(ticket);
      this.insertTicket(toContainer, ticket);
    }
    //this.render();
  },

  /**
   * Insert new ticket into container.
   */
  insertTicket: function(stateContainer, ticket) {
    //console.log(ticket);
    $(stateContainer).insert({
      bottom: ticket
    });
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

  /**
   * Render all tickets.
   */
  render: function() {
    var container = $(this.containerId);
    this.states.each(function(state) {
      var stateContainer = this.containerForState(state).update();
      this[state].each(this.insertTicket.curry(stateContainer), this);
    }, this);
  }
});
