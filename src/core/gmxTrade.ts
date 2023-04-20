import { placeOrder, closeOrder } from "../telegram/getOrders";

export const gmxWrapperTrader = async () => {

    const date = new Date().toLocaleDateString();
    let message = `GMX Trading Started... \n 🕒 Time: ${date}`;
    let ctx;

    await placeOrder(ctx, message);
    await closeOrder(ctx);
}

// gmxWrapperTrader();