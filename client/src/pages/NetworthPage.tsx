import React, { useEffect, useState } from 'react';
import sortBy from 'lodash/sortBy';
import { Button } from '@/components/ui/button';
import Asset from '@/components/Asset';
import NetWorth from '@/components/NetWorth';
import { NetworthSummaryCard } from '@/components/NetworthSummaryCard';
import TransactionTrendsOverview from '@/components/TransactionTrendsOverview';
import useLogin from '@/hooks/useLogin';
import { ItemType, AccountType, AssetType } from '../components/types';
import { useItems, useAccounts, useTransactions, useUsers, useAssets, useLink } from '../services';
import LaunchLink from '@/components/LaunchLink';

export const NetworthPage: React.FC = () => {
  const userId = Number(useLogin());

  const [items, setItems] = useState<ItemType[]>([]);
  const [token, setToken] = useState('');
  const [numOfItems, setNumOfItems] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [assets, setAssets] = useState<AssetType[]>([]);
  const [transactionAssets, setTransactionAssets] = useState<any[]>([]);
  const [transactionLiabilities, setTransactionLiabilities] = useState<any[]>([]);

  const [initialAssetsBalance, setInitialAssetsBalance] = useState(0);
  const [initialLiabilitiesBalance, setInitialLiabilitiesBalance] = useState(0);

  const { getTransactionsByUser, transactionsByUser } = useTransactions();
  const { getAccountsByUser, accountsByUser } = useAccounts();
  const { assetsByUser, getAssetsByUser } = useAssets();
  const { usersById, getUserById, getTransactionAssetsByUser, getTransactionLiabilitiesByUser } = useUsers();
  const { itemsByUser, getItemsByUser } = useItems();
  const { generateLinkToken, linkTokens } = useLink();

  const [user, setUser] = useState({
    id: 0,
    username: '',
    created_at: '',
    updated_at: '',
  });

  useEffect(() => {
    if (userId) {
      getUserById(userId, false);
    }
  }, [getUserById, userId]);

  useEffect(() => {
    setUser(usersById[userId] || {});
  }, [usersById, userId]);

  useEffect(() => {
    if (userId) {
      getTransactionsByUser(userId);
    }
  }, [getTransactionsByUser, userId]);

  useEffect(() => {
    setTransactions(transactionsByUser[userId] || []);
  }, [transactionsByUser, userId]);

  useEffect(() => {
    if (userId) {
      getAssetsByUser(userId);
    }
  }, [getAssetsByUser, userId]);

  useEffect(() => {
    if (assetsByUser) {
      setAssets(assetsByUser.assets || []);
    }
  }, [assetsByUser, userId]);

  useEffect(() => {
    if (userId) {
      getItemsByUser(userId, true);
    }
  }, [getItemsByUser, userId]);

  useEffect(() => {
    const newItems: Array<ItemType> = itemsByUser[userId] || [];
    const orderedItems = sortBy(newItems, item => new Date(item.updated_at)).reverse();
    setItems(orderedItems);
  }, [itemsByUser, userId]);

  useEffect(() => {
    if (itemsByUser[userId]) {
      setNumOfItems(itemsByUser[userId].length);
    } else {
      setNumOfItems(0);
    }
  }, [itemsByUser, userId]);

  useEffect(() => {
    if (userId) {
      getAccountsByUser(userId);
    }
  }, [getAccountsByUser, userId]);

  useEffect(() => {
    if (accountsByUser[userId]) {
      setAccounts(accountsByUser[userId]);

      // Calculate initial balances
      const initialAssets = accountsByUser[userId].reduce((total, account) => 
        (account.type === 'depository' || account.type === 'investment') 
          ? total + account.current_balance 
          : total, 
      0);
      const initialLiabilities = accountsByUser[userId].reduce((total, account) => 
        (account.type !== 'depository' && account.type !== 'investment') 
          ? total + account.current_balance 
          : total, 
      0);

      setInitialAssetsBalance(initialAssets);
      setInitialLiabilitiesBalance(initialLiabilities);
    }
  }, [accountsByUser, userId]);

  useEffect(() => {
    if (userId) {
      (async () => {
        const assets = await getTransactionAssetsByUser(userId);
        setTransactionAssets(assets);

        const liabilities = await getTransactionLiabilitiesByUser(userId);
        setTransactionLiabilities(liabilities);
      })();
    }
  }, [userId, getTransactionAssetsByUser, getTransactionLiabilitiesByUser]);

  const aggregateTransactionsByDay = (data: any[]) => {
    return data.reduce((acc: { [key: string]: number }, item) => {
      const date = new Date(item.date).toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
      acc[date] = (acc[date] || 0) + item.amount;
      return acc;
    }, {});
  };

  const transactionAssetsByDay = aggregateTransactionsByDay(transactionAssets);
  const transactionLiabilitiesByDay = aggregateTransactionsByDay(transactionLiabilities);

  // Stored amounts are negative for money spent. Spending lowers an asset balance but raises
  // what is owed on a liability, so walking backwards the sign flips for liabilities.
  const computeBalances = (initialBalance: number, transactionsByDay: { [key: string]: number }, isLiability = false) => {
    const days = Object.keys(transactionsByDay); // it's in reverse order
    let balances: { date: string; amount: number }[] = [];
    let previousBalance = initialBalance;

    days.forEach(day => {
      balances.unshift({ date: day, amount: previousBalance }); // Prepend to the start
      const change = transactionsByDay[day] || 0;
      previousBalance = isLiability ? previousBalance + change : previousBalance - change;
    });
  
    return balances;
  };
  
  



  const assetBalancesByDay =computeBalances(initialAssetsBalance, transactionAssetsByDay);
  const liabilityBalancesByDay = computeBalances(initialLiabilitiesBalance, transactionLiabilitiesByDay, true);

  

  useEffect(() => {
    console.log('Initial BALANCES ASSET: ', initialAssetsBalance);
    console.log ('Iniitial BALANCES  Liabilities : ', initialLiabilitiesBalance);
    console.log('Transaction Assets: ', transactionAssets); 
    console.log('Transaction LIabiilites', transactionLiabilities);
    console.log('Transaction Assets ', transactionAssetsByDay);
    console.log('Transactions Liabilities By Day ' , transactionLiabilitiesByDay);
    console.log('accountsByUser: ', accountsByUser[userId]);
    console.log('Transaction Assets',transactionAssetsByDay); 
    console.log('Transactioins Liabilities ', transactionLiabilitiesByDay);
    console.log('Asset Balances by Day:', assetBalancesByDay);
    console.log('Liability Balances by Day:', liabilityBalancesByDay);
  }, [assetBalancesByDay, liabilityBalancesByDay]);

  const initiateLink = async () => {
    await generateLinkToken(userId, null);
  };

  return (
    <div>
      <div>
        <TransactionTrendsOverview
          transactionAssets={assetBalancesByDay}
          transactionLiabilities={liabilityBalancesByDay}
        />
      </div>
      <div className="hidden flex-col md:flex">
        <div>
          <NetworthSummaryCard userId={userId} assets={assets} accounts={accounts} />
        </div>

        <div className="flex-1 space-y-4 p-20 pt-6">
          <h2 className="text-3xl font-bold tracking-tight">Networth</h2>

          <div>
            {numOfItems > 0 && transactions.length > 0 && (
              <>
                <NetWorth
                  accounts={accounts}
                  numOfItems={numOfItems}
                  personalAssets={assets}
                  userId={userId}
                  assetsOnly={false}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
