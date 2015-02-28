var Database = require('./Database');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var getMessageId = function(message) {
    return message.id;
};

var cfg = {
    messages: process.argv[3],
    adb: process.argv[2]
};

function moveFromDBToFile(db, file) {
    var newIds = [];
    var getNewIds = function() {
        return newIds;
    };
    return Promise.props({
        'existing': fs.readFileAsync(file).then(JSON.parse),
        'new': db.readMessageIds().map(db.readMessageById.bind(db))
    })
    .then(function(messages) {
        var existingIds = messages.existing.map(getMessageId);
        newIds = messages['new'].map(getMessageId);
        return messages.existing.concat(messages['new'].filter(function(message) {
            return existingIds.indexOf(message.id) < 0;
        }));
    })
    .then(JSON.stringify)
    .then(fs.writeFileAsync.bind(fs, file))
    .then(getNewIds)
    .map(db.deleteMessageById.bind(db))
    .then(getNewIds);
}

moveFromDBToFile(new Database({
    adb: cfg.adb
}), cfg.messages)
.then(JSON.stringify)
.then(process.stdout.write.bind(process.stdout), function(err) {
    process.stderr.write(err.stack);
    process.exitCode = 1;
});
