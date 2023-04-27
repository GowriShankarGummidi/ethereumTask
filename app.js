// const { Chain, Common} =require('@ethereumjs/common')
// const { Transaction} = require('@ethereumjs/tx')

const Web3 = require('web3');
const jwt = require('jsonwebtoken');
const Tx = require('ethereumjs-tx');
// console.log(Chain)
const authentication = require('./jwt');
require('dotenv').config();
const web3 = new Web3('https://sepolia.infura.io/v3/6509a72aac1d4ee2ac2d80c4690b3cda');
const express = require('express');
const app = express();
app.use(express.json());
//======================================================================================
app.post('/login', (req,res) => {
    const address = req.body;
    const token = jwt.sign({address : address}, process.env.SECRET_KEY);
    if(!token) {
        return res.status(400).send('No Token');
    }
    res.send(token);
})
//=======================================================================================
// SmartContract ABI and ContractAddress
const abi =require('./abi')
const contractAddress = '0xE1da7087feE824ba79496d8c2706993608B86470';
const contract = new web3.eth.Contract(abi, contractAddress);
//=======================================================================================
app.post('/bal', authentication, (req,res) => {
    web3.eth.getBalance(req.user.address.account, (err, bal) => {
        if(err) {
            return res.status(400).send('Something went wrong');
        }
        res.status(200).send(`BALANCE : ${bal}`);
    })
})
//========================================================================================
async function getTokenBal(addr){
    const bal = await contract.methods.balanceOf(addr).call();
    return bal;
}
app.post('/smartBal', authentication, (req, res) => {
    try{
        getTokenBal(req.user.address.account)
        .then(balance => {
            res.status(200).send(balance);
        })
    }catch(err){
        console.log('errr is fetching token bal ' , err)
    }
})
//==========================================================================================
async function getTxHash(raw) {
    const txHash = await web3.eth.sendSignedTransaction(raw);
    return txHash;
}
app.post('/transferETH', authentication, async (req,res) => {
    const account1 = req.user.address.account;
    const account2 = '0x9cf58771692E7cd8f12C96B81553Bb1d4fEB12e1';
    console.log(process.env.PRIVATE_KEY1);
    const privateKey1 = Buffer.from(process.env.PRIVATE_KEY1, 'hex');
    // console.log(account1);
    // const gasPrice = await web3.eth.getGasPrice();
    
    web3.eth.getTransactionCount(account1, (err, txCount) => {
        console.log(txCount);
        if(err){
            console.log(err)
            return res.status(400).send("Invalid account");
        }
        const txObj = {
            nonce : web3.utils.toHex(txCount),
            from : account1,
            to : account2,
            value : web3.utils.toHex(web3.utils.toWei('0.03', 'ether')),
            gasLimit : web3.utils.toHex(21000),
            //gasPrice : web3.utils.toHex(parseInt(gasPrice * 1.05)),
            gasPrice : web3.utils.toHex(web3.utils.toWei('10', 'gwei')),
            // chainId:11155111
        }
        const tx = new Tx(txObj);
        tx.sign(privateKey1);
        // const common = new Common({ chain: Chain.Sepolia})
        // const tx = Transaction.fromTxData(txObj, { common })
        // const signedTx = tx.sign(Buffer.from(privateKey1, 'hex'))
        const serializedTransaction = tx.serialize();
        const raw = '0x' + serializedTransaction.toString('hex');
        web3.eth.sendSignedTransaction(raw, (err, txHash) => {
            if(err) {
                return res.status(400).send('Invalid Transaction');
                //console.log('err', err);
            }
            res.status(200).json({txHash});
        })
    })
})
//==========================================================================================
app.post('/transferUSDT', authentication, (req,res) => {
    const account1 = req.user.address.account;
    console.log('acc1', account1);
    const account2 = '0x9cf58771692E7cd8f12C96B81553Bb1d4fEB12e1';
    const privateKey1 = Buffer.from(process.env.PRIVATE_KEY1, 'hex');
    const contract = new web3.eth.Contract(abi, contractAddress);
    const data = contract.methods.transfer(account2, 1000).encodeABI();
    //console.log('data', data);
    web3.eth.getTransactionCount(account1, (err, txCount) => {
        if(err) {
            res.status(400).send('err :', err);
        }
        const txObject = {
            nonce : web3.utils.toHex(txCount),
            gasLimit : web3.utils.toHex(800000),
            gasPrice : web3.utils.toHex(web3.utils.toWei('10', 'gwei')),
            to : contractAddress,
            data : data
        }
        const tx = new Tx(txObject);
        tx.sign(privateKey1);
        const serializedTransaction = tx.serialize();
        const raw = '0x' + serializedTransaction.toString('hex');
        web3.eth.sendSignedTransaction(raw, (err, txHash) => {
            if(err) {
                return res.status(400).send('err :', err);
            }
            res.status(200).send({txHash});
        })
    })
})
//==============================================================================================
app.post('/balances', authentication, (req,res) => {
    const address = req.user.address.account;
    const contract = new web3.eth.Contract(abi, contractAddress);
    web3.eth.getBalance(address, (err, ETHbal) => {
        const ethbal = web3.utils.fromWei(ETHbal, 'ether');
        if(err) {
            return res.status(400).send('err', err);
        }
        contract.methods.balanceOf(address).call((err, USDTbalance) => {
            const usdtbal=USDTbalance/1e18
            if(err) {
                return res.status(400).send('err', err);
            }
            res.status(200).send({usdtbal, ethbal});
        })
    })
})
//================================================================================================
app.post('/txhistory', authentication, (req,res) => {
    const address1 = req.user.address.account;
    const txHash = '0x20d7e6a0386b44a808307237cf953898d30ce48fc95435f7c081f4e0a7d319f2';
    web3.eth.getTransaction(txHash, (err, transaction) => {
        if(err) {
            return res.status(400).send('err', err);
        }
        res.status(200).send({transaction});
    })
})
//==================================================================================================
app.post('/validate', authentication, (req,res) => {
    const address1 = req.user.address.account;
    const result = web3.utils.isAddress(address1);
    if(result) {
        return res.status(200).send(result);
    }
    res.status(400).send(result);
})
//==================================================================================================
app.post('/gasprice', authentication, (req, res) => {
    const address1 = req.user.address.account;
    web3.eth.getGasPrice((err, gasPrice) => {
        if(err) {
            return res.status(400).send('err', err);
        }
        res.status(200).send(gasPrice);
    })
})
//===================================================================================================
app.post('/blocknumber', authentication, (req,res) => {
    const account1 = req.user.address.account;
    web3.eth.getBlockNumber((err, BlockNumber) => {
        if(err) {
            return res.status(400).send('err', err);
        }
        res.status(200).send({BlockNumber});
    })
})
//====================================================================================================
app.post('/events', authentication, (req,res) => {
    const address1 = req.user.address.account;
    contract.getPastEvents('allEvents', {
        fromBlock : 0,
        toBlock : 'latest',
        filter : {from : address1}
    }, (err, events) => {
        if(err) {
            return res.status(400).send('err', err);
        }
        res.status(200).send(events);
    })
})
//=======================================================================================================
app.post('/wallet', authentication, (req,res) => {
    const address1 = req.user.address.account;
    const obtained_wallet = web3.eth.accounts.wallet.create(2);
      const arr = [];
      const wallet = Object.keys(obtained_wallet).map(keys => {
        return {id : keys, ...obtained_wallet[keys]}
      })
      //console.log(wallet);
      for(let i = 0; i < 2; i++)
      {
        if(wallet && wallet[i].address && wallet[i].privateKey)
        {
            arr.push({address : wallet[i].address, privateKey : wallet[i].privateKey});
        }
        else {
            res.status(400).send('No wallet Created');
        }
      }
      res.status(200).send(arr);
})
//======================================================================================================
app.listen(process.env.PORT, () => {
    console.log("server is set up on port", process.env.PORT);
})