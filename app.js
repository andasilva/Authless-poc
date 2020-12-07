const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
db = require('better-sqlite3')('sql.db');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const app = express();

function initDB() {
    db.prepare("DROP TABLE IF EXISTS access").run()
    db.exec("CREATE TABLE access (id TEXT PRIMARY KEY NOT NULL UNIQUE, website TEXT, user_id TEXT, device_id TEXT, expires_on TEXT, confirmed integer, token TEXT)");
}

initDB();

// app.set('db', db);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

module.exports = app;
module.exports.db = db;
