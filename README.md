# etherd
etherd 提供了以太坊代币(包括ERC20代币)转账和收款通知功能，可以使用它轻松地将以太坊上的代币接入到自己的系统里面。另外提供了web3 rpc请求的转发功能，可以在一定程度上替代 `geth` 使用。

## 1. 快速开始
```
git clone https://github.com/zhangpanyi/ethfaucet.git
cd ethfaucet && npm install
node index.js
```

## 2. 配置文件

`config/server.js` JSON-RPC服务配置，可自定义以下选项：
```
{
    rpc_bind: '0.0.0.0',        // 绑定地址
    rpc_port: 18545,            // 端口号
    rpc_user: 'username',       // 用户名
    rpc_password: 'password'    // 密码
}
```

`config/tokens.js` Token配置文件，用于配置ETH和ERC20 Token钱包信息。
```
{
    eth: {
        symbol: 'ETH',                                                  // 代币符号
        confirmations: 12,                                              // 最小确认数
        keystore: 'keystore/test.keystore',                             // 钱包路径
        unlockpassword: '123456',                                       // 钱包解锁密码
        web3url: 'http://106.75.129.146:8545/',                         // web3服务器地址
        walletnotify: 'http:/peatio-server:3000/webhooks/tx'            // 收款通知地址
    },
    bokky: {
        symbol: 'BOKKY',                                                // 代币符号
        family: 'ETH',                                                  // 最小确认数
        keystore: 'keystore/test.keystore',                             // 钱包路径
        unlockpassword: '123456',                                       // 钱包解锁密码
        contractaddress: '0x583cbBb8a8443B38aBcC0c956beCe47340ea1367',  // web3服务器地址
        walletnotify: 'http://peatio-server:3000/webhooks/bokky '       // 收款通知地址
    }
}
```

## 3. 替换geth
etherd 启动时会加载 `geth` 服务器上的账户列表(`personal_listAccounts`)缓存到本地。如果以太坊网络中发生了向这些账户转账的事件，就会主动请求 `config/tokens.js` 配置文件中设定的 **收款通知地址**，将转账事件告知其它服务。前提时本地缓存的账户列表必须与 `geth` 服务器上的账户列表一致。一个解决方案就是停止使用 `geth` 创建账户，通过 etherd 来创建新账户。etherd 提供了web3 rpc请求的转发功能，web3 客户端程序可以直接连接使用。