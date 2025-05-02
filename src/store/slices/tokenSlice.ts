
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type TokenStatus = 'pending' | 'confirmed' | 'failed';
export type TokenType = 'ERC3643' | 'Stellar' | 'ERC20' | 'ERC721';

export interface Token {
  id: string;
  name: string;
  symbol: string;
  type: TokenType;
  blockchain: string;
  supply: number;
  status: TokenStatus;
  createdAt: string;
  createdBy: string;
  contractAddress?: string;
}

export interface Transaction {
  id: string;
  tokenId: string;
  from: string;
  to: string;
  amount: number;
  status: TokenStatus;
  timestamp: string;
}

interface TokenState {
  tokens: Token[];
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
}

const initialState: TokenState = {
  tokens: [],
  transactions: [],
  isLoading: false,
  error: null,
};

export const tokenSlice = createSlice({
  name: 'token',
  initialState,
  reducers: {
    fetchTokensStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchTokensSuccess: (state, action: PayloadAction<Token[]>) => {
      state.tokens = action.payload;
      state.isLoading = false;
    },
    fetchTokensFailed: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    createTokenStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    createTokenSuccess: (state, action: PayloadAction<Token>) => {
      state.tokens.push(action.payload);
      state.isLoading = false;
    },
    createTokenFailed: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    fetchTransactionsSuccess: (state, action: PayloadAction<Transaction[]>) => {
      state.transactions = action.payload;
    },
    updateTokenStatus: (state, action: PayloadAction<{ tokenId: string; status: TokenStatus }>) => {
      const token = state.tokens.find(t => t.id === action.payload.tokenId);
      if (token) {
        token.status = action.payload.status;
      }
    },
  },
});

export const {
  fetchTokensStart,
  fetchTokensSuccess,
  fetchTokensFailed,
  createTokenStart,
  createTokenSuccess,
  createTokenFailed,
  fetchTransactionsSuccess,
  updateTokenStatus
} = tokenSlice.actions;

export default tokenSlice.reducer;
