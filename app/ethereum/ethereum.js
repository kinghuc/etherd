let logger = require('../common/logger');
const future = require('../common/future');
const Notify = require('../common/notify');
const InputDataDecoder = require('ethereum-input-data-decoder');

class Ethereum {
    constructor(){
        // 私有变量
        this._eth = null;
        this._acounts = null;
        this._started = false;
        this._erc20_tokens = [];
        this._lastBlockNumber = 0;
        const Web3 = require('web3');
        this._web3 = new Web3();

        // 初始ETH配置
        const Tokens = require('../../config/tokens');
        this._eth = Tokens['eth'];
        this._web3.setProvider(new Web3.providers.HttpProvider(this._eth.web3url));
        [this._eth.private_key, this._eth.address] = this._readPrivateKey(this._eth.keystore, this._eth.unlockpassword);

        // 初始ERC20配置
        for (let key in Tokens) {
            if (key != 'eth' && Tokens[key].family == 'ETH') {
                let token = Tokens[key];
                [token.private_key, token.address] = this._readPrivateKey(token.keystore, token.unlockpassword);
                this._erc20_tokens.push(token);
            }
        }

        // 获取账号列表
        const Accounts = require('./accounts');
        this._acounts = new Accounts(this._web3);
        this._acounts.loadAccounts();
        
        // 创建转账模块
        const Transfer = require('./transfer');
        this._transfer = new Transfer(this._web3);

        // 创建数据解码器
        this._decoder = new InputDataDecoder(require('./abi'));
    }

    // 开始轮询
    async startPoll() {
        if (!this._started) {
            this._started = true;
            while (true) {
                await this._poll();
            }
        }
    }

    // 添加账户
    addAccount(addr) {
        this._acounts.add(addr);
    }

    // 获取账户列表
    getAssounts() {
        return this._acounts.getAccounts();
    }
    
    // 发送代币
    async sendToken(to, amount) {
        let error, hash;
        [error, hash] = await future(this._transfer.sendToken(
            this._eth.address, to, amount, this._eth.private_key));
        if (error != null) {
            throw error;
        }
        return hash;
    }

    // 发送ERC20代币
    async sendERC20Token(symbol, to, amount) {
        // 查找代币信息
        let token = this._findTokenConfig(symbol);
        if (token == null) {
            throw new Error('Unknown token symbol.');
        }

        // 发送ERC20代币
        let error, hash;
        [error, hash] = await future(this._transfer.sendERC20Token(
            token.contractaddress, token.address, to, amount, token.private_key));
        if (error != null) {
            throw error;
        }
        return hash;
    }

    // 获取账户余额
    async getBalance(address, symbol) {
        let error, balance;
        let web3 = this._web3;
        if (symbol == 'ETH') {
            [error, balance] = await future(web3.eth.getBalance(address, 'latest'));
            if (error != null) {
                throw error;
            }
            return balance;
        }

        let token = this._findTokenConfig(symbol);
        if (token == null) {
            throw new Error('Unknown token symbol.');
        }

        const abi = require('./abi');
        let contract = new web3.eth.Contract(abi, token.contractaddress);
        [error, balance] = await future(contract.methods.balanceOf(address).call());
        if (error != null) {
            throw error;
        }
        return balance;
    }

    // 查找代币配置
    _findTokenConfig(symbol) {
        // 查找代币信息
        let token = null;
        for (let idx in this._erc20_tokens) {
            if (symbol == this._erc20_tokens[idx].symbol &&
                this._erc20_tokens[idx].family == 'ETH') {
                return this._erc20_tokens[idx];
            }
        }
        return token;
    }

    // 读取私钥
    _readPrivateKey(keystore, unlockpassword) {
        const fs = require('fs');
        const path = require('path');
        const keythereum = require('keythereum');

        let buffer = fs.readFileSync(path.join('.', keystore));
        try {
            let obj = JSON.parse(buffer);
            let privateKey = keythereum.recover(unlockpassword, obj);
            return [privateKey, '0x'+obj.address];
        } catch (error) {
            logger.info('Failed to get private key, unlock password is invalid.');
            throw error;
        }  
    }

    // 获取合约转账
    _readContractTransfer(contractaddress, input) {
        if (contractaddress == null) {
            return [undefined, false];
        }

        for (let i in this._erc20_tokens) {
            let token = this._erc20_tokens[i];
            if (contractaddress.toLowerCase() == token.contractaddress.toLowerCase()) {
                const result = this._decoder.decodeData(input);
                if (result.name.toLowerCase() != 'transfer') {
                    break
                }
                let to = '0x' + result.inputs[0];     
                let amount = result.inputs[1].toString();
                if (!this._acounts.has(to.toLowerCase())) {
                    break
                }
                return [{symbol: token.symbol, to: to, amount: amount}, true];
            }
        }
        return [undefined, false];
    }

    // 轮询区块
    async _poll() {
        // 获取区块高度
        let web3 = this._web3;
        let error, blockNumber, block, transaction;
        [error, blockNumber] = await future(web3.eth.getBlockNumber());
        if (error != null) {
            logger.info('Failed to call `getBlockNumber`, %s', error.message)
            return
        }

        blockNumber = blockNumber - this._eth.confirmations;
        if (blockNumber <= this._lastBlockNumber) {
            return
        }
        if (this._lastBlockNumber == 0) {
            this._lastBlockNumber = blockNumber;
        }
        logger.debug('Current reading block number: %d', this._lastBlockNumber);

        // 获取区块信息
        [error, block] = await future(web3.eth.getBlock(this._lastBlockNumber));
        if (error != null) {
            logger.info('Failed to call `getBlock`, %s', error.message);
            return
        }

        // 获取交易信息
        for (let i = 0; i < block.transactions.length;) {
            [error, transaction] = await future(web3.eth.getTransaction(block.transactions[i]));
            if (error != null) {
                logger.info('Failed to call `getTransaction`, %s, %s', block.transactions[i], error.message);
                continue
            }

            //  构造交易信息
            let notify = new Notify();
            notify.from = transaction.from;
            notify.hash = transaction.hash;   
            notify.blockNumber = transaction.blockNumber;
            if (this._acounts.has(transaction.to)) {
                // 普通转账
                notify.symbol = 'ETH';
                notify.to = transaction.to;
                notify.amount = web3.utils.fromWei(transaction.value);
                logger.info(notify);
                notify.post(this._eth.walletnotify);
            } else {
                // 合约转账
                let info, ok;
                [info, ok] = this._readContractTransfer(transaction.to, transaction.input);
                if (ok) {
                    notify.to = info.to;
                    notify.symbol = info.symbol;
                    notify.amount = web3.utils.fromWei(info.amount);
                    notify.post(this._eth.walletnotify);
                }      
            }
            i++;
        }
        this._lastBlockNumber += 1;
    }

}

module.exports = Ethereum
