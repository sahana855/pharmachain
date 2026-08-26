// PharmaChain MongoDB Viewer
// Prints every collection + document count + sample of each document.
// Run:  node scripts/view-db.mjs   (from the project folder)
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../server/config/db.js';

// Collections that the models create (in dependency order)
const COLLECTIONS = [
  'users',
  'medicines',
  'medicinecatalogs',
  'medicineverifications',
  'shipments',
  'trackingevents',
  'blockchaintxns',
  'blockchaintransactions',
];

function pretty(obj, indent = 2) {
  const replacer = (k, v) => {
    if (v instanceof mongoose.Types.ObjectId) return `ObjectId("${v}")`;
    if (v instanceof Date) return `ISODate("${v.toISOString()}")`;
    return v;
  };
  return JSON.stringify(obj, replacer, indent);
}

async function main() {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const names = (await db.listCollections().toArray()).map((c) => c.name);

    console.log('\n==========================================');
    console.log('  PharmaChain MongoDB — Database Viewer');
    console.log(`  Database: ${db.databaseName}`);
    console.log('==========================================\n');

    if (names.length === 0) {
      console.log('(no collections yet)');
      return;
    }

    for (const name of names) {
      const coll = db.collection(name);
      const count = await coll.countDocuments();
      console.log(`\n📦 Collection: ${name}  (${count} document${count === 1 ? '' : 's'})`);
      console.log('-'.repeat(60));

      if (count === 0) {
        console.log('  (empty)');
        continue;
      }

      const docs = await coll.find({}).limit(3).toArray();
      for (let i = 0; i < docs.length; i++) {
        console.log(`  --- Document ${i + 1} ---`);
        console.log(pretty(docs[i], 2));
        if (count > 3 && i === docs.length - 1) {
          console.log(`  ... and ${count - 3} more`);
        }
      }
    }

    console.log('\n✅ Done.');
  } catch (err) {
    console.error('❌ Failed to read MongoDB:', err.message);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

main();

