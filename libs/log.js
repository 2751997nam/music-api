const opts = {
	errorEventName:'error',
        logDirectory: 'logs', // NOTE: folder must exist and be writable...
        fileNamePattern:'manga-api-<DATE>.log',
        dateFormat:'YYYY-MM-DD'
};
const Log = require('simple-node-logger').createRollingFileLogger( opts );

module.exports = Log;