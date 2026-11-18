import test from 'node:test';
import assert from 'node:assert/strict';
import { withMongoShopLock } from './shop-store.server.js';

function collectionWith(document) {
  const collection = {
    document,
    async findOneAndUpdate(filter, update) {
      const lock = collection.document.token_lock;
      if (lock && lock.expires_at > filter.$or[1]['token_lock.expires_at'].$lte) return null;
      Object.assign(collection.document, update.$set);
      return structuredClone(collection.document);
    },
    async updateOne(filter, update) {
      if (filter['token_lock.owner'] && filter['token_lock.owner'] !== collection.document.token_lock?.owner) return { matchedCount: 0 };
      if (filter['token_lock.expires_at'] && collection.document.token_lock.expires_at <= filter['token_lock.expires_at'].$gt) return { matchedCount: 0 };
      if (!collection.document) collection.document = { _id: filter._id, ...update.$setOnInsert };
      Object.assign(collection.document, update.$set);
      if (update.$unset) delete collection.document.token_lock;
      return { matchedCount: 1 };
    },
  };
  return collection;
}

test('Mongo lease serializes two app processes and rereads the latest pair', async () => {
  const collection = collectionWith({ _id: 'sample', data: { version: 0 } });
  let active = 0;
  const handler = async (data, save) => {
    assert.equal(active++, 0);
    await save({ version: data.version + 1 });
    active--;
  };
  await Promise.all([withMongoShopLock(collection, 'sample', handler), withMongoShopLock(collection, 'sample', handler)]);
  assert.equal(collection.document.data.version, 2);
  assert.equal(collection.document.token_lock, undefined);
});

test('Mongo lease recovers after a crashed process and releases after errors', async () => {
  const collection = collectionWith({ _id: 'sample', data: null,
    token_lock: { owner: 'crashed', expires_at: new Date(Date.now() - 1000) } });
  await assert.rejects(withMongoShopLock(collection, 'sample', async () => { throw new Error('test failure'); }), /test failure/);
  assert.equal(collection.document.token_lock, undefined);
});

test('Mongo expired owner cannot overwrite data or release a replacement lease', async () => {
  const collection = collectionWith({ _id: 'sample', data: { version: 0 } });
  await withMongoShopLock(collection, 'sample', async (_data, save) => {
    collection.document.token_lock = { owner: 'replacement', expires_at: new Date(Date.now() + 60_000) };
    await assert.rejects(save({ version: 1 }), /lock expired/);
  });
  assert.equal(collection.document.data.version, 0);
  assert.equal(collection.document.token_lock.owner, 'replacement');
});
