#![no_std]
#![allow(dead_code)]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map, String, Vec};

/// Proposal type
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProposalType {
    TariffAdjustment,
    SubsidyCreation,
    SubsidyModification,
    SubsidyTermination,
    FundAllocation,
}

/// Proposal status
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProposalStatus {
    Active,
    Passed,
    Rejected,
    Executed,
}

/// Voting option
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum VoteOption {
    Yes,
    No,
    Abstain,
}

/// Proposal structure
#[contracttype]
#[derive(Clone)]
pub struct Proposal {
    pub proposal_id: u64,
    pub proposal_type: ProposalType,
    pub title: String,
    pub description: String,
    pub proposer: Address,
    pub start_timestamp: u64,
    pub end_timestamp: u64,
    pub status: ProposalStatus,
    pub yes_votes: u64,
    pub no_votes: u64,
    pub abstain_votes: u64,
    pub total_voters: u64,
    pub quorum_required: u64, // percentage * 100
}

/// Subsidy structure
#[contracttype]
#[derive(Clone)]
pub struct Subsidy {
    pub subsidy_id: u64,
    pub name: String,
    pub description: String,
    pub discount_percentage: u32, // percentage * 100
    pub eligible_households: Vec<Address>,
    pub start_timestamp: u64,
    pub end_timestamp: u64,
    pub active: bool,
    pub total_allocated: u64,
    pub total_distributed: u64,
}

/// Vote record
#[contracttype]
#[derive(Clone)]
pub struct Vote {
    pub voter: Address,
    pub proposal_id: u64,
    pub vote_option: VoteOption,
    pub timestamp: u64,
}

/// Contract storage keys
const ADMIN: soroban_sdk::Symbol = soroban_sdk::symbol!("ADMIN");
const PROPOSALS: soroban_sdk::Symbol = soroban_sdk::symbol!("PROPOSALS");
const SUBSIDIES: soroban_sdk::Symbol = soroban_sdk::symbol!("SUBSIDIES");
const VOTES: soroban_sdk::Symbol = soroban_sdk::symbol!("VOTES");
const PROPOSAL_COUNTER: soroban_sdk::Symbol = soroban_sdk::symbol!("PROPOSAL_COUNTER");
const SUBSIDY_COUNTER: soroban_sdk::Symbol = soroban_sdk::symbol!("SUBSIDY_COUNTER");
const COMMUNITY_FUND: soroban_sdk::Symbol = soroban_sdk::symbol!("COMMUNITY_FUND");
const GOVERNANCE_TOKEN: soroban_sdk::Symbol = soroban_sdk::symbol!("GOVERNANCE_TOKEN");
const VOTING_PERIOD: soroban_sdk::Symbol = soroban_sdk::symbol!("VOTING_PERIOD");
const QUORUM_THRESHOLD: soroban_sdk::Symbol = soroban_sdk::symbol!("QUORUM_THRESHOLD");

/// Events
const EVT_PROPOSAL_CREATED: soroban_sdk::Symbol = soroban_sdk::symbol!("PROPOSAL_CREATED");
const EVT_VOTE_CAST: soroban_sdk::Symbol = soroban_sdk::symbol!("VOTE_CAST");
const EVT_PROPOSAL_PASSED: soroban_sdk::Symbol = soroban_sdk::symbol!("PROPOSAL_PASSED");
const EVT_PROPOSAL_REJECTED: soroban_sdk::Symbol = soroban_sdk::symbol!("PROPOSAL_REJECTED");
const EVT_SUBSIDY_CREATED: soroban_sdk::Symbol = soroban_sdk::symbol!("SUBSIDY_CREATED");
const EVT_SUBSIDY_APPLIED: soroban_sdk::Symbol = soroban_sdk::symbol!("SUBSIDY_APPLIED");

#[contract]
pub struct SubsidyGovernance;

#[contractimpl]
impl SubsidyGovernance {
    /// Initialize the contract
    pub fn initialize(env: Env, admin: Address, governance_token: Address, voting_period_hours: u64, quorum_threshold: u32) {
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&GOVERNANCE_TOKEN, &governance_token);
        env.storage().instance().set(&VOTING_PERIOD, &(voting_period_hours * 3600));
        env.storage().instance().set(&QUORUM_THRESHOLD, &quorum_threshold);
        env.storage().instance().set(&COMMUNITY_FUND, &0u64);
        env.storage().instance().set(&PROPOSAL_COUNTER, &0u64);
        env.storage().instance().set(&SUBSIDY_COUNTER, &0u64);
    }

    /// Create a proposal
    pub fn create_proposal(
        env: Env,
        proposer: Address,
        proposal_type: ProposalType,
        title: String,
        description: String,
    ) -> u64 {
        proposer.require_auth();

        let timestamp = env.ledger().timestamp();
        let voting_period: u64 = env.storage().instance().get(&VOTING_PERIOD).unwrap().unwrap();
        
        let proposal_counter: u64 = env.storage().instance().get(&PROPOSAL_COUNTER).unwrap().unwrap();
        let proposal_id = proposal_counter + 1;

        let proposal = Proposal {
            proposal_id,
            proposal_type,
            title,
            description,
            proposer: proposer.clone(),
            start_timestamp: timestamp,
            end_timestamp: timestamp + voting_period,
            status: ProposalStatus::Active,
            yes_votes: 0,
            no_votes: 0,
            abstain_votes: 0,
            total_voters: 0,
            quorum_required: 5000, // 50% quorum
        };

        let mut proposals: Map<u64, Proposal> = env.storage().instance().get(&PROPOSALS).unwrap_or_else(|| Map::new(&env));
        proposals.set(proposal_id, proposal);
        env.storage().instance().set(&PROPOSALS, &proposals);
        env.storage().instance().set(&PROPOSAL_COUNTER, &proposal_id);

        // Emit event
        env.events().publish(
            (EVT_PROPOSAL_CREATED, proposer),
            (proposal_id, proposal_type),
        );

        proposal_id
    }

    /// Cast a vote on a proposal
    pub fn cast_vote(env: Env, voter: Address, proposal_id: u64, vote_option: VoteOption) {
        voter.require_auth();

        let proposals: Map<u64, Proposal> = env.storage().instance().get(&PROPOSALS).unwrap().unwrap();
        let mut proposal = proposals.get(proposal_id).unwrap_or_else(|| panic!("proposal not found"));

        if proposal.status != ProposalStatus::Active {
            panic!("proposal is not active");
        }

        let timestamp = env.ledger().timestamp();
        if timestamp > proposal.end_timestamp {
            panic!("voting period has ended");
        }

        // Check if already voted
        let votes: Map<(Address, u64), Vote> = env.storage().instance().get(&VOTES).unwrap_or_else(|| Map::new(&env));
        if votes.contains_key(&(voter.clone(), proposal_id)) {
            panic!("already voted on this proposal");
        }

        // Record vote
        let vote = Vote {
            voter: voter.clone(),
            proposal_id,
            vote_option: vote_option.clone(),
            timestamp,
        };

        let mut votes_updated = votes;
        votes_updated.set((voter.clone(), proposal_id), vote);
        env.storage().instance().set(&VOTES, &votes_updated);

        // Update proposal vote counts
        match vote_option {
            VoteOption::Yes => proposal.yes_votes += 1,
            VoteOption::No => proposal.no_votes += 1,
            VoteOption::Abstain => proposal.abstain_votes += 1,
        }
        proposal.total_voters += 1;

        let mut proposals_updated = proposals;
        proposals_updated.set(proposal_id, proposal);
        env.storage().instance().set(&PROPOSALS, &proposals_updated);

        // Emit event
        env.events().publish(
            (EVT_VOTE_CAST, voter),
            (proposal_id, vote_option),
        );
    }

    /// Finalize proposal (check if passed or rejected)
    pub fn finalize_proposal(env: Env, proposal_id: u64) {
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap().unwrap();
        admin.require_auth();

        let proposals: Map<u64, Proposal> = env.storage().instance().get(&PROPOSALS).unwrap().unwrap();
        let mut proposal = proposals.get(proposal_id).unwrap_or_else(|| panic!("proposal not found"));

        if proposal.status != ProposalStatus::Active {
            panic!("proposal is not active");
        }

        let timestamp = env.ledger().timestamp();
        if timestamp <= proposal.end_timestamp {
            panic!("voting period has not ended");
        }

        // Check quorum
        let quorum_threshold: u32 = env.storage().instance().get(&QUORUM_THRESHOLD).unwrap().unwrap();
        let quorum_met = (proposal.total_voters * 10000) >= (quorum_threshold as u64);

        if !quorum_met {
            proposal.status = ProposalStatus::Rejected;
        } else {
            // Check if yes votes > no votes
            if proposal.yes_votes > proposal.no_votes {
                proposal.status = ProposalStatus::Passed;
            } else {
                proposal.status = ProposalStatus::Rejected;
            }
        }

        let mut proposals_updated = proposals;
        proposals_updated.set(proposal_id, proposal.clone());
        env.storage().instance().set(&PROPOSALS, &proposals_updated);

        // Emit event
        if proposal.status == ProposalStatus::Passed {
            env.events().publish(
                (EVT_PROPOSAL_PASSED, proposal_id),
                (proposal.yes_votes, proposal.no_votes),
            );
        } else {
            env.events().publish(
                (EVT_PROPOSAL_REJECTED, proposal_id),
                (proposal.yes_votes, proposal.no_votes),
            );
        }
    }

    /// Create a subsidy (after proposal passes)
    pub fn create_subsidy(
        env: Env,
        name: String,
        description: String,
        discount_percentage: u32,
        eligible_households: Vec<Address>,
        duration_hours: u64,
        allocated_amount: u64,
    ) -> u64 {
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap().unwrap();
        admin.require_auth();

        let subsidy_counter: u64 = env.storage().instance().get(&SUBSIDY_COUNTER).unwrap().unwrap();
        let subsidy_id = subsidy_counter + 1;

        let timestamp = env.ledger().timestamp();

        let subsidy = Subsidy {
            subsidy_id,
            name: name.clone(),
            description,
            discount_percentage,
            eligible_households,
            start_timestamp: timestamp,
            end_timestamp: timestamp + (duration_hours * 3600),
            active: true,
            total_allocated: allocated_amount,
            total_distributed: 0,
        };

        let mut subsidies: Map<u64, Subsidy> = env.storage().instance().get(&SUBSIDIES).unwrap_or_else(|| Map::new(&env));
        subsidies.set(subsidy_id, subsidy);
        env.storage().instance().set(&SUBSIDIES, &subsidies);
        env.storage().instance().set(&SUBSIDY_COUNTER, &subsidy_id);

        // Emit event
        env.events().publish(
            EVT_SUBSIDY_CREATED,
            (subsidy_id, name),
        );

        subsidy_id
    }

    /// Apply subsidy to household
    pub fn apply_subsidy(env: Env, subsidy_id: u64, household_address: Address, consumption_kwh: u64) -> u64 {
        let subsidies: Map<u64, Subsidy> = env.storage().instance().get(&SUBSIDIES).unwrap().unwrap();
        let mut subsidy = subsidies.get(subsidy_id).unwrap_or_else(|| panic!("subsidy not found"));

        if !subsidy.active {
            panic!("subsidy is not active");
        }

        let timestamp = env.ledger().timestamp();
        if timestamp > subsidy.end_timestamp {
            panic!("subsidy has expired");
        }

        // Check if household is eligible
        let mut eligible = false;
        for addr in subsidy.eligible_households.iter() {
            if addr == household_address {
                eligible = true;
                break;
            }
        }

        if !eligible {
            panic!("household is not eligible for this subsidy");
        }

        // Calculate discount
        let base_cost = consumption_kwh * 100; // Assume base rate of 100 stroops per kWh
        let discount = (base_cost * subsidy.discount_percentage as u64) / 10000;

        subsidy.total_distributed = subsidy.total_distributed.saturating_add(discount);

        let mut subsidies_updated = subsidies;
        subsidies_updated.set(subsidy_id, subsidy);
        env.storage().instance().set(&SUBSIDIES, &subsidies_updated);

        // Emit event
        env.events().publish(
            (EVT_SUBSIDY_APPLIED, household_address),
            (subsidy_id, discount),
        );

        discount
    }

    /// Deactivate subsidy
    pub fn deactivate_subsidy(env: Env, subsidy_id: u64) {
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap().unwrap();
        admin.require_auth();

        let subsidies: Map<u64, Subsidy> = env.storage().instance().get(&SUBSIDIES).unwrap().unwrap();
        let mut subsidy = subsidies.get(subsidy_id).unwrap_or_else(|| panic!("subsidy not found"));

        subsidy.active = false;

        let mut subsidies_updated = subsidies;
        subsidies_updated.set(subsidy_id, subsidy);
        env.storage().instance().set(&SUBSIDIES, &subsidies_updated);
    }

    /// Get proposal
    pub fn get_proposal(env: Env, proposal_id: u64) -> Proposal {
        let proposals: Map<u64, Proposal> = env.storage().instance().get(&PROPOSALS).unwrap().unwrap();
        proposals.get(proposal_id).unwrap_or_else(|| panic!("proposal not found"))
    }

    /// Get subsidy
    pub fn get_subsidy(env: Env, subsidy_id: u64) -> Subsidy {
        let subsidies: Map<u64, Subsidy> = env.storage().instance().get(&SUBSIDIES).unwrap().unwrap();
        subsidies.get(subsidy_id).unwrap_or_else(|| panic!("subsidy not found"))
    }

    /// Get active subsidies
    pub fn get_active_subsidies(env: Env, limit: u32) -> Vec<Subsidy> {
        let subsidies: Map<u64, Subsidy> = env.storage().instance().get(&SUBSIDIES).unwrap_or_else(|| Map::new(&env));
        let timestamp = env.ledger().timestamp();
        
        let mut result = Vec::new(&env);
        let mut count = 0;
        
        for (_, subsidy) in subsidies.iter() {
            if subsidy.active && subsidy.end_timestamp > timestamp {
                result.push_back(subsidy);
                count += 1;
                if count >= limit {
                    break;
                }
            }
        }
        
        result
    }

    /// Get household's eligible subsidies
    pub fn get_household_subsidies(env: Env, household_address: Address, limit: u32) -> Vec<Subsidy> {
        let subsidies: Map<u64, Subsidy> = env.storage().instance().get(&SUBSIDIES).unwrap_or_else(|| Map::new(&env));
        let timestamp = env.ledger().timestamp();
        
        let mut result = Vec::new(&env);
        let mut count = 0;
        
        for (_, subsidy) in subsidies.iter() {
            if subsidy.active && subsidy.end_timestamp > timestamp {
                for addr in subsidy.eligible_households.iter() {
                    if addr == household_address {
                        result.push_back(subsidy);
                        count += 1;
                        if count >= limit {
                            break;
                        }
                        break;
                    }
                }
            }
        }
        
        result
    }

    /// Get community fund balance
    pub fn get_community_fund(env: Env) -> u64 {
        env.storage().instance().get(&COMMUNITY_FUND).unwrap().unwrap()
    }

    /// Add to community fund
    pub fn add_to_fund(env: Env, amount: u64) {
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap().unwrap();
        admin.require_auth();

        let current_fund: u64 = env.storage().instance().get(&COMMUNITY_FUND).unwrap().unwrap();
        env.storage().instance().set(&COMMUNITY_FUND, &(current_fund.saturating_add(amount)));
    }

    /// Get admin address
    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&ADMIN).unwrap().unwrap()
    }
}
