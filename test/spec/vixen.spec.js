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
      '<html><body><div id="test" data-iterate="test in tests"><i>{{test}}</i></div></body></html>', [],
      function (err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test');
        viewModel.extend({tests: ['lol', 'rofl', 'omg']});
        expect(div.children.length).toBe(3);
        expect(div.textContent).toBe('lolroflomg');
        done&&done();
      }
    );
  });

  it('should iterate object values in view model', function (done) {
    jsdom.env(
      '<html><body><div id="test" data-iterate="test, i in tests"><b>{{i}}</b>:<i>{{test}},</i></div></body></html>', [],
      function (err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test');
        viewModel.extend({tests: {a:'lol', b:'rofl', c:'omg'}});
        expect(div.children.length).toBe(6);
        expect(div.textContent).toBe('a:lol,b:rofl,c:omg,');
        done&&done();
      }
    );
  });

  it('should iterate values in nested list', function (done) {
    jsdom.env(
      '<html><body><div id="test" data-iterate="test, i in p.tests"><i>{{i}}:{{test}},</i></div></body></html>', [],
      function (err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test');
        viewModel.extend({p: {tests: ['lol', 'rofl', 'omg']}});
        expect(div.children.length).toBe(3);
        expect(div.textContent).toBe('0:lol,1:rofl,2:omg,');
        done&&done();
      }
    );
  });

  it('should execute for-each function specified by data-each attribute and filter', function (done) {
    jsdom.env(
      '<html><body><div id="test" data-each="foeach" data-iterate="test in tests"><i>{{test}}</i></div></body></html>', [],
      function (err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test'),
            count = 0;
        viewModel.extend({
          foeach: function (value, i, context, el) {
            expect(el instanceof window.HTMLElement).toBe(true);
            expect(typeof value).toBe('string');
            expect(i).toBe(''+count);
            count++;
            if (value === 'rofl') return false;
          },
          tests: ['lol', 'rofl', 'omg']
        });
        expect(count).toBe(3);
        expect(div.children.length).toBe(2);
        expect(div.textContent).toBe('lolomg');
        done&&done();
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
        evt.initEvent('click', true, true);
        div.dispatchEvent(evt);
      }
    );
  });

  it('should fire event handlers and give correct value', function (done) {
    jsdom.env(
      '<html><body><input type=text id="test" onchange="{{handler}}"></body></html>', [],
      function (err, window) {
        var viewModel = vixen(getBody(window)),
            input = window.document.getElementById('test'),
            evt = window.document.createEvent("HTMLEvents");
        viewModel.handler = function (e, value) {
          expect(value).toBe('lulz!');
          expect(e).toBe(evt);
          done&&done();
        };
        input.value = 'lulz!';
        evt.initEvent('change', true, true);
        input.dispatchEvent(evt);
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
          format: function (value, node) {
            expect(node.nodeType).toBe(div.TEXT_NODE);
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
      '<html><body><div id="test">{{error.message}}</div></body></html>', [],
      function (err, window) {
        var viewModel = vixen(getBody(window)),
            div = window.document.getElementById('test');
        expect(div.textContent).toBe('');
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
});
