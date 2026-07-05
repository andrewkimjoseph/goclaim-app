// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IIdentity.sol";

/**
 * @title GoClaim
 * @notice On-chain logger for GoClaim smart account lifecycle events. Holds no token
 *         value — purely a signed event registry. Smart accounts call via paymaster-
 *         sponsored UserOps; msg.sender must be the smart account address.
 */
contract GoClaim is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    EIP712Upgradeable,
    UUPSUpgradeable
{
    using ECDSA for bytes32;

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    /// @dev Default GoodDollar Identity proxy on Celo mainnet (used when init passes zero).
    address public constant DEFAULT_IDENTITY =
        0xC361A6E67822a0EDc17D899227dd9FC50BD62F42;

    bytes32 private constant ACCOUNT_CREATED_REQUEST_TYPEHASH =
        keccak256(
            "AccountCreatedRequest(address smartAccountAddress,uint256 nonce)"
        );

    bytes32 private constant ACCOUNT_CONNECTED_REQUEST_TYPEHASH =
        keccak256(
            "AccountConnectedRequest(address smartAccountAddress,address whitelistedRoot,uint256 nonce)"
        );

    bytes32 private constant UBI_CLAIMED_REQUEST_TYPEHASH =
        keccak256(
            "UbiClaimedRequest(address smartAccountAddress,address whitelistedRoot,address token,uint256 amount,uint256 nonce)"
        );

    bytes32 private constant TOKEN_TRANSFERRED_REQUEST_TYPEHASH =
        keccak256(
            "TokenTransferredRequest(address smartAccountAddress,address recipient,address token,uint256 amount,uint256 nonce)"
        );

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    uint256 public version;

    address public goClaimSigner;

    address public identityContract;

    mapping(address => bool) public isAccountCreated;

    mapping(address => bool) public isAccountConnected;

    mapping(bytes => bool) public isSignatureUsed;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event GoClaimAccountCreated(address indexed smartAccountAddress);

    event GoClaimAccountConnected(
        address indexed smartAccountAddress,
        address indexed whitelistedRoot
    );

    event GoClaimUBIClaimed(
        address indexed smartAccountAddress,
        address indexed whitelistedRoot,
        address token,
        uint256 amount
    );

    event GoClaimTokenTransferred(
        address indexed smartAccountAddress,
        address indexed recipient,
        address token,
        uint256 amount
    );

    event GoClaimSignerUpdated(
        address indexed oldSigner,
        address indexed newSigner
    );

    event ContractUpgraded(
        uint256 oldVersion,
        uint256 newVersion,
        address indexed newImplementation
    );

    // -------------------------------------------------------------------------
    // Constructor / Initializer
    // -------------------------------------------------------------------------

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _owner,
        address _goClaimSigner,
        address _identityContract
    ) public initializer {
        require(_owner != address(0), "GoClaim: owner cannot be zero address");
        require(
            _goClaimSigner != address(0),
            "GoClaim: signer cannot be zero address"
        );

        __Ownable_init(_owner);
        __Pausable_init();
        __EIP712_init("GoClaim", "1");

        goClaimSigner = _goClaimSigner;
        identityContract = _identityContract == address(0)
            ? DEFAULT_IDENTITY
            : _identityContract;
        version = 1;
    }

    // -------------------------------------------------------------------------
    // Core logic
    // -------------------------------------------------------------------------

    function logAccountCreated(
        address smartAccountAddress,
        uint256 nonce,
        bytes calldata signature
    ) external whenNotPaused {
        require(
            msg.sender == smartAccountAddress,
            "GoClaim: sender must be smartAccountAddress"
        );
        require(
            smartAccountAddress != address(0),
            "GoClaim: smartAccountAddress cannot be zero address"
        );
        require(
            !isAccountCreated[smartAccountAddress],
            "GoClaim: account already created"
        );
        require(
            !isSignatureUsed[signature],
            "GoClaim: signature already used"
        );
        require(
            _verifyAccountCreatedSignature(
                smartAccountAddress,
                nonce,
                signature
            ),
            "GoClaim: invalid signature"
        );

        isAccountCreated[smartAccountAddress] = true;
        isSignatureUsed[signature] = true;

        emit GoClaimAccountCreated(smartAccountAddress);
    }

    function logAccountConnected(
        address smartAccountAddress,
        address whitelistedRoot,
        uint256 nonce,
        bytes calldata signature
    ) external whenNotPaused {
        require(
            msg.sender == smartAccountAddress,
            "GoClaim: sender must be smartAccountAddress"
        );
        require(
            smartAccountAddress != address(0),
            "GoClaim: smartAccountAddress cannot be zero address"
        );
        require(
            whitelistedRoot != address(0),
            "GoClaim: whitelistedRoot cannot be zero address"
        );
        require(
            !isAccountConnected[smartAccountAddress],
            "GoClaim: account already connected"
        );
        require(
            !isSignatureUsed[signature],
            "GoClaim: signature already used"
        );
        require(
            IIdentity(identityContract).getWhitelistedRoot(smartAccountAddress) ==
                whitelistedRoot,
            "GoClaim: whitelistedRoot mismatch"
        );
        require(
            _verifyAccountConnectedSignature(
                smartAccountAddress,
                whitelistedRoot,
                nonce,
                signature
            ),
            "GoClaim: invalid signature"
        );

        isAccountConnected[smartAccountAddress] = true;
        isSignatureUsed[signature] = true;

        emit GoClaimAccountConnected(smartAccountAddress, whitelistedRoot);
    }

    function logUbiClaimed(
        address smartAccountAddress,
        address whitelistedRoot,
        address token,
        uint256 amount,
        uint256 nonce,
        bytes calldata signature
    ) external whenNotPaused {
        require(
            msg.sender == smartAccountAddress,
            "GoClaim: sender must be smartAccountAddress"
        );
        require(
            smartAccountAddress != address(0),
            "GoClaim: smartAccountAddress cannot be zero address"
        );
        require(
            whitelistedRoot != address(0),
            "GoClaim: whitelistedRoot cannot be zero address"
        );
        require(token != address(0), "GoClaim: token cannot be zero address");
        require(amount > 0, "GoClaim: amount must be greater than zero");
        require(
            !isSignatureUsed[signature],
            "GoClaim: signature already used"
        );
        require(
            _verifyUbiClaimedSignature(
                smartAccountAddress,
                whitelistedRoot,
                token,
                amount,
                nonce,
                signature
            ),
            "GoClaim: invalid signature"
        );

        isSignatureUsed[signature] = true;

        emit GoClaimUBIClaimed(
            smartAccountAddress,
            whitelistedRoot,
            token,
            amount
        );
    }

    function logTokenTransferred(
        address smartAccountAddress,
        address recipient,
        address token,
        uint256 amount,
        uint256 nonce,
        bytes calldata signature
    ) external whenNotPaused {
        require(
            msg.sender == smartAccountAddress,
            "GoClaim: sender must be smartAccountAddress"
        );
        require(
            smartAccountAddress != address(0),
            "GoClaim: smartAccountAddress cannot be zero address"
        );
        require(
            recipient != address(0),
            "GoClaim: recipient cannot be zero address"
        );
        require(token != address(0), "GoClaim: token cannot be zero address");
        require(amount > 0, "GoClaim: amount must be greater than zero");
        require(
            !isSignatureUsed[signature],
            "GoClaim: signature already used"
        );
        require(
            _verifyTokenTransferredSignature(
                smartAccountAddress,
                recipient,
                token,
                amount,
                nonce,
                signature
            ),
            "GoClaim: invalid signature"
        );

        isSignatureUsed[signature] = true;

        emit GoClaimTokenTransferred(
            smartAccountAddress,
            recipient,
            token,
            amount
        );
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    function setGoClaimSigner(address newSigner) external onlyOwner {
        require(
            newSigner != address(0),
            "GoClaim: signer cannot be zero address"
        );
        address oldSigner = goClaimSigner;
        goClaimSigner = newSigner;
        emit GoClaimSignerUpdated(oldSigner, newSigner);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    function _verifyAccountCreatedSignature(
        address smartAccountAddress,
        uint256 nonce,
        bytes calldata signature
    ) internal view returns (bool) {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    ACCOUNT_CREATED_REQUEST_TYPEHASH,
                    smartAccountAddress,
                    nonce
                )
            )
        );
        return ECDSA.recover(digest, signature) == goClaimSigner;
    }

    function _verifyAccountConnectedSignature(
        address smartAccountAddress,
        address whitelistedRoot,
        uint256 nonce,
        bytes calldata signature
    ) internal view returns (bool) {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    ACCOUNT_CONNECTED_REQUEST_TYPEHASH,
                    smartAccountAddress,
                    whitelistedRoot,
                    nonce
                )
            )
        );
        return ECDSA.recover(digest, signature) == goClaimSigner;
    }

    function _verifyUbiClaimedSignature(
        address smartAccountAddress,
        address whitelistedRoot,
        address token,
        uint256 amount,
        uint256 nonce,
        bytes calldata signature
    ) internal view returns (bool) {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    UBI_CLAIMED_REQUEST_TYPEHASH,
                    smartAccountAddress,
                    whitelistedRoot,
                    token,
                    amount,
                    nonce
                )
            )
        );
        return ECDSA.recover(digest, signature) == goClaimSigner;
    }

    function _verifyTokenTransferredSignature(
        address smartAccountAddress,
        address recipient,
        address token,
        uint256 amount,
        uint256 nonce,
        bytes calldata signature
    ) internal view returns (bool) {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    TOKEN_TRANSFERRED_REQUEST_TYPEHASH,
                    smartAccountAddress,
                    recipient,
                    token,
                    amount,
                    nonce
                )
            )
        );
        return ECDSA.recover(digest, signature) == goClaimSigner;
    }

    // -------------------------------------------------------------------------
    // Upgrade mechanics
    // -------------------------------------------------------------------------

    function upgradeToAndBumpVersion(
        address newImplementation,
        uint256 newVersion
    ) external onlyOwner {
        require(
            newVersion > version,
            "GoClaim: newVersion must be greater than current version"
        );
        uint256 oldVersion = version;
        version = newVersion;
        upgradeToAndCall(newImplementation, new bytes(0));
        emit ContractUpgraded(oldVersion, newVersion, newImplementation);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

    uint256[50] private __gap;
}
