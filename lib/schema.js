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