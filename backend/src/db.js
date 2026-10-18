/* ============================================================
   db.js — opens the SQLite database file and makes sure the
   schema in schema.sql exists. The file lives at DB_PATH (an env
   var, defaulting to ./data/vertexmaths.db) so it can be mounted
   as a Docker volume and survive container rebuilds.
   ============================================================ */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'vertexmaths.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

module.exports = db;
