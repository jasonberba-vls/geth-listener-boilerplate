import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import WebSocket from 'ws';
import Web3 from 'web3';
import { GethListenerGroup, GethListenerLog, GethListenerSteps } from '../common/types/crypto-log';
import { fromWei } from '../common/functions/cryptoFunction';
import 'dotenv/config';

@Injectable()
export class EthereumLogsListenerV2 implements OnModuleInit, OnModuleDestroy {
  // GETH Server Connection Strings
  private rpcUrl: string;
  private socketUrl: string;
  
  // GETH Objects
  private webSocketObject : any;
  private web3Object : any;
  private erc20TokenContractAddress : any;

  //List of ETH Wallet to monitor <TO BE REPLACED WITH CALL TO DATABASE TO FETCH THE LIST OF WALLETS>
//   private walletArray = ['0xd07AF8938673085F09efF3A559752B360883B61b', '0x41762AcEa5818fcA403b8A7855dF30f9DfaaD583'];
private walletArray = ['0x41762AcEa5818fcA403b8A7855dF30f9DfaaD583'];s
  //console.log('walletArray Before', walletArray);

  // Subscription object to store the current logs subscription
  private gethSubscription : any = null;    

  constructor() {
    this.rpcUrl = process.env.RPC_URL;
    this.socketUrl = process.env.SOCKET_URL;

    //Initialize RPC connection for Web3 Functions
    this.web3Object = new Web3(new Web3.providers.HttpProvider(this.rpcUrl));
    // console.log("web3Object", this.web3Object);

    //Define ERC-20 Token Contract Address.
    this.erc20TokenContractAddress = process.env.ERC20_CONTRACT;
  }

  async onModuleInit() {
    this.startMonitoring();
  }

  async onModuleDestroy() {
  }

   
  async startMonitoring() {
    //Initialize WebSocket connection
    if (this.webSocketObject) {
        // Close Existing connection
        this.webSocketObject.close();

        //Initialize New Connection with the updated Addresses
        this.webSocketObject = new WebSocket(this.socketUrl);
    } else {
        //Establish Initial Connection
        this.webSocketObject = new WebSocket(this.socketUrl);
    }
    
    this.webSocketObject.onopen = async () => {
        Logger.log(
            new GethListenerLog(
                this.erc20TokenContractAddress,
                '',
                '',
                GethListenerSteps.InitializeWebSocketConnection,
                GethListenerGroup.OnOpen,
                {
                    Message: `Connecting to geth at ${this.socketUrl}`
                }
            )
        );
        console.log(`Connecting to geth at ${this.socketUrl}. . .`);

        //Initialize address parameter
        let address = `"address":"${this.erc20TokenContractAddress}"`;

        console.log('walletArray Before', this.walletArray); //this.walletArray to be fetched from DB

        let walletArrayEncoded = [];
        //Update wallet value to the encoded string for Topics
        this.walletArray.forEach(wallet => { walletArrayEncoded.push(this.web3Object.eth.abi.encodeParameter('address', wallet)) });
        //console.log('walletArray After', walletArrayEncoded);

        //*** NOTE:
        //          1. Upon saving of wallet addresses to db for walletArray fetching, possible to save also the encoded value already
        //          2. Therefore no need for the forEach block above to encode the raw Wallet Addresses

        //Compose topics parameter
        let topics = `"topics": [null, null, ["${walletArrayEncoded.join('","')}"]]`;
        //console.log('topics', JSON.parse('{' + topics + '}'));

        //Execute subscription
        this.webSocketObject.send(`{"id":1,"jsonrpc":"2.0","method":"eth_subscribe","params":["logs",{${address},${topics}}]}`);
	};

    //Monitoring for incoming WebSocket messages
    this.webSocketObject.onmessage = async (evt) => {
        const data = JSON.parse(evt.data);

        //Checking for Initial Subscription Result
        if (data.result) {
            Logger.log(
                new GethListenerLog(
                    this.erc20TokenContractAddress,
                    '',
                    '',
                    GethListenerSteps.InitializeSubscription,
                    GethListenerGroup.OnMessage,
                    {
                        Message: 'Subscription Success',
                        SubscriptionId: data.result
                    }
                )
            );
            console.log(`Subscription Success! SubscriptionId : ${data.result}`);
        }

        //Process Event Data
        if (data.params?.result) {
            let fromWallet = this.web3Object.eth.abi.decodeParameter('address', data.params.result.topics[1]);
            let toWallet = this.web3Object.eth.abi.decodeParameter('address', data.params.result.topics[2]);
            let txnHash = data.params.result.transactionHash;
            let blockNumber = parseInt(data.params.result.blockNumber);

            //Initialize Token Computation Variable
            const tokenDecimalCount = Number(process.env.ERC20_DECIMAL_COUNT); //ERC-20 Token decimal holder 
            let transactionAmount =  Number(fromWei(data.params.result.data, tokenDecimalCount));
            
            console.log('---------------------------------------------------------------------------------------------------------------');
            console.log('Transaction Hash : ', txnHash);
            console.log('Block Number : ', blockNumber);
            console.log('From Wallet : ', fromWallet);
            console.log('To Wallet : ', toWallet);
            console.log('Txn Amount : ', transactionAmount);
            console.log('---------------------------------------------------------------------------------------------------------------');

            // INSERT USECASE / LOGIC HERE. . .
        }
    };

    this.webSocketObject.onerror = async (evt) => {
        const data : any = {
            message: evt.message,
            error: evt.error,
        };

        Logger.log(
            new GethListenerLog(
                this.erc20TokenContractAddress,
                '',
                '',
                GethListenerSteps.EventError,
                GethListenerGroup.OnError,
                {
                    EventData: data
                }
            )
        );
        console.log(`Error Occured! Error: ${data.error} Message: ${data.message}`); 
    };
    
    this.webSocketObject.onclose = async (evt) => {
        const data : any = {
            wasClean: evt.wasClean,
            code: evt.code,
            reason: evt.reason
        };

        Logger.log(
            new GethListenerLog(
                this.erc20TokenContractAddress,
                '',
                '',
                GethListenerSteps.OnCloseEvent,
                GethListenerGroup.OnClose,
                data
            )
        );
        console.log(`Web Socket CLOSED!!!`);
    };
  }

  async addAddress(address) {
    // Add new address to the list if it's not already there
    if (!this.walletArray.includes(address)) {
        this.walletArray.push(address);
        console.log(`Added new address: ${address}`);
        
        // Restart monitoring with the updated list of addresses
        await this.startMonitoring();
    } else {
        console.log(`Address ${address} is already being monitored.`);
    }
}
}