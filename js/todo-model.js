var TicketModel = Class.create({
  template: new Template('<div class="#{type}"><span>#{id}</span><span>#{name}</span></div>'),

  initialize: function(id, name, type) {
    this.id = id;
    this.name = name;
    this.type = (type == "bug") ? "bug" : "task";
  },

  toHTML: function() {
    return this.template.evaluate(this);
  }
});
