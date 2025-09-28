import algopy


class AgentFactory(algopy.arc4.ARC4Contract):

    def __init__(self) -> None:
        self.owner = algopy.GlobalState(algopy.Account)
        self.treasury = algopy.GlobalState(algopy.Account)
        self.creation_fee = algopy.GlobalState(algopy.UInt64)
        self.paused = algopy.GlobalState(algopy.UInt64)
        self.total_agents = algopy.GlobalState(algopy.UInt64)
        self.current_supply = algopy.GlobalState(algopy.UInt64)
        self.reserve_balance = algopy.GlobalState(algopy.UInt64)
        self.graduated = algopy.GlobalState(algopy.UInt64)
        self.reward_pool = algopy.GlobalState(algopy.UInt64)
        self.asa_id = algopy.GlobalState(algopy.UInt64)

        self.DECIMALS = algopy.UInt64(6)
        self.TOTAL_SUPPLY = algopy.UInt64(1_000_000_000 * (10**6))
        self.VIRTUAL_CORE = algopy.UInt64(30_000)
        self.VIRTUAL_TOKEN = algopy.UInt64(1_073_000)
        self.PLATFORM_FEE_BP = algopy.UInt64(100)

        self.GRADUATION_THRESHOLD = algopy.UInt64(5_000_000)
        self.graduation_initiated = algopy.GlobalState(algopy.UInt64)
        self.graduation_timestamp = algopy.GlobalState(algopy.UInt64)
        self.tinyman_pool_address = algopy.GlobalState(algopy.Account)
        self.pool_token_id = algopy.GlobalState(algopy.UInt64)
        self.graduation_funds_withdrawn = algopy.GlobalState(algopy.UInt64)

        self.LIQUIDITY_PERCENTAGE = algopy.UInt64(80)
        self.CREATOR_PERCENTAGE = algopy.UInt64(15)
        self.PLATFORM_PERCENTAGE = algopy.UInt64(5)

        self.owner.value = algopy.Txn.sender
        self.treasury.value = algopy.Txn.sender
        self.creation_fee.value = algopy.UInt64(0)
        self.paused.value = algopy.UInt64(0)
        self.total_agents.value = algopy.UInt64(0)
        self.current_supply.value = algopy.UInt64(0)
        self.reserve_balance.value = algopy.UInt64(0)
        self.graduated.value = algopy.UInt64(0)
        self.reward_pool.value = algopy.UInt64(0)
        self.asa_id.value = algopy.UInt64(0)
        self.graduation_initiated.value = algopy.UInt64(0)
        self.graduation_timestamp.value = algopy.UInt64(0)
        self.pool_token_id.value = algopy.UInt64(0)
        self.graduation_funds_withdrawn.value = algopy.UInt64(0)

    @algopy.arc4.abimethod
    def create(self) -> algopy.String:
        self.owner.value = algopy.Txn.sender
        self.treasury.value = algopy.Txn.sender
        self.creation_fee.value = algopy.UInt64(0)
        self.paused.value = algopy.UInt64(0)
        self.total_agents.value = algopy.UInt64(0)
        self.current_supply.value = algopy.UInt64(0)
        self.reserve_balance.value = algopy.UInt64(0)
        self.graduated.value = algopy.UInt64(0)
        self.reward_pool.value = algopy.UInt64(0)
        self.graduation_initiated.value = algopy.UInt64(0)
        self.graduation_timestamp.value = algopy.UInt64(0)
        self.graduation_funds_withdrawn.value = algopy.UInt64(0)
        return algopy.String("Contract re-initialized")

    @algopy.arc4.abimethod
    def create_agent(self, name: algopy.String, symbol: algopy.String) -> algopy.UInt64:
        assert self.paused.value == algopy.UInt64(0), "Contract paused"

        if self.creation_fee.value > algopy.UInt64(0):
            assert algopy.Global.group_size >= algopy.UInt64(2), "Payment required"
            payment_txn = algopy.gtxn.PaymentTransaction(0)
            assert payment_txn.receiver == self.treasury.value, "Wrong receiver"
            assert payment_txn.amount >= self.creation_fee.value, "Insufficient payment"

        asa_create_txn = algopy.itxn.AssetConfig(
            total=self.TOTAL_SUPPLY,
            decimals=self.DECIMALS,
            asset_name=name,
            unit_name=symbol,
            manager=algopy.Global.current_application_address,
            reserve=algopy.Global.current_application_address,
            freeze=algopy.Global.current_application_address,
            clawback=algopy.Global.current_application_address,
            fee=algopy.UInt64(1000),
        )

        asa_id = asa_create_txn.submit().created_asset.id

        algopy.itxn.AssetTransfer(
            xfer_asset=asa_id,
            asset_sender=algopy.Global.current_application_address,
            asset_receiver=algopy.Global.current_application_address,
            asset_amount=algopy.UInt64(0),
            fee=algopy.UInt64(1000),
        ).submit()

        if self.total_agents.value == algopy.UInt64(0):
            self.asa_id.value = asa_id

        self.total_agents.value += algopy.UInt64(1)

        return asa_id

    @algopy.arc4.abimethod
    def buy_agent_tokens(self, target_asa_id: algopy.UInt64) -> algopy.UInt64:
        assert self.paused.value == algopy.UInt64(0), "Contract paused"
        assert self.graduated.value == algopy.UInt64(0), "Agent graduated"

        assert algopy.Global.group_size >= algopy.UInt64(2), "Payment required"
        payment_txn = algopy.gtxn.PaymentTransaction(0)
        assert payment_txn.receiver == algopy.Global.current_application_address, "Wrong receiver"

        algo_amount = payment_txn.amount

        tokens_to_mint = self._calculate_buy_amount(algo_amount)

        self.current_supply.value += tokens_to_mint
        self.reserve_balance.value += algo_amount

        algopy.itxn.AssetTransfer(
            xfer_asset=self.asa_id.value,
            asset_receiver=algopy.Txn.sender,
            asset_amount=tokens_to_mint,
            fee=algopy.UInt64(1000),
        ).submit()

        return tokens_to_mint

    @algopy.arc4.abimethod
    def sell(self, token_amount: algopy.UInt64) -> algopy.UInt64:
        assert self.paused.value == algopy.UInt64(0), "Contract paused"
        assert self.graduated.value == algopy.UInt64(0), "Trading disabled after graduation"
        assert self.current_supply.value >= token_amount, "Insufficient supply"

        algo_to_return = self._calculate_sell_amount(token_amount)
        assert self.reserve_balance.value >= algo_to_return, "Insufficient reserves"

        self.current_supply.value -= token_amount
        self.reserve_balance.value -= algo_to_return

        algopy.itxn.Payment(
            receiver=algopy.Txn.sender,
            amount=algo_to_return,
            fee=algopy.UInt64(1000),
        ).submit()

        return algo_to_return

    @algopy.arc4.abimethod
    def check_graduation_eligibility(self) -> tuple[algopy.UInt64, algopy.UInt64, algopy.UInt64]:

        eligible = algopy.UInt64(1) if (
            self.reserve_balance.value >= self.GRADUATION_THRESHOLD and
            self.graduated.value == algopy.UInt64(0) and
            self.asa_id.value > algopy.UInt64(0)
        ) else algopy.UInt64(0)

        return (eligible, self.reserve_balance.value, self.GRADUATION_THRESHOLD)

    @algopy.arc4.abimethod
    def prepare_graduation(self) -> tuple[algopy.UInt64, algopy.UInt64, algopy.UInt64]:

        assert self.reserve_balance.value >= self.GRADUATION_THRESHOLD, "Graduation threshold not met"
        assert self.graduated.value == algopy.UInt64(0), "Already graduated"
        assert algopy.Txn.sender == self.owner.value, "Only owner can prepare graduation"

        total_reserve = self.reserve_balance.value
        liquidity_algo = (total_reserve * self.LIQUIDITY_PERCENTAGE) // algopy.UInt64(100)
        creator_allocation = (total_reserve * self.CREATOR_PERCENTAGE) // algopy.UInt64(100)
        platform_fee = total_reserve - liquidity_algo - creator_allocation

        self.graduation_initiated.value = algopy.UInt64(1)
        self.graduation_timestamp.value = algopy.Global.latest_timestamp

        if creator_allocation > algopy.UInt64(0):
            algopy.itxn.Payment(
                receiver=self.owner.value,
                amount=creator_allocation,
                fee=algopy.UInt64(1000),
            ).submit()

        if platform_fee > algopy.UInt64(0):
            algopy.itxn.Payment(
                receiver=self.treasury.value,
                amount=platform_fee,
                fee=algopy.UInt64(1000),
            ).submit()

        self.reserve_balance.value = liquidity_algo

        return (liquidity_algo, creator_allocation, platform_fee)

    @algopy.arc4.abimethod
    def withdraw_graduation_funds(self, recipient: algopy.Account) -> algopy.UInt64:

        assert self.graduation_initiated.value == algopy.UInt64(1), "Graduation not initiated"
        assert algopy.Txn.sender == self.owner.value, "Only owner"
        assert self.reserve_balance.value > algopy.UInt64(0), "No funds to withdraw"
        assert self.graduation_funds_withdrawn.value == algopy.UInt64(0), "Funds already withdrawn"

        amount_to_withdraw = self.reserve_balance.value
        self.reserve_balance.value = algopy.UInt64(0)
        self.graduation_funds_withdrawn.value = algopy.UInt64(1)

        algopy.itxn.Payment(
            receiver=recipient,
            amount=amount_to_withdraw,
            fee=algopy.UInt64(1000),
        ).submit()

        return amount_to_withdraw

    @algopy.arc4.abimethod
    def mint_graduation_tokens(self, recipient: algopy.Account, amount: algopy.UInt64) -> algopy.UInt64:

        assert self.graduation_initiated.value == algopy.UInt64(1), "Graduation not initiated"
        assert algopy.Txn.sender == self.owner.value, "Only owner"

        remaining_supply = self.TOTAL_SUPPLY - self.current_supply.value
        assert amount <= remaining_supply, "Exceeds remaining supply"

        self.current_supply.value += amount

        algopy.itxn.AssetTransfer(
            xfer_asset=self.asa_id.value,
            asset_receiver=recipient,
            asset_amount=amount,
            fee=algopy.UInt64(1000),
        ).submit()

        return amount

    @algopy.arc4.abimethod
    def confirm_tinyman_pool(self, pool_address: algopy.Account, pool_token_id: algopy.UInt64) -> algopy.String:

        assert self.graduation_initiated.value == algopy.UInt64(1), "Graduation not initiated"
        assert algopy.Txn.sender == self.owner.value, "Only owner"

        self.tinyman_pool_address.value = pool_address
        self.pool_token_id.value = pool_token_id
        self.graduated.value = algopy.UInt64(1)

        return algopy.String("Tinyman pool confirmed")

    @algopy.arc4.abimethod
    def get_graduation_preview(self) -> tuple[algopy.UInt64, algopy.UInt64, algopy.UInt64, algopy.UInt64]:

        if self.reserve_balance.value < self.GRADUATION_THRESHOLD:
            return (algopy.UInt64(0), algopy.UInt64(0), algopy.UInt64(0), algopy.UInt64(0))

        total_reserve = self.reserve_balance.value
        liquidity_algo = (total_reserve * self.LIQUIDITY_PERCENTAGE) // algopy.UInt64(100)
        creator_algo = (total_reserve * self.CREATOR_PERCENTAGE) // algopy.UInt64(100)
        platform_fee = total_reserve - liquidity_algo - creator_algo
        remaining_tokens = self.TOTAL_SUPPLY - self.current_supply.value

        return (liquidity_algo, creator_algo, platform_fee, remaining_tokens)


    @algopy.subroutine
    def _calculate_buy_amount(self, algo_amount: algopy.UInt64) -> algopy.UInt64:
        virtual_core = self.VIRTUAL_CORE + self.reserve_balance.value
        virtual_token = self.VIRTUAL_TOKEN - self.current_supply.value

        new_virtual_core = virtual_core + algo_amount

        if new_virtual_core > algopy.UInt64(0) and virtual_token > algopy.UInt64(0):
            new_virtual_token = (virtual_core * virtual_token) // new_virtual_core
            tokens_out = virtual_token - new_virtual_token if virtual_token > new_virtual_token else algopy.UInt64(0)
        else:
            tokens_out = algo_amount

        return tokens_out

    @algopy.subroutine
    def _calculate_sell_amount(self, token_amount: algopy.UInt64) -> algopy.UInt64:

        virtual_core = self.VIRTUAL_CORE + self.reserve_balance.value
        virtual_token = self.VIRTUAL_TOKEN - self.current_supply.value

        new_virtual_token = virtual_token + token_amount

        if new_virtual_token > algopy.UInt64(0) and virtual_core > algopy.UInt64(0):
            new_virtual_core = (virtual_core * virtual_token) // new_virtual_token
            algo_out = virtual_core - new_virtual_core if virtual_core > new_virtual_core else algopy.UInt64(0)
        else:
            algo_out = token_amount

        return algo_out

    @algopy.subroutine
    def _get_current_price(self) -> algopy.UInt64:
        virtual_core = self.VIRTUAL_CORE + self.reserve_balance.value
        virtual_token = self.VIRTUAL_TOKEN - self.current_supply.value

        if virtual_token > algopy.UInt64(0) and virtual_core > algopy.UInt64(0):
            return (virtual_core * algopy.UInt64(1_000_000)) // virtual_token
        else:
            return algopy.UInt64(1_000_000)

    @algopy.arc4.abimethod
    def get_total_agents(self) -> algopy.UInt64:
        return self.total_agents.value

    @algopy.arc4.abimethod
    def get_current_price(self) -> algopy.UInt64:
        return self._get_current_price()

    @algopy.arc4.abimethod
    def get_buy_quote(self, algo_amount: algopy.UInt64) -> tuple[algopy.UInt64, algopy.UInt64, algopy.UInt64]:
        current_price = self._get_current_price()
        tokens_out = self._calculate_buy_amount(algo_amount)

        temp_supply = self.current_supply.value + tokens_out
        temp_reserve = self.reserve_balance.value + algo_amount

        virtual_core = self.VIRTUAL_CORE + temp_reserve
        virtual_token = self.VIRTUAL_TOKEN - temp_supply

        if virtual_token > algopy.UInt64(0) and virtual_core > algopy.UInt64(0):
            new_price = (virtual_core * algopy.UInt64(1_000_000)) // virtual_token
        else:
            new_price = algopy.UInt64(1_000_000)

        return (tokens_out, current_price, new_price)

    @algopy.arc4.abimethod
    def get_sell_quote(self, token_amount: algopy.UInt64) -> tuple[algopy.UInt64, algopy.UInt64, algopy.UInt64]:
        current_price = self._get_current_price()
        algo_out = self._calculate_sell_amount(token_amount)

        temp_supply = self.current_supply.value - token_amount
        temp_reserve = self.reserve_balance.value - algo_out

        virtual_core = self.VIRTUAL_CORE + temp_reserve
        virtual_token = self.VIRTUAL_TOKEN - temp_supply

        if virtual_token > algopy.UInt64(0) and virtual_core > algopy.UInt64(0):
            new_price = (virtual_core * algopy.UInt64(1_000_000)) // virtual_token
        else:
            new_price = algopy.UInt64(1_000_000)

        return (algo_out, current_price, new_price)

    @algopy.arc4.abimethod
    def get_bonding_curve_info(self) -> tuple[algopy.UInt64, algopy.UInt64, algopy.UInt64, algopy.UInt64]:
        return (
            self.current_supply.value,
            self.reserve_balance.value,
            self._get_current_price(),
            self.graduated.value,
        )

    @algopy.arc4.abimethod
    def get_graduation_status(self) -> tuple[algopy.UInt64, algopy.UInt64, algopy.UInt64, algopy.UInt64]:
        threshold_met = algopy.UInt64(1) if self.reserve_balance.value >= self.GRADUATION_THRESHOLD else algopy.UInt64(0)

        return (
            self.graduated.value,
            threshold_met,
            self.graduation_timestamp.value,
            self.pool_token_id.value
        )

    @algopy.arc4.abimethod
    def get_metadata(self) -> tuple[algopy.UInt64, algopy.UInt64, algopy.UInt64]:
        return (
            self.asa_id.value,
            algopy.UInt64(1),
            self.total_agents.value,
        )

    @algopy.arc4.abimethod
    def set_treasury(self, new_treasury: algopy.Account) -> None:
        assert algopy.Txn.sender == self.owner.value, "Only owner"
        self.treasury.value = new_treasury

    @algopy.arc4.abimethod
    def set_fee(self, new_fee: algopy.UInt64) -> None:
        assert algopy.Txn.sender == self.owner.value, "Only owner"
        self.creation_fee.value = new_fee

    @algopy.arc4.abimethod
    def pause(self) -> None:
        assert algopy.Txn.sender == self.owner.value, "Only owner"
        self.paused.value = algopy.UInt64(1)

    @algopy.arc4.abimethod
    def unpause(self) -> None:
        assert algopy.Txn.sender == self.owner.value, "Only owner"
        self.paused.value = algopy.UInt64(0)

    @algopy.arc4.abimethod
    def emergency_graduation_reset(self) -> algopy.String:
        assert algopy.Txn.sender == self.owner.value, "Only owner"

        self.graduation_initiated.value = algopy.UInt64(0)
        self.graduated.value = algopy.UInt64(0)
        self.pool_token_id.value = algopy.UInt64(0)
        self.graduation_timestamp.value = algopy.UInt64(0)
        self.graduation_funds_withdrawn.value = algopy.UInt64(0)

        return algopy.String("Graduation status reset")

    @algopy.arc4.abimethod
    def distribute_rewards(self) -> None:
        assert algopy.Txn.sender == self.owner.value, "Only owner"
        assert algopy.Global.group_size >= algopy.UInt64(2), "Payment required"

        payment_txn = algopy.gtxn.PaymentTransaction(0)
        self.reward_pool.value += payment_txn.amount

    @algopy.arc4.abimethod
    def claim_rewards(self) -> algopy.UInt64:
        reward_amount = self.reward_pool.value
        assert reward_amount > algopy.UInt64(0), "No rewards available"

        algopy.itxn.Payment(
            receiver=algopy.Txn.sender,
            amount=reward_amount,
            fee=algopy.UInt64(1000),
        ).submit()

        self.reward_pool.value = algopy.UInt64(0)
        return reward_amount

    @algopy.arc4.abimethod
    def hello(self, name: algopy.String) -> algopy.String:
        return algopy.String("Hello, ") + name

    @algopy.arc4.abimethod
    def debug_test(self) -> algopy.String:
        return algopy.String("DEBUG: Method called successfully")
