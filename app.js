import 'dotenv/config';
import express from "express";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import session from "express-session";
import { initializeDatabase, redisStore } from './dbInitialize.js';
import { sequelize } from './dbConnect.js';
import authRouter from './routes/auth.route.js';
import indexRouter from './routes/index.route.js';
import swaggerUi from "swagger-ui-express";
import fs from 'fs/promises';
import path from 'path';

const port = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY;

async function loadSwaggerDocument() {
    const filePath = path.join(process.cwd(), 'swagger.json');
    const jsonText = await fs.readFile(filePath, 'utf8');
    return JSON.parse(jsonText);
}

async function startApp() {
    const app = express();
    const swaggerDocument = await loadSwaggerDocument();
    await initializeDatabase();
    await sequelize.sync();
    console.log('Database synchronized');

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    app.use(morgan("dev"));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use(
      session({
        store: redisStore,
        secret: SECRET_KEY,
        saveUninitialized: false,
        resave: false,
        cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 10 },
      })
    );

    // Using routers
    app.use('/', indexRouter);
    app.use(authRouter);

    // Error Handling Middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).send("Something broke!");
    });

    app.listen(port, () => console.log(`App listening on port ${port}`));
}

startApp().catch(console.error);
