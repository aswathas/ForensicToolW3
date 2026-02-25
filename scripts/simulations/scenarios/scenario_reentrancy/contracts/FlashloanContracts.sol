// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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
