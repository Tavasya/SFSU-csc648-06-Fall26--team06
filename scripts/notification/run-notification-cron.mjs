import cron from "node-cron";
import nextEnv from "@next/env";

// Load environment variables from .env.local
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const workerUrl = "http://localhost:3000/api/notifications/process";
const cronSecret = process.env.CRON_SECRET;

if (!cronSecret) {
    throw new Error("CRON_SECRET is missing from .env.local");
}

let isRunning = false;

async function processNotifications() {
    if (isRunning) {
        console.log("Previous worker execution is still running.");
        return;
    }

    isRunning = true;

    try {
        console.log("Checking notification queue...");

        const response = await fetch(workerUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${cronSecret}`
            }
        });

        const result = await response.text();

        console.log("Worker response:", response.status, result);

    } catch (error) {
        console.error("Failed to call notification worker:", error);

    } finally {
        isRunning = false;
    }
}

// Run once immediately when the scheduler starts.
processNotifications();

// Run every minute afterward.
cron.schedule("* * * * *", processNotifications);

console.log("Local notification scheduler is running.");
console.log("The worker will be called every minute.");
