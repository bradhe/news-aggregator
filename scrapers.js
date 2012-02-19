var jsdom = require('jsdom'), request = require('request');
var url = require('url'), _ = require('underscore');

var Task = function() {}
Task.prototype.scrape = function(complete) {
  var parseFunction = this.parse;
  var completeFunction = this.complete;

  console.log("Scraping " + this.uri);
  request({ uri: this.uri }, function(err, response, body) {
    jsdom.env({
      html: body,
      scripts: ['http://code.jquery.com/jquery-1.6.min.js']
    }, function(err, window) {
      complete(parseFunction(window.jQuery));
    });
  });
}

// This is totally ripped off from John Resig. Thanks, John!
//  - http://ejohn.org/blog/simple-javascript-inheritance/
var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
Task.extend = function(prop) {
  var _super = this.prototype;
  // Instantiate a base class (but only create the instance,
  // don't run the init constructor)
  initializing = true;
  var prototype = new this();
  initializing = false;

  // Copy the properties over onto the new prototype
  for (var name in prop) {
    // Check if we're overwriting an existing function
    prototype[name] = typeof prop[name] == "function" && 
      typeof _super[name] == "function" && fnTest.test(prop[name]) ?
      (function(name, fn){
        return function() {
          var tmp = this._super;

          // Add a new ._super() method that is the same method
          // but on the super-class
          this._super = _super[name];

          // The method only need to be bound temporarily, so we
          // remove it when we're done executing
          var ret = fn.apply(this, arguments);
          this._super = tmp;

          return ret;
        };
      })(name, prop[name]) :
      prop[name];
  }

  // The dummy class constructor
  function Task() {
    // All construction is actually done in the init method
    if (!initializing && this.init)
      this.init.apply(this, arguments);
  }

  // Populate our constructed prototype object
  Task.prototype = prototype;

  // Enforce the constructor to be what we expect
  Task.prototype.constructor = Task;

  // And make this class extendable
  Task.extend = arguments.callee;

  return Task;
}

//
// Scraper Stuff
exports.HackerNewsTask = Task.extend({
  uri: 'http://news.ycombinator.com/newest',
  parse: function(jQuery) {
    var $ = jQuery;

    var links = $('td.title a')
    return _(links).map(function(a) {
      return({title: $(a).text(), href: $(a).attr('href') });
    });
  }
});
