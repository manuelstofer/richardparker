/*global describe, it*/
if (typeof render == 'undefined') {
    var render = require('..'),
        chai = require('chai');
}

chai.should();

describe('.', function () {

    it('should display a attribute', function () {
        var tiger = {name: 'richard parker'};
        render('they call me {. name}', tiger).should.equal('they call me richard parker');
    });

    it('should display an element of an array', function () {
        var site = {pages: ['about', 'news']};
        render('{. pages[1]}', site).should.equal('news');
        render('{. pages.1}', site).should.equal('news');
    });
});

describe('has', function () {

    it('should render when attribute is set', function () {
        var tiger = {name: 'richard parker'};
        render('{has .name hello {. name}}', tiger).should.equal('hello richard parker');
    });

    it('should not render when attribute is not set', function () {
        var tiger = {};
        render('{has .name hello richard}', tiger).should.equal('');
    });

    it('should not render when attribute is set but falsey', function () {
        var tiger = {name: false};
        render('{has .name does render}', tiger).should.equal('');
    });
});

describe('each', function () {

    it('should iterate over an array', function () {
        var site = {pages: ['about', 'news']};
        render('{each .pages {.} }', site).should.equal('about news ');
    });

    it('should iterate over an object', function () {
        var richard = {foo: {name: 'richard parker', age: 12}};
        render('{each .foo {.} }', richard).should.equal('richard parker 12 ');
    });

    it('should iterate over the root attributes of an object', function () {
        var richard = {name: 'richard parker', age: 12};
        render('{each . {.} }', richard).should.equal('richard parker 12 ');
    });
});

describe('path', function () {

    it('path should output the current path in the data structure', function () {
        var site = {bar: [{foo: 3}]};
        render('{each .bar {path .foo}}', site).should.equal('.bar.0.foo');
    });
});

describe('->', function () {

    it('-> should move down in path', function () {
        var site = {person: {name: 'Thirsty'}};
        render('{-> .person.name {path}}', site).should.equal('.person.name');
        render('{-> .person.name {path .}}', site).should.equal('.person.name');
        render('{-> .person.name {.}}', site).should.equal('Thirsty');
        render('{-> .person {. name}}', site).should.equal('Thirsty');
    });
});

describe('macros', function () {

    it('can add custom macro', function () {
        var macro = {
            'custom-macro': function () {
                return render.compile.helper.output('foo');
            }
        };
        render('{custom-macro}', {}, macro).should.equal('foo');
    });

    it('two macros can begin with the same name', function () {
        var macro = {
            'custom-macro': function () {
                return render.compile.helper.output('foo');
            },
            'custom-macro2': function () {
                return render.compile.helper.output('foo2');
            }
        };
        render('{custom-macro}', {}, macro).should.equal('foo');
        render('{custom-macro2}', {}, macro).should.equal('foo2');
    });
});

describe('the example in readme.md', function () {

    it('should be correct except for whitespace', function () {
        var template =
                '{has .fields ' +
                '  <form> ' +
                '    {each .fields ' +
                '      {. label}: <input type="text" x-bind="{path .name}" value="{. name}"> ' +
                '    } ' +
                '  </form>' +
                '}',

            data = {
                fields: [
                    {label: 'Hunter', name: 'Thirsty'},
                    {label: 'Tiger', name: 'Richard Parker'}
                ]
            },

            output =
                '<form> ' +
                '  Hunter: <input type="text" x-bind=".fields.0.name" value="Thirsty"> ' +
                '  Tiger: <input type="text" x-bind=".fields.1.name" value="Richard Parker"> ' +
                '</form>';

        render(template, data).replace(/\s/g, '').should.equal(output.replace(/\s/g, ''));
    });
});


