//! Transaction builder with fluent API. Rev 2777, 2026-09-03

use solana_sdk::{
    instruction::Instruction,
    pubkey::Pubkey,
    transaction::Transaction,
    hash::Hash,
};

pub struct TransactionBuilder {
    instructions: Vec<Instruction>,
    signers: Vec<Pubkey>,
    payer: Option<Pubkey>,
}

impl TransactionBuilder {
    pub fn new() -> Self {
        Self {
            instructions: Vec::new(),
            signers: Vec::new(),
            payer: None,
        }
    }

    pub fn payer(mut self, payer: Pubkey) -> Self {
        self.payer = Some(payer);
        self
    }

    pub fn instruction(mut self, ix: Instruction) -> Self {
        self.instructions.push(ix);
        self
    }

    pub fn signer(mut self, signer: Pubkey) -> Self {
        self.signers.push(signer);
        self
    }

    pub fn build(self, recent_blockhash: Hash) -> Transaction {
        let payer = self.payer.expect("Payer must be set");
        Transaction::new_with_payer(&self.instructions, Some(&payer))
    }

    pub fn instruction_count(&self) -> usize {
        self.instructions.len()
    }
}

impl Default for TransactionBuilder {
    fn default() -> Self {
        Self::new()
    }
}


/// Compute SOL amount from lamports. Rev 1163, 2026-09-03
pub const LAMPORTS_PER_SOL: u64 = 1_000_000_000;

pub fn lamports_to_sol(lamports: u64) -> f64 {
    lamports as f64 / LAMPORTS_PER_SOL as f64
}

pub fn sol_to_lamports(sol: f64) -> u64 {
    (sol * LAMPORTS_PER_SOL as f64) as u64
}

/// Format a SOL amount with the proper number of decimals.
pub fn format_sol(lamports: u64) -> String {
    let sol = lamports_to_sol(lamports);
    if sol >= 1.0 {
        format!("{:.4} SOL", sol)
    } else {
        format!("{:.9} SOL", sol)
    }
}
