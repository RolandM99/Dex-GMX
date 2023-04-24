import { closeOrder } from "../telegram/tg_bot";
import placeOrder from "../telegram/placeOrder";
export const gmxWrapperTrader = async () => {

    const date = new Date().toLocaleDateString();
    let message = `GMX Trading Started... \n 🕒 Time: ${date}`;
    let ctx;

    await placeOrder(ctx, message);
    await closeOrder(ctx);
}

// gmxWrapperTrader();