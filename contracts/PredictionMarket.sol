// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MLBB Bets Prediction Market
/// @notice Constant product market maker for Mobile Legends match predictions.
contract PredictionMarket {
    enum Outcome {
        TeamAWins,
        TeamBWins
    }

    enum MarketStatus {
        Active,
        Resolved
    }

    struct MarketMetadata {
        string matchTitle;
        string teamA;
        string teamB;
        uint256 matchStartTime;
        MarketStatus status;
        Outcome winningOutcome;
        uint256 reserveTeamA;
        uint256 reserveTeamB;
    }

    address public immutable owner;
    string public matchTitle;
    string public teamA;
    string public teamB;
    uint256 public matchStartTime;
    MarketStatus public status;
    Outcome public winningOutcome;

    uint256 private reserveTeamA;
    uint256 private reserveTeamB;

    mapping(address => mapping(Outcome => uint256)) private userShares;

    event MarketSeeded(uint256 initialLiquidityPerSide);
    event BetPlaced(address indexed bettor, Outcome indexed outcome, uint256 amountIn, uint256 sharesOut);
    event SharesSold(address indexed seller, Outcome indexed outcome, uint256 sharesIn, uint256 amountOut);
    event MarketResolved(Outcome indexed winningOutcome);
    event WinningsClaimed(address indexed claimant, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorised");
        _;
    }

    modifier onlyActiveMarket() {
        require(status == MarketStatus.Active, "Market inactive");
        _;
    }

    constructor(
        string memory _matchTitle,
        string memory _teamA,
        string memory _teamB,
        uint256 _matchStartTime,
        uint256 initialLiquidityPerSide
    ) payable {
        require(initialLiquidityPerSide > 0, "Liquidity required");
        require(msg.value == initialLiquidityPerSide * 2, "Seed both sides equally");

        owner = msg.sender;
        matchTitle = _matchTitle;
        teamA = _teamA;
        teamB = _teamB;
        matchStartTime = _matchStartTime;
        status = MarketStatus.Active;
        winningOutcome = Outcome.TeamAWins;

        reserveTeamA = initialLiquidityPerSide;
        reserveTeamB = initialLiquidityPerSide;

        emit MarketSeeded(initialLiquidityPerSide);
    }

    receive() external payable {}

    function getMarket() external view returns (MarketMetadata memory) {
        return MarketMetadata({
            matchTitle: matchTitle,
            teamA: teamA,
            teamB: teamB,
            matchStartTime: matchStartTime,
            status: status,
            winningOutcome: winningOutcome,
            reserveTeamA: reserveTeamA,
            reserveTeamB: reserveTeamB
        });
    }

    function getPoolBalances() external view returns (uint256 teamAPool, uint256 teamBPool) {
        return (reserveTeamA, reserveTeamB);
    }

    function getSharePrice(Outcome outcome) public view returns (uint256) {
        (uint256 poolA, uint256 poolB) = (reserveTeamA, reserveTeamB);
        require(poolA > 0 && poolB > 0, "Market not initialised");

        if (outcome == Outcome.TeamAWins) {
            return (poolB * 1e18) / (poolA + poolB);
        }

        return (poolA * 1e18) / (poolA + poolB);
    }

    function getPayoutMultiplier(Outcome outcome) external view returns (uint256) {
        uint256 price = getSharePrice(outcome);
        require(price > 0, "Price unavailable");
        return (1e18 * 1e18) / price;
    }

    function getUserShares(address account, Outcome outcome) external view returns (uint256) {
        return userShares[account][outcome];
    }

    function getClaimablePayout(address account) external view returns (uint256) {
        if (status != MarketStatus.Resolved) {
            return 0;
        }
        return userShares[account][winningOutcome];
    }

    function getLiquidity() external view returns (uint256) {
        return reserveTeamA + reserveTeamB;
    }

    function buyShares(Outcome outcome, uint256 minSharesOut) external payable onlyActiveMarket returns (uint256 sharesOut) {
        require(msg.value > 0, "No value sent");

        if (outcome == Outcome.TeamAWins) {
            sharesOut = _computeSharesOut(msg.value, reserveTeamA, reserveTeamB);
            require(sharesOut >= minSharesOut, "Slippage");
            reserveTeamA += msg.value;
            reserveTeamB -= sharesOut;
        } else {
            sharesOut = _computeSharesOut(msg.value, reserveTeamB, reserveTeamA);
            require(sharesOut >= minSharesOut, "Slippage");
            reserveTeamB += msg.value;
            reserveTeamA -= sharesOut;
        }

        userShares[msg.sender][outcome] += sharesOut;

        emit BetPlaced(msg.sender, outcome, msg.value, sharesOut);
    }

    function sellShares(Outcome outcome, uint256 sharesAmount, uint256 minAmountOut)
        external
        onlyActiveMarket
        returns (uint256 amountOut)
    {
        require(sharesAmount > 0, "Zero shares");
        uint256 balance = userShares[msg.sender][outcome];
        require(balance >= sharesAmount, "Insufficient shares");

        if (outcome == Outcome.TeamAWins) {
            amountOut = _computeAmountOut(sharesAmount, reserveTeamB, reserveTeamA);
            require(amountOut >= minAmountOut, "Slippage");
            reserveTeamA -= amountOut;
            reserveTeamB += sharesAmount;
        } else {
            amountOut = _computeAmountOut(sharesAmount, reserveTeamA, reserveTeamB);
            require(amountOut >= minAmountOut, "Slippage");
            reserveTeamB -= amountOut;
            reserveTeamA += sharesAmount;
        }

        userShares[msg.sender][outcome] = balance - sharesAmount;

        (bool success, ) = msg.sender.call{value: amountOut}("");
        require(success, "Transfer failed");

        emit SharesSold(msg.sender, outcome, sharesAmount, amountOut);
    }

    function resolveMarket(Outcome outcome) external onlyOwner onlyActiveMarket {
        status = MarketStatus.Resolved;
        winningOutcome = outcome;
        emit MarketResolved(outcome);
    }

    function claimWinnings() external returns (uint256 payout) {
        require(status == MarketStatus.Resolved, "Not resolved");
        payout = userShares[msg.sender][winningOutcome];
        require(payout > 0, "Nothing to claim");

        userShares[msg.sender][Outcome.TeamAWins] = 0;
        userShares[msg.sender][Outcome.TeamBWins] = 0;

        (bool success, ) = msg.sender.call{value: payout}("");
        require(success, "Claim failed");

        emit WinningsClaimed(msg.sender, payout);
    }

    function _computeSharesOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) private pure returns (uint256) {
        uint256 newReserveIn = reserveIn + amountIn;
        uint256 k = reserveIn * reserveOut;
        uint256 newReserveOut = k / newReserveIn;
        return reserveOut - newReserveOut;
    }

    function _computeAmountOut(uint256 sharesIn, uint256 reserveOut, uint256 reserveIn) private pure returns (uint256) {
        uint256 newReserveOut = reserveOut + sharesIn;
        uint256 k = reserveOut * reserveIn;
        uint256 newReserveIn = k / newReserveOut;
        return reserveIn - newReserveIn;
    }
}

