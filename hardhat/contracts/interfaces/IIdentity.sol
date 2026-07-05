// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

interface IIdentity {
    function getWhitelistedRoot(address account) external view returns (address);
}
