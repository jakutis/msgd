var crypto = require('crypto');
global.window = global;
global.document = {};
global.navigator = {};
var bean = require('bean');
var http = require('http');
var a = require('async');
var v = require('valentine');
var spawn = require('child_process').spawn;
var adb = '/home/tahu/opt/android-sdk/platform-tools/adb';
var fs = require('fs');
var book = JSON.parse(fs.readFileSync('./book.json'));
var query = function(sql, cb) {
    console.log('query: ' + sql);
    var inputProcess = spawn(adb, [
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
            cb(null, results);
        } else {
            cb(new Error('adb shell sqlite3 ' + sql + ' exited with code ' + code));
        }
    });
};

var sendKey = function(key, cb) {
    console.log('sendKey: ' + key);
    var inputProcess = spawn(adb, [
        'shell',
        'input',
        'keyevent',
        key.toString()
    ]);
    inputProcess.on('exit', function(code) {
        if(code === 0) {
            cb(null);
        } else {
            cb(new Error('adb shell input keyevent ' + key + ' exited with code ' + code));
        }
    });
};

var sendSMS = function(number, message, cb) {
    console.log('sendSMS: ' + number + ' ' + message);
    var writeProcess = spawn(adb, [
        'shell',
        'am',
        'start',
        '-a',
        'android.intent.action.SENDTO',
        '-d',
        'sms:' + number,
        '--es',
        'sms_body',
        message,
        '--ez',
        'exit_on_sent',
        'true'
    ]);
    writeProcess.on('exit', function(code) {
        if(code !== 0) {
            cb(new Error('adb SENDTO exited with code ' + code));
            return;
        }
        sendKey(22, function(err) {
            if(err) {
                cb(err);
                return;
            }
            setTimeout(function() {
                sendKey(23, function(err) {
                    if(err) {
                        cb(err);
                        return;
                    }
                    setTimeout(function() {
                        cb(null);
                    }, 1000);
                });
            }, 1000);
        });
    });
};
var readMessage = function(id, cb) {
    var queries = [
        'SELECT body FROM sms WHERE _id = ' + id,
        'SELECT date FROM sms WHERE _id = ' + id,
        'SELECT address FROM sms WHERE _id = ' + id
    ];
    a.mapSeries(queries, query, function(err, results) {
        if(err) {
            cb(err);
            return;
        }
        var number = v.trim(results[2]);
        if(number.substr(0, '+370'.length) === '+370') {
            number = '8' + number.substr('+370'.length);
        }
        cb(null, {
            body : v.trim(results[0]),
            number : number,
            date : new Date(parseInt(results[1], 10))
        });
    });
};
var hashBuffer = function(buffer) {
    var hash = crypto.createHash('sha512');
    hash.update(buffer);
    return hash.digest('base64');
};

var hashMessage = function(msg) {
    return hashBuffer(new Buffer(msg.body + msg.number.toString() + msg.date.toString()));
};
var readMessages = function(cb) {
    query('SELECT _id FROM sms WHERE type = 1', function(err, ids) {
        ids = ids.split(/\s/g);
        ids = v.map(ids, v.trim);
        ids = v.reject(ids, v.is.emp);
        a.mapSeries(ids, readMessage, cb);
    });
};

var messages;
var readLoop = function(cb) {
    readMessages(function(err, rmessages) {
        var fire = typeof messages !== 'undefined';
        if(!fire) {
            messages = {};
        }
        v.each(rmessages, function(message) {
            var hash = hashMessage(message);
            if(typeof messages[hash] === 'undefined') {
                messages[hash] = message;
                message.hash = hash;
                if(fire) {
                    bean.fire(messages, 'new', [message]);
                }
            }
        });
        if(!fire) {
            cb();
        }
        setTimeout(function() {
            readLoop(cb);
        }, 1000);
    });
};
var noop = function() {
};
var sendGroup = function(group, message, cb) {
    var numbers;
    if(typeof book.groups[group] === 'undefined') {
        cb(new Error('unknown group name ' + group));
    } else {
        numbers = v.map(book.groups[group], function(nickname) {
            return book.contacts[nickname].number;
        });
        a.forEach(numbers, function(number, cb) {
            sendSMS(number, message, cb);
        }, cb);
    }
};
var getContact = function(number) {
    var contact = null;
    v.each(book.contacts, function(nickname, c) {
        if(c.number === number) {
            contact = c;
        }
    });
    return contact;
};
readLoop(function() {
    // assumption: these are fired sequentially
    bean.add(messages, 'new', function(msg) {
        console.log('new message', msg);
        var i = msg.body.indexOf(' ');
        if(i >= 0) {
            var from = getContact(msg.number);
            if(from !== null) {
                sendGroup(msg.body.substr(0, i).toLowerCase(), from.nickname + ': ' + msg.body.substr(i + 1), function(err) {
                    if(err) {
                        sendSMS(msg.number, 'group not specified', noop);
                    }
                });
            }
        }
    });
});

http.createServer(function (req, res) {
    var p;

    p = '/messages/incoming';
    if(req.method === 'GET' && req.url === p) {
        res.writeHead(200, {
            "Content-Type" : "application/json"
        });
        res.end(JSON.stringify(v.map(messages, function(hash, msg) {
            return msg;
        })));
        return;
    }

    p = '/messages/';
    if(req.method === 'POST' && req.url.substr(0, p.length) === p) {
        var names = req.url.substr(p.length).split('/');
        var from = names[0];
        var to = names[1];
        var message = '';
        req.on('data', function(data) {
            message += data.toString();
        });
        req.on('end', function(data) {
            sendGroup(to, from + ': ' + message, function(err) {
                if(err) {
                    res.writeHead(500, {
                        "Content-Type" : "text/plain"
                    });
                    res.end(err.stack);
                    return;
                }
                res.writeHead(200);
                res.end();
            });
        });
        return;
    }
    res.writeHead(404);
    res.end();
}).listen(3333);
console.log('HTTP server listening on port 3333');
