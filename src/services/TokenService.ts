import {
    Keypair,
    sendAndConfirmTransaction,
    SystemProgram,
    Transaction,
    PublicKey
} from "@solana/web3.js";
import {
    createInitializeInstruction,
    createInitializeMetadataPointerInstruction,
    createInitializeMintInstruction,
    createInitializeTransferFeeConfigInstruction,
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction,
    ExtensionType,
    getAccount,
    getMint,
    getMintLen,
    getTokenMetadata,
    getTransferFeeConfig,
    LENGTH_SIZE,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TYPE_SIZE, createUpdateFieldInstruction,
} from "@solana/spl-token";
import {pack} from "@solana/spl-token-metadata";
import {TokenPropsType} from "../types/index";

// Network
const COMMITMENT = "confirmed";

/**
 * Generate Token2022
 * @param publicKey
 * @param signTransaction
 * @param walletConnection
 * @param token
 */
export const createTokenWith2022Extension = async (publicKey, signTransaction, walletConnection, token: TokenPropsType) => {
    // Generate new ownerKeyPair for Mint Account
    const mintKeypair = Keypair.generate();
    // Address for Mint Account
    const mint = mintKeypair.publicKey;
    // Decimals for Mint Account
    const decimals = 9;
    // Authority that can update token metadata
    const metadataAuthority = publicKey;
    // Authority that can mint new tokens
    const mintAuthority = publicKey;
    // Authority that can modify transfer fees
    const transferFeeConfigAuthority = publicKey;
    // Authority that can move tokens withheld on mint or token accounts
    const withdrawWithheldAuthority = publicKey;
    // Fee basis points for transfers (100 = 1%)
    const feeBasisPoints = 100;
    // Maximum fee for transfers in token base units
    const maxFee = BigInt(9 * Math.pow(10, decimals));

    const metadata = {
        mint: mint,
        name: token.name,
        symbol: token.symbol,
        uri: token.uri,
        additionalMetadata: [],
    };

    // Size of Mint Account with extensions
    const mintLen = getMintLen([ExtensionType.TransferFeeConfig, ExtensionType.MetadataPointer]);
    const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
    // Minimum lamports required for Mint Account
    const lamports = await walletConnection.getMinimumBalanceForRentExemption(mintLen + metadataLen);
    const mintAmount = BigInt(1_000_000 * Math.pow(10, decimals));

    // Instruction to invoke System Program to create new account
    const createAccountInstruction = SystemProgram.createAccount({
        fromPubkey: publicKey, // Account that will transfer lamports to created account
        newAccountPubkey: mint, // Address of the account to create
        space: mintLen, // Amount of bytes to allocate to the created account
        lamports, // Amount of lamports transferred to created account
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

    // Get the recent blockhash
    let { blockhash, lastValidBlockHeight } = await walletConnection.getLatestBlockhash(COMMITMENT);
    // Set the recent blockhash on the transaction
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = publicKey;
    transaction.partialSign(mintKeypair);

    // sign transaction with wallet
    const signedTransaction = await signTransaction(transaction);
    // Send the signed transaction to the cluster
    const signature = await walletConnection.sendRawTransaction(signedTransaction.serialize());
    await walletConnection.confirmTransaction(signature, COMMITMENT);

    console.log(
        "\nCreate Mint Account:",
        generateExplorerTxUrl(signature),
    );
}

/**
 * Get authority tokens
 * @param publicKey
 * @param walletConnection
 */
export const getTokensWithAuthority = async (publicKey, walletConnection) => {
    const tokenAccounts = await walletConnection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_2022_PROGRAM_ID }
    );

    const tokensWithAuthority = tokenAccounts.value.map(async account => {
        // Get account detail of the token
        const { mint } = await getAccount(walletConnection, account.pubkey, COMMITMENT, TOKEN_2022_PROGRAM_ID);

        // Get metatdata of the token
        const metadata = await getTokenMetadata(
            walletConnection, // Connection instance
            mint, // PubKey of the Mint Account
            COMMITMENT, // Commitment, can use undefined to use default
            TOKEN_2022_PROGRAM_ID,
        );

        // authority string
        let authorityString = [];

        // Check if the connected wallet has mint authority
        const mintAccountInfo = await getMint(walletConnection, mint, COMMITMENT, TOKEN_2022_PROGRAM_ID);
        const hasMintAuthority = mintAccountInfo.mintAuthority.equals(publicKey);
        if (hasMintAuthority) {
            authorityString.push("Mint");
        }

        // Check if the connected wallet has metadata update authority
        const hasMetadataUpdateAuthority = metadata && metadata.updateAuthority.equals(publicKey);
        if (hasMetadataUpdateAuthority){
            authorityString.push("MetadataUpdate");
        }

        // Check if the connected wallet has fee config update authority
        const configAccountInfo = await getTransferFeeConfig(mintAccountInfo);
        const hasFeeConfigUpdateAuthority = configAccountInfo.transferFeeConfigAuthority.equals(publicKey);
        if (hasFeeConfigUpdateAuthority) {
            authorityString.push("FeeConfigUpdate");
        }

        // Check if the connected wallet has fee withdraw authority
        const hasFeeWithdrawAuthority = configAccountInfo.withdrawWithheldAuthority.equals(publicKey);
        if (hasFeeWithdrawAuthority) {
            authorityString.push("FeeWithdrawAuthority");
        }

        if (hasMintAuthority || hasMetadataUpdateAuthority || hasFeeWithdrawAuthority || hasFeeConfigUpdateAuthority) {
            return {
                ...account,
                meta: metadata,
                authority: authorityString.toString()
            }
        }
    });

    return Promise.all(tokensWithAuthority).then(res => res.filter(item => typeof item !== 'undefined'));
}

/**
 * Update token properties
 * @param publicKey
 * @param walletConnection
 * @param signTransaction
 * @param mintPublicKey
 * @param token
 */
export const updateToken = async (publicKey, walletConnection, signTransaction, mintPublicKey, token: TokenPropsType) => {
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

    // Add instructions to a transaction and send
    const transaction = new Transaction()
        .add(updateNameInstruction)
        .add(updateUriInstruction)
        .add(updateSymbolInstruction);

    // Sign and send the transaction
    // Get the recent blockhash
    let { blockhash, lastValidBlockHeight } = await walletConnection.getLatestBlockhash(COMMITMENT);
    // Set the recent blockhash on the transaction
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = publicKey;

    // sign transaction with wallet
    const signedTransaction = await signTransaction(transaction);
    // Send the signed transaction to the cluster
    const signature = await walletConnection.sendRawTransaction(signedTransaction.serialize());
    await walletConnection.confirmTransaction(signature, COMMITMENT);

    console.log(
        "\nCreate Mint Account:",
        generateExplorerTxUrl(signature),
    );
}

/**
 * Helper function to generate Explorer URL
 * @param txId
 */
function generateExplorerTxUrl(txId: string) {
    return `https://explorer.solana.com/tx/${txId}?cluster=devnet`;
}