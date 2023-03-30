import { Contract, providers, Wallet } from "ethers"
import { config } from "../config/config"
import { GMX_ROUTER_ABI, ORDER_BOOK_ABI, POSITION_ROUTER_ABI } from "../constants/constants"

class GMX {

    public _provider: providers.JsonRpcProvider
    private signer: Wallet

    constructor() {
        this._provider = new providers.JsonRpcProvider(config.JSON_RPC)
        this.signer = new Wallet(config.PRIVATE_KEY!, this._provider)

    }

    /**
     * 
     * @param tokenAddress 
     * @returns 
     */
    approveContract = async (tokenAddress: string) => {
        return new Contract(
            tokenAddress,
            ["function approve(address _spender, uint256 _value) public returns (bool success)"],
            this.signer);
    }


    /**
     * 
     * @returns  a contract instance for the order book contract
     */

    orderBookContractGMX = async () => {
        return new Contract(
            config.ORDER_BOOK_ROUTER,
            ORDER_BOOK_ABI,
            this.signer
        )
    }

    /**
     * @returns a contract instance for the positionRouter
     */
    positionRouterContractsGMx = async () => {
        return new Contract(
            config.GMX_POSITION_ROUTER,
            POSITION_ROUTER_ABI,
            this.signer
        )

    }

    /**
     * 
     * @returns a contract instance for approval
     */

    approveContractGMX = async () => {
        return new Contract(
            config.GMX_ROUTER,
            GMX_ROUTER_ABI,
            this.signer
        )
    }


    /**
     * 
     * @param orderBookAddress 
     * @returns a successful approval
     */

    approvePlugin = async (orderBookAddress: string) => {

        try {

            const contract = await this.approveContractGMX()

            const approveTx = await contract.callStatic.approvePlugin(orderBookAddress)

            return approveTx

        } catch (error) {
            console.log("Unable to approve contract", error)
        }

    }


    /**
     * 
     * @param tokenAddress 
     */

    approve = async (tokenAddress: string) => {
        try {
            const contract = await this.approveContract(tokenAddress)

            console.log("token usdc", tokenAddress)

            const MAX_INT = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

            const overLoads = {
                gasPrice: 10 * 1e9,
                gasLimit: 1000000
            }

            const approveTx = await contract.callStatic.approve(config.GMX_ROUTER, MAX_INT, overLoads)

            console.log("******APPROVE TRANSACTION********", approveTx.hash)
            return { success: true, data: `${approveTx.hash}` };


        } catch (error) {
            console.log("Unable to approve contract", error)
        }
    }

    /**
     * 
     * @param _params these are the inputs required to place a long order in GMX 
     */

    createIncreasePosition = async (_params: {
        _path: string[],
        _indexToken: string,
        _amountIn: any,
        _minOut: any,
        _sizeDelta: any,
        _isLong: boolean,
        _acceptablePrice: any,
        _executionFee: any,
        _referralCode: any,
        _callbackTarget: string

    }) => {
        try {

            const {
                _path,
                _indexToken,
                _amountIn,
                _minOut,
                _sizeDelta,
                _isLong,
                _acceptablePrice,
                _executionFee,
                _referralCode,
                _callbackTarget,

            } = _params


            const contract = await this.positionRouterContractsGMx()
            const cretateOrderTx = await contract.callStatic.createIncreasePosition(
                _path,
                _indexToken,
                _amountIn,
                _minOut,
                _sizeDelta,
                _isLong,
                _acceptablePrice,
                _executionFee,
                _referralCode,
                _callbackTarget, {
                value: _executionFee
            }

            )

            console.log("CreateOrderTx", cretateOrderTx)


            return cretateOrderTx


        } catch (error) {
            console.log("Unable to place an order to GMX", error)
        }

        return null;
    }


    /**
     * 
     * @param _params these are the params required for creating a short order
     * @returns  
     */
    createDecreasePosition = async (
        _path: any,
        _indexToken: string,
        _collateralDelta: any,
        _sizeDelta: any,
        _isLong: boolean,
        _receiver: string,
        _acceptablePrice: any,
        _minOut: any,
        _executionFee: any,
        _withdrawETH: boolean,
        _callbackTarget: string

    ) => {
        try {
          
            console.log("In the contract",)

            const contractx = await this.positionRouterContractsGMx()


            const createDecreaseOrderTx = await contractx.callStatic.createDecreasePosition(
                _path,
                _indexToken,
                _collateralDelta,
                _sizeDelta,
                _isLong,
                _receiver,
                _acceptablePrice,
                _minOut,
                _executionFee,
                _withdrawETH,
                _callbackTarget,
                {
                    gasLimit: 1000000,
                    value: _executionFee
                }

            )

            console.log("createDecreaseOrderTx", createDecreaseOrderTx)

            return createDecreaseOrderTx

        } catch (error) {
            console.log("failed too close the order", error)
        }

        return null;
    }


}

export const GmxWrapper = new GMX()