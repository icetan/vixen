Vixen
=====

String/DOM templating hybrid developed for use with node-webkit.

*Not IE6-8 compatible yet.*

Example usage
-------------

```html
<div id="view">
  <h1>I'm {{me.name}}</h1>

  <h2>And I like</h2>
  <ul data-iterate="like,i in me.likes">
    <li class="{{i | alt}}">{{like}}</li>
  </ul>

  <input value="{{message}}"/>
  <button onclick="{{shout}}">Give me a shout</button>
</div>
```

```javascript
var view = vixen(document.getElementById('view')).extend({
  me: {
    name: 'Vixen',
    likes: [ 'Trampolines', 'Mice', 'Other foxes' ]
  },
  shout: function() {
    alert('I\'ll tell Kriss you said: "'+view.message+'".');
    view.message = '';
  },
  alt: function(i) { return i%2 === 0 ? 'dark' : 'light'; }
});
```
