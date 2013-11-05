!function(obj) {
  if (typeof module !== 'undefined')
    module.exports = obj;
  else
    window.vixen = obj;
}(function() {
  var pattern = /\{\{.+?\}\}/g,
      expr = /'.*?'\s*|[^ ]+\s*/g,
      builtins = {
        '|': function(a, b) { return b(a); },
        '+': function(a, b) { return a + b; },
        '-': function(a, b) { return a - b; },
        '*': function(a, b) { return a * b; },
        '/': function(a, b) { return a / b; },
        '%': function(a, b) { return a % b; },
        'is': function(a, b) { return a == b; },
        'then': function(a, b) { return a ? b : a; },
        'else': function(a, b) { return a ? a : b; }
      },
      keys = Object.keys;

  function trim(str) {return String.prototype.trim.call(str);};

  function resolveProp(obj, name) {
    var name = name.trim(), n;
    if (name[0] === "'") return name.slice(1,-1);
    if (!isNaN(n = parseFloat(name))) return n;
    return name.split('.').reduce(function(p, prop) {
      return p ? p[prop] : undefined;
    }, obj);
  }

  function resolveChain(obj, chain) {
    var prop = chain.shift();
    return chain.reduce(function(p, prop) {
      var f = resolveProp(obj, prop);
      return f ? f(p) : p;
    }, resolveProp(obj, prop));
  }

  function resolveInFix(obj, props) {
    var p = resolveProp(obj, props[0]), i, len;
    for (i=1, len=props.length; i<len; i+=2)
      p = resolveProp(obj, props[i])(p, resolveProp(obj, props[i+1]));
    return p;
  }

  function bucket(b, k, v) {
    if (!(k in b)) b[k] = [];
    if (b[k].indexOf(v) === -1) b[k].push(v);
  }

  function extend(orig, obj) {
    Object.keys(obj).forEach(function(prop) {
      orig[prop] = obj[prop];
    });
    return orig;
  }

  function traverseElements(el, callback) {
    var i;
    if (callback(el) !== false) for(i = el.children.length; i--;)
      traverseElements(el.children[i], callback);
  }

  function createProxy(maps, proxy) {
    proxy = proxy || {};
    proxy.extend = function(obj) {
      var toRender = {}, rid;
      Object.keys(obj).forEach(function(prop) {
        maps.orig[prop] = obj[prop];
        if (maps.binds[prop]) maps.binds[prop].forEach(function(rid) {
          if (rid >= 0) toRender[rid] = null;
        });
      });
      for (renderId in toRender) maps.renders[renderId](maps.orig);
      return proxy;
    };
    // Map Array functions to iterator renderer functions.
    proxy.push = function(prop) {
      var list = resolveProp(maps.orig, prop), args, render;
      if (!list) return;
      args = [].slice.call(arguments, 1);
      maps.binds[prop].forEach(function(rId) {
        if (rId < 0) return;
        render = maps.renders[rId];
        render.push.apply(render, args);
      });
      return list.push.apply(list, args);
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

  return function(el, model) {
    function resolve(orig, prop) {
      if (!orig) return '';
      var val = resolveInFix(orig, prop.slice(2,-2).match(expr));
      return val === undefined ? '' : val;
    }

    function strTmpl(str, orig) {
      return str.replace(pattern, resolve.bind(undefined, orig));
    }

    function match(str) {
      var m = str.match(pattern);
      if (m) return m.map(function(chain) {
        return chain.slice(2, -2).match(expr).map(trim);
      });
    }

    function traverse(el, orig) {
      var binds = {},
          rebinds = {},
          renders = {},
          count = 0;

      if (orig) Object.keys(builtins).forEach(function(prop) {
        if (!(prop in orig)) orig[prop] = builtins[prop];
      });

      function bindRenders(chains, renderId) {
        // Create property to render mapping
        chains.forEach(function(chain) {
          // Register all chaining functions as binds.
          chain.forEach(function(prop) {
            if (builtins[prop] || prop[0] === "'" || !isNaN(prop)) return;
            bucket(binds, prop.split('.')[0], renderId);
          });
        });
      }

      function parseIterator(el) {
        var marker, key, nodes = [];
        if (parent_ = (el.parentElement || el.parentNode)) {
          if (el.tagName === 'VX') {
            marker = el.ownerDocument.createTextNode('');
            parent_.replaceChild(marker, el);
          } else if (el.getAttribute('vx-in')) {
            parent_ = el;
            nodes = Array.prototype.slice.call(el.childNodes);
            marker = el.ownerDocument.createTextNode('');
            parent_.appendChild(marker);
          } else return;
          return {
            alias: el.getAttribute('vx-for'),
            key: el.hasAttribute('vx-i')
              ? (((key = el.getAttribute('vx-i')) === 'vx-i') ? 'i' : key||'i')
              : undefined,
            prop: el.getAttribute('vx-in'),
            each: el.getAttribute('vx-each'),
            nodes: nodes,
            parent: parent_,
            marker: marker
          };
        }
      }

      function mapAttribute(owner, attr) {
        var name, eventId, renderId, str, noTmpl;
        if ((str = attr.value) && (chains = match(str))) {
          name = attr.name;
          if (name.indexOf('vx-') === 0) {
            owner.removeAttribute(name);
            name = name.substr(3);
          }
          if (name.indexOf('on') === 0) {
            renderId = -1; // No renderer
            eventName = name.substr(2);
            // Add event listeners
            chains.forEach(function(chain) {
              // Multi parameter space syntax
              owner.addEventListener(eventName, function(evt) {
                var args = chain.map(resolveProp.bind(null, orig));
                return args[0].apply(owner, [evt].concat(args.slice(1)));
              });
            });
            owner.removeAttribute(name);
          } else {
            noTmpl = chains.length === 1 && str.substr(0,1) === '{' &&
              str.substr(-1) === '}';
            // Create rendering function for attribute.
            renderId = count++;
            (renders[renderId] = function(orig, clear) {
              var val = noTmpl ? resolve(orig, str) : strTmpl(str, orig);
              !clear && name in owner ? owner[name] = val :
                owner.setAttribute(name, val);
            })(orig, true);
            // Bi-directional coupling.
            if (noTmpl && chains[0].length === 1)
              rebinds[chains[0][0]] = function() {
                // TODO: Getting f.ex. 'value' attribute from an input
                // doesn't return user input value so accessing element
                // object properties directly, find out how to do this
                // more securely.
                return name in owner ?
                  owner[name] : owner.getAttribute(name);
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
      el.removeAttribute('vx-subview');

      traverseElements(el, function(el_) {
        var i, iter, template, nodes, renderId, insertNode, subproxies,
            qmatch, qp, copy, render;

        // Stop handling and recursion if subview.
        if (el_.getAttribute('vx-subview') !== null) return false;

        if (iter = parseIterator(el_)) {
          nodes = iter.nodes;
          subproxies = [];
          template = el_.cloneNode(true);
          renderId = count++;
          qmatch = {};
          match(template.innerHTML).forEach(function(c) {
            c.forEach(function(p) { qmatch[p.split('.')[0]] = true; });
          });
          copy = function(orig, i, v) {
            var orig_ = extend({}, orig);
            if (iter.key) orig_[iter.key] = i;
            orig_[iter.alias] = v;
            return orig_;
          };

          for (i = nodes.length; i--;) iter.parent.removeChild(nodes[i]);

          insertNode = function(orig, value, i){
            var orig_ = copy(orig, i, value),
                clone = template.cloneNode(true),
                each_ = iter.each && resolveProp(orig, iter.each),
                lastNode = iter.marker,
                nodes_ = [], subproxy, i_, len;
            subproxy = createProxy(traverse(clone, orig_));
            nodes_ = [].slice.call(clone.childNodes);
            for (i_=0, len=nodes_.length; i_<len; i_++) {
              iter.parent.insertBefore(nodes_[i_], lastNode);
            }
            if (each_ && each_(value, i, orig_, nodes_.filter(function(n) {
              return n.nodeType === el_.ELEMENT_NODE;
            })) != null) {
              for (i_ = nodes_.length; i_--;)
                iter.parent.removeChild(nodes_[i_]);
            }
            subproxy.__nodes = nodes_;
            return subproxy;
          };

          (render = renders[renderId] = function(orig, ext) {
            var list = resolveProp(orig, iter.prop),
                splen = subproxies.length,
                ks, i, i_, len, item, sp, spn, k;
            if (list) for (i=0, ks=keys(list), len=ks.length; i<len; i++) {
              item = list[k=ks[i]];
              if (i < splen) subproxies[i].extend(ext||copy(orig, k, item));
              else subproxies.push(insertNode(orig, item, k));
            }
            sps = subproxies.splice(i);
            for (i=0, len=sps.length; i<len; i++) {
              sp = sps[i];
              spn = sp.__nodes;
              for (i_=spn.length; i_--;) iter.parent.removeChild(spn[i_]);
            }
          })(orig);
          renders[renderId].push = function() {
            var list = resolveProp(orig, iter.prop);
            for (i in arguments)
              subproxies.push(insertNode(orig, arguments[i],
                                         list.length+parseInt(i)));
          };
          bucket(binds, iter.prop.split('.')[0], renderId);
          keys(qmatch).forEach(function(qp) {
            if (iter.alias !== qp && iter.key !== qp) {
              renders[renderId = count++] = function(orig) {
                var ext = {};
                ext[qp] = resolveProp(orig, qp);
                render(orig, ext);
              };
              bucket(binds, qp, renderId);
            }
          });
        } else {
          // Bind node text.
          mapTextNodes(el_);
        }
        // Bind node attributes if not a <vx>.
        if (el_.tagName !== 'VX') for (i = el_.attributes.length; i--;)
          mapAttribute(el_, el_.attributes[i]);
        // Stop recursion if iterator.
        return !iter;
      });
      return {orig:orig, binds:binds, rebinds:rebinds, renders:renders};
    }
    return createProxy(traverse(el, extend({}, model || {})), model);
  };
}());
