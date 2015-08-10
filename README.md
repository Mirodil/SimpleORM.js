SimpleORM.js
==============

`SimpleORM.js` is an asynchronous Javascript object-relational mapper library.
It can be used in the web browser and on the Cordova applications with [Cordova-sqlite-storage](https://github.com/litehelpers/Cordova-sqlite-storage).
It currently supports [HTML5 WebSQL database](http://dev.w3.org/html5/webdatabase/), a somewhat controversial part of HTML5 that is supported in Webkit
browsers, specifically on mobile devices, including iPhone, Android and Palm's WebOS.

`SimpleORM.js` has no dependencies on any other frameworks.

*The project is actively in development.*

Using SimpleORM.js
===================================

Browser support
---------------

* Modern browsers (Google Chrome and Safari)
* [Cordova-sqlite-storage](https://github.com/litehelpers/Cordova-sqlite-storage) inside Cordova applications
* Other browsers supporting `WebSQL` (e.g. Firefox)

Setting up
----------

* Using `bower`:

```shell
bower install <url>
```

Add a `<script>` to your `index.html`:

`build/orm.js` needs to be added, as well as any data stores you want to use:

    <script src="/bower_components/simpleormjs/build/orm.js"></script>

* Using directly from source:

    git clone git://github.com/mirodil/simpleormjs.git

Copy directories you will need following almost the same instructions above.

Setup your database
-------------------

You need to explicitly configure the data store you want to use and create:

```javascript
/// for web browsers
var db = openDatabase('books.db','3.0','Books database', 65536);
```
```javascript
/// for codova applications with SQLitePlugin pulgin
var db = openDatabase('books.db','3.0','Books database', 65536);
```
then provide create `db` to `SimpleORM.js` as first argument.

```javascript
var database = new Database(db);
database.addTable(BookSchema);

// the first argument is define whether recreate database tables or not
database.up(true, function(err){
if(err)
return console.log(err);

var Books = database.Tables('books');

Books.insert({name:'You Don’t Know JS: Up & Going', author:'Someone', published: true});
Books.update({id:1, name:'You Don’t Know JS: Up & Going'});

Books.select({}, function(err, books){
console.table(books);

books.forEach(function(book){
Books.delate(book.id);
});
});

});
```

Schema definition
-----------------

A data model is declared using `Database.Table`. The following definitions define a `BookSchema` entity with a 
few simple properties. The property types are based on [SQLite types](http://www.sqlite.org/datatype3.html):

* `TEXT`, `CHAR` and `VARCHAR`: for textual data 
* `INTEGER`, `DOUBLE`, `FLOAT`, `REAL` and `NUMERIC`: for numeric values
* `BOOL`: for boolean values (`true` or `false`)
* `DATE` and `DATETIME`: for date/time value (with precision of 1 second)

Example use:

```javascript

var BookSchema = Database.Table({
/**
* table name for creating and accessing to the table
*/
name:'books', 
columns:{ 
/**
* this will create `id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE`
*/
id:{
type: 'INTEGER', //Number
primaryKey: true,
allowNull: false,
unique:true,
autoinc:true
},
/**
* this wil create `name NVARCHAR(100)`
*/
name:{
type: 'NVARCHAR(100)'
},
/**
* this will create `published BOOL`
*/
published:{
type: 'BOOL',
},
/**
* this will create `created DATETIME DEFAULT CURRENT_TIMESTAMP`
*/
created:{
type:'DATETIME',
default: 'CURRENT_TIMESTAMP'
}
}
});

```

The created schema should be add to database and can be used to create new instances of these entities later.

```javascript
database.addTable(BookSchema);
```

The columns support the following fields:

```javascript
{ 
type: 'INTEGER', 
primaryKey: true, 
allowNull: false, 
unique:true, 
autoinc:true, 
default:[CURRENT_DATE|CURRENT_TIME|CURRENT_TIMESTAMP|<any>]
}
```

Creating and manipulating objects
---------------------------------

Inserting
---------------------------------

```javascript
    var Books = database.Tables('books');
    Books.insert({name:'You Don’t Know JS: Up & Going', author:'Someone', published: true}, function(err, res){
    // TODO: ...
    });
```

Updating
---------------------------------

```javascript
    var Books = database.Tables('books');
    Books.update({name:'You Don’t Know JS: Up & Going'}, 'id=1', function(err, res){
        // TODO: ...
    });
    Books.update({id:1, name:'You Don’t Know JS: Up & Going'}, function(err, res){
        // TODO: ...
    });
```

Query collections
---------------------------------

```javascript
    var Books = database.Tables('books');
    Books.select({}, function(err, rows){
        // TODO: ...
    });
```
The `select` supports the following fields:

```javascript
   {
       columns:'', // default '*'
       where:'',   // default empty
       group:'',   // default empty
       having:'',  // default empty
       order:'',   // default empty
       limit:0,    // default empty
       offset: 0   // default empty
   }
```

Deleting
---------------------------------
```javascript
    var Books = database.Tables('books');
    Books.delete('id=1', function(err, res){
        // TODO: ...
    });
```
Bugs and Contributions
======================

If you find a bug, please [report it](https://github.com/zefhemel/persistencejs/issues). or fork the
project, fix the problem and send me a pull request.

For support and discussion, please drop me an email.

License
=======

This work is licensed under the [MIT license](http://en.wikipedia.org/wiki/MIT_License).