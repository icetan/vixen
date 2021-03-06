var vixen = require('../');

function getBody(window) {
  return window.document.getElementsByTagName('body')[0];
}

module.exports = function(test, jsdom) {
  test('should reflect view model changes in div', function(t) {
    t.plan(1);
    jsdom.env(
      '<html><body><div id="test">{{test}}</div></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test');
        viewModel.test = 'lol'
        t.equal(div.textContent, 'lol');
      }
    );
  });

  test('should reflect view model changes in attribute', function(t) {
    t.plan(1);
    jsdom.env(
      '<html><body><input type="text" id="test" value="{{test}}"></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            input = window.document.getElementById('test');
        viewModel.test = 'lol'
        t.equal(input.value, 'lol');
      }
    );
  });

  test('should render nested values in view model', function(t) {
    t.plan(1);
    jsdom.env(
      '<html><body><div id="test">{{test.a}} and {{test.b}}</div></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test');
        viewModel.test = {a:'lol', b:'rofl'};
        t.equal(div.textContent, 'lol and rofl');
      }
    );
  });

  test('should iterate list values in view model', function(t) {
    t.plan(2);
    jsdom.env(
      '<html><body><vx vx-for="test in tests"><i>{{test}}</i></vx></body></html>', [],
      function(err, window) {
        window.document.createElement('vx');
        var body = getBody(window),
            viewModel = vixen(body);
        viewModel.extend({tests: ['lol', 'rofl', 'omg']});
        t.equal(body.children.length, 3);
        t.equal(body.textContent, 'lolroflomg');
      }
    );
  });

  test('should iterate object values in view model', function(t) {
    t.plan(2);
    jsdom.env(
      '<html><body><vx vx-for="test in tests"><i>{{test}},</i></vx></body></html>', [],
      function(err, window) {
        var body = getBody(window),
            viewModel = vixen(body);
        viewModel.extend({tests: {a:'lol', b:'rofl', c:'omg'}});
        t.equal(body.children.length, 3);
        t.equal(body.textContent, 'lol,rofl,omg,');
      }
    );
  });

  test('should iterate object keys and values in view model', function(t) {
    t.plan(2);
    jsdom.env(
      '<html><body><vx vx-for="key:value in tests"><b>{{key}}</b>:<i>{{value}},</i></vx></body></html>', [],
      function(err, window) {
        var body = getBody(window),
            viewModel = vixen(body);
        viewModel.extend({tests: {a:'lol', b:'rofl', c:'omg'}});
        t.equal(body.children.length, 6);
        t.equal(body.textContent, 'a:lol,b:rofl,c:omg,');
      }
    );
  });

  test('should iterate values in nested list', function(t) {
    t.plan(2);
    jsdom.env(
      '<html><body><vx vx-for="i:test in p.tests"><i>{{i}}:{{test}},</i></vx></body></html>', [],
      function(err, window) {
        var body = getBody(window),
            viewModel = vixen(body);
        viewModel.extend({p: {tests: ['lol', 'rofl', 'omg']}});
        t.equal(body.children.length, 3);
        t.equal(body.textContent, '0:lol,1:rofl,2:omg,');
      }
    );
  });

  test('should execute for-each function specified after "do" keyword', function(t) {
    t.plan(4*3 + 2);
    jsdom.env(
      '<html><body><vx vx-for="test in tests do foeach"><i>{{test}}</i></vx></body></html>', [],
      function(err, window) {
        var body = getBody(window),
            viewModel = vixen(body),
            count = 0;
        viewModel.extend({
          foeach: function(value, i, nodes) {
            t.ok(nodes instanceof Array);
            t.ok(nodes[0] instanceof window.HTMLElement);
            t.equal(typeof value, 'string');
            t.equal(i, ''+count++);
          },
          tests: ['lol', 'rofl', 'omg']
        });
        t.equal(body.children.length, 3);
        t.equal(body.textContent, 'lolroflomg');
      }
    );
  });

  test('should attach each element before for-each function', function(t) {
    t.plan(1*3 + 2);
    jsdom.env(
      '<html><body><vx vx-for="i:test in tests do foeach">{{i}}: <i>{{test}}</i></vx></body></html>', [],
      function(err, window) {
        var body = getBody(window),
            viewModel = vixen(body);
        viewModel.extend({
          foeach: function(value, i, nodes) {
            t.ok(nodes[0].parentNode);
          },
          tests: ['lol', 'rofl', 'omg']
        });
        t.equal(body.children.length, 3);
        t.equal(body.textContent, '0: lol1: rofl2: omg');
      }
    );
  });

  test('should attach each element before for-each function with on element iterator', function(t) {
    t.plan(1*3 + 2);
    jsdom.env(
      '<html><body><div id="test" vx-for="i:test in tests do foeach">{{i}}: <i>{{test}}</i></div></body></html>', [],
      function(err, window) {
        var div = window.document.getElementById('test'),
            viewModel = vixen(getBody(window));
        viewModel.extend({
          foeach: function(value, i, nodes) {
            t.ok(nodes[0].parentNode);
          },
          tests: ['lol', 'rofl', 'omg']
        });
        t.equal(div.children.length, 3);
        t.equal(div.textContent, '0: lol1: rofl2: omg');
      }
    );
  });

  test('should throw exception if vx-for is present but malformed', function(t) {
    t.plan(4);
    jsdom.env(
      '<html><body><div id="test" vx-for="i:test in tests do ">{{test}}</body></html>', [],
      function(err, window) {
        t.throws(function() { vixen(getBody(window)); });
      }
    );
    jsdom.env(
      '<html><body><div id="test" vx-for="testin tests">{{test}}</body></html>', [],
      function(err, window) {
        t.throws(function() { vixen(getBody(window)); });
      }
    );
    jsdom.env(
      '<html><body><div id="test" vx-for="test in">{{test}}</body></html>', [],
      function(err, window) {
        t.throws(function() { vixen(getBody(window)); });
      }
    );
    jsdom.env(
      '<html><body><div id="test" vx-for="x y in stuff">{{x}}</body></html>', [],
      function(err, window) {
        t.throws(function() { vixen(getBody(window)); });
      }
    );
  });

  test('should iterate over new style iterator and re-iterate without traces', function(t) {
    t.plan(2);
    jsdom.env(
      '<html><body>before<vx vx-for=" i :  val  in  stuff ">{{i}}:<i>{{val}}</i>,</vx>after</body></html>', [],
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
  });

  test('should create elements inside <select>', function(t) {
    t.plan(3);
    jsdom.env(
      '<html><body><select id="test" value="{{sel}}" vx-for="i:val in stuff"><option value="{{i}}">{{val}}</select></body></html>', [],
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
  });

  test('should keep each iterated item in it\'s render scope so handlers are mapped correctly', function(t) {
    t.plan(3);
    jsdom.env(
      '<html><body><vx vx-for="i: thing in stuff">{{i}}:<i id="thing-{{i}}" onclick="{{thing.on}}">{{thing.id}}</i>,</vx></body></html>', [],
      function(err, window) {
        var body = getBody(window),
            evt = window.document.createEvent("HTMLEvents"),
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
  });

  test('should push/unshift item to rendered iterator witout rerendering each item', function(t) {
    t.plan(8);
    jsdom.env(
      '<html><body>before<vx vx-for="i:val in stuff">{{i}}:<i>{{val}}</i>,</vx>after</body></html>', [],
      function(err, window) {
        var body = getBody(window),
            viewModel = vixen(body).extend({
              stuff: [3,5,1,2]
            });
        t.equal(body.textContent, 'before0:3,1:5,2:1,3:2,after');
        viewModel.stuff[1] = 105;
        t.equal(viewModel.$push('stuff', 13), 5);
        t.deepEqual(viewModel.stuff, [3, 105, 1, 2, 13]);
        t.equal(body.textContent, 'before0:3,1:5,2:1,3:2,4:13,after');
        t.equal(viewModel.$unshift('stuff', -1), 6);
        t.deepEqual(viewModel.stuff, [-1, 3, 105, 1, 2, 13]);
        t.equal(body.textContent, 'before0:-1,1:3,2:5,3:1,4:2,5:13,after');
        viewModel.stuff = [1,2,3];
        t.equal(body.textContent, 'before0:1,1:2,2:3,after');
      }
    );
  });

  test('should fire event handlers', function(t) {
    t.plan(3);
    jsdom.env(
      '<html><body><div id="test" onclick="{{handler}} {{ handler.extra }}"></div></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test'),
            evt = window.document.createEvent("HTMLEvents"),
            handler = function() {
              t.ok(true);
            };
        handler.extra = function() {
          t.ok(true);
        };
        viewModel.handler = handler;
        t.doesNotThrow(function() {
          var err;
          evt.initEvent('click', true, true);
          div.dispatchEvent(evt);
        });
      }
    );
  });

  test('should fire event handlers and give correct scope', function(t) {
    t.plan(4);
    jsdom.env(
      '<html><body><input type=text id="test" onchange="{{handler}}"></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            input = window.document.getElementById('test'),
            evt = window.document.createEvent("HTMLEvents");
        viewModel.handler = function(e) {
          t.equal(this, input);
          t.equal(this.value, 'lulz!');
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
  });

  test('should fire event handlers with given parameters', function(t) {
    t.plan(3);
    jsdom.env(
      '<html><body><input type=text id="test" onchange="{{handler item}}"></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            input = window.document.getElementById('test'),
            evt = window.document.createEvent("HTMLEvents");
        viewModel.item = 'wooow';
        viewModel.handler = function(e, param) {
          t.equal(param, 'wooow');
          t.deepEqual(e, evt);
        };
        input.value = 'mjausingar';
        t.doesNotThrow(function() {
          var err;
          evt.initEvent('change', true, true);
          input.dispatchEvent(evt);
        });
      }
    );
  })

  test('should keep each iterated item in it\'s render scope so handlers are mapped correctly', function(t) {
    t.plan(3);
    jsdom.env(
      '<html><body><vx vx-for="i:x in stuff"><i id="thing-{{i}}" onclick="{{doz x}}">{{x.id}}</i>,</vx></body></html>', [],
      function(err, window) {
        var body = getBody(window),
            evt = window.document.createEvent("HTMLEvents"),
            viewModel = vixen(body).extend({
              doz: function(e, x) {
                t.equal(x.id, 'first');
              },
              stuff: [
                { id: 'first', },
                { id: 'second' }
              ]
            }),
            first = window.document.getElementById('thing-0'),
            second = window.document.getElementById('thing-1');
        t.equal(body.textContent, 'first,second,');
        t.doesNotThrow(function() {
          var err;
          evt.initEvent('click', true, true);
          first.dispatchEvent(evt);
        });
      }
    );
  });;

  test('should chain values through functions', function(t) {
    t.plan(2);
    jsdom.env(
      '<html><body><div id="test">{{value | format}}kr</div></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window), {
              value: 10.1425,
              format: function(value) {
                t.equal(value, 10.1425);
                return Math.round(value);
              }
            }),
            div = window.document.getElementById('test');
        t.equal(div.textContent, '10kr');
      }
    );
  });

  test('should remove all curlies', function(t) {
    t.plan(2);
    jsdom.env(
      '<html><body><div id="test" class="error {{status}}"><b>Error</b>: {{message}}</div></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test');
        t.equal(div.textContent, 'Error: ');
        t.equal(div.className, 'error ');
      }
    );
  });

  test('should remove event attributes', function(t) {
    t.plan(1);
    jsdom.env(
      '<html><body><button id="test" onclick="{{click}}">Click me!</button></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            button = window.document.getElementById('test');
        t.equal(button.getAttribute('onclick'), null);
      }
    );
  });

  test('should not traverse child elements with vx-subview attribute', function(t) {
    t.plan(1);
    jsdom.env(
      '<html><body><div id="test" vx-subview>{{lol}}</div></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test');
        viewModel.lol = 'meh';
        t.equal(div.textContent, '{{lol}}');
      }
    );
  });

  test('should traverse root element even though it has a vx-subview attribute', function(t) {
    t.plan(1);
    jsdom.env(
      '<html><body vx-subview><div id="test">{{lol}}</div></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test');
        viewModel.lol = 'meh';
        t.equal(div.textContent, 'meh');
      }
    );
  });

  test('should handle bi-directional properties for attributes', function(t) {
    t.plan(3);
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
  });

  test('should handle bi-directional attributes for boolean attributes', function(t) {
    t.plan(8);
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
  });

  test('should only add bi-directional bindings for non-templated and non-filtered attributes', function(t) {
    t.plan(10);
    jsdom.env(
      '<html><body><input id="test" type="text" value="{{text}}{{moreText}}" class="large {{classes}}" data-lol="{{lol | filter}}"></body></html>', [],
      function(err, window) {
        var viewModel = vixen(getBody(window), { filter:function() {return '';} }),
            input = window.document.getElementById('test');

        t.equal(viewModel.text, undefined);
        input.value = 'strunt';
        t.equal(viewModel.text, undefined);

        t.equal(input.className, 'large ');
        t.equal(viewModel.classes, undefined);
        viewModel.classes = 'valid';
        t.equal(input.className, 'large valid');
        t.equal(viewModel.classes, 'valid');

        t.equal(input.getAttribute('data-lol'), '');
        t.equal(viewModel.lol, undefined);
        input.setAttribute('data-lol', 'mjau');
        t.equal(viewModel.lol, undefined);
        viewModel.lol = 'tattio';
        t.equal(viewModel.lol, 'tattio');
      }
    );
  });

  test('should not ignore falsy values in string templates', function(t) {
    t.plan(4);
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
  });

  test('should be possible to pass values on construction of view model', function(t) {
    t.plan(5);
    jsdom.env(
      '<html><body><a id="link" href="http://bla/{{id}}">{{text}} {{id}}</a>'+
        '<vx vx-for="item in items">{{item}}</vx></body></html>', [],
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
  });

  test('should not call chaining functions with empty values or unnecessarily in iterators', function(t) {
    t.plan(2 + 3);
    jsdom.env(
      '<html><body><vx vx-for=" i :thing in stuff"><div class="{{i | alt}}">{{thing}}</div></vx></body></html>', [],
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
  });

  test('object used in second argument is same as proxy object', function(t) {
    t.plan(3);
    jsdom.env(
      '<html><body>{{a}}</body></html>', [],
      function(err, window) {
        var body = getBody(window),
            model = { a: 1 },
            viewModel = vixen(body, model);
        t.ok(model === viewModel);
        t.equal(body.textContent, '1');
        model.a = 2;
        t.equal(body.textContent, '2');
      }
    );
  });

  test('remove "vx-" prefix on attribute names', function(t) {
    t.plan(5);
    jsdom.env(
      '<html><body><img id="image" vx-title="dont remove prefix" vx-src="{{src}}"></body></html>', [],
      function(err, window) {
        var body = getBody(window),
            model = { src: 'test.png' },
            viewModel = vixen(body),
            img = window.document.getElementById('image');
        t.ok(img.hasAttribute('vx-title'));
        t.notOk(img.hasAttribute('vx-src'));
        t.equal(img.getAttribute('src'), '');
        viewModel.extend(model);
        t.notOk(img.hasAttribute('vx-src'));
        t.equal(img.getAttribute('src'), 'test.png');
      }
    );
  });

  test('literal values with infix expressions', function(t) {
    t.plan(2);
    jsdom.env(
      '<html><body>{{4 + number}}</body></html>', [],
      function(err, window) {
        var body = getBody(window),
            model = { number:'3' },
            viewModel = vixen(body, model);
        t.equal(body.textContent, '7');
        viewModel.number = 'hello';
        t.equal(body.textContent, 'NaN');
      }
    );
  });

  test('literal values with infix expressions', function(t) {
    t.plan(2);
    jsdom.env(
      '<html><body>{{ lol  then \'hupp zulu\'  else \'hepp minu\'}}</body></html>', [],
      function(err, window) {
        var body = getBody(window),
            model = { lol: true },
            viewModel = vixen(body, model);
        t.equal(body.textContent, 'hupp zulu');
        viewModel.lol = false;
        t.equal(body.textContent, 'hepp minu');
      }
    );
  });

  test('should re-use iterator child nodes', function(t) {
    t.plan(12);
    jsdom.env(
      '<html><body><ul id="list" vx-for="x in ls">'+
        '<li>{{x}}</li>'+
      '</ul></body></html>', [],
      function(err, window) {
        var body = getBody(window),
            model = { ls: [ 2, 4, 8, 16 ] },
            viewModel = vixen(body, model),
            listEl = window.document.getElementById('list'),
            firstEl = listEl.children[0];
            secondEl = listEl.children[1];
        t.equal(firstEl.textContent, '2');
        t.equal(listEl.children.length, 4);
        model.ls = [ 1, 3, 5 ];
        t.equal(listEl.children.length, 3);
        t.equal(listEl.children[0].textContent, '1');
        t.equal(listEl.children[0], firstEl);
        t.equal(listEl.children[1].textContent, '3');
        t.equal(listEl.children[1], secondEl);
        model.ls = [ 6, 7, 9, 10, 11, 12 ];
        t.equal(listEl.children.length, 6);
        t.equal(listEl.children[0].textContent, '6');
        t.equal(listEl.children[0], firstEl);
        t.equal(listEl.children[1].textContent, '7');
        t.equal(listEl.children[1], secondEl);
      }
    );
  });

  test('shouldn\'t request images with empty parameters', function(t) {
    t.plan(7);
    jsdom.env(
      '<html><body><div id="list" vx-for="x in ls">'+
        '<img vx-src="lol/{{x}}/apix.gif">'+
        '<div id="{{x}}">{{lol.a}}-{{lol.b}}</div>'+
      '</div></body></html>', [],
      function(err, window) {
        var body = getBody(window),
            viewModel = vixen(body),
            listEl = window.document.getElementById('list');
        viewModel.extend({ ls: [ 'hej', 'mfw' ] });
        t.equal(listEl.children[1].id, 'hej');
        t.equal(listEl.children[3].id, 'mfw');
        t.equal(/lol\/([^\/]*)\/apix.gif$/.exec(listEl.children[0].src)[1], 'hej');
        t.equal(/lol\/([^\/]*)\/apix.gif$/.exec(listEl.children[2].src)[1], 'mfw');
        t.equal(listEl.children[1].textContent, '-');
        viewModel.lol = { a:'60', b:'wat' };
        t.equal(listEl.children[1].textContent, '60-wat');
        t.equal(listEl.children[3].textContent, '60-wat');
      }
    );
  });

  test('should update all expressions in iterator subproxies', function(t) {
    t.plan(8);
    jsdom.env(
      '<html><body><ul id="list" vx-for="x in ls">'+
        '<li id="{{x.a}}"><div vx-id="lol-{{x.b}}-{{x.c}}">mjau</div></li>'+
      '</ul></body></html>', [],
      function(err, window) {
        var body = getBody(window),
            viewModel = vixen(body),
            listEl = window.document.getElementById('list');
        viewModel.extend({ ls: [
          { a:1, b:2, c:3 },
          { a:4, b:5, c:6 }
        ] });
        t.equal(listEl.children[0].getAttribute('id'), '1');
        t.equal(listEl.children[0].firstChild.getAttribute('id'), 'lol-2-3');
        t.equal(listEl.children[1].getAttribute('id'), '4');
        t.equal(listEl.children[1].firstChild.getAttribute('id'), 'lol-5-6');
        viewModel.ls = [
          { a:7, b:8, c:9 },
          { a:10, b:11, c:12 }
        ];
        t.equal(listEl.children[0].getAttribute('id'), '7');
        t.equal(listEl.children[0].firstChild.getAttribute('id'), 'lol-8-9');
        t.equal(listEl.children[1].getAttribute('id'), '10');
        t.equal(listEl.children[1].firstChild.getAttribute('id'), 'lol-11-12');
      }
    );
  });

  test('should splice list', function(t) {
    t.plan(11);
    jsdom.env(
      '<html><body>(start)<vx vx-for="x in stuff ">{{x}},</vx>(end)</body></html>', [],
      function(err, window) {
        var body = getBody(window),
            viewModel = vixen(body).extend({
              stuff: [1,2,3,4,5]
            });
        t.equal(body.textContent, '(start)1,2,3,4,5,(end)');
        t.deepEqual(viewModel.$splice('stuff', 0, 3), [1,2,3]);
        t.equal(body.textContent, '(start)4,5,(end)');
        t.deepEqual(viewModel.$splice('stuff', 1, 0, 4.1, 4.2, 4.3, 4.4), []);
        t.equal(body.textContent, '(start)4,4.1,4.2,4.3,4.4,5,(end)');
        t.deepEqual(viewModel.$splice('stuff'), []);
        t.equal(body.textContent, '(start)4,4.1,4.2,4.3,4.4,5,(end)');
        t.deepEqual(viewModel.$splice('stuff', 5, 10, 4.5, 4.6, 4.7), [5]);
        t.equal(body.textContent, '(start)4,4.1,4.2,4.3,4.4,4.5,4.6,4.7,(end)');
        t.deepEqual(viewModel.$splice('stuff', 0), [4,4.1,4.2,4.3,4.4,4.5,4.6,4.7]);
        t.equal(body.textContent, '(start)(end)');
      }
    );
  });
};
