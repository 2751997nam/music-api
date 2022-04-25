import express from 'express';
import Config from './config/index.js';
import cors from 'cors';
import routes from './routes.js';
import dotenv from 'dotenv';

const envConfig = dotenv.config();
const app = express();

app.use(routes);

app.listen(Config.port, function(){
    console.log("Manga Api running on port " + Config.port);
})