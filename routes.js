import express from 'express';
import ApiController from './controllers/ApiController.js';
import MangaController from './controllers/MangaController.js';

const app = express();
const router = express.Router();

const handleRequest = async (req, res, callback) => {
    try {
        let response = await callback(req, res);
        if (!res.headersSent) {
            try {
                res.json(response);
            } catch (error) {
                res.json({
                    status: 'fail',
                    message: error.toString(),
                });        
            }
        }
    } catch (error) {
        console.log(error);
        res.json({
            status: 'fail',
            message: error.toString(),
        });
    }
}

router.get('/', function (req, res) {
    res.send('Manga Api');
});
router.get('/favicon.ico', (req, res) => res.status(204));
router.get('/last-update-manga', (req, res) => handleRequest(req, res, MangaController.getLastUpdateMangas));
router.get('/get-popular-manga', (req, res) => handleRequest(req, res, MangaController.getPopularMangas));
router.get('/get-top-views', (req, res) => handleRequest(req, res, MangaController.getTopViews));
router.get('/:table', (req, res) => handleRequest(req, res, ApiController.find));
router.get('/:table/:id', (req, res) => handleRequest(req, res, ApiController.show));

export default router;