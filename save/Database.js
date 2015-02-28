var Promise = require('bluebird');
var spawn = require('child_process').spawn;
var noop = function() {};
var stringArrayToNumberArray = function(array) {
    return array.map(Number);
};
var firstElement = function(array) {
    if(array.length === 0) {
        throw new Error();
    }
    return array[0];
};

module.exports = Database;

function Database(cfg) {
    this._cfg = cfg;
}

Database.prototype = {
    _cfg: null,
    _query: function(sql) {
        return new Promise(function(resolve, reject) {
            var inputProcess = spawn(this._cfg.adb, [
                'shell',
                'sqlite3',
                '/data/data/com.android.providers.telephony/databases/mmssms.db',
                sql.toString()
            ]);
            var results = '';
            inputProcess.stdout.on('data', function(data) {
                results += data.toString();
            });
            inputProcess.on('exit', function(code) {
                if(code === 0) {
                    var rows = results.split('\r\n');
                    rows.pop();
                    resolve(rows);
                } else {
                    reject(new Error('adb shell sqlite3 ' + sql + ' exited with code ' + code));
                }
            });
        }.bind(this));
    },
    readMessageIds: function() {
        return this._query('SELECT date,address FROM sms');
    },
    _idToWhere: function(stringId) {
        var id = stringId.split('|');
        var address = id[1].substr(0, 1) === '+' ? ('+' + Number(id[1].substr(1))) : Number(id);
        return 'date='+Number(id[0])+' AND address=\'' + address + '\'';
    },
    readMessageCountById: function(id) {
        return this._query('SELECT COUNT(*) FROM sms WHERE ' + this._idToWhere(id)).then(firstElement).then(Number);
    },
    readMessagePropertyById: function(id, property) {
        if(['body', 'address', 'date'].indexOf(property) < 0) {
            return Promise.reject();
        }
        return this.readMessageCountById(id).then(function(count) {
            if(count !== 1) {
                throw new Error();
            }
            return this._query('SELECT ' + property + ' FROM sms WHERE ' + this._idToWhere(id)).then(firstElement);
        }.bind(this));
    },
    readMessageBodyById: function(id, cb) {
        return this.readMessagePropertyById(id, 'body', cb);
    },
    readMessageAuthorById: function(id, cb) {
        return this.readMessagePropertyById(id, 'address', cb);
    },
    readMessageDateById: function(id) {
        return this.readMessagePropertyById(id, 'date').then(Number).then(Date);
    },
    readMessageById: function(id) {
        return Promise.props({
            id: Promise.resolve(id),
            author: this.readMessageAuthorById(id),
            date: this.readMessageDateById(id),
            body: this.readMessageBodyById(id)
        });
    },
    deleteMessageById: function(id) {
        return this.readMessageCountById(id).then(function(count) {
            if(count !== 1) {
                throw new Error();
            }
            return this._query('DELETE FROM sms WHERE ' + this._idToWhere(id)).then(noop);
        }.bind(this));
    }
};
