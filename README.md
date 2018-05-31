# etherd
etherd 提供了以太坊代币(包括ERC20代币)转账和收款通知功能，可以使用它轻松地将以太坊上的代币接入到自己的系统里面。另外提供了web3 rpc接口的转发功能，可以在一定程度上替代 `geth` 使用。

# 快速开始
```
git clone https://github.com/zhangpanyi/ethfaucet.git
cd ethfaucet && npm install
node index.js
```

# 配置文件

1. `config/tokens.js` Token配置文件
2. `config/server.js` JSON-RPC服务配置文件