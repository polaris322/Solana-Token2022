"use client";

import Image from 'next/image'
import {createTokenWith2022Extension, getTokensWithAuthority, updateToken} from "../services/TokenService";
import React, {useEffect, useState} from "react";
import WalletConnectButton from "../components/WalletConnectButton";
import {AuthContext} from "../context/AuthContext";
import {useConnection, useWallet} from "@solana/wallet-adapter-react";
import EditToken from "../components/EditToken";
import {TokenPropsType} from "../types/index";

export default function Home() {
    const initTokenProps: TokenPropsType = {name: "", symbol: "", uri: ""}
    const { publicKey, signTransaction } = useWallet();
    const { connection } = useConnection();

    // Flag to represent authentication with wallet
    const { isAuthenticated } = React.useContext(AuthContext);
    // Open or Close token dialog
    const [ openDialog, setOpenDialog ] = useState<boolean>(false);
    // Mode of Token dialog
    const [ newMode, setNewMode ] = useState<boolean>(false);
    // Selected token props when you edit a token
    const [ currentTokenProps, setCurrentTokenProps ] = useState<TokenPropsType>(initTokenProps);
    // Selected token mint key
    const [ selectedMintKey, setSelectedMintKey ] = useState<string>('');
    // List of associated tokens
    const [ tokens, setTokens ] = useState([]);

    /**
     * Submit token
     * @param token
     */
    const saveToken = async (token: TokenPropsType) => {
        setOpenDialog(false);

        if (newMode) {
            await createTokenWith2022Extension(publicKey, signTransaction, connection, token);
        } else {
            await updateToken(publicKey, connection, signTransaction, selectedMintKey, token);
        }

        fetchTokensAssociated();
    }

    /**
     * Set current token properties as default in edit mode
     * @param item
     */
    const editToken = (item: any) => {
        setNewMode(false);
        setSelectedMintKey(item.account.data.parsed.info.mint);
        setCurrentTokenProps({
            name: item.meta.name,
            symbol: item.meta.symbol,
            uri: item.meta.uri,
            fee: item.fee/100
        });
        setOpenDialog(true);
    }

    /**
     * Fetch all associated tokens
     */
    const fetchTokensAssociated = () => {
        getTokensWithAuthority(publicKey, connection).then((res) => {
            setTokens(res);
        });
    }

    useEffect(() => {
        if (isAuthenticated) {
            fetchTokensAssociated();
        }
    }, [isAuthenticated]);

  return (
    <main className="flex flex-col items-center p-24">
      <div className="z-10 w-full items-center justify-between font-mono text-sm lg:flex">
        <div className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:dark:bg-zinc-800/30">
          <WalletConnectButton style={{}} />
        </div>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <a
            className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0"
            href="https://vercel.com?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="/vercel.svg"
              alt="Vercel Logo"
              className="dark:invert"
              width={100}
              height={24}
              priority
            />
          </a>
        </div>
      </div>

      <div className="relative place-items-center w-full pt-8">
        <div className="py-3 flex justify-between">
            <h2 className="text-3xl">Browse Tokens</h2>
            {
                isAuthenticated && (
                    <button
                        onClick={() => {
                            setNewMode(true);
                            setCurrentTokenProps(initTokenProps);
                            setOpenDialog(true);
                        }}
                        className="text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                        New Token
                    </button>
                )
            }
        </div>

        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
              <th scope="col" className="px-6 py-3">
                  Name
              </th>
              <th scope="col" className="px-6 py-3">
                  Symbol
              </th>
              <th scope="col" className="px-6 py-3">
                  URI
              </th>
              <th scope="col" className="px-6 py-3">
                  Authority
              </th>
              <th scope="col" className="px-6 py-3 flex justify-end">
                  Action
              </th>
          </tr>
            </thead>
            {
                isAuthenticated && (
                    <tbody>
                    {
                        tokens.map((item, key) => (
                            <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700" key={key}>
                                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                    { item.meta?.name }
                                </th>
                                <td className="px-6 py-4">
                                    { item.meta?.symbol }
                                </td>
                                <td className="px-6 py-4">
                                    { item.meta?.uri }
                                </td>
                                <td className="px-6 py-4">
                                    { item.authority }
                                </td>
                                <td className="px-6 py-4 flex justify-end">
                                    <button
                                        onClick={() => editToken(item)}
                                        className="text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        ))
                    }
                    </tbody>
                )
            }
        </table>
      </div>

      <EditToken
          open={openDialog}
          isNew={newMode}
          name={currentTokenProps.name}
          symbol={currentTokenProps.symbol}
          uri={currentTokenProps.uri}
          onCancel={() => setOpenDialog(false)}
          onSuccess={saveToken} />
    </main>
  )
}
