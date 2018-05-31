const Server = require('./config/server');
const RpcServer = require('./app/rpcserver');
const Ethereum = require('./app/ethereum/ethereum');

// 启动以太坊服务
let eth = new Ethereum();
eth.startPoll();

// 启动JSON-RPC服务
let server = new RpcServer(eth, {
  port: Server.rpc_port,
  host: Server.rpc_bind
});
server.start();
