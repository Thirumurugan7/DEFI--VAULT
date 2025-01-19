use starknet::ContractAddress;
use starknet::event::EventEmitter;

#[starknet::interface]
pub trait IERC20<TContractState> {
    fn get_name(self: @TContractState) -> felt252;
    fn get_symbol(self: @TContractState) -> felt252;
    fn get_decimals(self: @TContractState) -> u8;
    fn get_total_supply(self: @TContractState) -> felt252;
    fn balance_of(self: @TContractState, account: ContractAddress) -> felt252;
    fn allowance(
        self: @TContractState, owner: ContractAddress, spender: ContractAddress,
    ) -> felt252;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: felt252);
    fn transfer_from(
        ref self: TContractState,
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: felt252,
    );
    fn approve(ref self: TContractState, spender: ContractAddress, amount: felt252);
    fn increase_allowance(ref self: TContractState, spender: ContractAddress, added_value: felt252);
    fn decrease_allowance(
        ref self: TContractState, spender: ContractAddress, subtracted_value: felt252,
    );
}

#[starknet::interface]
pub trait IOptionVault<TContractState> {
    fn create_option(ref self: TContractState, strike_price: u256, expiry_blocks: u64, amount: u256) -> u256;
    fn exercise_option(ref self: TContractState, option_id: u256, amount: u256);
    fn cancel_option(ref self: TContractState, option_id: u256);
    fn get_option_details(self: @TContractState, option_id: u256) -> Option;
    fn get_next_option_id(self: @TContractState) -> u256;
    fn get_total_locked_amount(self: @TContractState) -> u256;
}

#[derive(Copy, Drop, Serde, starknet::Store)]
struct Option {
    creator: ContractAddress,
    strike_price: u256,
    amount: u256,
    creation_block: u64,
    expiry_blocks: u64,
    exercised: bool,
    cancelled: bool
}

#[starknet::contract]
mod OptionVault {
    use super::{ContractAddress, IERC20DispatcherTrait, IERC20Dispatcher, Option};
    use starknet::{get_caller_address, get_contract_address, get_block_number};
    use starknet::event::EventEmitter;

    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };

    const LOCK_PERIOD: u64 = 50; // 50 blocks lock period
    const CREATION_INTERVAL: u64 = 25; // Create options every 25 blocks
    const LOCK_PERCENTAGE: u256 = 10; // 10% of tokens locked for options

    #[storage]
    struct Storage {
        token: IERC20Dispatcher,
        vault: ContractAddress,
        options: Map<u256, Option>,
        next_option_id: u256,
        last_creation_block: u64,
        total_locked_amount: u256
    }

    #[derive(Drop, starknet::Event)]
    struct OptionCreated {
        #[key]
        option_id: u256,
        creator: ContractAddress,
        strike_price: u256,
        amount: u256,
        expiry_blocks: u64
    }

    #[derive(Drop, starknet::Event)]
    struct OptionExercised {
        #[key]
        option_id: u256,
        exerciser: ContractAddress,
        amount: u256
    }

    #[derive(Drop, starknet::Event)]
    struct OptionCancelled {
        #[key]
        option_id: u256,
        canceller: ContractAddress
    }

    #[constructor]
    fn constructor(ref self: ContractState, token_address: ContractAddress, vault_address: ContractAddress) {
        self.token.write(IERC20Dispatcher { contract_address: token_address });
        self.vault.write(vault_address);
        self.next_option_id.write(1);
        self.last_creation_block.write(0);
        self.total_locked_amount.write(0);
    }

    #[abi(embed_v0)]
    impl OptionVault of super::IOptionVault<ContractState> {
        fn create_option(
            ref self: ContractState,
            strike_price: u256,
            expiry_blocks: u64,
            amount: u256
        ) -> u256 {
            // Validation checks
            assert(strike_price > 0, 'Strike price must be > 0');
            assert(amount > 0, 'Amount must be > 0');
            assert(expiry_blocks > LOCK_PERIOD, 'Expiry too short');
            
            let current_block = get_block_number();
            let last_creation = self.last_creation_block.read();
            assert(
                current_block >= last_creation + CREATION_INTERVAL, 
                'Too soon to create options'
            );
            
            // Check available capacity for new options
            let vault_balance = self.token.read().balance_of(self.vault.read());
            let vault_balance_uint: u256 = vault_balance.try_into().unwrap();
            let max_lockable = (vault_balance_uint * LOCK_PERCENTAGE) / 100;
            let current_locked = self.total_locked_amount.read();
            let current_locked_felt: u256 = max_lockable.try_into().unwrap();
            assert(current_locked + amount <=current_locked_felt, 'Exceeds lockable amount');

            // Create new option
            let caller = get_caller_address();
            let option_id = self.next_option_id.read();
            
            let option = Option {
                creator: caller,
                strike_price,
                amount,
                creation_block: current_block,
                expiry_blocks,
                exercised: false,
                cancelled: false
            };

            self.options.write(option_id, option);
            self.next_option_id.write(option_id + 1);
            self.last_creation_block.write(current_block);
            self.total_locked_amount.write(current_locked + amount);

            // Emit event
            self.emit(OptionCreated {
                option_id,
                creator: caller,
                strike_price,
                amount,
                expiry_blocks
            });

            option_id
        }

        fn exercise_option(ref self: ContractState, option_id: u256, amount: u256) {
            // Load and validate option
            let mut option = self.options.read(option_id);
            assert(!option.exercised, 'Option already exercised');
            assert(!option.cancelled, 'Option cancelled');
            
            let current_block = get_block_number();
            assert(
                current_block <= option.creation_block + option.expiry_blocks,
                'Option expired'
            );

            let caller = get_caller_address();
            assert(amount <= option.amount, 'Amount exceeds option size');

            // Calculate payment and transfer tokens
            let payment = amount * option.strike_price;
            let payment_felt: felt252 = payment.try_into().unwrap();
            self.token.read().transfer_from(caller, self.vault.read(), payment_felt);

            // Update option state
            if amount == option.amount {
                option.exercised = true;
                self.total_locked_amount.write(self.total_locked_amount.read() - amount);
            } else {
                option.amount -= amount;
                self.total_locked_amount.write(self.total_locked_amount.read() - amount);
            }
            self.options.write(option_id, option);

            // Emit event
            self.emit(OptionExercised {
                option_id,
                exerciser: caller,
                amount
            });
        }

        fn cancel_option(ref self: ContractState, option_id: u256) {
            let mut option = self.options.read(option_id);
            assert(!option.exercised, 'Option already exercised');
            assert(!option.cancelled, 'Option already cancelled');

            let current_block = get_block_number();
            assert(
                current_block > option.creation_block + LOCK_PERIOD,
                'Still in lock period'
            );

            let caller = get_caller_address();
            assert(caller == option.creator, 'Only creator can cancel');

            option.cancelled = true;
            self.total_locked_amount.write(self.total_locked_amount.read() - option.amount);
            self.options.write(option_id, option);

            self.emit(OptionCancelled {
                option_id,
                canceller: caller
            });
        }

        fn get_option_details(self: @ContractState, option_id: u256) -> Option {
            self.options.read(option_id)
        }

        fn get_next_option_id(self: @ContractState) -> u256 {
            self.next_option_id.read()
        }

        fn get_total_locked_amount(self: @ContractState) -> u256 {
            self.total_locked_amount.read()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{OptionVault, IOptionVaultDispatcher, IOptionVaultDispatcherTrait};
    use super::{Option};
    use starknet::testing::{set_contract_address, set_block_number};
    use starknet::{ContractAddress, contract_address_const};

    // Test setup and helper functions would go here...

    #[test]
    fn test_create_option() {
        // Test implementation would go here...
    }
}