Tokens = {
    eth: {
        symbol: 'ETH',
        confirmations: 12,
        keystore: 'keystore/test.keystore',
        unlockpassword: '123456',
        web3url: 'http://106.75.129.146:8545/',
        walletnotify: 'http:/peatio-server:3000/webhooks/tx'
    },
    eos: {
        symbol: 'BOKKY',
        family: 'ETH',
        keystore: 'keystore/test.keystore',
        unlockpassword: '123456',
        contractaddress: '0x583cbBb8a8443B38aBcC0c956beCe47340ea1367',
        walletnotify: 'http://peatio-server:3000/webhooks/bokky'
    }
}

module.exports = Tokens
