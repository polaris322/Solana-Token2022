This is a project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app). It can be used to create & edit Solana Token Extensions with Web3.js.

## Features
- Login via wallet adapter into any supported wallet (phantom, solflare, e.t.c)
- lists tokens that you have any authority on, including *mint authority, *metadata update authority, *fee withdraw authority, *fee config update authority.
- Able to use the logged in phantom to create a new token

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Create a token

1. Create a mint address.
   ```js
    // Generate new ownerKeyPair for Mint Account
    const mintKeypair = Keypair.generate();
    // Address for Mint Account
    const mint = mintKeypair.publicKey;
    // Decimals for Mint Account
    const decimals = 9;
   // Fee basis points for transfers (100 = 1%)
    const feeBasisPoints = 100;
   ```
2. Give authorities to the address.
    ```js
    // Authority that can update token metadata
    const metadataAuthority = publicKey;
    // Authority that can mint new tokens
    const mintAuthority = publicKey;
    // Authority that can modify transfer fees
    const transferFeeConfigAuthority = publicKey;
    // Authority that can move tokens withheld on mint or token accounts
    const withdrawWithheldAuthority = publicKey;
   ```
3. Set maximum fee for transaction.
    ```js
   // Maximum fee for transfers in token base units
    const maxFee = BigInt(9 * Math.pow(10, decimals));
    ```
4. Set metadata 
    ```js
    // Set token metadata such as name, symbol and uri
    const metadata = {
        mint: mint,
        name: token.name,
        symbol: token.symbol,
        uri: token.uri,
        additionalMetadata: [],
    };
   ```
5. Determine the size of mint Account with extensions and the minimum lamports. The minimum lamports should be enough for token update.
    ```js
   // Size of Mint Account with extensions
    const mintLen = getMintLen([ExtensionType.TransferFeeConfig, ExtensionType.MetadataPointer]);
    const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
    // Minimum lamports required for Mint Account
    const lamports = await walletConnection.getMinimumBalanceForRentExemption(mintLen + metadataLen);
    const mintAmount = BigInt(1_000_000 * Math.pow(10, decimals));
   ```
6. Create instructions and associated token. 
    ```js
   // Instruction to invoke System Program to create new account
    const createAccountInstruction = SystemProgram.createAccount({
        fromPubkey: publicKey, // Account that will transfer lamports to created account
        newAccountPubkey: mint, // Address of the account to create
        space: mintLen, // Amount of bytes to allocate to the created account
        lamports: lamports * 10, // Give enough amount of lamports transferred to created account to edit later
        programId: TOKEN_2022_PROGRAM_ID, // Program assigned as owner of created account
    });


    // Create associated token address for mint
    const associatedToken = getAssociatedTokenAddressSync(
        mint,
        publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Instruction to pointer of metadata
    const initializeMetadataPointer = createInitializeMetadataPointerInstruction(
        mint,
        metadataAuthority,
        mint,
        TOKEN_2022_PROGRAM_ID
    );

    // Instruction to initialize TransferFeeConfig Extension
    const initializeTransferFeeConfig =
        createInitializeTransferFeeConfigInstruction(
            mint, // Mint Account address
            transferFeeConfigAuthority, // Authority to update fees
            withdrawWithheldAuthority, // Authority to withdraw fees
            feeBasisPoints, // Basis points for transfer fee calculation
            maxFee, // Maximum fee per transfer
            TOKEN_2022_PROGRAM_ID, // Token Extension Program ID
        );

    // Instruction to initialize Mint Account data
    const initializeMintInstruction = createInitializeMintInstruction(
        mint, // Mint Account Address
        decimals, // Decimals of Mint
        mintAuthority, // Designated Mint Authority
        null, // Optional Freeze Authority
        TOKEN_2022_PROGRAM_ID, // Token Extension Program ID
    );

    // Instruction to initialize metadata
    const initializeInstruction = createInitializeInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        mint: mint,
        metadata: mint,
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
        mintAuthority: publicKey,
        updateAuthority: publicKey,
    });

    // Create associated token account for instruction
    const associatedTokenAccountInstruction = createAssociatedTokenAccountInstruction(
        publicKey,
        associatedToken,
        publicKey,
        mint,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Create mint instruction
    const mintToInstruction = createMintToInstruction(
        mint,
        associatedToken,
        mintAuthority,
        mintAmount,
        undefined,
        TOKEN_2022_PROGRAM_ID
    );
   ```
7. Create a new transaction with the instructions.
    ```js
    // Add instructions to new transaction
    const transaction = new Transaction().add(
        createAccountInstruction,
        initializeMetadataPointer,
        initializeTransferFeeConfig,
        initializeMintInstruction,
        initializeInstruction,
        associatedTokenAccountInstruction,
        mintToInstruction
    );
   ```
8. Get the recent transaction and sign transaction with wallet.
    ```js
   // Get the recent blockhash
    let { blockhash, lastValidBlockHeight } = await walletConnection.getLatestBlockhash(COMMITMENT);
    // Set the recent blockhash on the transaction
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = publicKey;
    transaction.partialSign(mintKeypair);

    // sign transaction with wallet
    const signedTransaction = await signTransaction(transaction);
    ```
9. Insert the signed transaction into the cluster.
   ```js
   // Send the signed transaction to the cluster
    const signature = await walletConnection.sendRawTransaction(signedTransaction.serialize());
    await walletConnection.confirmTransaction(signature, COMMITMENT);
   ```
## Update token
This code updates metadata of tokens such as token name, token symbol and token uri.
1. Create instructions. 
    ```js
   // Update the token name
    const updateNameInstruction = createUpdateFieldInstruction({
        metadata: mintPublicKey, // Mint account public key
        updateAuthority: publicKey, // Update authority public key
        programId: TOKEN_2022_PROGRAM_ID,
        field: 'name', // Field to update
        value: token.name // New value
    });

    // Update the token symbol
    const updateSymbolInstruction = createUpdateFieldInstruction({
        metadata: mintPublicKey,
        updateAuthority: publicKey,
        programId: TOKEN_2022_PROGRAM_ID,
        field: 'symbol',
        value: token.symbol
    });

    // Update the token uri
    const updateUriInstruction = createUpdateFieldInstruction({
        metadata: mintPublicKey,
        updateAuthority: publicKey,
        programId: TOKEN_2022_PROGRAM_ID,
        field: 'uri',
        value: token.uri
    });
   ```
2. Create a transaction with the instructions.
    ```js
   // Add instructions to a transaction and send
    const transaction = new Transaction()
        .add(updateNameInstruction)
        .add(updateUriInstruction)
        .add(updateSymbolInstruction);
   ```
3. Get recent transaction and sign the new transaction with wallet
    ```js
   // Get the recent blockhash
    let { blockhash, lastValidBlockHeight } = await walletConnection.getLatestBlockhash(COMMITMENT);
    // Set the recent blockhash on the transaction
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = publicKey;

    // sign transaction with wallet
    const signedTransaction = await signTransaction(transaction);   
   ```
   
4. Insert the signed transaction into the cluster.
    ```js
   // Send the signed transaction to the cluster
    const signature = await walletConnection.sendRawTransaction(signedTransaction.serialize());
    await walletConnection.confirmTransaction(signature, COMMITMENT);
   ```
   
   
## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
