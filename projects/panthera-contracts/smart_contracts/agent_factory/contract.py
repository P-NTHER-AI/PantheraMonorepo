from algopy import Account, ARC4Contract, itxn, Global, GlobalState, gtxn, String, subroutine, Txn, UInt64
from algopy.arc4 import abimethod


class AgentFactory(ARC4Contract):
    def __init__(self) -> None:
        # Global State Variables
        self.owner = GlobalState(Account)
        self.treasury = GlobalState(Account)
        self.creation_fee = GlobalState(UInt64)
        self.paused = GlobalState(UInt64)
        self.total_agents = GlobalState(UInt64)
        self.current_supply = GlobalState(UInt64)
        self.reserve_balance = GlobalState(UInt64)
        self.graduated = GlobalState(UInt64)
        self.reward_pool = GlobalState(UInt64)
        self.asa_id = GlobalState(UInt64)

        # Constants
        self.DECIMALS = UInt64(6)
        self.TOTAL_SUPPLY = UInt64(1_000_000_000 * (10**6))  # Pre-calculated
        self.VIRTUAL_CORE = UInt64(30_000_000)
        self.VIRTUAL_TOKEN = UInt64(1_073_000_000_000)
        self.GRADUATION_THRESHOLD = UInt64(30_000_000_000)
        self.PLATFORM_FEE_BP = UInt64(100)  # 1%

    @subroutine
    def create(self) -> None:
        """Initialize the contract on creation"""
        self.owner.value = Txn.sender
        self.treasury.value = Txn.sender
        self.creation_fee.value = UInt64(0)
        self.paused.value = UInt64(0)  # False = 0
        self.total_agents.value = UInt64(0)
        self.current_supply.value = UInt64(0)
        self.reserve_balance.value = UInt64(0)
        self.graduated.value = UInt64(0)  # False = 0
        self.reward_pool.value = UInt64(0)

    # --- Owner Only Methods ---

    @abimethod
    def set_treasury(self, new_treasury: Account) -> None:
        """Set treasury address (owner only)"""
        assert Txn.sender == self.owner.value, "Only owner"
        self.treasury.value = new_treasury

    @abimethod
    def set_fee(self, new_fee: UInt64) -> None:
        """Set creation fee (owner only)"""
        assert Txn.sender == self.owner.value, "Only owner"
        self.creation_fee.value = new_fee

    @abimethod
    def pause(self) -> None:
        """Pause the contract (owner only)"""
        assert Txn.sender == self.owner.value, "Only owner"
        self.paused.value = UInt64(1)  # True = 1

    @abimethod
    def unpause(self) -> None:
        """Unpause the contract (owner only)"""
        assert Txn.sender == self.owner.value, "Only owner"
        self.paused.value = UInt64(0)  # False = 0

    # --- Core Agent Factory Methods ---

    @abimethod
    def create_agent(self, name: String, symbol: String) -> UInt64:
        """
        Create a new agent token (ASA)
        Multi-Agent Factory Pattern - Each call creates new ASA
        """
        assert self.paused.value == UInt64(0), "Contract paused"

        # Check fee payment if required
        if self.creation_fee.value > UInt64(0):
            assert Global.group_size >= UInt64(2), "Payment required"
            payment_txn = gtxn.PaymentTransaction(0)
            assert payment_txn.receiver == self.treasury.value, "Wrong receiver"
            assert payment_txn.amount >= self.creation_fee.value, "Insufficient payment"

        # Create ASA via inner transaction
        asa_create_txn = itxn.AssetConfig(
            total=self.TOTAL_SUPPLY,
            decimals=self.DECIMALS,
            asset_name=name,
            unit_name=symbol,
            manager=Global.current_application_address,
            reserve=Global.current_application_address,
            freeze=Global.current_application_address,
            clawback=Global.current_application_address,
        )

        asa_id = asa_create_txn.submit().created_asset.id

        # Set first agent ASA as primary ASA_ID
        if self.total_agents.value == UInt64(0):
            self.asa_id.value = asa_id

        # Mint initial supply to contract
        itxn.AssetTransfer(
            xfer_asset=asa_id,
            asset_sender=Global.current_application_address,
            asset_receiver=Global.current_application_address,
            asset_amount=UInt64(1_000_000),  # Initial liquidity
        ).submit()

        # Increment agent counter
        self.total_agents.value += UInt64(1)

        return asa_id

    @abimethod
    def buy_agent_tokens(self, target_asa_id: UInt64) -> UInt64:
        """
        Buy tokens for specific agent with bonding curve pricing
        Multi-agent buying support
        """
        assert self.paused.value == UInt64(0), "Contract paused"
        assert self.graduated.value == UInt64(0), "Agent graduated"

        # Get payment amount from grouped transaction
        assert Global.group_size >= UInt64(2), "Payment required"
        payment_txn = gtxn.PaymentTransaction(1)
        assert payment_txn.receiver == Global.current_application_address, "Wrong receiver"

        algo_amount = payment_txn.amount

        # Calculate token amount using bonding curve
        tokens_to_mint = self._calculate_buy_amount(algo_amount)

        # Update global state
        self.current_supply.value += tokens_to_mint
        self.reserve_balance.value += algo_amount

        # Transfer tokens to buyer
        itxn.AssetTransfer(
            xfer_asset=target_asa_id,
            asset_receiver=Txn.sender,
            asset_amount=tokens_to_mint,
        ).submit()

        return tokens_to_mint

    @abimethod
    def sell(self, token_amount: UInt64) -> UInt64:
        """Sell tokens back to bonding curve"""
        assert self.paused.value == UInt64(0), "Contract paused"
        assert self.current_supply.value >= token_amount, "Insufficient supply"

        # Calculate ALGO to return using bonding curve
        algo_to_return = self._calculate_sell_amount(token_amount)
        assert self.reserve_balance.value >= algo_to_return, "Insufficient reserves"

        # Update global state
        self.current_supply.value -= token_amount
        self.reserve_balance.value -= algo_to_return

        # Send ALGO back to seller
        itxn.Payment(
            receiver=Txn.sender,
            amount=algo_to_return,
        ).submit()

        return algo_to_return

    # --- Bonding Curve Math Methods ---

    @subroutine
    def _calculate_buy_amount(self, algo_amount: UInt64) -> UInt64:
        """
        Calculate tokens to mint for given ALGO amount using bonding curve
        Implements: constant product formula x * y = k
        """
        # Current virtual reserves
        virtual_core = self.VIRTUAL_CORE + self.reserve_balance.value
        virtual_token = self.VIRTUAL_TOKEN - self.current_supply.value

        # New virtual core after adding ALGO
        new_virtual_core = virtual_core + algo_amount

        # Calculate new virtual token using constant product: (vc * vt) / new_vc
        if new_virtual_core > UInt64(0) and virtual_token > UInt64(0):
            new_virtual_token = (virtual_core * virtual_token) // new_virtual_core
            tokens_out = virtual_token - new_virtual_token if virtual_token > new_virtual_token else UInt64(0)
        else:
            tokens_out = algo_amount  # Fallback to 1:1 ratio

        return tokens_out

    @subroutine
    def _calculate_sell_amount(self, token_amount: UInt64) -> UInt64:
        """
        Calculate ALGO to return for given token amount using bonding curve
        """
        # Current virtual reserves
        virtual_core = self.VIRTUAL_CORE + self.reserve_balance.value
        virtual_token = self.VIRTUAL_TOKEN - self.current_supply.value

        # New virtual token after adding tokens back
        new_virtual_token = virtual_token + token_amount

        # Calculate new virtual core using constant product: (vc * vt) / new_vt
        if new_virtual_token > UInt64(0) and virtual_core > UInt64(0):
            new_virtual_core = (virtual_core * virtual_token) // new_virtual_token
            algo_out = virtual_core - new_virtual_core if virtual_core > new_virtual_core else UInt64(0)
        else:
            algo_out = token_amount  # Fallback to 1:1 ratio

        return algo_out

    @subroutine
    def _get_current_price(self) -> UInt64:
        """
        Calculate current token price: virtual_core / virtual_token
        Returns price scaled by 1e6 for 6 decimal places
        """
        virtual_core = self.VIRTUAL_CORE + self.reserve_balance.value
        virtual_token = self.VIRTUAL_TOKEN - self.current_supply.value

        if virtual_token > UInt64(0) and virtual_core > UInt64(0):
            # Price = vc / vt, scaled by 1e6 for decimals
            return (virtual_core * UInt64(1_000_000)) // virtual_token
        else:
            return UInt64(1_000_000)  # Default price of 1.0

    # --- View Methods ---

    @abimethod
    def get_total_agents(self) -> UInt64:
        """Get total number of created agents"""
        return self.total_agents.value

    @abimethod
    def get_current_price(self) -> UInt64:
        """Get current token price"""
        return self._get_current_price()

    @abimethod
    def get_buy_quote(self, algo_amount: UInt64) -> tuple[UInt64, UInt64, UInt64]:
        """
        Get quote for buying tokens
        Returns: (tokens_out, current_price, new_price)
        """
        current_price = self._get_current_price()
        tokens_out = self._calculate_buy_amount(algo_amount)

        # Calculate new price after purchase (simulation)
        temp_supply = self.current_supply.value + tokens_out
        temp_reserve = self.reserve_balance.value + algo_amount

        virtual_core = self.VIRTUAL_CORE + temp_reserve
        virtual_token = self.VIRTUAL_TOKEN - temp_supply

        if virtual_token > UInt64(0) and virtual_core > UInt64(0):
            new_price = (virtual_core * UInt64(1_000_000)) // virtual_token
        else:
            new_price = UInt64(1_000_000)

        return (tokens_out, current_price, new_price)

    @abimethod
    def get_sell_quote(self, token_amount: UInt64) -> tuple[UInt64, UInt64, UInt64]:
        """
        Get quote for selling tokens
        Returns: (algo_out, current_price, new_price)
        """
        current_price = self._get_current_price()
        algo_out = self._calculate_sell_amount(token_amount)

        # Calculate new price after sale (simulation)
        temp_supply = self.current_supply.value - token_amount
        temp_reserve = self.reserve_balance.value - algo_out

        virtual_core = self.VIRTUAL_CORE + temp_reserve
        virtual_token = self.VIRTUAL_TOKEN - temp_supply

        if virtual_token > UInt64(0) and virtual_core > UInt64(0):
            new_price = (virtual_core * UInt64(1_000_000)) // virtual_token
        else:
            new_price = UInt64(1_000_000)

        return (algo_out, current_price, new_price)

    @abimethod
    def get_bonding_curve_info(self) -> tuple[UInt64, UInt64, UInt64, UInt64]:
        """
        Get complete bonding curve information
        Returns: (current_supply, reserve_balance, price, graduated)
        """
        return (
            self.current_supply.value,
            self.reserve_balance.value,
            self._get_current_price(),
            self.graduated.value,  # Returns 0 or 1
        )

    @abimethod
    def get_metadata(self) -> tuple[UInt64, UInt64, UInt64]:
        """
        Get basic metadata
        Returns: (asa_id, active, agent_count)
        """
        return (
            self.asa_id.value,
            UInt64(1),  # Always active for now
            self.total_agents.value,
        )

    # --- Reward System ---

    @abimethod
    def distribute_rewards(self) -> None:
        """Distribute rewards (owner only)"""
        assert Txn.sender == self.owner.value, "Only owner"
        assert Global.group_size >= UInt64(2), "Payment required"

        payment_txn = gtxn.PaymentTransaction(0)

        self.reward_pool.value += payment_txn.amount

    @abimethod
    def claim_rewards(self) -> UInt64:
        """Claim available rewards"""
        reward_amount = self.reward_pool.value
        assert reward_amount > UInt64(0), "No rewards available"

        # Send rewards to claimer
        itxn.Payment(
            receiver=Txn.sender,
            amount=reward_amount,
        ).submit()

        # Reset reward pool
        self.reward_pool.value = UInt64(0)

        return reward_amount

    # --- Debug/Test Methods ---

    @abimethod
    def hello(self, name: String) -> String:
        """Test method for deployment verification"""
        return String("Hello, ") + name

    @abimethod
    def debug_test(self) -> String:
        """Debug method that always works"""
        return String("DEBUG: Method called successfully")
