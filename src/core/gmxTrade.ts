import { sendTelegramNote } from "../telegram/tg_bot";

export const gmxWrapperTrader = async () => {

    let message = `GMX Trading Started`;

    sendTelegramNote(message);
}

gmxWrapperTrader();