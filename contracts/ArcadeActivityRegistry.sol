// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract ArcadeActivityRegistry is Ownable {
    struct DailySnapshot {
        bytes32 merkleRoot;
        uint64 participantCount;
        uint64 challengeCount;
        uint128 totalPoints;
        uint64 publishedAt;
        bool exists;
    }

    mapping(bytes32 => DailySnapshot) private snapshots;
    mapping(bytes32 => mapping(address => bool)) public hasClaimedForDay;

    event SnapshotPublished(
        bytes32 indexed dateKeyHash,
        string dateKey,
        bytes32 indexed merkleRoot,
        uint256 participantCount,
        uint256 challengeCount,
        uint256 totalPoints
    );

    event DailyActivityClaimed(
        bytes32 indexed dateKeyHash,
        address indexed player,
        string profileSlug,
        uint256 points,
        uint256 streak,
        uint256 solvedChallenges
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    function publishDailySnapshot(
        string calldata dateKey,
        bytes32 merkleRoot,
        uint64 participantCount,
        uint64 challengeCount,
        uint128 totalPoints
    ) external onlyOwner {
        bytes32 dateKeyHash = _dateKeyHash(dateKey);

        snapshots[dateKeyHash] = DailySnapshot({
            merkleRoot: merkleRoot,
            participantCount: participantCount,
            challengeCount: challengeCount,
            totalPoints: totalPoints,
            publishedAt: uint64(block.timestamp),
            exists: true
        });

        emit SnapshotPublished(
            dateKeyHash,
            dateKey,
            merkleRoot,
            participantCount,
            challengeCount,
            totalPoints
        );
    }

    function claimDailyActivity(
        string calldata dateKey,
        string calldata profileSlug,
        uint256 points,
        uint256 streak,
        uint256 solvedChallenges,
        bytes32[] calldata proof
    ) external {
        bytes32 dateKeyHash = _dateKeyHash(dateKey);
        DailySnapshot memory snapshot = snapshots[dateKeyHash];

        require(snapshot.exists, "snapshot-not-found");
        require(!hasClaimedForDay[dateKeyHash][msg.sender], "already-claimed");

        bytes32 leaf = getLeaf(
            msg.sender,
            profileSlug,
            dateKey,
            points,
            streak,
            solvedChallenges
        );

        require(
            MerkleProof.verifyCalldata(proof, snapshot.merkleRoot, leaf),
            "invalid-proof"
        );

        hasClaimedForDay[dateKeyHash][msg.sender] = true;

        emit DailyActivityClaimed(
            dateKeyHash,
            msg.sender,
            profileSlug,
            points,
            streak,
            solvedChallenges
        );
    }

    function getSnapshot(
        string calldata dateKey
    ) external view returns (DailySnapshot memory) {
        return snapshots[_dateKeyHash(dateKey)];
    }

    function getLeaf(
        address player,
        string memory profileSlug,
        string memory dateKey,
        uint256 points,
        uint256 streak,
        uint256 solvedChallenges
    ) public pure returns (bytes32) {
        return keccak256(
            abi.encode(
                player,
                profileSlug,
                dateKey,
                points,
                streak,
                solvedChallenges
            )
        );
    }

    function _dateKeyHash(string memory dateKey) internal pure returns (bytes32) {
        return keccak256(bytes(dateKey));
    }
}
