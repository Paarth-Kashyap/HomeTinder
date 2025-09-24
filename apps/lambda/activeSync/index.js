import { syncDB } from "./sync.js";

export const handler = async () => {
  try {
    await syncDB();
    return { statusCode: 200, body: "DB sync completed" };
  } catch (err) {
    console.error("Replication failed:", err);
    return { statusCode: 500, body: "Error during replication" };
  }
};
    