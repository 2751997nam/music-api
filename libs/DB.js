import knex from 'knex';
import dotenv from 'dotenv';
const envConfig = dotenv.config();
let cachedConnection;

const getDatabaseConnector = () => {
    if (cachedConnection) {
        return cachedConnection;
    }

    const config = {
        client: 'mysql',
        connection: {
            host: process.env.MYSQL_HOST,
            port: process.env.MYSQL_PORT,
            database: process.env.MYSQL_DATABASE,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
        },
        pool: {
            min: 1,
            max: 2
        }
    };
    const connection = knex(config);
    cachedConnection = connection;
    return connection;
};


export default getDatabaseConnector();