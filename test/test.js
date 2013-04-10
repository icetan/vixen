var vixen = require('../');

function getBody(window) {
  return window.document.getElementsByTagName('body')[0];
}

module.exports = function(test, jsdom) {
  test('should reflect view model changes in div', function(t) {
    jsdom.env(
      '<html><body><div id="test">{{test}}</div></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test');
        viewModel.test = 'lol'
        t.equal(div.textContent, 'lol');
      }
    );
    t.plan(1);
  });

  test('should reflect view model changes in attribute', function(t) {
    jsdom.env(
      '<html><body><input type="text" id="test" value="{{test}}"></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            input = window.document.getElementById('test');
        viewModel.test = 'lol'
        t.equal(input.value, 'lol');
      }
    );
    t.plan(1);
  });

  test('should render nested values in view model', function(t) {
    jsdom.env(
      '<html><body><div id="test">{{test.a}} and {{test.b}}</div></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test');
        viewModel.test = {a:'lol', b:'rofl'};
        t.equal(div.textContent, 'lol and rofl');
      }
    );
    t.plan(1);
  });

  test('should iterate list values in view model', function(t) {
    jsdom.env(
      '<html><body><for value="test" in="tests"><i>{{test}}</i></for></body></html>', [],
      function(err, window) {
        window.document.createElement('for');
        var body = getBody(window),
            viewModel = vixen(body);
        viewModel.extend({tests: ['lol', 'rofl', 'omg']});
        t.equal(body.children.length, 3);
        t.equal(body.textContent, 'lolroflomg');
      }
    );
    t.plan(2);
  });

  test('should iterate object values in view model', function(t) {
    jsdom.env(
      '<html><body><for value="test" key="i" in="tests"><b>{{i}}</b>:<i>{{test}},</i></for></body></html>', [],
      function(err, window) {
        var body = getBody(window),
            viewModel = vixen(body);
        viewModel.extend({tests: {a:'lol', b:'rofl', c:'omg'}});
        t.equal(body.children.length, 6);
        t.equal(body.textContent, 'a:lol,b:rofl,c:omg,');
      }
    );
    t.plan(2);
  });

  test('should iterate values in nested list', function(t) {
    jsdom.env(
      '<html><body><for value="test" key="i" in="p.tests"><i>{{i}}:{{test}},</i></for></body></html>', [],
      function(err, window) {
        var body = getBody(window),
            viewModel = vixen(body);
        viewModel.extend({p: {tests: ['lol', 'rofl', 'omg']}});
        t.equal(body.children.length, 3);
        t.equal(body.textContent, '0:lol,1:rofl,2:omg,');
      }
    );
    t.plan(2);
  });

  test('should execute for-each function specified by data-each attribute and filter', function(t) {
    jsdom.env(
      '<html><body><for each="foeach" value="test" in="tests"><i>{{test}}</i></for></body></html>', [],
      function(err, window) {
        var body = getBody(window),
            viewModel = vixen(body),
            count = 0;
        viewModel.extend({
          foeach: function(value, i, context, els) {
            t.ok(els instanceof Array);
            t.ok(els[0] instanceof window.HTMLElement);
            t.equal(typeof value, 'string');
            t.equal(i, ''+count++);
            if (value === 'rofl') return false;
          },
          tests: ['lol', 'rofl', 'omg']
        });
        t.equal(body.children.length, 2);
        t.equal(body.textContent, 'lolomg');
      }
    );
    t.plan(4*3 + 2);
  });

  test('should attach each element before for-each function and remove after if filtered', function(t) {
    jsdom.env(
      '<html><body><for each="foeach" value="test" key="i" in="tests">{{i}}: <i>{{test}}</i></for></body></html>', [],
      function(err, window) {
        var body = getBody(window),
            viewModel = vixen(body);
        viewModel.extend({
          foeach: function(value, i, context, els) {
            t.ok(els[0].parentNode);
            if (value === 'rofl') return false;
          },
          tests: ['lol', 'rofl', 'omg']
        });
        t.equal(body.children.length, 2);
        t.equal(body.textContent, '0: lol2: omg');
      }
    );
    t.plan(1*3 + 2);
  });

  test('should attach each element before for-each function and remove after if filtered with on element iterator', function(t) {
    jsdom.env(
      '<html><body><div id="test" data-each="foeach" data-value="test" data-key="i" data-in="tests">{{i}}: <i>{{test}}</i></div></body></html>', [],
      function(err, window) {
        var div = window.document.getElementById('test'),
            viewModel = vixen(getBody(window));
        viewModel.extend({
          foeach: function(value, i, context, els) {
            t.ok(els[0].parentNode);
            if (value === 'rofl') return false;
          },
          tests: ['lol', 'rofl', 'omg']
        });
        t.equal(div.children.length, 2);
        t.equal(div.textContent, '0: lol2: omg');
      }
    );
    t.plan(1*3 + 2);
  });

  test('should iterate over new style iterator and re-iterate without traces', function(t) {
    jsdom.env(
      '<html><body>before<for value="val" key="i" in="stuff">{{i}}:<i>{{val}}</i>,</for>after</body></html>', [],
      function(err, window) {
        var body = getBody(window),
            viewModel = vixen(body).extend({
              stuff: [3,5,1,2]
            });
        t.equal(body.textContent, 'before0:3,1:5,2:1,3:2,after');
        viewModel.stuff = {z:8,x:'yo',y:true};
        t.equal(body.textContent, 'beforez:8,x:yo,y:true,after');
      }
    );
    t.plan(2);
  });

  test('should create elements inside <select>', function(t) {
    jsdom.env(
      '<html><body><select id="test" value="{{sel}}" data-value="val" data-key="i" data-in="stuff"><option value="{{i}}">{{val}}</select></body></html>', [],
      function(err, window) {
        var body = getBody(window),
            select = window.document.getElementById('test'),
            viewModel = vixen(body).extend({
              stuff: {
                a: 'hello',
                b: 'mushi mushi',
                c: 'hej'
              }
            });
        t.equal(select.children.length, 3);
        viewModel.stuff = {
          d: 'good bye',
          e: 'hejdå'
        };
        t.equal(select.children.length, 2);
        t.notEqual(viewModel.sel, undefined);
      }
    );
    t.plan(3);
  });

  test('should keep each iterated item in it\'s render scope so handlers are mapped correctly', function(t) {
    jsdom.env(
      '<html><body><for value="thing" key="i" in="stuff">{{i}}:<i id="thing-{{i}}" onclick="{{thing.on}}">{{thing.id}}</i>,</for></body></html>', [],
      function(err, window) {
        var body = getBody(window),
            evt = window.document.createEvent("HTMLEvents"),
            count = 1,
            result = 1,
            viewModel = vixen(body).extend({
              stuff: [
                {
                  id: 'first',
                  on: function() {
                    t.ok(true);
                  }
                },
                {
                  id: 'second',
                  on: function() {
                    t.ok(false);
                  }
                }
              ]
            }),
            first = window.document.getElementById('thing-0'),
            second = window.document.getElementById('thing-1');
        t.equal(body.textContent, '0:first,1:second,');
        t.doesNotThrow(function() {
          var err;
          evt.initEvent('click', true, true);
          first.dispatchEvent(evt);
        });
      }
    );
    t.plan(3);
  });

  test('should fire event handlers', function(t) {
    jsdom.env(
      '<html><body><div id="test" onclick="{{handler}} {{ handler.extra }}"></div></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test'),
            evt = window.document.createEvent("HTMLEvents");
        viewModel.handler = function() {
          t.ok(true);
        };
        viewModel.handler.extra = function() {
          t.ok(true);
        };
        t.doesNotThrow(function() {
          var err;
          evt.initEvent('click', true, true);
          div.dispatchEvent(evt);
        });
      }
    );
    t.plan(3);
  });

  test('should fire event handlers and give correct value', function(t) {
    jsdom.env(
      '<html><body><input type=text id="test" onchange="{{handler}}"></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            input = window.document.getElementById('test'),
            evt = window.document.createEvent("HTMLEvents");
        viewModel.handler = function(e, value) {
          t.equal(value, 'lulz!');
          t.deepEqual(e, evt);
        };
        input.value = 'lulz!';
        t.doesNotThrow(function() {
          var err;
          evt.initEvent('change', true, true);
          input.dispatchEvent(evt);
        });
      }
    );
    t.plan(3);
  });

  test('should chain values through functions', function(t) {
    jsdom.env(
      '<html><body><div id="test">{{value | format}}kr</div></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test');
        viewModel.extend({
          value: 10.1425,
          format: function(value) {
            t.equal(value, 10.1425);
            return Math.round(value);
          }
        });
        t.equal(div.textContent, '10kr');
      }
    );
    t.plan(2);
  });

  test('should remove all curlies', function(t) {
    jsdom.env(
      '<html><body><div id="test" class="error {{status}}"><b>Error</b>: {{message}}</div></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test');
        t.equal(div.textContent, 'Error: ');
        t.equal(div.className, 'error ');
      }
    );
    t.plan(2);
  });

  test('should remove event attributes', function(t) {
    jsdom.env(
      '<html><body><button id="test" onclick="{{click}}">Click me!</button></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            button = window.document.getElementById('test');
        t.equal(button.getAttribute('onclick'), null);
      }
    );
    t.plan(1);
  });

  test('should not traverse child elements with data-subview attribute', function(t) {
    jsdom.env(
      '<html><body><div id="test" data-subview>{{lol}}</div></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test');
        viewModel.lol = 'meh';
        t.equal(div.textContent, '{{lol}}');
      }
    );
    t.plan(1);
  });

  test('should traverse root element even though it has a data-subview attribute', function(t) {
    jsdom.env(
      '<html><body data-subview><div id="test">{{lol}}</div></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test');
        viewModel.lol = 'meh';
        t.equal(div.textContent, 'meh');
      }
    );
    t.plan(1);
  });

  test('should handle bi-directional properties for attributes', function(t) {
    jsdom.env(
      '<html><body><input id="test" value="{{val}}"></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            input = window.document.getElementById('test');
        viewModel.val = 'jimmyrofl';
        t.equal(input.value, 'jimmyrofl');
        input.value = 'tommylol';
        t.equal(viewModel.val, 'tommylol');
        viewModel.val = 'tripledouble';
        t.equal(input.value, 'tripledouble');
      }
    );
    t.plan(3);
  });

  test('should handle bi-directional attributes for boolean attributes', function(t) {
    jsdom.env(
      '<html><body><input id="test" type="checkbox" checked="{{checked}}"></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            input = window.document.getElementById('test');
        t.equal(input.checked, true);
        t.equal(viewModel.checked, true);
        viewModel.checked = false;
        t.equal(input.checked, false);
        t.equal(viewModel.checked, false);
        input.click();
        t.equal(input.checked, true);
        t.equal(viewModel.checked, true);
        input.click();
        t.equal(input.checked, false);
        t.equal(viewModel.checked, false);
      }
    );
    t.plan(8);
  });

  test('should only add bi-directional bindings for non-templated attributes', function(t) {
    jsdom.env(
      '<html><body><input id="test" type="text" value="{{text}}{{moreText}}" class="large {{classes}}"></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            input = window.document.getElementById('test');
        t.equal(viewModel.text, undefined);
        input.value = 'strunt';
        t.equal(viewModel.text, undefined);
        t.equal(input.className, 'large ');
        t.equal(viewModel.classes, undefined);
        viewModel.classes = 'valid';
        t.equal(input.className, 'large valid');
        t.equal(viewModel.classes, 'valid');
      }
    );
    t.plan(6);
  });

  test('should not ignore falsy values in string templates', function(t) {
    jsdom.env(
      '<html><body><a id="link" href="http://bla/{{id}}">{{text}} {{id}}</a></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            link = window.document.getElementById('link');
        viewModel.id = 0;
        viewModel.text = false;
        t.equal(link.textContent, 'false 0');
        t.equal(link.href, 'http://bla/0');
        t.equal(viewModel.id, 0);
        t.equal(viewModel.text, false);
      }
    );
    t.plan(4);
  });

  test('should be possible to pass values on construction of view model', function(t) {
    jsdom.env(
      '<html><body><a id="link" href="http://bla/{{id}}">{{text}} {{id}}</a><for value="item" in="items">{{item}}</for></body></html>', [],
      function(err, window) {
        var body = getBody(window),
            viewModel = vixen(body, {
              id: 'lol',
              text: 'apa',
              items: [ 1,2,3 ]
            }),
            link = window.document.getElementById('link');
        t.equal(link.textContent, 'apa lol');
        t.equal(link.href, 'http://bla/lol');
        t.equal(viewModel.id, 'lol');
        t.equal(viewModel.text, 'apa');
        t.equal(body.textContent, 'apa lol123');
      }
    );
    t.plan(5);
  });

  test('should not call chaining functions with empty values or unnecessarily in iterators', function(t) {
    jsdom.env(
      '<html><body><for value="thing" key="i" in="stuff"><div class="{{i | alt}}">{{thing}}</div></for></body></html>', [],
      function(err, window) {
        var body = getBody(window),
            viewModel = vixen(body, {
              alt: function(i) {
                t.notOk(isNaN(i));
                return i % 2 === 0 ? 'even' : 'odd';
              },
              stuff: [ 'first', 'second' ]
            });
        t.equal(body.textContent, 'firstsecond');
        t.equal(body.children[0].className, 'even');
        t.equal(body.children[1].className, 'odd');
      }
    );
    t.plan(2 + 3);
  });
};
