let logger = require('./common/logger');
const future = require('./common/future');

class RPCServer {
    constructor(ethereum, options){
        this._schema = {};
        this._ethereum = ethereum;

        // 启动rpc服务
        const rpc = require('node-json-rpc2');
        this._server = new rpc.Server(options);
        this._addMethods();

        // 初始rpc客户端
        const url = require("url");
        const Tokens = require('../config/tokens');
        let uri = url.parse(Tokens['eth'].web3url);
        this._client = new rpc.Client({
            port: uri.port,
            host: uri.hostname,
            path: '/',
            strict: true
        });
    }

    // 启动服务
    start() {
        this._server.start(function (error) {
            if (error) {
                throw error;
            } else {
                logger.info('JSON RPC server running ...');
            }
        });
    }

    // 添加方法
    _addMethods() {
        // 添加web3接口
        let Eth = require('web3-eth');
        let Personal = require('web3-eth-personal');
        this._addWeb3Methods(new Eth());
        this._addWeb3Methods(new Personal());
        
        // 添加etherd扩展接口
        let self = this;
        this._server.addMethod('etherd_sendToken', function(request, callback) {
            self._sendToken(request, callback);
        });
        this._server.addMethod('etherd_sendErc20Token', function(request, callback) {
            self._sendErc20Token(request, callback);
        });
    }

    // 添加web3接口
    _addWeb3Methods(methods) {
        let self = this;
        for (let key in methods) {
            let obj = methods[key];
            if (!obj || typeof(obj) == "undefined") {
                continue;
            }

            if (Object.getPrototypeOf(obj).constructor.name != 'Function') {
                continue;
            }

            if (typeof(obj.call) != 'string') {
                continue;
            }

            if (obj.call == 'personal_newAccount') {
                continue;
            }

            logger.info('JSON RPC server add web3 method: %s', obj.call);
            this._server.addMethod(obj.call, function(request, callback) {
                self._call(request, callback);
            });
        }

        this._server.addMethod('personal_newAccount', function(request, callback) {
            self._newAccount(request, callback);
        });     
    }

    // 调用web3
    async _call(request, callback) {
        this._client.call(request, function (err, res) {
            callback(err, res);
        });
    }

    // 创建账户
    async _newAccount(request, callback) {
        let self = this;
        this._client.call(request, function (err, res) {
            if (!err || typeof(err) == 'undefined') {
                self._ethereum.addAccount(res['result']);
            }
            callback(err, res);
        });
    }

    // 发送ETH代币
    async _sendToken(request, callback) {
        // 校验参数
        let data = request.params;
        if (data.length < 2) {
            let error = {code: -32602, message: 'Invalid params' };
            callback(error, undefined);
            return
        }

        if (typeof data[0] != 'string' || data[0].length != 42) {
            let error = {code: -32602, message: 'Invalid params, to address' };
            callback(error, undefined);
            return 
        }
        if (typeof data[1] != 'string' || !data[1].match('(^-?[0-9.]+)')) {
            let error = {code: -32000, message: 'Invalid param, amount'};
            callback(error, undefined);
            return 
        }

        // 发送代币
        let error, hash;
        [error, hash] = await future(this._ethereum.sendToken(data[0], data[1]));
        if (error != null) {
            error = {code: -32000, message: error.message};
            callback(error, undefined);
        }
        callback(undefined, {'hash': hash});
    }

    // 发送ERC20代币
    async _sendErc20Token(request, callback) {
        // 校验参数
        let data = request.params;
        if (data.length < 3) {
            let error = {code: -32602, message: 'Invalid params' };
            callback(error, undefined);
            return
        }

        if (typeof data[0] != 'string') {
            let error = {code: -32602, message: 'Invalid params, token symbol' };
            callback(error, undefined);
            return 
        }
        if (typeof data[1] != 'string' || data[1].length != 42) {
            let error = {code: -32602, message: 'Invalid params, to address' };
            callback(error, undefined);
            return 
        }
        if (typeof data[2] != 'string' || !data[2].match('(^-?[0-9.]+)')) {
            let error = {code: -32000, message: 'Invalid param, amount'};
            callback(error, undefined);
            return 
        }

        // 发送代币
        let error, hash;
        [error, hash] = await future(this._ethereum.sendERC20Token(data[0], data[1], data[2]));
        if (error != null) {
            error = {code: -32000, message: error.message};
            callback(error, undefined);
        }
        callback(undefined, {'hash': hash});
    }
}

module.exports = RPCServer;
