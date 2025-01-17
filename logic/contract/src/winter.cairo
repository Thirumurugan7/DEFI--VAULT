#[starknet::interface]
pub trait Iwinter<TContractState> {
    fn getX(self: @TContractState) -> felt252;
    fn moveX(ref self: TContractState) -> felt252;
    fn moveY(ref self: TContractState) -> felt252;
    fn moveBoth(ref self: TContractState, x: felt252, y: felt252) -> felt252;
}

#[starknet::contract]
mod winter {
    use core::starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        x: felt252,
        y: felt252
    }

    #[abi(embed_v0)]
    impl winterImpl of super::Iwinter<ContractState> {
        fn getX(self: @ContractState) -> felt252 {
            self.x.read()
        }

        fn moveX(ref self: ContractState) -> felt252 {
            self.x.write(self.x.read() + 1);
            self.x.read()
        }

        fn moveY(ref self: ContractState) -> felt252 {
            self.y.write(self.y.read() - 1);
            self.y.read()
        }

        fn moveBoth(ref self: ContractState, x: felt252, y: felt252) -> felt252 {
            self.x.write(self.x.read() + x);
            self.y.write(self.y.read() + y);
            self.x.read()
        }
    }
}