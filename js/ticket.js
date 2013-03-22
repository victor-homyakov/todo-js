/**
 * Карточка задачи.
 */
var Ticket = Class.create({
  template: new Template('<div class="ticket #{type}" draggable="true"><div>#{id}<\/div><div contenteditable="true">#{name}<\/div><\/div>'),

  initialize: function (id, name, type) {
    this.id = id;
    this.name = name;
    this.type = (type == "bug") ? "bug" : "task";
  },

  /*toString: function() {
   return "Ticket #{id} (#{type}): #{name}".interpolate(this);
   },*/

  toElement: function () {
    return new Element("div").update(this.toHTML()).down().store(Ticket.STORAGE_KEY, this);
  },

  toHTML: function () {
    return this.template.evaluate(this);
  }
});

Object.extend(Ticket, {
  STORAGE_KEY: "ticket",

  fromJSON: function (json) {
    return new Ticket(json.id, json.name, json.type);
  },

  fromElement: function (element) {
    return $(element).retrieve(Ticket.STORAGE_KEY);
  }
});
