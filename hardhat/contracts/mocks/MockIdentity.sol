// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "../interfaces/IIdentity.sol";

contract MockIdentity is IIdentity {
    mapping(address => address) public whitelistedRoots;

    function setWhitelistedRoot(address account, address root) external {
        whitelistedRoots[account] = root;
    }

    function getWhitelistedRoot(address account) external view returns (address) {
        return whitelistedRoots[account];
    }
}
