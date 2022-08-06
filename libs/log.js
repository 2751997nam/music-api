import SimpleNodeLogger from 'simple-node-logger';
const opts = {
	errorEventName:'error',
        logDirectory: 'logs', // NOTE: folder must exist and be writable...
        fileNamePattern: process.env.APP_NAME.toLowerCase().replace(' ', '-') + '-<DATE>.log',
        dateFormat:'YYYY-MM-DD'
};
const Log = SimpleNodeLogger.createRollingFileLogger( opts );

export default Log;