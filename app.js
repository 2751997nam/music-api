import express from 'express';
import cors from 'cors';
import routes from './routes.js';
import dotenv from 'dotenv';

const envConfig = dotenv.config();
const app = express();

app.use(routes);

app.listen(process.env.APP_PORT, function(){
    console.log(process.env.APP_NAME + " running on port " + process.env.APP_PORT);
})