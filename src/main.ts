import { gmxWrapperTrader } from "./core/gmxTrade";

const main = async () => {
    try {
        console.log("Starting...");
       await gmxWrapperTrader();
    } catch (error) {
        console.log("Error: ", error)
    }
}

main();