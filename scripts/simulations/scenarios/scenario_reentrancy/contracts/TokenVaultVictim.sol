// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * TokenVaultVictim
 * An ERC20-style vault vulnerable to cross-function reentrancy.
 * deposit() updates balance, withdraw() sends ETH before zeroing.
 * The cross-function variant: attacker calls deposit() inside the
 * withdraw() callback, inflating balance before it's zeroed.
 */
contract TokenVaultVictim {
    mapping(address => uint256) public balances;
    uint256 public totalDeposits;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    function deposit() external payable {
        // balance updated immediately — can be exploited mid-callback
        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    // VULNERABLE: cross-function reentrancy
    // attacker re-enters deposit() during the ETH send,
    // then withdraw() again after returning
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "insufficient");

        // ← reentrancy window
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");

        balances[msg.sender] -= amount; // too late
        totalDeposits -= amount;
        emit Withdrawn(msg.sender, amount);
    }

    receive() external payable {}
}
