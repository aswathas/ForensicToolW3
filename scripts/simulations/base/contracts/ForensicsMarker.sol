// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ForensicsMarker
 * Emits only RunStart / RunEnd so the forensics tool can auto-detect
 * the block window. Does NOT label attacks — the forensics tool must
 * discover those on its own.
 */
contract ForensicsMarker {
    event RunStart(bytes32 indexed runId, string scenario);
    event RunEnd(bytes32 indexed runId);

    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function emitRunStart(bytes32 runId, string calldata scenario) external {
        require(msg.sender == owner, "not owner");
        emit RunStart(runId, scenario);
    }

    function emitRunEnd(bytes32 runId) external {
        require(msg.sender == owner, "not owner");
        emit RunEnd(runId);
    }
}
