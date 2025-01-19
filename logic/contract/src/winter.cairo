use starknet::ContractAddress;

#[starknet::interface]
trait IERC20<TContractState> {
    fn get_name(self: @TContractState) -> felt252;
    fn get_symbol(self: @TContractState) -> felt252;
    fn get_decimals(self: @TContractState) -> u8;
    fn get_total_supply(self: @TContractState) -> felt252;
    fn balance_of(self: @TContractState, account: ContractAddress) -> felt252;
    fn allowance(self: @TContractState, owner: ContractAddress, spender: ContractAddress) -> felt252;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: felt252) -> bool;
    fn transfer_from(ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: felt252) -> bool;
    fn approve(ref self: TContractState, spender: ContractAddress, amount: felt252) -> bool;
}

#[starknet::interface]
trait IVault<TContractState> {
    fn deposit(ref self: TContractState, amount: u256) -> bool;
    fn withdraw(ref self: TContractState, amount: u256) -> bool;
    fn get_balance(self: @TContractState, account: ContractAddress) -> u256;
    fn get_total_deposits(self: @TContractState) -> u256;
}

#[starknet::contract]
mod Vault {
    use super::{IERC20Dispatcher, IERC20DispatcherTrait};
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use starknet::storage::Map;

    #[storage]
    struct Storage {
        strk_token: IERC20Dispatcher,
        balances: Map::<ContractAddress, u256>,
        total_deposits: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, strk_address: ContractAddress) {
        self.strk_token.write(IERC20Dispatcher { contract_address: strk_address });
        self.total_deposits.write(0);
    }

    #[abi(embed_v0)]
    impl Vault of super::IVault<ContractState> {
        fn deposit(ref self: ContractState, amount: u256) -> bool {
            let caller = get_caller_address();
            let vault = get_contract_address();
            let amount_felt: felt252 = amount.try_into().unwrap();

            // Transfer STRK tokens from user to vault
            let transfer_success = self.strk_token.read().transfer_from(caller, vault, amount_felt);
            assert(transfer_success, 'Transfer failed');

            // Update user balance and total deposits
            let current_balance = self.balances.read(caller);
            self.balances.write(caller, current_balance + amount);
            
            let current_total = self.total_deposits.read();
            self.total_deposits.write(current_total + amount);

            true
        }

        fn withdraw(ref self: ContractState, amount: u256) -> bool {
            let caller = get_caller_address();
            let current_balance = self.balances.read(caller);
            assert(current_balance >= amount, 'Insufficient balance');

            // Update user balance and total deposits
            self.balances.write(caller, current_balance - amount);
            let current_total = self.total_deposits.read();
            self.total_deposits.write(current_total - amount);

            // Transfer STRK tokens back to user
            let amount_felt: felt252 = amount.try_into().unwrap();
            let transfer_success = self.strk_token.read().transfer(caller, amount_felt);
            assert(transfer_success, 'Transfer failed');

            true
        }

        fn get_balance(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }

        fn get_total_deposits(self: @ContractState) -> u256 {
            self.total_deposits.read()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{Vault, IVaultDispatcher, IVaultDispatcherTrait};
    use starknet::{ContractAddress, contract_address_const};
    use starknet::testing::{set_caller_address, set_contract_address};

    #[test]
    fn test_deposit_withdraw() {
        // Test implementation would go here
        // Would need to mock STRK token contract and test deposit/withdraw flows
    }
}
