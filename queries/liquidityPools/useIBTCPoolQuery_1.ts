import { useQuery, QueryConfig } from 'react-query';
import { ethers } from 'ethers';
import { useRecoilValue } from 'recoil';

import synthetix from 'lib/synthetix';
import QUERY_KEYS from 'constants/queryKeys';
import { appReadyState } from 'store/app';
import { walletAddressState, isWalletConnectedState, networkState } from 'store/wallet';
import { Synths } from 'constants/currency';

import { LiquidityPoolData } from './types';

const useIBTCPoolQuery_1 = (options?: QueryConfig<LiquidityPoolData>) => {
	const isAppReady = useRecoilValue(appReadyState);
	const isWalletConnected = useRecoilValue(isWalletConnectedState);
	const walletAddress = useRecoilValue(walletAddressState);
	const network = useRecoilValue(networkState);

	return useQuery<LiquidityPoolData>(
		QUERY_KEYS.LiquidityPools.iBTC(walletAddress ?? '', network?.id!),
		async () => {
			const contract = synthetix.js?.contracts.StakingRewardsiBTC as ethers.Contract;
			const address = contract.address;

			const getDuration = contract.DURATION || contract.rewardsDuration;
			const [
				duration,
				rate,
				periodFinish,
				iBtcBalance,
				iBtcUserBalance,
				iBtcPrice,
				iBtcSNXRewards,
				iBtcStaked,
				iBtcAllowance,
			] = await Promise.all([
				getDuration(),
				contract.rewardRate(),
				contract.periodFinish(),
				synthetix.js?.contracts.ProxyiBTC.balanceOf(address),
				synthetix.js?.contracts.ProxyiBTC.balanceOf(walletAddress),
				synthetix.js?.contracts.ExchangeRates.rateForCurrency(synthetix.js?.toBytes32(Synths.iBTC)),
				contract.earned(walletAddress),
				contract.balanceOf(walletAddress),
				synthetix.js?.contracts.ProxyiBTC.allowance(walletAddress, address),
			]);
			const durationInWeeks = Number(duration) / 3600 / 24 / 7;
			const isPeriodFinished = new Date().getTime() > Number(periodFinish) * 1000;
			const distribution = isPeriodFinished
				? 0
				: Math.trunc(Number(duration) * (rate / 1e18)) / durationInWeeks;

			const [balance, userBalance, price, rewards, staked, allowance] = [
				iBtcBalance,
				iBtcUserBalance,
				iBtcPrice,
				iBtcSNXRewards,
				iBtcStaked,
				iBtcAllowance,
			].map((data) => Number(synthetix.js?.utils.formatEther(data)));

			return {
				distribution,
				address,
				price,
				balance,
				periodFinish: Number(periodFinish) * 1000,
				duration: Number(duration) * 1000,
				rewards,
				staked,
				allowance,
				userBalance,
			};
		},
		{
			enabled: isAppReady && isWalletConnected,
			...options,
		}
	);
};

export default useIBTCPoolQuery_1;
