var test = require('./test'),
    tape = require('tape');

test(tape, {
  env: function(html, scripts, callback) {
    var iframe = document.createElement('iframe');
    document.getElementsByTagName('body')[0].appendChild(iframe);
    iframe.contentWindow.document.write(html);
    callback(undefined, iframe.contentWindow);
  }
});
