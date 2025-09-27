export class DEXService {
  constructor(_tokenAddress: string) {}

  async getDEXQuote() {
    throw new Error("DEX service is not implemented for Algorand yet");
  }

  async getSwapTx() {
    throw new Error("DEX service is not implemented for Algorand yet");
  }
}

export const createDEXService = (_tokenAddress: string) => {
  return new DEXService(_tokenAddress);
};
