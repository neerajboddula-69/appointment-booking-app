import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const mongoUri =
  "mongodb://neeraj_b_75:neeraj75b01@ac-rdsxrfq-shard-00-00.u83hxlc.mongodb.net:27017,ac-rdsxrfq-shard-00-01.u83hxlc.mongodb.net:27017,ac-rdsxrfq-shard-00-02.u83hxlc.mongodb.net:27017/?authSource=admin&replicaSet=atlas-f5hmly-shard-0&tls=true&retryWrites=true&w=majority&appName=Cluster0";
const dbName = process.env.MONGODB_DB || "appointment_booking";

let client;
let database;

export async function connectToDatabase() {
  if (database) {
    return database;
  }

  client = new MongoClient(mongoUri);
  await client.connect();
  database = client.db(dbName);
  return database;
}

export async function getCollections() {
  const db = await connectToDatabase();

  return {
    db,
    admins: db.collection("admins"),
    customers: db.collection("customers"),
    providers: db.collection("providers"),
    services: db.collection("services"),
    unavailability: db.collection("unavailability"),
    appointments: db.collection("appointments"),
    waitlist: db.collection("waitlist"),
    notifications: db.collection("notifications"),
    chatMessages: db.collection("chatMessages")
  };
}

export async function closeDatabase() {
  if (client) {
    await client.close();
    client = null;
    database = null;
  }
}
