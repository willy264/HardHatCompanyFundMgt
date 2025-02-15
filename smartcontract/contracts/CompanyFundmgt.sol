// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CompanyFunds is Ownable {
    uint256 public funds;
    uint256 public requiredSignatures = 20;
    address[] public boardMembers;
    mapping(address => bool) public hasSigned;
    uint256 public signatureCount;
    bool public releaseRequested;

    error MustHaveExactly20Members();
    error NotBoardMember();
    error MustSendFunds();
    error NoFundsAvailable();
    error ReleaseNotRequested();
    error AlreadySigned();
    error NotAllSignaturesCollected();
    error TransferFailed();

    event FundsAdded(uint256 amount);
    event FundReleaseRequested();
    event Signed(address member);
    event FundsReleased(uint256 amount);

    constructor(address[] memory _boardMembers) {
        if (_boardMembers.length != requiredSignatures) revert MustHaveExactly20Members();
        boardMembers = _boardMembers;
    }

    modifier onlyBoardMember() {
        if (!isBoardMember(msg.sender)) revert NotBoardMember();
        _;
    }

    function isBoardMember(address user) public view returns (bool) {
        for (uint256 i = 0; i < boardMembers.length; i++) {
            if (boardMembers[i] == user) return true;
        }
        return false;
    }

    function addFunds() external payable onlyOwner {
        if (msg.value == 0) revert MustSendFunds();
        funds += msg.value;
        emit FundsAdded(msg.value);
    }

    function requestRelease() external onlyOwner {
        if (funds == 0) revert NoFundsAvailable();
        releaseRequested = true;
        signatureCount = 0;
        for (uint256 i = 0; i < boardMembers.length; i++) {
            hasSigned[boardMembers[i]] = false;
        }
        emit FundReleaseRequested();
    }

    function signRelease() external onlyBoardMember {
        if (!releaseRequested) revert ReleaseNotRequested();
        if (hasSigned[msg.sender]) revert AlreadySigned();

        hasSigned[msg.sender] = true;
        signatureCount++;

        emit Signed(msg.sender);
    }

    function releaseFunds(address payable recipient) external onlyOwner {
        if (!releaseRequested) revert ReleaseNotRequested();
        if (signatureCount != requiredSignatures) revert NotAllSignaturesCollected();
        if (funds == 0) revert NoFundsAvailable();

        uint256 amount = funds;
        funds = 0;
        releaseRequested = false;

        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit FundsReleased(amount);
    }

    receive() external payable {
        funds += msg.value;
    }
}
