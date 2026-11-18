import mongo from 'mongodb';
import pg from 'pg';
import mysql from 'mysql';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
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

// Serialize token acquisition and rotation across all app processes, per shop.
export async function withLockedShopData(shop, handler) {
  const key = shopKey(shop);
  switch (DB_TYPE) {
    case 'POSTGRESQL':
      return withPostgreSQL(async (client) => {
        await client.query('BEGIN');
        try {
          await client.query("SET LOCAL lock_timeout = '15s'");
          await client.query(
            `INSERT INTO ${POSTGRESQL_TABLE} (_id, data, created_at, updated_at) VALUES ($1, 'null', NOW(), NOW()) ON CONFLICT (_id) DO NOTHING`,
            [key],
          );
          const { rows } = await client.query(`SELECT data FROM ${POSTGRESQL_TABLE} WHERE _id = $1 FOR UPDATE`, [key]);
          const result = await handler(rows[0].data, (data) => client.query(
            `UPDATE ${POSTGRESQL_TABLE} SET data = $1, updated_at = NOW() WHERE _id = $2`, [data, key],
          ));
          await client.query('COMMIT');
          return result;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      });
    case 'MYSQL':
      return withMySQL((connection, done) => {
        const query = (sql, values = []) => new Promise((resolve, reject) => {
          connection.query(sql, values, (error, result) => error ? reject(error) : resolve(result));
        });
        (async () => {
          await query('SET SESSION innodb_lock_wait_timeout = 15');
          await query('START TRANSACTION');
          try {
            await query(
              `INSERT INTO ${MYSQL_TABLE} (_id, data, created_at, updated_at) VALUES (?, 'null', NOW(), NOW()) ON DUPLICATE KEY UPDATE _id = _id`, [key],
            );
            const rows = await query(`SELECT data FROM ${MYSQL_TABLE} WHERE _id = ? FOR UPDATE`, [key]);
            const data = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
            const result = await handler(data, (next) => query(
              `UPDATE ${MYSQL_TABLE} SET data = ?, updated_at = NOW() WHERE _id = ?`, [JSON.stringify(next), key],
            ));
            await query('COMMIT');
            return result;
          } catch (error) {
            await query('ROLLBACK');
            throw error;
          }
        })().then((result) => done(null, result), done);
      });
    default:
      return withMongo((collection) => withMongoShopLock(collection, key, handler));
  }
}

export async function withMongoShopLock(collection, key, handler) {
  const owner = randomUUID();
  const deadline = Date.now() + 15_000;
  try {
    await collection.updateOne({ _id: key }, {
      $setOnInsert: { data: null, created_at: new Date(), updated_at: new Date() },
    }, { upsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error; // Another process created the placeholder.
  }
  let document;
  while (!document) {
    const now = new Date();
    document = await collection.findOneAndUpdate({
      _id: key,
      $or: [{ token_lock: { $exists: false } }, { 'token_lock.expires_at': { $lte: now } }],
    }, {
      $set: { token_lock: { owner, expires_at: new Date(Date.now() + 60_000) } },
    }, { returnDocument: 'after', includeResultMetadata: false });
    if (!document) {
      if (Date.now() >= deadline) throw new Error('Timed out waiting for the shop token lock. Retry the request.');
      await delay(100);
    }
  }
  try {
    return await handler(document.data, async (data) => {
      const result = await collection.updateOne({
        _id: key, 'token_lock.owner': owner, 'token_lock.expires_at': { $gt: new Date() },
      }, { $set: { data, updated_at: new Date() } });
      if (result.matchedCount !== 1) throw new Error('Shop token lock expired before saving. Retry the request.');
    });
  } finally {
    await collection.updateOne({ _id: key, 'token_lock.owner': owner }, { $unset: { token_lock: '' } });
  }
}

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
