//! Holdback: construction retention money that nobody can sit on.
//!
//! Every progress payment is split atomically: the subcontractor gets paid now,
//! the retention lands in a vault owned by this program. The client can freeze
//! only the cost of a reported defect, an arbiter settles it, and after the
//! warranty date anyone can trigger the release. While waiting, the
//! subcontractor can sell the locked claim to a funder in one atomic swap.

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_2022::spl_token_2022::{
    extension::{BaseStateWithExtensions, ExtensionType, StateWithExtensions},
    state::Mint as MintState,
};
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

declare_id!("6t4LfjbFTBDVhmNypAsHYSvaKdpBNmWLpDaF3G8nZrvB");

pub const MAX_RETENTION_BPS: u16 = 2_000; // 20%
/// The arbiter window may not exceed one year.
pub const MAX_ARBITER_WINDOW_SECS: i64 = 365 * 24 * 60 * 60;

#[program]
pub mod holdback {
    use super::*;

    /// Client proposes a contract to a subcontractor and names an arbiter.
    /// The contract stays `Proposed` until the subcontractor accepts it, so a
    /// client cannot unilaterally pick a friendly arbiter.
    /// `arbiter_window_secs`: how long after the warranty ends the arbiter may
    /// still settle an open defect before anyone can release the vault.
    pub fn create_contract(
        ctx: Context<CreateContract>,
        contract_id: u64,
        retention_bps: u16,
        warranty_secs: i64,
        arbiter_window_secs: i64,
        title: String,
    ) -> Result<()> {
        require!(retention_bps > 0 && retention_bps <= MAX_RETENTION_BPS, HoldbackError::BadRetention);
        require!(warranty_secs > 0, HoldbackError::BadWarranty);
        require!(
            arbiter_window_secs > 0 && arbiter_window_secs <= MAX_ARBITER_WINDOW_SECS,
            HoldbackError::BadArbiterWindow
        );
        require!(title.len() <= Contract::MAX_TITLE, HoldbackError::TitleTooLong);
        let (client, sub, arb) = (
            ctx.accounts.client.key(),
            ctx.accounts.subcontractor.key(),
            ctx.accounts.arbiter.key(),
        );
        require!(client != sub && arb != client && arb != sub, HoldbackError::BadParties);
        check_mint_extensions(&ctx.accounts.mint.to_account_info())?;

        let now = Clock::get()?.unix_timestamp;
        let c = &mut ctx.accounts.contract;
        c.client = ctx.accounts.client.key();
        c.subcontractor = ctx.accounts.subcontractor.key();
        c.beneficiary = ctx.accounts.subcontractor.key();
        c.arbiter = ctx.accounts.arbiter.key();
        c.mint = ctx.accounts.mint.key();
        c.contract_id = contract_id;
        c.retention_bps = retention_bps;
        c.created_at = now;
        c.arbiter_window_secs = arbiter_window_secs;
        c.warranty_end = now.checked_add(warranty_secs).ok_or(HoldbackError::Overflow)?;
        c.total_paid = 0;
        c.retained = 0;
        c.frozen = 0;
        c.paid_out_to_client = 0;
        c.released = 0;
        c.defect_hash = [0u8; 32];
        c.ask_price = 0;
        c.status = Status::Proposed;
        c.bump = ctx.bumps.contract;
        c.title = title;

        emit!(ContractCreated {
            contract: c.key(),
            client: c.client,
            subcontractor: c.subcontractor,
            retention_bps,
            warranty_end: c.warranty_end,
        });
        Ok(())
    }

    /// The subcontractor accepts the terms, including the arbiter. Only now
    /// can payments start.
    pub fn accept_contract(ctx: Context<AcceptContract>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let c = &mut ctx.accounts.contract;
        require!(c.status == Status::Proposed, HoldbackError::NotProposed);
        require!(now < c.warranty_end, HoldbackError::WarrantyOver);
        c.status = Status::Active;
        emit!(ContractAccepted { contract: c.key(), subcontractor: c.subcontractor });
        Ok(())
    }

    /// Client pays an invoice. One transaction, two transfers:
    /// the subcontractor's share and the retention into the vault.
    pub fn pay_progress(ctx: Context<PayProgress>, amount: u64) -> Result<()> {
        require!(amount > 0, HoldbackError::ZeroAmount);
        let c = &ctx.accounts.contract;
        require!(c.status == Status::Active, HoldbackError::NotActive);

        let retention = (amount as u128)
            .checked_mul(c.retention_bps as u128)
            .ok_or(HoldbackError::Overflow)?
            / 10_000u128;
        let retention = retention as u64;
        let to_sub = amount.checked_sub(retention).ok_or(HoldbackError::Overflow)?;
        let decimals = ctx.accounts.mint.decimals;

        transfer(
            &ctx.accounts.token_program,
            &ctx.accounts.client_token,
            &ctx.accounts.mint,
            &ctx.accounts.subcontractor_token,
            &ctx.accounts.client.to_account_info(),
            to_sub,
            decimals,
            None,
        )?;
        transfer(
            &ctx.accounts.token_program,
            &ctx.accounts.client_token,
            &ctx.accounts.mint,
            &ctx.accounts.vault,
            &ctx.accounts.client.to_account_info(),
            retention,
            decimals,
            None,
        )?;

        let c = &mut ctx.accounts.contract;
        c.total_paid = c.total_paid.checked_add(amount).ok_or(HoldbackError::Overflow)?;
        c.retained = c.retained.checked_add(retention).ok_or(HoldbackError::Overflow)?;

        emit!(ProgressPaid { contract: c.key(), amount, to_subcontractor: to_sub, retained: retention });
        Ok(())
    }

    /// Client reports a defect before the warranty ends. Only the cost of the
    /// defect is frozen, the rest of the retention stays on its way out.
    pub fn raise_defect(ctx: Context<ClientAction>, amount: u64, evidence_hash: [u8; 32]) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let c = &mut ctx.accounts.contract;
        require!(c.status == Status::Active, HoldbackError::NotActive);
        require!(now < c.warranty_end, HoldbackError::WarrantyOver);
        require!(c.frozen == 0, HoldbackError::DefectOpen);
        require!(amount > 0 && amount <= c.locked(), HoldbackError::BadDefectAmount);

        c.frozen = amount;
        c.defect_hash = evidence_hash;
        emit!(DefectRaised { contract: c.key(), amount, evidence_hash });
        Ok(())
    }

    /// Arbiter settles an open defect: either the frozen amount pays for the
    /// repair (goes to the client) or it is unfrozen for the subcontractor.
    pub fn resolve_defect(ctx: Context<ResolveDefect>, pay_client: bool) -> Result<()> {
        let c = &ctx.accounts.contract;
        require!(c.frozen > 0, HoldbackError::NoDefect);
        let amount = c.frozen;

        if pay_client {
            let client_key = c.client;
            let id = c.contract_id.to_le_bytes();
            let bump = [c.bump];
            let seeds: &[&[u8]] = &[b"contract", client_key.as_ref(), &id, &bump];
            let signer: &[&[&[u8]]] = &[seeds];
            transfer(
                &ctx.accounts.token_program,
                &ctx.accounts.vault,
                &ctx.accounts.mint,
                &ctx.accounts.client_token,
                &ctx.accounts.contract.to_account_info(),
                amount,
                ctx.accounts.mint.decimals,
                Some(signer),
            )?;
        }

        let c = &mut ctx.accounts.contract;
        if pay_client {
            c.paid_out_to_client = c.paid_out_to_client.checked_add(amount).ok_or(HoldbackError::Overflow)?;
        }
        c.frozen = 0;
        c.defect_hash = [0u8; 32];
        emit!(DefectResolved { contract: c.key(), amount, paid_client: pay_client });
        Ok(())
    }

    /// The current claim holder offers the locked retention for sale.
    /// price = 0 removes the offer.
    pub fn list_claim(ctx: Context<ListClaim>, price: u64) -> Result<()> {
        let c = &mut ctx.accounts.contract;
        require!(c.status == Status::Active, HoldbackError::NotActive);
        c.ask_price = price;
        emit!(ClaimListed { contract: c.key(), price });
        Ok(())
    }

    /// A funder buys the claim: pays the holder and becomes the beneficiary
    /// in the same transaction, so neither side can be cheated. `min_unfrozen`
    /// protects the buyer against the vault shrinking before the sale lands.
    pub fn buy_claim(ctx: Context<BuyClaim>, max_price: u64, min_unfrozen: u64) -> Result<()> {
        let c = &ctx.accounts.contract;
        require!(c.status == Status::Active, HoldbackError::NotActive);
        require!(c.ask_price > 0, HoldbackError::NotForSale);
        require!(c.ask_price <= max_price, HoldbackError::PriceChanged);
        require!(ctx.accounts.buyer.key() != c.beneficiary, HoldbackError::AlreadyOwner);
        // The buyer states how much unfrozen money they expect in the vault, so a
        // defect payout in the same block cannot change what they are buying.
        require!(
            ctx.accounts.vault.amount.saturating_sub(c.frozen) >= min_unfrozen,
            HoldbackError::VaultChanged
        );
        let price = c.ask_price;

        transfer(
            &ctx.accounts.token_program,
            &ctx.accounts.buyer_token,
            &ctx.accounts.mint,
            &ctx.accounts.seller_token,
            &ctx.accounts.buyer.to_account_info(),
            price,
            ctx.accounts.mint.decimals,
            None,
        )?;

        let c = &mut ctx.accounts.contract;
        let seller = c.beneficiary;
        c.beneficiary = ctx.accounts.buyer.key();
        c.ask_price = 0;
        emit!(ClaimSold { contract: c.key(), seller, buyer: c.beneficiary, price });
        Ok(())
    }

    /// After the warranty date anyone can release the retention to the
    /// current beneficiary. No calls, no reminders, no permission needed.
    pub fn release(ctx: Context<Release>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let c = &ctx.accounts.contract;
        require!(c.status == Status::Active, HoldbackError::NotActive);
        require!(now >= c.warranty_end, HoldbackError::WarrantyNotOver);
        // An open defect blocks release only while the arbiter still has time to
        // settle it. After the window, a silent arbiter cannot lock the vault forever.
        if c.frozen > 0 {
            let deadline = c.warranty_end.checked_add(c.arbiter_window_secs).ok_or(HoldbackError::Overflow)?;
            require!(now >= deadline, HoldbackError::DefectOpen);
        }

        let amount = ctx.accounts.vault.amount;
        if amount > 0 {
            let client_key = c.client;
            let id = c.contract_id.to_le_bytes();
            let bump = [c.bump];
            let seeds: &[&[u8]] = &[b"contract", client_key.as_ref(), &id, &bump];
            let signer: &[&[&[u8]]] = &[seeds];
            transfer(
                &ctx.accounts.token_program,
                &ctx.accounts.vault,
                &ctx.accounts.mint,
                &ctx.accounts.beneficiary_token,
                &ctx.accounts.contract.to_account_info(),
                amount,
                ctx.accounts.mint.decimals,
                Some(signer),
            )?;
        }

        let c = &mut ctx.accounts.contract;
        c.released = amount;
        c.frozen = 0;
        c.status = Status::Released;
        emit!(Released { contract: c.key(), beneficiary: c.beneficiary, amount, triggered_by: ctx.accounts.caller.key() });
        Ok(())
    }
}

#[allow(clippy::too_many_arguments)]
fn transfer<'info>(
    token_program: &Interface<'info, TokenInterface>,
    from: &InterfaceAccount<'info, TokenAccount>,
    mint: &InterfaceAccount<'info, Mint>,
    to: &InterfaceAccount<'info, TokenAccount>,
    authority: &AccountInfo<'info>,
    amount: u64,
    decimals: u8,
    signer: Option<&[&[&[u8]]]>,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    let accounts = TransferChecked {
        from: from.to_account_info(),
        mint: mint.to_account_info(),
        to: to.to_account_info(),
        authority: authority.clone(),
    };
    let ctx = match signer {
        Some(s) => CpiContext::new_with_signer(token_program.to_account_info(), accounts, s),
        None => CpiContext::new(token_program.to_account_info(), accounts),
    };
    token_interface::transfer_checked(ctx, amount, decimals)
}

/// Token-2022 mints with fee, hook, delegate, pause or similar extensions can
/// make the vault pay out less than it recorded or block a payout entirely.
/// Only plain mints (and metadata-only extensions) are accepted.
fn check_mint_extensions(mint: &AccountInfo) -> Result<()> {
    if *mint.owner != anchor_spl::token_2022::ID {
        return Ok(());
    }
    let data = mint.try_borrow_data()?;
    let state = StateWithExtensions::<MintState>::unpack(&data).map_err(|_| error!(HoldbackError::UnsafeMint))?;
    for ext in state.get_extension_types().map_err(|_| error!(HoldbackError::UnsafeMint))? {
        match ext {
            ExtensionType::MetadataPointer | ExtensionType::TokenMetadata => {}
            _ => return err!(HoldbackError::UnsafeMint),
        }
    }
    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum Status {
    Proposed,
    Active,
    Released,
}

#[account]
#[derive(InitSpace)]
pub struct Contract {
    pub client: Pubkey,
    pub subcontractor: Pubkey,
    /// Who receives the retention at release. Starts as the subcontractor,
    /// changes when the claim is sold.
    pub beneficiary: Pubkey,
    pub arbiter: Pubkey,
    pub mint: Pubkey,
    pub contract_id: u64,
    pub retention_bps: u16,
    pub created_at: i64,
    pub arbiter_window_secs: i64,
    pub warranty_end: i64,
    pub total_paid: u64,
    pub retained: u64,
    pub frozen: u64,
    pub paid_out_to_client: u64,
    pub released: u64,
    pub defect_hash: [u8; 32],
    pub ask_price: u64,
    pub status: Status,
    pub bump: u8,
    #[max_len(64)]
    pub title: String,
}

impl Contract {
    pub const MAX_TITLE: usize = 64;

    /// Retention still sitting in the vault and not frozen.
    pub fn locked(&self) -> u64 {
        self.retained
            .saturating_sub(self.paid_out_to_client)
            .saturating_sub(self.frozen)
    }
}

#[derive(Accounts)]
#[instruction(contract_id: u64)]
pub struct CreateContract<'info> {
    #[account(mut)]
    pub client: Signer<'info>,
    /// CHECK: any wallet can be the subcontractor
    pub subcontractor: UncheckedAccount<'info>,
    /// CHECK: any wallet can be the arbiter
    pub arbiter: UncheckedAccount<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = client,
        space = 8 + Contract::INIT_SPACE,
        seeds = [b"contract", client.key().as_ref(), &contract_id.to_le_bytes()],
        bump
    )]
    pub contract: Account<'info, Contract>,
    #[account(
        init,
        payer = client,
        associated_token::mint = mint,
        associated_token::authority = contract,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AcceptContract<'info> {
    pub subcontractor: Signer<'info>,
    #[account(mut, has_one = subcontractor)]
    pub contract: Account<'info, Contract>,
}

#[derive(Accounts)]
pub struct PayProgress<'info> {
    #[account(mut)]
    pub client: Signer<'info>,
    #[account(mut, has_one = client, has_one = mint)]
    pub contract: Account<'info, Contract>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut, token::mint = mint, token::authority = client, token::token_program = token_program)]
    pub client_token: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::mint = mint, token::authority = contract.subcontractor, token::token_program = token_program)]
    pub subcontractor_token: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = contract, associated_token::token_program = token_program)]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct ClientAction<'info> {
    pub client: Signer<'info>,
    #[account(mut, has_one = client)]
    pub contract: Account<'info, Contract>,
}

#[derive(Accounts)]
pub struct ResolveDefect<'info> {
    pub arbiter: Signer<'info>,
    #[account(mut, has_one = arbiter, has_one = mint)]
    pub contract: Account<'info, Contract>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = contract, associated_token::token_program = token_program)]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::mint = mint, token::authority = contract.client, token::token_program = token_program)]
    pub client_token: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct ListClaim<'info> {
    pub beneficiary: Signer<'info>,
    #[account(mut, has_one = beneficiary)]
    pub contract: Account<'info, Contract>,
}

#[derive(Accounts)]
pub struct BuyClaim<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut, has_one = mint)]
    pub contract: Account<'info, Contract>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(associated_token::mint = mint, associated_token::authority = contract, associated_token::token_program = token_program)]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::mint = mint, token::authority = buyer, token::token_program = token_program)]
    pub buyer_token: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::mint = mint, token::authority = contract.beneficiary, token::token_program = token_program)]
    pub seller_token: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct Release<'info> {
    /// Anyone: the subcontractor, a bot, a stranger in the audience.
    pub caller: Signer<'info>,
    #[account(mut, has_one = mint)]
    pub contract: Account<'info, Contract>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = contract, associated_token::token_program = token_program)]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::mint = mint, token::authority = contract.beneficiary, token::token_program = token_program)]
    pub beneficiary_token: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[event]
pub struct ContractCreated {
    pub contract: Pubkey,
    pub client: Pubkey,
    pub subcontractor: Pubkey,
    pub retention_bps: u16,
    pub warranty_end: i64,
}

#[event]
pub struct ContractAccepted {
    pub contract: Pubkey,
    pub subcontractor: Pubkey,
}

#[event]
pub struct ProgressPaid {
    pub contract: Pubkey,
    pub amount: u64,
    pub to_subcontractor: u64,
    pub retained: u64,
}

#[event]
pub struct DefectRaised {
    pub contract: Pubkey,
    pub amount: u64,
    pub evidence_hash: [u8; 32],
}

#[event]
pub struct DefectResolved {
    pub contract: Pubkey,
    pub amount: u64,
    pub paid_client: bool,
}

#[event]
pub struct ClaimListed {
    pub contract: Pubkey,
    pub price: u64,
}

#[event]
pub struct ClaimSold {
    pub contract: Pubkey,
    pub seller: Pubkey,
    pub buyer: Pubkey,
    pub price: u64,
}

#[event]
pub struct Released {
    pub contract: Pubkey,
    pub beneficiary: Pubkey,
    pub amount: u64,
    pub triggered_by: Pubkey,
}

#[error_code]
pub enum HoldbackError {
    #[msg("Retention must be between 0.01% and 20%")]
    BadRetention,
    #[msg("Warranty period must be positive")]
    BadWarranty,
    #[msg("Title is too long")]
    TitleTooLong,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Contract is not active")]
    NotActive,
    #[msg("Warranty period is already over")]
    WarrantyOver,
    #[msg("Warranty period is not over yet")]
    WarrantyNotOver,
    #[msg("A defect is already open")]
    DefectOpen,
    #[msg("No open defect")]
    NoDefect,
    #[msg("Defect amount must be positive and not exceed the locked retention")]
    BadDefectAmount,
    #[msg("Claim is not for sale")]
    NotForSale,
    #[msg("Price changed, transaction cancelled")]
    PriceChanged,
    #[msg("Buyer already owns the claim")]
    AlreadyOwner,
    #[msg("Client, subcontractor and arbiter must be three different wallets")]
    BadParties,
    #[msg("Arbiter window must be positive and at most one year")]
    BadArbiterWindow,
    #[msg("Contract has not been proposed or was already accepted")]
    NotProposed,
    #[msg("The vault holds less unfrozen money than the buyer expected")]
    VaultChanged,
    #[msg("This token has extensions that can break the vault (fees, hooks, delegates)")]
    UnsafeMint,
}
