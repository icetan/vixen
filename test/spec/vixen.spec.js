var jsdom = require('jsdom'),
    vixen = require('../../');

function getBody(window) {
  return window.document.getElementsByTagName('body')[0];
}

describe('vixen', function () {
  it('should reflect view model changes in div', function (done) {
    jsdom.env(
      '<html><body><div id="test">{{test}}</div></body></html>', [],
      function (err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test');
        viewModel.test = 'lol'
        expect(div.textContent).toBe('lol');
        done&&done();
      }
    );
  });

  it('should reflect view model changes in attribute', function (done) {
    jsdom.env(
      '<html><body><input type="text" id="test" value="{{test}}"></body></html>', [],
      function (err, window) {
        var viewModel = vixen(getBody(window)),
            input = window.document.getElementById('test');
        viewModel.test = 'lol'
        expect(input.value).toBe('lol');
        done&&done();
      }
    );
  });

  it('should render nested values in view model', function (done) {
    jsdom.env(
      '<html><body><div id="test">{{test.a}} and {{test.b}}</div></body></html>', [],
      function (err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test');
        viewModel.test = {a:'lol', b:'rofl'};
        expect(div.textContent).toBe('lol and rofl');
        done&&done();
      }
    );
  });

  it('should iterate list values in view model', function (done) {
    jsdom.env(
      '<html><body><for value="test" in="tests"><i>{{test}}</i></for></body></html>', [],
      function (err, window) {
        window.document.createElement('for');
        var body = getBody(window),
            viewModel = vixen(body);
        viewModel.extend({tests: ['lol', 'rofl', 'omg']});
        expect(body.children.length).toBe(3);
        expect(body.textContent).toBe('lolroflomg');
        done&&done();
      }
    );
  });

  it('should iterate object values in view model', function (done) {
    jsdom.env(
      '<html><body><for value="test" key="i" in="tests"><b>{{i}}</b>:<i>{{test}},</i></for></body></html>', [],
      function (err, window) {
        var body = getBody(window),
            viewModel = vixen(body);
        viewModel.extend({tests: {a:'lol', b:'rofl', c:'omg'}});
        expect(body.children.length).toBe(6);
        expect(body.textContent).toBe('a:lol,b:rofl,c:omg,');
        done&&done();
      }
    );
  });

  it('should iterate values in nested list', function (done) {
    jsdom.env(
      '<html><body><for value="test" key="i" in="p.tests"><i>{{i}}:{{test}},</i></for></body></html>', [],
      function (err, window) {
        var body = getBody(window),
            viewModel = vixen(body);
        viewModel.extend({p: {tests: ['lol', 'rofl', 'omg']}});
        expect(body.children.length).toBe(3);
        expect(body.textContent).toBe('0:lol,1:rofl,2:omg,');
        done&&done();
      }
    );
  });

  it('should execute for-each function specified by data-each attribute and filter', function (done) {
    jsdom.env(
      '<html><body><for each="foeach" value="test" in="tests"><i>{{test}}</i></for></body></html>', [],
      function (err, window) {
        var body = getBody(window),
            viewModel = vixen(body),
            count = 0;
        viewModel.extend({
          foeach: function (value, i, context, els) {
            expect(els instanceof Array).toBe(true);
            expect(els[0] instanceof window.HTMLElement).toBe(true);
            expect(typeof value).toBe('string');
            expect(i).toBe(''+count);
            count++;
            if (value === 'rofl') return false;
          },
          tests: ['lol', 'rofl', 'omg']
        });
        expect(count).toBe(3);
        expect(body.children.length).toBe(2);
        expect(body.textContent).toBe('lolomg');
        done&&done();
      }
    );
  });

  it('should attach each element before for-each function and remove after if filtered', function (done) {
    jsdom.env(
      '<html><body><for each="foeach" value="test" key="i" in="tests">{{i}}: <i>{{test}}</i></for></body></html>', [],
      function (err, window) {
        var body = getBody(window),
            viewModel = vixen(body);
        viewModel.extend({
          foeach: function (value, i, context, els) {
            expect(els[0].parentNode).toBeTruthy();
            if (value === 'rofl') return false;
          },
          tests: ['lol', 'rofl', 'omg']
        });
        expect(body.children.length).toBe(2);
        expect(body.textContent).toBe('0: lol2: omg');
        done&&done();
      }
    );
  });

  it('should attach each element before for-each function and remove after if filtered with on element iterator', function (done) {
    jsdom.env(
      '<html><body><div id="test" data-each="foeach" data-value="test" data-key="i" data-in="tests">{{i}}: <i>{{test}}</i></div></body></html>', [],
      function (err, window) {
        var div = window.document.getElementById('test'),
            viewModel = vixen(getBody(window));
        viewModel.extend({
          foeach: function (value, i, context, els) {
            expect(els[0].parentNode).toBeTruthy();
            if (value === 'rofl') return false;
          },
          tests: ['lol', 'rofl', 'omg']
        });
        expect(div.children.length).toBe(2);
        expect(div.textContent).toBe('0: lol2: omg');
        done&&done();
      }
    );
  });

  it('should iterate over new style iterator and re-iterate without traces', function (done) {
    jsdom.env(
      '<html><body>before<for value="val" key="i" in="stuff">{{i}}:<i>{{val}}</i>,</for>after</body></html>', [],
      function (err, window) {
        var body = getBody(window),
            viewModel = vixen(body).extend({
              stuff: [3,5,1,2]
            });
        expect(body.textContent).toBe('before0:3,1:5,2:1,3:2,after');
        viewModel.stuff = {z:8,x:'yo',y:true};
        expect(body.textContent).toBe('beforez:8,x:yo,y:true,after');
        done&&done();
      }
    );
  });

  it('should create elements inside <select>', function (done) {
    jsdom.env(
      '<html><body><select id="test" value="{{sel}}" data-value="val" data-key="i" data-in="stuff"><option value="{{i}}">{{val}}</select></body></html>', [],
      function (err, window) {
        var body = getBody(window),
            select = window.document.getElementById('test'),
            viewModel = vixen(body).extend({
              stuff: {
                a: 'hello',
                b: 'mushi mushi',
                c: 'hej'
              }
            });
        expect(select.children.length).toBe(3);
        viewModel.stuff = {
          d: 'good bye',
          e: 'hejdå'
        };
        expect(select.children.length).toBe(2);
        expect(viewModel.sel).not.toBe(undefined);
        done&&done();
      }
    );
  });

  it('should keep each iterated item in it\'s render scope so handlers are mapped correctly', function (done) {
    jsdom.env(
      '<html><body><for value="thing" key="i" in="stuff">{{i}}:<i id="thing-{{i}}" onclick="{{thing.on}}">{{thing.id}}</i>,</for></body></html>', [],
      function (err, window) {
        var body = getBody(window),
            evt = window.document.createEvent("HTMLEvents"),
            count = 1,
            result = 1,
            viewModel = vixen(body).extend({
              stuff: [
                {
                  id: 'first',
                  on: function() {
                    result = 'first';
                    if (--count === 0) done&&done();
                  }
                },
                {
                  id: 'second',
                  on: function() {
                    expect(false).toBe(true);
                    if (--count === 0) done&&done();
                  }
                }
              ]
            }),
            first = window.document.getElementById('thing-0'),
            second = window.document.getElementById('thing-1');
        expect(body.textContent).toBe('0:first,1:second,');
        function fire() {
          var err;
          evt.initEvent('click', true, true);
          try {
            first.dispatchEvent(evt);
          } catch(ex) {
            err = ex;
          }
          expect(err).toBeFalsy();
        }
        if (!done) {
          runs(fire);
          waitsFor(function() {
            return count === 0;
          }, 'Handlers should have executed', 1);
          runs(function() {
            expect(result).toBe('first');
            expect(count).toBe(0);
          });
        } else {
          fire();
        }
      }
    );
  });

  it('should fire event handlers', function (done) {
    jsdom.env(
      '<html><body><div id="test" onclick="{{handler}} {{ handler.extra }}"></div></body></html>', [],
      function (err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test'),
            evt = window.document.createEvent("HTMLEvents"),
            count = 2;
        viewModel.handler = function () {
          if (--count === 0) done&&done();
        };
        viewModel.handler.extra = function () {
          if (--count === 0) done&&done();
        };
        function fire() {
          var err;
          evt.initEvent('click', true, true);
          try {
            div.dispatchEvent(evt);
          } catch(ex) {
            err = ex;
          }
          expect(err).toBeFalsy();
        }
        if (!done) {
          runs(fire);
          waitsFor(function() {
            return count === 0;
          }, 'Handlers should have executed', 1);
          runs(function() {
            expect(count).toBe(0);
          });
        } else {
          fire();
        }
      }
    );
  });

  it('should fire event handlers and give correct value', function (done) {
    jsdom.env(
      '<html><body><input type=text id="test" onchange="{{handler}}"></body></html>', [],
      function (err, window) {
        var viewModel = vixen(getBody(window)),
            input = window.document.getElementById('test'),
            evt = window.document.createEvent("HTMLEvents"),
            count = 1;
        viewModel.handler = function (e, value) {
          expect(value).toBe('lulz!');
          expect(e).toBe(evt);
          if (--count === 0) done&&done();
        };
        input.value = 'lulz!';
        function fire() {
          var err;
          evt.initEvent('change', true, true);
          try {
            input.dispatchEvent(evt);
          } catch(ex) {
            err = ex;
          }
          expect(err).toBeFalsy();
        }
        if (!done) {
          runs(fire);
          waitsFor(function() {
            return count === 0;
          }, 'Handlers should have executed', 1);
          runs(function() {
            expect(count).toBe(0);
          });
        } else {
          fire();
        }
      }
    );
  });

  it('should chain values through functions', function (done) {
    jsdom.env(
      '<html><body><div id="test">{{value | format}}kr</div></body></html>', [],
      function (err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test');
        viewModel.extend({
          value: 10.1425,
          format: function (value) {
            expect(value).toBe(10.1425);
            return Math.round(value);
          }
        });
        expect(div.textContent).toBe('10kr');
        done&&done();
      }
    );
  });

  it('should remove all curlies', function (done) {
    jsdom.env(
      '<html><body><div id="test" class="error {{status}}"><b>Error</b>: {{message}}</div></body></html>', [],
      function (err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test');
        expect(div.textContent).toBe('Error: ');
        expect(div.className).toBe('error ');
        done&&done();
      }
    );
  });

  it('should remove event attributes', function (done) {
    jsdom.env(
      '<html><body><button id="test" onclick="{{click}}">Click me!</button></body></html>', [],
      function (err, window) {
        var viewModel = vixen(getBody(window)),
            button = window.document.getElementById('test');
        expect(button.getAttribute('onclick')).toBe(null);
        done&&done();
      }
    );
  });

  it('should not traverse child elements with data-subview attribute', function (done) {
    jsdom.env(
      '<html><body><div id="test" data-subview>{{lol}}</div></body></html>', [],
      function (err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test');
        viewModel.lol = 'meh';
        expect(div.textContent).toBe('{{lol}}');
        done&&done();
      }
    );
  });

  it('should traverse root element even though it has a data-subview attribute', function (done) {
    jsdom.env(
      '<html><body data-subview><div id="test">{{lol}}</div></body></html>', [],
      function (err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test');
        viewModel.lol = 'meh';
        expect(div.textContent).toBe('meh');
        done&&done();
      }
    );
  });

  it('should handle bi-directional properties for attributes', function (done) {
    jsdom.env(
      '<html><body><input id="test" value="{{val}}"></body></html>', [],
      function (err, window) {
        var viewModel = vixen(getBody(window)),
            input = window.document.getElementById('test');
        viewModel.val = 'jimmyrofl';
        expect(input.value).toBe('jimmyrofl');
        input.value = 'tommylol';
        expect(viewModel.val).toBe('tommylol');
        viewModel.val = 'tripledouble';
        expect(input.value).toBe('tripledouble');
        done&&done();
      }
    );
  });

  it('should handle bi-directional attributes for boolean attributes', function (done) {
    jsdom.env(
      '<html><body><input id="test" type="checkbox" checked="{{checked}}"></body></html>', [],
      function (err, window) {
        var viewModel = vixen(getBody(window)),
            input = window.document.getElementById('test');
        expect(input.checked).toBe(true);
        expect(viewModel.checked).toBe(true);
        viewModel.checked = false;
        expect(input.checked).toBe(false);
        expect(viewModel.checked).toBe(false);
        input.click();
        expect(input.checked).toBe(true);
        expect(viewModel.checked).toBe(true);
        input.click();
        expect(input.checked).toBe(false);
        expect(viewModel.checked).toBe(false);
        done&&done();
      }
    );
  });

  it('should only add bi-directional bindings for non-templated attributes', function (done) {
    jsdom.env(
      '<html><body><input id="test" type="text" value="{{text}}{{moreText}}" class="large {{classes}}"></body></html>', [],
      function (err, window) {
        var viewModel = vixen(getBody(window)),
            input = window.document.getElementById('test');
        expect(viewModel.text).toBeUndefined();
        input.value = 'strunt';
        expect(viewModel.text).toBeUndefined();
        expect(input.className).toBe('large ');
        expect(viewModel.classes).toBeUndefined();
        viewModel.classes = 'valid';
        expect(input.className).toBe('large valid');
        expect(viewModel.classes).toBe('valid');
        done&&done();
      }
    );
  });

  it('should not ignore falsy values in string templates', function (done) {
    jsdom.env(
      '<html><body><a id="link" href="http://bla/{{id}}">{{text}} {{id}}</a></body></html>', [],
      function (err, window) {
        var viewModel = vixen(getBody(window)),
            link = window.document.getElementById('link');
        viewModel.id = 0;
        viewModel.text = false;
        expect(link.textContent).toBe('false 0');
        expect(link.href).toBe('http://bla/0');
        expect(viewModel.id).toBe(0);
        expect(viewModel.text).toBe(false);
        done&&done();
      }
    );
  });
});
