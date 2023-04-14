import { placeOrder } from "../telegram/tg_bot";

export const gmxWrapperTrader = async () => {

    const date = new Date().toLocaleDateString();
    let message = `GMX Trading Started... \n 🕒 Time: ${date}`;
    let ctx;

    placeOrder(ctx, message);
}

gmxWrapperTrader();