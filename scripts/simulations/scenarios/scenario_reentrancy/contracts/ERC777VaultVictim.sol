// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ERC777VaultVictim
 * Simulates an ERC777-style vault where token transfers trigger a
 * tokensReceived() hook on the recipient. The vault fails to guard
 * against reentrancy via this hook.
 *
 * Simplified: we simulate the hook mechanism without a full ERC1820
 * registry for clarity. The key pattern is: external call to recipient
 * before state update.
 */
contract ERC777VaultVictim {
    mapping(address => uint256) public tokenBalances;
    mapping(address => bool) public isRegisteredHook;

    event TokensDeposited(address indexed user, uint256 amount);
    event TokensWithdrawn(address indexed user, uint256 amount);

    // Register as a tokensReceived hook recipient
    function registerHook() external {
        isRegisteredHook[msg.sender] = true;
    }

    function depositTokens() external payable {
        tokenBalances[msg.sender] += msg.value; // use ETH as stand-in for tokens
        emit TokensDeposited(msg.sender, msg.value);
    }

    // VULNERABLE: calls tokensReceived hook before updating balance
    function withdrawTokens(uint256 amount) external {
        require(tokenBalances[msg.sender] >= amount, "insufficient");

        // Simulate ERC777 tokensReceived hook call
        if (isRegisteredHook[msg.sender]) {
            // ← reentrancy window via hook
            ITokensReceived(msg.sender).tokensReceived(address(this), amount);
        }

        // Send ETH (stand-in for token transfer)
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");

        tokenBalances[msg.sender] -= amount; // too late
        emit TokensWithdrawn(msg.sender, amount);
    }

    receive() external payable {}
}

interface ITokensReceived {
    function tokensReceived(address vault, uint256 amount) external;
}
