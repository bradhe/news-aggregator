var cassandra = require('cassandra-client');
var crypto = require('crypto');

//
// Link scrubber. Makes sure that we don't emit duplicate links back
// to clients. Backed by Cassandra.
exports.LinkScrubber = function(opts) {
  var keyspaceName = 'RealTimeNews';

  // Keep track of all the events!
  var events = {};
  this.bind = function(event, callback) {
    events[event] = events[event] || [];
    events[event].push(callback);
  }

  this.trigger = function() {
    var event = arguments[0];
    var args = Array.prototype.slice.call(arguments, 1);

    if(events[event]) {
      for(var i in events[event]) {
        events[event][i].apply(this, args);
      }
    }
  }

  function checkKeyspace(after) {
    var System = cassandra.System;
    var sys = new System('127.0.0.1:9160');
    that.trigger('init:started');

    // Make sure the keyspace is there.
    sys.describeKeyspace(keyspaceName, function(err, def) {
      if(err) {
        // Map Service -> Stories
        var recentStories = new cassandra.CfDef({
          keyspace: keyspaceName,
          name: 'RecentStories',
          column_type: 'Standard',
          comparator_type: 'TimeUUIDType',
          default_validation_class: 'UTF8Type',
          key_validation_class: 'UTF8Type'
        });

        // Map Stories -> Details
        var storyDetails = new cassandra.CfDef({
          keyspace: keyspaceName,
          name: 'StoryDetails',
          column_type: 'Standard',
          comparator_type: 'UTF8Type',
          default_validation_class: 'UTF8Type',
          key_validation_class: 'UTF8Type'
        });

        var keyspace = new cassandra.KsDef({
          name: keyspaceName,
          strategy_class: 'org.apache.cassandra.locator.SimpleStrategy',
          strategy_options: {'replication_factor': '1'},
          cf_defs: [storyDetails, recentStories]
        });

        // Create the keyspace.
        sys.addKeyspace(keyspace, function(err, def) {
          after();
        });
      } else {
        after();
      }
    });
  }

  // Will not complete by the time this is done but...should be OK otherwise.
  var that = this;
  checkKeyspace(function() {
    that.trigger('init:complete');

    that._cassandra = new cassandra.Connection({
      host:'127.0.0.1',
      port:9160,
      keyspace:keyspaceName,
    });

    if(!that._cassandra.client) {
      throw "Failed to connect to keyspace "+keyspaceName+" in Cassandra.";
    }
  });

  //
  // Add a story to the database. If the story is already in the database,
  // don't duplicate it.  If the story is not in the database.
  this.addLink = function(link) {
    var md5 = crypto.createHash('sha256');
    md5.update(link.href);

    var key = md5.digest('hex');

    // If this exists, don't do anything. Otherwise, insert it and fire the event!
    var that = this;

    try {
      this._cassandra.execute('SELECT ? FROM StoryDetails WHERE KEY = ?', ['href', key], function(err, rows) {
        if(err) {
          console.log("Error during read. " + err);
        }
        else {
          that.trigger('link:added', link);
          console.log("Link " + link.href + " does not exist in the db! Hurray!");
        }
      });
    } catch(e) {
      console.log(e.stack);
    }
  }

  opts = opts || {};
  if(opts.events) {
    for(var i in opts.events) {
      this.bind(i, opts.events[i]);
    }
  }
};
