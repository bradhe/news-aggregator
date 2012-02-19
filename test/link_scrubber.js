var nodeunit = require('nodeunit');
var link_scrubber = require('../link_scrubber')

exports.checkForKeyspace = function(test) {
  var scrubber = link_scrubber.LinkScrubber({
    events: {
      'init:started': function() {
        console.log('Starting init...');
      },
      'init:complete': function() {
        expect.ok(true);
        test.done();
      }
    }
  });
}
