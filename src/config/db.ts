import { connect } from "mongoose";
import { config } from "./config";

const connectDB = async () => {
    try {
        await connect(config.MONGO_DB_URL, {
            keepAlive: true,
            connectTimeoutMS: 80000,
            socketTimeoutMS: 80000,
        });
        console.log(" Connection to the database established successfully");
    } catch (error) {
        console.log("Could not connect to the database  : ", error);
    }
};

connectDB();