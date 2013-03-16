!function(obj) {
  if (typeof module !== 'undefined')
    module.exports = obj;
  else
    window.kitsun = obj;
}(function() {
  var trim = Function.prototype.call.bind(String.prototype.trim);

  function resolveProp(obj, name) {
    return name.trim().split('.').reduce(function (p, prop) {
      return p[prop];
    }, obj);
  }

  function resolveChain(obj, chain, node) {
    var prop = chain.shift();
    return chain.reduce(function (p, prop) {
      return resolveProp(obj, prop)(p, node);
    }, resolveProp(obj, prop));
  }

  function bucket(b, k, v) {
    if (!(k in b)) b[k] = [];
    if (!(v in b[k])) b[k].push(v);
  }

  function extend(orig, obj) {
    Object.getOwnPropertyNames(obj).forEach(function(prop) {
      orig[prop] = obj[prop];
    });
    return orig;
  }

  function traverseElements(el, callback) {
    if (callback(el) !== false) {
      Array.prototype.forEach.call(el.children, function (node) {
        traverseElements(node, callback);
      });
    }
  }

  function createProxy(orig, binds, rebinds, renders) {
    var proxy = {},
        prop;
    proxy.extend = function(obj) {
      var toRender = {};
      Object.getOwnPropertyNames(obj).forEach(function(prop) {
        orig[prop] = obj[prop];
        if (binds[prop]) binds[prop].forEach(function(nodeId) {
          if (nodeId >= 0) toRender[nodeId] = true;
        });
      });
      for (nodeId in toRender) renders[nodeId](orig);
      return proxy;
    };

    Object.getOwnPropertyNames(binds).forEach(function(prop) {
      var ids = binds[prop];
      Object.defineProperty(proxy, prop, {
        set: function(value) {
          orig[prop] = value;
          ids.forEach(function(nodeId) {
            if (nodeId >= 0) renders[nodeId](orig);
          });
        },
        get: function() {
          if (rebinds[prop])
            return rebinds[prop]();
          return orig[prop];
        }
      });
    });
    return proxy;
  }

  return function(el) {
    var orig = {},
        pattern = /\{\{.+?\}\}/g,
        pipe = '|';

    function strTmpl(str, orig, node) {
      return str.replace(pattern, function (prop) {
        return orig ?
          resolveChain(orig, prop.slice(2,-2).split(pipe), node) || '' :
          '';
      });
    }

    function traverse(el) {
      var binds = {},
          rebinds = {},
          renders = {},
          count = 0;

      function mapTextNodes(node) {
        Array.prototype.forEach.call(node.childNodes, function(n) {
          var m, str, nodeId, chains, el, eventName;

          if (n.nodeType === node.TEXT_NODE && (str = n.nodeValue)) {
            m = str.match(pattern);
            if (m) {
              chains = m.map(function(chain) {
                return chain.slice(2, -2).split(pipe).map(trim);
              });
              // Add event listeners
              if (node.nodeType === node.ATTRIBUTE_NODE &&
                  node.ownerElement) {
                el = node.ownerElement;
                if (node.name.indexOf('on') === 0) {
                  nodeId = -1; // No renderer
                  eventName = node.name.substr(2);
                  chains.forEach(function(chain) {
                    el.addEventListener(eventName, function(evt) {
                      return resolveProp(orig, chain[0])(evt, el.value);
                    });
                  });
                  el.removeAttributeNode(node);
                } else {
                  // Create rendering function for attribute.
                  nodeId = count++;
                  (renders[nodeId] = function(orig, clear) {
                    var val;
                    if (clear) return el.removeAttributeNode(node);
                    val = strTmpl(str, orig, node);
                    if (el.hasOwnProperty(node.name))
                      el[node.name] = val;
                    else
                      el.setAttribute(node.name, val);
                  })(undefined, true);
                  // Bi-directional coupling.
                  chains.forEach(function(chain) {
                    rebinds[chain[0]] = function() {
                      // TODO: Getting f.ex. 'value' attribute form an input
                      // doesn't return user input value so accessing element
                      // object properties directly, find out how to do this
                      // more securely.
                      return el.hasOwnProperty(node.name) ?
                        el[node.name] : el.getAttribute(node.name);
                    };
                  });
                }
              } else {
                // Create rendering function for element text node.
                nodeId = count++;
                (renders[nodeId] = function(orig, clear) {
                  n.nodeValue = clear ? '' : strTmpl(str, orig, n);
                })(undefined, true);
              }
              // Create property to render mapping
              chains.forEach(function(chain) {
                // TODO: Register chaining functions as binds as well.
                bucket(binds, chain[0].split('.')[0], nodeId);
              });
            }
          }
        });
      }

      // Remove no-traverse attribute if root node
      el.removeAttribute('data-subview');

      traverseElements(el, function(el_) {
        var iterator, template, nodeId, prop, alias, each;

        // Stop handling and recursion if subview.
        if (el_.hasAttribute('data-subview')) return false;

        iterator = el_.getAttribute('data-iterate');
        if (iterator) {
          iterator = iterator.split(' in ');
          alias = iterator[0].split(',').map(trim);
          prop = iterator[1].trim();
          template = el_.cloneNode(true);
          template.removeAttribute('data-iterate');
          each = template.getAttribute('data-each');
          maps = traverse(template.cloneNode(true));
          nodeId = count++;
          renders[nodeId] = function(orig) {
            var list = resolveProp(orig, prop), i,
                each_ = each && resolveProp(orig, each),
                orig_ = extend({}, orig);
            el_.innerHTML = '';
            for (i in list) if (list.hasOwnProperty(i))
              (function(value, i) {
                var clone = template.cloneNode(true),
                    maps, nodeId;
                maps = traverse(clone);
                orig_[alias[0]] = value;
                if (alias[1]) orig_[alias[1]] = i;
                if (!each_ || each_(value, i, orig_, clone) == null) {
                  for (nodeId in maps.renders) maps.renders[nodeId](orig_);
                  Array.prototype.slice.call(clone.childNodes)
                  .forEach(function(n){
                    el_.appendChild(n);
                  });
                }
              })(list[i], i);
          };
          bucket(binds, prop.split('.')[0], nodeId);
          for (p in maps.binds) if (alias.indexOf(p) === -1)
            bucket(binds, p, nodeId);
        } else {
          // Bind node text.
          mapTextNodes(el_);
        }
        // Bind node attributes text.
        Array.prototype.slice.call(el_.attributes).forEach(mapTextNodes);
        // Stop recursion if iterator.
        return !iterator;
      });
      return {binds:binds, rebinds:rebinds, renders:renders};
    }
    var maps = traverse(el);
    return createProxy(orig, maps.binds, maps.rebinds, maps.renders);
  };
}());
