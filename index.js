!function(obj) {
  if (typeof module !== 'undefined')
    module.exports = obj;
  else
    window.vixen = obj;
}(function() {
  var pattern = /\{\{.+?\}\}/g,
      expr = /'.*?'\s*|[^ ]+\s*/g,
      forExpr = /^\s*(?:([^\s]+?)\s*:\s*)?([^\s]+?)\s+in\s+([^\s]+?)(?:\s+do\s+([^\s]+))?\s*$/,
      builtins = {
        '|': function(a, b) { return b(a); },
        '+': function(a, b) { return a + b; },
        '-': function(a, b) { return a - b; },
        '*': function(a, b) { return a * b; },
        '/': function(a, b) { return a / b; },
        '%': function(a, b) { return a % b; },
        'is': function(a, b) { return a == b; },
        'isnt': function(a, b) { return a != b; },
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
    // TODO: clean this mess, maybe replace push with splice.
    proxy.splice = function(prop, start, end) {
      if (arguments.length < 2) return [];
      var list = resolveProp(maps.orig, prop),
          middle, args, res;
      if (!list) return;
      args = [].slice.call(arguments, 1);
      middle = Math.max(0, args.length-2);
      res = list.splice.apply(list, args);
      maps.binds[prop].forEach(function(rId) {
        if (rId < 0) return;
        var render = maps.renders[rId];
        if (render.splice) render.splice(start, end, middle);
      });
      return res;
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

  function vixen(builtins, el, model) {
    function resolveInFix(obj, props) {
      var p = resolveProp(obj, props[0]), i, len, prop, infix;
      for (i=1, len=props.length; i<len; i+=2) {
        prop = props[i].trim();
        infix = builtins[prop] || resolveProp(obj, prop);
        p = infix(p, resolveProp(obj, props[i+1]));
      }
      return p;
    }

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
        var nodes = [], marker, key, forStr;
        if (parent_ = (el.parentElement || el.parentNode)) {
          forStr = el.getAttribute('vx-for');
          if (el.tagName === 'VX') {
            marker = el.ownerDocument.createTextNode('');
            parent_.replaceChild(marker, el);
          } else if (forStr) {
            parent_ = el;
            nodes = Array.prototype.slice.call(el.childNodes);
            marker = el.ownerDocument.createTextNode('');
            parent_.appendChild(marker);
          } else return;
          if (m = forExpr.exec(forStr))
            return {
              key: m[1], alias: m[2], prop: m[3], each: m[4], nodes: nodes,
              parent: parent_, marker: marker
            };
          else throw "\"" + forStr + "\" is not a valid vx-for expression";
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
            eventName = name.substr(2);
            // Add event listeners
            chains.forEach(function(chain) {
              var cb;
              (renders[renderId=count++] = function(orig) {
                var args = chain.map(resolveProp.bind(null, orig));
                // Multi parameter space syntax
                cb = function(evt) {
                  return args[0].apply(owner, [evt].concat(args.slice(1)));
                };
              })(orig);
              owner.addEventListener(eventName, function(e) { cb(e); });
              bindRenders([chain], renderId);
            });
            owner.removeAttribute(name);
          } else {
            noTmpl = chains.length === 1 && str.substr(0,1) === '{' &&
              str.substr(-1) === '}';
            // Create rendering function for attribute.
            (renders[renderId=count++] = function(orig, clear) {
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
            bindRenders(chains, renderId);
          }
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
        var i, iter, template, renderId, insertNodes, subproxies, addkv,
            qmatch, qp, render;

        // Stop handling and recursion if subview.
        if (el_.getAttribute('vx-subview') !== null) return false;

        if (iter = parseIterator(el_)) {
          subproxies = [];
          template = el_.cloneNode(true);
          renderId = count++;
          qmatch = {};
          match(template.innerHTML).forEach(function(c) {
            c.forEach(function(p) { qmatch[p.split('.')[0]] = true; });
          });
          addkv = function(orig, k, v) {
            if (iter.key) orig[iter.key] = k;
            orig[iter.alias] = v;
          };

          for (i=iter.nodes.length; i--;)
            iter.parent.removeChild(iter.nodes[i]);

          insertNodes = function(orig, each, marker) {
            var clone = template.cloneNode(true),
                subproxy = createProxy(traverse(clone, orig)),
                nodes = Array.prototype.slice.call(clone.childNodes);
            for (i=0, len=nodes.length; i<len; i++)
              iter.parent.insertBefore(nodes[i], marker || iter.marker);
            if (each) each(nodes);
            subproxy.__nodes = nodes;
            return subproxy;
          };

          // TODO: clean up this function
          function splice(orig, ext, start, end, middle) {
            var list = resolveProp(orig, iter.prop),
                each = iter.each && resolveProp(orig, iter.each),
                splen = subproxies.length,
                ks, klen, i, i_, len, item, sp, spn, k;
            if (start == null) start = 0;
            if (list) {
              ks=keys(list);
              klen=ks.length;
              if (middle == null) middle = klen;
              len = start + middle;
              if (ext) orig = ext;
              for (i=start; i<len; i++) {
                item = list[k=ks[i]];
                addkv(orig, k, item);
                if (i-start >= end)
                  subproxies.splice(i,0,insertNodes(orig,
                    each && each.bind(null, item, k), subproxies[i].__nodes[0]));
                else if (i < splen) subproxies[i].extend(orig);
                else subproxies.push(insertNodes(orig,
                  each && each.bind(null, item, k)));
              }
            }
            if (end == null) end = subproxies.length-start;
            sps = subproxies.splice(i, end-(i-start));
            for (i=0, len=sps.length; i<len; i++) {
              sp = sps[i];
              spn = sp.__nodes;
              for (i_=spn.length; i_--;) iter.parent.removeChild(spn[i_]);
            }
          }

          (render = renders[renderId] = function(orig, ext) {
            splice(orig, ext, 0);
          })(orig);
          render.splice = function(start, end, middle) {
            splice(orig, undefined, start, end, middle);
          };
          // TODO: replace push with splice maybe
          render.push = function() {
            var list = resolveProp(orig, iter.prop),
                each = iter.each && resolveProp(orig, iter.each),
                lslen = list.length,
                i, len, k, v;
            for (i=0, len=arguments.length; i<len; i++) {
              k = lslen + i;
              v = arguments[i];
              addkv(orig, k, v);
              subproxies.push(insertNodes(orig,
                each && each.bind(null, v, k)));
            }
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
  }

  function factory() {
    var builtins_ = (arguments.length ? [].slice.call(arguments) : [builtins])
          .reduce(function(p, c) { return extend(p, c); }, {}),
        vixen_ = vixen.bind(null, builtins_);
    vixen_.builtins = builtins_;
    vixen_.factory = factory;
    return vixen_;
  }

  return factory();
}());
