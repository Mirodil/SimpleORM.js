(function (win) {
    /**
     * create database instance
     * @param {[type]} db [description]
     */
    function Database(db, config) {
        this.db = db;
        this._tables = {};
        this._config = config || {};
    }

    /**
     * add table to database
     * @param {[type]} table schema
     */
    Database.prototype.addTable = function (tableSchema) {
        if (!tableSchema instanceof TableSchema)
            throw new Error('`tableSchema` should be instance of TableSchema');

        var table = Database._tableBuilder(this.db, tableSchema);

        this._tables[tableSchema.name] = table;

    };

    /**
     * gets table by table name
     * @param {[type]} name table name
     */
    Database.prototype.Tables = function (name) {
        var table = this._tables[name];
        return table;
    };

    /**
     * create tables 
     * @return {[type]} [description]
     */
    Database.prototype.up = function (recreate, callback) {

        var that = this;
        callback = typeof (recreate) === 'function' ? recreate : callback;
        recreate = typeof (recreate) === 'function' ? false : recreate;

        that.db.transaction(function (tx) {

            Object.keys(that._tables).forEach(function (name) {
                var table = that._tables[name];
                if (recreate) {
                    that.dropTable(name, tx);
                }
                that.createTable(table, tx);
            });

            // if up method exists
            that._config.up && that._config.up.call(that, tx);

        }, function (err) {
            callback && callback(err, null);
        }, function () {
            callback && callback(null, null);
        });
    };

    /**
     * drop table
     * @param  {[type]} name table name
     * @param  {[type]} db   database or transaction instnace
     * @return {[type]}      [description]
     */
    Database.prototype.dropTable = function (name, tx, callback) {
        var query = 'DROP TABLE IF EXISTS {name}';
        tx = tx || this.db;
        callback = callback || function () { };


        query = query.replace('{name}', name);

        tx.executeSql(query, [], callback);
    };

    Database.prototype.createTable = function (table, tx, callback) {
        var query = 'CREATE TABLE IF NOT EXISTS {name} ({cols});';
        callback = callback || function () { };
        tx = tx || this.db;

        var cols = table.schema.paths.map(function (key) {
            return Database._createColumn(key, table.schema.columns[key]);
        }).join(', ');

        query = query.replace('{name}', table.schema.name)
            .replace('{cols}', cols);

        tx.executeSql(query, [], callback);
    };

    Database.prototype.query = function (query, callback) {

        var dbQuery = {};
        Object.keys(query).map(function (key) {
            dbQuery[key] = jsTypeConvertor(query[key]);
        });

        Database.executeSql(this.db, dbQuery, null, callback);
    };

    Database._tableBuilder = function (db, schema) {
        /**
         * [Table description]
         * @param {[type]} db     [description]
         * @param {[type]} schema [description]
         */
        function Table(obj) {

            this._doc = {};

            schema.paths.forEach(function (key) {
                if (obj[key] !== void (0))
                    this._doc[key] = obj[key];
                define(key, this);
            }, this);
        }

        /**
         * insert object to database
         * @param  {[type]}   db       database instance
         * @param  {[type]}   obj      object
         * @param  {Function} callback function
         */
        Table.insert = function (obj, callback) {
            var cols = [];
            var values = [];

            schema.paths.forEach(function (key) {
                if (obj[key] !== void (0)) {
                    cols.push(key);
                    values.push(schema.jsValToDbVal(key, obj[key]));
                }
            });

            var valspttr = values.map(function () {
                return '?';
            }).join(', ');

            var query = 'INSERT INTO {name} ({cols}) VALUES ({vals})'
            .replace('{name}', schema.name)
            .replace('{cols}', '"' + cols.join('", "') + '"')
            .replace('{vals}', valspttr);

            Database.executeSql(db, query, values, function (err, res) {
                if (err)
                    return callback && callback(err, null);

                callback && callback(null, { insertId: res.insertId, affected: res.rowsAffected });
            });
        };

        /**
         * select document
         * @param {Object} ops {columns:'', where:'', group:'', having:'', order:'', limit:0, offset: 0}
         */
        Table.select = function (ops, callback) {
            // try create query
            //SELECT [ALL | DISTINCT] result [FROM table-list] [WHERE expr] [GROUP BY expr-list] [HAVING expr] [compound-op select]* [ORDER BY sort-expr-list] [LIMIT integer [( OFFSET | , ) integer]]
            var query = 'SELECT {cols} FROM {name}'
            .replace('{name}', schema.name)
            .replace('{cols}', ops.columns || '*');

            if (ops.where)
                query += ' WHERE ' + ops.where;
            if (ops.group)
                query += ' GROUP BY ' + ops.group;
            if (ops.having)
                query += ' HAVING ' + ops.having;
            if (ops.order)
                query += ' ORDER BY ' + ops.order;
            if (ops.limit)
                query += ' LIMIT ' + ops.limit;
            if (ops.offset)
                query += ' OFFSET ' + ops.offset;

            Database.executeSql(db, query, [], function (err, res) {
                if (err)
                    return callback && callback(err, null);

                res = transformSqlResult(res);
                var rows = res.rows.map(function (row) {
                    return transformFromDb(row, schema);
                });
                callback && callback(null, rows);
            });
        };

        Table.update = function (obj, where, callback) {
            callback = typeof (where) === 'function' ? where : callback;
            where = typeof (where) === 'function' ? null : where;

            var sets = [];
            var values = [];
            var expr = [];

            schema.paths.forEach(function (key) {
                if (schema.primaryKeys.indexOf(key) < 0 || schema.primaryKeys.indexOf(key) > -1 && where) {
                    if (obj[key] !== void (0)) {
                        sets.push(key + '=?');
                        values.push(schema.jsValToDbVal(key, obj[key]));
                    }
                } else if (schema.primaryKeys.indexOf(key) > -1 && !where) {
                    expr.push(key + '="' + obj[key] + '"');
                }
            });

            // UPDATE tableName SET assignment [, assignment]* [WHERE expr]
            var query = 'UPDATE {name} SET {sets}'
            .replace('{name}', schema.name)
            .replace('{sets}', sets.join(', '));

            if (where)
                query += ' WHERE ' + where;
            else if (schema.primaryKeys.length > 0)
                query += ' WHERE ' + expr.join(' AND ');

            Database.executeSql(db, query, values, function (err, res) {
                if (err)
                    return callback && callback(err, null);

                callback && callback(null, { affected: res.rowsAffected });
            });
        };

        Table.delete = function (where, callback) {
            //DELETE FROM tableName [WHERE expr]
            var query = 'DELETE FROM {name}'
            .replace('{name}', schema.name);

            if (where)
                query += ' WHERE ' + where;

            Database.executeSql(db, query, [], callback);
        };

        Table.prototype.get = function (key) {
            return this._doc[key];
        };

        Table.prototype.set = function (key, val) {
            return this._doc[key] = val;
        };

        /**
         * save
         */
        Table.prototype.save = function (callback) {
            Table.insert(this._doc, callback);
        };

        //Object.defineProperty(Table, 'name', {
        //    get: function () {
        //        return schema.name;
        //    }
        //});

        Object.defineProperty(Table, 'schema', {
            get: function () {
                return schema;
            }
        });

        return Table;
    };

    /**
     * build string for creating columns
     * @param  {String} name column name
     * @param  {Object} ops  options { 
     *                       			type: 'INTEGER', 
     *                       			primaryKey: true, 
     *                       			allowNull: false, 
     *                       			unique:true, 
     *                       			autoinc:true, 
     *                       			default:[CURRENT_DATE|CURRENT_TIME|CURRENT_TIMESTAMP|<any>],
     *                       			datetimeFn:'date|time|datetime|julianday|strftime',
     *                       			modifiers:'NNN days|NNN hours|NNN minutes|NNN.NNNN seconds|NNN months|NNN years|start of month|start of year|start of day|weekday N|unixepoch|localtime|utc'
     *                       		}
     * @return {String}      string for column
     * 
     */
    Database._createColumn = function (name, ops) {
        var q = name;
        q += ' ' + ops.type;
        if (ops.primaryKey) {
            q += ' PRIMARY KEY';
            if (ops.autoinc === true) {
                q += ' AUTOINCREMENT';
            }
        }
        if (ops.allowNull === false) {
            q += ' NOT NULL';
        }
        if (ops.default) {
            q += ' DEFAULT ' + ops.default;
        }
        return q;
    };

    Database.executeSql = function (db, query, values, callback) {

        var isErrorCbCalled = false;
        var sucessCallback = function (t, r) {
            callback && callback(null, r);
            isErrorCbCalled = true;
        };

        var errorCallback = function (t, e) {
            !isErrorCbCalled && callback && callback(e, null);
            isErrorCbCalled = true;
        };

        db.transaction(function (tx) {
            tx.executeSql(query, values, sucessCallback, errorCallback);
        }, function (err) {
            console.log(err);
            errorCallback(null, err);
            return false;
        }, function () {
            console.log('transaction finished');
        });
    };

    /**
     * create new table instance
     * @param {[type]} ops table options
     */
    Database.Table = function (ops) {
        return new TableSchema(ops);
    };

    /*
     * Defines the accessor named prop on the incoming prototype.
     */
    function define(prop, prototype) {
        Object.defineProperty(prototype, prop, {
            enumerable: true,
            get: function () {
                return this.get(prop);
            },
            set: function (v) {
                return this.set(prop, v);
            }
        });
    }

    function transformFromDb(row, schema) {
        Object.keys(row).map(function (key) {
            row[key] = schema.dbValToJsVal(key, row[key]);
        });
        return row;
    };

    function transformToDb(obj, schema) {
        Object.keys(row).map(function (key) {
            row[key] = schema.jsValToDbVal(key, row[key]);
        });
        return row;
    }

    function transformSqlResult(res) {
        var doc = { rows: [], insertId: null, affected: 0 };

        for (var i = 0; i < res.rows.length; i++) {
            doc.rows.push(res.rows.item(i));
        }
        //res.insertId = res.insertId;
        //res.affected = res.rowsAffected;
        return doc;
    }

    function jsTypeConvertor(val) {
        var type = Object.prototype.toString.call(val);

        switch (type) {
            case '[object Boolean]':
                return val ? 1 : 0;
                break;
            case '[object Date]':
                return (val instanceof Date) && val.getTime ? Math.round(val.getTime() / 1000) : val;
            default:
                return val;
                break;
        }
    }

    win.Database = Database;
})(window);
(function (win) {
    'use strict';
    /**
     * create a new table schema
     * @param {[type]} ops [description]
     */
    function TableSchema(ops) {
        if (!ops)
            throw new Error('Argument exeption `ops`');
        if (!ops.name)
            throw new Error('`name` cannot be null or empty');
        if (!ops.columns)
            throw new Error('cannot create table without columns');

        this.name = ops.name;
        this.columns = ops.columns;
        this.init();
    }

    /**
     * init schema props
     */
    TableSchema.prototype.init = function () {
        this.primaryKeys = [];
        this.paths = Object.keys(this.columns);

        this.paths.forEach(function (key) {

            var dbtype = this.columns[key].type;
            this.columns[key].dbtype = (dbtype.indexOf('(') > 0 ? dbtype.substring(0, dbtype.indexOf('(')) : dbtype).trim().toUpperCase();

            this.columns[key].jstype = jsypes(this.columns[key].dbtype);

            if (this.columns[key].primaryKey === true)
                this.primaryKeys.push(key);

        }, this);
    };
    /**
     * Converts a value from the database to a value suitable for the js
     * (also does type conversions, if necessary)
     */
    TableSchema.prototype.dbValToJsVal = function (key, val) {
        if (val === null || val === undefined) {
            return val;
        }

        var ops = this.columns[key];

        switch (ops.dbtype) {
            case 'BIGINT':
            case 'INTEGER':
                return parseInt(val);
                break;
            case 'DOUBLE':
            case 'FLOAT':
            case 'REAL':
            case 'NUMERIC':
                return parseFloat(val);
                break;
            case 'BOOL':
                return val === 1 || val === '1';
                break;
            case 'DATE':
            case 'DATETIME':
                // covert string date `2015-08-08 14:18:00` to date
                if (Object.prototype.toString.call(val) === '[object String]') {
                    return new Date(val);
                } else
                    // SQL is in seconds and JS in miliseconds
                    if (val > 1000000000000) {

                        // usually in seconds, but sometimes it's milliseconds
                        return new Date(parseInt(val, 10));
                    } else {
                        return new Date(parseInt(val, 10) * 1000);
                    }
                break;
            default:
                return val;
        }
    };

    /**
     * Converts an entity value to a database value, inverse of
     *   dbValToEntityVal
     */
    TableSchema.prototype.jsValToDbVal = function (key, val) {
        if (val === undefined || val === null) {
            return null;
        }

        var ops = this.columns[key];

        switch (ops.dbtype) {
            case 'BIGINT':
            case 'INTEGER':
                return parseInt(val);
                break;
            case 'DOUBLE':
            case 'FLOAT':
            case 'REAL':
            case 'NUMERIC':
                return parseFloat(val);
                break;
            case 'BOOL':
                return (val === 'false') ? 0 : (val ? 1 : 0);
                break;
            case 'CHAR':
            case 'TEXT':
            case 'VARCHAR':
            case 'BLOB':
                return val;
                break;
            case 'DATE':
            case 'DATETIME':
                // In order to make SQLite Date/Time functions work we should store
                // values in seconds and not as miliseconds as JS Date.getTime()
                return (val instanceof Date) && val.getTime ? Math.round(val.getTime() / 1000) : val;
            default:
                return val;
        }
    };

    /**
     * [jsypes description]
     * @param  {[type]} dbtype database type
     * @return {[type]}        javascript type
     */
    function jsypes(dbtype) {
        switch (dbtype) {
            case 'INTEGER':
            case 'DOUBLE':
            case 'FLOAT':
            case 'REAL':
            case 'NUMERIC':
                return Number;
            case 'BOOL':
                return Boolean;
            case 'CHAR':
            case 'TEXT':
            case 'VARCHAR':
            case 'BLOB':
                return String;
            case 'DATETIME':
                return Date;
            default:
                return String;
        }
    };

    win.TableSchema = TableSchema;

})(window);