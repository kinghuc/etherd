let logger = require('../common/logger');

class Accounts {
    constructor(web3){
        this._web3 = web3;
        this._accounts = null;
    }

    // 是否存在
    has(address) {
        if (this._accounts == null) {
            return false;
        }
        return this._accounts.has(address.toLowerCase());
    }

    // 添加账户
    add(address) {
        if (this._accounts == null) {
            this._accounts = new Set(accounts);
        }
        this._accounts.add(address.toLowerCase());
    }

    // 加载账户列表
    loadAccounts() {
        let self = this;
        this._web3.eth.getAccounts(function(error, accounts) {
            if (error != null) {
                logger.error('Failed to get accounts, %s', error.message);
                throw error;
            }
            for (let i in accounts) {
                accounts[i] = accounts[i].toLowerCase();
            }

            if (self._accounts == null) {
                self._accounts = new Set(accounts);
            }
            self._accounts = new Set([...self._accounts, ...new Set(accounts)]);
        });
    }
}

module.exports = Accounts;
