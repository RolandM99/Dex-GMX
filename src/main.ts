import { tgWrapper } from "./telegram/tg_bot";

const main = async () => {
    try {
        console.log(`GMX Trading Started... \n 🕒 Time: ${new Date()}`);

        tgWrapper()
    } catch (error) {
        console.log("Error: ", error)
    }
}

main();