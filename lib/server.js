global.window = global;
global.document = {};
global.navigator = {};
var bean = require('bean');
var http = require('http');
var a = require('async');
var v = require('valentine');
var spawn = require('child_process').spawn;
var fs = require('fs');
var log4js = require('log4js');
var logger = log4js.getLogger();
logger.setLevel('DEBUG');
logger.info('start');

var book = JSON.parse(fs.readFileSync('./book.json'));
var adb = '/home/tahu/opt/android-sdk/platform-tools/adb';

var query = function(sql, cb) {
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

var sendSMS = function(number, message, cb) {
    logger.info('sendSMS: ' + number + ' ' + message);
    var writeProcess = spawn(adb, [
        'shell',
        'am',
        'broadcast',
        '-a',
        'is.jakut.msgd.SMS_SEND',
        '-e',
        'number',
        number,
        '-e',
        'message',
        message
    ]);
    writeProcess.on('exit', function(code) {
        if(code !== 0) {
            cb(new Error('adb SENDTO exited with code ' + code));
            return;
        }
        cb(null);
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
            id : id,
            body : v.trim(results[0]),
            number : number,
            date : new Date(parseInt(results[1], 10))
        });
    });
};
var readMessageIds = function(cb) {
    query('SELECT _id FROM sms WHERE type = 1', function(err, ids) {
        if(err) {
            cb(err);
            return;
        }
        ids = ids.split(/\s/g);
        ids = v.map(ids, v.trim);
        ids = v.reject(ids, v.is.emp);
        cb(null, ids);
    });
};

var messages;
var readLoop = function(cb) {
    readMessageIds(function(err, ids) {
        if(err) {
            throw err;
        }
        var fire = typeof messages !== 'undefined';
        if(!fire) {
            messages = {};
        }
        a.forEach(ids, function(id, cb) {
            if(typeof messages[id] === 'undefined') {
                readMessage(id, function(err, message) {
                    if(err) {
                        cb(err);
                        return;
                    }
                    messages[id] = message;
                    if(fire) {
                        bean.fire(messages, 'new', [message]);
                    }
                    cb(null);
                });
            } else {
                cb(null);
            }
        }, function(err) {
            if(!fire) {
                cb();
            }
            setTimeout(function() {
                readLoop(cb);
            }, 1000);
        });
    });
};
var noop = function() {
};
var nicknameToNumber = function(nickname) {
    return book.contacts[nickname].number;
};
var sendGroup = function(targets, message, cb) {
    var numbers;
    numbers = [];
    v.each(targets.split(','), function(target) {
        if(typeof book.contacts[target] !== 'undefined') {
            numbers.push(nicknameToNumber(target));
        } else if(typeof book.groups[target] !== 'undefined') {
            numbers.push.apply(numbers, v.map(book.groups[target], nicknameToNumber));
        }
    });
    a.forEach(numbers, function(number, cb) {
        sendSMS(number, message, cb);
    }, cb);
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
        logger.info('received message', msg);
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

var reqToString = function(req, cb) {
    var str = '';
    req.on('data', function(data) {
        str += data.toString();
    });
    req.on('end', function() {
        cb(null, str);
    });
};

http.createServer(function (req, res) {
    var p;

    p = '/messages/incoming';
    if(req.method === 'GET' && req.url === p) {
        res.writeHead(200, {
            "Content-Type" : "application/json"
        });
        res.end(JSON.stringify(v.map(messages, function(id, msg) {
            return msg;
        })));
        return;
    }

    p = '/messages/single/';
    if(req.method === 'POST' && req.url.substr(0, p.length) === p) {
        reqToString(req, function(err, message) {
            var to = req.url.substr(p.length);
            sendSMS(to, message, function(err) {
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
    p = '/messages/';
    if(req.method === 'POST' && req.url.substr(0, p.length) === p) {
        reqToString(req, function(err, message) {
            var names = req.url.substr(p.length).split('/');
            var from = names[0];
            var to = names[1];
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
logger.info('HTTP server listening on port 3333');
