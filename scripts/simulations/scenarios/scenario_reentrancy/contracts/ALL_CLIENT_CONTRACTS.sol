// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// =============================================================================
//  ALL_CLIENT_CONTRACTS.sol
//  Combined victim/client contracts for the reentrancy attack simulation.
//
//  These are the LEGITIMATE (client-side) contracts that users interact with.
//  They are intentionally vulnerable to demonstrate reentrancy attack patterns.
//
//  ┌─────────────────────────────────────────────────────────────────────────┐
//  │  Contract              │ Attack Pair         │ Vulnerability            │
//  ├─────────────────────────────────────────────────────────────────────────┤
//  │  VaultVictim           │ Attacker1_Basic     │ Basic reentrancy         │
//  │  TokenVaultVictim      │ Attacker2_CrossFunc │ Cross-function reentrancy│
//  │  ReadOnlyVictim        │ Attacker3_ReadOnly  │ Read-only reentrancy     │
//  │  DependentProtocol     │ Attacker3_ReadOnly  │ Stale price oracle       │
//  │  ERC777VaultVictim     │ Attacker4_ERC777    │ ERC777 hook reentrancy   │
//  │  FlashloanPool         │ Attacker5_Flashloan │ Flashloan + price manip  │
//  │  SimpleDex             │ Attacker5_Flashloan │ AMM price manipulation   │
//  │  FlashloanVictim       │ Attacker5_Flashloan │ Manipulable price oracle │
//  └─────────────────────────────────────────────────────────────────────────┘
// =============================================================================


// =============================================================================
// [1] VaultVictim — Basic Reentrancy Target
//     Paired with: Attacker1_Basic.sol
// =============================================================================

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


// =============================================================================
// [2] TokenVaultVictim — Cross-Function Reentrancy Target
//     Paired with: Attacker2_CrossFunc.sol
// =============================================================================

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


// =============================================================================
// [3] ReadOnlyVictim + DependentProtocol — Read-Only Reentrancy Targets
//     Paired with: Attacker3_ReadOnly.sol
// =============================================================================

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


// =============================================================================
// [4] ERC777VaultVictim — ERC777 Hook Reentrancy Target
//     Paired with: Attacker4_ERC777.sol
// =============================================================================

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


// =============================================================================
// [5] FlashloanPool + SimpleDex + FlashloanVictim — Flashloan Attack Targets
//     Paired with: Attacker5_Flashloan.sol
// =============================================================================

/**
 * FlashloanPool
 * A simple lending pool that offers flashloans.
 * Vulnerable to price manipulation when combined with a DEX.
 */
contract FlashloanPool {
    mapping(address => uint256) public deposits;
    uint256 public totalLiquidity;

    event FlashloanIssued(address indexed borrower, uint256 amount);
    event FlashloanRepaid(address indexed borrower, uint256 amount, uint256 fee);

    function deposit() external payable {
        deposits[msg.sender] += msg.value;
        totalLiquidity += msg.value;
    }

    function flashloan(uint256 amount) external {
        require(amount <= address(this).balance, "insufficient liquidity");
        uint256 balBefore = address(this).balance;

        emit FlashloanIssued(msg.sender, amount);

        // Send funds to borrower
        (bool ok, ) = msg.sender.call{value: amount}(
            abi.encodeWithSignature("executeFlashloan(uint256)", amount)
        );
        require(ok, "flashloan callback failed");

        // Verify repayment with 0.1% fee
        uint256 fee = amount / 1000;
        require(address(this).balance >= balBefore + fee, "flashloan not repaid");
        emit FlashloanRepaid(msg.sender, amount, fee);
    }

    receive() external payable {}
}

/**
 * SimpleDex
 * A minimal constant-product AMM (x*y=k).
 * Vulnerable to price manipulation via large single-tx swaps.
 */
contract SimpleDex {
    uint256 public ethReserve;
    uint256 public tokenReserve;

    event Swapped(address indexed user, uint256 ethIn, uint256 tokensOut);
    event PriceUpdated(uint256 ethReserve, uint256 tokenReserve);

    constructor() payable {
        ethReserve = msg.value;
        tokenReserve = 1000 ether; // virtual token reserve
    }

    function getTokensOut(uint256 ethIn) public view returns (uint256) {
        // x * y = k: (ethReserve + ethIn) * newTokenReserve = ethReserve * tokenReserve
        return (ethIn * tokenReserve) / (ethReserve + ethIn);
    }

    function getSpotPrice() external view returns (uint256) {
        return (ethReserve * 1e18) / tokenReserve;
    }

    function swapEthForTokens() external payable returns (uint256 tokensOut) {
        tokensOut = getTokensOut(msg.value);
        ethReserve += msg.value;
        tokenReserve -= tokensOut;
        emit Swapped(msg.sender, msg.value, tokensOut);
        emit PriceUpdated(ethReserve, tokenReserve);
        return tokensOut;
    }
}

/**
 * FlashloanVictim
 * A lending protocol that uses SimpleDex spot price as collateral oracle.
 * Vulnerable: attacker can manipulate the DEX price with a flashloan,
 * borrow against inflated collateral, then repay the flashloan.
 */
contract FlashloanVictim {
    SimpleDex public dex;
    mapping(address => uint256) public collateral;
    mapping(address => uint256) public borrowed;

    event CollateralDeposited(address indexed user, uint256 amount);
    event Borrowed(address indexed user, uint256 amount, uint256 price);

    constructor(address _dex) {
        dex = SimpleDex(_dex);
    }

    function depositCollateral() external payable {
        collateral[msg.sender] += msg.value;
        emit CollateralDeposited(msg.sender, msg.value);
    }

    // Uses DEX spot price — manipulable via flashloan
    function borrowAgainstCollateral() external returns (uint256 borrowable) {
        uint256 price = dex.getSpotPrice();
        borrowable = (collateral[msg.sender] * price) / 1e18;
        borrowed[msg.sender] += borrowable;
        emit Borrowed(msg.sender, borrowable, price);

        // Send ETH to borrower (simplified)
        if (borrowable > 0 && address(this).balance >= borrowable) {
            (bool ok, ) = msg.sender.call{value: borrowable}("");
            require(ok, "borrow transfer failed");
        }
        return borrowable;
    }

    receive() external payable {}
}
