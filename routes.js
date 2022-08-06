import express from 'express';
import ApiController from './controllers/ApiController.js';
import Log from './libs/log.js';

const app = express();
const router = express.Router();

const handleRequest = async (req, res, callback) => {
    try {
        let response = await callback(req, res);
        if (!res.headersSent) {
            try {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(response, (key, value) => {
                    return !isNaN(value) ? `${value}` : value;
                }));
            } catch (error) {
                Log.info('ERROR: ' + error.message);
                Log.info('Request ERROR: ', req.url);
                res.json({
                    status: 'fail',
                    message: error.toString(),
                });        
            }
        }
    } catch (error) {
        Log.info('ERROR: ' + error.message);
        Log.info('Request ERROR: ', req.url);
        if (!res.headersSent) {
            res.json({
                status: 'fail',
                message: error.toString(),
            });
        }
    }
}

router.get('/', function (req, res) {
    res.send(process.env.APP_NAME);
});
router.get('/favicon.ico', (req, res) => res.status(204));
router.get('/:table', (req, res) => handleRequest(req, res, ApiController.find));
router.get('/:table/:id', (req, res) => handleRequest(req, res, ApiController.show));

export default router;