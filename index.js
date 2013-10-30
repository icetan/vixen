!function(obj) {
  if (typeof module !== 'undefined')
    module.exports = obj;
  else
    window.vixen = obj;
}(function() {
  var keys = Object.keys;
  function trim(str) {return String.prototype.trim.call(str);};

  function resolveProp(obj, name) {
    return name.trim().split('.').reduce(function(p, prop) {
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

  function bucket(b, k, v) {
    if (!(k in b)) b[k] = [];
    if (!(v in b[k])) b[k].push(v);
  }

  function extend(orig, obj) {
    var ks = keys(obj), len = ks.length, i = -1, k;
    while(++i < len) (k=ks[i], orig[k] = obj[k]);
    return orig;
  }

  function traverseElements(el, callback) {
    var i;
    if (callback(el) !== false) {
      for(i = el.children.length; i--;) (function(node) {
        traverseElements(node, callback);
      })(el.children[i]);
    }
  }

  function createProxy(maps, proxy) {
    proxy = proxy || {};
    proxy.extend = function(obj) {
      var toRender = {};
      for(var prop, oks=keys(obj), oi=0, olen=oks.length;
          prop=oks[oi], oi<olen; oi++) {
        maps.orig[prop] = obj[prop];
        if (maps.binds[prop])
          for (var rid, mbp=maps.binds[prop], bi=0, blen=mbp.length;
               rid=mbp[bi], bi<blen; bi++)
            if (rid >= 0) toRender[rid] = null;
      }
      for(var rid, rks=keys(toRender), ri=0, rlen=rks.length;
          rid=rks[ri], ri<rlen; ri++)
        maps.renders[rid](maps.orig);
      return proxy;
    };

    // Map Array functions to iterator renderer functions.
    ['push', 'unshift'].forEach(function(fname) {
      proxy[fname] = function(prop) {
        var list = resolveProp(maps.orig, prop), args, render;
        if (!list) return;
        args = [].slice.call(arguments, 1);
        for (var rid, mbp=maps.binds[prop], bi=0, blen=mbp.length;
             rid=mbp[bi], bi<blen; bi++)
          if (rid >= 0) (render=maps.renders[rid])[fname].apply(render, args);
        return list[fname].apply(list, args);
      };
    });

    function def(prop) {
      var ids = maps.binds[prop], len = ids.length;
      Object.defineProperty(proxy, prop, {
        set: function(value) {
          maps.orig[prop] = value;
          for (var rid, i=0; rid=ids[i], i<len; i++)
            if (rid >= 0) maps.renders[rid](maps.orig);
        },
        get: function() {
          if (maps.rebinds[prop]) return maps.rebinds[prop]();
          return maps.orig[prop];
        }
      });
    }
    for(var prop, mbks=keys(maps.binds), mbi=0, mblen=mbks.length;
        prop=mbks[mbi], mbi<mblen; mbi++) def(prop);

    return proxy;
  }

  return function(el, model) {
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
      var binds = {},
          rebinds = {},
          renders = {},
          count = 0;
      orig = orig || {};

      function bindRenders(chains, renderId) {
        // Create property to render mapping
        for (var chain, csi=0, cslen=chains.length;
             chain=chains[csi], csi<cslen; csi++)
          // Register all chaining functions as binds.
          for (var prop, ci=0, clen=chain.length;
               prop=chain[ci], ci<clen; ci++)
            bucket(binds, prop.split('.')[0], renderId);
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
              var argProps = chain[0].split(/ +/);
              chain.splice.apply(chain, [0, chain.length].concat(argProps));
              // Multi parameter space syntax
              owner.addEventListener(eventName, function(evt) {
                var args = argProps.map(function(prop) {
                      return resolveProp(orig, prop);
                    });
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
        var i, iter, template, nodes, renderId, insertNode, offset;

        // Stop handling and recursion if subview.
        if (el_.getAttribute('vx-subview') !== null) return false;

        if (iter = parseIterator(el_)) {
          nodes = iter.nodes;
          template = el_.cloneNode(true);
          maps = traverse(template.cloneNode(true));
          renderId = count++;
          offset = 0;

          insertNode = function(orig, value, i, each_, unshift){
            var orig_ = extend({}, orig),
                clone = template.cloneNode(true),
                lastNode = unshift ? nodes[0] : iter.marker,
                maps, renderId, i_, node, nodes_ = [];
            if (iter.key) orig_[iter.key] = i;
            orig_[iter.alias] = value;
            maps = traverse(clone, orig_);
            for (i_ = clone.childNodes.length; i_--; lastNode = node) {
              nodes_.unshift(node = clone.childNodes[i_]);
              iter.parent.insertBefore(node, lastNode);
            }
            if (each_ && each_(value, i, orig_, nodes_.filter(function(n) {
              return n.nodeType === el_.ELEMENT_NODE;
            })) != null) {
              for (i_ = nodes_.length; i_--;)
                iter.parent.removeChild(nodes_[i_]);
            } else {
              nodes = unshift ? nodes_.concat(nodes) : nodes.concat(nodes_);
            }
          };

          (renders[renderId] = function(orig) {
            // TODO: clean up this setup code.
            var list = resolveProp(orig, iter.prop),
                each_ = iter.each && resolveProp(orig, iter.each), i;
            offset = 0;
            for (i = nodes.length; i--;) iter.parent.removeChild(nodes[i]);
            nodes = [];
            for (i in list) if (list.hasOwnProperty(i))
              insertNode(orig, list[i], i, each_);
          })(orig);
          renders[renderId].push = function() {
            var list = resolveProp(orig, iter.prop),
                each_ = iter.each && resolveProp(orig, iter.each), i;
            for (i in arguments) if (arguments.hasOwnProperty(i))
              insertNode(orig, arguments[i], list.length+parseInt(i), each_);
          };
          renders[renderId].unshift = function() {
            var each_ = iter.each && resolveProp(orig, iter.each),
                args = [].reverse.call(arguments), i;
            for (i in args) if (args.hasOwnProperty(i))
              insertNode(orig, args[i], --offset, each_, true);
          };

          bucket(binds, iter.prop.split('.')[0], renderId);
          keys(maps.binds).forEach(function(prop) {
            if (iter.alias.indexOf(prop) === -1) bucket(binds, prop, renderId);
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
    return createProxy(traverse(el, model && extend({}, model)), model);
  };
}());
