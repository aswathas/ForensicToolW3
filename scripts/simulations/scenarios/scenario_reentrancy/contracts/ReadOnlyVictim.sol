// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ReadOnlyVictim
 * Demonstrates read-only reentrancy: a view function returns stale
 * state during a callback, which a dependent contract reads and acts on.
 *
 * Pattern:
 *   1. Victim sends ETH to attacker (callback starts)
 *   2. During callback, attacker calls getPrice() — still reads old balance
 *   3. Attacker uses stale price to exploit a dependent protocol
 *   4. Callback returns, victim zeroes balance
 */
contract ReadOnlyVictim {
    mapping(address => uint256) public balances;
    uint256 public totalLiquidity;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    function deposit() external payable {
        balances[msg.sender] += msg.value;
        totalLiquidity += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    // View function — reads state that may be stale mid-callback
    function getPrice() external view returns (uint256) {
        if (totalLiquidity == 0) return 0;
        return (address(this).balance * 1e18) / totalLiquidity;
    }

    // VULNERABLE: sends ETH before updating state
    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "nothing to withdraw");

        // ← during this call, getPrice() returns stale value
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");

        balances[msg.sender] = 0;
        totalLiquidity -= amount;
        emit Withdrawn(msg.sender, amount);
    }

    receive() external payable {}
}

/**
 * DependentProtocol
 * A simple protocol that trusts ReadOnlyVictim.getPrice().
 * Attacker exploits this by reading stale price mid-callback.
 */
contract DependentProtocol {
    ReadOnlyVictim public priceSource;
    mapping(address => uint256) public collateral;

    constructor(address _priceSource) {
        priceSource = ReadOnlyVictim(payable(_priceSource));
    }

    function depositCollateral() external payable {
        collateral[msg.sender] += msg.value;
    }

    // Uses price from ReadOnlyVictim — exploitable when price is stale
    function borrow() external returns (uint256 borrowable) {
        uint256 price = priceSource.getPrice();
        borrowable = (collateral[msg.sender] * price) / 1e18;
        // In a real protocol, tokens would be minted here
        return borrowable;
    }
}
