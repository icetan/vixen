!function(obj) {
  if (typeof module !== 'undefined')
    module.exports = obj;
  else
    window.vixen = obj;
}(function() {
  function trim(str) {return String.prototype.trim.call(str);};

  function resolveProp(obj, name) {
    return name.trim().split('.').reduce(function (p, prop) {
      return p[prop];
    }, obj);
  }

  function resolveChain(obj, chain) {
    var prop = chain.shift();
    return chain.reduce(function (p, prop) {
      return resolveProp(obj, prop)(p);
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

  function createProxy(orig, maps) {
    var proxy = {},
        prop;
    proxy.extend = function(obj) {
      var toRender = {};
      Object.keys(obj).forEach(function(prop) {
        orig[prop] = obj[prop];
        if (maps.binds[prop]) maps.binds[prop].forEach(function(renderId) {
          if (renderId >= 0) toRender[renderId] = true;
        });
      });
      for (renderId in toRender) maps.renders[renderId](orig);
      return proxy;
    };

    Object.keys(maps.binds).forEach(function(prop) {
      var ids = maps.binds[prop];
      Object.defineProperty(proxy, prop, {
        set: function(value) {
          orig[prop] = value;
          ids.forEach(function(renderId) {
            if (renderId >= 0) maps.renders[renderId](orig);
          });
        },
        get: function() {
          if (maps.rebinds[prop])
            return maps.rebinds[prop]();
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

    function strTmpl(str, orig) {
      return str.replace(pattern, function (prop) {
        return orig ?
          resolveChain(orig, prop.slice(2,-2).split(pipe)) || '' :
          '';
      });
    }

    function match(str) {
      var m = str.match(pattern);
      if (m) return m.map(function(chain) {
        return chain.slice(2, -2).split(pipe).map(trim);
      });
    }

    function traverse(el) {
      var binds = {},
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
        var eventId, renderId, str;
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
            // Create rendering function for attribute.
            renderId = count++;
            (renders[renderId] = function(orig, clear) {
              var val = strTmpl(str, orig);
              //if (clear) return owner.setAttribute(attr.name, val);
              !clear && attr.name in owner ? owner[attr.name] = val :
                owner.setAttribute(attr.name, val);
            })(undefined, true);
            // Bi-directional coupling.
            chains.forEach(function(chain) {
              rebinds[chain[0]] = function() {
                // TODO: Getting f.ex. 'value' attribute from an input
                // doesn't return user input value so accessing element
                // object properties directly, find out how to do this
                // more securely.
                return attr.name in owner ?
                  owner[attr.name] : owner.getAttribute(attr.name);
              };
            });
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
            })();
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
          renders[renderId] = function(orig) {
            var list = resolveProp(orig, iter.prop),
                each_ = iter.each && resolveProp(orig, iter.each),
                orig_ = extend({}, orig), i;
            for (i = nodes.length; i--;) iter.parent.removeChild(nodes[i]);
            nodes = [];
            for (i in list) if (list.hasOwnProperty(i)) (function(value, i) {
              var clone = template.cloneNode(true),
                  lastNode = iter.marker,
                  maps, renderId, i_, node, nodes_ = [];
              maps = traverse(clone);
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
          };
          bucket(binds, iter.prop.split('.')[0], renderId);
          for (p in maps.binds) if (iter.alias.indexOf(p) === -1)
            bucket(binds, p, renderId);
          // Stop recursion if iterator.
          return false;
        } else {
          // Bind node text.
          mapTextNodes(el_);
          // Bind node attributes text.
          for (i = el_.attributes.length; i--;)
            mapAttribute(el_, el_.attributes[i]);
        }
      });
      return {binds:binds, rebinds:rebinds, renders:renders};
    }
    return createProxy(orig, traverse(el));
  };
}());
