import { placeOrder } from "../telegram/tg_bot";

export const gmxWrapperTrader = async () => {

    let message = `GMX Trading Started`;
    let ctx;

    placeOrder(ctx, message);
}

gmxWrapperTrader();