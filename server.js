var express = require('express'), app = express.createServer();
var scrapers = require('./scrapers');
var link_scrubber = require('./link_scrubber');

//
// App Configuration Stuff
app.configure(function(){
  app.use(express.methodOverride());
  app.use(express.bodyParser());
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.static(__dirname + '/public'));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  var oneYear = 31557600000;
  app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
  app.use(express.errorHandler());
});

app.set('view engine', 'haml-js');
app.set('view options', {
  layout: false
});

app.register('.haml', require('hamljs'));

// Actual handlers.
app.get('/', function(request, response) {
  response.render('index.haml');
});

// Maintain a list of sockets that data will be emitted back to. There must be
// a better pattern for this...
var sockets = [];
var scrubber = new link_scrubber.LinkScrubber({
  events: {
    'init:started': function() { console.log('Init Started.'); },
    'init:complete': function() { console.log('Init Complete.'); },
    'link:added': function(link) {
      console.log('Added link ' + link.href);
    }
  }
});

setInterval(function() {
  var task = new scrapers.HackerNewsTask();
  task.scrape(function(links) {
    console.log("Back from scrape with " + links.length + " links.");

    for(var i in links) {
      scrubber.addLink(links[i]);
    }
  });
}, 5000);

var io = require('socket.io').listen(app);
io.sockets.on('connection', function (socket) {
  sockets.push(socket);
});

app.listen(4000);
