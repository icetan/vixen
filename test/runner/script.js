;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0](function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
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

},{"./test":2,"tape":3}],2:[function(require,module,exports){
var vixen = require('../');

function getBody(window) {
  return window.document.getElementsByTagName('body')[0];
}

module.exports = function(test, jsdom) {
  test('vixen', function(t) {
    t.test('should reflect view model changes in div', function(t) {
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

    t.test('should reflect view model changes in attribute', function(t) {
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

    t.test('should render nested values in view model', function(t) {
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

    t.test('should iterate list values in view model', function(t) {
      t.plan(2);
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
    });

    t.test('should iterate object values in view model', function(t) {
      t.plan(2);
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
    });

    t.test('should iterate values in nested list', function(t) {
      t.plan(2);
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
    });

    t.test('should execute for-each function specified by data-each attribute and filter', function(t) {
      t.plan(4*3 + 2);
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
    });

    t.test('should attach each element before for-each function and remove after if filtered', function(t) {
      t.plan(1*3 + 2);
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
    });

    t.test('should attach each element before for-each function and remove after if filtered with on element iterator', function(t) {
      t.plan(1*3 + 2);
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
    });

    t.test('should iterate over new style iterator and re-iterate without traces', function(t) {
      t.plan(2);
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
    });

    t.test('should create elements inside <select>', function(t) {
      t.plan(3);
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
    });

    t.test('should keep each iterated item in it\'s render scope so handlers are mapped correctly', function(t) {
      t.plan(3);
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
    });

    t.test('should fire event handlers', function(t) {
      t.plan(3);
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
    });

    t.test('should fire event handlers and give correct value', function(t) {
      t.plan(3);
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
    });

    t.test('should chain values through functions', function(t) {
      t.plan(2);
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
    });

    t.test('should remove all curlies', function(t) {
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

    t.test('should remove event attributes', function(t) {
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

    t.test('should not traverse child elements with data-subview attribute', function(t) {
      t.plan(1);
      jsdom.env(
        '<html><body><div id="test" data-subview>{{lol}}</div></body></html>', [],
        function(err, window) {
          var viewModel = vixen(getBody(window)),
              div = window.document.getElementById('test');
          viewModel.lol = 'meh';
          t.equal(div.textContent, '{{lol}}');
        }
      );
    });

    t.test('should traverse root element even though it has a data-subview attribute', function(t) {
      t.plan(1);
      jsdom.env(
        '<html><body data-subview><div id="test">{{lol}}</div></body></html>', [],
        function(err, window) {
          var viewModel = vixen(getBody(window)),
              div = window.document.getElementById('test');
          viewModel.lol = 'meh';
          t.equal(div.textContent, 'meh');
        }
      );
    });

    t.test('should handle bi-directional properties for attributes', function(t) {
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

    t.test('should handle bi-directional attributes for boolean attributes', function(t) {
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

    t.test('should only add bi-directional bindings for non-templated attributes', function(t) {
      t.plan(6);
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
    });

    t.test('should not ignore falsy values in string templates', function(t) {
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

    t.test('should be possible to pass values on construction of view model', function(t) {
      t.plan(5);
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
    });
    t.end();
  });
};

},{"../":4}],5:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],3:[function(require,module,exports){
(function(process){var createDefaultStream = require('./lib/default_stream');
var Render = require('./lib/render');
var Test = require('./lib/test');

var canEmitExit = typeof process !== 'undefined' && process
    && typeof process.on === 'function'
;
var canExit = typeof process !== 'undefined' && process
    && typeof process.exit === 'function'
;
var onexit = (function () {
    var stack = [];
    if (canEmitExit) process.on('exit', function (code) {
        for (var i = 0; i < stack.length; i++) stack[i](code);
    });
    return function (cb) { stack.push(cb) };
})();

var nextTick = typeof setImmediate !== 'undefined'
    ? setImmediate
    : process.nextTick
;

exports = module.exports = createHarness();
exports.createHarness = createHarness;
exports.Test = Test;

var exitInterval;

function createHarness (conf_) {
    var pending = [];
    var running = false;
    var count = 0;
    
    var began = false;
    var only = false;
    var closed = false;
    var out = new Render();
    if (!conf_) conf_ = {};
    
    var tests = [];
    if (conf_.exit === false && exitInterval) clearInterval(exitInterval);
    
    exitInterval = !exitInterval && conf_.exit !== false && canEmitExit
    && typeof process._getActiveHandles === 'function'
    && setInterval(function () {
        if (process._getActiveHandles().length === 1) {
            tests.forEach(function (t) { t._exit() });
        }
    }, 200);
    
    var exitCode = 0;
    var exit = function (c) { exitCode = c };
    
    out.on('end', function () {
        nextTick(function () {
            clearInterval(exitInterval);
            if (canExit && conf_.exit !== false) process.exit(exitCode);
        });
    });
    
    var test = function (name, conf, cb) {
        count++;
        var t = new Test(name, conf, cb);
        tests.push(t);
        if (!conf || typeof conf !== 'object') conf = conf_;
        
        if (conf.exit !== false) {
            onexit(function (code) {
                t._exit();
                if (!closed) {
                    closed = true
                    out.close();
                }
                if (!code && !t._ok && (!only || name === only)) {
                    exit(1);
                }
            });
        }
        
        nextTick(function () {
            if (!out.piped) out.pipe(createDefaultStream());
            if (!began) out.begin();
            began = true;
            
            var run = function () {
                running = true;
                out.push(t);
                t.run();
            };
            
            if (only && name !== only) {
                count--;
                return;
            }

            if (running || pending.length) {
                pending.push(run);
            }
            else run();
        });
        
        t.on('test', function sub (st) {
            count++;
            st.on('test', sub);
            st.on('end', onend);
        });
        t.on('result', function (r) { if (!r.ok) exitCode = 1 });
        
        t.on('end', onend);
        
        return t;
        
        function onend () {
            count--;
            if (this._progeny.length) {
                var unshifts = map(this._progeny, function (st) {
                    return function () {
                        running = true;
                        out.push(st);
                        st.run();
                    };
                });
                pending.unshift.apply(pending, unshifts);
            }
            
            nextTick(function () {
                running = false;
                if (pending.length) return pending.shift()();
                if (count === 0 && !closed) {
                    closed = true
                    out.close();
                }
                if (conf.exit !== false && canExit && !t._ok) {
                    exit(1);
                }
            });
        }
    };
    
    test.only = function (name) {
        if (only) {
            throw new Error("there can only be one only test");
        }
        
        only = name;
        
        return test.apply(null, arguments);
    };
    
    test.stream = out;
    return test;
}

function map (xs, f) {
    if (xs.map) return xs.map(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        res.push(f(xs[i]));
    }
    return res;
}

// vim: set softtabstop=4 shiftwidth=4:

})(require("__browserify_process"))
},{"./lib/default_stream":6,"./lib/render":7,"./lib/test":8,"__browserify_process":5}],4:[function(require,module,exports){
!function(obj) {
  if (typeof module !== 'undefined')
    module.exports = obj;
  else
    window.vixen = obj;
}(function() {
  function trim(str) {return String.prototype.trim.call(str);};

  function resolveProp(obj, name) {
    return name.trim().split('.').reduce(function (p, prop) {
      return p ? p[prop] : undefined;
    }, obj);
  }

  function resolveChain(obj, chain) {
    var prop = chain.shift();
    return chain.reduce(function (p, prop) {
      var f = resolveProp(obj, prop);
      return f ? f(p) : p;
    }, resolveProp(obj, prop));
  }

  function bucket(b, k, v) {
    if (!(k in b)) b[k] = [];
    if (!(v in b[k])) b[k].push(v);
  }

  function extend(orig, obj) {
    Object.keys(obj).forEach(function(prop) {
      orig[prop] = obj[prop];
    });
    return orig;
  }

  function traverseElements(el, callback) {
    var i;
    if (callback(el) !== false) {
      for(i = el.children.length; i--;) (function (node) {
        traverseElements(node, callback);
      })(el.children[i]);
    }
  }

  function createProxy(maps) {
    var proxy = {};
    proxy.extend = function(obj) {
      var toRender = {};
      Object.keys(obj).forEach(function(prop) {
        maps.orig[prop] = obj[prop];
        if (maps.binds[prop]) maps.binds[prop].forEach(function(renderId) {
          if (renderId >= 0) toRender[renderId] = true;
        });
      });
      for (renderId in toRender) maps.renders[renderId](maps.orig);
      return proxy;
    };

    Object.keys(maps.binds).forEach(function(prop) {
      var ids = maps.binds[prop];
      Object.defineProperty(proxy, prop, {
        set: function(value) {
          maps.orig[prop] = value;
          ids.forEach(function(renderId) {
            if (renderId >= 0) maps.renders[renderId](maps.orig);
          });
        },
        get: function() {
          if (maps.rebinds[prop])
            return maps.rebinds[prop]();
          return maps.orig[prop];
        }
      });
    });
    return proxy;
  }

  return function(el, orig) {
    var pattern = /\{\{.+?\}\}/g,
        pipe = '|';

    function resolve(orig, prop) {
      if (!orig) return '';
      var val = resolveChain(orig, prop.slice(2,-2).split(pipe));
      return val === undefined ? '' : val;
    }

    function strTmpl(str, orig) {
      return str.replace(pattern, resolve.bind(undefined, orig));
    }

    function match(str) {
      var m = str.match(pattern);
      if (m) return m.map(function(chain) {
        return chain.slice(2, -2).split(pipe).map(trim);
      });
    }

    function traverse(el, orig) {
      var orig = orig || {},
          binds = {},
          rebinds = {},
          renders = {},
          count = 0;

      function bindRenders(chains, renderId) {
        // Create property to render mapping
        chains.forEach(function(chain) {
          // TODO: Register chaining functions as binds as well.
          bucket(binds, chain[0].split('.')[0], renderId);
        });
      }

      function parseIterator(el) {
        var marker, prefix = '', nodes = [];
        if (parent_ = (el.parentElement || el.parentNode)) {
          if (el.tagName === 'FOR') {
            marker = el.ownerDocument.createTextNode('');
            parent_.replaceChild(marker, el);
          } else if (el.getAttribute('data-in')) {
            prefix = 'data-';
            parent_ = el;
            nodes = Array.prototype.slice.call(el.childNodes);
            marker = el.ownerDocument.createTextNode('');
            parent_.appendChild(marker);
          } else return;
          return {
            alias: el.getAttribute(prefix+'value'),
            key: el.getAttribute(prefix+'key'),
            prop: el.getAttribute(prefix+'in'),
            each: el.getAttribute(prefix+'each'),
            nodes: nodes,
            parent: parent_,
            marker: marker
          };
        }
      }

      function mapAttribute(owner, attr) {
        var eventId, renderId, str, noTmpl;
        if ((str = attr.value) && (chains = match(str))) {
          if (attr.name.indexOf('on') === 0) {
            renderId = -1; // No renderer
            eventName = attr.name.substr(2);
            // Add event listeners
            chains.forEach(function(chain) {
              owner.addEventListener(eventName, function(evt) {
                return resolveProp(orig, chain[0])(evt, owner.value);
              });
            });
            owner.removeAttribute(attr.name);
          } else {
            noTmpl = chains.length === 1 && str.substr(0,1) === '{' &&
              str.substr(-1) === '}';
            // Create rendering function for attribute.
            renderId = count++;
            (renders[renderId] = function(orig, clear) {
              var val = noTmpl ? resolve(orig, str) : strTmpl(str, orig);
              //if (clear) return owner.setAttribute(attr.name, val);
              !clear && attr.name in owner ? owner[attr.name] = val :
                owner.setAttribute(attr.name, val);
            })(orig, true);
            // Bi-directional coupling.
            if (noTmpl) rebinds[chains[0][0]] = function() {
                // TODO: Getting f.ex. 'value' attribute from an input
                // doesn't return user input value so accessing element
                // object properties directly, find out how to do this
                // more securely.
                return attr.name in owner ?
                  owner[attr.name] : owner.getAttribute(attr.name);
              };
          }
          bindRenders(chains, renderId);
        }
      }

      function mapTextNodes(el) {
        for (var i = el.childNodes.length; i--;) (function(node) {
          var str, renderId, chains;
          if (node.nodeType === el.TEXT_NODE && (str = node.nodeValue) &&
              (chains = match(str))) {
            // Create rendering function for element text node.
            renderId = count++;
            (renders[renderId] = function(orig) {
              node.nodeValue = strTmpl(str, orig);
            })(orig);
            bindRenders(chains, renderId);
          }
        })(el.childNodes[i]);
      }

      // Remove no-traverse attribute if root node
      el.removeAttribute('data-subview');

      traverseElements(el, function(el_) {
        var i, iter, template, nodes, renderId;

        // Stop handling and recursion if subview.
        if (el_.getAttribute('data-subview') !== null) return false;

        if (iter = parseIterator(el_)) {
          nodes = iter.nodes;
          template = el_.cloneNode(true);
          maps = traverse(template.cloneNode(true));
          renderId = count++;
          (renders[renderId] = function(orig) {
            var list = resolveProp(orig, iter.prop),
                each_ = iter.each && resolveProp(orig, iter.each), i;
            for (i = nodes.length; i--;) iter.parent.removeChild(nodes[i]);
            nodes = [];
            for (i in list) if (list.hasOwnProperty(i))
              (function(value, i){
                var orig_ = extend({}, orig),
                    clone = template.cloneNode(true),
                    lastNode = iter.marker,
                    maps, renderId, i_, node, nodes_ = [];
                maps = traverse(clone, orig_);
                orig_[iter.alias] = value;
                if (iter.key) orig_[iter.key] = i;
                for (renderId in maps.renders) maps.renders[renderId](orig_);
                for (i_ = clone.childNodes.length; i_--; lastNode = node) {
                  nodes_.push(node = clone.childNodes[i_]);
                  iter.parent.insertBefore(node, lastNode);
                }
                if (each_ && each_(value, i, orig_, nodes_.filter(function(n) {
                  return n.nodeType === el_.ELEMENT_NODE;
                })) != null) {
                  for (i_ = nodes_.length; i_--;)
                    iter.parent.removeChild(nodes_[i_]);
                } else {
                  nodes = nodes.concat(nodes_);
                }
              })(list[i], i);
          })(orig);
          bucket(binds, iter.prop.split('.')[0], renderId);
          for (p in maps.binds) if (iter.alias.indexOf(p) === -1)
            bucket(binds, p, renderId);
        } else {
          // Bind node text.
          mapTextNodes(el_);
        }
        // Bind node attributes if not a <for>.
        if (el_.tagName !== 'FOR') for (i = el_.attributes.length; i--;)
          mapAttribute(el_, el_.attributes[i]);
        // Stop recursion if iterator.
        return !iter;
      });
      return {orig:orig, binds:binds, rebinds:rebinds, renders:renders};
    }
    return createProxy(traverse(el, orig));
  };
}());

},{}],6:[function(require,module,exports){
var Stream = require('stream');

module.exports = function () {
    var out = new Stream;
    out.writable = true;
    var buffered = '';
    
    out.write = function (buf) {
        var s = buffered + String(buf);
        var lines = s.split('\n');
        for (var i = 0; i < lines.length - 1; i++) {
            console.log(lines[i]);
        }
        buffered = lines[i];
    };
    
    out.destroy = function () {
        out.writable = false;
        out.emit('close');
    };
    
    out.end = function (msg) {
        if (msg !== undefined) out.write(msg);
        if (buffered) console.log(buffered);
        out.writable = false;
        out.emit('close');
    };
    
    return out;
};

},{"stream":9}],9:[function(require,module,exports){
var events = require('events');
var util = require('util');

function Stream() {
  events.EventEmitter.call(this);
}
util.inherits(Stream, events.EventEmitter);
module.exports = Stream;
// Backwards-compat with node 0.4.x
Stream.Stream = Stream;

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once, and
  // only when all sources have ended.
  if (!dest._isStdio && (!options || options.end !== false)) {
    dest._pipeCount = dest._pipeCount || 0;
    dest._pipeCount++;

    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest._pipeCount--;

    // remove the listeners
    cleanup();

    if (dest._pipeCount > 0) {
      // waiting for other incoming streams to end.
      return;
    }

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest._pipeCount--;

    // remove the listeners
    cleanup();

    if (dest._pipeCount > 0) {
      // waiting for other incoming streams to end.
      return;
    }

    dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (this.listeners('error').length === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('end', cleanup);
    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('end', cleanup);
  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":10,"util":11}],10:[function(require,module,exports){
(function(process){if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;
function indexOf (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (x === xs[i]) return i;
    }
    return -1;
}

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = indexOf(list, listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  if (arguments.length === 0) {
    this._events = {};
    return this;
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

})(require("__browserify_process"))
},{"__browserify_process":5}],12:[function(require,module,exports){
(function(process){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

})(require("__browserify_process"))
},{"__browserify_process":5}],11:[function(require,module,exports){
var events = require('events');

exports.isArray = isArray;
exports.isDate = function(obj){return Object.prototype.toString.call(obj) === '[object Date]'};
exports.isRegExp = function(obj){return Object.prototype.toString.call(obj) === '[object RegExp]'};


exports.print = function () {};
exports.puts = function () {};
exports.debug = function() {};

exports.inspect = function(obj, showHidden, depth, colors) {
  var seen = [];

  var stylize = function(str, styleType) {
    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    var styles =
        { 'bold' : [1, 22],
          'italic' : [3, 23],
          'underline' : [4, 24],
          'inverse' : [7, 27],
          'white' : [37, 39],
          'grey' : [90, 39],
          'black' : [30, 39],
          'blue' : [34, 39],
          'cyan' : [36, 39],
          'green' : [32, 39],
          'magenta' : [35, 39],
          'red' : [31, 39],
          'yellow' : [33, 39] };

    var style =
        { 'special': 'cyan',
          'number': 'blue',
          'boolean': 'yellow',
          'undefined': 'grey',
          'null': 'bold',
          'string': 'green',
          'date': 'magenta',
          // "name": intentionally not styling
          'regexp': 'red' }[styleType];

    if (style) {
      return '\033[' + styles[style][0] + 'm' + str +
             '\033[' + styles[style][1] + 'm';
    } else {
      return str;
    }
  };
  if (! colors) {
    stylize = function(str, styleType) { return str; };
  }

  function format(value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Filter out the util module, it's inspect function is special
        value !== exports &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    // Primitive types cannot have properties
    switch (typeof value) {
      case 'undefined':
        return stylize('undefined', 'undefined');

      case 'string':
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return stylize(simple, 'string');

      case 'number':
        return stylize('' + value, 'number');

      case 'boolean':
        return stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return stylize('null', 'null');
    }

    // Look up the keys of the object.
    var visible_keys = Object_keys(value);
    var keys = showHidden ? Object_getOwnPropertyNames(value) : visible_keys;

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        var name = value.name ? ': ' + value.name : '';
        return stylize('[Function' + name + ']', 'special');
      }
    }

    // Dates without properties can be shortcutted
    if (isDate(value) && keys.length === 0) {
      return stylize(value.toUTCString(), 'date');
    }

    var base, type, braces;
    // Determine the object type
    if (isArray(value)) {
      type = 'Array';
      braces = ['[', ']'];
    } else {
      type = 'Object';
      braces = ['{', '}'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
    } else {
      base = '';
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + value.toUTCString();
    }

    if (keys.length === 0) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        return stylize('[Object]', 'special');
      }
    }

    seen.push(value);

    var output = keys.map(function(key) {
      var name, str;
      if (value.__lookupGetter__) {
        if (value.__lookupGetter__(key)) {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Getter/Setter]', 'special');
          } else {
            str = stylize('[Getter]', 'special');
          }
        } else {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Setter]', 'special');
          }
        }
      }
      if (visible_keys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = format(value[key]);
          } else {
            str = format(value[key], recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (isArray(value)) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = stylize('[Circular]', 'special');
        }
      }
      if (typeof name === 'undefined') {
        if (type === 'Array' && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    });

    seen.pop();

    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.length + 1;
    }, 0);

    if (length > 50) {
      output = braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];

    } else {
      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    return output;
  }
  return format(obj, (typeof depth === 'undefined' ? 2 : depth));
};


function isArray(ar) {
  return ar instanceof Array ||
         Array.isArray(ar) ||
         (ar && ar !== Object.prototype && isArray(ar.__proto__));
}


function isRegExp(re) {
  return re instanceof RegExp ||
    (typeof re === 'object' && Object.prototype.toString.call(re) === '[object RegExp]');
}


function isDate(d) {
  if (d instanceof Date) return true;
  if (typeof d !== 'object') return false;
  var properties = Date.prototype && Object_getOwnPropertyNames(Date.prototype);
  var proto = d.__proto__ && Object_getOwnPropertyNames(d.__proto__);
  return JSON.stringify(proto) === JSON.stringify(properties);
}

function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}

exports.log = function (msg) {};

exports.pump = null;

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key);
    return res;
};

var Object_getOwnPropertyNames = Object.getOwnPropertyNames || function (obj) {
    var res = [];
    for (var key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) res.push(key);
    }
    return res;
};

var Object_create = Object.create || function (prototype, properties) {
    // from es5-shim
    var object;
    if (prototype === null) {
        object = { '__proto__' : null };
    }
    else {
        if (typeof prototype !== 'object') {
            throw new TypeError(
                'typeof prototype[' + (typeof prototype) + '] != \'object\''
            );
        }
        var Type = function () {};
        Type.prototype = prototype;
        object = new Type();
        object.__proto__ = prototype;
    }
    if (typeof properties !== 'undefined' && Object.defineProperties) {
        Object.defineProperties(object, properties);
    }
    return object;
};

exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object_create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (typeof f !== 'string') {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(exports.inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j': return JSON.stringify(args[i++]);
      default:
        return x;
    }
  });
  for(var x = args[i]; i < len; x = args[++i]){
    if (x === null || typeof x !== 'object') {
      str += ' ' + x;
    } else {
      str += ' ' + exports.inspect(x);
    }
  }
  return str;
};

},{"events":10}],7:[function(require,module,exports){
var Stream = require('stream');
var json = typeof JSON === 'object' ? JSON : require('jsonify');

module.exports = Render;

function Render () {
    Stream.call(this);
    this.readable = true;
    this.count = 0;
    this.fail = 0;
    this.pass = 0;
}

Render.prototype = new Stream;

Render.prototype.pipe = function () {
    this.piped = true;
    return Stream.prototype.pipe.apply(this, arguments);
};

Render.prototype.begin = function () {
    this.emit('data', 'TAP version 13\n');
};

Render.prototype.push = function (t) {
    var self = this;
    this.emit('data', '# ' + t.name + '\n');
    
    t.on('result', function (res) {
        if (typeof res === 'string') {
            self.emit('data', '# ' + res + '\n');
            return;
        }

        self.emit('data', encodeResult(res, self.count + 1));
        self.count ++;
        
        if (res.ok) self.pass ++
        else self.fail ++
    });
};

Render.prototype.close = function () {
    this.emit('data', '\n1..' + this.count + '\n');
    this.emit('data', '# tests ' + this.count + '\n');
    this.emit('data', '# pass  ' + this.pass + '\n');
    if (this.fail) {
        this.emit('data', '# fail  ' + this.fail + '\n');
    }
    else {
        this.emit('data', '\n# ok\n');
    }
    
    this.emit('end');
};

function encodeResult (res, count) {
    var output = '';
    output += (res.ok ? 'ok ' : 'not ok ') + count;
    output += res.name ? ' ' + res.name.replace(/\s+/g, ' ') : '';
    
    if (res.skip) output += ' # SKIP';
    else if (res.todo) output += ' # TODO';
    
    output += '\n';
    
    if (!res.ok) {
        var outer = '  ';
        var inner = outer + '  ';
        output += outer + '---\n';
        output += inner + 'operator: ' + res.operator + '\n';
        
        var ex = json.stringify(res.expected, getSerialize()) || '';
        var ac = json.stringify(res.actual, getSerialize()) || '';
        
        if (Math.max(ex.length, ac.length) > 65) {
            output += inner + 'expected:\n' + inner + '  ' + ex + '\n';
            output += inner + 'actual:\n' + inner + '  ' + ac + '\n';
        }
        else {
            output += inner + 'expected: ' + ex + '\n';
            output += inner + 'actual:   ' + ac + '\n';
        }
        if (res.at) {
            output += inner + 'at: ' + res.at + '\n';
        }
        if (res.operator === 'error' && res.actual && res.actual.stack) {
            var lines = String(res.actual.stack).split('\n');
            output += inner + 'stack:\n';
            output += inner + '  ' + lines[0] + '\n';
            for (var i = 1; i < lines.length; i++) {
                output += inner + lines[i] + '\n';
            }
        }
        
        output += outer + '...\n';
    }
    
    return output;
}

function getSerialize() {
    var seen = [];

    return function (key, value) {
        var ret = value;
        if (typeof value === 'object' && value) {
            var found = false
            for (var i = 0; i < seen.length; i++) {
                if (seen[i] === value) {
                    found = true
                    break;
                }
            }

            if (found) {
                ret = '[Circular]'
            } else {
                seen.push(value)
            }
        }

        return ret
    }
}

},{"stream":9,"jsonify":13}],8:[function(require,module,exports){
(function(process,__dirname){var EventEmitter = require('events').EventEmitter;
var deepEqual = require('deep-equal');
var defined = require('defined');
var path = require('path');

module.exports = Test;

var nextTick = typeof setImmediate !== 'undefined'
    ? setImmediate
    : process.nextTick
;

Test.prototype = new EventEmitter;

function Test (name_, opts_, cb_) {
    var name = '(anonymous)';
    var opts = {};
    var cb;
    
    for (var i = 0; i < arguments.length; i++) {
        switch (typeof arguments[i]) {
            case 'string':
                name = arguments[i];
                break;
            case 'object':
                opts = arguments[i] || opts;
                break;
            case 'function':
                cb = arguments[i];
        }
    }
    
    EventEmitter.call(this);
    
    this.name = name || '(anonymous)';
    this.assertCount = 0;
    this._skip = opts.skip || false;
    this._plan = undefined;
    this._cb = cb;
    this._progeny = [];
    this._ok = true;
}

Test.prototype.run = function () {
    if (this._skip) {
        return this.end();
    }
    try {
        this._cb(this);
    }
    catch (err) {
        this.error(err);
        this.end();
    }
};

Test.prototype.test = function (name, opts, cb) {
    var t = new Test(name, opts, cb);
    this._progeny.push(t);
    this.emit('test', t);
};

Test.prototype.comment = function (msg) {
    this.emit('result', msg.trim().replace(/^#\s*/, ''));
};

Test.prototype.plan = function (n) {
    this._plan = n;
    this.emit('plan', n);
};

Test.prototype.end = function () {
    if (!this.ended) this.emit('end');
    if (this._plan !== undefined &&
        !this._planError && this.assertCount !== this._plan) {
        this._planError = true;
        this.fail('plan != count', {
            expected : this._plan,
            actual : this.assertCount
        });
    }
    this.ended = true;
};

Test.prototype._exit = function () {
    if (this._plan !== undefined &&
        !this._planError && this.assertCount !== this._plan) {
        this._planError = true;
        this.fail('plan != count', {
            expected : this._plan,
            actual : this.assertCount
        });
    }
    else if (!this.ended) {
        this.fail('test exited without ending');
    }
    
};

Test.prototype._assert = function assert (ok, opts) {
    var self = this;
    var extra = opts.extra || {};
    
    var res = {
        id : self.assertCount ++,
        ok : Boolean(ok),
        skip : defined(extra.skip, opts.skip),
        name : defined(extra.message, opts.message, '(unnamed assert)'),
        operator : defined(extra.operator, opts.operator),
        actual : defined(extra.actual, opts.actual),
        expected : defined(extra.expected, opts.expected)
    };
    this._ok = Boolean(this._ok && ok);
    
    if (!ok) {
        res.error = defined(extra.error, opts.error, new Error(res.name));
    }
    
    var e = new Error('exception');
    var err = (e.stack || '').split('\n');
    var dir = path.dirname(__dirname) + '/';
    
    for (var i = 0; i < err.length; i++) {
        var m = /^\s*\bat\s+(.+)/.exec(err[i]);
        if (!m) continue;
        
        var s = m[1].split(/\s+/);
        var filem = /(\/[^:\s]+:(\d+)(?::(\d+))?)/.exec(s[1]);
        if (!filem) continue;
        
        if (filem[1].slice(0, dir.length) === dir) continue;
        
        res.functionName = s[0];
        res.file = filem[1];
        res.line = Number(filem[2]);
        if (filem[3]) res.column = filem[3];
        
        res.at = m[1];
        break;
    }
    
    self.emit('result', res);
    
    if (self._plan === self.assertCount) {
        nextTick(function () {
            if (!self.ended) self.end();
        });
    }
    
    if (!self._planError && self.assertCount > self._plan) {
        self._planError = true;
        self.fail('plan != count', {
            expected : self._plan,
            actual : self.assertCount
        });
    }
};

Test.prototype.fail = function (msg, extra) {
    this._assert(false, {
        message : msg,
        operator : 'fail',
        extra : extra
    });
};

Test.prototype.pass = function (msg, extra) {
    this._assert(true, {
        message : msg,
        operator : 'pass',
        extra : extra
    });
};

Test.prototype.skip = function (msg, extra) {
    this._assert(true, {
        message : msg,
        operator : 'skip',
        skip : true,
        extra : extra
    });
};

Test.prototype.ok
= Test.prototype['true']
= Test.prototype.assert
= function (value, msg, extra) {
    this._assert(value, {
        message : msg,
        operator : 'ok',
        expected : true,
        actual : value,
        extra : extra
    });
};

Test.prototype.notOk
= Test.prototype['false']
= Test.prototype.notok
= function (value, msg, extra) {
    this._assert(!value, {
        message : msg,
        operator : 'notOk',
        expected : false,
        actual : value,
        extra : extra
    });
};

Test.prototype.error
= Test.prototype.ifError
= Test.prototype.ifErr
= Test.prototype.iferror
= function (err, msg, extra) {
    this._assert(!err, {
        message : defined(msg, String(err)),
        operator : 'error',
        actual : err,
        extra : extra
    });
};

Test.prototype.equal
= Test.prototype.equals
= Test.prototype.isEqual
= Test.prototype.is
= Test.prototype.strictEqual
= Test.prototype.strictEquals
= function (a, b, msg, extra) {
    this._assert(a === b, {
        message : defined(msg, 'should be equal'),
        operator : 'equal',
        actual : a,
        expected : b,
        extra : extra
    });
};

Test.prototype.notEqual
= Test.prototype.notEquals
= Test.prototype.notStrictEqual
= Test.prototype.notStrictEquals
= Test.prototype.isNotEqual
= Test.prototype.isNot
= Test.prototype.not
= Test.prototype.doesNotEqual
= Test.prototype.isInequal
= function (a, b, msg, extra) {
    this._assert(a !== b, {
        message : defined(msg, 'should not be equal'),
        operator : 'notEqual',
        actual : a,
        notExpected : b,
        extra : extra
    });
};

Test.prototype.deepEqual
= Test.prototype.deepEquals
= Test.prototype.isEquivalent
= Test.prototype.looseEqual
= Test.prototype.looseEquals
= Test.prototype.same
= function (a, b, msg, extra) {
    this._assert(deepEqual(a, b), {
        message : defined(msg, 'should be equivalent'),
        operator : 'deepEqual',
        actual : a,
        expected : b,
        extra : extra
    });
};

Test.prototype.notDeepEqual
= Test.prototype.notEquivalent
= Test.prototype.notDeeply
= Test.prototype.notSame
= Test.prototype.isNotDeepEqual
= Test.prototype.isNotDeeply
= Test.prototype.isNotEquivalent
= Test.prototype.isInequivalent
= function (a, b, msg, extra) {
    this._assert(!deepEqual(a, b), {
        message : defined(msg, 'should not be equivalent'),
        operator : 'notDeepEqual',
        actual : a,
        notExpected : b,
        extra : extra
    });
};

Test.prototype['throws'] = function (fn, expected, msg, extra) {
    if (typeof expected === 'string') {
        msg = expected;
        expected = undefined;
    }
    var caught = undefined;
    try {
        fn();
    }
    catch (err) {
        caught = { error : err };
        var message = err.message;
        delete err.message;
        err.message = message;
    }

    var passed = caught;

    if (expected instanceof RegExp) {
        passed = expected.test(caught && caught.error);
        expected = String(expected);
    }

    this._assert(passed, {
        message : defined(msg, 'should throw'),
        operator : 'throws',
        actual : caught && caught.error,
        expected : expected,
        error: !passed && caught && caught.error,
        extra : extra
    });
};

Test.prototype.doesNotThrow = function (fn, expected, msg, extra) {
    if (typeof expected === 'string') {
        msg = expected;
        expected = undefined;
    }
    var caught = undefined;
    try {
        fn();
    }
    catch (err) {
        caught = { error : err };
    }
    this._assert(!caught, {
        message : defined(msg, 'should throw'),
        operator : 'throws',
        actual : caught && caught.error,
        expected : expected,
        error : caught && caught.error,
        extra : extra
    });
};

// vim: set softtabstop=4 shiftwidth=4:

})(require("__browserify_process"),"/../node_modules/tape/lib")
},{"events":10,"path":12,"deep-equal":14,"defined":15,"__browserify_process":5}],14:[function(require,module,exports){
var pSlice = Array.prototype.slice;
var Object_keys = typeof Object.keys === 'function'
    ? Object.keys
    : function (obj) {
        var keys = [];
        for (var key in obj) keys.push(key);
        return keys;
    }
;

var deepEqual = module.exports = function (actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();

  // 7.3. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (typeof actual != 'object' && typeof expected != 'object') {
    return actual == expected;

  // 7.4. For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isUndefinedOrNull(value) {
  return value === null || value === undefined;
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return deepEqual(a, b);
  }
  try {
    var ka = Object_keys(a),
        kb = Object_keys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

},{}],15:[function(require,module,exports){
module.exports = function () {
    for (var i = 0; i < arguments.length; i++) {
        if (arguments[i] !== undefined) return arguments[i];
    }
};

},{}],13:[function(require,module,exports){
exports.parse = require('./lib/parse');
exports.stringify = require('./lib/stringify');

},{"./lib/parse":16,"./lib/stringify":17}],16:[function(require,module,exports){
var at, // The index of the current character
    ch, // The current character
    escapee = {
        '"':  '"',
        '\\': '\\',
        '/':  '/',
        b:    '\b',
        f:    '\f',
        n:    '\n',
        r:    '\r',
        t:    '\t'
    },
    text,

    error = function (m) {
        // Call error when something is wrong.
        throw {
            name:    'SyntaxError',
            message: m,
            at:      at,
            text:    text
        };
    },
    
    next = function (c) {
        // If a c parameter is provided, verify that it matches the current character.
        if (c && c !== ch) {
            error("Expected '" + c + "' instead of '" + ch + "'");
        }
        
        // Get the next character. When there are no more characters,
        // return the empty string.
        
        ch = text.charAt(at);
        at += 1;
        return ch;
    },
    
    number = function () {
        // Parse a number value.
        var number,
            string = '';
        
        if (ch === '-') {
            string = '-';
            next('-');
        }
        while (ch >= '0' && ch <= '9') {
            string += ch;
            next();
        }
        if (ch === '.') {
            string += '.';
            while (next() && ch >= '0' && ch <= '9') {
                string += ch;
            }
        }
        if (ch === 'e' || ch === 'E') {
            string += ch;
            next();
            if (ch === '-' || ch === '+') {
                string += ch;
                next();
            }
            while (ch >= '0' && ch <= '9') {
                string += ch;
                next();
            }
        }
        number = +string;
        if (!isFinite(number)) {
            error("Bad number");
        } else {
            return number;
        }
    },
    
    string = function () {
        // Parse a string value.
        var hex,
            i,
            string = '',
            uffff;
        
        // When parsing for string values, we must look for " and \ characters.
        if (ch === '"') {
            while (next()) {
                if (ch === '"') {
                    next();
                    return string;
                } else if (ch === '\\') {
                    next();
                    if (ch === 'u') {
                        uffff = 0;
                        for (i = 0; i < 4; i += 1) {
                            hex = parseInt(next(), 16);
                            if (!isFinite(hex)) {
                                break;
                            }
                            uffff = uffff * 16 + hex;
                        }
                        string += String.fromCharCode(uffff);
                    } else if (typeof escapee[ch] === 'string') {
                        string += escapee[ch];
                    } else {
                        break;
                    }
                } else {
                    string += ch;
                }
            }
        }
        error("Bad string");
    },

    white = function () {

// Skip whitespace.

        while (ch && ch <= ' ') {
            next();
        }
    },

    word = function () {

// true, false, or null.

        switch (ch) {
        case 't':
            next('t');
            next('r');
            next('u');
            next('e');
            return true;
        case 'f':
            next('f');
            next('a');
            next('l');
            next('s');
            next('e');
            return false;
        case 'n':
            next('n');
            next('u');
            next('l');
            next('l');
            return null;
        }
        error("Unexpected '" + ch + "'");
    },

    value,  // Place holder for the value function.

    array = function () {

// Parse an array value.

        var array = [];

        if (ch === '[') {
            next('[');
            white();
            if (ch === ']') {
                next(']');
                return array;   // empty array
            }
            while (ch) {
                array.push(value());
                white();
                if (ch === ']') {
                    next(']');
                    return array;
                }
                next(',');
                white();
            }
        }
        error("Bad array");
    },

    object = function () {

// Parse an object value.

        var key,
            object = {};

        if (ch === '{') {
            next('{');
            white();
            if (ch === '}') {
                next('}');
                return object;   // empty object
            }
            while (ch) {
                key = string();
                white();
                next(':');
                if (Object.hasOwnProperty.call(object, key)) {
                    error('Duplicate key "' + key + '"');
                }
                object[key] = value();
                white();
                if (ch === '}') {
                    next('}');
                    return object;
                }
                next(',');
                white();
            }
        }
        error("Bad object");
    };

value = function () {

// Parse a JSON value. It could be an object, an array, a string, a number,
// or a word.

    white();
    switch (ch) {
    case '{':
        return object();
    case '[':
        return array();
    case '"':
        return string();
    case '-':
        return number();
    default:
        return ch >= '0' && ch <= '9' ? number() : word();
    }
};

// Return the json_parse function. It will have access to all of the above
// functions and variables.

module.exports = function (source, reviver) {
    var result;
    
    text = source;
    at = 0;
    ch = ' ';
    result = value();
    white();
    if (ch) {
        error("Syntax error");
    }

    // If there is a reviver function, we recursively walk the new structure,
    // passing each name/value pair to the reviver function for possible
    // transformation, starting with a temporary root object that holds the result
    // in an empty key. If there is not a reviver function, we simply return the
    // result.

    return typeof reviver === 'function' ? (function walk(holder, key) {
        var k, v, value = holder[key];
        if (value && typeof value === 'object') {
            for (k in value) {
                if (Object.prototype.hasOwnProperty.call(value, k)) {
                    v = walk(value, k);
                    if (v !== undefined) {
                        value[k] = v;
                    } else {
                        delete value[k];
                    }
                }
            }
        }
        return reviver.call(holder, key, value);
    }({'': result}, '')) : result;
};

},{}],17:[function(require,module,exports){
var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
    escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
    gap,
    indent,
    meta = {    // table of character substitutions
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"' : '\\"',
        '\\': '\\\\'
    },
    rep;

function quote(string) {
    // If the string contains no control characters, no quote characters, and no
    // backslash characters, then we can safely slap some quotes around it.
    // Otherwise we must also replace the offending characters with safe escape
    // sequences.
    
    escapable.lastIndex = 0;
    return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
        var c = meta[a];
        return typeof c === 'string' ? c :
            '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
    }) + '"' : '"' + string + '"';
}

function str(key, holder) {
    // Produce a string from holder[key].
    var i,          // The loop counter.
        k,          // The member key.
        v,          // The member value.
        length,
        mind = gap,
        partial,
        value = holder[key];
    
    // If the value has a toJSON method, call it to obtain a replacement value.
    if (value && typeof value === 'object' &&
            typeof value.toJSON === 'function') {
        value = value.toJSON(key);
    }
    
    // If we were called with a replacer function, then call the replacer to
    // obtain a replacement value.
    if (typeof rep === 'function') {
        value = rep.call(holder, key, value);
    }
    
    // What happens next depends on the value's type.
    switch (typeof value) {
        case 'string':
            return quote(value);
        
        case 'number':
            // JSON numbers must be finite. Encode non-finite numbers as null.
            return isFinite(value) ? String(value) : 'null';
        
        case 'boolean':
        case 'null':
            // If the value is a boolean or null, convert it to a string. Note:
            // typeof null does not produce 'null'. The case is included here in
            // the remote chance that this gets fixed someday.
            return String(value);
            
        case 'object':
            if (!value) return 'null';
            gap += indent;
            partial = [];
            
            // Array.isArray
            if (Object.prototype.toString.apply(value) === '[object Array]') {
                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }
                
                // Join all of the elements together, separated with commas, and
                // wrap them in brackets.
                v = partial.length === 0 ? '[]' : gap ?
                    '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                    '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }
            
            // If the replacer is an array, use it to select the members to be
            // stringified.
            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    k = rep[i];
                    if (typeof k === 'string') {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }
            else {
                // Otherwise, iterate through all of the keys in the object.
                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }
            
        // Join all of the member texts together, separated with commas,
        // and wrap them in braces.

        v = partial.length === 0 ? '{}' : gap ?
            '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
            '{' + partial.join(',') + '}';
        gap = mind;
        return v;
    }
}

module.exports = function (value, replacer, space) {
    var i;
    gap = '';
    indent = '';
    
    // If the space parameter is a number, make an indent string containing that
    // many spaces.
    if (typeof space === 'number') {
        for (i = 0; i < space; i += 1) {
            indent += ' ';
        }
    }
    // If the space parameter is a string, it will be used as the indent string.
    else if (typeof space === 'string') {
        indent = space;
    }

    // If there is a replacer, it must be a function or an array.
    // Otherwise, throw an error.
    rep = replacer;
    if (replacer && typeof replacer !== 'function'
    && (typeof replacer !== 'object' || typeof replacer.length !== 'number')) {
        throw new Error('JSON.stringify');
    }
    
    // Make a fake root object containing our value under the key of ''.
    // Return the result of stringifying the value.
    return str('', {'': value});
};

},{}]},{},[1])
;