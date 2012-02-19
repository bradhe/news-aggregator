(function() {
  var socket = io.connect('http://localhost');

  var Link = Backbone.Model.extend({});

  var LinkView = Backbone.View.extend({
    tagName: 'div',
    initilize: function() {
      _.bindAll(this, 'render');
    },
    render: function() {
      var $el = $(this.el);
      $el.addClass('link');

      var a = $('<a/>');
      console.log(this.model);
      a.attr('href', this.model.get('href'));
      a.text(this.model.get('title'));
      $el.append(a);

      return this;
    }
  });

  socket.on('news:new', function(data) {
    for(var i in data) {
      if(typeof(data[i]) !== 'object') {
        continue;
      }

      // Yup.
      var model = new Link(data[i]);
      var view = new LinkView({ model: model });
      $('div#content').append(view.render().el);
    }
  });

  $('button#send').live('click', function(e) {
    var data = $(this).siblings('#data').val();

    if(data.match(/^\s*$/)) {
      // Dont do anything if this is empty.
      return;
    }

    socket.emit('message:send', { message: data });

    // Clear the input box.
    $(this).siblings('#data').val('');

    $('div#content').append(data);
  });
})();
