// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * VaultVictim
 * A simple ETH vault with a classic reentrancy vulnerability:
 * sends ETH before updating the balance.
 */
contract VaultVictim {
    mapping(address => uint256) public balances;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    // VULNERABLE: sends ETH before zeroing balance
    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "nothing to withdraw");

        // ← reentrancy window: balance not yet zeroed
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");

        balances[msg.sender] = 0; // too late
        emit Withdrawn(msg.sender, amount);
    }

    receive() external payable {}
}
