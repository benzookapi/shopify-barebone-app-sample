import mongo from 'mongodb';
import pg from 'pg';
import mysql from 'mysql';
import {
  DB_TYPE,
  MONGO_COLLECTION,
  MONGO_DB_NAME,
  MONGO_URL,
  MYSQL_DATABASE,
  MYSQL_HOST,
  MYSQL_PASSWORD,
  MYSQL_TABLE,
  MYSQL_USER,
  POSTGRESQL_TABLE,
  POSTGRESQL_URL,
} from './env.server.js';
import { normalizeShopDomain } from './shopify-auth.server.js';

export async function getShopData(shop) {
  const key = shopKey(shop);
  switch (DB_TYPE) {
    case 'POSTGRESQL':
      return getPostgreSQL(key);
    case 'MYSQL':
      return getMySQL(key);
    default:
      return getMongo(key);
  }
}

export async function upsertShopData(shop, data) {
  const key = shopKey(shop);
  const existing = await getShopData(key);
  if (existing == null) return insertShopData(key, data);
  return setShopData(key, data);
}

export async function insertShopData(shop, data) {
  const key = shopKey(shop);
  switch (DB_TYPE) {
    case 'POSTGRESQL':
      return insertPostgreSQL(key, data);
    case 'MYSQL':
      return insertMySQL(key, data);
    default:
      return insertMongo(key, data);
  }
}

export async function setShopData(shop, data) {
  const key = shopKey(shop);
  switch (DB_TYPE) {
    case 'POSTGRESQL':
      return setPostgreSQL(key, data);
    case 'MYSQL':
      return setMySQL(key, data);
    default:
      return setMongo(key, data);
  }
}

async function withMongo(callback) {
  if (!MONGO_URL || !MONGO_DB_NAME) {
    throw new Error('MongoDB is selected but SHOPIFY_MONGO_URL or SHOPIFY_MONGO_DB_NAME is missing');
  }
  const client = await mongo.MongoClient.connect(MONGO_URL);
  try {
    return await callback(client.db(MONGO_DB_NAME).collection(MONGO_COLLECTION));
  } finally {
    await client.close();
  }
}

async function getMongo(key) {
  return withMongo(async (collection) => {
    const doc = await collection.findOne({ _id: key });
    return doc == null ? null : doc.data;
  });
}

async function insertMongo(key, data) {
  return withMongo(async (collection) => collection.insertOne({
    _id: key,
    data,
    created_at: new Date(),
    updated_at: new Date(),
  }));
}

async function setMongo(key, data) {
  return withMongo(async (collection) => collection.updateOne(
    { _id: key },
    { $set: { data, updated_at: new Date() } },
  ));
}

async function withPostgreSQL(callback) {
  const client = new pg.Client({ connectionString: POSTGRESQL_URL });
  await client.connect();
  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

async function getPostgreSQL(key) {
  return withPostgreSQL(async (client) => {
    const result = await client.query(`SELECT data FROM ${POSTGRESQL_TABLE} WHERE _id = $1`, [key]);
    return result.rows.length === 0 ? null : result.rows[0].data;
  });
}

async function insertPostgreSQL(key, data) {
  return withPostgreSQL((client) => client.query(
    `INSERT INTO ${POSTGRESQL_TABLE} (_id, data, created_at, updated_at) VALUES ($1, $2, $3, $4)`,
    [key, data, new Date(), new Date()],
  ));
}

async function setPostgreSQL(key, data) {
  return withPostgreSQL((client) => client.query(
    `UPDATE ${POSTGRESQL_TABLE} SET data = $1, updated_at = $2 WHERE _id = $3`,
    [data, new Date(), key],
  ));
}

function withMySQL(callback) {
  return new Promise((resolve, reject) => {
    const connection = mysql.createConnection({
      host: MYSQL_HOST,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
    });
    connection.connect((connectError) => {
      if (connectError) return reject(connectError);
      callback(connection, (error, result) => {
        connection.end();
        if (error) return reject(error);
        return resolve(result);
      });
    });
  });
}

async function getMySQL(key) {
  const rows = await withMySQL((connection, done) => {
    connection.query(`SELECT data FROM ${MYSQL_TABLE} WHERE _id = ?`, [key], done);
  });
  if (rows.length === 0) return null;
  return typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
}

async function insertMySQL(key, data) {
  return withMySQL((connection, done) => {
    connection.query(
      `INSERT INTO ${MYSQL_TABLE} (_id, data, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      [key, JSON.stringify(data), mysqlDate(new Date()), mysqlDate(new Date())],
      done,
    );
  });
}

async function setMySQL(key, data) {
  return withMySQL((connection, done) => {
    connection.query(
      `UPDATE ${MYSQL_TABLE} SET data = ?, updated_at = ? WHERE _id = ?`,
      [JSON.stringify(data), mysqlDate(new Date()), key],
      done,
    );
  });
}

function mysqlDate(date) {
  return date.toISOString().replace('T', ' ').replace('Z', '');
}

function shopKey(shop) {
  const key = normalizeShopDomain(shop);
  if (!key) throw new Error(`Invalid Shopify shop domain: ${shop || '(empty)'}`);
  return key;
}
