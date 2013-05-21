# Richard Parker

Simple template engine for two way bindings.
![Travis](https://api.travis-ci.org/manuelstofer/richardparker.png)

![Richard Parker](https://github.com/manuelstofer/richardparker/raw/master/resources/richard-parker.jpg)

> A Tiger? Richard Parker was a Tiger?
> Yeah! He got his name through a clerical error. A Hunter caught him when drinking from a
> stream when he was a cub, and named him Thirsty. When Thirsty got too big, the hunter sold
> him to our zoo, but the names got switched on the paperwork. The hunter was listed as
> Thirsty and the tiger was called Richard Parker. We laughed about it and the name stuck.


Richard Parker is a simple template engine designed for data binding with json pointers.

## Demo

[Render some tigers with Richard Parker](http://manuelstofer.github.com/richardparker/)


## Syntax

Its kind of Mustache in s-expressions.

Template:

```HTML
{has fields
  <form>
    {each fields
      {. label}: <input type="text" x-bind="{pointer name}" value="{. name}">
    }
  </form>
}
```

Data:

```Javascript
{
  fields: [
    {label: 'Hunter', name: 'Thirsty'},
    {label: 'Tiger', name: 'Richard Parker'}
  ]
}
```

Output:

```HTML
<form>
  Hunter: <input type="text" x-bind="/fields/0/name" value="Thirsty">
  Tiger: <input type="text" x-bind="/fields/1/name" value="Richard Parker">
</form>
```

In the example above {pointer} is used to generate a json pointer to the names.
This is useful to create data bindings.


## Installation

Using npm

```
$ npm install richardparker
```

Using Component

```
$ component install manuelstofer/richardparker
```

## Usage

The package can be consumed as a [component](http://github.com/component/component) or as a
[npm](http://npmjs.org/) module.

### Command-line

Richard Parker can compile templates to common js or optionally to amd modules.

```bash
$ richardparker template.html       # compile template.html and output to stdout
$ richardparker -a foo.html         # compile test.html and output as amd module
```

### Javascript API:

```Javascript

var richard = require('richardparker'),

    // render directly
    html = richard('{has title <h1>{. title}</h1>}', {name: 'foo'}),

    // compile to javascript function
    template = richard.compile('{has title <h1>{. title}</h1>}');

```

### Extensibility

New commands can be added quite easily as compile time marcros. To see how its done
checkout the native macros like has, each and pointer.



