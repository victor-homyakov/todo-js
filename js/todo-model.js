var Ticket = Class.create({
  template: new Template('<div class="#{type}"><span>#{id}</span> <span>#{name}</span></div>'),

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

/**
 * Возможны две реализации:
 *
 * 1. Три коллекции (под одной на состояния todo, in progress, done). Изменение состояния реализуется
 *    перемещением соответствующего Ticket из одной коллекции в другую.
 *
 * 2. Одна коллекция. Состояние запоминается в дополнительном поле каждого объекта Ticket.
 */
var Tickets = Class.create({
  prebind: ["onLoadCreate", "onLoadSuccess", "onLoadComplete"],

  todo: [],
  inprogress: [],
  done: [],

  initialize: function(container) {
    this.container = container;
  },

  load: function(name, options) {
    options = Object.extend({
      method: "get",
      onCreate: this.onLoadCreate,
      onSuccess: this.onLoadSuccess,
      onComplete: this.onLoadComplete,
      onException: function(request, exception) {
        console.log("Exception in load()", exception.message, exception);
      }
    }, options || {});
    new Ajax.Request(name, options);
  },

  onLoadCreate: function() {
    $(this.container).addClassName("loading");
  },

  onLoadSuccess: function(response) {
    //console.log(response.responseJSON);
    this.fromJSON(response.responseJSON);
  },

  onLoadComplete: function(response) {
    $(this.container).removeClassName("loading");
  },

  fromJSON: function(json) {
    this.todo = json.todo || [];
    this.inprogress = json.inprogress || [];
    this.done = json.done || [];
    this.render();
  },

  render: function() {
    var container = $(this.container);
    ["todo", "inprogress", "done"].each(function(type) {
      var typeContainer = container.down("." + type);
      //console.log(type, typeContainer);
      typeContainer.update();
      this[type].each(function(ticket) {
        // можно создавать новые полноценные объекты Ticket в fromJSON()
        // а можно просто сменить прототип, т.к. поля полностью совпадают
        ticket.__proto__ = Ticket.prototype;
        //console.log(ticket);
        typeContainer.insert({
          bottom: ticket
        });
      });
    }, this);
  }
});
