import { utils } from "ethers";
import * as express from "express";
import { GmxWrapper } from "../core";
import { config } from "../config/config";
import  "../config/db"
import { Order } from "../models/schema";

const router = express.Router();

router.post("/long", async (req: any, res: any) => {
    try {
        const _params: {
            _path: string[],
            _indexToken: string,
            _amountIn: any,
            _minOut: any,
            _sizeDelta: any,
            _isLong: boolean,
            _acceptablePrice: any,
            _executionFee: any,
            _callbackTarget: string,
            _referralCode: string
        } = req.body

        console.log("We are in the backend", req.body)

        //call the approve function before creating an order to approve the GMX ROUTER

        // const approve = await GmxWrapper.approve(config.USDC)


        // if (approve) {

            // call the  createIncreasePosition and passing the params

            // const order = await GmxWrapper.createIncreasePosition(_params)

            // if (order) {

                //save the order to the db

                let orderDetails = new Order({
                    path: req.body._path,
                    amountIn: req.body._amountIn,
                    indexToken: req.body._indexToken,
                    minOut: req.body._minOut,
                    sizeDelta: req.body._sizeDelta,
                    acceptablePrice: req.body._acceptablePrice,
                    executionFee: req.body._executionFee,
                    callbackTarget: req.body._callbackTarget,
                    isLong: req.body._isLong,
                    referralCode: req.body._referralCode
                })

                const data = await orderDetails.save()

                res.send({ status: 200, data })

        //     }

        // }

    } catch (error) {
        console.log("Error Creating Order Endpoint", error)
    }

})

router.post("/close", async (req: any, res: any) => {
    try {
       

        //TODO  querry the db to get the order posted 

        let orderDetails: any = await Order.findById({
            _id: "63d2814fda5312e7e6433f9a"
        })
        const { path, indexToken, minOut, sizeDelta, amountIn, acceptablePrice, executionFee, callbackTarget, isLong } = orderDetails;
        const receiver = config.RECEIVER_ADDRESS
        const collateralDelta = 0;
        const withdrawETH = true

        let _path = path.reverse()
        _path[1] = config.WETH

        let _acceptablePrice = acceptablePrice

        orderDetails.receiver = receiver
        orderDetails.collateralDelta = collateralDelta
        orderDetails.withdrawETH = withdrawETH
        orderDetails._path = _path
        orderDetails._acceptablePrice = _acceptablePrice


        orderDetails = req.body

        console.log({
            _path,
            indexToken,
            collateralDelta,
            minOut,
            sizeDelta,
            _acceptablePrice,
            executionFee,
            callbackTarget,
            isLong,
            receiver,
            withdrawETH

        })

        if (orderDetails) {

            //closes the position
            const closeOrder = await GmxWrapper.createDecreasePosition(
                path,
                indexToken,
                collateralDelta,
                amountIn,
                isLong,
                receiver,
                acceptablePrice,
                minOut,
                executionFee,
                withdrawETH,
                callbackTarget
            )




            console.log("We reached here", closeOrder)

            res.send(closeOrder)


        }

    } catch (error) {
        console.log("Error Creating Order Endpoint", error)
    }

})

router.get("/orders", async (req: any, res: any) => {

    //TODO get all orders from the database

    const data = await Order.find().lean()
    console.log("active orders", data)

    if (data) {
        res.send( data )
    }
})

router.delete("/activeOrder/:id", async (req: any, res: any) => {
    try {
        const id  = req.params.id
        const removeOrder = await Order.findByIdAndDelete({ _id: id })

        if (removeOrder) {

            console.log("order removed", removeOrder)

            res.send({ status: 200, removeOrder })
        }

    } catch (error) {
        console.log("Unable to delete order from DB")
        res.send({ status: 500, error: "Unable to delete order from DB" })

    }
    return null
})

module.exports = router;
