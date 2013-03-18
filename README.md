<img src="https://raw.github.com/icetan/vixen/gh-pages/logo.png">

Vixen
=====

Minimal string/DOM templating hybrid developed for use with node-webkit.

Only ~7.3kb and ~4.4kb minified.

Example usage
-------------

```html
<div id="view">
  <h1>I'm {{me.name}}</h1>

  <h2>And I like</h2>
  <ul data-iterate="like,i in me.likes">
    <li class="{{i | alt}}">{{like}}</li>
  </ul>

  <input value="{{message}}" placeholder="Write something…"/>
  <button onclick="{{shout}}">and try my event handling</button>
</div>
```

```javascript
var view = vixen(document.getElementById('view')).extend({
  me: {
    name: 'Vixen',
    likes: [ 'Trampolines', 'Geese', 'Washing machines', 'Other foxes' ]
  },
  shout: function() {
    alert('You wrote: "'+view.message+'".');
    view.message = '';
  },
  alt: function(i) { return i%2 === 0 ? 'dark' : 'light'; }
});
```

*Not IE6-8 compatible yet.*
